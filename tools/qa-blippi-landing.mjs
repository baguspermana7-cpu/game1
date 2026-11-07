// qa-blippi-landing.mjs — the JELAJAH DUNIA landing screens are windows into the worlds (owner 2026-11-03: "landing page
// ... sangat bagus dan immersive"). Laws, at a phone (390x844), a phone on its side (844x390) and a tablet (1180x820):
//   1. every journey card and every level card shows its own world, and that picture really loads
//   2. the world drifts behind both screens (a .tworld layer with a loaded picture)
//   3. exactly one level per journey is marked MAIN!: the first open level without a star
//   4. a card's words do not collide with its star chip, and a level's number badge is not clipped
//   5. a tap on a journey opens its levels; reduced motion stops the drift, bob and particles; no page error
//   6. postcards (FigCraft mockup 2026-11-07): the child's vehicle shows on the next level only, a locked level keeps its
//      world in full colour behind a lock coin, the vehicle bar is a slim pill
//   7. a phone held upright opens with LANJUT: the next level of the journey played last, one tap starts it; hidden on a
//      wide screen
// Server: ~/rz-work on port 8090.   node tools/qa-blippi-landing.mjs
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
const BASE = process.env.BASE || 'http://localhost:8090/game1/'
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
const errs = []
async function page (W, H, reduced) {
  const p = await b.newPage(); await p.setBypassServiceWorker(true)
  p.on('pageerror', e => errs.push(String(e)))
  await p.setViewport({ width: W, height: H, isMobile: true, hasTouch: true })
  if (reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.goto(BASE, { waitUntil: 'load' }); await sleep(800)
  await p.evaluate(() => BlippiTrip.open()); await sleep(900)
  return p
}
// every url in a card's --pv loads (fetch from the page: same origin, same cache)
const pictures = (p, sel) => p.evaluate(async sel => {
  const out = []
  for (const e of document.querySelectorAll(sel)) {
    const m = /url\("?([^")]+)"?\)/.exec(e.style.getPropertyValue('--pv'))
    let okk = false
    if (m) try { const r = await fetch(m[1]); okk = r.ok && (r.headers.get('content-type') || '').startsWith('image') } catch (x) {}
    out.push({ id: e.dataset.cat || e.dataset.level, url: m && m[1], ok: okk })
  }
  return out
}, sel)
const overlap = (a, c) => a && c && a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom
for (const [W, H] of [[390, 844], [844, 390], [1180, 820]]) {
  const tag = `${W}x${H}`
  const p = await page(W, H)
  const cats = await pictures(p, '.tpick .tcat')
  ok(cats.length >= 7 && cats.every(c => c.ok), `${tag}: a journey card without a loaded world: ${JSON.stringify(cats.filter(c => !c.ok))}`)
  const wd = await p.evaluate(() => { const i = document.querySelector('.tpick .tworld i.on'); return i ? i.style.backgroundImage : '' })
  ok(/url\(/.test(wd), `${tag}: no world drifting behind the journey picker`)
  const clash = await p.evaluate(() => [...document.querySelectorAll('.tpick .tcat')].map(c => {
    const r = e => e && e.getBoundingClientRect().toJSON()
    return { id: c.dataset.cat, b: r(c.querySelector('.tctx b')), em: r(c.querySelector('.tctx em')), st: r(c.querySelector('.tcst')) }
  }))
  const bad = clash.filter(c => overlap(c.b, c.st) || overlap(c.em, c.st))
  ok(!bad.length, `${tag}: words collide with the star chip on ${bad.map(c => c.id).join(', ')}`)
  // 4b. cards in one row read as one row: same title line, one-line titles, same picture height (2026-11-07 polish)
  const rows = await p.evaluate(() => {
    const out = {}
    for (const c of document.querySelectorAll('.tpick .tcats .tcat')) {
      const q = c.getBoundingClientRect(), b = c.querySelector('.tctx b').getBoundingClientRect(), ic = c.querySelector('.tcicon').getBoundingClientRect()
      const k = Math.round(q.top); (out[k] = out[k] || []).push({ id: c.dataset.cat, bt: b.top - q.top, bh: b.height, lh: parseFloat(getComputedStyle(c.querySelector('.tctx b')).lineHeight) || b.height, ih: ic.height })
    }
    return Object.values(out)
  })
  for (const r of rows) {
    if (r.length < 2) continue
    const spread = k => Math.max(...r.map(c => c[k])) - Math.min(...r.map(c => c[k]))
    ok(spread('bt') <= 3, `${tag}: titles in a row are ragged by ${spread('bt').toFixed(0)} px (${r.map(c => c.id + ':' + c.bt.toFixed(0)).join(' ')})`)
    ok(spread('ih') <= 3, `${tag}: pictures in a row differ by ${spread('ih').toFixed(0)} px (${r.map(c => c.id + ':' + c.ih.toFixed(0)).join(' ')})`)
    ok(r.every(c => c.bh < c.lh * 1.6), `${tag}: a title wraps to two lines (${r.filter(c => c.bh >= c.lh * 1.6).map(c => c.id).join(' ')})`)
  }
  for (const cat of ['udara', 'air', 'balap']) {
    await p.evaluate(c => document.querySelector(`.tcat[data-cat=${c}]`).click(), cat)
    let shown = false
    for (let i = 0; i < 30 && !shown; i++) { await sleep(100); shown = await p.evaluate(() => !!document.querySelector('.tlev.on .tlvl')) }
    ok(shown, `${tag}: a tap on ${cat} did not open its levels`)
    await p.waitForFunction(() => !document.getAnimations().some(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity), { timeout: 5000 }).catch(() => {})   // the fly-in and the cards' entrance have settled
    const lv = await pictures(p, '.tlev .tlvl')
    ok(lv.length >= 8 && lv.every(l => l.ok), `${tag} ${cat}: a level card without a loaded world: ${JSON.stringify(lv.filter(l => !l.ok).slice(0, 3))}`)
    const cur = await p.evaluate(c => {
      const want = BlippiTrip.D.levels.filter(l => l.cat === c).find(l => BlippiTrip.unlocked(l) && !((BlippiTrip.levelState(l.id) || {}).stars))
      return { marked: [...document.querySelectorAll('.tlev .tlvl.tcur')].map(e => e.dataset.level), want: want && want.id, chip: !!document.querySelector('.tlev .tlvl.tcur .tgo') }
    }, cat)
    ok(cur.marked.length === 1 && cur.marked[0] === cur.want && cur.chip, `${tag} ${cat}: MAIN! on ${JSON.stringify(cur.marked)}, want ${cur.want}`)
    const clip = await p.evaluate(() => [...document.querySelectorAll('.tlev .tlvl .tnum')].slice(0, 4).map(n => {
      const r = n.getBoundingClientRect(), x = r.left + r.width * 0.15, y = r.top + r.height * 0.15
      const hit = document.elementFromPoint(x, y)
      return y < 0 || (hit && n.contains(hit))
    }))
    ok(clip.every(Boolean), `${tag} ${cat}: a level number badge is clipped or covered (${JSON.stringify(clip)})`)
    const pc = await p.evaluate(() => [...document.querySelectorAll('.tlev .tlvl')].map(c => {
      const pic = c.querySelector('.tlpic'), lk = c.querySelector('.tlock')
      const r = c.getBoundingClientRect(), q = lk && lk.getBoundingClientRect()
      return { cur: c.classList.contains('tcur'), locked: c.classList.contains('lk'), veh: !!pic && getComputedStyle(pic).display !== 'none' && pic.getBoundingClientRect().height > 20,
        filter: getComputedStyle(c).filter, coin: !q || (q.left > r.left + r.width * 0.25 && q.right < r.right - r.width * 0.25 && q.width >= 48) }
    }))
    ok(pc.filter(c => c.veh).length === 1 && pc.find(c => c.veh).cur, `${tag} ${cat}: the vehicle shows on ${pc.filter(c => c.veh).length} cards, want the next level only`)
    ok(pc.filter(c => c.locked).every(c => c.filter === 'none' && c.coin), `${tag} ${cat}: a locked level is greyed or its lock is not a centred coin`)
    const bar = await p.evaluate(() => { const e = document.querySelector('.tlev .tcbar'); return e ? e.getBoundingClientRect().height : 0 })
    ok(bar > 0 && bar <= 84, `${tag} ${cat}: the vehicle bar is ${Math.round(bar)} px tall, want a slim pill <= 84`)
    const lwd = await p.evaluate(() => { const i = document.querySelector('.tlev .tworld i.on'); return i ? i.style.backgroundImage : '' })
    ok(/url\(/.test(lwd), `${tag} ${cat}: no world drifting behind the levels`)
    await p.evaluate(() => document.querySelector('.tlev .thead .tcirc').click()); await sleep(500)
  }
  const lj = await p.evaluate(() => { const e = document.querySelector('.tpick .tlanjut'); return e ? getComputedStyle(e).display : 'missing' })
  ok(W < 700 ? lj !== 'none' && lj !== 'missing' : lj === 'none' || lj === 'missing', `${tag}: LANJUT is ${lj} at this width`)
  await p.close()
}
{
  // LANJUT follows the journey played last, and one tap starts its next level
  const p = await page(390, 844)
  await p.evaluate(() => { document.querySelector('.tcat[data-cat=udara]').click() })
  await p.waitForSelector('.tlev.on .tlvl[data-level="udara-1"]', { timeout: 5000 }).catch(() => {})
  await sleep(600)
  await p.evaluate(() => document.querySelector('.tlev.on .tlvl[data-level="udara-1"]').click())
  await sleep(1500)
  const last = await p.evaluate(() => (Blippi.state().trip || {}).last)
  ok(last === 'udara', `starting an UDARA level did not remember the journey (last=${last})`)
  await p.evaluate(() => Blippi.save && Blippi.save()); await sleep(500)
  await p.close()
  const q = await page(390, 844)
  const hero = await q.evaluate(() => { const e = document.querySelector('.tpick .tlanjut'); return e ? { id: e.dataset.resume, pv: /url\(/.test(e.style.getPropertyValue('--pv')) } : null })
  ok(hero && /^udara-/.test(hero.id) && hero.pv, `LANJUT does not lead to the journey played last: ${JSON.stringify(hero)}`)
  if (hero) {
    await q.evaluate(() => document.querySelector('.tpick .tlanjut').click())
    let run = false
    for (let i = 0; i < 40 && !run; i++) { await sleep(100); run = await q.evaluate(() => !!document.querySelector('.tscr.on canvas, .trun.on, canvas.tcv')) }
    ok(run, 'a tap on LANJUT did not start the level')
  }
  await q.close()
}
{
  const p = await page(390, 844, true)
  const run = await p.evaluate(() => [...document.querySelectorAll('.tpick .tworld i, .tpick .tcicon img, .tpick .tpfx')].reduce((n, e) => n + e.getAnimations().filter(a => a.playState === 'running').length, 0))
  ok(run === 0, `reduced motion: ${run} drift / bob / particle animations still run`)
  await p.close()
}
ok(!errs.length, 'page errors: ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`qa-blippi-landing: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
