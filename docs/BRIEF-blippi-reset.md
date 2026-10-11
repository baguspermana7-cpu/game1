# Blippi — design reset (owner, 2026-10-11, on the tablet)

Owner, in order: "petunjuknya seperti truck air misinya" (excavator mission with water-truck clues) · "Sudah di audit
di qa masih aja salah" · "pasti banyak lagi yg ngaco" · "gamenya nggak bisa dimengerti, aneh" · "nggak ada soal2 yg
disisipkan utk belajar, 70% matematika" · "Gameplaynya terlalu itu2 aja. PRD itu hanya gambaran awal ... utk
disempurnakan. Tempat bermainnya backgroundnya itu itu aja" · "nggak ada gambar kait" · "Nggak usah kunci2an" ·
"Indicator2nya super aneh. Lingkaran2 orange itu" · "Blippi racing aja yg mengendarai nggak ada" · "Workflow game
blippi super sangat berantakan" · "Kamu ini nggak ngerti design game".

Main already did (blippi.js): every world with missions is open, the map shows numbered chips to play ANY mission,
JELAJAHI goes straight into the mission with its PRD vehicle (no vehicle-picker detour), the app runs framed from
Dunia (no purple browser bar). Main owns blippi.js, blippi-mission.js (template), blippi-life.js, blippi-fx.js.

## The rules every mission must pass (main checks each frame against these + the PRD row before any push)
1. **One clear job, said once.** Intro card: the place, the vehicle with Blippi in the cab, the goal as a PICTURE
   (e.g. the finished bridge ghosted), one spoken line. A 4-year-old must know what to do without reading.
2. **The right vehicle doing its own job, with Blippi driving it.** PRD §10: excavator digs with its bucket, dump
   truck loads and tips, mobile crane lifts and lowers with its hook, water truck pumps, tow truck hooks and pulls,
   buggy drives/scans. Blippi's head/torso visible in the cab (driver portrait art) on every vehicle.
3. **Everything the child touches is IN the scene, big, and looks touchable**: pieces >= 9% of stage width, lying
   where they belong in the world (planks in a pile, the hook on the tow truck), idling (small bob). Never a piece
   that exists only as a tray icon (the W02-M03 hook).
4. **Targets are shown as what will be there**: a translucent ghost silhouette of the piece at its place, gently
   pulsing, plus the demo hand doing the gesture. NO orange dashed circles. Success = the piece snaps, squash,
   dust/sparkle, sound, Blippi cheers.
5. **Indicators the child can read without text**: the step bar becomes 3 large picture steps (icon of the action),
   the current one big and bouncing, done ones ticked. Instruction <= 5 words AND spoken.
6. **Every mission in its own place.** Use the owner's plates in
   ~/Documents/temporary/blippi/kekurangan/part2/result/backgrounds (56 plates) + the part-1 plates; no two missions
   in the same plate; the garage plaza is the HUB, not a mission location.
7. **Varied mechanics.** No two neighbouring missions share their main mechanic. Menu: drag-and-place, hold-to-drive,
   draw-the-route (finger path), turn (valve/crank), pour/fill (hold), sort into bins, count-and-load, balance
   (see-saw/scale), match shape/colour, sequence/pattern, find-the-difference/scan, tap-the-rhythm. PRD rows are a
   starting idea — make them better and more fun.
8. **Learning woven in: 70% maths, 30% other** via the shared SoalEngine (../Dunia-Emosi/games/data/soal-engine.js,
   already loaded; trip mode shows the call: `SoalEngine.pick({ game: 'blippi', context: ..., avatar: 'auto',
   count, grade, exclude })`). At least 2 questions per mission and they are PART of the job, in pictures: "Butuh
   berapa papan?" (count, then the planks are placed), "Ramp mana lebih panjang?", "3 + 2 batu bata", shapes for
   the sockets, patterns for the fountain show; 30%: colours, letters of a sign, animals/nature facts. Wrong answer
   = the scene shows why, kind line, try again; never a dead end.
9. **Kind failure, 4-rung hints ending in doing it, reward + world change** (template already has these).

## Order (one mission per report, with a 1280x800 AND 844x390 play sheet you LOOKED at, plus the PRD row quoted)
W01-M02 (excavator, owner's screenshot) → W01-M03 (dump truck; owner's screenshot shows the water truck on ramps)
→ W02-M03 (tow truck + visible hook) → W02-M02 (own water place, not the garage plaza) → W01-M04 (crane) → W01-M01,
W01-M05, W02-M01, W02-M04, W02-M05. Then W03+.
Gate per mission (qa-blippi): vehicle art = PRD vehicle visible during its action step; Blippi driver on it; no
orange ring element; every draggable visible at step start; >= 2 SoalEngine questions answered in the play; plate
not used by another mission. Don't commit; no git stash.
