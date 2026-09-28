// Foley, not music: air, taps, drops and brushed noise, so nothing on the site ever clashes with the films.
// On from the first click; the project pages stay silent apart from the films themselves.
export class Sound {
  on = true; ac = null; live = false; hush = false;
  unlock() {
    if (!this.on) return;
    try { if (!this.ac) this.init(); if (this.ac.state !== "running") this.ac.resume(); this.live = true; } catch (e) {}
  }
  toggle() {
    this.on = !this.on;
    try { if (!this.ac) this.init(); this.ac.resume(); this.live = this.on; this.bed(this.on); if (this.on) this.drop(.6); } catch (e) {}
    return this.on;
  }
  init() {
    const ac = (this.ac = new (window.AudioContext || window.webkitAudioContext)());
    this.bus = ac.createGain(); this.bus.gain.value = .9;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -22; comp.ratio.value = 3;
    this.bus.connect(comp); comp.connect(ac.destination);
    // a small, soft room
    const len = ac.sampleRate * 1.3, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4); }
    const rev = ac.createConvolver(); rev.buffer = ir; const wet = ac.createGain(); wet.gain.value = .35;
    this.send = ac.createGain(); this.send.connect(rev); rev.connect(wet); wet.connect(this.bus);
    // two seconds of noise, the raw material for everything
    const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb;
    // an echo the pad can push into feedback
    const dl = ac.createDelay(2); dl.delayTime.value = .25;
    const fb = ac.createGain(); fb.gain.value = 0;
    const tone = ac.createBiquadFilter(); tone.type = "bandpass"; tone.frequency.value = 1400; tone.Q.value = .7;
    const echo = ac.createGain(); echo.gain.value = 0;
    this.bus.connect(dl); dl.connect(tone); tone.connect(fb); fb.connect(dl); tone.connect(echo); echo.connect(comp);
    this.fx = { dl, fb, tone, echo };
  }
  src() { const s = this.ac.createBufferSource(); s.buffer = this.noise; s.loop = true; s.loopStart = Math.random(); return s; }
  out(node, pan = 0, wet = .5) {
    const p = this.ac.createStereoPanner ? this.ac.createStereoPanner() : null;
    if (p) { p.pan.value = Math.max(-1, Math.min(1, pan)); node.connect(p); node = p; }
    node.connect(this.bus); const w = this.ac.createGain(); w.gain.value = wet; node.connect(w); w.connect(this.send);
  }
  ok() { return this.on && this.live && !this.hush && this.ac && this.ac.state === "running"; }
  // no background bed any more: silence until you touch something
  bed() {}
  // the pad's own voice, only alive while you're holding a piece
  padVoice() {
    const ac = this.ac;
    if (!this.air) {
      const s = this.src(), bp = ac.createBiquadFilter(), g = ac.createGain();
      bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = .6; g.gain.value = 0;
      s.connect(bp); bp.connect(g); this.out(g, 0, .6); s.start();
      this.air = { bp, g };
    }
    return this.air;
  }
  drone(on) { this.bed(on); }
  quiet(q) { this.hush = q; if (this.ac) this.bed(this.on && this.live); }
  duck(d) { if (this.bus) this.bus.gain.setTargetAtTime(d ? .08 : .9, this.ac.currentTime, .25); }
  // a tiny tap: a few milliseconds of filtered noise, like a fingertip on glass or a pencil on paper
  tick(bright = .5, vol = .05, pan = 0) {
    if (!this.ok()) return;
    const ac = this.ac, t = ac.currentTime, s = this.src(), f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = "bandpass"; f.frequency.value = 1800 + bright * 5200; f.Q.value = 2.2;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .035);
    s.connect(f); f.connect(g); this.out(g, pan, .3); s.start(t); s.stop(t + .05);
  }
  // a water drop: a short falling blip with a wet tail
  drop(size = 1, pan = 0) {
    if (!this.ok()) return;
    const ac = this.ac, t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(1100 / size, t); o.frequency.exponentialRampToValueAtTime(260 / size, t + .09);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .16);
    o.connect(g); this.out(g, pan, .7); o.start(t); o.stop(t + .2);
  }
  // air moving past: filtered noise that sweeps up or down
  whoosh(dur = .6, up = true, vol = .05) {
    if (!this.ok()) return;
    const ac = this.ac, t = ac.currentTime, s = this.src(), f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = "bandpass"; f.Q.value = 1.1;
    f.frequency.setValueAtTime(up ? 300 : 3200, t); f.frequency.exponentialRampToValueAtTime(up ? 3200 : 260, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .45); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(f); f.connect(g); this.out(g, 0, .6); s.start(t); s.stop(t + dur + .05);
  }
  touch(x = .5, y = .5, speed = 0) {
    if (!this.ok()) return;
    const ac = this.ac, t = ac.currentTime;
    if (!this.silk) {
      const a = this.src(), b = this.src(), f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(), g1 = ac.createGain(), g2 = ac.createGain();
      f1.type = "bandpass"; f1.Q.value = .9; f2.type = "highpass"; f2.frequency.value = 5200; g1.gain.value = 0; g2.gain.value = 0;
      const p = ac.createStereoPanner ? ac.createStereoPanner() : null;
      a.connect(f1); f1.connect(g1); b.connect(f2); f2.connect(g2);
      if (p) { g1.connect(p); g2.connect(p); this.out(p, 0, .7); } else { this.out(g1, 0, .7); this.out(g2, 0, .7); }
      a.start(); b.start(); this.silk = { f1, g1, g2, p };
    }
    const s = this.silk, sp = Math.min(1, speed);
    s.f1.frequency.setTargetAtTime(260 + Math.pow(x, 1.3) * 2600, t, .08);
    s.f1.Q.setTargetAtTime(.7 + y * 2.2, t, .1);
    s.p && s.p.pan.setTargetAtTime((x - .5) * 1.4, t, .08);
    s.g1.gain.cancelScheduledValues(t); s.g1.gain.setTargetAtTime(.012 + sp * .05, t, .05); s.g1.gain.setTargetAtTime(0, t + .09, .35);
    s.g2.gain.cancelScheduledValues(t); s.g2.gain.setTargetAtTime(sp * .018, t, .04); s.g2.gain.setTargetAtTime(0, t + .06, .2);
    // grains: little crackles when you move quickly, like paper or dry leaves
    if (sp > .25 && Math.random() < sp * .5) this.tick(Math.random(), .006 + sp * .016, (x - .5) * 1.6);
  }
  // a piece surfacing: an airy bloom with a glassy shimmer on top
  bloom(x = .5) {
    if (!this.ok()) return;
    this.whoosh(.55, true, .028);
    [0, 70, 150].forEach((d, i) => setTimeout(() => this.glint(.35 + Math.random() * .6, .012 - i * .003, (x - .5) * 1.5 + (Math.random() - .5) * .6), d));
  }
  // a soft glass glint: a breath of noise through a narrow resonance
  glint(bright = .5, vol = .01, pan = 0) {
    if (!this.ok()) return;
    const ac = this.ac, t = ac.currentTime, s = this.src(), f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = "bandpass"; f.frequency.value = 2200 + bright * 5200; f.Q.value = 14;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .5);
    s.connect(f); f.connect(g); this.out(g, pan, .9); s.start(t); s.stop(t + .55);
  }
  release() { if (!this.air || !this.ac) return; const t = this.ac.currentTime; this.air.g.gain.setTargetAtTime(0, t, .25); }
  // grab and wiggle: a scratchy brushed-noise pad, x moves the colour, y the echo, speed feeds it back
  pad(x, y, energy) {
    if (!this.ok()) return;
    const ac = this.ac, t = ac.currentTime, fx = this.fx;
    this.padVoice();
    if (!this.wild) {
      const shaper = ac.createWaveShaper(), n = 1024, curve = new Float32Array(n);
      for (let i = 0; i < n; i++) { const v = i / (n - 1) * 2 - 1; curve[i] = Math.tanh(v * 6); }
      shaper.curve = curve; shaper.oversample = "2x";
      const s = this.src(), hp = ac.createBiquadFilter(), trem = ac.createGain(), wet = ac.createGain(), lfo = ac.createOscillator(), depth = ac.createGain();
      hp.type = "bandpass"; hp.Q.value = 3; wet.gain.value = 0; trem.gain.value = .5;
      lfo.frequency.value = 6; depth.gain.value = .5; lfo.connect(depth); depth.connect(trem.gain);
      s.connect(hp); hp.connect(shaper); shaper.connect(trem); trem.connect(wet); this.out(wet, 0, .8);
      const sub = ac.createOscillator(), sg = ac.createGain(); sub.type = "sine"; sub.frequency.value = 42; sg.gain.value = 0; sub.connect(sg); sg.connect(this.bus);
      s.start(); lfo.start(); sub.start();
      this.wild = { hp, wet, lfo, sub, sg };
    }
    const w = this.wild, e = Math.min(1, energy), e2 = e * e;
    w.hp.frequency.setTargetAtTime(120 + Math.pow(x, 2) * 4800, t, .03);
    w.wet.gain.setTargetAtTime(e2 * .09, t, .04);
    w.lfo.frequency.setTargetAtTime(3 + e * 34 + y * 10, t, .05);
    w.sub.frequency.setTargetAtTime(34 + y * 30 + e * 20, t, .05);
    w.sg.gain.setTargetAtTime(e2 * .12, t, .06);
    // the harder you shake, the more it stutters into little bursts
    if (e > .45 && Math.random() < e * .35) { this.tick(Math.random(), .02 + e * .03, (Math.random() - .5) * 1.8); if (Math.random() < .3) this.glint(Math.random(), .01 + e * .012, (Math.random() - .5) * 1.8); }
    if (this.air) {
      this.air.bp.frequency.setTargetAtTime(180 + Math.pow(x, 1.5) * 6000, t, .05);
      this.air.bp.Q.setTargetAtTime(.6 + y * 9, t, .08);
      this.air.g.gain.setTargetAtTime(.01 + energy * .07, t, .06);
    }
    fx.dl.delayTime.setTargetAtTime(.05 + (1 - y) * .45, t, .12);
    fx.fb.gain.setTargetAtTime(.15 + energy * .6, t, .08);
    fx.echo.gain.setTargetAtTime(.2 + energy * .45, t, .08);
    fx.tone.frequency.setTargetAtTime(600 + y * 3000, t, .1);
    if (energy > .15 && t - (this._pd || 0) > .12 - energy * .08) { this._pd = t; this.tick(x, .015 + energy * .03, (x - .5) * 1.6); }
  }
  padEnd() {
    if (!this.ac) return;
    const t = this.ac.currentTime, fx = this.fx;
    if (this.wild) { this.wild.wet.gain.setTargetAtTime(0, t, .5); this.wild.sg.gain.setTargetAtTime(0, t, .6); }
    this.whoosh(.9, false, .03);
    fx.fb.gain.setTargetAtTime(0, t, 1.2); fx.echo.gain.setTargetAtTime(0, t, 1.8);
    if (this.air) this.air.bp.Q.setTargetAtTime(.6, t, .8);
    this.release();
  }
  splash(x = .5, y = .5) { this.drop(1.2, (x - .5) * 1.2); this.whoosh(.35, true, .03); }
  // older names, now foley
  note(x, y) { return x * .6 + y * .4; }
  rod(v, vol = .014) { this.tick(typeof v === "number" && v <= 1 ? v : .5, Math.min(.03, vol * 1.6)); }
  tumble() { this.tick(.4, .02); setTimeout(() => this.tick(.7, .015), 60); }
  blip(i) { this.tick(((i * 37) % 10) / 10, .025); }
  enter() { this.whoosh(.5, false, .04); }
  swoosh() { this.whoosh(.4, true, .025); }
  pop() { this.drop(1); }
  warp() { this.whoosh(.9, true, .05); }
  mosh() {}
}
