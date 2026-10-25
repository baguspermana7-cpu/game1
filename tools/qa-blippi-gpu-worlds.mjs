// qa-blippi-gpu-worlds.mjs -- AIR (the sea) and UDARA (the ground below the clouds) drawn by the GPU shaders of
// blippi-trip-gl.js (owner 2026-10-26: "kurang detail dan kurang immersive. Shader terrain or langitnya laut sangat kurang
// detail"). For every AIR / UDARA level, on a phone and a desktop: the GPU layer runs (layers list), no shader warning and
// no page error, and the scene measured from the game canvas is no brighter than the same frame drawn by the old 2D
// scenery (?gl=0, which washed out), keeps its contrast (luminance spread) and stays crisp (1 px edge strength).
// The frame work (p90 ms) of both paths is printed for the record (a software-GL headless browser is not a tablet).
// Server: rz-work root on :8090.
import puppeteer from '/home/baguspermana7/rz-work/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m) } else { fail++; console.log('  ✗ ' + m) } }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'] })   // the machine's real GPU (software GL ran the shaders on the CPU: the run never left the countdown)
const LV = process.env.QA_LV ? process.env.QA_LV.split(',') : [1, 2, 3, 4, 5, 6, 7, 8].flatMap(i => ['udara-' + i, 'air-' + i])
// the scene statistics: a grid of samples over the canvas with the HUD bands cut off; edge = mean |dx|+|dy| of luminance
async function measure (p) {
  return p.evaluate(() => {
    const cv = document.querySelector('.tcv'); if (!cv) return null
    const x = cv.getContext('2d'), W = cv.width, H = cv.height, d = x.getImageData(0, 0, W, H).data
    const L = (i, j) => { const o = (j * W + i) * 4; return 0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2] }
    let n = 0, s = 0, s2 = 0, e = 0
    const st = Math.max(2, Math.round(W / 160))
    for (let j = Math.round(H * 0.12); j < H * 0.88; j += st) for (let i = 2; i < W - 2; i += st) {
      const l = L(i, j); s += l; s2 += l * l; e += Math.abs(L(i + 1, j) - l) + Math.abs(L(i, j + 1) - l); n++
    }
    const m = s / n
    return { mean: +m.toFixed(1), sd: +Math.sqrt(s2 / n - m * m).toFixed(1), edge: +(e / n).toFixed(2) }
  })
}
async function runLevel (p, lv) {
  await p.bringToFront()   // two tabs: a background tab gets no animation frames (the run sat in its countdown)
  await p.evaluate(l => { BlippiTrip.open(l.split('-')[0]); BlippiTrip.start(l, { seed: 3 }) }, lv)
  for (let i = 0; i < 40; i++) { await sleep(250); const s = await p.evaluate(() => BlippiTrip.qa()); if (s && s.state === 'play') break }
  await sleep(2500)
  const s = await p.evaluate(() => { const s = BlippiTrip.qa(); return { state: s.state, layers: s.layers || [], work: s.workP90 } })
  return Object.assign(s, await measure(p))
}
for (const [w, h] of [[390, 844], [1280, 800]]) {
  const tag = w + 'x' + h
  const pages = {}
  for (const mode of ['gpu', '2d']) {
    const p = await b.newPage(); await p.setBypassServiceWorker(true)
    const errs = []
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/blippi-gl/.test(m.text()) || m.type() === 'error') errs.push(m.text()) })
    await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: w < 900 })
    await p.goto('http://localhost:8090/game1/' + (mode === '2d' ? '?gl=0' : ''), { waitUntil: 'load' }); await sleep(1200)
    pages[mode] = { p, errs }
  }
  for (const lv of LV) {
    const g = await runLevel(pages.gpu.p, lv), o = await runLevel(pages['2d'].p, lv)
    const ground = lv.startsWith('udara') ? !g.layers.includes('storm-wall') : true   // the thunder world has no ground below its clouds
    const want = lv.startsWith('air') ? 'gpu-sea' : 'gpu-ground'
    ok(g.state === 'play' && (!ground || g.layers.includes(want)), `${tag} ${lv}: the GPU ${want === 'gpu-sea' ? 'sea' : 'ground'} runs (${g.state}${ground ? '' : ', no ground in this world'})`)
    if (!ground) continue
    // the 2D scenery washed out (mean luminance 150-217 on the day worlds): the GPU scene must be no brighter, keep at least
    // the contrast, and stay crisp (a 1 px edge strength within 0.7x: the old tiles' hard lines and blots score high there)
    // (a dark world -- night, storm with its random lightning -- cannot wash out: it only has to stay dark)
    ok(g.mean <= (o.mean < 100 ? 120 : o.mean + 5) && g.sd >= o.sd * 0.85 && g.edge >= o.edge * 0.7,
      `${tag} ${lv}: no wash-out, contrast kept, crisp vs the 2D scenery (mean ${g.mean} vs ${o.mean}, spread ${g.sd} vs ${o.sd}, edge ${g.edge} vs ${o.edge}; work p90 ${g.work} vs ${o.work} ms)`)
  }
  for (const mode of ['gpu', '2d']) { ok(!pages[mode].errs.length, `${tag} ${mode}: no page error, no shader warning (${pages[mode].errs.slice(0, 2)})`); await pages[mode].p.close() }
}
await b.close()
console.log(`qa-blippi-gpu-worlds: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
