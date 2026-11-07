// HELL: hover a name on the index and you fall into thrash metal hell. The page strobes red and
// black, the hovered project's footage melts behind everything in two burnt colours, every name blows up huge in a
// metal face and shakes to the track. Move off the names and it stops dead. Click a name to escape into it.
// on for everyone on a desktop; add ?nohell to the address to see the index without it
const ON = !/[?&]nohell\b/.test(location.search) && matchMedia("(hover: hover) and (pointer: fine)").matches;
if (ON) {
  const TRACK = "media/hell/hell.mp3";
  let ac = null, buf = null, src = null, gain = null, an = null, bins = null, active = false, cur = -1, leaveT = 0, energy = 0, hit = 0, beat = -1, startAt = 0;
  // the track's own grid, measured from the file: 130.7 bpm, first beat 33ms in, four beats to the bar
  const BEAT = 60 / 130.72, PHASE = .033;
  const loadTrack = () => fetch(TRACK).then((r) => r.arrayBuffer()).then((b) => { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); return ac.decodeAudioData(b); }).then((d) => (buf = d)).catch(() => {});
  loadTrack();
  // the browser holds sound back until the first click or key on the page
  const unlock = () => { if (ac && ac.state !== "running") ac.resume(); };
  addEventListener("pointerdown", unlock, true); addEventListener("keydown", unlock, true);

  // ---------- the layer ----------
  const root = document.createElement("div"); root.id = "hell"; root.setAttribute("aria-hidden", "true");
  root.innerHTML = `<canvas class="hl-bg"></canvas><div class="hl-strobe"></div><div class="hl-list"></div><div class="hl-grain"></div>`;
  // film grain over everything, type included: a tile of noise that jumps to a new spot every frame
  { const g = document.createElement("canvas"); g.width = g.height = 220; const x = g.getContext("2d"), d = x.createImageData(220, 220);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); root.querySelector(".hl-grain").style.backgroundImage = `url(${g.toDataURL()})`; }
  document.body.appendChild(root);
  const cv = root.querySelector("canvas"), listEl = root.querySelector(".hl-list"), strobe = root.querySelector(".hl-strobe");
  let rows = [], LIST = [];

  function build() {
    LIST = [...document.querySelectorAll(".tun-list a")];
    listEl.innerHTML = "";
    rows = LIST.map((a, i) => {
      // the metal way: everything lower case except the first and last letter, which carry the big spikes
      const raw = a.querySelector(".t").textContent.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(), at = [...raw].map((c, k) => (/[a-z]/.test(c) ? k : -1)).filter((k) => k >= 0);
      const title = [...raw].map((c, k) => (k === at[0] || k === at[at.length - 1] ? c.toUpperCase() : c)).join(""), el = document.createElement("div"); el.className = "hl-row";
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
    const p = a && (a.__p || window.__tunEat?.list?.[+a.dataset.i]); if (!p) return;
    const box = document.createElement("div"); box.innerHTML = window.__tunEat?.media(p) || "";
    const v = box.querySelector("video"), im = box.querySelector("img");
    if (v) { const nv = document.createElement("video"); nv.muted = true; nv.loop = true; nv.playsInline = true; nv.crossOrigin = "anonymous"; nv.src = v.dataset.src || v.src; nv.play().catch(() => {}); media = nv; }
    else if (im) { const ni = new Image(); ni.src = im.src || im.dataset.src; media = ni; }
  }

  // ---------- in and out ----------
  // it has to be meant: the pointer just sitting there (say, where you clicked ENTER on the splash) or a tiny nudge
  // does nothing; a proper move of the mouse, wherever it already is, sets it off
  let armed = false, lastI = -1, moved = 0, px = null, py = null;
  addEventListener("pointermove", (e) => {
    if (armed) return;
    if (document.getElementById("splash")) { px = py = null; moved = 0; return; }
    if (px != null) moved += Math.hypot(e.clientX - px, e.clientY - py); px = e.clientX; py = e.clientY;
    if (moved > 45) { armed = true; if (lastI >= 0 && !active && !leaving) enter(lastI); }
  }, { passive: true });
  addEventListener("tunhover", (e) => {
    const { i, p, a } = e.detail; if (a) a.__p = p; lastI = i;
    if (i >= 0 && armed && !active && !leaving && !document.documentElement.classList.contains("devouring")) enter(i);
  });
  function enter(i) {
    if (!rows.length) build();
    active = true; cur = -1; leaveT = 0; want = i; wantAt = 0; document.documentElement.classList.add("in-hell");
    // each metal name sits on the same line as its name in the index, so whatever you hovered stays under your pointer
    const ys = LIST.map((a) => { const b = a.getBoundingClientRect(); return b.top + b.height / 2; }), pitch = ys.length > 1 ? (ys[ys.length - 1] - ys[0]) / (ys.length - 1) : 60;
    listEl.style.fontSize = Math.min(pitch * 1.7, innerWidth * .095) + "px"; pitchPx = pitch;
    rows.forEach((r, k) => { r.big = 1; r.el.style.transition = r.el.style.transform = r.el.style.opacity = ""; r.el.style.top = ys[k] + "px"; r.chars.forEach((c) => { c.el.style.transition = ""; }); });
    swap(i);
    if (ac && buf && !window.__soundOff) { unlock(); gain = ac.createGain(); gain.gain.value = 1; an = ac.createAnalyser(); an.fftSize = 1024; bins = new Uint8Array(an.frequencyBinCount);
      src = ac.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(an); an.connect(gain); gain.connect(ac.destination); src.start(); startAt = ac.currentTime; }
    requestAnimationFrame(frame);
  }
  let want = -1, wantAt = 0, leaving = false, pitchPx = 60;
  function swap(i) { if (i === cur) return; cur = i; rows.forEach((r, k) => r.el.classList.toggle("hot", k === i)); footage(LIST[i]); }
  // out: the music and the whole takeover cut dead
  function exit(quick) {
    if (!active) return; active = false; leaving = true;
    if (gain) { const t = ac.currentTime; gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(0, t + .06); const s = src; setTimeout(() => { try { s.stop(); } catch (e) {} }, 120); }
    src = gain = an = null; if (media && media.pause) media.pause();
    // straight cut back to the normal page
    strobe.style.background = "transparent"; leaving = false; document.documentElement.classList.remove("in-hell");
    rows.forEach((r) => r.chars.forEach((c) => { c.x = c.y = c.vx = c.vy = 0; c.el.style.transform = ""; }));
  }
  function escape(i) { const a = LIST[i]; exit(true); if (a) a.click(); }
  // which name you're on is judged from where the lines sit, not from the jittering letters, so rolling between them is smooth
  const P = { x: innerWidth / 2, y: innerHeight / 2 };
  addEventListener("pointermove", (e) => { P.x = e.clientX; P.y = e.clientY; }, { passive: true });
  function under() {
    let best = -1, bd = Infinity;
    rows.forEach((r, k) => { const b = r.el.getBoundingClientRect(); if (P.x < b.left - 24 || P.x > b.right + 24) return; const d = Math.abs(P.y - (b.top + b.height / 2)); if (d < b.height * .7 && d < bd) { bd = d; best = k; } });
    return best;
  }
  root.addEventListener("pointerleave", () => exit());
  addEventListener("keydown", (e) => { if (active && e.key === "Escape") exit(); });
  addEventListener("hashchange", () => { if (active) exit(true); });
  addEventListener("soundswitch", (e) => { if (e.detail.off && gain) { gain.gain.setValueAtTime(0, ac.currentTime); } });

  // ---------- the frame ----------
  let last = performance.now(), t0 = performance.now();
  function frame(now) {
    if (!active) return; requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const k = under();
    if (k < 0) { if (!leaveT) leaveT = now; if (now - leaveT > 140) return exit(); }
    else { leaveT = 0; if (k !== want) { want = k; wantAt = now; } if (k !== cur && now - wantAt > 90) swap(k); }
    // where we are in the music: the beat grid for the strobe, the loudness for everything else
    const tt = src ? (ac.currentTime - startAt) % buf.duration : (now - t0) / 1000, bp = (tt - PHASE) / BEAT, b = Math.floor(bp), f = bp - b;
    if (b !== beat) { beat = b; hit = 1; }
    hit = Math.pow(1 - f, 3);
    if (an) { an.getByteFrequencyData(bins); let e = 0; for (let k = 1; k < 60; k++) e += bins[k]; energy += (e / (59 * 255) - energy) * .5; } else energy = .6;
    // strobe every other beat: STROBE 2 STROBE 4. On those beats the screen flashes hard, white and red, many times a second
    const one = ((b % 2) + 2) % 2 === 0, sf = Math.floor(f * 14), inv = 0;
    // no strobe: flashing light can trigger seizures, so the beat only moves things, it never flashes the screen
    // the footage
    if (gl) {
      const W = cv.clientWidth, H = cv.clientHeight, d = Math.min(1, devicePixelRatio || 1);
      if (cv.width !== Math.round(W * d * .5)) { cv.width = Math.round(W * d * .5); cv.height = Math.round(H * d * .5); }
      gl.viewport(0, 0, cv.width, cv.height);
      const ready = media && ((media.readyState >= 2) || (media.complete && media.naturalWidth));
      if (ready) { try { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, media); } catch (e) {} }
      const mw = media && (media.videoWidth || media.naturalWidth) || 16, mh = media && (media.videoHeight || media.naturalHeight) || 9;
      gl.uniform1f(U.t, (now - t0) / 1000); gl.uniform1f(U.k, Math.min(1, hit * .6 + energy * .8)); gl.uniform1f(U.inv, inv); gl.uniform1f(U.asp, (W / H) / (mw / mh)); gl.uniform2f(U.m, P.x / W, P.y / H);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    root.querySelector(".hl-grain").style.backgroundPosition = `${(Math.random() * 220) | 0}px ${(Math.random() * 220) | 0}px`;
    // the names: shaking on the kick, and blown apart wherever the pointer is
    const R = Math.min(innerWidth, innerHeight) * .22;
    // the name you're on stays readable: its letters stay upright and in line, and the whole word punches bigger on
    // the beat. Everything else goes mad around it.
    rows.forEach((r, ri) => {
      const isHot = ri === cur;
      // size eases between names as you move up and down, never pops; the one you're on swells to double and pumps
      // continuous, not per name: each name swells by how close the pointer is to its line, so sliding up and down
      // the list is one rolling bulge passing through it
      const rb = r.el.getBoundingClientRect(), ry = rb.top + rb.height / 2, d = (P.y - ry) / (pitchPx * .9), want = 1 + Math.exp(-d * d);
      r.big = (r.big ?? 1) + (want - (r.big ?? 1)) * (1 - Math.exp(-dt * 14));
      r.el.style.zIndex = String(10 + Math.round(r.big * 20));
      const lift = r.big - 1, pump = r.big + lift * (hit * .18 + energy * .06);
      r.el.style.transform = lift < .002 ? "" : `scale(${pump.toFixed(3)}) rotate(${((Math.random() - .5) * 3 * hit * lift).toFixed(2)}deg)`;
      r.chars.forEach((c) => {
        const b = c.el.getBoundingClientRect(), cx = b.left + b.width / 2 - c.x, cy = b.top + b.height / 2 - c.y, dx = cx - P.x, dy = cy - P.y, dd = Math.hypot(dx, dy) || 1, near = isHot ? 0 : Math.exp(-(dd * dd) / (R * R));
        // the hovered name screams too: it shakes, just a bit tighter than the rest so it still reads
        const amp = (hit * .7 + energy * .9) * (isHot ? .45 : 1), j = amp * (8 + 22 * Math.random()), tx = (Math.random() - .5) * j + dx / dd * near * 10, ty = (Math.random() - .5) * j * 1.5 + dy / dd * near * 46;
        c.vx += ((tx - c.x) * 260 - c.vx * 18) * dt; c.vy += ((ty - c.y) * 260 - c.vy * 18) * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        const rot = (Math.random() - .5) * 34 * amp + (dx / dd) * near * 14, sc = 1 + near * .55 + amp * Math.random() * .35, sk = (Math.random() - .5) * 26 * amp;
        c.el.style.transform = `translate(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) skewX(${sk.toFixed(1)}deg) scale(${sc.toFixed(2)},${(sc * (1 + amp * .45 * Math.random())).toFixed(2)})`;
      });
    });
  }
}
