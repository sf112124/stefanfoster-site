// The index as a tunnel: every project name stacked in a loop and pulled through a lens.
// The middle line sits small and sharp; the lines above and below swell, stretch and smear out towards the edges.
// It drifts on its own, and wheel, drag or swipe spins it with weight. Everything is drawn on the GPU, so it stays smooth.

const VS = `#version 300 es
in vec2 p; out vec2 v; void main(){ v = p; gl_Position = vec4(p, 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
in vec2 v; out vec4 o;
uniform sampler2D T; uniform vec2 R; uniform float off, N, rowH, texW, texH, S0, B, C, hov;
// screen y (-1..1) to a position in the stack, and how many screen pixels one texel takes there
float rowAt(float y){ return off - C * sign(y) * (1. - exp(-B * abs(y))); }
float sa(float y){ return sqrt(y * y + .016) - .1265; }   // a soft |y|: flat through the middle line so it stays straight
float scaleAt(float y){ return S0 * exp(B * sa(y)); }
vec4 sampleAt(vec2 q){
  float r = rowAt(q.y), s = scaleAt(q.y), e = 1. - exp(-B * sa(q.y));
  float stretch = 1. + .5 * e;                       // the far lines widen more than they grow
  float xpx = q.x * R.x * .5;
  float u = (texW * .5 + xpx / (s * stretch)) / texW;
  float rr = mod(r, N), row = floor(rr), fy = fract(rr);
  float vv = (row * rowH + fy * rowH) / texH;
  if (u < 0. || u > 1.) return vec4(0.);
  return texture(T, vec2(u, vv), e * 2.5);
}
void main(){
  vec2 q = v;
  float e = smoothstep(.06, 1., abs(q.y));
  // a zoom smear towards the centre, stronger the further out you look
  vec4 c = vec4(0.); float z = .014 * e * e;
  for (int i = 0; i < 12; i++) { float k = 1. - float(i) * z; c += sampleAt(vec2(q.x * k, q.y * k)); }
  c /= 12.;
  // soft halo from a blurrier copy
  float s = scaleAt(q.y), r = rowAt(q.y), rr = mod(r, N);
  float xpx = q.x * R.x * .5, u = (texW * .5 + xpx / (s * (1. + .5 * (1. - exp(-B * sa(q.y)))))) / texW;
  vec4 h = (u > 0. && u < 1.) ? texture(T, vec2(u, (floor(rr) * rowH + fract(rr) * rowH) / texH), 4.5) : vec4(0.);
  float a = clamp(c.a + h.a * (.3 + .15 * hov) * e, 0., 1.);
  // the centre line is the brightest thing on the page; everything else falls back into the dark
  float lum = mix(1., .5, e);
  vec3 ink = vec3(.93, .92, .89) * lum;
  float vig = 1. - .35 * dot(v * vec2(.7, 1.), v * vec2(.7, 1.));
  o = vec4(ink * a * vig + vec3(.043) * (1. - a), 1.);
}`;

export function tunnel({ LIST, mount, media, esc, touch, reduce, onOpen }) {
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
    T.widest = Math.max(...names.map((n) => x.measureText(n).width));
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc); gl.generateMipmap(gl.TEXTURE_2D);
  };
  const T = { widest: texW * .8 };
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  const U = {}; ["R", "off", "N", "rowH", "texW", "texH", "S0", "B", "C", "hov"].forEach((k) => (U[k] = gl.getUniformLocation(pr, k)));
  draw(); document.fonts.ready.then(draw);

  // the label beside the line in the middle: who it was for, what it is, and a little moving picture in brackets
  const lab = document.createElement("div"); lab.className = "tun-lab";
  lab.innerHTML = `<a class="tun-hit" href="#" aria-label=""></a><span class="tun-l"></span><span class="tun-r"><span class="tun-k"></span><span class="tun-th"></span></span>`;
  mount.appendChild(lab);
  // the same names as plain links, for keyboards and screen readers
  const nav = document.createElement("nav"); nav.className = "sr"; nav.innerHTML = LIST.map((p) => `<a href="${p.page || "#" + p.slug}">${esc(p.title)}</a>`).join(""); mount.appendChild(nav);
  // corners: the quiet machine readouts
  const hud = document.createElement("div"); hud.className = "tun-hud mono";
  hud.innerHTML = `<span class="tl">IDX_${String(N).padStart(2, "0")}.MP4 / LONDON <b id="tunClock"></b></span><span class="tr">FPS <b id="tunFps">60.00</b></span><span class="bl"><b id="tunTc">00:00:00:00</b></span><span class="br">SCROLL / DRAG</span>
    ${[...Array(15)].map((_, i) => `<i class="x" style="left:${12.5 + (i % 5) * 18.75}%;top:${16 + Math.floor(i / 5) * 34}%"></i>`).join("")}`;
  mount.appendChild(hud);

  let off = 0.5, vel = 0, drift = reduce ? 0 : .055, hover = 0, hoverT = 0, last = performance.now(), active = -1, dragging = false, py = 0, fpsA = 60, t0 = performance.now();
  const W = () => cv.clientWidth, H = () => cv.clientHeight;
  const fit = () => { const d = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(W() * d); cv.height = Math.round(H() * d); gl.viewport(0, 0, cv.width, cv.height); };
  addEventListener("resize", fit); fit();

  // wheel, drag and swipe all push the stack with some weight behind it
  mount.addEventListener("wheel", (e) => { e.preventDefault(); vel += e.deltaY * .0011; }, { passive: false });
  mount.addEventListener("pointerdown", (e) => { if (e.target.closest("a")) return; dragging = true; py = e.clientY; mount.setPointerCapture(e.pointerId); });
  mount.addEventListener("pointermove", (e) => { if (!dragging) return; const dy = e.clientY - py; py = e.clientY; vel = -dy * .006; off += -dy * .006; moved += Math.abs(dy); });
  let moved = 0;
  mount.addEventListener("pointerup", () => { dragging = false; if (moved < 6 && active >= 0) onOpen(LIST[active]); moved = 0; });
  mount.addEventListener("pointerenter", () => (hoverT = 1)); mount.addEventListener("pointerleave", () => (hoverT = 0));
  addEventListener("keydown", (e) => { if (mount.closest("[hidden]")) return; if (e.key === "ArrowDown") vel += .09; if (e.key === "ArrowUp") vel -= .09; if (e.key === "Enter" && active >= 0) onOpen(LIST[active]); });

  const setActive = (i) => {
    if (i === active) return; active = i; const p = LIST[i];
    lab.querySelector(".tun-l").innerHTML = `<em>${esc(p.client)}</em>`;
    lab.querySelector(".tun-k").textContent = p.kind || "";
    const c = p.slug === "coca-cola" ? { i: "media/coca-cola/hover-1.jpg" } : p.slug === "gumtree" ? { i: "media/gumtree/hover-2.jpg" } : p.cover;
    const th = lab.querySelector(".tun-th"); th.innerHTML = c ? `( <span class="tun-pic">${media(c)}</span> )` : "";
    th.querySelectorAll("video").forEach((v) => { v.src = v.dataset.src; v.play().catch(() => {}); });
    const a = lab.querySelector(".tun-hit"); a.href = p.page || `#${p.slug}`; a.setAttribute("aria-label", p.title);
    lab.classList.remove("in"); void lab.offsetWidth; lab.classList.add("in");
  };

  const frame = (now) => {
    requestAnimationFrame(frame);
    if (mount.closest("[hidden]")) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now; fpsA += (1 / Math.max(dt, .001) - fpsA) * .05;
    hover += (hoverT - hover) * .06;
    // drift, slowed and settled onto the nearest line while you're looking
    if (!dragging) {
      off += vel; vel *= .92;
      const target = Math.floor(off) + .5, settle = hover * Math.max(0, 1 - Math.abs(vel) * 40);
      off += (drift * (1 - hover * .85)) * dt + (target - off) * .06 * settle;
    }
    const w = cv.width, h = cv.height, mob = W() < 700;
    // the middle line takes about 70% of the width on a desktop, more on a phone
    const S0 = (w * (mob ? .86 : .5)) / T.widest, B = 1.75, C = (h * .5) / (rowH * S0 * B);
    gl.uniform2f(U.R, w, h); gl.uniform1f(U.off, off); gl.uniform1f(U.N, N); gl.uniform1f(U.rowH, rowH); gl.uniform1f(U.texW, texW); gl.uniform1f(U.texH, texH);
    gl.uniform1f(U.S0, S0); gl.uniform1f(U.B, B); gl.uniform1f(U.C, C); gl.uniform1f(U.hov, hover);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const i = ((Math.floor(off) % N) + N) % N; setActive(i);
    // the label sits level with the middle line, its edges just outside the word
    const half = (T.widest * S0 / (devicePixelRatio > 1 ? Math.min(2, devicePixelRatio) : 1)) / 2;
    lab.style.setProperty("--half", `${Math.min(W() / 2 - 20, half * .9)}px`); lab.style.opacity = String(Math.max(0, 1 - Math.abs(vel) * 18));
    // readouts
    const tc = (now - t0) / 1000, f = Math.floor((tc % 1) * 25);
    const pad = (n) => String(n).padStart(2, "0");
    $id("tunTc").textContent = `${pad(Math.floor(tc / 3600))}:${pad(Math.floor(tc / 60) % 60)}:${pad(Math.floor(tc) % 60)}:${pad(f)}`;
    if (Math.floor(now / 500) !== frame.s) { frame.s = Math.floor(now / 500); $id("tunFps").textContent = fpsA.toFixed(2); $id("tunClock").textContent = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()); }
  };
  const $id = (k) => document.getElementById(k);
  requestAnimationFrame(frame);
  return true;
}
