// Every picture in the valley, drawn in code. Nothing here is a downloaded sprite: tiles are painted a pixel at a time,
// and the bigger things (trees, furniture, creatures) are drawn as simple shapes on a tiny canvas, snapped to hard
// pixels and given a one-pixel outline, so they come out as chunky pixel art.
export const T = 16;
const INK = "#2b1f3b";
const cv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
// paint with plain rectangles
function px(w, h, fn) { const c = cv(w, h), g = c.getContext("2d"); fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); }, g); return c; }
// draw with shapes, then snap every pixel to solid or empty and run a dark line round the outside
function shape(w, h, fn, outline = INK) {
  const c = cv(w, h), g = c.getContext("2d"); fn(g);
  const im = g.getImageData(0, 0, w, h), d = im.data, on = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { on[i] = d[i * 4 + 3] >= 110 ? 1 : 0; d[i * 4 + 3] = on[i] ? 255 : 0; }
  if (outline) {
    const o = hexc(outline);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (on[i]) continue; if ((x > 0 && on[i - 1]) || (x < w - 1 && on[i + 1]) || (y > 0 && on[i - w]) || (y < h - 1 && on[i + w])) { d[i * 4] = o[0]; d[i * 4 + 1] = o[1]; d[i * 4 + 2] = o[2]; d[i * 4 + 3] = 255; } }
  }
  g.putImageData(im, 0, 0); return c;
}
const hexc = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const ell = (g, x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
const box = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
const poly = (g, pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); };
const line = (g, x0, y0, x1, y1, col, w = 1) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
// shade inside what's already drawn
const inside = (g, fn) => { g.save(); g.globalCompositeOperation = "source-atop"; fn(); g.restore(); };
const flip = (c) => { const o = cv(c.width, c.height), g = o.getContext("2d"); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; };

// ---- the colours of the place ----
export const C = {
  g1: "#b9e3a3", g2: "#a3d692", g3: "#84c481", g4: "#6aae74",
  p1: "#f4e2b6", p2: "#e8cf98", p3: "#d7b87f",
  s1: "#fbeccb", s2: "#f2dba9", s3: "#e3c58a",
  w1: "#86d2ec", w2: "#b8edfb", w3: "#62b4dc", foam: "#effcff",
  wood: "#b98758", wood2: "#96683f", wood3: "#d6a877",
  roof: "#f2907f", roof2: "#d96f6b", wall: "#fff4e0", wall2: "#ecdcc0",
  pink: "#ff9dbb", yellow: "#ffd76a", violet: "#b9a0ff", white: "#ffffff", red: "#f0546a",
};
// the long grass in each project's corner of the valley: [blade, dark blade, tip]
export const GRASS = {
  1: ["#d9c27a", "#b59a52", "#f6e7ad"],   // Riviera reeds
  2: ["#57c9b5", "#2f9c8e", "#b7f3e4"],   // Uncanny Valley, the teal side
  3: ["#a58cf0", "#6f52cf", "#e0d4ff"],   // Render Farm wireframe
  4: ["#e772cf", "#b0409c", "#ffc4f1"],   // Uncanny Valley, the pink side
  5: ["#5cb86f", "#38905a", "#c4f0b0"],   // Stadium
  6: ["#3fa98a", "#237a66", "#a5e8cf"],   // Relax Lagoon
  7: ["#e6a25a", "#b46a2c", "#ffd9a6"],   // Fizz Springs
  8: ["#ff86b6", "#d9558c", "#ffd0e3"],   // Gum Tree Grove
};

export function buildArt() {
  const A = { tile: {}, obj: {}, who: {}, mon: {}, grass: {} };
  const r = rng(11);
  const speck = (R, n, cols, w = 1, h = 1) => { for (let i = 0; i < n; i++) R(Math.floor(r() * (16 - w + 1)), Math.floor(r() * (16 - h + 1)), w, h, cols[Math.floor(r() * cols.length)]); };
  // ---- ground ----
  const grass = (extra) => px(16, 16, (R) => { R(0, 0, 16, 16, C.g1); speck(R, 9, [C.g2]); speck(R, 4, [C.g3], 1, 2); extra && extra(R); });
  const flower = (R, x, y, col) => { R(x, y - 1, 1, 1, col); R(x - 1, y, 1, 1, col); R(x + 1, y, 1, 1, col); R(x, y + 1, 1, 1, col); R(x, y, 1, 1, C.yellow); };
  A.tile.grass = [grass(), grass(), grass((R) => speck(R, 3, [C.g4], 1, 2)), grass((R) => { flower(R, 4, 5, C.pink); flower(R, 11, 10, C.white); }), grass((R) => { flower(R, 10, 4, C.violet); flower(R, 5, 11, C.pink); }), grass((R) => flower(R, 8, 8, C.white))];
  A.tile.path = [0, 1, 2].map(() => px(16, 16, (R) => { R(0, 0, 16, 16, C.p1); speck(R, 8, [C.p2]); speck(R, 2, [C.p3], 2, 1); }));
  A.tile.sand = [0, 1, 2].map(() => px(16, 16, (R) => { R(0, 0, 16, 16, C.s1); speck(R, 7, [C.s2]); speck(R, 2, [C.s3]); }));
  A.tile.water = [px(16, 16, (R) => { R(0, 0, 16, 16, C.w1); speck(R, 5, [C.w3], 2, 1); })];
  // light moving on the water, laid over it a frame at a time
  A.tile.glint = [0, 1, 2, 3].map((f) => px(16, 16, (R) => { R((2 + f * 3) % 14, 3, 3, 1, C.w2); R((9 + f * 2) % 13, 8, 4, 1, C.w2); R((5 + f * 4) % 14, 13, 2, 1, C.w2); }));
  A.tile.fizz = [px(16, 16, (R) => { R(0, 0, 16, 16, "#8a4a2a"); speck(R, 6, ["#6d351c"], 2, 1); })];
  A.tile.bubble = [0, 1, 2, 3].map((f) => px(16, 16, (R) => { const b = (x, y) => { R(x, y, 2, 2, "#f6c98f"); R(x, y, 1, 1, "#fff2dc"); }; b(3, (13 - f * 3 + 16) % 16); b(10, (9 - f * 3 + 16) % 16); b(7, (4 - f * 3 + 16) % 16); }));
  A.tile.bridge = [px(16, 16, (R) => { R(0, 0, 16, 16, C.wood); for (let y = 0; y < 16; y += 4) R(0, y + 3, 16, 1, C.wood2); R(0, 0, 2, 16, C.wood2); R(14, 0, 2, 16, C.wood2); R(3, 1, 1, 1, C.wood3); R(11, 9, 1, 1, C.wood3); })];
  A.tile.track = [px(16, 16, (R) => { R(0, 0, 16, 16, "#e9836a"); speck(R, 8, ["#dc7059"]); R(0, 7, 16, 1, "#ffe9dd"); })];
  A.tile.lawnA = [px(16, 16, (R) => { R(0, 0, 16, 16, "#a9dc96"); speck(R, 5, ["#9bd18a"]); })];
  A.tile.lawnB = [px(16, 16, (R) => { R(0, 0, 16, 16, "#96d086"); speck(R, 5, ["#88c57a"]); })];
  A.tile.soil = [px(16, 16, (R) => { R(0, 0, 16, 16, "#c9a27c"); for (let y = 2; y < 16; y += 5) R(0, y, 16, 1, "#b08a66"); speck(R, 5, ["#d8b48f"]); })];
  A.tile.floor = [0, 1].map((k) => px(16, 16, (R) => { R(0, 0, 16, 16, "#ecc9a0"); R(0, 7, 16, 1, "#d6ae82"); R(0, 15, 16, 1, "#d6ae82"); R(k ? 5 : 11, 0, 1, 7, "#d6ae82"); R(k ? 12 : 3, 8, 1, 7, "#d6ae82"); R(2, 3, 2, 1, "#f5d9b6"); }));
  A.tile.wall = [px(16, 16, (R) => { R(0, 0, 16, 16, "#f7ecd9"); R(0, 0, 16, 1, "#e6d6bb"); })];
  A.tile.skirt = [px(16, 16, (R) => { R(0, 0, 16, 16, "#f7ecd9"); R(0, 11, 16, 5, "#c79a6e"); R(0, 11, 16, 1, "#a87a52"); R(0, 15, 16, 1, "#8f6541"); })];
  A.tile.rug = [px(16, 16, (R) => { R(0, 0, 16, 16, "#f6a6bd"); for (let i = 0; i < 16; i += 4) { R(i, (i * 3) % 16, 2, 2, "#b79cff"); R((i + 2) % 16, (i * 5 + 8) % 16, 2, 2, "#ffe08a"); } })];
  A.tile.mat = [px(16, 16, (R) => { R(0, 0, 16, 16, "#ecc9a0"); R(2, 4, 12, 9, "#8fc7a4"); R(3, 5, 10, 7, "#a9dcbc"); R(5, 8, 6, 1, "#6aa784"); })];
  A.tile.void = [px(16, 16, (R) => R(0, 0, 16, 16, "#2b1f3b"))];
  // the ragged edge where one ground meets another: little bites of the neighbour's colour along a side
  A.fringe = (g, x, y, side, col, seed) => {
    const q = rng(seed * 7 + side * 131 + 3); g.fillStyle = col;
    for (let i = 0; i < 16; i += 2) { const d = 1 + Math.floor(q() * 2.6); if (side === 0) g.fillRect(x + i, y, 2, d); else if (side === 1) g.fillRect(x + 16 - d, y + i, d, 2); else if (side === 2) g.fillRect(x + i, y + 16 - d, 2, d); else g.fillRect(x, y + i, d, 2); }
  };
  // long grass: two frames of sway per zone, drawn over whatever ground it grows on
  for (const z in GRASS) {
    const [a, b, t] = GRASS[z];
    A.grass[z] = [0, 1].map((f) => px(16, 16, (R) => {
      const tuft = (x, y) => { const s = f ? 1 : 0; R(x, y + 2, 1, 5, b); R(x + 1, y, 1, 7, a); R(x + 2, y + 1, 1, 6, b); R(x + 3, y + 3, 1, 4, a); R(x + 1 + s, y - 1, 1, 1, t); R(x + 3 + s, y + 2, 1, 1, t); };
      tuft(0, 1); tuft(6, 0); tuft(11, 2); tuft(3, 8); tuft(9, 9);
      if (+z === 3) { R(0, 7, 16, 1, "rgba(111,82,207,.45)"); R(7, 0, 1, 16, "rgba(111,82,207,.45)"); }   // the render farm's is half wireframe
    }));
  }
  // ---- things that stand on the ground. Each is anchored by the middle of its bottom edge. ----
  const tree = (c1, c2, c3) => shape(20, 30, (g) => { box(g, 8, 19, 4, 9, "#8d5d45"); box(g, 8, 19, 1, 9, "#6f4533"); ell(g, 10, 11, 9, 10, c2); ell(g, 9, 9, 7.5, 7.5, c1); ell(g, 7, 6, 3, 2.5, c3); });
  A.obj.tree = tree("#5fb089", "#43917a", "#93d9a8");
  A.obj.tree2 = tree("#74bd8a", "#559d77", "#a9e2ae");
  A.obj.gumtree = shape(20, 30, (g) => { box(g, 8, 19, 4, 9, "#8d5d45"); ell(g, 10, 11, 9, 10, "#ff86b6"); ell(g, 9, 9, 7.5, 7.5, "#ffa9cc"); ell(g, 6, 5, 3, 2.5, "#ffe1ee"); ell(g, 15, 15, 3, 3, "#ffd0e3"); ell(g, 14, 14, 1, 1, "#fff"); });
  A.obj.oddtree = shape(20, 30, (g) => { box(g, 8, 19, 4, 9, "#6b5a8f"); ell(g, 10, 11, 9, 10, "#2f9c8e"); ell(g, 9, 9, 7.5, 7.5, "#57c9b5"); ell(g, 13, 13, 4, 4, "#e772cf"); ell(g, 6, 6, 2.5, 2, "#b7f3e4"); ell(g, 10, 10, 1.6, 1.6, "#fff"); ell(g, 10, 10, .8, .8, INK); });
  A.obj.polytree = shape(20, 30, (g) => { box(g, 8, 20, 4, 8, "#7b6a98"); poly(g, [[10, 0], [19, 21], [1, 21]], "#8e75e6"); poly(g, [[10, 0], [10, 21], [1, 21]], "#b6a3ff"); poly(g, [[10, 8], [15, 21], [10, 21]], "#6f52cf"); });
  A.obj.palm = shape(26, 34, (g) => { line(g, 13, 32, 15, 14, "#a9764f", 3); line(g, 14, 30, 15, 14, "#c79368", 1); [[2, 14], [6, 6], [14, 3], [22, 7], [25, 15]].forEach(([x, y], i) => { line(g, 15, 13, x, y, i % 2 ? "#3fa98a" : "#55bf9c", 3); }); ell(g, 15, 13, 2, 2, "#8d5d45"); });
  A.obj.rock = shape(14, 11, (g) => { ell(g, 7, 6, 6, 4.5, "#c9c2d3"); inside(g, () => ell(g, 5, 4, 3, 2, "#e6e1ee")); });
  A.obj.sign = shape(14, 15, (g) => { box(g, 6, 8, 2, 7, C.wood2); box(g, 1, 1, 12, 8, C.wood3); box(g, 3, 3, 8, 1, C.wood2); box(g, 3, 5, 6, 1, C.wood2); });
  A.obj.mailbox = shape(10, 16, (g) => { box(g, 4, 8, 2, 8, "#9aa0b5"); box(g, 1, 1, 8, 7, "#f0546a"); box(g, 1, 1, 8, 2, "#ff7d8e"); box(g, 3, 5, 4, 1, "#fff"); });
  A.obj.fence = shape(16, 12, (g) => { box(g, 1, 2, 3, 10, C.wood3); box(g, 12, 2, 3, 10, C.wood3); box(g, 0, 4, 16, 2, C.wood); box(g, 0, 8, 16, 2, C.wood); });
  A.obj.parasol = shape(24, 26, (g) => { box(g, 11, 8, 2, 18, "#e9e4f0"); poly(g, [[12, 0], [24, 10], [0, 10]], "#fff"); poly(g, [[12, 0], [16, 10], [8, 10]], "#ff9dbb"); poly(g, [[12, 0], [4, 10], [0, 10]], "#ff9dbb"); poly(g, [[12, 0], [24, 10], [20, 10]], "#ff9dbb"); });
  A.obj.towel = px(14, 8, (R) => { R(0, 0, 14, 8, "#fff"); for (let x = 0; x < 14; x += 4) R(x, 0, 2, 8, "#86d2ec"); });
  A.obj.hammock = shape(34, 20, (g) => { box(g, 1, 4, 2, 16, C.wood2); box(g, 31, 4, 2, 16, C.wood2); g.strokeStyle = "#fff4e0"; g.lineWidth = 4; g.beginPath(); g.moveTo(2, 6); g.quadraticCurveTo(17, 20, 32, 6); g.stroke(); g.strokeStyle = "#ff9dbb"; g.lineWidth = 1; g.beginPath(); g.moveTo(3, 7); g.quadraticCurveTo(17, 19, 31, 7); g.stroke(); });
  A.obj.cube = shape(14, 15, (g) => { poly(g, [[7, 1], [13, 4], [7, 7], [1, 4]], "#d6caff"); poly(g, [[1, 4], [7, 7], [7, 14], [1, 11]], "#a58cf0"); poly(g, [[13, 4], [7, 7], [7, 14], [13, 11]], "#7a5cd6"); });
  A.obj.light = shape(12, 34, (g) => { box(g, 5, 8, 2, 26, "#9aa0b5"); box(g, 1, 0, 10, 8, "#6c7088"); box(g, 2, 1, 3, 2, "#fff7c9"); box(g, 7, 1, 3, 2, "#fff7c9"); box(g, 2, 4, 3, 2, "#fff7c9"); box(g, 7, 4, 3, 2, "#fff7c9"); });
  A.obj.geyser = [0, 1, 2].map((f) => shape(14, 22, (g) => { ell(g, 7, 19, 6, 3, "#6d351c"); const h = 6 + f * 4; box(g, 5, 19 - h, 4, h, "#c98a55"); ell(g, 7, 19 - h, 4, 3, "#f6c98f"); ell(g, 3 + f, 14 - h, 1.5, 1.5, "#fff2dc"); ell(g, 11 - f, 12 - h, 1.2, 1.2, "#fff2dc"); }));
  A.obj.pole = shape(8, 40, (g) => { box(g, 3, 4, 2, 36, "#8d5d45"); box(g, 0, 5, 8, 2, "#8d5d45"); box(g, 0, 3, 1, 2, "#cfd3e0"); box(g, 7, 3, 1, 2, "#cfd3e0"); });
  A.obj.goat = [0, 1].map((f) => shape(18, 15, (g) => { ell(g, 9, 7, 6, 4, "#fbf7ef"); ell(g, 15, 4, 3, 2.6, "#fbf7ef"); box(g, 14, 0, 1, 2, "#c9a27c"); box(g, 16, 0, 1, 2, "#c9a27c"); box(g, 16, 6, 1, 2 + f, "#e9e2d2"); box(g, 5, 10, 1, 4, "#e9e2d2"); box(g, 8, 10, 1, 4, "#e9e2d2"); box(g, 11, 10, 1, 4, "#e9e2d2"); box(g, 13, 10, 1, 4, "#e9e2d2"); box(g, 16, 3, 1, 1, INK); box(g, 2, 5 - f, 2, 1, "#fbf7ef"); }));
  A.obj.hole = shape(18, 10, (g) => { ell(g, 9, 5, 8, 4, "#3a2a2f"); ell(g, 9, 6, 6, 2.6, "#0d0a12"); }, "#6b4a3a");
  A.obj.house = px(80, 72, (R, g) => {
    // a small studio with a pink roof
    R(4, 30, 72, 42, C.wall); R(4, 30, 72, 2, C.wall2); R(4, 66, 72, 6, C.wall2);
    for (let y = 0; y < 30; y++) { const inset = Math.max(0, 14 - y); R(inset, y, 80 - inset * 2, 1, y % 5 === 4 ? C.roof2 : C.roof); }
    R(0, 28, 80, 3, C.roof2); R(58, 0, 9, 12, "#e9dccb"); R(57, 0, 11, 3, C.roof2);
    R(34, 46, 12, 26, "#8a5a44"); R(35, 47, 10, 25, "#a5714f"); R(43, 59, 1, 2, C.yellow); R(33, 45, 14, 1, "#6f4533");
    const win = (x) => { R(x, 42, 14, 14, "#6f4533"); R(x + 1, 43, 12, 12, "#9bdcf3"); R(x + 1, 43, 5, 4, "#d5f4ff"); R(x + 6, 43, 1, 12, "#6f4533"); R(x + 1, 49, 12, 1, "#6f4533"); R(x - 1, 56, 16, 2, C.wood3); };
    win(11); win(55);
    R(30, 34, 20, 8, C.wood3); R(31, 35, 18, 6, "#fff4e0"); g.fillStyle = INK; g.font = "bold 6px monospace"; g.fillText("S.F.", 33, 40);
    g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(4.5, 30.5, 71, 41);
  });
  // ---- the studio ----
  A.obj.bed = shape(16, 30, (g) => { box(g, 0, 2, 16, 28, "#b98758"); box(g, 1, 3, 14, 26, "#fff4e0"); box(g, 2, 4, 12, 7, "#fff"); box(g, 1, 13, 14, 16, "#ff9dbb"); box(g, 1, 13, 14, 2, "#ffc4d6"); box(g, 4, 18, 2, 2, "#fff"); box(g, 10, 23, 2, 2, "#fff"); });
  A.obj.desk = [0, 1].map((f) => shape(32, 26, (g) => { box(g, 0, 12, 32, 12, "#b98758"); box(g, 0, 12, 32, 2, "#d6a877"); box(g, 1, 24, 3, 2, "#96683f"); box(g, 28, 24, 3, 2, "#96683f"); box(g, 8, 0, 16, 11, "#3a3350"); box(g, 9, 1, 14, 9, f ? "#ffb38a" : "#b79cff"); box(g, 10 + f * 3, 3, 6, 1, "#fff"); box(g, 10, 6, 9 - f * 3, 1, "#fff"); box(g, 14, 11, 4, 2, "#3a3350"); box(g, 3, 9, 3, 3, "#fff"); box(g, 26, 8, 3, 4, "#8fc7a4"); }));
  A.obj.shelf = shape(32, 30, (g) => { box(g, 0, 0, 32, 30, "#96683f"); for (let s = 0; s < 3; s++) { box(g, 2, 2 + s * 9, 28, 7, "#5d4030"); let x = 3; ["#ff9dbb", "#b79cff", "#ffd76a", "#86d2ec", "#fff4e0", "#f0546a", "#8fc7a4", "#b79cff", "#ffd76a"].forEach((c, i) => { const w = 2 + ((i + s) % 2); box(g, x, 3 + s * 9 + ((i + s) % 3 === 0 ? 1 : 0), w, 6, c); x += w + 1; }); } });
  A.obj.coffee = shape(14, 18, (g) => { box(g, 0, 10, 14, 8, "#b98758"); box(g, 2, 0, 10, 10, "#cfd3e0"); box(g, 3, 1, 8, 3, "#3a3350"); box(g, 6, 4, 2, 3, "#3a3350"); box(g, 5, 7, 4, 3, "#fff"); box(g, 10, 2, 1, 1, "#f0546a"); });
  A.obj.fridge = shape(14, 26, (g) => { box(g, 0, 0, 14, 26, "#e9e4f0"); box(g, 0, 9, 14, 1, "#b9b3c8"); box(g, 11, 3, 1, 4, "#9aa0b5"); box(g, 11, 12, 1, 6, "#9aa0b5"); box(g, 3, 13, 3, 3, "#ffd76a"); box(g, 5, 18, 3, 2, "#ff9dbb"); });
  A.obj.plant = shape(14, 20, (g) => { box(g, 4, 13, 6, 7, "#f2907f"); box(g, 3, 12, 8, 2, "#d96f6b"); ell(g, 4, 8, 3, 5, "#5fb089"); ell(g, 10, 7, 3, 6, "#43917a"); ell(g, 7, 5, 2.5, 5, "#74bd8a"); });
  A.obj.guitar = shape(12, 26, (g) => { box(g, 5, 0, 2, 14, "#6f4533"); box(g, 4, 0, 4, 3, "#3a3350"); ell(g, 6, 19, 5, 6, "#f2a65a"); ell(g, 6, 14, 3.6, 3.6, "#f2a65a"); ell(g, 6, 18, 1.6, 1.6, "#3a3350"); box(g, 6, 3, 1, 18, "#fff4e0"); });
  A.obj.stand = px(16, 12, (R) => { R(1, 4, 14, 8, "#d6a877"); R(1, 4, 14, 2, "#ecc9a0"); R(0, 3, 16, 2, "#b98758"); R(2, 11, 12, 1, "#96683f"); });
  A.obj.poster = px(14, 16, (R) => { R(0, 0, 14, 16, "#2b1f3b"); R(1, 1, 12, 14, "#ffb38a"); R(1, 9, 12, 6, "#b79cff"); R(5, 3, 4, 9, "#3a3350"); R(6, 2, 2, 2, "#f2c3a5"); R(2, 12, 2, 3, "#3a3350"); R(10, 13, 1, 2, "#3a3350"); });
  A.obj.window = px(16, 14, (R) => { R(0, 0, 16, 14, "#96683f"); R(1, 1, 14, 12, "#9bdcf3"); R(1, 1, 6, 4, "#d5f4ff"); R(7, 1, 1, 12, "#96683f"); R(1, 7, 14, 1, "#96683f"); });
  // the three things on the stands: a cube, a jar of sparks, a pot of pencils
  A.obj.pick1 = shape(12, 12, (g) => { poly(g, [[6, 0], [11, 3], [6, 6], [1, 3]], "#e0d4ff"); poly(g, [[1, 3], [6, 6], [6, 12], [1, 9]], "#a58cf0"); poly(g, [[11, 3], [6, 6], [6, 12], [11, 9]], "#7a5cd6"); });
  A.obj.pick2 = shape(12, 13, (g) => { box(g, 3, 0, 6, 2, "#96683f"); ell(g, 6, 8, 5, 5, "#b7f3e4"); ell(g, 5, 7, 1, 1, "#fff"); ell(g, 8, 9, 1, 1, "#ffe08a"); ell(g, 4, 10, .8, .8, "#ff9dbb"); });
  A.obj.pick3 = shape(12, 14, (g) => { box(g, 2, 6, 8, 8, "#f2907f"); box(g, 2, 6, 8, 2, "#d96f6b"); box(g, 3, 0, 2, 7, "#ffd76a"); box(g, 6, 2, 2, 5, "#86d2ec"); box(g, 8, 1, 1, 6, "#ff9dbb"); box(g, 3, 0, 2, 1, "#ff9dbb"); });
  // ---- people. Four ways to face, two steps each. ----
  const person = (skin, hair, top, legs, extra) => {
    const one = (dir, f) => px(16, 19, (R) => {
      const sw = f ? 1 : 0;
      R(4, 1, 8, 7, skin); R(4, 0, 8, 3, hair); R(3, 1, 1, 4, hair); R(12, 1, 1, 4, hair);
      if (dir === "up") R(4, 1, 8, 6, hair);
      else if (dir === "down") { R(5, 5, 1, 2, INK); R(10, 5, 1, 2, INK); R(7, 7, 2, 1, "#d98c7a"); }
      else { R(4, 1, 5, 2, hair); R(5, 5, 1, 2, INK); R(9, 3, 4, 5, hair); }
      R(4, 8, 8, 6, top); R(3, 9, 1, 4 - sw, skin); R(12, 9, 1, 3 + sw, skin);
      R(4, 14, 3, 4 - sw, legs); R(9, 14, 3, 3 + sw, legs); R(4, 18 - sw, 3, 1, INK); R(9, 17 + sw, 3, 1, INK);
      extra && extra(R, dir);
    });
    const outl = (c) => shape(c.width + 2, c.height + 2, (g) => g.drawImage(c, 1, 1));
    const o = {}; ["down", "up", "left"].forEach((d) => (o[d] = [outl(one(d, 0)), outl(one(d, 1))])); o.right = o.left.map(flip); return o;
  };
  A.who.you = person("#f2c3a5", "#5b3f8a", "#86d2ec", "#3a3350");
  A.who.stefan = person("#eab99a", "#2b1f3b", "#2b1f3b", "#6c7088", (R, d) => { if (d === "down") { R(5, 7, 6, 1, "#2b1f3b"); } });
  A.who.intern = person("#d9a47f", "#d98c3a", "#fff4e0", "#8fc7a4", (R, d) => { if (d === "down") { R(7, 9, 2, 4, "#f0546a"); } });
  A.who.page = [0, 1].map((f) => shape(34, 38, (g) => { poly(g, [[3, 2], [27, 2], [31, 6], [31, 36], [3, 36]], "#ffffff"); poly(g, [[27, 2], [31, 6], [27, 6]], "#d9d5e2"); box(g, 10, 12, 4, 2, INK); box(g, 20, 12, 4, 2, INK); box(g, 9, 10, 6, 1, INK); box(g, 19, 10, 6, 1, INK); if (f) box(g, 8, 22, 1, 7, INK); box(g, 22, 34, 6, 1, "#d9d5e2"); }));
  // ---- the creatures, 48 by 48. All of them made up for this place. ----
  const mon = (fn) => shape(48, 48, fn);
  const eye = (g, x, y, r = 2.4) => { ell(g, x, y, r, r, "#fff"); ell(g, x + .5, y + .3, r * .55, r * .55, INK); };
  // BEVEL, the 3D one: a chamfered cube on two legs
  A.mon.bevel = mon((g) => { box(g, 15, 38, 5, 7, "#6f52cf"); box(g, 28, 38, 5, 7, "#6f52cf"); poly(g, [[24, 5], [42, 13], [24, 21], [6, 13]], "#e0d4ff"); poly(g, [[6, 13], [24, 21], [24, 41], [6, 33]], "#a58cf0"); poly(g, [[42, 13], [24, 21], [24, 41], [42, 33]], "#7a5cd6"); eye(g, 12, 25, 3); eye(g, 19, 28, 3); line(g, 12, 33, 17, 35, INK, 1.2); line(g, 24, 21, 24, 41, "#c9bbff", 1); });
  // HALLU, the AI one: a soft ghost that has got the number of eyes and fingers slightly wrong
  A.mon.hallu = mon((g) => { ell(g, 24, 24, 16, 17, "#57c9b5"); g.strokeStyle = "#57c9b5"; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.moveTo(30, 36); g.quadraticCurveTo(40, 46, 30, 45); g.quadraticCurveTo(22, 44, 26, 40); g.stroke(); inside(g, () => { ell(g, 17, 14, 8, 6, "#b7f3e4"); ell(g, 34, 34, 9, 12, "#2f9c8e"); }); eye(g, 16, 22, 3); eye(g, 24, 19, 3.4); eye(g, 32, 22, 3); ell(g, 24, 30, 3, 2, INK); [0, 1, 2, 3, 4, 5].forEach((k) => box(g, 3 + k * 1.5, 30 - (k % 2), 1, 5, "#57c9b5")); poly(g, [[24, 0], [26, 4], [30, 5], [26, 6], [24, 10], [22, 6], [18, 5], [22, 4]], "#ffe08a"); });
  // SCRIBB, the ink one: a stub of pencil with opinions
  A.mon.scribb = mon((g) => { poly(g, [[15, 10], [33, 10], [33, 36], [24, 46], [15, 36]], "#ffd76a"); poly(g, [[15, 36], [33, 36], [24, 46]], "#f2c3a5"); poly(g, [[21, 42], [27, 42], [24, 46]], INK); box(g, 15, 4, 18, 6, "#ff9dbb"); box(g, 15, 9, 18, 3, "#cfd3e0"); inside(g, () => { box(g, 28, 10, 5, 28, "#f0b93a"); box(g, 16, 10, 2, 28, "#ffeaa6"); }); eye(g, 20, 21, 3); eye(g, 28, 21, 3); line(g, 20, 28, 24, 30, INK, 1.3); line(g, 24, 30, 28, 28, INK, 1.3); line(g, 15, 24, 8, 20, "#ffd76a", 2.5); line(g, 33, 24, 40, 28, "#ffd76a", 2.5); });
  // LA CROISIERE: a small boat on holiday, filming itself
  A.mon.croisiere = mon((g) => { poly(g, [[4, 28], [44, 28], [38, 40], [10, 40]], "#fff4e0"); inside(g, () => { box(g, 4, 28, 40, 3, "#f2907f"); box(g, 6, 36, 36, 4, "#e9dccb"); }); box(g, 22, 4, 2, 24, "#8d5d45"); poly(g, [[24, 5], [40, 24], [24, 24]], "#ffffff"); poly(g, [[22, 8], [22, 24], [9, 24]], "#ff9dbb"); box(g, 13, 31, 9, 4, INK); box(g, 26, 31, 9, 4, INK); box(g, 22, 32, 4, 1, INK); line(g, 20, 37, 28, 37, INK, 1.2); box(g, 40, 18, 5, 8, "#3a3350"); box(g, 41, 19, 3, 5, "#86d2ec"); line(g, 40, 30, 42, 26, "#fff4e0", 2); ell(g, 6, 43, 4, 1.6, "#86d2ec"); ell(g, 22, 44, 6, 1.6, "#86d2ec"); ell(g, 40, 43, 4, 1.6, "#86d2ec"); });
  // AI COMMISSIONS: a hand that was asked for five fingers
  A.mon.commish = mon((g) => { ell(g, 24, 30, 13, 12, "#f2c3a5"); [[9, 14, -0.5], [14, 7, -0.3], [20, 4, -0.1], [26, 4, .1], [32, 6, .3], [37, 11, .45], [40, 20, .8]].forEach(([x, y], i) => line(g, 24 + (x - 24) * .55, 26, x, y, "#f2c3a5", 5)); inside(g, () => ell(g, 30, 36, 10, 8, "#e0a585")); ell(g, 24, 29, 6, 4.5, "#fff"); ell(g, 24, 29, 3, 3, "#57c9b5"); ell(g, 24, 29, 1.4, 1.4, INK); box(g, 16, 40, 16, 6, "#3a3350"); box(g, 16, 40, 16, 2, "#b79cff"); });
  // 3D EXPLORATIONS: a chrome blob with the default cube still sitting on it
  A.mon.blob = mon((g) => { ell(g, 24, 31, 17, 13, "#c9c2d3"); ell(g, 14, 24, 8, 8, "#c9c2d3"); ell(g, 35, 25, 7, 7, "#c9c2d3"); inside(g, () => { ell(g, 24, 38, 18, 7, "#8e86a3"); ell(g, 17, 23, 7, 4, "#ffffff"); ell(g, 32, 34, 6, 3, "#ff9dbb"); ell(g, 14, 33, 5, 2.5, "#86d2ec"); }); eye(g, 20, 30, 2.6); eye(g, 29, 30, 2.6); ell(g, 24.5, 35, 2.2, 1.4, INK); poly(g, [[24, 4], [31, 7], [24, 10], [17, 7]], "#e9e4f0"); poly(g, [[17, 7], [24, 10], [24, 18], [17, 15]], "#b9b3c8"); poly(g, [[31, 7], [24, 10], [24, 18], [31, 15]], "#9aa0b5"); });
  // AI EXPERIMENTS: the goat, on the line
  A.mon.goat = mon((g) => { box(g, 3, 6, 3, 40, "#8d5d45"); box(g, 42, 6, 3, 40, "#8d5d45"); box(g, 0, 8, 9, 2, "#8d5d45"); box(g, 39, 8, 9, 2, "#8d5d45"); g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.moveTo(4, 12); g.quadraticCurveTo(24, 20, 44, 12); g.stroke(); ell(g, 23, 25, 10, 6.5, "#fbf7ef"); ell(g, 33, 18, 5, 4.4, "#fbf7ef"); inside(g, () => ell(g, 22, 29, 9, 3, "#e3dccb")); box(g, 31, 11, 2, 4, "#c9a27c"); box(g, 35, 11, 2, 4, "#c9a27c"); box(g, 35, 22, 2, 4, "#e9e2d2"); [16, 20, 26, 30].forEach((x) => box(g, x, 30, 2, 8, "#e9e2d2")); [16, 20, 26, 30].forEach((x) => box(g, x, 37, 2, 1, INK)); ell(g, 35, 17, 1, 1, INK); box(g, 37, 19, 2, 1, "#ff9dbb"); line(g, 13, 23, 10, 20, "#fbf7ef", 2); });
  // SUMMER OF SPORT: a drawing tablet that has taken up running
  A.mon.sport = mon((g) => { g.save(); g.translate(24, 22); g.rotate(-.18); g.fillStyle = "#3a3350"; g.fillRect(-13, -17, 26, 34); g.fillStyle = "#fff4e0"; g.fillRect(-11, -15, 22, 30); g.fillStyle = "#86d2ec"; g.fillRect(-11, 3, 22, 12); g.fillStyle = "#f2907f"; g.beginPath(); g.arc(-3, -6, 5, 0, 7); g.fill(); g.fillStyle = "#ffd76a"; g.fillRect(2, -12, 7, 3); g.restore(); eye(g, 20, 24, 2.4); eye(g, 28, 22, 2.4); line(g, 21, 29, 28, 27, INK, 1.2); box(g, 11, 13, 24, 3, "#f0546a"); line(g, 16, 38, 9, 45, "#3a3350", 3); line(g, 30, 37, 38, 43, "#3a3350", 3); line(g, 38, 43, 43, 42, "#f0546a", 3); line(g, 9, 45, 5, 43, "#f0546a", 3); line(g, 36, 20, 45, 6, "#cfd3e0", 2); line(g, 45, 6, 46, 4, INK, 2); });
  // #RELAX: something that could attack you and has decided against it
  A.mon.relax = mon((g) => { line(g, 5, 14, 5, 46, "#96683f", 3); line(g, 43, 14, 43, 46, "#96683f", 3); g.strokeStyle = "#fff4e0"; g.lineWidth = 6; g.beginPath(); g.moveTo(5, 18); g.quadraticCurveTo(24, 44, 43, 18); g.stroke(); g.strokeStyle = "#ff9dbb"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(6, 21); g.quadraticCurveTo(24, 45, 42, 21); g.stroke(); ell(g, 24, 26, 13, 8, "#8fc7a4"); ell(g, 14, 20, 7, 6.5, "#a9dcbc"); inside(g, () => ell(g, 27, 30, 11, 4, "#6aa784")); box(g, 9, 18, 5, 3, INK); box(g, 15, 18, 5, 3, INK); box(g, 14, 19, 1, 1, INK); line(g, 12, 24, 16, 24, INK, 1.2); line(g, 34, 22, 40, 14, "#8fc7a4", 3); box(g, 38, 8, 5, 7, "#ffd76a"); box(g, 40, 4, 1, 5, "#f0546a"); ell(g, 36, 3, 1.5, 1.5, "#fff"); });
  // COCA-COLA: a bead of fizz that can only say three things
  A.mon.fizz = mon((g) => { g.fillStyle = "#8a4a2a"; g.beginPath(); g.moveTo(24, 6); g.quadraticCurveTo(42, 26, 38, 36); g.quadraticCurveTo(24, 50, 10, 36); g.quadraticCurveTo(6, 26, 24, 6); g.fill(); inside(g, () => { ell(g, 17, 24, 5, 9, "#b06a3e"); ell(g, 30, 40, 12, 6, "#5d2c16"); }); eye(g, 19, 27, 3); eye(g, 29, 27, 3); ell(g, 24, 36, 4.5, 3.6, INK); ell(g, 24, 37.5, 2.6, 1.6, "#f0546a"); [[8, 10, 2.4], [40, 14, 1.8], [36, 4, 2.6], [12, 3, 1.6], [43, 26, 1.4]].forEach(([x, y, rr]) => { ell(g, x, y, rr, rr, "#fff2dc"); }); });
  // GUMTREE: a tree with a few good finds hanging off it
  A.mon.gum = mon((g) => { box(g, 20, 28, 8, 18, "#8d5d45"); inside(g, () => box(g, 25, 28, 3, 18, "#6f4533")); ell(g, 24, 17, 17, 14, "#5fb089"); ell(g, 13, 22, 8, 7, "#5fb089"); ell(g, 36, 22, 8, 7, "#5fb089"); inside(g, () => { ell(g, 18, 10, 9, 5, "#93d9a8"); ell(g, 30, 25, 12, 6, "#43917a"); }); eye(g, 21, 35, 2); eye(g, 27, 35, 2); line(g, 21, 40, 27, 40, INK, 1.2); const tag = (x, y, c) => { line(g, x + 2, y - 5, x + 2, y, INK, 1); box(g, x, y, 5, 6, c); box(g, x + 1, y + 2, 3, 1, INK); }; tag(9, 24, "#ffd76a"); tag(33, 26, "#ff9dbb"); tag(22, 6, "#fff4e0"); });
  // THE BLANK PAGE
  A.mon.page = mon((g) => { poly(g, [[9, 3], [33, 3], [40, 10], [40, 45], [9, 45]], "#ffffff"); poly(g, [[33, 3], [40, 10], [33, 10]], "#d9d5e2"); inside(g, () => box(g, 9, 40, 31, 5, "#ece8f3")); box(g, 14, 17, 7, 3, INK); box(g, 27, 17, 7, 3, INK); line(g, 13, 13, 21, 15, INK, 1.4); line(g, 35, 13, 27, 15, INK, 1.4); box(g, 14, 28, 2, 10, INK); line(g, 20, 36, 34, 36, "#d9d5e2", 1); });
  // THE CRAWLER, from the other site
  A.mon.crawler = mon((g) => { [[-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0, 1]].forEach(([sx, sy], i) => { const kx = 24 + sx * 12 + (i % 2) * 2, ky = 22 + sy * 8 - 6, fx = 24 + sx * (19 + (i % 3) * 2), fy = 24 + sy * 14 + 8; line(g, 24, 24, kx, ky, INK, 1.4); line(g, kx, ky, fx, fy, INK, 1.4); ell(g, kx, ky, 1.8, 1.8, "#fff4e0"); ell(g, fx, fy, 1.6, 1.6, INK); }); ell(g, 24, 24, 9, 9, "#fff4e0"); ell(g, 25, 25, 4, 4, "#f0546a"); ell(g, 24, 24, 1.3, 1.3, "#fff"); ell(g, 33, 16, 3, 3, "#fff4e0"); }, INK);
  // the things that get in the way of the work
  A.mon.deadline = mon((g) => { ell(g, 24, 27, 15, 15, "#f0546a"); ell(g, 24, 27, 11.5, 11.5, "#fff4e0"); ell(g, 11, 11, 5, 5, "#ffd76a"); ell(g, 37, 11, 5, 5, "#ffd76a"); line(g, 24, 27, 24, 19, INK, 1.6); line(g, 24, 27, 30, 29, INK, 1.6); line(g, 15, 20, 21, 23, INK, 1.6); line(g, 33, 20, 27, 23, INK, 1.6); box(g, 14, 41, 4, 5, "#3a3350"); box(g, 30, 41, 4, 5, "#3a3350"); });
  A.mon.feedback = mon((g) => { g.fillStyle = "#b79cff"; g.beginPath(); g.moveTo(6, 8); g.lineTo(42, 8); g.lineTo(42, 32); g.lineTo(22, 32); g.lineTo(13, 43); g.lineTo(15, 32); g.lineTo(6, 32); g.closePath(); g.fill(); inside(g, () => box(g, 6, 27, 36, 5, "#8e75e6")); eye(g, 17, 16, 2.6); eye(g, 31, 16, 2.6); box(g, 15, 22, 18, 5, INK); for (let x = 16; x < 32; x += 4) box(g, x, 22, 3, 2, "#fff"); line(g, 14, 12, 20, 13, INK, 1.3); line(g, 34, 12, 28, 13, INK, 1.3); });
  A.mon.impostor = mon((g) => { poly(g, [[14, 12], [34, 12], [42, 44], [6, 44]], "#e9e4f0"); ell(g, 24, 14, 10, 9, "#e9e4f0"); ell(g, 12, 44, 6, 2.5, "#e9e4f0"); ell(g, 36, 44, 6, 2.5, "#e9e4f0"); ell(g, 24, 45, 6, 2, "#e9e4f0"); inside(g, () => ell(g, 33, 34, 8, 12, "#c9c2d3")); ell(g, 18, 20, 5, 5, "#3a3350"); ell(g, 30, 20, 5, 5, "#3a3350"); ell(g, 18, 20, 3.4, 3.4, "#d5f4ff"); ell(g, 30, 20, 3.4, 3.4, "#d5f4ff"); box(g, 22, 19, 4, 1, "#3a3350"); ell(g, 24, 25, 2.5, 2.2, "#f2c3a5"); poly(g, [[15, 29], [24, 27], [33, 29], [29, 32], [24, 30], [19, 32]], "#3a3350"); });
  // a soft oval of shade to stand things on
  A.shadow = (w) => { const c = cv(w, Math.max(4, Math.round(w * .34))), g = c.getContext("2d"); ell(g, w / 2, c.height / 2, w / 2, c.height / 2, "rgba(43,31,59,.22)"); return c; };
  A.sh = { 12: A.shadow(12), 16: A.shadow(16), 22: A.shadow(22), 40: A.shadow(40) };
  A.flip = flip;
  return A;
}
