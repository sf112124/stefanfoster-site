// Synth-folio: the portfolio as a jungle sequencer. You make the music; the music cuts the work together.
import { PROJECTS } from "../projects.js";
import MEDIA from "../media.js";
import { Engine, PRESETS, FILMS, FX, LOOPS, noteName } from "./engine.js";
import { VDJ, globe as mkGlobe, scopes as mkScopes } from "./vdj.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const touch = matchMedia("(hover: none) and (pointer: coarse)").matches;
document.documentElement.classList.toggle("touch", touch);
if (touch) document.getElementById("hint").innerHTML = "TAP <b>PLAY</b> · HIT THE <b>PADS</b> · HOLD THE <b>EFFECTS</b>";
const E = new Engine();
const vdj = new VDJ($("vdj")), G = mkGlobe($("globe")), SC = mkScopes($("scopes"), ["A1", "A2", "A3", "A4", "M1"]);

// ---------------- the crate: every project, every piece in it ----------------
const short = (t) => t.replace(/^Ai /, "AI ").toUpperCase();
const CRATE = PROJECTS.map((p, i) => {
  const lib = MEDIA[p.slug] || {}, base = `media/${p.slug}/`, clips = []; let head = "";
  (p.items || []).forEach((it) => {
    if (it.head) head = it.head; const m = it.file && lib[it.file]; if (!m) return;
    if (m.type === "video") clips.push({ type: "video", url: base + (m.full || m.loop), loop: base + m.loop, thumb: base + (m.node || m.poster), name: it.caption || head || p.title });
    else clips.push({ type: "image", url: base + m.src, loop: base + (m.sm || m.src), thumb: base + (m.node || m.sm), name: head || p.title });
  });
  (p.youtube || []).forEach((y) => clips.push({ type: "yt", id: y.id, name: y.title, thumb: y.thumb ? base + y.thumb : null }));
  const mix = clips.filter((c) => c.type !== "yt").map((c) => ({ type: c.type, url: c.loop }));
  clips.filter((c) => c.type === "yt" && c.thumb).forEach((c) => mix.push({ type: "image", url: c.thumb }));
  return { slug: p.slug, title: p.title, n: i + 1, kind: p.kind, clips, mix, in: mix.length > 0 };
});
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
function renderCrate() {
  crateEl.innerHTML = CRATE.map((c, i) => `<div class="prj" data-i="${i}">
    <div class="row"><button class="in" type="button" aria-pressed="${c.in}" ${c.mix.length ? "" : "disabled title=\"Only on YouTube, so it can be previewed but not mixed\""} aria-label="In the mix"></button>
      <button class="nm" type="button">${String(c.n).padStart(2, "0")} ${esc(short(c.title))}</button><span class="ty">${c.mix.length ? esc(c.kind.split(",")[0].slice(0, 12)) : "WATCH ONLY"}</span></div>
    <div class="clips">${c.clips.map((k, j) => k.type === "yt" ? `<button class="clip yt" type="button" data-j="${j}">▶ ${esc(k.name)}</button>` : `<button class="clip" type="button" data-j="${j}" title="${esc(k.name)}"><canvas width="24" height="32"></canvas><i>${String(j + 1).padStart(2, "0")}</i></button>`).join("")}</div></div>`).join("");
  crateEl.querySelectorAll(".prj").forEach((el) => {
    const c = CRATE[+el.dataset.i];
    el.querySelectorAll(".clip:not(.yt)").forEach((b) => greenThumb(c.clips[+b.dataset.j].thumb, b.querySelector("canvas")));
    el.querySelector(".in").addEventListener("click", (e) => { c.in = !c.in; e.currentTarget.setAttribute("aria-pressed", c.in); syncMix(); });
    el.querySelector(".nm").addEventListener("click", () => preview(c, 0));
    el.querySelectorAll(".clip").forEach((b) => b.addEventListener("click", () => preview(c, +b.dataset.j)));
  });
}
function syncMix() { vdj.setCrate(CRATE.filter((c) => c.in && c.mix.length).map((c) => ({ slug: c.slug, title: c.title, n: c.n, srcs: c.mix }))); }
renderCrate(); syncMix();

// ---------------- previewing, the way you'd audition a sample ----------------
let pv = null;
async function preview(c, j) {
  const k = c.clips[j]; if (!k) return;
  if (pv && pv.c === c && pv.j === j) { stopPreview(); return; }
  stopPreview(true);
  const box = $("pv"); pv = { c, j, k }; box.hidden = false; $("pvbar").hidden = false; $("pvt").textContent = `${String(c.n).padStart(2, "0")} ${short(c.title)} · ${String(j + 1).padStart(2, "0")}`;
  $("samp").hidden = k.type !== "video"; $("samp").textContent = "SAMPLE IT"; $("samp").classList.remove("done");
  crateEl.querySelectorAll(".clip").forEach((b) => b.classList.toggle("on", +b.closest(".prj").dataset.i === CRATE.indexOf(c) && +b.dataset.j === j));
  if (k.type === "yt") box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${k.id}?autoplay=1&rel=0&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${esc(k.name)}"></iframe>`;
  else if (k.type === "image") box.innerHTML = `<img src="${k.url}" alt="">`;
  else {
    await E.ensure(); if (E.ctx.state !== "running") E.ctx.resume();
    const v = document.createElement("video"); Object.assign(v, { src: k.url, playsInline: true, loop: true, autoplay: true }); v.setAttribute("playsinline", "");
    box.innerHTML = ""; box.appendChild(v); E.attachPreview(v); v.play().catch(() => {}); pv.v = v;
  }
  E.duck(true); $("mclip").textContent = k.name;
}
function stopPreview(quiet) {
  if (!pv) return; const box = $("pv"); if (pv.v) { pv.v.pause(); pv.v.removeAttribute("src"); pv.v.load(); }
  box.innerHTML = ""; box.hidden = true; $("pvbar").hidden = true; pv = null; crateEl.querySelectorAll(".clip.on").forEach((b) => b.classList.remove("on"));
  if (!quiet) E.duck(false);
}
$("pvx").addEventListener("click", () => stopPreview());
$("samp").addEventListener("click", async () => {
  if (!pv || !pv.v) return; const i = await E.sample(pv.c.slug), b = $("samp");
  if (i == null) { b.textContent = "NOTHING TO GRAB"; setTimeout(() => (b.textContent = "SAMPLE IT"), 1200); return; }
  yourNames[i] = `${short(pv.c.title).slice(0, 7)} ${E.yours.length}`;
  b.textContent = `ON PAD ${i + 1} · YOURS`; b.classList.add("done"); setTimeout(() => { b.textContent = "SAMPLE IT"; b.classList.remove("done"); }, 1600);
  if (bank === 4) renderPads();
});
const yourNames = [];

// ---------------- pads ----------------
const KEYS = "1234qwerasdfzxcv", BANKS = ["BREAK", "LOOPS", "FILMS", "FX", "YOURS"];
let bank = 0;
$("banks").innerHTML = BANKS.map((b, i) => `<button type="button" data-b="${i}" aria-pressed="${i === bank}">${b}</button>`).join("");
$("banks").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => setBank(+b.dataset.b)));
function setBank(b) { bank = (b + BANKS.length) % BANKS.length; $("banks").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", +x.dataset.b === bank)); renderPads(); }
const padId = (i) => ["b", "l", "f", "x", "y"][bank] + i;
function padName(i) {
  if (bank === 0) return `SLICE ${i.toString(16).toUpperCase()}`;
  if (bank === 1) return LOOPS[i];
  if (bank === 2) return FILMS[i].n;
  if (bank === 3) return FX[i];
  return E.yours[i] ? yourNames[i] || `YOURS ${i + 1}` : "EMPTY";
}
function renderPads() {
  $("pads").innerHTML = Array.from({ length: 16 }, (_, i) => `<button class="pad${bank === 1 ? " loop" : ""}${bank === 4 && !E.yours[i] ? " empty" : ""}" type="button" data-i="${i}"><b>${esc(padName(i))}</b><i>${touch ? "" : KEYS[i].toUpperCase()}${bank === 1 ? ` · ${["BREAK", "BASS", "MUSIC", "PERC"][i >> 2]}` : ""}</i></button>`).join("");
  $("pads").querySelectorAll(".pad").forEach((b) => b.addEventListener("pointerdown", (e) => { e.preventDefault(); hitPad(+b.dataset.i); }));
  loopLights();
}
function lightPad(i) { const b = $("pads").querySelector(`[data-i="${i}"]`); if (!b) return; b.classList.add("lit"); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove("lit"), 110); }
async function hitPad(i) {
  if (bank === 1) { await E.ensure(); E.toggleLoop(i); loopLights(); return; }
  if (bank === 4 && !E.yours[i]) return;
  E.pad(padId(i)); lightPad(i); seen();
}
function loopLights() {
  if (bank !== 1) return;
  $("pads").querySelectorAll(".pad").forEach((b) => { const i = +b.dataset.i, row = i >> 2, p = E.pend[row]; b.classList.toggle("on", E.loops[row] === i); b.classList.toggle("wait", p !== undefined && (p === i || (p === null && E.loops[row] === i))); });
}
renderPads();

// ---------------- the held effects ----------------
const HOLDS = [["repeat", "REPEAT", "6"], ["roll", "ROLL", "7"], ["tape", "TAPE STOP", "8"], ["rev", "REVERSE", "9"], ["freeze", "FREEZE", "0"]];
$("holds").innerHTML = HOLDS.map(([m, n, k]) => `<button class="hold" type="button" data-m="${m}"><b>${n}</b><i>${touch ? "HOLD" : k}</i></button>`).join("");
let held = null;
async function hold(m) { await E.ensure(); if (held === m) return; held = m; E.hold(m); vdj.setMode(m); $("holds").querySelectorAll(".hold").forEach((b) => b.classList.toggle("on", b.dataset.m === m)); $("mmode").textContent = HOLDS.find((h) => h[0] === m)[1]; }
function unhold(m) { if (!held || (m && held !== m)) return; held = null; E.release(); vdj.setMode(null); $("holds").querySelectorAll(".hold").forEach((b) => b.classList.remove("on")); $("mmode").textContent = "M1"; }
$("holds").querySelectorAll(".hold").forEach((b) => {
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); hold(b.dataset.m); });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((t) => b.addEventListener(t, () => unhold(b.dataset.m)));
});

// ---------------- knobs (drag them sideways) ----------------
const RATES = ["1 BAR", "1/2", "1/4", "1/8", "1/16", "1/32", "1/4T"], DESTS = ["FILTER", "PITCH", "CRUSH", "GATE"], SHAPES = ["SINE", "SQUARE", "RAMP"];
const KN = [
  ["filter", "FILTER", -1, 1, 0, (v) => (Math.abs(v) < .02 ? "OPEN" : v < 0 ? `LP ${Math.round(20000 * Math.pow(2, v * 9))}` : `HP ${Math.round(10 * Math.pow(2, v * 10.5))}`), 1],
  ["res", "RESONANCE", 0, 1, .2], ["crush", "CRUSH", 0, 1, 0], ["delay", "DUB DELAY", 0, 1, .12], ["drill", "DRILL", 0, 1, 0, (v) => (v < .01 ? "OFF" : Math.round(v * 100))],
  ["swing", "SWING", 0, 1, 0], ["chaos", "VDJ CHAOS", 0, 1, .55], ["pitch", "BREAK PITCH", -12, 12, 0, (v) => `${v > 0 ? "+" : ""}${Math.round(v)} ST`, 0, 1],
  ["tone", "BASS TONE", 0, 1, .45], ["rate", "LFO RATE", 0, 6, 3, (v) => RATES[v], 0, 1, 1], ["depth", "LFO DEPTH", 0, 1, 0, (v) => (v < .01 ? "OFF" : Math.round(v * 100))],
  ["dest", "LFO TO", 0, 3, 0, (v) => DESTS[v], 0, 1, 1], ["shape", "LFO SHAPE", 0, 2, 0, (v) => SHAPES[v], 0, 1, 1], ["vol", "VOLUME", 0, 1, .75],
];
$("knobs").innerHTML = KN.map(([k, n, , , , , , , cyc]) => `<div class="kn${cyc ? " cyc" : ""}" data-k="${k}"><span class="kl">${n}</span><span class="kb">${"<i></i>".repeat(16)}</span><span class="kv"></span></div>`).join("");
function showKnob(k) {
  const d = KN.find((x) => x[0] === k), [, , lo, hi, , fmt, bip] = d, v = E.k[k], el = $("knobs").querySelector(`[data-k="${k}"]`), f = (v - lo) / (hi - lo);
  el.querySelector(".kv").textContent = fmt ? fmt(v) : Math.round(f * 100);
  el.querySelectorAll(".kb i").forEach((b, i) => { const x = (i + .5) / 16, on = bip ? (f >= .5 ? x >= .5 && x <= f + .03 : x <= .5 && x >= f - .03) : x <= f + .03 && f > .005; b.className = on ? (Math.abs(x - f) < .07 ? "f h" : "f") : ""; });
}
KN.forEach(([k, , lo, hi, def, , , int, cyc]) => {
  const el = $("knobs").querySelector(`[data-k="${k}"]`); let sx = 0, sv = 0, moved = false;
  showKnob(k);
  el.addEventListener("pointerdown", (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); sx = e.clientX; sv = E.k[k]; moved = false; E.ensure(); });
  el.addEventListener("pointermove", (e) => {
    if (!el.hasPointerCapture(e.pointerId)) return; const dx = e.clientX - sx; if (Math.abs(dx) > 3) moved = true; if (!moved) return;
    let v = clamp(sv + (dx / 220) * (hi - lo), lo, hi); if (int) v = Math.round(v); if (v !== E.k[k]) { E.set(k, v); showKnob(k); }
  });
  el.addEventListener("pointerup", () => { if (!moved && cyc) { E.set(k, E.k[k] >= hi ? lo : E.k[k] + 1); showKnob(k); } });
  el.addEventListener("dblclick", () => { E.set(k, def); showKnob(k); });
});

// ---------------- the sequencer ----------------
const LANES = [["kick", "KICK"], ["snare", "SNARE"], ["ghost", "GHOST"], ["hat", "HAT"], ["ohat", "OPEN HAT"]];
const cells = {};
function buildSeq() {
  let h = `<div class="lane steps"><span class="ln">STEP</span>${Array.from({ length: 16 }, (_, s) => `<span class="c" data-s="${s}"></span>`).join("")}<span></span></div>`;
  LANES.forEach(([k, n]) => (h += `<div class="lane" data-l="${k}"><span class="ln">${n}</span>${cellsHtml(k)}<button class="lx" type="button" data-x="${k}">CLEAR</button></div>`));
  h += `<div class="lane gap" data-l="brk"><span class="ln" title="Drag a step up or down to pick a slice. Right-click or long-press to reverse it.">BREAK ↕</span>${cellsHtml("brk")}<button class="lx" type="button" data-x="brk">CLEAR</button></div>`;
  for (let d = 7; d >= 0; d--) h += `<div class="lane bass${d === 7 ? " gap" : ""}" data-l="bass" data-d="${d}"><span class="ln">${d === 7 ? "REESE " : ""}${noteName(d)}</span>${cellsHtml("bass" + d, "b")}${d === 7 ? `<button class="lx" type="button" data-x="bass">CLEAR</button>` : "<span></span>"}</div>`;
  h += `<div class="lane gap" data-l="pads"><span class="ln">PADS (REC)</span>${cellsHtml("pads")}<button class="lx" type="button" data-x="pads">CLEAR</button></div>`;
  $("seq").innerHTML = h;
  $("seq").querySelectorAll(".lane").forEach((ln) => { const key = ln.dataset.l === "bass" ? "bass" + ln.dataset.d : ln.classList.contains("steps") ? "steps" : ln.dataset.l; cells[key] = [...ln.querySelectorAll(".c")]; });
  $("seq").querySelectorAll(".lx").forEach((b) => b.addEventListener("click", () => { const x = b.dataset.x, p = E.pat; if (x === "brk") { p.brk.fill(-1); p.rev.fill(0); } else if (x === "bass") p.bass.fill(-1); else if (x === "pads") p.pads.forEach((a) => (a.length = 0)); else p[x].fill(0); E.cur = E.pat; renderSeq(); }));
  wireSeq();
}
const cellsHtml = (k, cls = "") => Array.from({ length: 16 }, (_, s) => `<button class="c ${cls}${Math.floor(s / 4) % 2 ? " q" : ""}" type="button" data-s="${s}" tabindex="-1"></button>`).join("");
function renderSeq() {
  const p = E.pat;
  LANES.forEach(([k]) => cells[k].forEach((c, s) => c.classList.toggle("on", !!p[k][s])));
  cells.brk.forEach((c, s) => { const on = p.brk[s] >= 0; c.classList.toggle("on", on); c.classList.toggle("rv", on && !!p.rev[s]); c.textContent = on ? p.brk[s].toString(16).toUpperCase() : ""; });
  for (let d = 0; d < 8; d++) cells["bass" + d].forEach((c, s) => c.classList.toggle("on", p.bass[s] === d));
  cells.pads.forEach((c, s) => { const n = p.pads[s].length; c.classList.toggle("on", n > 0); c.textContent = n > 1 ? n : ""; });
}
function wireSeq() {
  let paint = null;
  const at = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.classList.contains("c") && el.closest(".lane:not(.steps)") ? el : null; };
  const apply = (c) => {
    const ln = c.closest(".lane"), l = ln.dataset.l, s = +c.dataset.s, p = E.pat;
    if (LANES.some(([k]) => k === l)) { if (paint.l !== l) return; p[l][s] = paint.v; }
    else if (l === "bass") { const d = +ln.dataset.d; if (paint.l !== "bass") return; if (paint.v) p.bass[s] = d; else if (p.bass[s] === d) p.bass[s] = -1; }
    renderSeq();
  };
  $("seq").addEventListener("pointerdown", (e) => {
    const c = at(e); if (!c) return; e.preventDefault(); E.ensure(); seen();
    const ln = c.closest(".lane"), l = ln.dataset.l, s = +c.dataset.s, p = E.pat;
    if (l === "brk") {
      const y0 = e.clientY, v0 = p.brk[s], wasOn = v0 >= 0; let moved = false;
      if (!wasOn) { p.brk[s] = s; p.rev[s] = 0; renderSeq(); }
      const lp = setTimeout(() => { if (!moved && p.brk[s] >= 0) { p.rev[s] = 1 - p.rev[s]; renderSeq(); moved = true; } }, 480);
      const mv = (ev) => { const dy = y0 - ev.clientY; if (Math.abs(dy) > 5) { moved = true; clearTimeout(lp); p.brk[s] = ((wasOn ? v0 : s) + Math.round(dy / 9)) & 15; renderSeq(); } };
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
  $("seq").addEventListener("contextmenu", (e) => { const c = e.target.closest(".c"); if (!c || c.closest(".lane").dataset.l !== "brk") return; e.preventDefault(); const s = +c.dataset.s; if (E.pat.brk[s] >= 0) { E.pat.rev[s] = 1 - E.pat.rev[s]; renderSeq(); } });
  $("seq").addEventListener("wheel", (e) => { const c = e.target.closest(".c"); if (!c || c.closest(".lane").dataset.l !== "brk") return; const s = +c.dataset.s; if (E.pat.brk[s] < 0) return; e.preventDefault(); E.pat.brk[s] = (E.pat.brk[s] + (e.deltaY < 0 ? 1 : -1)) & 15; renderSeq(); }, { passive: false });
}
buildSeq(); renderSeq();
let nowStep = -1;
function markStep(s) {
  if (nowStep >= 0) Object.values(cells).forEach((r) => r[nowStep] && r[nowStep].classList.remove("now"));
  nowStep = s; if (s >= 0) Object.values(cells).forEach((r) => r[s] && r[s].classList.add("now"));
}

// ---------------- transport and pattern buttons ----------------
async function toggle() {
  seen();
  if (E.playing) { E.stop(); markStep(-1); $("play").setAttribute("aria-pressed", false); $("play").querySelector("span").textContent = "PLAY"; document.body.classList.remove("playing"); return; }
  $("play").setAttribute("aria-pressed", true); $("play").querySelector("span").textContent = "STOP"; document.body.classList.add("playing"); t0 = performance.now();
  await E.play(); loopLights();
}
let t0 = 0;
$("play").addEventListener("click", toggle);
$("rec").addEventListener("click", () => { E.rec = !E.rec; $("rec").setAttribute("aria-pressed", E.rec); });
$("mut").addEventListener("click", () => { E.mutate = !E.mutate; $("mut").setAttribute("aria-pressed", E.mutate); if (!E.mutate) E.cur = E.pat; });
document.querySelectorAll(".pre").forEach((b) => b.addEventListener("click", () => { E.pat = PRESETS[b.dataset.pre](); E.cur = E.pat; renderSeq(); }));
$("clr").addEventListener("click", () => { E.clear(); renderSeq(); });
$("chop").addEventListener("click", () => {
  const p = E.pat; let any = false;
  for (let s = 0; s < 16; s++) { if (p.brk[s] < 0) continue; any = true; const r = Math.random(); p.brk[s] = s % 8 === 0 ? (Math.random() < .7 ? 0 : 4) : r < .35 ? s : r < .55 ? p.brk[Math.max(0, s - 1)] : Math.floor(Math.random() * 16); p.rev[s] = Math.random() < .1 ? 1 : 0; }
  if (!any) for (let s = 0; s < 16; s++) p.brk[s] = Math.floor(Math.random() * 16);
  E.cur = E.pat; renderSeq();
});
$("full").addEventListener("click", () => { const d = document.documentElement; if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else (d.requestFullscreen || d.webkitRequestFullscreen)?.call(d); });
document.addEventListener("fullscreenchange", () => ($("full").textContent = document.fullscreenElement ? "EXIT FULL SCREEN" : "FULL SCREEN"));
function seen() { /* the hint goes once you've touched anything */ $("hint").style.opacity = 0; }

// ---------------- the keyboard ----------------
const HK = Object.fromEntries(HOLDS.map(([m, , k]) => [k, m]));
addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === " ") { e.preventDefault(); if (!e.repeat) toggle(); return; }
  if (e.repeat) return;
  if (k === "escape") { stopPreview(); return; }
  if (k === "arrowright") { setBank(bank + 1); return; }
  if (k === "arrowleft") { setBank(bank - 1); return; }
  if (HK[k]) { hold(HK[k]); return; }
  const i = KEYS.indexOf(k); if (i >= 0) { e.preventDefault(); hitPad(i); }
});
addEventListener("keyup", (e) => { const m = HK[e.key.toLowerCase()]; if (m) unhold(m); });
addEventListener("blur", () => unhold());
// the browser only lets sound start from a touch, so the first one wakes the engine
addEventListener("pointerdown", () => E.ensure(), { once: true, capture: true });

// ---------------- read-outs ----------------
const RD = [["NOTE", "note"], ["TEMPO", "tempo", 1], ["VELOCITY", "vel"], ["BAR", "bar"], ["LEVEL", "lvl"], ["TRACK", "track"], ["LOOPS", "loops"], ["CRATE", "crate"]];
$("read").innerHTML = RD.map(([n, id, drag]) => `<div class="rr${drag ? " drag" : ""}" data-r="${id}"><span>// ${n} _</span><b id="r_${id}"></b></div>`).join("");
{ const el = $("read").querySelector('[data-r="tempo"]'); let sx = 0, sb = 0;
  el.title = "Drag to change the tempo";
  el.addEventListener("pointerdown", (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); sx = e.clientX; sb = E.bpm; });
  el.addEventListener("pointermove", (e) => { if (el.hasPointerCapture(e.pointerId)) E.setBpm(sb + (e.clientX - sx) / 4); });
  el.addEventListener("dblclick", () => E.setBpm(172)); }
const blocks = (v, n = 10) => "▮".repeat(Math.round(clamp(v, 0, 1) * n)) + "▯".repeat(n - Math.round(clamp(v, 0, 1) * n));
const R = { note: "—", vel: 0 };
const lvBuf = new Float32Array(1024);

// ---------------- the loop that keeps the picture on the beat ----------------
function frame(now) {
  requestAnimationFrame(frame);
  const C = E.ctx, at = C ? C.currentTime : 0, sd = E.sd();
  if (C) while (E.q.length && E.q[0].t <= at) {
    const e = E.q.shift();
    vdj.ev(e, E.k.chaos, sd);
    if (e.type === "step") markStep(e.d);
    else if (e.type === "kick") { G.kick(); R.vel = 1; }
    else if (e.type === "snare" || e.type === "ghost" || e.type === "hat") R.vel = Math.max(R.vel * .5, e.d);
    else if (e.type === "bass") { R.note = noteName(e.d.d); G.bass(e.d.d); }
    else if (e.type === "bar") loopLights();
    else if (e.type === "recd") renderSeq();
    else if (e.type === "pad") { const id = e.d.id, b = "blfxy".indexOf(id[0]); if (b === bank) lightPad(+id.slice(1)); }
    else if (e.type === "stop") markStep(-1);
  }
  if (E.q.length > 400) E.q.splice(0, E.q.length - 200);
  R.vel *= .94;
  const st = { playing: E.playing, sd, bpm: E.bpm, chaos: E.k.chaos, crush: E.k.crush, filter: E.k.filter, delay: E.k.delay, lfo: C ? E.lfoAt(at) : 0, depth: E.k.depth, dest: E.k.dest, mono: 1 };
  if (!pv) vdj.draw(now, st);
  G.draw(now, st); SC.draw(E.scopes);
  // the numbers
  let lvl = 0; if (E.out) { E.out.getFloatTimeDomainData(lvBuf); let s = 0; for (let i = 0; i < lvBuf.length; i++) s += lvBuf[i] * lvBuf[i]; lvl = Math.sqrt(s / lvBuf.length) * 3.2; }
  const cur = vdj.cur, el = (id, v) => { const x = $("r_" + id); if (x.textContent !== String(v)) x.textContent = v; };
  el("note", R.note); el("tempo", `${E.bpm} BPM`); el("vel", blocks(R.vel)); el("bar", E.playing ? `${E.bar + 1}.${(E.step + 15) % 16 + 1}` : "—"); el("lvl", blocks(lvl));
  el("track", pv ? short(pv.c.title) : cur ? short(cur.title) : "—"); el("loops", E.loops.filter((l) => l != null).map((l) => LOOPS[l]).join(" ") || "—"); el("crate", `${CRATE.filter((c) => c.in && c.mix.length).length} IN`);
  if (!pv) { $("mproj").textContent = cur ? `PROJECT # ${String(cur.n).padStart(2, "0")}` : "NO SIGNAL"; $("mclip").textContent = cur ? short(cur.title) : ""; }
  const secs = E.playing ? (now - t0) / 1000 : 0; $("mtc").textContent = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(Math.floor(secs) % 60).padStart(2, "0")}:${String(Math.floor((secs % 1) * 24)).padStart(2, "0")}`;
}
requestAnimationFrame(frame);
addEventListener("resize", () => vdj.size());
window.__sf = { E, vdj, CRATE, preview, stopPreview, hitPad, setBank, hold, unhold, toggle };
