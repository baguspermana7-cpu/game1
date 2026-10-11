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
  const askAll = async () => { await p.waitForSelector('[data-ask]', { timeout: 9000 }); await sleep(400); F.push(await shot(p)); for (let k = 0; k < 8 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); } };
  F.push(await shot(p));
  for (const sl of ['T0', 'T1']) { const d = await drag(p, '[data-plank-pile]'); if (sl === 'T0') F.push(await shot(p)); await d.up(await center(p, '[data-slot=' + sl + ']')); await sleep(650); if (sl === 'T0') F.push(await shot(p)); }
  await askAll(); await sleep(600); F.push(await shot(p));
  const g = await center(p, '[data-act=jalan-hold]'); await p.mouse.move(g.x, g.y); await p.mouse.down(); await sleep(1500); F.push(await shot(p)); await sleep(1500); F.push(await shot(p));
  await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='2'", { timeout: 14000 }); await p.mouse.up(); await sleep(500); F.push(await shot(p));
  const b0 = await drag(p, '[data-box]'); await p.mouse.move(b0.c.x + 80, b0.c.y - 60, { steps: 4 }); F.push(await shot(p)); await b0.up(await center(p, '[data-slot=prop-bendera]')); await sleep(500); F.push(await shot(p)); await askAll(); await sleep(1200); if (await p.$('[data-ask]')) await askAll(); await sleep(600); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-m01-${VW}x${VH}.png`)); await p.close();
}
const dg = async (p, from, to, steps = 10, mid) => { const a = await center(p, from); const t = typeof to === 'string' ? await center(p, to) : to; await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(a.x + 25, a.y - 25, { steps: 3 }); if (mid) await mid(); await p.mouse.move(t.x, t.y, { steps }); await p.mouse.up(); };
if (WHICH === 'ALL' || WHICH === 'W02M01') {
  const p = await open('W02-M01', 'truk-air'); const F = [];
  const askAll = async () => { await p.waitForSelector('[data-ask]', { timeout: 14000 }); await sleep(400); F.push(await shot(p)); for (let k = 0; k < 8 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); } };
  F.push(await shot(p));
  await dg(p, '[data-hose-end]', '[data-target=inlet]', 12, async () => { F.push(await shot(p)); }); await sleep(700); F.push(await shot(p)); await askAll(); await sleep(700); F.push(await shot(p));
  for (let k = 0; k < 3; k++) { const v = await center(p, '[data-valve]'); await p.mouse.click(v.x, v.y); await sleep(300); if (k === 1) F.push(await shot(p)); }
  await askAll(); await sleep(700); F.push(await shot(p));
  const c = await center(p, '.pumpunit'); await p.mouse.move(c.x, c.y); await p.mouse.down(); await sleep(1200); F.push(await shot(p)); await p.waitForSelector('[data-ask]', { timeout: 14000 }); await p.mouse.up(); await askAll();
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); await sleep(500); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w02m01-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W02M02') {
  const p = await open('W02-M02', 'truk-air'); const F = [];
  const askAll = async () => { await p.waitForSelector('[data-ask]', { timeout: 12000 }); await sleep(400); F.push(await shot(p)); for (let k = 0; k < 8 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); } };
  F.push(await shot(p));
  const pc = await center(p, '[data-pump]'); await p.mouse.move(pc.x, pc.y); await p.mouse.down(); await sleep(900); F.push(await shot(p)); await sleep(1500); await p.mouse.up(); await askAll(); await sleep(900); F.push(await shot(p)); await sleep(900);
  await dg(p, '[data-plug=kotak]', '[data-socket=coupler]', 10, async () => { F.push(await shot(p)); }); await sleep(700); F.push(await shot(p));
  await dg(p, '[data-plug=bulat]', '[data-socket=coupler]'); await sleep(1200); F.push(await shot(p));
  const q = await center(p, '[data-pump]'); await p.mouse.move(q.x, q.y); await p.mouse.down(); await sleep(1500); F.push(await shot(p)); await sleep(2200); F.push(await shot(p)); await p.waitForSelector('[data-ask]', { timeout: 12000 }).catch(() => {}); await p.mouse.up(); await askAll(); await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
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
  const askAll = async () => { await p.waitForSelector('[data-ask]', { timeout: 14000 }); await sleep(400); F.push(await shot(p)); for (let k = 0; k < 8 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); } };
  F.push(await shot(p));
  const cl = await p.evaluate("Blippi.state().progress['W02-M04'].data.closed"); const op = cl === 'L' ? 'R' : 'L';
  await p.click(`[data-basin=${cl}]`); await sleep(1200); F.push(await shot(p));
  const pc = await center(p, '[data-pump]'); await p.mouse.move(pc.x, pc.y); await p.mouse.down(); await sleep(1800); F.push(await shot(p)); await p.waitForSelector('[data-ask]', { timeout: 14000 }); await p.mouse.up(); await askAll(); await sleep(600); F.push(await shot(p));
  await sleep(2500); F.push(await shot(p));
  for (let i = 0; i < 3; i++) { await p.click(`[data-valve-ch=${cl}]`); await sleep(350); if (i === 1) F.push(await shot(p)); }
  F.push(await shot(p)); await p.mouse.move(pc.x, pc.y); await p.mouse.down(); await sleep(1500); F.push(await shot(p)); await p.waitForSelector('[data-ask]', { timeout: 14000 }); await p.mouse.up(); await askAll(); await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w02m04-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W02M05') {
  const p = await open('W02-M05', 'truk-air'); const F = [];
  const askAll = async () => { await p.waitForSelector('[data-ask]', { timeout: 14000 }); await sleep(400); F.push(await shot(p)); for (let k = 0; k < 8 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); } };
  F.push(await shot(p));
  await dg(p, '[data-hose-end]', '[data-socket=inlet]', 10, async () => { F.push(await shot(p)); }); await askAll(); await sleep(700); F.push(await shot(p));
  const pc = await center(p, '[data-pump]'); await p.mouse.move(pc.x, pc.y); await p.mouse.down(); await sleep(1800); F.push(await shot(p)); await p.waitForSelector('[data-ask]', { timeout: 14000 }); await p.mouse.up(); await askAll(); await sleep(900); F.push(await shot(p));
  await dg(p, '[data-src=b]', '[data-socket=nozzle-a]', 10, async () => { F.push(await shot(p)); }); await sleep(900); F.push(await shot(p));
  await dg(p, '[data-src=a]', '[data-socket=nozzle-b]'); await sleep(1000); F.push(await shot(p)); await askAll();
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
  const p = await open('W01-M04', 'mobile-crane'); const F = [];
  const askAll = async () => { await p.waitForSelector('[data-ask]', { timeout: 20000 }); await sleep(400); F.push(await shot(p)); for (let k = 0; k < 8 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); } };
  const lift = async (sel, to, snap) => { await dg(p, '[data-hook]', sel, 10, async () => { if (snap) F.push(await shot(p)); }); await sleep(700); if (snap) F.push(await shot(p)); const t = typeof to === 'string' ? await center(p, to) : to; await dg(p, '[data-hook]', { x: t.x, y: t.y - 40 }, 10, async () => { if (snap) F.push(await shot(p)); }); await sleep(900); if (snap) F.push(await shot(p)); };
  F.push(await shot(p));
  try {
  await lift('[data-piece=short]', '[data-socket=span]', true); await sleep(2200);
  await lift('[data-piece=post]', '[data-socket=post]', false);
  const sp = await p.evaluate("(() => { const r = document.querySelector('[data-socket=span]').getBoundingClientRect(); return { x: r.x, y: r.y + r.height / 2, w: r.width }; })()");
  await lift('[data-piece=short]', { x: sp.x + sp.w * 0.25, y: sp.y + 40 }, false); await lift('[data-piece=short]', { x: sp.x + sp.w * 0.75, y: sp.y + 40 }, true); await sleep(800);
  await askAll(); await sleep(700);
  const t = await center(p, '[data-truck]'); await p.mouse.move(t.x, t.y); await p.mouse.down(); await sleep(1500); F.push(await shot(p)); await p.waitForSelector('[data-ask]', { timeout: 20000 }); await p.mouse.up(); await askAll(); await sleep(600); F.push(await shot(p));
  await lift('[data-box]', '[data-dropzone]', true); await sleep(500); await askAll(); await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  } catch (e) { console.log('M04 sheet error:', String(e).slice(0, 160)); F.push(await shot(p)); }
  await grid(F, path.join(OUT, `mission-m04-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'M05') {
  const p = await open('W01-M05', 'excavator'); const F = [];
  const askAll = async () => { await p.waitForSelector('[data-ask]', { timeout: 12000 }); await sleep(400); F.push(await shot(p)); for (let k = 0; k < 8 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); } };
  F.push(await shot(p));
  await dg(p, '[data-src=cart]', '[data-zone=mainan]'); await sleep(500); F.push(await shot(p));
  await dg(p, '[data-src=gate]', '[data-zone=gerbang]', 10, async () => { F.push(await shot(p)); }); await sleep(2200); F.push(await shot(p));
  await dg(p, '[data-src=sand]', '[data-zone=pasir]', 10, async () => { F.push(await shot(p)); }); await sleep(700); F.push(await shot(p)); await askAll(); await sleep(500);
  await dg(p, '[data-src=cart]', '[data-zone=mainan]', 10, async () => { F.push(await shot(p)); }); await sleep(900); F.push(await shot(p)); await askAll(); await sleep(500);
  await sleep(1200); if (await p.$('[data-ask]')) await askAll(); await sleep(900); F.push(await shot(p));
  const g = await center(p, '[data-gatezone]'); await p.mouse.click(g.x, g.y); await sleep(600); F.push(await shot(p)); await sleep(3600); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-m05-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W03M01') {
  const p = await open('W03-M01', 'recycling-truck'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 9000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  F.push(await shot(p));
  await dg(p, '[data-item=gelas]', '[data-bin=logam]'); await sleep(500); F.push(await shot(p)); await sleep(400);
  const IT = [['gelas', 'plastik'], ['remuk', 'kertas'], ['kaleng', 'logam'], ['koran', 'kertas'], ['botol', 'plastik'], ['kardus', 'kertas']];
  for (let i = 0; i < IT.length; i++) { await dg(p, `[data-item=${IT[i][0]}]`, `[data-bin=${IT[i][1]}]`, 10, i === 2 ? async () => { F.push(await shot(p)); } : undefined); await sleep(700); if (i === 3) F.push(await shot(p)); }
  await ans('4'); await ans('3');
  await sleep(700); F.push(await shot(p));
  for (const k of ['kertas', 'logam', 'plastik']) { await dg(p, '[data-truck]', `[data-bin=${k}]`, 10); if (k === 'kertas') { await sleep(500); F.push(await shot(p)); } await sleep(2300); if (k === 'logam') F.push(await shot(p)); }
  await ans('6'); await sleep(1500); F.push(await shot(p));
  const t = await center(p, '[data-truck]'); await p.mouse.move(t.x, t.y); await p.mouse.down(); await sleep(1500); F.push(await shot(p)); await sleep(2300); F.push(await shot(p)); await p.mouse.up(); await sleep(900); F.push(await shot(p));
  await p.waitForSelector('[data-ask]', { timeout: 9000 }).catch(() => {}); await sleep(400); F.push(await shot(p));
  for (let k = 0; k < 6 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w03m01-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W03M02') {
  const p = await open('W03-M02', 'street-sweeper'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 9000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  const stage = await p.evaluate("(() => { const r = document.getElementById('stage').getBoundingClientRect(); return [r.left, r.top, r.width / 1672]; })()");
  const X = (x, y) => ({ x: stage[0] + x * stage[2], y: stage[1] + y * stage[2] });
  const draw = async (route, mid) => { const a0 = await center(p, '[data-truck]'); await p.mouse.move(a0.x, a0.y); await p.mouse.down(); for (let i = 0; i < route.length; i++) { await p.mouse.move(route[i].x, route[i].y, { steps: 8 }); if (mid && i === 2) await mid(); } await p.mouse.up(); };
  F.push(await shot(p));
  await draw([X(1000, 600), X(700, 590), X(320, 590)], async () => { F.push(await shot(p)); }); await p.waitForFunction("/Masih/.test(document.querySelector('[data-instr]').textContent)", { timeout: 12000 }).catch(() => {}); F.push(await shot(p));
  await draw([X(320, 520), X(700, 520), X(960, 520), X(960, 650), X(700, 655), X(330, 650)], async () => { F.push(await shot(p)); }); await sleep(1500); F.push(await shot(p));
  await ans('7'); await sleep(1500); F.push(await shot(p));
  await ans('Lingkaran'); await sleep(800); F.push(await shot(p));
  await dg(p, '[data-spare=segitiga]', '[data-gap]'); await sleep(700); F.push(await shot(p));
  await dg(p, '[data-spare=lingkaran]', '[data-gap]'); await sleep(1500); F.push(await shot(p));
  for (let i = 0; i < 8; i++) { await p.click(`[data-board="${i}"]`); await sleep(260); if (i === 3) F.push(await shot(p)); }
  await ans('4'); await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w03m02-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W05M01') {
  const p = await open('W05-M01', 'harbor-ferry'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 9000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  F.push(await shot(p)); await ans('3'); await sleep(500); F.push(await shot(p));
  for (let i = 0; i < 3; i++) { await dg(p, `[data-crate="${i}"]`, '[data-ferry]', 10, i === 0 ? async () => { F.push(await shot(p)); } : undefined); await sleep(900); if (i === 1) F.push(await shot(p)); }
  await sleep(1300); F.push(await shot(p));
  const tg = await p.evaluate("document.querySelector('[data-flag]').getAttribute('data-flag')"); const wr = tg === 'a' ? 'b' : 'a';
  const wx = await p.evaluate(k => { const s = document.getElementById('stage').getBoundingClientRect(); return [s.left, s.top, s.width / 1672]; }, 0);
  const X = (x, y) => ({ x: wx[0] + x * wx[2], y: wx[1] + y * wx[2] });
  const DX = { a: 985, b: 1465 }; const DY = { a: 580, b: 566 };
  const fc = await center(p, '[data-ferry]');
  await p.mouse.move(fc.x, fc.y); await p.mouse.down(); await p.mouse.move(X(DX[wr], 500).x, fc.y, { steps: 14 }); await p.mouse.up(); await sleep(1300); F.push(await shot(p));
  const fc2 = await center(p, '[data-ferry]'); await p.mouse.move(fc2.x, fc2.y); await p.mouse.down(); await p.mouse.move(X(DX[tg] - 200, 500).x, fc2.y, { steps: 10 }); F.push(await shot(p)); await p.mouse.move(X(DX[tg], 500).x, fc2.y, { steps: 10 }); await p.mouse.up(); await sleep(1500); F.push(await shot(p));
  for (let i = 0; i < 3; i++) { await p.click(`[data-deckcrate="${i}"]`); await sleep(900); if (i === 0) F.push(await shot(p)); }
  await sleep(500); await ans('5'); await sleep(500);
  for (let k = 0; k < 4 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); b[0] && b[0].click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w05m01-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W04M01') {
  const p = await open('W04-M01', 'farm-tractor'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 9000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  F.push(await shot(p));
  const t = await center(p, '[data-tractor]'); await p.mouse.move(t.x, t.y); await p.mouse.down(); await sleep(1300); F.push(await shot(p)); await sleep(1500); F.push(await shot(p));
  await p.waitForSelector('[data-ask]', { timeout: 9000 }); await p.mouse.up(); await ans('6'); await sleep(1200); F.push(await shot(p));
  await dg(p, '[data-pile=wortel]', '[data-trailer]', 10, async () => { F.push(await shot(p)); }); await sleep(600);
  for (const k of ['tomat', 'wortel', 'tomat', 'wortel', 'tomat']) { await dg(p, `[data-pile=${k}]`, '[data-trailer]'); await sleep(600); }
  F.push(await shot(p)); await ans('Tomat'); await sleep(1500); F.push(await shot(p));
  await dg(p, '[data-pile=tomat]', '[data-gap="0"]'); await sleep(500); F.push(await shot(p));
  for (const [k, i] of [['wortel', 0], ['tomat', 1], ['wortel', 2]]) { await dg(p, `[data-pile=${k}]`, `[data-gap="${i}"]`, 10, i === 1 ? async () => { F.push(await shot(p)); } : undefined); await sleep(650); }
  await dg(p, '[data-pile=tomat]', '[data-gap="3"]'); await sleep(900); await ans('Wortel'); await sleep(500); F.push(await shot(p));
  for (const [k, i] of [['wortel', 4], ['tomat', 5]]) { await dg(p, `[data-pile=${k}]`, `[data-gap="${i}"]`); await sleep(650); }
  await sleep(900); F.push(await shot(p));
  await p.waitForSelector('[data-ask]', { timeout: 9000 }).catch(() => {}); await sleep(400); F.push(await shot(p));
  for (let k = 0; k < 6 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w04m01-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W03M03') {
  const p = await open('W03-M03', 'recycling-truck'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 12000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  F.push(await shot(p));
  await dg(p, '[data-gear=kuning]', '[data-sock=a]'); await sleep(600); F.push(await shot(p)); await sleep(2800);
  await dg(p, '[data-gear=kuning]', '[data-sock=big]', 10, async () => { F.push(await shot(p)); }); await sleep(700);
  await dg(p, '[data-gear=biru]', '[data-sock=a]'); await sleep(700); F.push(await shot(p));
  await dg(p, '[data-gear=merah]', '[data-sock=b]'); await sleep(2200); F.push(await shot(p));
  await ans('Kuning'); await sleep(1500); F.push(await shot(p));
  const KIND = { koran: 'kertas', gelas: 'plastik', kaleng: 'logam', kardus: 'kertas', botol: 'plastik', kaleng2: 'logam' };
  for (let i = 0; i < 6; i++) {
    await p.waitForFunction("!!document.querySelector('[data-item]') && document.querySelector('[data-item]').style.left === '815px'", { timeout: 6000 }).catch(() => {});
    const id = await p.evaluate("document.querySelector('[data-item]').getAttribute('data-item')");
    if (i === 0) { F.push(await shot(p)); await p.click('[data-bin=logam]'); await sleep(500); F.push(await shot(p)); await sleep(2800); }
    await p.click(`[data-bin=${KIND[id]}]`); await sleep(1300); if (i === 2) F.push(await shot(p));
  }
  await ans('6'); await sleep(1500); F.push(await shot(p));
  const t = await center(p, '[data-truck]'); await p.mouse.move(t.x, t.y); await p.mouse.down(); await sleep(1200); F.push(await shot(p)); await p.waitForFunction("document.querySelector('[data-goal]').style.display === 'none'", { timeout: 15000 }).catch(() => {}); await p.mouse.up(); await sleep(1500); F.push(await shot(p)); await sleep(1500); F.push(await shot(p));
  await p.waitForSelector('[data-ask]', { timeout: 12000 }).catch(() => {}); await sleep(400); F.push(await shot(p));
  for (let k = 0; k < 6 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w03m03-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W05M02') {
  const p = await open('W05-M02', 'mobile-crane'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 9000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  const lift = async (piece, ghost, snap) => { await dg(p, '[data-hook]', `[data-piece=${piece}]`, 10, snap ? async () => { F.push(await shot(p)); } : undefined); await sleep(700); if (snap) F.push(await shot(p)); await dg(p, '[data-hook]', `[data-ghost=${ghost}]`, 12, snap ? async () => { F.push(await shot(p)); } : undefined); await sleep(1000); };
  F.push(await shot(p));
  try {
  await lift('lingkaran', 'persegi', false); F.push(await shot(p));
  await lift('lingkaran', 'lingkaran', true); F.push(await shot(p));
  await lift('persegi', 'persegi', false); await lift('segitiga', 'segitiga', false); await sleep(600);
  await ans('Segitiga'); await sleep(1300); F.push(await shot(p));
  await lift('small', 'big', false); F.push(await shot(p));
  await lift('big', 'big', true); F.push(await shot(p));
  await lift('small', 'small', false); await sleep(1500); F.push(await shot(p));
  for (const i of [0, 1, 2, 3, 4]) { const id = ['big', 'small', 'lingkaran', 'persegi', 'segitiga'][i]; const cc = await center(p, `[data-piece=${id}]`); await p.mouse.click(cc.x, cc.y); await sleep(350); if (i === 2) F.push(await shot(p)); }
  F.push(await shot(p)); await ans('5'); await sleep(600);
  for (let k = 0; k < 4 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  } catch (e) { console.log('W05M02 sheet error:', String(e).slice(0, 140)); F.push(await shot(p)); }
  await grid(F, path.join(OUT, `mission-w05m02-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W04M02') {
  const p = await open('W04-M02', 'farm-tractor'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 9000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  F.push(await shot(p));
  await dg(p, '[data-pcard=kanan]', '[data-slot="0"]', 10, async () => { F.push(await shot(p)); }); await sleep(400);
  for (const k of ['kanan', 'kanan']) { await p.click(`[data-pcard=${k}]`); await sleep(250); }
  F.push(await shot(p));
  await p.click('[data-act=jalan-go]'); await sleep(1500); F.push(await shot(p)); await sleep(2200); F.push(await shot(p)); await sleep(1800);
  await p.click('[data-act=ulang]'); await sleep(300);
  await dg(p, '[data-pcard=bawah]', '[data-slot="0"]'); await sleep(300);
  for (const k of ['kanan', 'kanan', 'kanan', 'atas']) { await p.click(`[data-pcard=${k}]`); await sleep(250); }
  F.push(await shot(p));
  await p.click('[data-act=jalan-go]'); await sleep(1500); F.push(await shot(p)); await sleep(2400); F.push(await shot(p));
  await ans('3'); await sleep(1200); F.push(await shot(p));
  const t = await center(p, '[data-tractor]'); await p.mouse.move(t.x, t.y); await p.mouse.down(); await sleep(1200); F.push(await shot(p)); await sleep(1800); F.push(await shot(p));
  await p.waitForSelector('[data-ask]', { timeout: 9000 }).catch(() => {}); await p.mouse.up(); await sleep(300);
  for (let k = 0; k < 6 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.getAttribute('data-choice') === 'Air') || b.find(e => e.classList.contains('glow')) || b[0]; g && g.click(); }); await sleep(900); if (k === 0) F.push(await shot(p)); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w04m02-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W03M04') {
  const p = await open('W03-M04', 'recycling-truck'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 12000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  F.push(await shot(p));
  await p.click('[data-item=koran]'); await sleep(500); F.push(await shot(p)); await sleep(2800);
  for (const k of ['kardus', 'tabung', 'kardus2']) { await p.click(`[data-item=${k}]`); await sleep(1100); if (k === 'tabung') F.push(await shot(p)); }
  await ans('3'); await sleep(1500); F.push(await shot(p));
  await p.waitForSelector('[data-build]', { timeout: 6000 }).catch(() => {}); await sleep(700); F.push(await shot(p));
  await p.click('[data-build=tunnel]'); await sleep(800); F.push(await shot(p));
  await dg(p, '[data-piece=tabung]', '[data-ghost-build="1"]'); await sleep(800); F.push(await shot(p)); await sleep(2800);
  await dg(p, '[data-piece=tabung]', '[data-ghost-build="0"]'); await sleep(800);
  await dg(p, '[data-piece=kardus]', '[data-ghost-build="1"]'); await sleep(800); F.push(await shot(p));
  await dg(p, '[data-piece=kardus2]', '[data-ghost-build="2"]'); await sleep(1200); F.push(await shot(p));
  await ans('3'); await sleep(1500); F.push(await shot(p));
  await p.click('[data-girl]'); await sleep(900); F.push(await shot(p)); await sleep(900); F.push(await shot(p));
  await p.waitForSelector('[data-ask]', { timeout: 9000 }).catch(() => {}); await sleep(400); F.push(await shot(p));
  for (let k = 0; k < 6 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w03m04-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W05M03') {
  const p = await open('W05-M03', 'harbor-ferry'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 9000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  const st = await p.evaluate("(() => { const r = document.getElementById('stage').getBoundingClientRect(); return [r.left, r.top, r.width / 1672]; })()");
  const X = (x, y) => ({ x: st[0] + x * st[2], y: st[1] + y * st[2] });
  F.push(await shot(p));
  try {
  await ans('Kiri'); await sleep(900); F.push(await shot(p)); await sleep(1500); await ans('3'); await sleep(500); F.push(await shot(p));
  await dg(p, '[data-crate="3"]', X(1030, 540), 12, async () => { F.push(await shot(p)); }); await sleep(900); F.push(await shot(p));
  await dg(p, '[data-crate="4"]', X(1030, 540)); await sleep(900); await dg(p, '[data-crate="5"]', X(1030, 540)); await sleep(900); F.push(await shot(p));
  await dg(p, '[data-crate="6"]', X(1030, 540)); await sleep(900);
  await sleep(1500); F.push(await shot(p));
  } catch (e) { console.log('W05M03 sheet error (part 1):', String(e).slice(0, 140)); F.push(await shot(p)); }
  try {
  await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='2'", { timeout: 6000 }); await sleep(800); F.push(await shot(p));
  await dg(p, '[data-crate="0"]', X(1030, 540), 12, async () => { F.push(await shot(p)); }); await sleep(900); F.push(await shot(p));
  await dg(p, '[data-crate="1"]', X(1030, 540)); await sleep(1500); F.push(await shot(p));
  await ans('2'); await sleep(500);
  for (let k = 0; k < 4 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  } catch (e) { console.log('W05M03 sheet error (part 2):', String(e).slice(0, 140)); F.push(await shot(p)); }
  await grid(F, path.join(OUT, `mission-w05m03-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W05M04') {
  const p = await open('W05-M04', 'dump-truck'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 9000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  const st = await p.evaluate("(() => { const r = document.getElementById('stage').getBoundingClientRect(); return [r.left, r.top, r.width / 1672]; })()");
  const X = (x, y) => ({ x: st[0] + x * st[2], y: st[1] + y * st[2] });
  F.push(await shot(p));
  try {
  await ans('3'); await sleep(400); F.push(await shot(p));
  await dg(p, '[data-mod=m1a]', X(730, 470), 12, async () => { F.push(await shot(p)); }); await sleep(800);
  await dg(p, '[data-mod=m1b]', X(890, 470)); await sleep(800); F.push(await shot(p));
  await dg(p, '[data-mod=m2]', X(1000, 470)); await sleep(700); F.push(await shot(p));
  await dg(p, '[data-mod=m1c]', X(1040, 470)); await sleep(1000);
  await ans('3'); await sleep(900); F.push(await shot(p));
  const t = await center(p, '[data-truck]'); await p.mouse.move(t.x, t.y); await p.mouse.down(); await sleep(1400); F.push(await shot(p)); await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='2'", { timeout: 9000 }); await p.mouse.up(); await sleep(900); F.push(await shot(p));
  const ord = (await p.evaluate("document.querySelector('[data-order]').getAttribute('data-order')")).split(',');
  const wrong = ord[1]; const c0 = await center(p, `[data-ord=${wrong}]`); await p.mouse.click(c0.x, c0.y); await sleep(500); F.push(await shot(p));
  for (let i = 0; i < 3; i++) { const c = await center(p, `[data-ord=${ord[i]}]`); await p.mouse.click(c.x, c.y); await sleep(1000); if (i === 1) F.push(await shot(p)); }
  await ans('5'); await sleep(500);
  for (let k = 0; k < 4 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  } catch (e) { console.log('W05M04 sheet error:', String(e).slice(0, 140)); F.push(await shot(p)); }
  await grid(F, path.join(OUT, `mission-w05m04-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W05M05') {
  const p = await open('W05-M05', 'harbor-ferry'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 12000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  const st = await p.evaluate("(() => { const r = document.getElementById('stage').getBoundingClientRect(); return [r.left, r.top, r.width / 1672]; })()");
  const X = (x, y) => ({ x: st[0] + x * st[2], y: st[1] + y * st[2] });
  const tg = await p.evaluate("document.querySelector('[data-flag]').getAttribute('data-flag')");
  const DOCK = { a: [1140, 320], b: [1110, 430], c: [1150, 690] }; const wr = tg === 'a' ? 'c' : 'a';
  const route = async (pts, mid) => { const c = await center(p, '[data-ferry]'); await p.mouse.move(c.x, c.y); await p.mouse.down(); for (let i = 0; i < pts.length; i++) { await p.mouse.move(X(...pts[i]).x, X(...pts[i]).y, { steps: 10 }); if (mid && i === 1) await mid(); } await p.mouse.up(); await sleep(700); };
  F.push(await shot(p));
  try {
  await route([[880, 640], [700, 600], [650, 560]]); F.push(await shot(p));
  await route([[1040, 620], [1090, 520], DOCK[wr]]); F.push(await shot(p));
  await route([[1040, 640], [1070, 540], DOCK[tg]], async () => { F.push(await shot(p)); }); await sleep(900); F.push(await shot(p));
  await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='1'", { timeout: 5000 }); await sleep(600); F.push(await shot(p));
  await dg(p, '[data-crate="0"]', X(940, 590), 12, async () => { F.push(await shot(p)); }); await sleep(700);
  await dg(p, '[data-crate="1"]', X(940, 590)); await sleep(700);
  await dg(p, '[data-crate="2"]', X(1080, 590)); await sleep(700); F.push(await shot(p));
  await dg(p, '[data-crate="3"]', X(1080, 590)); await sleep(1100); F.push(await shot(p));
  await ans('2'); await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='2'", { timeout: 5000 }); await sleep(600); F.push(await shot(p));
  const fc = await center(p, '[data-ferry]'); await p.mouse.move(fc.x, fc.y); await p.mouse.down(); await sleep(1500); F.push(await shot(p)); await sleep(1500); F.push(await shot(p));
  await p.waitForFunction("document.querySelectorAll('[data-num]').length >= 2", { timeout: 9000 }); await p.mouse.up(); await sleep(400); F.push(await shot(p));
  await ans('7'); await sleep(500);
  for (let k = 0; k < 4 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  } catch (e) { console.log('W05M05 sheet error:', String(e).slice(0, 140)); F.push(await shot(p)); }
  await grid(F, path.join(OUT, `mission-w05m05-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W03M05') {
  const p = await open('W03-M05', 'recycling-truck'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 12000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  F.push(await shot(p));
  await dg(p, '[data-veh-btn=truck]', '[data-job=leaf]'); await sleep(700); F.push(await shot(p)); await sleep(2800);
  await dg(p, '[data-veh-btn=truck]', '[data-job=litter]', 10, async () => { F.push(await shot(p)); }); await sleep(1400); F.push(await shot(p)); await sleep(2200);
  await dg(p, '[data-veh-btn=sweeper]', '[data-job=leaf]'); await sleep(900); F.push(await shot(p)); await sleep(1800);
  await ans('5'); await sleep(1500); F.push(await shot(p));
  const PADS = ['0', '1', '2'];
  for (const [i, d] of [['ayun', 1], ['seluncur', 0], ['jungkat', 2]].entries()) { await dg(p, `[data-decor=${d[0]}]`, `[data-pad="${d[1]}"]`); await sleep(900); if (i === 1) F.push(await shot(p)); }
  await ans('3'); await sleep(1500); F.push(await shot(p));
  await p.click('[data-ribbon]'); await sleep(900); F.push(await shot(p)); await sleep(1500); F.push(await shot(p));
  await ans('3'); await sleep(900);
  await p.waitForSelector('[data-ask]', { timeout: 9000 }).catch(() => {}); await sleep(400); F.push(await shot(p));
  for (let k = 0; k < 6 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w03m05-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W06M01') {
  const p = await open('W06-M01', 'monster-truck'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 12000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  const stage = await p.evaluate("(() => { const r = document.getElementById('stage').getBoundingClientRect(); return [r.left, r.top, r.width / 1672]; })()");
  const X = (x, y) => ({ x: stage[0] + x * stage[2], y: stage[1] + y * stage[2] });
  F.push(await shot(p));
  await ans('Bergerigi'); await sleep(600); F.push(await shot(p));
  await dg(p, '[data-tire=jalan]', '[data-truck]'); await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='1'", { timeout: 6000 }).catch(() => {}); await sleep(500); F.push(await shot(p));
  await dg(p, '[data-truck]', X(480, 650), 10, async () => { F.push(await shot(p)); }); await sleep(2200); F.push(await shot(p)); await p.waitForFunction("/tergelincir/.test(document.querySelector('[data-instr]').textContent)", { timeout: 9000 }).catch(() => {}); await sleep(1800); F.push(await shot(p));
  await dg(p, '[data-tire=berpola]', '[data-truck]'); await sleep(900);
  await dg(p, '[data-truck]', X(480, 650)); await sleep(2800); F.push(await shot(p)); await p.waitForFunction("!!document.querySelector('[data-time=mud]') && document.querySelector('[data-time=mud]').style.display === 'flex'", { timeout: 12000 }).catch(() => {}); await sleep(2200); F.push(await shot(p));
  await dg(p, '[data-truck]', X(800, 570)); await sleep(1800); F.push(await shot(p)); await p.waitForSelector('[data-ask]', { timeout: 12000 }).catch(() => {}); await sleep(500); F.push(await shot(p));
  await ans('Kayu'); await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='2'", { timeout: 6000 }).catch(() => {}); await sleep(900); F.push(await shot(p));
  for (let i = 0; i < 3; i++) { const c = await center(p, '[data-truck]'); await p.mouse.click(c.x, c.y); await sleep(i === 2 ? 450 : 700); if (i > 0) F.push(await shot(p)); }
  await p.waitForSelector('[data-ask]', { timeout: 9000 }).catch(() => {}); await sleep(400); F.push(await shot(p));
  for (let k = 0; k < 6 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w06m01-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W06M02') {
  const p = await open('W06-M02', 'monster-truck'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 12000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  const hold = async (sel, ms) => { const c = await center(p, sel); await p.mouse.move(c.x, c.y); await p.mouse.down(); await sleep(ms); await p.mouse.up(); };
  const stage = await p.evaluate("(() => { const r = document.getElementById('stage').getBoundingClientRect(); return [r.left, r.top, r.width / 1672]; })()");
  const X = (x, y) => ({ x: stage[0] + x * stage[2], y: stage[1] + y * stage[2] });
  F.push(await shot(p));
  await ans('Hijau'); await sleep(500); F.push(await shot(p));
  await hold('[data-disp=merah]', 400); await sleep(400); F.push(await shot(p)); await sleep(2800);
  await hold('[data-disp=biru]', 900); await sleep(500); F.push(await shot(p));
  await hold('[data-disp=biru]', 900); await sleep(500);
  await hold('[data-disp=kuning]', 900); await sleep(300); F.push(await shot(p));
  await hold('[data-disp=kuning]', 900); await sleep(1400); F.push(await shot(p));
  await ans('4'); await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='1'", { timeout: 6000 }).catch(() => {}); await sleep(600); F.push(await shot(p));
  await dg(p, '[data-roller]', X(1370, 640), 6); await sleep(700);
  await dg(p, '[data-roller]', '[data-bowl]', 10, async () => { F.push(await shot(p)); }); await sleep(500); F.push(await shot(p));
  const r0 = await center(p, '[data-roller]');
  await p.mouse.move(r0.x, r0.y); await p.mouse.down(); await p.mouse.move(X(1420, 480).x, X(1420, 480).y, { steps: 8 });
  for (const yy of [450, 500, 550]) { await p.mouse.move(X(1590, yy).x, X(1590, yy).y, { steps: 8 }); await p.mouse.move(X(1380, yy + 20).x, X(1380, yy + 20).y, { steps: 8 }); if (yy === 500) F.push(await shot(p)); }
  await p.mouse.up(); await sleep(1500); F.push(await shot(p));
  await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='2'", { timeout: 6000 }).catch(() => {}); await sleep(500); F.push(await shot(p));
  await dg(p, '[data-door]', '[data-truck]', 10, async () => { F.push(await shot(p)); }); await sleep(600); F.push(await shot(p)); await sleep(1500); F.push(await shot(p));
  await p.waitForSelector('[data-ask]', { timeout: 9000 }).catch(() => {}); await sleep(400); F.push(await shot(p));
  for (let k = 0; k < 6 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w06m02-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W04M03') {
  const p = await open('W04-M03', 'forklift'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 9000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  F.push(await shot(p));
  await dg(p, '[data-basket="0"]', '[data-gap="R0"]'); await sleep(500); F.push(await shot(p));
  for (let i = 0; i < 4; i++) { await dg(p, `[data-basket="${i}"]`, `[data-gap="L${i}"]`, 10, i === 1 ? async () => { F.push(await shot(p)); } : undefined); await sleep(800); if (i === 2) F.push(await shot(p)); }
  await sleep(1200); F.push(await shot(p));
  await ans('4'); await sleep(1000); await ans('Seimbang'); await sleep(500); F.push(await shot(p));
  await dg(p, '[data-basket="0"]', '[data-gap="R0"]'); await sleep(900); F.push(await shot(p));
  await dg(p, '[data-basket="1"]', '[data-gap="R1"]'); await sleep(1500); F.push(await shot(p));
  await ans('4'); await sleep(2200); F.push(await shot(p));
  const t = await center(p, '[data-forklift]'); await p.mouse.move(t.x, t.y); await p.mouse.down(); await sleep(1800); F.push(await shot(p)); await sleep(1700); F.push(await shot(p));
  await p.waitForFunction("!!document.querySelector('[data-ask]') || document.querySelector('[data-load]').style.display==='none'", { timeout: 9000 }).catch(() => {}); await p.mouse.up(); await sleep(900); F.push(await shot(p));
  await p.waitForSelector('[data-ask]', { timeout: 9000 }).catch(() => {}); await sleep(400); F.push(await shot(p));
  for (let k = 0; k < 6 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w04m03-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W06M03') {
  const p = await open('W06-M03', 'monster-truck'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 12000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  F.push(await shot(p));
  await dg(p, '[data-piece=b1]', '[data-slot="0"]'); await sleep(600); F.push(await shot(p)); await sleep(2800);
  const ORDER = [['l4', 0], ['b1', 1], ['l3', 2], ['t1', 3], ['l2', 5], ['l1', 6]];
  for (const [i, o] of ORDER.entries()) { await dg(p, `[data-piece=${o[0]}]`, `[data-slot="${o[1]}"]`, 10, i === 1 ? async () => { F.push(await shot(p)); } : undefined); await sleep(800); if (i === 3) F.push(await shot(p)); }
  await ans('6'); await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='1'", { timeout: 6000 }).catch(() => {}); await sleep(600); F.push(await shot(p));
  await p.click('[data-truck]'); await sleep(1500); F.push(await shot(p)); await sleep(1300); F.push(await shot(p)); await sleep(1200); F.push(await shot(p)); await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='2'", { timeout: 14000 }).catch(() => {}); await sleep(600); F.push(await shot(p));
  await dg(p, '[data-piece=h1]', '[data-slot="3"]', 10, async () => { F.push(await shot(p)); }); await sleep(800); F.push(await shot(p));
  await p.click('[data-truck]'); await sleep(1700); F.push(await shot(p)); await sleep(1500); F.push(await shot(p)); await sleep(1500); F.push(await shot(p));
  await p.waitForSelector('[data-ask]', { timeout: 14000 }).catch(() => {}); await sleep(400); F.push(await shot(p));
  for (let k = 0; k < 6 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w06m03-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W04M04') {
  const p = await open('W04-M04', 'farm-tractor'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 9000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  F.push(await shot(p));
  const v = await center(p, '[data-tap]'); await p.mouse.move(v.x, v.y); await p.mouse.down(); await sleep(1200); F.push(await shot(p)); await sleep(1800); F.push(await shot(p));
  await p.waitForSelector('[data-ask]', { timeout: 9000 }); await p.mouse.up(); await ans('6'); await sleep(1000); F.push(await shot(p));
  const st = await p.evaluate("(() => { const r = document.getElementById('stage').getBoundingClientRect(); return [r.left, r.top, r.width / 1672]; })()");
  const X = (x, y) => ({ x: st[0] + x * st[2], y: st[1] + y * st[2] });
  const tr = async (i, xs) => { const c = await center(p, '[data-tractor]'); await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x + 60, c.y, { steps: 4 }); await p.mouse.move(X(xs, 700).x, c.y, { steps: 10 }); F.push(await shot(p)); await p.mouse.up(); await sleep(1200); F.push(await shot(p)); await sleep(1400); };
  await tr(0, 570); F.push(await shot(p)); await ans('4'); await sleep(500);
  await tr(1, 1150); await tr(2, 1500); F.push(await shot(p)); await ans('6'); await sleep(1200); F.push(await shot(p));
  await p.click('[data-bed="0"]'); await sleep(500); F.push(await shot(p));
  for (const i of [1, 2, 0]) { await p.click(`[data-bed="${i}"]`); await sleep(700); if (i === 2) F.push(await shot(p)); }
  await sleep(900); F.push(await shot(p));
  await p.waitForSelector('[data-ask]', { timeout: 9000 }).catch(() => {}); await sleep(400); F.push(await shot(p));
  for (let k = 0; k < 8 && (await p.$('[data-ask]') || (k < 3 && await sleep(500) === undefined && await p.$('[data-ask]'))); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.getAttribute('data-choice') === 'Hortensia') || b.find(e => e.classList.contains('glow')) || b[0]; g && g.click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w04m04-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W04M05') {
  const p = await open('W04-M05', 'farm-tractor'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 9000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  F.push(await shot(p));
  await p.click('[data-pile=tomat]'); await sleep(500); F.push(await shot(p));
  await p.click('[data-pile=wortel]'); await sleep(400); await p.click('[data-pile=jagung]'); await sleep(700); F.push(await shot(p));
  await ans('7'); await sleep(1200); F.push(await shot(p));
  const t = await center(p, '[data-tractor]'); await p.mouse.move(t.x, t.y); await p.mouse.down();
  for (let i = 0; i < 4; i++) { await p.waitForFunction("!document.querySelector('[data-ask]')", { timeout: 9000 }).catch(() => {}); await sleep(1300); F.push(await shot(p)); await sleep(1500); if (i < 3) { await p.mouse.up(); await sleep(1700); F.push(await shot(p)); const c = await center(p, '[data-tractor]'); await p.mouse.move(c.x, c.y); await p.mouse.down(); } }
  await p.waitForSelector('[data-ask]', { timeout: 12000 }).catch(() => {}); await p.mouse.up(); await sleep(300); await ans('Tomat'); await sleep(1500); F.push(await shot(p));
  const plan = [['wortel', 'wortel0'], ['wortel', 'wortel1'], ['tomat', 'tomat0'], ['jagung', 'jagung0'], ['wortel', 'wortel2'], ['tomat', 'tomat1'], ['jagung', 'jagung1']];
  for (let i = 0; i < plan.length; i++) { await dg(p, `[data-src=${plan[i][0]}]`, `[data-gap="${plan[i][1]}"]`, 10, i === 1 ? async () => { F.push(await shot(p)); } : undefined); await sleep(650); if (i === 3) F.push(await shot(p)); }
  await sleep(1500); F.push(await shot(p));
  await p.waitForSelector('[data-ask]', { timeout: 9000 }).catch(() => {}); await sleep(400); F.push(await shot(p));
  for (let k = 0; k < 8 && (await p.$('[data-ask]') || (k < 3 && await sleep(500) === undefined && await p.$('[data-ask]'))); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')) || b[0]; g && g.click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w04m05-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W06M04') {
  const p = await open('W06-M04', 'monster-truck'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 12000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  F.push(await shot(p));
  await dg(p, '[data-kon=kotak]', '[data-sock=bulat]'); await sleep(500); F.push(await shot(p)); await sleep(2800);
  for (const k of ['bulat', 'kotak', 'segitiga']) { await dg(p, `[data-kon=${k}]`, `[data-sock=${k}]`, 10, k === 'kotak' ? async () => { F.push(await shot(p)); } : undefined); await sleep(700); }
  await sleep(500); F.push(await shot(p));
  await ans('3'); await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='1'", { timeout: 6000 }).catch(() => {}); await sleep(900);
  // watch the pattern, slip once on purpose, then repeat it
  for (let i = 0; i < 3; i++) { await sleep(900); F.push(await shot(p)); }
  await p.waitForFunction("/Giliranmu/.test(document.querySelector('[data-instr]').textContent)", { timeout: 15000 }).catch(() => {}); F.push(await shot(p));
  const seq0 = (await p.evaluate("document.getElementById('m-scene').getAttribute('data-seq')")).split(',');
  const wrong = String((+seq0[0] + 1) % 4);
  await p.click(`[data-lamp="${wrong}"]`); await sleep(500); F.push(await shot(p));
  await p.waitForFunction("/Giliranmu/.test(document.querySelector('[data-instr]').textContent)", { timeout: 20000 }).catch(() => {});
  const seq1 = (await p.evaluate("document.getElementById('m-scene').getAttribute('data-seq')")).split(',');
  for (const v of seq1) { await p.click(`[data-lamp="${v}"]`); await sleep(450); if (v === seq1[0]) F.push(await shot(p)); }
  await p.waitForSelector('[data-ask]', { timeout: 8000 }).catch(() => {}); await sleep(500); F.push(await shot(p));
  const choices = await p.evaluate("[...document.querySelectorAll('[data-choice]')].map(e => e.getAttribute('data-choice'))");
  await ans(choices[1] || '5'); await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='2'", { timeout: 8000 }).catch(() => {}); await sleep(700); F.push(await shot(p));
  const t = await center(p, '[data-truck]'); await p.mouse.move(t.x, t.y); await p.mouse.down(); await sleep(1400); F.push(await shot(p)); await p.waitForFunction("document.querySelector('[data-goal]').style.display === 'none'", { timeout: 12000 }).catch(() => {}); await p.mouse.up(); await sleep(900); F.push(await shot(p)); await sleep(1500); F.push(await shot(p));
  await p.waitForSelector('[data-ask]', { timeout: 12000 }).catch(() => {}); await sleep(400); F.push(await shot(p));
  for (let k = 0; k < 6 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w06m04-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'W06M05') {
  const p = await open('W06-M05', 'monster-truck'); const F = [];
  const ans = async v => { await p.waitForSelector('[data-ask]', { timeout: 12000 }); await sleep(500); F.push(await shot(p)); await p.evaluate(x => { const e = [...document.querySelectorAll('[data-choice]')].find(b => b.getAttribute('data-choice') === x); e && e.click(); }, v); await sleep(900); };
  F.push(await shot(p));
  await dg(p, '[data-veh-card=daur]', '[data-pad="0"]'); await sleep(800); F.push(await shot(p));
  await dg(p, '[data-veh-card=monster]', '[data-pad="2"]', 10, async () => { F.push(await shot(p)); }); await sleep(800);
  await dg(p, '[data-veh-card=sapu]', '[data-pad="1"]'); await sleep(900); F.push(await shot(p));
  await ans('1'); await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='1'", { timeout: 6000 }).catch(() => {}); await sleep(700); F.push(await shot(p));
  for (const k of ['sapu', 'daur', 'monster']) { await p.click(`[data-veh-card=${k}]`); await sleep(600); if (k === 'daur') F.push(await shot(p)); }
  await sleep(1400); F.push(await shot(p)); await sleep(1600); F.push(await shot(p)); await sleep(1500); F.push(await shot(p));
  await ans('4'); await p.waitForFunction("document.querySelector('.step.on').getAttribute('data-step')==='2'", { timeout: 8000 }).catch(() => {}); await sleep(800); F.push(await shot(p));
  await p.click('[data-ride=bianglala]'); await sleep(1000); F.push(await shot(p)); await sleep(1400); F.push(await shot(p));
  await p.waitForSelector('[data-ask]', { timeout: 14000 }).catch(() => {}); await sleep(400); F.push(await shot(p));
  for (let k = 0; k < 6 && await p.$('[data-ask]'); k++) { await p.evaluate(() => { const b = [...document.querySelectorAll('[data-choice]')].filter(e => !e.disabled); const g = b.find(e => e.classList.contains('glow')); (g || b[0]) && (g || b[0]).click(); }); await sleep(900); }
  await p.waitForFunction("!!document.querySelector('[data-payoff=first]')", { timeout: 9000 }).catch(() => {}); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-w06m05-${VW}x${VH}.png`)); await p.close();
}
console.log(errs.length ? errs : 'no page errors');
await b.close();
