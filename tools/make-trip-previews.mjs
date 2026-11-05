// make-trip-previews.mjs — renders a still of every JELAJAH DUNIA level from the game itself (its own GPU / 2D world,
// the child's vehicle, mid-run, no HUD) into assets/blippi/trip/<level>.webp for the landing screens (category portals and
// the level route map). Road races (darat, mobil kertas: laneCat) use the Mojo place cards, so they are skipped here.
// Server: ~/rz-work on port 8090.   node tools/make-trip-previews.mjs [level,level...]
import puppeteer from 'puppeteer'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const OUT = new URL('../assets/blippi/trip/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage(); await p.setBypassServiceWorker(true)
const errs = []; p.on('pageerror', e => errs.push(e.message))
await p.setViewport({ width: 420, height: 600, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' }); await sleep(1500)
let fail = 0
const ids = process.argv[2] ? process.argv[2].split(',') : await p.evaluate(() => BlippiTrip.D.levels.filter(l => !BlippiTrip.laneCat(l.cat)).map(l => l.id))
for (const id of ids) {
  await p.evaluate(id => { BlippiTrip.open(id.split('-')[0]); BlippiTrip.start(id, { seed: 5 }) }, id)
  try { await p.waitForFunction(() => BlippiTrip.qa() && BlippiTrip.qa().state === 'play', { timeout: 30000 }) } catch (e) { console.log('FAIL', id, 'never reached play', JSON.stringify(await p.evaluate(() => BlippiTrip.qa() && BlippiTrip.qa().state))); fail++; await p.evaluate(() => BlippiTrip.stop()); continue }
  await p.evaluate(() => { BlippiTrip.qaSeek(0.34); BlippiTrip.qaStill(true) }); await sleep(+(process.env.WAIT || 6000))
  await p.addStyleTag({ content: '#trip .trun > :not(canvas){visibility:hidden !important}' })
  await sleep(120)
  const png = `${OUT}${id}.png`
  await p.screenshot({ path: png })
  await p.evaluate(() => { const s = [...document.querySelectorAll('style')].pop(); s.remove(); BlippiTrip.stop() })
  execFileSync('python3', ['-c', `from PIL import Image; im=Image.open('${png}').convert('RGB').resize((480,686), Image.LANCZOS); im.save('${OUT}${id}.webp', quality=62, method=6)`])
  execFileSync('rm', [png])
  console.log(id)
}
console.log('errs', errs.slice(0, 3))
await b.close()
process.exit(fail || errs.length ? 1 : 0)
