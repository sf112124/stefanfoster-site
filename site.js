import { PROJECTS } from "./projects.js";
import MEDIA from "./media.js";
import { Crawler } from "./crawler.js";
import { Sound } from "./sound.js";
import SHEET from "./sheet.js";

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
const HI = ["ai-experiments", "coca-cola", "gumtree"];
const STILL = { "coca-cola": "media/coca-cola/still-1.webp", gumtree: "media/gumtree/hover-1.jpg" };
LIST.forEach((p) => {
  const lib = MEDIA[p.slug] || {}; let sec = null; p.pieces = [];
  (p.youtube || []).forEach((y) => p.pieces.push({ yt: y, w: 16, h: 9, caption: y.title, stat: y.note, still: y.thumb ? url(p.slug, y.thumb) : `https://i.ytimg.com/vi/${y.id}/hqdefault.jpg` }));
  p.items.forEach((it) => {
    if (it.head) { sec = it; return; }
    if (it.play) { p.pieces.push({ sec, play: it.play, w: 16, h: 10, caption: it.caption, stat: it.note, still: url(p.slug, it.img) }); return; }
    const fs = it.from || p.slug, m = (it.from ? MEDIA[it.from] || {} : lib)[it.file]; if (!m) return;
    const x = { ...m, ...it, sec };
    x.still = url(fs, m.type === "video" ? m.poster : m.src || m.sm);
    if (m.type === "video") { x.loop = url(fs, m.loop); x.film = url(fs, m.full || m.loop); }
    p.pieces.push(x);
  });
  if (HI.includes(p.slug)) p.cover = { v: url(p.slug, "cover.mp4"), i: url(p.slug, "cover.webp"), a: 16 / 9 };
  else if (p.slug === "les-benjamins") p.cover = { v: "media/les-benjamins/banner.mp4", i: "media/les-benjamins/banner-poster.jpg", a: 16 / 9 };
  else if (STILL[p.slug]) p.cover = { i: STILL[p.slug], a: 16 / 9 };
  else { const c = p.pieces.find((x) => x.loop) || p.pieces[0]; if (c) p.cover = { v: c.loop, i: c.still, a: c.w / c.h }; }
});

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

// ---------- index: the list sits quietly at the edge, the work plays behind it ----------
const home = $("#home"), view = $("#view"), bg = $("#bg"), list = $("#list"), info = $("#info"), tcEl = $("#tc");
const layers = LIST.map((p) => {
  const d = document.createElement("div"); d.className = "layer";
  d.style.setProperty("--a", (p.cover?.a || 16 / 9).toFixed(4)); d.classList.toggle("tall", (p.cover?.a || 1.7) < 1);
  d.innerHTML = p.cover?.v ? `<video muted loop playsinline preload="none" poster="${p.cover.i}" data-src="${p.cover.v}"></video>` : `<img src="${p.cover?.i || ""}" alt="" loading="lazy">`;
  bg.appendChild(d); return d;
});
list.innerHTML = LIST.map((p, i) => `<li><a href="${p.page ? p.page : "#" + p.slug}" data-i="${i}"><span class="n">${pad(i + 1)}</span><span class="t" data-vt>${esc(p.title)}</span></a></li>`).join("");
let cueI = -1, cueV = null;
function cue(i) {
  if (i === cueI) return; cueI = i;
  layers.forEach((l, k) => { l.classList.toggle("on", k === i); const v = $("video", l); if (!v) return; if (k === i) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else setTimeout(() => { if (cueI !== k) v.pause(); }, 400); });
  cueV = $("video", layers[i]);
  $$("a", list).forEach((a, k) => a.classList.toggle("on", k === i));
  const p = LIST[i], n = p.pieces.length;
  info.innerHTML = `<span>${esc(p.client)}</span><span>${esc(p.kind || "")}</span>`;
  place(i);
}
// on a desktop the clip pops up right beside the name you're on, at its own shape
function place(i) {
  // wide films fill the screen; tall phone films stand in the middle of it at their own shape
  const l = layers[i], a = LIST[i].cover?.a || 16 / 9;
  if (innerWidth <= 820 || a >= 1) { Object.assign(l.style, { left: "0px", top: "0px", width: "100%", height: "100%" }); return; }
  const h = innerHeight, w = h * a;
  Object.assign(l.style, { left: (innerWidth - w) / 2 + "px", top: (innerHeight - h) / 2 + "px", width: w + "px", height: h + "px" });
}
$$("a", list).forEach((a) => { a.addEventListener("pointerenter", () => { cue(+a.dataset.i); sound.tick?.(.5, .015); }); a.dataset.cur = "Open"; });
// desktops get the contact sheet; phones keep the menu over the work
const SHEETED = false; // contact sheet parked: set to (!touch && innerWidth > 820) to bring it back
if (!SHEETED) cue(0);
bg.addEventListener("click", () => { const p = LIST[cueI]; if (p) location.href = p.page ? p.page : "#" + p.slug; });
bg.dataset.cur = "Open";
{ let px = 0, py = 0; const drift = () => { if (!home.hidden) { const tx = (mx / innerWidth - .5) * -2.2, ty = (my / innerHeight - .5) * -2.2; px += (tx - px) * .05; py += (ty - py) * .05; bg.style.setProperty("--px", px.toFixed(3) + "%"); bg.style.setProperty("--py", py.toFixed(3) + "%"); } requestAnimationFrame(drift); }; if (!touch) requestAnimationFrame(drift); }
// phones: the reel turns over on its own
if (touch) setInterval(() => { if (!home.hidden) cue((cueI + 1) % LIST.length); }, 4200);

// ---------- the contact sheet: every project laid out frame by frame. Touch one and its whole roll lights up ----------
if (SHEETED) {
  document.body.classList.add("sheeted");
  const sheet = document.createElement("div"); sheet.className = "sheet";
  const names = document.createElement("nav"); names.className = "names";
  const idxOf = Object.fromEntries(LIST.map((p, i) => [p.slug, i])), count = {};
  sheet.innerHTML = SHEET.map((f, k) => { const i = idxOf[f.p], p = LIST[i]; if (!p) return ""; count[i] = (count[i] || 0) + 1;
    return `<a class="fr" href="${p.page || "#" + p.slug}" data-p="${i}" data-k="${k}" style="grid-column:span ${f.f.length}"><span class="im">${f.f.map((src) => `<img src="${src}" alt="" loading="lazy" decoding="async">`).join("")}<span class="tag"><b>${esc(f.t)}</b><span>${esc(f.c)}</span></span></span><span class="no">${pad(i + 1)}.${pad(count[i])}</span></a>`; }).join("");
  names.innerHTML = LIST.map((p, i) => `<a href="${p.page || "#" + p.slug}" data-p="${i}" data-cur="Open"><span class="n">${pad(i + 1)}</span>${esc(p.title)}</a>`).join("");
  home.appendChild(sheet);
  let hot = -1, live = null;
  const light = (i) => {
    if (i === hot) return; hot = i;
    sheet.classList.toggle("hot", i >= 0);
    $$(".fr", sheet).forEach((f) => f.classList.toggle("lit", +f.dataset.p === i));
    $$(".fr", sheet).forEach((f) => f.classList.toggle("at", f === cur_));
    $$("a", names).forEach((a) => a.classList.toggle("on", +a.dataset.p === i));
    const p = LIST[i]; info.innerHTML = p ? `<span>${esc(p.client)}</span><span>${esc(p.kind || "")}</span>` : "";
  };
  const play = (fr) => {
    if (live && live.fr !== fr) { live.v.remove(); live = null; }
    const f = SHEET[+fr.dataset.k]; if (!f?.v || live) return;
    const v = document.createElement("video"); v.muted = true; v.loop = true; v.playsInline = true; v.src = f.v;
    $(".im", fr).appendChild(v); v.play().catch(() => {}); live = { fr, v };
  };
  let cur_ = null;
  sheet.addEventListener("pointerover", (e) => { const fr = e.target.closest(".fr"); if (!fr) return; cur_ = fr; $$(".fr.at", sheet).forEach((f) => f !== fr && f.classList.remove("at")); fr.classList.add("at"); light(+fr.dataset.p); play(fr); });
  sheet.addEventListener("pointerleave", () => { cur_ = null; $$(".fr.at", sheet).forEach((f) => f.classList.remove("at")); light(-1); if (live) { live.v.remove(); live = null; } });
  names.addEventListener("pointerover", (e) => { const a = e.target.closest("a"); if (a) light(+a.dataset.p); });
  names.addEventListener("pointerleave", () => light(-1));
  // the sheet is sized so every frame fits on the one screen
  const lay = () => {
    const n = SHEET.reduce((t, f) => t + f.f.length, 0), top = 78, bot = 62, side = 30, gap = 12, lab = 16, W = innerWidth - side * 2, H = innerHeight - top - bot;
    let best = { w: 0 };
    for (let c = 6; c <= 18; c++) { const r = Math.ceil(n / c) + (n % c ? 0 : 0), w = Math.min((W - gap * (c - 1)) / c, ((H - gap * (r - 1)) / r - lab) * 1.5); if (w > best.w) best = { w, c, r }; }
    sheet.style.gridTemplateColumns = `repeat(${best.c}, ${best.w.toFixed(1)}px)`; sheet.style.columnGap = gap + "px"; sheet.style.rowGap = gap + "px";
    sheet.style.setProperty("--ch", (best.w / 1.5).toFixed(1) + "px");
    // if the packing ran onto an extra row, step the frames down until it fits
    requestAnimationFrame(() => { const r = sheet.getBoundingClientRect(); if (r.height > H + 4 && best.w > 40) { const k = H / r.height; const w = best.w * k; sheet.style.gridTemplateColumns = `repeat(${best.c}, ${w.toFixed(1)}px)`; sheet.style.setProperty("--ch", (w / 1.5).toFixed(1) + "px"); } });
  };
  lay(); addEventListener("resize", lay);
}

// ---------- project pages ----------
let homeY = 0;
const kindOf = (it) => (it.yt ? "yt" : it.play ? "play" : it.film ? "film" : "img");
const portrait = (it) => it.w / it.h < .9;
const dur = (t) => t ? `${pad(Math.floor(t / 60))}:${pad(Math.round(t) % 60)}` : "";
// these keep their picture layouts: rows of work at their own shapes
const GALLERY = ["summer-of-sport", "3d-explorations", "la-croisiere"];
function screens(p) {
  // tall things that come together sit side by side (phone films, the toys); otherwise one per screen
  const out = []; let run = null;
  p.pieces.forEach((it) => {
    const together = it.sec?.thumbs || (portrait(it) && (it.sec?.carousel || p.pieces.filter((q) => q.sec === it.sec && portrait(q)).length > 1));
    if (together && run && run.sec === it.sec) { run.items.push(it); return; }
    run = together ? { sec: it.sec, items: [it], row: true, thumbs: !!it.sec?.thumbs, strip: !it.sec?.thumbs && (it.sec?.carousel || false) } : null;
    out.push(run || { sec: it.sec, items: [it] });
  });
  out.forEach((s) => { if (s.row && !s.thumbs && s.items.length > 3) s.strip = true; });
  return out;
}
const tag = (it) => { const k = kindOf(it); return k === "film" || k === "yt" ? `<span class="playtag"><i></i>Play</span>` : k === "play" ? `<span class="playtag open">Open →</span>` : ""; };
const curOf = (it) => ({ film: "Play", yt: "Play", play: "Open", img: "View" })[kindOf(it)];
function piece(it, cls = "") {
  return `<figure class="pc ${cls} k-${kindOf(it)}" data-k="${it.k}" data-cur="${curOf(it)}" style="--a:${(it.w / it.h).toFixed(4)}"><i class="cm" aria-hidden="true"></i><div class="pm"><img src="${it.still}" alt="" loading="lazy" decoding="async">${tag(it)}</div></figure>`;
}
function slate(p, s, it) {
  // a title and a line under it, nothing else
  const head = s.sec?.head && s.sec.head !== p.title ? s.sec.head : "";
  const title = head || it?.caption || p.title;
  const sub = [s.sec?.text, head ? it?.caption : "", it?.stat].filter(Boolean);
  return `<div class="slate"><div class="sl-l"><span>${esc(title)}</span>${sub.map((x) => `<span class="dim">${esc(x)}</span>`).join("")}</div></div>`;
}
function renderProject(p) {
  p.pieces.forEach((it, k) => (it.k = k));
  const total = p.pieces.length, nx = LIST[(LIST.indexOf(p) + 1) % LIST.length], gal = GALLERY.includes(p.slug);
  const head = `<header class="pj-h"><h1 data-vt>${esc(p.title)}</h1>
    ${p.client && p.client !== "Personal" ? `<div class="f"><span class="dim">Client</span><span>${esc(p.client)}</span></div>` : "<div></div>"}
    <p>${esc(p.blurb || "")}</p></header>`;
  let body;
  if (gal) {
    // the old layout: sections, and rows of pictures at their own shapes, as tall as the screen allows
    const groups = []; p.pieces.forEach((it) => { const g = groups[groups.length - 1]; if (!g || g.sec !== it.sec) groups.push({ sec: it.sec, items: [it] }); else g.items.push(it); });
    body = groups.map((g) => `<section class="grp">${g.sec ? `<div class="gh"><h2>${esc(g.sec.head)}</h2><span class="dim">${pad(g.items.length)} ${g.items.length === 1 ? "piece" : "pieces"}</span><p class="dim">${esc(g.sec.text || "")}</p></div>` : ""}
      <div class="gm">${g.items.map((it) => piece(it, "tile").replace("</figure>", `<figcaption><span class="dim">${pad(it.k + 1)}</span>${it.caption ? `<span>${esc(it.caption)}</span>` : ""}${it.stat ? `<span class="dim">${esc(it.stat)}</span>` : ""}</figcaption></figure>`)).join("")}</div></section>`).join("");
  } else {
    const SC = screens(p), NS = SC.length;
    // each section opens with a chapter line: its number, a rule, the project and how far through you are
    const ch = (k) => `<div class="ch"><span>${esc(p.title)}</span><i></i><span>${pad(k + 1)} / ${pad(NS)}</span></div>`;
    body = SC.map((s, k) => {
      if (s.row) {
        const A = s.items.reduce((t, it) => t + it.w / it.h, 0);
        // a run of pieces gets its heading on top, so it's clearly the title of what follows
        const head = s.sec?.head && s.sec.head !== p.title ? s.sec.head : p.title;
        return `<section class="scr row${s.thumbs ? " thumbs" : ""}${s.strip ? " strip" : ""}" style="--sa:${A.toFixed(4)};--n:${s.items.length}">${ch(k)}
          <div class="rh"><b>${esc(head)}</b>${s.sec?.text ? `<span class="dim">${esc(s.sec.text)}</span>` : ""}</div>
          <div class="track">${s.items.map((it) => piece(it, "cell").replace("</figure>", it.caption || it.stat ? `<figcaption><span>${esc(it.caption || "")}</span><span class="dim">${esc(it.stat || "")}</span></figcaption></figure>` : "</figure>")).join("")}</div>
          </section>`;
      }
      const it = s.items[0];
      return `<section class="scr one">${ch(k)}${piece(it)}${slate(p, s, it, total)}</section>`;
    }).join("");
  }
  const nxt = `<section class="nx"><a href="${nx.page || "#" + nx.slug}" data-cur="Next"><span class="dim">Next</span><b data-vt>${esc(nx.title)}</b> <i>→</i></a></section>`;
  view.innerHTML = `<article class="pj${gal ? " gal" : ""}" data-slug="${p.slug}">${head}${body}${nxt}</article>`;
  view.scrollTop = 0; justify(); wire(p);
}
// gallery rows: pictures at their own shapes, edges flush, never taller than most of the screen
function justify() {
  $$(".gm", view).forEach((row) => {
    const tiles = [...row.children], W = row.clientWidth, gap = 10;
    const A = (t) => +t.style.getPropertyValue("--a"), hOf = (ts) => (W - gap * (ts.length - 1) - 1) / ts.reduce((a, t) => a + A(t), 0);
    if (innerWidth < 820) { tiles.forEach((t) => (t.style.width = "100%")); return; }
    const maxH = innerHeight * .74;
    for (let k = 0; k < tiles.length;) {
      const line = [tiles[k++]];
      while (k < tiles.length && hOf(line) > maxH && hOf([...line, tiles[k]]) >= maxH * .6) line.push(tiles[k++]);
      const h = Math.min(hOf(line), maxH); line.forEach((t) => (t.style.width = `${(A(t) * h).toFixed(1)}px`));
    }
  });
}
addEventListener("resize", () => { if (!view.hidden) justify(); else { const i = cueI; cueI = -1; cue(Math.max(0, i)); } });
function wire(p) {
  $$(".pc", view).forEach((el) => el.addEventListener("click", () => { const it = p.pieces[+el.dataset.k]; if (!it) return; if (it.play) { location.href = it.play; return; } plOpen(p, it.k); }));
  // strips: the page scrolls on down as normal; arrows (or a sideways swipe) move along the strip
  $$(".strip", view).forEach((st) => { const tr = $(".track", st);
    ["prev", "next"].forEach((d) => { const b = document.createElement("button"); b.type = "button"; b.className = "st-" + d; b.textContent = d === "next" ? "→" : "←"; b.setAttribute("aria-label", d);
      b.addEventListener("click", () => tr.scrollBy({ left: (d === "next" ? 1 : -1) * tr.clientWidth * .7, behavior: "smooth" })); st.appendChild(b); });
    const upd = () => { st.classList.toggle("at-start", tr.scrollLeft < 8); st.classList.toggle("at-end", tr.scrollLeft + tr.clientWidth > tr.scrollWidth - 8); };
    tr.addEventListener("scroll", upd, { passive: true }); upd(); });
  vtMeasure();
}

// ---------- the player: click a piece and it opens full screen, with its own controls ----------
const pl = document.createElement("div"); pl.className = "pl"; pl.hidden = true;
pl.innerHTML = `<div class="pl-st"></div>
  <div class="pl-top"><div class="pl-t"></div><button type="button" class="pl-x">Close</button></div>
  <div class="pl-bot"><button type="button" class="pl-pp">Pause</button><span class="pl-tc"></span><div class="pl-bar"><b></b></div><button type="button" class="pl-snd">Sound on</button><button type="button" class="pl-fs">Full screen</button><span class="pl-nav"><button type="button" class="pl-pv">Prev</button><button type="button" class="pl-nx">Next</button></span></div>`;
document.body.appendChild(pl);
const plSt = $(".pl-st", pl); let plP = null, plK = -1, plV = null, idle = 0;
const plList = () => plP.pieces.filter((x) => !x.play);
function plOpen(p, k) { plP = p; plK = k; pl.hidden = false; document.documentElement.classList.add("playing"); plShow(); history.pushState({ pl: 1 }, "", location.href); }
function plShow() {
  const it = plP.pieces[plK], L = plList(), n = L.indexOf(it);
  plV = null; pl.classList.toggle("img", kindOf(it) === "img"); pl.classList.toggle("yt", kindOf(it) === "yt");
  plSt.innerHTML = it.yt ? `<iframe src="https://www.youtube-nocookie.com/embed/${it.yt.id}?autoplay=1&rel=0&modestbranding=1" allow="autoplay; fullscreen" allowfullscreen></iframe>`
    : it.film ? `<video src="${it.film}" poster="${it.still}" autoplay playsinline></video>` : `<img src="${it.still}" alt="">`;
  $(".pl-t", pl).innerHTML = `<span>${esc(plP.title)}${it.sec?.head && it.sec.head !== plP.title ? ` <span class="dim">/</span> ${esc(it.sec.head)}` : ""}</span>${it.caption ? `<span class="dim">${esc(it.caption)}</span>` : ""}<span class="dim">${pad(n + 1)} / ${pad(L.length)}</span>`;
  plV = $("video", plSt);
  if (plV) { plV.addEventListener("click", plToggle); plV.addEventListener("play", plUI); plV.addEventListener("pause", plUI); plV.addEventListener("ended", () => { plV.currentTime = 0; plUI(); }); plV.muted = false; plV.play().catch(() => { plV.muted = true; plV.play().catch(() => {}); plUI(); }); }
  plUI(); wake();
}
function plUI() { if (!plV) return; $(".pl-pp", pl).textContent = plV.paused ? "Play" : "Pause"; $(".pl-snd", pl).textContent = plV.muted ? "Sound off" : "Sound on"; pl.classList.toggle("paused", plV.paused); }
const plToggle = () => { if (!plV) return; plV.paused ? plV.play() : plV.pause(); };
const plHide = () => { pl.hidden = true; plSt.innerHTML = ""; plV = null; document.documentElement.classList.remove("playing"); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
const plClose = () => { if (pl.hidden) return; if (history.state?.pl) history.back(); else plHide(); };
const plStep = (d) => { const L = plList(), n = L.indexOf(plP.pieces[plK]); plK = L[(n + d + L.length) % L.length].k; plShow(); };
addEventListener("popstate", () => { if (!pl.hidden) plHide(); });
$(".pl-x", pl).onclick = plClose; $(".pl-pp", pl).onclick = plToggle; $(".pl-pv", pl).onclick = () => plStep(-1); $(".pl-nx", pl).onclick = () => plStep(1);
$(".pl-snd", pl).onclick = () => { if (!plV) return; plV.muted = !plV.muted; plUI(); };
$(".pl-fs", pl).onclick = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else if (pl.requestFullscreen) pl.requestFullscreen().catch(() => {}); else plV?.webkitEnterFullscreen?.(); };
$(".pl-bar", pl).addEventListener("pointerdown", (e) => { if (!plV?.duration) return; const r = e.currentTarget.getBoundingClientRect(), seek = (x) => (plV.currentTime = Math.max(0, Math.min(1, (x - r.left) / r.width)) * plV.duration); seek(e.clientX);
  const mv = (ev) => seek(ev.clientX), up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); }; addEventListener("pointermove", mv); addEventListener("pointerup", up); });
// the controls step back while the film plays and you're not moving
function wake() { pl.classList.remove("idle"); clearTimeout(idle); idle = setTimeout(() => { if (plV && !plV.paused) pl.classList.add("idle"); }, 2400); }
pl.addEventListener("pointermove", wake);
addEventListener("keydown", (e) => {
  if (pl.hidden) return;
  if (e.key === "Escape") { if (!document.fullscreenElement) plClose(); return; }
  if (e.key === " ") { e.preventDefault(); plToggle(); wake(); }
  if (e.key === "ArrowRight") { if (plV && !e.shiftKey) plV.currentTime += 5; else plStep(1); }
  if (e.key === "ArrowLeft") { if (plV && !e.shiftKey) plV.currentTime -= 5; else plStep(-1); }
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
      if (L.a === undefined) L.a = L.l.closest(".list a") || null;
      const base = L.a ? (L.a.classList.contains("on") ? 780 : 300) : 400; L.b = L.b == null ? base : L.b + (base - L.b) * .18;
      L.k += (e - L.k) * .2; const w = Math.round(L.b + L.k * (L.a ? 120 : 190)); if (L._w !== w) { L._w = w; L.l.style.fontVariationSettings = `"wght" ${w}`; } }
    requestAnimationFrame(vtLoop);
  };
  requestAnimationFrame(vtLoop);
}

// ---------- routes ----------
function route() {
  let h = decodeURIComponent(location.hash.slice(1));
  if (h === "ai-commissions") { h = "ai-experiments"; history.replaceState(null, "", "#ai-experiments"); }
  const p = LIST.find((q) => q.slug === h);
  if (p && p.page) { location.href = p.page; return; }
  if (h === "about") { history.replaceState(null, "", location.pathname); ctOpen(); return; }
  if (!pl.hidden) plHide();
  if (p) {
    if (!home.hidden) homeY = scrollY;
    home.hidden = true; view.hidden = false; document.body.classList.add("viewing");
    $$("video", bg).forEach((v) => v.pause());
    renderProject(p);
  } else {
    view.hidden = true; view.innerHTML = ""; home.hidden = false; document.body.classList.remove("viewing");
    if (!SHEETED) { const i = cueI; cueI = -1; cue(Math.max(0, i)); } vtMeasure();
  }
}
addEventListener("hashchange", route);
document.addEventListener("click", (e) => { const a = e.target.closest("a[data-home]"); if (!a) return; e.preventDefault(); if (location.hash) { history.pushState(null, "", location.pathname); route(); } });
// keys: up and down step through the screens, space plays with sound
addEventListener("keydown", (e) => {
  if (view.hidden || !pl.hidden || e.metaKey || e.ctrlKey || document.documentElement.matches(".flying,.devouring")) return;
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
  sel: ".list a .t,.list a .n,.list a .k,.info span,.tc,.who,.nav a,.nav button,.brand,.slate span,.pj-h h1,.pj-m span,.pj-h p,.pc,.gh h2,.nx b",
  letter: ".list a .n",
  loose: ",.list a .k,.slate span,.info span",
  gentle: true,
  anchors: () => { const out = []; $$(".list a .t,.pj-h h1,.pc").forEach((el) => { const q = el.getBoundingClientRect(); if (q.bottom < 0 || q.top > innerHeight || !q.width) return; out.push([q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]); }); return out; },
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

// the game
{ const b = $("#pball"); b?.addEventListener("click", () => { sound.tick?.(.9, .04); const f = document.createElement("div"); f.className = "flash"; document.body.appendChild(f); setTimeout(() => (location.href = "rpg"), 420); }); }

route();
