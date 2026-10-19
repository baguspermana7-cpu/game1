// qa-blippi-aerial.mjs — BALAP PESAWAT (owner 2026-10-18): the 7th arena, an air race above the clouds.
// 2026-10-19: 12 levels (8 new worlds: terraces + volcano, autumn farmland, red canyon, atoll, jungle, fjord, big city, night city);
// the level picker holds all 12, every world is distinct (mean colour / spread differ, with a negative control), the ramp climbs.
// Checks: the arena grid stays aligned with 7 cards (2 rows from 641 px, the new card spanning two columns; one column on
// a phone, all on screen); each of the 12 worlds (balap-1..12) starts, its procedural ground map is fully generated (nothing pending),
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
const LVLS = Array.from({ length: 12 }, (_, i) => 'balap-' + (i + 1)), prints = {}, worlds = {}, p90s = {}, MIN_DIST = 12
for (const [w, h] of [[844, 390], [390, 844], [1280, 800]]) {
  const tag = w + 'x' + h
  const p = await b.newPage(); p.on('pageerror', e => errs.push(tag + ' ' + e)); p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()) })
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: w < 900 })
  await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' }); await sleep(1200)
  await p.evaluate(() => BlippiTrip.open()); await sleep(900)
  const g = await p.evaluate(() => [...document.querySelectorAll('.tcat')].map(e => { const r = e.getBoundingClientRect(); return { id: e.dataset.cat, t: Math.round(r.top), b: r.bottom, r: r.right, w: Math.round(r.width) } }))
  const rows = new Set(g.map(x => x.t)).size, wide = g.find(x => x.id === 'balap')
  // 8 arenas since MOBIL KERTAS (2026-10-19): two full rows of four, every card the same width; a phone scrolls one column
  ok(g.length === 8 && g.every(x => x.r <= w + 1) && (w <= 640 || g.every(x => x.b <= h + 1)), `${tag}: 8 arena cards, ${w > 640 ? 'all on screen' : 'none cut sideways'}`)
  if (w > 640) ok(rows === 2 && wide && Math.abs(wide.w - g[0].w) < 4, `${tag}: two aligned rows of four, equal cards (${rows} rows, ${wide && wide.w} vs ${g[0].w})`)
  else ok(rows === 8, `${tag}: one column on a phone (${rows} rows)`)
  // the level picker with 12 levels: every card on the grid, nothing cut off sideways, the last card reachable by scrolling
  await p.evaluate(() => BlippiTrip.open('balap')); await sleep(700)
  const lg = await p.evaluate(async () => {
    const grid = document.querySelector('.tlvls'), cards = [...document.querySelectorAll('.tlvl')]
    grid.scrollTop = grid.scrollHeight; await new Promise(r => setTimeout(r, 150))
    const gr = grid.getBoundingClientRect(), last = cards[cards.length - 1].getBoundingClientRect()
    const rects = cards.map(e => e.getBoundingClientRect())
    return { n: cards.length, many: grid.classList.contains('many'), inX: rects.every(r => r.left >= -1 && r.right <= innerWidth + 1 && r.width > 80), lastIn: last.bottom <= innerHeight + 1 && last.bottom <= gr.bottom + 2, cols: new Set(rects.map(r => Math.round(r.left))).size, scrolls: grid.scrollHeight > grid.clientHeight + 2 }
  })
  ok(lg.n === 12 && lg.many && lg.inX && lg.lastIn, `${tag}: level picker shows 12 levels, ${lg.cols} column(s), none cut sideways, the last reachable (scrolls ${lg.scrolls})`)
  const list = w === 390 ? LVLS : w === 1280 ? ['balap-1', 'balap-4', 'balap-8', 'balap-12'] : ['balap-1', 'balap-12']
  for (const l of list) {
    await p.evaluate(l => { BlippiTrip.open('balap'); BlippiTrip.start(l, { seed: 2 }) }, l)
    await p.waitForFunction(() => BlippiTrip.qa() && BlippiTrip.qa().state === 'play', { timeout: 30000 }).catch(() => {})
    await sleep(4500)
    const s = await p.evaluate(() => {
      const q = BlippiTrip.qa(), d = BlippiTrip.skins.aerial.debug(), cv = document.querySelector('canvas'), c = cv.getContext('2d')
      // colour spread of the ground band (below the HUD, away from the plane): a map has sea and land, a fill has one
      const px = c.getImageData(0, Math.round(cv.height * 0.2), cv.width, Math.round(cv.height * 0.3)).data, buckets = new Set()
      for (let i = 0; i < px.length; i += 4 * 97) buckets.add((px[i] >> 5) + ',' + (px[i + 1] >> 5) + ',' + (px[i + 2] >> 5))
      // the world's fingerprint: mean and spread of R, G, B over the band
      const n = px.length / 4 / 7, m = [0, 0, 0], q2 = [0, 0, 0]
      for (let i = 0; i < px.length; i += 28) for (let k = 0; k < 3; k++) { m[k] += px[i + k]; q2[k] += px[i + k] * px[i + k] }
      const fp = [...m.map(v => v / n), ...q2.map((v, k) => Math.sqrt(Math.max(0, v / n - (m[k] / n) ** 2)))]
      const me = BlippiTrip.ride('balap'), views = !!(me && me.item.views && BlippiTrip.img(me.key + '-left') && BlippiTrip.img(me.key + '-right'))
      return { st: q.state, p90: q.workP90, rivals: q.rivals, art: q.rivalArt, keys: q.rivalKeys, layers: q.layers, d, colours: buckets.size, fp, me: me && me.item.id, views, n: window.BlippiFleet.balap.items.length, ph: !!window.BlippiFleet.balap.placeholder }
    })
    if (w === 390) { prints[l] = s.fp; worlds[l] = s.d && s.d.world; p90s[l] = s.p90 }
    ok(s.st === 'play' && s.d && s.d.visPending === 0, `${tag} ${l}: playing on a fully generated ground map on screen (${s.d && s.d.world}, unfinished visible chunks ${s.d && s.d.visPending}, look-ahead pending ${s.d && s.d.pending})`)
    ok(s.colours >= 12, `${tag} ${l}: the ground is a real map, ${s.colours} colour groups in the band`)
    ok(s.rivals === 3 && s.art && s.keys.every(k => k.indexOf('fl:balap/') === 0), `${tag} ${l}: 3 rival racers of the balap fleet, art loaded`)
    ok(s.layers.indexOf('ground-map') === 0 && s.layers.indexOf('wisps') > s.layers.indexOf('plane'), `${tag} ${l}: layers ground -> deck -> plane -> wisps`)
    ok(s.n === 25 && !s.ph && s.views, `${tag} ${l}: the owner's 25 planes, ${s.me} flies with its left / right banking poses loaded`)
    ok(s.p90 < 4, `${tag} ${l}: frame work p90 ${s.p90} ms < 4`)
  }
  if (w === 390) {
    // the 12 worlds are distinct: no two share a world, and every pair differs in mean colour / spread of the band
    ok(new Set(Object.values(worlds)).size === 12, `12 levels, 12 different worlds (${Object.values(worlds).join(' ')})`)
    const ids = Object.keys(prints), dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]))
    let minD = 1e9, pair = ''
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const d = dist(prints[ids[i]], prints[ids[j]]); if (d < minD) { minD = d; pair = ids[i] + ' vs ' + ids[j] } }
    ok(ids.length === 12 && minD >= MIN_DIST, `every pair of worlds differs in colour: the closest is ${pair}, distance ${minD.toFixed(1)} >= ${MIN_DIST}`)
    // negative control: two levels forced onto the SAME world must read as NOT distinct (the check can fail)
    await p.evaluate(() => { BlippiTripData.byId['balap-12'].theme.world = 'coast'; BlippiTrip.open('balap'); BlippiTrip.start('balap-12', { seed: 2 }) })
    await p.waitForFunction(() => BlippiTrip.qa() && BlippiTrip.qa().state === 'play', { timeout: 30000 }).catch(() => {})
    await sleep(4500)
    const fp2 = await p.evaluate(() => {
      const cv = document.querySelector('canvas'), c = cv.getContext('2d'), px = c.getImageData(0, Math.round(cv.height * 0.2), cv.width, Math.round(cv.height * 0.3)).data
      const n = px.length / 4 / 7, m = [0, 0, 0], q2 = [0, 0, 0]
      for (let i = 0; i < px.length; i += 28) for (let k = 0; k < 3; k++) { m[k] += px[i + k]; q2[k] += px[i + k] * px[i + k] }
      return [...m.map(v => v / n), ...q2.map((v, k) => Math.sqrt(Math.max(0, v / n - (m[k] / n) ** 2)))]
    })
    const dc = dist(fp2, prints['balap-1'])
    ok(dc < MIN_DIST, `control: balap-12 forced onto the coast world reads as NOT distinct from balap-1 (distance ${dc.toFixed(1)} < ${MIN_DIST})`)
    await p.evaluate(() => { BlippiTripData.byId['balap-12'].theme.world = 'night' })
    // the ramp: speed, density and gate count climb across the 12 levels
    const ramp = await p.evaluate(() => BlippiTripData.levels.filter(l => l.cat === 'balap').map(l => [l.speed, l.dens, l.gates.length]))
    ok(ramp.length === 12 && ramp[0][0] <= 1.1 && ramp[11][0] >= 1.6 && ramp.every((r, i) => !i || (r[0] > ramp[i - 1][0] && r[1] > ramp[i - 1][1] && r[2] >= ramp[i - 1][2])), `difficulty ramps smoothly: speed ${ramp[0][0]} -> ${ramp[11][0]}, density ${ramp[0][1]} -> ${ramp[11][1]}, gates ${ramp[0][2]} -> ${ramp[11][2]}`)
    console.log('  frame p90 per level: ' + Object.entries(p90s).map(([k, v]) => k.replace('balap-', '') + '=' + v).join(' '))
  }
  await p.close()
}
ok(!errs.length, 'no page errors or 404s ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`\nqa-blippi-aerial: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
