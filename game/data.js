// Foster Valley: the map, what's in it, and all the text.
export const TT = { grass: 0, path: 1, sand: 2, water: 3, bridge: 4, track: 5, lawnA: 6, lawnB: 7, soil: 8, fizz: 9, floor: 10, wall: 11, skirt: 12, rug: 13, mat: 14, void: 15, carpet: 16, kitchen: 17, glass: 18, stairsU: 19, stairsD: 20, paving: 21, wet: 22 };
export const TNAME = Object.keys(TT);
const SOLID = new Set([TT.water, TT.fizz, TT.wall, TT.skirt, TT.void, TT.glass]);
const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

// ---- types. A tool is strongest against the kind of work it's made for. ----
// A triangle: AI beats FILM (it makes them faster), IMAGE beats AI (someone has to fix the hands), FILM beats IMAGE (motion beats stills).
export const BEATS = { AI: "FILM", IMAGE: "AI", FILM: "IMAGE" };
export const eff = (a, d) => (BEATS[a] === d ? 1.4 : BEATS[d] === a ? .75 : 1);

// ---- the three tools you can take with you ----
export const STARTERS = {
  ai: { name: "AI", type: "AI", art: "ai", about: "AI. Beats FILM projects, weak to IMAGE.", evo: [{ lvl: 12, name: "AGENT", art: "ai2" }, { lvl: 22, name: "AGI", art: "ai3" }],
    moves: [{ n: "PROMPT BEAM", t: "AI", p: 14, fx: "beam" }, { n: "DEEPFAKE", t: "AI", p: 24, acc: .74, fx: "glitch" }, { n: "UPSCALE", kind: "buff" }, { n: "REGENERATE", kind: "heal" }] },
  ps: { name: "PHOTOSHOP", type: "IMAGE", art: "ps", about: "PHOTOSHOP. Beats AI projects, weak to FILM.", evo: [{ lvl: 12, name: "LAYERLORD", art: "ps2" }, { lvl: 22, name: "GEN FILL", art: "ps3" }],
    moves: [{ n: "BRUSH STROKE", t: "IMAGE", p: 14, fx: "paint" }, { n: "LIQUIFY", t: "IMAGE", p: 24, acc: .74, fx: "warp" }, { n: "SHARPEN", kind: "buff" }, { n: "HEALING BRUSH", kind: "heal" }] },
  pr: { name: "PREMIERE", type: "FILM", art: "pr", about: "PREMIERE. Beats IMAGE projects, weak to AI.", evo: [{ lvl: 12, name: "THE EDIT", art: "pr2" }, { lvl: 22, name: "DIRECTOR'S CUT", art: "pr3" }],
    moves: [{ n: "HARD CUT", t: "FILM", p: 13, fx: "slash" }, { n: "SMASH CUT", t: "FILM", p: 23, acc: .74, fx: "smash" }, { n: "SPEED RAMP", kind: "buff" }, { n: "UNDO", kind: "heal" }] },
};

// ---- the projects, in the same order as the real site. Their moves are named after the real work. ----
export const FOES = {
  "la-croisiere": { name: "LA CROISIÈRE", type: "FILM", art: "croisiere", zone: "The Beach",
    moves: [{ n: "SELFIE FLASH", p: 9, fx: "flash" }, { n: "CATWALK STRUT", p: 8, fx: "slash" }, { n: "PIN PRICK", p: 7, fx: "pins" }] },
  "ai-commissions": { name: "AI COMMISSIONS", type: "AI", art: "commish", zone: "The Paddock",
    moves: [{ n: "LEAF SLAP", p: 9, fx: "leaf" }, { n: "SPEEDBOAT SPLASH", p: 8, fx: "splash" }, { n: "DEADPAN STARE", p: 7, fx: "glitch" }] },
  "3d-explorations": { name: "3D EXPLORATIONS", type: "IMAGE", art: "blob", zone: "The Farm",
    moves: [{ n: "CACTUS JAB", p: 9, fx: "spikes" }, { n: "RENDER BEAM", p: 8, fx: "beam" }, { n: "SOFT BOUNCE", p: 7, fx: "smash" }] },
  "ai-experiments": { name: "AI EXPERIMENTS", type: "AI", art: "goat", zone: "The Paddock",
    moves: [{ n: "HEADBUTT", p: 9, fx: "smash" }, { n: "BLEAT", p: 8, fx: "notes" }, { n: "GO VIRAL", p: 7, fx: "sparkle" }] },
  "summer-of-sport": { name: "SUMMER OF SPORT", type: "IMAGE", art: "sport", zone: "The Stadium",
    moves: [{ n: "SPRINT KICK", p: 9, fx: "slash" }, { n: "IPAD SKETCH", p: 8, fx: "paint" }, { n: "BILLBOARD SLAM", p: 7, fx: "smash" }] },
  relax: { name: "#RELAX", type: "FILM", art: "relax", zone: "The Lagoon",
    moves: [{ n: "TUMBLE", p: 9, fx: "smash" }, { n: "DROP TEST", p: 8, fx: "smash" }, { n: "CHILL OUT", p: 7, fx: "notes" }] },
  "coca-cola": { name: "COCA-COLA", type: "FILM", art: "fizz", zone: "The Springs",
    moves: [{ n: "FIZZ BLAST", p: 9, fx: "fizz" }, { n: "AHHH", p: 8, fx: "notes" }, { n: "ICE COLD", p: 7, fx: "splash" }] },
  "les-benjamins": { name: "FROM EARTH TO SKY", type: "IMAGE", art: "balloon", zone: "Cappadocia",
    moves: [{ n: "SPIKE STORM", p: 9, fx: "spikes" }, { n: "HOT AIR", p: 8, fx: "fizz" }, { n: "LIFT OFF", p: 7, fx: "sparkle" }] },
  gumtree: { name: "GUMTREE", type: "FILM", art: "gum", zone: "The Grove",
    moves: [{ n: "SIT DOWN", p: 9, fx: "smash" }, { n: "PRICE TAG", p: 8, fx: "coins" }, { n: "BARGAIN", p: 7, fx: "coins" }] },
};
// ---- projects grow up too: each has its own level, and evolves twice ----
export const PEVO = { lvls: [14, 24] };
const PE = { "la-croisiere": [["SUN HAT", "croisiere2"], ["LA GRANDE", "croisiere3"]], "ai-commissions": [["LILY EXEC", "commish2"], ["LOTUS CEO", "commish3"]], "3d-explorations": [["CACTUS CHONK", "blob2"], ["SUPER BLOOM", "blob3"]], "ai-experiments": [["BILLY", "goat2"], ["THE G.O.A.T.", "goat3"]], "summer-of-sport": [["TANGLE STAR", "sport2"], ["THE KNOT", "sport3"]], "relax": [["TUBE BRUTE", "relax2"], ["INNER TITAN", "relax3"]], "coca-cola": [["POP TOP", "fizz2"], ["FIZZDRAKE", "fizz3"]], "les-benjamins": [["TULIP", "balloon2"], ["FOXGLOVE", "balloon3"]], "gumtree": [["BARGAIN BEAST", "gum2"], ["HOUSE CLEARANCE", "gum3"]] };
for (const k in PE) FOES[k].evo = PE[k].map((n, i) => ({ lvl: PEVO.lvls[i], name: n[0], art: n[1] }));
export const pstage = (slug, lvl) => (FOES[slug].evo || []).filter((e) => lvl >= e.lvl).length;
export const pform = (slug, lvl) => { const f = FOES[slug], k = pstage(slug, lvl); return k ? { ...f, name: f.evo[k - 1].name, art: f.evo[k - 1].art, stage: k } : { ...f, stage: 0 }; };
// ---- rare creatures nobody catches: people give them to you ----
export const GIFTS = {
  noself: { name: "NO SELF", type: "NONE", art: "noself", moves: [{ n: "THERE IS NO YOU", p: 16, fx: "sparkle" }, { n: "PURE AWARENESS", kind: "heal" }, { n: "ALREADY WHOLE", p: 13, fx: "beam" }],
    about: "Has no edges. Can't be hit where it isn't." },
  truffle: { name: "TRUFFLE", type: "IMAGE", art: "truffle", moves: [{ n: "CLOSED-EYE VISUALS", p: 14, fx: "glitch" }, { n: "COSMIC GIGGLE", p: 11, fx: "sparkle" }, { n: "MYCELIUM", p: 12, fx: "leaf" }],
    about: "Found in the woods. Changes everyone who meets it." },
  disco: { name: "WRAP PARTY", type: "FILM", art: "disco", moves: [{ n: "MIRROR BALL", p: 14, fx: "flash" }, { n: "LAST SONG", p: 11, fx: "notes" }, { n: "AFTERPARTY", kind: "buff" }],
    about: "Hasn't stopped spinning since the shoot wrapped." },
  vibe: { name: "VIBE CODER", type: "AI", art: "vibe", moves: [{ n: "SHIP IT", p: 15, fx: "beam" }, { n: "HALLUCINATE", p: 12, fx: "glitch" }, { n: "REFACTOR", kind: "heal" }],
    about: "Built over a weekend. Writes its own moves." },
};
// ---- people around the valley and the office with something for you ----
export const GIVERS = [
  { id: "planner", map: "mal0", x: 6, y: 12, look: "sl", name: "A VERY CALM PLANNER", give: { mon: "noself" },
    lines: ["Oh, did you know Stef's really into non-duality?", "He asked me to give you this. Well. He said there's nobody to give it to, and nobody to give it.", "Then he laughed for quite a long time."],
    after: ["Who's asking?"] },
  { id: "innovation", map: "mal2", x: 20, y: 10, look: "mp", name: "HEAD OF INNOVATION", needs: "badge", give: { item: "forever" },
    lines: ["Stef always says AI will make us all live forever.", "Well, little does he know: I've already worked it out.", "Here. Don't tell legal."],
    gate: ["Come back when you've got Tim's badge. This isn't for interns."], after: ["Version two will do pets."] },
  { id: "runner", map: "world", x: 30, y: 12, look: "ad", name: "THE RUNNER", give: { mon: "disco" },
    lines: ["Found this in the kit room after the wrap party.", "It hasn't stopped spinning. Nobody will take it home.", "You look like you could use a friend that's always up."],
    after: ["If production asks, you never saw me."] },
  { id: "milosh", map: "world", x: 7, y: 33, look: "bs", name: "MILOSH", give: { mon: "truffle" },
    lines: ["Me and Stef found this in the woods once.", "Honestly it changed both of us.", "It wants to come with you. I can tell. It's telling me."],
    after: ["Look at the trees. No, really look at them."] },
  { id: "dev", map: "mal1", x: 19, y: 13, look: "mm", name: "THE CREATIVE TECHNOLOGIST", give: { mon: "vibe" },
    lines: ["I built a little guy over the weekend.", "Prompted it, shipped it, didn't read a single line.", "It's yours. If it breaks, just tell it it's wrong."],
    after: ["It's on version forty-six now. I don't know how."] },
  { id: "awards", map: "mal2", x: 9, y: 13, look: "sl", name: "THE AWARDS ENTRY PERSON", needs: "badge", give: { item: "lion" },
    lines: ["We had a spare one of these from the cabinet.", "Give it to any project of yours. It'll grow up on the spot.", "That's how awards work, basically."],
    gate: ["Awards are for people with badges. Go and see Tim."], after: ["Don't put it on the shelf. Use it."] },
];
// ---- the coffee kiosk on the square ----
export const ITEMS = {
  americano: { name: "AMERICANO", price: 4.5, about: "A quick hit. Heals one of your folio by half.", use: "heal" },
  oat: { name: "OAT FLAT WHITE", price: 5.2, about: "The proper one. One of your folio back to full.", use: "full" },
  matcha: { name: "MATCHA LATTE", price: 6.8, about: "Calm, green, restorative. Your whole folio back to full, tired ones included.", use: "all" },
  sparkling: { name: "SPARKLING WATER", price: 4.8, about: "Wakes a tired one up with half its health.", use: "revive" },
  hojicha: { name: "HOJICHA", price: 5.8, about: "Roasted, grounding. In a fight, nothing gets to you: defence up.", use: "def", battle: 1 },
  beer: { name: "BEER", price: 7, about: "Dutch courage. In a fight, attack way up, but your guard drops.", use: "beer", battle: 1 },
  forever: { name: "IMMORTALITY PROTOCOL", price: 0, rare: 1, about: "One of your folio goes to level infinity. Forever.", use: "inf" },
  lion: { name: "THE GOLDEN LION", price: 0, rare: 1, about: "A project evolves on the spot.", use: "evolve" },
};
// the one thing out there that isn't a project: the spider from the main site
export const EXTRA = {
  crawler: { name: "THE CRAWLER", type: "NONE", art: "crawler", boss: 2, intro: "THE CRAWLER climbs out of the hole!",
    moves: [{ n: "LASER", p: 10 }, { n: "GRAB", p: 8 }, { n: "SKITTER", p: 6 }] },
};

// ---- the creatures the clients carry around with them ----
export const CORP = {
  brief: { name: "THE BRIEF", type: "NONE", art: "brief", moves: [{ n: "DUE YESTERDAY", p: 9, fx: "paper" }, { n: "SCOPE CREEP", p: 7, fx: "coins" }, { n: "QUICK TWEAK", p: 6, fx: "paper" }] },
  kpi: { name: "KPI", type: "FILM", art: "kpi", moves: [{ n: "MOVE THE NEEDLE", p: 9, fx: "slash" }, { n: "NORTH STAR", p: 7, fx: "beam" }, { n: "DASHBOARD", p: 6, fx: "glitch" }] },
  roi: { name: "ROI", type: "AI", art: "roi", moves: [{ n: "SHOW ME THE ROI", p: 9, fx: "coins" }, { n: "COST PER VIEW", p: 7, fx: "coins" }, { n: "BUDGET CUT", p: 8, fx: "slash" }] },
  mediaplan: { name: "MEDIA PLAN", type: "IMAGE", art: "mediaplan", moves: [{ n: "FLIGHTING", p: 9, fx: "paper" }, { n: "REACH & FREQUENCY", p: 7, fx: "beam" }, { n: "ALWAYS ON", p: 6, fx: "glitch" }] },
  vertical: { name: "VERTICAL", type: "FILM", art: "vertical", moves: [{ n: "MAKE IT 9:16", p: 9, fx: "flash" }, { n: "FIRST 3 SECONDS", p: 7, fx: "beam" }, { n: "SOUND OFF", p: 6, fx: "notes" }] },
  stakeholder: { name: "STAKEHOLDER", type: "AI", art: "stakeholder", moves: [{ n: "ONE MORE OPINION", p: 9, fx: "glitch" }, { n: "LOOP IN LEGAL", p: 7, fx: "paper" }, { n: "CIRCLE BACK", p: 6, fx: "notes" }] },
  deck: { name: "THE DECK", type: "IMAGE", art: "deck", moves: [{ n: "80 SLIDES", p: 9, fx: "paper" }, { n: "APPENDIX", p: 7, fx: "paper" }, { n: "TAKE IT OFFLINE", p: 6, fx: "glitch" }] },
};
// what your tool has grown into by a given level: 0, 1 or 2 evolutions in
export const stageOf = (id, lvl) => (STARTERS[id].evo || []).filter((e) => lvl >= e.lvl).length;
export const formOf = (id, lvl) => { const m = STARTERS[id], k = stageOf(id, lvl); return k ? { ...m, name: m.evo[k - 1].name, art: m.evo[k - 1].art, stage: k } : { ...m, stage: 0 }; };
// the people in the MAL office have creatures of their own
Object.assign(CORP, {
  easing: { name: "EASE IN OUT", type: "FILM", art: "easing", moves: [{ n: "OVERSHOOT", p: 9, fx: "beam" }, { n: "BEZIER", p: 7, fx: "warp" }, { n: "NEVER LINEAR", p: 8, fx: "slash" }] },
  dj: { name: "DEEP CUT", type: "AI", art: "dj", moves: [{ n: "40 MONTHLY LISTENERS", p: 9, fx: "notes" }, { n: "WHITE LABEL", p: 7, fx: "notes" }, { n: "B2B SET", p: 8, fx: "sparkle" }] },
  budget: { name: "THE BUDGET", type: "IMAGE", art: "budget", moves: [{ n: "ONE SHOOT DAY", p: 9, fx: "coins" }, { n: "OVERAGE", p: 8, fx: "coins" }, { n: "CALL SHEET", p: 7, fx: "paper" }] },
  timesheet: { name: "TIMESHEET", type: "IMAGE", art: "timesheet", moves: [{ n: "FILL IT IN", p: 9, fx: "paper" }, { n: "JOB NUMBER", p: 7, fx: "slash" }, { n: "FRIDAY 5PM", p: 8, fx: "glitch" }] },
  bigidea: { name: "THE BIG IDEA", type: "AI", art: "bigidea", moves: [{ n: "WHAT IF", p: 10, fx: "flash" }, { n: "BLANK PAGE", p: 8, fx: "sparkle" }, { n: "BACK TO THE BRIEF", p: 8, fx: "beam" }] },
  angel: { name: "SERAPH", type: "IMAGE", art: "angel", legend: 1, moves: [{ n: "HALO", p: 16, fx: "sparkle" }, { n: "JUDGEMENT", p: 19, fx: "beam" }, { n: "GRACE", kind: "heal" }] },
  butterfly: { name: "PAPILLON", type: "FILM", art: "butterfly", legend: 1, moves: [{ n: "WING DUST", p: 15, fx: "sparkle" }, { n: "METAMORPHOSIS", kind: "buff" }, { n: "IRIDESCENCE", p: 18, fx: "glitch" }] },
  kitten: { name: "MOONKIT", type: "AI", art: "kitten", legend: 1, moves: [{ n: "MOON SWIPE", p: 17, fx: "slash" }, { n: "NINE LIVES", kind: "heal" }, { n: "STARE", p: 15, fx: "glitch" }] },
  bunny: { name: "WHITE BUNNY", type: "NONE", art: "bunny", legend: 1, moves: [{ n: "SIDE EYE", p: 15, fx: "glitch" }, { n: "NOT FOR ME", p: 19, fx: "smash" }, { n: "HMM.", p: 12, fx: "sparkle" }, { n: "SLEEP ON IT", kind: "heal" }] },
  lion: { name: "GOLDEN BEAR", type: "FILM", art: "bear", moves: [{ n: "BEAR HUG", p: 11, fx: "smash" }, { n: "GOLDEN GLINT", p: 10, fx: "sparkle" }, { n: "MAUL", p: 9, fx: "slash" }] },
});
// ---- the people out on the roads who want "a quick chat" ----
export const TRAINERS = {
  darren: { name: "JIMI", role: "ACCOUNT DIRECTOR", look: "jimi", port: "t_jimi", x: 16, y: 27, dir: "right", lv: 0, team: ["brief"],
    intro: ["You work with Stefan, right? Quick one.", "Client's sent over a brief. Well. It's more of a vibe.", "They want it to go viral. By Friday. Can you jump on it?"],
    win: ["Okay, love that. Let's do a WIP on Thursday?"], after: ["I've put a hold in your calendar. Just a placeholder."] },
  gary: { name: "PARIS", role: "OMD MEDIA PLANNER", look: "paris", port: "t_paris", x: 19, y: 42, dir: "right", lv: 1, team: ["mediaplan"],
    intro: ["Got a sec? I've built the media plan.", "It's fourteen tabs. The ROI is on tab nine.", "Can the film be a 6, a 15, a 30, in 9:16, 4:5 and 1:1?"],
    win: ["Right. I'll just... reforecast."], after: ["Tab nine is looking a lot healthier now."] },
  jules: { name: "BRANCO", role: "BRAND STRATEGIST", look: "branco", port: "t_branco", x: 25, y: 11, dir: "right", lv: 2, team: ["deck"],
    intro: ["Let's zoom out for a second.", "What does the brand actually believe? What's its purpose?", "I've done a deck. It's only eighty slides."],
    win: ["Hm. I suppose the work does speak for itself."], after: ["I'm moving the purpose slide to the appendix."] },
  mia: { name: "ANNA", role: "SOCIAL LEAD", look: "anna", port: "t_anna", x: 62, y: 11, dir: "left", lv: 2, team: ["vertical"],
    intro: ["Omg hiii. Can it be a trend?", "Like, vertical, but it has to feel organic.", "And can we hook them in the first half a second?"],
    win: ["Okay that's actually so good. Posting it now."], after: ["It's doing numbers. Like, real numbers."] },
  cmo: { name: "TOMMY", role: "CMO", look: "cmo", port: "t_cmo", x: 35, y: 9, dir: "down", lv: 4, boss: 1, team: ["roi"], needs: ["darren", "gary", "jules", "mia"], unlock: "THE CMO WANTS A WORD. NORTH ROAD.",
    gate: ["My team speaks for me.", "Get past Jimi, Paris, Branco and Anna first. Then we'll talk."],
    intro: ["So. You're the one who's been getting past my team.", "Let's talk numbers. Then stakeholders. Then numbers again."],
    win: ["...Fine. It's approved.", "Don't change a thing."], after: ["Approved. Go and make it."] },
  // home: the last and hardest test
  alysha: { name: "ALYSHA", role: "THE ALYSHA TEST", look: "alysha", port: "t_alysha", map: "house", x: 8, y: 4, dir: "left", lv: 20, fixed: 28, boss: 2, final: 1, team: ["bunny", "angel", "butterfly", "kitten"],
    gate: ["Hi. Have you finished it yet?", "Bring me the whole portfolio. Every project, and the MAL badge.", "Then you can do the test. I'm not easy to impress."],
    intro: ["So. This is the whole portfolio?", "Talk me through it. Slowly.", "If something's not good, I'll know."],
    win: ["...Okay.", "It's actually really good. I'm proud of you.", "You passed the Alysha Test."],
    again: ["Again? Fine. I'll be harsher this time."],
    after: ["You passed. Don't let it go to your head."] },
  // the MAL office: the gym
  jimi: { name: "LUCY", role: "DIRECTOR, PROJECT MANAGEMENT", look: "lucy", port: "t_lucy", map: "mal1", x: 10, y: 4, dir: "right", lv: 3, team: ["timesheet"],
    intro: ["Hi! Have you got a minute? I've got you down for a minute.", "Nobody goes upstairs without a timing plan, a status update and their hours in.", "Let's pop in a quick fifteen to scope the fifteen."],
    win: ["Okay. Green across the board. You can go up."], after: ["I've moved your next three meetings. You're welcome."] },
  pat: { name: "PAT", role: "MOTION DESIGNER", look: "pat", port: "t_pat", map: "mal0", x: 17, y: 3, dir: "right", lv: 3, team: ["easing"],
    intro: ["Hey. Look at this curve.", "Ease in, ease out. A little overshoot on the end.", "Nothing in this world should ever move linearly."],
    win: ["Okay, that had lovely easing. I'll allow it."], after: ["I've been tweaking one keyframe since nine."] },
  chris: { name: "CHRIS", role: "MUSIC", look: "chris", port: "t_chris", map: "mal2", x: 10, y: 6, dir: "left", lv: 4, team: ["dj"],
    intro: ["Have you heard of this artist? About forty monthly listeners.", "Played a tiny indie set last night. Basement. Incredible.", "We should get them on the next film before anyone else does."],
    win: ["Fine. But they'll be huge. You'll see."], after: ["I'll send you the link. Headphones only."] },
  jeremy: { name: "JEREMY", role: "PRODUCER", look: "jeremy", port: "t_jeremy", map: "mal2", x: 13, y: 5, dir: "down", lv: 4, team: ["budget"],
    intro: ["All G, all G?", "Quick one. Benji.", "Cappadocia is a go, but the balloons need a weather window, a drone permit and a second hotel.", "Can we shoot the whole thing in one day?"],
    win: ["All G. All G. I'll find the money. Somewhere."], after: ["All G, all G? Quick one later about the call sheet."] },
  tim: { name: "TIM", role: "ECD", look: "tim", port: "t_tim", map: "mal2", x: 18, y: 4, dir: "down", lv: 6, boss: 1, team: ["lion"], needs: ["jimi", "pat", "chris", "jeremy"], unlock: "TIM WILL SEE YOU NOW. THE GLASS OFFICE.",
    gate: ["Door's open, but get past the floor first.", "Pat, Lucy, Chris and Jeremy. Then come and see me."],
    intro: ["So you want to make work here.", "Everyone has an idea. Show me the big one.", "And it had better be on brief."],
    win: ["That's the work.", "Take the badge. You've earned it."], after: ["Good work doesn't need a deck. Mostly."] },
};

// ---- what people and things say ----
export const SAY = {
  intro: ["Hi, I'm Stefan. This is my portfolio.", "My projects are out in the long grass around the valley.", "Find one and beat it, and you get to see the work.", "First, pick a tool to take with you: AI, Photoshop or Premiere. They're on the stands behind me."],
  after: ["The door is at the bottom of the room. Walk into long grass to find a project.", "AI beats FILM, PHOTOSHOP beats AI, PREMIERE beats IMAGE.", "There are eight film reels hidden around the valley too. Each one makes your tool stronger.", "Watch out on the roads. Agency people and clients hang about out there, and they all want a quick chat. If one spots you, you'll have to fight their way through it.", "The coffee machine in here brings your tool back to full health.", "Win fights and smash open the flight cases left by the roads, and you can spend it at the coffee kiosk on the square. Come back tomorrow and your day rate will have landed too. Each drink helps in its own way."],
  ending: ["That's all of them. Thanks for playing through my work.", "If you'd like to work together, my details are on the next screen."],
  needPick: ["Pick a tool from the stands first."],
  noPick: ["Pick one of the three tools on the stands."],
  desk: ["Stefan's desk."],
  coffee: ["You make a coffee.", "Your whole folio is back to full health."],
  poster: ["A poster for GROW, a short film in Ai Experiments."],
  taken: ["An empty stand."],
  left: ["You've already picked your tool."],
  goat: ["A goat on a power line, from Ai Experiments.", "The original video has 101M views."],
  hole: ["A hole in the ground. The sign says DO NOT OPEN."],
  reels: [
    "Before AI video was everywhere, Stefan faked a goat on a power line. It hit 101M views and the Daily Mail thought it was real.",
    "Summer of Sport: 23 illustrations across 1200+ sites in Paris and Marseille, each drawn on iPad.",
    "The Jacquemus truck film, Ibiza, we are here, did 3.9M views.",
    "Coca-Cola's taste is beyond words, so the film didn't use any. Just Ahhh. Oooh. Yeah. Music by Tyler, The Creator.",
    "#RELAX: the AirPods Camera Remote film with @sedjropointelle did 3.5M organic views.",
    "Stefan got fed up not knowing how 3D renders were made, so he taught himself Blender.",
    "La Croisière redefined how Apple shows up on social.",
    "Gumtree: good finds sell themselves. No salespeople, no fanfare.",
  ],
  staff: [
    "Has anyone seen the good HDMI adapter? Not the one that only works upside down.",
    "I've been on mute for the whole call. Nobody noticed. I'm choosing to take that as a compliment.",
    "The coffee machine downstairs is the only thing in this building that's never missed a deadline.",
    "We're calling it a 'quick sync'. It's in the diary for ninety minutes.",
    "I said 'love that' in the review. I did not love that.",
    "Final_FINAL_v7_actualfinal.mov. Don't touch it. It's load bearing.",
    "Someone booked every meeting room with a meeting called 'hold'. It's a dark art.",
    "If you see the client's logo in the wrong green, say nothing. Walk away. Live your life.",
    "I came in for the free breakfast. That was three years ago.",
    "The wifi password is on a post-it under the plant. The plant knows everything.",
    "Tim's door is glass, so you can see exactly how busy he is. Very busy. Always.",
    "We pitched it as 'authentic'. Then we spent four days making it look authentic.",
    "Can we just make the logo bigger? Asking for a client.",
    "I've got twelve tabs open and every single one of them is a deck.",
    "There's cake in the kitchen. Nobody knows whose birthday it is. Nobody's asking.",
    "Rendering. Don't talk to me. Don't talk to my laptop. Especially don't talk to my laptop.",
    "The timesheets are due Friday. They're always due Friday. It's always Friday.",
    "Someone said 'let's take this offline' and then walked into the sea.",
    "I put 'creative' in my email signature and now people ask me to fix their PowerPoint.",
    "Did you see the reel Stefan made? Everyone's been quietly rewatching it at their desks.",
    "Nobody upstairs gets past the person on their floor. It's the closest thing we have to a process.",
    "The sofas are purple because of a brand workshop in 2019. We don't talk about the workshop.",
  ],
  lime: ["A lime-green hire e-bike, abandoned on the pavement like they always are.", "The screen says: UNLOCK FOR 1 FILM REEL."],
  limeNone: ["You need a film reel to unlock it. There are eight hidden round the valley."],
  toAlysha: ["You did it. Every project, and the MAL badge.", "But there's one more test. The hardest one.", "Alysha's right here. Bring her the whole portfolio.", "Train it up first though. Everyone out there will battle you again, and their creatures are loose in the long grass now."],
  passed: ["THE ALYSHA TEST: PASSED.", "That's the whole thing. Thanks for playing Poké-folio.", "Everything you caught is in your FOLIO. Keep exploring, or go and see the real work."],
  floorLocked: (who) => [`${who} isn't letting anyone upstairs until you've had a quick chat.`],
  malLocked: ["The doors are locked. A note on the glass says:", "\"By appointment only. Come back once you've found four of Stefan's projects.\""],
  malcoffee: ["Free coffee from the office machine. It's fine.", "Your whole folio is back to full health."],
  smoke: [["KATIA: Just stepping out for five.", "I've written forty endlines on this one cigarette. Thirty-nine of them are bad.", "Don't tell Jeremy. I'm meant to be on a call."], ["ALFIE: *vapes* It's mango ice.", "Honestly, every good idea in that building started out here."], ["A bin with an ashtray on top, full to the brim."]],
  // ---- Stefan's studio, and bits of his life scattered round the valley ----
  monstera: ["A huge monstera in a huge pot.", "Stefan talks to it more than he'd admit."],
  wardrobe: ["Stefan's wardrobe.", "Five pairs of the exact same baggy cargos, in five colours.", "And a pair of Vomeros that have seen things."],
  oils: ["Little brown bottles of essential oils.", "Stefan blends his own. This one's labelled \"Monday\"."],
  tv: ["A K-drama, paused on episode 14.", "Someone's about to confess something. Best not touch it."],
  tank: ["A spider tank. A small, friendly spider waves a leg at you.", "There used to be two.", "The other one got out, and Stefan swears it's living in a hole somewhere, DO NOT OPEN."],
  arcade: ["An arcade cabinet that says SYNTH-FOLIO.", "It turns all of Stefan's work into a little music machine."],
  guitar: ["You strum Stefan's acoustic.", "Nylon strings. He likes them softer."],
  grow: ["A tiny glass bottle on the bench, labelled \"Grow\" in curly handwriting.", "The film's in Ai Experiments: one tablet, one tube carriage, and a very bad commute.", "You put it back. Some things are better as films."],
  balloons: ["Three hot air balloons: a spiky green one, a yellow tulip and a pink foxglove.", "Stefan's team flew them over Cappadocia for Les Benjamins and Apple.", "The whole story is on its own page."],
  badge: ["You got the MAL BADGE!"],
  holeDone: ["THE CRAWLER is back in its hole."],
  lost: ["You're back at the studio. Your tool is at full health again."],
  ran: ["You got away."],
  cantRun: ["You can't run from this one."],
  signs: {
    chairs: ["HOT DESKING ZONE.", "Wheelie chairs everywhere. Walk into one to push it.", "Get one stuck? Leave the floor and come back. Facilities will tidy up."],
    wet: ["CAUTION: WET FLOOR.", "Freshly mopped. Step on it and you will slide until something stops you."],
    home: ["FOSTER VALLEY", "Stefan Foster's studio."],
    stadium: ["THE STADIUM", "Summer of Sport is in the long grass here."],
    farm: ["THE FARM", "3D Explorations is in the long grass here."],
    uncanny: ["THE PADDOCK", "Ai Commissions is in the grass on the left. Ai Experiments is on the right."],
    gum: ["THE GROVE", "Gumtree is in the long grass here."],
    fizz: ["THE SPRINGS", "Coca-Cola is in the long grass here."],
    relax: ["THE LAGOON", "#RELAX is in the long grass here."],
    riviera: ["THE BEACH", "La Croisière is in the long grass here."],
    hole: ["DO NOT OPEN"],
    cappa: ["FROM EARTH TO SKY", "Les Benjamins x Apple. Cappadocia.", "Something spiky is floating about in the long grass here."],
    malout: ["MEDIA ARTS LAB", "Ground floor: kitchen and the all-agency space. First: project management and accounts. Second: creative and production."],
    mal: ["Reception. There's nobody here, just a bowl of mints and a sign-in iPad.", "Project management and accounts on the first floor. Creative and production on the second. Tim's office is the glass one."],
  },
};

// ---- the valley ----
// One big map: the studio in the middle, a river across the north, and a corner for every project.
export const ZONES = [
  { n: "The Stadium", r: [2, 2, 23, 17] }, { n: "The Farm", r: [26, 2, 46, 10] }, { n: "The Paddock", r: [48, 2, 69, 17] },
  { n: "The Grove", r: [2, 22, 13, 33] }, { n: "The Springs", r: [58, 22, 69, 33] }, { n: "The Lagoon", r: [2, 35, 19, 49] }, { n: "The Beach", r: [50, 35, 69, 49] },
  { n: "Foster Valley", r: [28, 29, 42, 41] }, { n: "Cappadocia", r: [37, 13, 46, 19] },
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
  put("sign", 33, 38, { act: "sign:home" }); put("kiosk", 30, 31, { w: 2, act: "shop" }); put("mailbox", 38, 37);
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
  // the MAL office, the gym, on the east side of the square. Locked until every project is found.
  put("mal", 43, 35, { w: 7 }); rect(43, 31, 49, 35, (x, y) => { solid[I(x, y)] = 1; keep[I(x, y)] = 1; });
  road(41, 36, 46, 37); road(46, 36, 46, 41); clear(41, 29, 53, 41); put("sign", 44, 37, { act: "sign:malout" });
  // Cappadocia: three balloons on the open grass east of the north road
  clear(37, 13, 46, 19); put("balloon0", 39, 16, { act: "balloons" }); put("balloon1", 42, 15, { act: "balloons" }); put("balloon2", 45, 16, { act: "balloons" }); put("sign", 41, 18, { act: "sign:cappa" }); rect(37, 13, 46, 14, (x, y) => (tg[I(x, y)] = 9));
  // hire bikes, dumped wherever the last rider left them, like London
  [[31, 37], [14, 29], [24, 26], [44, 29], [57, 26], [37, 15], [34, 40], [23, 44], [48, 41], [30, 10], [54, 13], [65, 10], [41, 32]].forEach(([x, y]) => put("lime", x, y, { act: "lime" }));
  // a bench by the paddock road, with something left on it
  clear(51, 14, 54, 16); put("bench", 52, 15, { w: 2, act: "grow" });
  // round the corner: the smoking area
  rect(50, 31, 53, 34, (x, y) => { set(x, y, TT.paving); keep[I(x, y)] = 1; });
  put("bin", 50, 31, { act: "smoke:2" });
  objs.push({ k: "npc", who: "smoker", x: 51, y: 32, w: 1, solid: 1, dir: "right", act: "smoke:0", puff: 1 }, { k: "npc", who: "vaper", x: 53, y: 33, w: 1, solid: 1, dir: "left", act: "smoke:1", puff: 2 });
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
  // the clients, standing about on the roads
  for (const id in TRAINERS) { const t = TRAINERS[id]; if (t.map) continue; objs.push({ k: "npc", who: t.look, x: t.x, y: t.y, w: 1, solid: 1, dir: t.dir, act: "trainer:" + id, tr: id }); }
  objs.forEach((o) => { if (o.solid && o.k !== "npc" && o.k !== "house") for (let k = 0; k < (o.w || 1); k++) solid[I(o.x + k, o.y)] = 1; });   // (people are checked as you walk)
  for (let i = 0; i < N; i++) if (SOLID.has(base[i])) solid[i] = 1;
  solid[I(35, 36)] = 0; solid[I(46, 35)] = 0;
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
  put("guitar", 12, 4, { act: "guitar" }); put("monstera", 0, 6, { act: "monstera" });
  put("wardrobe", 0, 3, { act: "wardrobe" }); put("oils", 12, 3, { act: "oils" }); put("tv", 10, 6, { w: 2, act: "tv" }); put("tank", 12, 7, { act: "tank" }); put("arcade", 1, 7, { act: "arcade" });
  objs.push({ k: "wallart", art: "poster", x: 0, y: 1, solid: 0, w: 1, flat: 1, act: "poster" }, { k: "wallart", art: "window", x: 12, y: 1, solid: 0, w: 1, flat: 1 });
  objs.push({ k: "npc", who: "stefan", x: 6, y: 4, w: 1, solid: 1, act: "stefan", dir: "down", id: "stefan" });
  objs.push({ k: "npc", who: "alysha", x: 8, y: 4, w: 1, solid: 1, act: "trainer:alysha", dir: "left", tr: "alysha" });
  objs.forEach((o) => { if (o.solid && o.k !== "npc") for (let k = 0; k < (o.w || 1); k++) solid[I(o.x + k, o.y)] = 1; });
  solid[I(1, 2)] = 1;   // the head of the bed
  for (let i = 0; i < N; i++) if (SOLID.has(base[i])) solid[i] = 1;
  return { id: "house", W, H, base, vr, tg, solid, objs, start: [3, 4], exit: [6, 8] };
}

// ---- the MAL office: three floors, all the same tired carpet ----
function room(id, W, H) { const N = W * H; return { id, W, H, base: new Uint8Array(N), vr: new Uint8Array(N), tg: new Uint8Array(N), solid: new Uint8Array(N), objs: [], warps: [] }; }
function seal(m) {
  const I = (x, y) => y * m.W + x;
  for (const id in TRAINERS) { const t = TRAINERS[id]; if (t.map === m.id) m.objs.push({ k: "npc", who: t.look, x: t.x, y: t.y, w: 1, solid: 1, dir: t.dir, act: "trainer:" + id, tr: id }); }
  m.objs.forEach((o) => { if (o.solid && o.k !== "npc") for (let k = 0; k < (o.w || 1); k++) m.solid[I(o.x + k, o.y)] = 1; });
  for (let i = 0; i < m.W * m.H; i++) if (SOLID.has(m.base[i])) m.solid[i] = 1;
  return m;
}
// the office is busy: people milling about, each with a line of their own, never far from where they started
let staffN = 0;
function staff(m, list) { list.forEach(([who, x, y]) => m.objs.push({ k: "npc", who, x, y, w: 1, solid: 1, dir: ["down", "left", "right", "up"][(x + y) % 4], act: "staff:" + (staffN++ % SAY.staff.length), wander: [x - 2, y - 2, x + 2, y + 2] })); }
export function buildOffice(f) {
  const m = room("mal" + f, 22, 14), I = (x, y) => y * m.W + x, B = (x, y, t) => (m.base[I(x, y)] = t);
  const put = (k, x, y, o = {}) => m.objs.push({ k, x, y, solid: 1, w: 1, ...o }), wall = (k, x, o = {}) => m.objs.push({ k: "wallart", art: k, x, y: 1, solid: 0, w: 1, flat: 1, ...o });
  for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) { B(x, y, y === 0 ? TT.wall : y === 1 ? TT.skirt : TT.carpet); m.vr[I(x, y)] = (x + y) % 2; }
  const rows = (ys, xs) => ys.forEach((y) => xs.forEach(([a, b]) => { for (let x = a; x <= b; x++) put("bdesk", x, y); }));
  if (f === 0) {
    // ground: the kitchen on the left, the all-agency space on the right
    for (let y = 2; y < m.H; y++) for (let x = 0; x <= 8; x++) B(x, y, TT.kitchen);
    put("counter", 0, 2); put("counter", 1, 2); put("counter", 2, 2); put("coffee", 3, 2, { act: "malcoffee" }); put("fridge", 4, 2); put("counter", 5, 2); put("counter", 6, 2); put("plant", 8, 2);
    put("ktable", 2, 6, { w: 3 }); put("ktable", 2, 10, { w: 3 });
    wall("screen", 14); put("sofaL", 11, 4, { w: 2 }); put("plant", 10, 2);
    // the gym puzzle: a room of wheelie chairs between two walls of filing cabinets. Push them clear to reach the top.
    for (let y = 2; y <= 10; y++) put("cabinet", 9, y);
    for (let x = 10; x <= 21; x++) { if (x !== 15) { put("cabinet", x, 6); put("cabinet", x, 10); } }
    [[10, 7], [10, 8], [13, 8], [15, 8], [16, 9], [17, 7], [18, 9], [20, 7], [21, 7], [21, 8], [21, 9]].forEach(([x, y]) => put("cabinet", x, y));
    [[12, 7], [14, 8], [14, 9], [20, 8]].forEach(([x, y]) => put("chair", x, y, { push: 1 }));
    put("sign", 16, 11, { act: "sign:chairs" });
    put("rdesk", 10, 11, { w: 3, act: "sign:mal" });
    B(20, 2, TT.stairsU); m.warps.push({ x: 20, y: 2, to: "mal1", tx: 20, ty: 3, dir: "down", needs: ["pat"], who: "PAT" });
    staff(m, [["mm", 1, 4], ["sl", 5, 4], ["bs", 6, 8], ["mp", 1, 9], ["ad", 12, 12], ["sl", 19, 12], ["bs", 12, 3]]);
    B(15, 13, TT.mat); m.warps.push({ x: 15, y: 13, to: "world", tx: 46, ty: 36, dir: "down" });
  } else if (f === 1) {
    // accounts: rows and rows of black desks
    rows([6, 9, 12], [[3, 8], [12, 17]]); wall("board", 6); wall("screen", 14);
    put("sofaL", 19, 8, { w: 2 }); put("plant", 21, 12); put("printer", 20, 12); put("plant", 0, 13);
    B(20, 2, TT.stairsD); m.warps.push({ x: 20, y: 2, to: "mal0", tx: 20, ty: 3, dir: "down" });
    B(1, 2, TT.stairsU); m.warps.push({ x: 1, y: 2, to: "mal2", tx: 1, ty: 3, dir: "down", needs: ["jimi"], who: "LUCY" });
    // the gym puzzle: the floor by the stairs up has just been mopped. Step on it and you slide till something stops you.
    for (let y = 2; y <= 5; y++) for (let x = 0; x <= 8; x++) if (!(x === 1 && y === 2)) B(x, y, TT.wet);
    [[0, 3], [2, 2], [3, 5], [4, 4], [6, 2], [7, 3], [8, 5]].forEach(([x, y]) => put("wetsign", x, y));
    [0, 1, 2].forEach((x) => put("cabinet", x, 6)); put("sign", 9, 6, { act: "sign:wet" });
    staff(m, [["ad", 5, 8], ["mm", 14, 8], ["bs", 10, 10], ["sl", 7, 13], ["mp", 15, 11], ["mm", 18, 5], ["bs", 11, 13]]);
  } else {
    // creative and production, and Tim's glass box in the corner
    rows([9, 12], [[3, 8], [10, 13]]); wall("board", 6); wall("board", 11);
    for (let y = 2; y <= 7; y++) B(15, y, TT.glass); for (let x = 15; x <= 21; x++) B(x, 7, TT.glass); B(18, 7, TT.carpet);
    // the gym puzzle: red tape everywhere. Cut through it.
    put("tape", 18, 7, { act: "tape" }); for (let y = 2; y <= 8; y++) put("tape", 3, y, { act: "tape" }); [0, 1, 2].forEach((x) => put("tape", x, 9, { act: "tape" }));
    put("desk", 17, 2, { w: 2 }); put("shelf", 20, 2, { w: 2 }); put("plant", 16, 2);
    put("sofaL", 1, 10, { w: 2 }); put("printer", 20, 12); put("plant", 21, 13); put("sofa", 16, 11, { w: 3 });
    B(1, 2, TT.stairsD); m.warps.push({ x: 1, y: 2, to: "mal1", tx: 1, ty: 3, dir: "down" });
    staff(m, [["sl", 6, 5], ["mp", 7, 11], ["mm", 12, 10], ["bs", 9, 4], ["ad", 4, 13], ["sl", 16, 9], ["mm", 19, 12]]);
  }
  return seal(m);
}
