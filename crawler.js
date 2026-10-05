// The thing in the hole. Let it out and it stalks your cursor on eight legs, lines you up and fires. It always misses you,
// and the page takes the hit: letters are blown loose and fall, pieces are knocked across the grid, pictures get bites
// taken out of them. All the damage is done to the page itself. Stop moving and it pounces: it grabs your cursor and runs off with it, smashing it
// into things, until you shake it loose. It gets angrier the longer it's out. Call it back and everything is put right.
const SEL = ".node,.wi .wt i,.ph h1 .ch,.aname i,.tile,.chip,.links>a,.links>.snd,.links>.nite,.bot>span:not(.bar),.lead,.alead,.gsec h2,.gsec p,.cli,.agrid dd,.agrid dt,.tile figcaption,.nx,.wi .wn,.akick";
const LETTER = ".wi .wt i,.ph h1 .ch,.aname i";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ARROW = [[0, 0], [0, 17], [4.4, 13], [7.3, 19.6], [10, 18.4], [7, 12], [12.6, 12]];

// its legs: nine of them, all different, three to five bones each, set unevenly round a ring. Two more thin feelers at the front.
const LEGS = [
  { a: .6, s: [24, 28, 22] }, { a: 1.2, s: [20, 24, 24, 16], fork: 1 }, { a: 1.85, s: [28, 32, 20] }, { a: 2.5, s: [18, 22, 20, 18] },
  { a: -.6, s: [26, 26, 24] }, { a: -1.25, s: [22, 20, 26, 14] }, { a: -1.9, s: [30, 28, 22], fork: 1 }, { a: -2.55, s: [18, 24, 18, 20] },
  { a: 3.1, s: [16, 20, 18, 16, 14] },
];
const FEEL = [{ a: .2, s: [13, 13, 12, 11] }, { a: -.2, s: [12, 14, 11, 12] }];
const chain = (spec) => ({ ...spec, tot: spec.s.reduce((x, y) => x + y, 0), j: spec.s.map(() => [0, 0]).concat([[0, 0]]), fx: 0, fy: 0, sx: 0, sy: 0, tx: 0, ty: 0, st: 1 });
// pull a chain of bones from its root to a target (FABRIK), with a nudge that keeps every knee bending the same way
function solve(l, hx, hy, fx, fy, sc, bend, lift) {
  const j = l.j, n = l.s.length, dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy) || 1, nx = -dy / d * bend, ny = dx / d * bend;
  for (let i = 1; i < n; i++) { const k = Math.sin((i / n) * Math.PI); j[i][0] += nx * 5 * k; j[i][1] += ny * 5 * k - lift * k; }
  for (let it = 0; it < 3; it++) {
    j[n][0] = fx; j[n][1] = fy;
    for (let i = n - 1; i >= 0; i--) { const ax = j[i][0] - j[i + 1][0], ay = j[i][1] - j[i + 1][1], q = Math.hypot(ax, ay) || 1, L = l.s[i] * sc; j[i][0] = j[i + 1][0] + ax / q * L; j[i][1] = j[i + 1][1] + ay / q * L; }
    j[0][0] = hx; j[0][1] = hy;
    for (let i = 1; i <= n; i++) { const ax = j[i][0] - j[i - 1][0], ay = j[i][1] - j[i - 1][1], q = Math.hypot(ax, ay) || 1, L = l.s[i - 1] * sc; j[i][0] = j[i - 1][0] + ax / q * L; j[i][1] = j[i - 1][1] + ay / q * L; }
  }
}

export class Crawler {
  constructor({ holes, holeEl, sfx, nodeHit, nodeReset, anchors, reduce = false }) {
    Object.assign(this, { holes, holeEl, sfx: sfx || (() => {}), nodeHit, nodeReset, anchors, reduce });
    this.on = false; this.state = "home"; this.saved = new Map();
    this.m = { x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0, t: 0, moved: performance.now() };
    addEventListener("pointermove", (e) => {
      const now = performance.now(), dt = Math.max(8, now - this.m.t), dx = e.clientX - this.m.x, dy = e.clientY - this.m.y, d = Math.hypot(dx, dy);
      this.m.vx += (dx / dt * 1000 - this.m.vx) * .5; this.m.vy += (dy / dt * 1000 - this.m.vy) * .5; this.m.x = e.clientX; this.m.y = e.clientY; this.m.t = now;
      if (d > 2.5) this.m.moved = now;
      if (this.state === "carry" || this.state === "held") this.meter += d;
    });
    holes.forEach((h) => h.addEventListener("click", () => (this.on ? this.recall() : this.release())));
    addEventListener("keydown", (e) => { if (e.key === "Escape" && this.on) this.recall(); });
    // while it has your cursor nothing you click lands; and a press right on it picks it up
    addEventListener("pointerdown", (e) => {
      if (!this.on) return;
      if (this.state === "carry") { e.stopPropagation(); e.preventDefault(); return; }
      if (["out", "pounce", "stun"].includes(this.state) && Math.hypot(e.clientX - this.p.x, e.clientY - this.p.y) < 34 && !e.target.closest?.(".hole")) {
        e.stopPropagation(); e.preventDefault(); this.swallow = true;
        this.state = "held"; this.meter = 0; this.aim = 0; this.heldAt = performance.now();
        document.documentElement.classList.add("holding"); this.sfx("squeak");
      }
    }, true);
    addEventListener("pointerup", () => { if (this.state === "held") this.letGo(); if (this.swallow) setTimeout(() => (this.swallow = false), 60); }, true);
    ["mousedown", "click"].forEach((t) => addEventListener(t, (e) => { if (this.state === "carry" || this.state === "held" || (t === "click" && this.swallow)) { e.stopPropagation(); e.preventDefault(); if (t === "click") this.swallow = false; } }, true));
  }
  holePos() { const el = (this.holeEl?.() || this.holes[0]).querySelector("i"), r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  label(t) { this.holes.forEach((h) => { h.classList.toggle("open", this.on); h.querySelector("span").textContent = t; }); }
  release() {
    if (this.on) return;
    if (!this.cv) { this.cv = document.createElement("canvas"); this.cv.className = "crawl"; this.cv.setAttribute("aria-hidden", "true"); document.body.appendChild(this.cv); this.g = this.cv.getContext("2d"); }
    const h = this.holePos();
    this.on = true; this.state = "out"; this.grow = 0; this.rage = 0; this.meter = 0;
    this.p = { x: h.x, y: h.y }; this.v = { x: -200, y: 260 }; this.head = Math.PI / 2; this.orbit = Math.random() * 6;
    this.legs = LEGS.map(chain); this.feel = FEEL.map(chain); this.tail = Array.from({ length: 6 }, () => [h.x, h.y]);
    [...this.legs, ...this.feel].forEach((l) => { l.fx = l.sx = l.tx = h.x; l.fy = l.sy = l.ty = h.y; l.j.forEach((q) => { q[0] = h.x; q[1] = h.y; }); });
    this.bolts = []; this.sparks = []; this.fall = []; this.aim = 0; this.cool = 1.2; this.pcool = 2.5; this.pts = []; this.ptsAt = 0; this.t = performance.now(); this.m.moved = this.t;
    this.label("CALL IT BACK"); document.documentElement.classList.add("crawling");
    this.sfx("out");
    requestAnimationFrame(this.frame);
  }
  recall() { if (!this.on || this.state === "back") return; if (this.state === "carry") this.free(true); document.documentElement.classList.remove("holding"); this.state = "back"; this.backAt = performance.now(); this.aim = 0; this.bolts = []; this.sfx("back"); }
  finish() {
    this.on = false; this.state = "home";
    this.label("DO NOT OPEN"); document.documentElement.classList.remove("crawling", "caught", "holding");
    this.restore();
    this.g.clearRect(0, 0, this.cv.width, this.cv.height);
  }
  // you put it down: thrown if you were moving, straight home if you dropped it in its hole
  letGo() {
    document.documentElement.classList.remove("holding");
    const h = this.holePos(), now = performance.now();
    if (Math.hypot(this.p.x - h.x, this.p.y - h.y) < 48) { this.state = "back"; this.backAt = now; this.sfx("back"); return; }
    this.v.x = clamp(this.m.vx, -1700, 1700); this.v.y = clamp(this.m.vy, -1700, 1700);
    const dizzy = this.meter > 2600;
    this.state = "stun"; this.stunAt = now - (dizzy ? 0 : 1000); this.pcool = 3; this.cool = 1.2;
    this.sfx(dizzy ? "free" : "thud", this.p.x / innerWidth);
  }
  // ---- damage ----
  set(el, prop, val) {
    let s = this.saved.get(el); if (!s) this.saved.set(el, (s = {}));
    if (!(prop in s)) s[prop] = el.style[prop];
    el.style[prop] = val;
  }
  colors() { return document.documentElement.classList.contains("night") ? ["#46ff8a", "#0bb8f0", "#b46cff", "#ff5ca8"] : ["#3d5bff", "#ff3d9a", "#ff8a1e", "#00b894"]; }
  drop(el, ux, uy) {
    // blown clean off: it flies, tumbles and lands at the bottom of the screen
    if (this.fall.some((f) => f.el === el) || this.fall.length > 70) return;
    const r = el.getBoundingClientRect(), box = el.closest(".wheel")?.getBoundingClientRect() || { left: 0, right: innerWidth, bottom: innerHeight };
    this.set(el, "transition", "none"); this.set(el, "position", "relative"); this.set(el, "zIndex", "5"); this.set(el, "transform", "none");
    this.fall.push({ el, x: 0, y: 0, vx: ux * rnd(160, 420) + rnd(-60, 60), vy: uy * rnd(120, 300) - rnd(120, 320), r: 0, vr: rnd(-500, 500), floor: box.bottom - r.bottom - rnd(10, 34), left: box.left - r.left + 10, right: box.right - r.right - 10, s: rnd(1, 1.7), rest: false });
  }
  mutate(el, dx, dy, power = 1) {
    const c = pick(this.colors()), bounce = "transform .3s cubic-bezier(.2,1.8,.4,1),background-color .2s,color .2s,filter .3s,outline-color .2s,letter-spacing .3s";
    if (el.matches(".node")) { this.nodeHit?.(el, dx, dy, c, power); return c; }
    if (el.matches(LETTER)) {
      if (this.fall.some((f) => f.el === el)) return c;
      const kind = Math.floor(Math.random() * 4);
      if (kind === 0) { this.set(el, "backgroundColor", c); this.set(el, "color", "#fff"); }
      else if (kind === 1) this.set(el, "color", c);
      else if (kind === 2) { this.set(el, "fontFamily", "var(--mono)"); this.set(el, "color", c); }
      else { this.set(el, "outline", `1.5px solid ${c}`); this.set(el, "outlineOffset", "2px"); }
      if (Math.random() < .45 * power) { this.drop(el, dx, dy); return c; }
      this.set(el, "transition", bounce); this.set(el, "position", "relative"); this.set(el, "zIndex", "4");
      this.set(el, "transform", `translate(${(dx * rnd(6, 30) * power).toFixed(1)}px,${(dy * rnd(6, 30) * power).toFixed(1)}px) rotate(${rnd(-50, 50).toFixed(1)}deg) scale(${rnd(1.4, 3.2).toFixed(2)})`);
      const word = el.closest(".wt,.wd,.aw");
      if (word && Math.random() < .4) { this.set(word, "transition", bounce); this.set(word, "display", "inline-flex"); this.set(word, "transform", `rotate(${rnd(-12, 12).toFixed(1)}deg) scale(${rnd(1.05, 1.3).toFixed(2)}) skewX(${rnd(-14, 14).toFixed(0)}deg)`); this.set(word, "backgroundColor", c + "44"); }
      return c;
    }
    if (el.matches(".tile")) {
      const tm = el.querySelector(".tm") || el;
      this.set(el, "transition", bounce); this.set(el, "position", "relative"); this.set(el, "zIndex", "3");
      this.set(el, "transform", `translate(${(dx * rnd(14, 46)).toFixed(0)}px,${(dy * rnd(14, 46)).toFixed(0)}px) rotate(${rnd(-11, 11).toFixed(1)}deg) scale(${rnd(.82, 1.08).toFixed(2)})`);
      this.set(tm, "transition", "filter .3s,outline-color .2s,clip-path .25s"); this.set(tm, "filter", `hue-rotate(${Math.round(rnd(40, 320))}deg) saturate(1.7) contrast(1.15)`);
      this.set(tm, "outline", `2px solid ${c}`); this.set(tm, "outlineOffset", "4px");
      // a jagged bite out of one edge
      const a = rnd(12, 60), w = rnd(14, 30), d = rnd(22, 55), j = () => rnd(-6, 6).toFixed(0);
      const bite = [`${a}%`, `${(a + w * .3 + +j()).toFixed(0)}%`, `${(a + w * .5).toFixed(0)}%`, `${(a + w * .75 + +j()).toFixed(0)}%`, `${(a + w).toFixed(0)}%`];
      const edge = Math.floor(Math.random() * 4), P = (u, v) => (edge === 0 ? `${u} ${v}%` : edge === 1 ? `${100 - v}% ${u}` : edge === 2 ? `${u} ${100 - v}%` : `${v}% ${u}`);
      const pts = [P(bite[0], 0), P(bite[1], d * .6), P(bite[2], d), P(bite[3], d * .5), P(bite[4], 0)];
      const corners = ["0 0", "100% 0", "100% 100%", "0 100%"], poly = [];
      for (let k = 0; k < 4; k++) { poly.push(corners[k]); if (k === edge) poly.push(...(edge === 0 || edge === 1 ? pts : pts.slice().reverse())); }
      this.set(tm, "clipPath", `polygon(${poly.join(",")})`);
      return c;
    }
    this.set(el, "transition", bounce);
    if (getComputedStyle(el).display === "inline") this.set(el, "display", "inline-block");
    this.set(el, "transform", `translate(${(dx * rnd(6, 24)).toFixed(0)}px,${(dy * rnd(6, 24)).toFixed(0)}px) rotate(${rnd(-12, 12).toFixed(1)}deg) scale(${rnd(1.1, 1.9).toFixed(2)}) skewX(${rnd(-16, 16).toFixed(0)}deg)`);
    if (Math.random() < .5) this.set(el, "letterSpacing", `${rnd(.15, .6).toFixed(2)}em`);
    if (Math.random() < .6) { this.set(el, "backgroundColor", c); this.set(el, "color", "#fff"); } else { this.set(el, "color", c); this.set(el, "outline", `1.5px solid ${c}`); this.set(el, "outlineOffset", "3px"); }
    return c;
  }
  // every hit is a small explosion: whatever is nearby is thrown outwards too
  blast(x, y, R, main) {
    document.querySelectorAll(LETTER + ",.node,.tile figcaption,.wi .wn").forEach((el) => {
      if (el === main || this.fall.some((f) => f.el === el)) return;
      const r = el.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) return;
      const dx = r.left + r.width / 2 - x, dy = r.top + r.height / 2 - y, d = Math.hypot(dx, dy); if (d > R || d < 1) return;
      const k = 1 - d / R, ux = dx / d, uy = dy / d;
      if (el.matches(".node")) { this.nodeHit?.(el, ux, uy, null, k * .8); return; }
      if (k > .55 && Math.random() < .5 && el.matches(LETTER)) { this.drop(el, ux, uy); return; }
      this.set(el, "transition", "transform .35s cubic-bezier(.2,1.8,.4,1)"); this.set(el, "position", "relative");
      if (getComputedStyle(el).display === "inline") this.set(el, "display", "inline-block");
      this.set(el, "transform", `translate(${(ux * k * 34).toFixed(1)}px,${(uy * k * 34).toFixed(1)}px) rotate(${(rnd(-40, 40) * k).toFixed(1)}deg) scale(${(1 + k * .5).toFixed(2)})`);
    });
  }
  impact(x, y, ux, uy, hit, c, power = 1) {
    const now = performance.now(), W = innerWidth;
    const col = hit ? this.mutate(hit, ux, uy, power) || c : c;
    this.blast(x, y, 110 + this.rage * 30, hit);
    for (let k = 0; k < 12; k++) { const a = Math.atan2(uy, ux) + rnd(-1.4, 1.4), s = rnd(140, 560); this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: now, c: col }); }
    if (!this.reduce) document.body.animate([{ transform: `translate(${(-ux * 7).toFixed(1)}px,${(-uy * 7).toFixed(1)}px)` }, { transform: `translate(${(ux * 4).toFixed(1)}px,${(uy * 4).toFixed(1)}px)` }, { transform: "none" }], { duration: 190, easing: "ease-out" });
    this.rage = Math.min(3, this.rage + .06);
    this.sfx("hit", x / W, 1 - y / innerHeight);
  }
  restore() {
    this.saved.forEach((s, el) => {
      if (!el.isConnected) return;
      el.style.transition = "transform .7s cubic-bezier(.2,.8,.2,1),background-color .5s,color .5s,filter .5s,outline-color .4s,clip-path .5s,letter-spacing .5s";
      Object.keys(s).forEach((k) => { if (k !== "transition") el.style[k] = s[k]; });
      setTimeout(() => { el.style.transition = s.transition ?? ""; }, 750);
    });
    this.saved.clear(); this.fall = []; this.nodeReset?.();
  }
  // ---- catching you ----
  grab() {
    this.state = "carry"; this.meter = 0; this.carryAt = performance.now(); this.way = null; this.aim = 0;
    document.documentElement.classList.add("caught"); this.sfx("catch");
  }
  free(quiet) {
    if (this.state !== "carry") return;
    document.documentElement.classList.remove("caught");
    this.state = "stun"; this.stunAt = performance.now(); this.rage = Math.min(3, this.rage + .5); this.pcool = 3;
    const cx = this.p.x + Math.cos(this.head) * 34, cy = this.p.y + Math.sin(this.head) * 34;
    for (let k = 0; k < 16; k++) { const a = rnd(0, 6.28), s = rnd(160, 520); this.sparks.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: performance.now(), c: pick(this.colors()) }); }
    this.v.x += rnd(-500, 500); this.v.y += rnd(-500, 500);
    if (!quiet) this.sfx("free");
  }
  // ---- the animal ----
  frame = (now) => {
    if (!this.on) return;
    const dt = Math.min(.05, (now - this.t) / 1000); this.t = now;
    const g = this.g, W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.cv.width !== Math.round(W * dpr) || this.cv.height !== Math.round(H * dpr)) { this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const p = this.p, v = this.v, m = this.m;
    const st = this.state, back = st === "back", carry = st === "carry", stun = st === "stun", pounce = st === "pounce", held = st === "held";
    const cs = getComputedStyle(document.documentElement), ink = cs.getPropertyValue("--ink").trim() || "#0d0d0e", bg = cs.getPropertyValue("--bg").trim() || "#f4f3ef", cols = this.colors();
    this.grow = Math.min(1, this.grow + dt * (back ? 0 : 1.6));
    // letters it has blown loose
    this.fall.forEach((f) => {
      if (f.rest || !f.el.isConnected) return;
      f.vy += 1900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vr * dt;
      if (f.x < f.left) { f.x = f.left; f.vx *= -.5; } if (f.x > f.right) { f.x = f.right; f.vx *= -.5; }
      if (f.y > f.floor) { f.y = f.floor; if (Math.abs(f.vy) < 140) { f.rest = true; f.r = Math.round(f.r / 90) * 90 + rnd(-14, 14); } else { f.vy *= -.38; f.vx *= .6; f.vr *= .5; this.sfx("clack", .5); } }
      f.el.style.transform = `translate(${f.x.toFixed(1)}px,${f.y.toFixed(1)}px) rotate(${f.r.toFixed(0)}deg) scale(${f.s.toFixed(2)})`;
    });
    // where it wants to be
    const hole = this.holePos();
    let tx = m.x, ty = m.y, top = 560 + this.rage * 90, grip = 4.5, stand = 150 + Math.sin(now / 1700) * 30 - this.rage * 20;
    if (back) { tx = hole.x; ty = hole.y; stand = 0; top = 1100; grip = 12; }
    else if (pounce) { stand = 0; top = now - this.pAt < 240 ? 0 : 1700; grip = 14; }
    else if (carry) {
      if (!this.way || Math.hypot(this.way.x - p.x, this.way.y - p.y) < 60 || now - this.wayAt > 1500) { this.way = { x: rnd(80, W - 80), y: rnd(80, H - 80) }; this.wayAt = now; }
      tx = this.way.x; ty = this.way.y; stand = 0; top = 720; grip = 5;
    } else if (stun) { top = 0; grip = 2.2; }
    const dxm = tx - p.x, dym = ty - p.y, dm = Math.hypot(dxm, dym) || 1;
    this.orbit += dt * (.55 + this.rage * .2);
    if (held) { v.x = (m.x - p.x) / Math.max(dt, .008) * .5; v.y = (m.y + 14 - p.y) / Math.max(dt, .008) * .5; p.x += (m.x - p.x) * .5; p.y += (m.y + 14 - p.y) * .5; }
    else {
      const gx = tx - (dxm / dm) * stand * .75 + Math.cos(this.orbit) * stand * .5, gy = ty - (dym / dm) * stand * .75 + Math.sin(this.orbit) * stand * .5;
      const ax = gx - p.x, ay = gy - p.y, ad = Math.hypot(ax, ay) || 1, want = back ? Math.min(top, 200 + ad * 5) : Math.min(top, ad * (pounce ? 12 : 3.2));
      v.x += ((ax / ad) * want - v.x) * Math.min(1, dt * grip); v.y += ((ay / ad) * want - v.y) * Math.min(1, dt * grip);
      p.x += v.x * dt; p.y += v.y * dt;
      if (!back) { if (p.x < 24 || p.x > W - 24) v.x *= -.4; if (p.y < 24 || p.y > H - 24) v.y *= -.4; p.x = clamp(p.x, 24, W - 24); p.y = clamp(p.y, 24, H - 24); }
    }
    const speed = Math.hypot(v.x, v.y);
    let face = carry && speed > 40 ? Math.atan2(v.y, v.x) : Math.atan2(m.y - p.y, m.x - p.x); if (back) face = Math.atan2(dym, dxm);
    let da = face - this.head; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (stun) this.head += dt * 10 * Math.max(0, 1 - (now - this.stunAt) / 1100); else if (held) this.head += Math.sin(now / 90) * dt * 3 + clamp(m.vx * .0006, -.2, .2) * dt * 8; else this.head += da * Math.min(1, dt * 7);
    const inHole = back && (dm < 34 || now - this.backAt > 2200);
    if (inHole) { this.grow -= Math.max(dt, .016) * 4; if (this.grow <= 0) { this.finish(); return; } }
    const crouch = pounce && now - this.pAt < 240 ? .8 : 1;
    const sc = Math.max(.05, this.grow) * (inHole ? Math.max(.05, this.grow) : 1) * 1.25 * crouch * (1 + this.rage * .08), ch = Math.cos(this.head), sh = Math.sin(this.head);
    const dMouse = Math.hypot(m.x - p.x, m.y - p.y);
    // state changes
    if (st === "out" && this.grow >= 1) {
      this.pcool -= dt;
      if (this.pcool <= 0 && now - m.moved > 850 && dMouse < 380) { this.state = "pounce"; this.pAt = now; this.aim = 0; this.sfx("pounce"); }
    } else if (pounce) {
      if (dMouse < 34) this.grab();
      else if (now - this.pAt > 900) { this.state = "out"; this.pcool = rnd(2.2, 4) / (1 + this.rage * .4); this.cool = .5; }
    } else if (carry) {
      this.meter = Math.max(0, this.meter - 700 * dt);
      if (this.meter > 1500 || now - this.carryAt > 9000) this.free();
    } else if (stun && now - this.stunAt > 1700) this.state = "out";
    else if (held) { this.meter = Math.max(0, this.meter - 500 * dt); if (Math.random() < dt * 4) this.sfx("chitter", p.x / W, .5); }
    if (now - this.ptsAt > 450) { this.ptsAt = now; try { this.pts = this.anchors?.() || []; } catch (e) { this.pts = []; } }
    const moving = this.legs.filter((l) => l.st < 1).length, R = 10 * sc;
    g.lineCap = "round"; g.lineJoin = "round";
    const mouthX = p.x + ch * 30 * sc, mouthY = p.y + sh * 30 * sc;
    // a tail of beads that trails along behind it
    let lx = p.x - ch * R, ly = p.y - sh * R;
    this.tail.forEach((q, i) => { const gap = (9 - i) * sc, dx = q[0] - lx, dy = q[1] - ly + (held ? 3 : 0), d = Math.hypot(dx, dy) || 1; q[0] = lx + dx / d * gap; q[1] = ly + dy / d * gap; g.strokeStyle = ink; g.lineWidth = 1.2; g.beginPath(); g.moveTo(lx, ly); g.lineTo(q[0], q[1]); g.stroke(); g.fillStyle = i % 2 ? bg : ink; g.beginPath(); g.arc(q[0], q[1], Math.max(1.2, (4.2 - i * .55) * sc), 0, 7); g.fill(); g.stroke(); lx = q[0]; ly = q[1]; });
    // legs
    this.legs.forEach((l, i) => {
      const a = this.head + l.a, hx = p.x + Math.cos(a) * R, hy = p.y + Math.sin(a) * R, reach = l.tot * .7 * sc, side = Math.sign(l.a) || 1;
      const rx = hx + Math.cos(a) * reach + v.x * .1, ry = hy + Math.sin(a) * reach + v.y * .1;
      const holding = carry && i % 4 === 0;
      if (holding) { l.fx = mouthX - sh * side * 5; l.fy = mouthY + ch * side * 5; l.st = 1; }
      else if (held) { const w = now / 110 + i * 1.7; l.fx += (hx + Math.cos(a) * 10 - clamp(m.vx, -900, 900) * .05 + Math.sin(w) * 9 - l.fx) * .25; l.fy += (hy + l.tot * .8 * sc + Math.cos(w * 1.3) * 7 - Math.abs(clamp(m.vx, -900, 900)) * .02 - l.fy) * .25; l.st = 1; }
      else if (stun) { const w = now / 70 + i; l.fx += (hx + Math.cos(a) * l.tot * .32 * sc + Math.cos(w) * 8 - l.fx) * .3; l.fy += (hy + Math.sin(a) * l.tot * .32 * sc + Math.sin(w * 1.3) * 8 - l.fy) * .3; l.st = 1; }
      else if (l.st >= 1) {
        const off = Math.hypot(l.fx - rx, l.fy - ry), far = Math.hypot(l.fx - hx, l.fy - hy);
        const nb = this.legs[(i + 1) % 9].st < 1 || this.legs[(i + 8) % 9].st < 1;
        if ((off > 26 * sc + 6 && !nb && moving < 4) || far > l.tot * .96 * sc) {
          let bx = rx, by = ry, bd = 30;
          for (const q of this.pts) { const d = Math.hypot(q[0] - rx, q[1] - ry); if (d < bd) { bd = d; bx = q[0]; by = q[1]; } }
          l.sx = l.fx; l.sy = l.fy; l.tx = bx; l.ty = by; l.st = 0; l.grip = bd < 30;
        }
      } else {
        l.st = Math.min(1, l.st + dt * (7 + speed * .014));
        const e = l.st * l.st * (3 - 2 * l.st); l.fx = l.sx + (l.tx - l.sx) * e; l.fy = l.sy + (l.ty - l.sy) * e;
        if (l.st >= 1 && speed > 60 && Math.random() < .5) this.sfx("step", l.fx / W, Math.min(1, speed / 700));
      }
      solve(l, hx, hy, l.fx, l.fy, sc, held ? 0 : side, l.st < 1 ? Math.sin(l.st * Math.PI) * 6 : held ? -3 : 1.5);
      const j = l.j, n = j.length - 1;
      g.strokeStyle = ink; g.lineWidth = 1.3; g.beginPath(); j.forEach((q, k) => (k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke();
      // every joint is a little open ring; the foot a bigger one, forked on two of the legs
      for (let k = 1; k < n; k++) { g.fillStyle = bg; g.beginPath(); g.arc(j[k][0], j[k][1], 2.3, 0, 7); g.fill(); g.stroke(); }
      const fa = Math.atan2(j[n][1] - j[n - 1][1], j[n][0] - j[n - 1][0]);
      if (l.fork) { g.beginPath(); [-.6, .6].forEach((o) => { g.moveTo(j[n][0], j[n][1]); g.lineTo(j[n][0] + Math.cos(fa + o) * 9 * sc, j[n][1] + Math.sin(fa + o) * 9 * sc); }); g.stroke(); }
      g.fillStyle = l.st >= 1 && l.grip && !held && !stun ? cols[i % 3] : ink; g.beginPath(); g.arc(j[n][0], j[n][1], 2.8, 0, 7); g.fill();
    });
    // two thin feelers that reach for you
    this.feel.forEach((l, i) => {
      const a = this.head + l.a, hx = p.x + Math.cos(a) * R, hy = p.y + Math.sin(a) * R, w = now / 260 + i * 2.1, far = Math.min(l.tot * .9 * sc, Math.max(18, dMouse - 6));
      const tx2 = held ? hx + Math.sin(w * 2) * 12 : hx + Math.cos(a + Math.sin(w) * .5) * far, ty2 = held ? hy + l.tot * .8 * sc : hy + Math.sin(a + Math.sin(w) * .5) * far;
      l.fx += (tx2 - l.fx) * .2; l.fy += (ty2 - l.fy) * .2;
      solve(l, hx, hy, l.fx, l.fy, sc, i ? -1 : 1, Math.sin(w * 1.7) * 2);
      const j = l.j, n = j.length - 1; g.strokeStyle = ink; g.lineWidth = 1; g.beginPath(); j.forEach((q, k) => (k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke();
      g.fillStyle = bg; g.beginPath(); g.arc(j[n][0], j[n][1], 2.6, 0, 7); g.fill(); g.stroke();
    });
    // body: a ring with one lens floating in it, and a smaller ring budding off its side
    const bob = Math.sin(now / 90) * Math.min(1.6, speed * .006), shake = this.rage > 1 ? rnd(-1, 1) * (this.rage - 1) : 0;
    const bx0 = p.x + shake, by0 = p.y + bob + shake, hot = this.aim > 0 || pounce || carry || this.rage > 1.2;
    g.strokeStyle = ink; g.lineWidth = 1.8; g.fillStyle = bg; g.beginPath(); g.arc(bx0, by0, R, 0, 7); g.fill(); g.stroke();
    const ba = this.head + 2.2 + Math.sin(now / 500) * .3; g.lineWidth = 1.3; g.beginPath(); g.arc(bx0 + Math.cos(ba) * (R + 4 * sc), by0 + Math.sin(ba) * (R + 4 * sc), Math.max(.4, 3.6 * sc + Math.sin(now / 300) * .6 * sc), 0, 7); g.fill(); g.stroke();
    const look = held ? 0 : 3.4 * sc, ex = bx0 + ch * look, ey = by0 + sh * look;
    if (stun) { g.lineWidth = 1.3; g.beginPath(); g.moveTo(bx0 - 3, by0 - 3); g.lineTo(bx0 + 3, by0 + 3); g.moveTo(bx0 + 3, by0 - 3); g.lineTo(bx0 - 3, by0 + 3); g.stroke(); }
    else { g.fillStyle = hot ? "#ff2d4a" : ink; g.beginPath(); g.arc(ex, ey, (held ? 5 : 3.3) * sc + (this.aim > 0 ? this.aim * 1.4 : 0), 0, 7); g.fill(); if (held) { g.fillStyle = bg; g.beginPath(); g.arc(ex + 1.5, ey - 1.5, 1.4, 0, 7); g.fill(); } }
    // your cursor, in its grip
    if (carry) {
      const wob = Math.sin(now / 45) * .25;
      g.save(); g.translate(mouthX, mouthY); g.rotate(this.head + Math.PI / 2 + wob); g.scale(1.25, 1.25);
      g.beginPath(); ARROW.forEach((q, i) => (i ? g.lineTo(q[0] - 3, q[1] - 2) : g.moveTo(q[0] - 3, q[1] - 2))); g.closePath(); g.fillStyle = "#000"; g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 1.2; g.stroke(); g.restore();
      if (now - (this.smashAt || 0) > 150) {
        this.smashAt = now;
        const el = document.elementFromPoint(mouthX, mouthY), t = el && !el.closest(".hole") ? el.closest(SEL) : null;
        if (t && now - (t._shot || 0) > 700) { t._shot = now; this.impact(mouthX, mouthY, ch, sh, t, pick(cols), 1.3); }
      }
      // the way out, written where you can read it: a still plate at the foot of the screen, not riding on the animal
      const k = clamp(this.meter / 1500, 0, 1), cx = W / 2, cy = H - 118, pw = 400, ph = 84;
      g.globalAlpha = .94; g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, ph / 2) : g.rect(cx - pw / 2, cy - ph / 2, pw, ph); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = "#ff2d4a"; g.lineWidth = 1.5; g.stroke();
      g.textAlign = "center"; g.textBaseline = "middle"; try { g.letterSpacing = "1.5px"; } catch (e) {}
      g.fillStyle = "#ff2d4a"; g.font = '600 11px "Geist Mono",ui-monospace,monospace'; g.fillText("IT HAS YOUR CURSOR", cx, cy - 22);
      g.fillStyle = ink; g.font = '600 16px "Geist Mono",ui-monospace,monospace'; g.fillText("SHAKE YOUR MOUSE TO BREAK FREE", cx, cy);
      try { g.letterSpacing = "0px"; } catch (e) {} g.textBaseline = "alphabetic";
      g.strokeStyle = ink; g.lineWidth = 1; g.strokeRect(cx - 130, cy + 17, 260, 7); g.fillStyle = "#ff2d4a"; g.fillRect(cx - 130, cy + 17, 260 * k, 7);
      if (Math.random() < dt * 3) this.sfx("chitter", p.x / W);
    }
    if (stun && Math.random() < dt * 5) this.sfx("chitter", p.x / W, .4);
    // lining up a shot: a dotted sightline and a box that closes on you, then it fires (and you've moved)
    if (st === "out" && this.grow >= 1) {
      this.cool -= dt;
      if (this.aim <= 0 && this.cool <= 0 && dMouse < 620) { this.aim = .001; this.sfx("aim", p.x / W, this.rage); }
      if (this.aim > 0) {
        this.aim += dt / Math.max(.14, .3 - this.rage * .05);
        const s = 26 - Math.min(1, this.aim) * 14;
        g.strokeStyle = "#ff2d4a"; g.lineWidth = 1; g.setLineDash([2, 6]); g.beginPath(); g.moveTo(ex, ey); g.lineTo(m.x, m.y); g.stroke(); g.setLineDash([]);
        g.strokeRect(m.x - s, m.y - s, s * 2, s * 2);
        if (this.aim >= 1) {
          this.aim = 0; this.cool = rnd(.3, 1) / (1 + this.rage * .6);
          const ax = m.x + m.vx * .06 - ex, ay = m.y + m.vy * .06 - ey, ld = Math.hypot(ax, ay) || 1, n = Math.random() < .25 + this.rage * .2 ? 3 : 1;
          for (let k = 0; k < n; k++) { const sp = n === 1 ? rnd(-.05, .05) : (k - 1) * .16 + rnd(-.03, .03), c0 = Math.cos(sp), s0 = Math.sin(sp); this.bolts.push({ x: ex, y: ey, ux: (ax / ld) * c0 - (ay / ld) * s0, uy: (ax / ld) * s0 + (ay / ld) * c0, d: 0, c: pick(cols) }); }
          v.x -= (ax / ld) * 220; v.y -= (ay / ld) * 220; this.sfx("shoot", ex / W, n);
        }
      }
    }
    // bolts fly on past you into the page; if nothing stops them they burst on the edge of the screen
    this.bolts = this.bolts.filter((b) => {
      let left = 2100 * dt, hit = null, edge = false;
      while (left > 0 && !hit && !edge) {
        const stp = Math.min(12, left); b.x += b.ux * stp; b.y += b.uy * stp; b.d += stp; left -= stp;
        if (b.x < 2 || b.y < 2 || b.x > W - 2 || b.y > H - 2 || b.d > 2400) { edge = true; break; }
        if (b.d < 40) continue;
        const el = document.elementFromPoint(b.x, b.y), t = el && !el.closest(".hole") ? el.closest(SEL) : null;
        if (t && now - (t._shot || 0) > 400) { t._shot = now; hit = t; }
      }
      g.strokeStyle = b.c; g.lineWidth = 2.4; g.beginPath(); g.moveTo(b.x - b.ux * 34, b.y - b.uy * 34); g.lineTo(b.x, b.y); g.stroke();
      if (hit || edge) { this.impact(clamp(b.x, 4, W - 4), clamp(b.y, 4, H - 4), b.ux, b.uy, hit, b.c); return false; }
      return true;
    });
    this.sparks = this.sparks.filter((q) => { const k = (now - q.t) / 420; if (k >= 1) return false; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .92; q.vy = q.vy * .92 + 14; g.globalAlpha = 1 - k; g.strokeStyle = q.c; g.lineWidth = 1.5; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x - q.vx * .035, q.y - q.vy * .035); g.stroke(); g.globalAlpha = 1; return true; });
    requestAnimationFrame(this.frame);
  };
}
