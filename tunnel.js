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
float rowAt(float y){ return mix(off - C * sign(y) * (1. - exp(-B * abs(y))), N * .5 - C1 * y, flt); }
float sa(float y){ return sqrt(y * y + .016) - .1265; }   // a soft |y|: flt through the middle line so it stays straight
float scaleAt(float y){ return mix(S0 * exp(B * sa(y)), S1, flt); }
vec4 sampleAt(vec2 q){
  float r = rowAt(q.y), s = scaleAt(q.y), e = (1. - exp(-B * sa(q.y))) * (1. - flt);
  float stretch = 1. + .5 * e;                       // the far lines widen more than they grow
  float xpx = q.x * R.x * .5;
  float u = (texW * .5 + xpx / (s * stretch)) / texW;
  float rr = mod(r, N), row = floor(rr), fy = fract(rr);
  float vv = (row * rowH + fy * rowH) / texH;
  // in the list, only one copy of each name: nothing above the first or below the last
  float inList = 1. - clamp(flt * 1.8, 0., 1.) * (1. - step(0., r) * step(r, N));
  // and the one under the pointer stays dark while the rest step back
  float dim = 1. - flt * .62 * (hrow < -.5 || abs(row - hrow) < .5 ? 0. : 1.);
  // explicit detail level: the stack wraps round, and letting the GPU guess at the seam drew a grey line
  return textureLod(T, vec2(u, vv), max(0., log2(1. / (s * stretch))) + e * 2.5) * inList * dim;
}
void main(){
  // opening a project: the camera flies into the middle line and everything washes to paper
  vec2 q = v / (1. + fly * fly * 7.);
  float e = smoothstep(.06, 1., abs(q.y)) * (1. - flt);
  // a zoom smear towards the centre, stronger the further out you look (and everywhere on the way out)
  vec4 c = vec4(0.); float z = .014 * e * e + fly * .03;
  for (int i = 0; i < 16; i++) { float k = 1. - float(i) * z * .75; c += sampleAt(vec2(q.x * k, q.y * k)); }
  c /= 16.;
  float a = clamp(c.a, 0., 1.) * (1. - smoothstep(.55, 1., fly));
  // the middle line is the darkest thing on the page; everything else falls back into the paper
  vec3 paper = vec3(.937, .933, .914), ink = mix(vec3(.047), vec3(.42, .415, .40), e * .85);
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
  const U = {}; ["R", "off", "N", "rowH", "texW", "texH", "S0", "B", "C", "hov", "fly", "flt", "S1", "C1", "hrow"].forEach((k) => (U[k] = gl.getUniformLocation(pr, k)));
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
  let flatK = 0, flatT = 0, hrow = -1, opening = null;
  const setFlat = (on) => { flatT = on ? 1 : 0; mount.classList.toggle("is-list", on); sw.querySelector("span").textContent = on ? "TUNNEL" : "LIST"; poke(); };
  sw.addEventListener("pointerdown", (e) => e.stopPropagation()); sw.addEventListener("click", () => setFlat(!flatT));
  lst.addEventListener("pointerdown", (e) => e.stopPropagation());
  lst.querySelectorAll("a").forEach((a) => {
    a.addEventListener("pointerenter", () => (hrow = +a.dataset.i)); a.addEventListener("pointerleave", () => (hrow = -1));
    // picking from the list: it folds back into the tunnel on that name, then flies in
    a.addEventListener("click", (e) => { e.preventDefault(); const i = +a.dataset.i; off = target = i + .5; vel = 0; hrow = -1; onOpen(LIST[i]); setTimeout(() => setFlat(false), 400); });
  });
  rail.addEventListener("pointerdown", (e) => e.stopPropagation());
  rail.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { const i = +b.dataset.i, cur = ((Math.floor(target) % N) + N) % N; let d = (i - cur + N) % N; if (d > N / 2) d -= N; target = snap(target) + d; poke(); }));

  // the stack always comes to rest with one name dead centre; target is where it's heading
  let off = (start ?? 0) + .5, target = (start ?? 0) + .5, vel = 0, hover = 0, hoverT = 0, last = performance.now(), active = -1, dragging = false, py = 0, fpsA = 60, t0 = performance.now(), idle = performance.now(), dragV = 0, moved = 0, wheelT = 0;
  const W = () => cv.clientWidth, H = () => cv.clientHeight;
  const fit = () => { const d = Math.min(1.5, devicePixelRatio || 1); cv.width = Math.round(W() * d); cv.height = Math.round(H() * d); gl.viewport(0, 0, cv.width, cv.height); };
  addEventListener("resize", fit); fit();
  const snap = (x) => Math.round(x - .5) + .5;
  const poke = () => (idle = performance.now());

  // wheel: each notch of travel nudges the target on, and it always lands on a name
  mount.addEventListener("wheel", (e) => { e.preventDefault(); if (flatT) return; poke(); wheelT += e.deltaY * .0035;
    if (Math.abs(wheelT) >= 1) { const n = Math.trunc(wheelT); target = snap(target) + n; wheelT -= n; } }, { passive: false });
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
  const go = (p) => { if (going) return; onOpen(p); };   // straight in: no waiting on an animation
  const frame = (now) => {
    requestAnimationFrame(frame);
    if (mount.closest("[hidden]")) { wasHidden = true; return; }
    // coming back from a page: start fully flown-in and pull back out to the stack
    if (wasHidden) { wasHidden = false; outK = 1; going = null; lab.classList.remove("gone"); last = now; }
    if (going) { outK = Math.min(1, (now - going.t) / 240); if (outK >= 1) { const p = going.p; going = null; onOpen(p); } }
    else if (outK > 0) outK = Math.max(0, outK - Math.min(.05, (now - last) / 1000) / .32);
    const rdt = Math.min(.5, (now - last) / 1000), dt = Math.min(.05, rdt); last = now; fpsA += (1 / Math.max(dt, .001) - fpsA) * .05;
    hover += (hoverT - hover) * .06;
    // drift, slowed and settled onto the nearest line while you're looking
    if (!dragging) {
      // a firm spring with a touch of overshoot, so each name lands with a click
      const f = (target - off) * 120, prev = vel; vel += f * dt; vel *= Math.pow(.0009, dt); off += vel * dt;
      if (Math.abs(target - off) < .002 && Math.abs(vel) < .01) { off = target; vel = 0; }
    } else vel = dragV / Math.max(dt, .001);
    const w = cv.width, h = cv.height, mob = W() < 700;
    // the middle line takes about 70% of the width on a desktop, more on a phone
    const S0 = (w * (mob ? .86 : .5)) / T.widest, B = 1.75, C = (h * .5) / (rowH * S0 * B);
    flatK += (flatT - flatK) * (1 - Math.pow(.0015, rdt)); const fk = flatK * flatK * (3 - 2 * flatK);
    if (opening && flatK < .12 && !going) { go(LIST[opening.i]); opening = null; }
    const S1 = Math.min((h * .74) / (N * rowH), (w * (mob ? .86 : .56)) / T.widest), C1 = (h * .5) / (rowH * S1);
    gl.uniform1f(U.flt, fk); gl.uniform1f(U.S1, S1); gl.uniform1f(U.C1, C1); gl.uniform1f(U.hrow, hrow);
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
