import { PROJECTS } from "./projects.js";
import MEDIA from "./media.js";
import { Crawler } from "./crawler.js";
import { Sound } from "./sound.js";

// Stefan Foster. Black page, small type, the work full screen.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, "0");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const touch = matchMedia("(hover: none)").matches;
const url = (slug, f) => `media/${slug}/${f}`;
const tc = (t) => { t = Math.max(0, t || 0); const f = Math.floor((t % 1) * 24); return `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(Math.floor(t) % 60)}:${pad(f)}`; };

// ---------- sound for the toys (off until switched on) ----------
const sound = new Sound();
{ let off = true; try { off = localStorage.getItem("snd2") !== "on"; } catch (e) {}
  sound.on = !off; window.__soundOff = off;
  addEventListener("pointerdown", () => sound.unlock(), { once: true }); }

// ---------- the work, resolved to files ----------
const ORDER = ["ai-experiments", "la-croisiere", "les-benjamins", "summer-of-sport", "3d-explorations", "relax", "coca-cola", "gumtree"];
const LIST = [...PROJECTS].sort((a, b) => (ORDER.indexOf(a.slug) + 1 || 99) - (ORDER.indexOf(b.slug) + 1 || 99));
// full-quality loops made for the index background
const HI = ["ai-experiments", "la-croisiere", "summer-of-sport", "relax", "coca-cola", "gumtree"];
const STILL = { "coca-cola": "media/coca-cola/still-1.webp", gumtree: "media/gumtree/hover-1.jpg" };
LIST.forEach((p) => {
  const lib = MEDIA[p.slug] || {}; let sec = null; p.pieces = [];
  (p.youtube || []).forEach((y) => p.pieces.push({ yt: y, w: 16, h: 9, caption: y.title, stat: y.note, still: y.thumb ? url(p.slug, y.thumb) : `https://i.ytimg.com/vi/${y.id}/maxresdefault.jpg` }));
  p.items.forEach((it) => {
    if (it.head) { sec = it; return; }
    if (it.strip) { p.pieces.push({ sec, strip: true, w: it.w, h: it.h, still: url(p.slug, it.strip), smu: url(p.slug, it.sm) }); return; }
    if (it.play) { p.pieces.push({ sec, play: it.play, w: 16, h: 10, caption: it.caption, stat: it.note, still: url(p.slug, it.img), smu: it.sm ? url(p.slug, it.sm) : null }); return; }
    const fs = it.from || p.slug, m = (it.from ? MEDIA[it.from] || {} : lib)[it.file]; if (!m) return;
    const x = { ...m, ...it, sec };
    x.still = url(fs, m.type === "video" ? m.poster : m.src || m.sm);
    x.smu = m.type !== "video" && m.sm ? url(fs, m.sm) : null;
    x.gif = m.type === "video" && !m.audio && !m.full;   // short silent loops play on their own, like gifs
    if (m.type === "video") { x.loop = url(fs, m.loop); x.film = url(fs, m.full || m.loop); }
    p.pieces.push(x);
  });
  if (HI.includes(p.slug)) p.cover = { v: url(p.slug, "cover.mp4"), i: url(p.slug, "cover.webp"), a: 16 / 9 };
  else if (p.slug === "les-benjamins") p.cover = { v: "media/les-benjamins/banner.mp4", i: "media/les-benjamins/banner-poster.jpg", a: 16 / 9 };
  else if (STILL[p.slug]) p.cover = { i: STILL[p.slug], a: 16 / 9 };
  else { const c = p.pieces.find((x) => x.loop) || p.pieces[0]; if (c) p.cover = { v: c.loop, i: c.still, a: c.w / c.h }; }
});

// the three latest films stand on their own; the rest of Ai Work stays together
const AI = LIST.find((p) => p.slug === "ai-experiments");
const SOLO = [["avatar", "Avatar"], ["tough-love", "Tough Love"], ["anywhere", "Anywhere"]].map(([slug, head]) => {
  const pieces = AI.pieces.filter((x) => x.sec?.head === head);
  AI.pieces = AI.pieces.filter((x) => x.sec?.head !== head);
  return { slug, title: head, client: "Personal", kind: "AI film", solo: true, blurb: pieces[0]?.sec?.text || "", items: [], pieces, cover: { v: `media/wheel/${slug}.mp4`, i: pieces[0].still } };
});
AI.cover = { v: "media/wheel/grow.mp4", i: (AI.pieces.find((x) => x.sec?.head === "Grow") || AI.pieces[0]).still };
// the running order of the wheel
const WHEEL = [...SOLO, ...LIST], N = WHEEL.length;
const hrefOf = (p) => p.page || "#" + p.slug;

// pictures fade up once they've arrived, never pop in
document.addEventListener("load", (e) => { if (e.target.tagName === "IMG") e.target.classList.add("in"); }, true);
document.addEventListener("error", (e) => { const i = e.target; if (i.tagName === "IMG" && /maxresdefault/.test(i.src)) i.src = i.src.replace("maxresdefault", "hqdefault"); }, true);
const settle = (root) => $$("img", root).forEach((i) => { if (i.complete && i.naturalWidth) i.classList.add("in"); });

// ---------- the dot ----------
const cur = $("#cur"), curl = $("#curl");
let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
if (!touch) {
  document.documentElement.classList.add("dotc");
  addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  document.addEventListener("pointerover", (e) => { const big = e.target.closest?.("[data-cur]"); cur.classList.toggle("big", !!big); curl.textContent = big ? big.dataset.cur : ""; });
  const loop = () => { cx += (mx - cx) * .72; cy += (my - cy) * .72; cur.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}

// ---------- index: a wheel of thumbnails turning toward you. The one in the middle is lit and playing; a flick moves
// one stop and it always settles dead centre ----------
const home = $("#home"), view = $("#view"), wheel = $("#wheel"), wlab = $("#wlab"), wrail = $("#wrail");
wheel.innerHTML = WHEEL.map((p, i) => `<a class="wi" href="${hrefOf(p)}" data-i="${i}" draggable="false"><img src="${p.cover.i}" alt="${esc(p.title)}" draggable="false">${p.cover.v ? `<video muted loop playsinline preload="none" data-src="${p.cover.v}"></video>` : ""}</a>`).join("");
wrail.innerHTML = WHEEL.map((p, i) => `<button type="button" data-i="${i}" aria-label="${esc(p.title)}"><i></i></button>`).join("");
const wis = $$(".wi", wheel), rails = $$("button", wrail);
const W = { pos: 0, vel: 0, target: 0, cur: -1, tw: 0, th: 0, R: 0, step: 28 * Math.PI / 180, drawn: null };
function wheelSize() {
  W.tw = innerWidth <= 820 ? innerWidth - 40 : Math.min(innerWidth * .5, innerHeight * .56 * 16 / 9); W.th = W.tw * 9 / 16;
  W.R = W.th * 1.07 / (2 * Math.sin(W.step / 2));
  home.style.setProperty("--tw", W.tw.toFixed(1) + "px"); home.style.setProperty("--th", W.th.toFixed(1) + "px"); W.drawn = null;
}
function wheelDraw() {
  if (W.drawn === W.pos) return; W.drawn = W.pos;
  wis.forEach((el, i) => {
    const d = i - W.pos, ad = Math.abs(d);
    if (ad > 3.4) { el.style.visibility = "hidden"; return; }
    const a = d * W.step, y = W.R * Math.sin(a), z = W.R * (Math.cos(a) - 1);
    el.style.visibility = "";
    el.style.transform = `translate3d(-50%, calc(-50% + ${y.toFixed(1)}px), ${z.toFixed(1)}px) rotateX(${(-a * 180 / Math.PI).toFixed(2)}deg)`;
    el.style.opacity = (ad < 1 ? 1 - ad * .7 : Math.max(0, .3 - (ad - 1) * .13)).toFixed(3);
    el.style.zIndex = 100 - Math.round(ad * 10);
  });
}
// the one in the middle plays; its name rolls over beside it like a counter
function wheelCue(c) {
  const dir = c > W.cur; W.cur = c; const p = WHEEL[c];
  wis.forEach((el, i) => { el.classList.toggle("on", i === c); const v = $("video", el); if (!v) return;
    if (i === c) { if (!v.src) { v.src = v.dataset.src; v.addEventListener("playing", () => v.classList.add("ready"), { once: true }); } v.play().catch(() => {}); } else v.pause(); });
  rails.forEach((b, i) => b.classList.toggle("on", i === c));
  const old = [...wlab.children], el = document.createElement("div"); el.className = "wl " + (dir ? "from-b" : "from-t");
  el.innerHTML = `<span class="n">${pad(c + 1)} / ${pad(N)}</span><b>${esc(p.title)}</b><span>${esc(p.client && p.client !== "Personal" ? p.client : p.kind || "")}</span>`;
  wlab.appendChild(el); void el.offsetWidth; el.classList.remove("from-b", "from-t");
  old.forEach((o) => { o.classList.add(dir ? "to-t" : "to-b"); setTimeout(() => o.remove(), 450); });
  sound.tick?.(.5, .015);
}
{ let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!home.hidden) {
      // a spring with a touch of give: quick to follow, soft to land
      W.vel += ((W.target - W.pos) * 190 - W.vel * 23) * dt; W.pos += W.vel * dt;
      if (Math.abs(W.target - W.pos) < .0004 && Math.abs(W.vel) < .002) { W.pos = W.target; W.vel = 0; }
      wheelDraw();
      const c = Math.max(0, Math.min(N - 1, Math.round(W.pos))); if (c !== W.cur) wheelCue(c);
    }
    requestAnimationFrame(tick);
  };
  wheelSize(); requestAnimationFrame(tick); addEventListener("resize", wheelSize); }

// turning it: wheel, trackpad, drag, swipe, arrow keys, or click one above or below to bring it round
let gStart = 0, gT = 0, snapT = 0, drag = null, dragged = 0;
const idle = () => !ctOn && !document.documentElement.matches(".flying,.devouring,.playing");
const lim = (t) => Math.max(-.3, Math.min(N - 1 + .3, Math.max(gStart - 3, Math.min(gStart + 3, t))));
function wheelSnap() {
  let t = Math.round(W.target);
  // even a small flick moves one stop, never back to where it was
  if (t === gStart && Math.abs(W.target - gStart) > .1) t = gStart + Math.sign(W.target - gStart);
  W.target = Math.max(0, Math.min(N - 1, t));
}
const wheelGo = (i) => { gStart = W.target = Math.max(0, Math.min(N - 1, i)); };
home.addEventListener("wheel", (e) => {
  e.preventDefault(); if (!idle()) return;
  const now = performance.now(); if (now - gT > 160) gStart = Math.round(W.target); gT = now;
  const d = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * (e.deltaMode === 1 ? 32 : 1);
  if (Math.abs(d) < 3) return;   // the long tail of a trackpad flick doesn't hold it between stops
  W.target = lim(W.target + d / 420);
  clearTimeout(snapT); snapT = setTimeout(wheelSnap, 110);
}, { passive: false });
wheel.addEventListener("pointerdown", (e) => { if (e.button || !idle()) return; gStart = Math.round(W.target); drag = { id: e.pointerId, y: e.clientY, t0: W.target, moved: 0, ly: e.clientY, lt: performance.now(), v: 0 }; });
addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return; const dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dy));
  if (drag.moved < 6) return; wheel.classList.add("dragging");
  const now = performance.now(); drag.v = (e.clientY - drag.ly) / Math.max(1, now - drag.lt); drag.ly = e.clientY; drag.lt = now;
  W.target = lim(drag.t0 - dy / (W.th * 1.05));
});
const dragEnd = (e) => {
  if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null; wheel.classList.remove("dragging");
  if (d.moved < 6) return; dragged = performance.now();
  W.target = lim(W.target - d.v * 170 / (W.th * 1.05)); wheelSnap();   // a throw carries on a little, then lands
};
addEventListener("pointerup", dragEnd); addEventListener("pointercancel", dragEnd);
wheel.addEventListener("click", (e) => {
  const a = e.target.closest(".wi"); if (!a) return; e.preventDefault();
  if (performance.now() - dragged < 300 || !idle()) return;
  const i = +a.dataset.i; if (i !== Math.round(W.target)) wheelGo(i); else wheelOpen(i);
});
wheel.addEventListener("dragstart", (e) => e.preventDefault());
wrail.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) wheelGo(+b.dataset.i); });
addEventListener("keydown", (e) => {
  if (home.hidden || !idle() || e.metaKey || e.ctrlKey) return;
  const k = e.key, t = Math.round(W.target);
  if (k === "ArrowDown" || k === "ArrowRight" || k === "PageDown") { e.preventDefault(); wheelGo(t + 1); }
  else if (k === "ArrowUp" || k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); wheelGo(t - 1); }
  else if (k === "Home") wheelGo(0); else if (k === "End") wheelGo(N - 1);
  else if (k === "Enter") wheelOpen(t);
});

// opening: the thumbnail itself grows out of the wheel and becomes the page; closing, it settles back into its stop
let zoomEl = null;
const centreRect = () => ({ left: (innerWidth - W.tw) / 2, top: (innerHeight - W.th) / 2, width: W.tw, height: W.th });
const fullRect = () => { const a = 16 / 9, w = Math.max(innerWidth, innerHeight * a), h = w / a; return { left: (innerWidth - w) / 2, top: (innerHeight - h) / 2, width: w, height: h }; };
function zoomMake(p, r, frame) {
  const z = document.createElement("div"); z.className = "zoom";
  if (frame && frame.readyState >= 2) { const c = document.createElement("canvas"); c.width = frame.videoWidth; c.height = frame.videoHeight; try { c.getContext("2d").drawImage(frame, 0, 0); z.appendChild(c); } catch (e) {} }
  if (!z.firstChild) z.innerHTML = `<img src="${p.cover.i}" alt="">`;
  Object.assign(z.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
  document.body.appendChild(z); return z;
}
const zoomTo = (z, r) => new Promise((done) => { void z.offsetWidth; z.classList.add("go"); Object.assign(z.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" }); setTimeout(done, 560); });
const zoomEnd = (z) => { z.classList.add("out"); setTimeout(() => z.remove(), 420); };
function wheelOpen(i) {
  const p = WHEEL[i], el = wis[i]; if (!p || zoomEl) return;
  const z = zoomMake(p, el.getBoundingClientRect(), $("video", el));
  if (p.page) { document.body.classList.add("swap"); zoomTo(z, fullRect()).then(() => (location.href = p.page)); return; }
  zoomEl = z; location.hash = p.slug;
}
// coming back from another page (the browser's back button), make sure nothing is left over the wheel
addEventListener("pageshow", () => { $$(".zoom").forEach((z) => z.remove()); document.body.classList.remove("swap"); zoomEl = null; });

// ---------- project pages ----------
const kindOf = (it) => (it.yt ? "yt" : it.play ? "play" : it.film ? "film" : "img");
const portrait = (it) => it.w / it.h < .9;
const dur = (t) => t ? `${pad(Math.floor(t / 60))}:${pad(Math.round(t) % 60)}` : "";
// these keep their picture layouts: rows of work at their own shapes
const GALLERY = ["summer-of-sport", "3d-explorations", "la-croisiere"];
function screens(p) {
  // tall things that come together sit side by side (phone films, the toys); otherwise one per screen
  const out = []; let run = null;
  p.pieces.forEach((it) => {
    // stills from a film ride along under it as a strip
    if (it.strip) { const last = out[out.length - 1]; if (last) (last.extra ||= []).push(it); return; }
    const together = it.sec?.thumbs || (portrait(it) && (it.sec?.carousel || p.pieces.filter((q) => q.sec === it.sec && portrait(q)).length > 1));
    if (together && run && run.sec === it.sec) { run.items.push(it); return; }
    run = together ? { sec: it.sec, items: [it], row: true, thumbs: !!it.sec?.thumbs, strip: !it.sec?.thumbs && (it.sec?.carousel || false) } : null;
    out.push(run || { sec: it.sec, items: [it] });
  });
  out.forEach((s) => { if (s.row && !s.thumbs && s.items.length > 3) s.strip = true; });
  return out;
}
const tag = (it) => { const k = kindOf(it); return k === "film" || k === "yt" ? `<span class="playtag"><i></i>Play</span>` : k === "play" ? `<span class="playtag open">Open →</span>` : ""; };
const curOf = (it) => ((kindOf(it) === "film" && !it.gif) || kindOf(it) === "yt" ? "Play" : "");
function piece(it, cls = "") {
  return `<figure class="pc ${cls} k-${kindOf(it)}" data-k="${it.k}"${curOf(it) ? ` data-cur="${curOf(it)}"` : ""} style="--a:${(it.w / it.h).toFixed(4)}"><i class="cm" aria-hidden="true"></i><div class="pm">${it.gif ? `<video src="${it.loop}" poster="${it.still}" autoplay muted loop playsinline preload="metadata"></video>` : `<img src="${it.still}" alt="" loading="lazy" decoding="async">`}${it.gif ? "" : tag(it)}</div></figure>`;
}
function slate(p, s, it) {
  // a title and a line under it, nothing else
  const head = s.sec?.head && s.sec.head !== p.title ? s.sec.head : "";
  const title = head || it?.caption || p.title;
  const sub = [s.sec?.text, head ? it?.caption : "", it?.stat].filter(Boolean);
  return `<div class="slate"><div class="sl-l"><span>${esc(title)}</span>${sub.map((x) => `<span class="dim${x.length > 46 ? " prose" : ""}">${esc(x)}</span>`).join("")}</div></div>`;
}
function renderProject(p) {
  p.pieces.forEach((it, k) => (it.k = k));
  const total = p.pieces.length, nx = WHEEL[(WHEEL.indexOf(p) + 1) % N], gal = GALLERY.includes(p.slug);
  const head = `<header class="pj-h"><h1 data-vt>${esc(p.title)}</h1>
    ${p.client && p.client !== "Personal" ? `<div class="f"><span class="dim">Client</span><span>${esc(p.client)}</span></div>` : "<div></div>"}
    <p>${esc(p.blurb || "")}</p></header>`;
  let body;
  if (gal) {
    // the old layout: sections, and rows of pictures at their own shapes, as tall as the screen allows
    const groups = []; p.pieces.forEach((it) => { const g = groups[groups.length - 1]; if (!g || g.sec !== it.sec) groups.push({ sec: it.sec, items: [it] }); else g.items.push(it); });
    body = groups.map((g, k) => `<section class="grp" data-n="${k + 1}">${g.sec ? `<div class="gh"><h2>${esc(g.sec.head)}</h2>${g.sec.text ? `<p class="dim prose">${esc(g.sec.text)}</p>` : ""}</div>` : ""}
      <div class="gm${g.items.every(portrait) ? " tall" : ""}">${g.items.map((it) => piece(it, "tile").replace("</figure>", `<figcaption>${it.caption ? `<span>${esc(it.caption)}</span>` : ""}${it.stat ? `<span class="dim">${esc(it.stat)}</span>` : ""}</figcaption></figure>`)).join("")}</div></section>`).join("");
  } else {
    const SC = screens(p), NS = SC.length;
    // each section opens with a chapter line: its number, a rule, the project and how far through you are
    const ch = (k) => `<div class="ch"><span>${esc(p.title)}</span><i></i><span>${pad(k + 1)} / ${pad(NS)}</span></div>`;
    body = SC.map((s, k) => {
      if (s.row) {
        const A = s.items.reduce((t, it) => t + it.w / it.h, 0);
        // a run of pieces gets its heading on top, so it's clearly the title of what follows
        const head = s.sec?.head && s.sec.head !== p.title ? s.sec.head : p.title;
        return `<section class="scr row${s.thumbs ? " thumbs" : ""}${s.strip ? " strip" : ""}" style="--sa:${A.toFixed(4)};--n:${s.items.length}" data-n="${k + 1}">${ch(k)}
          ${head !== p.title || s.sec?.text ? `<div class="rh">${head !== p.title ? `<b>${esc(head)}</b>` : ""}${s.sec?.text ? `<span class="dim prose">${esc(s.sec.text)}</span>` : ""}</div>` : ""}
          <div class="track">${s.items.map((it) => piece(it, "cell").replace("</figure>", it.caption || it.stat ? `<figcaption><span>${esc(it.caption || "")}</span><span class="dim">${esc(it.stat || "")}</span></figcaption></figure>` : "</figure>")).join("")}</div>
          </section>`;
      }
      const it = s.items[0];
      const strip = s.extra ? `<div class="stills">${s.extra.map((x) => `<figure class="pc still k-img" data-k="${x.k}"><span class="pm"><img src="${x.smu}" alt="" loading="lazy" decoding="async"></span></figure>`).join("")}</div>` : "";
      return `<section class="scr one${portrait(it) ? " tall" : ""}" data-n="${k + 1}">${ch(k)}${piece(it)}${slate(p, s, it, total)}${strip}</section>`;
    }).join("");
  }
  const nxt = `<section class="nx"><a href="${hrefOf(nx)}"><span class="dim">Next</span><b data-vt>${esc(nx.title)}</b><i>→</i></a></section>`;
  view.innerHTML = `<article class="pj${gal ? " gal" : ""}${p.solo ? " solo" : ""}" data-slug="${p.slug}">${head}${body}${nxt}</article>`;
  view.scrollTop = 0; justify(); wire(p); settle(view); where(p);
  document.title = `${p.title} — Stefan Foster`;
}
// gallery rows: pictures at their own shapes, edges flush, never taller than most of the screen
function justify() {
  $$(".gm", view).forEach((row) => {
    const tiles = [...row.children], W = row.clientWidth, gap = parseFloat(getComputedStyle(row).columnGap) || 12;
    const A = (t) => +t.style.getPropertyValue("--a"), hOf = (ts) => (W - gap * (ts.length - 1) - 1) / ts.reduce((a, t) => a + A(t), 0);
    if (innerWidth < 820) { tiles.forEach((t) => (t.style.width = "100%")); return; }
    const maxH = innerHeight * .78;
    // the first picture leads on a row of its own, as big as the page allows
    if (tiles.length > 1 && row === $(".gm", view) && $(".pj", view)?.dataset.slug === "summer-of-sport") { const t0 = tiles[0]; t0.style.width = `${(A(t0) * Math.min(hOf([t0]), innerHeight * .9)).toFixed(1)}px`; }
    for (let k = tiles.length > 1 && row === $(".gm", view) && $(".pj", view)?.dataset.slug === "summer-of-sport" ? 1 : 0; k < tiles.length;) {
      const line = [tiles[k++]];
      while (k < tiles.length && hOf(line) > maxH && hOf([...line, tiles[k]]) >= maxH * .6) line.push(tiles[k++]);
      const h = Math.min(hOf(line), maxH); line.forEach((t) => (t.style.width = `${(A(t) * h).toFixed(1)}px`));
    }
  });
}
addEventListener("resize", () => { if (!view.hidden) justify(); });
const tio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("shown"); tio.unobserve(e.target); } }), { threshold: .12 });
function wire(p) {
  $$(".tile", view).forEach((t) => tio.observe(t));
  $$(".pc", view).forEach((el) => el.addEventListener("click", () => { const it = p.pieces[+el.dataset.k]; if (!it) return; if (it.play) { location.href = it.play; return; } plOpen(p, it.k); }));
  // strips: the page scrolls on down as normal; arrows (or a sideways swipe) move along the strip
  $$(".strip", view).forEach((st) => { const tr = $(".track", st);
    ["prev", "next"].forEach((d) => { const b = document.createElement("button"); b.type = "button"; b.className = "st-" + d; b.textContent = d === "next" ? "→" : "←"; b.setAttribute("aria-label", d);
      b.addEventListener("click", () => tr.scrollBy({ left: (d === "next" ? 1 : -1) * tr.clientWidth * .7, behavior: "smooth" })); st.appendChild(b); });
    const upd = () => { st.classList.toggle("at-start", tr.scrollLeft < 8); st.classList.toggle("at-end", tr.scrollLeft + tr.clientWidth > tr.scrollWidth - 8); };
    tr.addEventListener("scroll", upd, { passive: true }); upd();
    // films running off the edge of the strip sit back, so it's clear there are more
    const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("out", e.intersectionRatio < .97)), { root: tr, threshold: [0, .5, .97, 1] });
    $$(".cell", tr).forEach((c) => io.observe(c)); });
  fitStills(); vtMeasure();
}
// a strip of stills runs exactly as wide as the film above it
function fitStills() { $$(".stills", view).forEach((st) => { const f = $(".pc:not(.still)", st.parentElement); if (f && innerWidth > 820) st.style.width = f.offsetWidth + "px"; else st.style.width = ""; }); }
addEventListener("resize", () => { if (!view.hidden) fitStills(); });

// ---------- the theatre: click a piece and it lifts out of the page, the page dims behind it. In a series, the
// neighbours wait at the sides; arrows, keys or a swipe slide the next one up as the last one steps back ----------
const pl = document.createElement("div"); pl.className = "pl"; pl.hidden = true;
pl.innerHTML = `<div class="pl-bg"></div><div class="pl-rail"></div>
  <div class="pl-top"><div class="pl-t"></div><span class="pl-n"></span><button type="button" class="pl-x">Close</button></div>
  <button type="button" class="pl-pv" aria-label="Previous">←</button><button type="button" class="pl-nx" aria-label="Next">→</button>
  <div class="pl-bot"><button type="button" class="pl-pp">Pause</button><span class="pl-tc"></span><div class="pl-bar"><b></b></div><button type="button" class="pl-snd">Sound on</button><button type="button" class="pl-fs">Full screen</button></div>`;
document.body.appendChild(pl);
const thRail = $(".pl-rail", pl); let plP = null, thS = [], thI = 0, plV = null, thIdle = 0, thEls = [], thOrigin = null;
// the series: the other pieces in the same section (or the same run of phone films)
const seriesOf = (p, it) => p.pieces.filter((x) => !x.play && x.sec === it.sec);
// where each piece sits: the current one as big as the screen allows, its neighbours smaller at the sides
function thBox(it) { const W = innerWidth, H = innerHeight, a = it.w / it.h, mw = W * (thS.length > 1 ? .8 : .95), mh = H - 150; let w = mw, h = w / a; if (h > mh) { h = mh; w = h * a; } return { w, h }; }
function thPlace(animate = true) {
  const W = innerWidth, H = innerHeight, b0 = thBox(thS[thI]);
  thEls.forEach((el, i) => {
    const d = i - thI, b = thBox(thS[i]), sc = d === 0 ? 1 : .72;
    let x = W / 2; if (d) x = W / 2 + Math.sign(d) * (b0.w / 2 + 40 + b.w * sc / 2) + (Math.abs(d) - 1) * Math.sign(d) * (b.w * sc + 40);
    el.style.width = b.w + "px"; el.style.height = b.h + "px";
    el.style.transition = animate ? "" : "none";
    el.style.transform = `translate(${(x - b.w / 2).toFixed(1)}px,${(H / 2 - 20 - b.h / 2).toFixed(1)}px) scale(${sc})`;
    el.classList.toggle("on", d === 0); el.classList.toggle("near", Math.abs(d) === 1);
  });
}
function plOpen(p, k) {
  plP = p; const it = p.pieces[k]; thS = seriesOf(p, it); thI = thS.indexOf(it);
  thRail.innerHTML = thS.map((x) => `<div class="pl-it"><img src="${x.still}" alt=""></div>`).join(""); thEls = [...thRail.children]; settle(thRail);
  thEls.forEach((el, i) => el.addEventListener("click", () => { if (i !== thI) thStep(i - thI); else thToggle(); }));
  pl.classList.toggle("series", thS.length > 1);
  pl.hidden = false; document.documentElement.classList.add("playing");
  // lift out from where the piece sits on the page
  const src = $(`.pc[data-k="${k}"] .pm`, view), r = src?.getBoundingClientRect(); thOrigin = k;
  thPlace(false);
  if (r) { const b = thBox(it), el = thEls[thI]; el.style.transform = `translate(${r.left}px,${r.top}px) scale(${r.width / b.w})`; el.style.transformOrigin = "0 0"; }
  requestAnimationFrame(() => requestAnimationFrame(() => { pl.classList.add("open"); thEls.forEach((e) => (e.style.transformOrigin = "")); thPlace(true); }));
  thShow(); history.pushState({ pl: 1 }, "", location.href);
}
function thShow() {
  const it = thS[thI];
  thEls.forEach((el, i) => { if (i !== thI) { const v = $("video,iframe", el); if (v) v.remove(); } });
  const el = thEls[thI]; plV = null;
  pl.classList.toggle("img", kindOf(it) === "img"); pl.classList.toggle("yt", kindOf(it) === "yt");
  if (it.yt && !$("iframe", el)) el.insertAdjacentHTML("beforeend", `<iframe src="https://www.youtube-nocookie.com/embed/${it.yt.id}?autoplay=1&rel=0&modestbranding=1" allow="autoplay; fullscreen" allowfullscreen></iframe>`);
  if (it.film) { let v = $("video", el); if (!v) { v = document.createElement("video"); v.src = it.film; v.playsInline = true; v.autoplay = true; el.appendChild(v); }
    plV = v; v.onplay = v.onpause = thUi; v.onended = () => { v.currentTime = 0; thUi(); }; v.muted = false; v.play().catch(() => { v.muted = true; v.play().catch(() => {}); thUi(); }); }
  $(".pl-t", pl).innerHTML = `<span>${esc(it.sec?.head && it.sec.head !== plP.title ? it.sec.head : plP.title)}</span>${it.caption ? `<span class="dim">${esc(it.caption)}</span>` : ""}`;
  $(".pl-n", pl).textContent = thS.length > 1 ? `${pad(thI + 1)} / ${pad(thS.length)}` : "";
  pl.classList.toggle("at-start", thI === 0); pl.classList.toggle("at-end", thI === thS.length - 1);
  thUi(); thWake();
}
function thStep(d) { const n = Math.max(0, Math.min(thS.length - 1, thI + d)); if (n === thI) return; thI = n; thPlace(true); thShow(); }
function thUi() { if (!plV) return; $(".pl-pp", pl).textContent = plV.paused ? "Play" : "Pause"; $(".pl-snd", pl).textContent = plV.muted ? "Sound off" : "Sound on"; }
const thToggle = () => { if (!plV) return; plV.paused ? plV.play() : plV.pause(); };
function plHide() {
  if (pl.hidden) return; if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  $$("video", thRail).forEach((v) => v.pause());
  // settle back into the page where it came from
  const k = thS[thI]?.k, src = $(`.pc[data-k="${k}"] .pm`, view), r = src?.getBoundingClientRect(), el = thEls[thI];
  pl.classList.remove("open");
  if (r && el) { const b = thBox(thS[thI]); el.style.transformOrigin = "0 0"; el.style.transform = `translate(${r.left}px,${r.top}px) scale(${r.width / b.w})`; }
  setTimeout(() => { pl.hidden = true; thRail.innerHTML = ""; thEls = []; plV = null; document.documentElement.classList.remove("playing"); }, 420);
}
const plClose = () => { if (pl.hidden) return; if (history.state?.pl) history.back(); else plHide(); };
addEventListener("popstate", () => { if (!pl.hidden) plHide(); });
addEventListener("resize", () => { if (!pl.hidden) thPlace(false); });
$(".pl-bg", pl).onclick = plClose; $(".pl-x", pl).onclick = plClose; $(".pl-pp", pl).onclick = thToggle;
$(".pl-pv", pl).onclick = () => thStep(-1); $(".pl-nx", pl).onclick = () => thStep(1);
$(".pl-snd", pl).onclick = () => { if (!plV) return; plV.muted = !plV.muted; thUi(); };
$(".pl-fs", pl).onclick = () => { const t = plV || $("iframe,img", thEls[thI]); if (!t) return; if (t.requestFullscreen) t.requestFullscreen().catch(() => {}); else t.webkitEnterFullscreen?.(); };
$(".pl-bar", pl).addEventListener("pointerdown", (e) => { if (!plV?.duration) return; const r = e.currentTarget.getBoundingClientRect(), seek = (x) => (plV.currentTime = Math.max(0, Math.min(1, (x - r.left) / r.width)) * plV.duration); seek(e.clientX);
  const mv = (ev) => seek(ev.clientX), up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); }; addEventListener("pointermove", mv); addEventListener("pointerup", up); });
// swipe sideways through a series on a phone or trackpad
{ let sx = null; thRail.addEventListener("pointerdown", (e) => { sx = e.clientX; }); addEventListener("pointerup", (e) => { if (sx == null || pl.hidden) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 60 && thS.length > 1) thStep(dx < 0 ? 1 : -1); });
  let wl = 0; pl.addEventListener("wheel", (e) => { if (thS.length < 2 || Math.abs(e.deltaX) < Math.abs(e.deltaY) || Math.abs(e.deltaX) < 20) return; const t = performance.now(); if (t - wl < 600) return; wl = t; thStep(e.deltaX > 0 ? 1 : -1); }, { passive: true }); }
// the controls step back while the film plays and you're not moving
function thWake() { pl.classList.remove("idle"); clearTimeout(thIdle); thIdle = setTimeout(() => { if (plV && !plV.paused) pl.classList.add("idle"); }, 2400); }
pl.addEventListener("pointermove", thWake);
addEventListener("keydown", (e) => {
  if (pl.hidden) return;
  if (e.key === "Escape") { e.stopImmediatePropagation(); if (!document.fullscreenElement) plClose(); return; }
  if (e.key === " ") { e.preventDefault(); thToggle(); thWake(); }
  if (e.key === "ArrowRight") { if (thS.length > 1) thStep(1); else if (plV) plV.currentTime += 5; }
  if (e.key === "ArrowLeft") { if (thS.length > 1) thStep(-1); else if (plV) plV.currentTime -= 5; }
});

// timecodes run off the films themselves
function ticker() {
  if (!pl.hidden && plV) { $(".pl-tc", pl).innerHTML = `${tc(plV.currentTime)} <span class="dim">/ ${tc(plV.duration)}</span>`; if (plV.duration) $(".pl-bar b", pl).style.transform = `scaleX(${(plV.currentTime / plV.duration).toFixed(4)})`; }
  requestAnimationFrame(ticker);
}
requestAnimationFrame(ticker);

// ---------- reactive type: letters thicken a little as the pointer passes, then thin back ----------
let VT = [];
function vtWrap(el) { if (el.dataset.vtDone) return; el.dataset.vtDone = 1; const t = el.textContent; el.setAttribute("aria-label", t);
  el.innerHTML = t.split(" ").map((w) => `<span class="vw">${[...w].map((c) => `<span class="vl">${esc(c)}</span>`).join("")}</span>`).join(" "); }
function vtMeasure() {
  VT = []; $$("[data-vt]").forEach((el) => { if (el.closest("[hidden]")) return; vtWrap(el);
    $$(".vl", el).forEach((l) => { l.style.fontVariationSettings = ""; l._w = null; }); });
  const sy = view.hidden ? 0 : view.scrollTop;
  $$("[data-vt] .vl").forEach((l) => { if (l.closest("[hidden]")) return; const r = l.getBoundingClientRect(); VT.push({ l, x: r.left + r.width / 2, y: r.top + r.height / 2 + sy, fixed: !l.closest("#view"), k: 0 }); });
}
if (!touch) {
  document.fonts.ready.then(vtMeasure); addEventListener("resize", () => vtMeasure());
  const vtLoop = () => {
    const sy = view.hidden ? 0 : view.scrollTop, R = 150;
    for (const L of VT) { const y = L.fixed ? L.y : L.y - sy, d = Math.hypot(L.x - cx, y - cy), t = Math.max(0, 1 - d / R), e = t * t * (3 - 2 * t);
      // in the menu the name you're on runs heavy and the rest run light; elsewhere titles sit at regular
      L.k += (e - L.k) * .2; const w = Math.round(400 + L.k * 190); if (L._w !== w) { L._w = w; L.l.style.fontVariationSettings = `"wght" ${w}`; } }
    requestAnimationFrame(vtLoop);
  };
  requestAnimationFrame(vtLoop);

}

// ---------- where you are: the project and section show small in the header once the title has scrolled away ----------
const whereEl = document.createElement("div"); whereEl.className = "where"; $(".top").insertBefore(whereEl, $(".nav"));
let whereIO = null;
function where(p) {
  whereIO?.disconnect(); whereEl.innerHTML = ""; document.body.classList.remove("past");
  const secs = $$("[data-n]", view), N = secs.length, head = $(".pj-h", view); let n = 1;
  const paint = () => { whereEl.innerHTML = `<span>${esc(p.title)}</span>${N > 1 ? `<span class="dim">${pad(n)} / ${pad(N)}</span>` : ""}`; };
  whereIO = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.target === head) document.body.classList.toggle("past", !e.isIntersecting); else if (e.isIntersecting) { n = +e.target.dataset.n; paint(); } });
  }, { root: view, rootMargin: "-45% 0px -45% 0px" });
  if (head) new IntersectionObserver(([e]) => document.body.classList.toggle("past", !e.isIntersecting), { root: view }).observe(head);
  secs.forEach((x) => whereIO.observe(x)); paint();
}
// the header steps aside while you scroll down through the work, and comes back as soon as you scroll up
{ let ly = 0; view.addEventListener("scroll", () => { const y = view.scrollTop, dy = y - ly; ly = y;
    if (y < 120 || dy < -3) document.body.classList.remove("hdr-off"); else if (dy > 3) document.body.classList.add("hdr-off"); }, { passive: true }); }

// ---------- routes ----------
let booted = false, swapT = 0, curP = null;
function route() {
  let h = decodeURIComponent(location.hash.slice(1));
  if (h === "ai-commissions") { h = "ai-experiments"; history.replaceState(null, "", "#ai-experiments"); }
  const p = WHEEL.find((q) => q.slug === h);
  if (p && p.page) { location.href = p.page; return; }
  if (h === "about") { history.replaceState(null, "", location.pathname); ctOpen(); return; }
  if (!pl.hidden) plHide();
  clearTimeout(swapT);
  if (!booted) { booted = true; if (p) wheelGo(WHEEL.indexOf(p)), (W.pos = W.target); apply(p); return; }
  // out of the wheel: the thumbnail grows into the page (onto the film itself, for a film)
  if (zoomEl && p) {
    const z = zoomEl; zoomEl = null; document.body.classList.add("swap");
    apply(p); home.hidden = false; setTimeout(() => { if (!view.hidden) home.hidden = true; }, 300);
    const t = p.solo && innerWidth > 820 ? $(".scr.one .pc .pm", view)?.getBoundingClientRect() : null;
    zoomTo(z, t && t.width ? t : fullRect()).then(() => zoomEnd(z));
    setTimeout(() => document.body.classList.remove("swap"), 330);
    return;
  }
  zoomEl?.remove(); zoomEl = null;
  // back to the wheel: the page lets go and its picture settles into its stop
  const from = curP, i = from ? WHEEL.indexOf(from) : -1;
  if (!p && from && i >= 0 && !view.hidden) {
    const f = from.solo ? $(".scr.one .pc .pm", view)?.getBoundingClientRect() : null, seen = f && f.bottom > 80 && f.top < innerHeight - 80;
    const z = zoomMake(from, seen ? f : fullRect()); if (!seen) z.classList.add("soft");
    document.body.classList.add("swap"); wheelGo(i); W.pos = i; W.vel = 0;
    zoomTo(z, centreRect()).then(() => zoomEnd(z));
    swapT = setTimeout(() => { apply(null); requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("swap"))); }, 250);
    return;
  }
  // between pages: one short fade
  document.body.classList.add("swap"); swapT = setTimeout(() => { apply(p); requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("swap"))); }, 240);
}
function apply(p) {
  document.body.classList.remove("hdr-off"); curP = p || null;
  if (p) {
    home.hidden = true; view.hidden = false; document.body.classList.add("viewing");
    $$("video", wheel).forEach((v) => v.pause());
    renderProject(p);
  } else {
    view.hidden = true; view.innerHTML = ""; home.hidden = false; document.body.classList.remove("viewing");
    W.cur = -1; W.drawn = null; vtMeasure();
    document.title = "Stefan Foster";
  }
  dispatchEvent(new Event("routed"));
}
addEventListener("hashchange", route);
document.addEventListener("click", (e) => { const a = e.target.closest("a[data-home]"); if (!a) return; e.preventDefault(); if (location.hash) { history.pushState(null, "", location.pathname); route(); } });
// keys: up and down step through the screens, space plays with sound
addEventListener("keydown", (e) => {
  if (view.hidden || !pl.hidden || document.documentElement.classList.contains("playing") || e.metaKey || e.ctrlKey || document.documentElement.matches(".flying,.devouring")) return;
  if (e.key === "Escape" && !ctOn) { history.pushState(null, "", location.pathname); route(); }
});

// ---------- about ----------
const ct = $("#ct"); let ctOn = false;
function ctOpen() { ct.hidden = false; requestAnimationFrame(() => ct.classList.add("on")); ctOn = true; }
function ctClose() { ct.classList.remove("on"); ctOn = false; setTimeout(() => { if (!ctOn) ct.hidden = true; }, 350); }
$("#ctBtn").onclick = ctOpen; $("#ctX").onclick = ctClose;
ct.addEventListener("click", (e) => { if (e.target === ct || e.target.classList.contains("ct-in")) ctClose(); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && ctOn) ctClose(); });

// ---------- the spider, the ship and the creature ----------
const crawler = new Crawler({
  holes: [$("#hole")], pads: [$("#pad")], eats: [$("#eat")], reduce: matchMedia("(prefers-reduced-motion: reduce)").matches,
  sfx: (k, a, b) => sound.critter(k, a, b),
  sel: ".wl b,.wl span,.wi.on,.who,.nav a,.nav button,.brand,.slate span,.pj-h h1,.pj-h p,.pc,.gh h2,.nx b,.rh b",
  letter: ".wl .n",
  loose: ",.slate span",
  gentle: true,
  anchors: () => { const out = []; $$(".wi.on,.pj-h h1,.pc").forEach((el) => { const q = el.getBoundingClientRect(); if (q.bottom < 0 || q.top > innerHeight || !q.width) return; out.push([q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]); }); return out; },
});
{ let ly = 0; view.addEventListener("scroll", () => { const dy = view.scrollTop - ly; ly = view.scrollTop; if (dy) crawler.shift(0, -dy); }, { passive: true }); }
addEventListener("hashchange", () => { if (!touch) setTimeout(() => crawler.leap("bottom"), 60); });

// ---------- the logo: spinning chrome, its white lifted out; hover and it loses control ----------
{ const v = $("#logoV"), c = $("#logoC"), g = c.getContext("2d", { willReadFrequently: true });
  const W = 128; let H = 64;
  const still = new Image(); still.src = "media/reel-poster.webp";
  let rate = 1, want = 1, sc = 1, sv = 0;
  const draw = () => {
    const live = v.readyState >= 2 && v.videoWidth, src = live ? v : still.complete && still.naturalWidth ? still : null;
    if (src) {
      const sw = live ? v.videoWidth : still.naturalWidth, sh = live ? v.videoHeight : still.naturalHeight;
      H = Math.round(W * sh / sw); if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      g.drawImage(src, 0, 0, W, H); const d = g.getImageData(0, 0, W, H), q = d.data;
      for (let i = 0; i < q.length; i += 4) { const m = Math.min(q[i], q[i + 1], q[i + 2]); if (m > 200) q[i + 3] = Math.max(0, 255 - (m - 200) * 4.7); }
      g.putImageData(d, 0, 0);
    }
    rate += (want - rate) * (want > rate ? .5 : .03); const pr = Math.min(16, Math.max(.1, rate)); if (Math.abs(v.playbackRate - pr) > .02) v.playbackRate = pr;
    sv += ((want > 1 ? 1.6 : 1) - sc) * .18; sv *= .72; sc += sv;
    const wild = Math.max(0, (rate - 2) / 14), jx = (Math.random() - .5) * 2.4 * wild, jy = (Math.random() - .5) * 2.4 * wild, jr = (Math.random() - .5) * 6 * wild;
    c.style.transform = Math.abs(sc - 1) < .001 && !wild ? "" : `translate(${jx.toFixed(2)}px,${jy.toFixed(2)}px) rotate(${jr.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
    requestAnimationFrame(draw);
  };
  const brand = c.closest(".brand");
  brand.addEventListener("mouseenter", () => (want = 16)); brand.addEventListener("mouseleave", () => (want = 1));
  v.play().catch(() => {}); draw(); }

// the toys live behind one quiet "Play"
{ const pb = $("#playBtn"), ty = $("#toys"); pb?.addEventListener("click", () => { const on = ty.hidden; ty.hidden = !on; pb.classList.toggle("open", on); pb.setAttribute("aria-expanded", on); }); }
// the game
{ const b = $("#pball"); b?.addEventListener("click", () => { sound.tick?.(.9, .04); const f = document.createElement("div"); f.className = "flash"; document.body.appendChild(f); setTimeout(() => (location.href = "rpg"), 420); }); }

route();
settle(document);
