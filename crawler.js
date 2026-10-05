// The thing in the hole. Let it out and it stalks your cursor on eight legs, lines you up and fires. It always misses you,
// and whatever is behind you takes the hit: letters swell and spin, pieces get knocked across the grid and change colour,
// captions get highlighted. Call it back and it crawls home and everything it broke is put right.
const SEL = ".node,.wi .wt i,.ph h1 .ch,.aname i,.tile,.chip,.links>*,.bot>span,.lead,.alead,.gsec h2,.gsec p,.cli,.agrid dd,.agrid dt,.tile figcaption,.vbar a,.nx";
const LETTER = ".wi .wt i,.ph h1 .ch,.aname i";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Crawler {
  constructor({ hole, sfx = {}, nodeHit, nodeReset, anchors, reduce = false }) {
    Object.assign(this, { hole, sfx, nodeHit, nodeReset, anchors, reduce });
    this.on = false; this.state = "home"; this.saved = new Map();
    this.m = { x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0, t: 0 };
    addEventListener("pointermove", (e) => { const now = performance.now(), dt = Math.max(8, now - this.m.t); this.m.vx = (e.clientX - this.m.x) / dt * 1000; this.m.vy = (e.clientY - this.m.y) / dt * 1000; this.m.x = e.clientX; this.m.y = e.clientY; this.m.t = now; });
    hole.addEventListener("click", () => (this.on ? this.recall() : this.release()));
    addEventListener("keydown", (e) => { if (e.key === "Escape" && this.on && this.state === "out") this.recall(); });
  }
  holePos() { const r = this.hole.querySelector("i").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  release() {
    if (this.on) return;
    if (!this.cv) { this.cv = document.createElement("canvas"); this.cv.className = "crawl"; this.cv.setAttribute("aria-hidden", "true"); document.body.appendChild(this.cv); this.g = this.cv.getContext("2d"); }
    const h = this.holePos();
    this.on = true; this.state = "out"; this.born = performance.now(); this.grow = 0;
    this.p = { x: h.x, y: h.y }; this.v = { x: -260, y: -120 }; this.head = Math.PI; this.orbit = Math.random() * 6;
    this.legs = Array.from({ length: 8 }, (_, i) => { const side = i < 4 ? -1 : 1, k = i % 4; return { side, k, a: side * (.5 + k * .52), reach: 58 + (k === 1 || k === 2 ? 12 : 0) + (k === 3 ? 6 : 0), fx: h.x, fy: h.y, sx: h.x, sy: h.y, tx: h.x, ty: h.y, st: 1, last: 0 }; });
    this.bolts = []; this.sparks = []; this.rings = []; this.aim = 0; this.cool = 1.4; this.pts = []; this.ptsAt = 0; this.t = performance.now();
    this.hole.classList.add("open"); this.hole.querySelector("span").textContent = "CALL IT BACK";
    document.documentElement.classList.add("crawling");
    this.sfx.out?.();
    requestAnimationFrame(this.frame);
  }
  recall() { if (!this.on || this.state !== "out") return; this.state = "back"; this.aim = 0; this.sfx.back?.(); }
  finish() {
    this.on = false; this.state = "home";
    this.hole.classList.remove("open"); this.hole.querySelector("span").textContent = "DO NOT OPEN";
    document.documentElement.classList.remove("crawling");
    this.restore();
    this.g.clearRect(0, 0, this.cv.width, this.cv.height);
  }
  // ---- what a hit does ----
  set(el, prop, val) {
    let s = this.saved.get(el); if (!s) this.saved.set(el, (s = {}));
    if (!(prop in s)) s[prop] = el.style[prop];
    el.style[prop] = val;
  }
  colors() { return document.documentElement.classList.contains("night") ? ["#46ff8a", "#0bb8f0", "#b46cff", "#ff5ca8"] : ["#3d5bff", "#ff3d9a", "#ff8a1e", "#00b894"]; }
  mutate(el, dx, dy) {
    const c = pick(this.colors()), bounce = "transform .32s cubic-bezier(.2,1.7,.4,1),background-color .2s,color .2s,filter .3s,outline-color .2s";
    if (el.matches(".node")) { this.nodeHit?.(el, dx, dy, c); return c; }
    if (el.matches(LETTER)) {
      this.set(el, "transition", bounce); this.set(el, "position", "relative"); this.set(el, "zIndex", "4");
      const kind = Math.floor(Math.random() * 4), sc = rnd(1.35, 2.5), rot = rnd(-28, 28);
      this.set(el, "transform", `translate(${(dx * rnd(2, 14)).toFixed(1)}px,${(dy * rnd(2, 14)).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(2)})`);
      if (kind === 0) { this.set(el, "backgroundColor", c); this.set(el, "color", "#fff"); }
      else if (kind === 1) this.set(el, "color", c);
      else if (kind === 2) { this.set(el, "fontFamily", "var(--mono)"); this.set(el, "color", c); }
      else { this.set(el, "outline", `1.5px solid ${c}`); this.set(el, "outlineOffset", "2px"); }
      // sometimes the whole word goes with it
      const word = el.closest(".wt,.wd,.aw");
      if (word && Math.random() < .3) { this.set(word, "transition", bounce); this.set(word, "display", "inline-flex"); this.set(word, "transform", `rotate(${rnd(-7, 7).toFixed(1)}deg) scale(${rnd(1.05, 1.22).toFixed(2)})`); this.set(word, "backgroundColor", c + "33"); }
      return c;
    }
    if (el.matches(".tile")) {
      const tm = el.querySelector(".tm") || el;
      this.set(el, "transition", bounce); this.set(el, "position", "relative"); this.set(el, "zIndex", "3");
      this.set(el, "transform", `translate(${(dx * rnd(8, 26)).toFixed(0)}px,${(dy * rnd(8, 26)).toFixed(0)}px) rotate(${rnd(-6, 6).toFixed(1)}deg) scale(${rnd(.9, 1.07).toFixed(2)})`);
      this.set(tm, "transition", "filter .3s,outline-color .2s"); this.set(tm, "filter", `hue-rotate(${Math.round(rnd(40, 320))}deg) saturate(1.5)`);
      this.set(tm, "outline", `2px solid ${c}`); this.set(tm, "outlineOffset", "4px");
      return c;
    }
    // any other bit of type: a highlighter block, a knock and a swell
    this.set(el, "transition", bounce);
    if (getComputedStyle(el).display === "inline") this.set(el, "display", "inline-block");
    this.set(el, "transform", `translate(${(dx * rnd(3, 12)).toFixed(0)}px,${(dy * rnd(3, 12)).toFixed(0)}px) rotate(${rnd(-5, 5).toFixed(1)}deg) scale(${rnd(1.05, 1.5).toFixed(2)})`);
    if (Math.random() < .6) { this.set(el, "backgroundColor", c); this.set(el, "color", "#fff"); } else { this.set(el, "color", c); this.set(el, "outline", `1.5px solid ${c}`); this.set(el, "outlineOffset", "3px"); }
    return c;
  }
  restore() {
    this.saved.forEach((s, el) => {
      if (!el.isConnected) return;
      el.style.transition = "transform .6s cubic-bezier(.2,.8,.2,1),background-color .5s,color .5s,filter .5s,outline-color .4s";
      Object.keys(s).forEach((k) => { if (k !== "transition") el.style[k] = s[k]; });
      setTimeout(() => { el.style.transition = s.transition ?? ""; }, 650);
    });
    this.saved.clear(); this.nodeReset?.();
  }
  // ---- the animal ----
  frame = (now) => {
    if (!this.on) return;
    const dt = Math.min(.05, (now - this.t) / 1000); this.t = now;
    const g = this.g, W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.cv.width !== Math.round(W * dpr) || this.cv.height !== Math.round(H * dpr)) { this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const p = this.p, v = this.v, m = this.m, hole = this.holePos(), back = this.state === "back";
    this.grow = Math.min(1, this.grow + dt * (back ? 0 : 1.6));
    // where it wants to be: circling you at arm's length, or heading home
    const tx = back ? hole.x : m.x, ty = back ? hole.y : m.y, dxm = tx - p.x, dym = ty - p.y, dm = Math.hypot(dxm, dym) || 1;
    this.orbit += dt * .55;
    const stand = back ? 0 : 150 + Math.sin(now / 1700) * 30, ox = Math.cos(this.orbit), oy = Math.sin(this.orbit);
    const gx = tx - (dxm / dm) * stand * .75 + ox * stand * .5, gy = ty - (dym / dm) * stand * .75 + oy * stand * .5;
    const ax = gx - p.x, ay = gy - p.y, ad = Math.hypot(ax, ay) || 1, want = Math.min(560, ad * 3.2);
    v.x += ((ax / ad) * want - v.x) * Math.min(1, dt * 4.5); v.y += ((ay / ad) * want - v.y) * Math.min(1, dt * 4.5);
    p.x += v.x * dt; p.y += v.y * dt;
    if (!back) { p.x = clamp(p.x, 30, W - 30); p.y = clamp(p.y, 30, H - 30); }
    // it always faces what it's hunting
    let da = Math.atan2(dym, dxm) - this.head; da = Math.atan2(Math.sin(da), Math.cos(da)); this.head += da * Math.min(1, dt * 7);
    if (back && dm < 26) { this.grow -= dt * 4; if (this.grow <= 0) { this.finish(); return; } }
    const sc = Math.max(.05, this.grow) * (back && dm < 26 ? Math.max(.05, this.grow) : 1) * 1.3, ch = Math.cos(this.head), sh = Math.sin(this.head);
    // things a foot can hold on to
    if (now - this.ptsAt > 450) { this.ptsAt = now; try { this.pts = this.anchors?.() || []; } catch (e) { this.pts = []; } }
    const speed = Math.hypot(v.x, v.y), moving = this.legs.filter((l) => l.st < 1).length;
    const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#0d0d0e", bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#f4f3ef";
    g.lineCap = "round"; g.lineJoin = "round";
    this.legs.forEach((l, i) => {
      const a = this.head + l.a, hx = p.x + (ch * (10 - l.k * 7) - sh * l.side * 7) * sc, hy = p.y + (sh * (10 - l.k * 7) + ch * l.side * 7) * sc;
      const rx = hx + Math.cos(a) * l.reach * sc + v.x * .1, ry = hy + Math.sin(a) * l.reach * sc + v.y * .1;
      if (l.st >= 1) {
        const off = Math.hypot(l.fx - rx, l.fy - ry), far = Math.hypot(l.fx - hx, l.fy - hy);
        // legs take turns: a leg only lifts if its neighbours are down
        const nb = this.legs.some((o) => o !== l && o.side === l.side && Math.abs(o.k - l.k) === 1 && o.st < 1);
        if ((off > 30 * sc + 6 && !nb && moving < 4) || far > 96 * sc) {
          let bx = rx, by = ry, bd = 30;
          for (const q of this.pts) { const d = Math.hypot(q[0] - rx, q[1] - ry); if (d < bd) { bd = d; bx = q[0]; by = q[1]; } }
          l.sx = l.fx; l.sy = l.fy; l.tx = bx; l.ty = by; l.st = 0; l.grip = bd < 30;
        }
      } else {
        l.st = Math.min(1, l.st + dt * (7 + speed * .012));
        const e = l.st * l.st * (3 - 2 * l.st); l.fx = l.sx + (l.tx - l.sx) * e; l.fy = l.sy + (l.ty - l.sy) * e;
        if (l.st >= 1 && speed > 60 && Math.random() < .3) this.sfx.step?.(l.fx / W);
      }
      // two bones and a knee that bends up and out
      const L1 = 36 * sc, L2 = 46 * sc, ddx = l.fx - hx, ddy = l.fy - hy, d = clamp(Math.hypot(ddx, ddy), 4, L1 + L2 - .5);
      const base = Math.atan2(ddy, ddx), kA = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), ka = base - l.side * kA * (.9 + (l.st < 1 ? Math.sin(l.st * Math.PI) * .35 : 0));
      const kx = hx + Math.cos(ka) * L1, ky = hy + Math.sin(ka) * L1, lift = l.st < 1 ? Math.sin(l.st * Math.PI) * 7 : 0;
      g.strokeStyle = ink; g.lineWidth = 1.25; g.beginPath(); g.moveTo(hx, hy); g.lineTo(kx, ky - lift * .5); g.lineTo(l.fx, l.fy - lift); g.stroke();
      g.fillStyle = ink; g.beginPath(); g.arc(kx, ky - lift * .5, 1.6, 0, 7); g.fill();
      // a planted foot draws a little bracket round whatever it's standing on
      if (l.st >= 1) { g.lineWidth = 1; g.strokeStyle = l.grip ? this.colors()[i % 3] : ink; g.strokeRect(l.fx - 3.5, l.fy - 3.5, 7, 7); }
    });
    // body: a long abdomen, a small head and one lens that never leaves you
    const bob = Math.sin(now / 90) * Math.min(1.6, speed * .006);
    g.save(); g.translate(p.x, p.y + bob); g.rotate(this.head); g.scale(sc, sc);
    g.fillStyle = ink; g.beginPath(); g.ellipse(-15, 0, 15, 9.5, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(4, 0, 9, 7.5, 0, 0, 7); g.fill();
    g.strokeStyle = bg; g.lineWidth = 1; g.beginPath(); g.moveTo(-22, -4); g.lineTo(-10, -5.5); g.moveTo(-22, 4); g.lineTo(-10, 5.5); g.stroke();
    g.fillStyle = bg; g.beginPath(); g.arc(8, 0, 4.2, 0, 7); g.fill();
    g.fillStyle = this.aim > 0 ? this.colors()[1] : ink; g.beginPath(); g.arc(9.4, 0, 1.9 + (this.aim > 0 ? this.aim * 1.2 : 0), 0, 7); g.fill();
    g.restore();
    const ex = p.x + ch * 12 * sc, ey = p.y + sh * 12 * sc;
    // lining up a shot: a dotted sightline and a box that closes on you, then it fires (and you've moved)
    if (!back && this.grow >= 1) {
      this.cool -= dt;
      if (this.aim <= 0 && this.cool <= 0 && dm < 520) { this.aim = .001; this.sfx.aim?.(); }
      if (this.aim > 0) {
        this.aim += dt / .34;
        const c = this.colors()[1], s = 26 - Math.min(1, this.aim) * 14;
        g.strokeStyle = c; g.lineWidth = 1; g.setLineDash([2, 6]); g.beginPath(); g.moveTo(ex, ey); g.lineTo(m.x, m.y); g.stroke(); g.setLineDash([]);
        g.strokeRect(m.x - s, m.y - s, s * 2, s * 2);
        if (this.aim >= 1) {
          this.aim = 0; this.cool = rnd(.5, 1.5);
          const lx = m.x + m.vx * .06 - ex, ly = m.y + m.vy * .06 - ey, ld = Math.hypot(lx, ly) || 1, sp = rnd(-.05, .05), cs = Math.cos(sp), sn = Math.sin(sp);
          const ux = (lx / ld) * cs - (ly / ld) * sn, uy = (lx / ld) * sn + (ly / ld) * cs;
          this.bolts.push({ x: ex, y: ey, ux, uy, d: 0, c: pick(this.colors()) });
          v.x -= ux * 190; v.y -= uy * 190; this.sfx.shoot?.(ex / W);
        }
      }
    }
    // bolts fly on past you into the page
    this.bolts = this.bolts.filter((b) => {
      let left = 1900 * dt, hit = null;
      while (left > 0 && !hit) {
        const stp = Math.min(12, left); b.x += b.ux * stp; b.y += b.uy * stp; b.d += stp; left -= stp;
        if (b.x < 0 || b.y < 0 || b.x > W || b.y > H || b.d > 2200) return false;
        if (b.d < 40) continue;
        const el = document.elementFromPoint(b.x, b.y), t = el && el !== this.hole && !this.hole.contains(el) ? el.closest(SEL) : null;
        if (t && now - (t._shot || 0) > 500) { t._shot = now; hit = t; }
      }
      g.strokeStyle = b.c; g.lineWidth = 2.2; g.beginPath(); g.moveTo(b.x - b.ux * 30, b.y - b.uy * 30); g.lineTo(b.x, b.y); g.stroke();
      if (hit) {
        const c = this.mutate(hit, b.ux, b.uy) || b.c, r = hit.getBoundingClientRect();
        this.rings.push({ x: r.left, y: r.top, w: r.width, h: r.height, t: now, c });
        for (let k = 0; k < 7; k++) { const a = Math.atan2(b.uy, b.ux) + rnd(-1.1, 1.1), s = rnd(120, 420); this.sparks.push({ x: b.x, y: b.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: now, c }); }
        this.sfx.hit?.(b.x / W, 1 - b.y / H);
        return false;
      }
      return true;
    });
    this.rings = this.rings.filter((r) => { const k = (now - r.t) / 420; if (k >= 1) return false; const e = 4 + k * 16; g.globalAlpha = 1 - k; g.strokeStyle = r.c; g.lineWidth = 1.5; g.strokeRect(r.x - e, r.y - e, r.w + e * 2, r.h + e * 2); g.globalAlpha = 1; return true; });
    this.sparks = this.sparks.filter((s) => { const k = (now - s.t) / 380; if (k >= 1) return false; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= .92; s.vy *= .92; g.globalAlpha = 1 - k; g.strokeStyle = s.c; g.lineWidth = 1.4; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - s.vx * .03, s.y - s.vy * .03); g.stroke(); g.globalAlpha = 1; return true; });
    requestAnimationFrame(this.frame);
  };
}
