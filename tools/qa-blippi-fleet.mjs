// qa-blippi-fleet.mjs — the child's own vehicle on DARAT, AIR, UDARA and PESAWAT KERTAS (owner 2026-10-15: the 25-vehicle,
// 25-boat, 25-aircraft and 25-paper-plane animated packs;
// "ada previewnya dan ada animated asset yang tampak belakang utk di gameplaynya"):
//   data: 25 items per journey, every strip as wide as its frames say, a tile still per item
//   art: every play frame whole (nothing on the 1 px frame edge, no piece of a neighbour), tiles inside their 3 px margin
//   picker: the level screen shows the child's vehicle; GANTI opens 25 choices; a tap saves it (per avatar) and the screen,
//           the category tile and the run all use it; the run's three rivals come from the same pack, never the child's own
// Server: ~/rz-work on port 8090.   node tools/qa-blippi-fleet.mjs
import fs from 'fs'
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m) } }
const webpW = f => { const b = fs.readFileSync(f); const t = b.toString('ascii', 12, 16); if (t === 'VP8X') return 1 + b.readUIntLE(24, 3); if (t === 'VP8L') return 1 + (b.readUInt32LE(21) & 0x3fff); return b.readUInt16LE(26) & 0x3fff }
const F = {}
for (const cat of ['darat', 'air', 'udara', 'kertas']) {
  const win = {}; new Function('window', fs.readFileSync(`data/blippi-fleet-${cat}.js`, 'utf8'))(win)
  F[cat] = win.BlippiFleet[cat]
  ok(F[cat].items.length === 25, `${cat}: ${F[cat].items.length} vehicles, the pack has 25`)
  ok(new Set(F[cat].items.map(i => i.id)).size === 25, `${cat}: ids repeat`)
  for (const it of F[cat].items) {
    const f = `assets/fleet/${cat}/${it.id}.webp`, t = `assets/fleet/${cat}/${it.id}-tile.webp`
    ok(fs.existsSync(f) && webpW(f) === it.play[0] * it.play[3], `${f}: missing or not ${it.play[0] * it.play[3]} px wide (${it.play[3]} frames a row)`)
    ok(fs.existsSync(t), `missing ${t}`)
  }
}
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio'] })
const errs = []
const page = async (w, h) => { const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e))); await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true }); await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' }); return p }
// art: decoded in the browser, alpha > 40; bodies of 60+ px counted 8-connected (a puff of smoke or spray under that is fine;
// a boat's wake below the hull is its own animation, so on AIR only pieces starting in the upper half count)
{
  const p = await page(844, 390)
  const res = await p.evaluate(async F => {
    const out = []
    for (const cat of Object.keys(F)) for (const it of F[cat].items) {
      const im = new Image(); im.src = `assets/fleet/${cat}/${it.id}.webp`; try { await im.decode() } catch (e) { out.push([cat + "/" + it.id + " (does not decode)", 1, 1, 1]); continue }
      const [fw, fh, n, cols] = it.play, cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height
      const x = cv.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, im.width, im.height).data
      let edge = 0, pieces = 0
      for (let f = 0; f < n; f += 3) {
        const ox = (f % cols) * fw, oy = Math.floor(f / cols) * fh
        const on = (i, j) => d[((oy + j) * im.width + ox + i) * 4 + 3] > 40
        // pieces are traced at alpha > 12: a spinning rotor is a faint blur that still joins its blades to the body
        const onP = (i, j) => d[((oy + j) * im.width + ox + i) * 4 + 3] > 12
        for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) if ((i < 1 || j < 1 || i >= fw - 1 || j >= fh - 1) && on(i, j)) edge++
        const seen = new Uint8Array(fw * fh); let bodies = 0
        for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) {
          if (seen[j * fw + i] || !onP(i, j)) continue
          let sz = 0, top = j, x0 = i, x1 = i, y1 = j; const st = [[i, j]]; seen[j * fw + i] = 1
          while (st.length) { const [a, b2] = st.pop(); sz++; top = Math.min(top, b2); y1 = Math.max(y1, b2); x0 = Math.min(x0, a); x1 = Math.max(x1, a); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const u = a + dx, v = b2 + dy; if (u >= 0 && v >= 0 && u < fw && v < fh && !seen[v * fw + u] && onP(u, v)) { seen[v * fw + u] = 1; st.push([u, v]) } } }
          // a boat's own wake (foam and spray under the hull) is part of its loop: only pieces starting above the waterline count
          // an aircraft's speed lines are part of its loop too: thin streaks (under 8 px across either way) never count
          if (sz >= 60 && (cat !== 'air' || top < fh * 0.5) && x1 - x0 >= 8 && y1 - top >= 8) bodies++
        }
        if (bodies > 1) pieces++
      }
      const ti = new Image(); ti.src = `assets/fleet/${cat}/${it.id}-tile.webp`; await ti.decode()
      const c2 = document.createElement('canvas'); c2.width = ti.width; c2.height = ti.height; const x2 = c2.getContext('2d'); x2.drawImage(ti, 0, 0)
      const d2 = x2.getImageData(0, 0, ti.width, ti.height).data; let tedge = 0
      for (let j = 0; j < ti.height; j++) for (let i = 0; i < ti.width; i++) if ((i < 3 || j < 3 || i >= ti.width - 3 || j >= ti.height - 3) && d2[(j * ti.width + i) * 4 + 3] > 40) tedge++
      out.push([cat + '/' + it.id, edge, pieces, tedge])
    }
    return out
  }, F)
  res.forEach(([id, edge, pieces, tedge]) => { ok(!edge, `${id}: ${edge} opaque px on a play frame edge`); ok(!pieces, `${id}: ${pieces} frames carry a second piece`); ok(!tedge, `${id}: tile cut at its edge (${tedge} px)`) })
  await p.close()
}
// picker, saved choice, run
for (const [w, h] of [[844, 390], [390, 844]]) for (const [cat, word, lvl] of [['darat', 'kendaraan', 'darat-1'], ['air', 'kapal', 'air-1'], ['udara', 'pesawat', 'udara-1'], ['kertas', 'pesawat-kertas', 'kertas-1']]) {
  const p = await page(w, h)
  await p.evaluate(c => BlippiTrip.open(c), cat); await sleep(700)
  ok(await p.$(`[data-act="ganti-${word}"]`), `${w} ${cat}: no vehicle bar on the level screen`)
  await p.click(`[data-act="ganti-${word}"]`); await sleep(700)
  const n = await p.$$eval('.tcpick .tct', e => e.length)
  ok(n === 25, `${w} ${cat}: picker shows ${n} choices`)
  const fit = await p.$$eval('.tcpick .tct', e => e.every(t => { const i = t.querySelector('img'); if (!i) return false; const a = i.getBoundingClientRect(), b2 = t.getBoundingClientRect(); return i.naturalWidth > 0 && a.width > 20 && a.left >= b2.left - 1 && a.right <= b2.right + 1 && a.top >= b2.top - 1 && a.bottom <= b2.bottom + 1 }))
  ok(fit, `${w} ${cat}: a picker picture is missing or spills out of its tile`)
  const pickId = F[cat].items[12].id
  await p.evaluate(id => document.querySelector(`.tcpick [data-craft="${id}"]`).scrollIntoView(), pickId); await sleep(200)
  await p.click(`.tcpick [data-craft="${pickId}"]`); await sleep(900)
  const name = await p.$eval('.tcbar .tctx b', e => e.textContent)
  ok(name === F[cat].items[12].name, `${w} ${cat}: bar says ${name} after choosing ${F[cat].items[12].name}`)
  ok((await p.evaluate(c => BlippiTrip.ride(c).item.id, cat)) === pickId, `${w} ${cat}: choice not saved`)
  await p.evaluate(() => BlippiTrip.open()); await sleep(500)
  const icon = await p.$eval(`[data-cat="${cat}"] .tcicon img`, e => e.getAttribute('src'))
  ok(icon && icon.indexOf(pickId + '-tile') >= 0, `${w} ${cat}: category tile shows ${icon}, not the chosen vehicle`)
  await p.evaluate((c, l) => { BlippiTrip.open(c); BlippiTrip.start(l, { seed: 2 }) }, cat, lvl)
  await p.waitForFunction(() => BlippiTrip.qa() && BlippiTrip.qa().state === 'play', { timeout: 30000 })
  await sleep(1200)
  const s = await p.evaluate(c => ({ me: !!BlippiTrip.img('fl:' + c + '/' + BlippiTrip.ride(c).item.id), q: BlippiTrip.qa() }), cat)
  ok(s.me, `${w} ${cat}: the run did not load the chosen vehicle`)
  ok(s.q.rivals === 3 && s.q.rivalArt, `${w} ${cat}: rivals ${s.q.rivals}, art ${s.q.rivalArt}`)
  ok(s.q.rivalKeys && s.q.rivalKeys.every(k => k.indexOf('fl:' + cat + '/') === 0 && k.indexOf('/' + pickId) < 0), `${w} ${cat}: rivals ${JSON.stringify(s.q.rivalKeys)} are not other vehicles of the pack`)
  await p.close()
}
ok(!errs.length, 'page errors: ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`qa-blippi-fleet: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
