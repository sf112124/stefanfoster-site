// The thing in the hole. Let it out and it stalks your cursor on nine legs, lines you up and fires. It always misses you,
// and the page takes the hit: letters are blown loose and fall, pieces are knocked across the grid, pictures are shot
// full of holes until they hang off and drop. All the damage is done to the page itself. Stop moving and it pounces: it
// grabs your cursor and runs off with it, smashing it into things, until you shake it loose.
// And the ship. Launch it and you fly it yourself: WASD to move, it drifts, and its nose follows your cursor. Now it hunts the ship instead of your
// cursor, and its shots can land. Wear it down and its legs give out one by one; beat it and it drags itself home.
// When both are back where they belong, everything is put right.
const SEL = ".node,.wi .wt i,.ph h1 .ch,.aname i,.tile,.chip,.links>a,.links>.snd,.links>.nite,.bot>span:not(.bar),.lead,.alead,.gsec h2,.gsec p,.cli,.agrid dd,.agrid dt,.tile figcaption,.nx,.wi .wn,.akick";
const LETTER = ".wi .wt i,.ph h1 .ch,.aname i";
const SAFE = ".hole,.pad", MENU = ".hole,.pad,.snd,.nite";
const HP = 60, HULL = 6, RED = "#ff2d4a";
const WOUND = [8, 3, 7, 2];            // the legs that give out first as it's hurt
const KEYS = { ArrowLeft: "l", a: "l", A: "l", ArrowRight: "r", d: "r", D: "r", ArrowUp: "u", w: "u", W: "u", ArrowDown: "d", s: "d", S: "d", " ": "f" };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ARROW = [[0, 0], [0, 17], [4.4, 13], [7.3, 19.6], [10, 18.4], [7, 12], [12.6, 12]];
// holes are cut with a mask: the standard way where the browser has it, the old way where it doesn't
const MASK = typeof CSS !== "undefined" && CSS.supports?.("mask-composite", "intersect") ? ["maskImage", "maskComposite", "intersect"] : ["webkitMaskImage", "webkitMaskComposite", "source-in"];
const MONO = '"Geist Mono",ui-monospace,monospace';

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
// a still plate at the foot of the screen: anything you need to read goes here, never on something that's moving
function plate(g, cx, cy, w, h, bg, edge) {
  g.globalAlpha = .94; g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2) : g.rect(cx - w / 2, cy - h / 2, w, h); g.fill(); g.globalAlpha = 1;
  g.strokeStyle = edge; g.lineWidth = 1.5; g.stroke();
}
function type(g, txt, x, y, size, col, align = "center") {
  g.textAlign = align; g.textBaseline = "middle"; try { g.letterSpacing = "1.5px"; } catch (e) {}
  g.fillStyle = col; g.font = `600 ${size}px ${MONO}`; g.fillText(txt, x, y);
  try { g.letterSpacing = "0px"; } catch (e) {} g.textBaseline = "alphabetic";
}

export class Crawler {
  constructor({ holes, holeEl, pads = [], padEl, sfx, nodeHit, nodeReset, anchors, reduce = false }) {
    Object.assign(this, { holes, holeEl, pads, padEl, sfx: sfx || (() => {}), nodeHit, nodeReset, anchors, reduce });
    this.on = false; this.state = "home"; this.saved = new Map(); this.dmg = new Map();
    this.bolts = []; this.sparks = []; this.fall = []; this.rage = 0; this.hp = HP; this.sc = 1;
    this.ship = { on: false, alive: false, x: 0, y: 0, vx: 0, vy: 0, a: 0, spin: 0, hull: HULL, safe: 0, trail: [] };
    this.keys = {};
    this.m = { x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0, t: 0, moved: performance.now() };
    addEventListener("pointermove", (e) => {
      const now = performance.now(), dt = Math.max(8, now - this.m.t), dx = e.clientX - this.m.x, dy = e.clientY - this.m.y, d = Math.hypot(dx, dy);
      this.m.vx += (dx / dt * 1000 - this.m.vx) * .5; this.m.vy += (dy / dt * 1000 - this.m.vy) * .5; this.m.x = e.clientX; this.m.y = e.clientY; this.m.t = now;
      if (d > 2.5) this.m.moved = now;
      if (this.state === "carry" || this.state === "held") this.meter += d;
    });
    holes.forEach((h) => h.addEventListener("click", () => { h.blur(); this.on ? this.recall() : this.release(); }));
    pads.forEach((b) => b.addEventListener("click", () => { b.blur(); this.ship.on ? this.dock() : this.launch(); }));
    addEventListener("keydown", (e) => { if (e.key === "Escape") { if (this.on) this.recall(); if (this.ship.on) this.dock(); } });
    // flying: WASD (or the arrows) and the space bar are yours while the ship is out
    const key = (down) => (e) => {
      const k = KEYS[e.key]; if (!k || !this.ship.on || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest?.("input,textarea,[contenteditable]") || document.getElementById("lb")?.hidden === false) return;
      e.preventDefault(); e.stopPropagation(); this.keys[k] = down;
      if (down) { if (k === "f") this.ship.fired = true; else this.ship.drove = true; }
    };
    addEventListener("keydown", key(true), true); addEventListener("keyup", key(false), true);
    addEventListener("blur", () => { this.keys = {}; this.firing = false; });
    // while it has your cursor nothing you click lands; and a press right on it picks it up
    // flying: holding the mouse down fires, and nothing on the page takes the click (the menu buttons still do)
    addEventListener("pointerdown", (e) => {
      if (this.ship.on && e.button === 0 && !e.target.closest?.(MENU)) { e.stopPropagation(); e.preventDefault(); this.firing = !this.ship.docking; return; }
      if (!this.on) return;
      if (this.state === "carry") { e.stopPropagation(); e.preventDefault(); return; }
      if (["out", "pounce", "stun"].includes(this.state) && Math.hypot(e.clientX - this.p.x, e.clientY - this.p.y) < 34 && !e.target.closest?.(SAFE)) {
        e.stopPropagation(); e.preventDefault(); this.swallow = true;
        this.state = "held"; this.meter = 0; this.aim = 0; this.heldAt = performance.now();
        document.documentElement.classList.add("holding"); this.sfx("squeak");
      }
    }, true);
    addEventListener("pointerup", () => { this.firing = false; if (this.state === "held") this.letGo(); if (this.swallow) setTimeout(() => (this.swallow = false), 60); }, true);
    ["mousedown", "click"].forEach((t) => addEventListener(t, (e) => { if (this.state === "carry" || this.state === "held" || (t === "click" && this.swallow) || (this.ship.on && !e.target.closest?.(MENU))) { e.stopPropagation(); e.preventDefault(); if (t === "click") this.swallow = false; } }, true));
  }
  spot(el, q) { const r = (q ? el.querySelector(q) : el).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  holePos() { return this.spot(this.holeEl?.() || this.holes[0], "i"); }
  padPos() { return this.spot(this.padEl?.() || this.pads[0], "svg"); }
  label(t) { this.holes.forEach((h) => { h.classList.toggle("open", this.on); h.querySelector("span").textContent = t; }); }
  padLabel(t) { this.pads.forEach((b) => { b.classList.toggle("open", this.ship.on); b.querySelector("span").textContent = t; }); }
  ensure() {
    if (!this.cv) { this.cv = document.createElement("canvas"); this.cv.className = "crawl"; this.cv.setAttribute("aria-hidden", "true"); document.body.appendChild(this.cv); this.g = this.cv.getContext("2d"); }
    if (!this.running) { this.running = true; this.t = performance.now(); requestAnimationFrame(this.frame); }
  }
  release() {
    if (this.on) return;
    this.ensure();
    const h = this.holePos();
    this.on = true; this.state = "out"; this.grow = 0; this.rage = 0; this.meter = 0; this.hp = HP; this.hurtAt = 0;
    this.p = { x: h.x, y: h.y }; this.v = { x: -200, y: 260 }; this.head = Math.PI / 2; this.orbit = Math.random() * 6;
    this.legs = LEGS.map(chain); this.feel = FEEL.map(chain); this.tail = Array.from({ length: 6 }, () => [h.x, h.y]);
    [...this.legs, ...this.feel].forEach((l) => { l.fx = l.sx = l.tx = h.x; l.fy = l.sy = l.ty = h.y; l.j.forEach((q) => { q[0] = h.x; q[1] = h.y; }); });
    this.aim = 0; this.cool = 1.2; this.pcool = 2.5; this.pts = []; this.ptsAt = 0; this.m.moved = performance.now();
    this.label("CALL IT BACK"); document.documentElement.classList.add("crawling");
    this.sfx("out");
  }
  recall() {
    if (!this.on || this.state === "back" || this.state === "dying") return;
    if (this.state === "carry") this.free(true);
    document.documentElement.classList.remove("holding"); this.state = "back"; this.backAt = performance.now(); this.aim = 0;
    this.bolts = this.bolts.filter((b) => b.by === "ship"); this.sfx("back");
  }
  finish() {
    const beaten = this.state === "dying";
    this.on = false; this.state = "home"; this.rage = 0;
    this.label("DO NOT OPEN"); document.documentElement.classList.remove("crawling", "caught", "holding");
    this.bolts = this.bolts.filter((b) => b.by === "ship");
    if (beaten) this.sfx("win");
    this.settle();
  }
  // the page mends once nothing is left out to break it
  settle() { if (!this.on && !this.ship.on) this.restore(); }
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
  // ---- the ship ----
  launch() {
    if (this.ship.on) return;
    this.ensure();
    const h = this.padPos(), now = performance.now();
    Object.assign(this.ship, { on: true, alive: true, docking: false, x: h.x, y: h.y, vx: rnd(-50, 50), vy: 240, a: Math.PI / 2, spin: 0, hull: HULL, safe: now + 1500, born: now, fireAt: 0, drove: false, fired: false, size: 0, trail: [] });
    this.keys = {};
    this.padLabel("DOCK"); document.documentElement.classList.add("flying");
    this.sfx("launch");
  }
  dock() { const S = this.ship; if (!S.on || S.docking) return; S.docking = true; this.keys = {}; if (!S.alive) { const h = this.padPos(); S.x = h.x; S.y = h.y; } this.sfx("dock"); }
  parked() { this.ship.on = false; this.ship.alive = false; this.padLabel("LAUNCH"); document.documentElement.classList.remove("flying"); this.bolts = this.bolts.filter((b) => b.by !== "ship"); this.settle(); }
  burst(x, y, n, c, lo = 140, hi = 520) { const now = performance.now(); for (let k = 0; k < n; k++) { const a = rnd(0, 6.28), s = rnd(lo, hi); this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: now, c: Array.isArray(c) ? pick(c) : c }); } }
  shipHit(ux, uy) {
    const S = this.ship, now = performance.now();
    S.hull--; S.safe = now + 1800; S.vx += ux * 280; S.vy += uy * 280; S.spin = rnd(7, 12) * (Math.random() < .5 ? -1 : 1);
    this.burst(S.x, S.y, 10, [RED, this.shipCol()]);
    if (S.hull > 0) { this.sfx("shiphit", S.x / innerWidth); return; }
    // gone: it comes back out of its bay in a moment
    S.alive = false; S.respawn = now + 1700; this.keys = {};
    this.burst(S.x, S.y, 26, [RED, this.shipCol(), "#ff8a1e"], 120, 700);
    this.sfx("boom", S.x / innerWidth);
  }
  shipCol() { return document.documentElement.classList.contains("night") ? "#46ff8a" : "#3d5bff"; }
  // one of your shots lands on it
  hurt(b) {
    const now = performance.now();
    this.hp--; this.hurtAt = now; if (Math.random() < .3) this.aim = 0;
    this.v.x += b.ux * 70; this.v.y += b.uy * 70;
    this.burst(b.x, b.y, 5, [RED, b.c], 120, 420);
    if (this.hp > 0) { this.sfx("hurt", this.p.x / innerWidth); return; }
    if (this.state === "carry") this.free(true);
    document.documentElement.classList.remove("holding", "caught");
    this.state = "dying"; this.dyingAt = now; this.dragAt = 0; this.rage = 0;
    this.burst(this.p.x, this.p.y, 22, [RED, b.c], 100, 620);
    this.sfx("beaten", this.p.x / innerWidth);
  }
  // ---- damage ----
  set(el, prop, val) {
    let s = this.saved.get(el); if (!s) this.saved.set(el, (s = {}));
    if (!(prop in s)) s[prop] = el.style[prop];
    el.style[prop] = val;
  }
  colors() { return document.documentElement.classList.contains("night") ? ["#46ff8a", "#0bb8f0", "#b46cff", "#ff5ca8"] : ["#3d5bff", "#ff3d9a", "#ff8a1e", "#00b894"]; }
  drop(el, ux, uy, from) {
    // blown clean off: letters fly, tumble and land on the floor; a picture just drops off the page
    if (this.fall.some((f) => f.el === el) || this.fall.length > 70) return;
    const r = el.getBoundingClientRect(), box = el.closest(".wheel")?.getBoundingClientRect() || { left: 0, right: innerWidth, bottom: innerHeight };
    this.set(el, "transition", "none"); this.set(el, "position", "relative"); this.set(el, "zIndex", "5");
    if (from) { this.fall.push({ el, x: from.tx, y: from.ty, vx: ux * rnd(40, 120), vy: -rnd(40, 140), r: from.rot, vr: rnd(-70, 70), floor: from.ty + innerHeight - r.top + 80, left: -1e5, right: 1e5, s: 1, rest: false, away: true }); return; }
    this.set(el, "transform", "none");
    this.fall.push({ el, x: 0, y: 0, vx: ux * rnd(160, 420) + rnd(-60, 60), vy: uy * rnd(120, 300) - rnd(120, 320), r: 0, vr: rnd(-500, 500), floor: box.bottom - r.bottom - rnd(10, 34), left: box.left - r.left + 10, right: box.right - r.right - 10, s: rnd(1, 1.7), rest: false });
  }
  // a picture or a film takes a shot: it goes straight through. Holes where the shots landed, the frame knocked a little
  // further each time, until it's hanging by a corner, and then it falls.
  shootTile(el, dx, dy, power, x, y) {
    if (this.fall.some((f) => f.el === el)) return;
    const tm = el.querySelector(".tm") || el, r = tm.getBoundingClientRect();
    let d = this.dmg.get(el); if (!d) this.dmg.set(el, (d = { holes: [], n: 0, tx: 0, ty: 0, rot: 0, hang: 0 }));
    d.n++;
    const deep = rnd(8, Math.max(14, Math.min(r.width, r.height) * .55)), px = x + dx * deep, py = y + dy * deep;
    const hx = clamp((px - r.left) / r.width, .04, .96), hy = clamp((py - r.top) / r.height, .04, .96), R = rnd(5.5, 10) * Math.sqrt(power);
    d.holes.push([hx, hy, R]);
    for (let k = 0, n = Math.floor(rnd(1, 4)); k < n; k++) { const a = rnd(0, 6.28), q = R + rnd(3, 16); d.holes.push([clamp(hx + Math.cos(a) * q / r.width, .02, .98), clamp(hy + Math.sin(a) * q / r.height, .02, .98), rnd(1.4, 3.6)]); }
    if (d.holes.length > 26) d.holes.splice(0, d.holes.length - 26);
    const mask = d.holes.map((h) => `radial-gradient(circle at ${(h[0] * 100).toFixed(1)}% ${(h[1] * 100).toFixed(1)}%,transparent ${h[2].toFixed(1)}px,#000 ${(h[2] + .7).toFixed(1)}px)`).join(",");
    this.set(tm, MASK[0], mask); this.set(tm, MASK[1], MASK[2]);
    d.tx += dx * rnd(3, 10) * power; d.ty += dy * rnd(3, 10) * power; d.rot += rnd(-2.2, 2.2) * power;
    this.set(el, "position", "relative"); this.set(el, "zIndex", "3");
    if (d.n >= 7) { this.drop(el, dx, dy, d); return; }
    if (d.n >= 4 && !d.hang) { d.hang = dx > 0 ? 1 : -1; d.rot = d.hang * rnd(8, 15); d.ty += rnd(6, 14); this.set(el, "transformOrigin", d.hang > 0 ? "3% 2%" : "97% 2%"); }
    else if (d.hang) d.rot += d.hang * rnd(1, 4);
    this.set(el, "transition", `transform ${d.hang ? ".9s cubic-bezier(.3,2.4,.5,1)" : ".3s cubic-bezier(.2,1.8,.4,1)"}`);
    this.set(el, "transform", `translate(${d.tx.toFixed(1)}px,${d.ty.toFixed(1)}px) rotate(${d.rot.toFixed(1)}deg)`);
  }
  mutate(el, dx, dy, power = 1, x = 0, y = 0) {
    const c = pick(this.colors()), bounce = "transform .3s cubic-bezier(.2,1.8,.4,1),background-color .2s,color .2s,filter .3s,outline-color .2s,letter-spacing .3s";
    if (el.matches(".node")) { this.nodeHit?.(el, dx, dy, c, power); return c; }
    if (el.matches(".tile")) { this.shootTile(el, dx, dy, power, x, y); return c; }
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
  // light: one of the ship's shots, a smaller bang than one of its
  impact(x, y, ux, uy, hit, c, power = 1, light = false) {
    const now = performance.now(), W = innerWidth, j = light ? .45 : 1;
    const col = hit ? this.mutate(hit, ux, uy, power, x, y) || c : c;
    this.blast(x, y, light ? 70 : 110 + this.rage * 30, hit);
    for (let k = 0, n = light ? 7 : 12; k < n; k++) { const a = Math.atan2(uy, ux) + rnd(-1.4, 1.4), s = rnd(140, 560) * (light ? .7 : 1); this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: now, c: col }); }
    if (!this.reduce) document.body.animate([{ transform: `translate(${(-ux * 7 * j).toFixed(1)}px,${(-uy * 7 * j).toFixed(1)}px)` }, { transform: `translate(${(ux * 4 * j).toFixed(1)}px,${(uy * 4 * j).toFixed(1)}px)` }, { transform: "none" }], { duration: 190, easing: "ease-out" });
    if (!light) this.rage = Math.min(3, this.rage + (this.ship.on ? .015 : .06));
    this.sfx(light ? "tink" : "hit", x / W, 1 - y / innerHeight);
  }
  restore() {
    this.saved.forEach((s, el) => {
      if (!el.isConnected) return;
      el.style.transition = "transform .7s cubic-bezier(.2,.8,.2,1),background-color .5s,color .5s,filter .5s,outline-color .4s,opacity .5s,letter-spacing .5s";
      Object.keys(s).forEach((k) => { if (k !== "transition") el.style[k] = s[k]; });
      setTimeout(() => { el.style.transition = s.transition ?? ""; }, 750);
    });
    this.saved.clear(); this.dmg.clear(); this.fall = []; this.nodeReset?.();
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
    this.burst(this.p.x + Math.cos(this.head) * 34, this.p.y + Math.sin(this.head) * 34, 16, this.colors(), 160, 520);
    this.v.x += rnd(-500, 500); this.v.y += rnd(-500, 500);
    if (!quiet) this.sfx("free");
  }
  // ---- every frame ----
  frame = (now) => {
    const g = this.g, W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.cv.width !== Math.round(W * dpr) || this.cv.height !== Math.round(H * dpr)) { this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    if (!this.on && !this.ship.on) { this.running = false; return; }
    const dt = Math.min(.05, (now - this.t) / 1000); this.t = now;
    const cs = getComputedStyle(document.documentElement), ink = cs.getPropertyValue("--ink").trim() || "#0d0d0e", bg = cs.getPropertyValue("--bg").trim() || "#f4f3ef";
    const F = { now, dt, g, W, H, ink, bg, cols: this.colors() };
    g.lineCap = "round"; g.lineJoin = "round";
    // whatever has been blown loose is falling
    this.fall.forEach((f) => {
      if (f.rest || !f.el.isConnected) return;
      f.vy += 1900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vr * dt;
      if (f.x < f.left) { f.x = f.left; f.vx *= -.5; } if (f.x > f.right) { f.x = f.right; f.vx *= -.5; }
      if (f.y > f.floor) {
        f.y = f.floor;
        if (f.away) { f.rest = true; this.set(f.el, "opacity", "0"); this.sfx("thud", .5); }
        else if (Math.abs(f.vy) < 140) { f.rest = true; f.r = Math.round(f.r / 90) * 90 + rnd(-14, 14); } else { f.vy *= -.38; f.vx *= .6; f.vr *= .5; this.sfx("clack", .5); }
      }
      f.el.style.transform = `translate(${f.x.toFixed(1)}px,${f.y.toFixed(1)}px) rotate(${f.r.toFixed(f.away ? 1 : 0)}deg) scale(${f.s.toFixed(2)})`;
    });
    if (this.on) this.animal(F);
    if (this.ship.on) this.fly(F);
    this.shots(F);
    this.sparks = this.sparks.filter((q) => { const k = (now - q.t) / 420; if (k >= 1) return false; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .92; q.vy = q.vy * .92 + 14; g.globalAlpha = 1 - k; g.strokeStyle = q.c; g.lineWidth = 1.5; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x - q.vx * .035, q.y - q.vy * .035); g.stroke(); g.globalAlpha = 1; return true; });
    this.hud(F);
    requestAnimationFrame(this.frame);
  };
  // ---- the animal ----
  animal({ now, dt, g, W, H, ink, bg, cols }) {
    const p = this.p, v = this.v, m = this.m, S = this.ship;
    const st = this.state, back = st === "back", carry = st === "carry", stun = st === "stun", pounce = st === "pounce", held = st === "held", dying = st === "dying", going = back || dying;
    // with the ship out it's the ship it's after, not your cursor
    const vs = S.on && !S.docking, T = vs ? S : m, hpk = this.hp / HP;
    if (!going) this.grow = Math.min(1, this.grow + dt * 1.6);
    // where it wants to be
    const hole = this.holePos();
    let tx = T.x, ty = T.y, top = (560 + this.rage * 90) * (.62 + .38 * hpk) * (vs ? .5 : 1), grip = 4.5, stand = (vs ? 270 : 150) + Math.sin(now / 1700) * 30 - this.rage * 20;
    if (back) { tx = hole.x; ty = hole.y; stand = 0; top = 1100; grip = 12; }
    else if (dying) {
      // beaten: it hauls itself home in heaves, on the two legs that still work
      if (now - this.dragAt > 1050) { this.dragAt = now; this.sfx("drag", p.x / W); }
      const heave = Math.sin(Math.min(1, (now - this.dragAt) / 1050) * Math.PI);
      tx = hole.x; ty = hole.y; stand = 0; top = 26 + 300 * heave * heave; grip = 7;
    }
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
      const ax = gx - p.x, ay = gy - p.y, ad = Math.hypot(ax, ay) || 1, want = back ? Math.min(top, 200 + ad * 5) : dying ? top : Math.min(top, ad * (pounce ? 12 : 3.2));
      v.x += ((ax / ad) * want - v.x) * Math.min(1, dt * grip); v.y += ((ay / ad) * want - v.y) * Math.min(1, dt * grip);
      p.x += v.x * dt; p.y += v.y * dt;
      if (!going) { if (p.x < 24 || p.x > W - 24) v.x *= -.4; if (p.y < 24 || p.y > H - 24) v.y *= -.4; p.x = clamp(p.x, 24, W - 24); p.y = clamp(p.y, 24, H - 24); }
    }
    const speed = Math.hypot(v.x, v.y);
    let face = carry && speed > 40 ? Math.atan2(v.y, v.x) : Math.atan2(T.y - p.y, T.x - p.x); if (going) face = Math.atan2(dym, dxm);
    let da = face - this.head; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (stun) this.head += dt * 10 * Math.max(0, 1 - (now - this.stunAt) / 1100); else if (held) this.head += Math.sin(now / 90) * dt * 3 + clamp(m.vx * .0006, -.2, .2) * dt * 8; else this.head += da * Math.min(1, dt * (dying ? 2.5 : 7));
    const inHole = going && (dm < 32 || (back ? now - this.backAt > 2200 : now - this.dyingAt > 24000));
    if (inHole) { this.grow -= Math.max(dt, .016) * (dying ? 1.5 : 4); if (this.grow <= 0) { this.finish(); return; } }
    const crouch = pounce && now - this.pAt < 240 ? .8 : 1;
    const sc = (this.sc = Math.max(.05, this.grow) * (inHole ? Math.max(.05, this.grow) : 1) * 1.25 * crouch * (1 + this.rage * .08)), ch = Math.cos(this.head), sh = Math.sin(this.head);
    const dT = Math.hypot(T.x - p.x, T.y - p.y);
    // state changes
    if (st === "out" && this.grow >= 1) {
      this.pcool -= dt;
      if (!S.on && this.pcool <= 0 && now - m.moved > 850 && dT < 380) { this.state = "pounce"; this.pAt = now; this.aim = 0; this.sfx("pounce"); }
    } else if (pounce) {
      if (Math.hypot(m.x - p.x, m.y - p.y) < 34) this.grab();
      else if (now - this.pAt > 900) { this.state = "out"; this.pcool = rnd(2.2, 4) / (1 + this.rage * .4); this.cool = .5; }
    } else if (carry) {
      this.meter = Math.max(0, this.meter - 700 * dt);
      if (this.meter > 1500 || now - this.carryAt > 9000) this.free();
    } else if (stun && now - this.stunAt > 1700) this.state = "out";
    else if (held) { this.meter = Math.max(0, this.meter - 500 * dt); if (Math.random() < dt * 4) this.sfx("chitter", p.x / W, .5); }
    if (now - this.ptsAt > 450) { this.ptsAt = now; try { this.pts = this.anchors?.() || []; } catch (e) { this.pts = []; } }
    const moving = this.legs.filter((l) => l.st < 1).length, R = 10 * sc;
    const mouthX = p.x + ch * 30 * sc, mouthY = p.y + sh * 30 * sc;
    // a tail of beads that trails along behind it
    let lx = p.x - ch * R, ly = p.y - sh * R;
    this.tail.forEach((q, i) => { const gap = (9 - i) * sc, dx = q[0] - lx, dy = q[1] - ly + (held ? 3 : 0), d = Math.hypot(dx, dy) || 1; q[0] = lx + dx / d * gap; q[1] = ly + dy / d * gap; g.strokeStyle = ink; g.lineWidth = 1.2; g.beginPath(); g.moveTo(lx, ly); g.lineTo(q[0], q[1]); g.stroke(); g.fillStyle = i % 2 ? bg : ink; g.beginPath(); g.arc(q[0], q[1], Math.max(1.2, (4.2 - i * .55) * sc), 0, 7); g.fill(); g.stroke(); lx = q[0]; ly = q[1]; });
    // legs. Hurt, they give out one at a time and trail; beaten, only the front pair still pull
    const gone = dying ? 9 : Math.min(WOUND.length, Math.floor((1 - hpk) * (WOUND.length + 1)));
    this.legs.forEach((l, i) => {
      const a = this.head + l.a, hx = p.x + Math.cos(a) * R, hy = p.y + Math.sin(a) * R, reach = l.tot * .7 * sc, side = Math.sign(l.a) || 1;
      const rx = hx + Math.cos(a) * reach + v.x * .1, ry = hy + Math.sin(a) * reach + v.y * .1;
      const holding = carry && i % 4 === 0, limp = !held && (dying ? i !== 0 && i !== 4 : WOUND.indexOf(i) > -1 && WOUND.indexOf(i) < gone);
      if (holding) { l.fx = mouthX - sh * side * 5; l.fy = mouthY + ch * side * 5; l.st = 1; }
      else if (held) { const w = now / 110 + i * 1.7; l.fx += (hx + Math.cos(a) * 10 - clamp(m.vx, -900, 900) * .05 + Math.sin(w) * 9 - l.fx) * .25; l.fy += (hy + l.tot * .8 * sc + Math.cos(w * 1.3) * 7 - Math.abs(clamp(m.vx, -900, 900)) * .02 - l.fy) * .25; l.st = 1; }
      else if (limp) { const k = Math.min(1, dt * 2.6); l.fx += (hx - ch * l.tot * .8 * sc + Math.cos(a) * 9 - l.fx) * k; l.fy += (hy - sh * l.tot * .8 * sc + Math.sin(a) * 9 - l.fy) * k; l.st = 1; l.grip = false; }
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
        l.st = Math.min(1, l.st + dt * (dying ? 4.5 : 7 + speed * .014));
        const e = l.st * l.st * (3 - 2 * l.st); l.fx = l.sx + (l.tx - l.sx) * e; l.fy = l.sy + (l.ty - l.sy) * e;
        if (l.st >= 1 && speed > 60 && Math.random() < .5) this.sfx("step", l.fx / W, Math.min(1, speed / 700));
      }
      solve(l, hx, hy, l.fx, l.fy, sc, held || limp ? 0 : side, limp ? 0 : l.st < 1 ? Math.sin(l.st * Math.PI) * 6 : held ? -3 : 1.5);
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
      const a = this.head + l.a, hx = p.x + Math.cos(a) * R, hy = p.y + Math.sin(a) * R, w = now / 260 + i * 2.1, far = Math.min(l.tot * .9 * sc, Math.max(18, dT - 6));
      const tx2 = held ? hx + Math.sin(w * 2) * 12 : dying ? hx + Math.cos(a) * l.tot * .5 * sc : hx + Math.cos(a + Math.sin(w) * .5) * far, ty2 = held ? hy + l.tot * .8 * sc : dying ? hy + Math.sin(a) * l.tot * .5 * sc : hy + Math.sin(a + Math.sin(w) * .5) * far;
      l.fx += (tx2 - l.fx) * .2; l.fy += (ty2 - l.fy) * .2;
      solve(l, hx, hy, l.fx, l.fy, sc, i ? -1 : 1, dying ? 0 : Math.sin(w * 1.7) * 2);
      const j = l.j, n = j.length - 1; g.strokeStyle = ink; g.lineWidth = 1; g.beginPath(); j.forEach((q, k) => (k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke();
      g.fillStyle = bg; g.beginPath(); g.arc(j[n][0], j[n][1], 2.6, 0, 7); g.fill(); g.stroke();
    });
    // body: a ring with one lens floating in it, and a smaller ring budding off its side. It flashes when you land one.
    const bob = Math.sin(now / 90) * Math.min(1.6, speed * .006), shake = dying ? rnd(-.9, .9) : this.rage > 1 ? rnd(-1, 1) * (this.rage - 1) : 0;
    const bx0 = p.x + shake, by0 = p.y + bob + shake, hot = this.aim > 0 || pounce || carry || this.rage > 1.2, ow = now - this.hurtAt < 110;
    g.strokeStyle = ink; g.lineWidth = 1.8; g.fillStyle = ow ? RED : bg; g.beginPath(); g.arc(bx0, by0, R, 0, 7); g.fill(); g.stroke();
    g.fillStyle = bg; const ba = this.head + 2.2 + Math.sin(now / 500) * .3; g.lineWidth = 1.3; g.beginPath(); g.arc(bx0 + Math.cos(ba) * (R + 4 * sc), by0 + Math.sin(ba) * (R + 4 * sc), Math.max(.4, 3.6 * sc + Math.sin(now / 300) * .6 * sc), 0, 7); g.fill(); g.stroke();
    const look = held ? 0 : 3.4 * sc, ex = bx0 + ch * look, ey = by0 + sh * look;
    if (stun) { g.lineWidth = 1.3; g.beginPath(); g.moveTo(bx0 - 3, by0 - 3); g.lineTo(bx0 + 3, by0 + 3); g.moveTo(bx0 + 3, by0 - 3); g.lineTo(bx0 - 3, by0 + 3); g.stroke(); }
    else if (dying) { g.lineWidth = 1.6; g.beginPath(); g.moveTo(bx0 - sh * 4.5 * sc, by0 + ch * 4.5 * sc); g.lineTo(bx0 + sh * 4.5 * sc, by0 - ch * 4.5 * sc); g.stroke(); }
    else { g.fillStyle = hot ? RED : ink; g.beginPath(); g.arc(ex, ey, (held ? 5 : 3.3) * sc + (this.aim > 0 ? this.aim * 1.4 : 0), 0, 7); g.fill(); if (held) { g.fillStyle = bg; g.beginPath(); g.arc(ex + 1.5, ey - 1.5, 1.4, 0, 7); g.fill(); } }
    // your cursor, in its grip
    if (carry) {
      const wob = Math.sin(now / 45) * .25;
      g.save(); g.translate(mouthX, mouthY); g.rotate(this.head + Math.PI / 2 + wob); g.scale(1.25, 1.25);
      g.beginPath(); ARROW.forEach((q, i) => (i ? g.lineTo(q[0] - 3, q[1] - 2) : g.moveTo(q[0] - 3, q[1] - 2))); g.closePath(); g.fillStyle = "#000"; g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 1.2; g.stroke(); g.restore();
      if (now - (this.smashAt || 0) > 150) {
        this.smashAt = now;
        const el = document.elementFromPoint(mouthX, mouthY), t = el && !el.closest(SAFE) ? el.closest(SEL) : null;
        if (t && now - (t._shot || 0) > 700) { t._shot = now; this.impact(mouthX, mouthY, ch, sh, t, pick(cols), 1.3); }
      }
      if (Math.random() < dt * 3) this.sfx("chitter", p.x / W);
    }
    if (stun && Math.random() < dt * 5) this.sfx("chitter", p.x / W, .4);
    // lining up a shot: a dotted sightline and a box that closes on its target, then it fires. Your cursor it always
    // misses. The ship it leads, and can hit.
    if (st === "out" && this.grow >= 1 && (!S.on || (vs && S.alive))) {
      this.cool -= dt;
      if (this.aim <= 0 && this.cool <= 0 && dT < (vs ? 780 : 620)) { this.aim = .001; this.sfx("aim", p.x / W, this.rage); }
      if (this.aim > 0) {
        this.aim += dt / (vs ? .65 : Math.max(.14, .3 - this.rage * .05));
        const s = 26 - Math.min(1, this.aim) * 14;
        g.strokeStyle = RED; g.lineWidth = 1; g.setLineDash([2, 6]); g.beginPath(); g.moveTo(ex, ey); g.lineTo(T.x, T.y); g.stroke(); g.setLineDash([]);
        g.strokeRect(T.x - s, T.y - s, s * 2, s * 2);
        if (this.aim >= 1) {
          this.aim = 0; this.cool = vs ? rnd(1.2, 2.3) : rnd(.3, 1) / (1 + this.rage * .6);
          const lead = vs ? clamp(dT / 850, 0, .6) * rnd(.1, .8) : .06;
          const ax = T.x + T.vx * lead - ex, ay = T.y + T.vy * lead - ey, ld = Math.hypot(ax, ay) || 1, n = !vs && Math.random() < .25 + this.rage * .2 ? 3 : 1;
          for (let k = 0; k < n; k++) { const sp = n === 1 ? rnd(-.05, .05) * (vs ? 2.6 : 1) : (k - 1) * .16 + rnd(-.03, .03), c0 = Math.cos(sp), s0 = Math.sin(sp); this.bolts.push({ x: ex, y: ey, ux: (ax / ld) * c0 - (ay / ld) * s0, uy: (ax / ld) * s0 + (ay / ld) * c0, d: 0, c: pick(cols), by: "it", slow: vs }); }
          v.x -= (ax / ld) * 220; v.y -= (ay / ld) * 220; this.sfx("shoot", ex / W, n);
        }
      }
    }
  }
  // ---- flying ----
  fly({ now, dt, g, W, H, ink, bg }) {
    const S = this.ship, K = this.keys, m = this.m, col = this.shipCol(), pad = this.padPos();
    let ix = 0, iy = 0;
    if (S.docking) {
      // called in: it swings round and slides back into its bay
      const dx = pad.x - S.x, dy = pad.y - S.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, dt * 5);
      S.x += dx * k; S.y += dy * k; S.vx = S.vy = 0; let da = Math.atan2(dy, dx) - S.a; S.a += Math.atan2(Math.sin(da), Math.cos(da)) * Math.min(1, dt * 9);
      if (d < 26) { S.size -= dt * 5; if (S.size <= 0) { this.parked(); return; } } else { ix = dx / d; iy = dy / d; }
    } else if (!S.alive) {
      if (now > S.respawn) Object.assign(S, { alive: true, x: pad.x, y: pad.y, vx: rnd(-50, 50), vy: 240, a: Math.PI / 2, spin: 0, hull: HULL, safe: now + 1800, size: 0, trail: [] });
      else return;
    } else {
      S.size = Math.min(1, S.size + dt * 3);
      // its nose always follows your cursor (a hit knocks it spinning for a moment first)
      let da = Math.atan2(m.y - S.y, m.x - S.x) - S.a; da = Math.atan2(Math.sin(da), Math.cos(da));
      S.a += da * Math.min(1, dt * 22) * (1 - Math.min(1, Math.abs(S.spin) / 5)) + S.spin * dt; S.spin *= Math.max(0, 1 - dt * 4);
      // W A S D push it up, left, down, right. It keeps sliding when you let go.
      ix = (K.r ? 1 : 0) - (K.l ? 1 : 0); iy = (K.d ? 1 : 0) - (K.u ? 1 : 0);
      const il = Math.hypot(ix, iy);
      if (il) { ix /= il; iy /= il; S.vx += ix * 2000 * dt; S.vy += iy * 2000 * dt; this.sfx("thrust", S.x / W); }
      const drag = Math.max(0, 1 - dt * (il ? 1.1 : 1.7)); S.vx *= drag; S.vy *= drag;
      const sp = Math.hypot(S.vx, S.vy); if (sp > 640) { S.vx *= 640 / sp; S.vy *= 640 / sp; }
      S.x += S.vx * dt; S.y += S.vy * dt;
      if (S.x < 16 || S.x > W - 16) { S.vx *= -.45; S.x = clamp(S.x, 16, W - 16); } if (S.y < 16 || S.y > H - 16) { S.vy *= -.45; S.y = clamp(S.y, 16, H - 16); }
      const c = Math.cos(S.a), s = Math.sin(S.a);
      if ((K.f || this.firing) && now - S.fireAt > 150) {
        // three at a time: one straight down the nose and one fanned out either side
        S.fireAt = now; [-.12, 0, .12].forEach((o) => this.bolts.push({ x: S.x + c * 34, y: S.y + s * 34, ux: Math.cos(S.a + o), uy: Math.sin(S.a + o), d: 0, c: col, by: "ship" }));
        S.vx -= c * 16; S.vy -= s * 16; S.fired = true; this.sfx("pew", S.x / W);
      }
      // brush against it and you're just shoved clear
      if (this.on && this.grow >= 1 && !["back", "dying", "held"].includes(this.state)) { const dx = S.x - this.p.x, dy = S.y - this.p.y, d = Math.hypot(dx, dy) || 1; if (d < 32 * this.sc) { S.vx += (dx / d) * 3000 * dt; S.vy += (dy / d) * 3000 * dt; } }
      if (!S.alive) return;
    }
    const z = Math.max(.05, S.size) * 1.2, c = Math.cos(S.a), s = Math.sin(S.a), blink = !S.docking && now < S.safe && Math.floor(now / 90) % 2;
    // the line it has just flown, fading out behind it
    S.trail.push([S.x, S.y]); if (S.trail.length > 14) S.trail.shift();
    g.strokeStyle = col; g.lineWidth = 1.2;
    for (let k = 1; k < S.trail.length; k++) { g.globalAlpha = (k / S.trail.length) * .45; g.beginPath(); g.moveTo(S.trail[k - 1][0], S.trail[k - 1][1]); g.lineTo(S.trail[k][0], S.trail[k][1]); g.stroke(); }
    g.globalAlpha = blink ? .35 : 1;
    // it burns from whichever side pushes it the way you're steering
    if (ix || iy) { g.strokeStyle = col; g.lineWidth = 1.7; for (let k = -1; k <= 1; k++) { const bx = S.x - ix * 9 * z - iy * k * 4 * z, by = S.y - iy * 9 * z + ix * k * 4 * z, L = rnd(8, 22) * (k ? .6 : 1) * z; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - ix * L + rnd(-2, 2), by - iy * L + rnd(-2, 2)); g.stroke(); } }
    // the ship. A slim hull with a long needle of a gun, a lit ring for a cockpit, and two wire wings on jointed struts
    // that sweep back as it picks up speed and tuck in as it slides sideways.
    const fl = (S.vx * c + S.vy * s) / 540, sd = (-S.vx * s + S.vy * c) / 540, hot = now - S.fireAt < 70;
    g.save(); g.translate(S.x, S.y); g.rotate(S.a); g.scale(z, z * (1 - Math.abs(sd) * .3));
    g.strokeStyle = ink; g.fillStyle = bg;
    [-1, 1].forEach((k) => {
      const ex = -8 - fl * 2, ey = k * 12, tx = -17 - fl * 5, ty = k * (17 - Math.abs(fl) * 3.5);
      g.lineWidth = 1.2; g.beginPath(); g.moveTo(-1, k * 5.5); g.lineTo(ex, ey); g.lineTo(tx, ty); g.lineTo(-10.5, k * 4.5); g.stroke();
      g.beginPath(); g.moveTo(ex, ey); g.lineTo(-9, k * 5); g.stroke();
      g.beginPath(); g.arc(ex, ey, 1.9, 0, 7); g.fill(); g.stroke();
      g.beginPath(); g.arc(tx, ty, 2.5, 0, 7); g.fill(); g.stroke();
      g.fillStyle = ink; g.beginPath(); g.arc(-11.5, k * 4.2, 2, 0, 7); g.fill(); g.fillStyle = bg;
    });
    g.lineWidth = 1.7; g.beginPath(); g.moveTo(19, 0); g.quadraticCurveTo(7, -3.6, -3, -6.6); g.lineTo(-11, -4.4); g.lineTo(-7.5, 0); g.lineTo(-11, 4.4); g.lineTo(-3, 6.6); g.quadraticCurveTo(7, 3.6, 19, 0); g.closePath(); g.fill(); g.stroke();
    g.lineWidth = 1; g.beginPath(); g.moveTo(-7.5, 0); g.lineTo(0, 0); g.stroke();
    g.lineWidth = 1.2; g.fillStyle = col; g.beginPath(); g.arc(4.5, 0, 3.1, 0, 7); g.fill(); g.stroke();
    g.fillStyle = bg; g.beginPath(); g.arc(5.4, -1, .9, 0, 7); g.fill();
    g.lineWidth = 1.4; g.beginPath(); g.moveTo(19, 0); g.lineTo(26, 0); g.stroke();
    g.lineWidth = 1.1; g.fillStyle = hot ? col : bg; g.beginPath(); g.arc(27.8, 0, hot ? 2.6 : 1.8, 0, 7); g.fill(); g.stroke();
    if (hot) { g.strokeStyle = col; g.lineWidth = 1.4; [-.7, 0, .7].forEach((o) => { g.beginPath(); g.moveTo(30 + Math.cos(o) * 2, Math.sin(o) * 2); g.lineTo(30 + Math.cos(o) * 9, Math.sin(o) * 9); g.stroke(); }); }
    g.restore();
    // what it has left circles it: three small lights, one gone for every hit it takes
    if (!S.docking) for (let k = 0; k < S.hull; k++) { const o = now / 430 + k * (6.2832 / HULL), ox = S.x + Math.cos(o) * 25 * z, oy = S.y + Math.sin(o) * 25 * z; g.fillStyle = col; g.strokeStyle = ink; g.lineWidth = 1.1; g.beginPath(); g.arc(ox, oy, 2.4, 0, 7); g.fill(); g.stroke(); }
    g.globalAlpha = 1;
  }
  // ---- everything in the air ----
  shots({ now, dt, g, W, H }) {
    const S = this.ship, p = this.p, open = this.on && this.grow >= 1 && this.state !== "back" && this.state !== "dying";
    this.bolts = this.bolts.filter((b) => {
      const mine = b.by === "ship";
      let left = (mine ? 1050 : b.slow ? 850 : 2100) * dt, hit = null, edge = false, spent = false;
      while (left > 0 && !hit && !edge && !spent) {
        const stp = Math.min(12, left); b.x += b.ux * stp; b.y += b.uy * stp; b.d += stp; left -= stp;
        if (b.x < 2 || b.y < 2 || b.x > W - 2 || b.y > H - 2 || b.d > (mine ? 900 : 2400)) { if (mine) spent = true; else edge = true; break; }
        if (mine && open && Math.hypot(b.x - p.x, b.y - p.y) < 25 * this.sc) { this.hurt(b); spent = true; break; }
        if (!mine && S.on && S.alive && !S.docking && now > S.safe && Math.hypot(b.x - S.x, b.y - S.y) < 17) { this.shipHit(b.ux, b.uy); spent = true; break; }
        if (b.d < (mine ? 24 : 40)) continue;
        const el = document.elementFromPoint(b.x, b.y), t = el && !el.closest(SAFE) ? el.closest(SEL) : null;
        if (t && now - (t._shot || 0) > (mine ? 250 : 400)) { t._shot = now; hit = t; }
      }
      const tail = mine ? 13 : 34;
      g.strokeStyle = b.c; g.lineWidth = mine ? 2.2 : 2.4; g.beginPath(); g.moveTo(b.x - b.ux * tail, b.y - b.uy * tail); g.lineTo(b.x, b.y); g.stroke();
      if (hit || edge) { this.impact(clamp(b.x, 4, W - 4), clamp(b.y, 4, H - 4), b.ux, b.uy, hit, b.c, mine ? .8 : 1, mine); return false; }
      return !spent;
    });
    if (!this.on || this.state === "dying") this.bolts = this.bolts.filter((b) => b.by === "ship");
  }
  // ---- what you need to read ----
  hud({ now, g, W, H, ink, bg }) {
    const S = this.ship;
    if (this.on && this.state === "carry") {
      const k = clamp(this.meter / 1500, 0, 1), cx = W / 2, cy = H - 118;
      plate(g, cx, cy, 400, 84, bg, RED);
      type(g, "IT HAS YOUR CURSOR", cx, cy - 22, 11, RED); type(g, "SHAKE YOUR MOUSE TO BREAK FREE", cx, cy, 16, ink);
      g.strokeStyle = ink; g.lineWidth = 1; g.strokeRect(cx - 130, cy + 17, 260, 7); g.fillStyle = RED; g.fillRect(cx - 130, cy + 17, 260 * k, 7);
      return;
    }
    if (!S.on || S.docking) return;
    const cx = W / 2, cy = H - 64, col = this.shipCol();
    // first, how to fly it. It stays until you've turned, burned and fired.
    if (now - S.born < 9000 && !(S.drove && S.fired && now - S.born > 3500)) {
      plate(g, cx, cy, 560, 44, bg, col);
      type(g, "W A S D  MOVE      MOUSE  AIM      CLICK OR SPACE  FIRE", cx, cy + 1, 12, ink);
      return;
    }
    if (!this.on) return;
    // then the score: what's left of you, what's left of it
    plate(g, cx, cy, 440, 44, bg, ink);
    type(g, "YOU", cx - 196, cy + 1, 11, ink, "left");
    for (let k = 0; k < HULL; k++) { g.beginPath(); g.arc(cx - 150 + k * 14, cy, 4, 0, 7); g.strokeStyle = ink; g.lineWidth = 1.3; g.fillStyle = col; if (k < S.hull && S.alive) g.fill(); g.stroke(); }
    type(g, "IT", cx - 46, cy + 1, 11, RED, "left");
    g.strokeStyle = ink; g.lineWidth = 1; g.strokeRect(cx - 16, cy - 4, 210, 8); g.fillStyle = RED; g.fillRect(cx - 16, cy - 4, 210 * clamp(this.hp / HP, 0, 1), 8);
  }
}
