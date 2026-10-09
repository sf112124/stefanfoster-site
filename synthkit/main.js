// Synth-folio: the portfolio as a jungle sampler. You play the music; the music blends whatever you throw into the circle.
import { PROJECTS } from "../projects.js";
import MEDIA from "../media.js";
import { Engine, PRESETS, FILMS, FX, LOOPS, LOOPROWS, LGROUP, BREAKS, BASSV, BARPADS, DRUMPADS, noteName } from "./engine.js";
import { Blender, MODES, scopes as mkScopes } from "./vdj.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const touch = matchMedia("(hover: none) and (pointer: coarse)").matches;
document.documentElement.classList.toggle("touch", touch);
const E = new Engine();
const V = new Blender($("vdj")), SC = mkScopes($("scopes"), ["A1", "A2", "A3", "A4", "M1"]);
const seen = () => {};

// ---------------- the crate: every piece of work, ready to throw in ----------------
const short = (t) => t.replace(/^Ai /, "AI ").toUpperCase();
const CRATE = PROJECTS.map((p, i) => {
  const lib = MEDIA[p.slug] || {}, base = `media/${p.slug}/`, clips = [];
  (p.items || []).forEach((it) => {
    const m = it.file && lib[it.file]; if (!m) return;
    if (m.type === "video") clips.push({ type: "video", url: base + m.loop, thumb: base + (m.node || m.poster) });
    else clips.push({ type: "image", url: base + (m.sm || m.src), thumb: base + (m.node || m.sm) });
  });
  (p.youtube || []).forEach((y) => { if (y.thumb) clips.push({ type: "image", url: base + y.thumb, thumb: base + y.thumb }); });
  return { slug: p.slug, title: p.title, n: i + 1, kind: p.kind, clips };
}).filter((c) => c.clips.length);
const crateEl = $("crate");
function greenThumb(url, cv) {
  const im = new Image(); im.onload = () => {
    const w = cv.width, h = cv.height, g = cv.getContext("2d"), a = im.width / im.height, t = w / h; let sw = im.width, sh = im.height, sx = 0, sy = 0;
    if (a > t) { sw = sh * t; sx = (im.width - sw) / 2; } else { sh = sw / t; sy = (im.height - sh) / 2; }
    g.drawImage(im, sx, sy, sw, sh, 0, 0, w, h); const d = g.getImageData(0, 0, w, h), p = d.data, R = [[9, 15, 8], [39, 58, 24], [86, 122, 44], [143, 180, 85], [200, 236, 140]];
    for (let i = 0; i < p.length; i += 4) { const L = (p[i] * .299 + p[i + 1] * .587 + p[i + 2] * .114) / 255, c = R[clamp(Math.round(L * 4.4), 0, 4)]; p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2]; }
    g.putImageData(d, 0, 0);
  }; im.src = url;
}
crateEl.innerHTML = CRATE.map((c, i) => `<div class="prj" data-i="${i}">
  <div class="row"><span class="ty">${String(c.n).padStart(2, "0")}</span><button class="nm" type="button" title="Throw a couple of these in">${esc(short(c.title))}</button><span class="ty">${c.clips.length}</span></div>
  <div class="clips">${c.clips.map((k, j) => `<button class="clip" type="button" draggable="true" data-j="${j}"><canvas width="24" height="32"></canvas><i>${String(j + 1).padStart(2, "0")}</i></button>`).join("")}</div></div>`).join("");
crateEl.querySelectorAll(".prj").forEach((el) => {
  const c = CRATE[+el.dataset.i];
  el.querySelectorAll(".clip").forEach((b) => {
    const k = c.clips[+b.dataset.j]; greenThumb(k.thumb, b.querySelector("canvas"));
    b.addEventListener("click", () => throwIn({ ...k, p: c.slug, name: short(c.title) }));
    b.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/x-sf", JSON.stringify([+el.dataset.i, +b.dataset.j])); e.dataTransfer.effectAllowed = "copy"; });
  });
  el.querySelector(".nm").addEventListener("click", () => { [...c.clips].sort(() => Math.random() - .5).slice(0, 2).forEach((k) => throwIn({ ...k, p: c.slug, name: short(c.title) })); });
});

// ---------------- the circle ----------------
const ring = $("ring");
ring.innerHTML = Array.from({ length: 16 }, (_, s) => { const a = (s / 16) * Math.PI * 2 - Math.PI / 2; return `<i class="${s % 4 === 0 ? "q" : ""}" style="transform:translate(${(Math.cos(a) * 50).toFixed(3)}cqmin,${(Math.sin(a) * 50).toFixed(3)}cqmin)"></i>`; }).join("");
const dots = [...ring.querySelectorAll("i")];
// the step lights sit just inside the rim, wherever the circle is
function placeDots() { const r = $("platter").getBoundingClientRect().width / 2 - 6; dots.forEach((d, s) => { const a = (s / 16) * Math.PI * 2 - Math.PI / 2; d.style.transform = `translate(${(Math.cos(a) * r).toFixed(1)}px,${(Math.sin(a) * r).toFixed(1)}px)`; }); }
placeDots(); addEventListener("resize", placeDots); new ResizeObserver(placeDots).observe($("stage"));
// click and drag in the circle to smear, swirl and dissolve the picture
{ const cv = $("vdj"); cv.style.touchAction = "none"; cv.style.cursor = "crosshair";
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]; };
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); V.poke(x, y, false); V.poke(x, y, true); });
  cv.addEventListener("pointermove", (e) => { if (cv.hasPointerCapture(e.pointerId)) { const [x, y] = pos(e); V.poke(x, y, true); } });
  const up = (e) => { const [x, y] = pos(e); V.poke(x, y, false); }; cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up); }
function throwIn(src) { V.add(src); deck(); document.body.classList.add("has"); }
function deck() {
  $("deck").innerHTML = V.layers.map((L, i) => `<div class="slot${i === V.ia ? " a" : ""}${i === V.ib && V.ib !== V.ia ? " b" : ""}" data-r="${i === V.ia ? "A" : "B"}" data-i="${i}">${L.type === "video" && !L.thumb ? `<video src="${L.url}" muted playsinline autoplay loop></video>` : `<img src="${L.thumb || L.url}" alt="">`}<button class="x" type="button" aria-label="Take it out">×</button></div>`).join("") +
    (V.layers.length < 8 ? `<button class="slot add" type="button" id="addf" title="Add your own images or videos">+</button>` : "");
  $("deck").querySelectorAll(".slot[data-i]").forEach((s) => {
    s.querySelector(".x").addEventListener("click", (e) => { e.stopPropagation(); V.remove(+s.dataset.i); deck(); document.body.classList.toggle("has", V.layers.length > 0); });
    s.addEventListener("click", () => { V.show(+s.dataset.i); deck(); });
  });
  $("addf")?.addEventListener("click", () => $("file").click());
}
deck();
const addFiles = (files) => [...files].forEach((f) => { if (/^(image|video)\//.test(f.type)) throwIn({ type: f.type.startsWith("video") ? "video" : "image", url: URL.createObjectURL(f), own: true, name: f.name.toUpperCase() }); });
$("file").addEventListener("change", (e) => { addFiles(e.target.files); e.target.value = ""; });
{ const mid = $("mid"); let n = 0;
  mid.addEventListener("dragenter", (e) => { e.preventDefault(); n++; mid.classList.add("over"); });
  mid.addEventListener("dragleave", () => { if (--n <= 0) { n = 0; mid.classList.remove("over"); } });
  mid.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; });
  mid.addEventListener("drop", (e) => {
    e.preventDefault(); n = 0; mid.classList.remove("over");
    const sf = e.dataTransfer.getData("text/x-sf"); if (sf) { const [i, j] = JSON.parse(sf), c = CRATE[i]; throwIn({ ...c.clips[j], p: c.slug, name: short(c.title) }); return; }
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  });
}
// modes: auto, or lock one
$("modes").innerHTML = `<button type="button" data-m="-1" aria-pressed="true">AUTO</button>` + MODES.map((m, i) => `<button type="button" data-m="${i}" aria-pressed="false">${m}</button>`).join("");
$("modes").querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => { const m = +b.dataset.m; V.setLock(m < 0 ? null : m); $("modes").querySelectorAll("[data-m]").forEach((x) => x.setAttribute("aria-pressed", x === b)); }));
// looks: switch on as many as you like, they stay on (and they're remembered)
const LOOKS = [["phos", "PHOSPHOR"], ["therm", "THERMAL"], ["mono", "MONO"], ["inv", "INVERT"], ["mirror", "MIRROR"], ["trails", "TRAILS"], ["pix", "PIXEL"], ["post", "POSTER"], ["edge", "EDGES"]];
try { Object.assign(V.look, JSON.parse(localStorage.getItem("sf-looks") || "{}")); } catch (e) {}
$("looks").innerHTML = LOOKS.map(([k, n]) => `<button type="button" data-k="${k}" aria-pressed="${!!V.look[k]}">${n}</button>`).join("");
$("looks").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { const k = b.dataset.k; V.look[k] = V.look[k] ? 0 : 1; b.setAttribute("aria-pressed", !!V.look[k]); try { localStorage.setItem("sf-looks", JSON.stringify(V.look)); } catch (e) {} }));

// ---------------- pads ----------------
const KEYS = "1234qwerasdfzxcv", BANKS = ["LOOPS", "BREAKS", "DRUMS", "FX", "FILMS"], LB = 0;
let bank = 0;
$("banks").innerHTML = BANKS.map((b, i) => `<button type="button" data-b="${i}" aria-pressed="${i === bank}">${b}</button>`).join("");
$("banks").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => setBank(+b.dataset.b)));
function setBank(b) { bank = (b + BANKS.length) % BANKS.length; $("banks").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", +x.dataset.b === bank)); renderPads(); }
const padId = (i) => ["l", "k", "d", "x", "f"][bank] + i;
function padName(i) { return [LOOPS[i], BARPADS[i][0], DRUMPADS[i][0], FX[i], FILMS[i].n][bank]; }
function renderPads() {
  $("pads").innerHTML = Array.from({ length: 16 }, (_, i) => `<button class="pad${bank === LB ? " loop" : ""}${bank === 1 ? " bar" : ""}" type="button" data-i="${i}"><b>${esc(padName(i))}</b><i>${touch ? "" : KEYS[i].toUpperCase()}${bank === LB ? ` · ${LOOPROWS[LGROUP(i)]}` : bank === 1 ? " · 1 BAR" : ""}</i></button>`).join("");
  $("pads").querySelectorAll(".pad").forEach((b) => b.addEventListener("pointerdown", (e) => { e.preventDefault(); hitPad(+b.dataset.i); }));
  loopLights();
}
function lightPad(i) { const b = $("pads").querySelector(`[data-i="${i}"]`); if (!b) return; b.classList.add("lit"); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove("lit"), 110); }
async function hitPad(i) {
  if (bank === LB) { await E.ensure(); E.toggleLoop(i); loopLights(); return; }
  if (bank === 1 && !E.playing) { await E.ensure(); E.bq = i; lightPad(i); toggle(); return; }   // a break on its own starts the clock, and plays from the first bar
  E.pad(padId(i)); lightPad(i);
}
function loopLights() {
  if (bank === 1) { $("pads").querySelectorAll(".pad").forEach((b) => { const i = +b.dataset.i; b.classList.toggle("on", E.bcur === i); b.classList.toggle("wait", E.bq === i); }); return; }
  if (bank !== LB) return;
  $("pads").querySelectorAll(".pad").forEach((b) => { const i = +b.dataset.i, row = LGROUP(i), p = E.pend[row]; b.classList.toggle("on", E.loops[row] === i); b.classList.toggle("wait", p !== undefined && (p === i || (p === null && E.loops[row] === i))); });
}
renderPads();
// ---------------- the DJ controls ----------------
const HOLDS = [["repeat", "REPEAT", "5"], ["roll", "ROLL", "6"], ["mash", "MASHER", "7", 1], ["half", "HALF", "8", 1], ["tape", "TAPE STOP", "9"], ["rev", "REVERSE", "0"], ["freeze", "FREEZE", "t"], ["gate", "GATE", "y", 1]];
$("holds").innerHTML = HOLDS.map(([m, n, k, dj]) => `<button class="hold${dj ? " dj" : ""}" type="button" data-m="${m}"><b>${n}</b><i>${touch ? "HOLD" : k.toUpperCase()}</i></button>`).join("");
let held = null, holdT = 0;
const SEQ = { mash: 1, half: 1 };
async function hold(m) {
  await E.ensure(); if (held === m) return; if (held) unhold(held); held = m;
  let wait = 0; if (SEQ[m]) E.setDJ(m); else if (m === "gate") E.setGate(true); else wait = E.hold(m);
  // the picture waits for the same beat the sound does
  clearTimeout(holdT); if (wait > .01) holdT = setTimeout(() => held === m && V.setHold(m), wait * 1000); else V.setHold(m); $("holds").querySelectorAll(".hold").forEach((b) => b.classList.toggle("on", b.dataset.m === m));
}
function unhold(m) {
  if (!held || (m && held !== m)) return; const h = held; held = null;
  if (SEQ[h]) E.setDJ(null); else if (h === "gate") E.setGate(false); else E.release();
  clearTimeout(holdT); V.setHold(null); $("holds").querySelectorAll(".hold").forEach((b) => b.classList.remove("on"));
}
$("holds").querySelectorAll(".hold").forEach((b) => {
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); hold(b.dataset.m); });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((t) => b.addEventListener(t, () => unhold(b.dataset.m)));
});

// ---------------- knobs ----------------
// ---------------- the six faders: push them, let go, they spring back ----------------
const FADERS = [["filter", "FILTER", -1, "LP", "HP"], ["space", "SPACE", 0], ["echo", "ECHO", 0], ["pitch", "PITCH", -1, "DOWN", "UP"], ["roll", "ROLL", 0], ["flange", "FLANGE", 0]];
$("faders").innerHTML = FADERS.map(([k, n, lo, a, b]) => `<div class="fd${lo < 0 ? " bi" : ""}" data-k="${k}"><span class="fv">${lo < 0 ? b : "MAX"}</span><div class="ftr"><i class="ffill"></i><i class="fcap"></i></div><span class="fv">${lo < 0 ? a : ""}</span><b>${n}</b></div>`).join("");
function drawFader(el, v, lo) { const f = lo < 0 ? (v + 1) / 2 : v, fill = el.querySelector(".ffill"), cap = el.querySelector(".fcap"); cap.style.top = `${(1 - f) * 100}%`; if (lo < 0) { fill.style.top = `${Math.min(f, .5) === f ? 50 : (1 - f) * 100}%`; fill.style.bottom = `${f < .5 ? f * 100 : 50}%`; } else { fill.style.top = `${(1 - f) * 100}%`; fill.style.bottom = "0"; } el.classList.toggle("live", Math.abs(v) > .02); }
FADERS.forEach(([k, , lo]) => {
  const el = $("faders").querySelector(`[data-k="${k}"]`), tr = el.querySelector(".ftr"); let raf = 0;
  const set = (v) => { E.setFx(k, v); drawFader(el, v, lo); if (k === "roll" && (v >= .12) !== !!el._on) { el._on = v >= .12; V.setHold(el._on ? "repeat" : held || null); } };
  const at = (e) => { const r = tr.getBoundingClientRect(), f = clamp(1 - (e.clientY - r.top) / r.height, 0, 1); return lo < 0 ? f * 2 - 1 : f; };
  drawFader(el, 0, lo);
  el.addEventListener("pointerdown", (e) => { e.preventDefault(); cancelAnimationFrame(raf); el.setPointerCapture(e.pointerId); E.ensure().then(() => set(at(e))); });
  el.addEventListener("pointermove", (e) => { if (el.hasPointerCapture(e.pointerId) && E.ctx) set(at(e)); });
  const back = () => { const v0 = E.fx[k], t0 = performance.now(); cancelAnimationFrame(raf); const step = (n) => { const k2 = Math.min(1, (n - t0) / 170), v = v0 * (1 - k2) * (1 - k2); set(Math.abs(v) < .01 ? 0 : v); if (k2 < 1) raf = requestAnimationFrame(step); else set(0); }; raf = requestAnimationFrame(step); };
  el.addEventListener("pointerup", back); el.addEventListener("pointercancel", back);
});

// ---------------- knobs ----------------
const RATES = ["1 BAR", "1/2", "1/4", "1/8", "1/16", "1/32", "1/4T"], DESTS = ["FILTER", "PITCH", "GATE"], SHAPES = ["SINE", "SQUARE", "RAMP"];
const KN = [
  ["react", "PICTURE REACT", 0, 1, .7], ["pitch", "BREAK TUNE", -12, 12, 0, (v) => `${v > 0 ? "+" : ""}${Math.round(v)} ST`, 0, 1],
  ["bassv", "BASS SOUND", 0, 4, 0, (v) => BASSV[v], 0, 1, 1], ["tone", "BASS TONE", 0, 1, .5], ["rate", "LFO RATE", 0, 6, 3, (v) => RATES[v], 0, 1, 1], ["depth", "LFO DEPTH", 0, 1, 0, (v) => (v < .01 ? "OFF" : Math.round(v * 100))],
  ["dest", "LFO TO", 0, 2, 0, (v) => DESTS[v], 0, 1, 1], ["shape", "LFO SHAPE", 0, 2, 0, (v) => SHAPES[v], 0, 1, 1], ["vol", "VOLUME", 0, 1, .7],
];
$("knobs").innerHTML = KN.map(([k, n, , , , , , , cyc]) => `<div class="kn${cyc ? " cyc" : ""}" data-k="${k}"><span class="kl">${n}</span><span class="kb">${"<i></i>".repeat(16)}</span><span class="kv"></span></div>`).join("");
function showKnob(k) {
  const d = KN.find((x) => x[0] === k), [, , lo, hi, , fmt, bip] = d, v = E.k[k], el = $("knobs").querySelector(`[data-k="${k}"]`), f = (v - lo) / (hi - lo);
  el.querySelector(".kv").textContent = fmt ? fmt(v) : Math.round(f * 100);
  el.querySelectorAll(".kb i").forEach((b, i) => { const x = (i + .5) / 16, on = bip ? (f >= .5 ? x >= .5 && x <= f + .03 : x <= .5 && x >= f - .03) : x <= f + .03 && f > .005; b.className = on ? (Math.abs(x - f) < .07 ? "f h" : "f") : ""; });
}
function setK(k, v) { E.set(k, v); if (k === "react") V.react = v; showKnob(k); if (k === "bassv") renderSeqLabels(); }
KN.forEach(([k, , lo, hi, def, , , int, cyc]) => {
  const el = $("knobs").querySelector(`[data-k="${k}"]`); let sx = 0, sv = 0, moved = false;
  showKnob(k);
  el.addEventListener("pointerdown", (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); sx = e.clientX; sv = E.k[k]; moved = false; E.ensure(); });
  el.addEventListener("pointermove", (e) => {
    if (!el.hasPointerCapture(e.pointerId)) return; const dx = e.clientX - sx; if (Math.abs(dx) > 3) moved = true; if (!moved) return;
    let v = clamp(sv + (dx / 220) * (hi - lo), lo, hi); if (int) v = Math.round(v); if (v !== E.k[k]) setK(k, v);
  });
  el.addEventListener("pointerup", () => { if (!moved && cyc) { setK(k, E.k[k] >= hi ? lo : E.k[k] + 1); if (k === "bassv") E.audition("bass", 0); } });
  el.addEventListener("dblclick", () => setK(k, def));
});

// ---------------- the sequencer: you hear every step as you place it ----------------
const LANES = [["kick", "KICK"], ["snare", "SNARE"], ["ghost", "GHOST"], ["hat", "HAT"], ["ohat", "OPEN HAT"]];
const cells = {};
const cellsHtml = (cls = "") => Array.from({ length: 16 }, (_, s) => `<button class="c ${cls}${Math.floor(s / 4) % 2 ? " q" : ""}" type="button" data-s="${s}" tabindex="-1"></button>`).join("");
function buildSeq() {
  let h = `<div class="lane steps"><span class="ln">STEP</span>${Array.from({ length: 16 }, (_, s) => `<span class="c" data-s="${s}"></span>`).join("")}<span></span></div>`;
  LANES.forEach(([k, n]) => (h += `<div class="lane" data-l="${k}"><span class="ln">${n}</span>${cellsHtml()}<button class="lx" type="button" data-x="${k}">CLEAR</button></div>`));
  h += `<div class="lane gap" data-l="brk"><button class="ln lb" type="button" id="brksel" title="Change the break"></button>${cellsHtml()}<button class="lx" type="button" data-x="brk">CLEAR</button></div>`;
  for (let d = 7; d >= 0; d--) h += `<div class="lane bass${d === 7 ? " gap" : ""}" data-l="bass" data-d="${d}">${d === 7 ? `<button class="ln lb" type="button" id="bassel" title="Change the bass"></button>` : `<span class="ln">${noteName(d)}</span>`}${cellsHtml("b")}${d === 7 ? `<button class="lx" type="button" data-x="bass">CLEAR</button>` : "<span></span>"}</div>`;
  $("seq").innerHTML = h;
  $("seq").querySelectorAll(".lane").forEach((ln) => { const key = ln.dataset.l === "bass" ? "bass" + ln.dataset.d : ln.classList.contains("steps") ? "steps" : ln.dataset.l; cells[key] = [...ln.querySelectorAll(".c")]; });
  $("seq").querySelectorAll(".lx").forEach((b) => b.addEventListener("click", () => { const x = b.dataset.x, p = E.pat; if (x === "brk") { p.brk.fill(-1); p.rev.fill(0); } else if (x === "bass") p.bass.fill(-1); else if (x === "pads") p.pads.forEach((a) => (a.length = 0)); else p[x].fill(0); E.cur = E.pat; renderSeq(); }));
  $("brksel").addEventListener("click", () => { E.pat.brkSel = (E.pat.brkSel + 1) % BREAKS.length; E.cur = E.pat; renderSeqLabels(); if (bank === 0) renderPads(); E.audition("brk", 0); });
  $("bassel").addEventListener("click", () => { setK("bassv", (E.k.bassv + 1) % BASSV.length); E.audition("bass", 0); });
  wireSeq(); renderSeqLabels();
}
function renderSeqLabels() { $("brksel").textContent = `${BREAKS[E.pat.brkSel]} ▸`; $("bassel").textContent = `${BASSV[E.k.bassv]} ▸`; }
function renderSeq() {
  const p = E.pat;
  LANES.forEach(([k]) => cells[k].forEach((c, s) => c.classList.toggle("on", !!p[k][s])));
  cells.brk.forEach((c, s) => { const on = p.brk[s] >= 0; c.classList.toggle("on", on); c.classList.toggle("rv", on && !!p.rev[s]); c.textContent = on ? p.brk[s].toString(16).toUpperCase() : ""; });
  for (let d = 0; d < 8; d++) cells["bass" + d].forEach((c, s) => c.classList.toggle("on", p.bass[s] === d));
  renderSeqLabels();
}
function wireSeq() {
  let paint = null;
  const at = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.classList.contains("c") && el.closest(".lane:not(.steps)") ? el : null; };
  const apply = (c) => {
    const ln = c.closest(".lane"), l = ln.dataset.l, s = +c.dataset.s, p = E.pat;
    if (LANES.some(([k]) => k === l)) { if (paint.l !== l || p[l][s] === paint.v) return; p[l][s] = paint.v; if (paint.v) E.audition(l); }
    else if (l === "bass") { const d = +ln.dataset.d; if (paint.l !== "bass") return; if (paint.v) { if (p.bass[s] !== d) { p.bass[s] = d; E.audition("bass", d); } } else if (p.bass[s] === d) p.bass[s] = -1; }
    renderSeq();
  };
  $("seq").addEventListener("pointerdown", (e) => {
    const c = at(e); if (!c) return; e.preventDefault(); E.ensure();
    const ln = c.closest(".lane"), l = ln.dataset.l, s = +c.dataset.s, p = E.pat;
    if (l === "brk") {
      const y0 = e.clientY, v0 = p.brk[s], wasOn = v0 >= 0; let moved = false, last = v0;
      if (!wasOn) { p.brk[s] = s; p.rev[s] = 0; renderSeq(); E.audition("brk", s); last = s; }
      const lp = setTimeout(() => { if (!moved && p.brk[s] >= 0) { p.rev[s] = 1 - p.rev[s]; renderSeq(); E.audition("brk", p.brk[s], p.rev[s]); moved = true; } }, 480);
      const mv = (ev) => { const dy = y0 - ev.clientY; if (Math.abs(dy) > 5) { moved = true; clearTimeout(lp); const v = ((wasOn ? v0 : s) + Math.round(dy / 9)) & 15; if (v !== last) { last = v; p.brk[s] = v; renderSeq(); E.audition("brk", v, p.rev[s]); } } };
      const up = () => { clearTimeout(lp); removeEventListener("pointermove", mv); removeEventListener("pointerup", up); if (wasOn && !moved) { p.brk[s] = -1; p.rev[s] = 0; renderSeq(); } };
      addEventListener("pointermove", mv); addEventListener("pointerup", up); return;
    }
    if (l === "pads") { p.pads[s].length = 0; renderSeq(); return; }
    if (l === "bass") paint = { l, v: p.bass[s] !== +ln.dataset.d };
    else paint = { l, v: p[l][s] ? 0 : 1 };
    apply(c);
    const mv = (ev) => { const cc = at(ev); if (cc) apply(cc); };
    const up = () => { paint = null; removeEventListener("pointermove", mv); removeEventListener("pointerup", up); };
    addEventListener("pointermove", mv); addEventListener("pointerup", up);
  });
  $("seq").addEventListener("contextmenu", (e) => { const c = e.target.closest(".c"); if (!c || c.closest(".lane").dataset.l !== "brk") return; e.preventDefault(); const s = +c.dataset.s; if (E.pat.brk[s] >= 0) { E.pat.rev[s] = 1 - E.pat.rev[s]; renderSeq(); E.audition("brk", E.pat.brk[s], E.pat.rev[s]); } });
  $("seq").addEventListener("wheel", (e) => { const c = e.target.closest(".c"); if (!c || c.closest(".lane").dataset.l !== "brk") return; const s = +c.dataset.s; if (E.pat.brk[s] < 0) return; e.preventDefault(); E.pat.brk[s] = (E.pat.brk[s] + (e.deltaY < 0 ? 1 : -1)) & 15; renderSeq(); E.audition("brk", E.pat.brk[s], E.pat.rev[s]); }, { passive: false });
}
buildSeq(); renderSeq();
let nowStep = -1, nowTick = -1;
function markStep(s) {
  if (nowStep >= 0) Object.values(cells).forEach((r) => r[nowStep] && r[nowStep].classList.remove("now"));
  nowStep = s; if (s >= 0) Object.values(cells).forEach((r) => r[s] && r[s].classList.add("now"));
}
function markTick(m) { if (nowTick >= 0) dots[nowTick].classList.remove("now"); nowTick = m; if (m >= 0) dots[m].classList.add("now"); }

// ---------------- transport ----------------
async function toggle() {
  if (E.playing) { E.stop(); markStep(-1); markTick(-1); $("play").setAttribute("aria-pressed", false); $("play").querySelector("span").textContent = "PLAY"; document.body.classList.remove("playing"); return; }
  $("play").setAttribute("aria-pressed", true); $("play").querySelector("span").textContent = "STOP"; document.body.classList.add("playing");
  await E.play(); loopLights();
}
$("play").addEventListener("click", toggle);

document.querySelectorAll(".pre").forEach((b) => b.addEventListener("click", () => { E.pat = PRESETS[b.dataset.pre](); E.cur = E.pat; renderSeq(); if (bank === 0) renderPads(); }));
$("clr").addEventListener("click", () => { E.clear(); renderSeq(); loopLights(); });
$("chop").addEventListener("click", () => {
  const p = E.pat; let any = false;
  for (let s = 0; s < 16; s++) { if (p.brk[s] < 0) continue; any = true; const r = Math.random(); p.brk[s] = s % 8 === 0 ? (Math.random() < .7 ? 0 : 4) : r < .35 ? s : r < .55 ? p.brk[Math.max(0, s - 1)] : Math.floor(Math.random() * 16); p.rev[s] = Math.random() < .1 ? 1 : 0; }
  if (!any) for (let s = 0; s < 16; s++) p.brk[s] = Math.floor(Math.random() * 16);
  E.cur = E.pat; renderSeq();
});
$("full").addEventListener("click", () => { const d = document.documentElement; if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else (d.requestFullscreen || d.webkitRequestFullscreen)?.call(d); });
document.addEventListener("fullscreenchange", () => ($("full").textContent = document.fullscreenElement ? "EXIT FULL SCREEN" : "FULL SCREEN"));

// ---------------- keyboard ----------------
const HK = Object.fromEntries(HOLDS.map(([m, , k]) => [k, m]));
addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === " ") { e.preventDefault(); if (!e.repeat) toggle(); return; }
  if (e.repeat) return;
  if (k === "arrowright") { setBank(bank + 1); return; }
  if (k === "arrowleft") { setBank(bank - 1); return; }
  if (HK[k]) { hold(HK[k]); return; }
  const i = KEYS.indexOf(k); if (i >= 0) { e.preventDefault(); hitPad(i); }
});
addEventListener("keyup", (e) => { const m = HK[e.key.toLowerCase()]; if (m) unhold(m); });
addEventListener("blur", () => unhold());
addEventListener("pointerdown", () => { if (!E.ctx) $("load").classList.remove("done"); E.ensure().then(() => $("load").classList.add("done")); }, { once: true, capture: true });

// ---------------- read-outs ----------------
const RD = [["TEMPO", "tempo", 1], ["BAR", "bar"], ["NOTE", "note"], ["BREAK", "brk"], ["LOOPS", "loops"], ["BLEND", "mode"], ["LEVEL", "lvl"]];
$("read").innerHTML = RD.map(([n, id, drag]) => `<div class="rr${drag ? " drag" : ""}" data-r="${id}"><span>${n}</span><b id="r_${id}"></b></div>`).join("");
{ const el = $("read").querySelector('[data-r="tempo"]'); let sx = 0, sb = 0;
  el.title = "Drag to change the tempo. Double-click for 172.";
  el.addEventListener("pointerdown", (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); sx = e.clientX; sb = E.bpm; });
  el.addEventListener("pointermove", (e) => { if (el.hasPointerCapture(e.pointerId)) E.setBpm(sb + (e.clientX - sx) / 4); });
  el.addEventListener("dblclick", () => E.setBpm(172)); }
const blocks = (v, n = 8) => "▮".repeat(Math.round(clamp(v, 0, 1) * n)) + "▯".repeat(n - Math.round(clamp(v, 0, 1) * n));
const R = { note: "—" }, lvBuf = new Float32Array(1024), fq = new Uint8Array(512), RX = { lo: 0, mi: 0, hi: 0, mlo: 0, mmi: 0, mhi: 0 };
let lastDeck = "";

// ---------------- the loop that keeps the picture on the beat ----------------
function frame(now) {
  requestAnimationFrame(frame);
  const C = E.ctx, at = C ? C.currentTime : 0, sd = E.sd();
  if (C) while (E.ev.length && E.ev[0].t <= at) {
    const e = E.ev.shift();
    V.ev(e, V.react, sd);
    if (e.type === "step") markStep(e.d);
    else if (e.type === "tick") markTick(e.d);
    else if (e.type === "bass") R.note = noteName(e.d.d);
    else if (e.type === "bar" || e.type === "bq") loopLights();
    else if (e.type === "pad") { const id = e.d.id, b = "lkdxf".indexOf(id[0]); if (b === bank) lightPad(+id.slice(1)); }
    else if (e.type === "stop") { markStep(-1); markTick(-1); }
  }
  if (E.ev.length > 600) E.ev.splice(0, E.ev.length - 300);
  // listen to the actual sound: lows, mids and highs, quick to rise, slower to fall
  if (E.out) {
    E.out.getByteFrequencyData(fq); const band = (a, b) => { let m = 0; for (let i = a; i < b; i++) m += fq[i]; return m / (b - a) / 255; };
    // each band is measured against its own recent average, so the picture moves with hits and drops, not with loudness
    [["lo", band(1, 4)], ["mi", band(5, 60)], ["hi", band(60, 300)]].forEach(([k, x]) => {
      RX["m" + k] += (x - RX["m" + k]) * .025; const d = Math.max(0, x - RX["m" + k] * .9) / Math.max(.12, 1 - RX["m" + k] * .9);
      RX[k] = d > RX[k] ? d : RX[k] * (k === "hi" ? .82 : .9);
    });
  }
  const st = { lo: Math.min(1.2, RX.lo * 2.2), mi: Math.min(1, RX.mi * 2), hi: Math.min(1, RX.hi * 2.5), playing: E.playing, sd, chaos: V.react, crush: 0, fx: E.fx, lfo: C ? E.lfoAt(at) : 0, depth: E.k.depth, dest: E.k.dest };
  V.draw(now, st); SC.draw(E.scopes);
  const dk = `${V.ia}.${V.ib}.${V.layers.length}`; if (dk !== lastDeck) { lastDeck = dk; $("deck").querySelectorAll(".slot[data-i]").forEach((s) => { const i = +s.dataset.i; s.classList.toggle("a", i === V.ia); s.classList.toggle("b", i === V.ib && V.ib !== V.ia); s.dataset.r = i === V.ia ? "A" : "B"; }); }
  let lvl = 0; if (E.out) { E.out.getFloatTimeDomainData(lvBuf); let s = 0; for (let i = 0; i < lvBuf.length; i++) s += lvBuf[i] * lvBuf[i]; lvl = Math.sqrt(s / lvBuf.length) * 3.2; }
  const el = (id, v) => { const x = $("r_" + id); if (x.textContent !== String(v)) x.textContent = v; };
  el("tempo", `${E.bpm}`); el("bar", E.playing ? `${E.bar + 1}.${(E.ms + 15) % 16 + 1}` : "—"); el("note", R.note); el("brk", BREAKS[E.pat.brkSel]);
  el("loops", E.loops.filter((l) => l != null).map((l) => LOOPS[l]).join(" ") || "—"); el("mode", (V.lock == null ? "AUTO " : "") + MODES[V.mode]); el("lvl", blocks(lvl));
}
requestAnimationFrame(frame);
window.__sf = { E, V, CRATE, throwIn, hitPad, setBank, hold, unhold, toggle };
