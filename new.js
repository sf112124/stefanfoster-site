import { PROJECTS, ABOUT } from "./projects.js";
import MEDIA from "./media.js";
import { Crawler } from "./crawler.js";
import { Sound } from "./sound.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, "0");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const touch = matchMedia("(hover: none)").matches;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const url = (slug, f) => `media/${slug}/${f}`;
const sound = new Sound();
addEventListener("pointerdown", () => sound.unlock(), { once: true });

// ---------- the work, resolved to files (same order as projects.js) ----------
PROJECTS.forEach((p, pi) => {
  const lib = MEDIA[p.slug] || {};
  let sec = null;
  p.pieces = [];
  (p.youtube || []).forEach((y) => { const th = y.thumb ? url(p.slug, y.thumb) : `https://i.ytimg.com/vi/${y.id}/hqdefault.jpg`; p.pieces.push({ pi, yt: y, w: 16, h: 9, caption: y.title, stat: y.note, thumb: th }); });
  p.items.forEach((it) => {
    if (it.head) { sec = it; return; }
    if (it.play) { p.pieces.push({ pi, sec, play: it.play, w: 16, h: 10, caption: it.caption, stat: `${it.note} →`, thumb: url(p.slug, it.img) }); return; }
    const m = lib[it.file]; if (!m) return;
    const x = { ...m, ...it, pi, sec };
    x.thumb = url(p.slug, m.type === "video" ? m.poster : m.sm);
    x.still = url(p.slug, m.type === "video" ? m.poster : m.src || m.sm);
    if (m.type === "video") { x.loop = url(p.slug, m.loop); x.film = url(p.slug, m.full || m.loop); }
    p.pieces.push(x);
  });
  // one moving picture to stand for the project
  if (p.slug === "les-benjamins") p.cover = { v: "media/les-benjamins/banner.mp4", i: "media/les-benjamins/banner-poster.jpg", ar: "16/9" };
  else { const c = p.pieces.find((x) => x.loop) || p.pieces[0]; if (c) p.cover = { v: c.loop, i: c.thumb, ar: `${c.w}/${c.h}` }; }
});

// letters, each in its own box (words kept together so lines only break between words)
const letters = (t, wrap = (c) => c) => { let k = 0; return t.split(" ").map((w) => `<span class="wd">${[...w].map((c) => `<span class="c" style="--k:${k++}">${wrap(esc(c))}</span>`).join("")}</span>`).join(`<span class="sp"> </span>`); };

// ---------- the dot ----------
const cur = $("#cur"), curl = $("#curl");
let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
if (!touch) {
  document.documentElement.classList.add("dotc");
  addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  addEventListener("pointerdown", () => cur.classList.add("down")); addEventListener("pointerup", () => cur.classList.remove("down"));
  document.addEventListener("pointerover", (e) => {
    const big = e.target.closest?.("[data-cur]"), link = e.target.closest?.("a,button");
    cur.classList.toggle("big", !!big); cur.classList.toggle("link", !big && !!link);
    if (big) curl.textContent = big.dataset.cur;
  });
}

// ---------- home ----------
// the index: names stacked big and tight down the middle. Hover one and a black band runs across the page
// behind it, with two pictures from the project either side.
const idx = $("#idx");
const media = (x) => x && (x.v ? `<video muted loop playsinline preload="none" poster="${x.i}" data-src="${x.v}"></video>` : `<img src="${x.i}" alt="" loading="lazy"${x.pos ? ` style="object-position:${x.pos}"` : ""}>`);
PROJECTS.forEach((p, i) => {
  const a = document.createElement("a");
  a.className = "nm"; a.href = p.page ? p.page : `#${p.slug}`;
  const HOV = { "coca-cola": [{ i: "media/coca-cola/hover-1.jpg" }, { i: "media/coca-cola/hover-2.jpg" }], gumtree: [{ i: "media/gumtree/hover-1.jpg" }, { i: "media/gumtree/hover-2.jpg", pos: "30% 50%" }] }[p.slug];
  const one = HOV ? HOV[0] : p.cover;
  const two = HOV ? HOV[1] : p.slug === "les-benjamins" ? { i: "media/les-benjamins/kv-green-s-sm.jpg" } : (() => { const q = p.pieces.filter((x) => !x.play)[1]; return q && { v: q.loop, i: q.thumb }; })();
  a.innerHTML = `<span class="k">${esc(p.client)}</span><span class="t">${[...p.title].map((ch) => ch === " " ? " " : `<i>${esc(ch)}</i>`).join("")}</span>
    <span class="pa">${media(one) || ""}</span>${two ? `<span class="pb">${media(two)}</span>` : ""}`;
  idx.appendChild(a);
  a.addEventListener("mouseenter", () => {
    sound.tick?.(.4 + i * .05, .02);
    $$("video", a).forEach((v) => { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); });
  });
  a.addEventListener("mouseleave", () => $$("video", a).forEach((v) => v.pause()));
});

// the names fill the screen top to bottom, as big as they can be without running off the sides
const nms = $$(".nm"), fitIdx = () => {
  const VW = document.documentElement.clientWidth;
  const ts = nms.map((n) => $(".t", n)); ts.forEach((t) => (t.style.fontSize = "100px"));
  const wide = Math.max(...nms.map((n) => (VW < 820 ? 0 : n.firstElementChild.offsetWidth) + $(".t", n).offsetWidth));
  const byW = 100 * VW * (VW < 820 ? .92 : .9) / wide, byH = (innerHeight - (VW < 820 ? 70 : 4)) / (nms.length * (VW < 820 ? 1.3 : .74));
  const fs = Math.min(byW, byH), k = VW < 820 ? 1 : Math.min(1.45, byH / fs);
  // when the screen is wider than the list wants, the letters stretch taller so the names still run top to bottom
  ts.forEach((t) => { t.style.fontSize = `${fs.toFixed(1)}px`; t.style.transform = k > 1.01 ? `scaleY(${k.toFixed(3)})` : ""; t.style.transformOrigin = "50% 0"; });
  nms.forEach((n) => (n.style.height = k > 1.01 ? `${(fs * .74 * k).toFixed(1)}px` : ""));
};
fitIdx(); document.fonts.ready.then(fitIdx); addEventListener("resize", fitIdx);
// variable type: letters thin out as the cursor passes, then fill back in
const LET = $$(".nm .t i");

// arrivals
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
const watch = (root = document) => $$("[data-r]", root).forEach((el, k) => { el.style.transitionDelay = `${(k % 4) * 70}ms`; io.observe(el); });
watch();

// ---------- one loop for everything that moves ----------
let px = mx, py = my, pvx = 0, t0 = performance.now();
function frame(now) {
  const t = (now - t0) / 1000;
  // dot
  cx = lerp(cx, mx, .2); cy = lerp(cy, my, .2);
  cur.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
  // preview trails the hand under the titles, leaning into its speed
  if (!touch) {
    const nx = lerp(px, mx, .1); pvx = nx - px; px = nx; py = lerp(py, my, .1);
    const w = pv.offsetWidth, h = pv.offsetHeight;
    pv.style.transform = `translate3d(${(px - w / 2).toFixed(1)}px,${(py - h / 2).toFixed(1)}px,0) rotate(${clamp(pvx * .3, -7, 7).toFixed(2)}deg)`;
  }
  if (!home.hidden && !touch && !reduce) {
    const R = innerWidth * .2;
    LET.forEach((el) => { const r = el.getBoundingClientRect(); if (r.bottom < -50 || r.top > innerHeight + 50) return;
      const d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy), k = Math.max(0, 1 - d / R), e = k * k * (3 - 2 * k);
      const w = Math.round(720 - e * 520); if (el._w !== w) { el._w = w; el.style.fontVariationSettings = `"wght" ${w}`; } });
  }
  // phones: whichever name sits in the middle of the screen gets the band
  if (!home.hidden && touch) { let best = null, bd = 1e9; nms.forEach((n) => { const r = n.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - innerHeight * .5); if (d < bd) { bd = d; best = n; } }); nms.forEach((n) => n.classList.toggle("on", n === best)); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- pages ----------
const home = $("#home"), view = $("#view");
let homeY = 0;
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  const p = PROJECTS.find((q) => q.slug === h);
  if (p && p.page) { location.href = p.page; return; }
  if (h === "about") { history.replaceState(null, "", location.pathname); ctOpen(); return; }
  if (p) {
    if (home.hidden === false) homeY = scrollY;
    home.hidden = true; view.hidden = false; document.body.classList.add("viewing");
    renderProject(PROJECTS.indexOf(p));
    scrollTo(0, 0);
  } else {
    view.hidden = true; view.innerHTML = ""; home.hidden = false; document.body.classList.remove("viewing");
    if (h === "work" || h === "contact") $("#" + h).scrollIntoView({ behavior: "smooth" });
    else scrollTo(0, homeY);
  }
}
addEventListener("hashchange", route);
document.addEventListener("click", (e) => {
  const a = e.target.closest("a"); if (!a) return;
  if (a.matches("[data-home]") || a.matches(".totop")) { e.preventDefault(); if (location.hash) { homeY = 0; history.pushState(null, "", location.pathname); route(); } scrollTo({ top: 0, behavior: "smooth" }); }
  else if (a.dataset.scroll) { e.preventDefault(); const go = () => $("#" + a.dataset.scroll).scrollIntoView({ behavior: "smooth" }); if (!home.hidden || a.dataset.scroll === "contact") go(); else { history.pushState(null, "", location.pathname); route(); setTimeout(go, 50); } }
});

function tileHTML(it, k) {
  const media = it.yt || it.play ? `<img src="${it.thumb}" alt="" loading="lazy">${it.yt ? `<i class="play"></i>` : ""}`
    : it.loop ? `<img src="${it.thumb}" alt="" loading="lazy"><video muted loop playsinline preload="none" data-src="${it.loop}"></video>`
    : `<img src="${it.still || it.thumb}" alt="" loading="lazy">`;
  const label = it.play ? "Play" : it.yt || it.film ? "Watch" : "Open";
  return `<figure class="tile" data-k="${k}" data-cur="${label}" style="--a:${(it.w / it.h).toFixed(4)}">
    <div class="tm">${media}</div>
    <figcaption class="mono"><span>${pad(k + 1)}</span>${it.caption ? `<b>${esc(it.caption)}</b>` : ""}${it.stat ? `<em>${esc(it.stat)}</em>` : ""}</figcaption></figure>`;
}
function renderProject(i) {
  const p = PROJECTS[i], nx = PROJECTS[(i + 1) % PROJECTS.length];
  const groups = [];
  p.pieces.forEach((it) => { const g = groups[groups.length - 1]; if (!g || g.sec !== it.sec) groups.push({ sec: it.sec, items: [it] }); else g.items.push(it); });
  let n = 0;
  const body = groups.map((g, gi) => {
    const solo = g.items.length === 1, even = !solo && p.layout === "gallery-2", cols = !solo && g.items.every((x) => x.w / x.h < .8);
    return `<section class="grp">
      ${g.sec ? `<div class="gh"><h2>${esc(g.sec.head)}</h2>${g.sec.text ? `<p>${esc(g.sec.text)}</p>` : ""}</div>` : ""}
      <div class="gm${p.layout ? " big" : solo ? " solo" : ""}${!p.layout && cols ? " cols" : ""}" style="--n:${Math.min(g.items.length, 4)}">${g.items.map((it) => tileHTML(it, n++)).join("")}</div></section>`;
  }).join("");
  view.innerHTML = `<article class="pj" id="pj">
    <div class="pj-meta mono"><span>${esc(p.client)}</span></div>
    <h1 class="pj-t">${letters(p.title).replace(/<span class="c" (style="--k:\d+")>(.*?)<\/span>/g, `<span class="clip"><span class="c" $1>$2</span></span>`)}</h1>
    ${p.blurb ? `<div class="pj-lead"><p data-r>${esc(p.blurb)}</p></div>` : `<div class="pj-lead"></div>`}
    ${body}
    <a class="nxp" href="${nx.page || "#" + nx.slug}" data-cur="Next"><span class="t"><small>Next</small> ${esc(nx.title)} <i>→</i></span></a>
  </article>`;
  requestAnimationFrame(() => requestAnimationFrame(() => $("#pj").classList.add("in")));
  watch(view); wireTiles(p); justify();
}
const tio = new IntersectionObserver((es) => es.forEach((e) => {
  const v = $("video", e.target);
  if (e.isIntersecting) { e.target.classList.add("in"); if (v) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } }
  else v?.pause();
}), { threshold: .15 });
function wireTiles(p) {
  $$(".tile", view).forEach((t) => {
    tio.observe(t);
    t.addEventListener("click", () => { const it = p.pieces[+t.dataset.k]; if (it.play) { location.href = it.play; return; } lbOpen(p, +t.dataset.k); });
  });
}
function renderAbout() {
  const a = ABOUT;
  view.innerHTML = `<article class="ab pj" id="pj">
    <div class="pj-meta mono"><span></span><a href="#" data-home>← Index</a></div>
    <h1 class="pj-t">${letters(a.name).replace(/<span class="c" (style="--k:\d+")>(.*?)<\/span>/g, `<span class="clip"><span class="c" $1>$2</span></span>`)}</h1>
    <div class="ab-g"><p class="big" data-r>${esc(a.role)}${a.line ? " " + esc(a.line) : ""}</p>
      <div class="ab-l">
        <div data-r><p class="mono">Get in touch</p><a href="mailto:${a.email}">${esc(a.email)}</a>${a.socials.map((x) => `<a href="${x.url}" target="_blank" rel="noopener">${esc(x.label)} ↗</a>`).join("")}</div>
        <div data-r><p class="mono">Currently at</p>${a.now.map((x) => `<span>${esc(x)}</span>`).join("")}</div>
        <div data-r><p class="mono">Previously at</p>${a.before.map((x) => `<span>${esc(x)}</span>`).join("")}</div>
      </div></div>
  </article>`;
  requestAnimationFrame(() => requestAnimationFrame(() => $("#pj").classList.add("in")));
  watch(view);
}

// galleries: rows of pictures at their own shapes, as tall as the screen allows, edges flush
function justify() {
  $$(".gm.big", view).forEach((row) => {
    const tiles = [...row.children], W = row.clientWidth, gap = parseFloat(getComputedStyle(row).columnGap) || 12;
    const A = (t) => +t.style.getPropertyValue("--a"), hOf = (ts) => (W - gap * (ts.length - 1) - 1) / ts.reduce((a, t) => a + A(t), 0);
    const size = (t, h) => { t.style.width = `${(A(t) * h).toFixed(1)}px`; };
    if (innerWidth < 820) { tiles.forEach((t) => (t.style.width = "100%")); return; }
    const maxH = innerHeight * .8;
    for (let k = 0; k < tiles.length;) {
      const line = [tiles[k++]];
      while (k < tiles.length && hOf(line) > maxH && hOf([...line, tiles[k]]) >= maxH * .6) line.push(tiles[k++]);
      const h = Math.min(hOf(line), maxH); line.forEach((t) => size(t, h));
    }
  });
}
addEventListener("resize", () => { if (!view.hidden) justify(); });

// ---------- lightbox ----------
const lb = $("#lb"), lbs = $("#lbs");
let lbp = null, lbk = -1;
function lbOpen(p, k) { lbp = p; lbk = k; lb.hidden = false; lbShow(); }
function lbShow() {
  const it = lbp.pieces[lbk];
  lbs.innerHTML = it.yt ? `<iframe src="https://www.youtube-nocookie.com/embed/${it.yt.id}?autoplay=1&rel=0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
    : it.film ? `<video src="${it.film}" poster="${it.thumb}" controls autoplay playsinline></video>` : `<img src="${it.still || it.thumb}" alt="">`;
  $("#lbn").textContent = `${pad(lbk + 1)} / ${pad(lbp.pieces.length)}`;
  $("#lbc").textContent = [it.caption, it.stat].filter(Boolean).join("  ·  ");
}
const lbClose = () => { lb.hidden = true; lbs.innerHTML = ""; };
const lbStep = (d) => { const n = lbp.pieces.length; let k = lbk; do { k = (k + d + n) % n; } while (lbp.pieces[k].play && k !== lbk); lbk = k; lbShow(); };
$("#lbx").onclick = lbClose; $("#lbp").onclick = () => lbStep(-1); $("#lbnx").onclick = () => lbStep(1);
addEventListener("keydown", (e) => { if (lb.hidden) return; if (e.key === "Escape") lbClose(); if (e.key === "ArrowRight") lbStep(1); if (e.key === "ArrowLeft") lbStep(-1); });

// ---------- the thing in the hole, and the ship ----------
const crawler = new Crawler({
  holes: [$("#hole")], pads: [$("#pad")], reduce,
  sfx: (k, a, b) => sound.critter(k, a, b),
  sel: ".nm .t,.nm .k,.pj-t .c,.gh h2,.tile,.tile figcaption,.nav a,.brand,.fcols a,.fcols span,.lead2",
  letter: ".pj-t .c",
  loose: ",.tile figcaption,.nm .k",
  gentle: true,
  anchors: () => {
    const out = [];
    $$(".nm .t,.tile .tm,.pj-t .wd,.lead2").forEach((el) => { const q = el.getBoundingClientRect(); if (q.bottom < 0 || q.top > innerHeight || !q.width) return; out.push([q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]); });
    return out;
  },
});

// the spider lives in the page: scroll and it's carried away with the content, then chases you back
{ let ly = scrollY; addEventListener("scroll", () => { const dy = scrollY - ly; ly = scrollY; if (dy && !jumping) crawler.shift(0, -dy); }, { passive: true }); }
let jumping = false;
const leapIn = () => { jumping = true; setTimeout(() => { jumping = false; crawler.leap("bottom"); }, 60); };
addEventListener("hashchange", leapIn);

// contact: a card that pops out over the page and tilts towards your hand
const ct = $("#ct"), card = $("#ctCard");
let ctOn = false, tx = 0, ty = 0, rx = 0, ry = 0;
function ctOpen() { ct.hidden = false; requestAnimationFrame(() => ct.classList.add("on")); ctOn = true; tilt(); }
function ctClose() { ct.classList.remove("on"); ctOn = false; setTimeout(() => { if (!ctOn) ct.hidden = true; }, 450); }
$("#ctBtn").onclick = ctOpen; $("#ctX").onclick = ctClose;
ct.addEventListener("click", (e) => { if (e.target === ct) ctClose(); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && ctOn) ctClose(); });
addEventListener("pointermove", (e) => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
function tilt() {
  if (!ctOn) return;
  rx += (ty * -14 - rx) * .08; ry += (tx * 18 - ry) * .08;
  card.style.transform = `perspective(1100px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  card.style.setProperty("--sx", `${(50 + tx * 90).toFixed(1)}%`); card.style.setProperty("--sy", `${(50 + ty * 90).toFixed(1)}%`);
  requestAnimationFrame(tilt);
}

route();
