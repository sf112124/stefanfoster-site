// Foster Valley: the map, what's in it, and all the text.
export const TT = { grass: 0, path: 1, sand: 2, water: 3, bridge: 4, track: 5, lawnA: 6, lawnB: 7, soil: 8, fizz: 9, floor: 10, wall: 11, skirt: 12, rug: 13, mat: 14, void: 15 };
export const TNAME = Object.keys(TT);
const SOLID = new Set([TT.water, TT.fizz, TT.wall, TT.skirt, TT.void]);
const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

// ---- types. A tool is strongest against the kind of work it's made for. ----
export const eff = (a, d) => (a === d ? 1.5 : 1);

// ---- the three tools you can take with you ----
export const STARTERS = {
  ai: { name: "AI", type: "AI", art: "ai", about: "AI. Strong against AI projects.",
    moves: [{ n: "GENERATE", t: "AI", p: 14 }, { n: "VARIATIONS", t: "AI", p: 24, acc: .74 }, { n: "UPSCALE", kind: "buff" }, { n: "RETRY", kind: "heal" }] },
  ps: { name: "PHOTOSHOP", type: "IMAGE", art: "ps", about: "PHOTOSHOP. Strong against IMAGE projects.",
    moves: [{ n: "BRUSH", t: "IMAGE", p: 14 }, { n: "LIQUIFY", t: "IMAGE", p: 24, acc: .74 }, { n: "SHARPEN", kind: "buff" }, { n: "HEAL BRUSH", kind: "heal" }] },
  pr: { name: "PREMIERE", type: "FILM", art: "pr", about: "PREMIERE. Strong against FILM projects.",
    moves: [{ n: "CUT", t: "FILM", p: 12 }, { n: "SMASH CUT", t: "FILM", p: 22, acc: .74 }, { n: "SPEED RAMP", kind: "buff" }, { n: "UNDO", kind: "heal" }] },
};

// ---- the projects, in the same order as the real site. Their moves are named after the real work. ----
export const FOES = {
  "la-croisiere": { name: "LA CROISIÈRE", type: "FILM", art: "croisiere", zone: "The Beach",
    moves: [{ n: "SHOT ON IPHONE", p: 9 }, { n: "THE ATELIER", p: 7 }, { n: "DOLLING AROUND", p: 6 }] },
  "ai-commissions": { name: "AI COMMISSIONS", type: "AI", art: "commish", zone: "The Paddock",
    moves: [{ n: "PLAGE", p: 9 }, { n: "LE BONHEUR", p: 7 }, { n: "LE PAYSAN", p: 6 }] },
  "3d-explorations": { name: "3D EXPLORATIONS", type: "IMAGE", art: "blob", zone: "The Farm",
    moves: [{ n: "RENDER", p: 9 }, { n: "LIGHTING", p: 7 }, { n: "MODEL", p: 6 }] },
  "ai-experiments": { name: "AI EXPERIMENTS", type: "AI", art: "goat", zone: "The Paddock",
    moves: [{ n: "ZOMBIE COWBOYS", p: 9 }, { n: "SAMURAI BARBER", p: 7 }, { n: "GROW", p: 6 }] },
  "summer-of-sport": { name: "SUMMER OF SPORT", type: "IMAGE", art: "sport", zone: "The Stadium",
    moves: [{ n: "DRAWN ON IPAD", p: 9 }, { n: "OUT OF HOME", p: 7 }, { n: "23 DRAWINGS", p: 6 }] },
  relax: { name: "#RELAX", type: "FILM", art: "relax", zone: "The Lagoon",
    moves: [{ n: "TUMBLE", p: 9 }, { n: "DUAL CAPTURE", p: 7 }, { n: "CAMERA REMOTE", p: 6 }] },
  "coca-cola": { name: "COCA-COLA", type: "FILM", art: "fizz", zone: "The Springs",
    moves: [{ n: "AHHH", p: 9 }, { n: "OOOH", p: 7 }, { n: "YEAH", p: 6 }] },
  gumtree: { name: "GUMTREE", type: "FILM", art: "gum", zone: "The Grove",
    moves: [{ n: "GOOD FIND", p: 9 }, { n: "NO SALESPEOPLE", p: 7 }, { n: "NO FANFARE", p: 6 }] },
};
// the one thing out there that isn't a project: the spider from the main site
export const EXTRA = {
  crawler: { name: "THE CRAWLER", type: "NONE", art: "crawler", boss: 2, intro: "THE CRAWLER climbs out of the hole!",
    moves: [{ n: "LASER", p: 10 }, { n: "GRAB", p: 8 }, { n: "SKITTER", p: 6 }] },
};

// ---- what people and things say ----
export const SAY = {
  intro: ["Hi, I'm Stefan. This is my portfolio.", "My eight projects are out in the long grass around the valley.", "Find one and beat it, and you get to see the work.", "First, pick a tool to take with you: AI, Photoshop or Premiere. They're on the stands behind me."],
  after: ["The door is at the bottom of the room. Walk into long grass to find a project.", "Each tool is strongest against the kind of work it's made for.", "The coffee machine in here brings your tool back to full health."],
  ending: ["That's all eight. Thanks for playing through my work.", "If you'd like to work together, my details are on the next screen."],
  needPick: ["Pick a tool from the stands first."],
  noPick: ["Pick one of the three tools on the stands."],
  desk: ["Stefan's desk."],
  coffee: ["You make a coffee.", "Your tool is back to full health."],
  poster: ["A poster for GROW, a short film in Ai Experiments."],
  taken: ["An empty stand."],
  left: ["You've already picked your tool."],
  goat: ["A goat on a power line, from Ai Experiments.", "The original video has 101M views."],
  hole: ["A hole in the ground. The sign says DO NOT OPEN."],
  holeDone: ["THE CRAWLER is back in its hole."],
  lost: ["You're back at the studio. Your tool is at full health again."],
  ran: ["You got away."],
  cantRun: ["You can't run from this one."],
  signs: {
    home: ["FOSTER VALLEY", "Stefan Foster's studio."],
    stadium: ["THE STADIUM", "Summer of Sport is in the long grass here."],
    farm: ["THE FARM", "3D Explorations is in the long grass here."],
    uncanny: ["THE PADDOCK", "Ai Commissions is in the grass on the left. Ai Experiments is on the right."],
    gum: ["THE GROVE", "Gumtree is in the long grass here."],
    fizz: ["THE SPRINGS", "Coca-Cola is in the long grass here."],
    relax: ["THE LAGOON", "#RELAX is in the long grass here."],
    riviera: ["THE BEACH", "La Croisière is in the long grass here."],
    hole: ["DO NOT OPEN"],
  },
};

// ---- the valley ----
// One big map: the studio in the middle, a river across the north, and a corner for every project.
export const ZONES = [
  { n: "The Stadium", r: [2, 2, 23, 17] }, { n: "The Farm", r: [26, 2, 46, 10] }, { n: "The Paddock", r: [48, 2, 69, 17] },
  { n: "The Grove", r: [2, 22, 13, 33] }, { n: "The Springs", r: [58, 22, 69, 33] }, { n: "The Lagoon", r: [2, 35, 19, 49] }, { n: "The Beach", r: [50, 35, 69, 49] },
  { n: "Foster Valley", r: [28, 29, 42, 41] },
];
export function buildWorld() {
  const W = 72, H = 52, N = W * H, base = new Uint8Array(N), vr = new Uint8Array(N), tg = new Uint8Array(N), solid = new Uint8Array(N), keep = new Uint8Array(N), objs = [];
  const r = rng(29), I = (x, y) => y * W + x, ok = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const set = (x, y, t) => { if (ok(x, y)) base[I(x, y)] = t; };
  const rect = (x0, y0, x1, y1, fn) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (ok(x, y)) fn(x, y); };
  const clear = (x0, y0, x1, y1) => rect(x0, y0, x1, y1, (x, y) => (keep[I(x, y)] = 1));
  const put = (k, x, y, o = {}) => { objs.push({ k, x, y, solid: 1, w: 1, ...o }); for (let i = 0; i < (o.w || 1); i++) keep[I(x + i, y)] = 1; };
  for (let i = 0; i < N; i++) { const q = r(); vr[i] = q < .55 ? 0 : q < .75 ? 1 : q < .87 ? 2 : 3 + Math.floor(r() * 3); }
  // the river, and the one bridge over it
  for (let x = 0; x < W; x++) { const wob = Math.round(Math.sin(x * .35) * .8); for (let y = 20 + wob; y <= 21 + wob; y++) set(x, y, TT.water); }
  rect(35, 19, 36, 22, (x, y) => { if (base[I(x, y)] === TT.water) set(x, y, TT.bridge); });
  // roads
  const road = (x0, y0, x1, y1) => rect(x0, y0, x1, y1, (x, y) => { if (base[I(x, y)] === TT.grass) set(x, y, TT.path); keep[I(x, y)] = 1; });
  road(35, 9, 36, 43); road(13, 27, 58, 28); road(15, 42, 50, 43); road(20, 11, 66, 12); road(30, 30, 40, 39);
  // the studio, on its little square
  put("house", 33, 36, { w: 5, door: [35, 36] }); rect(33, 33, 37, 36, (x, y) => { solid[I(x, y)] = 1; keep[I(x, y)] = 1; }); solid[I(35, 36)] = 0;
  put("sign", 33, 38, { act: "sign:home" }); put("mailbox", 38, 37);
  // The Stadium: a running track with the long grass in the middle
  rect(2, 2, 22, 16, (x, y) => { const d = Math.hypot((x - 12) / 8.6, (y - 9) / 5.6); if (d <= 1) { set(x, y, d > .7 ? TT.track : Math.floor(x / 2) % 2 ? TT.lawnA : TT.lawnB); keep[I(x, y)] = 1; } });
  rect(8, 7, 16, 11, (x, y) => (tg[I(x, y)] = 5));
  [[4, 3], [20, 3], [4, 15], [20, 15]].forEach(([x, y]) => put("light", x, y));
  put("sign", 21, 13, { act: "sign:stadium" });
  // The Farm: rows of cubes
  rect(27, 3, 33, 9, (x, y) => { set(x, y, TT.soil); keep[I(x, y)] = 1; });
  for (let y = 4; y <= 8; y += 2) for (let x = 28; x <= 32; x += 2) put("cube", x, y);
  rect(38, 3, 45, 8, (x, y) => (tg[I(x, y)] = 3)); clear(34, 3, 37, 10);
  put("sign", 37, 10, { act: "sign:farm" });
  // The Paddock: two patches, and the goat on the power line
  rect(50, 4, 56, 9, (x, y) => (tg[I(x, y)] = 2)); rect(60, 4, 66, 9, (x, y) => (tg[I(x, y)] = 4)); clear(49, 3, 67, 10);
  put("pole", 58, 14, { act: "goat" }); put("pole", 64, 14, { act: "goat" }); objs.push({ k: "wire", x: 58, y: 14, x2: 64, solid: 0, w: 1 }); clear(57, 13, 65, 15);
  put("sign", 49, 13, { act: "sign:uncanny" });
  // The Grove
  rect(4, 24, 11, 31, (x, y) => (tg[I(x, y)] = 8)); clear(3, 23, 13, 32); put("sign", 14, 26, { act: "sign:gum" });
  // The Springs
  rect(60, 25, 66, 30, (x, y) => (tg[I(x, y)] = 7)); clear(59, 24, 67, 31);
  [[58, 23], [67, 32], [59, 32]].forEach(([x, y]) => { rect(x, y, x + 1, y + 1, (a, b) => { set(a, b, TT.fizz); keep[I(a, b)] = 1; }); });
  put("geyser", 62, 23, {}); put("geyser", 68, 28, {}); put("sign", 57, 26, { act: "sign:fizz" });
  // The Lagoon
  rect(3, 40, 16, 48, (x, y) => { if (Math.hypot((x - 9) / 5.2, (y - 45) / 2.7) <= 1) { set(x, y, TT.water); keep[I(x, y)] = 1; } });
  rect(5, 36, 14, 40, (x, y) => (tg[I(x, y)] = 6)); clear(4, 35, 16, 41);
  put("hammock", 16, 46, { w: 2 }); put("sign", 16, 41, { act: "sign:relax" });
  // The Beach: sand and sea
  rect(50, 35, 69, 49, (x, y) => { set(x, y, y >= 46 || x >= 67 ? TT.water : TT.sand); keep[I(x, y)] = 1; });
  rect(54, 38, 62, 42, (x, y) => (tg[I(x, y)] = 1));
  [[52, 44], [58, 45], [64, 44]].forEach(([x, y]) => { put("parasol", x, y); objs.push({ k: "towel", x: x + 1, y, solid: 0, w: 1, flat: 1 }); });
  put("palm", 51, 36); put("palm", 65, 37); put("palm", 66, 43); put("sign", 49, 41, { act: "sign:riviera" });
  // the hole
  clear(33, 22, 38, 25);
  put("hole", 22, 48, { act: "hole", flat: 1 }); put("sign", 23, 48, { act: "sign:hole" }); clear(20, 46, 25, 49);
  // a wall of trees round the edge, then trees, rocks and flowers wherever there's room
  const kind = (x, y) => (x < 15 && y > 21 && y < 34 ? "gumtree" : x > 46 && y < 18 ? "oddtree" : x > 24 && x < 47 && y < 11 ? "polytree" : (x < 20 && y > 34) ? "palm" : r() < .5 ? "tree" : "tree2");
  rect(0, 0, W - 1, H - 1, (x, y) => { const edge = x < 2 || y < 2 || x > W - 3 || y > H - 3; const i = I(x, y); if (edge) { if (base[i] === TT.grass || base[i] === TT.path) { base[i] = TT.grass; if ((x + y) % 2 === 0 || x === 0 || y === 0 || x === W - 1 || y === H - 1) objs.push({ k: kind(x, y), x, y, solid: 1, w: 1 }); solid[i] = 1; } else solid[i] = 1; } });
  rect(2, 2, W - 3, H - 3, (x, y) => {
    const i = I(x, y); if (base[i] !== TT.grass || keep[i] || tg[i]) return;
    let near = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = I(x + dx, y + dy); if (base[j] === TT.path || base[j] === TT.bridge || tg[j] || base[j] === TT.track || base[j] === TT.sand) near = true; }
    if (near) return;
    const q = r(); if (q < .085) objs.push({ k: kind(x, y), x, y, solid: 1, w: 1 }); else if (q < .1) objs.push({ k: "rock", x, y, solid: 1, w: 1 });
  });
  objs.forEach((o) => { if (o.solid && o.k !== "npc" && o.k !== "house") for (let k = 0; k < (o.w || 1); k++) solid[I(o.x + k, o.y)] = 1; });   // (people are checked as you walk)
  for (let i = 0; i < N; i++) if (SOLID.has(base[i])) solid[i] = 1;
  solid[I(35, 36)] = 0;
  return { id: "world", W, H, base, vr, tg, solid, objs, start: [35, 37] };
}
// the studio: one room
export function buildHouse() {
  const W = 13, H = 9, N = W * H, base = new Uint8Array(N), vr = new Uint8Array(N), tg = new Uint8Array(N), solid = new Uint8Array(N), objs = [], I = (x, y) => y * W + x;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { base[I(x, y)] = y === 0 ? TT.wall : y === 1 ? TT.skirt : TT.floor; vr[I(x, y)] = (x + y) % 2; }
  for (let y = 5; y <= 6; y++) for (let x = 4; x <= 8; x++) base[I(x, y)] = TT.rug;
  base[I(6, 8)] = TT.mat;
  const put = (k, x, y, o = {}) => objs.push({ k, x, y, solid: 1, w: 1, ...o });
  put("bed", 1, 3); put("plant", 2, 2); put("shelf", 3, 2, { w: 2 }); put("desk", 5, 2, { w: 2, act: "desk", anim: 1 });
  put("coffee", 7, 2, { act: "coffee" }); put("fridge", 8, 2);
  put("stand", 9, 2, { act: "pick:ai", pick: "ai" }); put("stand", 10, 2, { act: "pick:ps", pick: "ps" }); put("stand", 11, 2, { act: "pick:pr", pick: "pr" });
  put("guitar", 12, 4); put("plant", 0, 6);
  objs.push({ k: "wallart", art: "poster", x: 0, y: 1, solid: 0, w: 1, flat: 1, act: "poster" }, { k: "wallart", art: "window", x: 12, y: 1, solid: 0, w: 1, flat: 1 });
  objs.push({ k: "npc", who: "stefan", x: 6, y: 4, w: 1, solid: 1, act: "stefan", dir: "down", id: "stefan" });
  objs.forEach((o) => { if (o.solid && o.k !== "npc") for (let k = 0; k < (o.w || 1); k++) solid[I(o.x + k, o.y)] = 1; });
  solid[I(1, 2)] = 1;   // the head of the bed
  for (let i = 0; i < N; i++) if (SOLID.has(base[i])) solid[i] = 1;
  return { id: "house", W, H, base, vr, tg, solid, objs, start: [3, 4], exit: [6, 8] };
}
