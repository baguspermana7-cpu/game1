# Blippi — remaining PRD missions on the owner's new scene plates (2026-10-11)

Owner (asleep, working autonomously): Blippi must be the PRD game (missions), not racing. The owner generated
the mission backgrounds: `/home/baguspermana7/Documents/temporary/blippi/kekurangan/part2/result/`
(backgrounds/bg-<key>-landscape.png 1672x941 + -portrait.png 941x1672; sheets/ with mission pieces, islands-after,
badges, discovery cards + CSVs if present). Prompt spec with each scene's EMPTY work zones:
`.../part2/PROMPTS-BLIPPI-PART2.md` — read it: it says exactly where interactive pieces go in each plate.

## Reuse (do NOT build from scratch)
The existing mission template and missions in this repo are the pattern: `blippi-mission.js` (template: steps,
tool tray, hint ladder, idle hint, kind failure reasons, pause/resume/reload state, payoff), `blippi-jalan.js`,
`blippi-pasir.js` (W01-M02), `blippi-bukit.js` (W01-M03), `data/blippi-missions.js`, `data/blippi-art.js`.
Every new mission = a small module like blippi-pasir.js on the same template. Pieces: Codex pack crops first
(`/home/baguspermana7/Documents/temporary/blippi/sudah organized/assets/...` — stickers, facilities, gears,
pipes, valves, crates, plants, vehicles), then the owner's part2 sheets.

## Do, in PRD order, one mission at a time (PRD docs/PRD-v3.md §11.2–11.7 tables give goal + choice)
W01-M04 Jembatan untuk Semua, W01-M05 Hari Pembukaan Taman, W02-M02 Ke Mana Airnya Pergi?, W02-M03 Gerobak di
Lumpur, W02-M04 Dua Jalan untuk Air, W02-M05 Parade Air Ceria, then W03, W04, W05, W06.
For each: ingest its two plates (webp, quality ~82) as `assets/blippi/bg-<key>.webp` + `--portrait`, build the
mission in its plate's work zones, a meaningful choice (never one fixed animation), kind failure with the reason,
4-rung hint ending in doing it, sticker reward, world change on the map. Keep each mission small and playable.
Map: a world unlocks its missions in PRD order; islands use the owner's islands-after sheet when present.

## Quality bar (owner was furious about from-scratch, unplayed work)
- Play every new mission with real input at 1280x800 and 390x844 (portrait = hub rotate chip flow) and LOOK at
  the frames before reporting. Vehicles/characters readable (~15–18% of stage width), no detached UI.
- No emoji, no outline on art, kids' rules (women only with hijab).
- qa-blippi green + one check per mission (reaches payoff by real input, wrong choice is kind, state survives
  reload). SW shell token bump via tools/build-sw-shell.py.
- Report after EVERY 2 missions (under 120 words, file list, sheet paths). Don't commit — main reviews and pushes.
- Do not touch BALAPAN (withdrawn) or ~/rz-work/Dunia-Emosi.
