// Foster Valley. The same portfolio as the real site, as a small adventure: the projects are out in the long grass,
// and you beat each one to see its work. Walk with the arrows or WASD, talk and confirm with Enter, Space or Z.
import { PROJECTS, ABOUT } from "../projects.js";
import MEDIA from "../media.js";
import { buildArt, C } from "./art.js";
import { buildWorld, buildHouse, STARTERS, FOES, EXTRA, SAY, ZONES, TT, TNAME, eff } from "./data.js";

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
const cv = $("cv"), g = cv.getContext("2d"); g.imageSmoothingEnabled = false;

// ---------- what's remembered between visits ----------
const S = { starter: null, lvl: 3, hp: null, won: [], flags: {} };
const save = () => { try { localStorage.setItem("foster-valley", JSON.stringify(S)); } catch (e) {} };
const load = () => { try { const d = JSON.parse(localStorage.getItem("foster-valley") || "null"); if (d && STARTERS[d.starter]) { Object.assign(S, d); return true; } } catch (e) {} return false; };
const stats = (lvl) => ({ max: 30 + lvl * 6, atk: 10 + lvl, def: 10 + lvl });

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
    else if (k === "baa") { N(420, .12, { type: "sawtooth", vol: .04 }); N(380, .3, { type: "sawtooth", vol: .04, at: t + .12, to: 330 }); }
  },
  // two short tunes of my own: a slow one for walking about, a quick one for a fight
  TUNES: {
    world: { bpm: 96, lead: [76, 0, 79, 0, 81, 79, 76, 0, 74, 0, 76, 79, 74, 0, 72, 0, 76, 0, 79, 0, 84, 81, 79, 0, 81, 0, 79, 76, 74, 0, 72, 0], bass: [48, 0, 55, 0, 45, 0, 52, 0, 41, 0, 48, 0, 43, 0, 50, 0] },
    battle: { bpm: 152, lead: [69, 72, 76, 81, 76, 72, 69, 72, 67, 71, 74, 79, 74, 71, 67, 71, 65, 69, 72, 77, 72, 69, 65, 69, 64, 68, 71, 76, 80, 76, 71, 68], bass: [45, 45, 57, 45, 43, 43, 55, 43, 41, 41, 53, 41, 40, 40, 52, 40] },
  },
  music(name) { if (this.tune === name) return; this.tune = name; this.step = 0; if (this.ctx) this.next = this.ctx.currentTime + .1; },
  pump() {
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
const maps = { world: prep(buildWorld()), house: prep(buildHouse()) };
let map = maps.house, mode = "title", busy = false, t0 = 0, cam = { x: 0, y: 0 }, nightOn = false, zoneNow = "", fade = 0, bt = null;
const P = { x: 3, y: 4, fx: 3, fy: 4, px: 48, py: 64, dir: "down", moving: false, t: 0, steps: 0, grass: 0 };
const objAt = (x, y) => map.objs.find((o) => !o.gone && y === o.y && x >= o.x && x < o.x + o.w && (o.solid || o.act));
const blocked = (x, y) => x < 0 || y < 0 || x >= map.W || y >= map.H || map.solid[map.I(x, y)] || map.objs.some((o) => o.k === "npc" && !o.gone && y === o.y && x >= o.x && x < o.x + o.w);
function place(m, x, y, dir) { map = m; P.x = P.fx = x; P.y = P.fy = y; P.px = x * 16; P.py = y * 16; P.moving = false; if (dir) P.dir = dir; P.grass = 0; }
async function warp(m, x, y, dir) { busy = true; au.sfx("door"); await fadeTo(1, 220); place(m, x, y, dir); zoneNow = ""; await fadeTo(0, 220); busy = false; }
function fadeTo(v, ms) { return new Promise((res) => { const a = fade, s = performance.now(); const step = (n) => { const k = clamp((n - s) / ms, 0, 1); fade = a + (v - a) * k; if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }); }
function night() { nightOn = !nightOn; au.sfx("secret"); toast(nightOn ? "NIGHT MODE" : "DAY MODE"); }

// ---------- walking about ----------
function walk(dt) {
  if (P.moving) {
    P.t += dt / .165;
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
  if (map.id === "house" && map.base[i] === TT.mat) {
    if (!S.starter) { script(async () => { await ui.say(SAY.needPick, { who: "STEFAN" }); place(map, P.x, P.y - 1, "up"); }); return; }
    warp(maps.world, 35, 37, "down"); return;
  }
  if (map.id === "world") {
    if (P.x === 35 && P.y === 36) { warp(maps.house, 6, 7, "up"); return; }
    const z = ZONES.find((q) => P.x >= q.r[0] && P.x <= q.r[2] && P.y >= q.r[1] && P.y <= q.r[3]); const zn = z ? z.n : "";
    if (zn && zn !== zoneNow) toast(zn.toUpperCase(), 1800); zoneNow = zn;
    const tg = map.tg[i];
    if (tg) {
      const slug = PROJECTS[tg - 1].slug; P.grass++;
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
  if (!S.flags.intro) { S.flags.intro = 1; await ui.say(SAY.intro, { who }); return; }
  if (!S.starter) { await ui.say(SAY.noPick, { who }); return; }
  const n = S.won.length;
  if (n >= PROJECTS.length) { await ui.say(SAY.ending, { who }); S.flags.end = 1; save(); await endCard(); return; }
  const next = PROJECTS.find((p) => !S.won.includes(p.slug));
  await ui.say([`${n} of ${PROJECTS.length} found.`, `${next.title} is at ${FOES[next.slug].zone}.`], { who });
}

// ---------- a fight ----------
const BG = { "la-croisiere": ["#bfeaf7", "#ffe9b8", "#ff9dbb"], "ai-commissions": ["#b7f3e4", "#57c9b5", "#b79cff"], "3d-explorations": ["#e0d4ff", "#a58cf0", "#86d2ec"], "ai-experiments": ["#ffc4f1", "#e772cf", "#ffd76a"], "summer-of-sport": ["#c4f0b0", "#ffd76a", "#f2907f"], relax: ["#a5e8cf", "#86d2ec", "#fff4e0"], "coca-cola": ["#ffd9a6", "#e6a25a", "#f0546a"], gumtree: ["#ffd0e3", "#ff86b6", "#a9dcbc"], x: ["#e9e4f0", "#b79cff", "#ffb38a"] };
async function fight(def, slug) {
  const mine = STARTERS[S.starter], st = stats(S.lvl), boss = def.boss || 0, L = (slug ? 2 : boss ? 2 + boss : 1) + S.won.length;
  const me = { ...mine, lvl: S.lvl, max: st.max, hp: clamp(S.hp ?? st.max, 1, st.max), atk: st.atk, def: st.def, am: 1, dm: 1, ox: -200, oy: 0, a: 1, fl: 0 };
  const foe = { ...def, lvl: L, max: Math.round((20 + L * 6) * (boss ? 1.35 : 1)), atk: 6 + L, def: 9 + L, am: 1, dm: 1, ox: 200, oy: 0, a: 1, fl: 0 }; foe.hp = foe.max;
  au.sfx("encounter"); au.music(null);
  for (let k = 0; k < 3; k++) { fade = .9; await sleep(70); fade = 0; await sleep(70); } await fadeTo(1, 260);
  bt = { me, foe, bg: BG[slug] || BG.x, shake: 0, t: 0 }; mode = "battle"; hud(); au.music("battle"); bars(); $("sfoe").hidden = $("sme").hidden = false;
  await fadeTo(0, 200); await tween(420, (k) => { foe.ox = 200 * (1 - k); me.ox = -200 * (1 - k); });
  await ui.line(def.intro || `${def.name} appears!`, {});
  let result = null;
  const tell = (t) => ui.line(t, { auto: 1.15 });
  const hurt = async (who, n, e) => { au.sfx(e > 1 ? "super" : "hit"); bt.shake = e > 1 ? 7 : 4; for (let k = 0; k < 4; k++) { who.a = .15; await sleep(55); who.a = 1; await sleep(55); } const from = who.hp, to = Math.max(0, who.hp - n); await tween(380, (k) => { who.hp = from + (to - from) * k; bars(); }); who.hp = to; bars(); };
  const act = async (att, dfn, mv, isMe) => {
    await tell(`${att.name} uses ${mv.n}!`);
    if (mv.kind === "heal") { const to = Math.min(att.max, att.hp + Math.round(att.max * .45)), from = att.hp; au.sfx("heal"); att.fl = 1; await tween(450, (k) => { att.hp = from + (to - from) * k; att.fl = 1 - k; bars(); }); await tell(`${att.name} got some health back.`); return; }
    if (mv.kind === "buff") { att.am = Math.min(1.75, att.am * 1.3); au.sfx("buff"); await tween(300, (k) => (att.oy = -Math.sin(k * Math.PI) * 8)); await tell(`${att.name}'s attack rose.`); return; }
    if (mv.acc && Math.random() > mv.acc) { au.sfx("miss"); await tell("It missed."); return; }
    const pw = Array.isArray(mv.p) ? rnd(mv.p[0], mv.p[1]) : mv.p, e = isMe ? eff(mv.t, dfn.type) : eff(att.type, dfn.type), crit = Math.random() < .08;
    const n = Math.max(1, Math.round(pw * ((att.atk * att.am) / (dfn.def * dfn.dm)) * (.55 + att.lvl * .09) * e * (crit ? 1.5 : 1) * rnd(.88, 1.08)));
    const dir = isMe ? 1 : -1; await tween(150, (k) => { att.ox = dir * 26 * Math.sin(k * Math.PI); att.oy = -dir * 10 * Math.sin(k * Math.PI); });
    await hurt(dfn, n, e);
    if (crit) await tell("A critical hit!");
    if (e > 1) await tell("It's super effective!");
  };
  while (!result) {
    ui.show(`What will ${me.name} do?`);
    const c = await ui.choose(["FIGHT", "RUN"], { cls: "cmd", cols: 2 });
    if (c === 1) { if (boss) { await ui.line(SAY.cantRun[0]); continue; } result = "run"; break; }
    const mi = await ui.choose(me.moves.map((m) => ({ html: `<b>${esc(m.n)}</b><i>${m.kind ? (m.kind === "heal" ? "HEAL" : m.kind === "buff" ? "BOOST" : "WEAKEN") : m.t}</i>` })), { cls: "moves", cols: 2, cancel: true });
    if (mi < 0) continue;
    await act(me, foe, me.moves[mi], true);
    if (foe.hp <= 0) { result = "win"; break; }
    await act(foe, me, pick(foe.moves), false);
    if (me.hp <= 0) { result = "lose"; break; }
  }
  if (result === "win") {
    au.sfx("faint"); await tween(500, (k) => { foe.oy = k * 40; foe.a = 1 - k; }); await ui.line(`${def.name} is beaten.`);
    au.music(null); au.sfx("win");
    if (slug) {
      S.won.push(slug); S.lvl = Math.min(14, S.lvl + 1); S.hp = stats(S.lvl).max; me.hp = me.max; bars(); save(); hud();
      await ui.line(`${me.name} grew to level ${S.lvl}!`); au.sfx("level");
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
  if (result === "win" && slug) { await card(slug); if (S.won.length === PROJECTS.length) toast("ALL EIGHT FOUND. GO BACK AND SEE STEFAN.", 5000); }
  return result;
}
function tween(ms, fn) { return new Promise((res) => { const s = performance.now(); const step = (n) => { const k = clamp((n - s) / ms, 0, 1); fn(k); if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }); }
function bars() {
  if (!bt) return;
  const set = (el, m, mine) => { const k = clamp(m.hp / m.max, 0, 1); el.innerHTML = `<div class="nm"><b>${esc(m.name)}</b><span>Lv ${m.lvl}</span></div><div class="hp"><i style="width:${(k * 100).toFixed(1)}%;background:${k > .5 ? "#5fc98a" : k > .22 ? "#ffc857" : "#f0546a"}"></i></div>${mine ? `<div class="n">${Math.ceil(m.hp)} / ${m.max}</div>` : `<div class="n ty">${m.type === "NONE" ? "" : m.type}</div>`}`; };
  set($("sfoe"), bt.foe, false); set($("sme"), bt.me, true);
}

// ---------- the folio: what you've beaten, and the work it showed you ----------
const thumbs = (p) => {
  const lib = MEDIA[p.slug] || {}, out = [];
  (p.youtube || []).forEach((y) => out.push(y.thumb ? `media/${p.slug}/${y.thumb}` : `https://i.ytimg.com/vi/${y.id}/hqdefault.jpg`));
  (p.items || []).forEach((it) => { const m = it.file && lib[it.file]; if (m) out.push(`media/${p.slug}/${m.node || m.poster || m.sm}`); });
  return out.slice(0, 6);
};
const monImg = (k) => { const c = document.createElement("canvas"); c.width = c.height = 48; c.getContext("2d").drawImage(A.mon[k], 0, 0); return c.toDataURL(); };
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
let busyCard = null, folioOpen = false;
function folio() {
  if (!S.starter || busy) return; folioOpen = true; au.sfx("ok");
  const el = $("folio"), m = STARTERS[S.starter];
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
      <p class="blurb">You found all eight projects. Thanks for playing.</p>
      <div class="btns col"><a class="go" href="mailto:${esc(ABOUT.email)}">${esc(ABOUT.email)}</a>${(ABOUT.socials || []).map((s) => `<a class="go alt" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join("")}<a class="go alt" href="./">See the proper site →</a><button type="button" id="cclose">Keep wandering</button></div></div>`;
    el.hidden = false; au.sfx("win"); busyCard = () => { el.hidden = true; busyCard = null; res(); };
    $("cclose").addEventListener("click", () => busyCard && busyCard());
  });
}
function hud() { $("bfolio").textContent = `FOLIO ${S.won.length}/${PROJECTS.length}`; $("hud").hidden = mode !== "world"; $("bfolio").hidden = !S.starter; }
$("bfolio").addEventListener("click", () => { if (folioOpen) closeFolio(); else if (mode === "world") folio(); });
$("bsnd").addEventListener("click", () => { au.on = !au.on; $("bsnd").textContent = au.on ? "SOUND ON" : "SOUND OFF"; if (au.on) au.unlock(); });

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
  const spr = (o) => o.k === "npc" ? A.who[o.who][o.dir || "down"][(o.step || 0) % 2] : o.k === "wallart" ? A.obj[o.art] : Array.isArray(A.obj[o.k]) ? A.obj[o.k][o.k === "geyser" ? Math.floor(now / 300 + o.x) % 3 : f2] : A.obj[o.k];
  const put = (o) => {
    if (o.gone) return; if (o.k === "wire") return wire(o, cx, cy, now);
    const s = spr(o); if (!s) return; const bx = (o.x + o.w / 2) * 16 - cx, by = (o.y + 1) * 16 - cy;
    if (bx < -60 || bx > VW + 60 || by < -10 || by > VH + 90) return;
    if (o.k === "wallart") { g.drawImage(s, Math.round(bx - s.width / 2), by - s.height - 6); return; }
    if (o.k === "npc") g.drawImage(A.sh[12], Math.round(bx - 6), by - 4);
    g.drawImage(s, Math.round(bx - s.width / 2), by - s.height - (o.flat ? 4 : o.k === "npc" ? 1 : 0));
    if (o.k === "stand" && S.starter !== o.pick) { const it = A.obj["pick_" + o.pick]; g.drawImage(it, Math.round(bx - it.width / 2), by - 12 - it.height + Math.round(Math.sin(now / 300 + o.x) * 1.2)); }
  };
  map.flat.forEach(put);
  // everything standing up, back to front, with you in among it
  const row = map.tall.filter((o) => !o.gone && o.y >= y0 - 2 && o.y <= y1 + 3).sort((a, b) => a.y - b.y); let drawn = false;
  const me = () => { const s = A.who.you[P.dir][P.moving ? Math.floor(P.t * 2 + P.steps) % 2 : 0], x = Math.round(P.px - cx), y = Math.round(P.py - cy); g.drawImage(A.sh[12], x + 2, y + 12); g.drawImage(s, x - 1, y + 16 - s.height); drawn = true; };
  const py = P.py / 16;
  row.forEach((o) => { if (!drawn && o.y > py) me(); put(o); }); if (!drawn) me();
  // standing in long grass, it comes up over your feet
  [[P.x, P.y], [P.fx, P.fy]].forEach(([x, y]) => { if (x < 0 || y < 0 || x >= map.W || y >= map.H) return; const z = map.tg[map.I(x, y)]; if (z && (P.moving || (x === P.x && y === P.y))) g.drawImage(A.grass[z][(f2 + x + y) % 2], 0, 8, 16, 8, x * 16 - cx, y * 16 - cy + 8, 16, 8); });
  if (nightOn && map.id === "world") { g.globalCompositeOperation = "multiply"; g.fillStyle = "#6c6fc4"; g.fillRect(0, 0, VW, VH); g.globalCompositeOperation = "source-over"; }
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
  g.fillStyle = "rgba(43,31,59,.14)"; g.beginPath(); g.ellipse(238 + sh, 91, 54, 11, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(84 + sh, 144, 60, 12, 0, 0, 7); g.fill();
  const fig = (m, x, y, sc, bob) => {
    const s = A.mon[m.art], w = 48 * sc, h = 48 * sc; g.globalAlpha = m.a;
    g.drawImage(s, Math.round(x - w / 2 + m.ox + sh), Math.round(y - h + m.oy + bob), w, h);
    if (m.fl > 0) { g.globalAlpha = m.fl * .6; g.fillStyle = "#b7f3c8"; g.beginPath(); g.ellipse(x + m.ox, y - h / 2, w * .5, h * .5, 0, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  };
  fig(b.foe, 238, 96, 2, Math.round(Math.sin(now / 420) * 2)); fig(b.me, 84, 150, 2, Math.round(Math.sin(now / 480 + 1) * 2));
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = clamp((now - t0) / 1000, 0, .05); t0 = now;
  if (busyCard) { if (took("a") || took("b")) busyCard(); }
  else if (folioOpen) { if (took("b") || took("f") || took("a")) closeFolio(); }
  else { ui.update(dt); if (mode === "world") walk(dt); }
  if (took("m")) $("bsnd").click();
  if (mode === "battle" && bt) drawBattle(now); else drawWorld(now);
  if (fade > 0) { g.fillStyle = `rgba(255,248,236,${fade})`; g.fillRect(0, 0, VW, VH); }
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
  if (fresh) { Object.assign(S, { starter: null, lvl: 3, hp: null, won: [], flags: {} }); save(); }
  await fadeTo(1, 250); $("title").hidden = true; mode = "world"; hud(); au.music("world");
  if (S.starter) place(maps.world, 35, 37, "down"); else place(maps.house, 3, 4, "right");
  await fadeTo(0, 300);
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
