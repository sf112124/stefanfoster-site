// Foster Valley. The same portfolio as the real site, as a small adventure: the projects are out in the long grass,
// and you beat each one to see its work. Walk with the arrows or WASD, talk and confirm with Enter, Space or Z.
import { PROJECTS as ALLP, ABOUT } from "../projects.js";
const PROJECTS = ALLP.filter((p) => !p.page || p.slug === "les-benjamins"); // pages of their own (and locked ones) stay out of the game
import MEDIA from "../media.js";
import { buildArt, C } from "./art.js";
import { buildWorld, buildHouse, buildOffice, STARTERS, FOES, EXTRA, CORP, TRAINERS, SAY, ZONES, TT, TNAME, eff, formOf, stageOf } from "./data.js";
import { person, LOOKS } from "./people.js";

// each patch of long grass belongs to one project, by name, so the site's order can change without moving them
const GRASSOF = ["la-croisiere", "ai-commissions", "3d-explorations", "ai-experiments", "summer-of-sport", "relax", "coca-cola", "gumtree", "les-benjamins"];
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const VW = 320, VH = 180, DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const touch = matchMedia("(hover: none) and (pointer: coarse)").matches;
document.documentElement.classList.toggle("touch", touch);

const A = buildArt();
// people are drawn from outfit recipes; every creature and portrait is a painted sprite in game/art
for (const k in LOOKS) A.who[k] = person(LOOKS[k]);
A.who.you = A.who.boy; A.port = {}; A.monF = {};
const ART = ["balloon", "ai2", "ai3", "ps2", "ps3", "pr2", "pr3", "easing", "dj", "budget", "timesheet", "bigidea", "lion", "t_tim", "t_pat", "t_chris", "t_jeremy", "t_jimi", "ai", "ps", "pr", "croisiere", "commish", "blob", "goat", "sport", "relax", "fizz", "gum", "crawler", "brief", "kpi", "roi", "mediaplan", "vertical", "stakeholder", "deck", "t_stefan", "t_ad", "t_mm", "t_mp", "t_bs", "t_sl", "t_cmo"];
// walking sprites: one strip per person, nine frames (front, left, back; standing then each foot), right is the left mirrored
const WALK = ["stefan", "boy", "girl", "ad", "mm", "mp", "bs", "sl", "cmo", "tim", "pat", "chris", "jeremy", "jimi", "smoker", "vaper"];
await Promise.all(WALK.map((k) => new Promise((res) => { const im = new Image(); im.onload = () => {
  const fw = im.width / 9, fh = im.height, cut = (i) => { const c = document.createElement("canvas"); c.width = fw; c.height = fh; c.getContext("2d").drawImage(im, i * fw, 0, fw, fh, 0, 0, fw, fh); c._s = 2; return c; };
  const f = [...Array(9)].map((_, i) => cut(i)); A.who[k] = { down: f.slice(0, 3), left: f.slice(3, 6), up: f.slice(6, 9) }; A.who[k].right = A.who[k].left.map((c) => { const f = A.flip(c); f._s = 2; return f; }); res(); };
  im.onerror = res; im.src = `game/art/w_${k}.png`; })));
A.who.you = A.who.boy;
await Promise.all(ART.map((k) => new Promise((res) => { const im = new Image(); im.onload = () => { im._s = 2; if (k.startsWith("t_")) A.port[k.slice(2)] = im; else { A.mon[k] = im; const f = A.flip(im); f._s = 2; A.monF[k] = f; } res(); }; im.onerror = res; im.src = `game/art/${k}.png`; })));
// the screen is 320 by 180 game pixels, drawn at double density so the painted sprites keep their detail
const cv = $("cv"), g = cv.getContext("2d"); cv.width = 640; cv.height = 360; g.imageSmoothingEnabled = false;
const iw = (s) => s.width / (s._s || 1), ih = (s) => s.height / (s._s || 1);

// ---------- what's remembered between visits ----------
const S = { starter: null, lvl: 3, hp: null, won: [], flags: {}, reels: [], beat: [], look: "boy" };
const save = () => { try { localStorage.setItem("foster-valley", JSON.stringify(S)); } catch (e) {} };
const load = () => { try { const d = JSON.parse(localStorage.getItem("foster-valley") || "null"); if (d && STARTERS[d.starter]) { Object.assign(S, d); S.reels = S.reels || []; S.beat = S.beat || []; S.look = S.look || "boy"; A.who.you = A.who[S.look] || A.who.boy; return true; } } catch (e) {} return false; };
const stats = (lvl) => { const st = S.starter ? stageOf(S.starter, lvl) : 0; return { max: 30 + lvl * 6 + (S.reels || []).length * 2 + st * 10, atk: 10 + lvl + (S.reels || []).length + st * 3, def: 10 + lvl + st * 2 }; };

// ---------- sound: a few square waves, like an old handheld ----------
const au = {
  on: true, ctx: null, tune: null, step: 0, next: 0,
  unlock() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.out = this.ctx.createGain(); this.out.gain.value = .5; this.out.connect(this.ctx.destination); setInterval(() => this.pump(), 40); } catch (e) {} } if (this.ctx && this.ctx.state !== "running") this.ctx.resume(); },
  note(f, d, o = {}) {
    if (!this.on || !this.ctx || this.ctx.state !== "running" || !f) return;
    const t = (o.at || this.ctx.currentTime), os = this.ctx.createOscillator(), gn = this.ctx.createGain(), v = o.vol ?? .05;
    os.type = o.type || "square"; os.frequency.setValueAtTime(f, t); if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + d);
    gn.gain.setValueAtTime(v, t); gn.gain.setValueAtTime(v, t + d * .6); gn.gain.exponentialRampToValueAtTime(.0001, t + d);
    os.connect(gn); gn.connect(this.out); os.start(t); os.stop(t + d + .02);
  },
  hiss(d, vol = .06) {
    if (!this.on || !this.ctx || this.ctx.state !== "running") return;
    const n = Math.floor(this.ctx.sampleRate * d), b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(), gn = this.ctx.createGain(); s.buffer = b; gn.gain.value = vol; s.connect(gn); gn.connect(this.out); s.start();
  },
  sfx(k) {
    const N = (f, d, o) => this.note(f, d, o), t = this.ctx ? this.ctx.currentTime : 0, seq = (fs, d, o = {}) => fs.forEach((f, i) => N(f, d * 1.1, { ...o, at: t + i * d }));
    if (k === "blip") N(880, .05, { vol: .035 });
    else if (k === "ok") seq([660, 990], .06, { vol: .045 });
    else if (k === "back") N(330, .07, { vol: .04 });
    else if (k === "bump") N(110, .08, { type: "triangle", vol: .09 });
    else if (k === "door") seq([392, 523, 659], .07);
    else if (k === "encounter") seq([220, 277, 330, 415, 494, 622, 740, 932], .055, { vol: .05 });
    else if (k === "hit") { this.hiss(.12, .09); N(180, .12, { to: 70, vol: .06 }); }
    else if (k === "super") { this.hiss(.18, .11); N(260, .2, { to: 60, vol: .07 }); }
    else if (k === "miss") N(500, .16, { to: 260, type: "triangle", vol: .05 });
    else if (k === "heal") seq([523, 659, 784, 1047], .07, { type: "triangle", vol: .07 });
    else if (k === "buff") seq([392, 494, 587, 784], .05);
    else if (k === "faint") N(520, .5, { to: 70, vol: .06 });
    else if (k === "win") seq([523, 523, 523, 659, 784, 659, 1047], .11, { vol: .055 });
    else if (k === "level") seq([659, 784, 988, 1319], .09, { vol: .055 });
    else if (k === "lose") seq([392, 349, 311, 262, 196], .16, { type: "triangle", vol: .07 });
    else if (k === "secret") seq([784, 740, 622, 440, 415, 659, 831, 1047], .08);
    else if (k === "spot") seq([988, 1319, 0, 1319], .07, { vol: .05 });
    else if (k === "baa") { N(420, .12, { type: "sawtooth", vol: .04 }); N(380, .3, { type: "sawtooth", vol: .04, at: t + .12, to: 330 }); }
  },
  // two short tunes of my own: a slow one for walking about, a quick one for a fight
  TUNES: {
    world: { bpm: 96, lead: [76, 0, 79, 0, 81, 79, 76, 0, 74, 0, 76, 79, 74, 0, 72, 0, 76, 0, 79, 0, 84, 81, 79, 0, 81, 0, 79, 76, 74, 0, 72, 0], bass: [48, 0, 55, 0, 45, 0, 52, 0, 41, 0, 48, 0, 43, 0, 50, 0] },
    battle: { bpm: 152, lead: [69, 72, 76, 81, 76, 72, 69, 72, 67, 71, 74, 79, 74, 71, 67, 71, 65, 69, 72, 77, 72, 69, 65, 69, 64, 68, 71, 76, 80, 76, 71, 68], bass: [45, 45, 57, 45, 43, 43, 55, 43, 41, 41, 53, 41, 40, 40, 52, 40] },
  },
  // the soundtrack: three proper tracks, one for outside, one for the studio, one for a fight
  tracks: {}, vol: .42,
  fadeTo(a, v, ms, done) { clearInterval(a._f); const from = a.volume, s = performance.now(); a._f = setInterval(() => { const k = Math.min(1, (performance.now() - s) / ms); a.volume = from + (v - from) * k; if (k >= 1) { clearInterval(a._f); done && done(); } }, 30); },
  music(name) {
    if (name === "world" && map && map.id !== "world") name = "studio";
    if (this.tune === name) return; const prev = this.tracks[this.tune]; this.tune = name;
    if (prev) this.fadeTo(prev, 0, 400, () => prev.pause());
    if (!name || !this.on) return;
    const a = this.tracks[name] || (this.tracks[name] = Object.assign(new Audio(`game/music/${name}.mp3`), { loop: true, volume: 0, preload: "auto" }));
    if (name === "battle") a.currentTime = 0;
    a.play().catch(() => {}); this.fadeTo(a, this.vol, 600);
  },
  toggle() { const a = this.tracks[this.tune]; if (!a) { if (this.on && this.tune) { const t = this.tune; this.tune = null; this.music(t); } return; } if (this.on) { a.play().catch(() => {}); this.fadeTo(a, this.vol, 300); } else this.fadeTo(a, 0, 200, () => a.pause()); },
  pump() { return;
    if (!this.on || !this.ctx || this.ctx.state !== "running" || !this.tune) return;
    const T = this.TUNES[this.tune], d = 60 / T.bpm / 2, hz = (m) => (m ? 440 * Math.pow(2, (m - 69) / 12) : 0);
    if (this.next < this.ctx.currentTime) this.next = this.ctx.currentTime + .05;
    while (this.next < this.ctx.currentTime + .15) {
      this.note(hz(T.lead[this.step % T.lead.length]), d * .9, { at: this.next, vol: .016 });
      this.note(hz(T.bass[this.step % T.bass.length]), d * .95, { at: this.next, vol: .04, type: "triangle" });
      this.step++; this.next += d;
    }
  },
};

// ---------- hands: keys, and buttons on a phone ----------
const keys = {}, tap = {}; let lastInput = performance.now();
const KEY = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right", enter: "a", " ": "a", z: "a", x: "b", escape: "b", backspace: "b", f: "f", tab: "f", m: "m" };
const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"]; let kpos = 0;
const press = (k) => { if (!keys[k]) tap[k] = true; keys[k] = true; lastInput = performance.now(); au.unlock(); };
addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const raw = e.key.toLowerCase(); kpos = raw === KONAMI[kpos] ? kpos + 1 : raw === KONAMI[0] ? 1 : 0; if (kpos === KONAMI.length) { kpos = 0; night(); }
  const k = KEY[raw]; if (!k) return; e.preventDefault(); if (!e.repeat) press(k);
});
addEventListener("keyup", (e) => { const k = KEY[e.key.toLowerCase()]; if (k) keys[k] = false; });
addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
document.querySelectorAll("[data-k]").forEach((b) => {
  const k = b.dataset.k;
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); press(k); b.classList.add("on"); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((t) => b.addEventListener(t, () => { keys[k] = false; b.classList.remove("on"); }));
});
const took = (k) => { if (tap[k]) { tap[k] = false; return true; } return false; };

// ---------- words on the screen ----------
const ui = {
  dlg: $("dlg"), txt: $("txt"), who: $("who"), more: $("more"), menu: $("menu"), cur: null, ch: null,
  // say some lines, one box at a time. Resolves when the last one has been read.
  async say(lines, o = {}) { for (const l of [].concat(lines)) await this.line(l, o); if (!o.keep) this.hide(); },
  line(text, o = {}) {
    return new Promise((res) => {
      this.dlg.hidden = false; this.who.textContent = o.who || ""; this.who.hidden = !o.who; this.txt.textContent = ""; this.more.hidden = true;
      this.cur = { text, n: 0, t: 0, res, auto: o.auto || 0, done: false, hold: 0 };
    });
  },
  hide() { this.dlg.hidden = true; this.cur = null; },
  show(text) { this.dlg.hidden = false; this.who.hidden = true; this.txt.textContent = text; this.more.hidden = true; this.cur = null; },
  // pick one of a few
  choose(opts, o = {}) {
    return new Promise((res) => {
      this.menu.hidden = false; this.menu.className = "menu" + (o.cls ? " " + o.cls : ""); this.menu.style.setProperty("--cols", o.cols || 1);
      this.menu.innerHTML = opts.map((t, i) => `<button type="button" data-i="${i}">${typeof t === "string" ? esc(t) : t.html}</button>`).join("");
      this.ch = { n: opts.length, i: 0, cols: o.cols || 1, cancel: o.cancel, res }; this.mark();
      this.menu.querySelectorAll("button").forEach((b) => { b.addEventListener("click", () => { this.ch.i = +b.dataset.i; this.pickNow(); }); b.addEventListener("pointerenter", () => { if (this.ch) { this.ch.i = +b.dataset.i; this.mark(); } }); });
    });
  },
  mark() { this.menu.querySelectorAll("button").forEach((b, i) => b.classList.toggle("sel", i === this.ch.i)); },
  pickNow(v) { const c = this.ch; if (!c) return; this.ch = null; this.menu.hidden = true; au.sfx(v === -1 ? "back" : "ok"); c.res(v === -1 ? -1 : c.i); },
  update(dt) {
    const d = this.cur;
    if (d && !this.ch) {
      if (!d.done) { d.t += dt; const n = Math.min(d.text.length, Math.floor(d.t * 46)); if (n !== d.n) { d.n = n; this.txt.textContent = d.text.slice(0, n); if (n % 3 === 0) au.sfx("blip"); } if (n >= d.text.length) { d.done = true; this.more.hidden = !!d.auto; } if (took("a") || took("b")) { d.n = d.text.length; this.txt.textContent = d.text; d.done = true; this.more.hidden = !!d.auto; } }
      else { d.hold += dt; if (took("a") || took("b") || (d.auto && d.hold > d.auto)) { const r = d.res; this.cur = null; r(); } }
    }
    const c = this.ch;
    if (c) {
      const mv = (n) => { c.i = (c.i + n + c.n) % c.n; this.mark(); au.sfx("blip"); };
      if (took("up")) mv(-c.cols); if (took("down")) mv(c.cols); if (took("left")) mv(-1); if (took("right")) mv(1);
      if (took("a")) this.pickNow(); else if (took("b") && c.cancel) this.pickNow(-1);
    }
  },
};
$("dlg").addEventListener("click", () => press("a"));
let toastT = 0; const toast = (t, ms = 2200) => { const e = $("toast"); e.textContent = t; e.classList.add("in"); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove("in"), ms); };

// ---------- the maps ----------
function prep(m) {
  const c = document.createElement("canvas"); c.width = m.W * 16; c.height = m.H * 16; const b = c.getContext("2d"), I = (x, y) => y * m.W + x;
  const at = (x, y) => (x < 0 || y < 0 || x >= m.W || y >= m.H ? -1 : m.base[I(x, y)]);
  for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) { const t = m.base[I(x, y)], imgs = A.tile[TNAME[t]]; b.drawImage(imgs[m.vr[I(x, y)] % imgs.length], x * 16, y * 16); }
  // soften every edge where two kinds of ground meet
  const soft = new Set([TT.path, TT.sand, TT.track, TT.soil]), nb = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
    const t = at(x, y);
    nb.forEach(([dx, dy], side) => {
      const n = at(x + dx, y + dy); if (n < 0 || n === t) return;
      if (soft.has(t) && (n === TT.grass || n === TT.lawnA || n === TT.lawnB)) A.fringe(b, x * 16, y * 16, side, C.g1, I(x, y));
      else if (t === TT.water && n !== TT.bridge) A.fringe(b, x * 16, y * 16, side, C.foam, I(x, y));
      else if (t === TT.fizz) A.fringe(b, x * 16, y * 16, side, "#f6c98f", I(x, y));
      else if (t === TT.path && n === TT.sand) A.fringe(b, x * 16, y * 16, side, C.s1, I(x, y));
    });
  }
  m.bake = c; m.I = I;
  m.objs.forEach((o) => { o.w = o.w || 1; });
  m.flat = m.objs.filter((o) => o.flat); m.tall = m.objs.filter((o) => !o.flat);
  return m;
}
const maps = { world: prep(buildWorld()), house: prep(buildHouse()), mal0: prep(buildOffice(0)), mal1: prep(buildOffice(1)), mal2: prep(buildOffice(2)) };
// eight film reels hidden around the valley, each on the nearest free bit of ground to its spot
{ const m = maps.world, spots = [[6, 18], [44, 15], [68, 19], [20, 25], [56, 31], [27, 47], [47, 47], [4, 34]];
  const free = (x, y) => x > 1 && y > 1 && x < m.W - 2 && y < m.H - 2 && !m.solid[m.I(x, y)] && !m.tg[m.I(x, y)] && !m.objs.some((o) => !o.flat && y === o.y && x >= o.x && x < o.x + (o.w || 1));
  spots.forEach(([sx, sy], n) => { for (let r = 0; r < 8; r++) { let done = false; for (let dy = -r; dy <= r && !done; dy++) for (let dx = -r; dx <= r && !done; dx++) if (free(sx + dx, sy + dy)) { m.objs.push({ k: "reel", n, x: sx + dx, y: sy + dy, w: 1, flat: 1 }); done = true; } if (done) break; } });
  m.flat = m.objs.filter((o) => o.flat); }
let map = maps.house, mode = "title", busy = false, t0 = 0, cam = { x: 0, y: 0 }, nightOn = false, zoneNow = "", fade = 0, bt = null;
const P = { x: 3, y: 4, fx: 3, fy: 4, px: 48, py: 64, dir: "down", moving: false, t: 0, steps: 0, grass: 0 };
const objAt = (x, y) => map.objs.find((o) => !o.gone && y === o.y && x >= o.x && x < o.x + o.w && (o.solid || o.act));
const blocked = (x, y) => x < 0 || y < 0 || x >= map.W || y >= map.H || map.solid[map.I(x, y)] || map.objs.some((o) => o.k === "npc" && !o.gone && y === o.y && x >= o.x && x < o.x + o.w);
function place(m, x, y, dir) { map = m; P.x = P.fx = x; P.y = P.fy = y; P.px = x * 16; P.py = y * 16; P.moving = false; if (dir) P.dir = dir; P.grass = 0; }
async function warp(m, x, y, dir) { busy = true; au.sfx("door"); await fadeTo(1, 220); place(m, x, y, dir); au.music("world"); zoneNow = ""; await fadeTo(0, 220); busy = false; }
function fadeTo(v, ms) { return new Promise((res) => { const a = fade, s = performance.now(); const step = (n) => { const k = clamp((n - s) / ms, 0, 1); fade = a + (v - a) * k; if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }); }
function night() { nightOn = !nightOn; au.sfx("secret"); toast(nightOn ? "NIGHT MODE" : "DAY MODE"); }

// ---------- walking about ----------
function walk(dt) {
  if (P.moving) {
    P.t += dt / (keys.b ? .095 : .165);
    if (P.t >= 1) { P.moving = false; P.px = P.x * 16; P.py = P.y * 16; arrive(); }
    else { P.px = (P.fx + (P.x - P.fx) * P.t) * 16; P.py = (P.fy + (P.y - P.fy) * P.t) * 16; }
  }
  if (P.moving || busy) return;
  if (took("f")) { folio(); return; }
  if (took("a")) { const [dx, dy] = DIRS[P.dir], o = objAt(P.x + dx, P.y + dy); if (o && o.act) { run(o.act, o); return; } }
  for (const d of ["up", "down", "left", "right"]) if (keys[d]) {
    const [dx, dy] = DIRS[d]; P.dir = d;
    if (blocked(P.x + dx, P.y + dy)) { if (tap[d]) au.sfx("bump"); tap[d] = false; return; }
    tap[d] = false; P.fx = P.x; P.fy = P.y; P.x += dx; P.y += dy; P.t = 0; P.moving = true; P.steps++; return;
  }
}
async function script(fn) { if (busy) return; busy = true; try { await fn(); } finally { busy = false; for (const k in tap) tap[k] = false; } }
function arrive() {
  const i = map.I(P.x, P.y);
  const wp = (map.warps || []).find((w) => w.x === P.x && w.y === P.y);
  if (wp) { warp(maps[wp.to], wp.tx, wp.ty, wp.dir); return; }
  if (map.id !== "world") { const sp = spotted(); if (sp) script(() => challenge(sp)); }
  if (map.id === "house" && map.base[i] === TT.mat) {
    if (!S.starter) { script(async () => { await ui.say(SAY.needPick, { who: "STEFAN" }); place(map, P.x, P.y - 1, "up"); }); return; }
    warp(maps.world, 35, 37, "down"); return;
  }
  if (map.id === "world") {
    const rl = map.objs.find((o) => o.k === "reel" && o.x === P.x && o.y === P.y && !S.reels.includes(o.n));
    if (rl) { S.reels.push(rl.n); const st = stats(S.lvl); S.hp = Math.min(st.max, (S.hp ?? st.max) + 2); save(); hud(); au.sfx("level"); script(async () => { await ui.say([`You found a film reel! (${S.reels.length} of 8)`, SAY.reels[rl.n], "Your tool feels stronger."]); }); return; }
    if (P.x === 35 && P.y === 36) { warp(maps.house, 6, 7, "up"); return; }
    if (P.x === 46 && P.y === 35) {
      if (S.won.length < 4) { script(async () => { await ui.say(SAY.malLocked); place(map, 46, 36, "down"); }); return; }
      warp(maps.mal0, 15, 12, "up"); return;
    }
    const sp = spotted(); if (sp) { P.grass = 0; script(() => challenge(sp)); return; }
    const z = ZONES.find((q) => P.x >= q.r[0] && P.x <= q.r[2] && P.y >= q.r[1] && P.y <= q.r[3]); const zn = z ? z.n : "";
    if (zn && zn !== zoneNow) toast(zn.toUpperCase(), 1800); zoneNow = zn;
    const tg = map.tg[i];
    if (tg) {
      const slug = GRASSOF[tg - 1]; P.grass++;
      if (!S.won.includes(slug) && P.grass >= 2 && (P.grass >= 7 || Math.random() < .3)) { P.grass = 0; script(() => fight(FOES[slug], slug)); }
    } else P.grass = 0;
  }
}
// ---------- everything you can poke ----------
async function run(act, o) {
  await script(async () => {
    const [a, b] = act.split(":");
    if (a === "sign") { au.sfx("ok"); await ui.say(SAY.signs[b], { cls: "sign" }); }
    else if (a === "pick") await choosePick(b);
    else if (a === "stefan") await stefan();
    else if (a === "coffee") { await ui.say(SAY.coffee[0]); S.hp = stats(S.lvl).max; au.sfx("heal"); if (S.starter) await ui.say(SAY.coffee[1]); save(); }
    else if (a === "trainer") await chat(o);
    else if (a === "smoke") { o.dir = OPP[P.dir]; await ui.say(SAY.smoke[+b]); }
    else if (a === "malcoffee") { await ui.say(SAY.malcoffee[0]); S.hp = stats(S.lvl).max; au.sfx("heal"); if (S.starter) await ui.say(SAY.malcoffee[1]); save(); }
    else if (a === "guitar") { const t = au.ctx ? au.ctx.currentTime : 0; [392, 494, 587, 784, 659, 587, 494, 587].forEach((f, i) => au.note(f, .5, { at: t + i * .16, type: "triangle", vol: .06 })); await ui.say(SAY.guitar); }
    else if (a === "arcade") { await ui.say(SAY.arcade, { keep: true }); const c = await ui.choose(["Play it", "Not now"], { cls: "yn" }); ui.hide(); if (c === 0) window.open("synth", "_blank"); }
    else if (a === "balloons") { await ui.say(SAY.balloons, { keep: true }); const c = await ui.choose(["See the page", "Keep exploring"], { cls: "yn" }); ui.hide(); if (c === 0) window.open("benjamins", "_blank"); }
    else if (a === "goat") { au.sfx("baa"); await ui.say(SAY.goat); }
    else if (a === "hole") {
      if (S.flags.crawler) { await ui.say(SAY.holeDone); return; }
      await ui.say(SAY.hole, { keep: true }); const c = await ui.choose(["Leave it", "Open it"], { cls: "yn" }); ui.hide();
      if (c === 1) { au.sfx("secret"); const r = await fight(EXTRA.crawler); if (r === "win") { S.flags.crawler = 1; save(); } }
    }
    else if (SAY[a]) await ui.say(SAY[a]);
  });
}
async function choosePick(id) {
  const m = STARTERS[id];
  if (S.starter) { await ui.say(S.starter === id ? SAY.taken : SAY.left); return; }
  if (!S.flags.intro) { await stefan(); return; }
  await ui.say([m.about], { keep: true });
  const c = await ui.choose([`Take ${m.name}`, "Not yet"], { cls: "yn" }); ui.hide();
  if (c !== 0) return;
  S.starter = id; S.lvl = 3; S.hp = stats(3).max; au.sfx("level"); save(); hud();
  await ui.say([`You took ${m.name}.`]); await ui.say(SAY.after, { who: "STEFAN" });
  toast(touch ? "WALK WITH THE PAD · A TO TALK · FOLIO IS UP TOP" : "WALK: ARROWS OR WASD · TALK: ENTER · FOLIO: F", 5000);
}
async function stefan() {
  const who = "STEFAN";
  if (!S.flags.intro) { S.flags.intro = 1; await speak("stefan", SAY.intro, who); return; }
  if (!S.starter) { await speak("stefan", SAY.noPick, who); return; }
  const n = S.won.length;
  if (n >= PROJECTS.length && !S.flags.badge) { await speak("stefan", ["That's all of them. You've seen everything I've made.", "Which means the MAL office has opened its doors for you. It's just east of the square.", "Tim's at the top, in the glass office. Good luck."], who); return; }
  if (n >= PROJECTS.length) { await speak("stefan", SAY.ending, who); S.flags.end = 1; save(); await endCard(); return; }
  const next = PROJECTS.find((p) => !S.won.includes(p.slug)), left = 5 - S.beat.filter((b) => !TRAINERS[b].boss).length;
  await speak("stefan", [`${n} of ${PROJECTS.length} found.`, `${next.title} is at ${FOES[next.slug].zone}.`, ...(S.beat.includes("cmo") ? [] : left > 0 ? [`There are still ${left} people out on the roads who want a quick chat.`] : ["The CMO is waiting at the top of the north road."])], who);
}
// a face slides in beside the words while someone talks
let talk = null;
async function speak(port, lines, who) {
  talk = { img: A.port[port], k: 0 }; await tween(220, (k) => talk && (talk.k = k));
  await ui.say(lines, { who });
  const t = talk; await tween(180, (k) => t && (t.k = 1 - k)); talk = null;
}
// ---------- the people on the roads ----------
const trainerObjs = () => map.objs.filter((o) => o.tr);
const beatCount = () => S.beat.filter((b) => !TRAINERS[b].map && !TRAINERS[b].boss).length;
const ready = (id) => !S.beat.includes(id) && (TRAINERS[id].needs || []).every((b) => S.beat.includes(b));
function spotted() {
  for (const o of trainerObjs()) {
    if (!ready(o.tr)) continue;
    const [dx, dy] = DIRS[o.dir], along = (P.x - o.x) * dx + (P.y - o.y) * dy, across = dx ? P.y - o.y : P.x - o.x;
    if (along < 1 || along > 4 || Math.abs(across) > 1) continue;
    let clear = true; for (let s = 1; s < along; s++) { const x = o.x + dx * s + (dy ? across : 0), y = o.y + dy * s + (dx ? across : 0); if (blocked(x, y)) clear = false; }
    if (clear) return o;
  }
  return null;
}
const OPP = { up: "down", down: "up", left: "right", right: "left" };
async function challenge(o) {
  au.sfx("spot"); o.bang = performance.now(); await sleep(800);
  // they walk over to you
  for (let n = 0; n < 6; n++) {
    const ex = P.x - o.x, ey = P.y - o.y; if (Math.abs(ex) + Math.abs(ey) <= 1) break;
    const opts = Math.abs(ex) >= Math.abs(ey) ? [[Math.sign(ex), 0], [0, Math.sign(ey)]] : [[0, Math.sign(ey)], [Math.sign(ex), 0]];
    const mv = opts.find(([x, y]) => (x || y) && !blocked(o.x + x, o.y + y) && !(o.x + x === P.x && o.y + y === P.y)); if (!mv) break;
    o.dir = mv[0] > 0 ? "right" : mv[0] < 0 ? "left" : mv[1] > 0 ? "down" : "up";
    await tween(170, (k) => { o.dx = mv[0] * 16 * k; o.dy = mv[1] * 16 * k; o.step = k < .55 ? 1 + (n % 2) : 0; }); o.x += mv[0]; o.y += mv[1]; o.dx = o.dy = 0; o.step = 0;
  }
  const ex = P.x - o.x, ey = P.y - o.y; o.dir = Math.abs(ex) >= Math.abs(ey) ? (ex > 0 ? "right" : "left") : ey > 0 ? "down" : "up"; P.dir = OPP[o.dir];
  await duel(o);
}
async function chat(o) {
  const t = TRAINERS[o.tr]; o.dir = OPP[P.dir];
  if (S.beat.includes(o.tr)) { await speak(t.port.slice(2), t.after, t.name); return; }
  if (!S.starter) { await speak(t.port.slice(2), ["Oh, you haven't got a tool yet? Come back when you have."], t.name); return; }
  if (!ready(o.tr)) { await speak(t.port.slice(2), t.gate, t.name); return; }
  await duel(o);
}
async function duel(o) {
  const t = TRAINERS[o.tr], pk = t.port.slice(2);
  await speak(pk, t.intro, `${t.name} · ${t.role}`);
  const r = await fight(null, null, o.tr);
  if (r === "win") {
    await speak(pk, t.win, t.name);
    if (o.tr === "tim") { S.flags.badge = 1; save(); hud(); au.sfx("win"); await ui.say(SAY.badge); toast("MAL BADGE. GO BACK AND SEE STEFAN.", 5000); }
    else if (o.tr === "cmo") toast("THE CLIENT SIGNED IT OFF", 4000);
    else { const u = Object.values(TRAINERS).find((x) => x.needs && x.needs.includes(o.tr) && x.needs.every((b) => S.beat.includes(b))); if (u) toast(u.unlock, 4500); }
  }
}

// ---------- a fight ----------
const TCOL = { AI: "#57c9b5", IMAGE: "#6ea4f2", FILM: "#b79cff", NONE: "#ff2d4a" };
const BG = { "les-benjamins": ["#bfe3ff", "#9be15d", "#ff9dbb"], corp: ["#e8edf5", "#9fb4d9", "#ffd76a"],  "la-croisiere": ["#bfeaf7", "#ffe9b8", "#ff9dbb"], "ai-commissions": ["#b7f3e4", "#57c9b5", "#b79cff"], "3d-explorations": ["#e0d4ff", "#a58cf0", "#86d2ec"], "ai-experiments": ["#ffc4f1", "#e772cf", "#ffd76a"], "summer-of-sport": ["#c4f0b0", "#ffd76a", "#f2907f"], relax: ["#a5e8cf", "#86d2ec", "#fff4e0"], "coca-cola": ["#ffd9a6", "#e6a25a", "#f0546a"], gumtree: ["#ffd0e3", "#ff86b6", "#a9dcbc"], x: ["#e9e4f0", "#b79cff", "#ffb38a"] };
async function fight(def, slug, trId) {
  const tr = trId ? TRAINERS[trId] : null, team = tr ? tr.team.map((k) => CORP[k]) : [def]; def = team[0];
  const mine = formOf(S.starter, S.lvl), st = stats(S.lvl), boss = tr ? tr.boss || 0 : def.boss || 0;
  const L = tr ? 3 + tr.lv + Math.floor((S.won.length + S.beat.length) / 2) : (slug ? 2 : boss ? 2 + boss : 1) + S.won.length;
  const me = { ...mine, lvl: S.lvl, max: st.max, hp: clamp(S.hp ?? st.max, 1, st.max), atk: st.atk, def: st.def, am: 1, dm: 1, ox: -200, oy: 0, a: 1, fl: 0 };
  const mk = (d) => { const f = { ...d, lvl: L, max: Math.round((20 + L * 6) * (tr ? (boss ? 2.2 : 1.6) : boss ? 2 : 1.6)), atk: 6 + L, def: 9 + L, am: 1, dm: 1, ox: 200, oy: 0, a: 1, fl: 0 }; f.hp = f.max; return f; };
  let foe = mk(def), ti = 0;
  au.sfx("encounter"); au.music(null);
  for (let k = 0; k < 2; k++) { fade = .9; await sleep(60); fade = 0; await sleep(60); }
  await tween(420, (k) => (wipe = k)); fade = 1; wipe = 0;
  bt = { me, foe, bg: BG[slug] || (tr ? BG.corp : BG.x), shake: 0, t: 0, pops: [], parts: [], flash: 0, qte: null, port: tr ? { img: A.port[tr.port.slice(2)], ox: 200 } : null }; mode = "battle"; hud(); au.music("battle"); bars(); $("sme").hidden = $("sfoe").hidden = !!tr;
  if (tr) {
    await fadeTo(0, 200); await tween(420, (k) => { bt.port.ox = 200 * (1 - k); me.ox = -200 * (1 - k); });
    await ui.line(`${tr.role} ${tr.name} wants a quick chat!`, {});
    await tween(300, (k) => (bt.port.ox = 200 * k)); bt.port = null; $("sfoe").hidden = $("sme").hidden = false; bars();
    await tween(380, (k) => (foe.ox = 200 * (1 - k)));
    await ui.line(`${tr.name} brings up ${def.name}!`, {});
  } else {
    await fadeTo(0, 200); await tween(420, (k) => { foe.ox = 200 * (1 - k); me.ox = -200 * (1 - k); });
    await ui.line(def.intro || `${def.name} appears!`, {});
  }
  let result = null;
  const tell = (t) => ui.line(t, { auto: 1.15 });
  const pop = (txt, x, y, col, big) => bt.pops.push({ txt, x, y, col, big, t: 0 });
  const burst = (x, y, col, n = 14) => { for (let k = 0; k < n; k++) { const a = rnd(0, 6.28), sp = rnd(40, 140); bt.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, t: 0, col }); } };
  const hurt = async (who, n, e) => { au.sfx(e > 1 ? "super" : "hit"); bt.shake = e > 1 ? 7 : 4; for (let k = 0; k < 4; k++) { who.a = .15; await sleep(55); who.a = 1; await sleep(55); } const from = who.hp, to = Math.max(0, who.hp - n); await tween(380, (k) => { who.hp = from + (to - from) * k; bars(); }); who.hp = to; bars(); };
  const act = async (att, dfn, mv, isMe) => {
    await tell(`${att.name} uses ${mv.n}!`); ui.hide();
    if (mv.kind === "heal") { const to = Math.min(att.max, att.hp + Math.round(att.max * .45)), from = att.hp; au.sfx("heal"); att.fl = 1; await tween(450, (k) => { att.hp = from + (to - from) * k; att.fl = 1 - k; bars(); }); await tell(`${att.name} got some health back.`); return; }
    if (mv.kind === "buff") { att.am = Math.min(1.75, att.am * 1.3); au.sfx("buff"); await tween(300, (k) => (att.oy = -Math.sin(k * Math.PI) * 8)); await tell(`${att.name}'s attack rose.`); return; }
    if (mv.acc && Math.random() > mv.acc) { au.sfx("miss"); await tell("It missed."); return; }
    const crit = Math.random() < .12, pw = Array.isArray(mv.p) ? rnd(mv.p[0], mv.p[1]) : mv.p, e = isMe ? eff(mv.t, dfn.type) : eff(att.type, dfn.type);
    const qm = crit ? 1.5 : 1;
    const n = Math.max(1, Math.round(pw * ((att.atk * att.am) / (dfn.def * dfn.dm)) * (.55 + att.lvl * .09) * e * qm * rnd(.9, 1.06)));
    const tx = isMe ? 238 : 84, ty = isMe ? 56 : 100;
    if (crit) pop("CRITICAL!", tx, ty - 34, "#ffd76a", true);
    const dir = isMe ? 1 : -1; await tween(150, (k) => { att.ox = dir * 26 * Math.sin(k * Math.PI); att.oy = -dir * 10 * Math.sin(k * Math.PI); });
    bt.flash = crit ? 1 : .6; burst(tx, ty, TCOL[isMe ? mv.t : att.type] || "#fff8ec", crit ? 26 : 14); pop(String(n), tx + rnd(-10, 10), ty - 10, "#fff8ec", false);
    await hurt(dfn, n, e);
    if (e > 1) await tell("It's super effective!"); else if (e < 1) await tell("It's not very effective.");
  };
  while (!result) {
    ui.show(`What will ${me.name} do?`);
    const c = await ui.choose(["FIGHT", "RUN"], { cls: "cmd", cols: 2 });
    if (c === 1) { if (boss || tr) { await ui.line(tr ? "You can't walk out of a meeting." : SAY.cantRun[0]); continue; } result = "run"; break; }
    const mi = await ui.choose(me.moves.map((m) => ({ html: `<b>${esc(m.n)}</b><i>${m.kind ? (m.kind === "heal" ? "HEAL" : m.kind === "buff" ? "BOOST" : "WEAKEN") : m.t}</i>` })), { cls: "moves", cols: 2, cancel: true });
    if (mi < 0) continue;
    await act(me, foe, me.moves[mi], true);
    if (foe.hp <= 0) {
      if (tr && ti < team.length - 1) {
        au.sfx("faint"); await tween(500, (k) => { foe.oy = k * 40; foe.a = 1 - k; }); await ui.line(`${foe.name} is dealt with.`);
        ti++; foe = mk(team[ti]); bt.foe = foe; bars(); await tween(380, (k) => (foe.ox = 200 * (1 - k)));
        await ui.line(`${tr.name} brings up ${foe.name}!`, {}); continue;
      }
      result = "win"; break;
    }
    await act(foe, me, pick(foe.moves), false);
    if (me.hp <= 0) { result = "lose"; break; }
  }
  if (result === "win") {
    if (slug) await catchIt(foe);
    else { au.sfx("faint"); await tween(500, (k) => { foe.oy = k * 40; foe.a = 1 - k; }); await ui.line(`${foe.name} is ${tr ? "dealt with" : "beaten"}.`); }
    au.music(null); au.sfx("win");
    if (tr) {
      S.beat.push(trId); S.lvl = Math.min(18, S.lvl + 1); S.hp = stats(S.lvl).max; me.lvl = S.lvl; me.hp = me.max; bars(); save(); hud();
      await ui.line(`You got through ${tr.name}'s quick chat.`); au.sfx("level"); await ui.line(`${me.name} grew to level ${S.lvl}!`); await evolve(me);
    } else if (slug) {
      S.won.push(slug); S.lvl = Math.min(18, S.lvl + 1); S.hp = stats(S.lvl).max; me.lvl = S.lvl; me.hp = me.max; bars(); save(); hud();
      await ui.line(`${me.name} grew to level ${S.lvl}!`); au.sfx("level"); await evolve(me);
      await ui.line(`${def.name} is in your folio.`);
    } else { S.hp = stats(S.lvl).max; save(); await ui.line(`${me.name} is back to full health.`); }
  } else if (result === "lose") {
    au.music(null); au.sfx("lose"); await tween(500, (k) => { me.oy = k * 40; me.a = 1 - k; }); await ui.line(`${me.name} is out of health.`);
  } else await ui.line(SAY.ran[0]);
  ui.hide(); await fadeTo(1, 300);
  bt = null; mode = "world"; hud(); $("sfoe").hidden = $("sme").hidden = true;
  if (result === "lose") { S.hp = stats(S.lvl).max; save(); place(maps.house, 3, 4, "down"); }
  if (result !== "win") S.hp = result === "run" ? Math.max(1, Math.round(me.hp)) : S.hp;
  au.music("world"); await fadeTo(0, 300);
  if (result === "lose") await ui.say(SAY.lost);
  if (result === "win" && slug) { await card(slug); if (S.won.length === 4) toast("FOUR FOUND. THE MAL OFFICE IS OPEN, EAST OF THE SQUARE.", 5000); if (S.won.length === PROJECTS.length) toast("EVERY PROJECT FOUND. GO BACK AND SEE STEFAN.", 5000); }
  return result;
}
// a beaten project gets caught: throw a Folio Ball, it swallows the project, wobbles three times, and clicks shut
async function catchIt(foe) {
  await ui.line(`${foe.name} is worn out!`); await ui.line("You throw a FOLIO BALL!", { auto: .5 }); ui.hide();
  const b = bt.ball = { x: 60, y: 130, rot: 0, open: 0, shut: false }; au.sfx("blip");
  await tween(620, (k) => { b.x = 60 + (238 - 60) * k; b.y = 130 - Math.sin(k * Math.PI) * 95 + (40 - 130) * k * .9; b.rot = k * 12; });
  au.sfx("buff"); b.open = 1; bt.flash = .8;
  await tween(380, (k) => { foe.sc = 1 - k; foe.a = 1 - k * .7; foe.oy = -k * 30; });
  foe.a = 0; b.open = 0; au.sfx("bump");
  await tween(360, (k) => { b.y = 49 + Math.pow(k, 2) * 36; b.rot = 0; });
  for (let n = 0; n < 3; n++) { await sleep(300); au.sfx("blip"); await tween(380, (k) => (b.rot = Math.sin(k * Math.PI * 2) * .45)); }
  await sleep(250); b.shut = true; au.sfx("level");
  for (let k = 0; k < 18; k++) { const a = rnd(0, 6.28), sp = rnd(30, 100); bt.parts.push({ x: b.x, y: b.y - 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, t: 0, col: k % 2 ? "#ffd76a" : "#fff8ec" }); }
  await ui.line(`Gotcha! ${foe.name} was caught!`);
}
function drawBall(b) {
  g.save(); g.translate(b.x, b.y); g.rotate(b.rot);
  const r = 6; g.fillStyle = "#2b1f3b"; g.beginPath(); g.arc(0, 0, r + 1, 0, 7); g.fill();
  g.fillStyle = "#fff4e0"; g.beginPath(); g.arc(0, 0, r, 0, Math.PI); g.fill();
  g.fillStyle = "#8a5ad6"; g.beginPath(); g.arc(0, -(b.open ? 3 : 0), r, Math.PI, 0); g.fill(); g.fillStyle = "#a97df0"; g.fillRect(-3, -5 - (b.open ? 3 : 0), 2, 2);
  g.fillStyle = "#2b1f3b"; g.fillRect(-r, -1, r * 2, 2); g.beginPath(); g.arc(0, 0, 2.6, 0, 7); g.fill();
  g.fillStyle = b.shut ? "#ffd76a" : "#fff8ec"; g.beginPath(); g.arc(0, 0, 1.6, 0, 7); g.fill();
  if (b.open) { g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.moveTo(-5, -3); g.lineTo(5, -3); g.lineTo(14, -40); g.lineTo(-14, -40); g.fill(); }
  g.restore();
}
// your tool grows up: it flickers between old and new, then the new one stays
async function evolve(me) {
  const to = formOf(S.starter, S.lvl); if (to.art === me.art) return;
  const old = me.art, oldName = me.name; au.music(null);
  await ui.line(`What? ${oldName} is evolving!`, {});
  ui.hide(); au.sfx("secret");
  for (let k = 0; k < 14; k++) { me.art = k % 2 ? to.art : old; bt.flash = .7; await sleep(Math.max(60, 260 - k * 16)); }
  me.art = to.art; me.name = to.name; const st = stats(S.lvl); me.max = st.max; me.hp = st.max; me.atk = st.atk; me.def = st.def; bt.flash = 1; bars(); au.sfx("level");
  for (let k = 0; k < 30; k++) { const a = rnd(0, 6.28), sp = rnd(40, 160); bt.parts.push({ x: 84, y: 100, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, t: 0, col: k % 2 ? "#ffd76a" : "#fff8ec" }); }
  await ui.line(`Congratulations! ${oldName} evolved into ${to.name}!`);
}
function qteStep(dt) {
  const q = bt.qte; q.t += dt; const hit = took("a");
  if (q.done) { q.hold = (q.hold || 0) + dt; if (q.hold > .28) { bt.qte = null; q.res(q.out); } return; }
  if (q.kind === "atk") {
    const k = q.t / q.dur;
    if (hit) { q.done = true; q.k = k; q.out = k >= q.zone[0] && k <= q.zone[1] ? "perfect" : Math.abs(k - (q.zone[0] + q.zone[1]) / 2) < .2 ? "good" : "miss"; au.sfx(q.out === "perfect" ? "level" : q.out === "good" ? "ok" : "back"); }
    else if (k >= 1.08) { q.done = true; q.k = 1; q.out = "miss"; }
  } else {
    if (hit) { q.done = true; q.out = q.t >= q.at && q.t <= q.at + q.win ? "block" : "none"; if (q.out === "block") au.sfx("buff"); }
    else if (q.t > q.at + q.win + .05) { q.done = true; q.out = "none"; }
  }
}
function drawQte(now) {
  const q = bt.qte; if (!q) return;
  // drawn in the same panel the words usually sit in, so your eye is already there
  const px = 6, py = 137, pw = 308, ph = 38;
  g.fillStyle = "#2b1f3b"; g.fillRect(px, py + 2, pw, ph); g.fillRect(px - 1, py - 1, pw + 2, ph + 2); g.fillStyle = "#fff8ec"; g.fillRect(px + 1, py, pw - 2, ph - 2);
  g.font = "9px 'Pixelify Sans', monospace"; g.textAlign = "left"; g.fillStyle = "#2b1f3b";
  if (q.kind === "atk") {
    const x = 150, y = py + 14, w = 150, h = 9, k = q.done ? q.k : Math.min(1, q.t / q.dur);
    g.fillText(q.done ? (q.out === "perfect" ? "PERFECT!" : q.out === "good" ? "GOOD" : "MISSED THE GOLD") : "PRESS A ON THE GOLD", px + 12, py + 22);
    g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = "#e6dccb"; g.fillRect(x, y, w, h);
    g.fillStyle = "#ffd76a"; g.fillRect(x + Math.round(q.zone[0] * w), y, Math.round((q.zone[1] - q.zone[0]) * w), h);
    g.fillStyle = "#2b1f3b"; g.fillRect(x + Math.round(k * w) - 1, y - 4, 3, h + 8);
  } else {
    const on = q.t >= q.at && q.t <= q.at + q.win && !q.done;
    g.fillText(q.done ? (q.out === "block" ? "BLOCKED!" : "TOO LATE") : on ? "NOW! PRESS A" : "GET READY TO BLOCK...", px + 12, py + 22);
    if (on) { const s = 1 + Math.sin(now / 40) * .12, cx = 250, cy = py + 18; g.save(); g.translate(cx, cy); g.scale(s, s); g.fillStyle = "#2b1f3b"; g.fillRect(-8, -12, 16, 24); g.fillStyle = "#ffd76a"; g.fillRect(-6, -10, 12, 20); g.fillStyle = "#2b1f3b"; g.fillRect(-2, -7, 4, 10); g.fillRect(-2, 5, 4, 3); g.restore(); }
  }
}
function tween(ms, fn) { return new Promise((res) => { const s = performance.now(); const step = (n) => { const k = clamp((n - s) / ms, 0, 1); fn(k); if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }); }
function bars() {
  if (!bt) return;
  const set = (el, m, mine) => { const k = clamp(m.hp / m.max, 0, 1); el.innerHTML = `<div class="nm"><b>${esc(m.name)}</b><span>Lv ${m.lvl}</span></div><div class="hp"><i style="width:${(k * 100).toFixed(1)}%;background:${k > .5 ? "#5fc98a" : k > .22 ? "#ffc857" : "#f0546a"}"></i></div>${mine ? `<div class="n">${Math.ceil(m.hp)} / ${m.max}</div>` : `<div class="n ty">${m.type === "NONE" ? "" : m.type}</div>`}`; };
  set($("sfoe"), bt.foe, false); set($("sme"), bt.me, true);
}

// ---------- the folio: what you've beaten, and the work it showed you ----------
const thumbs = (p) => {
  if (p.page) return ["banner-poster.jpg", "car-green-1.jpg", "car-pink-2.jpg", "car-yellow-5.jpg", "car-green-3.jpg", "car-pink-4.jpg"].map((f) => `media/${p.slug}/${f}`);
  const lib = MEDIA[p.slug] || {}, out = [];
  (p.youtube || []).forEach((y) => out.push(y.thumb ? `media/${p.slug}/${y.thumb}` : `https://i.ytimg.com/vi/${y.id}/hqdefault.jpg`));
  (p.items || []).forEach((it) => { const m = it.file && lib[it.file]; if (m) out.push(`media/${p.slug}/${m.node || m.poster || m.sm}`); });
  return out.slice(0, 6);
};
const monImg = (k) => `game/art/${k}.png`;
function card(slug) {
  return new Promise((res) => {
    const p = PROJECTS.find((q) => q.slug === slug), f = FOES[slug], i = PROJECTS.indexOf(p), el = $("card");
    el.innerHTML = `<div class="sheet"><div class="top"><img class="mon" src="${monImg(f.art)}" alt=""><div><span class="no">No. ${String(i + 1).padStart(2, "0")} · ${esc(f.zone)}</span><h2>${esc(p.title)}</h2><p class="meta">${esc(p.client)} · ${esc(p.kind)}</p></div></div>
      ${p.blurb ? `<p class="blurb">${esc(p.blurb)}</p>` : ""}
      <div class="thumbs">${thumbs(p).map((u) => `<a href="./#${p.slug}" target="_blank" rel="noopener"><img src="${u}" alt="" loading="lazy"></a>`).join("")}</div>
      <div class="btns"><a class="go" href="./#${p.slug}" target="_blank" rel="noopener">See the whole project →</a><button type="button" id="cclose">Keep exploring</button></div></div>`;
    el.hidden = false; busyCard = () => { el.hidden = true; busyCard = null; au.sfx("back"); res(); };
    $("cclose").addEventListener("click", () => busyCard && busyCard());
  });
}
let busyCard = null, folioOpen = false, wipe = 0;
function folio() {
  if (!S.starter || busy) return; folioOpen = true; au.sfx("ok");
  const el = $("folio"), m = formOf(S.starter, S.lvl);
  el.innerHTML = `<div class="sheet"><div class="fh"><h2>FOLIO</h2><span>${S.won.length} of ${PROJECTS.length} beaten</span><button type="button" id="fclose">Close</button></div>
    <div class="grid">${PROJECTS.map((p, i) => { const got = S.won.includes(p.slug), f = FOES[p.slug]; return `<button type="button" class="slot${got ? " got" : ""}" data-s="${p.slug}" ${got ? "" : "disabled"}><img src="${monImg(f.art)}" alt=""><b>${got ? esc(p.title) : "? ? ?"}</b><i>${got ? esc(p.client) : esc(f.zone)}</i></button>`; }).join("")}</div>
    <p class="with"><img src="${monImg(m.art)}" alt=""><span>With you: <b>${m.name}</b>, level ${S.lvl}.</span></p></div>`;
  el.hidden = false;
  $("fclose").addEventListener("click", closeFolio);
  el.querySelectorAll(".slot.got").forEach((b) => b.addEventListener("click", async () => { closeFolio(); await script(() => card(b.dataset.s)); }));
}
function closeFolio() { $("folio").hidden = true; folioOpen = false; au.sfx("back"); }
function endCard() {
  return new Promise((res) => {
    const el = $("card");
    el.innerHTML = `<div class="sheet end"><span class="no">THE END</span><h2>${esc(ABOUT.name)}</h2><p class="meta">${esc(ABOUT.role)}</p>
      <p class="blurb">You found every project. Thanks for playing.</p>
      <div class="btns col"><a class="go" href="mailto:${esc(ABOUT.email)}">${esc(ABOUT.email)}</a>${(ABOUT.socials || []).map((s) => `<a class="go alt" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join("")}<a class="go alt" href="./">See the proper site →</a><button type="button" id="cclose">Keep wandering</button></div></div>`;
    el.hidden = false; au.sfx("win"); busyCard = () => { el.hidden = true; busyCard = null; res(); };
    $("cclose").addEventListener("click", () => busyCard && busyCard());
  });
}
function hud() { $("bfolio").textContent = `FOLIO ${S.won.length}/${PROJECTS.length} · REELS ${(S.reels || []).length}/8 · CHATS ${S.beat.length}/${Object.keys(TRAINERS).length}${S.flags.badge ? " · ★ BADGE" : ""}`; $("hud").hidden = mode !== "world"; $("bfolio").hidden = !S.starter; }
$("bfolio").addEventListener("click", () => { if (folioOpen) closeFolio(); else if (mode === "world") folio(); });
$("bsnd").addEventListener("click", () => { au.on = !au.on; $("bsnd").textContent = au.on ? "SOUND ON" : "SOUND OFF"; if (au.on) au.unlock(); au.toggle(); });

// ---------- drawing ----------
function drawWorld(now) {
  const W = map.W * 16, H = map.H * 16;
  cam.x = W <= VW ? (W - VW) / 2 : clamp(P.px + 8 - VW / 2, 0, W - VW); cam.y = H <= VH ? (H - VH) / 2 : clamp(P.py + 8 - VH / 2, 0, H - VH);
  const cx = Math.round(cam.x), cy = Math.round(cam.y), f2 = Math.floor(now / 420) % 2, f4 = Math.floor(now / 260) % 4;
  g.fillStyle = "#2b1f3b"; g.fillRect(0, 0, VW, VH); g.drawImage(map.bake, -cx, -cy);
  const x0 = Math.max(0, Math.floor(cx / 16)), x1 = Math.min(map.W - 1, Math.floor((cx + VW) / 16)), y0 = Math.max(0, Math.floor(cy / 16)), y1 = Math.min(map.H - 1, Math.floor((cy + VH) / 16) + 1);
  // water glints and fizz, then the long grass
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = map.I(x, y), t = map.base[i];
    if (t === TT.water) g.drawImage(A.tile.glint[(f4 + x + y * 2) % 4], x * 16 - cx, y * 16 - cy); else if (t === TT.fizz) g.drawImage(A.tile.bubble[(f4 + x * 3 + y) % 4], x * 16 - cx, y * 16 - cy);
    if (map.tg[i]) g.drawImage(A.grass[map.tg[i]][(f2 + x + y) % 2], x * 16 - cx, y * 16 - cy);
  }
  const spr = (o) => o.k === "npc" ? pose(A.who[o.who] || A.who.stefan, o.dir || "down", o.step || 0) : o.k === "wallart" ? A.obj[o.art] : Array.isArray(A.obj[o.k]) ? A.obj[o.k][o.k === "geyser" ? Math.floor(now / 300 + o.x) % 3 : f2] : A.obj[o.k];
  const put = (o) => {
    if (o.gone) return; if (o.k === "wire") return wire(o, cx, cy, now);
    if (o.k === "reel") { if (!S.reels.includes(o.n)) reel(o.x * 16 - cx + 8, o.y * 16 - cy + 8 + Math.round(Math.sin(now / 260 + o.n) * 1.5), now); return; }
    const s = spr(o); if (!s) return; const bx = (o.x + o.w / 2) * 16 - cx + (o.dx || 0), by = (o.y + 1) * 16 - cy + (o.dy || 0);
    if (bx < -60 || bx > VW + 60 || by < -10 || by > VH + 90) return;
    if (o.k === "wallart") { g.drawImage(s, Math.round(bx - iw(s) / 2), by - ih(s) - 6, iw(s), ih(s)); return; }
    if (o.k === "npc") g.drawImage(A.sh[12], Math.round(bx - 6), by - 4);
    g.drawImage(s, Math.round(bx - iw(s) / 2), by - ih(s) - (o.flat ? 4 : o.k === "npc" ? 1 : 0), iw(s), ih(s));
    if (o.bang && now - o.bang < 900) bang(Math.round(bx), by - ih(s) - 4, now - o.bang);
    if (o.puff) puffs(o, Math.round(bx), by - ih(s) + 6, now);
    if (o.k === "stand" && S.starter !== o.pick) { const it = A.obj["pick_" + o.pick]; g.drawImage(it, Math.round(bx - it.width / 2), by - 12 - it.height + Math.round(Math.sin(now / 300 + o.x) * 1.2)); }
  };
  map.flat.forEach(put);
  // everything standing up, back to front, with you in among it
  const row = map.tall.filter((o) => !o.gone && o.y >= y0 - 2 && o.y <= y1 + 3).sort((a, b) => a.y - b.y); let drawn = false;
  const me = () => { const s = pose(A.who.you, P.dir, P.moving && P.t < .55 ? 1 + (P.steps % 2) : 0), x = Math.round(P.px - cx), y = Math.round(P.py - cy); g.drawImage(A.sh[12], x + 2, y + 12); g.drawImage(s, Math.round(x + 8 - iw(s) / 2), y + 16 - ih(s), iw(s), ih(s)); drawn = true; };
  const py = P.py / 16;
  row.forEach((o) => { if (!drawn && o.y > py) me(); put(o); }); if (!drawn) me();
  // standing in long grass, it comes up over your feet
  [[P.x, P.y], [P.fx, P.fy]].forEach(([x, y]) => { if (x < 0 || y < 0 || x >= map.W || y >= map.H) return; const z = map.tg[map.I(x, y)]; if (z && (P.moving || (x === P.x && y === P.y))) g.drawImage(A.grass[z][(f2 + x + y) % 2], 0, 8, 16, 8, x * 16 - cx, y * 16 - cy + 8, 16, 8); });
  if (map.id === "world") ambience(now, cx, cy);
}
// the valley breathes: cloud shadows, things drifting in the air, dust where you walk, and evening by London's clock
const hourNow = () => +new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "numeric", hour12: false }).format(new Date());
const isNight = () => nightOn !== (hourNow() >= 19 || hourNow() < 6);
const motes = Array.from({ length: 26 }, () => ({ x: Math.random() * VW, y: Math.random() * VH, s: Math.random(), p: Math.random() * 7 }));
const dust = []; let lastStep = 0;
function ambience(now, cx, cy) {
  const night = isNight(), t = now / 1000;
  // dust where your feet land on bare ground
  if (P.moving && P.steps !== lastStep) { lastStep = P.steps; const tt = map.base[map.I(P.fx, P.fy)]; if (tt === TT.path || tt === TT.sand || tt === TT.track || tt === TT.soil) for (let k = 0; k < 3; k++) dust.push({ x: P.fx * 16 + 8 + rnd(-4, 4), y: P.fy * 16 + 14, vx: rnd(-8, 8), vy: rnd(-10, -3), t: 0 }); }
  for (let i = dust.length - 1; i >= 0; i--) { const d = dust[i]; d.t += 1 / 60; d.x += d.vx / 60; d.y += d.vy / 60; if (d.t > .45) { dust.splice(i, 1); continue; } g.fillStyle = `rgba(233,220,203,${(1 - d.t / .45) * .9})`; g.fillRect(Math.round(d.x - cx), Math.round(d.y - cy), 2, 2); }
  // big soft cloud shadows sliding over everything
  if (!night) { g.fillStyle = "rgba(43,31,59,.07)"; for (let k = 0; k < 3; k++) { const x = ((t * 7 + k * 230) % 760) - 220 - (cx * .15) % 760, y = 30 + k * 55 - (cy * .1) % 200; g.beginPath(); g.ellipse(x, y, 70, 24, 0, 0, 7); g.ellipse(x + 40, y + 10, 50, 20, 0, 0, 7); g.fill(); } }
  // evening: the light drops, the windows and fireflies come on
  if (night) { g.globalCompositeOperation = "multiply"; g.fillStyle = "#6c6fc4"; g.fillRect(0, 0, VW, VH); g.globalCompositeOperation = "source-over";
    const lx = Math.round(P.px - cx + 8), ly = Math.round(P.py - cy + 8), lg = g.createRadialGradient(lx, ly, 0, lx, ly, 46); lg.addColorStop(0, "rgba(255,226,160,.28)"); lg.addColorStop(1, "rgba(255,226,160,0)"); g.fillStyle = lg; g.fillRect(0, 0, VW, VH); }
  // petals by day, fireflies by night
  motes.forEach((m) => {
    m.x += (night ? Math.sin(t * 1.3 + m.p) * .25 : .35 + m.s * .3) ; m.y += night ? Math.cos(t * 1.1 + m.p) * .2 : .18 + m.s * .2;
    if (m.x > VW + 4) m.x = -4; if (m.y > VH + 4) m.y = -4; if (m.x < -4) m.x = VW + 4; if (m.y < -4) m.y = VH + 4;
    if (night) { const a = .5 + Math.sin(t * 3 + m.p * 5) * .5; g.fillStyle = `rgba(255,236,140,${a})`; g.fillRect(Math.round(m.x), Math.round(m.y), 1, 1); g.fillStyle = `rgba(255,236,140,${a * .25})`; g.fillRect(Math.round(m.x) - 1, Math.round(m.y) - 1, 3, 3); }
    else { g.fillStyle = m.s > .5 ? "rgba(255,157,187,.85)" : "rgba(255,255,255,.85)"; g.fillRect(Math.round(m.x), Math.round(m.y), m.s > .8 ? 2 : 1, 1); }
  });
}
// a person's frame: 0 standing, 1 and 2 each foot (the old drawn people only have two)
const pose = (who, dir, i) => { const f = who[dir] || who.down; return f[i] || f[1] || f[0]; };
// smoke and vape clouds drifting up off the people round the side of the office
function puffs(o, x, y, now) {
  for (let k = 0; k < 4; k++) { const t = ((now / 1000 + k * .55 + o.puff * .3) % 2.2) / 2.2, big = o.puff === 2;
    const px = x + (o.dir === "left" ? -6 : 6) + Math.sin(t * 6 + k) * 3 + t * 4, py = y - t * 22, r = (big ? 2.5 : 1.5) + t * (big ? 5 : 3);
    g.fillStyle = `rgba(${big ? "245,240,255" : "225,225,230"},${(1 - t) * (big ? .75 : .55)})`; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); }
}
// the ! over someone's head when they spot you
function bang(x, y, t) {
  const up = Math.round(Math.max(0, 1 - t / 120) * 6); y -= up;
  g.fillStyle = "#2b1f3b"; g.fillRect(x - 5, y - 14, 10, 13); g.fillRect(x - 1, y - 1, 2, 2); g.fillStyle = "#fff8ec"; g.fillRect(x - 4, y - 13, 8, 11);
  g.fillStyle = "#f0546a"; g.fillRect(x - 1, y - 12, 2, 6); g.fillRect(x - 1, y - 5, 2, 2);
}
function reel(x, y, now) {
  x = Math.round(x); y = Math.round(y);
  const glow = .35 + Math.sin(now / 200) * .15; g.fillStyle = `rgba(255,215,106,${glow})`; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill();
  g.fillStyle = "#2b1f3b"; g.beginPath(); g.arc(x, y, 5.5, 0, 7); g.fill(); g.fillStyle = "#cfd3e0"; g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill();
  g.fillStyle = "#2b1f3b"; const a0 = now / 300; for (let k = 0; k < 4; k++) { const a = a0 + k * Math.PI / 2; g.fillRect(Math.round(x + Math.cos(a) * 2.6) - 1, Math.round(y + Math.sin(a) * 2.6) - 1, 2, 2); }
  g.fillRect(x, y, 1, 1);
}
function wire(o, cx, cy, now) {
  const x0 = (o.x + .5) * 16 - cx, x1 = (o.x2 + .5) * 16 - cx, y = (o.y + 1) * 16 - cy - 34; g.fillStyle = "#2b1f3b";
  for (let x = x0; x <= x1; x++) { const k = (x - x0) / (x1 - x0); g.fillRect(Math.round(x), Math.round(y + Math.sin(k * Math.PI) * 5), 1, 1); }
  const gt = A.obj.goat[Math.floor(now / 700) % 2]; g.drawImage(gt, Math.round((x0 + x1) / 2 - 9), Math.round(y + 5 - gt.height + 1));
}
function drawBattle(now) {
  const b = bt, [c0, c1, c2] = b.bg, sh = b.shake > 0 ? Math.round(Math.sin(now / 18) * b.shake) : 0; b.shake = Math.max(0, b.shake - .35);
  g.fillStyle = c0; g.fillRect(0, 0, VW, VH);
  // the same soft heat as the real site, in big pixels
  const blob = (x, y, r, c) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, c + "00"); g.fillStyle = gr; g.fillRect(0, 0, VW, VH); };
  blob(70 + Math.sin(now / 1900) * 30, 40, 150, c1); blob(250 + Math.cos(now / 2300) * 30, 150, 160, c2); blob(170, 90 + Math.sin(now / 1500) * 20, 90, "#ffffff");
  g.fillStyle = "rgba(43,31,59,.14)"; g.beginPath(); g.ellipse(238 + sh, 86, 54, 11, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(84 + sh, 130, 60, 12, 0, 0, 7); g.fill();
  const fig = (m, x, y, mirror, bob) => {
    const s = (mirror && A.monF[m.art]) || A.mon[m.art], w = iw(s) * (m.sc ?? 1), h = ih(s) * (m.sc ?? 1); g.globalAlpha = m.a;
    g.drawImage(s, Math.round(x - w / 2 + m.ox + sh), Math.round(y - h + m.oy + bob), w, h);
    if (m.fl > 0) { g.globalAlpha = m.fl * .6; g.fillStyle = "#b7f3c8"; g.beginPath(); g.ellipse(x + m.ox, y - h / 2, w * .5, h * .5, 0, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  };
  if (b.port && b.port.img) { const p = b.port.img; g.drawImage(p, Math.round(238 - iw(p) / 2 + b.port.ox), 102 - ih(p), iw(p), ih(p)); }
  fig(b.foe, 238, 92, false, Math.round(Math.sin(now / 420) * 2)); fig(b.me, 84, 136, true, Math.round(Math.sin(now / 480 + 1) * 2));
  if (b.ball) drawBall(b.ball);
  // sparks, numbers, the white flash of a big hit, and the action command on top
  for (let i = b.parts.length - 1; i >= 0; i--) { const p = b.parts[i]; p.t += 1 / 60; p.x += p.vx / 60; p.y += p.vy / 60; p.vy += 260 / 60; if (p.t > .6) { b.parts.splice(i, 1); continue; } g.fillStyle = p.col; g.globalAlpha = 1 - p.t / .6; g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); g.globalAlpha = 1; }
  g.textAlign = "center";
  for (let i = b.pops.length - 1; i >= 0; i--) { const p = b.pops[i]; p.t += 1 / 60; if (p.t > 1) { b.pops.splice(i, 1); continue; } const yy = p.y - Math.min(1, p.t * 3) * 10, sc = p.t < .12 ? 1 + (1 - p.t / .12) * .6 : 1;
    g.font = `${Math.round((p.big ? 14 : 11) * sc)}px 'Pixelify Sans', monospace`; g.globalAlpha = p.t > .75 ? (1 - p.t) / .25 : 1; g.fillStyle = "#2b1f3b"; g.fillText(p.txt, p.x + 1, yy + 1); g.fillStyle = p.col; g.fillText(p.txt, p.x, yy); g.globalAlpha = 1; }
  if (b.flash > 0) { g.fillStyle = `rgba(255,255,255,${b.flash * .55})`; g.fillRect(0, 0, VW, VH); b.flash = Math.max(0, b.flash - .08); }
  drawQte(now);
}
function frame(now) {
  requestAnimationFrame(frame); g.setTransform(2, 0, 0, 2, 0, 0); g.imageSmoothingEnabled = false;
  const dt = clamp((now - t0) / 1000, 0, .05); t0 = now;
  if (busyCard) { if (took("a") || took("b")) busyCard(); }
  else if (folioOpen) { if (took("b") || took("f") || took("a")) closeFolio(); }
  else if (bt && bt.qte) qteStep(dt);
  else { ui.update(dt); if (mode === "world") walk(dt); }
  if (took("m")) $("bsnd").click();
  if (mode === "battle" && bt) drawBattle(now); else drawWorld(now);
  if (talk && talk.img && mode !== "battle") { const p = talk.img, e = 1 - Math.pow(1 - talk.k, 3); g.drawImage(p, Math.round(VW - 14 - iw(p) + (1 - e) * 140), 126 - ih(p), iw(p), ih(p)); }
  if (fade > 0) { g.fillStyle = `rgba(255,248,236,${fade})`; g.fillRect(0, 0, VW, VH); }
  if (wipe > 0) { g.fillStyle = "#2b1f3b"; for (let k = -6; k < 14; k++) { const w = 26 * wipe; g.beginPath(); g.moveTo(k * 26, 0); g.lineTo(k * 26 + w, 0); g.lineTo(k * 26 + w - 90, VH); g.lineTo(k * 26 - 90, VH); g.fill(); } }
  for (const k in tap) tap[k] = false;   // a press counts for the frame it lands in and no longer
}

// ---------- the front door ----------
function fit() {
  const pad = touch && innerHeight > innerWidth ? 200 : 0, k = Math.min(innerWidth / VW, (innerHeight - pad) / VH), s = k >= 2 ? Math.floor(k) : k;
  const f = $("frame"); f.style.width = `${VW * s}px`; f.style.height = `${VH * s}px`; f.style.setProperty("--u", `${s}px`);
  document.body.classList.toggle("tall", pad > 0);
}
addEventListener("resize", fit); fit();
async function start(fresh) {
  au.unlock(); au.sfx("ok");
  if (fresh) { Object.assign(S, { starter: null, lvl: 3, hp: null, won: [], flags: {}, reels: [], beat: [], look: "boy" }); save(); }
  await fadeTo(1, 250); $("title").hidden = true; mode = "world"; hud();
  if (S.starter) place(maps.world, 35, 37, "down"); else place(maps.house, 3, 4, "right");
  au.music("world");
  await fadeTo(0, 300);
  if (!S.flags.look) await script(async () => {
    const pic = (k) => `<img class="pk" src="${A.who[k].down[0].toDataURL()}" alt="">`;   // (their standing frame)
    ui.show("Before we start: are you a boy or a girl?");
    const c = await ui.choose([{ html: `${pic("boy")}BOY` }, { html: `${pic("girl")}GIRL` }], { cls: "yn look", cols: 2 }); ui.hide();
    S.look = c === 1 ? "girl" : "boy"; S.flags.look = 1; A.who.you = A.who[S.look]; save();
  });
  if (!S.flags.intro) { await sleep(350); P.dir = "right"; script(() => stefan()); }
}
const had = load();
$("bcont").hidden = !had; $("bnew").textContent = had ? "New game" : "Start";
$("bnew").addEventListener("click", () => start(true)); $("bcont").addEventListener("click", () => start(false));
// the three tools, bobbing on the title screen
$("tmons").innerHTML = ["ai", "ps", "pr"].map((k, i) => `<img src="${monImg(k)}" alt="" style="animation-delay:${-i * .4}s">`).join("");
addEventListener("keydown", (e) => { if (mode === "title" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); start(!had); } });
place(maps.world, 35, 39, "down");
requestAnimationFrame(frame);
window.__fv = { S, P, maps, ui, au, A, place, fight, card, folio, script, FOES, EXTRA, get mode() { return mode; }, get busy() { return busy; }, get map() { return map; }, get bt() { return bt; } };
