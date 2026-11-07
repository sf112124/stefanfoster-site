// EYES (try it with ?eyes): hover a name on the index and every hole in its letters (the O's, a's, e's, the bowl of
// the R, the 3, the D) opens as an eye, filling the hole exactly. They follow the pointer and blink out of step.
const ON = /[?&]eyes\b/.test(location.search) && matchMedia("(hover: hover) and (pointer: fine)").matches;
if (ON) {
  const FONT = (px) => `600 ${px}px Geist, sans-serif`, INK = "#0c0c0c";
  const cache = {};
  // find a letter's holes: draw it big, flood the outside from the edges, and whatever paper is left over is a hole
  function holes(ch) {
    if (cache[ch]) return cache[ch];
    const px = 240, m = document.createElement("canvas").getContext("2d", { willReadFrequently: true }); m.font = FONT(px);
    const t = m.measureText(ch), pad = 8, l = Math.ceil(t.actualBoundingBoxLeft), w = Math.ceil(l + t.actualBoundingBoxRight) + pad * 2, a = Math.ceil(t.actualBoundingBoxAscent), h = Math.ceil(a + t.actualBoundingBoxDescent) + pad * 2;
    m.canvas.width = w; m.canvas.height = h; m.font = FONT(px); m.fillStyle = "#000"; m.fillText(ch, pad + l, pad + a);
    const d = m.getImageData(0, 0, w, h).data, ink = new Uint8Array(w * h), seen = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) ink[i] = d[i * 4 + 3] > 110 ? 1 : 0;
    const flood = (start, mark) => { const st = [start]; seen[start] = mark; const pts = []; while (st.length) { const i = st.pop(); pts.push(i); const x = i % w, y = (i / w) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && !seen[j] && !ink[j]) { seen[j] = mark; st.push(j); } } return pts; };
    flood(0, 1);
    const found = [];
    for (let i = 0; i < w * h; i++) if (!ink[i] && !seen[i]) { const pts = flood(i, 2); if (pts.length < 60) continue;
      let x0 = w, y0 = h, x1 = 0, y1 = 0, sx = 0, sy = 0; pts.forEach((p) => { const x = p % w, y = (p / w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); sx += x; sy += y; });
      // the hole as a white shape on its own little canvas
      const c = document.createElement("canvas"); c.width = x1 - x0 + 3; c.height = y1 - y0 + 3; const cg = c.getContext("2d"), id = cg.createImageData(c.width, c.height);
      pts.forEach((p) => { const x = p % w - x0 + 1, y = ((p / w) | 0) - y0 + 1, k = (y * c.width + x) * 4; id.data[k] = id.data[k + 1] = id.data[k + 2] = 255; id.data[k + 3] = 255; });
      cg.putImageData(id, 0, 0);
      found.push({ mask: c, x0: x0 - 1 - pad, y0: y0 - 1 - pad, cx: sx / pts.length - pad, cy: sy / pts.length - pad, rw: x1 - x0, rh: y1 - y0 });
    }
    return (cache[ch] = { px, l, a, holes: found });
  }
  const mt = document.createElement("canvas").getContext("2d");
  let row = null, P = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => { P.x = e.clientX; P.y = e.clientY; });
  addEventListener("tunhover", (e) => { const { i, a } = e.detail; if (row) close(); if (i >= 0 && a && !document.documentElement.classList.contains("in-hell") && !document.documentElement.classList.contains("devouring")) open(i, a); });

  addEventListener("hashchange", () => close());
  function open(i, a) {
    const t = a.querySelector(".t"); if (!t) return;
    t.dataset.txt = t.textContent;
    t.innerHTML = [...t.dataset.txt].map((ch) => `<span class="ey-ch">${ch === " " ? "&nbsp;" : ch.replace(/[<>&]/g, "")}</span>`).join("");
    const spans = [...t.children], eyes = [];
    spans.forEach((s) => { const H = holes(s.textContent); H.holes.forEach((h) => { const c = document.createElement("canvas"); c.className = "ey"; s.appendChild(c); eyes.push({ s, h, H, c, g: c.getContext("2d"), blink: 0, next: performance.now() + 600 + Math.random() * 2500 }); }); });
    a.classList.add("eyed"); window.__tunEat?.eat(i);
    row = { i, a, t, eyes }; requestAnimationFrame(frame);
  }
  function close() {
    const r = row; row = null; if (!r) return;
    r.a.classList.remove("eyed"); window.__tunEat?.uneat(r.i);
    if (r.t.dataset.txt != null) r.t.textContent = r.t.dataset.txt;
    r.t.style.transform = "";
  }
  function frame(now) {
    if (!row) return; requestAnimationFrame(frame);
    const r = row, g0 = window.__tunEat?.grow(r.i) || 0; r.t.style.transform = `scale(${1 + g0})`;
    const fs = parseFloat(getComputedStyle(r.t).fontSize) * (1 + g0); mt.font = FONT(100); const fm = mt.measureText("H"), asc = fm.fontBoundingBoxAscent / 100, dsc = fm.fontBoundingBoxDescent / 100;
    r.eyes.forEach((e) => {
      const k = fs / e.H.px, h = e.h, s = e.s.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      // where the hole sits inside this letter's box: the letter is drawn from its pen position, sitting on the baseline
      const base = (1 - (asc + dsc)) / 2 * fs + asc * fs;   // line-height 1: the baseline from the top of the box
      const left = (h.x0 - e.H.l) * k, top = base + (h.y0 - e.H.a) * k;
      const cw = h.mask.width * k, ch = h.mask.height * k;
      e.c.style.left = left / (1 + g0) + "px"; e.c.style.top = top / (1 + g0) + "px"; e.c.style.width = cw / (1 + g0) + "px"; e.c.style.height = ch / (1 + g0) + "px";
      const W = Math.max(2, Math.round(cw * dpr)), Hh = Math.max(2, Math.round(ch * dpr)); if (e.c.width !== W || e.c.height !== Hh) { e.c.width = W; e.c.height = Hh; }
      const g = e.g; g.clearRect(0, 0, W, Hh); g.globalCompositeOperation = "source-over"; g.drawImage(h.mask, 0, 0, W, Hh);
      // the pupil: as big as the hole allows, sliding toward the pointer, clipped by the hole's own shape
      g.globalCompositeOperation = "source-atop";
      const ex = s.left + left + cw * ((h.cx - h.x0) / h.mask.width), ey = s.top + top + ch * ((h.cy - h.y0) / h.mask.height);
      const ang = Math.atan2(P.y - ey, P.x - ex), dist = Math.min(1, Math.hypot(P.x - ex, P.y - ey) / 160);
      const pr = Math.min(W, Hh) * .27, px = (h.cx - h.x0) / h.mask.width * W + Math.cos(ang) * dist * (W / 2 - pr * .7), py = (h.cy - h.y0) / h.mask.height * Hh + Math.sin(ang) * dist * (Hh / 2 - pr * .7);
      g.fillStyle = INK; g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(px - pr * .3, py - pr * .35, pr * .28, 0, Math.PI * 2); g.fill();
      // blinking, each eye on its own clock
      if (now > e.next) { e.blink = 1; e.next = now + 1500 + Math.random() * 3500; }
      e.blink = Math.max(0, e.blink - .09); const lid = Math.sin(Math.min(1, e.blink) * Math.PI);
      if (lid > 0) { g.fillStyle = INK; g.fillRect(0, 0, W, Hh * lid); }
    });
  }
}
