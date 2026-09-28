// Thermal: a soft spectral heat field behind everything. Heat gathers where your hand is and where the work you're
// pointing at lives; it smears, drifts and mashes colours like a thermal camera looking at something alive.
const VS = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FS = `precision highp float;
uniform vec2 res;uniform vec3 BG;uniform float T,pal,NI;uniform vec4 S[20];
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
uniform vec3 P[5];
// five colour stops from the edge of the heat to its core. Blended in OKLab (how the eye sees colour) instead of raw RGB,
// so two colours meeting never pass through grey or brown on the way
vec3 toLab(vec3 c){c=pow(max(c,0.),vec3(2.2));
  vec3 l=vec3(.4122*c.r+.5363*c.g+.0514*c.b,.2119*c.r+.6807*c.g+.1074*c.b,.0883*c.r+.2817*c.g+.63*c.b);l=pow(l,vec3(1./3.));
  return vec3(.2105*l.x+.7936*l.y-.0041*l.z,1.978*l.x-2.4286*l.y+.4506*l.z,.0259*l.x+.7828*l.y-.8087*l.z);}
vec3 toRGB(vec3 L){vec3 l=vec3(L.x+.3963*L.y+.2158*L.z,L.x-.1056*L.y-.0639*L.z,L.x-.0895*L.y-1.2915*L.z);l=l*l*l;
  vec3 c=vec3(4.0767*l.x-3.3077*l.y+.2310*l.z,-1.2684*l.x+2.6098*l.y-.3413*l.z,-.0042*l.x-.7034*l.y+1.7076*l.z);
  return pow(clamp(c,0.,1.),vec3(1./2.2));}
vec3 ramp(float f){
  vec3 c=mix(toLab(BG),toLab(P[0]),smoothstep(.04,.2,f));
  c=mix(c,toLab(P[1]),smoothstep(.18,.38,f));
  c=mix(c,toLab(P[2]),smoothstep(.36,.56,f));
  c=mix(c,toLab(P[3]),smoothstep(.54,.76,f));
  c=mix(c,toLab(P[4]),smoothstep(.76,1.05,f));
  // keep the colour singing where stops meet: a touch more chroma in the middle of the heat
  c.yz*=1.+.25*smoothstep(.1,.5,f)*(1.-smoothstep(.8,1.05,f));
  return toRGB(c);
}
vec3 hue(vec3 c,float a){const mat3 toY=mat3(.299,.596,.211,.587,-.274,-.523,.114,-.322,.312);const mat3 toR=mat3(1.,1.,1.,.956,-.272,-1.106,.621,-.647,1.703);
  vec3 y=toY*c;float h0=atan(y.z,y.y)+a,ch=length(y.yz);return toR*vec3(y.x,ch*cos(h0),ch*sin(h0));}
void main(){
  vec2 p=gl_FragCoord.xy/res.y;
  p+=(vec2(fbm(p*1.6+T*.05),fbm(p*1.6+3.1-T*.04))-.5)*.14;
  float f=0.;
  for(int i=0;i<20;i++){vec2 d=p-S[i].xy;f+=S[i].w*exp(-dot(d,d)/max(S[i].z*S[i].z,1e-4));}
  f+=(n(p*3.1+T*.03)-.5)*.07;
  vec3 c=ramp(clamp(f,0.,1.2));

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
    this.bgc = [.957, .952, .937]; this.night = 0; this.P = new Float32Array(15); this.PT = new Float32Array(15); this.u = { P: gl.getUniformLocation(p, "P"), NI: gl.getUniformLocation(p, "NI"), BG: gl.getUniformLocation(p, "BG"), res: gl.getUniformLocation(p, "res"), T: gl.getUniformLocation(p, "T"), pal: gl.getUniformLocation(p, "pal"), S: gl.getUniformLocation(p, "S") };
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
  // a colourway: five hex colours, edge of the heat to its core
  palette(stops, now) { const v = stops.flatMap((h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16) / 255)); this.PT.set(v); if (now) this.P.set(v); }
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
    { const dt = Math.min(.25, (now - (this.lastP || now)) / 1000), k = 1 - Math.exp(-dt * 3.2); this.lastP = now; for (let i = 0; i < 15; i++) this.P[i] += (this.PT[i] - this.P[i]) * k; }
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
    gl.uniform3fv(this.u.P, this.P); gl.uniform3fv(this.u.BG, this.bgc); gl.uniform1f(this.u.NI, this.night); gl.uniform2f(this.u.res, w, h); gl.uniform1f(this.u.T, t); gl.uniform1f(this.u.pal, this.pal); gl.uniform4fv(this.u.S, this.buf);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(this.frame);
  };
}
