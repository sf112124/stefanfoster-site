# Tape Room — woodland study revision (separate version, not deployed)

Preview: run `python3 -m http.server 8000` in this folder and open http://localhost:8000/tape/ . No build, no network
(three.js r160 and Geist are vendored; the import map in tape/index.html is unchanged).

## What changed
- tape/main.js is a new scene on the same foundations (content.js TAPES/FILES drive it, PLAY_FILMS = false, GLTFLoader export,
  window.__tapeRoom hook). The previous overhaul is kept for reference as tape/main.legacy.js (not loaded).
- Setting: daylight woodland study — timber-framed window wall, beams, warm polished concrete, rug, asparagus ferns.
  One soft sun + hemisphere fill, soft shadows, no bloom/post-processing, nothing animated in the lighting (no flicker).
- CRT TV (rounded moulded housing, near-flat screen), VHS deck below it, tubular steel cart with cables and casters.
- The beige computer is replaced by a silver MacBook Pro on a wooden desk. Its folders: Published work (the real links
  from content.js: FILES + each tape's page), Theories, Field notes, READ ME (fiction, labelled as such).
- Investigation wall: collage of pinned hand-written sheets, doodles, diagrams, red thread, 7 large illustrated posters,
  one poster whose corner lifts to show a drawing. Two paper stacks on the desk to leaf through. A cream seated figure, unlabelled.
- Tapes: illustrated sleeves drawn in ink/pencil by tape/art.js (no screenshots; media/ covers are no longer used on sleeves).
  AVATAR: little office worker at a time clock, tall dancing shadow, "OVERTIME IS VOLUNTARY". Other sleeves only interpret
  the title or the published clip titles; no plot facts are invented.
- tape/sleeves.js: per-tape sleeve overrides (motif, full paint function, or an illustration file) for a later research pass.
- tape/casefile.js: the fictional investigator's notes (original, playful, includes "Possibly just a creative director").

## Controls
Drag to look; W A S D / arrows to walk (Shift = faster); click or tap things. Touch: left stick walks.
Tape: click to pick up, drag to turn it over, E insert, Q put down, T throw, R recover thrown tapes.
V / click TV: approach; F full screen; E eject; Esc back. C / click MacBook: open folders. Esc always goes back.
Every action also has a button at the bottom (44px targets), so nothing needs a keyboard.

## Tested (headless Chromium, software WebGL, over local HTTP, real mouse / touch events unless noted)
Desktop 1280x720 and phone 390x844 (touch): load with no console/page/request errors; drag-look; walk (keys / stick);
click a tape to pick it up; drag-rotate; Throw; Recover; Put down; Insert -> TV card; Full screen + Back; Eject; Back;
MacBook folders (20 links, first /benjamins; Theories shows the creative-director line) + Back.
Desktop only by real click: MacBook, paper stack + Next sheet, poster-corner lift. Phone only by real tap: wall poster
full-screen view, picking up the figure. Phone MacBook was opened through the button/hook path, not by tapping the 3D laptop.
The final ZIP was unzipped and its /tape/ page loaded over HTTP once (desktop) with no errors.

## Not tested / remaining
- No real GPU, iOS Safari, Android Chrome, Firefox or real phone hardware; frame rate unmeasured (software renderer).
- Not re-run after the last small art/lighting tweaks beyond the load check. Phone paper-stack tap and desktop poster /
  figure clicks were not confirmed (test aimed off-screen), sound not auditioned, PLAY_FILMS=true path untested.
- Project links (/benjamins, /#about, ...) point at the live site and 404 in a local preview, as before. Film clips are not bundled.
- Hand lettering uses the visitor's system cursive font with per-letter wobble; a bundled handwriting font would be more consistent.
- Thrown tapes collide with floor, walls and furniture tops only; the poster fold is a flat crease, not a curl.
