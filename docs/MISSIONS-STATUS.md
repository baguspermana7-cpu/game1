# Missions part 2 status (2026-10-11)
- DONE: sync audit of W01-M01..M05 + W02-M01 (every step is a drag/hold ON a scene object; tray = progress only, tool auto-live); W02-M02 Aliran + W02-M03 Lumpur built (blippi-aliran.js, blippi-lumpur.js).
- Template edits (blippi-mission.js, 3 lines): run.tool = current step's tool at start/advance; tool slots centred for any step count.
- qa-blippi 456/457 (only the load-sensitive trip perf check flaked); per-mission checks: drag/hold completes, wrong choice kind, demo hand + glow within 4 s, reload keeps state.
- NEXT: W02-M04 Dua Jalan untuk Air, W02-M05 Parade Air Ceria (plates bg-w02-m04-dua-jalan, bg-w02-m05-parade-air not ingested yet; jets pc-jets-a/b ready), then W03-W06 (mission-pieces-2.png not ingested).
- Token g1-20261011g; run build-sw-shell.py only from game1/. Sheets: tools/qa-part2-sheet.mjs <out> <M01..M05|W02M02|W02M03> [w h].
