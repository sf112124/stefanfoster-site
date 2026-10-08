// The sound of Synth-folio. Everything is made here in the browser: the drums, a breakbeat rendered once and sliced
// into sixteen, a reese bass, the loops and the effects. The only recorded sound is the FILMS bank, chopped from
// Stefan's own work.
export const STEPS = 16;
const SCALE = [0, 2, 3, 5, 7, 8, 10, 12];                 // F minor, low
const NAMES = ["F", "G", "G#", "A#", "C", "C#", "D#", "F"];
const ROOT = 43.65;
export const noteName = (d) => `${NAMES[d]}${d === 7 ? 2 : 1}`;
const hz = (deg, oct = 0) => ROOT * Math.pow(2, (SCALE[((deg % 8) + 8) % 8] + 12 * (oct + Math.floor(deg / 8))) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const FILMS = [
  ["la-croisiere", "CROIS 1", 0], ["la-croisiere", "CROIS 2", .57995], ["la-croisiere", "CROIS 3", 1.15991], ["la-croisiere", "CROIS 4", 1.73986],
  ["ai-commissions", "COMMS 1", 2.31982], ["ai-commissions", "COMMS 2", 2.89977], ["ai-commissions", "COMMS 3", 3.47973], ["ai-commissions", "COMMS 4", 4.05968],
  ["ai-experiments", "GOAT", 4.63964], ["ai-experiments", "SAMURAI", 5.21959], ["ai-experiments", "ZOMBIE", 5.79955], ["ai-experiments", "GROW", 6.3795],
  ["relax", "RELAX 1", 6.95946], ["relax", "RELAX 2", 7.53941], ["relax", "RELAX 3", 8.11937], ["relax", "RELAX 4", 8.69932],
].map(([p, n, o]) => ({ p, n, o, d: .55 }));
export const FX = ["ZAP", "BLIPS", "BOOM", "CRASH", "RISER", "DROP", "WARBLE", "GLITCH", "BELL", "METAL", "AHH", "REVERSE", "SQUELCH", "ARP", "NOISE", "SNAP"];
export const LOOPS = ["AMEN", "CHOP", "HALF", "EDIT", "REESE A", "REESE B", "SUB", "ACID", "PAD", "BELLS", "STABS", "VOX", "DRILL", "SHAKER", "RIMS", "SWELL"];
const LOOPBRK = { AMEN: [...Array(16).keys()], CHOP: [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 10, 11, 12, 12, 14, 4], HALF: [0, 1, 2, 3, 2, 3, 0, 1, 4, 5, 6, 7, 6, 13, 14, 15], EDIT: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5, 4, 4] };
const LOOPBASS = { "REESE A": [0, 0, 0, 0, -1, -1, 2, 2, -1, -1, 6, 6, 4, 4, -1, 5], "REESE B": [0, -1, 0, 0, 3, 3, -1, 2, 2, 2, -1, 7, 6, -1, 5, 5] };

export const blank = () => ({ kick: Array(16).fill(0), snare: Array(16).fill(0), ghost: Array(16).fill(0), hat: Array(16).fill(0), ohat: Array(16).fill(0), brk: Array(16).fill(-1), rev: Array(16).fill(0), bass: Array(16).fill(-1), pads: Array.from({ length: 16 }, () => []) });
const on = (arr, a) => { a.forEach((i) => (arr[i] = 1)); return arr; };
export const PRESETS = {
  JUNGLE: () => { const p = blank(); on(p.kick, [0, 10]); on(p.snare, [4, 12]); on(p.ghost, [14]); p.brk = [...Array(16).keys()]; p.bass = [0, 0, 0, 0, -1, -1, 2, 2, -1, -1, 6, 6, 4, 4, -1, 5]; return p; },
  HALFTIME: () => { const p = blank(); on(p.kick, [0, 3, 11]); on(p.snare, [8]); on(p.ghost, [6, 13, 15]); on(p.hat, [0, 2, 4, 6, 8, 10, 12, 14]); on(p.ohat, [7]); p.brk = [0, -1, 2, -1, 0, 1, -1, 3, 4, -1, 6, 7, -1, 13, 14, 15]; p.bass = [0, 0, 0, -1, -1, -1, 3, -1, -1, -1, -1, 5, 5, 5, 4, -1]; return p; },
  DRILL: () => { const p = blank(); on(p.kick, [0, 6, 9]); on(p.snare, [4, 12, 15]); on(p.ghost, [2, 7, 10, 13]); on(p.hat, [...Array(16).keys()]); p.brk = [0, 13, 2, 2, 4, 5, 12, 7, 8, 8, 8, 11, 12, 1, 14, 4]; p.rev[6] = 1; p.rev[13] = 1; p.bass = [0, -1, 0, -1, 7, -1, 0, -1, 6, 6, -1, 5, -1, 4, 3, -1]; return p; },
};

export class Engine {
  constructor() {
    this.bpm = 172; this.playing = false; this.step = 0; this.bar = 0; this.q = []; this.pat = PRESETS.JUNGLE(); this.cur = this.pat;
    this.k = { filter: 0, res: .2, crush: 0, delay: .12, drill: 0, swing: 0, chaos: .55, pitch: 0, tone: .45, rate: 3, depth: 0, dest: 0, shape: 0, vol: .75 };
    this.mutate = false; this.rec = false; this.loops = [null, null, null, null]; this.pend = [undefined, undefined, undefined, undefined];
    this.yours = []; this.ready = null; this.previewing = false;
  }
  // nothing is made until you touch something
  ensure() { return this.ready || (this.ready = this.init()); }
  async init() {
    const C = (this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" }));
    const G = (v = 1) => { const g = C.createGain(); g.gain.value = v; return g; };
    this.noise = C.createBuffer(1, C.sampleRate * 2, C.sampleRate); { const d = this.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    // buses
    this.mix = G(1); this.drums = G(.9); this.brkBus = G(.85); this.bassBus = G(.62); this.padBus = G(.7); this.prevBus = G(1); this.musicDuck = G(1);
    const sat = C.createWaveShaper(); { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); } sat.curve = c; }
    this.drums.connect(sat); sat.connect(this.musicDuck); this.brkBus.connect(this.musicDuck); this.bassBus.connect(this.musicDuck); this.padBus.connect(this.musicDuck);
    this.musicDuck.connect(this.mix); this.prevBus.connect(this.mix);
    // the mangler, if this browser can run it
    this.mg = null;
    try { await C.audioWorklet.addModule("synth/mangle.js"); this.mg = new AudioWorkletNode(C, "mangle", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] }); this.tap = new AudioWorkletNode(C, "tap"); this.prevBus.connect(this.tap); const z = G(0); this.tap.connect(z); z.connect(C.destination); } catch (e) { this.mg = null; }
    this.hp = C.createBiquadFilter(); this.hp.type = "highpass"; this.hp.frequency.value = 10;
    this.lp = C.createBiquadFilter(); this.lp.type = "lowpass"; this.lp.frequency.value = 20000;
    this.trem = G(1); this.post = G(1); this.master = G(this.k.vol);
    (this.mg ? (this.mix.connect(this.mg), this.mg) : this.mix).connect(this.hp); this.hp.connect(this.lp); this.lp.connect(this.trem); this.trem.connect(this.post); this.post.connect(this.master);
    // dub delay, three sixteenths
    this.dsend = G(this.k.delay); this.dl = C.createDelay(2); this.dfb = G(.48); this.dlp = C.createBiquadFilter(); this.dlp.type = "lowpass"; this.dlp.frequency.value = 2600; this.dhp = C.createBiquadFilter(); this.dhp.type = "highpass"; this.dhp.frequency.value = 250;
    this.post.connect(this.dsend); this.dsend.connect(this.dl); this.dl.connect(this.dlp); this.dlp.connect(this.dhp); this.dhp.connect(this.dfb); this.dfb.connect(this.dl); this.dhp.connect(this.master);
    const comp = C.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .16;
    const lim = C.createDynamicsCompressor(); lim.threshold.value = -3; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .08;
    this.out = C.createAnalyser(); this.out.fftSize = 1024;
    const clip = C.createWaveShaper(); { const c = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = (i / 1023.5 - 1) * 1.25; c[i] = Math.tanh(x) * .98; } clip.curve = c; }
    this.master.connect(comp); comp.connect(lim); lim.connect(clip); clip.connect(this.out); this.out.connect(C.destination);
    // a scope on each part of the mix
    this.scopes = [this.drums, this.brkBus, this.bassBus, this.padBus, this.prevBus].map((b) => { const a = C.createAnalyser(); a.fftSize = 512; b.connect(a); return a; });
    // the reese: two detuned saws and a sine, always running, opened and closed per note
    this.bass = { amp: G(0), lp: C.createBiquadFilter(), o: [] };
    this.bass.lp.type = "lowpass"; this.bass.lp.Q.value = 3; this.bass.lp.frequency.value = 600;
    [["sawtooth", -17, .5], ["sawtooth", 17, .5], ["sine", -1200, .9]].forEach(([t, dt, v]) => { const o = C.createOscillator(); o.type = t; o.detune.value = dt; o.frequency.value = ROOT; const g = G(v); o.connect(g); g.connect(this.bass.lp); o.start(); this.bass.o.push(o); });
    const wob = C.createOscillator(); wob.frequency.value = .35; const wg = G(260); wob.connect(wg); wg.connect(this.bass.lp.frequency); wob.start();
    this.bass.lp.connect(this.bass.amp); this.bass.amp.connect(this.bassBus);
    // the LFO, routed wherever you send it
    this.lfo = null; this.lfoT0 = C.currentTime; this.lfoG = { f: G(0), p: G(0), c: G(0), g: G(0) };
    this.lfoG.f.connect(this.lp.detune); this.lfoG.f.connect(this.hp.detune); this.bass.o.forEach((o) => this.lfoG.p.connect(o.detune)); this.lfoG.g.connect(this.trem.gain);
    if (this.mg) this.lfoG.c.connect(this.mg.parameters.get("crush"));
    this.restartLfo(C.currentTime);
    // the break, rendered once, and the films
    this.brk = await renderBreak(C.sampleRate); this.brkRev = reverse(C, this.brk);
    this.films = null; fetch("synth/films.wav").then((r) => r.arrayBuffer()).then((b) => new Promise((res, rej) => C.decodeAudioData(b, res, rej))).then((b) => (this.films = b)).catch(() => {});
    this.applyAll(); this.apply("bpm");
    return this;
  }
  t() { return this.ctx ? this.ctx.currentTime : 0; }
  emit(type, t, d) { this.q.push({ type, t, d }); }
  // ---------------- knobs ----------------
  set(name, v) { this.k[name] = v; if (this.ctx) this.apply(name); }
  applyAll() { Object.keys(this.k).forEach((n) => this.apply(n)); }
  apply(n) {
    const C = this.ctx, now = C.currentTime, k = this.k, sm = (p, v, tc = .03) => p.setTargetAtTime(v, now, tc);
    if (n === "filter" || n === "res") {
      const f = k.filter, Q = .7 + k.res * 16;
      if (f < 0) { sm(this.lp.frequency, 20000 * Math.pow(2, f * 9)); sm(this.hp.frequency, 10); this.lp.Q.value = Q; this.hp.Q.value = .7; }
      else { sm(this.hp.frequency, 10 * Math.pow(2, f * 10.5)); sm(this.lp.frequency, 20000); this.hp.Q.value = f > .02 ? Q : .7; this.lp.Q.value = .7; }
    }
    if (n === "crush" && this.mg) sm(this.mg.parameters.get("crush"), k.crush, .02);
    if (n === "delay") { sm(this.dsend.gain, k.delay * .9); sm(this.dfb.gain, .3 + k.delay * .42); }
    if (n === "vol") sm(this.master.gain, k.vol);
    if (n === "tone") sm(this.bass.lp.frequency, 140 * Math.pow(2, k.tone * 5));
    if (n === "rate" || n === "shape") this.restartLfo(this.playing ? this.t0 : now);
    if (n === "depth" || n === "dest") {
      const d = k.depth, g = this.lfoG;
      sm(g.f.gain, k.dest === 0 ? d * 3600 : 0); sm(g.p.gain, k.dest === 1 ? d * 1200 : 0); sm(g.c.gain, k.dest === 2 ? d * .45 : 0);
      sm(g.g.gain, k.dest === 3 ? d * .5 : 0); sm(this.trem.gain, k.dest === 3 ? 1 - d * .5 : 1);
    }
    if (n === "bpm") this.dl.delayTime.setTargetAtTime(this.sd() * 3, now, .05);
  }
  setBpm(b) { this.bpm = Math.max(80, Math.min(200, Math.round(b))); if (this.ctx) { this.apply("bpm"); this.restartLfo(this.playing ? this.t0 : this.ctx.currentTime); } }
  sd() { return 60 / this.bpm / 4; }
  lfoHz() { return (this.bpm / 60) * [.25, .5, 1, 2, 4, 8, 4 / 3][this.k.rate]; }
  restartLfo(t0) {
    const C = this.ctx; if (!C) return;
    try { this.lfo && this.lfo.stop(); } catch (e) {}
    const o = C.createOscillator(); o.type = ["sine", "square", "sawtooth"][this.k.shape]; o.frequency.value = this.lfoHz();
    Object.values(this.lfoG).forEach((g) => o.connect(g)); o.start(Math.max(C.currentTime, t0)); this.lfo = o; this.lfoT0 = t0;
  }
  // the LFO's value right now, for the picture to follow
  lfoAt(t) { const ph = (((t - this.lfoT0) * this.lfoHz()) % 1 + 1) % 1; return [Math.sin(ph * 6.2832), ph < .5 ? 1 : -1, ph * 2 - 1][this.k.shape]; }
  // ---------------- transport ----------------
  async play() {
    await this.ensure(); const C = this.ctx; if (C.state !== "running") await C.resume();
    if (this.playing) return; this.playing = true; this.step = 0; this.bar = 0; this.t0 = C.currentTime + .06; this.nextT = this.t0; this.restartLfo(this.t0);
    this.loops = this.loops.map((l, i) => (this.pend[i] !== undefined ? this.pend[i] : l)); this.pend = [undefined, undefined, undefined, undefined];
    this.timer = setInterval(() => this.tick(), 20); this.tick();
  }
  stop() {
    if (!this.playing) return; this.playing = false; clearInterval(this.timer);
    const now = this.ctx.currentTime; this.bass.amp.gain.cancelScheduledValues(now); this.bass.amp.gain.setTargetAtTime(0, now, .02);
    this.emit("stop", now);
  }
  tick() {
    const C = this.ctx;
    while (this.nextT < C.currentTime + .12) {
      const s = this.step, sw = s % 2 ? this.k.swing * this.sd() * .42 : 0;
      this.playStep(s, this.nextT + sw);
      this.nextT += this.sd(); this.step = (s + 1) % 16; if (this.step === 0) this.bar++;
    }
  }
  playStep(s, t) {
    if (s === 0) {
      this.loops = this.loops.map((l, i) => (this.pend[i] !== undefined ? this.pend[i] : l)); this.pend = [undefined, undefined, undefined, undefined];
      this.cur = this.mutate ? mutate(this.pat) : this.pat; this.emit("bar", t, { bar: this.bar, loops: [...this.loops] });
    }
    const p = this.cur, sd = this.sd(), dr = this.k.drill;
    this.emit("step", t, s);
    const rat = (fn, v, kind) => {
      if (dr > 0 && Math.random() < dr * .5) { const n = pick([2, 3, 4, 4, 6, 8]); for (let i = 0; i < n; i++) fn(t + (i * sd) / n, v * (.55 + .45 * i / n), 1 + i * .07 * dr, sd / n); this.emit("roll", t, { n, kind }); }
      else fn(t, v, 1, sd);
    };
    if (p.kick[s]) { this.kick(t, 1); this.emit("kick", t, 1); }
    if (p.snare[s]) { rat((tt, v, pp) => this.snare(tt, v, 0, pp), 1, "snare"); this.emit("snare", t, 1); }
    if (p.ghost[s]) { rat((tt, v, pp) => this.snare(tt, v * .32, 1, pp), 1, "ghost"); this.emit("ghost", t, .32); }
    if (p.hat[s]) { rat((tt, v, pp) => this.hat(tt, v * (s % 4 === 2 ? .55 : .34), 0, pp), 1, "hat"); this.emit("hat", t, .4); }
    if (p.ohat[s]) { this.hat(t, .42, 1); this.emit("hat", t, .6); }
    if (p.brk[s] >= 0) { const sl = p.brk[s], rv = p.rev[s]; rat((tt, v, pp, dd) => this.slice(sl, tt, dd, rv, v, pp), 1, "brk"); this.emit("brk", t, { sl, s, rv }); }
    if (p.bass[s] >= 0) {
      const d = p.bass[s], tied = s > 0 && p.bass[s - 1] === d; let n = 1; while (s + n < 16 && p.bass[s + n] === d) n++;
      if (!tied) { this.bassNote(d, t, n * sd, s > 0 && p.bass[s - 1] >= 0); this.emit("bass", t, { d, n }); }
    }
    p.pads[s].forEach((id) => this.pad(id, t, true));
    this.loops.forEach((id) => id != null && this.loopStep(id, s, t, sd));
  }
  // ---------------- voices ----------------
  env(g, t, v, a, d) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + a + d); }
  nz(t, d, dest, fType, f, Q = 1, v = 1, a = .001) {
    const C = this.ctx, s = C.createBufferSource(); s.buffer = this.noise; const fl = C.createBiquadFilter(); fl.type = fType; fl.frequency.value = f; fl.Q.value = Q; const g = C.createGain();
    s.connect(fl); fl.connect(g); g.connect(dest); this.env(g, t, v, a, d); s.start(t, Math.random() * 1.5); s.stop(t + a + d + .05); return { s, fl, g };
  }
  tone(t, type, f0, f1, d, dest, v = 1, glide = d * .6, a = .002) {
    const C = this.ctx, o = C.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + glide);
    const g = C.createGain(); o.connect(g); g.connect(dest); this.env(g, t, v, a, d); o.start(t); o.stop(t + a + d + .05); return { o, g };
  }
  kick(t, v) { this.tone(t, "sine", 165, 46, .36, this.drums, v, .09); this.nz(t, .012, this.drums, "bandpass", 3200, .8, v * .5); }
  snare(t, v, ghost, p = 1) { this.nz(t, ghost ? .07 : .17, this.drums, "bandpass", 1900 * p, .7, v * .9); this.tone(t, "triangle", 210 * p, 165 * p, ghost ? .05 : .1, this.drums, v * .55); }
  hat(t, v, open, p = 1) {
    if (!open && this.oh) { try { this.oh.g.gain.cancelScheduledValues(t); this.oh.g.gain.setTargetAtTime(0, t, .006); } catch (e) {} this.oh = null; }
    const h = this.nz(t, open ? .26 : .035, this.drums, "highpass", 7200 * p, .6, v); if (open) this.oh = h;
  }
  slice(i, t, dur, rev, v = 1, p = 1) {
    const C = this.ctx, b = rev ? this.brkRev : this.brk, L = b.duration / 16, rate = Math.pow(2, this.k.pitch / 12) * p, len = Math.min(L / rate, dur + .004);
    const s = C.createBufferSource(); s.buffer = b; s.playbackRate.value = rate; this.lfoG.p.connect(s.detune);
    const g = C.createGain(); s.connect(g); g.connect(this.brkBus);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .002); g.gain.setValueAtTime(v, t + Math.max(.003, len - .006)); g.gain.linearRampToValueAtTime(0, t + len);
    s.start(t, (rev ? 15 - i : i) * L); s.stop(t + len + .02);
    s.onended = () => { try { this.lfoG.p.disconnect(s.detune); } catch (e) {} };
  }
  bassNote(d, t, len, glide) {
    const f = hz(d), a = this.bass.amp.gain;
    this.bass.o.forEach((o) => { o.frequency.cancelScheduledValues(t); if (glide) o.frequency.setTargetAtTime(f, t, .035); else o.frequency.setValueAtTime(f, t); });
    a.cancelScheduledValues(t); a.setTargetAtTime(.75, t, glide ? .01 : .004); a.setTargetAtTime(0, t + len - .012, .012);
  }
  // ---------------- pads ----------------
  // ids look like "b3" (break slice), "f7" (film), "x2" (effect), "y0" (one you sampled)
  async pad(id, t, fromSeq) {
    await this.ensure(); const C = this.ctx; if (C.state !== "running") C.resume();
    t = t ?? C.currentTime + .004; const k = id[0], i = +id.slice(1);
    if (k === "b") this.slice(i, t, this.brk.duration / 16, 0);
    else if (k === "f" && this.films) { const f = FILMS[i]; this.buf(this.films, t, f.o, f.d, this.padBus, 1); }
    else if (k === "y" && this.yours[i]) this.buf(this.yours[i].b, t, 0, this.yours[i].b.duration, this.padBus, 1);
    else if (k === "x") this.fx(i, t);
    if (!fromSeq && this.rec && this.playing) { const s = Math.round(this.step - (this.nextT - t) / this.sd()); const st = ((s % 16) + 16) % 16; if (!this.pat.pads[st].includes(id)) this.pat.pads[st].push(id); this.emit("recd", t, st); }
    this.emit("pad", t, { id, p: k === "f" ? FILMS[i].p : k === "y" ? this.yours[i]?.p : null });
  }
  buf(b, t, off, dur, dest, v) { const C = this.ctx, s = C.createBufferSource(); s.buffer = b; const g = C.createGain(); g.gain.value = v; s.connect(g); g.connect(dest); s.start(t, off, dur); }
  fx(i, t) {
    const B = this.padBus, n = FX[i];
    if (n === "ZAP") this.tone(t, "square", 2400, 70, .16, B, .35, .14);
    else if (n === "BLIPS") [1760, 2637, 3520, 2637].forEach((f, k) => this.tone(t + k * this.sd() / 2, "sine", f, f, .05, B, .3));
    else if (n === "BOOM") { this.tone(t, "sine", 70, 28, 1.3, B, 1, 1); this.nz(t, .3, B, "lowpass", 220, 1, .8); }
    else if (n === "CRASH") { this.nz(t, 1.5, B, "highpass", 3200, .5, .5); this.metal(t, 1.2, .18); }
    else if (n === "RISER") { const r = this.nz(t, 1.7, B, "bandpass", 400, 4, .45, 1.5); r.fl.frequency.exponentialRampToValueAtTime(9000, t + 1.6); this.tone(t, "sawtooth", 110, 880, 1.7, B, .12, 1.6, 1.4); }
    else if (n === "DROP") this.tone(t, "sine", 320, 30, .9, B, .9, .8);
    else if (n === "WARBLE") { const o = this.tone(t, "triangle", 500, 500, 1, B, .3), m = this.ctx.createOscillator(), mg = this.ctx.createGain(); m.frequency.value = 9; mg.gain.value = 180; m.connect(mg); mg.connect(o.o.frequency); m.start(t); m.stop(t + 1.1); m.frequency.linearRampToValueAtTime(2, t + 1); }
    else if (n === "GLITCH") for (let k = 0; k < 14; k++) { const tt = t + Math.random() * .35; Math.random() < .5 ? this.tone(tt, "square", rnd(80, 4000), rnd(80, 4000), rnd(.01, .04), B, .22, .02) : this.nz(tt, rnd(.005, .03), B, "bandpass", rnd(500, 9000), 3, .5); }
    else if (n === "BELL") this.bell(t, 880 * Math.pow(2, rnd(-20, 20) / 1200), 2.2, .5);
    else if (n === "METAL") this.metal(t, .5, .35);
    else if (n === "AHH") this.vox(t, hz(4, 2), 1.1, .5);
    else if (n === "REVERSE") { const r = this.nz(t, 0, B, "highpass", 2500, .5, 0); r.g.gain.cancelScheduledValues(t); r.g.gain.setValueAtTime(.001, t); r.g.gain.exponentialRampToValueAtTime(.6, t + .9); r.g.gain.setValueAtTime(0, t + .92); r.s.stop(t + 1); }
    else if (n === "SQUELCH") this.acid(t, hz(0, 2), .35, 1);
    else if (n === "ARP") [0, 2, 4, 7, 9, 11, 14, 11].forEach((d, k) => this.tone(t + k * this.sd() / 2, "square", hz(d, 3), hz(d, 3), .06, B, .14));
    else if (n === "NOISE") this.nz(t, .3, B, "lowpass", 9000, .5, .5);
    else if (n === "SNAP") { this.nz(t, .06, B, "bandpass", 2600, 2.5, .9); this.tone(t, "sine", 1200, 600, .02, B, .3); }
  }
  metal(t, d, v) { [1, 1.34, 1.23, 1.65, 1.95, 2.15].forEach((r) => { const o = this.tone(t, "square", 420 * r, 420 * r, d, this.padBus, v / 6); }); }
  bell(t, f, d, v) { const C = this.ctx, c = C.createOscillator(), m = C.createOscillator(), mg = C.createGain(), g = C.createGain(); c.frequency.value = f; m.frequency.value = f * 3.5; mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(1, t + d * .6); m.connect(mg); mg.connect(c.frequency); c.connect(g); g.connect(this.padBus); this.env(g, t, v, .002, d); c.start(t); m.start(t); c.stop(t + d + .1); m.stop(t + d + .1); }
  vox(t, f, d, v) { const C = this.ctx, o = C.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; const g = C.createGain(); [[730, 7, 1], [1090, 8, .6], [2440, 9, .25]].forEach(([ff, Q, vv]) => { const b = C.createBiquadFilter(); b.type = "bandpass"; b.frequency.value = ff; b.Q.value = Q; const bg = C.createGain(); bg.gain.value = vv * 3; o.connect(b); b.connect(bg); bg.connect(g); }); g.connect(this.padBus); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .08); g.gain.setTargetAtTime(0, t + d * .7, d * .2); o.start(t); o.stop(t + d * 1.6); }
  acid(t, f, d, acc) { const C = this.ctx, o = C.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; const fl = C.createBiquadFilter(); fl.type = "lowpass"; fl.Q.value = 16; fl.frequency.setValueAtTime(300 + acc * 3800, t); fl.frequency.exponentialRampToValueAtTime(260, t + d * .8); const g = C.createGain(); o.connect(fl); fl.connect(g); g.connect(this.padBus); this.env(g, t, .2 + acc * .12, .003, d); o.start(t); o.stop(t + d + .05); }
  // ---------------- loops: launched from the pads, they start on the next bar ----------------
  toggleLoop(i) { const row = i >> 2, cur = this.pend[row] !== undefined ? this.pend[row] : this.loops[row]; const next = cur === i ? null : i; if (this.playing) this.pend[row] = next; else this.loops[row] = next; return next; }
  loopStep(id, s, t, sd) {
    const n = LOOPS[id], b = this.bar;
    if (LOOPBRK[n]) { const sl = LOOPBRK[n][s]; if (sl >= 0) { this.slice(sl, t, sd, n === "EDIT" && s >= 14, .9); this.emit("brk", t, { sl, s, rv: 0 }); } }
    else if (LOOPBASS[n]) { if (this.cur.bass.some((x) => x >= 0)) return; const p = LOOPBASS[n], d = p[s]; if (d >= 0 && !(s > 0 && p[s - 1] === d)) { let k = 1; while (s + k < 16 && p[s + k] === d) k++; this.bassNote(d, t, k * sd, s > 0 && p[s - 1] >= 0); this.emit("bass", t, { d, n: k }); } }
    else if (n === "SUB") { if (s % 4 === 0) this.tone(t, "sine", hz(s === 12 ? 6 : 0, 1) * 1.02, hz(s === 12 ? 6 : 0), sd * 3.5, this.bassBus, .9, .05); }
    else if (n === "ACID") { const line = [0, 0, 7, 0, 3, 0, 10, 7, 0, 5, 0, 12, 3, 0, 7, 8], acc = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0]; if (s % 2 === 0 || acc[s] || Math.random() < .5) this.acid(t, ROOT * 4 * Math.pow(2, line[s] / 12), sd * .9, acc[s]); }
    else if (n === "PAD") { if (s === 0 && b % 2 === 0) [0, 2, 4, 6, 8].forEach((d, k) => { this.tone(t, "sawtooth", hz(d, 2), hz(d, 2), sd * 30, this.padBus, .035, 1, .9); this.tone(t, "triangle", hz(d, 2) * 1.004, hz(d, 2) * 1.004, sd * 30, this.padBus, .05, 1, 1.2); }); }
    else if (n === "BELLS") { const ar = [7, 9, 11, 14, 11, 9, 4, 6]; if (s % 2 === 0) this.bell(t, hz(ar[(s / 2 + b) % 8], 3) * Math.pow(2, rnd(-25, 25) / 1200), 1.1, .16); }
    else if (n === "STABS") { if (s === 3 || s === 11 || (s === 14 && b % 2)) [0, 2, 4].forEach((d) => this.acid(t, hz(d, 3), sd * 1.6, .6)); }
    else if (n === "VOX") { if (s === 0) this.vox(t, hz(b % 4 === 3 ? 5 : b % 2 ? 2 : 0, 3), sd * 14, .22); }
    else if (n === "DRILL") { for (let k = 0; k < 2; k++) if (Math.random() < .7) { const tt = t + k * sd / 2; if (Math.random() < .12) for (let r = 0; r < 4; r++) this.hat(tt + r * sd / 8, .22, 0, 1 + r * .12); else this.hat(tt, rnd(.12, .3), 0, rnd(.8, 1.3)); } }
    else if (n === "SHAKER") this.nz(t, .05, this.padBus, "highpass", 6000, .7, s % 2 ? .22 : .1, .012);
    else if (n === "RIMS") { if ([3, 6, 10, 13].includes(s)) { this.nz(t, .025, this.padBus, "bandpass", 2100, 4, .7); this.tone(t, "triangle", 430, 430, .03, this.padBus, .3); } }
    else if (n === "SWELL") { if (s === 0 && b % 2 === 0) { const r = this.nz(t, 0, this.padBus, "highpass", 3000, .5, 0), L = sd * 32; r.g.gain.cancelScheduledValues(t); r.g.gain.setValueAtTime(.001, t); r.g.gain.exponentialRampToValueAtTime(.4, t + L - .01); r.g.gain.setValueAtTime(0, t + L); r.s.stop(t + L + .02); } }
  }
  // ---------------- the momentary effects ----------------
  hold(mode) {
    if (!this.mg) return; const sr = this.ctx.sampleRate, sd = this.sd();
    if (mode === "repeat") this.mg.port.postMessage({ mode, len: Math.round(sd * sr) });
    else if (mode === "roll") this.mg.port.postMessage({ mode, len: Math.round(sd * 2 * sr), min: Math.round(sd / 4 * sr) });
    else if (mode === "tape") this.mg.port.postMessage({ mode, time: .7 });
    else this.mg.port.postMessage({ mode });
  }
  release() { this.mg && this.mg.port.postMessage({ mode: "off" }); }
  // ---------------- previewing the work ----------------
  attachPreview(video) {
    if (!this.ctx || video._src) return;
    try { video._src = this.ctx.createMediaElementSource(video); video._src.connect(this.prevBus); } catch (e) {}
  }
  duck(on) { this.previewing = on; if (this.ctx) this.musicDuck.gain.setTargetAtTime(on ? .3 : 1, this.ctx.currentTime, .08); }
  // grab the last half bar of the film you're previewing onto a pad
  sample(p) {
    return new Promise((res) => {
      if (!this.tap) return res(null);
      const n = Math.round(this.sd() * 8 * this.ctx.sampleRate);
      this.tap.port.onmessage = (e) => {
        const d = e.data; let pk = 0; for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
        if (pk < .003) return res(null);
        const b = this.ctx.createBuffer(1, d.length, this.ctx.sampleRate), o = b.getChannelData(0), fi = 96;
        for (let i = 0; i < d.length; i++) o[i] = (d[i] / pk) * .9 * Math.min(1, i / fi, (d.length - i) / 600);
        const slot = { b, p }; if (this.yours.length >= 16) this.yours.shift(); this.yours.push(slot); res(this.yours.length - 1);
      };
      this.tap.port.postMessage({ n });
    });
  }
  clear() { this.pat = blank(); this.cur = this.pat; }
}

// each bar plays a slight variation, then lets go of it
function mutate(p) {
  const q = JSON.parse(JSON.stringify(p)), r = Math.floor(rnd(1, 4));
  for (let k = 0; k < r; k++) {
    const s = Math.floor(rnd(0, 16)), o = Math.random();
    if (o < .25) q.hat[s] = q.hat[s] ? 0 : 1;
    else if (o < .45) q.ghost[s] = q.ghost[s] ? 0 : 1;
    else if (o < .7) { const a = Math.floor(rnd(0, 16)); if (q.brk[s] >= 0 && q.brk[a] >= 0) [q.brk[s], q.brk[a]] = [q.brk[a], q.brk[s]]; }
    else if (o < .82) { if (q.brk[s] >= 0) q.rev[s] = 1 - q.rev[s]; }
    else if (o < .92) { if (s > 8 && q.brk[s] >= 0) q.brk[s] = q.brk[s - 1] >= 0 ? q.brk[s - 1] : q.brk[s]; }
    else q.ohat[s] = q.ohat[s] ? 0 : 1;
  }
  return q;
}
function reverse(C, b) { const r = C.createBuffer(b.numberOfChannels, b.length, b.sampleRate); for (let c = 0; c < b.numberOfChannels; c++) { const s = b.getChannelData(c), d = r.getChannelData(c); for (let i = 0; i < s.length; i++) d[i] = s[s.length - 1 - i]; } return r; }

// one bar of an old-record-sounding break at 170, played once into a buffer, then roughed up
async function renderBreak(sr) {
  const st = 60 / 170 / 4, len = Math.round(st * 16 * sr), oc = new OfflineAudioContext(1, len, sr);
  const nb = oc.createBuffer(1, sr, sr); { const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const out = oc.createGain(); out.connect(oc.destination);
  const env = (g, t, v, a, d) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + a + d); };
  const nz = (t, d, type, f, Q, v) => { const s = oc.createBufferSource(); s.buffer = nb; const fl = oc.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = Q; const g = oc.createGain(); s.connect(fl); fl.connect(g); g.connect(out); env(g, t, v, .001, d); s.start(t, Math.random() * .5); };
  const tn = (t, type, f0, f1, d, v, gl) => { const o = oc.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + gl); const g = oc.createGain(); o.connect(g); g.connect(out); env(g, t, v, .002, d); o.start(t); o.stop(t + d + .05); };
  const T = (s) => s * st + (s % 2 ? st * .07 : 0);
  [[0, 1], [2, .9], [10, .95], [11, .55]].forEach(([s, v]) => { tn(T(s), "sine", 130, 52, .3, v, .07); nz(T(s), .02, "lowpass", 900, 1, v * .5); });
  [[4, 1], [7, .5], [9, .55], [12, 1], [15, .5], [6, .18], [14, .2], [1, .12]].forEach(([s, v]) => { nz(T(s), .2 * (v > .6 ? 1 : .5), "bandpass", 2300, .8, v * .85); tn(T(s), "triangle", 230, 185, .1, v * .5, .05); nz(T(s), .3, "highpass", 5000, .5, v * .15); });
  for (let s = 0; s < 16; s += 2) [1, 1.342, 1.2312, 1.6532, 1.9523, 2.1523].forEach((r) => { const t = T(s), o = oc.createOscillator(); o.type = "square"; o.frequency.value = 345 * r; const f = oc.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000; const g = oc.createGain(); o.connect(f); f.connect(g); g.connect(out); env(g, t, (s % 8 === 0 ? .06 : .035), .001, .32); o.start(t); o.stop(t + .4); });
  const b = await oc.startRendering(), d = b.getChannelData(0);
  // a small room, some drive, twelve bits
  const c1 = Math.round(.019 * sr), c2 = Math.round(.027 * sr);
  for (let i = 0; i < d.length; i++) { d[i] += (i >= c1 ? d[i - c1] * .22 : 0) + (i >= c2 ? d[i - c2] * .16 : 0); }
  let pk = 0; for (let i = 0; i < d.length; i++) { d[i] = Math.tanh(d[i] * 1.8); pk = Math.max(pk, Math.abs(d[i])); }
  const q = 2048; for (let i = 0; i < d.length; i++) d[i] = Math.round((d[i] / pk) * .9 * q) / q;
  return b;
}
