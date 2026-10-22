// The people of Foster Valley, 16 by 24, four ways to face and two steps each, drawn a pixel at a time.
// Every outfit is a recipe: a hat or a haircut, a top, maybe a tee showing under it, trousers, shoes, and a prop.
const INK = "#2b1f3b";
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
function outline(c) {
  const w = c.width + 2, h = c.height + 2, o = mk(w, h), g = o.getContext("2d"); g.drawImage(c, 1, 1);
  const im = g.getImageData(0, 0, w, h), d = im.data, on = new Uint8Array(w * h), k = hex(INK);
  for (let i = 0; i < w * h; i++) on[i] = d[i * 4 + 3] > 0 ? 1 : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (on[i]) continue; if ((x > 0 && on[i - 1]) || (x < w - 1 && on[i + 1]) || (y > 0 && on[i - w]) || (y < h - 1 && on[i + w])) { d[i * 4] = k[0]; d[i * 4 + 1] = k[1]; d[i * 4 + 2] = k[2]; d[i * 4 + 3] = 255; } }
  g.putImageData(im, 0, 0); return o;
}
const flip = (c) => { const o = mk(c.width, c.height), g = o.getContext("2d"); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; };
const dark = (h, k = .78) => "#" + hex(h).map((v) => Math.round(v * k).toString(16).padStart(2, "0")).join("");

// s: { skin, hair, cut: short|long|slick|bun|silver|none, hat: {col, kind: cap|bucket}, top, hem, legs, baggy, shoes, glasses, tie, lanyard, item }
function draw(s, dir, f) {
  const c = mk(16, 24), g = c.getContext("2d"), R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const sw = f ? 1 : 0, top2 = dark(s.top), legs2 = dark(s.legs, .7), hair2 = dark(s.hair || "#2b1f3b", .8);
  const side = dir === "left";
  // ---- legs and shoes (behind the body) ----
  const lw = s.baggy ? 5 : 4;
  if (side) {
    R(5, 17, 6, 5 - sw, s.legs); R(6, 17, 5, 5, s.legs); if (s.baggy) { R(5, 19, 1, 2, legs2); R(10, 18, 1, 1, legs2); }
    R(4, 21 + 1 - sw, 4, 2, s.shoes); R(8, 22, 4, 2, s.shoes); R(4, 23 - sw, 4, 1, dark(s.shoes, .7)); R(8, 23, 4, 1, dark(s.shoes, .7));
  } else {
    const lx = 8 - lw, rx = 8, la = f ? 4 : 5, ra = f ? 5 : 4;   // one leg lifts on each step
    R(lx, 17, lw, la, s.legs); R(rx, 17, lw, ra, s.legs); R(7, 17, 2, 3, legs2);
    if (s.baggy) { R(lx, 19, 1, 2, legs2); R(rx + lw - 1, 19, 1, 2, legs2); R(lx + 1, 18, 1, 1, legs2); R(rx + lw - 2, 18, 1, 1, legs2); }
    R(lx, 17 + la, lw, 2, s.shoes); R(rx, 17 + ra, lw, 2, s.shoes);
    R(lx, 18 + la, lw, 1, dark(s.shoes, .72)); R(rx, 18 + ra, lw, 1, dark(s.shoes, .72));
  }
  // ---- body ----
  if (side) {
    R(5, 11, 6, 6, s.top); R(5, 15, 6, 1, top2); if (s.hem) R(5, 16, 6, 2, s.hem); else R(5, 16, 6, 1, s.top);
    R(7, 11 + sw, 2, 5, top2); R(7, 16 + sw, 2, 1, s.skin);              // the near arm swings
    if (s.item === "phone") { R(4, 13, 2, 3, "#3a3350"); R(4, 13, 2, 1, "#86d2ec"); }
  } else {
    R(3, 11, 10, 6, s.top); R(4, 11, 8, 1, top2);
    if (dir === "down") { R(7, 11, 2, 1, s.skin); }
    if (s.hem) R(4, 16, 8, 2, s.hem); else R(4, 16, 8, 1, s.top);
    R(2, 11 + sw, 1, 5, s.top); R(13, 11 + (1 - sw), 1, 5, s.top); R(2, 16 + sw, 1, 1, s.skin); R(13, 16 + 1 - sw, 1, 1, s.skin);
    if (dir === "down") {
      if (s.tie) { R(7, 12, 2, 4, s.tie); R(6, 11, 1, 2, "#fff"); R(9, 11, 1, 2, "#fff"); }
      if (s.lanyard) { R(5, 11, 1, 3, s.lanyard); R(10, 11, 1, 3, s.lanyard); R(6, 14, 4, 1, s.lanyard); R(7, 15, 2, 2, "#fff"); }
      if (s.item === "clip") { R(11, 13, 3, 4, "#d6a877"); R(11, 13, 3, 1, "#96683f"); }
      if (s.item === "tablet") { R(10, 13, 4, 3, "#3a3350"); R(11, 14, 2, 1, "#57c9b5"); }
      if (s.item === "paper") { R(9, 13, 5, 5, "#fff"); R(10, 14, 3, 1, "#b9a0ff"); R(10, 16, 3, 1, "#ff9dbb"); }
      if (s.item === "phone") { R(12, 10, 2, 4, "#3a3350"); R(12, 10, 2, 1, "#86d2ec"); }
      if (s.item === "notes") { R(11, 14, 2, 2, "#ffd76a"); R(12, 15, 2, 2, "#ff9dbb"); }
    }
  }
  // ---- head ----
  if (side) {
    R(4, 4, 7, 6, s.skin); R(3, 7, 1, 1, s.skin);
    R(5, 6, 1, 2, INK); R(7, 9, 2, 1, dark(s.skin, .85));
    if (s.glasses) { R(4, 6, 3, 1, INK); R(4, 7, 1, 1, INK); }
  } else if (dir === "down") {
    R(4, 4, 8, 6, s.skin); R(7, 10, 2, 1, dark(s.skin, .9));
    R(5, 6, 1, 2, INK); R(10, 6, 1, 2, INK); R(7, 9, 2, 1, dark(s.skin, .78));
    if (s.glasses) { R(4, 6, 3, 1, INK); R(9, 6, 3, 1, INK); R(7, 6, 2, 1, INK); }
    if (s.stubble) R(5, 9, 6, 1, dark(s.skin, .86));
  } else R(4, 4, 8, 6, s.hair || s.skin);
  // ---- hair ----
  const H = s.hair;
  if (H && s.cut !== "none") {
    if (dir === "up") { R(4, 2, 8, 8, H); R(4, 9, 8, 1, hair2); if (s.cut === "long") R(3, 4, 10, 9, H); if (s.cut === "bun") R(6, 0, 4, 3, H); }
    else if (side) { R(5, 2, 6, 3, H); R(8, 4, 3, 4, H); if (s.cut === "long") R(8, 4, 4, 9, H); if (s.cut === "bun") R(9, 1, 3, 3, H); if (s.cut === "slick") R(4, 3, 7, 1, hair2); }
    else { R(4, 2, 8, 3, H); R(3, 3, 1, 4, H); R(12, 3, 1, 4, H); if (s.cut === "long") { R(3, 3, 2, 10, H); R(11, 3, 2, 10, H); } if (s.cut === "bun") R(6, 0, 4, 3, H); if (s.cut === "slick") { R(4, 3, 8, 1, hair2); R(9, 2, 3, 1, hair2); } if (s.cut === "silver") R(4, 2, 8, 1, "#ffffff"); }
  }
  // ---- hats ----
  if (s.hat) {
    const h = s.hat.col, h2 = dark(h, .8), h3 = dark(h, .65);
    if (s.hat.kind === "bucket") {
      if (dir === "up") { R(4, 1, 8, 4, h); R(3, 4, 10, 1, h2); }
      else if (side) { R(4, 1, 7, 4, h); R(2, 4, 11, 1, h2); }
      else { R(4, 1, 8, 4, h); R(3, 4, 10, 1, h2); R(4, 3, 8, 1, h2); }
    } else {
      if (dir === "up") { R(4, 1, 8, 4, h); R(4, 4, 8, 1, h2); R(6, 4, 4, 1, h3); R(7, 3, 2, 1, h2); }
      else if (side) { R(4, 1, 7, 4, h); R(1, 4, 6, 1, h2); R(1, 4, 2, 1, h3); R(10, 3, 1, 2, h2); }
      else { R(4, 1, 8, 4, h); R(5, 1, 6, 1, h); R(7, 1, 2, 1, h2); R(3, 4, 10, 1, h2); R(4, 4, 8, 1, h3); R(7, 2, 2, 1, h2); }
    }
  }
  return c;
}
export function person(s) {
  const o = {}; ["down", "up", "left"].forEach((d) => (o[d] = [outline(draw(s, d, 0)), outline(draw(s, d, 1))])); o.right = o.left.map(flip); return o;
}
export const LOOKS = {
  // Stefan: beige cap, black sweater with a longer white tee under it, black baggy cargos, beige sneakers
  stefan: { skin: "#e2b08e", hair: "#3a2a24", cut: "short", hat: { col: "#d9c3a0", kind: "cap" }, top: "#1f1b24", hem: "#f6f3ee", legs: "#26222b", baggy: true, shoes: "#e3d2b4", stubble: true },
  boy: { skin: "#f2c3a5", hair: "#4b3a8a", cut: "short", top: "#86d2ec", legs: "#3a3350", shoes: "#ffffff" },
  girl: { skin: "#f2c3a5", hair: "#7a3f5c", cut: "long", top: "#ff9dbb", legs: "#3a3350", shoes: "#ffffff" },
  ad: { skin: "#eab99a", hair: "#3a2a24", cut: "slick", top: "#2f3d6b", tie: "#f0546a", legs: "#2f3d6b", shoes: "#2b1f3b", item: "clip" },
  mm: { skin: "#c98f6a", hair: "#2b1f3b", cut: "bun", top: "#e6a25a", lanyard: "#3d5bff", legs: "#3a3350", shoes: "#2b1f3b", item: "tablet" },
  mp: { skin: "#f2c3a5", hair: "#8d5d45", cut: "short", glasses: true, top: "#7aa86b", legs: "#5b5470", shoes: "#96683f", item: "paper" },
  bs: { skin: "#eab99a", hair: "#2b1f3b", cut: "short", glasses: true, top: "#1f1b24", legs: "#3a3350", shoes: "#1f1b24", item: "notes" },
  sl: { skin: "#a8715a", hair: "#2b1f3b", cut: "none", hat: { col: "#a9dcbc", kind: "bucket" }, top: "#b79cff", legs: "#3a3350", baggy: true, shoes: "#ffffff", item: "phone" },
  cmo: { skin: "#eab99a", hair: "#c9c6cf", cut: "silver", top: "#4a4752", tie: "#2b1f3b", legs: "#4a4752", shoes: "#1f1b24" },
};
