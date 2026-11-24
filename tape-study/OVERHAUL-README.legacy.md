# Tape Room — OVERHAUL (separate version)

This is a **separate, unofficial overhaul** of the Tape Room baseline (`sf112124/stefanfoster-site`, branch `tape`,
commit `2be099f`). It is not the live site. Nothing here has been deployed.

## Preview locally
From this folder (the one containing `tape/`, `vendor/`, `media/`):

    python3 -m http.server 8000

then open http://localhost:8000/tape/ . No build step, no network needed (three.js r160 and Geist are vendored).

## Apply to the existing portfolio
Only these files changed — copy just them over the same paths in the site repo:

- `tape/main.js`   (scene overhaul; same build functions, SHOTS, actions, PLAY_FILMS = false)
- `tape/index.html` (mute button, computer button, focus/aria, white fade, reduced-motion CSS; same import map)

Unchanged: `tape/content.js` (TAPES/FILES and links), `vendor/` (three r160, Geist), `media/` covers, `README.md`,
`tape/HANDOFF.md`. This file (`OVERHAUL-README.md`) is new and need not be deployed.

## Not bundled (live-site links)
The computer FILES and header links point at live pages that are **not in this ZIP**: `/benjamins`, `/rpg`, `/synth`,
`/tilt`, `/#about`, `/#summer-of-sport`, `/#3d-explorations`, `/#coca-cola`, `/#gumtree`, `/` and each tape's `page`.
They 404 in a local preview. The film clips (`media/**/*.mp4`) are also not bundled; with `PLAY_FILMS = false`
they are never requested.

## Notes
- Sound is synthesized with WebAudio and only starts after your first click/tap/key; "Sound on/off" (top right) mutes and is remembered.
- Keyboard: ← → / ↑ ↓ choose a tape or the computer, Enter plays/opens, Esc ejects/backs out, C opens the computer.
- Touch: first tap pulls a tape out and names it, second tap plays; "Use the computer" opens the desk.
- `prefers-reduced-motion` removes camera drift, dust, the panel fade and tweens.
- `window.__tapeRoom` is a small debug/test hook; remove it if you prefer.
