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
// some laptops run the browser without graphics acceleration (it's a setting, or the GPU is blocklisted); there everything
// is drawn by the processor and the live effects crawl. Spot that and switch to a light version that looks the same at rest.
let lite = (() => { try { const c = document.createElement("canvas"); return !(c.getContext("webgl", { failIfMajorPerformanceCaveat: true }) || c.getContext("experimental-webgl", { failIfMajorPerformanceCaveat: true })); } catch (e) { return true; } })();
document.documentElement.classList.toggle("lite", lite);
document.documentElement.classList.toggle("touch", touch);
const url = (slug, f) => ASSETS[`${slug}/${f}`] || `media/${slug}/${f}`;
// YouTube doesn't make a big thumbnail for every film: fall back to the smaller one (cropped to 16:9 by the tile)
// (YouTube sometimes answers with a tiny grey placeholder instead of an error, so check the size too)
const ytFallback = (e) => { const t = e.target; if (t.tagName === "IMG" && t.src.includes("maxresdefault") && (e.type === "error" || t.naturalWidth <= 120)) t.src = t.src.replace("maxresdefault", "hqdefault"); };
addEventListener("error", ytFallback, true); addEventListener("load", ytFallback, true);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmt = (s) => `${Math.floor(s / 60)}:${pad(Math.round(s % 60))}`;
// letters stay grouped by word, so a long title wraps between words and never mid-word
const chars = (t, cls = "ch") => { let k = 0; return t.split(" ").map((w) => `<span class="wd">${[...w].map((c) => `<span class="${cls}" style="--k:${k++}" data-c="${esc(c)}">${esc(c)}</span>`).join("")}</span>`).join(`<span class="sp"> </span>`); };

// ---------- the work: every piece, resolved to its files ----------
PROJECTS.forEach((p, pi) => {
  const lib = MEDIA[p.slug] || {};
  let sec = null;
  p.pieces = [];
  (p.youtube || []).forEach((y) => { const th = y.thumb ? url(p.slug, y.thumb) : `https://i.ytimg.com/vi/${y.id}/maxresdefault.jpg`; p.pieces.push({ pi, slug: p.slug, yt: y, w: 16, h: 9, caption: y.title, stat: y.note, thumb: th, still: th }); });
  p.items.forEach((it) => {
    if (it.head) { sec = it; return; }
    const m = lib[it.file]; if (!m) return;
    const x = { ...m, ...it, pi, slug: p.slug, sec };
    x.thumb = url(p.slug, m.type === "video" ? m.poster : m.sm);
    x.node = m.node ? url(p.slug, m.node) : x.thumb;
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

window.__sf = true; // the site's own door is here now; the inline fallback in the page stands down
const sound = new Sound();
let entered = false;
// ---------- splash ----------
function warmLoops() {
  const urls = [...new Set(ALL.filter((x) => x.loop).map((x) => x.loop))];
  let i = 0; const next = () => { if (i >= urls.length) return; fetch(urls[i++], { priority: "low" }).catch(() => {}).finally(() => setTimeout(next, 120)); };
  setTimeout(next, 1500);
}
function enter(fast) {
  if (entered) return; entered = true; warmLoops();
  document.body.classList.add("entered");
  if (fast) $("splash").hidden = true;
  sound.unlock();
  if (!fast) sound.warp();
  setTimeout(() => { $("sf").pause(); $("splash").hidden = true; }, fast ? 0 : 1800);
}
// clicking the logo winds it up: it spins faster and faster while the home finishes loading, then lets go
let winding = false;
function windUp() {
  if (entered || winding) return; winding = true; sound.unlock();
  const v = $("sf"), sp = $("splash"), t0 = performance.now();
  sp.classList.add("winding"); v.play?.().catch(() => {});
  const imgs = () => [...document.querySelectorAll(".node img")];
  const ready = () => imgs().every((i) => i.complete) && (!document.fonts || document.fonts.status === "loaded");
  (function spin(now) {
    const k = Math.min(1, (now - t0) / 2400), rate = 1 + k * k * 5;
    try { v.playbackRate = Math.min(6, rate); } catch (e) {}
    sp.style.setProperty("--wind", k.toFixed(3));
    const el = now - t0;
    if ((el > 900 && ready()) || el > 6000) { try { v.playbackRate = 6; } catch (e) {} enter(); return; }
    requestAnimationFrame(spin);
  })(t0);
}
$("splash").addEventListener("click", windUp);
addEventListener("keydown", (e) => { if (!entered && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); windUp(); } });
addEventListener("pointerdown", () => sound.unlock(), { passive: true });
addEventListener("keydown", () => sound.unlock());
if (document.body.classList.contains("entered")) enter(true);


const melt = new Melt({ off: lite });
let viewOpen = false;

// ---------- the home: a lattice of work on a thermal field, with the index on a curve ----------
const label = $("label");
let thermal = lite ? { set() {}, setActive() {}, gl: null } : new Thermal($("heat"), { reduce, lite: touch });
const HUES = [0, .35, -.35, .6, -.6, .9, -.2, .45];
let fam = null;
const wheel = new Wheel($("wheel"), PROJECTS, {
  reduce,
  onFocus: (i) => { if (i == null) { field.focus(null); if (field.hot < 0) setFam(null); return; } if (touch) field.setHot(-1); field.focus(i); setFam(i); sound.blip(i); },
  onPick: (i) => { sound.unlock(); location.hash = PROJECTS[i].slug; },
});
wheel.bindClick();
const field = new Field($("field"), ALL, {
  reduce, touch, lite, band: (y) => wheel.band(y),
  onEmpty: () => { field.focus(null); wheel.set(null); setFam(null); },
  onHover: (it, n) => {
    if (!it) { label.classList.remove("in"); wheel.set(null); if (wheel.over < 0) setFam(null); return; }
    const p = PROJECTS[it.pi];
    label.innerHTML = `<span class="mono">${pad(it.pi + 1)} / ${esc(p.title.toUpperCase())} :: ${esc(p.client.toUpperCase())}</span>${it.caption ? `<b>${esc(it.caption)}</b>` : ""}${it.stat ? `<em class="mono">${esc(it.stat.toUpperCase())}</em>` : ""}`;
    label.classList.add("in"); label.sz = [label.offsetWidth || 330, label.offsetHeight || 60];
    sound.bloom(n.bx / field.W, 1 - n.by / field.H);
    wheel.set(it.pi); setFam(it.pi);
  },
  onOpen: (it, b) => { sound.unlock(); openFromHome(it, b); },
  onMove: (() => { let lx = 0, ly = 0, lt = 0; return (x, y) => { const t = performance.now(), sp = Math.min(1, Math.hypot(x - lx, y - ly) / Math.max(16, t - lt) * 60); lx = x; ly = y; lt = t; sound.touch(x, 1 - y, sp); }; })(),
  onPad: (x, y, e) => sound.pad(x, y, e),
  onPadEnd: () => sound.padEnd(),
  onLeave: () => { sound.release(); if (wheel.over < 0) setFam(null); },
});
field.setActive(innerWidth > 700);
addEventListener("resize", () => { if (!viewOpen && !document.hidden) field.setActive(innerWidth > 700); });
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
// watch how the machine is actually coping on the home. If frames keep running long, drop into the light version
// on the spot (same look at rest, a fraction of the work), whatever the reason the laptop is struggling.
let pf = { t: 0, n: 0, sum: 0, bad: 0 };
function goLite() {
  if (lite) return; lite = true;
  document.documentElement.classList.add("lite");
  thermal.setActive(false); thermal = { set() {}, setActive() {}, gl: null };
  melt.gl = null; field.lite = true;
}
(function heat() {
  { const now = performance.now();
    if (entered && !viewOpen && !lite && !document.hidden && pf.t) { const dt = now - pf.t; if (dt < 250) { pf.sum += dt; pf.n++; } if (pf.n >= 90) { if (pf.sum / pf.n > 26) pf.bad++; else pf.bad = Math.max(0, pf.bad - 1); pf.n = pf.sum = 0; if (pf.bad >= 2) goLite(); } }
    pf.t = now; }
  { const now = performance.now(), dt = Math.min(.1, (now - tripT) / 1000); tripT = now;
    trip = viewOpen || !document.getElementById("lb").hidden ? Math.max(0, trip - dt * .5) : Math.min(touch ? .4 : .6, trip + dt / 60);
    field.trip = reduce ? 0 : trip;
    thermal.palT = palBase + (reduce ? 0 : Math.sin(now / 9000) * trip * 1.1);
    thermal.boost = trip; }
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
  if (n) { const [lw, lh] = label.sz || [330, 60]; label.style.transform = `translate(${Math.min(innerWidth - lw - 12, Math.max(12, n.x - n.w / 2 + r.left))}px,${Math.min(innerHeight - lh - 12, n.y + n.h / 2 + r.top + 12)}px)`; }
  requestAnimationFrame(heat);
})();

// ---------- the player: a piece melts out of wherever it was into a big, calm frame ----------
const lb = $("lb"), lbm = $("lbm");
let deck = null, lbk = -1, lbv = null;
function fitRect(it) {
  const barH = innerWidth <= 700 ? 140 : 92, W = innerWidth * .94, H = innerHeight - barH - 56, a = it.w / it.h;
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
  lb.classList.toggle("isyt", !!it.yt);
  if (it.yt) {
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${it.yt.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&color=white`;
    f.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture"; f.allowFullscreen = true; f.title = it.caption || "";
    f.addEventListener("load", () => lbm.classList.add("live"), { once: true });
    lbm.appendChild(f); sound.duck(true);
  } else if (it.film) {
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
  const it = list[k]; if (!it) return;
  deck = { list, home };
  if (it.yt) { lb.hidden = false; lb.classList.remove("shown"); lb.getBoundingClientRect(); lb.classList.add("open"); lbFill(k); lb.classList.add("shown"); return; }
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
// from the sky, in one move: the piece you clicked swells and dissolves into the project, which opens at the top
function openFromHome(it, b) {
  const { from, src } = grab(b);
  field.setHot(-1);
  location.hash = PROJECTS[it.pi].slug;
  view.scrollTop = 0;
  if (it.yt || reduce || !src) return;
  const w = Math.min(innerWidth * .7, 900), h = w / (it.w / it.h || 1), to = { x: (innerWidth - w) / 2, y: Math.max(40, (innerHeight - h) / 2), w, h };
  melt.run({ el: src, from, to, blobFrom: 1, blobTo: .6, dur: 750, fadeOut: true });
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
  k = (k + d + deck.list.length) % deck.list.length;
  lbFill(k);
  lbm.animate([{ opacity: 0, filter: "blur(14px)", transform: `translateX(${d * 30}px) scale(.985)` }, { opacity: 1, filter: "blur(0)", transform: "none" }], { duration: reduce ? 0 : 320, easing: "cubic-bezier(.2,.8,.2,1)" });
  if (!viewOpen) sound.blip(k);
}
async function lbClose(instant) {
  if (lbk < 0) return;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  const it = deck.list[lbk], r = R(lbm.getBoundingClientRect()), src = lbv && lbv.readyState >= 2 ? lbv : lbm.querySelector("img");
  const back = !instant && !it.yt && (deck.home ? field.nodes[lbk]?.b : page?.tiles[lbk]?.querySelector(".tm"));
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
  if (it.yt) { lb.classList.remove("open", "shown"); lb.hidden = true; lbm.innerHTML = ""; lbk = -1; sound.duck(false); location.hash = PROJECTS[it.pi].slug; return; }
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
  document.body.classList.remove("isabout");
  if (lbk >= 0) lbClose(true);
  const p = PROJECTS[i], nx = PROJECTS[(i + 1) % PROJECTS.length], pieces = p.pieces;
  const groups = [];
  pieces.forEach((it) => { const g = groups[groups.length - 1]; if (!g || g.sec !== it.sec) groups.push({ sec: it.sec, items: [it] }); else g.items.push(it); });
  const big = !!p.layout;
  const tile = (it) => {
    const k = pieces.indexOf(it);
    const media = it.yt
      ? `<img src="${it.thumb}" alt="" loading="lazy"><i class="play" aria-hidden="true"></i>`
      : it.loop
        ? `<img src="${it.thumb}" alt="" loading="lazy"><video muted loop playsinline preload="none" data-loop="${it.loop}"></video><i class="play" aria-hidden="true"></i>`
        : `<img src="${big ? it.still : it.thumb}" alt="" loading="lazy">`;
    return `<figure class="tile${it.loop || it.yt ? " vid" : ""}" data-k="${k}" style="--a:${it.w / it.h}">
      <div class="tm">${media}</div>
      <figcaption class="mono"><span>${pad(k + 1)}</span>${it.caption ? `<b>${esc(it.caption)}</b>` : ""}${it.stat ? `<em data-count="${esc(it.stat)}">${esc(it.stat)}</em>` : ""}${it.loop && it.dur ? `<em>${fmt(it.dur)}</em>` : ""}</figcaption>
    </figure>`;
  };
  const body = groups.map((g) => `<section class="grp${g.sec ? " has" : ""}">
    ${g.sec ? `<div class="gsec"><h2>${esc(g.sec.head)}</h2>${g.sec.text ? `<p>${esc(g.sec.text)}</p>` : ""}</div>` : ""}
    <div class="rows${g.sec && g.items.length === 1 ? " hero" : ""}">${g.items.map(tile).join("")}</div></section>`).join("");
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
  if (page.tall) vin.querySelector(".work")?.classList.add("tall");
  wireTiles();
  fitTitle(); document.fonts?.ready?.then(fitTitle);
  glassPage();
  requestAnimationFrame(() => requestAnimationFrame(() => vin.querySelectorAll(".rise,.lead").forEach((h) => h.classList.add("in"))));
}
function justify() {
  if (!page) return;
  vin.querySelectorAll(".rows").forEach((row) => {
    const tiles = [...row.children], W = row.clientWidth, gap = 10;
    const A = (t) => +t.style.getPropertyValue("--a"), size = (t, w, h) => { t.style.width = `${w}px`; t.querySelector(".tm").style.height = `${h}px`; };
    const hOf = (ts) => (W - gap * (ts.length - 1) - 2) / ts.reduce((s, t) => s + A(t), 0);
    if (innerWidth < 700) { tiles.forEach((t) => { const h = Math.min(W / A(t), innerHeight * .8); size(t, A(t) * h, h); }); return; }
    if (row.classList.contains("hero")) { const t = tiles[0], h = Math.min(W / A(t), innerHeight * .86); size(t, A(t) * h, h); return; }
    if (page.tall) {
      // phone-shaped films: equal columns, the same size every time (rows of three, or all of them if there are four or fewer)
      const n = tiles.length <= 4 ? tiles.length : 3;
      tiles.forEach((t) => { const w = Math.min((W - gap * (n - 1) - 2) / n, innerHeight * .86 * A(t)); size(t, w, w / A(t)); });
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
// project pages share the About glass: light follows your hand across the sheet, and the header leans towards you
// while you're up top. Once you scroll into the work everything holds still.
function glassPage() {
  const proj = vin.querySelector(".proj"); if (!proj || touch) return;
  const sh = document.createElement("i"); sh.className = "pshine"; sh.setAttribute("aria-hidden", "true"); proj.prepend(sh);
  const ph = proj.querySelector(".ph"), ls = [...ph.querySelectorAll("h1 .ch")].map((c) => ({ c, g: 0 }));
  let mx = -1e4, my = -1e4, tx = 0, ty = 0, cx = 0, cy = 0, fs = 80, lastTf = "";
  const mv = (e) => { mx = e.clientX; my = e.clientY; tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; };
  addEventListener("pointermove", mv);
  (function loop() {
    if (!proj.isConnected) { removeEventListener("pointermove", mv); return; }
    // measure everything first, then move things
    const r = proj.getBoundingClientRect(), hr = ph.getBoundingClientRect(), up = hr.bottom > 40 && !reduce;
    const rs = up ? ls.map((l) => l.c.getBoundingClientRect()) : null;
    sh.style.transform = `translate(${(mx - r.left - 380).toFixed(0)}px,${(my - r.top - 380).toFixed(0)}px)`;
    if (up) {
      fs = parseFloat(getComputedStyle(ls[0].c).fontSize) || fs;
      ls.forEach((l, i) => {
        const q = rs[i], d = Math.hypot(mx - (q.left + q.width / 2), (my - (q.top + q.height / 2)) * 1.4);
        l.g += (Math.exp(-(d * d) / (fs * fs * 1.4)) - l.g) * .14;
        const fv = `"wdth" ${Math.round(100 + l.g * 30)}, "wght" ${Math.round((600 + l.g * 300) / 10) * 10}`;
        if (l.fv !== fv) { l.fv = fv; l.c.style.fontVariationSettings = fv; }
      });
    }
    requestAnimationFrame(loop);
  })();
}
// the title always fits its half of the header with a clear gutter, so the description beside it never gets crowded
function fitTitle() {
  const h = vin.querySelector(".ph h1"); if (!h) return;
  h.querySelectorAll(".lbr").forEach((x) => x.remove());
  h.style.fontSize = ""; h.style.maxWidth = "";
  const ld = vin.querySelector(".ph .lead"); if (ld) ld.style.marginTop = "";
  if (innerWidth <= 820) { lockLines(h); return; }
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
  lockLines(h);
}
// once the title has found its lines, pin them: the letters swelling under your cursor can't push a word onto the next line
// (which moved it out from under you, un-swelled it, and flicked back, over and over)
function lockLines(h) {
  const words = [...h.querySelectorAll(".wd")]; let top = null;
  words.forEach((w) => { const t = w.offsetTop; if (top !== null && t > top + 2) { const br = document.createElement("span"); br.className = "lbr"; w.before(br); } top = t; });
  h.style.maxWidth = "none";
}
addEventListener("resize", fitTitle);
function wireTiles() {
  page.tiles.forEach((t) => {
    const k = +t.dataset.k, it = page.pieces[k];
    const v = t.querySelector("video");
    if (v) {
      t.addEventListener("mouseenter", () => { if (!v.src) v.src = v.dataset.loop; v.play().then(() => t.classList.add("live")).catch(() => {}); });
      t.addEventListener("mouseleave", () => { if (!page.big) { v.pause(); t.classList.remove("live"); } });
    }
    let tx = 0, ty = 0, tt = 0;
    t.addEventListener("pointerdown", (e) => { tx = e.clientX; ty = e.clientY; tt = performance.now(); });
    t.addEventListener("click", (e) => { if (touch && (Math.hypot(e.clientX - tx, e.clientY - ty) > 10 || performance.now() - tt > 600 || view.scrolling)) return; lbOpen(page.pieces, k, t.querySelector(".tm")); });
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

// about: a pane of glowing frosted glass floating over the home, tilting towards your hand, the name swelling under it
function renderAbout() {
  const a = ABOUT;
  const letters = (t) => t.split(" ").map((w) => `<span class="aw">${[...w].map((c) => `<i>${esc(c)}</i>`).join("")}</span>`).join(`<span class="asp"> </span>`);
  vin.innerHTML = `<div class="astage"><article class="acard" id="acard">
      <i class="ashine" aria-hidden="true"></i>
      <p class="akick mono">About</p>
      <h1 class="aname">${letters(a.name)}</h1>
      <p class="alead">${esc(a.role)} ${esc(a.line)}</p>
      <dl class="agrid mono">
        <div><dt>Get in touch</dt><dd><button class="copy" data-copy="${esc(a.email)}">${esc(a.email)}</button></dd>
          ${a.socials.map((x) => `<dd><a href="${x.url}" target="_blank" rel="noopener">${esc(x.label)} ↗</a></dd>`).join("")}</div>
        <div><dt>Currently at</dt>${a.now.map((x) => `<dd>${esc(x)}</dd>`).join("")}</div>
        <div><dt>Previously at</dt>${a.before.map((x) => `<dd>${esc(x)}</dd>`).join("")}</div>
      </dl>
    </article></div>`;
  $("vt").textContent = "About"; page = null;
  document.body.classList.add("isabout");
  vin.querySelectorAll(".copy").forEach((b) => b.addEventListener("click", () => {
    const t = b.dataset.copy, done = () => { b.textContent = "Copied"; setTimeout(() => (b.textContent = t), 1400); };
    const sel = () => { const r = document.createRange(); r.selectNodeContents(b); getSelection().removeAllRanges(); getSelection().addRange(r); };
    try { navigator.clipboard.writeText(t).then(done, sel); } catch (e) { sel(); }
  }));
  const card = $("acard"), ls = [...card.querySelectorAll(".aname i")].map((c) => ({ c, g: 0 }));
  let tx = 0, ty = 0, cx = 0, cy = 0, mx = -1e4, my = -1e4, fs = 60;
  const mv = (e) => { mx = e.clientX; my = e.clientY; tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; };
  addEventListener("pointermove", mv);
  const t0 = performance.now();
  (function loop(now) {
    if (!card.isConnected) { removeEventListener("pointermove", mv); return; }
    const t = (now - t0) / 1000, idle = reduce ? 0 : 1;
    // a slow float when you're still, a lean towards you when you move
    const fx = tx + Math.sin(t * .5) * .04 * idle, fy = ty + Math.cos(t * .43) * .04 * idle;
    cx += (fx - cx) * .08; cy += (fy - cy) * .08;
    if (!reduce) card.style.transform = `rotateX(${(-cy * 14).toFixed(2)}deg) rotateY(${(cx * 18).toFixed(2)}deg) translateZ(0)`;
    card.style.setProperty("--lx", `${(50 + cx * 90).toFixed(1)}%`); card.style.setProperty("--ly", `${(40 + cy * 90).toFixed(1)}%`);
    fs = parseFloat(getComputedStyle(ls[0].c).fontSize) || fs;
    const rs = ls.map((l) => l.c.getBoundingClientRect());
    ls.forEach((l, k) => {
      const r = rs[k], d = Math.hypot(mx - (r.left + r.width / 2), (my - (r.top + r.height / 2)) * 1.4);
      const want = reduce ? 0 : Math.exp(-(d * d) / (fs * fs * 1.6));
      l.g += (want - l.g) * .14;
      const fv = `"wdth" ${Math.round(100 + l.g * 50)}, "wght" ${Math.round((560 + l.g * 340) / 10) * 10}`;
      if (l.fv !== fv) { l.fv = fv; l.c.style.fontVariationSettings = fv; l.c.style.transform = l.g > .02 ? `translateY(${(-l.g * fs * .06).toFixed(1)}px)` : ""; }
    });
    requestAnimationFrame(loop);
  })(t0);
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
// every page is a real step in the browser's history, so back (the button, a two-finger swipe, the phone's edge swipe) walks you back out
let depth = 0;
function goHome() {
  const d = history.state?.d || 0;
  if (d > 0) history.go(-d);
  else { history.replaceState({ d: 0 }, "", location.pathname + location.search); route(); }
}
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (!h) { depth = 0; if (history.state?.d !== 0) history.replaceState({ d: 0 }, ""); }
  else if (history.state?.d == null) { depth += 1; history.replaceState({ d: depth }, ""); }
  else depth = history.state.d;
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
  sound.quiet(true); field.setActive(false); setTimeout(() => { if (viewOpen) thermal.setActive(false); }, 1300); thermal.palT = HUES[(page?.p ? PROJECTS.indexOf(page.p) : 0) % HUES.length] || 0;
}
function close() {
  if (!viewOpen) return;
  viewOpen = false; view.classList.remove("open"); document.body.classList.remove("viewing"); setTimeout(() => { if (!viewOpen) document.body.classList.remove("isabout"); }, 600); view.setAttribute("aria-hidden", "true");
  if (lbk >= 0) lbClose(true);
  page?.io?.disconnect(); page = null;
  sound.quiet(false); field.setActive(innerWidth > 700); thermal.setActive(!document.hidden);
  setTimeout(() => { if (!viewOpen) vin.innerHTML = ""; }, 600);
}
document.addEventListener("click", (e) => {
  const h = e.target.closest("[data-home]");
  if (h) { e.preventDefault(); if (viewOpen) goHome(); }
});
addEventListener("hashchange", route);
document.addEventListener("visibilitychange", () => {
  const on = !document.hidden;
  thermal.setActive(on && !viewOpen); if (!viewOpen) field.setActive(on && innerWidth > 700);
  tripT = performance.now();
});
// remember when the page is moving, so a finger stopping a scroll doesn't open something
{ let st = 0; view.addEventListener("scroll", () => { view.scrolling = true; clearTimeout(st); st = setTimeout(() => (view.scrolling = false), 180); }, { passive: true }); }
// click the blurred home around a project to pull focus back to it
view.addEventListener("click", (e) => { if (e.target === view || e.target === vin || e.target.classList?.contains("astage")) goHome(); });
addEventListener("keydown", (e) => {
  if (lbk >= 0) {
    if (e.key === "Escape") { if (!document.fullscreenElement) lbClose(); return; }
    if (e.key === "ArrowRight") lbStep(1);
    if (e.key === "ArrowLeft") lbStep(-1);
    if (e.key === " " && lbv) { e.preventDefault(); lbv.paused ? lbv.play() : lbv.pause(); }
    if (e.key === "f") $("lbf").click();
    return;
  }
  if (viewOpen && e.key === "Escape") goHome();
});

$("snd").addEventListener("click", () => $("snd").setAttribute("aria-pressed", sound.toggle()));
// night: the whole site flips dark, the heat glowing out of black. Remembered for next time on this browser.
function setNight(on) {
  document.documentElement.classList.toggle("night", on);
  $("nite").setAttribute("aria-pressed", on); $("nite").querySelector("span").textContent = on ? "DAY" : "NIGHT";
  if (thermal.bgc) { thermal.bgc = on ? [0, 0, 0] : [.957, .952, .937]; thermal.night = on ? 1 : 0; }
  melt.paper = on ? [0, 0, 0] : [.953, .945, .925];
  field.inkRGB = on ? "255,255,255" : "13,13,14"; field.night = on;
  try { localStorage.setItem("night", on ? "1" : "0"); } catch (e) {}
}
$("nite").addEventListener("click", () => { sound.pluck?.(sound.note(.5, document.documentElement.classList.contains("night") ? .7 : .3), .03); setNight(!document.documentElement.classList.contains("night")); });
try { if (localStorage.getItem("night") === "1") setNight(true); } catch (e) {}
$("snd").setAttribute("aria-pressed", "true");
$("mail").textContent = ABOUT.email;
route();
