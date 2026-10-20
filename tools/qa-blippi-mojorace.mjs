// qa-blippi-mojorace.mjs -- DARAT / MOBIL KERTAS on the shared Mojo chase engine (owner 2026-10-20). A road level opens
// ../Dunia-Emosi/games/mojo-chase-embed.html in a full-screen frame: the child's fleet vehicle and a rival from the same
// fleet drive the Mojo road as racer sheets (no missing art), the race runs (lanes answer), the road speed is 80 % of the
// Mojo race at the start and 90 % at the end, Blippi is the caller, and a finished race saves its stars like a trip level
// and returns to the level list; Kembali / exit returns without saving. Server: rz-work root on :8090.
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m) } else { fail++; console.log('  ✗ ' + m) } }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
const errs = []
for (const [w, h, lvs] of [[390, 844, ['darat-1', 'mobilkertas-3']], [1280, 800, ['mobilkertas-8']]]) {
  const tag = w + 'x' + h
  const p = await b.newPage(); await p.setBypassServiceWorker(true)
  p.on('pageerror', e => errs.push(tag + ' ' + e)); p.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(r.status() + ' ' + r.url()) })
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: w < 900 })
  await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' }); await sleep(1200)
  for (const lv of lvs) {
    const cat = lv.split('-')[0]
    await p.evaluate((c, l) => { BlippiTrip.open(c); BlippiTrip.start(l, { seed: 4 }) }, cat, lv)
    let fr = null
    for (let i = 0; i < 40 && !fr; i++) { await sleep(250); const hs = p.frames().find(f => /mojo-chase-embed\.html/.test(f.url())); if (hs) fr = hs }
    ok(!!fr, `${tag} ${lv}: the level opens the Mojo race frame`)
    if (!fr) continue
    await fr.waitForFunction(() => window.__mojoChase && document.querySelector('#chase-host'), { timeout: 60000 }).catch(() => {})
    // start: the intro card's go button, skip the cut-in
    for (let i = 0; i < 60; i++) { const s = await fr.evaluate(() => window.__mojoChase && __mojoChase.state().state).catch(() => null); if (s === 'active') break; await fr.evaluate(() => { const g = document.querySelector('.mcp-go, #mc-go'); if (g) g.click(); const k = document.querySelector('.mc-skip'); if (k) k.click() }).catch(() => {}); await sleep(400) }
    await sleep(1500)
    const s = await fr.evaluate(() => { const s = __mojoChase.state(); return { state: s.state, racer: s.racerSheet, target: s.targetSheet, missing: s.missing, teamK: s.teamK, prog: s.prog, caller: document.querySelector('.mc-call img').src, place: document.querySelector('.mc-loc').textContent } })
    ok(s.state === 'active' && s.racer && s.target && !s.missing.length, `${tag} ${lv}: the child's ${cat} vehicle and a ${cat} rival race as sheets, all art decoded (${JSON.stringify({ st: s.state, missing: s.missing })})`)
    ok(Math.abs(s.teamK - 0.8) < 0.03, `${tag} ${lv}: road speed ${(s.teamK * 100).toFixed(0)} % of the Mojo race at the start`)
    ok(/blippi-profil/.test(s.caller), `${tag} ${lv}: Blippi is the caller, not Bo`)
    const lname = await p.evaluate(l => BlippiTripData.byId[l].name, lv)
    ok(s.place === lname, `${tag} ${lv}: the place label is the level's own name (${s.place})`)
    const ln = await fr.evaluate(async () => { const l0 = __mojoChase.state().lane; document.dispatchEvent(new KeyboardEvent('keydown', { key: l0 < 2 ? 'ArrowRight' : 'ArrowLeft', bubbles: true })); await new Promise(r => setTimeout(r, 500)); return [l0, __mojoChase.state().lane] })
    ok(ln[0] !== ln[1], `${tag} ${lv}: a lane change answers (${ln[0]} -> ${ln[1]})`)
    await fr.evaluate(() => __mojoChase.force({ prog: 0.95, best: 0.95 })); await sleep(400)
    const k1 = await fr.evaluate(() => __mojoChase.state().teamK)
    ok(Math.abs(k1 - 0.895) < 0.03, `${tag} ${lv}: near the finish ${(k1 * 100).toFixed(0)} % of the Mojo race`)
    if (lv === 'darat-1') {
      // Kembali from the pause menu: back to the level list, nothing saved
      await fr.evaluate(() => { document.querySelector('.mc-pause').click() }); await sleep(300)
      await fr.evaluate(() => { const x = document.querySelector('#mc-exit'); if (x) x.click() }); await sleep(1200)
      const back = await p.evaluate(l => ({ frame: !!document.querySelector('.tmojo'), saved: !!(((Blippi.state().trip || {}).lv || {})[l]), list: document.querySelectorAll('.tlvl').length }), lv)
      ok(!back.frame && !back.saved && back.list > 0, `${tag} ${lv}: Kembali returns to the level list, nothing saved (${JSON.stringify(back)})`)
      continue
    }
    // finish the race with the autopilot: stars saved, back on the level list
    await fr.evaluate(() => { __mojoChase.auto({ mode: 'clean' }) })
    let done = false
    for (let i = 0; i < 120 && !done; i++) {
      await sleep(500)
      done = await p.evaluate(() => !document.querySelector('.tmojo'))
      if (!done) await fr.evaluate(() => { const bt = [...document.querySelectorAll('.mc-card button')].find(x => /Lanjut|Selesai|Kembali|OK|Hore/i.test(x.textContent)); if (bt) bt.click() }).catch(() => {})
    }
    const sv = await p.evaluate(l => ((Blippi.state().trip || {}).lv || {})[l] || null, lv)
    ok(done && sv && sv.stars >= 1, `${tag} ${lv}: a finished race saves ${sv && sv.stars} star(s) and returns to the level list`)
  }
  await p.close()
}
ok(!errs.length, `no page errors or 404s ${errs.slice(0, 3).join(' | ')}`)
await b.close()
console.log(`\nqa-blippi-mojorace: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
