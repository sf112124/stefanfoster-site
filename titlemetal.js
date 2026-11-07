// An easter egg: hover a project's title and it turns into the death-metal version of itself (Morveth, first and last
// letters as capitals), swells up and shakes on a thrash tempo. Leave and it's itself again.
const ON = matchMedia("(hover: hover) and (pointer: fine)").matches;
if (ON) {
  const BEAT = 60 / 130.72;
  let h1 = null, chars = [], P = { x: 0, y: 0 }, t0 = 0, raf = 0;
  // in and out are judged by where the letters actually are, not by the heading's box: it switches on when you touch the
  // title's letters, and stays on until you leave the big metal letters, which is bigger than the old one, so it can't flicker
  const box = (els, pad) => { let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity; els.forEach((e) => { const q = e.getBoundingClientRect(); if (!q.width) return; l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); }); return { l: l - pad, t: t - pad, r: r + pad, b: b + pad }; };
  const inside = (q) => q && P.x >= q.l && P.x <= q.r && P.y >= q.t && P.y <= q.b;
  let pend = 0, rest = null, restFor = null;
  addEventListener("pointermove", (e) => { P.x = e.clientX; P.y = e.clientY; if (!pend) pend = requestAnimationFrame(check); }, { passive: true });
  addEventListener("scroll", () => { if (!pend) pend = requestAnimationFrame(check); }, { passive: true });
  function check() {
    pend = 0;
    if (h1) { if (!h1.isConnected || (performance.now() - t0 > 400 && !inside(box([...h1.querySelectorAll(".c")], 14)))) stop(); return; }
    const t = document.querySelector("#pj .pj-t"); if (!t || t.closest(".ab")) return;
    // the letters' resting footprint, taken once per title (the hover weight effect stretches them later, which would
    // make the trigger area creep towards the pointer)
    const hb = t.getBoundingClientRect();
    if (t !== restFor) { restFor = t; const q = box([...t.querySelectorAll(".wd")], 2); rest = { l: q.l - hb.left, t: q.t - hb.top, r: q.r - hb.left, b: q.b - hb.top }; }
    const q = { l: hb.left + rest.l, t: hb.top + rest.t, r: hb.left + rest.r, b: hb.top + rest.b }; if (inside(q)) start(t);
  }
  function start(t) {
    h1 = t; chars = [...t.querySelectorAll(".c")].map((el) => ({ el, txt: el.textContent, x: 0, y: 0, vx: 0, vy: 0 }));
    const span = () => { let l = Infinity, r = -Infinity; t.querySelectorAll(".wd").forEach((w) => { const b = w.getBoundingClientRect(); l = Math.min(l, b.left); r = Math.max(r, b.right); }); return r - l; };
    t.style.setProperty("--ms", 1); const w0 = span();
    // lower case, except the first and last letter, which carry the big spikes
    const letters = chars.filter((c) => /\p{L}/u.test(c.txt));
    letters.forEach((c, k) => { const s = c.txt.normalize("NFD").replace(/[̀-ͯ]/g, ""); c.el.textContent = k === 0 || k === letters.length - 1 ? s.toUpperCase() : s.toLowerCase(); });
    // make the metal version come out clearly bigger than the title it replaces
    const fit = () => { if (h1 !== t) return; t.classList.add("measuring"); const w1 = span() || 1; t.classList.remove("measuring"); t.style.setProperty("--ms", Math.min(3.2, (w0 * 1.35) / w1).toFixed(3)); };
    t.classList.add("metal"); fit(); document.fonts.load("40px Morveth").then(fit);
    t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }
  function stop() {
    const t = h1; h1 = null; cancelAnimationFrame(raf); if (!t) return;
    t.classList.remove("metal"); chars.forEach((c) => { c.el.textContent = c.txt; c.el.style.transform = ""; });
  }
  let last = 0;
  function frame(now) {
    if (!h1 || !h1.isConnected) return stop(); raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    const bp = (now - t0) / 1000 / BEAT, hit = Math.pow(1 - (bp % 1), 3), R = 160;
    chars.forEach((c) => {
      const b = c.el.getBoundingClientRect(), cx = b.left + b.width / 2 - c.x, cy = b.top + b.height / 2 - c.y, dx = cx - P.x, dy = cy - P.y, dd = Math.hypot(dx, dy) || 1, near = Math.exp(-(dd * dd) / (R * R));
      const amp = hit * .8 + .35, j = amp * (6 + 16 * Math.random());
      const tx = (Math.random() - .5) * j, ty = (Math.random() - .5) * j * 1.4;
      c.vx += ((tx - c.x) * 260 - c.vx * 18) * dt; c.vy += ((ty - c.y) * 260 - c.vy * 18) * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      const rot = (Math.random() - .5) * 26 * amp, sk = (Math.random() - .5) * 20 * amp, sc = 1 + amp * Math.random() * .25;
      c.el.style.transform = `translate(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) skewX(${sk.toFixed(1)}deg) scale(${sc.toFixed(2)},${(sc * (1 + amp * .35 * Math.random())).toFixed(2)})`;
    });
  }
  addEventListener("hashchange", stop);
}
