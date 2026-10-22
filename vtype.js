// Variable type on the big titles: letters near the cursor swell heavier, then settle back. Only the title you're over reacts.
const L = []; let mx = -1e4, my = -1e4, running = false;
const touch = matchMedia("(hover: none)").matches, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
function split(el) {
  if (el.dataset.vt) return; el.dataset.vt = 1;
  const have = el.querySelectorAll(".c"); if (have.length) { have.forEach((c) => L.push({ el: c, t: el, k: 0, w: null })); return; }
  const walk = (n) => { [...n.childNodes].forEach((c) => {
    if (c.nodeType === 3) { const f = document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach((w) => { if (!w) return; if (/^\s+$/.test(w)) { f.appendChild(document.createTextNode(w)); return; }
        const wd = document.createElement("span"); wd.className = "vw"; [...w].forEach((ch) => { const i = document.createElement("span"); i.className = "vt"; i.textContent = ch; wd.appendChild(i); L.push({ el: i, t: el, k: 0, w: null }); }); f.appendChild(wd); });
      c.replaceWith(f); }
    else if (c.nodeType === 1 && !c.matches("em,svg,img,video")) walk(c); }); };
  walk(el);
}
function tick() {
  for (let i = L.length - 1; i >= 0; i--) {
    const o = L[i]; if (!o.el.isConnected) { L.splice(i, 1); continue; }
    const tr = o.t.getBoundingClientRect(); if (tr.bottom < 0 || tr.top > innerHeight) continue;
    let e = 0;
    if (mx >= tr.left - 20 && mx <= tr.right + 20 && my >= tr.top - 10 && my <= tr.bottom + 10) { const r = o.el.getBoundingClientRect(), R = Math.max(90, tr.height * 2.2), d = Math.hypot(r.left + r.width / 2 - mx, r.top + r.height / 2 - my), t = Math.max(0, 1 - d / R); e = t * t * (3 - 2 * t); }
    o.k += (e - o.k) * .22; const w = Math.round(o.k * 100);
    if (o.w !== w) { o.w = w; o.el.style.fontVariationSettings = w ? `"wght" ${Math.round(620 + w * 2.8)}` : ""; }
  }
  requestAnimationFrame(tick);
}
export function vtype(sel, root = document) {
  if (touch || reduce) return;
  root.querySelectorAll(sel).forEach(split);
  if (!running) { running = true; requestAnimationFrame(tick); }
}
