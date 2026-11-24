// sleeves.js — modular sleeve-art overrides, for a later film-research pass.
//
// By default every tape gets an illustrated sleeve drawn by art.js (MOTIFS[tape.id], or a generic cassette drawing).
// To replace one, add an entry here keyed by the tape's id from content.js. Nothing else needs to change.
//
//   export const SLEEVE_OVERRIDES = {
//     // 1) draw your own motif with the ink kit (unit box -1..1, y down). See MOTIFS in art.js for examples.
//     "grow": { motif: (k) => { k.circ(0, 0, 0.5).text("GROW", 0, 0.1, 0.3); }, tagline: "OPTIONAL LINE" },
//     // 2) or paint the whole front yourself: (ctx, width, height, tape, kit) => void
//     "relax": { paint: (c, w, h, t) => { c.fillStyle = "#fff"; c.fillRect(0, 0, w, h); } },
//     // 3) or point at an ILLUSTRATION file (site-root relative like content.js covers). Use drawn artwork only —
//     //    never a screenshot or a traced film frame.
//     "goat": { image: "../media/sleeves/goat-illustration.webp" },
//   };
//
// The same override is used for the tape sleeve and for that tape's wall poster.

export const SLEEVE_OVERRIDES = {};
