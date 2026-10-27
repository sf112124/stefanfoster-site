// A small real-time fluid: velocity is advected, swirled (vorticity confinement), made divergence-free with a pressure
// solve, and carries dye through it. Same family of solver as Jos Stam's "stable fluids". It shares the index's WebGL2
// context and draws into its own textures; the index shader reads the dye as its background.
const VS = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
const H = `#version 300 es
precision highp float; precision highp sampler2D; in vec2 uv; out vec4 o; uniform vec2 tx;
`;
const FS = {
  advect: H + `uniform sampler2D V, X; uniform float dt, dis;
    void main(){ vec2 c = uv - dt * texture(V, uv).xy * tx; o = texture(X, c) / (1. + dis * dt); }`,
  splat: H + `uniform sampler2D X; uniform vec2 pt; uniform vec4 col; uniform float r, asp;
    void main(){ vec2 d = uv - pt; d.x *= asp; float s = exp(-dot(d, d) / r); o = texture(X, uv) + col * s; }`,
  curl: H + `uniform sampler2D V;
    void main(){ float L = texture(V, uv - vec2(tx.x, 0)).y, R = texture(V, uv + vec2(tx.x, 0)).y, T = texture(V, uv + vec2(0, tx.y)).x, B = texture(V, uv - vec2(0, tx.y)).x; o = vec4(.5 * (R - L - T + B), 0, 0, 1); }`,
  vort: H + `uniform sampler2D V, C; uniform float k, dt;
    void main(){ float L = texture(C, uv - vec2(tx.x, 0)).x, R = texture(C, uv + vec2(tx.x, 0)).x, T = texture(C, uv + vec2(0, tx.y)).x, B = texture(C, uv - vec2(0, tx.y)).x, c = texture(C, uv).x;
      vec2 f = .5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); f /= length(f) + 1e-4; f *= k * c; f.y *= -1.;
      vec2 v = texture(V, uv).xy + f * dt; o = vec4(clamp(v, -1000., 1000.), 0, 1); }`,
  div: H + `uniform sampler2D V;
    void main(){ vec2 c = texture(V, uv).xy; float L = texture(V, uv - vec2(tx.x, 0)).x, R = texture(V, uv + vec2(tx.x, 0)).x, T = texture(V, uv + vec2(0, tx.y)).y, B = texture(V, uv - vec2(0, tx.y)).y;
      if (uv.x - tx.x < 0.) L = -c.x; if (uv.x + tx.x > 1.) R = -c.x; if (uv.y + tx.y > 1.) T = -c.y; if (uv.y - tx.y < 0.) B = -c.y; o = vec4(.5 * (R - L + T - B), 0, 0, 1); }`,
  fade: H + `uniform sampler2D X; uniform float k; void main(){ o = texture(X, uv) * k; }`,
  press: H + `uniform sampler2D P, D;
    void main(){ float L = texture(P, uv - vec2(tx.x, 0)).x, R = texture(P, uv + vec2(tx.x, 0)).x, T = texture(P, uv + vec2(0, tx.y)).x, B = texture(P, uv - vec2(0, tx.y)).x; o = vec4((L + R + B + T - texture(D, uv).x) * .25, 0, 0, 1); }`,
  grad: H + `uniform sampler2D P, V;
    void main(){ float L = texture(P, uv - vec2(tx.x, 0)).x, R = texture(P, uv + vec2(tx.x, 0)).x, T = texture(P, uv + vec2(0, tx.y)).x, B = texture(P, uv - vec2(0, tx.y)).x; o = vec4(texture(V, uv).xy - vec2(R - L, T - B), 0, 1); }`,
};

export function makeFluid(gl, buf, opt = {}) {
  if (!gl.getExtension("EXT_color_buffer_float") && !gl.getExtension("EXT_color_buffer_half_float")) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(o)); return o; };
  const vs = sh(gl.VERTEX_SHADER, VS), P = {};
  for (const k in FS) {
    const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS[k])); gl.bindAttribLocation(pr, 0, "p"); gl.linkProgram(pr);
    const u = {}, n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(pr, i); u[a.name] = gl.getUniformLocation(pr, a.name); }
    P[k] = { pr, u };
  }
  const tgt = (w, h) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindTexture(gl.TEXTURE_2D, null); return { t, f, w, h };
  };
  const dbl = (w, h) => { let a = tgt(w, h), b = tgt(w, h); return { get r() { return a; }, get w() { return b; }, swap() { [a, b] = [b, a]; }, W: w, H: h }; };
  let S = null;
  const size = (aspect) => {
    const sh2 = opt.sim || 160, dh = opt.dye || 540, sw = Math.round(sh2 * aspect), dw = Math.round(dh * aspect);
    if (S && S.sw === sw && S.dw === dw) return;
    S = { sw, dw, vel: dbl(sw, sh2), dye: dbl(dw, dh), prs: dbl(sw, sh2), div: tgt(sw, sh2), curl: tgt(sw, sh2) };
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };
  const run = (k, out, set) => {
    const p = P[k]; gl.useProgram(p.pr); let unit = 0;
    for (let i = 0; i < 4; i++) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, null); }   // nothing stale left bound to the target
    for (const [n, v] of Object.entries(set)) {
      const l = p.u[n]; if (l == null) continue;
      if (v && v.t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v.t); gl.uniform1i(l, unit++); }
      else if (Array.isArray(v)) (v.length === 2 ? gl.uniform2f : v.length === 3 ? gl.uniform3f : gl.uniform4f).call(gl, l, ...v);
      else gl.uniform1f(l, v);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, out.f); gl.viewport(0, 0, out.w, out.h); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const F = {
    aspect: 1,
    resize(aspect) { F.aspect = aspect; size(aspect); },
    // push the fluid (and pour dye) at uv point pt with a velocity in uv per second
    splat(pt, v, col, r) {
      const { vel, dye } = S, asp = F.aspect;
      run("splat", vel.w, { X: vel.r, pt, col: [v[0], v[1], 0, 0], r: r * .6, asp, tx: [1 / vel.W, 1 / vel.H] }); vel.swap();
      run("splat", dye.w, { X: dye.r, pt, col, r, asp, tx: [1 / dye.W, 1 / dye.H] }); dye.swap();
    },
    step(dt, dyeFade, vk = 26) {
      const { vel, dye, prs, div, curl } = S, vt = [1 / vel.W, 1 / vel.H];
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      run("curl", curl, { V: vel.r, tx: vt });
      run("vort", vel.w, { V: vel.r, C: curl, k: vk, dt, tx: vt }); vel.swap();
      run("div", div, { V: vel.r, tx: vt });
      run("fade", prs.w, { X: prs.r, k: .8, tx: vt }); prs.swap();
      for (let i = 0; i < 18; i++) { run("press", prs.w, { P: prs.r, D: div, tx: vt }); prs.swap(); }
      run("grad", vel.w, { P: prs.r, V: vel.r, tx: vt }); vel.swap();
      run("advect", vel.w, { V: vel.r, X: vel.r, dt, dis: .25, tx: vt }); vel.swap();
      run("advect", dye.w, { V: vel.r, X: dye.r, dt, dis: dyeFade, tx: vt }); dye.swap();
    },
    get dye() { return S.dye.r.t; },
  };
  return F;
}
