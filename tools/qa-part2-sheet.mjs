// Part2 mission play sheets (REAL input). node tools/qa-part2-sheet.mjs <outDir> [M04|M05] [width height]
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const OUT = process.argv[2] || 'docs/sheets'; mkdirSync(OUT, { recursive: true });
const WHICH = process.argv[3] || 'ALL';
const VW = +process.argv[4] || 1280, VH = +process.argv[5] || 800;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio'] });
const center = async (p, sel) => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
const txt = (p, sel) => p.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
async function grid(frames, out) {
  const q = await b.newPage(); await q.setViewport({ width: 1920, height: 540 * Math.ceil(frames.length / 2) });
  await q.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(2,960px);background:#000">${frames.map(f => `<img style="width:960px;height:540px;object-fit:contain" src="data:image/png;base64,${f}">`).join('')}</body>`);
  await q.screenshot({ path: out }); await q.close();
}
const errs = [];
async function open(id, veh) {
  const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g|ERR_|Failed to load/.test(m.text())) errs.push(m.text()); });
  await p.setViewport({ width: VW, height: VH }); await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' });
  await p.evaluate("localStorage.clear()"); await p.reload({ waitUntil: 'load' });
  await p.evaluate(`Blippi.go('mission',{mission:'${id}',vehicle:'${veh}'})`); await sleep(800);
  return p;
}
const shot = async p => p.screenshot({ encoding: 'base64' });
const drag = async (p, from, to) => { const c = await center(p, from); await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x + 20, c.y - 20, { steps: 3 }); return { c, up: async (t) => { await p.mouse.move(t.x, t.y, { steps: 10 }); await p.mouse.up(); } }; };
if (WHICH === 'ALL' || WHICH === 'M01') {
  const p = await open('W01-M01', 'buggy'); const F = [];
  F.push(await shot(p));
  for (const sl of ['S0', 'S1', 'S2']) { const d = await drag(p, '[data-plank-pile]'); if (sl === 'S0') F.push(await shot(p)); await d.up(await center(p, '[data-slot=' + sl + ']')); await sleep(650); if (sl === 'S0') F.push(await shot(p)); }
  await sleep(600); F.push(await shot(p));
  const g = await center(p, '[data-act=jalan-hold]'); await p.mouse.move(g.x, g.y); await p.mouse.down(); await sleep(1500); F.push(await shot(p)); await sleep(1500); F.push(await shot(p));
  await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='2'", { timeout: 14000 }); await p.mouse.up(); await sleep(500); F.push(await shot(p));
  const b0 = await drag(p, '[data-box]'); await p.mouse.move(b0.c.x + 80, b0.c.y - 60, { steps: 4 }); F.push(await shot(p)); await b0.up(await center(p, '[data-slot=prop-bendera]')); await sleep(500); F.push(await shot(p)); await sleep(1500); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-m01-${VW}x${VH}.png`)); await p.close();
}
const dg = async (p, from, to, steps = 10, mid) => { const a = await center(p, from); const t = typeof to === 'string' ? await center(p, to) : to; await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(a.x + 25, a.y - 25, { steps: 3 }); if (mid) await mid(); await p.mouse.move(t.x, t.y, { steps }); await p.mouse.up(); };
if (WHICH === 'ALL' || WHICH === 'W02M02') {
  const p = await open('W02-M02', 'truk-air'); const F = [];
  F.push(await shot(p));
  const pc = await center(p, '[data-pump]'); await p.mouse.move(pc.x, pc.y); await p.mouse.down(); await sleep(900); F.push(await shot(p)); await sleep(1500); await p.mouse.up(); await sleep(900); F.push(await shot(p)); await sleep(900);
  await dg(p, '[data-plug=kotak]', '[data-socket=coupler]', 10, async () => { F.push(await shot(p)); }); await sleep(700); F.push(await shot(p));
  await dg(p, '[data-plug=bulat]', '[data-socket=coupler]'); await sleep(1200); F.push(await shot(p));
  const q = await center(p, '[data-pump]'); await p.mouse.move(q.x, q.y); await p.mouse.down(); await sleep(1500); F.push(await shot(p)); await sleep(2200); F.push(await shot(p)); await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p)); await p.mouse.up();
  await grid(F, path.join(OUT, `mission-w02m02-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W02M03') {
  const p = await open('W02-M03', 'tow-truck'); const F = [];
  const sw = async (a, b, mid) => { const c = await center(p, a); await p.mouse.move(c.x, c.y); await p.mouse.down(); for (let i = 0; i < b.length; i++) { await p.mouse.move(b[i].x, b[i].y, { steps: 6 }); if (mid && i === 1) await mid(); } await p.mouse.up(); };
  const askFirst = async () => { await p.waitForSelector('[data-ask]', { timeout: 8000 }); await sleep(300); };
  const stage = await p.evaluate("(() => { const r = document.getElementById('stage').getBoundingClientRect(); return [r.left, r.top, r.width / 1672]; })()");
  const X = (x, y) => ({ x: stage[0] + x * stage[2], y: stage[1] + y * stage[2] });
  F.push(await shot(p));
  await dg(p, '[data-hook]', '[data-hitch]', 10, async () => { F.push(await shot(p)); }); await sleep(900); F.push(await shot(p));
  await askFirst(); F.push(await shot(p)); await p.evaluate(() => [...document.querySelectorAll('[data-choice]')].find(e => e.getAttribute('data-choice') === 'Bergerigi').click()); await sleep(1200);
  await dg(p, '[data-tire=jalan]', '[data-truck]'); await sleep(1300); F.push(await shot(p));
  const route = [X(880, 700), X(760, 650), X(640, 615), X(480, 595), X(330, 560), X(190, 500)];
  await sw('[data-truck]', route.slice(1), async () => { F.push(await shot(p)); }); await sleep(1100); F.push(await shot(p)); await sleep(1400); F.push(await shot(p)); await sleep(2800); F.push(await shot(p));
  await dg(p, '[data-tire=berpola]', '[data-truck]'); await sleep(900);
  await sw('[data-truck]', route.slice(1)); await sleep(1500); F.push(await shot(p)); await sleep(1800); F.push(await shot(p)); await sleep(1500); F.push(await shot(p));
  await askFirst(); F.push(await shot(p));
  for (let k = 0; k < 4 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); b[0] && b[0].click(); }); await sleep(500); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w02m03-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W02M04') {
  const p = await open('W02-M04', 'truk-air'); const F = [];
  F.push(await shot(p));
  const cl = await p.evaluate("Blippi.state().progress['W02-M04'].data.closed"); const op = cl === 'L' ? 'R' : 'L';
  await p.click(`[data-basin=${cl}]`); await sleep(1200); F.push(await shot(p));
  const pc = await center(p, '[data-pump]'); await p.mouse.move(pc.x, pc.y); await p.mouse.down(); await sleep(1800); F.push(await shot(p)); await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='2'", { timeout: 14000 }); await p.mouse.up(); F.push(await shot(p));
  await sleep(2500); F.push(await shot(p));
  for (let i = 0; i < 3; i++) { await p.click(`[data-valve-ch=${cl}]`); await sleep(350); if (i === 1) F.push(await shot(p)); }
  F.push(await shot(p)); await p.mouse.move(pc.x, pc.y); await p.mouse.down(); await sleep(2200); F.push(await shot(p)); await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 14000 }).catch(() => {}); F.push(await shot(p)); await p.mouse.up();
  await grid(F, path.join(OUT, `mission-w02m04-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W02M05') {
  const p = await open('W02-M05', 'truk-air'); const F = [];
  F.push(await shot(p));
  await dg(p, '[data-hose-end]', '[data-socket=inlet]', 10, async () => { F.push(await shot(p)); }); await sleep(1100); F.push(await shot(p));
  const pc = await center(p, '[data-pump]'); await p.mouse.move(pc.x, pc.y); await p.mouse.down(); await sleep(1800); F.push(await shot(p)); await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='2'", { timeout: 14000 }); await p.mouse.up(); await sleep(900); F.push(await shot(p));
  await dg(p, '[data-src=b]', '[data-socket=nozzle-a]', 10, async () => { F.push(await shot(p)); }); await sleep(900); F.push(await shot(p));
  await dg(p, '[data-src=a]', '[data-socket=nozzle-b]'); await sleep(1000); F.push(await shot(p)); await sleep(1200); F.push(await shot(p));
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w02m05-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'M02') {
  const p = await open('W01-M02', 'excavator'); const F = [];
  const askAll = async () => { await p.waitForSelector('[data-ask]', { timeout: 9000 }); await sleep(400); F.push(await shot(p)); for (let k = 0; k < 8 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); } };
  F.push(await shot(p)); await p.click('[data-act=baca]'); await askAll(); await sleep(600); F.push(await shot(p));
  const tg = await p.evaluate("Blippi.state().progress['W01-M02'].data.t");
  const wrong = [0, 1, 2, 3, 4, 5, 6, 7, 8].find(c => !tg.includes(c));
  for (const t of [wrong, ...tg]) { const c = await center(p, `[data-cell="${t}"]`); await p.mouse.click(c.x, c.y); await sleep(500); F.push(await shot(p)); await sleep(500); F.push(await shot(p)); await sleep(1900); if (t === tg[0]) F.push(await shot(p)); }
  await askAll(); await sleep(1200); F.push(await shot(p));
  await dg(p, '[data-carry="0"]', '[data-slot=park0]', 10, async () => { F.push(await shot(p)); }); await sleep(600); F.push(await shot(p));
  for (const k of [1, 2]) { await dg(p, `[data-carry="${k}"]`, `[data-slot=park${k}]`); await sleep(600); }
  await sleep(300); F.push(await shot(p)); await sleep(1600); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-m02-${VW}x${VH}.png`)); await p.close();
}
const ans = async (p, v) => { await p.waitForSelector('[data-ask]', { timeout: 8000 }); await sleep(300); await p.evaluate(x => { const b = [...document.querySelectorAll('[data-choice]')].find(e => e.getAttribute('data-choice') === x); b && b.click(); }, v); await sleep(900); };
const askRight = async (p) => { await p.waitForSelector('[data-ask]', { timeout: 8000 }); await sleep(300); const a = await p.evaluate(() => { const q = document.querySelector('[data-ask-prompt]').textContent; return q; }); return a; };
if (WHICH === 'ALL' || WHICH === 'M03') {
  const p = await open('W01-M03', 'dump-truck'); const F = [];
  F.push(await shot(p));
  for (let i = 0; i < 4; i++) { await dg(p, `[data-crate="${i}"]`, '[data-truck]', 10, async () => { if (i === 0) F.push(await shot(p)); }); await sleep(700); if (i === 1) F.push(await shot(p)); }
  await sleep(900); F.push(await shot(p)); await ans(p, '4'); await sleep(900);
  F.push(await shot(p)); await ans(p, 'Rendah'); await sleep(300); F.push(await shot(p)); await ans(p, 'Tinggi'); await sleep(500); F.push(await shot(p));
  await dg(p, '[data-truck]', '[data-ramp=low]', 10, async () => { F.push(await shot(p)); }); await sleep(1500); F.push(await shot(p)); await sleep(2600);
  await dg(p, '[data-truck]', '[data-ramp=high]'); await sleep(1300); F.push(await shot(p)); await sleep(2800);
  await sleep(1500); await p.waitForSelector('[data-ask]', { timeout: 8000 }); await sleep(300); F.push(await shot(p));
  await p.evaluate(() => { const q = document.querySelector('[data-ask-prompt]'); }); const right = await p.evaluate(() => 0);
  // answer the engine question by trying every choice until it closes
  for (let k = 0; k < 4; k++) { const open = await p.$('[data-ask]'); if (!open) break; await p.evaluate(kk => { const bs = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); bs[0] && bs[0].click(); }, k); await sleep(500); }
  await sleep(2200);
  await dg(p, '[data-truck]', '[data-ramp=low]'); await sleep(3200); F.push(await shot(p)); await sleep(1800);
  await dg(p, '[data-truck]', '[data-ramp=high]'); await sleep(3000); F.push(await shot(p));
  const t = await center(p, '[data-truck]'); await p.mouse.move(t.x, t.y); await p.mouse.down(); await sleep(900); F.push(await shot(p)); await sleep(1100); F.push(await shot(p)); await p.mouse.up(); await sleep(1500); F.push(await shot(p));
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-m03-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'M04') {
  const p = await open('W01-M04', 'truk-air'); const F = [];
  F.push(await shot(p));
  await dg(p, '[data-piece=short]', '[data-socket=span]', 10, async () => { F.push(await shot(p)); }); await sleep(500); F.push(await shot(p)); await sleep(2800);
  await dg(p, '[data-piece=post]', '[data-socket=post]'); await sleep(700);
  const sp = await p.evaluate("(() => { const r = document.querySelector('[data-socket=span]').getBoundingClientRect(); return { x: r.x, y: r.y + r.height / 2, w: r.width }; })()");
  await dg(p, '[data-piece=short]', { x: sp.x + sp.w * 0.25, y: sp.y }); await sleep(600); await dg(p, '[data-piece=short]', { x: sp.x + sp.w * 0.75, y: sp.y }); await sleep(1500); F.push(await shot(p));
  const t = await center(p, '[data-truck]'); await p.mouse.move(t.x, t.y); await p.mouse.down(); await sleep(1500); F.push(await shot(p)); await sleep(1800); F.push(await shot(p));
  await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='2'", { timeout: 16000 }); await p.mouse.up(); await sleep(600); F.push(await shot(p));
  await dg(p, '[data-box]', '[data-dropzone]', 10, async () => { F.push(await shot(p)); }); await sleep(700); F.push(await shot(p)); await sleep(2500); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-m04-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'M05') {
  const p = await open('W01-M05', 'excavator'); const F = [];
  F.push(await shot(p));
  await dg(p, '[data-src=cart]', '[data-zone=mainan]'); await sleep(500); F.push(await shot(p));
  await dg(p, '[data-src=gate]', '[data-zone=gerbang]', 10, async () => { F.push(await shot(p)); }); await sleep(1000);
  for (let i = 0; i < 2; i++) { await dg(p, '[data-src=sand]', '[data-zone=pasir]'); await sleep(1000); if (i === 0) F.push(await shot(p)); }
  F.push(await shot(p)); await dg(p, '[data-src=cart]', '[data-zone=mainan]'); await sleep(900); F.push(await shot(p)); await sleep(1500); F.push(await shot(p));
  const g = await center(p, '[data-gatezone]'); await p.mouse.click(g.x, g.y); await sleep(600); F.push(await shot(p)); await sleep(3600); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-m05-${VW}x${VH}.png`)); await p.close();
}
console.log(errs.length ? errs : 'no page errors');
await b.close();
