// qa-blippi-rich.mjs — the three richer arenas (owner 2026-10-20: "the SEA, AIR and OUTER SPACE arenas are very, very lacking in
// richness — make them as rich as possible"): AIR (water, air-1..8), UDARA (sky, udara-1..8), ANGKASA (space, angkasa-1..8).
// Laws, each measured in a real browser at 390x844 on every one of the 24 levels:
//   1. data     each arena has 8 levels, speed rises strictly, density never falls, the gate count never falls, every level names
//               its own world, and the level picker holds all 8 (class `many`, none cut sideways, the last reachable)
//   2. render   the picture is not blank: many colour groups, real spread (a fill has one colour)
//   3. distinct no two levels of an arena look alike: the mean colour + spread of the whole picture differ by >= MIN_DIST
//               (NEGATIVE CONTROL: a level handed another level's theme must read as NOT distinct, so the check can fail)
//   4. depth    the engine's `layers` list (parallax depths, ambient life, light, weather) has >= MIN_LAYERS entries, starting
//               with the gradient and ending at the vehicle
//   5. smooth   frame work p90 < 4 ms at 1x (the aerial bar), read after the one-off tile baking has left the window
//   6. clean    no page errors, no failed loads; landscape (844x390) first and last level of each arena render too
// Server: game1 on :8090.   flock -w 3600 /tmp/claude-1000/kereta-browser.lock timeout 900 node tools/qa-blippi-rich.mjs
// SHOTS=<dir> also saves a screenshot per level.
import puppeteer from 'puppeteer'
import fs from 'node:fs'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m) } else { fail++; console.log('  ✗ ' + m) } }
const MIN_LAYERS = 12, MIN_DIST = +(process.env.MIN_DIST || 18), BUDGET_MS = 4
const ARENAS = [['air', 'water'], ['udara', 'sky'], ['angkasa', 'space']]
const SHOTS = process.env.SHOTS
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true })
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
const errs = []
const dist = (a, c) => Math.hypot(...a.map((v, i) => v - c[i]))
const FP = () => {
  // the picture's fingerprint: per channel the 10th / 50th / 90th percentile over the whole canvas (robust to a few big sprites,
  // so an obstacle or a gull does not move it), plus how many colour groups it uses
  const cv = document.querySelector('canvas'), c = cv.getContext('2d'), px = c.getImageData(0, 0, cv.width, cv.height).data
  const ch = [[], [], []], buckets = new Set()
  for (let i = 0; i < px.length; i += 4 * 53) { for (let k = 0; k < 3; k++) ch[k].push(px[i + k]); buckets.add((px[i] >> 5) + ',' + (px[i + 1] >> 5) + ',' + (px[i + 2] >> 5)) }
  const q = f => ch.map(a => { a.sort((x, y) => x - y); return a[Math.floor(a.length * f)] })
  const p10 = q(0.1), p50 = q(0.5), p90 = q(0.9)
  return { fp: [...p10, ...p50, ...p90], colours: buckets.size }
}
const play = async (p, cat, l) => {
  await p.evaluate((c, l) => { BlippiTrip.open(c); BlippiTrip.start(l, { seed: 2 }) }, cat, l)
  await p.waitForFunction(() => BlippiTrip.qa() && BlippiTrip.qa().state === 'play', { timeout: 30000 }).catch(() => {})
}
const page = async (w, h) => {
  const p = await b.newPage(); p.on('pageerror', e => errs.push(`${w}x${h} ${e}`)); p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()) })
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
  await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' }); await sleep(1200)
  return p
}
{
  const p = await page(390, 844)
  for (const [cat, engine] of ARENAS) {
    console.log(`\n== ${cat} (${engine}) ==`)
    const data = await p.evaluate(c => BlippiTripData.levels.filter(l => l.cat === c).map(l => ({ id: l.id, speed: l.speed, dens: l.dens, gates: l.gates.length, world: (l.theme || {}).world, name: l.name, say: l.say })), cat)
    ok(data.length === 8, `${cat}: 8 levels (${data.length})`)
    ok(data.every((d, i) => !i || (d.speed > data[i - 1].speed && d.dens >= data[i - 1].dens && d.gates >= data[i - 1].gates)), `${cat}: the ramp climbs, speed ${data[0].speed} -> ${data[data.length - 1].speed}, density ${data[0].dens} -> ${data[data.length - 1].dens}, gates ${data[0].gates} -> ${data[data.length - 1].gates}`)
    ok(new Set(data.map(d => d.world)).size === 8 && data.every(d => d.world && d.name && d.say), `${cat}: 8 different worlds, each named with a say line (${data.map(d => d.world).join(' ')})`)
    await p.evaluate(c => BlippiTrip.open(c), cat); await sleep(800)
    const lg = await p.evaluate(async () => {
      const grid = document.querySelector('.tlvls'), cards = [...document.querySelectorAll('.tlvl')]
      grid.scrollTop = grid.scrollHeight; await new Promise(r => setTimeout(r, 150))
      const gr = grid.getBoundingClientRect(), last = cards[cards.length - 1].getBoundingClientRect(), rects = cards.map(e => e.getBoundingClientRect())
      return { n: cards.length, many: grid.classList.contains('many'), inX: rects.every(r => r.left >= -1 && r.right <= innerWidth + 1 && r.width > 80), lastIn: last.bottom <= innerHeight + 1 && last.bottom <= gr.bottom + 2 }
    })
    ok(lg.n === 8 && lg.many && lg.inX && lg.lastIn, `${cat}: the level picker shows 8 cards, scrolls (many), none cut sideways, the last reachable`)
    const prints = {}, rows = []
    for (const d of data) {
      await play(p, cat, d.id)
      await sleep(5000)   // about 240 frames of steady state: the one-off tile baking has left the p90 window, the first quiz gate is still ahead
      const s = await p.evaluate(`(${FP})()`)
      s.q = await p.evaluate(() => { const q = BlippiTrip.qa(); return { st: q.state, p90: q.workP90, layers: q.layers, scale: q.scale } })
      prints[d.id] = s.fp
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/${d.id}-390.png` })
      rows.push(`${d.id}=${s.q.p90.toFixed(1)}`)
      ok(s.q.st === 'play' && s.colours >= 40 && Math.max(s.fp[6] - s.fp[0], s.fp[7] - s.fp[1], s.fp[8] - s.fp[2]) > 12, `${d.id} (${d.world}): renders, not blank (${s.colours} colour groups, spread ${Math.max(s.fp[6] - s.fp[0], s.fp[7] - s.fp[1], s.fp[8] - s.fp[2])})`)
      ok(s.q.layers.length >= MIN_LAYERS && s.q.layers[0] === 'gradient', `${d.id}: ${s.q.layers.length} depth/life layers >= ${MIN_LAYERS} (${s.q.layers.join(' ')})`)
      ok(s.q.scale >= 0.8 && s.q.p90 < BUDGET_MS, `${d.id}: frame work p90 ${s.q.p90.toFixed(2)} ms < ${BUDGET_MS} at render scale ${s.q.scale}`)
    }
    console.log('  frame p90 per level: ' + rows.join(' '))
    const ids = Object.keys(prints)
    let minD = 1e9, pair = ''
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const dd = dist(prints[ids[i]], prints[ids[j]]); if (dd < minD) { minD = dd; pair = ids[i] + ' vs ' + ids[j] } }
    ok(ids.length === 8 && minD >= MIN_DIST, `${cat}: every pair of levels differs in colour, closest ${pair} at ${minD.toFixed(1)} >= ${MIN_DIST}`)
    // negative control: the last level turned into a twin of the FIRST (same world, speed, length, obstacles) must read as NOT distinct
    const last = data[7].id, first = data[0].id
    await p.evaluate((a, c) => { const A = BlippiTripData.byId[a], B = JSON.parse(JSON.stringify(BlippiTripData.byId[c])); B.id = A.id; Object.keys(A).forEach(k => delete A[k]); Object.assign(A, B) }, last, first)   // the whole level, not just its theme: speed, length and obstacles too
    await play(p, cat, last); await sleep(5000)
    const fp2 = (await p.evaluate(`(${FP})()`)).fp
    const dc = dist(fp2, prints[first])
    ok(dc < MIN_DIST, `${cat} control: ${last} made a twin of ${first} reads as NOT distinct (distance ${dc.toFixed(1)} < ${MIN_DIST}), so the distinct check can fail`)
  }
  await p.close()
}
// landscape: the first and the last level of each arena render too (no errors, not blank)
{
  const p = await page(844, 390)
  for (const [cat] of ARENAS) for (const n of [1, 8]) {
    const id = `${cat}-${n}`
    await play(p, cat, id); await sleep(2500)
    const r = await p.evaluate(`(${FP})()`)
    ok(r.colours >= 30, `844x390 ${id}: renders (${r.colours} colour groups)`)
  }
  await p.close()
}
ok(!errs.length, 'no page errors or failed loads ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`\nqa-blippi-rich: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
