# THE TAPE ROOM — handoff brief

You're taking over a working three.js base for Stefan Foster's portfolio (stefanfoster.com). Stefan is a creative director: Apple, Jacquemus, Coca-Cola, Les Benjamins, plus his own AI films. The structure, camera, interactions and content wiring all work already. Every object is a placeholder made of boxes. Your job is to make it beautiful and strange. Don't rebuild the plumbing.

## The idea

A strange liminal office, like the void Eleven goes to in Stranger Things. The office has been abandoned and is half dissolved into darkness. Most ceiling panels are dead, one buzzes and another flickers. There's carpet, partitions and desks fading into black fog a few metres out. Silence, apart from the hum.

In the middle is an old school AV trolley (black steel, castors) with a CRT TV on top and a VCR on the shelf below. Next to it is a stack of VHS tapes, one per project. You pick a tape, it flies into the VCR, the TV crackles to static and the tape plays. To one side, on an old office desk, is a beige 90s computer. That's where everything that isn't a film lives (picture projects, a case study, little toys). Each one opens an existing page of the site.

Reference: a classic CRT on a black AV trolley with a VCR underneath.

## Run it

Serve the folder root over HTTP (any static server, e.g. `python3 -m http.server`) and open `/tape/`. There's no build step. Plain ES modules, with three.js r160 vendored in `vendor/three/` and wired through the import map in `tape/index.html` (`three` and `three/addons/...`).

## Files

- `tape/content.js` is the source of truth for what's in the room. `TAPES` are the films (title, client, year, spine colour, cover image, clips). `FILES` are what's on the computer (title, kind, link). The scene builds itself from this, so keep it that way: no hard-coded projects in the scene.
- `tape/main.js` holds the scene, in labelled sections:
  - **BUILD:** one function per object: `buildRoom`, `buildTrolley`, `buildTV`, `buildVCR`, `buildTape`, `buildComputer`. Replace their bodies with real models (`GLTFLoader` is imported and exported as `loader`). Keep what each returns, because other code uses those parts: the TV's `screen` mesh, the VCR's `slot` and `led`, the computer's `screen`, the trolley's shelf heights.
  - **COVERS:** `paintTape()` paints each tape's spine and sleeve onto canvases. This is a placeholder layout.
  - **SHOTS:** the camera positions for `room`, `tv`, `computer` and `mobile`.
  - **ACTIONS:** `insert`, `load`, `eject`, `openComputer`, `closeComputer`.
  - **SCREENS:** the TV's static, the loading card and the computer's file list.
- `tape/index.html` is the thin HTML layer: header, hints, player strip, plus a CSS grain and vignette as a stand-in for post-processing.

## How it behaves now

- **Room:** slow handheld drift following the mouse.
- **Hovering a tape:** it slides out of the stack and a label shows.
- **Clicking a tape:** it arcs into the VCR slot. The LED goes red, the TV shows static, then a blue VCR "PLAY ▶ / title / LOADING TAPE" card. The camera dollies to the TV.
- **Leaving the TV:** Eject or Esc sends the tape back to the stack.
- **Clicking the computer:** the camera moves to the monitor. Hovering moves the selection, clicking opens the page. Arrow keys and Enter work too. Esc or Back returns.

**Films are switched off for now** (`PLAY_FILMS = false` at the top of main.js), so a tape shows the loading card. Video playback is already written: setting it to true draws the clip into the TV each frame, pillarboxed, and steps through playlists. Leave it off unless asked.

## What to build

1. **Models:** trolley, CRT (curved glass, thick bezel, dials), VCR (front flap the tape pushes through, LED clock that blinks 12:00), VHS tapes (proper cassette shape, with label recess and window), office desk, beige computer, keyboard. Office furniture fading into fog. Low-ish poly is fine. It should feel real, worn and dusty, not cartoony.
2. **VHS sleeves:** this is the big creative bit. Design a distinct, cool cover for each tape in `TAPES`, like 80s/90s rental-store sleeves. Each gets its own typography, layout and spine treatment, inspired by its film (titles, clients and cover stills are in content.js). Lean into spines that read well stacked. Keep it tasteful and art-directed, not parody.
3. **The room:** a convincing liminal office. Fluorescent panels with real light falloff, one flickering, dead ones dark. Carpet texture, ceiling tiles, partitions, a water cooler. Lots of fog and darkness. It should feel endless and slightly wrong.
4. **CRT look:** a shader on the TV screen for scanlines, curvature, chromatic fringe and glow. The static and loading card should look like they're on a tube.
5. **Post:** bloom on the screens and panels, film grain and a vignette (then the CSS grain in index.html can go).
6. **Sound:** fluorescent hum, the clunk and whirr of a tape going in, the TV crackle, the computer's hard-drive tick. Start muted until the first click.
7. **Feel:** weighty, satisfying motion on the tape insert and eject. The computer screen should feel like an old OS.

## Rules

- `content.js` stays the single source of truth. Adding a tape there adds a tape to the room.
- Keep the FILES links as they are. They open existing pages of the live site.
- Keep it static (no build step, no frameworks) so it drops straight back into the site.
- Type for any HTML UI is Geist (`vendor/fonts/geist.woff2`): small, uppercase, widely spaced. Black and white, nothing loud.
- It has to work on phones: tap instead of hover, the `mobile` camera shot, nothing that relies on keys alone.
- Keep it fast: compress textures, keep models light, and don't load anything heavy before the first frame.
