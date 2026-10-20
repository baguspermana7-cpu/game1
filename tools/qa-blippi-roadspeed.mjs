// qa-blippi-roadspeed.mjs -- the road races' pace (owner 2026-10-20: "too slow; at least 80 % of the Mojo race at the
// start, gradually 90 % by the end"). The road's flow past the vehicle (speed / perspective depth) is compared with the
// Mojo chase's (4760 u/s over 1250 u = 3.81 /s): ~0.80 just after the start, ~0.90 near the end (per unit of the turbo
// multiplier). At that pace an obstacle put in the child's lane still BUMPS (swept hit test), one in another lane does
// not, and a star in the lane is collected. DARAT + MOBIL KERTAS, first and last level. Server: rz-work root on :8090.
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m) } else { fail++; console.log('  ✗ ' + m) } }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
const errs = []
const p = await b.newPage(); await p.setBypassServiceWorker(true)
p.on('pageerror', e => errs.push(String(e)))
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' }); await sleep(1200)
const q = () => p.evaluate(() => { const s = BlippiTrip.qa(); return s && { state: s.state, lane: s.lane, bumps: s.bumps, stars: s.stars, mul: s.mul, progress: s.progress, flow: BlippiTrip.flow() } })
async function play () { for (let i = 0; i < 60; i++) { const s = await q(); if (s && s.state === 'play') return s; await sleep(150) } return q() }
for (const lv of ['darat-1', 'darat-4', 'mobilkertas-1', 'mobilkertas-8']) {
  await p.evaluate(l => { BlippiTrip.open(l.split('-')[0]); BlippiTrip.start(l, { seed: 5 }) }, lv)
  let s = await play(); await sleep(1500); s = await q()
  const f0 = s.flow / s.mul
  ok(f0 > 0.76 && f0 < 0.86, `${lv}: the road flows at ${(f0 * 100).toFixed(0)} % of the Mojo race just after the start (mul ${s.mul.toFixed(2)})`)
  // swept hit test at speed: an obstacle in the lane bumps, one in the next lane does not, a star in the lane is taken
  const ln = s.lane, other = ln === 1 ? 0 : 1
  // the item's own state: 1 = bumped into, 2 = collected / passed, 0 = still ahead
  await p.evaluate((ln) => { window.__c = BlippiTrip.put('crate', 14, ln) }, ln); await sleep(1600)
  let st = await p.evaluate(() => window.__c.st)
  ok(st === 1, `${lv}: a crate put in the child's lane at this pace bumps (state ${st})`)
  await sleep(1800)
  await p.evaluate((o) => { window.__c = BlippiTrip.put('crate', 14, o) }, other); await sleep(1600)
  st = await p.evaluate(() => window.__c.st)
  ok(st !== 1, `${lv}: a crate in another lane passes by (state ${st})`)
  await p.evaluate((ln) => { window.__c = BlippiTrip.put('star', 14, ln) }, ln); await sleep(1600)
  st = await p.evaluate(() => window.__c.st)
  ok(st === 2, `${lv}: a star in the lane is collected at this pace (state ${st})`)
  await p.evaluate(() => BlippiTrip.qaSeek(0.93)); await sleep(500)
  // a question gate on the way: answer it right, then look at the road
  for (let i = 0; i < 12; i++) { const z = await p.evaluate(() => BlippiTrip.qa()); if (!z.quiz) { if (z.state === 'play') break; await sleep(250); continue } await p.evaluate(ix => BlippiTrip.answer(ix), z.quiz.answerIdx); await sleep(900); await p.evaluate(() => BlippiTrip.resumeFromQuiz && BlippiTrip.resumeFromQuiz()); await sleep(600) }
  await sleep(500); s = await q()
  if (s.state === 'play' || s.state === 'finishing') { const f1 = s.flow / s.mul; ok(f1 > 0.86 && f1 < 0.95, `${lv}: near the end it flows at ${(f1 * 100).toFixed(0)} % of the Mojo race`) }
  else ok(false, `${lv}: near the end the run is still racing (${s.state})`)
  await p.evaluate(() => BlippiTrip.stop && BlippiTrip.stop()); await sleep(400)
}
ok(!errs.length, `no page errors ${errs.slice(0, 2).join(' | ')}`)
await b.close()
console.log(`\nqa-blippi-roadspeed: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
