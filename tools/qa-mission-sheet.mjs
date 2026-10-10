// Mission play sheets (REAL input): frames of Jalan Pertamaku and Kincir. node tools/qa-mission-sheet.mjs <outDir>
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const OUT = process.argv[2] || 'docs/sheets'; mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio'] });
const center = async (p, sel) => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
async function grid(frames, out) {
  const q = await b.newPage(); await q.setViewport({ width: 1920, height: 540 * Math.ceil(frames.length / 2) });
  await q.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(2,960px);background:#000">${frames.map(f => `<img style="width:960px;height:540px;object-fit:contain" src="data:image/png;base64,${f}">`).join('')}</body>`);
  await q.screenshot({ path: out }); await q.close();
}
const errs = [];
{ // Jalan Pertamaku
  const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
  await p.setViewport({ width: 1280, height: 800 }); await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' });
  await p.evaluate("localStorage.clear()"); await p.reload({ waitUntil: 'load' });
  const F = [];
  await p.evaluate("Blippi.go('mission',{mission:'W01-M01',vehicle:'buggy'})"); await sleep(700); F.push(await p.screenshot({ encoding: 'base64' }));
  await p.click('[data-tool=papan]');
  let c = await center(p, '[data-plank-pile]'); let t = await center(p, '[data-slot=S0]');
  await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move((c.x + t.x) / 2, (c.y + t.y) / 2 - 40, { steps: 6 }); F.push(await p.screenshot({ encoding: 'base64' }));
  await p.mouse.move(t.x, t.y, { steps: 6 }); await p.mouse.up(); await sleep(450); F.push(await p.screenshot({ encoding: 'base64' }));
  for (const s of ['S1', 'S2']) { c = await center(p, '[data-plank-pile]'); t = await center(p, `[data-slot=${s}]`); await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(t.x, t.y, { steps: 8 }); await p.mouse.up(); await sleep(600); }
  await sleep(700); F.push(await p.screenshot({ encoding: 'base64' }));
  await p.click('[data-tool=jalan]'); c = await center(p, '[data-act=jalan-hold]'); await p.mouse.move(c.x, c.y); await p.mouse.down(); await sleep(1400); F.push(await p.screenshot({ encoding: 'base64' }));
  await sleep(1200); F.push(await p.screenshot({ encoding: 'base64' })); await p.mouse.up(); await sleep(500);
  await p.click('[data-tool=paket]'); c = await center(p, '[data-box]'); await p.mouse.click(c.x, c.y); await sleep(2800); F.push(await p.screenshot({ encoding: 'base64' }));
  await grid(F, path.join(OUT, 'mission-jalan-play.png')); await p.close();
}
console.log(errs.length ? errs : 'no page errors');
await b.close();
