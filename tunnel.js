import { makeFluid } from "./fluid.js";
const PAINT = true;   // a light splash of paint trailing the cursor over the index
// The index as a tunnel: every project name stacked in a loop and pulled through a lens.
// The middle line sits small and sharp; the lines above and below swell, stretch and smear out towards the edges.
// Wheel, drag or swipe spins it with weight, and it always clicks to rest on a name. Everything is drawn on the GPU, so it stays smooth.

const VS = `#version 300 es
in vec2 p; out vec2 v; void main(){ v = p; gl_Position = vec4(p, 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
in vec2 v; out vec4 o;
uniform sampler2D T; uniform vec2 R; uniform float off, N, rowH, texW, texH, S0, B, C, hov, fly, flt, S1, C1, hrow;
// screen y (-1..1) to a position in the stack, and how many screen pixels one texel takes there
// in the list, only the line under the pointer grows (G per line), swelling over its own spot without nudging the others
uniform float G[16], EA[16], mx, SP, hc, tm; uniform vec2 hm, hv; uniform vec3 P0, P1, P2, PB; uniform sampler2D D; uniform float FL, EX, BT; uniform vec2 XS;
float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float nz(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 3; i++) { v += a * nz(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return v; }
float sa(float y){ return sqrt(y * y + .016) - .1265; }   // a soft |y|: flt through the middle line so it stays straight
vec4 tex(float u, float row, float fy, float s){ return textureLod(T, vec2(u, (row * rowH + fy * rowH) / texH), max(0., log2(1. / s))); }
vec4 sampleAt(vec2 q){
  float xpx = q.x * R.x * .5;
  // the tunnel
  float rt = off - C * sign(q.y) * (1. - exp(-B * abs(q.y))), st = S0 * exp(B * sa(q.y)), e = (1. - exp(-B * sa(q.y))) * (1. - flt);
  float stretch = 1. + .5 * e;                       // the far lines widen more than they grow
  // the list: a straight stack
  float rl = N * .5 - C1 * (q.y - .05), spf = mix(1., SP, flt);
  float r = mix(rt, rl, flt), s = mix(st, S1, flt) * stretch;
  float rr = mod(r, N), row = floor(rr);
  float inList = 1. - clamp(flt * 1.8, 0., 1.) * (1. - step(0., r) * step(r, N));
  float dim = 1. - flt * mix(.62, .32, hc) * (hrow < -.5 || abs(row - hrow) < .5 ? 0. : 1.);
  float grown = flt > .5 && row >= 0. && row < N ? G[int(row)] : 0.;
  // explicit detail level: the stack wraps round, and letting the GPU guess at the seam drew a grey line
  float fy = .5 + (fract(rr) - .5) * spf, inRow = step(0., fy) * step(fy, 1.);
  vec4 c = grown > .004 ? vec4(0.) : textureLod(T, vec2((texW * .5 + xpx / s) / texW, (row * rowH + clamp(fy, 0., 1.) * rowH) / texH), max(0., log2(1. / s)) + e * 2.5) * inList * dim * inRow;
  c *= 1. - EA[int(clamp(row, 0., 15.))] * flt;   // eaten by the creature
  if (flt < .5) return c;
  // the hovered line grows in place, drawn over its neighbours, with a soft magnifier that follows the pointer along the word
  for (int k = -1; k <= 1; k++) {
    float h = floor(rl) + float(k);
    if (h < 0. || h >= N) continue;
    float gh = G[int(h)];
    if (gh < .004) continue;
    float d = xpx - mx * R.x * .5, W = R.y * .14, bb = exp(-d * d / (W * W)), A = clamp(gh * 4.2, 0., .34);
    float m = (1. + gh) / (1. - .7 * A * bb);
    float rm = h + .5 + (rl - h - .5) / m;
    if (floor(rm) != h) continue;
    float xe = xpx - A * d * bb, sh = S1 * (1. + gh);
    float dm = 1. - mix(.62, .32, hc) * (hrow < -.5 || abs(h - hrow) < .5 ? 0. : 1.);
    float fm = .5 + (fract(rm) - .5) * SP; if (fm < 0. || fm > 1.) continue;
    c = max(c, tex((texW * .5 + xe / sh) / texW, h, fm, sh * m / (1. + gh)) * dm * (1. - EA[int(h)]));
  }
  return c;
}
void main(){
  // opening a project: the camera flies into the middle line and everything washes to paper
  vec2 q = v / (1. + fly * fly * 7.);
  float e = smoothstep(.06, 1., abs(q.y)) * (1. - flt);
  // a zoom smear towards the centre, stronger the further out you look (and everywhere on the way out); the flat list needs one look
  vec4 c = vec4(0.); float z = .014 * e * e + fly * .03;
  if (z < .0005) c = sampleAt(q); else { for (int i = 0; i < 16; i++) { float k = 1. - float(i) * z * .75; c += sampleAt(vec2(q.x * k, q.y * k)); } c /= 16.; }
  float a = clamp(c.a, 0., 1.) * (1. - smoothstep(.55, 1., fly));
  // the middle line is the darkest thing on the page; everything else falls back into the paper
  vec3 paper = vec3(.937, .933, .914), ink = mix(vec3(.047), vec3(.42, .415, .40), e * .85);
  // hover a project in the list and the whole page floods with its colours: a liquid gradient that pours out from your pointer
  if (FL > .5) {
    // the dye only remembers where it sits between the project's two colours, so overlapping paint never mixes to mud
    // the real fluid: dye carried through a simulated flow, poured in from the pointer. It outlives the hover, so it can
    // swirl itself away rather than just fading; the type goes white wherever there's colour under it
    vec2 du = v * .5 + .5, dq = vec2(R.y / R.x, 1.) / 160.; vec4 dy = vec4(0.); float ws = 0.; for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) { float wt = exp(-float(i * i + j * j) / 3.); dy += texture(D, du + vec2(i, j) * dq * 1.2) * wt; ws += wt; } dy /= ws; float pu = clamp(dy.r / max(dy.a, 1e-3), 0., 1.); vec3 dc = mix(P0, P1, smoothstep(0., 1., pu)); float amt = clamp(1. - exp(-dy.a * 3.), 0., 1.); amt = amt * amt * (3. - 2. * amt);
    // leaving: the paint carries on along its paths and crumbles away, thinnest and roughest bits first
    if (EX > 0.) { float er = fbm(v * vec2(R.x / R.y, 1.) * 4.2 + XS + tm * .35) * .55 + fbm(v * 11. - XS.yx - tm * .2) * .25; amt *= smoothstep(EX - .05, EX + .05, amt * .3 + er * .95); }
    dc = mix(dc, PB, (1. - amt) * .35); paper = mix(paper, dc, amt * .9);
  } else if (hc > .002) {
    float asp = R.x / R.y; vec2 p = v * vec2(asp, 1.), m = hm * vec2(asp, 1.), d = p - m;
    float t = tm * .55; d -= hv * .35 * exp(-dot(d, d) / 1.4); float rad = length(d);   // flung colour lags behind and overshoots with the pointer
    // domain-warped flow, so the colours stream and fold like ink in water, and ripple outwards from the pointer
    vec2 w1 = p + vec2(fbm(p * .9 + t * .35), fbm(p * .9 + 5.2 - t * .3)) * 1.1;
    vec2 w2 = p + vec2(fbm(w1 * 1.3 + 1.7 + t * .45), fbm(w1 * 1.3 + 9.2 - t * .4)) * 1.4 - d * (.35 + length(hv) * .9) * sin(rad * 3. - t * 2.2) - hv * .6 * exp(-rad * rad / .9);
    float n = fbm(w2 * 1.2 + t * .2);
    float g = exp(-rad * rad / 1.1);
    float f = clamp(.18 + g * .8 + (n - .5) * 1.05 + .3 * exp(-p.x * p.x / .4), 0., 1.);
    vec3 pale = mix(vec3(1.), P0, .55);
    vec3 bg = mix(pale, P0, smoothstep(.0, .3, f)); bg = mix(bg, P1, smoothstep(.28, .62, f)); bg = mix(bg, P2, smoothstep(.6, .98, f));
    paper = mix(paper, bg, hc);
    ink = mix(ink, vec3(1.), hc);
  }
  o = vec4(mix(paper, ink, a), 1.);
}`;

export function tunnel({ LIST, mount, media, esc, touch, reduce, onOpen, onTick, start }) {
  const cv = document.createElement("canvas"); cv.className = "tun-cv"; mount.appendChild(cv);
  const gl = cv.getContext("webgl2", { antialias: false, premultipliedAlpha: false });
  if (!gl) return false;
  const N = LIST.length, rowH = 214, texW = 2048, texH = rowH * N;
  // the words: drawn once into a tall strip, one name per row
  const tc = document.createElement("canvas"); tc.width = texW; tc.height = texH; const x = tc.getContext("2d");
  const names = LIST.map((p) => p.title);
  const draw = () => {
    x.clearRect(0, 0, texW, texH);
    let fs = 200; x.font = `600 ${fs}px Geist, sans-serif`; try { x.letterSpacing = "-8px"; } catch (e) {}
    const widest = Math.max(...names.map((n) => x.measureText(n).width)); fs = Math.min(200, fs * (texW * .9) / widest);
    x.font = `600 ${fs}px Geist, sans-serif`; try { x.letterSpacing = `${(-fs * .045).toFixed(1)}px`; } catch (e) {}
    x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
    names.forEach((n, i) => x.fillText(n, texW / 2, i * rowH + rowH * .55));
    T.widest = Math.max(...names.map((n) => x.measureText(n).width)); T.w = names.map((n) => x.measureText(n).width);
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc); gl.generateMipmap(gl.TEXTURE_2D);
  };
  const T = { widest: texW * .8 };
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const fluid = reduce || !PAINT ? null : makeFluid(gl, buf, { sim: 96, dye: 160 }); gl.useProgram(pr);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  const U = {}; ["R", "off", "N", "rowH", "texW", "texH", "S0", "B", "C", "hov", "fly", "flt", "S1", "C1", "hrow", "G", "mx", "SP", "hc", "tm", "hm", "hv", "P0", "P1", "P2", "PB", "D", "FL", "T", "EX", "BT", "XS", "EA"].forEach((k) => (U[k] = gl.getUniformLocation(pr, k)));
  draw(); document.fonts.ready.then(draw);

  // the label beside the line in the middle: who it was for, what it is, and a little moving picture in brackets
  const lab = document.createElement("div"); lab.className = "tun-lab";
  lab.innerHTML = `<a class="tun-hit" href="#" aria-label=""></a><span class="tun-l"></span><span class="tun-r"><span class="tun-k"></span><span class="tun-th"></span></span>`;
  mount.appendChild(lab);
  // the same names as plain links, for keyboards and screen readers
  const nav = document.createElement("nav"); nav.className = "sr"; nav.innerHTML = LIST.map((p) => `<a href="${p.page || "#" + p.slug}">${esc(p.title)}</a>`).join(""); mount.appendChild(nav);
  // corners: the quiet machine readouts
  const hud = document.createElement("div"); hud.className = "tun-hud mono";
  hud.innerHTML = `
    ${[...Array(15)].map((_, i) => `<i class="x" style="left:${12.5 + (i % 5) * 18.75}%;top:${16 + Math.floor(i / 5) * 34}%"></i>`).join("")}`;
  mount.appendChild(hud);
  // the quick index: a rail of numbers down the right. Each one spins the stack straight to its project
  const rail = document.createElement("div"); rail.className = "tun-rail mono";
  rail.innerHTML = LIST.map((p, i) => `<button type="button" data-i="${i}"><span class="rn">${esc(p.title)}</span><b>${String(i + 1).padStart(2, "0")}</b></button>`).join("");
  mount.appendChild(rail);
  // the switch: pull everything flat into a plain list, and back
  const sw = document.createElement("button"); sw.type = "button"; sw.className = "tun-sw mono"; sw.innerHTML = `<i></i><span>LIST</span>`; mount.appendChild(sw);
  // the list's own hit areas, numbers and clients, laid over the flat names
  const lst = document.createElement("div"); lst.className = "tun-list"; lst.innerHTML = LIST.map((p, i) => `<a href="${p.page || "#" + p.slug}" data-i="${i}"><span class="n mono">${String(i + 1).padStart(2, "0")}</span><span class="c">${esc(p.client)}</span></a>`).join(""); mount.appendChild(lst);
  let flatK = 1, flatT = 1, hrow = -1, opening = null, mouseY = null, mouseX = 0, mxS = 0; const gs = new Float32Array(16), gv = new Float32Array(16), ea = new Float32Array(16), eaT = new Float32Array(16);
  // the creature can eat a line of the list: it shrinks away, and comes back when the creature goes home
  window.__tunEat = { eat: (i) => { eaT[i] = 1; }, reset: () => eaT.fill(0) };
  mount.classList.add("is-list"); sw.querySelector("span").textContent = "TUNNEL";
  // each project's colours, from pale edge to hot core
  const hx = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255), PAL = (a, b, c) => [...hx(a), ...hx(b), ...hx(c)];
  // each project's colours: four bright, harmonious hues the flow cycles through
  // juicy, analogous palettes: neighbouring hues only, so wherever they swirl together they stay bright and never go muddy
  // two neighbouring colours make the blob, a third softens its edge
  const PALS = { "ai-experiments": ["#ff7a1a", "#ffb21c", "#ff7a1a", "#ffb21c", "#ff4f8b"],
    "la-croisiere": ["#1f7bff", "#18c6d6", "#1f7bff", "#18c6d6", "#8c7bff"],
    "les-benjamins": ["#ff5a2a", "#ffb21c", "#ff5a2a", "#ffb21c", "#ff4fa0"],
    "ai-commissions": ["#11c08a", "#19c6d6", "#11c08a", "#19c6d6", "#c9e83a"],
    "3d-explorations": ["#4a5bff", "#8a4dff", "#4a5bff", "#8a4dff", "#2fb8ff"],
    "summer-of-sport": ["#ff7a00", "#ff4a4a", "#ff7a00", "#ff4a4a", "#ffc400"],
    relax: ["#1a8cff", "#22d3d0", "#1a8cff", "#22d3d0", "#6f7bff"],
    "coca-cola": ["#ff2e3e", "#ff7a1a", "#ff2e3e", "#ff7a1a", "#ff4fa0"],
    gumtree: ["#14cf75", "#8fe03a", "#14cf75", "#8fe03a", "#19c6d6"],
    _: ["#ff7a1a", "#ffb21c", "#ff7a1a", "#ffb21c", "#ff4f8b"] };
  for (const k in PALS) PALS[k] = PALS[k].map((c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255));
  // moving between projects, each colour turns round the colour wheel (OKLCH) rather than straight through grey
  const lin = (c) => (c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4), gam = (c) => (c <= .0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - .055);
  const toLch = ([r, g, b]) => { r = lin(r); g = lin(g); b = lin(b);
    const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s2 = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
    const L = .2104542553 * l + .793617785 * m - .0040720468 * s2, A = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s2, B = .0259040371 * l + .7827717662 * m - .808675766 * s2;
    return [L, Math.hypot(A, B), Math.atan2(B, A)]; };
  const toRgb = ([L, C, h]) => { const A = C * Math.cos(h), B = C * Math.sin(h);
    const l = (L + .3963377774 * A + .2158037573 * B) ** 3, m = (L - .1055613458 * A - .0638541728 * B) ** 3, s2 = (L - .0894841775 * A - 1.291485548 * B) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s2, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s2, -.0041960863 * l - .7034186147 * m + 1.707614701 * s2].map((c) => Math.min(1, Math.max(0, gam(c)))); };
  const PLCH = {}; for (const k in PALS) PLCH[k] = PALS[k].map(toLch);
  const palL = PLCH._.map((c) => c.slice());
  let heat = 0; const pal = PALS._.flat(), hmP = [0, 0], hmS = [0, 0], hmV = [0, 0], prevP = [0, 0]; let fluidOn = 0, wasOn = 0, leaveT = 0, DR = 3800; const XS = [0, 0]; const lastP = [.5, .5];
  mount.addEventListener("pointermove", (e) => { const r = mount.getBoundingClientRect(); hmP[0] = 2 * (e.clientX - r.left) / r.width - 1; hmP[1] = 1 - 2 * (e.clientY - r.top) / r.height; });
  mount.addEventListener("pointermove", (e) => { const a = e.target.closest && e.target.closest(".tun-list a"); if (!a || e.target !== a) { mouseY = null; return; } const r = mount.getBoundingClientRect(); mouseY = 1 - 2 * (e.clientY - r.top) / r.height - .05; mouseX = 2 * (e.clientX - r.left) / r.width - 1; });
  mount.addEventListener("pointerleave", () => (mouseY = null));
  const setFlat = (on) => { flatT = on ? 1 : 0; mount.classList.toggle("is-list", on); sw.querySelector("span").textContent = on ? "TUNNEL" : "LIST"; poke(); };
  sw.addEventListener("pointerdown", (e) => e.stopPropagation()); sw.addEventListener("click", () => setFlat(!flatT));
  lst.addEventListener("pointerdown", (e) => e.stopPropagation());
  lst.querySelectorAll("a").forEach((a) => {
    a.addEventListener("pointerenter", () => (hrow = +a.dataset.i)); a.addEventListener("pointerleave", () => (hrow = -1));
    // picking from the list: it folds back into the tunnel on that name, then flies in
    a.addEventListener("click", (e) => { e.preventDefault(); const i = +a.dataset.i; off = target = i + .5; vel = 0; hrow = -1; onOpen(LIST[i]); });
  });
  rail.addEventListener("pointerdown", (e) => e.stopPropagation());
  rail.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { const i = +b.dataset.i, cur = ((Math.floor(target) % N) + N) % N; let d = (i - cur + N) % N; if (d > N / 2) d -= N; target = snap(target) + d; poke(); }));

  // the stack always comes to rest with one name dead centre; target is where it's heading
  let off = (start ?? 0) + .5, target = (start ?? 0) + .5, vel = 0, hover = 0, hoverT = 0, last = performance.now(), active = -1, dragging = false, py = 0, fpsA = 60, t0 = performance.now(), idle = performance.now(), dragV = 0, moved = 0, wheelT = 0;
  const W = () => cv.clientWidth, H = () => cv.clientHeight;
  const fit = () => { const d = Math.min(1.5, devicePixelRatio || 1); cv.width = Math.round(W() * d); cv.height = Math.round(H() * d); gl.viewport(0, 0, cv.width, cv.height); if (fluid) fluid.resize(cv.width / cv.height); };
  addEventListener("resize", fit); fit();
  const snap = (x) => Math.round(x - .5) + .5;
  const poke = () => (idle = performance.now());

  // wheel: each notch of travel nudges the target on, and it always lands on a name
  // wheel and trackpad: the stack follows your fingers continuously, then clicks onto the nearest name once you stop
  let wheelTimer = 0, wheeling = false;
  mount.addEventListener("wheel", (e) => { e.preventDefault(); if (flatT) return; poke();
    const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY; target += Math.max(-1.2, Math.min(1.2, d * .0042)); wheeling = true;
    clearTimeout(wheelTimer); wheelTimer = setTimeout(() => { wheeling = false; target = snap(target); }, 110); }, { passive: false });
  // drag: the stack follows the hand exactly, then flicks on and clicks into the nearest name
  mount.addEventListener("pointerdown", (e) => { if (e.button > 0 || flatT) return; dragging = true; py = e.clientY; moved = 0; dragV = 0; poke(); try { mount.setPointerCapture(e.pointerId); } catch (er) {} });
  mount.addEventListener("pointermove", (e) => { if (!dragging) return; const dy = e.clientY - py; py = e.clientY; const k = 2.4 / Math.max(300, H()); off -= dy * k; dragV = dragV * .6 + (-dy * k) * .4; moved += Math.abs(dy); poke(); });
  const up = (e) => { if (!dragging) return; dragging = false;
    if (moved < 6) { const hit = e && e.target && e.target.closest && e.target.closest(".tun-hit"); if (active >= 0 && (hit || Math.abs(e.clientY - innerHeight / 2) < innerHeight * .12)) go(LIST[active]); target = snap(off); return; }
    target = snap(off + dragV * 9); };
  mount.addEventListener("pointerup", up); mount.addEventListener("pointercancel", up);
  mount.addEventListener("click", (e) => { if (e.target.closest(".tun-hit")) e.preventDefault(); });
  mount.addEventListener("pointerenter", () => (hoverT = 1)); mount.addEventListener("pointerleave", () => (hoverT = 0));
  addEventListener("keydown", (e) => { if (mount.closest("[hidden]")) return; if (e.key === "ArrowDown") { target = snap(target) + 1; poke(); } if (e.key === "ArrowUp") { target = snap(target) - 1; poke(); } if (e.key === "Enter" && active >= 0) go(LIST[active]); });

  const setActive = (i) => {
    if (i === active) return; active = i; const p = LIST[i];
    lab.querySelector(".tun-l").innerHTML = `<em>${esc(p.client)}</em>`;
    lab.querySelector(".tun-k").textContent = p.kind || "";
    const c = p.slug === "coca-cola" ? { i: "media/coca-cola/hover-1.jpg" } : p.slug === "gumtree" ? { i: "media/gumtree/hover-2.jpg" } : p.cover;
    const th = lab.querySelector(".tun-th"); th.innerHTML = c ? `( <span class="tun-pic">${media(c)}</span> )` : "";
    th.querySelectorAll("video").forEach((v) => { v.src = v.dataset.src; v.play().catch(() => {}); });
    const a = lab.querySelector(".tun-hit"); a.href = p.page || `#${p.slug}`; a.setAttribute("aria-label", p.title);
    lab.classList.remove("in"); void lab.offsetWidth; lab.classList.add("in");
    rail.querySelectorAll("button").forEach((b) => b.classList.toggle("on", +b.dataset.i === i));
  };

  let outK = 0, going = null, wasHidden = false;
  // fly into the chosen name, then hand over to the page
  // where each name lands on screen in the list (straight stack; the hovered one just grows in place)
  const placeList = (S1, C1) => {
    const dpr = Math.min(1.5, devicePixelRatio || 1), Hc = H(), yOf = (r) => .05 + (N * .5 - r) / C1;
    lst.querySelectorAll("a").forEach((a, i) => {
      const top = (1 - yOf(i)) / 2 * Hc, bot = (1 - yOf(i + 1)) / 2 * Hc;
      const base = (T.w ? T.w[i] : T.widest) * S1 / dpr / 2, half = base * (1 + Math.max(0, gs[i]));
      a.style.top = `${top.toFixed(1)}px`; a.style.height = `${(bot - top).toFixed(1)}px`; a.style.setProperty("--half", `${half.toFixed(1)}px`); a.style.setProperty("--base", `${base.toFixed(1)}px`);
    });
  };
  const go = (p) => { if (going) return; onOpen(p); };   // straight in: no waiting on an animation
  const frame = (now) => {
    requestAnimationFrame(frame);
    if (mount.closest("[hidden]")) { wasHidden = true; return; }
    // coming back from a page: start fully flown-in and pull back out to the stack
    if (wasHidden) { wasHidden = false; outK = touch || W() < 700 ? 0 : 1;   // phones just come straight back to the list
      going = null; lab.classList.remove("gone"); last = now; }
    if (going) { outK = Math.min(1, (now - going.t) / 240); if (outK >= 1) { const p = going.p; going = null; onOpen(p); } }
    else if (outK > 0) outK = Math.max(0, outK - Math.min(.05, (now - last) / 1000) / .32);
    const rdt = Math.min(.5, (now - last) / 1000), dt = Math.min(.05, rdt); last = now; fpsA += (1 / Math.max(dt, .001) - fpsA) * .05;
    hover += (hoverT - hover) * .06;
    // drift, slowed and settled onto the nearest line while you're looking
    if (!dragging) {
      // a firm spring with a touch of overshoot, so each name lands with a click
      const kk = wheeling ? 420 : 140, f = (target - off) * kk; vel += f * dt; vel *= Math.pow(wheeling ? .00002 : .0009, dt); off += vel * dt;
      if (Math.abs(target - off) < .002 && Math.abs(vel) < .01) { off = target; vel = 0; }
    } else vel = dragV / Math.max(dt, .001);
    const w = cv.width, h = cv.height, mob = W() < 700;
    // the middle line takes about 70% of the width on a desktop, more on a phone
    const S0 = (w * (mob ? .86 : .5)) / T.widest, B = 1.75, C = (h * .5) / (rowH * S0 * B);
    flatK += (flatT - flatK) * (1 - Math.pow(.0015, rdt)); const fk = flatK * flatK * (3 - 2 * flatK);
    if (opening && flatK < .12 && !going) { go(LIST[opening.i]); opening = null; }
    const SP = 1.6, S1 = Math.min((h * .64) / (N * rowH * SP), (w * (mob ? .66 : .3)) / T.widest), C1 = (h * .5) / (rowH * S1 * SP);
    // the lens drifts after the pointer and relaxes away when it leaves
    const GA = mob ? .05 : .07;
    // a slightly underdamped spring per line, so it swells past and settles; the magnifier trails the pointer like liquid
    for (let st = 0, n = Math.ceil(rdt / .008); st < n; st++) { const h = Math.min(.008, rdt / n); for (let i = 0; i < N; i++) { gv[i] += ((((i === hrow ? GA : 0) - gs[i]) * 340) - gv[i] * 19) * h; gs[i] += gv[i] * h; } }
    mxS += (mouseX - mxS) * (1 - Math.pow(.003, rdt));
    gl.uniform1f(U.flt, fk); gl.uniform1f(U.S1, S1); gl.uniform1f(U.C1, C1); gl.uniform1f(U.hrow, hrow); for (let i = 0; i < 16; i++) ea[i] += (eaT[i] - ea[i]) * Math.min(1, rdt * (eaT[i] ? 7 : 3)); gl.uniform1fv(U.G, gs); gl.uniform1fv(U.EA, ea); gl.uniform1f(U.mx, mxS); gl.uniform1f(U.SP, SP);
    // the colour flood: fades in on the hovered project's palette, eases between palettes, follows the pointer softly
    const ht = PAINT && hrow >= 0 && fk > .5 ? 1 : 0, pk = 1 - Math.pow(.03, rdt); heat += (ht - heat) * (1 - Math.pow(ht ? .08 : .02, rdt));
    if (hrow >= 0) { const tgt = PLCH[LIST[hrow].slug] || PLCH._; palL.forEach((c, j) => { const t2 = tgt[j]; c[0] += (t2[0] - c[0]) * pk; c[1] += (t2[1] - c[1]) * pk; let dh = t2[2] - c[2]; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); c[2] += dh * pk; const rgb = toRgb(c); pal[j * 3] = rgb[0]; pal[j * 3 + 1] = rgb[1]; pal[j * 3 + 2] = rgb[2]; }); }
    // a loose spring: flick the mouse and the colour swings after it, overshoots and settles
    for (let st = 0, n = Math.ceil(rdt / .008); st < n; st++) { const h2 = Math.min(.008, rdt / n); for (let j = 0; j < 2; j++) { hmV[j] += ((hmP[j] - hmS[j]) * 34 - hmV[j] * 5.2) * h2; hmS[j] += hmV[j] * h2; } }
    gl.uniform1f(U.hc, 0); gl.uniform1f(U.tm, now / 1000); gl.uniform2f(U.hm, hmS[0], hmS[1]); gl.uniform2f(U.hv, Math.max(-1.5, Math.min(1.5, hmV[0] * .25)), Math.max(-1.5, Math.min(1.5, hmV[1] * .25))); 
    gl.uniform3f(U.P0, pal[0], pal[1], pal[2]); gl.uniform3f(U.P1, pal[3], pal[4], pal[5]); gl.uniform3f(U.P2, pal[6], pal[7], pal[8]);
    // drive the fluid: the pointer stirs it and pours colour, three slow currents fill the page; leave the list and it spins itself down a drain
    if (hrow >= 0) { wasOn = 1; leaveT = 0; lastP[0] = (hmP[0] + 1) / 2; lastP[1] = (hmP[1] + 1) / 2; } else if (wasOn) { wasOn = 0; leaveT = now; DR = 3000; XS[0] = Math.random() * 40; XS[1] = Math.random() * 40; }
    const draining = leaveT && now - leaveT < DR, lk = leaveT ? Math.min(1, (now - leaveT) / DR) : 0;
    if (fluid && (heat > .004 || fluidOn > 0)) {
      fluidOn = heat > .004 || draining ? 3 : fluidOn - rdt; const fdt = Math.min(rdt, 1 / 30), t = now / 1000, ar = w / h;
      if (fluidOn > 0 && fdt > 0) {
        const hue = (o) => { const f = ((t * .25 + o) % 2 + 2) % 2, i = Math.floor(f), k = f - i, kk2 = k * k * (3 - 2 * k), a = i * 3, b = ((i + 1) % 2) * 3; return [0, 1, 2].map((c) => pal[a + c] + (pal[b + c] - pal[a + c]) * kk2); };
        const P = [(hmP[0] + 1) / 2, (hmP[1] + 1) / 2], dx = P[0] - prevP[0], dy = P[1] - prevP[1]; prevP[0] = P[0]; prevP[1] = P[1];
        const dye = (c, a) => [c[0] * a, c[1] * a, c[2] * a, a];
        if (hrow >= 0) {
          const sp = Math.hypot(dx, dy);
          fluid.splat(P, sp < .3 ? [dx * 2600 * ar, dy * 2600] : [0, 0], dye([.5 + .5 * Math.sin(t * 1.3), 0, 0], Math.min(.5, .05 + sp * 7)), .0045);
        }
        fluid.step(fdt, 1.5, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height); gl.useProgram(pr);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      }
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fluid.dye); gl.uniform1i(U.D, 1); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U.T, 0);
    }
    gl.uniform1f(U.FL, fluid && fluidOn > 0 ? 1 : 0); gl.uniform1f(U.EX, 0); const hs = heat * heat * (3 - 2 * heat); gl.uniform1f(U.BT, 0); gl.uniform2f(U.XS, XS[0], XS[1]);
    { const m = [0, 1, 2].map((c) => (pal[c] + pal[3 + c] + pal[6 + c] + pal[9 + c]) / 4); gl.uniform3f(U.PB, pal[12], pal[13], pal[14]); }
    if (flatK > .5) placeList(S1, C1);
    lst.style.setProperty("--row", `${(rowH * S1) / Math.min(1.5, devicePixelRatio || 1)}px`); lst.style.setProperty("--wide", `${(T.widest * S1) / Math.min(1.5, devicePixelRatio || 1)}px`);
    gl.uniform2f(U.R, w, h); gl.uniform1f(U.off, off); gl.uniform1f(U.N, N); gl.uniform1f(U.rowH, rowH); gl.uniform1f(U.texW, texW); gl.uniform1f(U.texH, texH);
    gl.uniform1f(U.S0, S0); gl.uniform1f(U.B, B); gl.uniform1f(U.C, C); gl.uniform1f(U.hov, hover); gl.uniform1f(U.fly, outK);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const i = ((Math.floor(off) % N) + N) % N; if (i !== active && active >= 0) onTick && onTick(); setActive(i);
    // the label sits level with the middle line, its edges just outside the word
    const half = (T.widest * S0 / Math.min(1.5, devicePixelRatio || 1)) / 2;
    lab.style.setProperty("--half", `${Math.min(W() / 2 - 20, half * .9)}px`); lab.style.opacity = String(Math.max(0, 1 - Math.abs(vel) * .5) * (1 - outK));
  };
  const $id = (k) => document.getElementById(k);
  requestAnimationFrame(frame);
  return true;
}
