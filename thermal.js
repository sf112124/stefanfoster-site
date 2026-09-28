// Thermal: a soft spectral heat field behind everything. Heat gathers where your hand is and where the work you're
// pointing at lives; it smears, drifts and mashes colours like a thermal camera looking at something alive.
const VS = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FS = `precision highp float;
uniform vec2 res;uniform float T,pal,dream,base,mixAB;uniform vec4 S[20];uniform sampler2D A,B;uniform vec2 sA,sB;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
vec3 ramp(float f){
  vec3 bg=vec3(.957,.952,.937),c1=vec3(1.,.72,.5),c2=vec3(1.,.55,.6),c3=vec3(.45,.55,1.),c4=vec3(.72,.86,1.),c5=vec3(1.,.95,.5);
  vec3 c=mix(bg,c1,smoothstep(.06,.26,f));
  c=mix(c,c2,smoothstep(.26,.44,f));
  c=mix(c,c3,smoothstep(.44,.62,f));
  c=mix(c,c4,smoothstep(.62,.78,f));
  c=mix(c,c5,smoothstep(.78,.98,f));
  return c;
}
vec3 hue(vec3 c,float a){const mat3 toY=mat3(.299,.596,.211,.587,-.274,-.523,.114,-.322,.312);const mat3 toR=mat3(1.,1.,1.,.956,-.272,-1.106,.621,-.647,1.703);
  vec3 y=toY*c;float h0=atan(y.z,y.y)+a,ch=length(y.yz);return toR*vec3(y.x,ch*cos(h0),ch*sin(h0));}
void main(){
  vec2 p=gl_FragCoord.xy/res.y;
  p+=(vec2(fbm(p*1.6+T*.05),fbm(p*1.6+3.1-T*.04))-.5)*.14;
  float f=0.;
  for(int i=0;i<20;i++){vec2 d=p-S[i].xy;f+=S[i].w*exp(-dot(d,d)/max(S[i].z*S[i].z,1e-4));}
  f+=(fbm(p*2.4+T*.03)-.5)*.08;
  vec3 c=hue(ramp(clamp(f,0.,1.2)),pal*smoothstep(.1,.4,f));
  // the work surfaces through the heat: where it's warm you see pieces of it, seen by a thermal camera, drifting like a dream
  vec2 u0=gl_FragCoord.xy/res,sw=(vec2(fbm(u0*2.2+T*.035),fbm(u0*2.2+5.2-T*.03))-.5)*(.16+.1*dream),zm=vec2(.86-.05*sin(T*.07));
  vec3 ia=texture2D(A,(u0-.5)*sA*zm+.5+sw).rgb,ib=texture2D(B,(u0-.5)*sB*zm+.5+sw*1.3).rgb,im=mix(ia,ib,mixAB);
  float lum=dot(im,vec3(.299,.587,.114));
  vec3 th=hue(ramp(.16+lum*.9),pal+.4*sin(T*.05)),dc=mix(th,im,.42);
  float rv=clamp(dream*smoothstep(.1,.6,f)+base*(.55+.45*fbm(u0*1.4-T*.02)),0.,.9);
  c=mix(c,dc,rv);
  c+=(h(gl_FragCoord.xy+fract(T)*37.)-.5)*.025;
  gl_FragColor=vec4(c,1.);
}`;

export class Thermal {
  constructor(canvas, { reduce = false, lite = false } = {}) {
    this.c = canvas; this.reduce = reduce; this.sc = lite ? .3 : .5; this.src = []; this.pal = 0; this.palT = 0;
    const gl = (this.gl = canvas.getContext("webgl", { antialias: false }));
    if (!gl) return;
    const mk = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p); gl.useProgram(p);
    const U = (n) => gl.getUniformLocation(p, n);
    this.u = { res: U("res"), T: U("T"), pal: U("pal"), S: U("S"), dream: U("dream"), base: U("base"), mixAB: U("mixAB"), sA: U("sA"), sB: U("sB") };
    gl.uniform1i(U("A"), 0); gl.uniform1i(U("B"), 1);
    // two picture slots: the one showing, and the one fading in
    this.tex = [0, 1].map(() => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([244, 243, 239, 255]));
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE)); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); return { t, a: 1 }; });
    this.front = 0; this.mixAB = 0; this.fading = false; this.pool = []; this.cache = new Map(); this.dream = 0; this.base = 0; this.dreamT = 0; this.baseT = 0; this.next = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.buf = new Float32Array(80);
    // slow ambient warmth so it's never dead
    this.amb = Array.from({ length: 4 }, (_, i) => ({ ph: i * 1.9, sx: .06 + i * .013, sy: .05 + i * .017 }));
    this.cur = [];
    this.t0 = performance.now(); this.active = true;
    requestAnimationFrame(this.frame);
  }
  // heat sources in page pixels: {x, y, r (px), a}
  set(list) { this.src = list; }
  // pictures for the dream: a pool it drifts through on its own, or one piece you're pointing at right now
  images(urls) { this.pool = urls.filter(Boolean); this.next = 0; }
  show(url) { if (url && url !== this.curImg && url !== this.want) { this.load(url); this.next = (performance.now() - this.t0) / 1000 + 6; } }
  load(url) {
    this.want = url;
    let img = this.cache.get(url);
    const ready = () => { if (this.want === url) this.pending = { img, url }; };
    if (img) { if (img.complete && img.naturalWidth) ready(); else img.addEventListener("load", ready, { once: true }); return; }
    img = new Image(); img.decoding = "async";
    try { if (new URL(url, location.href).origin !== location.origin) img.crossOrigin = "anonymous"; } catch (e) {}
    img.addEventListener("load", ready, { once: true });
    if (this.cache.size > 60) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(url, img); img.src = url;
  }
  upload(slot, img) {
    const gl = this.gl;
    try { gl.bindTexture(gl.TEXTURE_2D, slot.t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); slot.a = img.naturalWidth / img.naturalHeight; return true; } catch (e) { return false; }
  }
  cover(a, W, H) { const sa = W / H; return a > sa ? [sa / a, 1] : [1, a / sa]; }
  setActive(on) { if (on === this.active) return; this.active = on; if (on) requestAnimationFrame(this.frame); }
  frame = (now) => {
    if (!this.active || !this.gl) return;
    const gl = this.gl, t = (now - this.t0) / 1000, W = innerWidth, H = innerHeight, sc = this.sc;
    const w = Math.max(2, Math.round(W * sc)), h = Math.max(2, Math.round(H * sc));
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    this.pal += (this.palT - this.pal) * .03;
    this.dream += (this.dreamT - this.dream) * .03; this.base += (this.baseT - this.base) * .02;
    // drift through the pool; a fresh picture fades in over the old one
    if (!this.pending && !this.fading && this.pool.length && t > this.next) { this.next = t + (this.baseT > .2 ? 4.5 : 8); this.load(this.pool[Math.floor(Math.random() * this.pool.length)]); }
    if (this.pending && !this.fading) { const back = this.tex[1 - this.front]; if (this.upload(back, this.pending.img)) { this.fading = true; this.mixAB = 0; this.curImg = this.pending.url; } this.pending = null; }
    if (this.fading) { this.mixAB = Math.min(1, this.mixAB + .02); if (this.mixAB >= 1) { this.front = 1 - this.front; this.mixAB = 0; this.fading = false; } }
    const want = [
      ...this.amb.map((a, i) => ({ x: W * (.5 + .45 * Math.sin(t * a.sx + a.ph)), y: H * (.5 + .42 * Math.cos(t * a.sy + a.ph * 1.3)), r: Math.min(W, H) * (.2 + .04 * i) * (1 + (this.boost || 0) * .5), a: .14 + (this.boost || 0) * .12 })),
      ...this.src,
    ].slice(0, 20);
    // every source eases toward where it wants to be, so heat flows instead of jumping
    while (this.cur.length < want.length) this.cur.push({ ...want[this.cur.length], a: 0 });
    this.cur.forEach((c, i) => {
      const w0 = want[i] || { ...c, a: 0 }, k = this.reduce ? 1 : .06;
      c.x += (w0.x - c.x) * k; c.y += (w0.y - c.y) * k; c.r += (w0.r - c.r) * k; c.a += (w0.a - c.a) * k;
    });
    this.buf.fill(0);
    this.cur.slice(0, 20).forEach((c, i) => { this.buf[i * 4] = c.x / H; this.buf[i * 4 + 1] = (H - c.y) / H; this.buf[i * 4 + 2] = c.r / H; this.buf[i * 4 + 3] = c.a; });
    gl.viewport(0, 0, w, h);
    gl.uniform2f(this.u.res, w, h); gl.uniform1f(this.u.T, t); gl.uniform1f(this.u.pal, this.pal); gl.uniform4fv(this.u.S, this.buf);
    const fa = this.tex[this.front], fb = this.tex[1 - this.front];
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fa.t); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fb.t); gl.activeTexture(gl.TEXTURE0);
    gl.uniform2fv(this.u.sA, this.cover(fa.a, W, H)); gl.uniform2fv(this.u.sB, this.cover(fb.a, W, H));
    gl.uniform1f(this.u.dream, this.reduce ? 0 : this.dream); gl.uniform1f(this.u.base, this.reduce ? 0 : this.base); gl.uniform1f(this.u.mixAB, this.mixAB);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(this.frame);
  };
}
