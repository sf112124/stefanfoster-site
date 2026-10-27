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
  g1: "#88d070", g2: "#a3d692", g3: "#84c481", g4: "#6aae74",
  p1: "#f4e2b6", p2: "#e8cf98", p3: "#d7b87f",
  s1: "#fbeccb", s2: "#f2dba9", s3: "#e3c58a",
  w1: "#86d2ec", w2: "#b8edfb", w3: "#62b4dc", foam: "#d8f0ff",
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
  9: ["#9be15d", "#5fae34", "#e2ffb8"],   // Cappadocia, balloon green
};

export function buildArt() {
  const A = { tile: {}, obj: {}, who: {}, mon: {}, grass: {} };
  const r = rng(11);
  const speck = (R, n, cols, w = 1, h = 1) => { for (let i = 0; i < n; i++) R(Math.floor(r() * (16 - w + 1)), Math.floor(r() * (16 - h + 1)), w, h, cols[Math.floor(r() * cols.length)]); };
  // ---- ground ----
  // Game Boy Advance style ground: flat colours, a regular little tick pattern on the grass, clean dots on the paths
  const G = { g: "#88d070", gd: "#58b048", gl: "#b0e890", p: "#e8d498", pd: "#d0b878", pl: "#f8e8b8", w: "#58a8f0", wl: "#a8d8ff", wd: "#3888d8" };
  const tick = (R, x, y) => { R(x, y + 1, 1, 1, G.gd); R(x + 1, y, 1, 1, G.gd); R(x + 2, y + 1, 1, 1, G.gd); R(x + 1, y - 1, 1, 1, G.gl); };
  const grass = (extra) => px(16, 16, (R) => { R(0, 0, 16, 16, G.g); tick(R, 2, 3); tick(R, 10, 2); tick(R, 6, 9); tick(R, 12, 11); tick(R, 1, 13); extra && extra(R); });
  const flower = (R, x, y, col, mid = "#f8d838") => { R(x - 1, y - 1, 1, 1, col); R(x + 1, y - 1, 1, 1, col); R(x - 1, y + 1, 1, 1, col); R(x + 1, y + 1, 1, 1, col); R(x, y - 1, 1, 1, col); R(x - 1, y, 1, 1, col); R(x + 1, y, 1, 1, col); R(x, y + 1, 1, 1, col); R(x, y, 1, 1, mid); R(x, y + 2, 1, 1, G.gd); };
  A.tile.grass = [grass(), grass(), grass(), grass((R) => { flower(R, 4, 5, "#f05858"); flower(R, 11, 11, "#ffffff"); }), grass(), grass((R) => { flower(R, 10, 4, "#ffffff"); flower(R, 5, 11, "#f05858"); })];
  A.tile.path = [0, 1, 2].map((k) => px(16, 16, (R) => { R(0, 0, 16, 16, G.p); [[3, 4], [11, 2], [7, 10], [13, 12], [2, 13]].forEach(([x, y], i) => { if ((i + k) % 3) { R(x, y, 2, 1, G.pd); R(x, y - 1, 2, 1, G.pl); } }); }));
  A.tile.sand = [0, 1, 2].map((k) => px(16, 16, (R) => { R(0, 0, 16, 16, "#f8e8b0"); [[3, 4], [11, 3], [7, 11], [13, 13]].forEach(([x, y], i) => { if ((i + k) % 2) R(x, y, 1, 1, "#e0c888"); }); }));
  A.tile.water = [px(16, 16, (R) => { R(0, 0, 16, 16, G.w); })];
  // little curled waves sliding across the water, a frame at a time
  A.tile.glint = [0, 1, 2, 3].map((f) => px(16, 16, (R) => { const wave = (x, y) => { x = (x + f * 2) % 16; R(x, y, 3, 1, G.wl); R((x + 3) % 16, y + 1, 1, 1, G.wd); R((x + 15) % 16, y + 1, 1, 1, G.wd); }; wave(1, 3); wave(9, 7); wave(4, 12); }));
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
  // ---- the MAL office: tired carpet tiles, kitchen lino, glass walls, stairs ----
  A.tile.carpet = [0, 1].map((k) => px(16, 16, (R) => { R(0, 0, 16, 16, "#5d6170"); speck(R, 10, ["#535766", "#676b7a"]); R(k ? 0 : 15, 0, 1, 16, "#565a69"); R(0, 15, 16, 1, "#565a69"); }));
  A.tile.kitchen = [0, 1].map((k) => px(16, 16, (R) => { R(0, 0, 16, 16, "#e9e6df"); R(0, 0, 8, 8, k ? "#dcd8cf" : "#e9e6df"); R(8, 8, 8, 8, k ? "#dcd8cf" : "#e9e6df"); R(0, 0, 8, 8, k ? "#dcd8cf" : "#e9e6df"); R(8, 0, 8, 8, k ? "#e9e6df" : "#dcd8cf"); R(0, 8, 8, 8, k ? "#e9e6df" : "#dcd8cf"); }));
  A.tile.glass = [px(16, 16, (R) => { R(0, 0, 16, 16, "#5d6170"); R(0, 0, 16, 16, "rgba(190,230,255,.55)"); R(0, 0, 16, 2, "#9aa0b5"); R(0, 14, 16, 2, "#9aa0b5"); R(7, 0, 2, 16, "#9aa0b5"); R(2, 4, 4, 1, "#ffffff"); R(3, 5, 2, 1, "#ffffff"); R(10, 9, 3, 1, "#ffffff"); })];
  const stairs = (up) => px(16, 16, (R) => { R(0, 0, 16, 16, "#3b3e4a"); for (let i = 0; i < 4; i++) { const y = up ? i * 4 : 12 - i * 4, sh = up ? 4 + i * 1 : 7 - i; R(0, y, 16, 3, ["#9aa0b5", "#868ca1", "#72788d", "#5e6479"][up ? 3 - i : i]); R(0, y + 3, 16, 1, "#2b2836"); } R(1, 0, 1, 16, "#c9ccd8"); R(14, 0, 1, 16, "#c9ccd8"); });
  A.tile.stairsU = [stairs(1)]; A.tile.stairsD = [stairs(0)];
  A.tile.paving = [0, 1].map((k) => px(16, 16, (R) => { R(0, 0, 16, 16, "#c9c6c0"); R(0, 7, 16, 1, "#aeaba4"); R(0, 15, 16, 1, "#aeaba4"); R(k ? 4 : 11, 0, 1, 7, "#aeaba4"); R(k ? 12 : 6, 8, 1, 7, "#aeaba4"); speck(R, 4, ["#b9b6af"]); }));
  // freshly mopped carpet: darker, with shiny streaks
  A.tile.wet = [0, 1].map((k) => px(16, 16, (R) => { R(0, 0, 16, 16, "#55607a"); R(0, 15, 16, 1, "#4c566e"); R(k ? 2 : 6, 3, 6, 1, "#9fb8dc"); R(k ? 3 : 7, 4, 3, 1, "#c8dcf5"); R(k ? 9 : 1, 10, 5, 1, "#8aa4cc"); R(k ? 10 : 2, 11, 2, 1, "#c8dcf5"); }));
  // the ragged edge where one ground meets another: little bites of the neighbour's colour along a side
  A.fringe = (g, x, y, side, col, seed) => {
    const q = rng(seed * 7 + side * 131 + 3); g.fillStyle = col;
    for (let i = 0; i < 16; i += 2) { const d = 1 + Math.floor(q() * 2.6); if (side === 0) g.fillRect(x + i, y, 2, d); else if (side === 1) g.fillRect(x + 16 - d, y + i, d, 2); else if (side === 2) g.fillRect(x + i, y + 16 - d, 2, d); else g.fillRect(x, y + i, d, 2); }
  };
  // long grass: two frames of sway per zone, drawn over whatever ground it grows on
  for (const z in GRASS) {
    const [a, b, t] = ["#50b048", "#2c7c34", "#98e078"];   // one classic tall grass everywhere, like the handhelds
    A.grass[z] = [0, 1].map((f) => px(16, 16, (R) => {
      // GBA tall grass: rows of pointed blades with a dark edge, filling the whole tile
      const blade = (x, y) => { const s = f && x % 2 ? 1 : 0; R(x + s, y, 1, 1, t); R(x, y + 1, 2, 1, a); R(x - 1 + s, y + 2, 4, 2, a); R(x - 1, y + 4, 4, 1, b); };
      for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) blade(col * 4 + (row % 2 ? 2 : 1), row * 5);
    }));
  }
  // ---- things that stand on the ground. Each is anchored by the middle of its bottom edge. ----
  // GBA trees: a stack of round lumps, dark underneath, a bright rim on top, a short trunk, dark green outline
  const tree = (c1, c2, c3) => shape(22, 32, (g) => { box(g, 9, 24, 4, 7, "#9a6a3a"); box(g, 9, 24, 1, 7, "#6e4824"); ell(g, 11, 17, 10, 8, c2); ell(g, 5, 13, 5, 5, c2); ell(g, 17, 13, 5, 5, c2); ell(g, 11, 8, 8, 7, c2); inside(g, () => { ell(g, 11, 6, 7, 4, c1); ell(g, 5, 11, 4, 3, c1); ell(g, 17, 11, 4, 3, c1); ell(g, 11, 14, 8, 3, c1); ell(g, 9, 4, 3, 1.6, c3); ell(g, 4, 10, 1.6, 1, c3); ell(g, 16, 10, 2, 1, c3); ell(g, 11, 13, 3, 1, c3); }); }, "#1c4a24");
  A.obj.tree = tree("#58b858", "#2f8a40", "#a0e090");
  A.obj.tree2 = tree("#68c060", "#3a9048", "#b0e898");
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
  // the three tools on the stands, small
  A.obj.pick_ai = shape(12, 13, (g) => { ell(g, 6, 8, 5, 5, "#57c9b5"); box(g, 4, 7, 1, 2, INK); box(g, 7, 7, 1, 2, INK); poly(g, [[6, 0], [7, 1.5], [8.5, 2], [7, 2.5], [6, 4], [5, 2.5], [3.5, 2], [5, 1.5]], "#ffe08a"); });
  A.obj.pick_ps = shape(13, 13, (g) => { box(g, 5, 0, 8, 8, "#e9e4f0"); box(g, 5, 0, 4, 4, "#b9b3c8"); box(g, 9, 4, 4, 4, "#b9b3c8"); box(g, 3, 2, 8, 8, "#6ea4f2"); box(g, 0, 5, 9, 8, "#d5ecff"); box(g, 2, 8, 1, 2, INK); box(g, 6, 8, 1, 2, INK); });
  A.obj.pick_pr = shape(12, 13, (g) => { box(g, 1, 6, 10, 7, "#3a3350"); box(g, 1, 3, 10, 3, "#fff4e0"); [2, 6, 10].forEach((x) => poly(g, [[x, 3], [x + 2, 3], [x + 1, 6], [x - 1, 6]], "#3a3350")); box(g, 3, 8, 2, 2, "#fff"); box(g, 7, 8, 2, 2, "#fff"); });
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
  // ---- the creatures, 48 by 48. All of them made up for this place. ----
  const mon = (fn) => shape(48, 48, fn);
  const eye = (g, x, y, r = 2.4) => { ell(g, x, y, r, r, "#fff"); ell(g, x + .5, y + .3, r * .55, r * .55, INK); };
  // AI: a soft spirit with a spark over its head
  A.mon.ai = mon((g) => { const s4 = (x, y, r) => poly(g, [[x, y - r], [x + r * .3, y - r * .3], [x + r, y], [x + r * .3, y + r * .3], [x, y + r], [x - r * .3, y + r * .3], [x - r, y], [x - r * .3, y - r * .3]], "#ffe08a"); ell(g, 24, 28, 15, 13.5, "#57c9b5"); g.strokeStyle = "#57c9b5"; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.moveTo(29, 38); g.quadraticCurveTo(40, 47, 29, 45.5); g.quadraticCurveTo(20, 44, 25, 40); g.stroke(); line(g, 9, 30, 5, 34, "#57c9b5", 3.5); line(g, 39, 30, 43, 34, "#57c9b5", 3.5); inside(g, () => { ell(g, 17, 19, 7, 4.5, "#b7f3e4"); ell(g, 35, 37, 8, 12, "#2f9c8e"); }); eye(g, 18, 27, 3.2); eye(g, 30, 27, 3.2); line(g, 21, 33, 24, 34.5, INK, 1.3); line(g, 24, 34.5, 27, 33, INK, 1.3); s4(24, 7, 6.5); s4(42, 15, 3.6); s4(6, 20, 3); });
  // PHOTOSHOP: three layers stacked up, holding a brush
  A.mon.ps = mon((g) => { box(g, 17, 4, 22, 22, "#f3f0f8"); for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) if ((x + y) % 2) box(g, 17 + x * 4, 4 + y * 4, x === 5 ? 2 : 4, y === 5 ? 2 : 4, "#b9b3c8"); box(g, 11, 10, 23, 23, "#6ea4f2"); inside(g, () => box(g, 11, 10, 23, 3, "#9cc4fb")); box(g, 4, 17, 25, 25, "#d5ecff"); inside(g, () => { box(g, 4, 17, 25, 3, "#ffffff"); box(g, 4, 38, 25, 4, "#a9d0f2"); }); eye(g, 11, 28, 3); eye(g, 21, 28, 3); line(g, 13, 34, 16, 35.5, INK, 1.3); line(g, 16, 35.5, 19, 34, INK, 1.3); box(g, 8, 42, 4, 4, "#6ea4f2"); box(g, 20, 42, 4, 4, "#6ea4f2"); line(g, 29, 34, 36, 36, "#d5ecff", 3); line(g, 35, 43, 41, 25, "#96683f", 3); line(g, 41, 25, 42.5, 20, "#cfd3e0", 4); line(g, 43, 18, 44.5, 12, "#ff9dbb", 4.5); });
  // PREMIERE: a clapperboard on two legs
  A.mon.pr = mon((g) => { box(g, 14, 42, 4, 4, "#6c7088"); box(g, 30, 42, 4, 4, "#6c7088"); box(g, 8, 22, 32, 20, "#3a3350"); inside(g, () => { box(g, 8, 38, 32, 4, "#2b2540"); box(g, 8, 22, 32, 1, "#b79cff"); }); box(g, 8, 17, 32, 5, "#fff4e0"); [0, 1, 2, 3].forEach((k) => poly(g, [[9 + k * 8, 17], [13 + k * 8, 17], [16 + k * 8, 22], [12 + k * 8, 22]], "#3a3350")); g.save(); g.translate(8, 17); g.rotate(-.36); g.fillStyle = "#fff4e0"; g.fillRect(0, -5, 32, 5); [0, 1, 2, 3].forEach((k) => poly(g, [[4 + k * 8, -5], [8 + k * 8, -5], [5 + k * 8, 0], [1 + k * 8, 0]], "#3a3350")); g.restore(); ell(g, 9, 17, 2, 2, "#b79cff"); eye(g, 18, 30, 3); eye(g, 30, 30, 3); line(g, 21, 36, 24, 37.5, "#fff4e0", 1.3); line(g, 24, 37.5, 27, 36, "#fff4e0", 1.3); });
  // LA CROISIERE: a small boat, filming on a phone
  A.mon.croisiere = mon((g) => { poly(g, [[4, 28], [44, 28], [38, 40], [10, 40]], "#fff4e0"); inside(g, () => { box(g, 4, 28, 40, 3, "#f2907f"); box(g, 6, 36, 36, 4, "#e9dccb"); }); box(g, 22, 4, 2, 24, "#8d5d45"); poly(g, [[24, 5], [40, 24], [24, 24]], "#ffffff"); poly(g, [[22, 8], [22, 24], [9, 24]], "#ff9dbb"); box(g, 13, 31, 9, 4, INK); box(g, 26, 31, 9, 4, INK); box(g, 22, 32, 4, 1, INK); line(g, 20, 37, 28, 37, INK, 1.2); box(g, 40, 18, 5, 8, "#3a3350"); box(g, 41, 19, 3, 5, "#86d2ec"); line(g, 40, 30, 42, 26, "#fff4e0", 2); ell(g, 6, 43, 4, 1.6, "#86d2ec"); ell(g, 22, 44, 6, 1.6, "#86d2ec"); ell(g, 40, 43, 4, 1.6, "#86d2ec"); });
  // AI COMMISSIONS: a popsicle, after the Plage popsicle films
  A.mon.commish = mon((g) => { box(g, 21, 33, 6, 13, "#e3bd8c"); inside(g, () => box(g, 25, 33, 2, 13, "#c99a66")); ell(g, 24, 15, 11, 11, "#ff9dbb"); box(g, 13, 15, 22, 20, "#ff9dbb"); inside(g, () => { box(g, 13, 25, 22, 10, "#ffd76a"); box(g, 13, 23, 22, 2, "#fff4e0"); box(g, 31, 4, 4, 31, "rgba(43,31,59,.14)"); box(g, 16, 9, 2, 12, "#ffd0e0"); }); eye(g, 20, 19, 2.8); eye(g, 28, 19, 2.8); line(g, 22, 29, 24, 30.5, INK, 1.3); line(g, 24, 30.5, 26, 29, INK, 1.3); });
  // 3D EXPLORATIONS: a chrome blob with a cube on its head
  A.mon.blob = mon((g) => { ell(g, 24, 31, 17, 13, "#c9c2d3"); ell(g, 14, 24, 8, 8, "#c9c2d3"); ell(g, 35, 25, 7, 7, "#c9c2d3"); inside(g, () => { ell(g, 24, 38, 18, 7, "#8e86a3"); ell(g, 17, 23, 7, 4, "#ffffff"); ell(g, 32, 34, 6, 3, "#ff9dbb"); ell(g, 14, 33, 5, 2.5, "#86d2ec"); }); eye(g, 20, 30, 2.6); eye(g, 29, 30, 2.6); ell(g, 24.5, 35, 2.2, 1.4, INK); poly(g, [[24, 4], [31, 7], [24, 10], [17, 7]], "#e9e4f0"); poly(g, [[17, 7], [24, 10], [24, 18], [17, 15]], "#b9b3c8"); poly(g, [[31, 7], [24, 10], [24, 18], [31, 15]], "#9aa0b5"); });
  // AI EXPERIMENTS: the goat, on the line
  A.mon.goat = mon((g) => { box(g, 3, 6, 3, 40, "#8d5d45"); box(g, 42, 6, 3, 40, "#8d5d45"); box(g, 0, 8, 9, 2, "#8d5d45"); box(g, 39, 8, 9, 2, "#8d5d45"); g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.moveTo(4, 12); g.quadraticCurveTo(24, 20, 44, 12); g.stroke(); ell(g, 23, 25, 10, 6.5, "#fbf7ef"); ell(g, 33, 18, 5, 4.4, "#fbf7ef"); inside(g, () => ell(g, 22, 29, 9, 3, "#e3dccb")); box(g, 31, 11, 2, 4, "#c9a27c"); box(g, 35, 11, 2, 4, "#c9a27c"); box(g, 35, 22, 2, 4, "#e9e2d2"); [16, 20, 26, 30].forEach((x) => box(g, x, 30, 2, 8, "#e9e2d2")); [16, 20, 26, 30].forEach((x) => box(g, x, 37, 2, 1, INK)); ell(g, 35, 17, 1, 1, INK); box(g, 37, 19, 2, 1, "#ff9dbb"); line(g, 13, 23, 10, 20, "#fbf7ef", 2); });
  // SUMMER OF SPORT: a drawing tablet in running shoes
  A.mon.sport = mon((g) => { g.save(); g.translate(24, 22); g.rotate(-.18); g.fillStyle = "#3a3350"; g.fillRect(-13, -17, 26, 34); g.fillStyle = "#fff4e0"; g.fillRect(-11, -15, 22, 30); g.fillStyle = "#86d2ec"; g.fillRect(-11, 3, 22, 12); g.fillStyle = "#f2907f"; g.beginPath(); g.arc(-3, -6, 5, 0, 7); g.fill(); g.fillStyle = "#ffd76a"; g.fillRect(2, -12, 7, 3); g.restore(); eye(g, 20, 24, 2.4); eye(g, 28, 22, 2.4); line(g, 21, 29, 28, 27, INK, 1.2); box(g, 11, 13, 24, 3, "#f0546a"); line(g, 16, 38, 9, 45, "#3a3350", 3); line(g, 30, 37, 38, 43, "#3a3350", 3); line(g, 38, 43, 43, 42, "#f0546a", 3); line(g, 9, 45, 5, 43, "#f0546a", 3); line(g, 36, 20, 45, 6, "#cfd3e0", 2); line(g, 45, 6, 46, 4, INK, 2); });
  // #RELAX: lying in a hammock
  A.mon.relax = mon((g) => { line(g, 5, 14, 5, 46, "#96683f", 3); line(g, 43, 14, 43, 46, "#96683f", 3); g.strokeStyle = "#fff4e0"; g.lineWidth = 6; g.beginPath(); g.moveTo(5, 18); g.quadraticCurveTo(24, 44, 43, 18); g.stroke(); g.strokeStyle = "#ff9dbb"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(6, 21); g.quadraticCurveTo(24, 45, 42, 21); g.stroke(); ell(g, 24, 26, 13, 8, "#8fc7a4"); ell(g, 14, 20, 7, 6.5, "#a9dcbc"); inside(g, () => ell(g, 27, 30, 11, 4, "#6aa784")); box(g, 9, 18, 5, 3, INK); box(g, 15, 18, 5, 3, INK); box(g, 14, 19, 1, 1, INK); line(g, 12, 24, 16, 24, INK, 1.2); line(g, 34, 22, 40, 14, "#8fc7a4", 3); box(g, 38, 8, 5, 7, "#ffd76a"); box(g, 40, 4, 1, 5, "#f0546a"); ell(g, 36, 3, 1.5, 1.5, "#fff"); });
  // COCA-COLA: a bead of fizz
  A.mon.fizz = mon((g) => { g.fillStyle = "#8a4a2a"; g.beginPath(); g.moveTo(24, 6); g.quadraticCurveTo(42, 26, 38, 36); g.quadraticCurveTo(24, 50, 10, 36); g.quadraticCurveTo(6, 26, 24, 6); g.fill(); inside(g, () => { ell(g, 17, 24, 5, 9, "#b06a3e"); ell(g, 30, 40, 12, 6, "#5d2c16"); }); eye(g, 19, 27, 3); eye(g, 29, 27, 3); ell(g, 24, 36, 4.5, 3.6, INK); ell(g, 24, 37.5, 2.6, 1.6, "#f0546a"); [[8, 10, 2.4], [40, 14, 1.8], [36, 4, 2.6], [12, 3, 1.6], [43, 26, 1.4]].forEach(([x, y, rr]) => { ell(g, x, y, rr, rr, "#fff2dc"); }); });
  // GUMTREE: a tree with a few finds hanging off it
  A.mon.gum = mon((g) => { box(g, 20, 28, 8, 18, "#8d5d45"); inside(g, () => box(g, 25, 28, 3, 18, "#6f4533")); ell(g, 24, 17, 17, 14, "#5fb089"); ell(g, 13, 22, 8, 7, "#5fb089"); ell(g, 36, 22, 8, 7, "#5fb089"); inside(g, () => { ell(g, 18, 10, 9, 5, "#93d9a8"); ell(g, 30, 25, 12, 6, "#43917a"); }); eye(g, 21, 35, 2); eye(g, 27, 35, 2); line(g, 21, 40, 27, 40, INK, 1.2); const tag = (x, y, c) => { line(g, x + 2, y - 5, x + 2, y, INK, 1); box(g, x, y, 5, 6, c); box(g, x + 1, y + 2, 3, 1, INK); }; tag(9, 24, "#ffd76a"); tag(33, 26, "#ff9dbb"); tag(22, 6, "#fff4e0"); });
  // THE CRAWLER, from the other site
  A.mon.crawler = mon((g) => { [[-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0, 1]].forEach(([sx, sy], i) => { const kx = 24 + sx * 12 + (i % 2) * 2, ky = 22 + sy * 8 - 6, fx = 24 + sx * (19 + (i % 3) * 2), fy = 24 + sy * 14 + 8; line(g, 24, 24, kx, ky, INK, 1.4); line(g, kx, ky, fx, fy, INK, 1.4); ell(g, kx, ky, 1.8, 1.8, "#fff4e0"); ell(g, fx, fy, 1.6, 1.6, INK); }); ell(g, 24, 24, 9, 9, "#fff4e0"); ell(g, 25, 25, 4, 4, "#f0546a"); ell(g, 24, 24, 1.3, 1.3, "#fff"); ell(g, 33, 16, 3, 3, "#fff4e0"); }, INK);
  // ---- Stefan's things ----
  A.obj.monstera = shape(22, 30, (g) => { box(g, 6, 20, 10, 10, "#c98a55"); box(g, 5, 19, 12, 3, "#b06a3e"); [[4, 10, 6, 5], [16, 8, 6, 6], [10, 4, 6, 5], [7, 15, 5, 4], [15, 15, 5, 4], [11, 11, 4, 5]].forEach(([x, y, rx, ry], i) => { ell(g, x, y, rx, ry, i % 2 ? "#3f8f5f" : "#4fa86e"); }); line(g, 11, 20, 11, 6, "#2f6e47", 1); ell(g, 4, 10, 1.5, 3, "#2f6e47"); ell(g, 16, 8, 1.5, 3, "#2f6e47"); });
  A.obj.wardrobe = shape(16, 32, (g) => { box(g, 0, 0, 16, 32, "#d6a877"); box(g, 1, 1, 6, 30, "#e2bb8f"); box(g, 9, 1, 6, 30, "#e2bb8f"); box(g, 7, 12, 1, 6, "#96683f"); box(g, 8, 12, 1, 6, "#96683f"); });
  A.obj.oils = shape(14, 16, (g) => { box(g, 0, 8, 14, 8, "#96683f"); [[1, "#7a4a28"], [5, "#5d3a20"], [9, "#7a4a28"]].forEach(([x, c]) => { box(g, x, 2, 3, 6, c); box(g, x + 1, 0, 1, 2, "#2b1f3b"); }); });
  A.obj.tv = shape(32, 24, (g) => { box(g, 2, 16, 28, 8, "#96683f"); box(g, 2, 16, 28, 2, "#b98758"); box(g, 1, 0, 30, 16, "#1d1b22"); box(g, 2, 1, 28, 13, "#f6c2d6"); box(g, 4, 5, 8, 9, "#2b1f3b"); box(g, 18, 4, 7, 10, "#5d3a50"); box(g, 6, 3, 4, 3, "#f2c3a5"); box(g, 19, 2, 5, 3, "#f2c3a5"); box(g, 13, 2, 4, 2, "#ffffff"); });
  A.obj.tank = shape(16, 18, (g) => { box(g, 0, 14, 16, 4, "#96683f"); box(g, 1, 3, 14, 11, "#bfe6f2"); box(g, 1, 3, 14, 1, "#9aa0b5"); box(g, 1, 11, 14, 3, "#c9a27c"); ell(g, 8, 8, 2, 1.6, "#2b1f3b"); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => line(g, 8, 8, 8 + dx * 4, 8 + dy * 3, "#2b1f3b", 1)); box(g, 3, 6, 2, 1, "#ffffff"); });
  A.obj.arcade = shape(16, 30, (g) => { box(g, 1, 0, 14, 30, "#8a5ad6"); box(g, 1, 0, 14, 4, "#ffd76a"); box(g, 3, 6, 10, 8, "#1d1b22"); box(g, 4, 7, 8, 6, "#57c9b5"); box(g, 5, 8, 2, 4, "#ff9dbb"); box(g, 9, 9, 2, 3, "#ffd76a"); box(g, 2, 16, 12, 4, "#6e43b8"); ell(g, 6, 18, 1.4, 1.4, "#f0546a"); ell(g, 10, 18, 1.4, 1.4, "#57c9b5"); });
  const balloon = (c1, c2) => shape(36, 56, (g) => { ell(g, 18, 18, 16, 17, c1); inside(g, () => { [6, 12, 18, 24, 30].forEach((x, i) => { if (i % 2) box(g, x - 2, 0, 4, 40, c2); }); ell(g, 12, 10, 5, 6, "rgba(255,255,255,.35)"); }); poly(g, [[6, 28], [30, 28], [22, 38], [14, 38]], c1); line(g, 14, 38, 15, 46, "#6b4a3a", 1); line(g, 22, 38, 21, 46, "#6b4a3a", 1); box(g, 13, 46, 10, 8, "#b98758"); box(g, 13, 46, 10, 2, "#96683f"); box(g, 15, 49, 1, 5, "#96683f"); box(g, 19, 49, 1, 5, "#96683f"); });
  A.obj.balloon0 = balloon("#ff86b6", "#ffc4dd"); A.obj.balloon1 = balloon("#7fd27a", "#c8f2b0"); A.obj.balloon2 = balloon("#ffd23f", "#fff0a8");
  // the coffee kiosk on the square: striped awning, a counter, cups, a little chalkboard
  A.obj.kiosk = shape(32, 34, (g) => { box(g, 2, 12, 2, 22, "#5d4030"); box(g, 28, 12, 2, 22, "#5d4030"); for (let i = 0; i < 8; i++) box(g, i * 4, 6, 4, 7, i % 2 ? "#fff8ec" : "#57c9b5"); box(g, 0, 4, 32, 2, "#2f9c8e"); for (let i = 0; i < 8; i++) ell(g, i * 4 + 2, 13, 2, 1.6, i % 2 ? "#fff8ec" : "#57c9b5"); box(g, 1, 20, 30, 14, "#b98758"); box(g, 1, 20, 30, 2, "#d6a877"); box(g, 4, 24, 24, 8, "#96683f"); box(g, 6, 25, 9, 6, "#2b1f3b"); box(g, 7, 26, 4, 1, "#fff8ec"); box(g, 7, 28, 6, 1, "#ffd76a"); box(g, 18, 16, 3, 4, "#fff8ec"); box(g, 18, 16, 3, 1, "#c98a55"); box(g, 23, 15, 3, 5, "#fff8ec"); box(g, 23, 15, 3, 1, "#8d5d45"); box(g, 9, 16, 6, 4, "#cfd3e0"); box(g, 10, 17, 2, 2, "#2b1f3b"); box(g, 13, 0, 6, 4, "#ffd76a"); box(g, 15, 1, 2, 2, "#c98a55"); });
  // gym puzzle props
  A.obj.cabinet = shape(16, 24, (g) => { box(g, 0, 2, 16, 22, "#8f95a8"); box(g, 0, 2, 16, 2, "#b5bacb"); for (let i = 0; i < 3; i++) { box(g, 1, 5 + i * 6, 14, 5, "#a3a9bb"); box(g, 6, 7 + i * 6, 4, 1, "#5d6170"); } box(g, 0, 23, 16, 1, "#5d6170"); });
  A.obj.chair = shape(14, 20, (g) => { box(g, 2, 0, 10, 9, "#3a3350"); box(g, 3, 1, 8, 7, "#57507a"); box(g, 1, 9, 12, 4, "#3a3350"); box(g, 2, 10, 10, 2, "#6e43b8"); box(g, 6, 13, 2, 4, "#9aa0b5"); box(g, 1, 17, 12, 1, "#9aa0b5"); ell(g, 2, 18.5, 1.5, 1.5, "#2b1f3b"); ell(g, 12, 18.5, 1.5, 1.5, "#2b1f3b"); ell(g, 7, 18.5, 1.5, 1.5, "#2b1f3b"); });
  A.obj.wetsign = shape(12, 18, (g) => { poly(g, [[6, 0], [11, 17], [1, 17]], "#ffd23f"); poly(g, [[6, 2], [9, 13], [3, 13]], "#ffe58a"); box(g, 5, 5, 2, 5, "#2b1f3b"); box(g, 5, 11, 2, 2, "#2b1f3b"); box(g, 1, 16, 10, 2, "#c99a2e"); });
  A.obj.tape = shape(16, 18, (g) => { box(g, 1, 4, 2, 14, "#9aa0b5"); box(g, 13, 4, 2, 14, "#9aa0b5"); box(g, 0, 3, 4, 2, "#cfd3e0"); box(g, 12, 3, 4, 2, "#cfd3e0"); poly(g, [[0, 7], [16, 11], [16, 14], [0, 10]], "#f0546a"); poly(g, [[0, 13], [16, 6], [16, 9], [0, 16]], "#ff7d8e"); box(g, 3, 9, 3, 1, "#fff"); box(g, 10, 9, 3, 1, "#fff"); });
  // a production flight case: silver, black corners, chunky latches
  A.obj.kitcase = shape(18, 15, (g) => { box(g, 0, 2, 18, 13, "#c9ccd6"); box(g, 0, 2, 18, 3, "#e3e6ee"); box(g, 0, 8, 18, 1, "#8f95a8"); [[0, 2], [15, 2], [0, 12], [15, 12]].forEach(([x, y]) => box(g, x, y, 3, 3, "#2b2b33")); box(g, 5, 7, 2, 3, "#2b2b33"); box(g, 11, 7, 2, 3, "#2b2b33"); box(g, 7, 0, 4, 3, "#2b2b33"); box(g, 8, 1, 2, 1, "#c9ccd6"); box(g, 3, 11, 6, 2, "#ffd23f"); });
  A.obj.bench = shape(32, 16, (g) => { box(g, 0, 4, 32, 4, "#b98758"); box(g, 0, 0, 32, 3, "#96683f"); box(g, 2, 8, 2, 8, "#5d4030"); box(g, 28, 8, 2, 8, "#5d4030"); box(g, 14, 0, 3, 4, "#d5f4ff"); box(g, 15, -1, 1, 1, "#ff9dbb"); });
  // ---- the MAL office ----
  const PUR = "#8a5ad6", PUR2 = "#6e43b8", PUR3 = "#a97df0";
  // a black desk, a black monitor glowing blue, a keyboard: the same thing forty times over
  A.obj.bdesk = shape(16, 22, (g) => { box(g, 0, 10, 16, 8, "#2a2830"); box(g, 0, 10, 16, 2, "#3d3a45"); box(g, 1, 18, 2, 4, "#1d1b22"); box(g, 13, 18, 2, 4, "#1d1b22"); box(g, 2, 0, 12, 9, "#1d1b22"); box(g, 3, 1, 10, 7, "#5fa8e8"); box(g, 4, 2, 5, 1, "#cfe8ff"); box(g, 4, 4, 7, 1, "#9cc8f2"); box(g, 7, 9, 2, 2, "#1d1b22"); box(g, 4, 13, 7, 2, "#4a4753"); box(g, 12, 12, 2, 2, "#e9e4f0"); });
  // purple sofas, the L-shaped ones and the long ones
  A.obj.sofaL = shape(32, 26, (g) => { box(g, 0, 4, 32, 10, PUR2); box(g, 0, 12, 32, 8, PUR); box(g, 0, 12, 32, 2, PUR3); box(g, 22, 12, 10, 14, PUR); box(g, 22, 12, 10, 2, PUR3); box(g, 0, 4, 4, 16, PUR2); box(g, 28, 4, 4, 22, PUR2); box(g, 6, 7, 6, 4, PUR3); box(g, 14, 7, 6, 4, PUR3); });
  A.obj.sofaLf = flip(A.obj.sofaL);
  A.obj.sofa = shape(48, 22, (g) => { box(g, 0, 2, 48, 10, PUR2); box(g, 0, 10, 48, 8, PUR); box(g, 0, 10, 48, 2, PUR3); box(g, 0, 2, 4, 16, PUR2); box(g, 44, 2, 4, 16, PUR2); box(g, 2, 18, 3, 4, "#2b1f3b"); box(g, 43, 18, 3, 4, "#2b1f3b"); box(g, 16, 10, 1, 8, PUR2); box(g, 31, 10, 1, 8, PUR2); });
  A.obj.ctable = shape(32, 14, (g) => { box(g, 0, 0, 32, 8, "#e9e4f0"); box(g, 0, 6, 32, 2, "#c9c2d3"); box(g, 3, 8, 2, 6, "#9aa0b5"); box(g, 27, 8, 2, 6, "#9aa0b5"); box(g, 6, 2, 4, 3, "#ffd76a"); box(g, 20, 2, 5, 3, "#ff9dbb"); });
  A.obj.counter = shape(16, 22, (g) => { box(g, 0, 0, 16, 6, "#f4f1ea"); box(g, 0, 5, 16, 1, "#c9c2d3"); box(g, 0, 6, 16, 16, "#d8d2c6"); box(g, 7, 6, 1, 16, "#bdb6a8"); box(g, 3, 10, 2, 1, "#9aa0b5"); box(g, 11, 10, 2, 1, "#9aa0b5"); });
  A.obj.ktable = shape(48, 18, (g) => { box(g, 0, 0, 48, 10, "#d6a877"); box(g, 0, 8, 48, 2, "#b98758"); box(g, 3, 10, 3, 8, "#3a3350"); box(g, 42, 10, 3, 8, "#3a3350"); box(g, 8, 2, 3, 3, "#fff"); box(g, 22, 3, 6, 3, "#f0546a"); box(g, 36, 2, 3, 3, "#fff"); });
  A.obj.rdesk = shape(48, 20, (g) => { box(g, 0, 4, 48, 16, "#2a2830"); box(g, 0, 4, 48, 3, "#e9e4f0"); box(g, 14, 9, 20, 5, PUR); box(g, 34, 0, 8, 6, "#1d1b22"); box(g, 35, 1, 6, 4, "#5fa8e8"); });
  A.obj.printer = shape(16, 18, (g) => { box(g, 0, 4, 16, 14, "#c9c2d3"); box(g, 0, 4, 16, 3, "#e9e4f0"); box(g, 3, 0, 10, 5, "#fff"); box(g, 2, 10, 12, 2, "#2a2830"); box(g, 12, 7, 2, 1, "#5fc98a"); });
  A.obj.bin = shape(10, 16, (g) => { box(g, 1, 4, 8, 12, "#4a4753"); box(g, 0, 2, 10, 3, "#6c7088"); box(g, 3, 0, 4, 2, "#9aa0b5"); box(g, 3, 8, 4, 1, "#6c7088"); });
  A.obj.screen = px(34, 20, (R) => { R(0, 0, 34, 20, "#1d1b22"); R(1, 1, 32, 18, "#2f2a44"); R(1, 1, 32, 18, "#6e43b8"); R(4, 4, 14, 3, "#fff8ec"); R(4, 9, 22, 2, "#c9b6ff"); R(4, 13, 18, 2, "#c9b6ff"); });
  A.obj.board = px(30, 18, (R) => { R(0, 0, 30, 18, "#9aa0b5"); R(1, 1, 28, 16, "#fff"); [["#ffd76a", 3, 3], ["#ff9dbb", 10, 4], ["#86d2ec", 18, 3], ["#a9dcbc", 5, 10], ["#ffd76a", 14, 10], ["#ff9dbb", 22, 9]].forEach(([c, x, y]) => R(x, y, 5, 5, c)); });
  // the office from outside: a big dark block with a purple sign
  A.obj.mal = px(112, 88, (R, g) => {
    R(2, 8, 108, 80, "#3d3a45"); R(2, 8, 108, 3, "#55515e"); R(0, 4, 112, 6, "#2a2830");
    for (let fl = 0; fl < 3; fl++) for (let w = 0; w < 6; w++) { const x = 8 + w * 17, y = 16 + fl * 20; R(x, y, 13, 13, "#1d1b22"); R(x + 1, y + 1, 11, 11, fl === 2 && w > 3 ? "#ffe9b8" : "#7fb3dc"); R(x + 1, y + 1, 4, 3, "#cfe8ff"); }
    R(40, 66, 32, 22, "#1d1b22"); R(42, 68, 13, 20, "#9cc8f2"); R(57, 68, 13, 20, "#9cc8f2"); R(42, 68, 4, 6, "#d5f0ff"); R(55, 68, 2, 20, "#1d1b22");
    R(42, 56, 28, 9, "#8a5ad6"); R(42, 56, 28, 1, "#a97df0"); g.fillStyle = "#fff8ec"; g.font = "bold 8px monospace"; g.textAlign = "center"; g.fillText("MAL", 56, 63); g.textAlign = "left";
    g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(2.5, 8.5, 107, 79);
  });
  // a soft oval of shade to stand things on
  A.shadow = (w) => { const c = cv(w, Math.max(4, Math.round(w * .34))), g = c.getContext("2d"); ell(g, w / 2, c.height / 2, w / 2, c.height / 2, "rgba(43,31,59,.22)"); return c; };
  A.sh = { 12: A.shadow(12), 16: A.shadow(16), 22: A.shadow(22), 40: A.shadow(40) };
  A.flip = flip;
  return A;
}
