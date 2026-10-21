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
  document.documentElement.classList.add("dot");
  addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  addEventListener("pointerdown", () => cur.classList.add("down")); addEventListener("pointerup", () => cur.classList.remove("down"));
  document.addEventListener("pointerover", (e) => {
    const big = e.target.closest?.("[data-cur]"), link = e.target.closest?.("a,button");
    cur.classList.toggle("big", !!big); cur.classList.toggle("link", !big && !!link);
    if (big) curl.textContent = big.dataset.cur;
  });
}

// ---------- home ----------
const name = $("#name");
name.innerHTML = letters("Stefan Foster");
const nameC = $$(".c", name).map((el) => ({ el, x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0 }));
const chrome = $("#chrome video");
// the name fills the width exactly, whatever the screen
const fitName = () => { name.style.fontSize = "100px"; const w = name.parentElement.clientWidth - 2 * parseFloat(getComputedStyle(name.parentElement).paddingLeft); name.style.fontSize = `${(100 * w / name.scrollWidth * .995).toFixed(2)}px`; };
fitName(); document.fonts.ready.then(fitName); addEventListener("resize", fitName);

// statement: each word lights as you read down
const stmt = $("#stmt");
stmt.innerHTML = stmt.innerHTML.replace(/(<em>.*?<\/em>)|([^\s<]+)/g, (m, em) => `<span class="w">${m}</span>`);
const words = $$(".w", stmt);

// marquee of clients
const mq = $("#mq");
const CL = ["Apple", "Jacquemus", "Coca-Cola", "Les Benjamins", "Gumtree", "Apple", "Jacquemus", "Coca-Cola", "Les Benjamins", "Gumtree"];
mq.innerHTML = [...CL, ...CL].map((c) => `<span>${c}</span>`).join("");
let mqx = 0, lastY = scrollY, vel = 0;

// the index
const idx = $("#idx"), fr = $("#fr"), pv = $("#pv");
$("#count").textContent = `(${pad(PROJECTS.length)})`;
PROJECTS.forEach((p, i) => {
  const a = document.createElement("a");
  a.className = "row"; a.href = p.page ? p.page : `#${p.slug}`; a.dataset.cur = "View";
  a.innerHTML = `<span class="n mono">${pad(i + 1)}</span><span class="tt">${letters(p.title, (c) => `<b>${c}</b>`)}</span>
    <span class="c2 mono">${esc(p.client)}</span><span class="k mono">${esc(p.kind || "")}</span>
    ${p.cover ? `<img class="thumb" src="${p.cover.i}" alt="" loading="lazy">` : ""}<i class="bar"></i>`;
  idx.appendChild(a);
  if (p.cover) {
    const el = p.cover.v ? Object.assign(document.createElement("video"), { muted: true, loop: true, playsInline: true, preload: "none", poster: p.cover.i }) : document.createElement("img");
    el.dataset.src = p.cover.v || p.cover.i; fr.appendChild(el); p.cover.el = el;
  }
  a.addEventListener("mouseenter", () => {
    if (touch) return;
    idx.classList.add("on"); a.classList.add("hot");
    sound.tick?.(.4 + i * .05, .02);
    const c = p.cover; if (!c) return;
    if (!c.el.src) c.el.src = c.el.dataset.src;
    $$("video,img", fr).forEach((v) => v !== c.el && (v.classList.remove("cur2"), v.pause?.()));
    c.el.classList.add("cur2"); c.el.play?.().catch(() => {});
    fr.style.setProperty("--ar", c.ar); pv.classList.add("show");
  });
  a.addEventListener("mouseleave", () => { a.classList.remove("hot"); idx.classList.remove("on"); pv.classList.remove("show"); });
});

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
  // scroll speed feeds the marquee
  const dy = scrollY - lastY; lastY = scrollY; vel = lerp(vel, dy, .1);
  if (!home.hidden) {
    mqx -= (1.1 + Math.abs(vel) * .35) * (vel < -.5 ? -1 : 1);
    const half = mq.scrollWidth / 2; if (half) { if (mqx < -half) mqx += half; if (mqx > 0) mqx -= half; }
    mq.style.transform = `translate3d(${mqx.toFixed(1)}px,0,0)`;
    // the name: letters lean away from the dot, then spring home. Push hard and they spin.
    const game = document.documentElement.matches(".crawling,.flying");
    if (!touch && !reduce && !game) nameC.forEach((L) => {
      const r = L.el.getBoundingClientRect(), lx = r.left + r.width / 2 - L.x, ly = r.top + r.height / 2 - L.y;
      const ddx = lx - cx, ddy = ly - cy, d = Math.hypot(ddx, ddy), R = innerWidth * .11;
      if (d < R) { const f = (1 - d / R) ** 2 * 1.4; L.vx += ddx / (d || 1) * f; L.vy += ddy / (d || 1) * f; L.vr += (ddx > 0 ? 1 : -1) * f * .12; }
      L.vx += -L.x * .045; L.vy += -L.y * .045; L.vr += -L.r * .04;
      L.vx *= .86; L.vy *= .86; L.vr *= .88; L.x += L.vx; L.y += L.vy; L.r += L.vr;
      L.el.style.transform = `translate(${L.x.toFixed(1)}px,${L.y.toFixed(1)}px) rotate(${L.r.toFixed(1)}deg)`;
    });
    // the chrome turns towards you and drifts as you scroll away from it
    const hx = mx / innerWidth - .5, hy = my / innerHeight - .5;
    chrome.style.transform = `translateY(${(scrollY * -.2).toFixed(1)}px)`;
    // statement words light along a reading line
    const H = innerHeight, sr = stmt.getBoundingClientRect(), k = clamp((H * .8 - sr.top) / (sr.height + H * .25)), n = words.length;
  }
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
  if (p || h === "about") {
    if (home.hidden === false) homeY = scrollY;
    home.hidden = true; view.hidden = false; document.body.classList.add("viewing");
    p ? renderProject(PROJECTS.indexOf(p)) : renderAbout();
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
      ${g.sec ? `<div class="gh"><span class="lbl mono">(${pad(gi + 1)})</span><h2>${esc(g.sec.head)}</h2>${g.sec.text ? `<p>${esc(g.sec.text)}</p>` : ""}</div>` : ""}
      <div class="gm${p.layout ? " big" : solo ? " solo" : ""}${!p.layout && cols ? " cols" : ""}" style="--n:${Math.min(g.items.length, 4)}">${g.items.map((it) => tileHTML(it, n++)).join("")}</div></section>`;
  }).join("");
  view.innerHTML = `<article class="pj" id="pj">
    <div class="pj-meta mono"><span>(${pad(i + 1)}/${pad(PROJECTS.length)})</span><span>${esc(p.client)}</span><span>${esc(p.kind || "")}</span><a href="#" data-home><span class="roll" data-t="← Index">← Index</span></a></div>
    <h1 class="pj-t">${letters(p.title).replace(/<span class="c" (style="--k:\d+")>(.*?)<\/span>/g, `<span class="clip"><span class="c" $1>$2</span></span>`)}</h1>
    ${p.blurb ? `<div class="pj-lead"><span class="lbl mono" data-r>(Brief)</span><p data-r>${esc(p.blurb)}</p></div>` : `<div class="pj-lead"></div>`}
    ${body}
    <a class="nxp" href="${nx.page || "#" + nx.slug}" data-cur="Next"><span class="lbl mono">(Next project)</span><span class="t">${esc(nx.title)} <i>→</i></span></a>
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
    <div class="pj-meta mono"><span>(About)</span><span>${esc(a.role)}</span><span>London</span><a href="#" data-home><span class="roll" data-t="← Index">← Index</span></a></div>
    <h1 class="pj-t">${letters(a.name).replace(/<span class="c" (style="--k:\d+")>(.*?)<\/span>/g, `<span class="clip"><span class="c" $1>$2</span></span>`)}</h1>
    <div class="ab-g"><span class="lbl mono" data-r>(Hello)</span><p class="big" data-r>${esc(a.role)} <em>${esc(a.line)}</em></p>
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
new Crawler({
  holes: [$("#hole")], pads: [$("#pad")], reduce,
  sfx: (k, a, b) => sound.critter(k, a, b),
  sel: ".name .c,.row .tt .c,.row .c2,.row .k,.row .n,.big .w,.lbl,.nav a,.brand,.mq span,.pj-t .c,.gh h2,.gh p,.pj-lead p,.tile,.tile figcaption,.cta,.mail,.fcols a,.nxp .t,.ab-l a,.ab-l span,.hero-meta span",
  letter: ".name .c,.row .tt .c,.pj-t .c",
  loose: ",.tile figcaption,.big .w,.row .c2",
  anchors: () => {
    const out = [];
    $$(".name .c,.row,.tile .tm,.pj-t .wd,.big .w,.cta").forEach((el) => { const q = el.getBoundingClientRect(); if (q.bottom < 0 || q.top > innerHeight || !q.width) return; out.push([q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]); });
    return out;
  },
});

route();
