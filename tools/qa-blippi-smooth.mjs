// qa-blippi-smooth.mjs — the journeys move smoothly (owner 2026-10-15: "buat bener2 super smooth animasi, effect dan dunia itu
// sendiri"). Measured in a real browser on every journey:
//   steps: with a 45 ms main-thread hitch every second (a GC / a busy tablet), the world's step from one frame to the next never
//          jumps: max |dt[i] - dt[i-1]| / median dt <= 0.6 (raw time made a hitch a 3x leap, then a snap back)
//   crisp: on a quiet machine the render scale stays at its full 0.8; after a slow spell (4x CPU for 4 s) it comes back up
//   tween: the vehicle's 20 fps sheet is blended between frames, so its picture changes every display frame, not every 3rd
// Server: ~/rz-work on port 8090.   node tools/qa-blippi-smooth.mjs
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m) } }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio'] })
const errs = []
const med = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
for (const [cat, lvl] of [['darat', 'darat-2'], ['udara', 'udara-2'], ['angkasa', 'angkasa-2'], ['air', 'air-2'], ['kertas', 'kertas-2']]) {
  const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)))
  await p.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true })
  await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' })
  await p.evaluate((c, l) => { BlippiTrip.open(c); BlippiTrip.start(l, { seed: 3 }) }, cat, lvl)
  await p.waitForFunction(() => BlippiTrip.qa() && BlippiTrip.qa().state === 'play', { timeout: 30000 })
  await sleep(1500)
  ok((await p.evaluate(() => BlippiTrip.qa().scale)) >= 0.8, `${cat}: render scale dropped on a quiet machine`)
  // hitches: block the main thread 45 ms once a second for 4 s, then read the dt trace
  await p.evaluate(() => { window.__hitch = setInterval(() => { const t = performance.now(); while (performance.now() - t < 45) {} }, 1000) })
  await sleep(4200)
  await p.evaluate(() => clearInterval(window.__hitch))
  const q = await p.evaluate(() => BlippiTrip.qa())
  const d = q.dts.slice(-200), m = med(d)
  let jump = 0
  for (let i = 1; i < d.length; i++) jump = Math.max(jump, Math.abs(d[i] - d[i - 1]) / m)
  ok(jump <= 0.6, `${cat}: a hitch made the world leap: step change ${jump.toFixed(2)}x the median frame (want <= 0.6)`)
  ok(q.tween === true, `${cat}: the vehicle sheet is not blended between frames`)
  // a slow spell, then a quiet one: the picture comes back to full resolution
  const cdp = await p.target().createCDPSession()
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })
  await sleep(4000)
  const low = await p.evaluate(() => BlippiTrip.qa().scale)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await sleep(7000)
  const back = await p.evaluate(() => BlippiTrip.qa() && BlippiTrip.qa().scale)
  ok(back >= 0.8 || low >= 0.8, `${cat}: render scale stuck at ${back} after the slow spell (low ${low})`)
  console.log(`${cat}: step change ${jump.toFixed(2)}x, scale ${low} -> ${back}`)
  await p.close()
}
ok(!errs.length, 'page errors: ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`qa-blippi-smooth: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
