// Foster Valley. The same portfolio as the real site, as a small adventure: the projects are out in the long grass,
// and you beat each one to see its work. Walk with the arrows or WASD, talk and confirm with Enter, Space or Z.
import { PROJECTS as ALLP, ABOUT } from "../projects.js";
const PROJECTS = ALLP.filter((p) => !p.page || p.slug === "les-benjamins"); // pages of their own (and locked ones) stay out of the game
import MEDIA from "../media.js";
import { buildArt, C } from "./art.js";
import { buildWorld, buildHouse, buildOffice, STARTERS, FOES, EXTRA, CORP, TRAINERS, SAY, ZONES, TT, TNAME, eff, formOf, stageOf, pform, pstage, ITEMS, PEVO, GIFTS, GIVERS } from "./data.js";
import { person, LOOKS } from "./people.js";
import { Chip } from "./music.js";

// each patch of long grass belongs to one project, by name, so the site's order can change without moving them
const GRASSOF = ["la-croisiere", "ai-commissions", "3d-explorations", "ai-experiments", "summer-of-sport", "relax", "coca-cola", "gumtree", "les-benjamins"];
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let VW = 320, OX = 0; const VH = 180, DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const touch = matchMedia("(hover: none) and (pointer: coarse)").matches;
document.documentElement.classList.toggle("touch", touch);

const A = buildArt();
// people are drawn from outfit recipes; every creature and portrait is a painted sprite in game/art
for (const k in LOOKS) A.who[k] = person(LOOKS[k]);
A.who.you = A.who.boy; A.port = {}; A.monF = {};
const ART = ["balloon", "ai2", "ai3", "ps2", "ps3", "pr2", "pr3", "easing", "dj", "budget", "timesheet", "bigidea", "bear", "t_tim", "t_pat", "t_chris", "t_jeremy", "t_jimi", "t_tora", "t_paris", "t_branco", "t_anna", "t_lucy", "t_alysha", "bunny", "ai", "ps", "pr", "croisiere", "commish", "blob", "goat", "sport", "relax", "fizz", "gum", "crawler", "brief", "kpi", "roi", "mediaplan", "vertical", "stakeholder", "deck", "t_stefan", "t_ad", "t_mm", "t_mp", "t_bs", "t_sl", "t_cmo", "angel", "butterfly", "kitten", "noself", "truffle", "disco", "vibe", ...Object.values(FOES).flatMap((f) => (f.evo || []).map((e) => e.art))];
// walking sprites: one strip per person, nine frames (front, left, back; standing then each foot), right is the left mirrored
const WALK = ["stefan", "boy", "girl", "ad", "mm", "mp", "bs", "sl", "cmo", "tim", "pat", "chris", "jeremy", "jimi", "smoker", "vaper", "tora", "paris", "branco", "anna", "lucy", "alysha"];
await Promise.all(WALK.map((k) => new Promise((res) => { const im = new Image(); im.onload = () => {
  const fw = im.width / 9, fh = im.height, cut = (i) => { const c = document.createElement("canvas"); c.width = fw; c.height = fh; c.getContext("2d").drawImage(im, i * fw, 0, fw, fh, 0, 0, fw, fh); return c; };
  const f = [...Array(9)].map((_, i) => cut(i)); A.who[k] = { down: f.slice(0, 3), left: f.slice(3, 6), up: f.slice(6, 9) }; A.who[k].right = A.who[k].left.map((c) => A.flip(c)); res(); };
  im.onerror = res; im.src = `game/art/g_${k}.png`; })));
// the hire bike: six frames, two each for down, left and up
A.bike = {};
await Promise.all(["boy", "girl"].map((k) => new Promise((res) => { const im = new Image(); im.onload = () => {
  const fw = im.width / 6, cut = (i) => { const c = document.createElement("canvas"); c.width = fw; c.height = im.height; c.getContext("2d").drawImage(im, i * fw, 0, fw, im.height, 0, 0, fw, im.height); return c; };
  const f = [...Array(6)].map((_, i) => cut(i)); A.bike[k] = { down: f.slice(0, 2), left: f.slice(2, 4), up: f.slice(4, 6) }; A.bike[k].right = A.bike[k].left.map((c) => A.flip(c)); res(); };
  im.onerror = res; im.src = `game/art/b_${k}.png`; })));
// map objects drawn in the same handheld style
await Promise.all([["balloon0", "g_balloon2"], ["balloon1", "g_balloon0"], ["balloon2", "g_balloon1"], ["lime", "g_lime"], ["pick_ai", "g_pick_ai"], ["pick_ps", "g_pick_ps"], ["pick_pr", "g_pick_pr"]].map(([k, f]) => new Promise((res) => { const im = new Image(); im.onload = () => { A.obj[k] = im; res(); }; im.onerror = res; im.src = `game/art/${f}.png`; })));
A.who.you = A.who.boy;
await Promise.all(ART.map((k) => new Promise((res) => { const im = new Image(); im.onload = () => { im._s = 2; if (k.startsWith("t_")) A.port[k.slice(2)] = im; else { A.mon[k] = im; const f = A.flip(im); f._s = 2; A.monF[k] = f; } res(); }; im.onerror = res; im.src = `game/art/${k}.png`; })));
// your own back, for the start of a fight
A.back = {};
await Promise.all(["boy", "girl"].map((k) => new Promise((res) => { const im = new Image(); im.onload = () => { im._s = 2; A.back[k] = im; res(); }; im.onerror = res; im.src = `game/art/back_${k}.png`; })));
// the screen is 320 by 180 game pixels, drawn at double density so the painted sprites keep their detail
const cv = $("cv"), g = cv.getContext("2d"); cv.width = 640; cv.height = 360; g.imageSmoothingEnabled = false;
const iw = (s) => s.width / (s._s || 1), ih = (s) => s.height / (s._s || 1);

// ---------- what's remembered between visits ----------
const S = { starter: null, lvl: 3, hp: null, won: [], flags: {}, reels: [], beat: [], look: "boy", cash: 0, bag: {}, plv: {}, coins: {} };
const save = () => { try { localStorage.setItem("foster-valley", JSON.stringify(S)); } catch (e) {} };
const load = () => { try { const d = JSON.parse(localStorage.getItem("foster-valley") || "null"); if (d && STARTERS[d.starter]) { Object.assign(S, d); S.reels = S.reels || []; S.beat = (S.beat || []).filter((b) => TRAINERS[b]); S.look = S.look || "boy"; S.cash = S.cash || 0; S.bag = S.bag || {}; S.coins = S.coins || {}; S.plv = S.plv || {}; S.gifts = S.gifts || []; S.got = S.got || {}; S.inf = S.inf || {}; S.won.forEach((k) => { if (!S.plv[k]) S.plv[k] = S.lvl; }); S.stg = S.stg || {}; if (S.stg.tool == null) S.stg.tool = (S.lvl >= 5) + (S.lvl >= 8); if (!S.econ) { S.econ = 1; S.cash = 0; } A.who.you = A.who[S.look] || A.who.boy; return true; } } catch (e) {} return false; };
const stats = (lvl, st = S.starter ? stageFor("tool", lvl) : 0) => ({ max: 30 + lvl * 6 + (S.reels || []).length * 2 + st * 10, atk: 10 + lvl + (S.reels || []).length + st * 3, def: 10 + lvl + st * 2 });
// every project in your folio has its own level now, and evolves at 14 and 24
const lvlOf = (k) => (S.inf && S.inf[k] ? 999 : k === "tool" ? S.lvl : S.plv[k] || S.lvl);
// once something has evolved it stays evolved, even if the levels it evolves at ever move
const stageFor = (k, lvl = lvlOf(k)) => GIFTS[k] ? 0 : Math.max(k === "tool" ? stageOf(S.starter, lvl) : pstage(k, lvl), (S.stg || {})[k] || 0);
const formFor = (k, lvl = lvlOf(k)) => { if (GIFTS[k]) return { ...GIFTS[k], stage: 0 }; const base = k === "tool" ? STARTERS[S.starter] : FOES[k], st = Math.min(stageFor(k, lvl), (base.evo || []).length), e = st ? base.evo[st - 1] : null;
  const f = e ? { ...base, name: e.name, art: e.art, stage: st } : { ...base, stage: 0 }; if (!A.mon[f.art]) return { ...f, art: base.art }; return f; };
const keepStage = (k) => { S.stg = S.stg || {}; S.stg[k] = Math.max(S.stg[k] || 0, stageFor(k)); };
const statsFor = (k) => { const L = lvlOf(k); if (k === "tool") return stats(L); const st = stats(L, stageFor(k, L)); return { ...st, max: Math.round(st.max * .9) }; };
const money = (n) => { n = Math.round(n * 100) / 100; return `£${n % 1 ? n.toFixed(2) : n.toLocaleString("en-GB")}`; };

// ---------- sound: a few square waves, like an old handheld ----------
const au = {
  on: true, ctx: null, tune: null, step: 0, next: 0,
  unlock() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.out = this.ctx.createGain(); this.out.gain.value = .5; this.out.connect(this.ctx.destination); this.chip.attach(this.ctx, this.out); } catch (e) {} } if (this.ctx && this.ctx.state !== "running") this.ctx.resume(); },
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
  // the soundtrack is written in game/music.js and played live by four chip voices
  chip: new Chip(),
  music(name) {
    if (name === "world" && map && map.id !== "world") name = "studio";
    this.tune = name; this.chip.play(name);
  },
  toggle() { this.chip.on = this.on; if (this.on) { const t = this.tune; this.chip.tune = null; this.chip.play(t); } },
};

// ---------- hands: keys, and buttons on a phone ----------
const keys = {}, tap = {}; let lastInput = performance.now();
const KEY = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right", enter: "a", " ": "a", z: "a", x: "b", escape: "b", backspace: "b", f: "f", tab: "menu", e: "menu", m: "m" };
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
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); b.classList.add("on");
    // on the title screen the pad drives the menu, same as the keyboard
    if (mode === "title") { au.unlock(); const key = { a: "Enter", up: "ArrowUp", down: "ArrowDown" }[k]; if (key) dispatchEvent(new KeyboardEvent("keydown", { key })); return; }
    press(k); });
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
  // four flight cases left behind after shoots, tucked away off the roads where you'd only find them poking about.
  // Smash one open for a fat envelope of per diems. They turn up again each week.
  let seed = 11, n = 0; const rr = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const byRoad = (x, y) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const t = m.base[m.I(clamp(x + dx, 0, m.W - 1), clamp(y + dy, 0, m.H - 1))]; if (t === TT.path || t === TT.bridge) return false; } return true; };
  for (let tries = 0; n < 4 && tries < 20000; tries++) { const x = 3 + Math.floor(rr() * (m.W - 6)), y = 3 + Math.floor(rr() * (m.H - 6));
    if (free(x, y) && m.base[m.I(x, y)] === TT.grass && byRoad(x, y) && !m.objs.some((o) => Math.abs(o.x - x) + Math.abs(o.y - y) < 2) && !m.objs.some((o) => o.k === "kitcase" && Math.abs(o.x - x) + Math.abs(o.y - y) < 22)) { m.objs.push({ k: "kitcase", n: n++, x, y, w: 1, solid: 1, act: "kitcase" }); m.solid[m.I(x, y)] = 1; } }
  m.flat = m.objs.filter((o) => o.flat); m.tall = m.objs.filter((o) => !o.flat); }
const coinUp = () => false;
// the people with something for you, each on the nearest free tile to their spot
for (const gv of GIVERS) {
  const m = maps[gv.map]; if (!m) continue;
  const ok = (x, y) => x > 0 && y > 1 && x < m.W - 1 && y < m.H - 1 && !m.solid[m.I(x, y)] && !m.tg[m.I(x, y)] && !m.objs.some((o) => !o.gone && o.y === y && x >= o.x && x < o.x + (o.w || 1)) && !(m.warps || []).some((w) => Math.abs(w.x - x) + Math.abs(w.y - y) <= 1) && m.base[m.I(x, y)] !== TT.wet && m.base[m.I(x, y)] !== TT.mat;
  let spot = null; for (let r = 0; r < 8 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) if (ok(gv.x + dx, gv.y + dy)) spot = [gv.x + dx, gv.y + dy];
  if (!spot) continue; const o = { k: "npc", who: gv.look, x: spot[0], y: spot[1], w: 1, solid: 1, dir: "down", act: "gift:" + gv.id }; m.objs.push(o); m.tall.push(o);
}
// London's date, for the day rate and for when the flight cases turn up again
const today = () => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London" }).format(new Date());
const thisWeek = () => { const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" })); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toDateString(); };
let map = maps.house, mode = "title", busy = false, t0 = 0, cam = { x: 0, y: 0 }, nightOn = false, zoneNow = "", fade = 0, bt = null;
const P = { x: 3, y: 4, fx: 3, fy: 4, px: 48, py: 64, dir: "down", moving: false, t: 0, steps: 0, grass: 0 };
const objAt = (x, y) => map.objs.find((o) => !o.gone && y === o.y && x >= o.x && x < o.x + o.w && (o.solid || o.act));
const blocked = (x, y) => x < 0 || y < 0 || x >= map.W || y >= map.H || map.solid[map.I(x, y)] || map.objs.some((o) => o.k === "npc" && !o.gone && y === o.y && x >= o.x && x < o.x + o.w);
const F = { x: 0, y: 0, fx: 0, fy: 0, hide: true };   // whoever is walking with you, one step behind
function place(m, x, y, dir) { F.hide = true; map = m; P.x = P.fx = x; P.y = P.fy = y; P.px = x * 16; P.py = y * 16; P.moving = false; if (dir) P.dir = dir; P.grass = 0; }
const trail = () => { if (F.hide) { F.fx = F.x = P.x; F.fy = F.y = P.y; F.hide = false; } else { F.fx = F.x; F.fy = F.y; F.x = P.x; F.y = P.y; } };
async function warp(m, x, y, dir) { busy = true; m.objs.forEach((q) => { if (q.tr) q.cool = false; }); resetPuzzles(m); if (S.bike && m.id !== "world") { dropBike(map, P.fx, P.fy); bike(false); } au.sfx("door"); await fadeTo(1, 220); place(m, x, y, dir); au.music("world"); zoneNow = ""; await fadeTo(0, 220); busy = false; }
function fadeTo(v, ms) { return new Promise((res) => { const a = fade, s = performance.now(); const step = (n) => { const k = clamp((n - s) / ms, 0, 1); fade = a + (v - a) * k; if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }); }
function night() { nightOn = !nightOn; au.sfx("secret"); toast(nightOn ? "NIGHT MODE" : "DAY MODE"); }

// ---------- walking about ----------
// people in the office drift about: a turn, a step, a pause, always near where they started
function mill(dt) {
  if (map.id === "world" || busy) return;
  for (const o of map.objs) {
    if (!o.wander) continue;
    if (o.mv) { o.mv.t += dt / .3; const k = Math.min(1, o.mv.t); o.dx = -o.mv.dx * 16 * (1 - k); o.dy = -o.mv.dy * 16 * (1 - k); o.step = k < .5 ? 1 + (o.mv.n % 2) : 0; if (k >= 1) { o.mv = null; o.dx = o.dy = 0; o.step = 0; } continue; }
    o.wt = (o.wt ?? Math.random() * 3) - dt; if (o.wt > 0) continue; o.wt = 1.2 + Math.random() * 2.8;
    const d = pick(["up", "down", "left", "right"]), [dx, dy] = DIRS[d]; o.dir = d;
    if (Math.random() < .4) continue; // sometimes they just turn round
    const nx = o.x + dx, ny = o.y + dy, [a, b2, c, e] = o.wander;
    if (nx < a || ny < Math.max(3, b2) || nx > c || ny > e) continue;
    if (blocked(nx, ny) || (nx === P.x && ny === P.y) || (nx === P.fx && ny === P.fy) || (map.warps || []).some((w) => Math.abs(w.x - nx) + Math.abs(w.y - ny) <= 1) || map.base[map.I(nx, ny)] === TT.mat || map.base[map.I(nx, ny)] === TT.wet) continue;
    o.x = nx; o.y = ny; o.mv = { dx, dy, t: 0, n: (o.mv_n = (o.mv_n || 0) + 1) };
  }
  map.tall && map.tall.sort((p, q) => p.y - q.y);
}
function walk(dt) {
  mill(dt); lookAbout(dt);
  if (P.moving) {
    P.t += dt / (P.sliding ? .07 : S.bike ? .075 : keys.b ? .095 : .165);
    if (P.t >= 1) { P.moving = false; P.px = P.x * 16; P.py = P.y * 16; arrive(); }
    else { P.px = (P.fx + (P.x - P.fx) * P.t) * 16; P.py = (P.fy + (P.y - P.fy) * P.t) * 16; }
  }
  if (P.moving || busy) return;
  if (took("f")) { folio(); return; }
  if (took("menu")) { openMenu(); return; }
  if (took("a")) { const [dx, dy] = DIRS[P.dir], o = objAt(P.x + dx, P.y + dy); if (o && o.act) { run(o.act, o); return; } if (S.bike && map.id === "world") { script(hopOff); return; } }
  for (const d of ["up", "down", "left", "right"]) if (keys[d]) {
    const [dx, dy] = DIRS[d]; P.dir = d;
    if (blocked(P.x + dx, P.y + dy) && !tryPush(P.x + dx, P.y + dy, dx, dy)) { if (tap[d]) { au.sfx("bump"); if (/^mal/.test(map.id) && ++stuckN % 6 === 0) toast("BOXED IN? THE MENU CAN START THIS FLOOR AGAIN", 3200); } tap[d] = false; return; }
    tap[d] = false; trail(); P.fx = P.x; P.fy = P.y; P.x += dx; P.y += dy; P.t = 0; P.moving = true; P.steps++; return;
  }
}
// gym puzzles: wheelie chairs you can shove one square, as long as there's room behind them
let stuckN = 0;
function tryPush(x, y, dx, dy) {
  const o = map.objs.find((q) => q.push && !q.gone && q.x === x && q.y === y); if (!o || o.mv) return false;
  const bx = x + dx, by = y + dy;
  if (blocked(bx, by) || map.objs.some((q) => q !== o && !q.gone && q.y === by && bx >= q.x && bx < q.x + (q.w || 1) && (q.solid || q.act)) || (map.warps || []).some((w) => w.x === bx && w.y === by) || [TT.mat, TT.wet].includes(map.base[map.I(bx, by)])) return false;
  o.hx ??= o.x; o.hy ??= o.y; map.solid[map.I(x, y)] = 0; o.x = bx; o.y = by; map.solid[map.I(bx, by)] = 1; o.dx = -dx * 16; o.dy = -dy * 16;
  au.sfx("bump"); tween(240, (k) => { o.dx = -dx * 16 * (1 - k); o.dy = -dy * 16 * (1 - k); }); return true;
}
// coming back onto a floor tidies its puzzle back up
function resetPuzzles(m) {
  m.objs.forEach((q) => {
    if (q.hx != null && (q.x !== q.hx || q.y !== q.hy)) { m.solid[m.I(q.x, q.y)] = 0; q.x = q.hx; q.y = q.hy; m.solid[m.I(q.x, q.y)] = 1; q.dx = q.dy = 0; }
    if (q.k === "tape" && q.gone) { q.gone = false; m.solid[m.I(q.x, q.y)] = 1; }
  });
}
async function script(fn) { if (busy) return; busy = true; try { await fn(); } finally { busy = false; for (const k in tap) tap[k] = false; } }
function arrive() {
  const i = map.I(P.x, P.y);
  const wp = (map.warps || []).find((w) => w.x === P.x && w.y === P.y);
  if (wp) {
    // in the office you can't go up a floor until you've dealt with whoever's on this one
    if (wp.needs && !wp.needs.every((b) => S.beat.includes(b))) { const bx = P.fx, by = P.fy; script(async () => { await ui.say(SAY.floorLocked(wp.who)); place(map, bx, by, "down"); }); return; }
    warp(maps[wp.to], wp.tx, wp.ty, wp.dir); return;
  }
  // mopped floor: keep sliding the way you were going until something stops you
  if (map.base[i] === TT.wet) { const [dx, dy] = DIRS[P.dir]; if (!blocked(P.x + dx, P.y + dy)) { trail(); P.fx = P.x; P.fy = P.y; P.x += dx; P.y += dy; P.t = 0; P.moving = true; P.sliding = true; return; } }
  P.sliding = false;
  if (map.id !== "world") { const sp = spotted(); if (sp) script(() => challenge(sp)); }
  if (map.id === "house" && map.base[i] === TT.mat) {
    if (!S.starter) { script(async () => { await ui.say(SAY.needPick, { who: "STEFAN" }); place(map, P.x, P.y - 1, "up"); }); return; }
    warp(maps.world, 35, 37, "down"); return;
  }
  if (map.id === "world") {
    const rl = map.objs.find((o) => o.k === "reel" && o.x === P.x && o.y === P.y && !S.reels.includes(o.n));
    if (rl) { S.reels.push(rl.n); const st = stats(S.lvl); S.hp = Math.min(st.max, (S.hp ?? st.max) + 2); save(); hud(); au.sfx("level"); script(async () => { await ui.say([`You found a film reel! (${S.reels.length} of 8)`, SAY.reels[rl.n], "Your tool feels stronger."]); }); return; }
    const cn = map.objs.find((o) => o.k === "coin" && o.x === P.x && o.y === P.y && coinUp(o));
    if (cn) { const v = 5 + Math.floor(Math.random() * 4) * 5; S.coins[cn.n] = Date.now(); S.cash = (S.cash || 0) + v; save(); au.sfx("ok"); toast(`+${money(v)}  ·  ${money(S.cash)}`, 1400); }
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
      else if (postgame() && P.grass >= 3 && Math.random() < .22) { P.grass = 0; const k = pick(Object.keys(CORP).filter((c) => !CORP[c].legend)); script(() => fight({ ...CORP[k], L: Math.max(5, S.lvl - 3 + Math.floor(Math.random() * 4)) })); }
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
    else if (a === "coffee") { await ui.say(SAY.coffee[0]); healAll(); au.sfx("heal"); if (S.starter) await ui.say(SAY.coffee[1]); save(); }
    else if (a === "trainer") await chat(o);
    else if (a === "shop") await shop();
    else if (a === "gift") {
      const gv = GIVERS.find((q) => q.id === b); if (!gv) return; o.dir = OPP[P.dir];
      if (S.got[gv.id]) { await ui.say(gv.after, { who: gv.name }); return; }
      if (!S.starter) { await ui.say(["Come back when you've got a tool."], { who: gv.name }); return; }
      if (gv.needs === "badge" && !S.flags.badge) { await ui.say(gv.gate, { who: gv.name }); return; }
      await ui.say(gv.lines, { who: gv.name });
      if (gv.give.mon) {
        const k = gv.give.mon, g = GIFTS[k]; S.gifts = [...(S.gifts || []), k]; S.plv[k] = Math.max(5, S.lvl - 1); S.got[gv.id] = 1; save();
        talk = { img: A.mon[g.art], k: 0, show: 1 }; au.sfx("win"); await tween(260, (q) => talk && (talk.k = q));
        await ui.say([`You received ${g.name}!`, g.about, `${g.name} joined your folio.`]);
        { const t = talk; await tween(180, (q) => t && (t.k = 1 - q)); talk = null; }
      } else { const k = gv.give.item; S.bag[k] = (S.bag[k] || 0) + 1; S.got[gv.id] = 1; save(); au.sfx("win"); await ui.say([`You received ${ITEMS[k].name}!`, ITEMS[k].about, "It's in your bag."]); }
    }
    else if (a === "kitcase") {
      await ui.say(["A flight case, left behind after a shoot. Nobody's coming back for it."], { keep: true });
      const c = await ui.choose(["Smash it open", "Leave it"], { cls: "yn" }); ui.hide(); if (c !== 0) return;
      for (let k = 0; k < 3; k++) { au.sfx("hit"); o.dx = (k % 2 ? 2 : -2); await sleep(90); } o.dx = 0; au.sfx("super");
      o.gone = true; map.solid[map.I(o.x, o.y)] = 0; S.cases = S.cases || {}; S.cases[o.n] = thisWeek();
      const v = Math.round((500 + Math.random() * 500) / 10) * 10; S.cash = (S.cash || 0) + v; save(); au.sfx("win");
      await ui.say([`Inside: a fat envelope marked PER DIEMS. ${money(v)}!`, pick(["A whole crew's lunch money, technically.", "The runner will never know.", "Production is going to be furious.", "There's a call sheet in here from 2019.", "Nobody ever reconciles these."])]);
    }
    else if (a === "tape") {
      const nm = S.starter ? formFor("tool").name : "your hands";
      await ui.say(["A tangle of red tape. Nobody gets past this without a fight."], { keep: true });
      const c = await ui.choose([`Cut it with ${nm}`, "Leave it"], { cls: "yn" }); ui.hide();
      if (c === 0) { au.sfx("super"); o.gone = true; map.solid[map.I(o.x, o.y)] = 0; await ui.say([`${nm} cut straight through the red tape!`]); }
    }
    else if (a === "lime") {
      if (S.bike) return;
      await ui.say(SAY.lime, { keep: true });
      const free = (S.reels || []).length - (S.spent || 0);
      if (free < 1) { ui.hide(); await ui.say(SAY.limeNone); return; }
      const c = await ui.choose([`Unlock (${free} reel${free > 1 ? "s" : ""} left)`, "Leave it"], { cls: "yn" }); ui.hide();
      if (c === 0) { S.spent = (S.spent || 0) + 1; o.gone = true; map.solid[map.I(o.x, o.y)] = 0; bike(true); au.sfx("level"); save(); toast(touch ? "RIDING. PRESS A ON OPEN GROUND TO HOP OFF." : "RIDING. PRESS ENTER ON OPEN GROUND TO HOP OFF.", 3500); }
    }
    else if (a === "staff") { o.dir = OPP[P.dir]; o.wt = 3; await ui.say([SAY.staff[+b]]); }
    else if (a === "smoke") { o.dir = OPP[P.dir]; await ui.say(SAY.smoke[+b]); }
    else if (a === "malcoffee") { await ui.say(SAY.malcoffee[0]); healAll(); au.sfx("heal"); if (S.starter) await ui.say(SAY.malcoffee[1]); save(); }
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
  // the little one on the table is a stand-in: show the real thing while you decide
  talk = { img: A.mon[m.art], k: 0, show: 1 }; au.sfx("ok"); await tween(220, (k) => talk && (talk.k = k));
  await ui.say([m.about], { keep: true });
  const c = await ui.choose([`Take ${m.name}`, "Not yet"], { cls: "yn" }); ui.hide();
  { const t = talk; await tween(180, (k) => t && (t.k = 1 - k)); talk = null; }
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
  if (n >= PROJECTS.length && !S.flags.alysha) { await speak("stefan", SAY.toAlysha, who); return; }
  if (n >= PROJECTS.length) { await speak("stefan", SAY.ending, who); S.flags.end = 1; save(); await endCard(); return; }
  const next = PROJECTS.find((p) => !S.won.includes(p.slug)), left = Object.values(TRAINERS).filter((t) => !t.map && !t.boss && !t.final).length - S.beat.filter((b) => !TRAINERS[b].boss && !TRAINERS[b].map).length;
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
const ready = (id) => !S.beat.includes(id) && (TRAINERS[id].final ? postgame() : (TRAINERS[id].needs || []).every((b) => S.beat.includes(b)));
// in the MAL gym, after the badge, people you've beaten still clock you once per visit: that's the training
const inGym = () => map.id.startsWith("mal");
const canSpot = (o) => { const t = TRAINERS[o.tr]; if (!t || t.final || o.cool) return false; return S.beat.includes(o.tr) ? !!S.flags.badge && inGym() : ready(o.tr); };
function spotted() {
  for (const o of trainerObjs()) {
    if (!canSpot(o)) continue;
    const [dx, dy] = DIRS[o.dir], along = (P.x - o.x) * dx + (P.y - o.y) * dy, across = dx ? P.y - o.y : P.x - o.x;
    const clearTo = (tx, ty) => { const n = Math.abs(tx - o.x) + Math.abs(ty - o.y); for (let s = 1; s < n; s++) { const x = o.x + Math.round((tx - o.x) * s / n), y = o.y + Math.round((ty - o.y) * s / n); if (blocked(x, y)) return false; } return true; };
    // straight down their line of sight, like the handhelds
    if (along >= 1 && along <= 4 && Math.abs(across) <= 1 && clearTo(P.x, P.y)) return o;
    // and in the office, walk close past anyone and they'll turn and catch you
    if (inGym() && Math.abs(P.x - o.x) + Math.abs(P.y - o.y) <= 3 && clearTo(P.x, P.y)) return o;
  }
  return null;
}
// gym trainers glance about while they wait
function lookAbout(dt) {
  if (!inGym() || busy) return;
  for (const o of trainerObjs()) { o.lt = (o.lt ?? 1 + Math.random() * 2) - dt; if (o.lt > 0) continue; o.lt = 1.6 + Math.random() * 2.4; o.dir = pick(["up", "down", "left", "right"].filter((d) => d !== o.dir)); }
  // turning round to find you standing there counts too
  if (!P.moving && mode === "world") { const sp = spotted(); if (sp) script(() => challenge(sp)); }
}
const OPP = { up: "down", down: "up", left: "right", right: "left" };
async function challenge(o) {
  o.cool = true; au.music("spotted"); au.sfx("spot"); o.bang = performance.now(); await sleep(800);
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
  if (S.beat.includes(o.tr)) {
    await speak(t.port.slice(2), t.after, t.name);
    // after the badge, anyone will go again: MAL turns into a training gym
    if (S.flags.badge && (!t.final || postgame())) { ui.show(`Battle ${t.name} again?`); const c = await ui.choose(["Again", "Not now"], { cls: "yn" }); ui.hide(); if (c === 0) { await speak(t.port.slice(2), t.again || ["Go on then."], t.name); await fight(null, null, o.tr); } }
    return;
  }
  if (!S.starter && !t.final) { await speak(t.port.slice(2), ["Oh, you haven't got a tool yet? Come back when you have."], t.name); return; }
  if (!ready(o.tr)) { await speak(t.port.slice(2), t.gate, t.name); return; }
  await duel(o);
}
async function duel(o) {
  const t = TRAINERS[o.tr], pk = t.port.slice(2);
  au.music("spotted");
  const again = S.beat.includes(o.tr);
  await speak(pk, again ? t.again || ["Back for more? Go on then."] : t.intro, `${t.name} · ${t.role}`);
  const r = await fight(null, null, o.tr);
  if (again) { if (r === "win") await speak(pk, t.after || ["Good. Again sometime."], t.name); return; }
  if (r === "win") {
    await speak(pk, t.win, t.name);
    if (t.final) { S.flags.alysha = 1; save(); hud(); au.sfx("win"); toast("THE ALYSHA TEST: PASSED", 5000); await ui.say(SAY.passed); return; }
    if (o.tr === "tim") { S.flags.badge = 1; save(); hud(); au.sfx("win"); await ui.say(SAY.badge); await ui.say(["From now on MAL is your training gym.", "Talk to anyone you've beaten for a rematch. Whoever you send out levels up, and projects evolve at level 14 and 24."]); toast("MAL BADGE. GO BACK AND SEE STEFAN.", 5000); }
    else if (o.tr === "cmo") toast("THE CLIENT SIGNED IT OFF", 4000);
    else { const u = Object.values(TRAINERS).find((x) => x.needs && x.needs.includes(o.tr) && x.needs.every((b) => S.beat.includes(b))); if (u) toast(u.unlock, 4500); }
  }
}

// ---------- the coffee kiosk, and your bag ----------
const IK = Object.keys(ITEMS).filter((k) => !ITEMS[k].rare), BAGK = Object.keys(ITEMS);
async function shop() {
  au.sfx("ok");
  await ui.say(["Morning! What can I get you?"], { who: "BARISTA" });
  for (;;) {
    ui.show(`You've got ${money(S.cash || 0)}. What'll it be?`);
    const c = await ui.choose([...IK.map((k) => ({ html: `<img class="ic" src="game/art/i_${k}.png" alt=""><b>${esc(ITEMS[k].name)}</b><i>${money(ITEMS[k].price)}</i>` })), "That's all"], { cls: "shop", cols: 2, cancel: true });
    if (c < 0 || c === IK.length) break;
    const it = ITEMS[IK[c]];
    ui.show(it.about); const y = await ui.choose([`Buy for ${money(it.price)}`, "Not that one"], { cls: "yn" });
    if (y !== 0) continue;
    if ((S.cash || 0) < it.price) { await ui.line("Ah, you're a bit short for that one. Battles pay, and there's change on the ground if you look."); continue; }
    S.cash = Math.round((S.cash - it.price) * 100) / 100; S.bag[IK[c]] = (S.bag[IK[c]] || 0) + 1; save(); au.sfx("level");
    await ui.line(`One ${it.name}. It's in your bag.`);
  }
  ui.hide(); await ui.say(["See you soon!"], { who: "BARISTA" });
}
// use something from the bag: in a fight (me is who's out) or walking about. Returns falsy if nothing was used.
async function useItem(me) {
  const have = BAGK.filter((k) => S.bag[k] > 0 && (me || !ITEMS[k].battle));
  if (!have.length) { await ui.line(me ? "Your bag is empty. The kiosk on the square sells coffee." : "Nothing in your bag you can use right now."); return null; }
  ui.show(`What will you have? (${money(S.cash || 0)} left)`);
  const c = await ui.choose(have.map((k) => ({ html: `<img class="ic" src="game/art/i_${k}.png" alt=""><b>${esc(ITEMS[k].name)}</b><i>×${S.bag[k]}</i>` })), { cls: "shop", cols: 2, cancel: true });
  if (c < 0) return null;
  const k = have[c], it = ITEMS[k], take = () => { S.bag[k]--; save(); };
  const heal = (key, frac, revive) => { const m = me && me.key === key ? me : null, max = statsFor(key).max, now = m ? m.hp : hpGet(key) ?? max; if (now <= 0 && !revive) return false; if (now > 0 && revive) return false; if (now >= max) return false; const v = Math.min(max, (revive ? 0 : now) + Math.round(max * frac)); if (m) m.hp = v; hpSet(key, v); return true; };
  if (it.use === "def" || it.use === "beer") {
    take(); au.sfx("buff");
    if (it.use === "def") { me.dm = Math.min(2, me.dm * 1.45); await ui.line(`${me.name} sips a HOJICHA. Calm. Defence rose!`); }
    else { me.am = Math.min(2.2, me.am * 1.6); me.dm = Math.max(.6, me.dm * .8); await ui.line(`${me.name} necks a BEER. Attack shot up! Guard dropped a bit.`); }
    return { turn: 1 };
  }
  if (it.use === "inf" || it.use === "evolve") {
    const ks = party().filter((q) => (q === "tool" || FOES[q] || GIFTS[q]) && (it.use === "inf" ? !(S.inf || {})[q] : q !== "tool" && FOES[q] && stageFor(q) < (FOES[q].evo || []).length));
    if (!ks.length) { await ui.line(it.use === "inf" ? "Everyone's already immortal. Steady on." : "None of your projects has anything left to grow into."); return null; }
    ui.show(it.use === "inf" ? "Who gets to live forever?" : "Which project gets the award?");
    const w = await ui.choose(ks.map((q) => { const m = member(q); return { html: `<img class="pm" src="${monImg(m.art)}" alt=""><b>${esc(m.name)}</b><i>Lv ${m.lvl >= 999 ? "∞" : m.lvl}</i>` }; }), { cls: "party", cols: 2, cancel: true });
    if (w < 0) return null; const q = ks[w], nm = member(q).name; take();
    if (it.use === "inf") { S.inf = S.inf || {}; S.inf[q] = 1; hpSet(q, statsFor(q).max); save(); au.sfx("secret"); await ui.line(`${nm} uploads itself to the cloud. Its level is now ∞.`); }
    else { S.stg = S.stg || {}; S.stg[q] = stageFor(q) + 1; save(); au.sfx("level"); await ui.line(`${nm} lifts THE GOLDEN LION... and evolves into ${formFor(q).name}!`); }
    if (me && me.key === q) { const st = statsFor(q), f = formFor(q); Object.assign(me, { art: f.art, name: f.name, lvl: lvlOf(q), max: st.max, atk: st.atk, def: st.def }); me.hp = Math.min(me.max, Math.max(me.hp, st.max)); }
    return { turn: 1 };
  }
  if (it.use === "all") {
    take(); healAll(); if (me) { me.hp = me.max; } au.sfx("heal"); await ui.line("A MATCHA LATTE all round. Your whole folio is back to full."); return { turn: 1 };
  }
  // pick who it's for
  const ks = party().filter((q) => q === "tool" || FOES[q] || GIFTS[q]);
  ui.show(`Who's the ${it.name} for?`);
  const w = await ui.choose(ks.map((q) => { const m = member(q), hp = me && me.key === q ? me.hp : m.hp; return { html: `<img class="pm" src="${monImg(m.art)}" alt=""><b>${esc(m.name)}</b><i>${hp <= 0 ? "TIRED" : `${Math.ceil(hp)}/${m.max}`}</i>` }; }), { cls: "party", cols: 2, cancel: true });
  if (w < 0) return null;
  const q = ks[w], nm = member(q).name, ok = heal(q, it.use === "full" ? 1 : .5, it.use === "revive");
  if (!ok) { await ui.line(it.use === "revive" ? `${nm} isn't tired. Save it for later.` : `${nm} doesn't need that right now.`); return null; }
  take(); au.sfx("heal"); await ui.line(it.use === "revive" ? `${nm} perks right up!` : `${nm} feels much better.`);
  return { turn: 1 };
}
// ---------- the hire bike ----------
function bike(on) { S.bike = !!on && !!A.bike[S.look]; }
// drop the bike on a tile: it becomes a parked lime bike anyone can pick up again
function dropBike(m, x, y) {
  if (!m || m.id !== "world" || x < 0 || y < 0 || x >= m.W || y >= m.H || m.solid[m.I(x, y)] || m.base[m.I(x, y)] === TT.water || m.objs.some((o) => !o.gone && o.x === x && o.y === y)) return false;
  const o = { k: "lime", x, y, solid: 1, w: 1, act: "lime" }; m.objs.push(o); m.tall.push(o); m.solid[m.I(x, y)] = 1; return true;
}
async function hopOff() {
  await ui.say(["Hop off and leave the bike here?"], { keep: true }); const c = await ui.choose(["Leave it", "Keep riding"], { cls: "yn" }); ui.hide();
  if (c !== 0) return;
  const [dx, dy] = DIRS[P.dir]; if (!dropBike(map, P.x + dx, P.y + dy)) dropBike(map, P.x - dx, P.y - dy);
  bike(false); au.sfx("bump"); save();
}

// ---------- a fight ----------
const TCOL = { AI: "#57c9b5", IMAGE: "#6ea4f2", FILM: "#b79cff", NONE: "#ff2d4a" };
const BG = { "les-benjamins": ["#bfe3ff", "#9be15d", "#ff9dbb"], corp: ["#e8edf5", "#9fb4d9", "#ffd76a"],  "la-croisiere": ["#bfeaf7", "#ffe9b8", "#ff9dbb"], "ai-commissions": ["#b7f3e4", "#57c9b5", "#b79cff"], "3d-explorations": ["#e0d4ff", "#a58cf0", "#86d2ec"], "ai-experiments": ["#ffc4f1", "#e772cf", "#ffd76a"], "summer-of-sport": ["#c4f0b0", "#ffd76a", "#f2907f"], relax: ["#a5e8cf", "#86d2ec", "#fff4e0"], "coca-cola": ["#ffd9a6", "#e6a25a", "#f0546a"], gumtree: ["#ffd0e3", "#ff86b6", "#a9dcbc"], x: ["#e9e4f0", "#b79cff", "#ffb38a"] };
// ---------- your party: your tool first, then every project you've caught, each with its own health ----------
const party = () => { const all = ["tool", ...S.won, ...(S.gifts || [])]; return S.lead && all.includes(S.lead) ? [S.lead, ...all.filter((k) => k !== S.lead)] : all; };
const hpGet = (k) => (k === "tool" ? S.hp : (S.php || {})[k]);
const hpSet = (k, v) => { if (k === "tool") S.hp = v; else { S.php = S.php || {}; S.php[k] = v; } };
const healAll = () => { S.hp = statsFor("tool").max; S.php = {}; };
const MV = [14, 22, 11];
function member(key) {
  const st = statsFor(key), f = formFor(key);
  const base = key === "tool" ? f : GIFTS[key] ? { ...f, moves: f.moves.map((m) => ({ ...m, t: f.type })) } : { ...f, moves: f.moves.map((m, i) => ({ n: m.n, t: f.type, p: (MV[i] || 12) + f.stage * 2, acc: i === 1 ? .82 : undefined, fx: m.fx })) };
  const max = st.max, hp = clamp(hpGet(key) ?? max, 0, max);
  return { ...base, key, lvl: lvlOf(key), max, hp, atk: st.atk, def: st.def, am: 1, dm: 1, ox: 0, oy: 0, a: 1, fl: 0, sc: 1 };
}
const alive = (except) => party().filter((k) => k !== except && (hpGet(k) ?? 1) > 0 && !(k !== "tool" && !FOES[k] && !GIFTS[k]));
async function choosePartner(force, current) {
  const ks = party().filter((k) => k === "tool" || FOES[k] || GIFTS[k]);
  const opts = ks.map((k) => { const m = member(k); return { html: `<img class="pm" src="${monImg(m.art)}" alt=""><b>${esc(m.name)}</b><i>Lv ${m.lvl} · ${k === current ? "OUT NOW" : m.hp <= 0 ? "TIRED" : `${Math.ceil(m.hp)}/${m.max}`}</i>` }; });
  for (;;) {
    const c = await ui.choose(opts, { cls: "party", cols: 2, cancel: !force });
    if (c < 0) return null;
    const k = ks[c]; if (k === current) { await ui.line(`${member(k).name} is already out!`); continue; }
    if (member(k).hp <= 0) { await ui.line(`${member(k).name} is too tired to fight.`); continue; }
    return k;
  }
}
const CAP = 40;
const postgame = () => S.won.length >= PROJECTS.length && !!S.flags.badge;
async function fight(def, slug, trId) {
  const tr = trId ? TRAINERS[trId] : null, team = tr ? tr.team.map((k) => CORP[k]) : [def]; def = team[0];
  const boss = tr ? tr.boss || 0 : def.boss || 0;
  const again = tr && S.beat.includes(trId);
  const L = tr ? (tr.fixed || (again ? Math.max(3 + tr.lv, S.lvl - 1 + Math.floor(Math.random() * 3)) : 3 + tr.lv + Math.floor((S.won.length + S.beat.length) / 2))) : def.L || (slug ? 2 : boss ? 2 + boss : 1) + S.won.length;
  const lead = party()[0], first = (hpGet(lead) ?? 1) > 0 ? lead : alive()[0] || "tool";
  let me = member(first); if (me.hp <= 0) me.hp = 1; me.a = 0;
  const mk = (d) => { const f = { ...d, lvl: L, max: Math.round((20 + L * 6) * (tr ? (tr.final ? 1.6 : boss ? 2.2 : 1.6) : boss ? 2 : 1.6)), atk: 6 + L, def: 9 + L, am: 1, dm: 1, ox: 200, oy: 0, a: 1, fl: 0, sc: 1 }; f.hp = f.max; return f; };
  let foe = mk(def), ti = 0;
  au.sfx("encounter"); au.music(null);
  for (let k = 0; k < 2; k++) { fade = .9; await sleep(60); fade = 0; await sleep(60); }
  await tween(420, (k) => (wipe = k)); fade = 1; wipe = 0;
  bt = { fx: [], me, foe, bg: BG[slug] || (tr ? BG.corp : BG.x), shake: 0, t: 0, pops: [], parts: [], flash: 0, qte: null, port: tr ? { img: A.port[tr.port.slice(2)], ox: 200 } : null, you: { img: A.back[S.look] || A.back.boy, ox: -200 } };
  mode = "battle"; hud(); au.music(tr ? "trainer" : "battle"); bars(); $("sme").hidden = true; $("sfoe").hidden = !!tr;
  // you and them slide in from either side, like the handhelds
  await fadeTo(0, 200);
  await tween(480, (k) => { bt.you.ox = -200 * (1 - k); if (tr) bt.port.ox = 200 * (1 - k); else foe.ox = 200 * (1 - k); });
  if (tr) {
    await ui.line(tr.final ? "THE ALYSHA TEST begins." : `${tr.role} ${tr.name} wants a quick chat!`, {});
    await tween(300, (k) => (bt.port.ox = 200 * k)); bt.port = null; $("sfoe").hidden = false; bars();
    await tween(380, (k) => (foe.ox = 200 * (1 - k)));
    await ui.line(`${tr.name} brings up ${def.legend ? "the legendary " : ""}${def.name}!`, {});
  } else await ui.line(def.intro || `A wild ${def.name} appeared!`, {});
  // then you throw your first one out and step off
  // a foe only patches itself up when it's actually hurt, and only once each
  const foeMove = (f) => { const ok = f.moves.filter((m) => m.kind !== "heal" || (!f.healed && f.hp < f.max * .45)), m = pick(ok.length ? ok : f.moves.filter((q) => q.kind !== "heal")); if (m.kind === "heal") f.healed = 1; return m; };
  const used = new Set();   // everyone who gets sent out learns something from the fight
  const sendOut = async (m, first) => { used.add(m.key);
    await ui.line(`Go! ${m.name}!`, { auto: .45 }); ui.hide();
    if (first) tween(360, (k) => (bt.you.ox = -220 * k));
    const b = bt.ball = { x: 50, y: 120, rot: 0, open: 0, shut: false };
    await tween(420, (k) => { b.x = 50 + 34 * k; b.y = 120 - Math.sin(k * Math.PI) * 40; b.rot = k * 10; });
    b.open = 1; bt.flash = .6; au.sfx("buff"); m.a = 1; m.sc = .15; bt.me = me = m; $("sme").hidden = false; bars();
    await tween(260, (k) => (m.sc = .15 + .85 * k)); bt.ball = null; m.sc = 1;
  };
  await sendOut(me, true); bt.you = null;
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
    const sx = isMe ? 84 : 238, sy = isMe ? 100 : 56, kind = mv.fx || "slash";
    bt.fx.push({ k: kind, t: 0, sx, sy, tx, ty, seed: Math.random() * 99 }); au.sfx(kind === "beam" || kind === "glitch" ? "buff" : kind === "notes" ? "ok" : "blip");
    await sleep(kind === "beam" || kind === "spikes" || kind === "leaf" || kind === "pins" || kind === "notes" ? 380 : 220);
    if (kind === "flash" || kind === "smash") bt.shake = 6;
    bt.flash = crit ? 1 : kind === "flash" ? 1 : .35; burst(tx, ty, TCOL[isMe ? mv.t : att.type] || "#fff8ec", crit ? 22 : 10); pop(String(n), tx + rnd(-10, 10), ty - 10, "#fff8ec", false);
    await hurt(dfn, n, e);
    if (e > 1) await tell("It's super effective!"); else if (e < 1) await tell("It's not very effective.");
  };
  const swapTo = async (key) => {
    hpSet(me.key, me.hp); await ui.line(`${me.name}, come back!`, { auto: .5 }); ui.hide();
    await tween(260, (k) => { me.sc = 1 - k * .85; me.a = 1 - k; }); await sendOut(member(key), false);
  };
  while (!result) {
    ui.show(`What will ${me.name} do?`);
    const c0 = await ui.choose(["FIGHT", "BAG", "FOLIO", "RUN"], { cls: "cmd", cols: 2 });
    if (c0 === 1) {
      const r = await useItem(me); bars(); if (!r) continue;
      if (r.swap) { me = bt.me; }
      await act(foe, me, foeMove(foe), false);
      if (me.hp <= 0) { au.sfx("faint"); await tween(500, (k) => { me.oy = k * 40; me.a = 1 - k; }); await ui.line(`${me.name} is too tired to carry on!`); hpSet(me.key, 0); if (!alive().length) { result = "lose"; break; } ui.show("Who's up next?"); const k = await choosePartner(true, me.key); ui.hide(); await sendOut(member(k), false); }
      continue;
    }
    const c = c0 === 0 ? 0 : c0 - 1;
    if (c === 2) { if (boss || tr) { await ui.line(tr ? "You can't walk out of a meeting." : SAY.cantRun[0]); continue; } result = "run"; break; }
    if (c === 1) {
      if (!S.won.length) { await ui.line("Your folio is empty. Catch a project to fight with it."); continue; }
      const k = await choosePartner(false, me.key); if (!k) continue;
      await swapTo(k);
      await act(foe, me, foeMove(foe), false);
    } else {
      const mi = await ui.choose(me.moves.map((m) => ({ html: `<b>${esc(m.n)}</b><i>${m.kind ? (m.kind === "heal" ? "HEAL" : m.kind === "buff" ? "BOOST" : "WEAKEN") : m.t}</i>` })), { cls: "moves", cols: 2, cancel: true });
      if (mi < 0) continue;
      await act(me, foe, me.moves[mi], true);
      if (foe.hp <= 0) {
        if (tr && ti < team.length - 1) {
          au.sfx("faint"); await tween(500, (k) => { foe.oy = k * 40; foe.a = 1 - k; }); await ui.line(`${foe.name} is dealt with.`);
          ti++; foe = mk(team[ti]); bt.foe = foe; bars(); await tween(380, (k) => (foe.ox = 200 * (1 - k)));
          await ui.line(`${tr.name} brings up ${foe.legend ? "the legendary " : ""}${foe.name}!`, {}); continue;
        }
        result = "win"; break;
      }
      await act(foe, me, foeMove(foe), false);
    }
    if (me.hp <= 0) {
      au.sfx("faint"); await tween(500, (k) => { me.oy = k * 40; me.a = 1 - k; }); await ui.line(`${me.name} is too tired to carry on!`); hpSet(me.key, 0);
      if (!alive().length) { result = "lose"; break; }
      ui.show("Who's up next?"); const k = await choosePartner(true, me.key); ui.hide(); await sendOut(member(k), false);
    }
  }
  hpSet(me.key, Math.max(0, Math.round(me.hp)));
  if (result === "win") {
    if (slug) await catchIt(foe);
    else { au.sfx("faint"); await tween(500, (k) => { foe.oy = k * 40; foe.a = 1 - k; }); await ui.line(`${foe.name} is ${tr ? "dealt with" : "beaten"}.`); }
    au.music(null); au.chip.fanfare();
    const bench = party().filter((k) => k !== "tool" && k !== slug && !used.has(k) && S.plv[k] != null && !(S.inf || {})[k]);   // the ones sat in the folio learn too, at half the pace
    const lvBefore = {}, nmBefore = {}; for (const k of [...used, ...bench]) { lvBefore[k] = lvlOf(k); nmBefore[k] = formFor(k).name; }
    const up = (n = 1) => { S.lvl = Math.min(CAP, S.lvl + n); used.forEach((k) => { if (k !== "tool" && !(S.inf || {})[k]) S.plv[k] = Math.min(CAP, (S.plv[k] || S.lvl) + n); });
      S.bxp = S.bxp || {}; bench.forEach((k) => { S.bxp[k] = (S.bxp[k] || 0) + n * .5; const g = Math.floor(S.bxp[k]); if (g > 0) { S.bxp[k] -= g; S.plv[k] = Math.min(CAP, (S.plv[k] || S.lvl) + g); } }); };
    // money: clients pay a fee, wild things drop a bit of change
    const fee = Math.round((tr ? (again ? 1 + L * .15 : 2 + L * .35) * (tr.final ? 3 : boss ? 2 : 1) : slug ? 1 + L * .15 : .5 + L * .1) * 10) / 10;
    if (tr) {
      if (!again) S.beat.push(trId); up(); me.lvl = lvlOf(me.key); bars(); save(); hud();
      await ui.line(again ? `You got through ${tr.name} again.` : `You got through ${tr.name}'s quick chat.`); au.sfx("level");
    } else if (slug) {
      S.won.push(slug); S.plv[slug] = S.lvl; up(); me.lvl = lvlOf(me.key); bars(); save(); hud(); au.sfx("level");
    } else if (postgame() || S.flags.badge) up();
    S.cash = (S.cash || 0) + fee; save();
    await ui.line(`${tr ? `${tr.name} paid you` : "You picked up"} ${money(fee)}.`);
    // say who grew, then evolve anyone who's ready
    for (const k of used) { const was = lvBefore[k], now = lvlOf(k); if (now > was) { await ui.line(`${nmBefore[k]} grew to level ${now}!`, { auto: .9 }); } }
    const grew = bench.filter((k) => lvlOf(k) > lvBefore[k]);
    if (grew.length) await ui.line(grew.length === 1 ? `Back in your folio, ${nmBefore[grew[0]]} grew to level ${lvlOf(grew[0])}.` : `Back in your folio, ${grew.length} of your team grew a level.`, { auto: .9 });
    for (const k of [...used, ...grew]) { await evolve(k, lvBefore[k], me); keepStage(k); } save();
    if (slug) await ui.line(`${def.name} joined your folio. You can send it out in battle now.`);
    // knocks stay with you until you get a coffee
    if (me.hp < me.max * .35) await ui.line(`${me.name} is looking worn out. A coffee would sort that.`);
  } else if (result === "lose") {
    au.music(null); au.sfx("lose"); await ui.line("Your whole folio is tired out.");
  } else await ui.line(SAY.ran[0]);
  ui.hide(); await fadeTo(1, 300);
  bt = null; mode = "world"; hud(); $("sfoe").hidden = $("sme").hidden = true;
  if (result === "lose") { healAll(); if (S.bike) dropBike(maps.world, P.x, P.y); bike(false); save(); place(maps.house, 3, 4, "down"); }
  save();
  au.music("world"); await fadeTo(0, 300);
  if (result === "lose") await ui.say(SAY.lost);
  if (result === "win" && slug) { await card(slug, true); if (S.won.length === 4) toast("FOUR FOUND. THE MAL OFFICE IS OPEN, EAST OF THE SQUARE.", 5000); if (S.won.length === PROJECTS.length) toast("EVERY PROJECT FOUND. GO BACK AND SEE STEFAN.", 5000); }
  return result;
}
// a beaten project gets caught: throw a Folio Ball, it swallows the project, wobbles three times, and clicks shut
async function catchIt(foe) {
  await ui.line(`${foe.name} is worn out!`); await ui.line("You throw a FOLIO BALL!", { auto: .5 }); ui.hide();
  $("sme").hidden = true; // clear the stage so the ball sits on the platform on its own
  const b = bt.ball = { x: 60, y: 130, rot: 0, open: 0, shut: false, suck: 0, ring: 0 }; au.sfx("blip");
  // arc up and hang just above the project, the way the handhelds did it
  await tween(620, (k) => { b.x = 60 + (238 - 60) * k; b.y = 130 + (40 - 130) * k - Math.sin(k * Math.PI) * 50; b.rot = k * 12; });
  b.rot = 0; await sleep(120);
  // the lid pops, the project turns to pink light and gets pulled in as a stream of sparks
  au.sfx("buff"); b.open = 1; b.ring = 1;
  await tween(220, (k) => (foe.tint = k));
  await tween(440, (k) => { const e = k * k; foe.sc = 1 - e; foe.oy = (40 - 92) * e; b.suck = k; });
  foe.a = 0; b.suck = 0; b.open = 0; b.ring = 1; au.sfx("bump");
  // it drops onto the middle of the platform with a little bounce
  await tween(340, (k) => (b.y = 40 + (81 - 40) * k * k));
  await tween(180, (k) => (b.y = 81 - Math.sin(k * Math.PI) * 6));
  for (let n = 0; n < 3; n++) { await sleep(320); au.sfx("blip"); await tween(380, (k) => (b.rot = Math.sin(k * Math.PI * 2) * .45)); }
  await sleep(250); b.shut = true; b.ring = 1; au.sfx("level");
  for (let k = 0; k < 18; k++) { const a = rnd(0, 6.28), sp = rnd(30, 100); bt.parts.push({ x: b.x, y: b.y - 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, t: 0, col: k % 2 ? "#ffd76a" : "#fff8ec" }); }
  await ui.line(`Gotcha! ${foe.name} was caught!`);
}
// every kind of attack looks different: a beam, a glitch, paint, slashes, splashes, spikes, notes, coins...
function drawFx(b) {
  for (let i = b.fx.length - 1; i >= 0; i--) {
    const f = b.fx[i]; f.t += 1 / 60; const T = f.t, k = Math.min(1, T / .35), out = Math.max(0, 1 - Math.max(0, T - .35) / .35);
    if (T > .75) { b.fx.splice(i, 1); continue; }
    const r = (n) => { const x = Math.sin(f.seed * 13.7 + n * 91.3) * 43758.5; return x - Math.floor(x); };
    const fly = (n, w = 10) => [f.sx + (f.tx - f.sx) * Math.min(1, T / .4 + r(n) * .1) + (r(n + 9) - .5) * w, f.sy + (f.ty - f.sy) * Math.min(1, T / .4 + r(n) * .1) + (r(n + 5) - .5) * w - Math.sin(Math.min(1, T / .4) * Math.PI) * 18];
    g.save(); g.globalAlpha = out;
    if (f.k === "beam") { g.strokeStyle = "rgba(87,201,181,.5)"; g.lineWidth = 9; g.beginPath(); g.moveTo(f.sx, f.sy); g.lineTo(f.sx + (f.tx - f.sx) * k, f.sy + (f.ty - f.sy) * k); g.stroke(); g.strokeStyle = "#fff8ec"; g.lineWidth = 3; g.stroke(); }
    else if (f.k === "glitch") { for (let n = 0; n < 7; n++) { g.fillStyle = ["#ff2d4a", "#57c9b5", "#6ea4f2"][n % 3]; g.globalAlpha = out * .7; g.fillRect(f.tx - 28 + (r(n + T * 20 | 0) - .5) * 16, f.ty - 28 + n * 8, 56 * r(n + 3), 3); } }
    else if (f.k === "paint") { ["#ff9dbb", "#6ea4f2", "#ffd76a"].forEach((c, n) => { if (k < n * .25) return; g.strokeStyle = c; g.lineWidth = 6; g.lineCap = "round"; g.beginPath(); g.moveTo(f.tx - 24, f.ty - 18 + n * 14); g.quadraticCurveTo(f.tx, f.ty - 30 + n * 14, f.tx + 24 * Math.min(1, k * 1.4), f.ty - 14 + n * 14); g.stroke(); }); }
    else if (f.k === "warp") { g.strokeStyle = "#b9a0ff"; g.lineWidth = 2; for (let n = 0; n < 3; n++) { const rr = ((T * 50 + n * 12) % 36) + 4; g.beginPath(); g.ellipse(f.tx, f.ty, rr * 1.3, rr * .8, 0, 0, 7); g.stroke(); } }
    else if (f.k === "slash") { g.strokeStyle = "#fff8ec"; g.lineWidth = 3; for (let n = 0; n < 3; n++) { if (k < n * .3) continue; const o = n * 10 - 10; g.beginPath(); g.moveTo(f.tx - 18 + o, f.ty - 20); g.lineTo(f.tx + 10 + o, f.ty + 16); g.stroke(); } }
    else if (f.k === "smash") { const R0 = 8 + k * 22; g.fillStyle = "#ffd76a"; g.beginPath(); for (let n = 0; n < 16; n++) { const a = n / 16 * 6.283, rr = n % 2 ? R0 * .5 : R0; g.lineTo(f.tx + Math.cos(a) * rr, f.ty + Math.sin(a) * rr); } g.fill(); g.fillStyle = "#fff8ec"; g.beginPath(); g.arc(f.tx, f.ty, R0 * .35, 0, 7); g.fill(); }
    else if (f.k === "flash") { g.fillStyle = "#2b1f3b"; const h = 30 * (1 - Math.abs(k * 2 - 1)); g.fillRect(f.tx - 30, f.ty - 30, 60, h); g.fillRect(f.tx - 30, f.ty + 30 - h, 60, h); g.fillStyle = "#fff"; g.beginPath(); g.arc(f.tx + 14, f.ty - 14, 6 * k, 0, 7); g.fill(); }
    else if (f.k === "splash") { g.fillStyle = "#86d2ec"; for (let n = 0; n < 14; n++) { const a = r(n) * 6.28, d = k * (12 + r(n + 2) * 22); g.beginPath(); g.ellipse(f.tx + Math.cos(a) * d, f.ty + Math.sin(a) * d - k * 6, 2.5, 3.5, 0, 0, 7); g.fill(); } }
    else if (f.k === "fizz") { for (let n = 0; n < 14; n++) { g.strokeStyle = "#fff8ec"; g.lineWidth = 1.5; g.beginPath(); g.arc(f.tx + (r(n) - .5) * 44, f.ty + 20 - ((T * 70 + r(n + 1) * 40) % 50), 2 + r(n + 2) * 3, 0, 7); g.stroke(); } }
    else if (f.k === "sparkle") { g.fillStyle = "#ffd76a"; for (let n = 0; n < 7; n++) { const x = f.tx + (r(n) - .5) * 56, y = f.ty + (r(n + 4) - .5) * 50, s = (2 + r(n + 1) * 4) * Math.sin(Math.min(1, T * 3 + r(n)) * Math.PI); g.beginPath(); g.moveTo(x, y - s * 2); g.lineTo(x + s * .5, y - s * .5); g.lineTo(x + s * 2, y); g.lineTo(x + s * .5, y + s * .5); g.lineTo(x, y + s * 2); g.lineTo(x - s * .5, y + s * .5); g.lineTo(x - s * 2, y); g.lineTo(x - s * .5, y - s * .5); g.fill(); } }
    else if (f.k === "coins") { for (let n = 0; n < 10; n++) { const x = f.tx + (r(n) - .5) * 50, y = f.ty - 40 + Math.min(1, T * 2.2 + r(n) * .3) * 50; g.fillStyle = "#ffd76a"; g.beginPath(); g.ellipse(x, y, 3.5 * Math.abs(Math.cos(T * 12 + n)) + .6, 3.5, 0, 0, 7); g.fill(); g.fillStyle = "#c99a2e"; g.fillRect(x - .5, y - 2, 1, 4); } }
    else if (f.k === "paper") { for (let n = 0; n < 9; n++) { g.save(); g.translate(f.tx + (r(n) - .5) * 56, f.ty - 34 + Math.min(1, T * 2 + r(n) * .3) * 48); g.rotate(Math.sin(T * 8 + n) * .6); g.fillStyle = "#fff8ec"; g.fillRect(-5, -6, 10, 12); g.fillStyle = "#b9a0ff"; g.fillRect(-3, -3, 6, 1); g.fillRect(-3, 0, 5, 1); g.restore(); } }
    else { // things that fly from attacker to target: spikes, leaves, pins, notes
      for (let n = 0; n < 6; n++) { const [x, y] = fly(n, 18); g.save(); g.translate(x, y);
        if (f.k === "spikes") { g.fillStyle = "#7fd27a"; g.rotate(Math.atan2(f.ty - f.sy, f.tx - f.sx)); g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -3); g.lineTo(-4, 3); g.fill(); }
        else if (f.k === "leaf") { g.rotate(T * 10 + n); g.fillStyle = "#a9dc96"; g.beginPath(); g.ellipse(0, 0, 6, 3, 0, 0, 7); g.fill(); g.fillStyle = "#5fae55"; g.fillRect(-5, 0, 10, 1); }
        else if (f.k === "pins") { g.rotate(Math.atan2(f.ty - f.sy, f.tx - f.sx)); g.fillStyle = "#cfd3e0"; g.fillRect(-5, 0, 10, 1); g.fillStyle = "#f0546a"; g.beginPath(); g.arc(-5, .5, 1.6, 0, 7); g.fill(); }
        else { g.fillStyle = "#2b1f3b"; g.font = "12px 'Pixelify Sans', monospace"; g.fillText(n % 2 ? "♪" : "♫", 0, 0); }
        g.restore(); }
    }
    g.restore();
  }
}
function drawBall(b) {
  g.save(); g.translate(b.x, b.y); g.rotate(b.rot);
  const r = 6; g.fillStyle = "#2b1f3b"; g.beginPath(); g.arc(0, 0, r + 1, 0, 7); g.fill();
  g.fillStyle = "#fff4e0"; g.beginPath(); g.arc(0, 0, r, 0, Math.PI); g.fill();
  g.fillStyle = "#8a5ad6"; g.beginPath(); g.arc(0, -(b.open ? 3 : 0), r, Math.PI, 0); g.fill(); g.fillStyle = "#a97df0"; g.fillRect(-3, -5 - (b.open ? 3 : 0), 2, 2);
  g.fillStyle = "#2b1f3b"; g.fillRect(-r, -1, r * 2, 2); g.beginPath(); g.arc(0, 0, 2.6, 0, 7); g.fill();
  g.fillStyle = b.shut ? "#ffd76a" : "#fff8ec"; g.beginPath(); g.arc(0, 0, 1.6, 0, 7); g.fill();
  g.restore();
  // little shadow under it once it's down
  if (b.y > 70) { g.fillStyle = "rgba(43,31,59,.22)"; g.beginPath(); g.ellipse(b.x, 88, 6 - (81 - Math.min(81, b.y)) * .3, 1.6, 0, 0, 7); g.fill(); }
  // a ring of light pops off the ball whenever it opens or shuts
  if (b.ring > 0) { const rr = 6 + (1 - b.ring) * 14; g.strokeStyle = `rgba(255,248,236,${b.ring})`; g.lineWidth = 1.5; g.beginPath(); g.arc(b.x, b.y, rr, 0, 7); g.stroke(); b.ring = Math.max(0, b.ring - .06); }
  // sparks spiral out of the project and into the ball
  if (b.suck > 0) {
    const fx = 238, fy = 52;
    for (let n = 0; n < 14; n++) {
      const p = ((b.suck * 1.6 + n / 14) % 1), a = n * 2.4 + p * 5, rad = (1 - p) * 26;
      const x = b.x + (fx - b.x) * (1 - p) + Math.cos(a) * rad, y = b.y + (fy - b.y) * (1 - p) + Math.sin(a) * rad * .6;
      g.fillStyle = n % 3 ? "#ff9dd0" : "#fff8ec"; const s = n % 3 ? 2 : 1; g.fillRect(Math.round(x), Math.round(y), s, s);
    }
  }
}
// your tool grows up: it flickers between old and new, then the new one stays
async function evolve(key, before, me) {
  const was = formFor(key, before), to = formFor(key);
  if (was.art === to.art) return;
  // only the one on the field gets the full show; the rest grow up back in the folio
  if (me.key !== key) { au.sfx("level"); await ui.line(`Back in your folio, ${was.name} evolved into ${to.name}!`); return; }
  const old = me.art, oldName = me.name; au.music(null);
  await ui.line(`What? ${oldName} is evolving!`, {});
  ui.hide(); au.sfx("secret");
  for (let k = 0; k < 14; k++) { me.art = k % 2 ? to.art : old; bt.flash = .7; await sleep(Math.max(60, 260 - k * 16)); }
  const st = statsFor(key); me.art = to.art; me.name = to.name; me.max = st.max; me.hp = st.max; hpSet(key, st.max); me.atk = st.atk; me.def = st.def; bt.flash = 1; bars(); au.sfx("level");
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
  const px = 6 - Math.min(0, OX), py = 137, pw = 308 + 2 * Math.min(0, OX), ph = 38;
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
  const set = (el, m, mine) => { const k = clamp(m.hp / m.max, 0, 1); el.innerHTML = `<div class="nm"><b>${esc(m.name)}</b><span>Lv ${m.lvl >= 999 ? "∞" : m.lvl}</span></div><div class="hp"><i style="width:${(k * 100).toFixed(1)}%;background:${k > .5 ? "#5fc98a" : k > .22 ? "#ffc857" : "#f0546a"}"></i></div>${mine ? `<div class="n">${Math.ceil(m.hp)} / ${m.max}</div>` : `<div class="n ty">${m.type === "NONE" ? "" : m.type}</div>`}`; };
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
    el.innerHTML = `<div class="sheet"><div class="top"><img class="mon" src="${monImg(S.won.includes(slug) ? formFor(slug).art : f.art)}" alt=""><div><span class="no">No. ${String(i + 1).padStart(2, "0")} · ${esc(f.zone)}</span><h2>${esc(p.title)}</h2><p class="meta">${esc(p.client)} · ${esc(p.kind)}</p></div></div>
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
  const el = $("folio"), m = formFor("tool");
  el.innerHTML = `<div class="sheet"><div class="fh"><h2>FOLIO</h2><span>${S.won.length} of ${PROJECTS.length} beaten</span><button type="button" id="fclose">Close</button></div>
    <div class="grid">${PROJECTS.map((p, i) => { const got = S.won.includes(p.slug), f = FOES[p.slug]; return `<button type="button" class="slot${got ? " got" : ""}" data-s="${p.slug}" ${got ? "" : "disabled"}><img src="${monImg(got ? formFor(p.slug).art : f.art)}" alt=""><b>${got ? esc(formFor(p.slug).name) : "? ? ?"}</b><i>${got ? `Lv ${lvlOf(p.slug)} · ${esc(p.client)}` : esc(f.zone)}</i>${got ? tags(p.slug) : ""}</button>`; }).join("")}</div>
    ${(S.gifts || []).length ? `<div class="grid">${S.gifts.map((k) => { const g = member(k); return `<button type="button" class="slot got" data-k="${k}"><img src="${monImg(g.art)}" alt=""><b>${esc(g.name)}</b><i>Lv ${g.lvl >= 999 ? "∞" : g.lvl} · A GIFT</i>${tags(k)}</button>`; }).join("")}</div>` : ""}
    <button type="button" class="with" data-k="tool"><img src="${monImg(m.art)}" alt=""><span>Your tool: <b>${m.name}</b>, level ${lvlOf("tool") >= 999 ? "∞" : S.lvl}.</span>${tags("tool")}</button>
    <p class="fhint">Tap anyone to put them first in fights, or have them walk with you.</p></div>`;
  el.hidden = false;
  $("fclose").addEventListener("click", closeFolio);
  el.querySelectorAll(".slot.got,.with").forEach((b) => b.addEventListener("click", () => pickIn(b.dataset.s || b.dataset.k)));
}
const leadKey = () => party()[0];
const tags = (k) => `${leadKey() === k ? '<em class="tag">FIRST OUT</em>' : ""}${palKey() === k ? '<em class="tag walk">WALKING</em>' : ""}`;
// what to do with one of them: lead the fights, come for a walk, or (for a project) see the work
function pickIn(k) {
  const el = $("folio"), m = member(k), proj = PROJECTS.some((p) => p.slug === k);
  const opts = [leadKey() === k ? null : ["lead", "SEND OUT FIRST"], palKey() === k ? ["stay", "BACK IN THE FOLIO"] : ["walk", "WALK WITH ME"], proj ? ["card", "SEE THE WORK"] : null, ["back", "BACK"]].filter(Boolean);
  const pop = document.createElement("div"); pop.className = "fpick";
  pop.innerHTML = `<div class="fbox"><img src="${monImg(m.art)}" alt=""><b>${esc(m.name)}</b>${opts.map(([v, t]) => `<button type="button" data-v="${v}">${t}</button>`).join("")}</div>`;
  el.appendChild(pop); au.sfx("ok");
  pop.addEventListener("click", async (e) => {
    const v = e.target.closest("button")?.dataset.v; if (!v && e.target !== pop) return;
    pop.remove();
    if (v === "lead") { S.lead = k; save(); au.sfx("buff"); folio(); }
    else if (v === "walk") { S.pal = k; save(); au.sfx("buff"); closeFolio(); }
    else if (v === "stay") { S.pal = null; save(); folio(); }
    else if (v === "card") { closeFolio(); await script(() => card(k)); }
  });
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
function hud() { $("hud").hidden = mode !== "world" || !S.starter; }
// the burger: everything that used to sit across the top of the screen
const fsOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function fullscreen() { const d = document.documentElement; try { if (fsOn()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else (d.requestFullscreen || d.webkitRequestFullscreen).call(d); } catch (e) {} }
function toggleSound() { au.on = !au.on; if (au.on) au.unlock(); au.toggle(); toast(au.on ? "SOUND ON" : "SOUND OFF", 1200); }
// where you come in on each office floor, for starting it again if the furniture boxes you in
const FLOOR_IN = { mal0: [15, 12, "up"], mal1: [20, 3, "down"], mal2: [1, 3, "down"] };
function openMenu() {
  if (busy || mode !== "world" || !S.starter || folioOpen) return;
  let then = null;
  script(async () => {
    au.sfx("ok");
    ui.show(`FOLIO ${S.won.length}/${PROJECTS.length} · REELS ${(S.reels || []).length}/8 · CHATS ${S.beat.length}/${Object.keys(TRAINERS).length} · ${money(S.cash || 0)}${S.flags.badge ? " · ★ MAL BADGE" : ""}`);
    const inOffice = /^mal/.test(map.id), opts = [["folio", "FOLIO"], ["bag", "BAG"], ...(inOffice ? [["redo", "START THIS FLOOR AGAIN"], ["out", "LEAVE THE OFFICE"]] : []), ["fs", fsOn() ? "EXIT FULLSCREEN" : "FULLSCREEN"], ["snd", au.on ? "SOUND: ON" : "SOUND: OFF"], ["exit", "BACK TO THE SITE"]];
    const c = await ui.choose(opts.map((o) => o[1]), { cls: "pmenu", cancel: true }); ui.hide();
    if (c < 0) return; const k = opts[c][0];
    if (k === "folio") then = folio; else if (k === "bag") { await useItem(null); ui.hide(); } else if (k === "fs") fullscreen(); else if (k === "snd") toggleSound(); else if (k === "exit") location.href = "./#ai-experiments"; else if (k === "redo") { const e = FLOOR_IN[map.id] || FLOOR_IN.mal0; then = () => script(() => warp(map, ...e)); } else if (k === "out") then = () => script(() => warp(maps.world, 46, 36, "down"));
  }).then(() => then && then());
}
// tap or click a thing near you to interact with it
$("frame").addEventListener("click", (e) => {
  if (e.target.closest("button, a, .menu, .dlg, .over, .hud") || mode !== "world" || busy || P.moving) return;
  const r = cv.getBoundingClientRect(), wx = (e.clientX - r.left) / r.width * VW + cam.x, wy = (e.clientY - r.top) / r.height * VH + cam.y;
  const tx = Math.floor(wx / 16), ty = Math.floor(wy / 16);
  const o = map.objs.find((o) => o.act && !o.gone && tx >= o.x && tx < o.x + (o.w || 1) && (ty === o.y || ty === o.y - 1) && Math.abs(o.x - P.x) + Math.abs(o.y - P.y) <= 4);
  if (!o) return;
  const ex = clamp(P.x, o.x, o.x + (o.w || 1) - 1) - P.x, ey = o.y - P.y; P.dir = Math.abs(ex) >= Math.abs(ey) ? (ex > 0 ? "right" : "left") : ey > 0 ? "down" : "up";
  au.unlock(); run(o.act, o);
});
$("bmenu").addEventListener("click", () => { if (folioOpen) closeFolio(); else openMenu(); });

// ---------- drawing ----------
// a small walking version of whichever creature is out with you
const palKey = () => { const k = S.pal; return k && (k === "tool" || S.won.includes(k) || (S.gifts || []).includes(k)) ? k : null; };
const PALC = {};
function palSprite(k, flip) {
  const art = formFor(k).art, key = art + (flip ? "<" : ""); if (PALC[key]) return PALC[key];
  const im = (flip ? A.monF : A.mon)[art]; if (!im) return null; const w0 = im.width, h0 = im.height, sc = 26 / Math.max(w0, h0 * 1.05);
  const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w0 * sc)); c.height = Math.max(1, Math.round(h0 * sc)); const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(im, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height); for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0; x.putImageData(d, 0, 0); return (PALC[key] = c);
}
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
    if (o.k === "coin") { if (coinUp(o)) coin(o.x * 16 - cx + 8, o.y * 16 - cy + 10 + Math.round(Math.sin(now / 300 + o.n) * 1), now + o.n * 97); return; }
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
  const me = () => { const s = S.bike && A.bike[S.look] ? A.bike[S.look][P.dir][P.moving ? Math.floor(now / 120) % 2 : 0] : pose(A.who.you, P.dir, P.moving && !P.sliding && P.t < .55 ? 1 + (P.steps % 2) : 0), x = Math.round(P.px - cx), y = Math.round(P.py - cy); g.drawImage(A.sh[12], x + 2, y + 12); g.drawImage(s, Math.round(x + 8 - iw(s) / 2), y + 16 - ih(s), iw(s), ih(s)); drawn = true; };
  const py = P.py / 16, pk = palKey(), pal = pk && !F.hide && !S.bike ? palSprite(pk) : null;
  const fpx = (F.fx + (F.x - F.fx) * (P.moving ? P.t : 1)) * 16, fpy = (F.fy + (F.y - F.fy) * (P.moving ? P.t : 1)) * 16; let pdrawn = !pal;
  const buddy = () => { pdrawn = true; const x = Math.round(fpx - cx + 8), y = Math.round(fpy - cy + 16), hop = P.moving ? Math.round(Math.abs(Math.sin(P.t * Math.PI)) * 2) : Math.round(Math.sin(now / 380) * .6);
    const flip = P.dir === "right" && A.monF; g.drawImage(A.sh[12], x - 6, y - 4); const s = flip ? palSprite(pk, true) : pal; g.drawImage(s, Math.round(x - s.width / 2), y - s.height - 1 - hop); };
  row.forEach((o) => { if (!pdrawn && o.y > fpy / 16) buddy(); if (!drawn && o.y > py) me(); put(o); }); if (!pdrawn && fpy <= P.py) buddy(); if (!drawn) me(); if (!pdrawn) buddy();
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
  // evening: the light drops, the windows and fireflies come on
  if (night) { g.globalCompositeOperation = "multiply"; g.fillStyle = "#6c6fc4"; g.fillRect(0, 0, VW, VH); g.globalCompositeOperation = "source-over";
    const lx = Math.round(P.px - cx + 8), ly = Math.round(P.py - cy + 8), lg = g.createRadialGradient(lx, ly, 0, lx, ly, 46); lg.addColorStop(0, "rgba(255,226,160,.28)"); lg.addColorStop(1, "rgba(255,226,160,0)"); g.fillStyle = lg; g.fillRect(0, 0, VW, VH); }
  // petals by day, fireflies by night
  motes.forEach((m) => {
    m.x += (night ? Math.sin(t * 1.3 + m.p) * .25 : .35 + m.s * .3) ; m.y += night ? Math.cos(t * 1.1 + m.p) * .2 : .18 + m.s * .2;
    if (m.x > VW + 4) m.x = -4; if (m.y > VH + 4) m.y = -4; if (m.x < -4) m.x = VW + 4; if (m.y < -4) m.y = VH + 4;
    if (night) { const a = .5 + Math.sin(t * 3 + m.p * 5) * .5; g.fillStyle = `rgba(255,236,140,${a})`; g.fillRect(Math.round(m.x), Math.round(m.y), 1, 1); g.fillStyle = `rgba(255,236,140,${a * .25})`; g.fillRect(Math.round(m.x) - 1, Math.round(m.y) - 1, 3, 3); }
    // (no petals by day: the handhelds kept the sky clear)
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
function coin(x, y, now) {
  x = Math.round(x); y = Math.round(y); const w = Math.max(1, Math.round(Math.abs(Math.cos(now / 260)) * 4));
  g.fillStyle = "rgba(43,31,59,.25)"; g.fillRect(x - 3, y + 5, 6, 1);
  g.fillStyle = "#2b1f3b"; g.fillRect(x - w - 1, y - 4, w * 2 + 2, 9); g.fillRect(x - w, y - 5, w * 2, 11);
  g.fillStyle = "#ffd76a"; g.fillRect(x - w, y - 4, w * 2, 9); g.fillStyle = "#c99a2e"; if (w > 2) g.fillRect(x - 1, y - 2, 2, 5); g.fillStyle = "#fff4c2"; g.fillRect(x - w, y - 4, 1, 3);
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
// a solid pink-light silhouette of a creature, for when it gets pulled into a ball
const GLOW = new Map();
function glowOf(s) {
  let c = GLOW.get(s); if (c) return c;
  c = document.createElement("canvas"); c.width = s.width; c.height = s.height; const x = c.getContext("2d");
  x.drawImage(s, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#ffb8de"; x.fillRect(0, 0, c.width, c.height);
  GLOW.set(s, c); return c;
}
function drawBattle(now) {
  const b = bt, [c0, c1, c2] = b.bg, sh = b.shake > 0 ? Math.round(Math.sin(now / 18) * b.shake) : 0; b.shake = Math.max(0, b.shake - .35);
  g.fillStyle = c0; g.fillRect(0, 0, VW, VH); g.translate(OX, 0);
  // the same soft heat as the real site, in big pixels
  const blob = (x, y, r, c) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, c + "00"); g.fillStyle = gr; g.fillRect(-OX, 0, VW, VH); };
  blob(70 + Math.sin(now / 1900) * 30, 40, 150, c1); blob(250 + Math.cos(now / 2300) * 30, 150, 160, c2); blob(170, 90 + Math.sin(now / 1500) * 20, 90, "#ffffff");
  g.fillStyle = "rgba(43,31,59,.14)"; g.beginPath(); g.ellipse(238 + sh, 86, 54, 11, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(84 + sh, 130, 60, 12, 0, 0, 7); g.fill();
  const fig = (m, x, y, mirror, bob) => {
    const s = (mirror && A.monF[m.art]) || A.mon[m.art], w = iw(s) * (m.sc ?? 1), h = ih(s) * (m.sc ?? 1); g.globalAlpha = m.a;
    g.drawImage(s, Math.round(x - w / 2 + m.ox + sh), Math.round(y - h + m.oy + bob), w, h);
    if (m.tint > 0 && w > 1) { g.globalAlpha = m.a * m.tint; g.drawImage(glowOf(s), Math.round(x - w / 2 + m.ox + sh), Math.round(y - h + m.oy + bob), w, h); }
    if (m.fl > 0) { g.globalAlpha = m.fl * .6; g.fillStyle = "#b7f3c8"; g.beginPath(); g.ellipse(x + m.ox, y - h / 2, w * .5, h * .5, 0, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  };
  if (b.port && b.port.img) { const p = b.port.img; g.drawImage(p, Math.round(238 - iw(p) / 2 + b.port.ox), 102 - ih(p), iw(p), ih(p)); }
  if (b.you && b.you.img) { const p = b.you.img; g.drawImage(p, Math.round(84 - iw(p) / 2 + b.you.ox), 152 - ih(p), iw(p), ih(p)); }
  fig(b.foe, 238, 92, false, Math.round(Math.sin(now / 420) * 2)); fig(b.me, 84, 136, true, Math.round(Math.sin(now / 480 + 1) * 2));
  // legendaries shimmer: little stars wink in and out around them
  if (b.foe.legend && b.foe.a > .5) for (let n = 0; n < 7; n++) { const t = now / 900 + n * .37, k = (t % 1), x = 238 + Math.sin(n * 2.3 + Math.floor(t) * 1.7) * 34 + b.foe.ox, y = 60 + Math.cos(n * 1.9 + Math.floor(t) * 2.1) * 28, sz = Math.sin(k * Math.PI) * 2.5; g.fillStyle = n % 2 ? "#fff8ec" : "#ffd6f0"; g.fillRect(Math.round(x - sz), Math.round(y), Math.round(sz * 2) + 1, 1); g.fillRect(Math.round(x), Math.round(y - sz), 1, Math.round(sz * 2) + 1); }
  if (b.ball) drawBall(b.ball);
  drawFx(b);
  // sparks, numbers, the white flash of a big hit, and the action command on top
  for (let i = b.parts.length - 1; i >= 0; i--) { const p = b.parts[i]; p.t += 1 / 60; p.x += p.vx / 60; p.y += p.vy / 60; p.vy += 260 / 60; if (p.t > .6) { b.parts.splice(i, 1); continue; } g.fillStyle = p.col; g.globalAlpha = 1 - p.t / .6; g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); g.globalAlpha = 1; }
  g.textAlign = "center";
  for (let i = b.pops.length - 1; i >= 0; i--) { const p = b.pops[i]; p.t += 1 / 60; if (p.t > 1) { b.pops.splice(i, 1); continue; } const yy = p.y - Math.min(1, p.t * 3) * 10, sc = p.t < .12 ? 1 + (1 - p.t / .12) * .6 : 1;
    g.font = `${Math.round((p.big ? 14 : 11) * sc)}px 'PF Digits', 'Pixelify Sans', monospace`; g.globalAlpha = p.t > .75 ? (1 - p.t) / .25 : 1; g.fillStyle = "#2b1f3b"; g.fillText(p.txt, p.x + 1, yy + 1); g.fillStyle = p.col; g.fillText(p.txt, p.x, yy); g.globalAlpha = 1; }
  if (b.flash > 0) { g.fillStyle = `rgba(255,255,255,${b.flash * .55})`; g.fillRect(-OX, 0, VW, VH); b.flash = Math.max(0, b.flash - .08); }
  drawQte(now); g.translate(-OX, 0);
}
function frame(now) {
  requestAnimationFrame(frame); g.setTransform(2, 0, 0, 2, 0, 0); g.imageSmoothingEnabled = false;
  const dt = clamp((now - t0) / 1000, 0, .05); t0 = now;
  if (busyCard) { if (took("a") || took("b")) busyCard(); }
  else if (folioOpen) { if (took("b") || took("f") || took("a")) closeFolio(); }
  else if (bt && bt.qte) qteStep(dt);
  else { ui.update(dt); if (mode === "world") walk(dt); }
  if (took("m")) toggleSound();
  if (mode === "title") drawTitle(now); else if (mode === "battle" && bt) drawBattle(now); else drawWorld(now);
  if (talk && talk.show) { const p = talk.img, e = 1 - Math.pow(1 - talk.k, 3), cx = Math.round(VW * .36), sc = .6 + .4 * e;
    g.globalAlpha = e; g.fillStyle = "rgba(43,31,59,.35)"; g.fillRect(0, 0, VW, VH); g.fillStyle = "#fff8ec"; g.beginPath(); g.arc(cx, 72, 46 * e, 0, 7); g.fill(); g.globalAlpha = 1;
    const w = iw(p) * sc, h = ih(p) * sc; g.drawImage(p, Math.round(cx - w / 2), Math.round(72 - h / 2 + Math.sin(now / 400) * 2), w, h); }
  else if (talk && talk.img && mode !== "battle") { const p = talk.img, e = 1 - Math.pow(1 - talk.k, 3); g.drawImage(p, Math.round(VW - 14 - iw(p) + (1 - e) * 140), 126 - ih(p), iw(p), ih(p)); }
  if (fade > 0) { g.fillStyle = `rgba(255,248,236,${fade})`; g.fillRect(0, 0, VW, VH); }
  if (wipe > 0) { g.fillStyle = "#2b1f3b"; for (let k = -6; k < 14; k++) { const w = 26 * wipe; g.beginPath(); g.moveTo(k * 26, 0); g.lineTo(k * 26 + w, 0); g.lineTo(k * 26 + w - 90, VH); g.lineTo(k * 26 - 90, VH); g.fill(); } }
  for (const k in tap) tap[k] = false;   // a press counts for the frame it lands in and no longer
}

// ---------- the front door ----------
function fit() {
  // fill the window: the world gets wider to match the screen, fights and the title stay centred in the middle 320
  const tall = touch && innerHeight > innerWidth, pad = tall ? 200 : 0;
  VW = tall ? 320 : clamp(Math.round(VH * innerWidth / innerHeight), 288, 428); OX = Math.round((VW - 320) / 2);
  if (cv.width !== VW * 2) { cv.width = VW * 2; cv.height = VH * 2; g.imageSmoothingEnabled = false; }
  const k = Math.min(innerWidth / VW, (innerHeight - pad) / VH), s = tall && k >= 2 ? Math.floor(k) : k;
  const f = $("frame"); f.style.width = `${VW * s}px`; f.style.height = `${VH * s}px`; f.style.setProperty("--u", `${s}px`); f.style.setProperty("--ox", `${Math.max(0, OX) * s}px`);
  document.body.classList.toggle("tall", pad > 0);
}
addEventListener("resize", fit); fit();
async function start(fresh) {
  au.unlock(); au.sfx("ok");
  if (fresh) { Object.assign(S, { starter: null, lvl: 3, hp: null, php: {}, won: [], flags: {}, reels: [], spent: 0, bike: false, beat: [], look: "boy", cash: 0, bag: {}, plv: {}, stg: {}, cases: {}, econ: 1, paid: today() }); save(); }
  // flight cases you smashed today stay smashed
  maps.world.objs.forEach((o) => { if (o.k === "kitcase" && (S.cases || {})[o.n] === thisWeek()) { o.gone = true; maps.world.solid[maps.world.I(o.x, o.y)] = 0; } });
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
  // come back on a new day and your day rate has landed
  else if (S.paid !== today()) { S.paid = today(); S.cash = (S.cash || 0) + 500; save(); await sleep(400); au.sfx("win"); await script(async () => { await ui.say(["Ping! Your day rate just landed.", `+£500. You've got ${money(S.cash)}.`]); }); }
}
const had = load();
// ---------- the title screen: a shooting star, the logo drops in, PRESS START ----------
const T = { stage: "intro", t0: performance.now(), sel: 0, stars: Array.from({ length: 40 }, () => ({ x: Math.random() * VW, y: Math.random() * 70, p: Math.random() * 7 })), trail: [] };
const tEl = $("title"), tItems = () => [...$("tmenu").querySelectorAll("button:not([hidden]), a")];
$("bcont").hidden = !had;
if (had) $("tinfo").innerHTML = `<i>${S.look === "girl" ? "GIRL" : "BOY"}</i><i>FOLIO ${S.won.length}/${PROJECTS.length}</i><i>REELS ${(S.reels || []).length}/8</i><i>BADGES ${S.flags.badge ? 1 : 0}</i>`;
function toTitle() { if (T.stage !== "intro") return; T.stage = "title"; T.t0 = performance.now(); fade = 1; fadeTo(0, 500); tEl.classList.remove("intro"); au.music("title"); }
function toMenu() { T.stage = "menu"; au.unlock(); au.sfx("level"); fade = .8; fadeTo(0, 300); tEl.classList.add("menu-on"); $("tmenu").hidden = false; T.sel = 0; markT(); }
function markT() { tItems().forEach((b, i) => b.classList.toggle("sel", i === T.sel)); }
function pickT(el) { if (T.stage !== "menu") return; if (el.id === "bcont") start(false); else if (el.id === "bnew") start(true); else location.href = el.href; }
tItems().forEach((b, i) => { b.addEventListener("pointerenter", () => { T.sel = i; markT(); }); b.addEventListener("click", (e) => { e.stopPropagation(); if (b.tagName === "A") return; pickT(b); }); });
tEl.addEventListener("click", () => { au.unlock(); if (T.stage === "intro") toTitle(); else if (T.stage === "title") toMenu(); });
addEventListener("keydown", (e) => {
  if (mode !== "title") return; const k = e.key;
  if (T.stage === "menu" && (k === "ArrowDown" || k === "s" || k === "ArrowUp" || k === "w")) { const n = tItems().length; T.sel = (T.sel + (k === "ArrowDown" || k === "s" ? 1 : n - 1)) % n; au.sfx("blip"); markT(); e.preventDefault(); return; }
  if (k === "Enter" || k === " " || k === "z") { e.preventDefault(); if (T.stage === "intro") toTitle(); else if (T.stage === "title") toMenu(); else pickT(tItems()[T.sel]); }
});
setTimeout(() => tEl.querySelector(".tintro").classList.add("on"), 1500);
setTimeout(toTitle, 3800);
// the scene behind the logo, drawn in big pixels
// a creature as a dark shape with its own line work glowing through it
const SIL = {};
function silOf(k) {
  if (SIL[k]) return SIL[k]; const im = A.mon[k]; if (!im || !im.complete) return null;
  const W = im.naturalWidth, H = im.naturalHeight, src = document.createElement("canvas"); src.width = W; src.height = H; const sx = src.getContext("2d"); sx.drawImage(im, 0, 0); const d = sx.getImageData(0, 0, W, H).data;
  const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; }, body = mk(), line = mk(), bd = body.getContext("2d").createImageData(W, H), ld = line.getContext("2d").createImageData(W, H);
  const L = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return -1; const j = (y * W + x) * 4; return d[j + 3] < 128 ? -1 : (d[j] + d[j + 1] + d[j + 2]) / 3; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const l = L(x, y); if (l < 0) continue; const i = (y * W + x) * 4; bd.data.set([22, 14, 58, 255], i);
    // its own dark line work, plus anywhere the colour jumps (the veins), lights up
    const jump = Math.max(...[[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => { const n = L(x + dx, y + dy); return n < 0 ? 0 : Math.abs(n - l); }));
    const rim = [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => L(x + dx, y + dy) < 0);
    if (rim || (jump > 38 && l > 60)) ld.data.set([150, 110, 255, 255], i); }
  body.getContext("2d").putImageData(bd, 0, 0); line.getContext("2d").putImageData(ld, 0, 0);
  return (SIL[k] = { body, line, w: W / 2, h: H / 2 });
}
function drawTitle(now) {
  const t = (now - T.t0) / 1000;
  if (T.stage === "intro") {
    g.fillStyle = "#0b0a1f"; g.fillRect(0, 0, VW, VH); g.translate(OX, 0);
    // a shooting star crosses the dark and leaves sparkles behind it
    const k = clamp(t / 1.4, 0, 1), x = -20 + k * 360, y = 40 + Math.sin(k * Math.PI) * -18 + k * 50;
    if (k < 1 && Math.random() < .9) T.trail.push({ x, y, t: 0, vx: rnd(-10, 10), vy: rnd(-6, 14) });
    for (let i = T.trail.length - 1; i >= 0; i--) { const p = T.trail[i]; p.t += 1 / 60; p.x += p.vx / 60; p.y += p.vy / 60; if (p.t > 1.2) { T.trail.splice(i, 1); continue; } const a = 1 - p.t / 1.2; g.fillStyle = `rgba(255,${200 + Math.round(a * 55)},${120 + Math.round(a * 120)},${a})`; g.fillRect(Math.round(p.x), Math.round(p.y), p.t < .3 ? 2 : 1, p.t < .3 ? 2 : 1); }
    if (k < 1) { g.fillStyle = "#fff8ec"; g.fillRect(Math.round(x) - 2, Math.round(y) - 1, 5, 3); g.fillRect(Math.round(x) - 1, Math.round(y) - 2, 3, 5); }
    if (t > .1 && !T.dinged) { T.dinged = 1; au.sfx("secret"); }
    return;
  }
  // after the shooting star: a deep night, a slow scale pattern, and the legendaries as glowing silhouettes, like the old box art
  g.translate(OX, 0);
  const L0 = -Math.max(0, OX), R0 = 320 + Math.max(0, OX);
  const sky = g.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, "#120c2e"); sky.addColorStop(.55, "#24185a"); sky.addColorStop(1, "#3b1f63"); g.fillStyle = sky; g.fillRect(L0 - 40, 0, R0 - L0 + 80, VH);
  // the scales: a soft diamond lattice drifting up, brighter near the middle
  { const off = (now / 90) % 12; for (let y = -12; y < VH + 12; y += 6) for (let x = L0 - 12; x < R0 + 12; x += 12) { const xx = x + ((y / 6) % 2 ? 6 : 0), yy = y - off, d = Math.hypot(xx - 160, yy - 95) / 190, a = Math.max(0, .14 - d * .12); if (a <= .01) continue; g.fillStyle = `rgba(150,120,255,${a})`; g.fillRect(Math.round(xx), Math.round(yy), 2, 1); g.fillRect(Math.round(xx) + 1, Math.round(yy) - 1, 1, 3); } }
  T.stars.forEach((st) => { const a = .2 + .8 * Math.max(0, Math.sin(now / 600 + st.p * 3)); g.fillStyle = `rgba(255,248,236,${a * .7})`; g.fillRect(Math.round(st.x), Math.round(st.y), 1, 1); });
  // the white bunny, huge, behind everything: dark body, glowing lines, breathing
  const breathe = Math.sin(now / 1600), pulse = .55 + .45 * Math.sin(now / 900);
  const big = silOf("bunny"); if (big) { const sc = 1.55, w = big.w * sc, h = big.h * sc, x = 168 - w / 2 + Math.sin(now / 2600) * 3, y = 122 - h / 2 + breathe * 3;
    g.globalAlpha = .9; g.drawImage(big.body, Math.round(x), Math.round(y), w, h); g.globalAlpha = .35 + pulse * .55; g.drawImage(big.line, Math.round(x), Math.round(y), w, h); g.globalAlpha = 1;
    // its eye catches the light now and then
    if ((now / 4200) % 1 < .12) { g.fillStyle = `rgba(255,214,240,${Math.sin(((now / 4200) % 1) / .12 * Math.PI)})`; g.fillRect(Math.round(x + w * .66), Math.round(y + h * .33), 2, 2); } }
  // the others pass through the dark far off, one at a time, trailing light
  const pass = [["ai3", 0], ["butterfly", 1], ["kitten", 2]], cyc = 7000, i = Math.floor(now / cyc) % 3, k = (now % cyc) / cyc, sp = silOf(pass[i][0]);
  if (sp && k < .8) { const q = k / .8, sc = .8, w = sp.w * sc, h = sp.h * sc, x = (i === 1 ? R0 + 20 - q * (R0 - L0 + 40) : L0 - 20 + q * (R0 - L0 + 40)), y = [30, 60, 140][i] + Math.sin(q * Math.PI * (i === 1 ? 6 : 2)) * (i === 1 ? 8 : 14) - (i === 2 ? Math.sin(q * Math.PI) * 40 : 0), fade = Math.sin(q * Math.PI);
    g.globalAlpha = fade * .8; g.drawImage(sp.body, Math.round(x - w / 2), Math.round(y - h / 2), w, h); g.globalAlpha = fade * (.5 + pulse * .5); g.drawImage(sp.line, Math.round(x - w / 2), Math.round(y - h / 2), w, h); g.globalAlpha = 1;
    if (Math.random() < .6) T.trail.push({ x: x + rnd(-w / 3, w / 3), y: y + rnd(-h / 4, h / 4), t: 0, vx: rnd(-4, 4), vy: rnd(-2, 6) }); }
  for (let j = T.trail.length - 1; j >= 0; j--) { const p = T.trail[j]; p.t += 1 / 60; p.x += p.vx / 60; p.y += p.vy / 60; if (p.t > 1.4) { T.trail.splice(j, 1); continue; } const a = 1 - p.t / 1.4; g.fillStyle = `rgba(200,180,255,${a * .8})`; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
  // mist along the bottom
  const mist = g.createLinearGradient(0, 130, 0, VH); mist.addColorStop(0, "rgba(59,31,99,0)"); mist.addColorStop(1, "rgba(90,50,140,.75)"); g.fillStyle = mist; g.fillRect(L0 - 40, 130, R0 - L0 + 80, 50);
}
place(maps.world, 35, 39, "down");
requestAnimationFrame(frame);
window.__fv = { S, P, maps, ui, au, A, place, fight, card, folio, script, FOES, EXTRA, get mode() { return mode; }, get busy() { return busy; }, get map() { return map; }, get bt() { return bt; } };
