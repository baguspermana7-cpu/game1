// One contact sheet per category of the vehicle journey mode: picker, level picker, then 3 moments of level 1 and 1 of level 4.
//   node tools/qa-trip-sheet.mjs <outDir>   (server on http://localhost:8090)
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const OUT = process.argv[2] || '/tmp/blippi-trip-sheets';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio'] });
const errors = [];
async function shot(p) { return (await p.screenshot({ encoding: 'base64' })); }
for (const cat of ['darat', 'udara', 'angkasa', 'air']) {
  const p = await b.newPage();
  p.on('pageerror', e => errors.push(cat + ': ' + e));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(cat + ': ' + m.text()); });
  await p.setViewport({ width: 1280, height: 800 });
  await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'load' });
  const frames = [];
  await p.evaluate(() => BlippiTrip.showPick && (BlippiTrip.open(), 0));
  await sleep(300); frames.push(await shot(p));
  await p.evaluate(c => BlippiTrip.open(c), cat); await sleep(300); frames.push(await shot(p));
  for (const lv of [1, 4]) {
    await p.evaluate(id => BlippiTrip.start(id, { seed: 7 }), `${cat}-${lv}`);
    await sleep(lv === 1 ? 2500 : 1500);
    const sx = 640;
    for (let i = 0; i < (lv === 1 ? 3 : 1); i++) {
      await p.mouse.move(sx, 500); await p.mouse.down(); await p.mouse.move(sx + (i % 2 ? 260 : -260), 300, { steps: 6 });
      await sleep(1600); await p.mouse.up();
      frames.push(await shot(p));
    }
  }
  const q = await b.newPage();
  const w = 1280, h = 800, cols = 3, rows = Math.ceil(frames.length / cols);
  await q.setViewport({ width: w * cols / 2, height: h * rows / 2 });
  await q.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(${cols},${w / 2}px);background:#000">${frames.map(f => `<img width=${w / 2} height=${h / 2} src="data:image/png;base64,${f}">`).join('')}</body>`);
  await q.screenshot({ path: path.join(OUT, `trip-${cat}-sheet.png`) });
  await p.close(); await q.close();
}
await b.close();
console.log(errors.length ? 'ERRORS\n' + errors.join('\n') : 'no page errors', '\nsheets in', OUT);
