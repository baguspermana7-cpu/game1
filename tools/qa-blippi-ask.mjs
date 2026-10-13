// qa-blippi-ask.mjs — every question Blippi asks SHOWS a picture (owner 2026-10-12: "tanya ini jam berapa tapi nggak ada
// gambarnya"). Draws real SoalEngine picks for Blippi (grade 1-2, any topic and maths) through the real BlippiKit.ask card
// and fails any card without a picture, with a picture that did not load, or (clock) without the clock face.
// Server: ~/rz-work on port 8090 (see qa-blippi.mjs).   node tools/qa-blippi-ask.mjs [N]
import puppeteer from 'puppeteer'
const N = +(process.argv[2] || 400)
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio'] })
const p = await b.newPage(); const errors = []
// the journey quiz card (blippi-trip-ui.js) is the second place a question is shown (owner 2026-10-13 "Soal nggak ada gambarnya"):
// catch its UI object as it registers so the gate can draw the same questions through it
await p.evaluateOnNewDocument(() => { let bt; Object.defineProperty(window, 'BlippiTrip', { configurable: true, get: () => bt, set: v => { const o = v.setUI; v.setUI = u => { window.__tripUI = u; o(u) }; bt = v } }) })
p.on('pageerror', e => errors.push(String(e)))
await p.setViewport({ width: 1280, height: 720 })
await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' })
await p.waitForFunction('window.BlippiKit && window.SoalEngine && window.Blippi')
const res = await p.evaluate(async (N) => {
  const B = window.Blippi, scene = B.at(B.stage, 'qa-ask', 0, 0, B.W, B.H)
  const api = { scene, at: B.at, art: B.art, B, sfx: B.sfx, touch () {}, later: (fn, ms) => setTimeout(fn, ms), reduced: () => true }
  const out = { n: 0, kinds: {}, fails: [] }
  for (let i = 0; i < N; i++) {
    const q = (SoalEngine.pick({ game: 'blippi', context: 'gate', avatar: 'auto', count: 1, grade: 1 + (i % 2), topic: i % 3 ? 'matematika' : undefined }) || [])[0]
    if (!q) continue
    BlippiKit.ask(api, { custom: q, done () {} })
    const ov = scene.querySelector('[data-ask]'), card = ov && ov.querySelector('.panel')
    const imgs = card ? [...card.querySelectorAll('img')].filter(im => !im.closest('button')) : []
    await Promise.all(imgs.map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; setTimeout(r, 3000) })))
    const k = q.kind || q.topic || '?'; out.kinds[k] = (out.kinds[k] || 0) + 1; out.n++
    const clock = !!(card && card.querySelector('svg[aria-label="jam"]'))
    const pics = imgs.length + (clock ? 1 : 0), broken = imgs.filter(im => !im.naturalWidth).map(im => im.getAttribute('src'))
    if (!pics) out.fails.push('no picture: ' + k + ' "' + q.prompt + '"')
    if (broken.length) out.fails.push('picture did not load: ' + k + ' ' + broken[0])
    if (q.scene && q.scene.mode === 'clock' && !clock) out.fails.push('clock question without the clock: "' + q.prompt + '"')
    if (ov) ov.remove()
    // the same question on the journey quiz card
    const UI = window.__tripUI
    if (!UI) { out.fails.push('journey quiz UI not reachable'); continue }
    if (!document.querySelector('.tscr.trun.on canvas, [data-trip=run] canvas')) UI.showRun(BlippiTrip.D.byId['darat-1'])
    UI.quiz({ q, gate: 0 })
    const tc = document.querySelector('.tquiz:last-of-type .tqcard')
    const timgs = tc ? [...tc.querySelectorAll('img')].filter(im => !im.closest('.tqhd')) : []
    await Promise.all(timgs.map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; setTimeout(r, 3000) })))
    const tclock = !!(tc && tc.querySelector('svg[aria-label="jam"]')), tbroken = timgs.filter(im => !im.naturalWidth).map(im => im.getAttribute('src'))
    if (!timgs.length && !tclock) out.fails.push('journey card, no picture: ' + k + ' "' + q.prompt + '"')
    if (tbroken.length) out.fails.push('journey card, picture did not load: ' + k + ' ' + tbroken[0])
    if (q.scene && q.scene.mode === 'clock' && !tclock) out.fails.push('journey card, clock question without the clock: "' + q.prompt + '"')
    document.querySelectorAll('.tquiz').forEach(e => e.remove())
  }
  return out
}, N).catch(e => ({ fails: ['evaluate: ' + e.message], kinds: {}, n: 0 }))
const uniq = [...new Set(res.fails)]
uniq.slice(0, 20).forEach(f => console.log('FAIL', f))
console.log('kinds', JSON.stringify(res.kinds))
console.log(`qa-blippi-ask: ${res.n - res.fails.length}/${res.n} questions show a picture, ${errors.length} page errors`)
if (errors.length) console.log(errors.slice(0, 3).join('\n'))
await b.close(); process.exit(res.fails.length || errors.length || !res.n ? 1 : 0)
