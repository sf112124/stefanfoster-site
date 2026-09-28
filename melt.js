// The melt: one full-screen canvas that carries a piece of footage from one place to another.
// Its edge is never straight while it moves: it wobbles like liquid and settles only when it lands.
const VS = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FS = `precision highp float;
uniform sampler2D tex;uniform vec2 res,C,H;uniform float rad,wob,feather,liquid,alpha,T,ma,hasTex;uniform vec3 paper;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
float box(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
void main(){
  vec2 p=vec2(gl_FragCoord.x,res.y-gl_FragCoord.y);
  vec2 q=p-C;
  float d=box(q,H,min(rad,min(H.x,H.y)));
  d+=(fbm(p*.0045+vec2(T*.35,-T*.28))-.5)*wob+(fbm(p*.013-T*.5)-.5)*wob*.35;
  float m=1.-smoothstep(-feather,feather,d);
  if(m<.002)discard;
  vec2 uv=q/(2.*H)+.5;
  uv+=(vec2(fbm(uv*2.6+T*.6),fbm(uv*2.6+5.2-T*.6))-.5)*liquid;
  float ra=H.x/H.y;
  vec2 s=ma>ra?vec2(ra/ma,1.):vec2(1.,ma/ra);
  vec2 u=(uv-.5)*s+.5;
  vec3 c=hasTex>.5?texture2D(tex,clamp(u,0.,1.)).rgb:paper;
  gl_FragColor=vec4(c*m*alpha,m*alpha);
}`;
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, k) => a + (b - a) * k;

export class Melt {
  constructor({ off = false } = {}) {
    if (off) { this.gl = null; return; }
    const c = (this.c = document.createElement("canvas"));
    c.className = "melt"; c.setAttribute("aria-hidden", "true"); document.body.appendChild(c);
    const gl = (this.gl = c.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false }));
    if (!gl) return;
    const mk = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
    const p = (this.p = gl.createProgram()); gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p); gl.useProgram(p);
    this.u = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (o[k] = gl.getUniformLocation(p, k))) });
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.t);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
    [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR));
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.t0 = performance.now();
  }
  size() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5), w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    this.dpr = dpr;
  }
  // from/to: {x,y,w,h} in CSS px. blob: roundness at each end (1 = a round node, 0 = a crisp rectangle).
  run({ el, from, to, blobFrom = 0, blobTo = 0, dur = 700, fadeOut = false, fadeIn = false, paper = [.953, .945, .925] }) {
    const gl = this.gl;
    if (!gl) return Promise.resolve();
    this.size(); this.c.classList.add("on");
    const ma = el ? (el.videoWidth || el.naturalWidth || 1) / (el.videoHeight || el.naturalHeight || 1) : 1;
    let hasTex = 0;
    const upload = () => { if (!el) return; if (el.tagName === "VIDEO" && el.readyState < 2) return; try { gl.bindTexture(gl.TEXTURE_2D, this.t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el); hasTex = 1; } catch (e) {} };
    upload();
    const start = performance.now();
    return new Promise((done) => {
      const step = (now) => {
        const k = Math.min(1, (now - start) / dur), e = ease(k), s = Math.sin(k * Math.PI), d = this.dpr;
        if (el && el.tagName === "VIDEO") upload();
        const x = lerp(from.x, to.x, e), y = lerp(from.y, to.y, e), w = lerp(from.w, to.w, e), h = lerp(from.h, to.h, e);
        const blob = lerp(blobFrom, blobTo, e), rad = lerp(6, Math.min(w, h) / 2, blob) * d;
        gl.viewport(0, 0, this.c.width, this.c.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        const U = this.u;
        gl.uniform2f(U.res, this.c.width, this.c.height);
        gl.uniform2f(U.C, (x + w / 2) * d, (y + h / 2) * d); gl.uniform2f(U.H, (w / 2) * d, (h / 2) * d);
        gl.uniform1f(U.rad, rad); gl.uniform1f(U.wob, (s * 70 + blob * 26) * d); gl.uniform1f(U.feather, (1 + s * 16 + blob * 6) * d);
        gl.uniform1f(U.liquid, s * .05); gl.uniform1f(U.T, (now - this.t0) / 1000); gl.uniform1f(U.ma, ma); gl.uniform1f(U.hasTex, hasTex);
        gl.uniform1f(U.alpha, fadeOut ? 1 - Math.max(0, (k - .35) / .65) : fadeIn ? Math.min(1, k / .3) : 1);
        gl.uniform3f(U.paper, paper[0], paper[1], paper[2]);
        gl.uniform1i(U.tex, 0); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.t);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (k < 1) requestAnimationFrame(step);
        else { done(); requestAnimationFrame(() => { if (!this.hold) this.clear(); }); }
      };
      requestAnimationFrame(step);
    });
  }
  clear() { const gl = this.gl; if (!gl) return; gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); this.c.classList.remove("on"); }
}
