import { PROJECTS, ABOUT } from "./projects.js";
import MEDIA from "./media.js";
import ASSETS from "./assets.js";
import { Field } from "./field.js";
import { Thermal } from "./thermal.js";
import { Wheel } from "./wheel.js";
import { Melt } from "./melt.js";
import { Sound } from "./sound.js";

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const touch = matchMedia("(hover: none) and (pointer: coarse)").matches;
document.documentElement.classList.toggle("touch", touch);
const url = (slug, f) => ASSETS[`${slug}/${f}`] || `media/${slug}/${f}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmt = (s) => `${Math.floor(s / 60)}:${pad(Math.round(s % 60))}`;
// letters stay grouped by word, so a long title wraps between words and never mid-word
const chars = (t, cls = "ch") => { let k = 0; return t.split(" ").map((w) => `<span class="wd">${[...w].map((c) => `<span class="${cls}" style="--k:${k++}" data-c="${esc(c)}">${esc(c)}</span>`).join("")}</span>`).join(`<span class="sp"> </span>`); };

// ---------- the work: every piece, resolved to its files ----------
PROJECTS.forEach((p, pi) => {
  const lib = MEDIA[p.slug] || {};
  let sec = null;
  p.pieces = [];
  (p.youtube || []).forEach((y) => p.pieces.push({ pi, slug: p.slug, yt: y, w: 16, h: 9, caption: y.title, stat: y.note }));
  p.items.forEach((it) => {
    if (it.head) { sec = it; return; }
    const m = lib[it.file]; if (!m) return;
    const x = { ...m, ...it, pi, slug: p.slug, sec };
    x.thumb = url(p.slug, m.type === "video" ? m.poster : m.sm);
    x.still = url(p.slug, m.type === "video" ? m.poster : m.src);
    if (m.type === "video") { x.loop = url(p.slug, m.loop); x.film = url(p.slug, m.full || m.loop); }
    p.pieces.push(x);
  });
});
// every piece, mixed up so projects weave through each other (the same mix every visit)
const ALL = (() => {
  const a = PROJECTS.flatMap((p) => p.pieces.map((x) => ({ ...x, title: p.title, src: x })));
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
})();

const sound = new Sound();
let entered = false;
// ---------- splash ----------
function enter(fast) {
  if (entered) return; entered = true;
  document.body.classList.add("entered");
  if (fast) $("splash").hidden = true;
  sound.unlock();
  if (!fast) sound.warp();
  setTimeout(() => { $("sf").pause(); $("splash").hidden = true; }, fast ? 0 : 1800);
}
$("splash").addEventListener("click", () => enter());
addEventListener("keydown", (e) => { if (!entered && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); enter(); } });
addEventListener("pointerdown", () => { if (entered) sound.unlock(); }, { passive: true });
if (document.body.classList.contains("entered")) enter(true);


const melt = new Melt();
let viewOpen = false;

// ---------- the home: a lattice of work on a thermal field, with the index on a curve ----------
const label = $("label");
const thermal = new Thermal($("heat"), { reduce, lite: touch });
const HUES = [0, .35, -.35, .6, -.6, .9, -.2, .45];
let fam = null;
const wheel = new Wheel($("wheel"), PROJECTS, {
  reduce,
  onFocus: (i) => { if (i == null) { field.focus(null); if (field.hot < 0) setFam(null); return; } if (touch) field.setHot(-1); field.focus(i); setFam(i); sound.blip(i); },
  onPick: (i) => { sound.unlock(); location.hash = PROJECTS[i].slug; },
});
wheel.bindClick();
const field = new Field($("field"), ALL, {
  reduce, touch, band: (y) => wheel.band(y),
  onEmpty: () => { field.focus(null); wheel.set(null); setFam(null); },
  onHover: (it, n) => {
    if (!it) { label.classList.remove("in"); wheel.set(null); if (wheel.over < 0) setFam(null); return; }
    const p = PROJECTS[it.pi];
    label.innerHTML = `<span class="mono">${pad(it.pi + 1)} / ${esc(p.title.toUpperCase())} :: ${esc(p.client.toUpperCase())}</span>${it.caption ? `<b>${esc(it.caption)}</b>` : ""}${it.stat ? `<em class="mono">${esc(it.stat.toUpperCase())}</em>` : ""}`;
    label.classList.add("in");
    sound.rod(sound.note(n.bx / field.W, 1 - n.by / field.H), .014, 4);
    wheel.set(it.pi); setFam(it.pi);
  },
  onOpen: (it, b) => { sound.unlock(); if (it.yt) { window.open(`https://youtu.be/${it.yt.id}`, "_blank", "noopener"); return; } openFromHome(it, b); },
  onMove: (() => { let lx = 0, ly = 0, lt = 0; return (x, y) => { const t = performance.now(), sp = Math.min(1, Math.hypot(x - lx, y - ly) / Math.max(16, t - lt) * 60); lx = x; ly = y; lt = t; sound.touch(x, 1 - y, sp); }; })(),
  onPad: (x, y, e) => sound.pad(x, y, e),
  onPadEnd: () => sound.padEnd(),
  onLeave: () => { sound.release(); if (wheel.over < 0) setFam(null); },
});
let palBase = 0;
function setFam(i) {
  fam = i; palBase = i == null ? 0 : HUES[i % HUES.length];
  $("readout").innerHTML = i == null ? `INDEX` : `${pad(i + 1)} :: ${esc(PROJECTS[i].title.toUpperCase())}`;
}
setFam(null);
// the heat follows your hand, gathers on the piece you're over and glows under the rest of its project
const hand = { x: -999, y: -999, on: false }, trail = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
addEventListener("pointermove", (e) => { hand.x = e.clientX; hand.y = e.clientY; hand.on = true; });
document.addEventListener("pointerleave", () => (hand.on = false));
let fr = null; addEventListener("resize", () => (fr = null));
let trip = 0, tripT = performance.now();
document.fonts?.ready?.then(() => { wheel.maxW = 0; field.layout(); });
setTimeout(() => { wheel.maxW = 0; field.layout(); }, 1200);
(function heat() {
  { const now = performance.now(), dt = Math.min(.1, (now - tripT) / 1000); tripT = now;
    trip = viewOpen || !document.getElementById("lb").hidden ? Math.max(0, trip - dt * .5) : Math.min(touch ? .45 : 1, trip + dt / 40);
    field.trip = reduce ? 0 : trip;
    thermal.palT = palBase + (reduce ? 0 : Math.sin(now / 9000) * trip * 1.1);
    thermal.boost = trip; document.documentElement.style.setProperty("--trip", trip.toFixed(3)); }
  const S = [], r = fr || (fr = field.el.getBoundingClientRect());
  trail[0].x += (hand.x - trail[0].x) * .08; trail[0].y += (hand.y - trail[0].y) * .08;
  trail[1].x += (trail[0].x - trail[1].x) * .05; trail[1].y += (trail[0].y - trail[1].y) * .05;
  if (viewOpen) {
    const S2 = [];
    if (hand.on) S2.push({ x: hand.x, y: hand.y, r: 110, a: .3 }, { x: trail[0].x, y: trail[0].y, r: 200, a: .2 });
    const t = vin.querySelector(".tile:hover .tm") || vin.querySelector(".tile.sel .tm");
    if (t) { const q = t.getBoundingClientRect(); S2.push({ x: q.left + q.width / 2, y: q.top + q.height / 2, r: Math.max(q.width, q.height) * .7, a: .6 }); }
    thermal.set(S2); requestAnimationFrame(heat); return;
  }
  if (hand.on) { S.push({ x: hand.x, y: hand.y, r: 120, a: .42 }, { x: trail[0].x, y: trail[0].y, r: 190, a: .28 }, { x: trail[1].x, y: trail[1].y, r: 260, a: .18 }); }
  const hot = field.nodes[field.hot];
  if (hot) S.push({ x: r.left + hot.x, y: r.top + hot.y, r: Math.max(hot.w, hot.h) * .7, a: .75 });
  if (fam != null) field.famNodes(fam).slice(0, 10).forEach((n) => S.push({ x: r.left + n.x, y: r.top + n.y, r: 80, a: .3 }));
  thermal.set(S);
  const n = field.nodes[field.hot];
  if (n) { const lw = label.offsetWidth || 330, lh = label.offsetHeight || 60; label.style.transform = `translate(${Math.min(innerWidth - lw - 12, Math.max(12, n.x - n.w / 2 + r.left))}px,${Math.min(innerHeight - lh - 12, n.y + n.h / 2 + r.top + 12)}px)`; }
  requestAnimationFrame(heat);
})();

// ---------- the player: a piece melts out of wherever it was into a big, calm frame ----------
const lb = $("lb"), lbm = $("lbm");
let deck = null, lbk = -1, lbv = null;
function fitRect(it) {
  const barH = 92, W = innerWidth * .94, H = innerHeight - barH - 56, a = it.w / it.h;
  const w = Math.min(W, H * a), h = w / a;
  return { x: (innerWidth - w) / 2, y: 28 + (H - h) / 2, w, h };
}
const R = (r) => ({ x: r.left, y: r.top, w: r.width, h: r.height });
const place = (r) => Object.assign(lbm.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
function lbFill(k) {
  const it = deck.list[k];
  lbk = k;
  if (lbv) { lbv.pause(); lbv.removeAttribute("src"); lbv.load(); lbv = null; }
  place(fitRect(it));
  lbm.innerHTML = `<img src="${it.still}" alt="">`;
  lbm.classList.remove("live");
  if (it.film) {
    const v = document.createElement("video");
    v.playsInline = true; v.src = it.film; v.loop = it.film === it.loop; v.muted = sound.films === false;
    v.addEventListener("playing", () => lbm.classList.add("live"), { once: true });
    v.ontimeupdate = () => { if (v.duration) $("lbp").style.transform = `scaleX(${v.currentTime / v.duration})`; };
    v.onended = () => lbStep(1);
    lbm.appendChild(v); lbv = v;
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    sound.duck(true);
  } else sound.duck(false);
  lb.classList.toggle("isvid", !!it.film);
  lb.classList.toggle("fromhome", !!deck.home);
  $("lbp").style.transform = "scaleX(0)";
  $("lbn").innerHTML = deck.home ? `${esc(PROJECTS[it.pi].title)}` : `${pad(k + 1)} <em>/ ${pad(deck.list.length)}</em>`;
  $("lbc").innerHTML = [it.sec ? `<b>${esc(it.sec.head)}</b>` : "", it.caption ? `<span>${esc(it.caption)}</span>` : "", it.stat ? `<em class="mono">${esc(it.stat)}</em>` : ""].join("");
  $("lbgo").textContent = `See ${PROJECTS[it.pi].title} →`;
  syncSnd();
}
const grab = (el) => { const v = el.querySelector("video"); return { from: R(el.getBoundingClientRect()), src: v && v.readyState >= 2 && !v.paused ? v : el.querySelector("img") }; };
async function lbOpen(list, k, fromEl, { home = false, blob = 0, from: from0, src: src0 } = {}) {
  const it = list[k]; if (!it || it.yt) return;
  deck = { list, home };
  const g0 = from0 ? { from: from0, src: src0 } : grab(fromEl), from = g0.from, src = g0.src, to = fitRect(it);
  lb.hidden = false; lb.classList.remove("shown"); lb.getBoundingClientRect(); lb.classList.add("open");
  fromEl?.classList.add("lifted");
  await melt.run({ el: src, from, to, blobFrom: blob, blobTo: 0, dur: reduce ? 1 : 760 });
  fromEl?.classList.remove("lifted");
  lbFill(k);
  lb.classList.add("shown");
  sound.pop();
}
// from the sky: the piece flows out of its star into its own place on the project page,
// already picked and playing as if your hand were resting on it. Click again there to open it big.
function openFromHome(it, b) {
  const { from, src } = grab(b);
  field.setHot(-1);
  location.hash = PROJECTS[it.pi].slug;
  requestAnimationFrame(() => requestAnimationFrame(async () => {
    if (!page) return;
    const k = page.pieces.indexOf(it.src), tile = page.tiles[k]; if (!tile) return;
    view.scrollTop = Math.max(0, tile.offsetTop - (innerHeight - tile.offsetHeight) / 2);
    const tm = tile.querySelector(".tm");
    tile.classList.add("lifted"); vin.querySelector(".work")?.classList.add("picking");
    await melt.run({ el: src, from, to: R(tm.getBoundingClientRect()), blobFrom: 1, blobTo: 0, dur: reduce ? 1 : 900 });
    tile.classList.remove("lifted");
    pick(tile);
  }));
}
function pick(tile) {
  vin.querySelectorAll(".tile.sel").forEach((t) => t.classList.remove("sel"));
  tile.classList.add("sel"); vin.querySelector(".work")?.classList.add("picking");
  const v = tile.querySelector("video");
  if (v) { if (!v.src) v.src = v.dataset.loop; v.play().then(() => tile.classList.add("live")).catch(() => {}); }
  // the pick lets go as soon as you start looking around
  const off = () => { vin.querySelector(".work")?.classList.remove("picking"); tile.classList.remove("sel"); view.removeEventListener("wheel", off); vin.removeEventListener("pointerover", over); };
  const over = (e) => { const t = e.target.closest?.(".tile"); if (t && t !== tile) off(); };
  view.addEventListener("wheel", off, { passive: true }); vin.addEventListener("pointerover", over);
}
function lbStep(d) {
  if (lbk < 0) return;
  let k = lbk;
  do { k = (k + d + deck.list.length) % deck.list.length; } while (deck.list[k].yt && k !== lbk);
  lbFill(k);
  lbm.animate([{ opacity: 0, filter: "blur(14px)", transform: `translateX(${d * 30}px) scale(.985)` }, { opacity: 1, filter: "blur(0)", transform: "none" }], { duration: reduce ? 0 : 320, easing: "cubic-bezier(.2,.8,.2,1)" });
  if (!viewOpen) sound.blip(k);
}
async function lbClose(instant) {
  if (lbk < 0) return;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  const it = deck.list[lbk], r = R(lbm.getBoundingClientRect()), src = lbv && lbv.readyState >= 2 ? lbv : lbm.querySelector("img");
  const back = !instant && (deck.home ? field.nodes[lbk]?.b : page?.tiles[lbk]?.querySelector(".tm"));
  const to = back && back.getBoundingClientRect();
  lb.classList.remove("open", "shown");
  lbk = -1; sound.duck(false);
  if (to && to.width && !reduce && to.bottom > 0 && to.top < innerHeight) {
    const s = src; lbm.innerHTML = ""; if (lbv) lbv.pause();
    back.classList.add("lifted");
    await melt.run({ el: s, from: r, to: R(to), blobFrom: 0, blobTo: deck.home ? 1 : 0, dur: 560 });
    back.classList.remove("lifted");
  }
  if (lbv) { lbv.pause(); lbv = null; }
  lbm.innerHTML = ""; lb.hidden = true;
}
// from the player straight into the project: the footage floods the room and dissolves into the page
async function lbToProject() {
  const it = deck.list[lbk], r = R(lbm.getBoundingClientRect()), src = lbv && lbv.readyState >= 2 ? lbv : lbm.querySelector("img");
  const big = { x: -innerWidth * .35, y: -innerHeight * .35, w: innerWidth * 1.7, h: innerHeight * 1.7 };
  lb.classList.remove("open", "shown"); lb.hidden = true; lbm.innerHTML = "";
  if (lbv) { lbv.pause(); lbv = null; } lbk = -1; sound.duck(false);
  melt.hold = true;
  const m = melt.run({ el: src, from: r, to: big, blobFrom: 0, blobTo: .7, dur: reduce ? 1 : 900, fadeOut: true });
  location.hash = PROJECTS[it.pi].slug;
  await m; melt.hold = false; melt.clear();
}
function syncSnd() { $("lbs").textContent = lbv && !lbv.muted ? "Sound on" : "Sound off"; }
$("lbx").addEventListener("click", () => lbClose());
$("lbl").addEventListener("click", () => lbStep(-1));
$("lbr").addEventListener("click", () => lbStep(1));
$("lbgo").addEventListener("click", lbToProject);
$("lbs").addEventListener("click", () => { if (!lbv) return; lbv.muted = !lbv.muted; sound.films = !lbv.muted; syncSnd(); });
$("lbf").addEventListener("click", () => { if (document.fullscreenElement) document.exitFullscreen(); else (lbm.requestFullscreen || lbm.webkitRequestFullscreen || (() => {})).call(lbm); });
lbm.addEventListener("click", () => { if (lbv) { lbv.paused ? lbv.play() : lbv.pause(); } else lbStep(1); });
$("lbbg").addEventListener("click", () => lbClose());
$("lbpb").addEventListener("click", (e) => { if (!lbv || !lbv.duration) return; const r = e.currentTarget.getBoundingClientRect(); lbv.currentTime = (e.clientX - r.left) / r.width * lbv.duration; });
addEventListener("resize", () => { if (lbk >= 0) place(fitRect(deck.list[lbk])); });
{ let x0 = null; lb.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
  lb.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1); x0 = null; }); }

// ---------- project pages: everything at once, quiet ----------
const view = $("view"), vin = $("vin");
let page = null;
function renderProject(i) {
  if (lbk >= 0) lbClose(true);
  const p = PROJECTS[i], nx = PROJECTS[(i + 1) % PROJECTS.length], pieces = p.pieces;
  const groups = [];
  pieces.forEach((it) => { const g = groups[groups.length - 1]; if (!g || g.sec !== it.sec) groups.push({ sec: it.sec, items: [it] }); else g.items.push(it); });
  const big = !!p.layout;
  const tile = (it) => {
    const k = pieces.indexOf(it);
    const media = it.yt
      ? `<a class="ytc" href="https://youtu.be/${it.yt.id}" target="_blank" rel="noopener"><span>${esc(it.yt.title)}</span><em class="mono">Watch on YouTube ↗</em></a>`
      : it.loop
        ? `<img src="${it.thumb}" alt="" loading="lazy"><video muted loop playsinline preload="none" data-loop="${it.loop}"></video><i class="play" aria-hidden="true"></i>`
        : `<img src="${big ? it.still : it.thumb}" alt="" loading="lazy">`;
    return `<figure class="tile${it.loop ? " vid" : ""}" data-k="${k}" style="--a:${it.w / it.h}">
      <div class="tm">${media}</div>
      <figcaption class="mono"><span>${pad(k + 1)}</span>${it.caption ? `<b>${esc(it.caption)}</b>` : ""}${it.stat ? `<em data-count="${esc(it.stat)}">${esc(it.stat)}</em>` : ""}${it.loop && it.dur ? `<em>${fmt(it.dur)}</em>` : ""}</figcaption>
    </figure>`;
  };
  const body = groups.map((g) => `
    ${g.sec ? `<div class="gsec"><h2>${esc(g.sec.head)}</h2>${g.sec.text ? `<p>${esc(g.sec.text)}</p>` : ""}</div>` : ""}
    <div class="rows">${g.items.map(tile).join("")}</div>`).join("");
  vin.innerHTML = `<article class="proj">
    <header class="ph">
      <div class="phl"><span class="n mono">${pad(i + 1)} <em>/ ${pad(PROJECTS.length)}</em></span><h1 class="rise">${chars(p.title)}</h1><p class="cli mono">${esc(p.client)}</p></div>
      ${p.blurb ? `<p class="lead">${esc(p.blurb)}</p>` : ""}
    </header>
    <div class="work${big ? " big" : ""}">${body}</div>
    <footer class="pf"><a class="nx" href="#${nx.slug}"><span class="mono">Next</span><span class="nt">${esc(nx.title)} →</span></a></footer>
  </article>`;
  $("vt").textContent = p.title;
  page = { p, pieces, big, tiles: [...vin.querySelectorAll(".tile")], tall: pieces.every((x) => !x.yt && x.w / x.h < .8) };
  wireTiles();
  fitTitle(); document.fonts?.ready?.then(fitTitle);
  requestAnimationFrame(() => requestAnimationFrame(() => vin.querySelectorAll(".rise,.lead").forEach((h) => h.classList.add("in"))));
}
function justify() {
  if (!page) return;
  vin.querySelectorAll(".rows").forEach((row) => {
    const tiles = [...row.children], W = row.clientWidth, gap = 10;
    const A = (t) => +t.style.getPropertyValue("--a"), size = (t, w, h) => { t.style.width = `${w}px`; t.querySelector(".tm").style.height = `${h}px`; };
    const hOf = (ts) => (W - gap * (ts.length - 1) - 2) / ts.reduce((s, t) => s + A(t), 0);
    if (innerWidth < 700) { tiles.forEach((t) => size(t, W, Math.min(W / A(t), innerHeight * .8))); return; }
    if (page.tall) {
      // phone-shaped films: equal columns, the same size every time (rows of three, or all of them if there are four or fewer)
      const n = page.pieces.length <= 4 ? page.pieces.length : 3, w = (W - gap * (n - 1) - 2) / n;
      tiles.forEach((t) => size(t, w, w / A(t)));
      return;
    }
    if (page.big) {
      const maxH = innerHeight * .84;
      for (let k = 0; k < tiles.length;) {
        const line = [tiles[k++]];
        while (k < tiles.length && hOf(line) > maxH && hOf([...line, tiles[k]]) >= maxH * .68) line.push(tiles[k++]);
        const h = Math.min(hOf(line), maxH);
        line.forEach((t) => size(t, A(t) * h, h));
      }
      return;
    }
    const target = Math.max(240, Math.min(520, innerHeight * .46)), maxH = Math.min(target * 1.6, innerHeight * .78);
    let line = [];
    tiles.forEach((t, k) => {
      line.push(t);
      const h = hOf(line);
      if (h <= target || k === tiles.length - 1) { const hh = k === tiles.length - 1 && h > target ? Math.min(h, maxH) : h; line.forEach((x) => size(x, A(x) * hh, hh)); line = []; }
    });
  });
}
addEventListener("resize", justify);
// the title always fits its half of the header with a clear gutter, so the description beside it never gets crowded
function fitTitle() {
  const h = vin.querySelector(".ph h1"); if (!h) return;
  h.style.fontSize = ""; h.style.maxWidth = "";
  const ld = vin.querySelector(".ph .lead"); if (ld) ld.style.marginTop = "";
  if (innerWidth <= 820) return;
  const lead = vin.querySelector(".ph .lead"); if (!lead) return;
  const room = lead.getBoundingClientRect().left - h.getBoundingClientRect().left - Math.max(40, innerWidth * .04);
  const words = [...h.querySelectorAll(".wd")], wide = Math.max(...words.map((w) => w.getBoundingClientRect().width), 1);
  const full = words.reduce((s, w) => s + w.getBoundingClientRect().width, 0) + (words.length - 1) * parseFloat(getComputedStyle(h).fontSize) * .26;
  const fs = parseFloat(getComputedStyle(h).fontSize);
  // keep the whole title on one line if it can stay reasonably big, otherwise let it wrap and just make sure the longest word fits
  const one = fs * room / full;
  const k = h.getBoundingClientRect().width / h.offsetWidth || 1, nf = one >= fs * .72 ? Math.min(fs, one) : Math.min(fs, fs * room / wide);
  h.style.fontSize = nf + "px"; h.style.maxWidth = room / k + "px";
  lead.style.marginTop = nf * .13 - parseFloat(getComputedStyle(lead).fontSize) * .36 + "px";
}
addEventListener("resize", fitTitle);
function wireTiles() {
  page.tiles.forEach((t) => {
    const k = +t.dataset.k, it = page.pieces[k];
    if (it.yt) return;
    const v = t.querySelector("video");
    if (v) {
      t.addEventListener("mouseenter", () => { if (!v.src) v.src = v.dataset.loop; v.play().then(() => t.classList.add("live")).catch(() => {}); });
      t.addEventListener("mouseleave", () => { if (!page.big) { v.pause(); t.classList.remove("live"); } });
    }
    t.addEventListener("click", () => lbOpen(page.pieces, k, t.querySelector(".tm")));
  });
  vin.querySelectorAll("[data-count]").forEach(countUp);
  if (page.big || touch) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const t = e.target, v = t.querySelector("video"); if (!v) return;
      if (e.isIntersecting) { if (!v.src) v.src = v.dataset.loop; v.play().then(() => t.classList.add("live")).catch(() => {}); } else v.pause();
    }), { root: view, threshold: .35 });
    page.tiles.forEach((t) => io.observe(t)); page.io = io;
  }
  justify();
}

function renderAbout() {
  const a = ABOUT;
  vin.innerHTML = `<article class="proj about"><header class="ph"><div class="phl"><h1 class="rise">${chars(a.name)}</h1></div>
    <p class="lead">${esc(a.role)} ${esc(a.line)}</p></header>
    <dl class="acols mono">
      <div><dt>Get in touch</dt><dd><button class="copy" data-copy="${esc(a.email)}">${esc(a.email)}</button></dd>
        ${a.socials.map((s) => `<dd><a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></dd>`).join("")}</div>
      <div><dt>Currently at</dt>${a.now.map((x) => `<dd>${esc(x)}</dd>`).join("")}</div>
      <div><dt>Previously at</dt>${a.before.map((x) => `<dd>${esc(x)}</dd>`).join("")}</div>
    </dl></article>`;
  $("vt").textContent = "About"; page = null;
  vin.querySelectorAll(".copy").forEach((b) => b.addEventListener("click", () => {
    const t = b.dataset.copy, done = () => { b.textContent = "Copied"; setTimeout(() => (b.textContent = t), 1400); };
    const sel = () => { const r = document.createRange(); r.selectNodeContents(b); getSelection().removeAllRanges(); getSelection().addRange(r); };
    try { navigator.clipboard.writeText(t).then(done, sel); } catch (e) { sel(); }
  }));
  requestAnimationFrame(() => requestAnimationFrame(() => vin.querySelectorAll(".rise,.lead").forEach((h) => h.classList.add("in"))));
}
function countUp(el) {
  if (reduce) return;
  const src = el.dataset.count, nums = [...src.matchAll(/\d+(\.\d+)?/g)];
  const t0 = performance.now(), D = 1200;
  const step = (now) => {
    const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
    let out = "", last = 0;
    nums.forEach((m) => { const v = parseFloat(m[0]), dec = m[1] ? m[1].length - 1 : 0; out += src.slice(last, m.index) + (v * e).toFixed(dec); last = m.index + m[0].length; });
    el.textContent = out + src.slice(last);
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- routing ----------
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  const i = PROJECTS.findIndex((p) => p.slug === h);
  if (i >= 0 || h === "about") enter(true);
  if (i >= 0) { renderProject(i); open(); }
  else if (h === "about") { renderAbout(); open(); }
  else close();
}
function open() {
  viewOpen = true; view.classList.add("open"); document.body.classList.add("viewing"); view.setAttribute("aria-hidden", "false");
  view.scrollTop = 0; view.focus({ preventScroll: true });
  requestAnimationFrame(justify);
  sound.quiet(true); field.setActive(false); thermal.palT = HUES[(page?.p ? PROJECTS.indexOf(page.p) : 0) % HUES.length] || 0;
}
function close() {
  if (!viewOpen) return;
  viewOpen = false; view.classList.remove("open"); document.body.classList.remove("viewing"); view.setAttribute("aria-hidden", "true");
  if (lbk >= 0) lbClose(true);
  page?.io?.disconnect(); page = null;
  sound.quiet(false); field.setActive(true);
  setTimeout(() => { if (!viewOpen) vin.innerHTML = ""; }, 600);
}
document.addEventListener("click", (e) => {
  const h = e.target.closest("[data-home]");
  if (h) { e.preventDefault(); history.pushState("", "", location.pathname + location.search); route(); }
});
addEventListener("hashchange", route);
// click the blurred home around a project to pull focus back to it
view.addEventListener("click", (e) => { if (e.target === view || e.target === vin) { history.pushState("", "", location.pathname + location.search); route(); } });
addEventListener("keydown", (e) => {
  if (lbk >= 0) {
    if (e.key === "Escape") { if (!document.fullscreenElement) lbClose(); return; }
    if (e.key === "ArrowRight") lbStep(1);
    if (e.key === "ArrowLeft") lbStep(-1);
    if (e.key === " " && lbv) { e.preventDefault(); lbv.paused ? lbv.play() : lbv.pause(); }
    if (e.key === "f") $("lbf").click();
    return;
  }
  if (viewOpen && e.key === "Escape") { history.pushState("", "", location.pathname + location.search); route(); }
});

$("snd").addEventListener("click", () => $("snd").setAttribute("aria-pressed", sound.toggle()));
$("snd").setAttribute("aria-pressed", "true");
$("mail").textContent = ABOUT.email;
route();
