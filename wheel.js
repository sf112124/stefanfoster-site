// The index on a curve. It doesn't scroll: the names sit still on the arc and the type itself reacts to your hand.
// Letters near the cursor swell out into wide, heavy type and lift a little; the rest of the word stays calm.
// Click a name to open it.
export class Wheel {
  constructor(el, projects, { onFocus, onPick, reduce = false } = {}) {
    Object.assign(this, { el, projects, onFocus, onPick, reduce });
    this.armed = -1; this.lastType = "mouse";
    this.items = projects.map((p, i) => {
      const a = document.createElement("a");
      a.href = `#${p.slug}`; a.className = "wi";
      a.innerHTML = `<span class="wn mono">${String(i + 1).padStart(2, "0")}</span><span class="wt">${[...p.title].map((c) => (c === " " ? `<i class="sp"> </i>` : `<i>${c}</i>`)).join("")}</span><span class="wc mono">${p.client}</span>`;
      a.addEventListener("pointerenter", (e) => { if (e.pointerType === "touch") return; this.over = i; this.onFocus?.(i); });
      a.addEventListener("pointerleave", (e) => { if (e.pointerType === "touch") return; if (this.over === i) { this.over = -1; } });
      a.addEventListener("focus", () => { if (this.lastType === "touch") return; this.over = i; this.onFocus?.(i); });
      a.addEventListener("click", (e) => { e.preventDefault(); if (this.lastType === "touch") return; this.onPick?.(i); });
      el.appendChild(a);
      a.chars = [...a.querySelectorAll(".wt i:not(.sp)")].map((c) => ({ c, g: 0 }));
      return a;
    });
    this.over = -1; this.target = 0; this.mx = -1e4; this.my = -1e4;
    this.k = projects.map(() => 0);
    this.fs = parseFloat(getComputedStyle(this.items[0]).fontSize) || 40; this.H = el.clientHeight; this.R = Math.max(this.H * .8, 420);
    addEventListener("pointermove", (e) => { this.mx = e.clientX; this.my = e.clientY; });
    el.addEventListener("pointerleave", (e) => { if (e.pointerType === "touch") return; this.over = -1; this.onFocus?.(null); });
    // on a phone you scrub the list with your thumb: the type swells under it and the grid shows that project.
    // Let go on a name to hold it there; tap the held name again to open it.
    addEventListener("pointerdown", (e) => { this.lastType = e.pointerType; }, true);
    el.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "touch") return;
      e.target.releasePointerCapture?.(e.pointerId);
      this.mx = e.clientX; this.my = e.clientY;
      const i = this.hit(e); this.td = { x: e.clientX, y: e.clientY, i, moved: false, was: this.armed };
      if (i >= 0) { this.over = i; this.onFocus?.(i); }
    });
    addEventListener("pointermove", (e) => {
      const d = this.td; if (!d || e.pointerType !== "touch") return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) d.moved = true;
      const i = this.hit(e);
      if (i >= 0 && i !== this.over) { this.over = i; this.onFocus?.(i); }
    });
    const up = (e) => {
      const d = this.td; if (!d || e.pointerType !== "touch") return;
      this.td = null; const i = this.hit(e);
      this.over = -1;
      // phones have no grid to preview into, so a tap on a name goes straight in
      if (i >= 0 && !d.moved && (this.compact || d.was === i)) { this.onPick?.(i); return; }
      const k = i >= 0 ? i : d.i >= 0 && !d.moved ? d.i : -1;
      if (k >= 0) { this.onFocus?.(k); this.armed = k; this.target = k; this.lit = true; }
      this.mx = this.my = -1e4;
    };
    addEventListener("pointerup", up); addEventListener("pointercancel", up);
    requestAnimationFrame(this.frame);
  }
  get hovering() { return this.over >= 0; }
  get compact() { return innerWidth <= 700; }
  hit(e) { const a = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".wi"); return a ? this.items.indexOf(a) : -1; }
  set(i) { this.target = i; this.lit = i != null; if (i == null) this.armed = -1; }
  // the right edge of the space the type needs at a given height: the curve plus the longest name, with room to swell
  band(y) {
    if (!this.H || this.compact) return 0;
    if (!this.maxW) this.maxW = Math.max(...this.items.map((a) => a.querySelector(".wt").offsetWidth)) * 1.2 + 40;
    const R = this.R || 500, dy = Math.max(-R, Math.min(R, y - this.H / 2)), th = Math.asin(dy / R);
    return 64 + R * (1 - Math.cos(th)) + this.maxW * Math.max(.35, Math.cos(th));
  }
  frame = (now) => {
    if (!this.H || !this.fs || this._h !== innerHeight + innerWidth) { this._h = innerHeight + innerWidth; this.maxW = 0; this.fs = parseFloat(getComputedStyle(this.items[0]).fontSize) || 40; this.H = this.el.clientHeight; }
    const H = this.H, fs = this.fs, n = this.items.length, R = (this.R = Math.max(H * .8, 420)), step = (this.compact ? Math.min(fs * 1.75, (H * .8) / n) : fs * 1.3) / R, x0 = this.compact ? 14 : 64, mid = (n - 1) / 2, t = now / 1000;
    const er = this.el.getBoundingClientRect(), ly = this.my - er.top, lx = this.mx - er.left;
    this.items.forEach((a, i) => {
      // not fixed, not scrolling: the arc breathes slowly, and the names near your hand lean out towards it
      const th = (i - mid) * step * (1 + .035 * Math.sin(t * .35)), y = H / 2 + R * Math.sin(th);
      const near = lx > -40 && lx < (this.maxW || 500) + 120 && ly > -40 && ly < H + 40 && !this.reduce ? Math.exp(-((ly - y) ** 2) / (fs * fs * 2.6)) : 0;
      a.pull = (a.pull || 0) + (near - (a.pull || 0)) * .1;
      const x = x0 + R * (1 - Math.cos(th)) + a.pull * fs * .9 + (this.reduce ? 0 : Math.sin(t * .5 + i * 1.3) * 3);
      const on = this.over === i || (this.over < 0 && this.target === i && this.lit);
      this.k[i] += ((this.over === i ? 1 : this.target === i && this.over < 0 && this.lit ? .5 : 0) - this.k[i]) * .15;
      const k = this.k[i];
      a.style.transform = `translate(${x}px,${y - fs * .6}px) rotate(${th * (1 - a.pull * .5)}rad)`;
      a.style.setProperty("--k", k.toFixed(3));
      a.classList.toggle("on", on);
      // each letter swells by how close your cursor is to it: wide and heavy near your hand, calm further off
      a.chars.forEach((ch, j) => {
        let want = 0;
        if ((this.over === i || (this.td && this.armed === i && this.over < 0)) && !this.reduce) {
          const r = ch.c.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const d = Math.hypot(this.mx - cx, (this.my - cy) * 1.6);
          want = Math.exp(-(d * d) / (fs * fs * 3.2));
        }
        ch.g += (want - ch.g) * .16;
        const g = ch.g;
        ch.c.style.fontVariationSettings = `"wdth" ${(100 + g * (this.compact ? 32 : 50) - (this.over === i ? (1 - g) * 12 : 0)).toFixed(1)}, "wght" ${(420 + k * 120 + g * 330).toFixed(0)}`;
      });
    });
    requestAnimationFrame(this.frame);
  };
  bindClick() {}
}
