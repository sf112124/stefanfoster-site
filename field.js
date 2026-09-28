// The grid: a technical field of points. Most are just coordinates; the ones that carry work are nodes.
// Hover a node and it opens into the piece while spokes shoot out to the rest of its project.
// Grab one and wiggle it: it's a pad.
const rng = (seed) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

export class Field {
  constructor(el, items, { reduce = false, touch = false, onHover, onOpen, onPad, onPadEnd, onMove, onLeave, onEmpty, band } = {}) {
    Object.assign(this, { el, items, reduce, touch, onHover, onOpen, onPad, onPadEnd, onMove, onLeave, onEmpty, band });
    this.trip = 0;
    this.cv = document.createElement("canvas"); this.cv.className = "net"; el.appendChild(this.cv);
    this.g = this.cv.getContext("2d");
    this.nodes = items.map((it, i) => this.node(it, i));
    this.hot = -1; this.focusSet = null; this.mx = -1e4; this.my = -1e4; this.drag = null; this.active = true;
    this.t0 = performance.now();
    new ResizeObserver(() => this.layout()).observe(el); this.layout();
    // fingers: a tap near a node grabs it (the dots are tiny), a tap on nothing lets go of whatever was open
    el.parentElement.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "touch" || e.target.closest(".node,.wi,a,button")) return;
      const r = this.el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > this.W || y > this.H) return;
      this.mx = x; this.my = y;
      let best = null, bd = this.sp * .7;
      this.nodes.forEach((n) => { const d = Math.hypot(n.x - x, n.y - y) - (n.o > .3 ? Math.max(n.w, n.h) / 2 : n.sib ? n.w / 2 : 0); if (d < bd) { bd = d; best = n; } });
      if (best) { e.preventDefault(); this.drag = { n: best, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false, lx: e.clientX, ly: e.clientY, lt: performance.now(), energy: 0 }; }
      else { this.setHot(-1); this.onEmpty?.(); }
    });
    addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") { const r = this.el.getBoundingClientRect(); this.mx = e.clientX - r.left; this.my = e.clientY - r.top; return; }
      const r = this.el.getBoundingClientRect(), inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (inside) this.move(e); else if (!this.drag && this.mx > -1e3) { this.mx = this.my = -1e4; this.setHot(-1); this.onLeave?.(); }
    });
    addEventListener("pointermove", (e) => this.dragMove(e));
    addEventListener("pointerup", (e) => this.dragEnd(e));
    addEventListener("pointercancel", (e) => this.dragEnd(e));
    requestAnimationFrame(this.frame);
  }
  node(it, i) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "node";
    b.setAttribute("aria-label", `${it.title}${it.caption ? ", " + it.caption : ""}`);
    b.innerHTML = `<span class="dm">` + (false ? "" : `<img src="${it.thumb}" alt="" draggable="false" decoding="async">${it.loop ? `<video muted loop playsinline preload="none"></video>` : ""}`) + `</span>`
      ;
    this.el.appendChild(b);
    // each node wears its own piece's colours: a tiny orb sampled from the work itself
    const img = b.querySelector("img");
    const n = { b, it, i, a: it.w / it.h, x: 0, y: 0, w: 0, h: 0, o: 0, bx: 0, by: 0, far: false };
    b.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      e.preventDefault(); b.setPointerCapture?.(e.pointerId);
      this.drag = { n, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false, lx: e.clientX, ly: e.clientY, lt: performance.now(), energy: 0 };
    });
    b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.onOpen?.(n.it, b); } });
    b.addEventListener("focus", () => this.setHot(i));
    return n;
  }
  tint(b, img) {
    try {
      const c = this.tc || (this.tc = Object.assign(document.createElement("canvas"), { width: 4, height: 4 })), x = c.getContext("2d", { willReadFrequently: true });
      x.clearRect(0, 0, 4, 4); x.drawImage(img, 0, 0, 4, 4);
      const d = x.getImageData(0, 0, 4, 4).data, avg = (rows) => { let r = 0, g = 0, bl = 0, n = 0; rows.forEach((y) => { for (let xx = 0; xx < 4; xx++) { const k = (y * 4 + xx) * 4; r += d[k]; g += d[k + 1]; bl += d[k + 2]; n++; } }); return [r / n, g / n, bl / n]; };
      const lift = (v, lo) => { const m = (v[0] + v[1] + v[2]) / 3, m2 = lo + (m / 255) * (235 - lo); return v.map((q) => Math.round(Math.max(0, Math.min(255, m2 + (q - m) * 1.7)))); };
      const a = lift(avg([0, 1]), 150), z = lift(avg([2, 3]), 105);
      b.style.setProperty("--c1", `rgb(${a})`); b.style.setProperty("--c2", `rgb(${z})`);
    } catch (e) {}
  }
  layout() {
    const W = this.el.clientWidth, H = this.el.clientHeight, N = this.nodes.length;
    // not laid out yet (styles still arriving): wait for the resize observer to call again
    if (W < 40 || H < 40) { this.W = this.W || 1; this.H = this.H || 1; this.pts = this.pts || []; return; }
    this.W = W; this.H = H;
    const dpr = Math.min(devicePixelRatio || 1, 2); this.cv.width = W * dpr; this.cv.height = H * dpr; this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // a regular lattice with roughly two points for every piece; the work sits on a scattered subset of it
    const sp = Math.sqrt((W * H) / (N * 3.4));
    let cols = Math.max(4, Math.floor(W / sp)), rows = Math.max(3, Math.floor(H / sp));
    while (cols * rows < N) rows++;
    const gx = W / cols, gy = H / rows;
    this.sp = Math.min(gx, gy);
    this.pts = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = gx * (c + .5), y = gy * (r + .5); this.pts.push({ x, y, used: false, fog: this.inBand(x, y) }); }
    const order = this.pts.map((_, k) => k).filter((k) => !this.pts[k].fog), rnd = rng(23);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    this.nodes.forEach((n, k) => {
      const p = this.pts[order[k % order.length]]; p.used = true;
      n.bx = p.x; n.by = p.y;
      if (!n.w) { n.x = n.bx; n.y = n.by; n.w = n.h = 10; }
    });
  }
  inBand(x, y) { return this.band ? x < this.band(y) : false; }
  move(e) {
    const r = this.el.getBoundingClientRect();
    this.mx = e.clientX - r.left; this.my = e.clientY - r.top;
    this.onMove?.(this.mx / this.W, this.my / this.H);
    if (this.drag) return;
    // over the index, the index has your hand; the grid leaves you alone
    if (this.inBand(this.mx, this.my) && !(this.hot >= 0 && Math.abs(this.mx - this.nodes[this.hot].x) < this.nodes[this.hot].w / 2 && Math.abs(this.my - this.nodes[this.hot].y) < this.nodes[this.hot].h / 2)) { this.setHot(-1); this.onLeave?.(); return; }
    let best = -1, bd = this.sp * .5;
    this.nodes.forEach((n, k) => { const d = Math.hypot(n.bx - this.mx, n.by - this.my); if (d < bd) { bd = d; best = k; } });
    if (best < 0 && this.hot >= 0) { const n = this.nodes[this.hot]; if (Math.abs(this.mx - n.x) < n.w / 2 && Math.abs(this.my - n.y) < n.h / 2) best = this.hot; }
    this.setHot(best);
  }
  setHot(k) {
    if (k === this.hot) return;
    const old = this.nodes[this.hot];
    if (old) { const v = old.b.querySelector("video"); if (v) this.park(v, old); old.b.classList.remove("hot", "live"); }
    this.hot = k;
    const n = this.nodes[k];
    if (n) {
      n.b.classList.add("hot");
      const v = n.b.querySelector("video");
      if (v && !this.reduce) { clearTimeout(v.park); if (!v.getAttribute("src")) v.src = n.it.loop; v.play().then(() => n.b.classList.add("live")).catch(() => {}); }
    }
    this.onHover?.(n ? n.it : null, n);
  }
  focus(pi) { this.focusSet = pi; }
  // pause a film, and if nobody comes back to it soon, let go of it completely so idle time doesn't pile up decoders
  park(v, n) {
    v.pause(); clearTimeout(v.park);
    v.park = setTimeout(() => { if (!n.sib && this.nodes[this.hot] !== n && v.getAttribute("src")) { v.removeAttribute("src"); v.load(); } }, 8000);
  }
  dragMove(e) {
    const d = this.drag; if (!d) return;
    const now = performance.now(), dist = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
    if (!d.moved && (dist > 6 || now - d.t0 > 260)) { d.moved = true; d.n.b.classList.add("held"); this.setHot(d.n.i); }
    const r = this.el.getBoundingClientRect();
    this.mx = e.clientX - r.left; this.my = e.clientY - r.top;
    const sp = Math.hypot(e.clientX - d.lx, e.clientY - d.ly) / Math.max(8, now - d.lt);
    d.energy += (Math.min(1, sp * .9) - d.energy) * .25;
    d.lx = e.clientX; d.ly = e.clientY; d.lt = now;
    if (d.moved) this.onPad?.(Math.max(0, Math.min(1, this.mx / this.W)), Math.max(0, Math.min(1, 1 - this.my / this.H)), d.energy, d.n.it);
  }
  dragEnd() {
    const d = this.drag; if (!d) return;
    this.drag = null; d.n.b.classList.remove("held");
    // on a finger the first tap opens the piece where it sits, the second one goes in
    if (!d.moved) { if (this.touch && this.hot !== d.n.i) this.setHot(d.n.i); else this.onOpen?.(d.n.it, d.n.b); }
    else this.onPadEnd?.();
  }
  setActive(on) { if (on === this.active) return; this.active = on; if (on) requestAnimationFrame(this.frame); else this.setHot(-1); }
  // the whole lattice breathes: slow crossing swells, and a ripple that spreads away from your hand
  wave(x, y, t) {
    const a = this.sp * .16 * (1 + this.trip * 1.4), d = Math.hypot(x - this.mx, y - this.my), rp = Math.exp(-(d * d) / (this.sp * this.sp * 5)) * this.sp * .35;
    const ux = d ? (x - this.mx) / d : 0, uy = d ? (y - this.my) / d : 0, ring = Math.sin(d * .045 - t * 3.2) * Math.exp(-d / (this.sp * 5)) * this.sp * .08;
    return [x + Math.sin(y * .011 + t * .55) * a + Math.sin((x + y) * .006 - t * .3) * a * .6 + ux * (rp + ring), y + Math.cos(x * .009 + t * .45) * a + Math.sin((x - y) * .007 + t * .35) * a * .6 + uy * (rp + ring)];
  }
  frame = (now) => {
    if (!this.active) return;
    const t = (now - this.t0) / 1000, hot = this.nodes[this.hot], drag = this.drag && this.drag.moved ? this.drag : null;
    const k = this.reduce ? 1 : .18, fam = hot ? hot.it.pi : this.focusSet, big = this.W < 700 ? Math.min(this.W * .82, this.H * .6) : Math.min(this.W, this.H) * .46, sibS = Math.min(58, this.sp * 1.5), dot = this.touch ? 12 : 11;
    this.nodes.forEach((n) => {
      let [x, y] = this.wave(n.bx, n.by, t), w = dot, h = dot, o = 0, far = false, sib = false;
      if (hot) {
        if (n === hot) {
          o = 1; w = big * Math.sqrt(n.a); h = big / Math.sqrt(n.a);
          if (drag) { x = this.mx; y = this.my; const s = 1 + drag.energy * .2; w *= s; h *= s; }
          x = Math.min(Math.max(x, w / 2 + 6), this.W - w / 2 - 6); y = Math.min(Math.max(y, h / 2 + 6), this.H - h / 2 - 6);
        } else if (n.it.pi === fam) { w = h = sibS; sib = true; } else far = true;
      } else if (this.focusSet != null) { if (n.it.pi === fam) { w = h = sibS * 1.1; sib = true; } else far = true; }
      else { const d = Math.hypot(n.bx - this.mx, n.by - this.my), gl = Math.exp(-(d * d) / (this.sp * this.sp * 1.4)); w = h = dot + gl * 12; }
      const px = n.x, py = n.y, pw = n.w;
      n.x += (x - n.x) * k; n.y += (y - n.y) * k; n.w += (w - n.w) * k; n.h += (h - n.h) * k; n.o += (o - n.o) * k;
      // motion smear: the faster a piece moves or grows, the more it blurs and stretches along its path
      const vx = n.x - px, vy = n.y - py, v = Math.hypot(vx, vy) + Math.abs(n.w - pw) * .6;
      n.vb = (n.vb || 0) + (Math.min(14, v * .55) - (n.vb || 0)) * .35;
      n.va = Math.atan2(vy, vx);
      const st = n.b.style;
      const isBig = n.o > .02 || n.sib, sm = isBig && !this.reduce ? n.vb : 0, str = 1 + Math.min(.35, sm * .03);
      st.transform = `translate(${n.x - n.w / 2}px,${n.y - n.h / 2}px)` + (sm > 1.2 ? ` rotate(${n.va}rad) scale(${str},${1 / str}) rotate(${-n.va}rad)` : "");
      st.width = `${n.w}px`; st.height = `${n.h}px`;
      // an opened piece is a dream surfacing: its edges swirl and melt through the dream filter
      const open = n.o > .3;
      if (open !== n.open) { n.open = open; n.b.classList.toggle("open", open); }
      st.filter = [open && !this.reduce ? "url(#dream)" : "", sm > 1.2 ? `blur(${(sm * .6).toFixed(1)}px)` : ""].join(" ").trim();
      // opened pieces aren't boxes: soft, slowly shifting organic shapes

      st.setProperty("--o", n.o.toFixed(3)); st.zIndex = n === hot ? 5 : n.it.pi === fam ? 3 : 1;
      if (far !== n.far) { n.far = far; n.b.classList.toggle("far", far); }
      // the rest of the project opens into small live circles, so you see the whole family at once
      if (sib !== n.sib) {
        n.sib = sib; n.b.classList.toggle("sib", sib);
        const v = n.b.querySelector("video");
        if (v && !this.reduce) { if (sib) { clearTimeout(v.park); if (!v.getAttribute("src")) v.src = n.it.loop; v.play().then(() => n.sib && n.b.classList.add("live")).catch(() => {}); } else if (n !== hot) { this.park(v, n); n.b.classList.remove("live"); } }
      }
    });
    // the lattice, and spokes from whatever is lit
    if (!this.turb) this.turb = document.getElementById("dreamTurb");
    if (this.turb && hot && (this.fc = (this.fc || 0) + 1) % 6 === 0) this.turb.setAttribute("baseFrequency", `${(.009 + .004 * Math.sin(t * .31)).toFixed(4)} ${(.013 + .004 * Math.cos(t * .23)).toFixed(4)}`);
    // tracers: the longer you stay, the more everything leaves a trail behind it
    const g = this.g;
    g.globalCompositeOperation = "destination-out"; g.fillStyle = `rgba(0,0,0,${1 - this.trip * .78})`; g.fillRect(0, 0, this.W, this.H); g.globalCompositeOperation = "source-over";
    this.pts.forEach((p) => { if (p.used) return; const [x, y] = this.wave(p.x, p.y, t); p.wx = x; p.wy = y; g.fillStyle = p.fog ? "rgba(13,13,14,.14)" : "rgba(13,13,14,.5)"; if (p.fog) { g.beginPath(); g.arc(x, y, 1.1, 0, 7); g.fill(); return; } const d = Math.hypot(x - this.mx, y - this.my), s = 1.5 + 2.4 * Math.exp(-(d * d) / (this.sp * this.sp * 2)) + .5 * Math.sin(t * 1.3 + p.x * .02 + p.y * .03); g.beginPath(); g.arc(x, y, Math.max(.8, s * .8), 0, 7); g.fill(); });
    if (fam != null) {
      const fl = this.nodes.filter((n) => n.it.pi === fam), src = hot || fl[0];
      g.strokeStyle = "rgba(13,13,14,.3)"; g.lineWidth = .9;
      fl.forEach((n) => {
        if (n === src) return;
        g.beginPath(); g.moveTo(src.x, src.y); g.lineTo(n.x, n.y); g.stroke();
      });
    }
    requestAnimationFrame(this.frame);
  };
  famNodes(pi) { return this.nodes.filter((n) => n.it.pi === pi); }
}
