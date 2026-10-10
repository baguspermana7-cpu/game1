# Blippi G32 — slice 2: real art in, then the vehicle racing mode (2026-10-10)

The game now lives in its OWN repo `~/rz-work/game1` (GitHub baguspermana7-cpu/game1, Pages at
https://baguspermana7-cpu.github.io/game1/). Dunia-Emosi's site was over GitHub Pages' 1 GB limit. Same origin
as Dunia-Emosi, so the shared save engine (`../Dunia-Emosi/games/data/save-engine.js`, per-avatar saves) and any
shared asset under `../Dunia-Emosi/assets/...` are reused directly — never copy shared art into game1.
Local test: `setsid nohup python3 -m http.server 8090 --directory ~/rz-work >/dev/null 2>&1 &` then
http://localhost:8090/game1/ . Puppeteer lives in ~/rz-work/Dunia-Emosi/node_modules: run gates from there
(`cp ../game1/tools/qa-blippi.mjs tools/_qa-blippi-g1.mjs && node tools/_qa-blippi-g1.mjs; rm tools/_qa-blippi-g1.mjs`)
or `npm i puppeteer` inside game1 (add node_modules to .gitignore).

## Part A — make the real art look right (do first)
46 owner art slots are now SHIPPED in `data/blippi-art.js` (files in `assets/blippi/`, reviewed by main session; the
Codex handoff explains provenance: `/home/baguspermana7/Documents/temporary/blippi/sudah organized/CLAUDE-HANDOFF-COMPLETE.md`
— read §4, §5, §6, §8, §10). Current defects at 1280x800 (screenshot reviewed):
- art renders at natural pixel size instead of FITTING its slot box: bottom-nav icons are huge and cover the PETA/
  KENDARAAN/... labels (qa-blippi text check fails on every screen), Discovery Wall icons are huge, Blippi is small,
  the buggy is small and floats off its pad.
- slots whose content the new background already paints (e.g. `hub-garasi` house on top of the garage that is in
  `bg-hub`; check `hub-meja-peta`, pads) must be hidden when the real background is shipped, so nothing is doubled.
Fix: every slot renders `object-fit: contain` inside the exact box measured from the owner reference
(`docs/mockups/*.png`), anchored bottom-centre for characters/vehicles (feet/wheels on the pad), centre for icons.
Match the references "sama persis": compare side by side (reference left, ours right) per screen and adjust boxes.
Then: portrait backgrounds (`bg-*--portrait.webp`) via `<picture>`/media query instead of the rotate prompt where a
reflowed portrait layout is feasible; Parallax.js 3.1 + `blippi-parallax-adapter.js` + `blippi-motion.css` from the
handoff's `runtime/` folder (vendor them into game1 with LICENSE + PROVENANCE), layered depths per §6, ambient
motion per §8 (one ambient family per scene), reduced-motion stops all of it, hidden screens stop work.
Owner VFX for Blippi: `/home/baguspermana7/Documents/temporary/uiux/visual effect/sudah organized/database/blippi-safe.json`
(65 child-safe, license-cleared effects; files in `curated/`): use them for feedback bursts (hose connected, correct
board, mission done) — copy only the ones you use into `assets/vfx/` with a small `data/blippi-vfx.js` index that
keeps id, source, license and credit.

## Part B — new vehicle adventure mode (owner, 2026-10-10)
"adakan game 3 lane seperti mojo atau yang free lane seperti titanic atau yang seperti uiux di blippi ... di beberapa
level dan category darat, udara yang pakai seaplane, luar angkasa dan air, harus bener2 immersive dan parallax yang
sangat2 immersive full seru, no bug, no mistake, no error"
= add a vehicle journey mode with several levels in four categories: DARAT (land), UDARA (air, with a seaplane),
LUAR ANGKASA (space) and AIR (water). Very immersive, deep parallax, really fun, no bugs.
Design: Blippi-style UI (cream panels, blue/orange, Fredoka), entered from the hub (BERMAIN or a new card) with a
category picker → level picker (at least 3 levels per category, rising challenge) → the run. Pick the control model
per category that fits a 6–8 year old: 3-lane swipe/tap (like Mojo's chase, see ~/rz-work/Dunia-Emosi/games/mojo-chase*.js
for the pseudo-3D road and its pitfalls) for land; free horizontal steering (like the Titanic game
~/rz-work/Dunia-Emosi/games/timmy-kapal*) for water/air/space. Collect items, avoid soft obstacles (no fail by
death: bump = slowdown + friendly recover), short learning moments in Blippi's voice-line style (Indonesian), a
finish payoff, stars, per-avatar save. Parallax: 4–6 layers per biome, speed-linked, seaplane takes off from water
into the sky, space has star layers and planets, water has waves and splashes. Art: use shared Dunia-Emosi library
art via `../Dunia-Emosi/assets/db/lib/...` (see `../Dunia-Emosi/games/data/asset-index.js` keys: vehicles, mojo-chase
biomes, tk-* Titanic sea art, sky/space) where it fits; anything missing is a labelled placeholder slot in the art
map + ART-SLOTS.md (the owner sends art later). 60 fps at 4x CPU throttle (p90 <= 20 ms), transform/canvas only.

## Rules
Kids: no emoji, no woman without hijab, no skull/weapons/dynamite/spikes/blood/scary VFX. Touch >= 56 px.
Offline: every new file in game1 `sw.js` SHELL (bump `CACHE_VERSION` + `?v=` token `g1-YYYYMMDDx` everywhere).
Gate: extend `tools/qa-blippi.mjs` (text clip/cover check must pass on all screens and sizes; real-input play of one
level per category; save/reward once; zero page errors; perf budget). Do NOT git commit/push — main reviews.
Report under 300 words + paths of side-by-side sheets and one sheet per category of the new mode.
