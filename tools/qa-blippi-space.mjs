// qa-blippi-space.mjs: the LUAR ANGKASA craft (owner 2026-10-14: "pastikan semua char ini ada di selection blippi yang luar
// angkasa ... ada micro movement nya agar tidak static"). Static: every catalog craft has both strips, each strip is exactly
// frames x frame width. Browser: the picker shows every craft and every tile animates, the choice is saved per avatar and
// survives a reload, the run draws the chosen craft, the last tile is reachable on a phone.
// Server: ~/rz-work on port 8090.   node tools/qa-blippi-space.mjs
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import vm from 'node:vm'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m) } }
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync('data/blippi-space.js', 'utf8'), ctx)
const C = ctx.window.BlippiSpace.craft
ok(C.length === 25, `catalog has ${C.length} craft, the owner's sheet has 25`)
ok(new Set(C.map(c => c.id)).size === C.length, 'craft ids repeat')
const webpW = f => { const b = fs.readFileSync(f); const t = b.toString('ascii', 12, 16); if (t === 'VP8X') return 1 + b.readUIntLE(24, 3); if (t === 'VP8L') return 1 + (b.readUInt32LE(21) & 0x3fff); return b.readUInt16LE(26) & 0x3fff }
for (const c of C) for (const [f, m] of [[`assets/space/${c.id}.webp`, c.play], [`assets/space/${c.id}-pick.webp`, c.pick]]) {
  ok(fs.existsSync(f), `missing ${f}`)
  if (fs.existsSync(f)) ok(webpW(f) === m[0] * (m[3] || m[2]), `${f} is ${webpW(f)} px wide, frames say ${m[0] * (m[3] || m[2])}`)
}
ok(fs.existsSync('assets/space/asteroid.webp'), 'missing assets/space/asteroid.webp')
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
const errs = []
for (const [w, h] of [[1280, 800], [844, 390]]) {
  const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e))); p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()) })
  await p.setViewport({ width: w, height: h })
  await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' })
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'load' })
  await p.evaluate(() => BlippiTrip.open('angkasa')); await sleep(500)
  ok(await p.$('[data-act="ganti-pesawat"]'), `${w}: no craft bar on the space level screen`)
  await p.click('[data-act="ganti-pesawat"]'); await sleep(700)
  const ids = await p.evaluate(() => [...document.querySelectorAll('.tct')].map(e => e.getAttribute('data-craft')))
  ok(ids.length === 25 && C.every(c => ids.includes(c.id)), `${w}: picker shows ${ids.length} craft`)
  const pos = () => p.evaluate(() => [...document.querySelectorAll('.tct .tanim')].map(e => getComputedStyle(e).backgroundPosition))
  const a = await pos(); await sleep(370); const z = await pos()
  ok(a.filter((x, i) => x !== z[i]).length === 25, `${w}: only ${a.filter((x, i) => x !== z[i]).length}/25 picker tiles move`)
  const last = C[C.length - 1].id
  await p.evaluate(id => document.querySelector(`[data-craft="${id}"]`).scrollIntoView(), last); await sleep(150)
  ok(await p.evaluate(id => { const r = document.querySelector(`[data-craft="${id}"]`).getBoundingClientRect(), g = document.querySelector('.tcgrid').getBoundingClientRect(); return r.bottom <= g.bottom + 1 && r.top >= g.top - 1 }, last), `${w}: the last craft cannot be reached`)
  await p.click(`[data-craft="${last}"]`); await sleep(800)
  ok(await p.evaluate(() => Blippi.state().trip.craft) === last, `${w}: the choice was not saved`)
  await p.reload({ waitUntil: 'load' })
  ok(await p.evaluate(() => BlippiTrip.craft().id) === last, `${w}: the choice did not survive a reload`)
  // the category screen: the space tile shows the chosen craft moving, and no craft-bar style leaks onto the tiles' text
  // (2026-10-14: the bar's .tctx rules painted every tile title pale yellow on its pale tile)
  await p.evaluate(() => BlippiTrip.open()); await sleep(500)
  ok(await p.evaluate(id => { const e = document.querySelector('.tcat[data-cat=angkasa] .tanim'); return !!e && getComputedStyle(e).backgroundImage.includes(id) }, last), `${w}: the space tile does not show the chosen craft`)
  const ink = await p.evaluate(() => [...document.querySelectorAll('.tcat')].map(t => { const c = document.createElement('i'); c.style.color = t.style.getPropertyValue('--ink'); document.body.appendChild(c); const want = getComputedStyle(c).color; c.remove(); return [t.getAttribute('data-cat'), getComputedStyle(t.querySelector('.tctx b')).color, want] }))
  ink.forEach(([cat, got, want]) => ok(got === want, `${w}: ${cat} tile title is ${got}, its ink is ${want}`))
  await p.evaluate(() => { BlippiTrip.open('angkasa'); BlippiTrip.start('angkasa-1', { seed: 3 }) })
  await p.waitForFunction(() => BlippiTrip.qa() && BlippiTrip.qa().state === 'play', { timeout: 30000 })
  ok(await p.evaluate(id => !!BlippiTrip.img('sp:' + id), last), `${w}: the run did not load the chosen craft`)
  ok(await p.evaluate(() => !!BlippiTrip.img('sp:asteroid')), `${w}: the run did not load the asteroid art`)
  if (w === 1280) {
    // owner rule: no white sticker ring. Opaque pixels within 3 px of transparency must not be near-white.
    const ring = await p.evaluate(() => { const im = BlippiTrip.img('sp:asteroid'); if (!im) return 1; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height, A = (i, j) => i < 0 || j < 0 || i >= W || j >= H ? 0 : d[(j * W + i) * 4 + 3]; let n = 0, wh = 0
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = (j * W + i) * 4; if (d[k + 3] < 120) continue; let near = false; for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3; dx++) if (A(i + dx, j + dy) < 40) { near = true; break } if (!near) continue; n++; if (Math.min(d[k], d[k + 1], d[k + 2]) > 215) wh++ }
      return wh / Math.max(1, n) })
    ok(ring < 0.05, `asteroid art has a white ring (${(ring * 100).toFixed(1)}% of its rim is near-white)`)
  }
  ok(await p.evaluate(id => getComputedStyle(document.querySelector('.tmark .tanim')).backgroundImage.includes(id), last), `${w}: the progress mark is not the chosen craft`)
  await p.close()
}
// every frame of every strip is whole (owner 2026-10-14: "tidak ada mutilasi?"): no opaque pixel on the frame's outer band
// (play: 1 px, the canvas draws an exact source rect; picker: 3 px, CSS steps() can round a pixel into the next frame), and
// one body per frame (no piece of a neighbouring craft from the sheet). Decoded in the browser, alpha > 40.
{
  const p = await b.newPage()
  await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' })
  const res = await p.evaluate(async C => {
    const out = []
    for (const c of C) for (const [kind, suf, band] of [['play', '', 1], ['pick', '-pick', 3]]) {
      const im = new Image(); im.src = 'assets/space/' + c.id + suf + '.webp'; await im.decode()
      const [fw, fh, n] = c[kind], cols = c[kind][3] || n, cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height
      const x = cv.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, im.width, im.height).data
      let edge = 0, pieces = 0
      for (let f = 0; f < n; f++) {
        const ox = (f % cols) * fw, oy = Math.floor(f / cols) * fh
        const on = (i, j) => d[((oy + j) * im.width + ox + i) * 4 + 3] > 40
        for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) if ((i < band || j < band || i >= fw - band || j >= fh - band) && on(i, j)) edge++
        // count bodies of 30+ px (8-connected)
        const seen = new Uint8Array(fw * fh); let bodies = 0
        for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) {
          if (seen[j * fw + i] || !on(i, j)) continue
          let sz = 0; const st = [[i, j]]; seen[j * fw + i] = 1
          while (st.length) { const [a, b2] = st.pop(); sz++; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const u = a + dx, v = b2 + dy; if (u >= 0 && v >= 0 && u < fw && v < fh && !seen[v * fw + u] && on(u, v)) { seen[v * fw + u] = 1; st.push([u, v]) } } }
          if (sz >= 30) bodies++
        }
        if (bodies > 1) pieces++
      }
      out.push([c.id, kind, edge, pieces])
    }
    return out
  }, C)
  res.forEach(([id, kind, edge, pieces]) => { ok(!edge, `${id} ${kind}: ${edge} opaque px on the frame edge (cut off, or bleeding into the next frame)`); ok(!pieces, `${id} ${kind}: ${pieces} frames carry a second piece`) })
  await p.close()
}
// the quiz card: no answer looks pre-picked for a touch player (the focus ring on the first answer read as a choice),
// while a keyboard player still lands on the first answer
{
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true })
  await p.evaluateOnNewDocument(() => { let bt; Object.defineProperty(window, 'BlippiTrip', { configurable: true, get: () => bt, set: v => { const o = v.setUI; v.setUI = u => { window.__tripUI = u; o(u) }; bt = v } }) })
  await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' })
  await p.waitForFunction('window.__tripUI && window.SoalEngine')
  await p.evaluate(() => BlippiTrip.open('darat')) // the journey screen must be showing, or nothing in it can take focus
  const ask = () => p.evaluate(async () => { document.querySelectorAll('.tquiz').forEach(e => e.remove()); const q = SoalEngine.pick({ game: 'blippi', context: 'gate', avatar: 'auto', count: 1, grade: 1 })[0]; __tripUI.showRun(BlippiTrip.D.byId['darat-1']); __tripUI.quiz({ q, gate: 0 }); await new Promise(r => setTimeout(r, 250)); const a = document.activeElement; return a && a.hasAttribute('data-ans') ? a.getAttribute('data-ans') : null })
  await p.touchscreen.tap(195, 600)
  ok(await ask() === null, 'quiz after a touch: an answer is focused, its ring looks pre-picked')
  await p.keyboard.press('ArrowLeft')
  ok(await ask() === '0', 'quiz after a key: the first answer is not focused for keyboard play')
  await p.close()
}
// (the road levels now run on the Mojo chase engine, which has no obs0 / count probe: ?land=old keeps the engine this check reads)
// the opening of every road / space level is obstacle free while the how-to chip is up (2026-10-14: a crash 2.5 s in).
// Checked on the generated level for 12 seeds each: the first obstacle sits at least 6 world units (about 6 s at speed 1) in.
{
  const p = await b.newPage(); await p.setViewport({ width: 844, height: 390 })
  await p.goto('http://localhost:8090/game1/?land=old', { waitUntil: 'load' })
  for (const id of ['darat-1', 'darat-4', 'air-1', 'air-4', 'air-8', 'angkasa-1', 'angkasa-4', 'angkasa-8']) {
    let worst = Infinity
    for (let seed = 1; seed <= 12; seed++) {
      await p.evaluate((id, seed) => { BlippiTrip.open(id.split('-')[0]); BlippiTrip.start(id, { seed }) }, id, seed)
      await p.waitForFunction(() => BlippiTrip.qa() && BlippiTrip.qa().state === 'count', { timeout: 30000 })
      worst = Math.min(worst, await p.evaluate(() => String(BlippiTrip.qa().obs0)).then(Number)) // Infinity (no obstacle) is JSON null
    }
    ok(worst >= 6, `${id}: an obstacle ${worst.toFixed(1)} units in, before the child has learned to steer`)
  }
  await p.close()
}
ok(!errs.length, 'page errors / failed loads: ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`qa-blippi-space: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
