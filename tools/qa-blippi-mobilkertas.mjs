// qa-blippi-mobilkertas.mjs -- MOBIL KERTAS (owner 2026-10-19): the 8th arena, the owner's 25 origami cars on the land
// engine. Checks: the arena card and its 8 levels; the ride picker lists the 25 paper cars; a level runs with the child's
// paper car (its own fleet sheet, not the DARAT pack), three lanes that answer the arrows, the road drawn; no errors.
// Server: rz-work root on :8090.   node tools/qa-blippi-mobilkertas.mjs
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m) } else { fail++; console.log('  ✗ ' + m) } }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
const errs = []
for (const [w, h] of [[390, 844], [1280, 800]]) {
  const tag = w + 'x' + h
  const p = await b.newPage(); await p.setBypassServiceWorker(true)
  p.on('pageerror', e => errs.push(tag + ' ' + e)); p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()) })
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: w < 900 })
  await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' }); await sleep(1200)
  await p.evaluate(() => BlippiTrip.open()); await sleep(800)
  const cat = await p.evaluate(() => { const e = document.querySelector('.tcat[data-cat="mobilkertas"]'); if (!e) return null; const im = e.querySelector('img'); return { txt: e.textContent, img: im ? im.complete && im.naturalWidth > 0 : false } })
  ok(cat && /MOBIL KERTAS/.test(cat.txt) && cat.img, `${tag}: the MOBIL KERTAS arena card shows its paper-car picture`)
  await p.evaluate(() => BlippiTrip.open('mobilkertas')); await sleep(700)
  const lv = await p.evaluate(() => [...document.querySelectorAll('.tlvl')].map(e => e.textContent.trim().slice(0, 30)))
  ok(lv.length === 8, `${tag}: 8 levels (${lv.length})`)
  const fl = await p.evaluate(() => { const f = BlippiFleet.mobilkertas; return { n: f.items.length, dir: f.dir || null, me: BlippiTrip.ride('mobilkertas') } })
  ok(fl.n === 25 && !fl.dir && fl.me && /^fl:mobilkertas\//.test(fl.me.key), `${tag}: the fleet is the owner's 25 origami cars (own files), default ride ${fl.me && fl.me.item.id}`)
  await p.evaluate(() => BlippiTrip.start('mobilkertas-1', { seed: 3 })); await sleep(5500)
  const run = await p.evaluate(() => { const q = BlippiTrip.qa(); return q ? { state: q.state, lane: q.lane, arrows: document.querySelectorAll('.tarrows button').length } : null })
  ok(run && run.state === 'play' && run.lane != null && run.arrows >= 2, `${tag}: a level runs on the land engine, three lanes, the lane arrows shown (${JSON.stringify(run)})`)
  // a lane press moves the car (the arrows are real buttons)
  const lanes = await p.evaluate(async () => { const l0 = BlippiTrip.qa().lane, bs = document.querySelectorAll('.tarrows button'), btn = l0 < 2 ? bs[bs.length - 1] : bs[0]; btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await new Promise(z => setTimeout(z, 400)); return [l0, BlippiTrip.qa().lane] })
  ok(lanes[0] !== lanes[1], `${tag}: the lane arrow moves the paper car (lane ${lanes[0]} -> ${lanes[1]})`)
  // the ride sheet decoded: the paper car is drawn from its own sheet
  const sheet = await p.evaluate(() => { const k = BlippiTrip.ride('mobilkertas').key, im = BlippiTrip.img && BlippiTrip.img(k); return { k, ok: !!(im && (im.width || im.naturalWidth)) } })
  ok(sheet.ok, `${tag}: the paper car's own frame sheet is loaded (${sheet.k})`)
  await p.screenshot({ path: (process.env.SHOT_DIR || '/tmp') + `/mobilkertas-${tag}.png` })
  await p.close()
}
ok(!errs.length, `no page errors or 404s ${errs.slice(0, 3).join(' | ')}`)
await b.close()
console.log(`\nqa-blippi-mobilkertas: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
