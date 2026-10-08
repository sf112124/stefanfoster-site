// The sound of Synth-folio. Real breaks (a real Amen, three bars of it, plus four more), a jungle kit, sub and 808
// basses, rave stabs and hoovers, chops from Stefan's films, and whatever you record into the mic. The synth only
// makes the reese, the pads and the bells.
import { DRUMS, FXS, BASSES } from "./samples.js";
export const STEPS = 16;
const SCALE = [0, 2, 3, 5, 7, 8, 10, 12];                 // F minor
const NAMES = ["F", "G", "G#", "A#", "C", "C#", "D#", "F"];
const ROOT = 43.65;
export const noteName = (d) => `${NAMES[d]}${d === 7 ? 2 : 1}`;
const hz = (deg, oct = 0) => ROOT * Math.pow(2, (SCALE[((deg % 8) + 8) % 8] + 12 * (oct + Math.floor(deg / 8))) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const BREAKS = ["AMEN 1", "AMEN 2", "AMEN 3", "RAW", "PLEAD", "STACK", "STOMP"];
export const BASSV = ["808", "DEEP", "SINE", "WAH", "REESE"];
export const FILMS = [
  ["la-croisiere", "CROIS 1", 0], ["la-croisiere", "CROIS 2", .57995], ["la-croisiere", "CROIS 3", 1.15991], ["la-croisiere", "CROIS 4", 1.73986],
  ["ai-commissions", "COMMS 1", 2.31982], ["ai-commissions", "COMMS 2", 2.89977], ["ai-commissions", "COMMS 3", 3.47973], ["ai-commissions", "COMMS 4", 4.05968],
  ["ai-experiments", "GOAT", 4.63964], ["ai-experiments", "SAMURAI", 5.21959], ["ai-experiments", "ZOMBIE", 5.79955], ["ai-experiments", "GROW", 6.3795],
  ["relax", "RELAX 1", 6.95946], ["relax", "RELAX 2", 7.53941], ["relax", "RELAX 3", 8.11937], ["relax", "RELAX 4", 8.69932],
].map(([p, n, o]) => ({ p, n, o, d: .55 }));
export const FX = Object.keys(FXS);
export const LOOPS = ["AMEN", "RAW", "PLEAD", "STACK", "808 A", "808 B", "REESE", "WAH", "PAD", "STABS", "HOOVER", "CHOIR", "RIDE", "HATS", "DRILL", "SWELL"];

export const blank = () => ({ brkSel: 0, kick: Array(16).fill(0), snare: Array(16).fill(0), ghost: Array(16).fill(0), hat: Array(16).fill(0), ohat: Array(16).fill(0), brk: Array(16).fill(-1), rev: Array(16).fill(0), bass: Array(16).fill(-1), pads: Array.from({ length: 16 }, () => []) });
const on = (arr, a) => { a.forEach((i) => (arr[i] = 1)); return arr; };
export const PRESETS = {
  JUNGLE: () => { const p = blank(); on(p.kick, [0, 10]); p.brk = [...Array(16).keys()]; p.bass = [0, 0, 0, 0, -1, -1, 2, 2, -1, -1, 6, 6, 4, 4, -1, 5]; return p; },
  HALFTIME: () => { const p = blank(); p.brkSel = 3; on(p.kick, [0, 3, 11]); on(p.snare, [8]); on(p.ghost, [6, 13, 15]); on(p.hat, [0, 2, 4, 6, 10, 12, 14]); on(p.ohat, [7]); p.brk = [0, -1, 2, -1, 0, 1, -1, 3, 4, -1, 6, 7, -1, 13, 14, 15]; p.bass = [0, 0, 0, -1, -1, -1, 3, -1, -1, -1, -1, 5, 5, 5, 4, -1]; return p; },
  DRILL: () => { const p = blank(); p.brkSel = 1; on(p.kick, [0, 6, 9]); on(p.ghost, [2, 7, 13]); on(p.hat, [...Array(16).keys()]); p.brk = [0, 13, 2, 2, 4, 5, 12, 7, 8, 8, 8, 11, 12, 1, 14, 4]; p.rev[6] = 1; p.rev[13] = 1; p.bass = [0, -1, 0, -1, 7, -1, 0, -1, 6, 6, -1, 5, -1, 4, 3, -1]; return p; },
};

// fetch the sounds as soon as the page opens; decode once there's somewhere to decode them
const FILES = { drums: "synth/drums.wav", fx: "synth/fx.wav", bass: "synth/bass.wav", films: "synth/films.wav" };
const RAW = Object.fromEntries(Object.entries(FILES).map(([k, u]) => [k, fetch(u).then((r) => r.arrayBuffer()).catch(() => null)]));

export class Engine {
  constructor() {
    this.bpm = 172; this.playing = false; this.step = 0; this.ms = 0; this.q = 0; this.bar = 0; this.ev = []; this.pat = PRESETS.JUNGLE(); this.cur = this.pat;
    this.k = { filter: 0, res: .2, crush: 0, delay: .12, drill: 0, swing: 0, chaos: .55, pitch: 0, tone: .5, bassv: 0, rate: 3, depth: 0, dest: 0, shape: 0, vol: .72 };
    this.mutate = false; this.rec = false; this.loops = [null, null, null, null]; this.pend = [undefined, undefined, undefined, undefined];
    this.dj = null; this.gate = false; this.voice = null; this.ready = null; this.B = {};
  }
  ensure() { return this.ready || (this.ready = this.init()); }
  async init() {
    const C = (this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" }));
    const G = (v = 1) => { const g = C.createGain(); g.gain.value = v; return g; };
    this.G = G;
    // buses: drums glued and a touch driven, like it's coming off a sampler
    this.mix = G(1); this.drums = G(.7); this.brkBus = G(.72); this.bassBus = G(.72); this.padBus = G(.65); this.voxBus = G(.85);
    const shaper = (drive) => { const s = C.createWaveShaper(), c = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = i / 1023.5 - 1; c[i] = Math.tanh(x * drive) / Math.tanh(drive); } s.curve = c; s.oversample = "2x"; return s; };
    const glue = C.createDynamicsCompressor(); glue.threshold.value = -16; glue.ratio.value = 3; glue.attack.value = .01; glue.release.value = .12;
    const dsat = shaper(1.5); this.drums.connect(glue); this.brkBus.connect(glue); glue.connect(dsat); dsat.connect(this.mix);
    const bsat = shaper(1.8), bhp = C.createBiquadFilter(); bhp.type = "highpass"; bhp.frequency.value = 28; this.bassLP = C.createBiquadFilter(); this.bassLP.type = "lowpass"; this.bassLP.Q.value = .9;
    this.bassBus.connect(this.bassLP); this.bassLP.connect(bsat); bsat.connect(bhp); bhp.connect(this.mix);
    this.padBus.connect(this.mix); this.voxBus.connect(this.mix);
    // the mangler on everything
    this.mg = null;
    try { await C.audioWorklet.addModule("synth/mangle.js"); this.mg = new AudioWorkletNode(C, "mangle", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] }); } catch (e) { this.mg = null; }
    this.hp = C.createBiquadFilter(); this.hp.type = "highpass"; this.hp.frequency.value = 10;
    this.lp = C.createBiquadFilter(); this.lp.type = "lowpass"; this.lp.frequency.value = 20000;
    this.gateG = G(1); this.trem = G(1); this.post = G(1); this.master = G(this.k.vol);
    (this.mg ? (this.mix.connect(this.mg), this.mg) : this.mix).connect(this.hp); this.hp.connect(this.lp); this.lp.connect(this.gateG); this.gateG.connect(this.trem); this.trem.connect(this.post); this.post.connect(this.master);
    this.dsend = G(this.k.delay); this.dl = C.createDelay(2); this.dfb = G(.48); this.dlp = C.createBiquadFilter(); this.dlp.type = "lowpass"; this.dlp.frequency.value = 2600; this.dhp = C.createBiquadFilter(); this.dhp.type = "highpass"; this.dhp.frequency.value = 250;
    this.post.connect(this.dsend); this.dsend.connect(this.dl); this.dl.connect(this.dlp); this.dlp.connect(this.dhp); this.dhp.connect(this.dfb); this.dfb.connect(this.dl); this.dhp.connect(this.master);
    const comp = C.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 3; comp.attack.value = .006; comp.release.value = .18;
    const lim = C.createDynamicsCompressor(); lim.threshold.value = -3; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .08;
    const clip = shaper(1.1); this.out = C.createAnalyser(); this.out.fftSize = 1024;
    this.master.connect(comp); comp.connect(lim); lim.connect(clip); clip.connect(this.out); this.out.connect(C.destination);
    this.scopes = [this.drums, this.brkBus, this.bassBus, this.padBus, this.voxBus].map((b) => { const a = C.createAnalyser(); a.fftSize = 512; b.connect(a); return a; });
    // the reese: six saws spread wide, two filters, some drive, and a clean sine underneath
    this.reese = { amp: G(0), o: [] };
    const rl1 = C.createBiquadFilter(), rl2 = C.createBiquadFilter(); [rl1, rl2].forEach((f) => { f.type = "lowpass"; f.Q.value = 1.2; f.frequency.value = 700; }); this.reese.f = [rl1, rl2];
    const rs = shaper(2.4), rhp = C.createBiquadFilter(); rhp.type = "highpass"; rhp.frequency.value = 90; const rmix = G(.16);
    [-23, -14, -6, 6, 14, 23].forEach((dt, i) => { const o = C.createOscillator(); o.type = "sawtooth"; o.detune.value = dt; o.frequency.value = ROOT * 2; o.connect(rmix); o.start(C.currentTime + i * .0137); this.reese.o.push(o); });
    rmix.connect(rl1); rl1.connect(rl2); rl2.connect(rs); rs.connect(rhp); const rg = G(.55); rhp.connect(rg); rg.connect(this.reese.amp);
    const sub = C.createOscillator(); sub.frequency.value = ROOT; const sg = G(.8); sub.connect(sg); sg.connect(this.reese.amp); sub.start(); this.reese.sub = sub;
    const wob = C.createOscillator(); wob.frequency.value = .23; const wg = G(380); wob.connect(wg); rl1.frequency.value = 700; wg.connect(rl1.frequency); wg.connect(rl2.frequency); wob.start();
    this.reese.amp.connect(this.bassBus);
    // LFO
    this.lfo = null; this.lfoT0 = C.currentTime; this.lfoG = { f: G(0), p: G(0), c: G(0), g: G(0) };
    this.lfoG.f.connect(this.lp.detune); this.lfoG.f.connect(this.hp.detune); this.lfoG.f.connect(this.bassLP.detune); this.reese.o.forEach((o) => this.lfoG.p.connect(o.detune)); this.lfoG.g.connect(this.trem.gain);
    if (this.mg) this.lfoG.c.connect(this.mg.parameters.get("crush"));
    this.restartLfo(C.currentTime);
    // the sounds
    const dec = (ab) => new Promise((res, rej) => C.decodeAudioData(ab.slice(0), res, rej));
    const [d, f, b, fl] = await Promise.all(["drums", "fx", "bass", "films"].map((k) => RAW[k].then((ab) => (ab ? dec(ab) : null)).catch(() => null)));
    this.B = { drums: d, fx: f, bass: b, films: fl }; if (d) this.B.drumsRev = reverse(C, d); if (f) this.B.fxRev = reverse(C, f);
    this.applyAll(); this.apply("bpm");
    return this;
  }
  t() { return this.ctx ? this.ctx.currentTime : 0; }
  emit(type, t, d) { this.ev.push({ type, t, d }); }
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
    if (n === "tone") { sm(this.bassLP.frequency, 90 * Math.pow(2, k.tone * 7)); this.reese.f.forEach((f) => sm(f.frequency, 180 * Math.pow(2, k.tone * 4.5))); }
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
  lfoAt(t) { const ph = (((t - this.lfoT0) * this.lfoHz()) % 1 + 1) % 1; return [Math.sin(ph * 6.2832), ph < .5 ? 1 : -1, ph * 2 - 1][this.k.shape]; }
  // ---------------- transport ----------------
  async play() {
    await this.ensure(); const C = this.ctx; if (C.state !== "running") await C.resume();
    if (this.playing) return; this.playing = true; this.ms = 0; this.q = 0; this.bar = 0; this.t0 = C.currentTime + .06; this.nextT = this.t0; this.restartLfo(this.t0);
    this.timer = setInterval(() => this.tick(), 20); this.tick();
  }
  stop() {
    if (!this.playing) return; this.playing = false; clearInterval(this.timer);
    const now = this.ctx.currentTime; this.reese.amp.gain.cancelScheduledValues(now); this.reese.amp.gain.setTargetAtTime(0, now, .02); this.stopBass(now);
    this.gateG.gain.cancelScheduledValues(now); this.gateG.gain.setValueAtTime(1, now); this.emit("stop", now);
  }
  // the master clock always ticks in sixteenths; the DJ controls decide which steps it plays
  tick() {
    const C = this.ctx, sd = this.sd();
    while (this.nextT < C.currentTime + .12) {
      const m = this.ms, t = this.nextT + (m % 2 ? this.k.swing * sd * .42 : 0);
      if (m === 0) this.barStart(t);
      if (this.gate) { const g = this.gateG.gain; g.setValueAtTime(1, t); g.setValueAtTime(1, t + sd * .48); g.linearRampToValueAtTime(0, t + sd * .52); g.setValueAtTime(0, t + sd * .97); g.linearRampToValueAtTime(1, t + sd); }
      const dj = this.dj;
      if (dj === "x2") { for (let i = 0; i < 2; i++) this.playStep((this.q + i) % 16, t + i * sd / 2, .5); this.q += 2; }
      else if (dj === "x4") { for (let i = 0; i < 4; i++) this.playStep((this.q + i) % 16, t + i * sd / 4, .25); this.q += 4; }
      else if (dj === "half") { if (m % 2 === 0) this.playStep(Math.floor(this.q) % 16, t, 2); this.q += .5; }
      else if (dj === "mash") { if (m % 2 === 0 || this.mashAt == null) this.mashAt = pick([0, 2, 4, 6, 8, 10, 12, 14]); this.playStep((this.mashAt + (m % 2)) % 16, t, 1); this.q++; }
      else { this.q = m; this.playStep(m, t, 1); }
      this.emit("tick", t, m);
      this.nextT += sd; this.ms = (m + 1) % 16; if (this.ms === 0) this.bar++;
    }
  }
  setDJ(m) { this.dj = m; if (!m) this.q = this.ms; else if (m === "half" || m === "x2" || m === "x4") this.q = this.ms; }
  setGate(on) { this.gate = on; if (!on && this.ctx) { const g = this.gateG.gain, n = this.ctx.currentTime; g.cancelScheduledValues(n); g.setTargetAtTime(1, n, .004); } }
  barStart(t) {
    this.loops = this.loops.map((l, i) => (this.pend[i] !== undefined ? this.pend[i] : l)); this.pend = [undefined, undefined, undefined, undefined];
    this.cur = this.mutate ? mutate(this.pat) : this.pat; this.emit("bar", t, { bar: this.bar, loops: [...this.loops] });
  }
  playStep(s, t, dm) {
    const p = this.cur, sd = this.sd() * dm, dr = this.k.drill;
    this.emit("step", t, s);
    const rat = (fn, v, kind) => {
      if (dr > 0 && Math.random() < dr * .5) { const n = pick([2, 3, 4, 4, 6, 8]); for (let i = 0; i < n; i++) fn(t + (i * sd) / n, v * (.55 + .45 * i / n), 1 + i * .06 * dr, sd / n); this.emit("roll", t, { n, kind }); }
      else fn(t, v, 1, sd);
    };
    if (p.kick[s]) { this.hit("kick", t, 1); this.emit("kick", t, 1); }
    if (p.snare[s]) { rat((tt, v, pp) => this.hit("snare", tt, v, pp), 1, "snare"); this.emit("snare", t, 1); }
    if (p.ghost[s]) { rat((tt, v, pp) => this.hit("ghost", tt, v * .45, pp), 1, "ghost"); this.emit("ghost", t, .4); }
    if (p.hat[s]) { rat((tt, v, pp) => this.hit("hat", tt, v * (s % 4 === 2 ? .7 : .45), pp), 1, "hat"); this.emit("hat", t, .4); }
    if (p.ohat[s]) { this.hit("ohat", t, .55); this.emit("hat", t, .6); }
    if (p.brk[s] >= 0) { const sl = p.brk[s], rv = p.rev[s], bk = p.brkSel; rat((tt, v, pp, dd) => this.slice(bk, sl, tt, dd, rv, v, pp), 1, "brk"); this.emit("brk", t, { sl, s, rv }); }
    if (p.bass[s] >= 0) {
      const d = p.bass[s], tied = s > 0 && p.bass[s - 1] === d; let n = 1; while (s + n < 16 && p.bass[s + n] === d) n++;
      if (!tied || this.dj) { this.bassNote(d, t, n * sd, s > 0 && p.bass[s - 1] >= 0 && !this.dj); this.emit("bass", t, { d, n }); }
    }
    p.pads[s].forEach((id) => this.pad(id, t, true));
    this.loops.forEach((id) => id != null && this.loopStep(id, s, t, sd));
  }
  // ---------------- voices ----------------
  sp(buf, off, dur, t, dest, v = 1, rate = 1, fadeOut = .004) {
    if (!buf) return null; const C = this.ctx, s = C.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const g = C.createGain(); s.connect(g); g.connect(dest);
    const len = dur / rate; g.gain.setValueAtTime(v, t); if (fadeOut) { g.gain.setValueAtTime(v, t + Math.max(.002, len - fadeOut)); g.gain.linearRampToValueAtTime(0, t + len); }
    s.start(t, off, dur + .001); return { s, g };
  }
  hit(k, t, v = 1, p = 1) {
    const m = DRUMS[k]; if (!m || !this.B.drums) return;
    if (k === "hat" && this.oh) { try { this.oh.g.gain.cancelScheduledValues(t); this.oh.g.gain.setTargetAtTime(0, t, .006); } catch (e) {} this.oh = null; }
    const h = this.sp(this.B.drums, m.o, m.d, t, this.drums, v, p, .01); if (k === "ohat") this.oh = h;
  }
  sliceLen(bk) { return DRUMS[BREAKS[bk]].d / 16; }
  slice(bk, i, t, dur, rev, v = 1, p = 1) {
    const m = DRUMS[BREAKS[bk]]; if (!m || !this.B.drums) return;
    const L = m.d / 16, rate = (this.bpm / m.bpm) * Math.pow(2, this.k.pitch / 12) * p, play = Math.min(L, (dur + .003) * rate);
    const buf = rev ? this.B.drumsRev : this.B.drums, off = rev ? buf.duration - (m.o + (i + 1) * L) : m.o + i * L;
    const h = this.sp(buf, off, play, t, this.brkBus, v, rate, .005);
    if (h) { this.lfoG.p.connect(h.s.detune); h.s.onended = () => { try { this.lfoG.p.disconnect(h.s.detune); } catch (e) {} }; }
  }
  stopBass(t) { if (this.bs) { try { this.bs.g.gain.cancelScheduledValues(t); this.bs.g.gain.setTargetAtTime(0, t, .012); this.bs.s.stop(t + .1); } catch (e) {} this.bs = null; } }
  bassNote(d, t, len, glide, deg = null) {
    const f = hz(d), V = BASSV[this.k.bassv];
    if (V === "REESE") {
      const a = this.reese.amp.gain;
      this.reese.o.forEach((o) => { o.frequency.cancelScheduledValues(t); if (glide) o.frequency.setTargetAtTime(f * 2, t, .03); else o.frequency.setValueAtTime(f * 2, t); });
      this.reese.sub.frequency.cancelScheduledValues(t); if (glide) this.reese.sub.frequency.setTargetAtTime(f, t, .03); else this.reese.sub.frequency.setValueAtTime(f, t);
      a.cancelScheduledValues(t); a.setTargetAtTime(.8, t, glide ? .01 : .003); a.setTargetAtTime(0, t + len - .015, .015); return;
    }
    const m = BASSES[V]; if (!m || !this.B.bass) return; const rate = (f * (V === "WAH" || V === "SINE" ? 2 : 1)) / m.hz;
    if (glide && this.bs && this.bs.end > t) { this.bs.s.playbackRate.setTargetAtTime(rate, t, .035); const g = this.bs.g.gain; g.cancelScheduledValues(t); g.setValueAtTime(.95, t); g.setTargetAtTime(0, t + len - .02, .02); this.bs.end = t + len; return; }
    this.stopBass(t);
    const C = this.ctx, s = C.createBufferSource(); s.buffer = this.B.bass; s.playbackRate.value = rate; const g = C.createGain(); s.connect(g); g.connect(this.bassBus);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.95, t + .004); g.gain.setTargetAtTime(0, t + len - .02, .02);
    s.start(t, m.o, m.d); s.stop(t + Math.min(m.d / rate, len + .3)); this.bs = { s, g, end: t + len };
  }
  // ---------------- pads ----------------
  // ids: "b3" a slice of the current break, "f7" a film chop, "x2" an effect, "v0" a chop of what you recorded
  async pad(id, t, fromSeq) {
    await this.ensure(); const C = this.ctx; if (C.state !== "running") C.resume();
    t = t ?? C.currentTime + .004; const k = id[0], i = +id.slice(1);
    if (k === "b") this.slice(this.pat.brkSel, i, t, this.sliceLen(this.pat.brkSel) * 1.3, 0);
    else if (k === "f" && this.B.films) { const f = FILMS[i]; this.sp(this.B.films, f.o, f.d, t, this.padBus, 1, 1, .02); }
    else if (k === "x") { const m = FXS[FX[i]]; this.sp(this.B.fx, m.o, m.d, t, this.padBus, .9, 1, .03); }
    else if (k === "v" && this.voice && this.voice.cuts[i]) { const [o, d] = this.voice.cuts[i]; this.sp(this.voice.b, o, d, t, this.voxBus, 1, 1, .015); }
    if (!fromSeq && this.rec && this.playing) { const st = ((Math.round(this.ms - (this.nextT - t) / this.sd()) % 16) + 16) % 16; if (!this.pat.pads[st].includes(id)) this.pat.pads[st].push(id); this.emit("recd", t, st); }
    this.emit("pad", t, { id, p: k === "f" ? FILMS[i].p : null });
  }
  // hear a step as you place it
  async audition(lane, val, rev) {
    await this.ensure(); const C = this.ctx; if (C.state !== "running") C.resume(); const t = C.currentTime + .005;
    if (lane === "brk") this.slice(this.pat.brkSel, val, t, this.sliceLen(this.pat.brkSel) * 1.2, rev);
    else if (lane === "bass") this.bassNote(val, t, .32, false);
    else this.hit(lane, t, lane === "ghost" ? .45 : .9);
  }
  // ---------------- loops: they start on the next bar ----------------
  toggleLoop(i) { const row = i >> 2, cur = this.pend[row] !== undefined ? this.pend[row] : this.loops[row]; const next = cur === i ? null : i; if (this.playing) this.pend[row] = next; else this.loops[row] = next; return next; }
  loopStep(id, s, t, sd) {
    const n = LOOPS[id], b = this.bar;
    if (n === "AMEN") { this.slice(b % 3, s, t, sd, 0, .9); this.emit("brk", t, { sl: s, s, rv: 0 }); }
    else if (["RAW", "PLEAD", "STACK"].includes(n)) { this.slice(BREAKS.indexOf(n), s, t, sd, 0, .9); this.emit("brk", t, { sl: s, s, rv: 0 }); }
    else if (n === "808 A" || n === "808 B" || n === "REESE" || n === "WAH") {
      if (this.cur.bass.some((x) => x >= 0)) return;
      const line = { "808 A": [0, -1, -1, -1, -1, -1, 0, -1, -1, -1, 6, -1, -1, -1, 4, -1], "808 B": [0, -1, -1, 0, -1, -1, 3, -1, -1, -1, -1, 5, -1, 4, -1, -1], REESE: [0, 0, 0, 0, -1, -1, 2, 2, -1, -1, 6, 6, 4, 4, -1, 5], WAH: [0, -1, -1, -1, -1, -1, -1, -1, 3, -1, -1, -1, -1, -1, -1, -1] }[n];
      const d = line[s]; if (d < 0 || (s > 0 && line[s - 1] === d)) return; let k = 1; while (s + k < 16 && line[s + k] === d) k++;
      const keep = this.k.bassv; this.k.bassv = { "808 A": 0, "808 B": 0, REESE: 4, WAH: 3 }[n]; this.bassNote(d, t, Math.max(k, n === "WAH" ? 8 : n.startsWith("808") ? 4 : k) * sd, s > 0 && line[s - 1] >= 0); this.k.bassv = keep; this.emit("bass", t, { d, n: k });
    }
    else if (n === "PAD") { if (s === 0 && b % 2 === 0) [0, 2, 4, 6, 8].forEach((d) => { this.tone(t, "sawtooth", hz(d, 2), sd * 30, .028, .9); this.tone(t, "triangle", hz(d, 2) * 1.004, sd * 30, .04, 1.2); }); }
    else if (n === "STABS") { if (s === 3 || s === 11 || (s === 14 && b % 2)) this.fxs("STAB 3", t, .7, [1, 1, 1.189][b % 3]); }
    else if (n === "HOOVER") { if (s === 0 && b % 2 === 0) this.fxs("HOOVER", t, .7); if (s === 10 && b % 2 === 1) this.fxs("HOOVER 2", t, .6); }
    else if (n === "CHOIR") { if (s === 0) this.fxs("CHOIR", t, .6, [1, .891, 1.122, .944][b % 4]); }
    else if (n === "RIDE") { if (s % 2 === 0) this.hitFx("RIDE", t, s % 4 === 0 ? .35 : .22, sd * 2); }
    else if (n === "HATS") this.hit("hat", t, s % 2 ? .5 : .25, 1);
    else if (n === "DRILL") { for (let k = 0; k < 2; k++) if (Math.random() < .7) { const tt = t + k * sd / 2; if (Math.random() < .14) for (let r = 0; r < 4; r++) this.hit("hat", tt + r * sd / 8, .35, 1 + r * .1); else this.hit("hat", tt, rnd(.2, .45), rnd(.85, 1.25)); } }
    else if (n === "SWELL") { if (s === 0 && b % 2 === 0) { const m = FXS.CRASH, L = Math.min(m.d, sd * 32); this.sp(this.B.fxRev, this.B.fxRev.duration - m.o - L, L, t + sd * 32 - L, this.padBus, .6, 1, .01); } }
  }
  fxs(name, t, v, rate = 1) { const m = FXS[name]; this.sp(this.B.fx, m.o, m.d, t, this.padBus, v, rate, .03); }
  hitFx(name, t, v, len) { const m = FXS[name]; this.sp(this.B.fx, m.o, Math.min(m.d, len + .4), t, this.padBus, v, 1, .05); }
  tone(t, type, f, d, v, att) { const C = this.ctx, o = C.createOscillator(); o.type = type; o.frequency.value = f; const g = C.createGain(); o.connect(g); g.connect(this.padBus); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.setTargetAtTime(0, t + d * .7, d * .15); o.start(t); o.stop(t + d * 1.3); }
  // ---------------- the held effects ----------------
  hold(mode) {
    if (!this.mg) return; const sr = this.ctx.sampleRate, sd = this.sd();
    if (mode === "repeat") this.mg.port.postMessage({ mode, len: Math.round(sd * 2 * sr) });
    else if (mode === "roll") this.mg.port.postMessage({ mode, len: Math.round(sd * 2 * sr), min: Math.round(sd / 4 * sr) });
    else if (mode === "tape") this.mg.port.postMessage({ mode, time: .7 });
    else this.mg.port.postMessage({ mode });
  }
  release() { this.mg && this.mg.port.postMessage({ mode: "off" }); }
  // ---------------- the mic: record something, it gets chopped onto sixteen pads ----------------
  async micStart() {
    await this.ensure(); const C = this.ctx; if (C.state !== "running") await C.resume();
    if (!this.mic) {
      const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const src = C.createMediaStreamSource(st), tap = new AudioWorkletNode(C, "tap", { processorOptions: { sec: 10 } }), z = this.G(0);
      src.connect(tap); tap.connect(z); z.connect(C.destination); this.mic = { st, tap };
    }
    this.micT = C.currentTime;
  }
  micStop() {
    return new Promise((res) => {
      if (!this.mic) return res(null); const C = this.ctx, n = Math.min(Math.round((C.currentTime - this.micT + .15) * C.sampleRate), C.sampleRate * 10);
      this.mic.tap.port.onmessage = (e) => {
        const d = e.data; let pk = 0; for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
        if (pk < .01 || d.length < C.sampleRate * .2) return res(null);
        const b = C.createBuffer(1, d.length, C.sampleRate), o = b.getChannelData(0); for (let i = 0; i < d.length; i++) o[i] = (d[i] / pk) * .92;
        this.voice = { b, cuts: chop(o, C.sampleRate) }; res(this.voice);
      };
      this.mic.tap.port.postMessage({ n });
    });
  }
  clear() { const s = this.pat.brkSel; this.pat = blank(); this.pat.brkSel = s; this.cur = this.pat; }
}

// sixteen chops at the strongest onsets, the way you'd slice a vocal by hand
function chop(x, sr) {
  const hop = 256, n = Math.floor(x.length / hop), e = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < hop; k++) s += x[i * hop + k] ** 2; e[i] = Math.log(s + 1e-6); }
  const on = []; for (let i = 2; i < n - 1; i++) { const d = e[i] - e[i - 2]; if (d > 1.6 && e[i] > -6) on.push([i * hop, d]); }
  on.sort((a, b) => b[1] - a[1]); const pts = [];
  for (const [p] of on) { if (pts.every((q) => Math.abs(q - p) > sr * .09)) pts.push(p); if (pts.length >= 16) break; }
  if (!pts.includes(0) && pts.length < 16) pts.push(0);
  pts.sort((a, b) => a - b);
  while (pts.length < 16) { let gi = 0, gl = 0; for (let i = 0; i < pts.length; i++) { const L = (pts[i + 1] ?? x.length) - pts[i]; if (L > gl) { gl = L; gi = i; } } pts.splice(gi + 1, 0, pts[gi] + Math.floor(gl / 2)); }
  return pts.map((p, i) => { const end = pts[i + 1] ?? x.length; return [p / sr, Math.min(1.2, Math.max(.06, (end - p) / sr))]; });
}
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
