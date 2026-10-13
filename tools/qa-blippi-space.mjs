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
  if (fs.existsSync(f)) ok(webpW(f) === m[0] * m[2], `${f} is ${webpW(f)} px wide, frames say ${m[0] * m[2]}`)
}
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio'] })
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
  await p.evaluate(() => { BlippiTrip.open('angkasa'); BlippiTrip.start('angkasa-1', { seed: 3 }) })
  await p.waitForFunction(() => BlippiTrip.qa() && BlippiTrip.qa().state === 'play', { timeout: 30000 })
  ok(await p.evaluate(id => !!BlippiTrip.img('sp:' + id), last), `${w}: the run did not load the chosen craft`)
  ok(await p.evaluate(id => getComputedStyle(document.querySelector('.tmark .tanim')).backgroundImage.includes(id), last), `${w}: the progress mark is not the chosen craft`)
  await p.close()
}
ok(!errs.length, 'page errors / failed loads: ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`qa-blippi-space: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
