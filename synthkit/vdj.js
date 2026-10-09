// The blender. Throw images and videos into the circle and the music does the rest: kicks swap what's showing,
// the way it swaps depends on the mode (dissolve, warp, melt, key, kaleido, tunnel, slice, echo), the bass bends it,
// snares flash it, and the held DJ controls stutter, double, reverse and freeze it. None of it makes a sound.
const VS = "attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
const COMP = `precision highp float;varying vec2 v;
uniform sampler2D A,B,F;uniform vec4 ta,tb;uniform float hasA,hasB,mode,x,t,kick,snr,bass,hat,chaos,seed,crush,tiles,segs,bright,lo,mi,hi,react,trails,mirror,fspace,fpitch,fflange,spin;uniform sampler2D FL;
float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+seed*13.7)*43758.5453);}
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec2 mir(vec2 u){return 1.-abs(1.-mod(u,2.));}
vec3 proc(vec2 u,float k){vec2 c=u-.5;float r=length(c),a=atan(c.y,c.x);float w=sin(r*(30.+k*14.)-t*(3.+k)+sin(a*(5.+k)+t*.7)*(1.+bass*5.));return mix(vec3(.05,.06,.09),k<.5?vec3(.95,.55,.35):vec3(.45,.6,1.),smoothstep(-.2,.8,w));}
vec3 sa(vec2 u){u=mir(u);return hasA>.5?texture2D(A,(u-.5)*ta.xy+.5+ta.zw).rgb:proc(u,0.);}
vec3 sb(vec2 u){u=mir(u);return hasB>.5?texture2D(B,(u-.5)*tb.xy+.5+tb.zw).rgb:proc(u,1.);}
vec2 rot(vec2 u,float a){u-=.5;return vec2(u.x*cos(a)-u.y*sin(a),u.x*sin(a)+u.y*cos(a))+.5;}
void main(){
  vec2 u=v;if(mirror>.5){u=.5-abs(v-.5);}
  if(tiles>1.)u=fract(u*tiles);
  u=rot(u,spin);
  vec2 cc=u-.5;float rr=length(cc);
  u=cc/(1.+lo*.22*react+kick*.06)+.5;
  u=rot(u,sin(t*.7)*mi*.18*react);
  u+=(rr>0.?cc/rr:vec2(0.))*sin(rr*38.-t*9.)*lo*.012*react;
  u+=vec2(hs(vec2(floor(u.y*60.),floor(t*30.)))-.5,0.)*hi*.03*react;
  // your drags: a field of pushes that pulls the picture along, ripples a little, and slowly lets go
  vec2 fl=texture2D(FL,v).xy*2.-1.;float fm=length(fl);
  u-=fl*.24;u+=(fm>.001?fl/fm:vec2(0.))*sin(fm*55.-t*7.)*fm*.007;
  u=(u-.5)*pow(2.,-fpitch*.8)+.5;u=rot(u,fpitch*.6);u.x+=sin(u.y*28.+t*9.)*fflange*.05;u.y+=sin(u.x*17.+t*5.)*fflange*.02;
  if(crush>.01){float g=mix(220.,10.,crush);u=(floor(u*g)+.5)/g;}
  vec3 col;int m=int(mode+.5);
  if(m==0){vec2 q=floor(v*640.);float n=hs(q);float e=smoothstep(x-.04,x+.04,n);vec2 d=(vec2(hs(q+1.),hs(q+2.))-.5)*(1.-abs(x*2.-1.))*.03;col=mix(sb(u+d),sa(u-d),e);}
  else if(m==1){vec2 e=vec2(.006,0.);vec3 b=sb(u);vec2 gr=vec2(lum(sb(u+e.xy))-lum(sb(u-e.xy)),lum(sb(u+e.yx))-lum(sb(u-e.yx)));vec2 w=gr*(1.5+bass*14.)+vec2(sin(u.y*9.+t*2.),cos(u.x*7.+t*1.7))*(.01+bass*.05);col=mix(sa(u+w),b,x*.85);}
  else if(m==2){vec3 s=mix(sa(u),sb(u),x);vec3 pv=texture2D(F,v+vec2((hs(vec2(floor(v.x*90.),seed))-.5)*.003,.006+bass*.03)).rgb;float th=.25+bass*.5+kick*.2;col=lum(s)>th?s:pv*.985;}
  else if(m==3){vec3 a=sa(u),b=sb(u+vec2(sin(t)*.02,0.));float th=.15+x*.7+bass*.15;col=lum(a)<th?b:a;}
  else if(m==4){vec2 c=u-.5;float r=length(c),a=atan(c.y,c.x)+t*.15;float s=6.2832/segs;a=mod(a,s);a=abs(a-s*.5);vec2 k=.5+r*vec2(cos(a),sin(a))*(1.+kick*.2);vec3 A1=sa(k),B1=sb(k*1.15+.1);col=mix(A1,abs(A1-B1)*1.6,x);}
  else if(m==5){vec2 z=rot((v-.5)*(.93-kick*.06)+.5,.012+bass*.03);vec3 pv=texture2D(F,z).rgb;vec3 s=mix(sa(u),sb(u),x);float r=length(v-.5);float a=smoothstep(.36,.2,r)*(.55+kick*.45);col=mix(pv*.975,s,a);}
  else if(m==6){float n=floor(u.y*(6.+chaos*40.));float o=(hs(vec2(n,1.))-.5)*(.05+hat*.4);col=mod(n,2.)<1.?sa(u+vec2(o,0.)):sb(u-vec2(o,0.));col=mix(col,sb(u),step(x,hs(vec2(n,7.)))*0.);}
  else{vec3 a=sa(u),b=sb(u+vec2(.02*sin(t*3.),.0));col=mix(a,abs(a-b)*1.8,.35+x*.65);}
  col=mix(col,1.-col,snr*step(.75,chaos));
  col=min(col*(1.+lo*.18*react+kick*.08),vec3(1.));
  if(trails>.5)col=mix(col,texture2D(F,(v-.5)*.982+.5).rgb,.62);
  col=mix(col,texture2D(F,rot((v-.5)*.955+.5,.01)).rgb,fspace*.86);
  if(fm>.02){vec2 q=floor(v*640.);float n=hs(q+fract(t*7.)*97.);col=mix(col,sb(u+(vec2(hs(q+3.),hs(q+5.))-.5)*.02),smoothstep(fm*.45,fm*.45-.06,n));}
  gl_FragColor=vec4(col*bright,1.);
}`;
const POST = `precision highp float;varying vec2 v;uniform sampler2D S;uniform float phos,flash,dark,therm,mono,inv,pix,post,edge,hi,react,ffilt;
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec3 ramp(float L){return mix(mix(vec3(.035,.06,.03),vec3(.30,.47,.14),smoothstep(0.,.5,L)),vec3(.78,.94,.52),smoothstep(.48,1.,L));}
vec3 heat(float L){return L<.25?mix(vec3(.02,0.,.08),vec3(.35,0.,.55),L*4.):L<.5?mix(vec3(.35,0.,.55),vec3(.95,.1,.2),(L-.25)*4.):L<.75?mix(vec3(.95,.1,.2),vec3(1.,.6,0.),(L-.5)*4.):mix(vec3(1.,.6,0.),vec3(1.,1.,.85),(L-.75)*4.);}
void main(){vec2 u=v;if(pix>.5){float g=mix(90.,26.,hi*react);u=(floor(u*g)+.5)/g;}
vec3 c=texture2D(S,u).rgb;
if(ffilt<-.02){float r=-ffilt*14./640.;vec3 s=c;for(int i=0;i<8;i++){float a=float(i)*.785;s+=texture2D(S,u+vec2(cos(a),sin(a))*r).rgb;}c=s/9.;}
if(ffilt>.02){vec2 o=vec2(1.5/640.);float lx=lum(texture2D(S,u+vec2(o.x,0.)).rgb)-lum(texture2D(S,u-vec2(o.x,0.)).rgb),ly=lum(texture2D(S,u+vec2(0.,o.y)).rgb)-lum(texture2D(S,u-vec2(0.,o.y)).rgb);c=mix(c,vec3(clamp(length(vec2(lx,ly))*7.,0.,1.)),ffilt);}
if(edge>.5){vec2 o=vec2(1.5/640.);float lx=lum(texture2D(S,u+vec2(o.x,0.)).rgb)-lum(texture2D(S,u-vec2(o.x,0.)).rgb),ly=lum(texture2D(S,u+vec2(0.,o.y)).rgb)-lum(texture2D(S,u-vec2(0.,o.y)).rgb);c=vec3(clamp(length(vec2(lx,ly))*6.,0.,1.))*mix(vec3(1.),c*2.,.5);}
if(post>.5)c=floor(c*4.+.5)/4.;
if(mono>.5)c=vec3(smoothstep(.25,.75,lum(c)));
if(inv>.5)c=1.-c;
if(therm>.5)c=heat(lum(c));
c=mix(c,ramp(lum(c)),phos);c+=flash*vec3(.5);c*=1.-dark;
float r=length(v-.5);c*=smoothstep(.5,.47,r);gl_FragColor=vec4(c,1.);}`;
const FLOW = `precision highp float;varying vec2 v;uniform sampler2D P;uniform vec2 tp,tv;uniform float down;
void main(){vec2 f=texture2D(P,v).xy*2.-1.;f=sign(f)*max(abs(f)*.982-.002,0.);
vec2 d=v-tp;float g=exp(-dot(d,d)/.006);f+=tv*g*down*9.;f=clamp(f,-1.,1.);gl_FragColor=vec4(f*.5+.5,0.,1.);}`;
const K = 24, RES = 640;
export const MODES = ["DISSOLVE", "WARP", "MELT", "KEY", "KALEIDO", "TUNNEL", "SLICE", "ECHO"];

export class Blender {
  constructor(cv) {
    this.cv = cv; const gl = (this.gl = cv.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: false }));
    this.ok = !!gl; this.layers = []; this.ia = 0; this.ib = 0; this.x = 0; this.xt = 0; this.mode = 0; this.lock = null; this.hold = null;
    this.f = { kick: 0, snr: 0, bass: 0, hat: 0, flash: 0, seed: 1, segs: 6 }; this.w = 0; this.filled = 0; this.pos = 0;
    this.T = { x: .5, y: .5, vx: 0, vy: 0, amt: 0, down: false }; this.ta = [1, 1, 0, 0]; this.tb = [1, 1, 0, 0]; this.look = { phos: 0, therm: 0, mono: 0, inv: 0, mirror: 0, trails: 0, pix: 0, post: 0, edge: 0 }; this.react = .7;
    if (!gl) return;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
    const prog = (fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, "p"); gl.linkProgram(p); const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); } return { p, u }; };
    this.P = { comp: prog(COMP), post: prog(POST), flow: prog(FLOW) };
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    this.blank = this.tex(2, 2);
    this.ring = Array.from({ length: K }, () => this.fbo(RES, RES)); this.fb = [this.fbo(RES, RES), this.fbo(RES, RES)];
    this.flow = [this.fbo(160, 160), this.fbo(160, 160)]; this.flow.forEach((f) => { gl.bindFramebuffer(gl.FRAMEBUFFER, f.f); gl.clearColor(.5, .5, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); });
  }
  tex(w, h) { const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE)); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); return t; }
  fbo(w, h) { const gl = this.gl, t = this.tex(w, h), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f }; }
  // ---------- the deck ----------
  add(src) {
    if (this.layers.length >= 8) this.remove(0);
    const L = { ...src, tex: this.ok ? this.tex() : null, ready: false, sx: Math.random(), sy: Math.random() };
    if (src.type === "video") {
      const el = (L.el = document.createElement("video")); Object.assign(el, { muted: true, loop: true, playsInline: true, preload: "auto" }); el.setAttribute("playsinline", ""); el.setAttribute("muted", "");
      el.src = src.url; el.play().catch(() => {}); el.addEventListener("loadeddata", () => (L.ready = true), { once: true });
    } else { const im = (L.img = new Image()); im.onload = () => { L.ready = true; L.fresh = true; }; im.src = src.url; }
    this.layers.push(L); const n = this.layers.length - 1;
    if (this.layers.length === 1) { this.ia = this.ib = 0; } else { if (this.xt > .5) this.ia = n; else this.ib = n; this.xt = this.xt > .5 ? 0 : 1; }
    return L;
  }
  remove(i) {
    const L = this.layers[i]; if (!L) return; if (L.el) { L.el.pause(); L.el.removeAttribute("src"); L.el.load(); } if (L.tex) this.gl.deleteTexture(L.tex); if (L.own) URL.revokeObjectURL(L.url);
    this.layers.splice(i, 1); const n = this.layers.length; this.ia = n ? Math.min(this.ia, n - 1) : 0; this.ib = n ? Math.min(this.ib, n - 1) : 0;
  }
  clear() { while (this.layers.length) this.remove(0); }
  next(not) { const n = this.layers.length; if (n < 2) return 0; let k; do { k = Math.floor(Math.random() * n); } while (k === not); return k; }
  show(i) { if (!this.layers[i]) return; if (this.xt > .5) { this.ia = i; this.xt = 0; } else { this.ib = i; this.xt = 1; } this.speed = .5; }
  // ---------- the music ----------
  ev(e, chaos, sd) {
    const f = this.f;
    if (e.type === "kick") {
      f.kick = 1;
      if (Math.random() < .35 + chaos * .65) { if (this.xt > .5) { this.ia = this.next(this.ib); this.xt = 0; } else { this.ib = this.next(this.ia); this.xt = 1; } this.speed = [.22, .3, .12, .1, .25, .4, 1, .3][this.mode]; this.jig(this.xt > .5 ? "tb" : "ta"); }
    }
    else if (e.type === "snare") { f.snr = 1; f.flash = Math.max(f.flash, .12 + chaos * .25); f.segs = [4, 6, 8, 12][Math.floor(Math.random() * 4)]; }
    else if (e.type === "ghost") f.flash = Math.max(f.flash, .05);
    else if (e.type === "hat") { f.hat = 1; f.seed = Math.random() * 100; }
    else if (e.type === "bass") f.bass = 1;
    else if (e.type === "roll") this.strobe = performance.now() + sd * 1000;
    else if (e.type === "brk") { if (e.d.s !== e.d.sl && Math.random() < chaos) this.stut = performance.now() + sd * 900; }
    else if (e.type === "pad") { const i = e.d.p ? this.layers.findIndex((l) => l.p === e.d.p) : -1; if (i >= 0) this.show(i); f.flash = Math.max(f.flash, .3); f.kick = 1; }
    else if (e.type === "bar") { if (this.lock == null && e.d.bar % (chaos > .6 ? 2 : 4) === 0) this.mode = Math.floor(Math.random() * MODES.length); }
  }
  // your finger in the picture: where it is, how fast it's going, whether it's down
  poke(x, y, down) { const T = this.T; if (down && T.down) { T.vx = T.vx * .5 + (x - T.x) * .5; T.vy = T.vy * .5 + (y - T.y) * .5; } T.x = x; T.y = y; T.down = down; }
  jig(k) { const z = 1 + Math.random() * .25; this[k] = [0, 0, (Math.random() - .5) * .2, (Math.random() - .5) * .2]; this[k + "z"] = z; }
  setLock(m) { this.lock = m; if (m != null) this.mode = m; }
  setHold(m) {
    const prev = this.hold; this.hold = m; this.ht = performance.now(); this.from = (this.w - 1 + K) % K; this.pos = 0;
    this.layers.forEach((L) => { if (!L.el) return; if (m === "half") L.el.playbackRate = .5; else if (prev === "half" || prev === "tape") { L.el.playbackRate = 1; L.el.play().catch(() => {}); } });
  }
  fit(L, key) {
    const w = L.el ? L.el.videoWidth : L.img.naturalWidth, h = L.el ? L.el.videoHeight : L.img.naturalHeight, a = w / h || 1, z = this[key + "z"] || 1;
    let sx = 1, sy = 1; if (a > 1) sx = 1 / a; else sy = a; sx /= z; sy /= z; const j = this[key] || [0, 0, 0, 0];
    return [sx, sy, j[2] * (1 - sx), j[3] * (1 - sy)];
  }
  up(L) {
    const gl = this.gl; if (!L || !L.ready) return false; gl.bindTexture(gl.TEXTURE_2D, L.tex);
    if (L.el) { if (L.el.readyState < 2) return L.up; try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, L.el); L.up = true; } catch (e) {} }
    else if (L.fresh || !L.up) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, L.img); L.fresh = false; L.up = true; }
    return L.up;
  }
  draw(now, s) {
    if (!this.ok) return; const gl = this.gl, f = this.f, dpr = Math.min(2, devicePixelRatio || 1), r = this.cv.getBoundingClientRect(), W = Math.round(r.width * dpr);
    if (this.cv.width !== W) { this.cv.width = W; this.cv.height = W; }
    const tape = this.hold === "tape", hold = this.hold, frozen = ["repeat", "roll", "rev", "freeze", "mash"].includes(hold);
    if (tape) { const k = Math.min(1, (now - this.ht) / 700); this.layers.forEach((L) => { if (L.el) { try { L.el.playbackRate = Math.max(.0625, 1 - k); } catch (e) {} if (k >= 1) L.el.pause(); } }); }
    this.x += (this.xt - this.x) * (this.speed || .2);
    // move the drag field on: it fades a little every frame, and wherever you're dragging gets pushed
    { const T = this.T, [fa, fb2] = this.flow, F2 = this.P.flow; gl.bindFramebuffer(gl.FRAMEBUFFER, fb2.f); gl.viewport(0, 0, 160, 160); gl.useProgram(F2.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fa.t); gl.uniform1i(F2.u.P, 0); gl.uniform2f(F2.u.tp, T.x, T.y); gl.uniform2f(F2.u.tv, T.vx, T.vy); gl.uniform1f(F2.u.down, T.down ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); this.flow = [fb2, fa]; T.vx *= .6; T.vy *= .6; }
    if (!frozen) {
      const A = this.layers[this.ia], B = this.layers[this.ib], hA = this.up(A), hB = this.up(B);
      const [fo, fn] = this.fb; gl.bindFramebuffer(gl.FRAMEBUFFER, fn.f); gl.viewport(0, 0, RES, RES); const P = this.P.comp, U = P.u; gl.useProgram(P.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, hA ? A.tex : this.blank); gl.uniform1i(U.A, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, hB ? B.tex : this.blank); gl.uniform1i(U.B, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, fo.t); gl.uniform1i(U.F, 2);
      gl.uniform4fv(U.ta, hA ? this.fit(A, "ta") : [1, 1, 0, 0]); gl.uniform4fv(U.tb, hB ? this.fit(B, "tb") : [1, 1, 0, 0]);
      gl.uniform1f(U.hasA, hA ? 1 : 0); gl.uniform1f(U.hasB, hB ? 1 : 0); gl.uniform1f(U.mode, this.mode); gl.uniform1f(U.x, this.x); gl.uniform1f(U.t, now / 1000);
      const lz = s.lfo * s.depth;
      gl.uniform1f(U.kick, f.kick); gl.uniform1f(U.snr, f.snr > .6 ? 1 : 0); gl.uniform1f(U.bass, Math.min(1, f.bass * (.4 + s.chaos) + (s.dest === 1 ? Math.abs(lz) * .6 : 0))); gl.uniform1f(U.hat, f.hat);
      gl.uniform1f(U.chaos, this.react); gl.uniform1f(U.seed, f.seed); gl.uniform1f(U.crush, 0); const fx = s.fx || {}; gl.uniform1f(U.fspace, fx.space || 0); gl.uniform1f(U.fpitch, fx.pitch || 0); gl.uniform1f(U.fflange, fx.flange || 0); gl.uniform1f(U.spin, this.spin || 0); if (!this.scratching) this.spin = (this.spin || 0) * .9;
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.flow[0].t); gl.uniform1i(U.FL, 3);
      gl.uniform1f(U.lo, s.lo || 0); gl.uniform1f(U.mi, s.mi || 0); gl.uniform1f(U.hi, s.hi || 0); gl.uniform1f(U.react, this.react); gl.uniform1f(U.trails, this.look.trails); gl.uniform1f(U.mirror, this.look.mirror);
      gl.uniform1f(U.tiles, hold === "x2" ? 2 : hold === "x4" ? 4 : 1); gl.uniform1f(U.segs, f.segs); gl.uniform1f(U.bright, tape ? Math.max(.2, 1 - (now - this.ht) / 900) : 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); this.fb = [fn, fo];
      // keep a short ring of what came out, for the held effects to play with
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.ring[this.w].f); this.blit(fn.t); this.w = (this.w + 1) % K; this.filled = Math.min(K, this.filled + 1);
    }
    let src = this.fb[1].t; const base = this.hold ? this.from : (this.w - 1 + K) % K, back = (n) => this.ring[((base - Math.min(n, Math.max(0, this.filled - 1))) % K + K * 4) % K].t, sdF = s.sd * 60;
    if (hold === "repeat") { const L = Math.max(1, Math.round(sdF * 2)); src = back(L - 1 - (this.pos++ % L)); }
    else if (hold === "roll") { const L = Math.max(1, Math.round(sdF * 2 / Math.pow(2, Math.floor((now - this.ht) / (s.sd * 2000))))); src = back(L - 1 - (this.pos++ % L)); }
    else if (hold === "rev") { const n = this.filled - 1, k = this.pos++ % (n * 2 || 1); src = back(k <= n ? k : n * 2 - k); }
    else if (hold === "freeze") src = back(Math.random() < .2 ? 1 : 0);
    else if (hold === "mash") { if (this.pos++ % Math.max(1, Math.round(sdF)) === 0) this.mashK = Math.floor(Math.random() * Math.min(this.filled, K - 1)); src = back(this.mashK || 0); }
    else if (this.stut > now) src = back(Math.floor(now / 30) % 3);
    // to the screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.cv.width, this.cv.height); const Q = this.P.post; gl.useProgram(Q.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.uniform1i(Q.u.S, 0); gl.uniform1f(Q.u.phos, this.look.phos); ["therm", "mono", "inv", "pix", "post", "edge"].forEach((k) => gl.uniform1f(Q.u[k], this.look[k])); gl.uniform1f(Q.u.hi, s.hi || 0); gl.uniform1f(Q.u.react, this.react); gl.uniform1f(Q.u.ffilt, (s.fx && s.fx.filter) || 0);
    const strobe = this.strobe > now ? (Math.floor(now / 40) % 2) * .35 : 0; gl.uniform1f(Q.u.flash, Math.max(f.flash, strobe));
    gl.uniform1f(Q.u.dark, (hold === "gate" ? (Math.floor(now / (s.sd * 500)) % 2) * .85 : 0) + (s.dest === 2 ? Math.max(0, lz(s)) * .6 : 0));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    f.kick *= .85; f.snr *= .7; f.bass *= .93; f.hat *= .8; f.flash *= .8;
    function lz(s) { return s.lfo * s.depth; }
  }
  blit(t) { const gl = this.gl, Q = this.P.post; gl.viewport(0, 0, RES, RES); gl.useProgram(Q.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(Q.u.S, 0); ["phos", "flash", "dark", "therm", "mono", "inv", "pix", "post", "edge", "ffilt"].forEach((k) => gl.uniform1f(Q.u[k], 0)); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
}

// the archive scopes: each part of the mix drawn as a stack of bars
export function scopes(cv, labels) {
  const g = cv.getContext("2d"), buf = new Uint8Array(512);
  return {
    draw(an) {
      const dpr = Math.min(2, devicePixelRatio || 1), r0 = cv.getBoundingClientRect(), W = Math.round(r0.width * dpr), H = Math.round(r0.height * dpr);
      if (!W || !H) return; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      g.clearRect(0, 0, W, H); const n = labels.length, cw = W / n, top = 14 * dpr, row = 3 * dpr;
      g.font = `${9 * dpr}px "Geist Mono", monospace`; g.textBaseline = "top";
      for (let c = 0; c < n; c++) {
        g.fillStyle = "rgba(111,143,63,.9)"; g.fillText(labels[c], c * cw + 2 * dpr, 0);
        const a = an && an[c]; if (a) a.getByteTimeDomainData(buf); else buf.fill(128);
        const rows = Math.floor((H - top) / row);
        for (let y = 0; y < rows; y++) {
          const v = Math.abs(buf[Math.floor((y / rows) * 512) % 512] - 128) / 128, w = Math.max(dpr * 2, Math.min(1, v * 2.6) * (cw - 8 * dpr));
          g.fillStyle = v > .02 ? "#b9e07a" : "rgba(111,143,63,.55)"; g.fillRect(c * cw + cw / 2 - w / 2, top + y * row, w, row - dpr);
        }
      }
    },
  };
}
