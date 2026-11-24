// casefile.js — ORIGINAL FICTION. The notes of an invented, eccentric investigator who is trying to work out who
// made the tapes. Every line is a joke and is labelled as one in the room. Nothing here is biography, and nothing
// refers to private, unreleased or confidential material: the only real things are the published links in content.js.

export const DISCLAIMER = "Everything in this case file was made up by a fictional and badly rested investigator. It is a joke, not a fact. The only real things in here are the links under “Published work”.";

// mutually incompatible on purpose
export const THEORIES = [
  ["Theory 1", "S.F. is three art directors in one long coat. Explains the range. Does not explain the coat."],
  ["Theory 2", "S.F. is one person who has never once slept. Contradicts Theory 1 and the existence of a tape called #Relax."],
  ["Theory 3", "S.F. is the goat. The goat has 100 million of something. Follow the goat."],
  ["Theory 4", "The tapes make themselves at night. S.F. only writes the labels."],
  ["Theory 5", "S.F. is not a person but a weather system that occasionally produces film."],
  ["Theory 6", "Possibly just a creative director. (Too simple. Filed under UNLIKELY. Underlined twice anyway.)"],
  ["Theory 7", "There are two samurai. One cuts hair, one collects bounties. Never seen in the same room. Neither has S.F."],
  ["Theory 8", "All of the above at once. Disproves all of the above. Need more thread."],
];
export const FIELD_NOTES = [
  ["Day 1", "Found eleven tapes. Counted again. Still eleven. Suspicious number. Bought thread."],
  ["Day 4", "Watched the VCR clock for an hour. It says 12:00. It is hiding something or it is noon."],
  ["Day 9", "The shadow on the AVATAR sleeve is taller than the man. Shadows are not allowed to do that. Wrote OVERTIME IS VOLUNTARY on my hand."],
  ["Day 12", "Asked the fern. The fern declined to comment. Watered it anyway, for leverage."],
  ["Day 15", "A popsicle, a cruise and a goat walk into a portfolio. This is not a joke, it is my Tuesday."],
  ["Day 21", "Zombie + cowboy = ? Tried the sum on the calculator. The calculator said hello upside down."],
  ["Day 23", "The cream statue has not blinked. Respect. Did not label it; it knows what it is."],
  ["Day 30", "New rule: if a poster corner is curling, something is underneath. Usually a drawing. Once, a sandwich."],
  ["Memo", "Connect ANYWHERE to everywhere. Ran out of wall."],
  ["Memo", "Tough Love: is the love tough, or is the tough in love? Ask both."],
  ["Memo", "Grow. (It did. Moved the pot.)"],
  ["Note to self", "Stop calling it a conspiracy. It might just be someone who likes making things. Investigate further."],
];
// the two stacks of paper on the desk
export const STACKS = {
  notes: { title: "Field notes (a stack of loose sheets)", pages: [
    { title: "READ THIS FIRST", lines: [DISCLAIMER] },
    { title: "The case so far", lines: FIELD_NOTES.slice(0, 4).map((n) => `${n[0]} — ${n[1]}`) },
    { title: "The case, continued", lines: FIELD_NOTES.slice(4, 8).map((n) => `${n[0]} — ${n[1]}`) },
    { title: "Theories (pick one)", lines: THEORIES.slice(0, 4).map((n) => `${n[0]}: ${n[1]}`) },
    { title: "Theories (pick another)", lines: THEORIES.slice(4).map((n) => `${n[0]}: ${n[1]}`) },
  ] },
  sketches: { title: "Sketches (a stack of drawings)", pages: [
    { title: "Exhibit A — the tall shadow", motif: "avatar", lines: ["Little worker. Time clock. Shadow dancing without permission."] },
    { title: "Exhibit B — the goat", motif: "goat", lines: ["Drawn from imagination. The tin is my addition. The title mentions a snack."] },
    { title: "Exhibit C — which way?", motif: "anywhere", lines: ["A signpost for a tape called Anywhere. All arrows correct."] },
    { title: "Exhibit D — hat, stitched", motif: "zombie-cowboys", lines: ["I have not seen inside this tape. I only drew the title."] },
    { title: "Exhibit E — scissors & sword", motif: "samurai-barber", lines: ["Just a little off the top."] },
    { title: "Exhibit F — pot", motif: "grow", lines: ["It grew while I was drawing it."] },
  ] },
};
