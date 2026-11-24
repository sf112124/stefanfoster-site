// art.js — the authored pencil / ink drawing kit for the study.
// Everything on a sleeve, a poster, the investigation wall and the paper stacks is DRAWN here with canvas strokes:
// wobbly ink lines, pencil hatching, paper grain and hand lettering. Nothing is a screenshot or a traced film frame.
// A motif is an interpretation of a tape's TITLE (or of its published clip titles) — never a claim about a plot.

export const rng = (s) => () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const hash = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h) + 1; };
export const HAND = '"Bradley Hand","Segoe Print","Segoe Script","Chalkboard SE","Comic Sans MS","Comic Neue",cursive';
const INK = "#1d1a16", GR = "#5b564d", RED = "#a3231b";
const rect = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];

export function paper(c, w, h, tone = "#efe6d0", seed = 1) {
  const r = rng(seed); c.fillStyle = tone; c.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 110; i++) { c.fillStyle = r() < 0.5 ? "rgba(90,70,40,.05)" : "rgba(255,255,255,.09)"; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
  c.strokeStyle = "rgba(120,95,60,.07)"; c.lineWidth = 1;
  for (let i = 0; i < (w * h) / 3000; i++) { const x = r() * w, y = r() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 40); c.stroke(); }
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(90,60,20,.14)"); c.fillStyle = g; c.fillRect(0, 0, w, h);
}

// hand lettering: every glyph gets its own little wobble
export function hand(c, str, x, y, px, o = {}) {
  const { col = INK, align = "center", rot = 0, weight = 600, font = HAND, r = Math.random, caps = false, max } = o;
  str = caps ? String(str).toUpperCase() : String(str);
  c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col; c.textBaseline = "alphabetic"; c.textAlign = "left";
  c.font = `${weight} ${px}px ${font}`;
  let wd = c.measureText(str).width;
  if (max && wd > max) { px *= max / wd; c.font = `${weight} ${px}px ${font}`; wd = max; }
  let cx = align === "center" ? -wd / 2 : align === "right" ? -wd : 0;
  for (const ch of str) { c.save(); c.translate(cx, (r() - 0.5) * px * 0.09); c.rotate((r() - 0.5) * 0.08); c.fillText(ch, 0, 0); c.restore(); cx += c.measureText(ch).width; }
  c.restore(); return wd;
}
export function handBlock(c, text, x, y, px, maxW, lh, o = {}) {
  c.font = `${o.weight || 500} ${px}px ${o.font || HAND}`;
  let line = "";
  for (const word of String(text).split(/\s+/)) {
    if (line && c.measureText(line + " " + word).width > maxW) { hand(c, line, x, y, px, { weight: 500, ...o, align: "left" }); y += lh; line = word; if (o.maxY && y > o.maxY) return y; }
    else line = line ? line + " " + word : word;
  }
  if (line) { hand(c, line, x, y, px, { weight: 500, ...o, align: "left" }); y += lh; }
  return y;
}

// a tiny drawing kit working in a unit box (-1..1, y down) placed with at(x, y, scale)
export function kit(c, seed = 1) {
  const r = rng(seed); let ox = 0, oy = 0, sc = 1;
  const P = ([x, y]) => [ox + x * sc, oy + y * sc];
  const path = (pts) => { c.beginPath(); pts.map(P).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
  const k = {
    c, r,
    at(x, y, s) { ox = x; oy = y; sc = s; return k; },
    line(pts, o = {}) {
      const { w = 0.014, col = INK, pass = 2, jit = 0.007, a = 0.92, close = false } = o;
      const q = (close ? [...pts, pts[0]] : pts).map(P);
      c.save(); c.lineCap = c.lineJoin = "round"; c.strokeStyle = col;
      for (let n = 0; n < pass; n++) {
        c.globalAlpha = a * (n ? 0.45 : 1); c.lineWidth = Math.max(0.7, w * sc * (n ? 0.6 : 1)); c.beginPath();
        q.forEach(([x, y], i) => { const J = () => (r() - 0.5) * jit * sc * 2;
          if (!i) c.moveTo(x + J(), y + J()); else { const [px, py] = q[i - 1]; c.quadraticCurveTo((px + x) / 2 + J() * 1.5, (py + y) / 2 + J() * 1.5, x + J(), y + J()); } });
        c.stroke();
      }
      c.restore(); return k;
    },
    circ(x, y, rad, o = {}) { const n = 16, pts = [], a0 = r() * 6; for (let i = 0; i <= n + 1; i++) { const a = a0 + (i / n) * Math.PI * 2; pts.push([x + Math.cos(a) * rad * (o.sx || 1), y + Math.sin(a) * rad * (o.sy || 1)]); }
      if (o.fill) k.fill(pts, o.fill, o.fa); return o.noLine ? k : k.line(pts, o); },
    fill(pts, col, a = 1) { c.save(); c.globalAlpha = a; c.fillStyle = col; path(pts); c.fill(); c.restore(); return k; },
    hatch(pts, o = {}) { const { gap = 0.045, ang = -0.9, col = "#2a2620", a = 0.45, w = 0.007 } = o;
      c.save(); path(pts); c.clip(); c.translate(ox, oy); c.rotate(ang); c.strokeStyle = col; c.globalAlpha = a; c.lineWidth = Math.max(0.6, w * sc);
      for (let y = -3; y < 3; y += gap) { c.beginPath(); c.moveTo(-3 * sc, y * sc + (r() - 0.5) * 2); c.lineTo(3 * sc, y * sc + (r() - 0.5) * 2); c.stroke(); }
      c.restore(); return k; },
    box(x1, y1, x2, y2, o = {}) { const p = rect(x1, y1, x2, y2); if (o.fill) k.fill(p, o.fill, o.fa); if (o.hatch) k.hatch(p, o.hatch); return k.line(p, { ...o, close: true }); },
    text(str, x, y, size, o = {}) { hand(c, str, ox + x * sc, oy + y * sc, size * sc, { r, ...o }); return k; },
  };
  return k;
}

// ------------------------------------------------------------------------------------------------------------
// MOTIFS — one small ink drawing per tape id, drawn in the unit box. Add or replace freely (see sleeves.js).
// ------------------------------------------------------------------------------------------------------------
export const MOTIFS = {
  // AVATAR: a little office worker at the time clock, and a much taller dancing shadow on the wall behind
  avatar(k) {
    const sh = { w: 0.2, col: "#3a3833", a: 0.6, pass: 1, jit: 0.012 };
    k.circ(-0.42, -0.8, 0.16, { fill: "#3a3833", fa: 0.6, noLine: true });
    k.line([[-0.4, -0.64], [-0.33, -0.12]], { ...sh, w: 0.32 });
    k.line([[-0.4, -0.56], [-0.74, -0.72], [-0.66, -1.0]], sh).line([[-0.36, -0.56], [-0.02, -0.66], [0.12, -0.94]], sh);
    k.line([[-0.33, -0.12], [-0.3, 0.32], [0.17, 0.8]], sh).line([[-0.33, -0.12], [0.02, 0.1], [0.3, -0.06]], sh);
    k.hatch([[-0.5, -0.66], [-0.24, -0.66], [-0.2, -0.1], [-0.46, -0.1]], { a: 0.35, gap: 0.035 });
    k.line([[-1, 0.8], [1, 0.8]], { w: 0.014 });
    k.box(0.44, -0.2, 0.8, 0.24, { fill: "#e9dfc6" }).circ(0.62, -0.04, 0.11).line([[0.62, -0.04], [0.62, -0.12]]).line([[0.62, -0.04], [0.68, -0.02]]);
    k.line([[0.52, 0.15], [0.72, 0.15]], { w: 0.022 });
    k.circ(0.2, 0.36, 0.075, { fill: "#efe6d0", w: 0.02 });
    k.line([[0.2, 0.44], [0.2, 0.6]], { w: 0.13, pass: 1 }).line([[0.2, 0.45], [0.2, 0.55]], { w: 0.018, col: RED, pass: 1 });
    k.line([[0.23, 0.46], [0.37, 0.37], [0.46, 0.22]]).box(0.44, 0.13, 0.5, 0.22, { fill: "#fff", w: 0.007 });
    k.line([[0.17, 0.46], [0.11, 0.58]]).box(0.05, 0.58, 0.17, 0.67, { fill: "#6b4a2a", w: 0.008 });
    k.line([[0.19, 0.62], [0.16, 0.8]]).line([[0.22, 0.62], [0.26, 0.8]]);
  },
  "tough-love"(k) { const h = []; for (let i = 0; i <= 30; i++) { const t = (i / 30) * Math.PI * 2; h.push([(16 * Math.sin(t) ** 3) / 20, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 20]); }
    k.fill(h, "#c9524a", 0.55).hatch(h, { col: RED, a: 0.5 }).line(h, { w: 0.022 });
    k.box(-0.3, -0.12, 0.3, 0.08, { fill: "#ead9b8" }).line([[-0.1, -0.12], [-0.1, 0.08]], { w: 0.008 }).line([[0.1, -0.12], [0.1, 0.08]], { w: 0.008 }); },
  anywhere(k) { k.line([[0, 0.95], [0, -0.85]], { w: 0.03 });
    [[-0.7, 1], [-0.4, -1], [-0.1, 1], [0.2, -1], [0.5, 1]].forEach(([y, d]) => { const p = [[0, y - 0.1], [d * 0.6, y - 0.1], [d * 0.78, y], [d * 0.6, y + 0.1], [0, y + 0.1]]; k.fill(p, "#e9dfc6").line(p, { close: true }).line([[d * 0.12, y], [d * 0.5, y]], { w: 0.008, col: GR }); });
    k.line([[-0.4, 0.95], [0.4, 0.95]]); },
  grow(k) { const pot = [[-0.34, 0.35], [0.34, 0.35], [0.25, 0.9], [-0.25, 0.9]]; k.fill(pot, "#c27a4e", 0.7).hatch(pot, { a: 0.35 }).line(pot, { close: true });
    k.line([[0, 0.35], [0.04, -0.1], [-0.02, -0.6]], { w: 0.025 }).circ(-0.24, -0.3, 0.2, { sy: 0.45, fill: "#7da05a", fa: 0.6 }).circ(0.26, -0.5, 0.22, { sy: 0.45, fill: "#7da05a", fa: 0.6 }).circ(-0.02, -0.72, 0.1, { sx: 0.6, fill: "#7da05a", fa: 0.6 }); },
  jacquemus(k) { k.circ(0.55, -0.6, 0.2, { fill: "#f0c64a", fa: 0.6 }); const p = [[-0.28, -0.7], [0.28, -0.7], [0.3, 0.3], [-0.3, 0.3]];
    k.fill(p, "#f3b9c4", 0.75).hatch(p, { a: 0.2 }).line(p, { close: true }).box(-0.06, 0.3, 0.06, 0.7, { fill: "#e3c58f" });
    k.line([[-1, 0.85], [-0.6, 0.78], [-0.2, 0.86], [0.2, 0.78], [0.6, 0.86], [1, 0.8]], { col: "#3f6f9a" }); },
  "la-croisiere"(k) { const hull = [[-0.75, 0.2], [0.8, 0.2], [0.6, 0.55], [-0.6, 0.55]]; k.fill(hull, "#e9dfc6").hatch(hull, { a: 0.25 }).line(hull, { close: true });
    k.box(-0.4, -0.1, 0.4, 0.2).box(-0.12, -0.45, 0.1, -0.1, { fill: "#c9524a", fa: 0.6 }).circ(-0.6, -0.65, 0.16, { fill: "#f0c64a", fa: 0.6 });
    [0.68, 0.84].forEach((y, i) => k.line([[-1, y], [-0.6, y - 0.06], [-0.2, y + 0.02], [0.2, y - 0.06], [0.6, y + 0.02], [1, y - 0.04]].map(([x, yy]) => [x + i * 0.1, yy]), { col: "#3f6f9a" })); },
  relax(k) { k.line([[-0.8, 0.9], [-0.7, -0.5]], { w: 0.03 }).line([[0.8, 0.9], [0.7, -0.5]], { w: 0.03 });
    const hm = [[-0.7, -0.35], [-0.35, 0.12], [0, 0.25], [0.35, 0.12], [0.7, -0.35]]; k.line(hm, { w: 0.03 }).hatch([...hm, [0.4, 0.3], [-0.4, 0.3]], { a: 0.3 });
    k.circ(-0.2, -0.02, 0.09).text("z z z", 0.25, -0.5, 0.2, { col: GR }).line([[-1, 0.9], [1, 0.9]]); },
  "zombie-cowboys"(k) { k.circ(0, 0.05, 0.85, { sy: 0.2, fill: "#8a5a3c", fa: 0.6 }); const cr = [[-0.42, 0.02], [-0.36, -0.6], [-0.1, -0.5], [0.1, -0.5], [0.36, -0.6], [0.42, 0.02]];
    k.fill(cr, "#8a5a3c", 0.7).hatch(cr, { a: 0.3 }).line(cr).line([[-0.42, -0.08], [0.42, -0.08]], { col: RED, w: 0.03 });
    [[-0.2, 0.45], [0.2, 0.45]].forEach(([x, y]) => k.line([[x - 0.08, y - 0.08], [x + 0.08, y + 0.08]]).line([[x + 0.08, y - 0.08], [x - 0.08, y + 0.08]]));
    k.line([[-0.25, 0.75], [0.25, 0.75]]); for (let i = -2; i <= 2; i++) k.line([[i * 0.1, 0.69], [i * 0.1, 0.81]], { w: 0.008 }); },
  "samurai-barber"(k) { k.line([[-0.8, 0.8], [0.6, -0.75]], { w: 0.03 }).line([[-0.62, 0.42], [-0.44, 0.6]], { w: 0.04 }).line([[0.6, -0.75], [0.7, -0.9]], { w: 0.012 });
    k.circ(0.35, 0.65, 0.13).circ(0.68, 0.45, 0.13).line([[0.3, 0.53], [-0.2, -0.45]]).line([[0.58, 0.37], [-0.45, -0.2]]);
    k.box(-0.85, -0.85, -0.25, -0.7); for (let i = 0; i < 8; i++) k.line([[-0.82 + i * 0.075, -0.7], [-0.82 + i * 0.075, -0.52]], { w: 0.008 }); },
  "samurai-bounty-hunter"(k) { k.box(-0.6, -0.9, 0.6, 0.9, { fill: "#e9dcc0" }).text("WANTED", 0, -0.62, 0.26, { weight: 700 });
    k.circ(0, -0.18, 0.2, { fill: "#3a3833", fa: 0.7 }).circ(0, -0.44, 0.07, { fill: "#3a3833", fa: 0.7 });
    const b = [[-0.36, 0.5], [-0.2, 0.05], [0.2, 0.05], [0.36, 0.5]]; k.fill(b, "#3a3833", 0.7).hatch(b, {}).line([[-0.55, 0.62], [0.55, 0.2]], { w: 0.025, col: RED }).text("ALIVE-ISH", 0, 0.8, 0.13, { col: GR }); },
  goat(k) { const f = [[-0.3, -0.35], [0.3, -0.35], [0.2, 0.35], [0, 0.5], [-0.2, 0.35]]; k.fill(f, "#f4eedd").line(f, { close: true });
    k.line([[-0.2, -0.35], [-0.45, -0.75], [-0.25, -0.95]], { w: 0.03 }).line([[0.2, -0.35], [0.45, -0.75], [0.25, -0.95]], { w: 0.03 });
    k.line([[-0.3, -0.25], [-0.62, -0.2]]).line([[0.3, -0.25], [0.62, -0.2]]).box(-0.17, -0.12, -0.07, -0.08, { fill: INK }).box(0.07, -0.12, 0.17, -0.08, { fill: INK });
    k.line([[0, 0.5], [-0.04, 0.8], [0.03, 0.72]]).line([[-0.06, 0.3], [0.06, 0.3]]).box(0.5, 0.45, 0.8, 0.9, { fill: "#b9c0c4", hatch: { a: 0.3 } }); },
  generic(k) { k.box(-0.7, -0.4, 0.7, 0.4, { fill: "#2c2a27", fa: 0.85 }).circ(-0.3, 0, 0.17, { fill: "#efe6d0" }).circ(0.3, 0, 0.17, { fill: "#efe6d0" }).box(-0.2, -0.12, 0.2, 0.12, { fill: "#efe6d0" }); },
};
export const TAGLINES = { avatar: "OVERTIME IS VOLUNTARY" };

// a sleeve front / a wall poster: paper, a wash of the tape's colour, hand-lettered title, the motif
export function paintCover(c, w, h, t, motif) {
  paper(c, w, h, "#efe6d0", hash(t.id)); const k = kit(c, hash(t.id) + 3);
  c.save(); c.globalAlpha = 0.5; c.fillStyle = t.spine; c.fillRect(w * 0.07, h * 0.06, w * 0.86, h * 0.15); c.restore();
  k.at(0, 0, 1).line(rect(w * 0.05, h * 0.035, w * 0.95, h * 0.965), { close: true, w: w * 0.007, jit: w * 0.003 });
  hand(c, t.title, w / 2, h * 0.165, h * 0.08, { caps: true, max: w * 0.78, weight: 700, r: k.r });
  k.at(w / 2, h * 0.55, w * 0.4); (motif || MOTIFS[t.id] || MOTIFS.generic)(k);
  if (TAGLINES[t.id]) hand(c, TAGLINES[t.id], w / 2, h * 0.875, h * 0.042, { max: w * 0.82, weight: 700, r: k.r, col: RED });
  hand(c, `${t.client} · ${t.year}`, w / 2, h * 0.935, h * 0.03, { col: GR, r: k.r, max: w * 0.8 });
}
export function paintSpine(c, w, h, t, n) {
  paper(c, w, h, t.spine, hash(t.id) + 9); const dark = lum(t.spine) > 0.5; const r = rng(hash(t.id));
  c.save(); c.translate(w / 2, h / 2); c.rotate(-Math.PI / 2);
  hand(c, t.title, -h * 0.44, w * 0.2, w * 0.52, { align: "left", caps: true, weight: 700, col: dark ? INK : "#f4eedd", max: h * 0.66, r });
  hand(c, String(n).padStart(2, "0"), h * 0.44, w * 0.18, w * 0.42, { align: "right", col: dark ? GR : "#e6dcc6", r });
  c.restore();
}
export function paintBack(c, w, h, t) {
  paper(c, w, h, "#e9dfc6", hash(t.id) + 5); const r = rng(hash(t.id) + 6);
  hand(c, t.title, w * 0.1, h * 0.12, h * 0.05, { align: "left", weight: 700, r, max: w * 0.8 });
  hand(c, `${t.client} · ${t.year}`, w * 0.1, h * 0.17, h * 0.03, { align: "left", col: GR, r });
  hand(c, "On this tape:", w * 0.1, h * 0.27, h * 0.03, { align: "left", col: RED, r });
  let y = h * 0.33; t.clips.slice(0, 7).forEach((cl, i) => { y = handBlock(c, `${i + 1}. ${cl.title}`, w * 0.1, y, h * 0.028, w * 0.8, h * 0.038, { r }) + h * 0.008; });
  hand(c, "Be kind. Rewind.", w / 2, h * 0.9, h * 0.035, { r, col: GR });
  hand(c, "sleeve drawn by hand, not a film still", w / 2, h * 0.945, h * 0.022, { r, col: GR });
}
export const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };

// one sheet of the paper stacks: heading + handwriting, optionally a sketch
export function paintPage(c, w, h, page, i) {
  paper(c, w, h, i % 2 ? "#f4eedd" : "#f1e8d2", 40 + i); const k = kit(c, 60 + i);
  c.strokeStyle = "rgba(70,110,160,.22)"; for (let y = h * 0.2; y < h * 0.95; y += h * 0.047) { c.beginPath(); c.moveTo(w * 0.06, y); c.lineTo(w * 0.94, y); c.stroke(); }
  hand(c, page.title, w * 0.08, h * 0.11, h * 0.05, { align: "left", weight: 700, col: RED, r: k.r, max: w * 0.84 });
  let y = h * 0.2;
  if (page.motif) { k.at(w / 2, h * 0.36, w * 0.24); (MOTIFS[page.motif] || MOTIFS.generic)(k); y = h * 0.62; }
  (page.lines || []).forEach((ln) => { y = handBlock(c, ln, w * 0.08, y, h * 0.034, w * 0.84, h * 0.047, { r: k.r, col: "#2b2f45" }) + h * 0.012; });
  hand(c, `sheet ${i + 1}`, w * 0.92, h * 0.97, h * 0.022, { align: "right", col: GR, r: k.r });
}

// the investigation wall: a dense collage of pinned sheets, doodles, cards and diagrams, joined by red thread
export function paintWall(c, W, H, tapes, notes) {
  const r = rng(77); paper(c, W, H, "#cdb892", 5); const k = kit(c, 99), pins = [];
  const tones = ["#f4eedd", "#efe6d0", "#f7f3e8", "#e9dcc0", "#f2e3b6", "#e6ecdf", "#f0d9d2"];
  const cols = 22, rows = 6;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const w = 130 + r() * 90, h = w * (1.15 + r() * 0.3), x = ((i + 0.5) / cols) * W + (r() - 0.5) * 60, y = ((j + 0.5) / rows) * H + (r() - 0.5) * 50, rot = (r() - 0.5) * 0.24;
    c.save(); c.translate(x, y); c.rotate(rot);
    c.shadowColor = "rgba(40,25,5,.38)"; c.shadowBlur = 9; c.shadowOffsetY = 4; c.fillStyle = tones[(r() * tones.length) | 0]; c.fillRect(-w / 2, -h / 2, w, h); c.shadowColor = "transparent";
    const kind = r(), n = notes[(i * 7 + j * 3) % notes.length];
    if (kind < 0.3) { const t = tapes[(r() * tapes.length) | 0]; k.at(0, -h * 0.07, w * 0.34); (MOTIFS[t.id] || MOTIFS.generic)(k); hand(c, t.title, 0, h * 0.43, 16, { r, max: w * 0.85, weight: 700 }); }
    else if (kind < 0.66) { hand(c, n[0], 0, -h / 2 + 26, 18, { r, weight: 700, max: w * 0.86, col: RED }); handBlock(c, n[1], -w / 2 + 10, -h / 2 + 50, 13.5, w - 20, 17, { r, maxY: h / 2 - 8, col: "#2b2f45" }); }
    else if (kind < 0.86) { hand(c, n[0], 0, -h / 2 + 24, 15, { r, max: w * 0.8, weight: 700 }); k.at(0, 0, 1);
      for (let y2 = -h / 2 + 42; y2 < h / 2 - 12; y2 += 11) { const pts = [], end = w / 2 - 12 - r() * w * 0.4; for (let x2 = -w / 2 + 12; x2 < end; x2 += 5) pts.push([x2, y2 + (r() - 0.5) * 4]); if (pts.length > 2) k.line(pts, { w: 1, jit: 0.8, pass: 1, col: "#3b3a55", a: 0.75 }); } }
    else { k.at(0, 0, w * 0.4); const lab = ["TAPE", "TV", "S.F.?", "GOAT", "WHY", "11"]; const ps = [[-0.6, -0.6], [0.55, -0.45], [0, 0.15], [-0.5, 0.8], [0.6, 0.75]];
      ps.forEach(([px, py], q) => { k.circ(px, py, 0.26, { w: 0.02 }).text(lab[(q + i) % lab.length], px, py + 0.07, 0.17, { weight: 700 }); if (q) k.line([ps[q - 1], [px, py]], { col: RED, w: 0.02 }); }); }
    c.restore(); pins.push([x + Math.sin(rot) * h / 2, y - Math.cos(rot) * h / 2 + 9]);
  }
  c.lineCap = "round";
  for (let n = 0; n < 46; n++) { const a = pins[(r() * pins.length) | 0], near = pins.filter((p) => p !== a && Math.hypot(p[0] - a[0], p[1] - a[1]) < 760); if (!near.length) continue; const b = near[(r() * near.length) | 0];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + 24;
    c.strokeStyle = "rgba(50,10,5,.3)"; c.lineWidth = 3; c.beginPath(); c.moveTo(a[0], a[1] + 4); c.quadraticCurveTo(mx, my + 5, b[0], b[1] + 4); c.stroke();
    c.strokeStyle = "#b8231b"; c.lineWidth = 2.4; c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(mx, my, b[0], b[1]); c.stroke(); }
  pins.forEach(([x, y], i) => { c.fillStyle = "rgba(0,0,0,.3)"; c.beginPath(); c.arc(x + 2, y + 3, 5, 0, 7); c.fill(); c.fillStyle = i % 3 ? "#c9342b" : "#d9a441"; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.arc(x - 1.5, y - 1.5, 1.6, 0, 7); c.fill(); });
}
