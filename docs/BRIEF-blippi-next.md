# Blippi — next work (fresh agent, 2026-10-11)

Repo ~/rz-work/game1 (live /game1/, framed inside Dunia Emosi via ../Dunia-Emosi/games/blippi.html). Server for
tests: localhost:8090 serves ~/rz-work (so /game1 and /Dunia-Emosi both resolve). Gate: `node tools/qa-blippi.mjs`.
Play sheets: `node tools/qa-part2-sheet.mjs <outDir> <M01|M02|...|W02M05> [w h]`.

Read first, in order: docs/BRIEF-blippi-reset.md (the 9 rules the owner demanded — vehicle doing its own job with
Blippi in the cab, everything touchable in the scene, ghost targets not orange rings, picture indicators, own place
per mission, varied mechanics, >= 2 questions per mission 70% maths, kind failure), docs/MISSIONS-STATUS.md,
docs/PRD-v3.md §10 (vehicles) and §11 (mission tables). Kit: blippi-mkit.js has K.ask (questions), K.ghost (target
silhouettes), K.driver (Blippi in the cab), K.waterPath/waterBody/ripple. W01-M03 (blippi-bukit.js) is the model
mission — match its quality.

## Order (one mission per report)
1. W02-M03 Gerobak di Lumpur with the TOW TRUCK: finish docs/wip/blippi-lumpur-tow.wip.js (hook on a rope from the
   boom → ghost hook on the cart; "Ban mana yang bergerigi?"; pick a tyre; draw the route with a finger; smooth tyres
   spin in mud, patterned or the dry way succeed; a maths question). Add the `tow-truck` vehicle (assets
   veh-tow-truck.webp, prop-kait.webp already exist), mission data (steps kait/ban/tarik), reward unlock V06. Nothing
   in the bottom ~200 px of the 941-px stage is reachable (tray) — lay out above it.
2. W01-M02 retrofit: K.ghost targets in step 3 (no dashed rings), K.driver on the excavator.
3. W02-M02 in its own water place (not the garage plaza plate).
4. W01-M04 with the MOBILE CRANE (hook lifts and lowers the beams).
5. W01-M01, W01-M05 (one vehicle per job), W02-M01, W02-M04, W02-M05 against the 9 rules.
6. W03 (plates already ingested as bg-w03-m01..m05).

## Rules for you
- Each report: the PRD row quoted, a 1280x800 + 844x390 play sheet by real input that you LOOKED at, qa-blippi
  result line, files touched. Under 150 words.
- Main owns blippi.js, blippi-mission.js, blippi-life.js, blippi-fx.js — ask before touching; put new pieces in
  blippi-mkit.js. Shell token: run `python3 tools/build-sw-shell.py g1-20261011m` (or later letter) from
  ~/rz-work/game1 only.
- Kid-safe: no emoji assets, women only with hijab, no weapons. No outline/white ring on art.
- Don't commit, no git stash.
