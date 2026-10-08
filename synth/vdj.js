// The monitor. It plays whatever projects are in the crate and the music does the editing: kicks cut, snares flash,
// the bass bends the picture, chopped breaks chop the footage, and the held effects do to the picture what they do
// to the sound. The last second of picture is kept in a ring of frames, so it can be repeated, reversed or frozen.
const VS = "attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
const CAP = `precision mediump float;varying vec2 v;uniform sampler2D s;uniform vec2 sc,of;uniform float mir;
void main(){vec2 u=(v-.5)*sc+.5+of;if(mir>.5&&u.x>.5)u.x=1.-u.x;gl_FragColor=texture2D(s,clamp(u,.001,.999));}`;
const COMP = `precision mediump float;varying vec2 v;uniform sampler2D s,pv;uniform vec2 res;uniform float pix,post,blur,edge,flash,mono,warp,trail,t,bright,inv,jx;
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec3 ramp(float L){return mix(mix(vec3(.035,.06,.03),vec3(.30,.47,.14),smoothstep(0.,.5,L)),vec3(.78,.94,.52),smoothstep(.48,1.,L));}
void main(){vec2 u=v;u.x+=sin(u.y*22.+t*7.)*warp*.035+jx;u.y+=sin(u.x*9.+t*3.)*warp*.01;
if(pix>1.){vec2 g=res/pix;u=(floor(u*g)+.5)/g;}
vec3 c=texture2D(s,u).rgb;
if(blur>.001){vec2 o=blur*7./res;c=(c+texture2D(s,u+vec2(o.x,0.)).rgb+texture2D(s,u-vec2(o.x,0.)).rgb+texture2D(s,u+vec2(0.,o.y)).rgb+texture2D(s,u-vec2(0.,o.y)).rgb+texture2D(s,u+o).rgb+texture2D(s,u-o).rgb)/7.;}
if(edge>.001){vec2 o=1.5/res;float lx=lum(texture2D(s,u+vec2(o.x,0.)).rgb)-lum(texture2D(s,u-vec2(o.x,0.)).rgb);float ly=lum(texture2D(s,u+vec2(0.,o.y)).rgb)-lum(texture2D(s,u-vec2(0.,o.y)).rgb);float e=clamp(length(vec2(lx,ly))*5.,0.,1.);c=mix(c,vec3(e),edge);}
if(post>.001){float lv=mix(48.,3.,post);c=floor(c*lv+.5)/lv;}
float L=clamp(mix(lum(c),1.-lum(c),inv)*bright,0.,1.);
vec3 col=mix(c*bright,ramp(L),mono)+flash*vec3(.45,.62,.28);
col=max(col,texture2D(pv,v).rgb*trail);
gl_FragColor=vec4(col,1.);}`;
const BLIT = "precision mediump float;varying vec2 v;uniform sampler2D s;void main(){gl_FragColor=texture2D(s,v);}";
const K = 48;

export class VDJ {
  constructor(cv) {
    this.cv = cv; const gl = (this.gl = cv.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false }));
    this.ok = !!gl; this.items = []; this.cur = null; this.mode = null; this.fx = { flash: 0, zoom: 0, warp: 0, jx: 0, inv: 0 };
    this.w = 0; this.disp = 0; this.stut = 0; this.mir = 0; this.lastCut = 0; this.idleCut = 0;
    if (!gl) return;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = (fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, "p"); gl.linkProgram(p); const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); } return { p, u }; };
    this.P = { cap: prog(CAP), comp: prog(COMP), blit: prog(BLIT) };
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    this.live = this.tex(); this.size();
  }
  tex(w, h) { const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE)); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); return t; }
  fbo(w, h) { const gl = this.gl, t = this.tex(w, h), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f }; }
  // match the monitor's shape; the frames themselves are kept small
  size() {
    if (!this.ok) return; const gl = this.gl, r = this.cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    const W = Math.max(2, Math.round(r.width * dpr)), H = Math.max(2, Math.round(r.height * dpr)); if (this.cv.width === W && this.cv.height === H && this.ring) return;
    this.cv.width = W; this.cv.height = H; const a = W / H, RW = a >= 1 ? 512 : Math.round(512 * a), RH = a >= 1 ? Math.round(512 / a) : 512;
    if (this.ring) { this.ring.forEach((x) => { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.f); }); [this.A, this.B].forEach((x) => { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.f); }); }
    this.RW = RW; this.RH = RH; this.ring = Array.from({ length: K }, () => this.fbo(RW, RH)); this.A = this.fbo(RW, RH); this.B = this.fbo(RW, RH); this.filled = 0;
  }
  // what's in the crate: [{slug, title, srcs:[{type, url}]}]
  setCrate(list) {
    const keep = new Map(this.items.map((i) => [i.slug, i]));
    this.items.forEach((i) => { if (!list.find((l) => l.slug === i.slug)) this.drop(i); });
    this.items = list.map((l) => keep.get(l.slug) || this.load(l));
    if (!this.cur || !this.items.includes(this.cur)) this.cut();
  }
  load(l) {
    const it = { ...l, k: Math.floor(Math.random() * l.srcs.length) }; this.src(it); return it;
  }
  src(it) {
    const s = it.srcs[it.k % it.srcs.length]; it.kind = s.type;
    if (s.type === "video") {
      if (!it.el) { it.el = document.createElement("video"); Object.assign(it.el, { muted: true, loop: true, playsInline: true, preload: "auto", crossOrigin: "anonymous" }); it.el.setAttribute("playsinline", ""); it.el.setAttribute("muted", ""); }
      it.el.src = s.url; it.el.play().catch(() => {});
    } else { if (it.el) { it.el.pause(); it.el.removeAttribute("src"); it.el.load(); it.el = null; } it.img = new Image(); it.img.src = s.url; it.imgT = null; }
    it.sx = Math.random(); it.sy = Math.random(); it.t0 = performance.now();
  }
  drop(it) { if (it.el) { it.el.pause(); it.el.removeAttribute("src"); it.el.load(); } if (it.imgT) this.gl.deleteTexture(it.imgT); }
  // move to another project, or the one you name
  cut(slug) {
    if (!this.items.length) { this.cur = null; return; }
    let n = slug ? this.items.find((i) => i.slug === slug) : null;
    if (!n) { const pool = this.items.filter((i) => i !== this.cur); n = pool.length ? pool[Math.floor(Math.random() * pool.length)] : this.items[0]; }
    // now and then, while it's off screen, a project swaps to another of its pieces
    this.items.forEach((i) => { if (i !== n && i !== this.cur && i.srcs.length > 1 && Math.random() < .12) { i.k++; this.src(i); } });
    this.cur = n; n.sx = Math.random(); n.sy = Math.random(); this.lastCut = performance.now();
    if (n.el && n.el.paused) n.el.play().catch(() => {});
  }
  // the music, as it happens
  ev(e, chaos, sd) {
    const f = this.fx, c = chaos;
    if (e.type === "kick") { if (Math.random() < .2 + c * .8) this.cut(); f.zoom = .05 + c * .1; }
    else if (e.type === "snare") { f.flash = Math.max(f.flash, .25 + c * .45); if (c > .7 && Math.random() < c - .6) f.inv = 1; }
    else if (e.type === "ghost") f.flash = Math.max(f.flash, .12 * c + .04);
    else if (e.type === "hat") f.jx = (Math.random() - .5) * .012 * c;
    else if (e.type === "bass") f.warp = .25 + c * .75;
    else if (e.type === "roll") { this.strobe = { n: e.d.n, until: performance.now() + sd * 1000 }; }
    else if (e.type === "brk") { const back = (e.d.s - e.d.sl + 16) % 16; if ((back && back < 12) || e.d.rv) { this.stut = performance.now() + sd * 1000; this.stutBack = Math.min(K - 2, Math.round(back * sd * 60)); this.stutRev = e.d.rv; } }
    else if (e.type === "pad") { if (e.d.p) this.cut(e.d.p); f.flash = Math.max(f.flash, .5); f.zoom = .08; }
    else if (e.type === "bar") { if (c > .5 && Math.random() < (c - .5) * .6) this.mir = this.mir ? 0 : 1; else if (c <= .5) this.mir = 0; if (Math.random() < .1 + c * .2) this.cut(); }
  }
  setMode(m) {
    this.mode = m; this.mt = performance.now(); this.from = (this.w - 1 + K) % K; this.L = 6; this.cnt = 0; this.pos = 0;
    const el = this.cur?.el; if (!el) return;
    if (m === "tape") this.tape = el; else if (this.tape) { this.tape.playbackRate = 1; this.tape.play().catch(() => {}); this.tape = null; }
  }
  draw(now, s) {
    if (!this.ok) return; this.size();
    const gl = this.gl, f = this.fx, it = this.cur, sdF = s.sd * 60;
    // the idle drift, when nothing's playing
    if (!s.playing && it && now - this.lastCut > 5200) this.cut();
    // 1. get a picture from the source into the ring
    let fresh = false, srcT = null, sw = 1, sh = 1;
    if (it && it.kind === "video" && it.el && it.el.readyState >= 2) { gl.bindTexture(gl.TEXTURE_2D, this.live); try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, it.el); srcT = this.live; sw = it.el.videoWidth; sh = it.el.videoHeight; } catch (e) {} }
    else if (it && it.img && it.img.complete && it.img.naturalWidth) { if (!it.imgT) { it.imgT = this.tex(); gl.bindTexture(gl.TEXTURE_2D, it.imgT); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, it.img); } srcT = it.imgT; sw = it.img.naturalWidth; sh = it.img.naturalHeight; }
    if (this.tape) { const k = Math.min(1, (now - this.mt) / 700); const r = Math.max(.0625, 1 - k); try { this.tape.playbackRate = r; } catch (e) {} if (k >= 1) this.tape.pause(); }
    const holding = this.mode && this.mode !== "tape";
    if (srcT && !holding) {
      const ta = this.RW / this.RH, sa = sw / sh, z = 1 + f.zoom + (it.kind === "image" ? ((now - it.t0) / 9000) % .25 : 0) + Math.max(0, s.lfoZoom || 0);
      let sx = 1, sy = 1; if (sa > ta) sx = ta / sa; else sy = sa / ta; sx /= z; sy /= z;
      const ox = (it.sx - .5) * (1 - sx), oy = (it.sy - .5) * (1 - sy);
      const R = this.ring[this.w]; gl.bindFramebuffer(gl.FRAMEBUFFER, R.f); gl.viewport(0, 0, this.RW, this.RH);
      gl.useProgram(this.P.cap.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, srcT); gl.uniform1i(this.P.cap.u.s, 0);
      gl.uniform2f(this.P.cap.u.sc, sx, sy); gl.uniform2f(this.P.cap.u.of, ox, oy); gl.uniform1f(this.P.cap.u.mir, this.mir); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      this.disp = this.w; this.w = (this.w + 1) % K; this.filled = Math.min(K, this.filled + 1); fresh = true;
    }
    // 2. which frame to show: the held effects play the ring like tape
    const back = (n) => (this.from - Math.min(n, Math.max(0, this.filled - 1)) + K * 4) % K;
    if (this.mode === "repeat") { this.disp = back(Math.max(1, Math.round(sdF)) - 1 - (this.pos++ % Math.max(1, Math.round(sdF)))); }
    else if (this.mode === "roll") { const L = Math.max(1, Math.round(sdF * 2 / Math.pow(2, Math.floor((now - this.mt) / (s.sd * 2000))))); this.disp = back(L - 1 - (this.pos++ % L)); }
    else if (this.mode === "rev") { const n = this.filled - 1, k = this.pos++ % (n * 2 || 1); this.disp = back(k <= n ? k : n * 2 - k); }
    else if (this.mode === "freeze") this.disp = back(Math.random() < .25 ? 1 : 0);
    else if (this.stut > now && fresh) { const n = this.stutBack || 0; this.disp = (this.disp - n - (Math.floor(now / 33) % 3) + K * 4) % K; }
    // 3. the look: green phosphor, crushed, blurred or traced, with trails
    let flash = f.flash; if (this.strobe && this.strobe.until > now) flash = Math.max(flash, (Math.floor(now / (40)) % 2) * .5);
    const lz = s.lfo * s.depth, dest = s.dest;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.B.f); gl.viewport(0, 0, this.RW, this.RH); gl.useProgram(this.P.comp.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.ring[this.disp].t); gl.uniform1i(this.P.comp.u.s, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.A.t); gl.uniform1i(this.P.comp.u.pv, 1);
    const U = this.P.comp.u, crush = Math.min(1, s.crush + (dest === 2 ? Math.max(0, lz) * .6 : 0)), filt = s.filter + (dest === 0 ? lz * .5 : 0);
    gl.uniform2f(U.res, this.RW, this.RH); gl.uniform1f(U.pix, 1 + crush * crush * 22); gl.uniform1f(U.post, crush * .85);
    gl.uniform1f(U.blur, Math.max(0, -filt)); gl.uniform1f(U.edge, Math.max(0, filt) * .9);
    gl.uniform1f(U.flash, flash); gl.uniform1f(U.mono, s.mono); gl.uniform1f(U.warp, f.warp * (s.playing ? 1 : 0) + (dest === 1 ? Math.abs(lz) * .6 : 0));
    gl.uniform1f(U.trail, Math.min(.93, s.delay * .95)); gl.uniform1f(U.t, now / 1000); gl.uniform1f(U.inv, f.inv);
    gl.uniform1f(U.bright, (this.tape ? Math.max(.25, 1 - (now - this.mt) / 900) : 1) * (dest === 3 ? 1 - Math.max(0, lz) * .7 : 1)); gl.uniform1f(U.jx, f.jx);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.cv.width, this.cv.height); gl.useProgram(this.P.blit.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.B.t); gl.uniform1i(this.P.blit.u.s, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    [this.A, this.B] = [this.B, this.A];
    // everything settles
    f.flash *= .82; f.zoom *= .86; f.warp *= .9; f.jx *= .7; f.inv = f.inv > .5 ? 0 : 0;
  }
}

// the globe: a wire sphere that spins with the tempo, thumps with the kick and leans with the bass
export function globe(cv) {
  const g = cv.getContext("2d"); let ry = 0, pulse = 0, squash = 0;
  return {
    kick() { pulse = 1; }, bass(d) { squash = .25 + d * .03; },
    draw(now, s) {
      const dpr = Math.min(2, devicePixelRatio || 1), r0 = cv.getBoundingClientRect(), W = Math.round(r0.width * dpr), H = Math.round(r0.height * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      g.clearRect(0, 0, W, H); ry += (s.playing ? s.bpm / 172 * .018 : .004); pulse *= .88; squash *= .94;
      const R = Math.min(W, H) * .42 * (1 + pulse * .07), cx = W / 2, cy = H / 2, rx = .45 + (s.lfo || 0) * s.depth * .35;
      const P = (la, lo) => { let x = Math.cos(la) * Math.cos(lo + ry), y = Math.sin(la) * (1 - squash * .5), z = Math.cos(la) * Math.sin(lo + ry); const y2 = y * Math.cos(rx) - z * Math.sin(rx), z2 = y * Math.sin(rx) + z * Math.cos(rx); return [cx + x * R, cy - y2 * R, z2]; };
      g.lineWidth = Math.max(1, dpr * .9);
      const line = (pts) => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; g.strokeStyle = a[2] > 0 && b[2] > 0 ? "rgba(185,224,122,.95)" : "rgba(111,143,63,.4)"; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } };
      for (let i = -3; i <= 3; i++) { const la = i * Math.PI / 8, pts = []; for (let k = 0; k <= 48; k++) pts.push(P(la, k * Math.PI * 2 / 48)); line(pts); }
      for (let i = 0; i < 12; i++) { const lo = i * Math.PI / 6, pts = []; for (let k = 0; k <= 32; k++) pts.push(P(-Math.PI / 2 + k * Math.PI / 32, lo)); line(pts); }
      // a tick ruler underneath, like a dial
      g.fillStyle = "rgba(111,143,63,.8)"; for (let x = 0; x < W; x += 6 * dpr) g.fillRect(x, H - 4 * dpr, dpr, (x / (6 * dpr)) % 5 === 0 ? 4 * dpr : 2 * dpr);
    },
  };
}

// the archive scopes: each part of the mix drawn as a stack of bars, the way the reference does it
export function scopes(cv, labels) {
  const g = cv.getContext("2d"), buf = new Uint8Array(512);
  return {
    draw(an) {
      const dpr = Math.min(2, devicePixelRatio || 1), r0 = cv.getBoundingClientRect(), W = Math.round(r0.width * dpr), H = Math.round(r0.height * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      g.clearRect(0, 0, W, H); const n = labels.length, cw = W / n, top = 14 * dpr, row = 3 * dpr;
      g.font = `${9 * dpr}px "Geist Mono", monospace`; g.textBaseline = "top";
      for (let c = 0; c < n; c++) {
        g.fillStyle = "rgba(111,143,63,.9)"; g.fillText(labels[c], c * cw + 2 * dpr, 0);
        const a = an && an[c]; if (a) a.getByteTimeDomainData(buf); else buf.fill(128);
        const rows = Math.floor((H - top) / row);
        for (let y = 0; y < rows; y++) {
          const v = Math.abs(buf[Math.floor(y / rows * a?.fftSize || 0) % 512] - 128) / 128, w = Math.max(dpr * 2, Math.min(1, v * 2.6) * (cw - 8 * dpr));
          g.fillStyle = v > .02 ? "#b9e07a" : "rgba(111,143,63,.55)"; g.fillRect(c * cw + cw / 2 - w / 2, top + y * row, w, row - dpr);
        }
      }
    },
  };
}
