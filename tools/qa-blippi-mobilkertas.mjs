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
for (const [w, h] of [[412, 915], [390, 844], [844, 390], [1280, 800]]) {
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
  // owner 2026-10-20 (phone screenshot): the 8 cards were squeezed over each other and over the MOBILMU bar, no scroll.
  // Every card keeps its height, none overlaps another or the ride bar, and the last one is reachable by scrolling.
  const lay = await p.evaluate(async () => {
    const grid = document.querySelector('.tlvls'), cards = [...document.querySelectorAll('.tlvl')], bar = document.querySelector('.tcbar')
    const R = e => e.getBoundingClientRect(), ov = (a, b) => Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) * Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
    let overlap = 0; const rs = cards.map(R)
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) overlap += ov(rs[i], rs[j])
    const br = bar ? R(bar) : null; let barHit = 0; if (br) rs.forEach(r => { barHit += ov(r, br) })
    grid.scrollTop = grid.scrollHeight; await new Promise(z => setTimeout(z, 150))
    const last = R(cards[cards.length - 1]), gr = R(grid)
    return { minH: Math.round(Math.min(...rs.map(r => r.height))), overlap: Math.round(overlap), barHit: Math.round(barHit), lastIn: last.bottom <= gr.bottom + 2 && last.bottom <= innerHeight + 1 }
  })
  ok(lay.minH >= 80 && lay.overlap === 0 && lay.barHit === 0 && lay.lastIn, `${tag}: level cards stand apart, clear of the MOBILMU bar, the last reachable by scrolling (${JSON.stringify(lay)})`)
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
