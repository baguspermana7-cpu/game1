// qa-blippi-aerial.mjs — BALAP PESAWAT (owner 2026-10-18): the 7th arena, an air race above the clouds.
// Checks: the arena grid stays aligned with 7 cards (2 rows from 641 px, the new card spanning two columns; one column on
// a phone, all on screen); each of the 4 worlds starts, its procedural ground map is fully generated (nothing pending),
// the picture really varies (sea + land, not a flat fill), the racers are the owner's 25 planes (fleet 'balap', each
// with straight / left / right banking poses) with 3 rivals, the frame
// work stays light (p90 < 4 ms at 1x), and no page errors / 404s.
// Server: game1 on :8090.   node tools/qa-blippi-aerial.mjs
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m) } else { fail++; console.log('  ✗ ' + m) } }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
const errs = []
for (const [w, h] of [[844, 390], [390, 844], [1280, 800]]) {
  const tag = w + 'x' + h
  const p = await b.newPage(); p.on('pageerror', e => errs.push(tag + ' ' + e)); p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()) })
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: w < 900 })
  await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' }); await sleep(1200)
  await p.evaluate(() => BlippiTrip.open()); await sleep(900)
  const g = await p.evaluate(() => [...document.querySelectorAll('.tcat')].map(e => { const r = e.getBoundingClientRect(); return { id: e.dataset.cat, t: Math.round(r.top), b: r.bottom, r: r.right, w: Math.round(r.width) } }))
  const rows = new Set(g.map(x => x.t)).size, wide = g.find(x => x.id === 'balap')
  ok(g.length === 7 && g.every(x => x.b <= h + 1 && x.r <= w + 1), `${tag}: 7 arena cards, all on screen`)
  if (w > 640) ok(rows === 2 && wide && Math.abs(wide.w - 2 * g[0].w) < 40, `${tag}: two aligned rows, BALAP PESAWAT spans two columns (${rows} rows, ${wide && wide.w} vs ${g[0].w})`)
  else ok(rows === 7, `${tag}: one column on a phone (${rows} rows)`)
  for (const l of w === 1280 ? ['balap-1', 'balap-2', 'balap-3', 'balap-4'] : ['balap-1']) {
    await p.evaluate(l => { BlippiTrip.open('balap'); BlippiTrip.start(l, { seed: 2 }) }, l)
    await p.waitForFunction(() => BlippiTrip.qa() && BlippiTrip.qa().state === 'play', { timeout: 30000 }).catch(() => {})
    await sleep(4500)
    const s = await p.evaluate(() => {
      const q = BlippiTrip.qa(), d = BlippiTrip.skins.aerial.debug(), cv = document.querySelector('canvas'), c = cv.getContext('2d')
      // colour spread of the ground band (below the HUD, away from the plane): a map has sea and land, a fill has one
      const px = c.getImageData(0, Math.round(cv.height * 0.2), cv.width, Math.round(cv.height * 0.3)).data, buckets = new Set()
      for (let i = 0; i < px.length; i += 4 * 97) buckets.add((px[i] >> 5) + ',' + (px[i + 1] >> 5) + ',' + (px[i + 2] >> 5))
      const me = BlippiTrip.ride('balap'), views = !!(me && me.item.views && BlippiTrip.img(me.key + '-left') && BlippiTrip.img(me.key + '-right'))
      return { st: q.state, p90: q.workP90, rivals: q.rivals, art: q.rivalArt, keys: q.rivalKeys, layers: q.layers, d, colours: buckets.size, me: me && me.item.id, views, n: window.BlippiFleet.balap.items.length, ph: !!window.BlippiFleet.balap.placeholder }
    })
    ok(s.st === 'play' && s.d && s.d.pending === 0, `${tag} ${l}: playing on a fully generated ground map (${s.d && s.d.world}, pending ${s.d && s.d.pending})`)
    ok(s.colours >= 12, `${tag} ${l}: the ground is a real map, ${s.colours} colour groups in the band`)
    ok(s.rivals === 3 && s.art && s.keys.every(k => k.indexOf('fl:balap/') === 0), `${tag} ${l}: 3 rival racers of the balap fleet, art loaded`)
    ok(s.layers.indexOf('ground-map') === 0 && s.layers.indexOf('wisps') > s.layers.indexOf('plane'), `${tag} ${l}: layers ground -> deck -> plane -> wisps`)
    ok(s.n === 25 && !s.ph && s.views, `${tag} ${l}: the owner's 25 planes, ${s.me} flies with its left / right banking poses loaded`)
    ok(s.p90 < 4, `${tag} ${l}: frame work p90 ${s.p90} ms < 4`)
  }
  await p.close()
}
ok(!errs.length, 'no page errors or 404s ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`\nqa-blippi-aerial: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
