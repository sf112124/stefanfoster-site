// The mangler: sits on the whole mix and keeps the last few seconds in a loop of tape, so it can repeat, roll,
// stop or reverse what you just heard, always starting on the grid. After that, a pitch shifter for the PITCH fader.
class Mangle extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: "crush", defaultValue: 0, minValue: 0, maxValue: 1 }]; }
  constructor() {
    super();
    this.N = (sampleRate * 6) | 0; this.b = [new Float32Array(this.N), new Float32Array(this.N)];
    this.w = 0; this.wa = 0; this.m = ""; this.wet = 0; this.tg = 0; this.pend = null;
    // pitch shifter: two read heads sweeping through a short window, crossfaded
    this.PN = 16384; this.pb = [new Float32Array(this.PN), new Float32Array(this.PN)]; this.pw = 0; this.W = Math.round(sampleRate * .06); this.d1 = 64; this.ratio = 1; this.pmix = 0;
    this.port.onmessage = (e) => { const d = e.data; if (d.pitch !== undefined) { this.ratio = Math.pow(2, d.pitch / 12); return; } if (d.relen) { this.L = d.relen; return; } if (d.scr !== undefined) { if (this.m !== "scratch" || this.sw === undefined) return; const tg = Math.max(this.wa - this.N + 8192, this.sw + d.scr); this.rf = this.spT; this.rt = tg; this.rn = 0; this.rN = Math.max(48, Math.min(4096, Math.round((d.dt || .016) * sampleRate))); return; } if (d.at && d.at > currentFrame) this.pend = d; else this.set(d); };
  }
  set(d) {
    if (d.mode === "off") { this.tg = 0; return; }
    const N = this.N; this.tg = 1; this.m = d.mode;
    if (d.mode === "repeat" || d.mode === "roll") { this.L = d.len; this.st = (this.w - d.len + N) % N; this.p = 0; this.rate = 1; this.cnt = 0; this.minL = d.min || 256; this.fade = d.fade || 40; }
    else if (d.mode === "tape") { this.p = this.w; this.rate = 1; this.dec = 1 / (d.time * sampleRate); }
    else if (d.mode === "rev") { this.p = this.w - 1; }
    // the record under your hand: it holds the moment you grabbed, the track keeps recording underneath
    else if (d.mode === "scratch") { this.sw = this.wa; this.sp = this.wa; this.spT = this.wa; this.rf = this.rt = this.wa; this.rn = this.rN = 1; this.sg = 0; this.tg = 1; }
  }
  rd(c, pos) { const N = this.N, b = this.b[c]; pos = ((pos % N) + N) % N; const i = pos | 0, f = pos - i; return b[i] + (b[(i + 1) % N] - b[i]) * f; }
  prd(c, pos) { const N = this.PN, b = this.pb[c]; pos = ((pos % N) + N) % N; const i = pos | 0, f = pos - i; return b[i] + (b[(i + 1) % N] - b[i]) * f; }
  process(ins, outs) {
    const inp = ins[0] || [], out = outs[0], n = out[0].length, N = this.N;
    const il = inp[0], ir = inp[1] || inp[0];
    for (let k = 0; k < n; k++) {
      if (this.pend && currentFrame + k >= this.pend.at) { this.set(this.pend); this.pend = null; }
      const xl = il ? il[k] : 0, xr = ir ? ir[k] : 0;
      this.b[0][this.w] = xl; this.b[1][this.w] = xr;
      let wl = 0, wr = 0;
      if (this.tg > 0 || this.wet > 1e-4) {
        const m = this.m;
        if (m === "repeat" || m === "roll") {
          const F = this.fade, e = Math.min(1, this.p / F, (this.L - this.p) / F), pos = this.st + this.p;
          wl = this.rd(0, pos) * e; wr = this.rd(1, pos) * e; this.p += this.rate;
          if (this.p >= this.L) {
            this.p -= this.L;
            if (m === "roll" && this.tg && ++this.cnt >= 2 && this.L > this.minL) { this.L = Math.max(this.minL, this.L / 2); this.rate *= 1.06; this.cnt = 0; }
          }
        } else if (m === "tape") { wl = this.rd(0, this.p); wr = this.rd(1, this.p); this.p += this.rate; this.rate = Math.max(0, this.rate - this.dec); const g = Math.min(1, this.rate * 4); wl *= g; wr *= g; }
        else if (m === "scratch") {
          // the hand: each new position is reached smoothly over the time it took to arrive, like a real platter
          if (this.rn < this.rN) { this.rn++; this.spT = this.rf + (this.rt - this.rf) * (this.rn / this.rN); }
          const T = Math.min(this.spT, this.wa - 2), prev = this.sp; this.sp += (T - this.sp) * .06; const vel = this.sp - prev;
          if (!(this.sp === this.sp)) this.sp = this.wa;
          // a record you're holding still is silent; it comes up as it moves, a little duller when it's slow
          this.sg += (Math.min(1, Math.abs(vel) * 2.2) - this.sg) * .03;
          const a = .15 + Math.min(.85, Math.abs(vel) * .9); this.sl0 = (this.sl0 || 0) + (this.rd(0, this.sp) - (this.sl0 || 0)) * a; this.sr0 = (this.sr0 || 0) + (this.rd(1, this.sp) - (this.sr0 || 0)) * a;
          wl = this.sl0 * this.sg; wr = this.sr0 * this.sg;
        }
        else if (m === "rev") { const i = ((this.p | 0) % N + N) % N; wl = this.b[0][i]; wr = this.b[1][i]; this.p -= 1; }
      }
      this.wet += (this.tg - this.wet) * 0.004;
      let l = xl + (wl - xl) * this.wet, r = xr + (wr - xr) * this.wet;
      // pitch
      this.pb[0][this.pw] = l; this.pb[1][this.pw] = r;
      const want = this.ratio !== 1 ? 1 : 0; this.pmix += (want - this.pmix) * .003;
      if (this.pmix > 1e-4) {
        const W = this.W; this.d1 += 1 - this.ratio; if (this.d1 < 64) this.d1 += W; if (this.d1 >= 64 + W) this.d1 -= W;
        let d2 = this.d1 + W / 2; if (d2 >= 64 + W) d2 -= W;
        const g1 = 1 - Math.abs(2 * (this.d1 - 64) / W - 1), g2 = 1 - g1;
        const pl = this.prd(0, this.pw - this.d1) * g1 + this.prd(0, this.pw - d2) * g2, pr = this.prd(1, this.pw - this.d1) * g1 + this.prd(1, this.pw - d2) * g2;
        l += (pl - l) * this.pmix; r += (pr - r) * this.pmix;
      }
      this.pw = (this.pw + 1) % this.PN;
      if (!(l === l) || !(r === r)) { l = 0; r = 0; }   // never let a bad number into the effects after this
      out[0][k] = l; if (out[1]) out[1][k] = r;
      this.w = (this.w + 1) % N; this.wa++;
    }
    return true;
  }
}
registerProcessor("mangle", Mangle);
