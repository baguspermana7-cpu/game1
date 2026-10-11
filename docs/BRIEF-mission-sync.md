# Blippi missions — make the play match the picture (owner, 2026-10-11)

Owner: "karena hanya niru mock up, gameplaynya nggak sync dan aneh. Improve more, polish more, immersive dan
intuitive." Read with docs/BRIEF-missions-part2.md (same rules: reuse the template, no emoji, no outline).

Seen by main in W01-M01 Jalan (1280x800, real input): step 3 "Ketuk paket untuk mengantar ke bendera" is a tray
button while the buggy already stands at the flag, so the tap does nothing the child can see happen; the tray
labels (PAPAN/JALAN/PAKET) are step names, not things. That pattern is the "mockup" feel.

## Rules for every mission step (audit all 7 shipped: W01-M01..M05, W02-M01; then build W02-M02, W02-M03)
1. One instruction = one physical action ON the thing it names, in the scene: drag the plank to the gap, drag the
   parcel onto the flag, turn the valve, pull the hose to the inlet. A tray button is only a source of pieces
   (drag from it) or a vehicle control (hold to drive, like Mojo's JALAN). Never "tap a button to make something
   happen elsewhere".
2. The scene answers every action where the child looks: the plank thuds into the gap (squash + dust), water
   starts flowing, the gate swings, the parcel lands and the flag waves. Use BlippiFX.burst + WAAPI tweens.
3. The vehicle drives ON the ground of the plate: its wheels sit on the road/bridge line in that plate's
   perspective, it faces the way it moves (flip the sprite or pick the side view), speed eases in/out. Vehicle
   art must be the right vehicle for the job (the mission's own vehicle from data), readable at 15-18% width.
4. Instruction text <= 6 words, spoken by Blippi; the demo hand shows exactly the gesture the step needs (drag
   path, hold, turn), not a tap where a drag is needed.
5. Wrong choice: the scene shows why (plank too short falls in the water with a splash, truck too heavy sinks
   the ramp), then Blippi says one kind line. Never a red X only.
6. Everything that is part of the plate (bridge, pipe, gate) and that the mission changes must be an overlay
   piece aligned to the plate, so the change is visible; no change hidden behind a dialog.

## Ownership (avoid collisions)
Main is building a shared "living scene" layer (blippi-life.js: depth parallax, clouds, water glints, vehicle
shadow/bob/dust) and owns blippi-fx.js, blippi-motion.css, blippi-life.js. You own the mission modules,
blippi-mkit.js, data/blippi-missions.js, tools/qa-blippi.mjs mission checks. Ask main before touching
blippi-mission.js (the template); keep edits there minimal and tell main which lines.

## Done means
For each mission: a frame sheet of the full play by real input at 1280x800 and 844x390 that you LOOKED at;
qa-blippi green with a per-mission check that each step completes by the in-scene gesture (drag/hold), not by a
button tap. Report every 2 missions, <120 words, file list. Don't commit; no git stash.
