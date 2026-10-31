// The splash: STEFAN FOSTER in Syne, tiled wall to wall a hairline apart. Wherever the pointer is (or wherever the phone
// tilts) the letters swell and the rest give up room. ENTER sits in the seam between the two words and lets you in.
const root = document.getElementById("splash");
if (root && !document.documentElement.classList.contains("splashing")) root.remove();
else if (root) {
  const cv = root.querySelector("canvas"), g = cv.getContext("2d"), btn = root.querySelector(".sp-enter");
  const FAM = "Syne", WGT = 800, TXT = "STEFANFOSTER";
  const INK = "#fff";
  const font = (px) => `${WGT} ${px}px "${FAM}", system-ui, sans-serif`;
  let ink = null, W = 0, H = 0, dpr = 1, alive = true;

  const measure = () => {
    const m = document.createElement("canvas").getContext("2d"); m.font = font(200); const o = {};
    [...new Set(TXT + "ENTER")].concat(["ENTER"]).forEach((ch) => { const t = m.measureText(ch); o[ch] = { l: t.actualBoundingBoxLeft, r: t.actualBoundingBoxRight, a: t.actualBoundingBoxAscent, d: t.actualBoundingBoxDescent }; });
    // find the stroke closest to the middle of ENTER (the stem of its T), for the camera to push through on the way out
    const c = document.createElement("canvas"), q = o.ENTER, iw = Math.ceil(q.l + q.r), ih = Math.ceil(q.a + q.d); c.width = iw; c.height = ih;
    const cg = c.getContext("2d", { willReadFrequently: true }); cg.font = font(200); cg.fillText("ENTER", q.l, q.a);
    const row = Math.round(ih * .62), d = cg.getImageData(0, row, iw, 1).data, runs = []; let a = -1;
    for (let x = 0; x <= iw; x++) { const on = x < iw && d[x * 4 + 3] > 128; if (on && a < 0) a = x; if (!on && a >= 0) { runs.push([a, x]); a = -1; } }
    const mid = runs.sort((m, n) => Math.abs((m[0] + m[1]) / 2 - iw / 2) - Math.abs((n[0] + n[1]) / 2 - iw / 2))[0] || [iw / 2 - 5, iw / 2 + 5];
    o.dive = { fx: (mid[0] + mid[1]) / 2 / iw, fy: .62, fw: Math.max(2, mid[1] - mid[0]) / iw };
    ink = o;
  };
  document.fonts.load(font(200), TXT + "ENTER").then(measure, measure);
  const aspect = (ch) => { const q = ink[ch]; return (q.l + q.r) / (q.a + q.d); };
  const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); };
  addEventListener("resize", resize); resize();

  // the pointer as a smooth field: where it is (0..1 across and down) and how present it is
  const P = { u: .5, v: .5, on: 0, tu: .5, tv: .5, ton: 0, uF: .5, uS: .5, vF: .5, vS: .5, onF: 0, onS: 0 };
  let touching = false;
  const at = (e) => { P.tu = e.clientX / W; P.tv = e.clientY / H; P.ton = 1; };
  root.addEventListener("pointermove", at); root.addEventListener("pointerdown", (e) => { touching = e.pointerType !== "mouse"; at(e); if (!e.target.closest(".sp-enter")) askTilt(); });
  root.addEventListener("pointerleave", () => { if (!tilting) P.ton = 0; });
  addEventListener("pointerup", () => { touching = false; if (!tilting && matchMedia("(hover: none)").matches) P.ton = 0; });

  // on a phone, tilting it moves the field: left/right across the word, towards/away from you up and down
  let tilting = false, beta0 = null, asked = false;
  const onTilt = (e) => {
    if (e.gamma == null || e.beta == null || touching) return;
    if (beta0 == null) beta0 = Math.max(20, Math.min(70, e.beta));
    tilting = true; P.ton = 1;
    P.tu = Math.min(1, Math.max(0, .5 + e.gamma / 50)); P.tv = Math.min(1, Math.max(0, .5 + (e.beta - beta0) / 40));
  };
  function askTilt() {
    if (asked || !matchMedia("(hover: none)").matches) return; asked = true;
    const D = window.DeviceOrientationEvent;
    root.classList.add("asked");
    if (D && typeof D.requestPermission === "function") D.requestPermission().then((s) => { if (s === "granted") addEventListener("deviceorientation", onTilt); }).catch(() => {});
    else addEventListener("deviceorientation", onTilt);
  }
  // Android and older iPhones don't need asking
  const needsAsk = !!(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function");
  if (matchMedia("(hover: none)").matches) { if (needsAsk) root.classList.add("ask"); else { asked = true; addEventListener("deviceorientation", onTilt); } }

  const cut = {}; let last = performance.now(), outAt = 0, cam = { ax: 0, ay: 0, s: 1 };
  function frame(now) {
    if (!alive) return; requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!ink) return;
    // like pushing through honey: a small part of the move happens at once, the rest follows slowly and heavily
    const ef = 1 - Math.exp(-dt * 16), es = 1 - Math.exp(-dt * 1.7);
    if (!outAt) for (const c of ["u", "v", "on"]) { const t = P["t" + c]; P[c + "F"] += (t - P[c + "F"]) * ef; P[c + "S"] += (t - P[c + "S"]) * es; P[c] = P[c + "F"] * .28 + P[c + "S"] * .72; }
    const ease = 1 - Math.exp(-dt * 7);

    const tall = H > W * 1.05, LN = tall ? ["STE", "FAN", "FOS", "TER"] : ["STEFAN", "FOSTER"], n = LN.length, seam = n / 2 - 1;
    const gap = Math.max(2, Math.round(Math.min(W, H) * .0045)), x0 = gap, x1 = W - gap, y0 = gap, y1 = H - gap;
    // the lines share the height: the one nearest the pointer swells, the others give it up
    const rw = LN.map((_, r) => 1 + 1.6 * P.on * Math.exp(-Math.pow((P.v - (r + .5) / n) / .28, 2)));
    const rtot = rw.reduce((s, v) => s + v, 0), avail = y1 - y0 - gap * (n - 1), rowsY = [];
    { let y = y0; rw.forEach((w) => { const h = avail * w / rtot; rowsY.push([y, h]); y += h + gap; }); }
    // ENTER: the same type at a fixed size, riding the seam between the two words
    const eq = ink.ENTER, easp = (eq.l + eq.r) / (eq.a + eq.d), eh = Math.max(18, Math.min(W, H) * .068), ew = eh * easp;
    const ot = outAt ? (now - outAt) / 1000 : 0;
    const seamY = rowsY[seam][0] + rowsY[seam][1] + gap / 2, ex = (W - ew) / 2, ey = seamY - eh / 2;
    Object.assign(btn.style, { left: ex - 8 + "px", top: ey - 8 + "px", width: ew + 16 + "px", height: eh + 16 + "px" });

    if (outAt) {
      // a slow push straight into the middle of ENTER, gathering speed, everything sliding out past the edges
      const dv = ink.dive, z = Math.min(1, ot / 2.1), zE = Math.pow(z, 2.4);
      if (!cam.set) { cam.set = 1; cam.ax = ex + ew * dv.fx; cam.ay = ey + eh * dv.fy; }
      cam.s = Math.exp(Math.log(2.6 * Math.hypot(W, H) / Math.max(1, ew * dv.fw)) * zE);
      cam.fade = 1 - Math.min(1, Math.max(0, (z - .04) / .5)) ** 1.2;
      if (z >= 1) { finish(); return; }
    }
    const S = cam.s, X = (v) => cam.ax + (v - cam.ax) * S, Y = (v) => cam.ay + (v - cam.ay) * S;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    if (outAt) { g.fillStyle = "#000"; g.fillRect(0, 0, W, H); }
    g.fillStyle = INK; g.font = font(200);
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.rect(X(ex - gap), Y(ey - gap), (ew + gap * 2) * S, (eh + gap * 2) * S); g.clip("evenodd");
    LN.forEach((word, r) => {
      // across the line: each letter's own width, swollen where the pointer is (judged from its resting place, so nothing chases itself)
      const chars = [...word], nat = chars.map(aspect), ntot = nat.reduce((s, v) => s + v, 0);
      const near = Math.exp(-Math.pow((P.v - (r + .5) / n) / .3, 2));
      let acc = 0; const k = chars.map((ch, i) => { const c = (acc + nat[i] / 2) / ntot; acc += nat[i]; return nat[i] * (1 + 2.6 * P.on * near * Math.exp(-Math.pow((P.u - c) / .17, 2))); });
      const ktot = k.reduce((s, v) => s + v, 0), inner = x1 - x0 - gap * (chars.length - 1), [ry, rh] = rowsY[r];
      // the cuts between letters; next to ENTER, any cut that comes near one of its ends is drawn onto it
      const cuts = [x0]; { let x = x0; k.forEach((v) => { x += inner * v / ktot + gap; cuts.push(x); }); }
      if (r === seam || r === seam + 1) {
        const sig = inner / chars.length * .32, el = ex - gap, er = ex + ew + gap * 2;
        for (let j = 1; j < chars.length; j++) { let b = cuts[j]; for (const e of [el, er]) { const d = e - b; b += d * Math.exp(-(d * d) / (sig * sig)); } cuts[j] = Math.min(cuts[j + 1] - gap - 4, Math.max(cuts[j - 1] + 4, b)); }
      }
      chars.forEach((ch, i) => {
        const x = cuts[i], w = cuts[i + 1] - gap - x; let y = ry, h = rh;
        // letters over and under ENTER ease out of its way
        const key = r * 10 + i, over = x < ex + ew + gap && x + w > ex - gap;
        cut[key] = cut[key] ?? (over ? 1 : 0); cut[key] += ((over ? 1 : 0) - cut[key]) * (1 - Math.exp(-dt * 22));
        const f = cut[key] * cut[key] * (3 - 2 * cut[key]);
        if (f > 0) { if (r === seam) h -= f * (ry + rh - (ey - gap)); else if (r === seam + 1) { const c = ey + eh + gap - ry; y += f * c; h -= f * c; } }
        draw(ch, X(x), Y(y), w * S, h * S);
      });
    });
    g.restore();
    // leaving, ENTER becomes a window straight through to the site underneath, its white melting away as we push in
    if (outAt) { g.globalCompositeOperation = "destination-out"; draw("ENTER", X(ex), Y(ey), ew * S, eh * S); g.globalCompositeOperation = "source-over"; g.globalAlpha = cam.fade; }
    draw("ENTER", X(ex), Y(ey), ew * S, eh * S); g.globalAlpha = 1;
  }
  function draw(ch, x, y, w, h) {
    const q = ink[ch], iw = q.l + q.r, ih = q.a + q.d; if (w < 1 || h < 1) return;
    const sx = w / iw, sy = h / ih;
    g.setTransform(dpr * sx, 0, 0, dpr * sy, dpr * (x + q.l * sx), dpr * (y + q.a * sy)); g.fillText(ch, 0, 0);
  }
  requestAnimationFrame(frame);

  // in: ENTER swells and shoves the name aside, then you fall through the E into the site
  const enter = () => {
    if (outAt) return;
    outAt = performance.now(); root.classList.add("go"); document.documentElement.classList.remove("splashing");
    try { sessionStorage.setItem("splashed", "1"); } catch (e) {}
  };
  function finish() { alive = false; removeEventListener("deviceorientation", onTilt); root.remove(); }
  btn.addEventListener("click", enter);
  // keys belong to the splash while it's up: Enter or Space lets you in, and nothing reaches the site underneath
  const keys = (e) => { if (!root.isConnected) return removeEventListener("keydown", keys, true); e.stopImmediatePropagation(); if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enter(); } };
  addEventListener("keydown", keys, true);
}
