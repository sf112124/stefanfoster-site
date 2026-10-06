// Foster Valley: the map, who lives in it, and everything anybody says.
export const TT = { grass: 0, path: 1, sand: 2, water: 3, bridge: 4, track: 5, lawnA: 6, lawnB: 7, soil: 8, fizz: 9, floor: 10, wall: 11, skirt: 12, rug: 13, mat: 14, void: 15 };
export const TNAME = Object.keys(TT);
const SOLID = new Set([TT.water, TT.fizz, TT.wall, TT.skirt, TT.void]);
const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

// ---- types. Three that beat each other in a ring, and FILM, which gets on with everybody. ----
export const eff = (a, d) => ((a === "3D" && d === "INK") || (a === "INK" && d === "AI") || (a === "AI" && d === "3D") ? 1.5 : (a === "INK" && d === "3D") || (a === "AI" && d === "INK") || (a === "3D" && d === "AI") ? .8 : 1);
export const WHY = { "3D>INK": "It added a whole dimension.", "INK>AI": "It had taste. That's hard to generate.", "AI>3D": "It did in four seconds what took all night to render." };

// ---- the three you can take with you ----
export const STARTERS = {
  bevel: { name: "BEVEL", type: "3D", art: "bevel", about: "A cube with its edges rounded off. No sharp opinions. Beats INK.",
    picked: "BEVEL. Rounded, dependable, takes a while to render.",
    moves: [
      { n: "EXTRUDE", t: "3D", p: 13, say: "It got longer in that direction." },
      { n: "FULL RENDER", t: "3D", p: 23, acc: .74, say: "Every sample. Every bounce.", miss: "It crashed at 99%." },
      { n: "SUBDIVIDE", kind: "buff", say: "BEVEL is four times smoother. Its attack rose!" },
      { n: "CTRL+Z", kind: "heal", say: "BEVEL undid some of that." },
    ] },
  hallu: { name: "HALLU", type: "AI", art: "hallu", about: "Very confident. Slightly wrong about how many eyes things have. Beats 3D.",
    picked: "HALLU. It says it's delighted. It says that about everything.",
    moves: [
      { n: "PROMPT", t: "AI", p: 13, say: "Masterpiece, trending, highly detailed." },
      { n: "HALLUCINATE", t: "AI", p: [3, 32], say: "It made something up with total confidence." },
      { n: "UPSCALE", kind: "buff", say: "HALLU is four times the resolution. Its attack rose!" },
      { n: "REGENERATE", kind: "heal", say: "HALLU rolled again and came out better." },
    ] },
  scribb: { name: "SCRIBB", type: "INK", art: "scribb", about: "A stub of pencil with a lot of ideas, most of them before 10am. Beats AI.",
    picked: "SCRIBB. Sharp. Don't tell it that, it'll never stop.",
    moves: [
      { n: "SCRIBBLE", t: "INK", p: 13, say: "Fast, loose, and somehow exactly right." },
      { n: "BIG IDEA", t: "INK", p: 23, acc: .74, say: "It fits on a single line.", miss: "It was the same idea as last time." },
      { n: "ART DIRECT", kind: "debuff", say: "\"Can we push it a bit?\" The foe's defence fell!" },
      { n: "COFFEE", kind: "heal", say: "SCRIBB had a flat white and a think." },
    ] },
};

// ---- the projects, gone feral. In the same order as the real site. ----
export const FOES = {
  "la-croisiere": { name: "LA CROISIÈRE", type: "FILM", art: "croisiere", zone: "The Riviera",
    intro: "LA CROISIÈRE drifts out of the reeds! It is filming itself.",
    moves: [{ n: "SHOT ON PHONE", p: 12, say: "It got the whole thing in one take." }, { n: "RIVIERA GLARE", p: 10, say: "The sun came off the water at a very expensive angle." }, { n: "TINY BAG", say: "It opens a very small bag. There's nothing in it. It cost a lot." }],
    down: "LA CROISIÈRE drops anchor." },
  "ai-commissions": { name: "AI COMMISSIONS", type: "AI", art: "commish", zone: "Uncanny Valley",
    intro: "AI COMMISSIONS reaches up out of the grass! With all seven fingers.",
    moves: [{ n: "SEVEN FINGERS", p: 13, say: "You didn't see the extra two coming." }, { n: "RE-ROLL", p: 10, say: "It tried again. And again. That one landed." }, { n: "CREDIT WHERE DUE", say: "It stops to thank The Butter Service. Good manners, even now." }],
    down: "AI COMMISSIONS puts its hand down." },
  "3d-explorations": { name: "3D EXPLORATIONS", type: "3D", art: "blob", zone: "The Render Farm",
    intro: "3D EXPLORATIONS wobbles into view! It still has the default cube on its head.",
    moves: [{ n: "DEFAULT CUBE", p: 12, say: "It never deleted it. Nobody does." }, { n: "SUBSURFACE SCATTER", p: 11, say: "Light went straight through you. It looked lovely." }, { n: "WATCH A TUTORIAL", say: "It stops to watch a forty minute tutorial at double speed." }],
    down: "3D EXPLORATIONS has stopped responding." },
  "ai-experiments": { name: "AI EXPERIMENTS", type: "AI", art: "goat", zone: "Uncanny Valley",
    intro: "There's a goat on the power line. The goat is AI EXPERIMENTS.",
    moves: [{ n: "GO VIRAL", p: 14, say: "101 million people saw that." }, { n: "ALL THAT FOR A SNACK", p: 11, say: "It bit you. For a snack." }, { n: "IT'S IN THE PAPERS", say: "A newspaper reports the goat as fact. The goat says nothing." }],
    down: "The goat climbs down. Nobody films that part." },
  "summer-of-sport": { name: "SUMMER OF SPORT", type: "INK", art: "sport", zone: "Stadium Meadow",
    intro: "SUMMER OF SPORT sprints out of the long grass! It did not warm up.",
    moves: [{ n: "OUT OF HOME", p: 13, say: "It hit you from 1200 sites at once." }, { n: "DRAWN BY HAND", p: 11, say: "It drew a line straight through you." }, { n: "BESPOKE TO FORMAT", say: "It resizes itself to fit a bus shelter. This takes a while." }],
    down: "SUMMER OF SPORT is out of puff." },
  relax: { name: "#RELAX", type: "FILM", art: "relax", zone: "Relax Lagoon",
    intro: "#RELAX is lying in the grass. It hasn't noticed you.",
    moves: [{ n: "RELAX", say: "It's fine. Everything's fine." }, { n: "DO NOT DISTURB", say: "It turned its notifications off. You were one of them." }, { n: "TUMBLE", p: 16, say: "Something fell on you from a height. It's fine. It's always fine." }],
    down: "#RELAX was already lying down." },
  "coca-cola": { name: "COCA-COLA", type: "FILM", art: "fizz", zone: "Fizz Springs",
    intro: "COCA-COLA fizzes up out of the spring! It can only say three things.",
    moves: [{ n: "AHHH", p: 12, say: "Ahhh." }, { n: "OOOH", p: 13, say: "Oooh." }, { n: "YEAH", p: 11, say: "Yeah." }],
    down: "COCA-COLA is lost for words. Again." },
  gumtree: { name: "GUMTREE", type: "FILM", art: "gum", zone: "Gum Tree Grove",
    intro: "GUMTREE rustles! It's full of good finds and it won't be giving you the hard sell.",
    moves: [{ n: "GOOD FIND", p: 13, say: "It found your weak spot. Barely used." }, { n: "COLLECTION ONLY", p: 11, say: "You had to come and get that one yourself." }, { n: "NO SALES PITCH", say: "It refuses to sell itself. On principle." }],
    down: "GUMTREE: sold as seen." },
};
export const EXTRA = {
  page: { name: "THE BLANK PAGE", type: "NONE", art: "page", boss: 1,
    intro: "THE BLANK PAGE is blocking the bridge. It has nothing to say, and it's saying it at you.",
    moves: [{ n: "STARE BACK", p: 12, say: "It stared back. You blinked first." }, { n: "CURSOR BLINK", p: 10, say: "Blink. Blink. Blink." }, { n: "WAIT", say: "It waits for you to start. You wait for it to start." }],
    down: "There's a mark on it now. That's all it ever takes." },
  crawler: { name: "THE CRAWLER", type: "NONE", art: "crawler", boss: 2,
    intro: "Something climbs out of the hole. The sign did say.",
    moves: [{ n: "LASER", p: 15, say: "It was aiming at your cursor. It got you instead." }, { n: "GRAB THE CURSOR", p: 12, say: "It ran off with your pointer. Shake to break free." }, { n: "SKITTER", say: "It runs round the edge of the screen for a bit." }],
    down: "THE CRAWLER drags itself back into its hole." },
  deadline: { name: "A DEADLINE", type: "NONE", art: "deadline",
    intro: "A DEADLINE jumps out! It's closer than it looked.",
    moves: [{ n: "TOMORROW, 9AM", p: 11, say: "It moved forward. They always do." }, { n: "END OF DAY", p: 10, say: "Whose day? It won't say." }, { n: "SOFT DEADLINE", say: "It says it's a soft deadline. It's lying, but it does nothing this turn." }],
    down: "The DEADLINE has passed. Nothing happened. Typical." },
  feedback: { name: "ROUND NINE FEEDBACK", type: "NONE", art: "feedback",
    intro: "ROUND NINE FEEDBACK appears! It has a few builds.",
    moves: [{ n: "MAKE IT POP", p: 10, say: "Nobody can say what that means. It still hurt." }, { n: "LOGO BIGGER", p: 12, say: "The logo is now the whole page." }, { n: "ONE SMALL THOUGHT", say: "It has one small thought. It'll share it on Friday at six." }],
    down: "ROUND NINE FEEDBACK is approved. With no changes. Frame this." },
  impostor: { name: "IMPOSTOR SYNDROME", type: "NONE", art: "impostor",
    intro: "IMPOSTOR SYNDROME sidles up! It's wearing a disguise. It isn't a good one.",
    moves: [{ n: "EVERYONE CAN TELL", p: 11, say: "They can't. It stings anyway." }, { n: "COMPARE", p: 12, say: "It showed you somebody else's portfolio." }, { n: "NOTHING, ACTUALLY", say: "It turns out it had nothing on you." }],
    down: "IMPOSTOR SYNDROME slinks off. It'll be back at 3am." },
};

// ---- what people and things say ----
export const SAY = {
  intro: ["Oh. Hi. You're here for the portfolio.", "Bad news. The projects got out.", "All eight of them. They're in the long grass and they've gone feral.", "If you want to see the work now, you have to beat it in a fight.", "I don't make the rules. I did make the rules.", "You can't go out there on your own, though. Take one of the three on the stands. I made them."],
  after: ["The grass is outside. The work is in the grass.", "Beat a project and it'll show you what it's got. It all goes in your FOLIO.", "If it goes badly you'll wake up back here. I'll put the kettle on."],
  stefan: [
    ["Long grass. Eight projects. One goat. Off you go."],
    ["That's a start. They're not normally that easy. Don't tell them."],
    ["Keep going. There's a coffee machine behind me if your friend's looking peaky."],
    ["Halfway. The other four are over the bridge. Something's sat on the bridge. I'd deal with that."],
    ["You're good at this. Have you considered a career in fighting portfolios?"],
    ["Nearly there. I've never seen anyone get this far. People usually leave at the second case study."],
  ],
  ending: ["You beat all eight.", "Nobody has ever got to the end of my portfolio before.", "So that's the work. If you enjoyed fighting it, imagine working with it."],
  needPick: ["Take one from the stands first. They get lonely."],
  bed: ["Not now. There are projects loose."],
  desk: ["It's rendering. It has been rendering since Tuesday.", "Frame 3 of 240."],
  shelf: ["Books on film, on type, and on finishing things.", "The last one is still in its wrapper."],
  coffee: ["You make a coffee. It's very good.", "Your companion is fully restored. So are you, a bit."],
  fridge: ["Oat milk. Just oat milk. So much oat milk."],
  plant: ["It's thriving. Nobody knows who waters it."],
  guitar: ["You play four chords.", "It's the same four chords as every song. It still sounds nice."],
  poster: ["A poster for GROW.", "A commuter takes a pill on the tube and gets very, very big. Based on a true feeling."],
  window: ["The valley. Patches of long grass, all of them rustling."],
  mailbox: ["A takeaway menu, and a parcel for next door."],
  taken: ["An empty stand. You made your choice."],
  left: ["It looks at you. You already chose. It knows."],
  intern: [["I'm the intern. I've been here since the pitch."], ["Which pitch? I don't remember. There was a deck."], ["Is it lunch? It feels like it's been four o'clock for a week."], ["If you see a goat on a power line, that's normal for round here."]],
  goat: ["A goat is standing on the power line.", "101 million people have watched it do this.", "One newspaper said it was real. The goat has never commented."],
  hole: ["It's a hole. There's a sign. The sign is very clear."],
  holeDone: ["The hole is quiet. Something in there is sulking."],
  pageGone: ["A single sheet of paper, with one mark on it."],
  lost: ["You woke up back at the studio.", "Somebody has made your companion a coffee. It's fine now."],
  ran: ["You got away. The project stays unseen, like most decks."],
  cantRun: ["You can't walk away from this one. You've tried that before."],
  idle: ["Your companion has started a side project while you stood there."],
  night: ["NIGHT MODE. The goat doesn't sleep."],
  signs: {
    home: ["FOSTER VALLEY", "Population: 8 projects, 1 goat."],
    stadium: ["STADIUM MEADOW", "23 illustrations. 1200 sites. No warm-up."],
    farm: ["THE RENDER FARM", "Please do not feed the GPUs."],
    uncanny: ["UNCANNY VALLEY", "Count your fingers on the way out."],
    gum: ["GUM TREE GROVE", "Good finds. Collection only."],
    fizz: ["FIZZ SPRINGS", "Taste beyond words. Sign ends here."],
    relax: ["RELAX LAGOON", "Urgent matters will not be dealt with."],
    riviera: ["THE RIVIERA", "Please keep all bags under four centimetres."],
    hole: ["DO NOT OPEN"],
    bridge: ["BRIDGE", "Closed until somebody makes a start."],
  },
};

// ---- the valley ----
// One big map: the studio in the middle, a river across the north, and a corner for every project.
export const ZONES = [
  { n: "Stadium Meadow", r: [2, 2, 23, 17] }, { n: "The Render Farm", r: [26, 2, 46, 10] }, { n: "Uncanny Valley", r: [48, 2, 69, 17] },
  { n: "Gum Tree Grove", r: [2, 22, 13, 33] }, { n: "Fizz Springs", r: [58, 22, 69, 33] }, { n: "Relax Lagoon", r: [2, 35, 19, 49] }, { n: "The Riviera", r: [50, 35, 69, 49] },
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
  put("sign", 33, 38, { act: "sign:home" }); put("mailbox", 38, 37, { act: "mailbox" });
  // Stadium Meadow: a running track with the long grass in the middle
  rect(2, 2, 22, 16, (x, y) => { const d = Math.hypot((x - 12) / 8.6, (y - 9) / 5.6); if (d <= 1) { set(x, y, d > .7 ? TT.track : Math.floor(x / 2) % 2 ? TT.lawnA : TT.lawnB); keep[I(x, y)] = 1; } });
  rect(8, 7, 16, 11, (x, y) => (tg[I(x, y)] = 5));
  [[4, 3], [20, 3], [4, 15], [20, 15]].forEach(([x, y]) => put("light", x, y));
  put("sign", 21, 13, { act: "sign:stadium" });
  // The Render Farm: rows of cubes coming up nicely
  rect(27, 3, 33, 9, (x, y) => { set(x, y, TT.soil); keep[I(x, y)] = 1; });
  for (let y = 4; y <= 8; y += 2) for (let x = 28; x <= 32; x += 2) put("cube", x, y);
  rect(38, 3, 45, 8, (x, y) => (tg[I(x, y)] = 3)); clear(34, 3, 37, 10);
  put("sign", 37, 10, { act: "sign:farm" });
  // Uncanny Valley: two patches, and the goat
  rect(50, 4, 56, 9, (x, y) => (tg[I(x, y)] = 2)); rect(60, 4, 66, 9, (x, y) => (tg[I(x, y)] = 4)); clear(49, 3, 67, 10);
  put("pole", 58, 14, { act: "goat" }); put("pole", 64, 14, { act: "goat" }); objs.push({ k: "wire", x: 58, y: 14, x2: 64, solid: 0, w: 1 }); clear(57, 13, 65, 15);
  put("sign", 49, 13, { act: "sign:uncanny" });
  // Gum Tree Grove
  rect(4, 24, 11, 31, (x, y) => (tg[I(x, y)] = 8)); clear(3, 23, 13, 32); put("sign", 14, 26, { act: "sign:gum" });
  // Fizz Springs
  rect(60, 25, 66, 30, (x, y) => (tg[I(x, y)] = 7)); clear(59, 24, 67, 31);
  [[58, 23], [67, 32], [59, 32]].forEach(([x, y]) => { rect(x, y, x + 1, y + 1, (a, b) => { set(a, b, TT.fizz); keep[I(a, b)] = 1; }); });
  put("geyser", 62, 23, {}); put("geyser", 68, 28, {}); put("sign", 57, 26, { act: "sign:fizz" });
  // Relax Lagoon
  rect(3, 40, 16, 48, (x, y) => { if (Math.hypot((x - 9) / 5.2, (y - 45) / 2.7) <= 1) { set(x, y, TT.water); keep[I(x, y)] = 1; } });
  rect(5, 36, 14, 40, (x, y) => (tg[I(x, y)] = 6)); clear(4, 35, 16, 41);
  put("hammock", 16, 46, { w: 2 }); put("sign", 16, 41, { act: "sign:relax" });
  // The Riviera: sand, sea, reeds
  rect(50, 35, 69, 49, (x, y) => { set(x, y, y >= 46 || x >= 67 ? TT.water : TT.sand); keep[I(x, y)] = 1; });
  rect(54, 38, 62, 42, (x, y) => (tg[I(x, y)] = 1));
  [[52, 44], [58, 45], [64, 44]].forEach(([x, y]) => { put("parasol", x, y); objs.push({ k: "towel", x: x + 1, y, solid: 0, w: 1, flat: 1 }); });
  put("palm", 51, 36); put("palm", 65, 37); put("palm", 66, 43); put("sign", 49, 41, { act: "sign:riviera" });
  // what's on the bridge, and the hole
  objs.push({ k: "npc", who: "page", x: 35, y: 22, w: 2, solid: 1, act: "page", id: "page" }); keep[I(35, 22)] = keep[I(36, 22)] = 1; clear(33, 22, 38, 25);
  put("sign", 34, 24, { act: "sign:bridge" });
  put("hole", 22, 48, { act: "hole", flat: 1 }); put("sign", 23, 48, { act: "sign:hole" }); clear(20, 46, 25, 49);
  objs.push({ k: "npc", who: "intern", x: 41, y: 26, w: 1, solid: 1, act: "intern", wander: 1, dir: "down" });
  // a wall of trees round the edge, then trees, rocks and flowers wherever there's room
  const kind = (x, y) => (x < 15 && y > 21 && y < 34 ? "gumtree" : x > 46 && y < 18 ? "oddtree" : x > 24 && x < 47 && y < 11 ? "polytree" : (x < 20 && y > 34) ? "palm" : r() < .5 ? "tree" : "tree2");
  rect(0, 0, W - 1, H - 1, (x, y) => { const edge = x < 2 || y < 2 || x > W - 3 || y > H - 3; const i = I(x, y); if (edge) { if (base[i] === TT.grass || base[i] === TT.path) { base[i] = TT.grass; if ((x + y) % 2 === 0 || x === 0 || y === 0 || x === W - 1 || y === H - 1) objs.push({ k: kind(x, y), x, y, solid: 1, w: 1 }); solid[i] = 1; } else solid[i] = 1; } });
  rect(2, 2, W - 3, H - 3, (x, y) => {
    const i = I(x, y); if (base[i] !== TT.grass || keep[i] || tg[i]) return;
    let near = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = I(x + dx, y + dy); if (base[j] === TT.path || base[j] === TT.bridge || tg[j] || base[j] === TT.track || base[j] === TT.sand) near = true; }
    if (near) return;
    const q = r(); if (q < .085) objs.push({ k: kind(x, y), x, y, solid: 1, w: 1 }); else if (q < .1) objs.push({ k: "rock", x, y, solid: 1, w: 1 });
  });
  objs.forEach((o) => { if (o.solid && o.k !== "npc" && o.k !== "house") for (let k = 0; k < (o.w || 1); k++) solid[I(o.x + k, o.y)] = 1; });   // (people are checked as you walk, so they can move or leave)
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
  put("bed", 1, 3, { act: "bed" }); put("plant", 2, 2, { act: "plant" }); put("shelf", 3, 2, { w: 2, act: "shelf" }); put("desk", 5, 2, { w: 2, act: "desk", anim: 1 });
  put("coffee", 7, 2, { act: "coffee" }); put("fridge", 8, 2, { act: "fridge" });
  put("stand", 9, 2, { act: "pick:bevel", pick: "bevel" }); put("stand", 10, 2, { act: "pick:hallu", pick: "hallu" }); put("stand", 11, 2, { act: "pick:scribb", pick: "scribb" });
  put("guitar", 12, 4, { act: "guitar" }); put("plant", 0, 6, { act: "plant" });
  objs.push({ k: "wallart", art: "poster", x: 0, y: 1, solid: 0, w: 1, flat: 1, act: "poster" }, { k: "wallart", art: "window", x: 12, y: 1, solid: 0, w: 1, flat: 1, act: "window" });
  objs.push({ k: "npc", who: "stefan", x: 6, y: 4, w: 1, solid: 1, act: "stefan", dir: "down", id: "stefan" });
  objs.forEach((o) => { if (o.solid && o.k !== "npc") for (let k = 0; k < (o.w || 1); k++) solid[I(o.x + k, o.y)] = 1; });
  solid[I(1, 2)] = 1;   // the head of the bed
  for (let i = 0; i < N; i++) if (SOLID.has(base[i])) solid[i] = 1;
  return { id: "house", W, H, base, vr, tg, solid, objs, start: [3, 4], exit: [6, 8] };
}
