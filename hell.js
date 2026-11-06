// HELL (try it with ?hell): hover a name on the index and you fall into thrash metal hell. The page strobes red and
// black, the hovered project's footage melts behind everything in two burnt colours, every name blows up huge in a
// metal face and shakes to the track. Move off the names and it stops dead. Click a name to escape into it.
const ON = /[?&]hell\b/.test(location.search) && matchMedia("(hover: hover) and (pointer: fine)").matches;
if (ON) {
  const TRACK = "media/hell/hell.mp3";
  let ac = null, buf = null, src = null, gain = null, an = null, bins = null, active = false, cur = -1, leaveT = 0, energy = 0, avg = 0, hit = 0, bar = 0;
  const loadTrack = () => fetch(TRACK).then((r) => r.arrayBuffer()).then((b) => { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); return ac.decodeAudioData(b); }).then((d) => (buf = d)).catch(() => {});
  loadTrack();
  // the browser holds sound back until the first click or key on the page
  const unlock = () => { if (ac && ac.state !== "running") ac.resume(); };
  addEventListener("pointerdown", unlock, true); addEventListener("keydown", unlock, true);

  // ---------- the layer ----------
  const root = document.createElement("div"); root.id = "hell"; root.setAttribute("aria-hidden", "true");
  root.innerHTML = `<canvas class="hl-bg"></canvas><div class="hl-list"></div>`;
  document.body.appendChild(root);
  const cv = root.querySelector("canvas"), listEl = root.querySelector(".hl-list");
  let rows = [], LIST = [];

  function build() {
    LIST = [...document.querySelectorAll(".tun-list a")];
    listEl.innerHTML = "";
    rows = LIST.map((a, i) => {
      const title = a.querySelector(".t").textContent, el = document.createElement("div"); el.className = "hl-row";
      el.innerHTML = [...title].map((ch) => `<span class="hl-ch">${ch === " " ? "&nbsp;" : ch.replace(/[<>&]/g, "")}</span>`).join("");
      el.addEventListener("click", (e) => { e.preventDefault(); escape(i); });
      listEl.appendChild(el);
      return { el, a, chars: [...el.children].map((c) => ({ el: c, x: 0, y: 0, r: 0, s: 1, vx: 0, vy: 0 })) };
    });
  }

  // ---------- footage: the hovered project's picture, melted and burnt down to red and black ----------
  const gl = cv.getContext("webgl", { premultipliedAlpha: false, antialias: false });
  let prog = null, tex = null, media = null, U = {};
  if (gl) {
    const vs = "attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; v.y = 1. - v.y; gl_Position = vec4(p, 0., 1.); }";
    const fs = `precision mediump float; varying vec2 v; uniform sampler2D T; uniform float t, k, inv, asp; uniform vec2 m;
      float h(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 q){ vec2 i = floor(q), f = fract(q); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec2 u = v;
        // melting: columns of the picture slide down at their own speeds, and it all wobbles harder on every hit
        float col = n(vec2(u.x * 9., t * .2)) , drip = pow(col, 3.) * (.25 + .35 * fract(t * .07));
        u.y -= drip * u.y;
        u.x += (n(vec2(u.y * 6., t * 1.3)) - .5) * (.03 + .12 * k);
        u += (vec2(n(u * 18. + t * 4.), n(u * 18. - t * 4.)) - .5) * .02 * k;
        // pull toward the pointer like a drain
        vec2 d = u - m; u -= d * .08 * exp(-dot(d, d) * 8.);
        // cover the screen, keeping the picture's shape
        vec2 c = (u - .5) * vec2(asp > 1. ? 1. : asp, asp > 1. ? 1. / asp : 1.) + .5;
        vec3 s = texture2D(T, clamp(c, 0., 1.)).rgb;
        float y = dot(s, vec3(.3, .59, .11));
        y = smoothstep(.32 - .1 * k, .5 + .05 * k, y + (h(u * 400. + t) - .5) * .18);
        vec3 red = vec3(.88, .02, 0.), blk = vec3(0.);
        vec3 col3 = mix(blk, red, y);
        col3 = mix(col3, red - col3, inv);
        gl_FragColor = vec4(col3 * (.55 + .45 * k), 1.);
      }`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog); gl.useProgram(prog);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ["T", "t", "k", "inv", "asp", "m"].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  function footage(a) {
    if (media) { if (media.pause) media.pause(); media = null; }
    const p = a && a.__p; if (!p) return;
    const box = document.createElement("div"); box.innerHTML = window.__tunEat?.media(p) || "";
    const v = box.querySelector("video"), im = box.querySelector("img");
    if (v) { const nv = document.createElement("video"); nv.muted = true; nv.loop = true; nv.playsInline = true; nv.crossOrigin = "anonymous"; nv.src = v.dataset.src || v.src; nv.play().catch(() => {}); media = nv; }
    else if (im) { const ni = new Image(); ni.src = im.src || im.dataset.src; media = ni; }
  }

  // ---------- in and out ----------
  addEventListener("tunhover", (e) => {
    const { i, p, a } = e.detail; if (a) a.__p = p;
    if (i >= 0 && !active && !document.documentElement.classList.contains("devouring")) enter(i);
  });
  function enter(i) {
    if (!rows.length) build();
    active = true; cur = -1; leaveT = 0; document.documentElement.classList.add("in-hell");
    swap(i);
    if (ac && buf) { unlock(); gain = ac.createGain(); gain.gain.value = 1; an = ac.createAnalyser(); an.fftSize = 1024; bins = new Uint8Array(an.frequencyBinCount);
      src = ac.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(an); an.connect(gain); gain.connect(ac.destination); src.start(); }
    requestAnimationFrame(frame);
  }
  function swap(i) { if (i === cur) return; cur = i; rows.forEach((r, k) => r.el.classList.toggle("hot", k === i)); footage(LIST[i]); }
  function exit() {
    active = false; document.documentElement.classList.remove("in-hell");
    if (gain) { const t = ac.currentTime; gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(0, t + .06); const s = src; setTimeout(() => { try { s.stop(); } catch (e) {} }, 120); }
    src = gain = an = null; if (media && media.pause) media.pause();
  }
  function escape(i) { exit(); const a = LIST[i]; if (a) a.click(); }
  // you're in hell while you're on a name; drift off the names and it stops
  const P = { x: innerWidth / 2, y: innerHeight / 2 };
  root.addEventListener("pointermove", (e) => {
    P.x = e.clientX; P.y = e.clientY;
    const r = e.target.closest && e.target.closest(".hl-row"), k = r ? rows.findIndex((q) => q.el === r) : -1;
    if (k >= 0) { leaveT = 0; swap(k); } else if (!leaveT) leaveT = performance.now();
  });
  root.addEventListener("pointerleave", exit);
  addEventListener("keydown", (e) => { if (active && e.key === "Escape") exit(); });

  // ---------- the frame ----------
  let last = performance.now(), t0 = performance.now();
  function frame(now) {
    if (!active) return; requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (leaveT && now - leaveT > 260) return exit();
    // hear the kick: low-end energy jumping above its own running average
    if (an) { an.getByteFrequencyData(bins); let e = 0; for (let b = 1; b < 7; b++) e += bins[b]; e /= 6 * 255; avg += (e - avg) * .08; if (e - avg > .045 && e > .5) { hit = 1; bar++; } energy = e; }
    else { const s = Math.floor((now - t0) / 75); if (s !== bar) { bar = s; hit = 1; } energy = .7; }
    hit *= Math.pow(.0009, dt);
    const flash = bar % 16 === 0 && hit > .6, inv = hit > .55 && bar % 2 ? 1 : 0;
    root.style.setProperty("--fg", inv ? "#e10600" : "#000"); root.style.setProperty("--bgc", flash ? "#e10600" : "#000");
    // the footage
    if (gl) {
      const W = cv.clientWidth, H = cv.clientHeight, d = Math.min(1, devicePixelRatio || 1);
      if (cv.width !== Math.round(W * d * .5)) { cv.width = Math.round(W * d * .5); cv.height = Math.round(H * d * .5); }
      gl.viewport(0, 0, cv.width, cv.height);
      const ready = media && ((media.readyState >= 2) || (media.complete && media.naturalWidth));
      if (ready) { try { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, media); } catch (e) {} }
      const mw = media && (media.videoWidth || media.naturalWidth) || 16, mh = media && (media.videoHeight || media.naturalHeight) || 9;
      gl.uniform1f(U.t, (now - t0) / 1000); gl.uniform1f(U.k, Math.min(1, hit + energy * .3)); gl.uniform1f(U.inv, inv); gl.uniform1f(U.asp, (W / H) / (mw / mh)); gl.uniform2f(U.m, P.x / W, P.y / H);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // the names: shaking on the kick, and blown apart wherever the pointer is
    const R = Math.min(innerWidth, innerHeight) * .22;
    rows.forEach((r, ri) => r.chars.forEach((c) => {
      const b = c.el.getBoundingClientRect(), cx = b.left + b.width / 2 - c.x, cy = b.top + b.height / 2 - c.y, dx = cx - P.x, dy = cy - P.y, dd = Math.hypot(dx, dy) || 1, near = Math.exp(-(dd * dd) / (R * R));
      const j = hit * (10 + 26 * Math.random()), tx = (Math.random() - .5) * j + dx / dd * near * 90, ty = (Math.random() - .5) * j * 1.6 + dy / dd * near * 70;
      c.vx += ((tx - c.x) * 260 - c.vx * 18) * dt; c.vy += ((ty - c.y) * 260 - c.vy * 18) * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      const rot = (Math.random() - .5) * 40 * hit + (dx / dd) * near * 25, sc = 1 + near * .9 + hit * Math.random() * .5, sk = (Math.random() - .5) * 30 * hit;
      c.el.style.transform = `translate(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) skewX(${sk.toFixed(1)}deg) scale(${sc.toFixed(2)},${(sc * (1 + hit * .5 * Math.random())).toFixed(2)})`;
    }));
  }
}
