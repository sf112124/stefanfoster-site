// Foster Valley's soundtrack, written note by note and played live by four little voices, the way the handhelds did it:
// a pulse lead, a thinner pulse for harmony and arpeggios, a triangle bass, and a noise channel for drums.
// Notes are written as text, one 16th per token: "C5" plays a note, "." holds it, "-" is a rest.

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (t) => { const m = /^([A-G])(#|b)?(\d)$/.exec(t); return m ? 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) : 0; };
// turn a line of tokens into [step, note, length] events
function line(str) {
  const tk = str.trim().split(/\s+/), ev = [];
  tk.forEach((t, i) => { if (t === "." && ev.length && ev[ev.length - 1][0] + ev[ev.length - 1][2] === i) ev[ev.length - 1][2]++; else if (t !== "." && t !== "-") ev.push([i, midi(t), 1]); });
  return { ev, len: tk.length };
}
// chords as root note plus shape; the harmony and bass are built from them so they always agree with the tune
const SHAPE = { M: [0, 4, 7], m: [0, 3, 7], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], D7: [0, 4, 7, 10] };
const chord = (s) => { const m = /^([A-G][#b]?)(m7|M7|D7|m|M)?$/.exec(s); const r = midi(m[1] + "3"); return SHAPE[m[2] || "M"].map((x) => r + x); };

const TRACKS = {
  // outside: a bright, bouncy route theme in C
  world: {
    bpm: 132, swing: 0,
    lead: [
      "E5 . G5 . C6 . . . B5 . G5 . E5 . D5 .", "C5 . E5 . A5 . . . G5 . E5 . C5 . . .", "F5 . A5 . C6 . . . A5 . F5 . A5 . C6 .", "B5 . . . A5 . G5 . F5 . D5 . G5 . . .",
      "E5 . G5 . C6 . E6 . D6 . C6 . G5 . . .", "B5 . . . G5 . E5 . G5 . B5 . E6 . . .", "D6 . C6 . A5 . F5 . A5 . C6 . F6 . . .", "E6 . D6 . B5 . G5 . D6 . . . - - - -",
      "A5 . . . C6 . A5 . F5 . G5 . A5 . . .", "B5 . . . D6 . B5 . G5 . A5 . B5 . . .", "G5 . B5 . E6 . . . D6 . B5 . G5 . . .", "A5 . C6 . E6 . . . D6 . C6 . A5 . . .",
      "F5 . A5 . D6 . . . C6 . A5 . F5 . A5 .", "B5 . D6 . G6 . . . F6 . D6 . B5 . . .", "C6 . . . G5 . E5 . G5 . C6 . E6 . . .", "D6 . . . B5 . . . G5 . A5 . B5 . . .",
    ],
    chords: ["C", "Am", "F", "G", "C", "Em", "F", "G", "F", "G", "Em", "Am", "Dm", "G", "C", "G"],
    harm: "stab", bass: "bounce", drums: "route",
  },
  // indoors: Stefan's studio and the office, gentle and a bit jazzy, in F
  studio: {
    bpm: 96, swing: .12,
    lead: [
      "A5 . . . C6 . . . A5 . G5 . F5 . . .", "E5 . . . G5 . . . C6 . . . . . . .", "D5 . F5 . Bb5 . . . A5 . G5 . F5 . . .", "G5 . . . . . . . E5 . F5 . G5 . . .",
      "A5 . . . C6 . . . F6 . E6 . C6 . . .", "D6 . . . A5 . . . F5 . . . . . . .", "Bb5 . A5 . G5 . . . D5 . E5 . F5 . G5 .", "E5 . . . . . . . C5 . . . - - - -",
    ],
    chords: ["FM7", "Am7", "Bb", "C", "FM7", "Dm", "Gm", "C"],
    harm: "pad", bass: "walk", drums: "soft",
  },
  // a fight: fast, minor, with the rattling arpeggios the old battle themes lived on
  battle: {
    bpm: 168, swing: 0,
    lead: [
      "A5 . . . E5 . A5 . C6 . B5 . A5 . G5 .", "A5 . . . . . E5 . F5 . G5 . A5 . B5 .", "C6 . . . A5 . F5 . C6 . D6 . C6 . A5 .", "B5 . . . G5 . D5 . B5 . C6 . D6 . . .",
      "E6 . . . C6 . A5 . E6 . F6 . E6 . D6 .", "C6 . B5 . A5 . . . G5 . A5 . B5 . C6 .", "D6 . . . F6 . D6 . A5 . D6 . F6 . A6 .", "G#6 . . . E6 . . . B5 . . . G#5 . . .",
      "A5 . C6 . E6 . A6 . G6 . E6 . C6 . E6 .", "F6 . . . C6 . A5 . F5 . A5 . C6 . F6 .", "G6 . . . D6 . B5 . G5 . B5 . D6 . G6 .", "E6 . . . B5 . G#5 . E5 . G#5 . B5 . E6 .",
    ],
    chords: ["Am", "Am", "F", "G", "Am", "Am", "Dm", "E", "Am", "F", "G", "E"],
    harm: "arp", bass: "drive", drums: "battle",
  },
};
// a short fanfare for a win, played once
const WIN = { bpm: 150, lead: "C5 E5 G5 C6 . . G5 . C6 . E6 . . . . . D6 . . . B5 . G5 . C6 . . . . . . .", chords: ["C", "C"] };

export class Chip {
  constructor() { this.ctx = null; this.on = true; this.tune = null; this.step = 0; this.next = 0; this.bar = 0; this.vol = 1; }
  attach(ctx, out) {
    this.ctx = ctx; this.out = ctx.createGain(); this.out.gain.value = .9; this.out.connect(out);
    // pulse waves of different widths, built from their harmonics
    const pulse = (duty) => { const n = 40, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty); return ctx.createPeriodicWave(re, im); };
    this.p50 = pulse(.5); this.p25 = pulse(.25); this.p12 = pulse(.125);
    const len = ctx.sampleRate * .3, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noise = b;
    for (const k in TRACKS) { const T = TRACKS[k]; T.L = T.lead.map(line); T.C = T.chords.map(chord); }
    WIN.L = line(WIN.lead);
    setInterval(() => this.pump(), 30);
  }
  hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  voice(wave, m, t, dur, vol, o = {}) {
    const c = this.ctx, os = c.createOscillator(), g = c.createGain();
    if (typeof wave === "string") os.type = wave; else os.setPeriodicWave(wave);
    os.frequency.setValueAtTime(this.hz(m), t);
    if (o.vib && dur > .25) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(this.hz(m) * .012, t + dur * .6); l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + dur + .05); }
    if (o.drop) os.frequency.exponentialRampToValueAtTime(this.hz(m) * .35, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.setValueAtTime(vol, t + Math.max(.01, dur * (o.sus ?? .75))); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    os.connect(g); g.connect(this.out); os.start(t); os.stop(t + dur + .05);
  }
  hit(t, kind, vol) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise;
    f.type = kind === "hat" ? "highpass" : "bandpass"; f.frequency.value = kind === "hat" ? 7000 : 1800;
    const d = kind === "hat" ? .04 : .14; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0005, t + d);
    s.connect(f); f.connect(g); g.connect(this.out); s.start(t); s.stop(t + d + .02);
  }
  play(name) { if (this.tune === name) return; this.tune = name; this.step = 0; this.bar = 0; if (this.ctx) this.next = this.ctx.currentTime + .08; }
  fanfare() { if (!this.ctx || !this.on) return; const t0 = this.ctx.currentTime + .05, d = 60 / WIN.bpm / 4; WIN.L.ev.forEach(([s, m, l]) => { this.voice(this.p50, m, t0 + s * d, l * d, .05, { vib: 1 }); this.voice(this.p25, m - 12, t0 + s * d, l * d, .025); }); }
  pump() {
    if (!this.ctx || !this.on || !this.tune || this.ctx.state !== "running") return;
    const T = TRACKS[this.tune]; if (!T) return;
    const d = 60 / T.bpm / 4;
    if (this.next < this.ctx.currentTime) this.next = this.ctx.currentTime + .05;
    while (this.next < this.ctx.currentTime + .2) {
      const bar = this.bar % T.L.length, s = this.step, t = this.next + (s % 2 ? d * T.swing : 0), ch = T.C[bar % T.C.length];
      // lead
      T.L[bar].ev.forEach(([at, m, l]) => { if (at === s) this.voice(this.p50, m, t, l * d * .98, .045, { vib: 1 }); });
      // harmony
      if (T.harm === "stab" && s % 4 === 2) { this.voice(this.p25, ch[1] + 24, t, d * 1.6, .018, { sus: .3 }); this.voice(this.p25, ch[2] + 12, t, d * 1.6, .018, { sus: .3 }); }
      if (T.harm === "arp") this.voice(this.p12, ch[s % 3] + 24, t, d * .9, .016, { sus: .5 });
      if (T.harm === "pad" && s % 8 === 0) ch.forEach((m) => this.voice(this.p25, m + 12, t, d * 7.5, .011, { sus: .9 }));
      // bass
      if (T.bass === "bounce" && s % 2 === 0) this.voice("triangle", [ch[0], ch[0] + 7, ch[0] + 12, ch[0] + 7][(s / 2) % 4] - 12, t, d * 1.8, .11, { sus: .6 });
      if (T.bass === "drive") this.voice("triangle", ch[0] - 12 + (s % 2 ? 12 : 0), t, d * .9, .11, { sus: .6 });
      if (T.bass === "walk" && s % 4 === 0) this.voice("triangle", [ch[0], ch[2], ch[0] + 12, ch[1]][s / 4] - 12, t, d * 3.6, .1, { sus: .8 });
      // drums
      const dr = T.drums;
      if (dr === "route") { if (s % 2 === 0) this.hit(t, "hat", .025); if (s === 4 || s === 12) this.hit(t, "snare", .05); if (s === 0 || s === 8 || s === 10) this.voice("triangle", 50, t, .09, .14, { drop: 1, sus: .1 }); }
      if (dr === "battle") { this.hit(t, "hat", s % 2 ? .012 : .022); if (s === 4 || s === 12) this.hit(t, "snare", .06); if (s % 8 === 0 || s === 6 || s === 14) this.voice("triangle", 48, t, .09, .15, { drop: 1, sus: .1 }); }
      if (dr === "soft") { if (s === 4 || s === 12) this.hit(t, "hat", .016); if (s === 0) this.voice("triangle", 48, t, .1, .08, { drop: 1, sus: .1 }); }
      this.step++; this.next += d;
      if (this.step >= 16) { this.step = 0; this.bar++; }
    }
  }
}
