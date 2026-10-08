// The mangler: sits on the whole mix and keeps the last few seconds in a loop of tape, so it can repeat, roll,
// stop, reverse or freeze what you just heard. Plus a crusher for bits and sample rate.
class Mangle extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: "crush", defaultValue: 0, minValue: 0, maxValue: 1 }]; }
  constructor() {
    super();
    this.N = (sampleRate * 6) | 0; this.b = [new Float32Array(this.N), new Float32Array(this.N)];
    this.w = 0; this.m = ""; this.wet = 0; this.tg = 0; this.hl = 0; this.hr = 0; this.hc = 0;
    this.port.onmessage = (e) => this.set(e.data);
  }
  set(d) {
    if (d.mode === "off") { this.tg = 0; return; }
    const N = this.N; this.tg = 1; this.m = d.mode;
    if (d.mode === "repeat" || d.mode === "roll") { this.L = d.len; this.st = (this.w - d.len + N) % N; this.p = 0; this.rate = 1; this.cnt = 0; this.minL = d.min || 256; }
    else if (d.mode === "tape") { this.p = this.w; this.rate = 1; this.dec = 1 / (d.time * sampleRate); }
    else if (d.mode === "rev") { this.p = this.w - 1; }
    else if (d.mode === "freeze") { this.G = Math.floor(0.11 * sampleRate); this.st = (this.w - this.G * 2 + N) % N; this.a = 0; }
  }
  rd(c, pos) { const N = this.N, b = this.b[c]; pos = ((pos % N) + N) % N; const i = pos | 0, f = pos - i; return b[i] + (b[(i + 1) % N] - b[i]) * f; }
  process(ins, outs, params) {
    const inp = ins[0] || [], out = outs[0], n = out[0].length, N = this.N, cr = params.crush;
    const il = inp[0], ir = inp[1] || inp[0];
    for (let k = 0; k < n; k++) {
      const xl = il ? il[k] : 0, xr = ir ? ir[k] : 0;
      this.b[0][this.w] = xl; this.b[1][this.w] = xr;
      let wl = 0, wr = 0;
      if (this.tg > 0 || this.wet > 1e-4) {
        const m = this.m;
        if (m === "repeat" || m === "roll") {
          const e = Math.min(1, this.p / 40, (this.L - this.p) / 40), pos = this.st + this.p;
          wl = this.rd(0, pos) * e; wr = this.rd(1, pos) * e; this.p += this.rate;
          if (this.p >= this.L) {
            this.p -= this.L;
            if (m === "roll" && this.tg && ++this.cnt >= 2 && this.L > this.minL) { this.L = Math.max(this.minL, this.L / 2); this.rate *= 1.06; this.cnt = 0; }
          }
        } else if (m === "tape") { wl = this.rd(0, this.p); wr = this.rd(1, this.p); this.p += this.rate; this.rate = Math.max(0, this.rate - this.dec); const g = Math.min(1, this.rate * 4); wl *= g; wr *= g; }
        else if (m === "rev") { const i = ((this.p | 0) % N + N) % N; wl = this.b[0][i]; wr = this.b[1][i]; this.p -= 1; }
        else if (m === "freeze") {
          const G = this.G, a1 = this.a % G, a2 = (this.a + G / 2) % G, w1 = Math.sin(Math.PI * a1 / G) ** 2, w2 = Math.sin(Math.PI * a2 / G) ** 2;
          wl = this.rd(0, this.st + a1) * w1 + this.rd(0, this.st + G * .37 + a2) * w2; wr = this.rd(1, this.st + G * .21 + a1) * w1 + this.rd(1, this.st + a2) * w2; this.a += 1;
        }
      }
      this.wet += (this.tg - this.wet) * 0.004;
      let l = xl + (wl - xl) * this.wet, r = xr + (wr - xr) * this.wet;
      const amt = cr.length > 1 ? cr[k] : cr[0];
      if (amt > 0.002) {
        const hold = 1 + Math.floor(amt * amt * 36);
        if (this.hc++ % hold === 0) { this.hl = l; this.hr = r; }
        const q = Math.pow(2, 15 - amt * 12);
        l = Math.round(this.hl * q) / q; r = Math.round(this.hr * q) / q;
      }
      out[0][k] = l; if (out[1]) out[1][k] = r;
      this.w = (this.w + 1) % N;
    }
    return true;
  }
}
// keeps the last few seconds of the mic, so you can chop it onto pads
class Tap extends AudioWorkletProcessor {
  constructor(o) {
    super(); this.N = (sampleRate * ((o && o.processorOptions && o.processorOptions.sec) || 4)) | 0; this.b = new Float32Array(this.N); this.w = 0;
    this.port.onmessage = (e) => { const n = Math.min(this.N, e.data.n | 0), o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = this.b[(this.w - n + i + this.N) % this.N]; this.port.postMessage(o, [o.buffer]); };
  }
  process(ins) {
    const i = ins[0]; if (i && i[0]) { const a = i[0], b = i[1]; for (let k = 0; k < a.length; k++) { this.b[this.w] = b ? (a[k] + b[k]) * .5 : a[k]; this.w = (this.w + 1) % this.N; } }
    return true;
  }
}
registerProcessor("mangle", Mangle);
registerProcessor("tap", Tap);
