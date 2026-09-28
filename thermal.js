// Thermal: a soft spectral heat field behind everything. Heat gathers where your hand is and where the work you're
// pointing at lives; it smears, drifts and mashes colours like a thermal camera looking at something alive.
const VS = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FS = `precision highp float;
uniform vec2 res;uniform vec3 BG;uniform float T,pal,NI;uniform vec4 S[20];
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
vec3 ramp(float f){
  vec3 bg=BG,c1=vec3(1.,.72,.5),c2=vec3(1.,.55,.6),c3=vec3(.45,.55,1.),c4=vec3(.72,.86,1.),c5=vec3(1.,.95,.5);
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
  f+=(n(p*3.1+T*.03)-.5)*.07;
  vec3 c=hue(ramp(clamp(f,0.,1.2)),pal*smoothstep(.1,.4,f));
  // night: black, into deep green, into neon green, into a pale mint core. Brightest in the middle, dark at the edges.
  if(NI>.5){float g=clamp(f,0.,1.2);
    vec3 n=mix(vec3(0.),vec3(.0,.09,.05),smoothstep(.04,.22,g));
    n=mix(n,vec3(.05,.42,.2),smoothstep(.2,.45,g));
    n=mix(n,vec3(.25,1.,.45),smoothstep(.42,.7,g));
    n=mix(n,vec3(.85,1.,.86),smoothstep(.72,1.05,g));
    c=n;}
  c+=(h(gl_FragCoord.xy+fract(T)*37.)-.5)*.025;
  gl_FragColor=vec4(c,1.);
}`;

export class Thermal {
  constructor(canvas, { reduce = false, lite = false } = {}) {
    this.c = canvas; this.reduce = reduce; this.sc = this.sc0 = lite ? .26 : .3; this.src = []; this.pal = 0; this.palT = 0;
    const gl = (this.gl = canvas.getContext("webgl", { antialias: false }));
    if (!gl) return;
    const mk = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p); gl.useProgram(p);
    this.bgc = [.957, .952, .937]; this.night = 0; this.u = { NI: gl.getUniformLocation(p, "NI"), BG: gl.getUniformLocation(p, "BG"), res: gl.getUniformLocation(p, "res"), T: gl.getUniformLocation(p, "T"), pal: gl.getUniformLocation(p, "pal"), S: gl.getUniformLocation(p, "S") };
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
  setActive(on) { if (on === this.active) return; this.active = on; this.lastNow = 0; if (on) requestAnimationFrame(this.frame); }
  frame = (now) => {
    if (!this.active || !this.gl) return;
    // keep an eye on how the machine is coping: if frames run long, draw the heat smaller (it's blur, nobody can tell)
    if (this.lastNow) { const dt = now - this.lastNow; this.avg = (this.avg || 16) * .95 + Math.min(dt, 100) * .05; this.nf = (this.nf || 0) + 1;
      if (this.nf > 90) { this.nf = 0; if (this.avg > 22 && this.sc > .16) this.sc *= .8; else if (this.avg < 15 && this.sc < this.sc0) this.sc = Math.min(this.sc0, this.sc * 1.1); } }
    this.lastNow = now;
    const gl = this.gl, t = (now - this.t0) / 1000, W = innerWidth, H = innerHeight, sc = this.sc;
    const w = Math.max(2, Math.round(W * sc)), h = Math.max(2, Math.round(H * sc));
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    this.pal += (this.palT - this.pal) * .03;
    const want = [
      ...this.amb.map((a, i) => ({ x: W * (.5 + .45 * Math.sin(t * a.sx + a.ph)), y: H * (.5 + .42 * Math.cos(t * a.sy + a.ph * 1.3)), r: Math.min(W, H) * (.2 + .04 * i) * (1 + (this.boost || 0) * .5), a: (.14 + (this.boost || 0) * .12) * (this.night ? .45 : 1) })),
      ...this.src,
    ].slice(0, 20);
    // every source eases toward where it wants to be, so heat flows instead of jumping
    while (this.cur.length < want.length) this.cur.push({ ...want[this.cur.length], a: 0 });
    this.cur.forEach((c, i) => {
      const w0 = want[i] || { ...c, a: 0 }, k = this.reduce ? 1 : .13;
      c.x += (w0.x - c.x) * k; c.y += (w0.y - c.y) * k; c.r += (w0.r - c.r) * k; c.a += (w0.a - c.a) * k;
    });
    this.buf.fill(0);
    this.cur.slice(0, 20).forEach((c, i) => { this.buf[i * 4] = c.x / H; this.buf[i * 4 + 1] = (H - c.y) / H; this.buf[i * 4 + 2] = c.r / H; this.buf[i * 4 + 3] = c.a; });
    gl.viewport(0, 0, w, h);
    gl.uniform3fv(this.u.BG, this.bgc); gl.uniform1f(this.u.NI, this.night); gl.uniform2f(this.u.res, w, h); gl.uniform1f(this.u.T, t); gl.uniform1f(this.u.pal, this.pal); gl.uniform4fv(this.u.S, this.buf);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(this.frame);
  };
}
