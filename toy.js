// Squig. A live thing on the page rather than a film of one: a fat bead-worm with one eye, in real 3D. Every bead is a
// lit ball with a pattern on it that rolls as it walks; it throws shadows on the floor, humps along like an inchworm,
// and looks at whatever it's after. It follows your cursor, eats what you drop for it and grows, runs round shapes or
// along a line you draw, paints the floor with its body, and goes floppy so you can pick it up and throw it.
// Drawn with its own small WebGL renderer (spheres traced per pixel, so they're perfectly round at any size). Where a
// machine has no 3D to give, it falls back to a flat drawing of the same animal.
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const PALS = [
  ["Sunset", ["#ffc27a", "#ff7a59", "#f0468f", "#8a4de8", "#ff9a6b"]],
  ["Sherbet", ["#fff0a6", "#ffb8d2", "#c3adff", "#a6ecff", "#ffd9a8"]],
  ["Lava", ["#30103f", "#c2183f", "#ff6f0f", "#ffd447", "#7d1650"]],
  ["Liquorice", ["#141416", "#f6f4ee", "#141416", "#ff2d4a", "#f6f4ee"]],
  ["Plum", ["#2c1b4d", "#6b3fd1", "#e58bff", "#ffd7f3", "#4a2a8f"]],
].map(([n, s]) => [n, s.map(hex)]);
const PATS = ["Petals", "Marble", "Stripes", "Dots", "Harlequin", "Pearl", "Melt"];
function hue(c, deg) {
  // turn a colour round the wheel
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return c;
  const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (((h * 60 + deg) % 360) + 360) % 360;
  const C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - C / 2;
  const [R, G, B] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
  return [(R + m) * 255, (G + m) * 255, (B + m) * 255];
}
// shapes it can run round, each a closed loop in a -1..1 box
const SHAPES = [
  ["Loop", (t) => [Math.cos(t), Math.sin(t) * .9]],
  ["Eight", (t) => [Math.sin(t), Math.sin(t) * Math.cos(t) * 1.5]],
  ["Heart", (t) => [Math.pow(Math.sin(t), 3), -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 - .1]],
  ["Spiral", (t) => { const u = t / TAU, r = .22 + .78 * (1 - Math.abs(2 * u - 1)); return [Math.cos(t * 4) * r, Math.sin(t * 4) * r]; }],
  ["Knot", (t) => [Math.sin(3 * t), Math.sin(2 * t) * .9]],
];
// how fat each bead is, head to tail: a big head, a long even body, a tail that thins away
const prof = (u) => (u < .08 ? 1.3 - (u / .08) * .3 : u < .55 ? 1 + Math.sin(((u - .08) / .47) * Math.PI) * .06 : 1 - Math.pow((u - .55) / .45, 1.6) * .68);
const DEF = { len: 26, size: 1, speed: 1, wiggle: .6, gloss: .75, hue: 0 };
const SLIDERS = [["len", "Length", 6, 70, 1], ["size", "Size", .5, 1.8, .01], ["speed", "Speed", .2, 2.6, .01], ["wiggle", "Wiggle", 0, 1.6, .01], ["gloss", "Shine", 0, 1, .01], ["hue", "Hue", 0, 360, 1]];
const TOGGLES = [["legs", "Feet"], ["gravity", "Floppy"], ["disco", "Disco"], ["paint", "Paint"]];
const MODES = [["follow", "Follow"], ["wander", "Wander"], ["trace", "Trace"], ["draw", "Draw"]];

// ------------------------------------------------------------------------------------------------------------------
// the renderer: a floor, soft shadows, and balls. Each ball is one small square facing the camera; the picture of the
// sphere is worked out per pixel inside it (where the eye's ray meets it, which way the surface faces, how deep it is),
// so balls sink into each other correctly and never show a facet.
const GROUND = `
uniform vec2 uSize; uniform vec3 uFloorA, uFloorB; uniform sampler2D uTex;
vec3 ground(vec2 g){
  vec2 uv = g / uSize;
  float d = length((uv - vec2(.36, .4)) * vec2(1., .9));
  vec3 col = mix(uFloorA, uFloorB, smoothstep(.05, 1.15, d));
  vec2 in01 = step(vec2(0.), uv) * step(uv, vec2(1.));
  vec4 t = texture(uTex, uv) * in01.x * in01.y;
  return mix(col, t.rgb, t.a);
}`;
const VS_FLOOR = `#version 300 es
in vec2 aCorner; out vec2 vN; void main(){ vN = aCorner; gl_Position = vec4(aCorner, 0., 1.); }`;
const FS_FLOOR = `#version 300 es
precision highp float; in vec2 vN; out vec4 o;
uniform vec3 uCam, uF, uU; uniform float uTh, uAsp; ${GROUND}
void main(){
  vec3 d = uF + vec3(1.,0.,0.) * vN.x * uTh * uAsp + uU * vN.y * uTh;
  float t = -uCam.y / min(d.y, -1e-4); vec3 p = uCam + d * t;
  o = vec4(ground(p.xz), 1.);
}`;
const INST = `in vec2 aCorner; in vec4 aCen, aA, aB, aRot, aN1, aN2; uniform mat4 uVP; uniform vec3 uCam, uL;`;
const VS_SHADOW = `#version 300 es
${INST} out vec2 vG; out vec4 vC;
void main(){
  vec3 c = aCen.xyz; float r = aCen.w; vC = aCen;
  vec2 s = c.xz - uL.xz * (c.y / uL.y), ld = normalize(uL.xz), pd = vec2(-ld.y, ld.x);
  float soft = .4 + c.y / r * .14, R2 = max(r * (1. + soft) * 1.2, r * 1.9);
  vec2 mid = (s + c.xz) * .5; float hl = length(s - c.xz) * .5 + R2 / uL.y;
  vG = mid + ld * aCorner.x * hl + pd * aCorner.y * R2;
  gl_Position = uVP * vec4(vG.x, 0., vG.y, 1.);
}`;
const FS_SHADOW = `#version 300 es
precision highp float; in vec2 vG; in vec4 vC; out vec4 o; uniform vec3 uL, uTint; ${GROUND}
void main(){
  vec3 p = vec3(vG.x, 0., vG.y), oc = vC.xyz - p; float r = vC.w, tca = dot(oc, uL), d = sqrt(max(0., dot(oc, oc) - tca * tca));
  float soft = .4 + vC.y / r * .14;
  float sh = (1. - smoothstep(r * (1. - soft), r * (1. + soft), d)) * step(0., tca) / (1. + vC.y / r * .12);
  float ao = (1. - smoothstep(0., r * 1.75, length(vC.xz - vG))) * clamp(r / max(vC.y, .001), 0., 1.); ao *= ao;
  o = vec4(ground(vG) * mix(vec3(1.), uTint, max(sh * .62, ao * .7)), 1.);
}`;
const VS_BALL = `#version 300 es
${INST} out vec3 vW; out vec4 vC, vA, vB, vR, vN1, vN2;
void main(){
  vec3 c = aCen.xyz, toC = normalize(uCam - c), bx = normalize(cross(vec3(0., 1., 0.), toC)), by = cross(toC, bx);
  vW = c + (bx * aCorner.x + by * aCorner.y) * aCen.w * 1.4;
  vC = aCen; vA = aA; vB = aB; vR = aRot; vN1 = aN1; vN2 = aN2;
  gl_Position = uVP * vec4(vW, 1.);
}`;
const FS_BALL = `#version 300 es
precision highp float;
in vec3 vW; in vec4 vC, vA, vB, vR, vN1, vN2; out vec4 o;
uniform mat4 uVP; uniform vec3 uCam, uL, uFloorA; uniform float uGloss, uTime; uniform int uPat;
vec3 qrot(vec4 q, vec3 v){ return v + 2. * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
float occ(vec3 p, vec3 n, vec4 s){ if (s.w <= 0.) return 0.; vec3 d = s.xyz - p; float l = length(d); float h = l / s.w; return max(0., dot(n, d / l)) / (h * h); }
// the pattern each bead wears, drawn in the bead's own frame so it turns with it as it rolls
vec3 pat(vec3 d, vec3 A, vec3 B, float ph, float fres){
  vec3 hi = mix(B, vec3(1.), .5);
  if (uPat == 0) {          // petals: a flower on each flank, spinning like a wheel as it walks
    float a = atan(d.y, d.x), rr = acos(clamp(abs(d.z), 0., 1.)), pet = cos(a * 6.) * .5 + .5;
    vec3 c = mix(A, B, smoothstep(0., .07, (.66 + .5 * pet) - rr));
    c = mix(c, hi, smoothstep(0., .06, (.34 + .3 * pet) - rr));
    return mix(c, A * .3, 1. - smoothstep(.17, .21, rr));
  } else if (uPat == 1) {   // marble: two colours stirred together, with a pale vein where they meet
    vec3 q = d * 2.1 + ph; q += sin(q.yzx * 2.3 + ph) * .65; q += sin(q.zxy * 4.3) * .28;
    float k = sin(q.x * 3. + q.y * 2. + q.z) * .5 + .5;
    return mix(mix(A, B, smoothstep(.25, .75, k)), vec3(1.), (1. - smoothstep(0., .07, abs(k - .5))) * .65);
  } else if (uPat == 2) {   // candy stripes on a twist
    float s = sin(atan(d.y, d.x) * 4. + d.z * 4.5);
    return mix(A, hi, smoothstep(-.14, .14, s));
  } else if (uPat == 3) {   // dots
    vec3 a = abs(d); vec2 uv = a.x > a.y && a.x > a.z ? d.yz / a.x : a.y > a.z ? d.xz / a.y : d.xy / a.z;
    vec2 f = fract(uv * 1.5 + .5) - .5; float l = length(f);
    return mix(mix(A, hi, 1. - smoothstep(.27, .31, l)), B * .6, 1. - smoothstep(.1, .14, l));
  } else if (uPat == 4) {   // harlequin: diamonds wrapped round it
    float a = atan(d.z, d.x) / 3.14159 * 4., b = asin(clamp(d.y, -1., 1.)) / 3.14159 * 4.; vec2 g = vec2(a + b, a - b), f = abs(fract(g) - .5);
    float k = mod(floor(g.x) + floor(g.y), 2.), e = smoothstep(.0, .035, min(.5 - f.x, .5 - f.y));
    return mix(mix(A, B, .5), mix(A * .55, hi, k), e);
  } else if (uPat == 5) {   // pearl: its colour slides round the wheel as it turns away from you
    vec3 ir = .5 + .5 * cos(6.2832 * (fres * 1.3 + d.y * .25 + ph * .15 + vec3(0., .33, .67)));
    return mix(mix(A, B, d.y * .5 + .5), ir, .55);
  }
  return mix(B, A, smoothstep(-.75, .8, d.y + d.x * .4));   // melt: one colour running softly into the other
}
void main(){
  vec3 c = vC.xyz; float r = vC.w; vec3 rd = normalize(vW - uCam), oc = uCam - c;
  float b = dot(oc, rd), dp = sqrt(max(0., dot(oc, oc) - b * b)), aa = clamp((r - dp) / fwidth(dp) + .5, 0., 1.);
  if (aa <= 0.) discard;
  float t = -b - sqrt(max(0., r * r - dp * dp)); vec3 p = uCam + rd * t, n = normalize(p - c), v = -rd;
  vec4 cl = uVP * vec4(p, 1.); gl_FragDepth = cl.z / cl.w * .5 + .5;
  float kind = vA.w, fres = pow(1. - max(dot(n, v), 0.), 3.), gloss = uGloss; vec3 alb;
  if (kind < .5) alb = pat(qrot(vec4(-vR.xyz, vR.w), n), vA.rgb, vB.rgb, vB.w, fres);
  else if (kind < 1.5) {   // the eye: white, an iris turned towards what it's watching, a lid that comes down to blink
    float di = dot(n, normalize(vR.xyz));
    alb = mix(vec3(.97, .96, 1.), vB.rgb * (.45 + .75 * smoothstep(.8, 1., di)), smoothstep(.805, .82, di));
    alb = mix(alb, vec3(.02), smoothstep(.94, .952, di));
    alb = mix(alb, vA.rgb, smoothstep(-.03, .03, n.y - mix(1.25, -.5, vR.w))); gloss = 1.;
  } else alb = vA.rgb;
  // light: a warm key from up and to the left, sky from above, the floor's colour bouncing up from below
  float nl = dot(n, uL), wrap = clamp((nl + .5) / 1.5, 0., 1.);
  float ao = 1. - clamp(occ(p, n, vN1) + occ(p, n, vN2), 0., 1.) * .75;
  ao *= mix(.5, 1., smoothstep(-1., .25, n.y + (p.y / r - 1.) * .5));
  vec3 sky = mix(vec3(.55, .52, .68), vec3(1.), n.y * .5 + .5);
  vec3 col = alb * (wrap * wrap * vec3(1.08, 1.03, .96) + sky * .36 * ao + uFloorA * max(0., -n.y) * .3 * ao);
  col += alb * alb * pow(1. - abs(nl), 3.) * .22;                       // a glow through the edge of the shadow, like something soft
  vec3 h = normalize(uL + v), rf = reflect(rd, n);
  float sp = pow(max(dot(n, h), 0.), mix(14., 180., gloss)) * (.12 + gloss * 1.25);
  float box = smoothstep(.5, .72, rf.y) * (1. - smoothstep(.25, .6, abs(rf.x + .25)));   // a window, reflected
  col += vec3(sp + box * .2 * gloss) * ao + fres * mix(.05, .32, gloss) * sky;
  o = vec4(col, aa);
}`;
const m4mul = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const LIGHT = (() => { const l = [-.42, .78, .46], d = Math.hypot(...l); return l.map((x) => x / d); })();
const MAXI = 420, STRIDE = 24;

class GL {
  constructor(cv) {
    const gl = (this.gl = cv.getContext("webgl2", { antialias: true, alpha: false, depth: true, powerPreference: "high-performance" }));
    if (!gl) throw new Error("no webgl2");
    const prog = (vs, fs) => {
      const p = gl.createProgram();
      [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(([t, src]) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); gl.attachShader(p, s); });
      ["aCorner", "aCen", "aA", "aB", "aRot", "aN1", "aN2"].forEach((n, k) => gl.bindAttribLocation(p, k, n));
      gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {}; for (let k = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); k < n; k++) { const nm = gl.getActiveUniform(p, k).name; u[nm] = gl.getUniformLocation(p, nm); }
      return { p, u };
    };
    this.floor = prog(VS_FLOOR, FS_FLOOR); this.shadow = prog(VS_SHADOW, FS_SHADOW); this.ball = prog(VS_BALL, FS_BALL);
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    const q = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, q); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.data = new Float32Array(MAXI * STRIDE); this.buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.buf); gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    for (let k = 0; k < 6; k++) { gl.enableVertexAttribArray(k + 1); gl.vertexAttribPointer(k + 1, 4, gl.FLOAT, false, STRIDE * 4, k * 16); gl.vertexAttribDivisor(k + 1, 1); }
    this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([k, v]) => gl.texParameteri(gl.TEXTURE_2D, k, v));
    this.n = 0;
  }
  put(x, y, z, r, A, kind, B, bw, q, n1, n2) {
    if (this.n >= MAXI) return; const d = this.data, o = this.n++ * STRIDE;
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = r; d[o + 4] = A[0] / 255; d[o + 5] = A[1] / 255; d[o + 6] = A[2] / 255; d[o + 7] = kind;
    d[o + 8] = B[0] / 255; d[o + 9] = B[1] / 255; d[o + 10] = B[2] / 255; d[o + 11] = bw; d[o + 12] = q[0]; d[o + 13] = q[1]; d[o + 14] = q[2]; d[o + 15] = q[3];
    for (let k = 0; k < 4; k++) { d[o + 16 + k] = n1 ? n1[k] : 0; d[o + 20 + k] = n2 ? n2[k] : 0; }
  }
  paint(canvas) { const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas); }
  draw(C, W, H, night, gloss, pat, time) {
    const gl = this.gl, cv = gl.canvas, fa = night ? [.2, .2, .235] : [.985, .98, .97], fb = night ? [.03, .03, .04] : [.83, .815, .79];
    gl.viewport(0, 0, cv.width, cv.height); gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data.subarray(0, this.n * STRIDE));
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    const common = (P) => { const u = P.u; gl.useProgram(P.p); if (u.uVP) gl.uniformMatrix4fv(u.uVP, false, C.vp); if (u.uCam) gl.uniform3fv(u.uCam, C.pos); if (u.uL) gl.uniform3fv(u.uL, LIGHT); if (u.uSize) gl.uniform2f(u.uSize, W, H); if (u.uFloorA) gl.uniform3fv(u.uFloorA, fa); if (u.uFloorB) gl.uniform3fv(u.uFloorB, fb); if (u.uTex) gl.uniform1i(u.uTex, 0); return u; };
    // the floor, then every shadow pressed into it (darkest wins, so they pool rather than stack), then the balls
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.BLEND); gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    let u = common(this.floor); gl.uniform3fv(u.uF, C.f); gl.uniform3fv(u.uU, C.u); gl.uniform1f(u.uTh, C.th); gl.uniform1f(u.uAsp, C.asp);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    u = common(this.shadow); gl.uniform3fv(u.uTint, night ? [.25, .25, .3] : [.5, .44, .58]);
    gl.enable(gl.BLEND); gl.blendEquation(gl.MIN); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.n); gl.blendEquation(gl.FUNC_ADD); gl.disable(gl.BLEND);
    u = common(this.ball); gl.uniform1f(u.uGloss, gloss); gl.uniform1i(u.uPat, pat); gl.uniform1f(u.uTime, time);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.n);
    this.n = 0;
  }
}

// ------------------------------------------------------------------------------------------------------------------
export class Toy {
  constructor(stage, knobs, { sfx = () => {}, touch = false, flat = false } = {}) {
    Object.assign(this, { stage, knobs, sfx, touch });
    this.cv = stage.querySelector("canvas"); this.hint = stage.querySelector(".toy-hint");
    if (!flat) try { this.r3 = new GL(this.cv); } catch (e) { this.r3 = null; const c = document.createElement("canvas"); this.cv.replaceWith(c); this.cv = c; }
    if (!this.r3) this.g = this.cv.getContext("2d");
    this.ink = document.createElement("canvas"); this.ig = this.ink.getContext("2d"); this.mark = document.createElement("canvas"); this.mg = this.mark.getContext("2d");
    this.P = { ...DEF }; this.F = { legs: true, gravity: false, disco: false, paint: false };
    this.mode = touch ? "wander" : "follow"; this.shape = 0; this.pal = 0; this.pat = 0;
    this.m = { x: 0, y: 0, sx: 0, sy: 0, in: false }; this.snacks = []; this.bits = []; this.pulses = []; this.segs = []; this.rr = [];
    this.t = 0; this.trav = 0; this.a = Math.PI; this.s = 0; this.blinkAt = 2; this.mouth = 0; this.wide = 0; this.boost = 0; this.grab = -1; this.way = null; this.vel = 0;
    this.size(); this.spawn(); this.lut(); this.ui(); this.bind(); this.say();
    this.last = performance.now(); this.on = true; this.seen = true; requestAnimationFrame(this.frame);
  }
  destroy() { if (!this.on) return; this.on = false; this.ro?.disconnect(); this.io?.disconnect(); removeEventListener("pointerup", this.up); removeEventListener("pointercancel", this.up); this.r3?.gl.getExtension("WEBGL_lose_context")?.loseContext(); }
  // ---- setting up ----
  size() {
    const r = this.stage.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    this.sw = Math.max(200, r.width); this.sh = Math.max(200, r.height); this.dpr = dpr;
    this.cv.width = Math.round(this.sw * dpr); this.cv.height = Math.round(this.sh * dpr);
    if (this.r3) {
      // the camera looks down across the floor from the near edge. The patch of floor it can see becomes the space
      // the animal lives in: as wide as the stage along the front, and running away from you into the distance.
      const fov = 32 * Math.PI / 180, pitch = 55 * Math.PI / 180, th = Math.tan(fov / 2), asp = this.sw / this.sh;
      const f = [0, -Math.sin(pitch), -Math.cos(pitch)], u = [0, Math.cos(pitch), -Math.sin(pitch)];
      const hit = (nx, ny) => { const d = [nx * th * asp, f[1] + u[1] * ny * th, f[2] + u[2] * ny * th], t = -1 / d[1]; return [d[0] * t, d[2] * t]; };
      const nearC = hit(0, -.86), farC = hit(0, .86), s = this.sw / (2 * hit(.92, -.86)[0]);
      this.W = this.sw; this.H = (nearC[1] - farC[1]) * s;
      const pos = [this.W / 2, s, this.H - nearC[1] * s], near = s * .08, far = s * 8, fy = 1 / th;
      const V = new Float32Array([1, u[0], -f[0], 0, 0, u[1], -f[1], 0, 0, u[2], -f[2], 0, -pos[0], -(u[1] * pos[1] + u[2] * pos[2]), f[1] * pos[1] + f[2] * pos[2], 1]);
      const Pm = new Float32Array([fy / asp, 0, 0, 0, 0, fy, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0]);
      this.C = { pos, f, u, th, asp, vp: m4mul(Pm, V) };
    } else { this.W = this.sw; this.H = this.sh; }
    [this.ink, this.mark].forEach((c) => { c.width = Math.round(this.W); c.height = Math.round(this.H); });
    this.path = this.mode === "trace" ? this.shapePath() : null; this.dirty = true;
  }
  // where on the floor a point on the screen is
  floor(sx, sy) {
    if (!this.r3) return [sx, sy];
    const C = this.C, nx = (sx / this.sw) * 2 - 1, ny = 1 - (sy / this.sh) * 2, d = this.ray(nx, ny), t = -C.pos[1] / Math.min(d[1], -1e-4);
    return [C.pos[0] + d[0] * t, C.pos[2] + d[2] * t];
  }
  ray(nx, ny) { const C = this.C; return [nx * C.th * C.asp, C.f[1] + C.u[1] * ny * C.th, C.f[2] + C.u[2] * ny * C.th]; }
  // where on the screen a point in the room is, and how big a ball of radius r looks there
  screen(x, h, z, r) {
    if (!this.r3) return [x, z, r, 1];
    const m = this.C.vp, w = m[3] * x + m[7] * h + m[11] * z + m[15];
    return [((m[0] * x + m[4] * h + m[8] * z + m[12]) / w * .5 + .5) * this.sw, (1 - ((m[1] * x + m[5] * h + m[9] * z + m[13]) / w * .5 + .5)) * this.sh, (r * this.sh * .5) / (this.C.th * w), w];
  }
  get R() { return (this.r3 ? clamp(this.W * .046, 18, 54) : clamp(Math.min(this.W, this.H) * .05, 13, 32)) * this.P.size; }
  rad(i) { return this.R * prof(i / Math.max(1, this.segs.length - 1)); }
  gap(i) { return (this.rad(i) + this.rad(i - 1)) * .6; }
  bead(x, y, h = 0) { return { x, y, h, px: x, py: y, ph: h }; }
  spawn() { this.segs = Array.from({ length: Math.round(this.P.len) }, (_, i) => this.bead(this.W * .5 + i * 12, this.H * .55, this.R)); }
  setLen(n) {
    n = Math.round(n);
    while (this.segs.length > n) this.segs.pop();
    while (this.segs.length < n) { const q = this.segs[this.segs.length - 1]; this.segs.push(this.bead(q.x, q.y, q.h)); }
  }
  // the colours along its body, worked out once whenever the palette or the hue changes
  lut() {
    const st = PALS[this.pal][1], n = st.length;
    this.col = Array.from({ length: 96 }, (_, k) => { const u = (k / 96) * n, i = Math.floor(u), c = hue(mix(st[i % n], st[(i + 1) % n], u - i), this.P.hue); return { c, base: css(c), light: css(mix(c, [255, 255, 255], .62)), dark: css(mix(c, [26, 8, 44], .5)), dk: mix(c, [26, 8, 44], .5) }; });
  }
  shapePath() {
    const f = SHAPES[this.shape][1], sx = Math.min(this.W * .4, this.H * .66), sy = this.H * .36, pts = [];
    for (let k = 0; k <= 360; k++) { const [x, y] = f((k / 360) * TAU); pts.push([this.W / 2 + x * sx, this.H / 2 + y * sy]); }
    this.dirty = true; return this.measure(pts, true);
  }
  measure(pts, closed) { let L = 0; const d = [0]; for (let k = 1; k < pts.length; k++) d.push((L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]))); return { pts, d, L, closed, dir: 1 }; }
  at(p, s) {
    s = p.closed ? ((s % p.L) + p.L) % p.L : clamp(s, 0, p.L);
    let lo = 0, hi = p.d.length - 1; while (hi - lo > 1) { const md = (lo + hi) >> 1; if (p.d[md] <= s) lo = md; else hi = md; }
    const k = (s - p.d[lo]) / (p.d[hi] - p.d[lo] || 1); return [p.pts[lo][0] + (p.pts[hi][0] - p.pts[lo][0]) * k, p.pts[lo][1] + (p.pts[hi][1] - p.pts[lo][1]) * k];
  }
  wipe() { this.ig.clearRect(0, 0, this.ink.width, this.ink.height); this.dirty = true; }
  // ---- the controls ----
  ui() {
    const k = this.knobs;
    k.innerHTML = `<div class="tk-seg">${MODES.map(([v, n]) => `<button type="button" data-mode="${v}">${n}</button>`).join("")}</div>
      <button type="button" class="tk-b" data-act="shape" hidden></button>
      ${SLIDERS.map(([p, n, a, b, s]) => `<label class="tk-s"><span>${n}</span><input type="range" data-p="${p}" min="${a}" max="${b}" step="${s}" aria-label="${n}"><em></em></label>`).join("")}
      <div class="tk-row"><button type="button" class="tk-b" data-act="pat"${this.r3 ? "" : " hidden"}></button><button type="button" class="tk-b" data-act="pal"></button></div>
      <div class="tk-row">${TOGGLES.map(([f, n]) => `<button type="button" class="tk-b" data-flag="${f}">${n}</button>`).join("")}</div>
      <div class="tk-row"><button type="button" class="tk-b" data-act="feed">Feed</button><button type="button" class="tk-b" data-act="shuffle">Shuffle</button><button type="button" class="tk-b" data-act="wipe">Wipe</button><button type="button" class="tk-b" data-act="reset">Reset</button></div>`;
    k.addEventListener("input", (e) => { const p = e.target.dataset.p; if (!p) return; this.P[p] = +e.target.value; if (p === "len") this.setLen(this.P.len); if (p === "hue") this.lut(); this.sync(); });
    k.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return; const a = b.dataset.act;
      if (b.dataset.mode) this.setMode(b.dataset.mode);
      else if (b.dataset.flag) this.flag(b.dataset.flag, !this.F[b.dataset.flag]);
      else if (a === "shape") { this.shape = (this.shape + 1) % SHAPES.length; this.path = this.shapePath(); }
      else if (a === "pal") { this.pal = (this.pal + 1) % PALS.length; this.lut(); }
      else if (a === "pat") this.pat = (this.pat + 1) % PATS.length;
      else if (a === "feed") for (let n = 0; n < 5; n++) this.snack(rnd(60, this.W - 60), rnd(60, this.H - 60));
      else if (a === "wipe") this.wipe();
      else if (a === "shuffle") this.shuffle();
      else if (a === "reset") this.reset();
      this.sync(); this.say();
    });
    this.sync();
  }
  sync() {
    const k = this.knobs, fmt = { len: (v) => v | 0, hue: (v) => `${v | 0}°` };
    k.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.mode === this.mode));
    k.querySelectorAll("[data-flag]").forEach((b) => b.setAttribute("aria-pressed", !!this.F[b.dataset.flag]));
    k.querySelectorAll("[data-p]").forEach((i) => { const p = i.dataset.p, v = this.P[p]; if (+i.value !== v) i.value = v; i.style.setProperty("--v", ((v - i.min) / (i.max - i.min)) * 100 + "%"); i.nextElementSibling.textContent = (fmt[p] || ((x) => x.toFixed(2)))(v); });
    const sh = k.querySelector('[data-act="shape"]'); sh.hidden = this.mode !== "trace"; sh.textContent = `Shape · ${SHAPES[this.shape][0]}`;
    k.querySelector('[data-act="pal"]').textContent = `Colour · ${PALS[this.pal][0]}`; k.querySelector('[data-act="pat"]').textContent = `Pattern · ${PATS[this.pat]}`;
    this.stage.classList.toggle("grabby", this.mode === "draw" || this.F.gravity);
  }
  say() {
    const t = this.F.gravity ? "Pick it up and throw it" : this.mode === "draw" ? (this.path ? "Draw another line whenever you like" : "Draw a line on the floor for it to run along") : this.mode === "trace" ? "Click it to poke it" : this.touch ? "Tap to feed it · tap it to poke it" : this.mode === "follow" ? "It follows your cursor · click to feed it · click it to poke it" : "Click to feed it · click it to poke it";
    if (this.hint) this.hint.textContent = t;
  }
  setMode(m) { this.mode = m; this.path = m === "trace" ? this.shapePath() : null; this.s = 0; this.snacks = m === "trace" || m === "draw" ? [] : this.snacks; this.drawing = null; this.dirty = true; }
  flag(f, on) {
    this.F[f] = on;
    if (f === "gravity") { this.segs.forEach((q) => { q.px = q.x; q.py = q.y; q.ph = q.h; }); this.grab = -1; if (on) this.snacks = []; else this.a = Math.atan2(this.segs[0].y - this.segs[1].y, this.segs[0].x - this.segs[1].x); }
  }
  shuffle() {
    SLIDERS.forEach(([p, , a, b]) => (this.P[p] = p === "len" ? Math.round(rnd(10, 54)) : p === "size" ? rnd(.6, 1.5) : p === "speed" ? rnd(.6, 2) : p === "gloss" ? rnd(.3, 1) : rnd(a, b)));
    this.pal = Math.floor(Math.random() * PALS.length); this.pat = Math.floor(Math.random() * PATS.length); this.F.legs = Math.random() < .7; this.F.disco = Math.random() < .3;
    this.setLen(this.P.len); this.lut(); this.pulses.push({ i: 0, t: 0, d: 1 }); this.sfx("boing", .5, 1);
  }
  reset() { this.P = { ...DEF }; this.F = { legs: true, gravity: false, disco: false, paint: false }; this.pal = 0; this.pat = 0; this.shape = 0; this.snacks = []; this.wipe(); this.setMode(this.touch ? "wander" : "follow"); this.spawn(); this.lut(); }
  // ---- hands on ----
  bind() {
    const st = this.stage, pos = (e) => { const r = st.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, g = this.floor(sx, sy); this.m.sx = sx; this.m.sy = sy; this.m.x = g[0]; this.m.y = g[1]; return g; };
    // which bead is under a point on the screen: the nearest one to you that the point is inside
    const hit = () => { let best = -1, bw = 1e9; this.segs.forEach((q, i) => { const s = this.screen(q.x, q.h, q.y, this.rr[i] || this.rad(i)); if (Math.hypot(s[0] - this.m.sx, s[1] - this.m.sy) < s[2] + 5 && s[3] < bw) { bw = s[3]; best = i; } }); return best; };
    st.addEventListener("pointermove", (e) => {
      const [x, y] = pos(e); this.m.in = e.pointerType !== "touch" || this.down;
      if (this.drawing) { const l = this.drawing[this.drawing.length - 1]; if (Math.hypot(x - l[0], y - l[1]) > 8) { this.drawing.push([clamp(x, 10, this.W - 10), clamp(y, 10, this.H - 10)]); this.dirty = true; } }
    });
    st.addEventListener("pointerleave", () => { if (!this.down) this.m.in = false; });
    st.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      const [x, y] = pos(e); this.down = true; this.moved = false; this.dx = this.m.sx; this.dy = this.m.sy;
      if (this.F.gravity) {
        const i = hit(); if (i < 0) return;
        const q = this.segs[i]; this.grab = i; this.wide = 1; this.sfx("squeak", this.m.sx / this.sw); st.setPointerCapture?.(e.pointerId);
        // remember how far away it was, so it stays at that distance from you while you carry it
        if (this.r3) { const C = this.C; this.gd = (q.x - C.pos[0]) * C.f[0] + (q.h - C.pos[1]) * C.f[1] + (q.y - C.pos[2]) * C.f[2]; }
      } else if (this.mode === "draw") { this.drawing = [[x, y]]; st.setPointerCapture?.(e.pointerId); }
    });
    this.up = () => {
      if (!this.down) return; this.down = false;
      if (this.grab >= 0) { this.grab = -1; this.moved = true; }
      if (this.drawing) { const d = this.drawing; this.drawing = null; this.dirty = true; if (d.length > 6) { const a = d[0], b = d[d.length - 1], closed = Math.hypot(a[0] - b[0], a[1] - b[1]) < 60; if (closed) d.push(a); this.path = this.measure(d, closed); this.s = 0; this.moved = true; this.say(); } }
      if (this.touch) this.m.in = false;
    };
    addEventListener("pointerup", this.up); addEventListener("pointercancel", this.up);
    st.addEventListener("click", (e) => {
      const [x, y] = pos(e); if (this.moved || Math.hypot(this.m.sx - this.dx, this.m.sy - this.dy) > 8) { this.moved = false; return; }
      const i = hit();
      if (i >= 0) { this.pulses.push({ i, t: 0, d: 0 }); this.wide = 1; this.boost = 1; if (this.F.gravity) this.segs[i].ph -= this.R * .5; this.sfx("boing", this.m.sx / this.sw, 1 - i / this.segs.length); }
      else if (this.F.gravity) { this.segs.forEach((q) => { const dx = q.x - x, dy = q.y - y, d = Math.hypot(dx, dy) || 1, k = Math.max(0, 1 - d / (this.R * 9)) * this.R * .9; q.px -= (dx / d) * k * .5; q.py -= (dy / d) * k * .5; q.ph -= k; }); this.sfx("plop", this.m.sx / this.sw); }
      else if (this.mode === "follow" || this.mode === "wander") this.snack(clamp(x, 20, this.W - 20), clamp(y, 20, this.H - 20));
    });
    this.ro = new ResizeObserver(() => { const w = this.W, h = this.H; this.size(); if (Math.abs(w - this.W) > 2 || Math.abs(h - this.H) > 2) this.segs.forEach((q) => { q.x *= this.W / w; q.y *= this.H / h; q.px = q.x; q.py = q.y; }); }); this.ro.observe(st);
    this.io = new IntersectionObserver((es) => { this.seen = es[0].isIntersecting; }); this.io.observe(st);
  }
  snack(x, y) { if (this.snacks.length >= 14) this.snacks.shift(); this.snacks.push({ x, y, t: 0, k: Math.floor(Math.random() * 96) }); this.sfx("plop", x / this.W); }
  // ---- every frame ----
  frame = (now) => {
    if (!this.on || !this.cv.isConnected) { this.destroy(); return; }
    requestAnimationFrame(this.frame);
    const dt = clamp((now - this.last) / 1000, 0, .033); this.last = now;   // (a first frame can be stamped earlier than the moment it was asked for)
    if (!this.seen || document.hidden) return;
    this.t += dt;
    if (this.F.gravity) this.flop(dt); else this.crawl(dt);
    // sizes this frame: a poke or a swallow runs down the body as a bulge, disco makes it throb
    this.pulses = this.pulses.filter((p) => (p.t += dt) < 2.4);
    this.rr = this.segs.map((q, i) => { let s = 1; this.pulses.forEach((p) => { const c = p.t * 26, e = Math.exp(-p.t * 1.3) * .42; s += e * Math.exp(-Math.pow(i - (p.i + c), 2) / 3.2) + (p.d ? 0 : e * Math.exp(-Math.pow(i - (p.i - c), 2) / 3.2)); }); if (this.F.disco) s += Math.sin(this.t * 9 - i * .55) * .11; return this.rad(i) * s; });
    this.wide = Math.max(0, this.wide - dt * 1.6); this.mouth = Math.max(0, this.mouth - dt * 2.4); this.munch = Math.max(0, (this.munch || 0) - dt);
    if (this.t > this.blinkAt) this.blinkAt = this.t + rnd(2.2, 6);
    this.blink = this.wide > .1 ? 0 : Math.max(0, 1 - Math.abs(this.blinkAt - this.t - .09) / .09);
    this.bits = this.bits.filter((b) => { b.t += dt; if (b.t > .7) return false; b.vh -= 1500 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.h = Math.max(3, b.h + b.vh * dt); return true; });
    this.night = document.documentElement.classList.contains("night");
    if (this.r3) this.draw3(dt); else this.draw2(dt);
  };
  crawl(dt) {
    const S = this.segs, h = S[0], P = this.P, R = this.R, v0 = (this.r3 ? 330 : 250) * P.speed * (1 + this.boost * 1.2), r0 = this.rad(0);
    this.boost = Math.max(0, this.boost - dt * 1.4);
    const ox = h.x, oy = h.y;
    if (this.path && (this.mode === "trace" || this.mode === "draw")) {
      // on a line: it runs along it, there and back if the line has ends, round and round if it's a loop
      const p = this.path; this.s += v0 * dt * p.dir;
      if (!p.closed) { if (this.s > p.L) { this.s = p.L; p.dir = -1; } else if (this.s < 0) { this.s = 0; p.dir = 1; } }
      const q = this.at(p, this.s), q2 = this.at(p, this.s + 3 * p.dir), tx = q2[0] - q[0], ty = q2[1] - q[1], tl = Math.hypot(tx, ty) || 1;
      const wob = Math.sin(this.t * 7 * (.5 + P.speed * .5)) * P.wiggle * R * .7, gx = q[0] - (ty / tl) * wob, gy = q[1] + (tx / tl) * wob, k = Math.min(1, dt * 9);
      h.x += (gx - h.x) * k; h.y += (gy - h.y) * k;
      this.look = { x: q[0] + (tx / tl) * 140, y: q[1] + (ty / tl) * 140 };
    } else {
      // loose: after the nearest snack if there is one, else your cursor, else wherever it fancies
      let T = null, arrive = false, bd = 1e9;
      this.snacks.forEach((f) => { const d = Math.hypot(f.x - h.x, f.y - h.y); if (d < bd) { bd = d; T = f; } });
      if (!T && this.mode === "follow" && this.m.in) { T = this.m; arrive = true; }
      if (!T) {
        if (!this.way || Math.hypot(this.way.x - h.x, this.way.y - h.y) < 50 || this.t > this.wayAt) { this.way = { x: rnd(70, this.W - 70), y: rnd(70, this.H - 70) }; this.wayAt = this.t + rnd(2.5, 5); }
        T = this.way;
      }
      this.look = T;
      const dx = T.x - h.x, dy = T.y - h.y, d = Math.hypot(dx, dy) || 1;
      let da = Math.atan2(dy, dx) - this.a; da = Math.atan2(Math.sin(da), Math.cos(da));
      const turn = 4.4 * (.6 + P.speed * .5) * dt; this.a += clamp(da, -turn, turn);
      const sp = v0 * (arrive ? clamp((d - r0 * 1.6) / 90, 0, 1) : 1), go = sp / (v0 || 1);
      const hd = this.a + Math.sin(this.t * 6.5 * (.5 + P.speed * .5)) * P.wiggle * .6 * go;
      h.x += Math.cos(hd) * sp * dt; h.y += Math.sin(hd) * sp * dt;
      h.x = clamp(h.x, r0, this.W - r0); h.y = clamp(h.y, r0, this.H - r0);
    }
    const moved = Math.hypot(h.x - ox, h.y - oy); this.trav += moved; this.vel += (moved / Math.max(dt, .001) - this.vel) * Math.min(1, dt * 8);
    // each bead is pulled along by the one in front, at arm's length
    for (let i = 1; i < S.length; i++) { const a = S[i - 1], b = S[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, g = this.gap(i); b.x = a.x + (dx / d) * g; b.y = a.y + (dy / d) * g; }
    // and up and down: it humps along like an inchworm, a wave running back from its head, bigger the faster it goes
    const go = clamp(this.vel / 160, 0, 1), k = Math.min(1, dt * 14);
    S.forEach((q, i) => {
      const r = this.rr[i] || this.rad(i), base = this.rad(i);
      let want = r + Math.max(0, Math.sin(this.trav / (R * 2.4) - i * .55)) * R * .55 * P.wiggle * go * (i ? 1 : .35) + (r - base) * 2.2;
      if (this.F.disco) want += Math.max(0, Math.sin(this.t * 9 - i * .55)) * R * .45;
      q.h += (want - q.h) * k; q.px = q.x; q.py = q.y; q.ph = q.h;
    });
    // eating
    this.snacks = this.snacks.filter((f) => {
      f.t += dt; const d = Math.hypot(f.x - h.x, f.y - h.y);
      if (d < R * 4.5) this.mouth = Math.max(this.mouth, 1 - d / (R * 4.5));
      if (d > r0 + 4) return true;
      if (S.length < 70) { const q = S[S.length - 1]; S.push(this.bead(q.x, q.y, q.h)); this.P.len = S.length; this.sync(); }
      this.pulses.push({ i: 0, t: 0, d: 1 }); this.munch = .5;
      for (let n = 0; n < 8; n++) this.bits.push({ x: f.x, y: f.y, h: R * .5, vx: rnd(-150, 150), vy: rnd(-150, 150), vh: rnd(250, 620), t: 0, k: f.k });
      this.sfx("munch", h.x / this.W); return false;
    });
    if (this.F.paint && moved > .2) {
      const g = this.ig, c = this.col[Math.floor((((-this.t * this.flow()) % 1) + 1) * 96) % 96];
      g.strokeStyle = c.base; g.lineWidth = r0 * 1.5; g.lineCap = "round"; g.beginPath(); g.moveTo(ox, oy); g.lineTo(h.x, h.y); g.stroke(); this.dirty = true;
    }
  }
  // floppy: every bead falls, the string between them holds, and they pile up on the floor. In the round.
  flop(dt) {
    const S = this.segs, W = this.W, H = this.H, G = 2600 * dt * dt, flat = !this.r3;
    let gx = this.m.x, gy = this.m.y, gh = this.R;
    if (this.grab >= 0 && !flat) { const C = this.C, d = this.ray((this.m.sx / this.sw) * 2 - 1, 1 - (this.m.sy / this.sh) * 2), t = this.gd / (d[0] * C.f[0] + d[1] * C.f[1] + d[2] * C.f[2]); gx = C.pos[0] + d[0] * t; gh = Math.max(this.rad(this.grab), C.pos[1] + d[1] * t); gy = C.pos[2] + d[2] * t; }
    S.forEach((q, i) => {
      if (i === this.grab) { q.px = q.x; q.py = q.y; q.ph = q.h; q.x += (gx - q.x) * .6; q.y += (gy - q.y) * .6; if (!flat) q.h += (gh - q.h) * .6; return; }
      const vx = (q.x - q.px) * .993, vy = (q.y - q.py) * .993, vh = (q.h - q.ph) * .993; q.px = q.x; q.py = q.y; q.ph = q.h; q.x += vx; q.y += vy + (flat ? G : 0); q.h += flat ? 0 : vh - G;
    });
    for (let it = 0; it < 5; it++) {
      for (let i = 1; i < S.length; i++) { const a = S[i - 1], b = S[i], dx = b.x - a.x, dy = b.y - a.y, dh = b.h - a.h, d = Math.hypot(dx, dy, dh) || 1, k = (d - this.gap(i)) / d * .5, fa = i - 1 === this.grab ? 0 : i === this.grab ? 2 : 1, fb = 2 - fa; a.x += dx * k * fa; a.y += dy * k * fa; a.h += dh * k * fa; b.x -= dx * k * fb; b.y -= dy * k * fb; b.h -= dh * k * fb; }
      for (let i = 0; i < S.length; i++) for (let j = i + 2; j < S.length; j++) { const a = S[i], b = S[j], dx = b.x - a.x, dy = b.y - a.y, dh = b.h - a.h, d = Math.hypot(dx, dy, dh) || .01, m = (this.rad(i) + this.rad(j)) * .86; if (d < m) { const k = (m - d) / d * .5; if (i !== this.grab) { a.x -= dx * k; a.y -= dy * k; a.h -= dh * k; } if (j !== this.grab) { b.x += dx * k; b.y += dy * k; b.h += dh * k; } } }
      S.forEach((q, i) => {
        const r = this.rad(i);
        if (flat) { q.h = r; if (q.y > H - r) { q.y = H - r; q.px = q.x - (q.x - q.px) * .8; } if (q.y < r) q.y = r; }
        else { if (q.h < r) { q.h = r; q.ph = r; q.px = q.x - (q.x - q.px) * .9; q.py = q.y - (q.y - q.py) * .9; } q.y = clamp(q.y, r, H - r); }
        if (q.x < r) { q.x = r; q.px = q.x + (q.x - q.px) * .4; } if (q.x > W - r) { q.x = W - r; q.px = q.x + (q.x - q.px) * .4; }
      });
    }
    this.look = this.m; this.vel = 0;
  }
  flow() { return this.F.disco ? .9 : .13; }
  ci(i) { return Math.floor(((((i * .043 - this.t * this.flow()) % 1) + 1) % 1) * 96); }
  // ---- drawn in the round ----
  draw3() {
    const r3 = this.r3, S = this.segs, n = S.length, t = this.t, R = this.R, col = this.col, rr = this.rr, Z = [0, 0, 0, 1];
    if (this.dirty) {
      // what's on the floor: its paint, and the line it's running along
      const g = this.mg; g.clearRect(0, 0, this.mark.width, this.mark.height); g.drawImage(this.ink, 0, 0);
      const guide = this.drawing ? { pts: this.drawing } : this.path;
      if (guide && guide.pts.length > 1) { g.strokeStyle = this.night ? "#fff" : "#0d0d0e"; g.globalAlpha = this.mode === "draw" ? .5 : .2; g.lineWidth = 2.5; g.lineCap = "round"; g.setLineDash([3, 13]); g.beginPath(); guide.pts.forEach((q, k) => (k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
      r3.paint(this.mark); this.dirty = false;
    }
    const sph = (q, i) => [q.x, q.h, q.y, rr[i]];
    for (let i = n - 1; i >= 0; i--) {
      const q = S[i], a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)], r = rr[i];
      // which way this bead is facing, and how far it has rolled
      let ux = a.x - b.x, uy = a.y - b.y; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
      const yaw = Math.atan2(-uy, ux), roll = i ? -this.trav / (this.rad(i) * 2.2) : 0;
      const quat = qmul([0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)], [0, 0, Math.sin(roll / 2), Math.cos(roll / 2)]);
      const k = this.ci(i), c = col[k];
      r3.put(q.x, q.h, q.y, r, c.c, 0, col[(k + 34) % 96].c, i * .37, quat, i ? sph(a, i - 1) : null, i < n - 1 ? sph(b, i + 1) : null);
      // feet: a pair of little balls under each bead, stepping in turn
      if (this.F.legs && !this.F.gravity && i > 0 && i < n - 2 && r > 6) {
        const ph = this.trav / (r * 1.5) + i * 1.25, fr = r * .23;
        for (const s of [-1, 1]) { const sw = Math.sin(ph + (s > 0 ? 0 : Math.PI)), lift = Math.max(0, Math.cos(ph + (s > 0 ? 0 : Math.PI))) * clamp(this.vel / 80, 0, 1); r3.put(q.x - uy * s * r * .8 + ux * sw * r * .5, fr + lift * r * .42 + Math.max(0, q.h - r) * .5, q.y + ux * s * r * .8 + uy * sw * r * .5, fr, col[(k + 34) % 96].c, 2, c.c, 0, Z, sph(q, i), null); }
      }
    }
    // its tail: a little string of beads curling up off the end, a bright one on the tip
    if (n > 2) {
      const a = S[n - 2], b = S[n - 1]; let ux = b.x - a.x, uy = b.y - a.y; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
      for (let k = 1; k <= 5; k++) { const w = Math.sin(t * 5 + k * .9) * R * .08 * k, d = rr[n - 1] * .7 + k * R * .2, tip = k === 5; r3.put(b.x + ux * d - uy * w, b.h + k * k * R * .035 + R * .05, b.y + uy * d + ux * w, R * (tip ? .2 : .085), tip ? col[(this.ci(n) + 48) % 96].c : col[this.ci(n - 1)].dk, 2, [0, 0, 0], 0, Z, null, null); }
    }
    // its face: one eye set into the top of its head, turned towards whatever it's after; a mouth that opens for food
    const h = S[0], r = rr[0], hq = S[1] || h; let fx = h.x - hq.x, fy = h.y - hq.y; const fl = Math.hypot(fx, fy) || 1; fx /= fl; fy /= fl;
    const L = this.look || this.m, lx = L.x - h.x, ly = L.y - h.y, ld = Math.hypot(lx, ly) || 1, far = Math.min(1, ld / (R * 3)), C = this.C;
    let cx = C.pos[0] - h.x, cz = C.pos[2] - h.y; const cl = Math.hypot(cx, cz) || 1; cx /= cl; cz /= cl;
    const ex = h.x + (fx * .3 + cx * .26) * r, eh = h.h + r * .7, ey = h.y + (fy * .3 + cz * .26) * r, er = r * (.56 + this.wide * .09);
    const ix = cx * .55 + (lx / ld) * .5 * far, iy = .8, iz = cz * .55 + (ly / ld) * .5 * far;
    const hc = col[this.ci(0)];
    r3.put(ex, eh, ey, er, hc.c, 1, col[(this.ci(0) + 48) % 96].dk, 0, [ix, iy, iz, this.blink], sph(h, 0), null);
    const mo = Math.max(this.mouth, this.munch > 0 ? Math.abs(Math.sin(this.munch * 22)) : 0, this.wide * .8);
    r3.put(h.x + fx * r * .9, h.h + r * .08, h.y + fy * r * .9, r * (.11 + mo * .2), [58, 14, 30], 2, [0, 0, 0], 0, Z, null, null);
    this.snacks.forEach((f) => r3.put(f.x, R * .3 + Math.abs(Math.sin(t * 4 + f.k)) * R * .25, f.y, R * .3 * Math.min(1, f.t * 6), col[f.k].c, 2, [0, 0, 0], 0, Z, null, null));
    this.bits.forEach((b) => r3.put(b.x, b.h, b.y, R * .09 * (1 - b.t / .7) + 1, col[b.k].c, 2, [0, 0, 0], 0, Z, null, null));
    r3.draw(this.C, this.W, this.H, this.night, this.P.gloss, this.pat, t);
  }
  // ---- drawn flat, for a machine with no 3D to give ----
  draw2() {
    const g = this.g, S = this.segs, n = S.length, t = this.t, P = this.P, W = this.W, H = this.H, dpr = this.dpr, rr = this.rr, ink = this.night ? "#fff" : "#0d0d0e";
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); g.lineCap = "round"; g.lineJoin = "round";
    g.drawImage(this.ink, 0, 0, W, H);
    const guide = this.drawing ? { pts: this.drawing } : this.path;
    if (guide && guide.pts.length > 1) { g.strokeStyle = ink; g.globalAlpha = this.mode === "draw" ? .45 : .16; g.lineWidth = 1.2; g.setLineDash([2, 7]); g.beginPath(); guide.pts.forEach((q, k) => (k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
    g.fillStyle = this.night ? "rgba(0,0,0,.5)" : "rgba(40,20,70,.13)"; g.beginPath();
    for (let i = 0; i < n; i++) { const q = S[i], r = rr[i]; g.moveTo(q.x + r * .3 + r * 1.02, q.y + r * .62); g.ellipse(q.x + r * .3, q.y + r * .62, r * 1.02, r * .82, 0, 0, TAU); }
    g.fill();
    const gl = P.gloss, ball = (x, y, r, c) => {
      const gr = g.createRadialGradient(x - r * .32, y - r * .38, r * .06, x, y, r * 1.02);
      gr.addColorStop(0, c.light); gr.addColorStop(.42 - gl * .12, c.base); gr.addColorStop(1, c.dark);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      if (gl > .02 && r > 3) { g.fillStyle = `rgba(255,255,255,${(gl * .8).toFixed(2)})`; g.beginPath(); g.ellipse(x - r * .34, y - r * .42, r * (.16 + gl * .14), r * (.1 + gl * .08), -.6, 0, TAU); g.fill(); }
    };
    for (let i = n - 1; i >= 0; i--) ball(S[i].x, S[i].y, rr[i], this.col[this.ci(i)]);
    this.snacks.forEach((f) => ball(f.x, f.y, 7 * Math.min(1, f.t * 6), this.col[f.k]));
    const h = S[0], r = rr[0], L = this.look || this.m, lx = L.x - h.x, ly = L.y - h.y, ld = Math.hypot(lx, ly) || 1, far = Math.min(1, ld / 80), er = r * (.5 + this.wide * .1), ex = h.x, ey = h.y - r * .1;
    g.fillStyle = "#fff"; g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fill();
    const ix = ex + (lx / ld) * er * .34 * far, iy = ey + (ly / ld) * er * .34 * far;
    g.save(); g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.clip();
    g.fillStyle = this.col[(this.ci(0) + 48) % 96].dark; g.beginPath(); g.arc(ix, iy, er * .58, 0, TAU); g.fill();
    g.fillStyle = "#0b0b0d"; g.beginPath(); g.arc(ix, iy, er * .3, 0, TAU); g.fill();
    if (this.blink > 0) { g.fillStyle = this.col[this.ci(0)].base; g.fillRect(ex - er, ey - er, er * 2, er * 2 * this.blink); }
    g.restore();
    const mo = Math.max(this.mouth, this.munch > 0 ? Math.abs(Math.sin(this.munch * 22)) : 0, this.wide * .8);
    g.fillStyle = "#35101f"; g.beginPath(); g.ellipse(h.x, h.y + r * .62, r * (.1 + mo * .14), r * (.035 + mo * .17), 0, 0, TAU); g.fill();
    this.bits.forEach((b) => { g.globalAlpha = 1 - b.t / .7; g.fillStyle = this.col[b.k].base; g.beginPath(); g.arc(b.x, b.y - b.h * .4, 2.4, 0, TAU); g.fill(); g.globalAlpha = 1; });
  }
}
