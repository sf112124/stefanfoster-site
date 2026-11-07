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
const ORDER = ["ai-experiments", "la-croisiere", "les-benjamins", "relax", "summer-of-sport", "3d-explorations", "coca-cola", "gumtree"];
const LIST = [...PROJECTS].sort((a, b) => (ORDER.indexOf(a.slug) + 1 || 99) - (ORDER.indexOf(b.slug) + 1 || 99));
// full-quality loops made for the index background
const HI = ["ai-experiments", "la-croisiere", "relax"];
const STILL = { "coca-cola": "media/coca-cola/hover-1.jpg", gumtree: "media/gumtree/hover-1.jpg" };
LIST.forEach((p) => {
  const lib = MEDIA[p.slug] || {}; let sec = null; p.pieces = [];
  (p.youtube || []).forEach((y) => p.pieces.push({ yt: y, w: 16, h: 9, caption: y.title, stat: y.note, still: y.thumb ? url(p.slug, y.thumb) : `https://i.ytimg.com/vi/${y.id}/maxresdefault.jpg` }));
  p.items.forEach((it) => {
    if (it.head) { sec = it; return; }
    if (it.play) { p.pieces.push({ sec, play: it.play, w: 16, h: 10, caption: it.caption, stat: it.note, still: url(p.slug, it.img) }); return; }
    const fs = it.from || p.slug, m = (it.from ? MEDIA[it.from] || {} : lib)[it.file]; if (!m) return;
    const x = { ...m, ...it, sec };
    x.still = url(fs, m.type === "video" ? m.poster : m.src || m.sm);
    if (m.type === "video") { x.loop = url(fs, m.loop); x.film = url(fs, m.full || m.loop); }
    p.pieces.push(x);
  });
  if (HI.includes(p.slug)) p.cover = { v: url(p.slug, "cover.mp4"), i: url(p.slug, "cover.webp") };
  else if (p.slug === "les-benjamins") p.cover = { v: "media/les-benjamins/banner.mp4", i: "media/les-benjamins/banner-poster.jpg" };
  else if (STILL[p.slug]) p.cover = { i: STILL[p.slug] };
  else { const c = p.pieces.find((x) => x.loop) || p.pieces[0]; if (c) p.cover = { v: c.loop, i: c.still }; }
});

// ---------- the dot ----------
const cur = $("#cur"), curl = $("#curl");
let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
if (!touch) {
  document.documentElement.classList.add("dotc");
  addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  document.addEventListener("pointerover", (e) => { const big = e.target.closest?.("[data-cur]"); cur.classList.toggle("big", !!big); curl.textContent = big ? big.dataset.cur : ""; });
  const loop = () => { cx += (mx - cx) * .35; cy += (my - cy) * .35; cur.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}

// ---------- index: the list sits quietly at the edge, the work plays behind it ----------
const home = $("#home"), view = $("#view"), bg = $("#bg"), list = $("#list"), info = $("#info"), tcEl = $("#tc");
const layers = LIST.map((p) => {
  const d = document.createElement("div"); d.className = "layer";
  d.innerHTML = p.cover?.v ? `<video muted loop playsinline preload="none" poster="${p.cover.i}" data-src="${p.cover.v}"></video>` : `<img src="${p.cover?.i || ""}" alt="" loading="lazy">`;
  bg.appendChild(d); return d;
});
list.innerHTML = LIST.map((p, i) => `<li><a href="${p.page ? p.page : "#" + p.slug}" data-i="${i}"><span class="n">${pad(i + 1)}</span><span class="t">${esc(p.title)}</span><span class="k">${esc(p.client)}</span></a></li>`).join("");
let cueI = -1, cueV = null;
function cue(i) {
  if (i === cueI) return; cueI = i;
  layers.forEach((l, k) => { l.classList.toggle("on", k === i); const v = $("video", l); if (!v) return; if (k === i) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else setTimeout(() => { if (cueI !== k) v.pause(); }, 400); });
  cueV = $("video", layers[i]);
  $$("a", list).forEach((a, k) => a.classList.toggle("on", k === i));
  const p = LIST[i], n = p.pieces.length;
  info.innerHTML = `<span>${esc(p.kind || "")}</span><span class="dim">${n ? pad(n) + (n === 1 ? " piece" : " pieces") : "Film"}</span>`;
}
$$("a", list).forEach((a) => { a.addEventListener("pointerenter", () => { cue(+a.dataset.i); sound.tick?.(.5, .015); }); a.dataset.cur = "Open"; });
cue(0);
// phones: the reel turns over on its own
if (touch) setInterval(() => { if (!home.hidden) cue((cueI + 1) % LIST.length); }, 4200);

// ---------- project pages: one thing per screen, scroll to the next ----------
let homeY = 0;
const kindOf = (it) => (it.yt ? "yt" : it.play ? "play" : it.film ? "film" : "img");
const portrait = (it) => it.w / it.h < .9;
function screens(p) {
  // things side by side when they're tall and come together (a section of phone films); otherwise one per screen
  const out = []; let run = null;
  p.pieces.forEach((it, k) => {
    it.k = k;
    const together = (it.sec?.thumbs) || (portrait(it) && (it.sec?.carousel || p.pieces.filter((q) => q.sec === it.sec && portrait(q)).length > 1));
    if (together && run && run.sec === it.sec) { run.items.push(it); return; }
    run = together ? { sec: it.sec, items: [it], row: true, thumbs: !!it.sec?.thumbs } : null;
    out.push(run || { sec: it.sec, items: [it] });
  });
  return out;
}
function mediaHTML(it, big) {
  const k = kindOf(it);
  if (k === "film") return `<video muted loop playsinline preload="none" poster="${it.still}" data-src="${big ? it.film : it.film}"></video>`;
  return `<img src="${it.still}" alt="" loading="lazy" decoding="async">`;
}
function slateHTML(p, s, it, n, total) {
  const sec = s.sec?.head && s.sec.head !== p.title ? s.sec.head : "";
  return `<div class="slate">
    <div class="sl-l"><span>${esc(p.title)}${sec ? ` <span class="dim">/</span> ${esc(sec)}` : ""}</span>${s.sec?.text && (!s.row || (it === s.items[0] && !s.thumbs && !s.sec.carousel && s.items.length <= 3)) ? `<span class="dim">${esc(s.sec.text)}</span>` : ""}${it.caption ? `<span class="dim">${esc(it.caption)}</span>` : ""}${it.stat ? `<span class="dim">${esc(it.stat)}</span>` : ""}</div>
    <div class="sl-r"><span class="cnt">${pad(n)} <span class="dim">/ ${pad(total)}</span></span><span class="dim fmt">${it.w && it.h && !it.play && !it.yt ? `${it.w}×${it.h}` : ""}</span>${kindOf(it) === "film" ? `<span class="tcv dim">${tc(0)}</span>` : ""}</div>
  </div>`;
}
function renderProject(p) {
  const S = screens(p), total = p.pieces.length, nx = LIST[(LIST.indexOf(p) + 1) % LIST.length];
  // the opening screen: the first film itself when it's a wide one (click for sound), otherwise the cover behind the title
  const f0 = p.pieces[0], lead = f0?.film && !portrait(f0) ? f0 : null, skip = lead ? 1 : 0;
  const first = `<section class="scr open${lead ? " one k-film" : ""}"${lead ? ` data-k="0" style="--a:${(lead.w / lead.h).toFixed(4)}"${lead.audio ? ' data-cur="Sound on"' : ""}` : ""}><div class="fill">${lead ? mediaHTML(lead) : p.cover ? (p.cover.v ? `<video muted loop playsinline preload="none" poster="${p.cover.i}" data-src="${p.cover.v}"></video>` : `<img src="${p.cover.i}" alt="">`) : ""}</div>
    <div class="title"><h1>${esc(p.title)}</h1><span class="dim">${esc(p.client)}${lead?.sec?.head ? ` / ${esc(lead.sec.head)}` : ""}</span>${p.blurb ? `<p>${esc(p.blurb)}</p>` : ""}</div>
    ${lead ? `<div class="slate"><div class="sl-l"></div><div class="sl-r"><span class="cnt">01 <span class="dim">/ ${pad(total)}</span></span><span class="dim fmt">${lead.w}×${lead.h}</span><span class="tcv dim">${tc(0)}</span></div></div><i class="prog"><b></b></i>` : ""}
    <div class="scroll-cue dim">Scroll ↓</div></section>`;
  const body = S.map((s) => {
    if (s.row) return `<section class="scr row${s.thumbs ? " thumbs" : s.items.length > 3 || s.sec?.carousel ? " strip" : ""}">${(s.thumbs || s.items.length > 3 || s.sec?.carousel) && (s.sec?.text || s.sec?.head) ? `<div class="row-h"><span>${esc(s.sec?.head || "")}</span>${s.sec?.text ? `<span class="dim">${esc(s.sec.text)}</span>` : ""}</div>` : ""}
      <div class="track">${s.items.map((it) => `<figure class="cell k-${kindOf(it)}" data-k="${it.k}" style="--a:${(it.w / it.h).toFixed(4)}" data-cur="${kindOf(it) === "film" && it.audio ? "Sound on" : kindOf(it) === "play" ? "Open" : ""}">${mediaHTML(it)}${slateHTML(p, s, it, it.k + 1, total).replace('class="slate"', 'class="slate mini"')}<i class="prog"><b></b></i></figure>`).join("")}</div></section>`;
    const it = s.items[0]; if (it.k < skip) return "";
    const fit = it.w / it.h; const k = kindOf(it);
    const label = k === "yt" ? "Play" : k === "play" ? "Open" : k === "film" && it.audio ? "Sound on" : "";
    return `<section class="scr one k-${k}" data-k="${it.k}" style="--a:${fit.toFixed(4)}"${label ? ` data-cur="${label}"` : ""}><div class="fill">${mediaHTML(it, true)}</div>${slateHTML(p, s, it, it.k + 1, total)}${k === "play" ? `<div class="go">${esc(it.stat || "Open")} →</div>` : ""}<i class="prog"><b></b></i></section>`;
  }).join("");
  const nxt = `<section class="scr next"><a href="${nx.page || "#" + nx.slug}" data-cur="Next"><div class="fill">${nx.cover ? (nx.cover.v ? `<video muted loop playsinline preload="none" poster="${nx.cover.i}" data-src="${nx.cover.v}"></video>` : `<img src="${nx.cover.i}" alt="" loading="lazy">`) : ""}</div>
    <div class="title"><span class="dim">Next</span><h1>${esc(nx.title)}</h1><span class="dim">${esc(nx.client)}</span></div></a></section>`;
  view.innerHTML = `<article class="pj" data-slug="${p.slug}">${first}${body}${nxt}</article>`;
  view.scrollTop = 0; fitAll(); wire(p);
}
// pictures fill the screen when they're close to its shape; otherwise they sit whole on black
function fitAll() {
  const sa = innerWidth / innerHeight;
  $$(".scr.one, .scr.open, .scr.next", view).forEach((s) => { const a = +s.style.getPropertyValue("--a"); s.classList.toggle("cover", !a || Math.abs(Math.log(a / sa)) < .22); });
  // rows: as tall as the screen allows without running off the sides (thumbnails sit smaller, with room around them)
  if (innerWidth > 820) $$(".row:not(.strip) .track", view).forEach((tr) => {
    const cells = $$(".cell", tr), A = cells.reduce((t, c) => t + (+c.style.getPropertyValue("--a")), 0), th = tr.closest(".thumbs");
    const gap = th ? 16 : 2, avail = innerWidth - 2 * (th ? 280 : 30) - gap * (cells.length - 1);
    const h = Math.min(innerHeight * (th ? .5 : 1), avail / A); cells.forEach((c) => (c.style.height = h.toFixed(1) + "px"));
  });
}
addEventListener("resize", () => { if (!view.hidden) fitAll(); });

let playing = null;   // the film that's playing with sound
function wire(p) {
  const vis = new IntersectionObserver((es) => es.forEach((e) => {
    const v = $("video", e.target); if (!v) return;
    if (e.isIntersecting && e.intersectionRatio > .55) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); }
    else { v.pause(); if (v === playing?.v && e.intersectionRatio < .2) stopSound(); }
  }), { root: view, threshold: [0, .2, .55, .9] });
  $$(".scr.one, .scr.open, .scr.next, .cell", view).forEach((el) => { if (!el.closest(".strip")) vis.observe(el); });
  // strips scroll sideways: the ones in view play
  $$(".strip .track", view).forEach((tr) => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { const v = $("video", e.target); if (!v) return; if (e.isIntersecting && e.intersectionRatio > .6) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause(); }), { root: tr, threshold: [0, .6] });
    $$(".cell", tr).forEach((c) => io.observe(c));
    // a mouse wheel moves the strip sideways until it reaches the end, then the page carries on
    tr.addEventListener("wheel", (e) => { if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; const max = tr.scrollWidth - tr.clientWidth; if ((e.deltaY > 0 && tr.scrollLeft < max - 2) || (e.deltaY < 0 && tr.scrollLeft > 2)) { e.preventDefault(); tr.scrollLeft += e.deltaY; } }, { passive: false });
  });
  $$(".scr.one, .cell", view).forEach((el) => el.addEventListener("click", () => {
    const it = p.pieces[+el.dataset.k]; if (!it) return;
    if (it.play) { location.href = it.play; return; }
    if (it.yt) { const f = $(".fill", el) || el; f.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${it.yt.id}?autoplay=1&rel=0&modestbranding=1" allow="autoplay; fullscreen" allowfullscreen></iframe>`; el.removeAttribute("data-cur"); return; }
    const v = $("video", el); if (!v || !it.audio) return;
    if (playing?.v === v) { stopSound(); return; }
    stopSound(); if (!v.src) v.src = v.dataset.src; v.currentTime = 0; v.muted = false; v.loop = false; v.play().catch(() => {});
    playing = { v, el }; el.classList.add("live"); el.dataset.cur = "Sound off"; curl.textContent = "Sound off";
    v.onended = () => { stopSound(); v.loop = true; v.play().catch(() => {}); };
  }));
  // scrub: click the line along the bottom
  $$(".prog", view).forEach((pr) => pr.addEventListener("click", (e) => { e.stopPropagation(); const v = $("video", pr.parentElement); if (!v?.duration) return; const r = pr.getBoundingClientRect(); v.currentTime = (e.clientX - r.left) / r.width * v.duration; }));
}
function stopSound() { if (!playing) return; const { v, el } = playing; playing = null; v.muted = true; v.loop = true; el.classList.remove("live"); el.dataset.cur = "Sound on"; if (curl.textContent === "Sound off") curl.textContent = "Sound on"; }

// timecodes and progress lines run off the films themselves
function ticker() {
  if (!home.hidden && cueV) tcEl.textContent = `TC ${tc(cueV.currentTime)}`;
  if (!view.hidden) $$("video", view).forEach((v) => { if (v.paused && v !== playing?.v) return; const box = v.closest(".scr, .cell"); if (!box) return; const t = $(".tcv", box); if (t) t.textContent = tc(v.currentTime); const b = $(".prog b", box); if (b && v.duration) b.style.transform = `scaleX(${(v.currentTime / v.duration).toFixed(4)})`; });
  requestAnimationFrame(ticker);
}
requestAnimationFrame(ticker);

// ---------- routes ----------
function route() {
  let h = decodeURIComponent(location.hash.slice(1));
  if (h === "ai-commissions") { h = "ai-experiments"; history.replaceState(null, "", "#ai-experiments"); }
  const p = LIST.find((q) => q.slug === h);
  if (p && p.page) { location.href = p.page; return; }
  if (h === "about") { history.replaceState(null, "", location.pathname); ctOpen(); return; }
  stopSound();
  if (p) {
    if (!home.hidden) homeY = scrollY;
    home.hidden = true; view.hidden = false; document.body.classList.add("viewing");
    $$("video", bg).forEach((v) => v.pause());
    renderProject(p);
  } else {
    view.hidden = true; view.innerHTML = ""; home.hidden = false; document.body.classList.remove("viewing");
    const i = cueI; cueI = -1; cue(Math.max(0, i));
  }
}
addEventListener("hashchange", route);
document.addEventListener("click", (e) => { const a = e.target.closest("a[data-home]"); if (!a) return; e.preventDefault(); if (location.hash) { history.pushState(null, "", location.pathname); route(); } });
// keys: up and down step through the screens, space plays with sound
addEventListener("keydown", (e) => {
  if (view.hidden || e.metaKey || e.ctrlKey || document.documentElement.matches(".flying,.devouring")) return;
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
  sel: ".list a .t,.list a .n,.list a .k,.info span,.tc,.who,.nav a,.nav button,.brand,.slate span,.title h1,.title span,.title p,.cell,.scr.one .fill",
  letter: ".list a .n",
  loose: ",.list a .k,.slate span,.info span",
  gentle: true,
  anchors: () => { const out = []; $$(".list a .t,.title h1,.cell,.scr.one .fill").forEach((el) => { const q = el.getBoundingClientRect(); if (q.bottom < 0 || q.top > innerHeight || !q.width) return; out.push([q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]); }); return out; },
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
