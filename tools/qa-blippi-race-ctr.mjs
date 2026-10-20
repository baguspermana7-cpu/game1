// qa-blippi-race-ctr.mjs — the road journey races like CTR (owner 2026-10-14: "balapannya sangat kurang seru, reverse
// engineering game CTR dan adopt mechanical smoothnya"). Real input (touch taps on the TURBO button) on the real game:
//   start lights: 3-2-1-GO, a press in the last 0.45 s is a start turbo, an early press is not
//   corners: every road level has authored corners with no obstacle inside; in a corner the meter runs and a press in the
//            red is a turbo whose level climbs 1 -> 2 -> 3 (speed cap rises each time); a press in the green gives none
//   jumps: ramps across the road, the vehicle is airborne over the obstacles behind (no bump) and lands with a turbo
//   rivals: three rivals, the child starts last, positions change, the result names the place
// The same meter, rivals and place on the other journeys (owner: the CTR feel everywhere): UDARA (tail-wind streams, three
// aircraft), AIR (fast currents, three boats), LUAR ANGKASA (warp lanes, three space craft); the TURBO button stays in the run.
// Server: ~/rz-work on port 8090.   node tools/qa-blippi-race-ctr.mjs
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m) } }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio'] })
const errs = []
const page = async (w, h) => { const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e))); await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true }); await p.goto('http://localhost:8090/game1/?land=old', { waitUntil: 'load' }); return p }
const q = p => p.evaluate(() => BlippiTrip.qa())
const tapTurbo = async p => { const bb = await (await p.$('[data-act=turbo]')).boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2) }
const answerIfQuiz = async p => { const s = await q(p); if (s && s.state === 'quiz' && s.quiz) { await p.evaluate(i => document.querySelector('[data-ans="' + i + '"]').click(), s.quiz.answerIdx); await sleep(2600); return true } return false }

// structure over all road levels and several seeds
{
  const p = await page(844, 390)
  for (const id of ['darat-1', 'darat-2', 'darat-3', 'darat-4']) for (const seed of [1, 2, 3]) {
    await p.evaluate((id, seed) => { BlippiTrip.open('darat'); BlippiTrip.start(id, { seed }) }, id, seed)
    await p.waitForFunction(() => BlippiTrip.qa() && BlippiTrip.qa().state === 'count', { timeout: 30000 })
    const s = await q(p)
    ok(s.corners >= 2, `${id}/${seed}: ${s.corners} drift corners (need >= 2)`)
    ok(s.cornerObs === 0, `${id}/${seed}: ${s.cornerObs} obstacles inside a corner`)
    ok(s.ramps >= 1, `${id}/${seed}: no jump ramp`)
    ok(s.giftBoxes >= 2, `${id}/${seed}: ${s.giftBoxes} gift boxes (need >= 2)`)
    ok(s.obsN >= 4, `${id}/${seed}: only ${s.obsN} obstacles on the whole journey`)
    ok(s.rivals === 3 && s.pos === 4, `${id}/${seed}: ${s.rivals} rivals, starts at ${s.pos} (want 3 rivals, last place)`)
    ok(s.rivalArt, `${id}/${seed}: a rival's art did not load`)
  }
  for (const cat of ['udara', 'air', 'angkasa', 'kertas']) for (const n of [1, 2, 3, 4]) for (const seed of [1, 2]) {
    const id = cat + '-' + n
    await p.evaluate((cat, id, seed) => { BlippiTrip.open(cat); BlippiTrip.start(id, { seed }) }, cat, id, seed)
    await p.waitForFunction(() => BlippiTrip.qa() && BlippiTrip.qa().state === 'count', { timeout: 30000 })
    const s = await q(p)
    ok(s.corners >= 2, `${id}/${seed}: ${s.corners} turbo zones (need >= 2)`)
    ok(s.cornerObs === 0, `${id}/${seed}: ${s.cornerObs} obstacles inside a turbo zone`)
    ok(s.rivals === 3 && s.pos === 4, `${id}/${seed}: ${s.rivals} rivals, starts at ${s.pos} (want 3 rivals, last place)`)
    ok(s.rivalArt, `${id}/${seed}: a rival's art did not load`)
    ok(s.giftBoxes >= 2, `${id}/${seed}: ${s.giftBoxes} gift boxes (need >= 2)`)
    ok(s.obsN >= 4, `${id}/${seed}: only ${s.obsN} obstacles on the whole journey`)
  }
  await p.close()
}
// start lights
for (const [label, delay, want] of [['in time', 1950, true], ['too early', 900, false]]) {
  const p = await page(844, 390)
  await p.evaluate(() => { BlippiTrip.open('darat'); BlippiTrip.start('darat-1', { seed: 4 }) })
  await p.waitForFunction(() => { const e = document.querySelector('.tcount'); return e && e.textContent === '3' }, { timeout: 30000 })
  const t0 = Date.now()
  ok(await p.evaluate(() => BlippiTrip.qa().state) === 'count', 'no countdown before the run')
  await sleep(Math.max(0, delay - (Date.now() - t0)))
  await tapTurbo(p)
  await p.waitForFunction(() => BlippiTrip.qa().state === 'play', { timeout: 10000 })
  await sleep(120)
  const s = await q(p)
  ok((s.turboN > 0) === want, `start press ${label}: start turbo ${s.turboN > 0 ? 'given' : 'not given'}`)
  await p.close()
}
// meter turbos climb 1 -> 2 -> 3; green press gives nothing; rivals overtaken; result place; on the road also the jump
async function race (cat, id, seed) {
  const p = await page(844, 390)
  await p.evaluate((cat, id, seed) => { BlippiTrip.open(cat); BlippiTrip.start(id, { seed }) }, cat, id, seed)
  await p.waitForFunction(() => BlippiTrip.qa() && BlippiTrip.qa().state === 'play', { timeout: 30000 })
  let fires = [], greenTested = false, greenOk = null, greenWhy = "", sawAir = false, bumpsAtAir = -1, airTurbo = false, posSeen = new Set(), capMax = 0, gone = false, teachSeen = false, teachAfter = false, stretch = false, last = null, shieldSeen = false, magnetSeen = false
  const t0 = Date.now()
  while (Date.now() - t0 < 150000) {
    if (await answerIfQuiz(p)) continue
    const s = await q(p)
    if (!s || s.state === 'done') break
    posSeen.add(s.pos)
    capMax = Math.max(capMax, s.mulNow)
    if (s.state === 'play' && s.turboGone) gone = true
    if (s.teach && s.meterN > 0) teachAfter = true
    if (s.stretch) stretch = true
    if (s.shieldT > 0) shieldSeen = true
    if (s.magnetT > 0) magnetSeen = true
    last = s
    if (s.air && !sawAir) { sawAir = true; bumpsAtAir = s.bumps }
    if (sawAir && !s.air && bumpsAtAir >= 0 && !airTurbo) { await sleep(150); const s2 = await q(p); airTurbo = s2.reserves > 0; ok(s2.bumps === bumpsAtAir, `jump: bumped an obstacle while airborne (${bumpsAtAir} -> ${s2.bumps})`) }
    const d = s.drift
    if (d && d.on && !d.spent) {
      if (!greenTested && !d.red && d.meter > 0.15 && d.meter < 0.4) {
        greenTested = true; await tapTurbo(p); await sleep(60)
        const s2 = await q(p); greenWhy = JSON.stringify([d, s2.drift, s2.state]); greenOk = s2.drift.idx === d.idx && s2.drift.boosts === d.boosts && s2.drift.tries === d.tries + 1
      } else if (d.red) {
        if (!s.meterN && !teachSeen) { await sleep(80); teachSeen = (await q(p)).teach }
        const n0 = s.turboN; await tapTurbo(p); await sleep(60)
        const s2 = await q(p); if (s2.turboN > n0) fires.push(s2.fire)
      }
      await sleep(25)
    } else await sleep(60)
    if (s.progress > 0.999) break
  }
  ok(!gone, `${id}: the TURBO button left the run`)
  ok(teachSeen, `${id}: no TEKAN! hint on the first red meter`)
  ok(!teachAfter, `${id}: the TEKAN! hint stayed after the first meter turbo`)
  ok(stretch, `${id}: Blippi never called the last stretch`)
  // the child holds still (no steering), so it drives through every gift box placed on its line
  ok(last && last.gifts.length >= 2 && shieldSeen && magnetSeen, `${id}: gift boxes opened ${JSON.stringify(last && last.gifts)}, shield ${shieldSeen}, magnet ${magnetSeen}`)
  ok(greenOk === true, `${id}: a press in the green gave a turbo or did not empty the meter (${greenOk} ${greenWhy})`)
  ok(fires.includes(1) && fires.includes(2), `${id}: meter turbos did not climb in level: ${JSON.stringify(fires)}`)
  ok(capMax > 1.45, `${id}: speed never rose past the plain cap on stacked turbos (max ${capMax.toFixed(2)})`)
  if (cat === 'darat') {
    ok(sawAir, 'never airborne on a jump ramp')
    ok(airTurbo, 'no turbo on landing (hang time)')
  }
  ok(posSeen.size >= 2, `${id}: the race position never changed: ${[...posSeen]}`)
  for (let i = 0; i < 60 && !(await p.$('[data-trip=result]')); i++) await sleep(250)
  const place = await p.evaluate(() => { const e = document.querySelector('[data-place]'); return e ? +e.getAttribute('data-place') : 0 })
  ok(place >= 1 && place <= 4, `${id}: result names no place (${place})`)
  // the chips' pictures decode a moment after the card appears: give them up to 3 s before counting
  for (let i = 0; i < 30 && !(await p.evaluate(() => [...document.querySelectorAll('.tstand li img')].every(i => i.complete && i.naturalWidth > 0))); i++) await sleep(100)
  const st = await p.evaluate(() => { const li = [...document.querySelectorAll('.tstand li')]; return { n: li.length, me: li.findIndex(e => e.classList.contains('me')) + 1, pics: li.filter(e => { const i = e.querySelector('img'); return i ? i.complete && i.naturalWidth > 0 : !!e.querySelector('.tanim') }).length } })
  ok(st.n === 4 && st.me === place && st.pics === 4, `${id}: finishing order ${JSON.stringify(st)} (want 4 chips with art, KAMU at ${place})`)
  await p.screenshot({ path: '/tmp/claude-1000/qa-ctr-result-' + id + '.png' })
  await p.close()
}
// sky and paper open on the ground (runway / festival stage) and arrive somewhere (destination runway / bullseye),
// like the space journey's launch pad and planet: count the scene's own fill colour on the canvas at both ends
async function ends (cat, id, cols) {
  const p = await page(844, 390)
  await p.evaluate((cat, id) => { BlippiTrip.open(cat); BlippiTrip.start(id, { seed: 3 }) }, cat, id)
  await p.waitForFunction(() => BlippiTrip.qa() && BlippiTrip.qa().state === 'play', { timeout: 30000 })
  const count = () => p.evaluate(cols => {
    const cv = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0]
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 16) if (cols.some(c => Math.abs(d[i] - c[0]) < 6 && Math.abs(d[i + 1] - c[1]) < 6 && Math.abs(d[i + 2] - c[2]) < 6)) n++
    return n / (d.length / 16)
  }, cols)
  const open = await count()
  await p.evaluate(() => BlippiTrip.qaSeek(0.5)); await sleep(300)
  const mid = await count()
  await p.evaluate(() => BlippiTrip.qaSeek(0.985)); await sleep(300)
  const end = await count()
  ok(open > 0.03, `${id}: the opening scene is not on screen (${(open * 100).toFixed(1)}% of the canvas)`)
  ok(mid < 0.005, `${id}: the opening or arrival scene shows mid-race (${(mid * 100).toFixed(1)}%)`)
  ok(end > 0.03, `${id}: the arrival scene is not on screen (${(end * 100).toFixed(1)}%)`)
  console.log(`${id} ends: open ${(open * 100).toFixed(1)}%, mid ${(mid * 100).toFixed(1)}%, end ${(end * 100).toFixed(1)}%`)
  await p.close()
}
await ends('udara', 'udara-2', [[0x5E, 0x68, 0x78], [0x8C, 0xCB, 0x72]])
await ends('kertas', 'kertas-2', [[0xC9, 0x8B, 0x4E], [0xE2, 0x46, 0x3F]])
await race('darat', 'darat-2', 7)
await race('udara', 'udara-2', 7)
await race('air', 'air-2', 7)
await race('angkasa', 'angkasa-2', 7)
await race('kertas', 'kertas-2', 7)
ok(!errs.length, 'page errors: ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`qa-blippi-race-ctr: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
