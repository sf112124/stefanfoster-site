// The sound of Synth-folio. Real breaks (a real Amen, three bars of it, plus four more), a jungle kit, sub and 808
// basses, rave stabs and hoovers, and chops from Stefan's films. The synth only
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
// the BREAKS pads: one bar each, straight, edited, reversed or rolled
const ED = [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 10, 11, 12, 12, 14, 4], HALF = [0, 1, 2, 3, 2, 3, 0, 1, 4, 5, 6, 7, 6, 13, 14, 15], ROLL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 12, 12], RV = Array(16).fill(1), DBL = [0, 2, 4, 6, 8, 10, 12, 14, 0, 2, 4, 6, 8, 10, 12, 14];
export const BARPADS = [["AMEN 1", "AMEN 1"], ["AMEN 2", "AMEN 2"], ["AMEN 3", "AMEN 3"], ["AMEN EDIT", "AMEN 1", ED], ["AMEN HALF", "AMEN 2", HALF], ["AMEN ROLL", "AMEN 1", ROLL], ["AMEN REVERSE", "AMEN 1", null, RV], ["AMEN DOUBLE", "AMEN 3", DBL],
  ["RAW", "RAW"], ["RAW EDIT", "RAW", ED], ["PLEAD", "PLEAD"], ["PLEAD HALF", "PLEAD", HALF], ["STACK", "STACK"], ["STACK EDIT", "STACK", ED], ["STOMP", "STOMP"], ["STOMP ROLL", "STOMP", ROLL]];
// the DRUMS pads: hits that play the moment you touch them
export const DRUMPADS = [["KICK", "hit", "kick"], ["AMEN KICK", "sl", "AMEN 1", 0], ["SNARE", "hit", "snare"], ["AMEN SNARE", "sl", "AMEN 1", 4], ["GHOST", "hit", "ghost", .7], ["AMEN GHOST", "sl", "AMEN 1", 7], ["HAT", "hit", "hat", .8], ["OPEN HAT", "hit", "ohat"],
  ["RAW KICK", "sl", "RAW", 0], ["RAW SNARE", "sl", "RAW", 4], ["PLEAD SNARE", "sl", "PLEAD", 4], ["STOMP KICK", "sl", "STOMP", 0], ["RIDE", "fx", "RIDE", .9], ["CRASH", "fx", "CRASH"], ["SUB DROP", "fx", "SUB DROP"], ["REV BASS", "fx", "REV BASS"]];
export const LOOPS = ["AMEN", "AMEN CHOP", "RAW", "PLEAD", "STACK", "STOMP", "AMEN HALF", "RIDE", "808 A", "808 B", "DEEP", "WAH", "PAD Fm", "PAD Db", "PAD Bbm", "PAD Cm"];
// which loops share a slot: one drum loop at a time, the ride on its own, one bass line, one pad
export const LGROUP = (i) => (i < 7 ? 0 : i === 7 ? 1 : i < 12 ? 2 : 3);
export const LOOPROWS = ["DRUMS", "RIDE", "BASS", "PAD"];

export const blank = () => ({ brkSel: 0, kick: Array(16).fill(0), snare: Array(16).fill(0), ghost: Array(16).fill(0), hat: Array(16).fill(0), ohat: Array(16).fill(0), brk: Array(16).fill(-1), rev: Array(16).fill(0), bass: Array(16).fill(-1), pads: Array.from({ length: 16 }, () => []) });
const on = (arr, a) => { a.forEach((i) => (arr[i] = 1)); return arr; };
export const PRESETS = {
  JUNGLE: () => { const p = blank(); on(p.kick, [0, 10]); p.brk = [...Array(16).keys()]; p.bass = [0, 0, 0, 0, -1, -1, 2, 2, -1, -1, 6, 6, 4, 4, -1, 5]; return p; },
  HALFTIME: () => { const p = blank(); p.brkSel = 3; on(p.kick, [0, 3, 11]); on(p.snare, [8]); on(p.ghost, [6, 13, 15]); on(p.hat, [0, 2, 4, 6, 10, 12, 14]); on(p.ohat, [7]); p.brk = [0, -1, 2, -1, 0, 1, -1, 3, 4, -1, 6, 7, -1, 13, 14, 15]; p.bass = [0, 0, 0, -1, -1, -1, 3, -1, -1, -1, -1, 5, 5, 5, 4, -1]; return p; },
  DRILL: () => { const p = blank(); p.brkSel = 1; on(p.kick, [0, 6, 9]); on(p.ghost, [2, 7, 13]); on(p.hat, [...Array(16).keys()]); p.brk = [0, 13, 2, 2, 4, 5, 12, 7, 8, 8, 8, 11, 12, 1, 14, 4]; p.rev[6] = 1; p.rev[13] = 1; p.bass = [0, -1, 0, -1, 7, -1, 0, -1, 6, 6, -1, 5, -1, 4, 3, -1]; return p; },
};

// fetch the sounds as soon as the page opens; decode once there's somewhere to decode them
const FILES = { drums: "synthkit/drums.wav", fx: "synthkit/fx.wav", bass: "synthkit/bass.wav", films: "synthkit/films.wav" };
const RAW = Object.fromEntries(Object.entries(FILES).map(([k, u]) => [k, fetch(u).then((r) => r.arrayBuffer()).catch(() => null)]));

export class Engine {
  constructor() {
    this.bpm = 172; this.playing = false; this.step = 0; this.ms = 0; this.q = 0; this.bar = 0; this.ev = []; this.pat = blank(); this.cur = this.pat;
    this.k = { pitch: 0, tone: .5, bassv: 0, react: .7, rate: 3, depth: 0, dest: 0, shape: 0, vol: .7 };
    this.fx = { filter: 0, space: 0, echo: 0, pitch: 0, roll: 0, flange: 0 };
    this.mutate = false; this.rec = false; this.loops = [null, null, null, null]; this.pend = [undefined, undefined, undefined, undefined];
    this.dj = null; this.gate = false; this.ready = null; this.B = {};
  }
  ensure() { return this.ready || (this.ready = this.init()); }
  async init() {
    const C = (this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 0 }));
    const G = (v = 1) => { const g = C.createGain(); g.gain.value = v; return g; };
    this.G = G;
    // buses: drums glued and a touch driven, like it's coming off a sampler
    this.mix = G(1); this.drums = G(.5); this.brkBus = G(.5); this.bassBus = G(.5); this.padBus = G(.45); this.voxBus = G(.7);
    const shaper = (drive) => { const s = C.createWaveShaper(), c = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = i / 1023.5 - 1; c[i] = Math.tanh(x * drive) / drive; } s.curve = c; return s; };   // unity gain for quiet signals, rounds off the loud ones
    // the safety on the way out: perfectly clean below 0.7, then rounds off instead of clipping
    const knee = () => { const s = C.createWaveShaper(), c = new Float32Array(4096); for (let i = 0; i < 4096; i++) { const x = (i / 2047.5 - 1) * 2, a = Math.abs(x); c[i] = a < .7 ? x : Math.sign(x) * (.7 + .29 * Math.tanh((a - .7) / .29)); } s.curve = c; return s; };
    // no compressors anywhere: each one holds the sound back a few milliseconds, which you feel when you play the pads
    const dsat = shaper(1.15); this.drums.connect(dsat); this.brkBus.connect(dsat); dsat.connect(this.mix);
    const bsat = shaper(1.3), bhp = C.createBiquadFilter(); bhp.type = "highpass"; bhp.frequency.value = 28; this.bassLP = C.createBiquadFilter(); this.bassLP.type = "lowpass"; this.bassLP.Q.value = .9;
    this.bassBus.connect(this.bassLP); this.bassLP.connect(bsat); bsat.connect(bhp); bhp.connect(this.mix);
    this.padBus.connect(this.mix); this.voxBus.connect(this.mix);
    // the mangler on everything
    this.mg = null;
    try { await C.audioWorklet.addModule("synthkit/mangle.js"); this.mg = new AudioWorkletNode(C, "mangle", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] }); } catch (e) { this.mg = null; }
    this.hp = C.createBiquadFilter(); this.hp.type = "highpass"; this.hp.frequency.value = 10;
    this.lp = C.createBiquadFilter(); this.lp.type = "lowpass"; this.lp.frequency.value = 20000;
    this.gateG = G(1); this.trem = G(1); this.post = G(1); this.master = G(this.k.vol);
    (this.mg ? (this.mix.connect(this.mg), this.mg) : this.mix).connect(this.hp); this.hp.connect(this.lp); this.lp.connect(this.gateG); this.gateG.connect(this.trem); this.trem.connect(this.post); this.post.connect(this.master);
    this.dsend = G(0); this.dl = C.createDelay(2); this.dfb = G(.45); const dclip = shaper(1.2); this.dlp = C.createBiquadFilter(); this.dlp.type = "lowpass"; this.dlp.frequency.value = 2600; this.dhp = C.createBiquadFilter(); this.dhp.type = "highpass"; this.dhp.frequency.value = 250;
    this.post.connect(this.dsend); this.dsend.connect(this.dl); this.dl.connect(this.dlp); this.dlp.connect(this.dhp); this.dhp.connect(dclip); dclip.connect(this.dfb); this.dfb.connect(this.dl); this.dret = G(0); this.dhp.connect(this.dret); this.dret.connect(this.master);
    this.dwob = C.createOscillator(); this.dwob.frequency.value = .7; this.dwobG = G(0); this.dwob.connect(this.dwobG); this.dwobG.connect(this.dl.delayTime); this.dwob.start();
    // SPACE: a long dark hall, and near the top of the fader it feeds back into itself and keeps rising
    this.dry = G(1); this.post.disconnect(this.master); this.post.connect(this.dry); this.dry.connect(this.master); this.post.connect(this.dsend);
    this.rv = C.createConvolver(); this.rv.buffer = hall(C, 6.5); this.rsend = G(0); this.rret = G(0); this.rfb = G(0); const rfd = C.createDelay(1), rvhp = C.createBiquadFilter(); rfd.delayTime.value = .19; rvhp.type = "highpass"; rvhp.frequency.value = 500;
    this.post.connect(this.rsend); this.rsend.connect(this.rv); this.rv.connect(this.rret); this.rret.connect(this.master); this.rv.connect(rvhp); rvhp.connect(rfd); rfd.connect(this.rfb); this.rfb.connect(this.rv);
    // FLANGE: a few milliseconds of swept delay fed back on itself
    this.fl = C.createDelay(.05); this.fl.delayTime.value = .003; this.flfb = G(0); this.flw = G(0); this.flo = C.createOscillator(); this.flo.frequency.value = .25; this.flg = G(.0022); this.flo.connect(this.flg); this.flg.connect(this.fl.delayTime); this.flo.start();
    this.post.connect(this.fl); this.fl.connect(this.flfb); this.flfb.connect(this.fl); this.fl.connect(this.flw); this.flw.connect(this.master);
    const clip = knee(); this.out = C.createAnalyser(); this.out.fftSize = 1024; this.out.minDecibels = -80; this.out.maxDecibels = -12; this.out.smoothingTimeConstant = .35;
    this.master.connect(clip); clip.connect(C.destination); clip.connect(this.out);
    this.scopes = [this.drums, this.brkBus, this.bassBus, this.padBus, this.post].map((b) => { const a = C.createAnalyser(); a.fftSize = 512; b.connect(a); return a; });
    // the reese: six saws spread wide, two filters, some drive, and a clean sine underneath
    this.reese = { amp: G(0), o: [] };
    const rl1 = C.createBiquadFilter(), rl2 = C.createBiquadFilter(); [rl1, rl2].forEach((f) => { f.type = "lowpass"; f.Q.value = 1.2; f.frequency.value = 700; }); this.reese.f = [rl1, rl2];
    const rs = shaper(2.4), rhp = C.createBiquadFilter(); rhp.type = "highpass"; rhp.frequency.value = 90; const rmix = G(.16);
    [-23, -14, -6, 6, 14, 23].forEach((dt, i) => { const o = C.createOscillator(); o.type = "sawtooth"; o.detune.value = dt; o.frequency.value = ROOT * 2; o.connect(rmix); o.start(C.currentTime + i * .0137); this.reese.o.push(o); });
    rmix.connect(rl1); rl1.connect(rl2); rl2.connect(rs); rs.connect(rhp); const rg = G(1.3); rhp.connect(rg); rg.connect(this.reese.amp);
    const sub = C.createOscillator(); sub.frequency.value = ROOT; const sg = G(.8); sub.connect(sg); sg.connect(this.reese.amp); sub.start(); this.reese.sub = sub;
    const wob = C.createOscillator(); wob.frequency.value = .23; const wg = G(380); wob.connect(wg); rl1.frequency.value = 700; wg.connect(rl1.frequency); wg.connect(rl2.frequency); wob.start();
    this.reese.amp.connect(this.bassBus);
    // LFO
    this.lfo = null; this.lfoT0 = C.currentTime; this.lfoG = { f: G(0), p: G(0), c: G(0), g: G(0) };
    this.lfoG.f.connect(this.lp.detune); this.lfoG.f.connect(this.hp.detune); this.lfoG.f.connect(this.bassLP.detune); this.reese.o.forEach((o) => this.lfoG.p.connect(o.detune)); this.lfoG.g.connect(this.trem.gain);
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
    if (n === "vol") sm(this.master.gain, k.vol);
    if (n === "tone") { sm(this.bassLP.frequency, 90 * Math.pow(2, k.tone * 7)); this.reese.f.forEach((f) => sm(f.frequency, 180 * Math.pow(2, k.tone * 4.5))); }
    if (n === "rate" || n === "shape") this.restartLfo(this.playing ? this.t0 : now);
    if (n === "depth" || n === "dest") {
      const d = k.depth, g = this.lfoG;
      sm(g.f.gain, k.dest === 0 ? d * 3600 : 0); sm(g.p.gain, k.dest === 1 ? d * 1200 : 0);
      sm(g.g.gain, k.dest === 2 ? d * .5 : 0); sm(this.trem.gain, k.dest === 2 ? 1 - d * .5 : 1);
    }
    if (n === "bpm") this.dl.delayTime.setTargetAtTime(this.sd() * 3, now, .05);
  }
  // ---------------- the six faders: they spring back when you let go ----------------
  setFx(n, v) {
    this.fx[n] = v; if (!this.ctx) return; const C = this.ctx, now = C.currentTime, sm = (p, x, tc = .005) => p.setTargetAtTime(x, now, tc);
    if (n === "filter") {
      const a = Math.abs(v), Q = .7 + Math.pow(a, 1.4) * 22;
      if (v < -.01) { sm(this.lp.frequency, 20000 * Math.pow(2, v * 9.6)); sm(this.hp.frequency, 10); sm(this.lp.Q, Q); sm(this.hp.Q, .7); }
      else if (v > .01) { sm(this.hp.frequency, 10 * Math.pow(2, v * 10.7)); sm(this.lp.frequency, 20000); sm(this.hp.Q, Q); sm(this.lp.Q, .7); }
      else { sm(this.lp.frequency, 20000); sm(this.hp.frequency, 10); sm(this.lp.Q, .7); sm(this.hp.Q, .7); }
    }
    else if (n === "space") {
      if (v > .01) { sm(this.rret.gain, 1.1, .005); sm(this.rsend.gain, Math.pow(v, 1.3) * 1.3, .008); sm(this.rfb.gain, Math.max(0, (v - .55) / .45) * .62, .02); sm(this.dry.gain, 1 - Math.max(0, v - .65) * 1.2, .01); }
      else { sm(this.rret.gain, 0, .02); sm(this.rsend.gain, 0, .005); sm(this.rfb.gain, 0, .005); sm(this.dry.gain, 1, .005); }   // back at zero: dry, now
    }
    else if (n === "echo") {
      if (v > .01) { sm(this.dret.gain, .85, .005); sm(this.dsend.gain, Math.pow(v, 1.1), .008); sm(this.dfb.gain, .4 + v * .72, .015); sm(this.dwobG.gain, Math.max(0, v - .7) * .012, .05); }
      else { sm(this.dret.gain, 0, .02); sm(this.dsend.gain, 0, .005); sm(this.dfb.gain, 0, .005); sm(this.dwobG.gain, 0, .05); }   // back at zero: the echoes stop
    }
    else if (n === "pitch") { this.mg && this.mg.port.postMessage({ pitch: Math.sign(v) * Math.pow(Math.abs(v), 1.3) * 24 }); }
    else if (n === "flange") { sm(this.flw.gain, v * .95, .006); sm(this.flfb.gain, v > .01 ? v * .88 : 0, .006); this.flo.frequency.setTargetAtTime(.15 + v * v * 7, now, .05); }
    else if (n === "roll") {
      const z = v < .12 ? 0 : v < .32 ? 4 : v < .5 ? 2 : v < .68 ? 1 : v < .85 ? .5 : .25;
      if (z === this.rollZ) return;
      if (!z) { this.rollZ = 0; this.release(); return; }
      const len = Math.round(this.sd() * z * C.sampleRate);
      if (!this.rollZ) this.mg && this.mg.port.postMessage({ mode: "repeat", len, at: this.nextStepFrame() }); else this.mg && this.mg.port.postMessage({ relen: len });
      this.rollZ = z;
    }
  }
  // the next sixteenth on the grid, as a sample frame; held effects wait for it so they land in time
  nextStepAt() { const C = this.ctx; if (!this.playing) return C.currentTime; const sd = this.sd(), n = Math.ceil((C.currentTime + .005 - this.t0) / sd); return this.t0 + n * sd; }
  nextStepFrame() { return Math.round(this.nextStepAt() * this.ctx.sampleRate); }
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
      const m = this.ms, t = this.nextT;
      if (m === 0) this.barStart(t);
      if (this.gate) { const g = this.gateG.gain; g.setValueAtTime(1, t); g.setValueAtTime(1, t + sd * .48); g.linearRampToValueAtTime(0, t + sd * .52); g.setValueAtTime(0, t + sd * .97); g.linearRampToValueAtTime(1, t + sd); }
      const dj = this.dj;
      if (dj === "half") { if (m % 2 === 0) this.playStep(Math.floor(this.q) % 16, t, 2); this.q += .5; }
      else if (dj === "mash") { if (m % 2 === 0 || this.mashAt == null) this.mashAt = pick([0, 2, 4, 6, 8, 10, 12, 14]); this.playStep((this.mashAt + (m % 2)) % 16, t, 1); this.q++; }
      else { this.q = m; this.playStep(m, t, 1); }
      this.emit("tick", t, m);
      this.nextT += sd; this.ms = (m + 1) % 16; if (this.ms === 0) this.bar++;
    }
  }
  setDJ(m) { this.dj = m; this.q = this.ms; this.cutLoopBars(); }
  cutLoopBars() { const n = this.ctx ? this.ctx.currentTime : 0; (this.lbars || []).forEach((h) => { try { h.g.gain.cancelScheduledValues(n); h.g.gain.setTargetAtTime(0, n, .004); h.s.stop(n + .03); } catch (e) {} }); this.lbars = []; this.cov = [0, 0, 0, 0]; }
  setGate(on) { this.gate = on; if (!on && this.ctx) { const g = this.gateG.gain, n = this.ctx.currentTime; g.cancelScheduledValues(n); g.setTargetAtTime(1, n, .004); } }
  barStart(t) {
    if (this.bq != null) { const i = this.bq; this.bq = null; this.playBar(i, t); }
    else if (this.bcur != null && this.bEnd <= t + .01) { this.bcur = null; this.emit("bq", t, null); }
    this.cov = [0, 0, 0, 0]; this.lbars = (this.lbars || []).filter((h) => h.end > t - .01);
    this.loops = this.loops.map((l, i) => (this.pend[i] !== undefined ? this.pend[i] : l)); this.pend = [undefined, undefined, undefined, undefined];
    this.cur = this.mutate ? mutate(this.pat) : this.pat; this.emit("bar", t, { bar: this.bar, loops: [...this.loops] });
  }
  playStep(s, t, dm) {
    const p = this.cur, sd = this.sd() * dm, dr = 0;
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
    this.loops.forEach((id) => id != null && this.loopStep(id, s, t, sd));
  }
  // ---------------- voices ----------------
  sp(buf, off, dur, t, dest, v = 1, rate = 1, fadeOut = .004) {
    if (!buf) return null; const C = this.ctx, s = C.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const g = C.createGain(); s.connect(g); g.connect(dest);
    const len = dur / rate; g.gain.setValueAtTime(v, t); if (fadeOut) { g.gain.setValueAtTime(v, t + Math.max(.002, len - fadeOut)); g.gain.linearRampToValueAtTime(0, t + len); }
    s.start(t, off, dur + .001); return { s, g, end: t + len };
  }
  hit(k, t, v = 1, p = 1) {
    const m = DRUMS[k]; if (!m || !this.B.drums) return;
    if (k === "hat" && this.oh) { try { this.oh.g.gain.cancelScheduledValues(t); this.oh.g.gain.setTargetAtTime(0, t, .006); } catch (e) {} this.oh = null; }
    const h = this.sp(this.B.drums, m.o, m.d, t, this.drums, v, p, .01); if (k === "ohat") this.oh = h;
  }
  sliceLen(bk) { return DRUMS[BREAKS[bk]].d / 16; }
  // a whole bar of a break, played straight through so it loops clean, stretched to the tempo by pitch like a sampler
  barLoop(bk, t, v) { const m = DRUMS[BREAKS[bk]]; if (!m || !this.B.drums) return null; const rate = (this.bpm / m.bpm) * Math.pow(2, this.k.pitch / 12); return this.sp(this.B.drums, m.o, m.d, t, this.brkBus, v, rate, .004); }
  slice(bk, i, t, dur, rev, v = 1, p = 1) {
    const m = DRUMS[BREAKS[bk]]; if (!m || !this.B.drums) return;
    const a = m.sl ? m.sl[i] : i * m.d / 16, L = (m.sl ? (m.sl[i + 1] ?? m.d) : (i + 1) * m.d / 16) - a, rate = (this.bpm / m.bpm) * Math.pow(2, this.k.pitch / 12) * p, play = Math.min(L, (dur + .003) * rate);
    const buf = rev ? this.B.drumsRev : this.B.drums, off = rev ? buf.duration - (m.o + a + L) : m.o + a;
    const h = this.sp(buf, off, play, t, this.brkBus, v, rate, .005);
    if (h) { this.lfoG.p.connect(h.s.detune); h.s.onended = () => { try { this.lfoG.p.disconnect(h.s.detune); } catch (e) {} }; }
    return h;
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
  // ids: "k3" a one-bar break (starts on the next beat), "d2" a drum hit, "x5" an effect, "f7" a film chop; all but breaks play the moment you hit them
  pad(id, t) {
    // straight through once the sounds are in: no waiting on anything
    if (!this.B.drums) return this.ensure().then(() => this.pad(id, t));
    const C = this.ctx; if (C.state !== "running") C.resume();
    const now = C.currentTime, k = id[0], i = +id.slice(1);
    if (k === "k") { t = this.queueBar(i); if (t == null) return; }
    else {
      t = now;
      if (k === "d") this.drumPad(i, t);
      else if (k === "x") { const m = FXS[FX[i]]; this.sp(this.B.fx, m.o, m.d, t, this.padBus, .9, 1, .03); }
      else if (k === "f" && this.B.films) { const f = FILMS[i]; this.sp(this.B.films, f.o, f.d, t, this.padBus, 1, 1, .02); }
    }
    this.emit("pad", t, { id, p: k === "f" ? FILMS[i].p : null });
  }
  // BREAKS: press one and it plays a whole bar from the next bar line, cutting whatever was playing there.
  // Press the one that's already playing and it starts again on the next beat, so you can stutter it.
  queueBar(i) {
    const C = this.ctx, sd = this.sd();
    if (!this.playing) { this.bq = i; this.play(); return C.currentTime; }
    if (i === this.bcur && this.bq == null) { let k = 0; while ((this.ms + k) % 4 !== 0) k++; const t = this.nextT + k * sd; this.playBar(i, t); return t; }
    this.bq = i; this.emit("bq", C.currentTime, i); return null;
  }
  playBar(i, t) {
    const sd = this.sd(), [, src, order, rev] = BARPADS[i], bk = BREAKS.indexOf(src);
    (this.bars || []).forEach((h) => { try { h.g.gain.cancelScheduledValues(t); h.g.gain.setTargetAtTime(0, t, .003); h.s.stop(t + .02); } catch (e) {} });
    this.bars = []; this.bcur = i; this.bEnd = t + 16 * sd;
    if (!order && !rev) { const h = this.barLoop(bk, t, .95); if (h) this.bars.push(h); }
    for (let s = 0; s < 16; s++) { const sl = order ? order[s] : s; if (sl < 0) continue; if (order || rev) { const h = this.slice(bk, sl, t + s * sd, sd, rev ? rev[s] : 0, .95); if (h) this.bars.push(h); } this.emit("brk", t + s * sd, { sl, s, rv: rev ? rev[s] : 0 }); if (s % 4 === 0) this.emit(s === 0 ? "kick" : "snare", t + s * sd, 1); }
    this.emit("bq", t, i);
  }
  drumPad(i, t) {
    const [, kind, a, b] = DRUMPADS[i];
    if (kind === "hit") this.hit(a, t, b || 1);
    else if (kind === "fx") { const m = FXS[a]; this.sp(this.B.fx, m.o, Math.min(m.d, b || m.d), t, this.drums, .8, 1, .03); }
    else if (kind === "sl") { const bk = BREAKS.indexOf(a), m = DRUMS[a], L = m.d / 16; this.sp(this.B.drums, m.o + b * L, L * 1.6, t, this.brkBus, 1, 1, .02); }
    this.emit(i < 2 || i === 7 || i === 11 ? "kick" : "snare", t, 1);
  }
  // hear a step as you place it
  async audition(lane, val, rev) {
    await this.ensure(); const C = this.ctx; if (C.state !== "running") C.resume(); const t = C.currentTime;
    if (lane === "brk") this.slice(this.pat.brkSel, val, t, this.sliceLen(this.pat.brkSel) * 1.2, rev);
    else if (lane === "bass") this.bassNote(val, t, .32, false);
    else this.hit(lane, t, lane === "ghost" ? .45 : .9);
  }
  // ---------------- loops: they start on the next bar ----------------
  toggleLoop(i) { const row = LGROUP(i), cur = this.pend[row] !== undefined ? this.pend[row] : this.loops[row]; const next = cur === i ? null : i; if (this.playing) this.pend[row] = next; else this.loops[row] = next; return next; }
  loopStep(id, s, t, sd) {
    const n = LOOPS[id], b = this.bar, row = LGROUP(id);
    // straight breaks: one clean bar at a time, unless the DJ controls are chopping it up
    const STRAIGHT = { AMEN: () => b % 2, RAW: () => 3, PLEAD: () => 4, STACK: () => 5, STOMP: () => 6 };
    if (STRAIGHT[n]) {
      const bk = STRAIGHT[n]();
      if (!this.dj && s === 0) { const h = this.barLoop(bk, t, .9); if (h) (this.lbars = this.lbars || []).push(h); this.cov = this.cov || [0, 0, 0, 0]; this.cov[row] = 1; }
      else if (this.dj || !(this.cov || [])[row]) this.slice(bk, s, t, sd, 0, .9);
      this.emit("brk", t, { sl: s, s, rv: 0 }); return;
    }
    if (n === "AMEN CHOP") { const o = [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 10, 11, 12, 12, 14, 4], o2 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 4, 5, 12, 13]; this.slice(b % 2, (b % 2 ? o2 : o)[s], t, sd, 0, .9); this.emit("brk", t, { sl: (b % 2 ? o2 : o)[s], s, rv: 0 }); return; }
    if (n === "AMEN HALF") { const o = [0, 1, 2, 3, 2, 3, 0, 1, 4, 5, 6, 7, 6, 13, 14, 15]; this.slice(b % 2, o[s], t, sd, 0, .9); this.emit("brk", t, { sl: o[s], s, rv: 0 }); return; }
    if (n === "RIDE") { if (s % 2 === 0) this.hitFx("RIDE", t, s % 4 === 0 ? .2 : .12, sd * 2); return; }
    if (n === "808 A" || n === "808 B" || n === "DEEP" || n === "WAH") {
      if (this.cur.bass.some((x) => x >= 0)) return;
      const line = { "808 A": [0, -1, -1, -1, -1, -1, 0, -1, -1, -1, 6, -1, -1, -1, 4, -1], "808 B": [0, -1, -1, 0, -1, -1, 3, -1, -1, -1, -1, 5, -1, 4, -1, -1], DEEP: [0, -1, -1, -1, -1, -1, -1, -1, 5, -1, -1, -1, 3, -1, -1, -1], WAH: [0, -1, -1, -1, -1, -1, -1, -1, 3, -1, -1, -1, -1, -1, -1, -1] }[n];
      const d = line[s]; if (d < 0) return; let k = 1; while (s + k < 16 && line[s + k] < 0) k++;
      const keep = this.k.bassv; this.k.bassv = { "808 A": 0, "808 B": 0, DEEP: 1, WAH: 3 }[n]; this.bassNote(d, t, Math.min(k, 8) * sd, false); this.k.bassv = keep; this.emit("bass", t, { d, n: k }); return;
    }
    const CH = { "PAD Fm": [0, 2, 4, 6, 8], "PAD Db": [5, 7, 9, 11], "PAD Bbm": [3, 5, 7, 9, 11], "PAD Cm": [4, 6, 8, 10] }[n];
    if (CH && s === 0 && (b % 2 === 0 || this.padOn !== n)) this.padChord(n, CH, t, sd * 34);
  }
  // a soft chord: three detuned voices per note through one warm filter; a new chord fades the old one out
  padChord(n, ch, t, len) {
    const C = this.ctx;
    (this.padV || []).forEach((h) => { try { h.g.gain.cancelScheduledValues(t); h.g.gain.setTargetAtTime(0, t, .35); h.o.forEach((o) => o.stop(t + 2.5)); } catch (e) {} });
    if (!this.padF) { this.padF = C.createBiquadFilter(); this.padF.type = "lowpass"; this.padF.frequency.value = 1500; this.padF.Q.value = .5; this.padF.connect(this.padBus); const w = C.createOscillator(); w.frequency.value = .07; const wg = this.G(500); w.connect(wg); wg.connect(this.padF.frequency); w.start(); }
    this.padOn = n; this.padV = ch.map((d) => {
      const f = hz(d, 2), g = C.createGain(), o = [[-9, "sawtooth", .5], [8, "sawtooth", .5], [0, "triangle", .9]].map(([dt, ty, v]) => { const x = C.createOscillator(), xg = C.createGain(); x.type = ty; x.frequency.value = f; x.detune.value = dt; xg.gain.value = v; x.connect(xg); xg.connect(g); x.start(t); x.stop(t + len + 3); return x; });
      g.connect(this.padF); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .5); g.gain.setValueAtTime(.05, t + len - .4); g.gain.linearRampToValueAtTime(0, t + len + 1.6); return { g, o };
    });
  }
  fxs(name, t, v, rate = 1) { const m = FXS[name]; this.sp(this.B.fx, m.o, m.d, t, this.padBus, v, rate, .03); }
  hitFx(name, t, v, len) { const m = FXS[name]; this.sp(this.B.fx, m.o, Math.min(m.d, len + .4), t, this.padBus, v, 1, .05); }
  tone(t, type, f, d, v, att) { const C = this.ctx, o = C.createOscillator(); o.type = type; o.frequency.value = f; const g = C.createGain(); o.connect(g); g.connect(this.padBus); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.setTargetAtTime(0, t + d * .7, d * .15); o.start(t); o.stop(t + d * 1.3); }
  // ---------------- the held effects ----------------
  hold(mode) {
    if (!this.mg) return 0; const sr = this.ctx.sampleRate, sd = this.sd(), at = this.nextStepFrame();
    if (mode === "repeat") this.mg.port.postMessage({ mode, len: Math.round(sd * 4 * sr), at });
    else if (mode === "roll") this.mg.port.postMessage({ mode, len: Math.round(sd * 2 * sr), min: Math.round(sd / 4 * sr), at });
    else if (mode === "freeze") this.mg.port.postMessage({ mode: "repeat", len: Math.round(sd * 2 * sr), fade: Math.round(sd * .7 * sr), at });
    else if (mode === "tape") this.mg.port.postMessage({ mode, time: .7, at });
    else this.mg.port.postMessage({ mode, at });
    return at / sr - this.ctx.currentTime;
  }
  // scratching: grab and the mix freezes where you grabbed it while the track carries on silently underneath
  scratch(on) { this.mg && this.mg.port.postMessage({ mode: on ? "scratch" : "off" }); }
  scratchTo(sec) { this.mg && this.mg.port.postMessage({ scr: Math.round(sec * this.ctx.sampleRate) }); }
  release() { this.mg && this.mg.port.postMessage({ mode: "off" }); }
  // wipe the lot: every lane, every loop, any break bar still to come
  clear() {
    const s = this.pat.brkSel; this.pat = blank(); this.pat.brkSel = s; this.cur = this.pat;
    this.loops = [null, null, null, null]; this.pend = [undefined, undefined, undefined, undefined];
    if (this.ctx) { const n = this.ctx.currentTime; (this.bars || []).forEach((h) => { try { h.g.gain.cancelScheduledValues(n); h.g.gain.setTargetAtTime(0, n, .005); h.s.stop(n + .05); } catch (e) {} }); this.stopBass(n); this.reese.amp.gain.cancelScheduledValues(n); this.reese.amp.gain.setTargetAtTime(0, n, .01); }
    this.bars = []; this.bq = null; this.bcur = null;
  }
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
function hall(C, sec) {
  const n = Math.round(C.sampleRate * sec), b = C.createBuffer(2, n, C.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const t = i / C.sampleRate, k = .35 + .6 * (t / sec); lp += ((Math.random() * 2 - 1) - lp) * k; d[i] = lp * Math.pow(1 - t / sec, 2.2) * (t < .015 ? t / .015 : 1) * .5; } }
  return b;
}
function reverse(C, b) { const r = C.createBuffer(b.numberOfChannels, b.length, b.sampleRate); for (let c = 0; c < b.numberOfChannels; c++) { const s = b.getChannelData(c), d = r.getChannelData(c); for (let i = 0; i < s.length; i++) d[i] = s[s.length - 1 - i]; } return r; }
