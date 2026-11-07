// An easter egg: hover a project's title and it turns into the death-metal version of itself (Morveth, first and last
// letters as capitals), swells up and shakes on a thrash tempo, flinching away from the pointer. Leave and it's itself again.
const ON = matchMedia("(hover: hover) and (pointer: fine)").matches;
if (ON) {
  const BEAT = 60 / 130.72;
  let h1 = null, chars = [], P = { x: 0, y: 0 }, t0 = 0, raf = 0;
  addEventListener("pointermove", (e) => { P.x = e.clientX; P.y = e.clientY; }, { passive: true });
  document.addEventListener("pointerover", (e) => {
    const t = e.target.closest && e.target.closest("#pj .pj-t");
    if (t && t !== h1 && !t.closest(".ab")) start(t);
  });
  document.addEventListener("pointerout", (e) => { if (h1 && !h1.contains(e.relatedTarget)) stop(); });
  function start(t) {
    h1 = t; chars = [...t.querySelectorAll(".c")].map((el) => ({ el, txt: el.textContent, x: 0, y: 0, vx: 0, vy: 0 }));
    // lower case, except the first and last letter, which carry the big spikes
    const letters = chars.filter((c) => /\p{L}/u.test(c.txt));
    letters.forEach((c, k) => { const s = c.txt.normalize("NFD").replace(/[̀-ͯ]/g, ""); c.el.textContent = k === 0 || k === letters.length - 1 ? s.toUpperCase() : s.toLowerCase(); });
    t.classList.add("metal"); t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
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
      const tx = (Math.random() - .5) * j + dx / dd * near * 8, ty = (Math.random() - .5) * j * 1.4 + dy / dd * near * 34;
      c.vx += ((tx - c.x) * 260 - c.vx * 18) * dt; c.vy += ((ty - c.y) * 260 - c.vy * 18) * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      const rot = (Math.random() - .5) * 26 * amp, sk = (Math.random() - .5) * 20 * amp, sc = 1 + near * .45 + amp * Math.random() * .25;
      c.el.style.transform = `translate(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) skewX(${sk.toFixed(1)}deg) scale(${sc.toFixed(2)},${(sc * (1 + amp * .35 * Math.random())).toFixed(2)})`;
    });
  }
  addEventListener("hashchange", stop);
}
