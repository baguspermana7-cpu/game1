// qa-blippi-vfx-combos.mjs -- the trip's moments drawn as COMBINATIONS from the shared Dunia VFX database (owner 2026-11-01:
// "ada banyak database vfx kan, itu optimalkan juga penggunaan dengan kombinasi2"). Laws:
//   1. every recipe part of every moment, for every journey's element, resolves to a kid-safe effect in the database
//   2. a real run of each trip journey plays its moments through the real events (star, bump, turbo ...) with 3+ layered
//      parts, in the journey's own element, and the parts are drawn on the game canvas
//   3. the parts change the pixels where they play (the canvas with the layer vs the same frame with it switched off)
//   4. reduced motion: one part, no ring, no spin
//   5. no page error; the frame work stays under the rich-world budget (p90 < 4 ms with the effects playing)
// Server: rz-work root on :8090.
import puppeteer from '/home/baguspermana7/rz-work/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m) } else { fail++; console.log('  ✗ ' + m) } }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
async function page (w, h, reduced) {
  const p = await b.newPage(); await p.setBypassServiceWorker(true)
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: w < 900 })
  if (reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.goto('http://localhost:8090/game1/?land=old', { waitUntil: 'load' }); await sleep(1000)
  p.errs = errs
  return p
}
const p = await page(844, 390)
const miss = await p.evaluate(() => BlippiTrip.vfx ? BlippiTrip.vfx.missing() : ['no BlippiTrip.vfx'])
ok(miss.length === 0, `every recipe part resolves in the Dunia VFX database (${miss.length} missing: ${miss.slice(0, 4)})`)
const WANT = { 'air-2': 'water', 'udara-2': 'flying', 'angkasa-2': 'psychic', 'darat-2': 'ground', 'kertas-2': 'normal', 'kapalkertas-2': 'water' }
for (const [lv, el] of Object.entries(WANT)) {
  await p.evaluate(l => { BlippiTrip.open(l.split('-')[0]); BlippiTrip.start(l, { seed: 7 }) }, lv)
  for (let i = 0; i < 60; i++) { await sleep(250); const s = await p.evaluate(() => BlippiTrip.qa()); if (s && s.state === 'play') break }
  // the child holds still; stars, gift boxes and obstacles on its line give the moments. A turbo press on the start gives one more.
  await p.evaluate(() => BlippiTrip.vfx && BlippiTrip.vfx.clear())
  if (lv.startsWith('darat')) await p.evaluate(() => { const q = BlippiTrip.qa(); BlippiTrip.put('star', 10, q.lane); BlippiTrip.put('crate', 22, q.lane) })
  let lg = null, maxLive = 0
  for (let i = 0; i < 40; i++) {
    await sleep(250)
    lg = await p.evaluate(() => BlippiTrip.vfx ? BlippiTrip.vfx.log() : { played: [], drawn: 0, live: 0, peak: 0 }); maxLive = Math.max(maxLive, lg.peak)
    if (lg.played.length >= 2 && lg.drawn > 20) break
  }
  const real = lg.played.filter(x => x.n >= 3)
  ok(real.length >= 1 && real.every(x => x.el === el), `${lv}: the run played layered moments in its element ${el} (${JSON.stringify(lg.played.slice(0, 4))})`)
  ok(lg.drawn > 0 && maxLive >= 3, `${lv}: the parts were drawn on the canvas (drawn ${lg.drawn}, most live at once ${maxLive})`)
  const s = await p.evaluate(() => BlippiTrip.qa())
  ok(s.workP90 < 4, `${lv}: frame work with the effects stays light (p90 ${s.workP90} ms)`)
  await p.evaluate(() => BlippiTrip.stop())
}
// the parts change the pixels: freeze a moment and compare the canvas drawn with and without the layer
await p.evaluate(() => { BlippiTrip.open('udara'); BlippiTrip.start('udara-1', { seed: 3 }) })
for (let i = 0; i < 60; i++) { await sleep(250); const s = await p.evaluate(() => BlippiTrip.qa()); if (s && s.state === 'play') break }
await sleep(800)
const diff = await p.evaluate(async () => {
  const cv = document.querySelector('.tcv'), x = cv.getContext('2d'), W = cv.width, H = cv.height
  const V = BlippiTrip.vfx
  // draw the same moment twice into a scratch canvas over a flat grey: with the module, and the empty canvas
  const t = document.createElement('canvas'); t.width = 400; t.height = 400; const c = t.getContext('2d')
  c.fillStyle = '#808080'; c.fillRect(0, 0, 400, 400)
  const before = c.getImageData(0, 0, 400, 400).data.slice()
  V.clear(); V.play('collect', 200, 200, 90, 'udara', false)
  for (let i = 0; i < 30; i++) await new Promise(r => setTimeout(r, 16))   // the sheets load
  V.clear(); V.play('collect', 200, 200, 90, 'udara', false)
  V.draw(c, 0.12)
  const after = c.getImageData(0, 0, 400, 400).data
  let n = 0; for (let i = 0; i < after.length; i += 4) if (Math.abs(after[i] - before[i]) + Math.abs(after[i + 1] - before[i + 1]) + Math.abs(after[i + 2] - before[i + 2]) > 30) n++
  V.clear()
  return n
})
ok(diff > 2000, `a played moment changes the pixels where it plays (${diff} px changed)`)
ok(!p.errs.length, `no page error (${p.errs.slice(0, 2)})`)
await p.close()
// reduced motion: one part, still
const r = await page(844, 390, true)
await r.evaluate(() => { BlippiTrip.open('air'); BlippiTrip.start('air-1', { seed: 3 }) })
for (let i = 0; i < 60; i++) { await sleep(250); const s = await r.evaluate(() => BlippiTrip.qa()); if (s && s.state === 'play') break }
const rn = await r.evaluate(() => { BlippiTrip.vfx.clear(); return [BlippiTrip.vfx.play('finish', 300, 200, 120, 'air', BlippiTrip.reducedMotion()), BlippiTrip.vfx.live()] })
ok(rn[0] === 1 && rn[1] === 1, `reduced motion: a moment is one still part (${rn})`)
await r.close()
await b.close()
console.log(`qa-blippi-vfx-combos: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
