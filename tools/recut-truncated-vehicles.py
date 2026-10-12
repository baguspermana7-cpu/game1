#!/usr/bin/env python3
"""Re-cut race sprites that recrop-vehicles.py left TRUNCATED (owner 2026-10-12: "saat karakter bus kok ada sisi potongan di
sebelah kiri"). recrop works on the catalog crop, which is already cut at the sheet's cell, so a long vehicle (bus side, fire
engine, boats) lost its nose or tail at the cell edge. Here the vehicle is cut again from the owner's FULL transparent sheet:
  - a sprite counts as truncated when its alpha runs along the left / right / top edge (> 12% of that edge)
  - window = the catalog cell widened by 60% of its width on each side and 25% of its height
  - the vehicle = the alpha component (8-connected, alpha > 20) with the most pixels inside the cell, plus detached parts whose
    centre lies inside its box (>= 1%); alpha only, no outline, no colour key
  - accepted only when CLEAN: the component does not touch the window edge (a touching neighbour merges into it) and is at most
    1.9 cells wide / 1.5 cells high; otherwise the file is left as it is and reported
Then data/blippi-race-data.js box[view] follows the new standard-state size.   python3 tools/recut-truncated-vehicles.py [--dry]"""
import json, os, re, sys
from collections import deque
from PIL import Image
ORG = '/home/baguspermana7/Documents/temporary/blippi/sudah organized/'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY = '--dry' in sys.argv
T = json.load(open(ORG + 'database/vehicle-turnarounds.json'))
cat = json.load(open(ORG + 'database/catalog.json'))
by_file = {c['file']: (s['source_path'], c['bbox']) for s in cat['sources'] for c in s.get('crops', [])}
sheets = {}

def truncated(path):
    a = Image.open(path).split()[3].point(lambda v: 255 if v > 128 else 0); w, h = a.size; px = a.load()
    L = sum(1 for y in range(h) if px[0, y]) / h; R = sum(1 for y in range(h) if px[w - 1, y]) / h; Tp = sum(1 for x in range(w) if px[x, 0]) / w
    return max(L, R, Tp) > 0.12

def comps(alpha, w, h, thr=20):
    px = alpha.load(); seen = bytearray(w * h); out = []
    for y in range(h):
        for x in range(w):
            if px[x, y] > thr and not seen[y * w + x]:
                q = deque([(x, y)]); seen[y * w + x] = 1; pts = []
                while q:
                    cx, cy = q.popleft(); pts.append((cx, cy))
                    for nx, ny in ((cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1), (cx+1, cy+1), (cx-1, cy-1), (cx+1, cy-1), (cx-1, cy+1)):
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny] > thr: seen[ny * w + nx] = 1; q.append((nx, ny))
                out.append(pts)
    return out

def recut(sheet_path, bbox, dst):
    if sheet_path not in sheets: sheets[sheet_path] = Image.open(sheet_path).convert('RGBA')
    sh = sheets[sheet_path]; x0, y0, x1, y1 = bbox; cw, ch = x1 - x0, y1 - y0
    wx0, wy0 = max(0, int(x0 - 0.6 * cw)), max(0, int(y0 - 0.25 * ch)); wx1, wy1 = min(sh.width, int(x1 + 0.6 * cw)), min(sh.height, int(y1 + 0.25 * ch))
    win = sh.crop((wx0, wy0, wx1, wy1)); w, h = win.size
    if win.split()[3].getextrema()[0] > 200: return None, 'sheet is opaque'
    cs = comps(win.split()[3], w, h)
    inside = lambda c: sum(1 for (x, y) in c if x0 - wx0 <= x < x1 - wx0 and y0 - wy0 <= y < y1 - wy0)
    main = max(cs, key=inside)
    mx = [p[0] for p in main]; my = [p[1] for p in main]; bx0, bx1, by0, by1 = min(mx), max(mx), min(my), max(my)
    if (bx0 == 0 and wx0 > 0) or (bx1 == w - 1 and wx1 < sh.width) or (by0 == 0 and wy0 > 0):
        return None, 'touches the window edge (merged with a neighbour?)'
    if bx1 - bx0 > 1.9 * cw or by1 - by0 > 1.5 * ch: return None, 'too big for one vehicle (%dx%d vs cell %dx%d)' % (bx1 - bx0, by1 - by0, cw, ch)
    keep = [main] + [c for c in cs if c is not main and len(c) >= 0.01 * len(main) and bx0 <= sum(p[0] for p in c) / len(c) <= bx1 and by0 <= sum(p[1] for p in c) / len(c) <= by1]
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0)); po = out.load(); pw = win.load()
    for c in keep:
        for (x, y) in c: po[x, y] = pw[x, y]
    out = out.crop(out.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox())
    if not DRY: out.save(dst, 'WEBP', lossless=True, quality=100, method=4)
    return out.size, None

report = {'fixed': {}, 'left': {}}
new_box = {}
for v in T['vehicles']:
    for st, views in v['states'].items():
        for vw, rec in views.items():
            dst = os.path.join(ROOT, 'assets/race', v['id'], st + '-' + vw + '.webp')
            if not os.path.exists(dst) or not truncated(dst): continue
            if rec['file'] not in by_file: report['left'][v['id'] + '/' + st + '-' + vw] = 'not in catalog'; continue
            size, why = recut(*by_file[rec['file']], dst)
            key = v['id'] + '/' + st + '-' + vw
            if why: report['left'][key] = why
            else:
                report['fixed'][key] = size
                if st == 'standard': new_box[(v['id'], vw)] = size
print(len(report['fixed']), 'fixed,', len(report['left']), 'left')
for k, why in report['left'].items(): print('  left', k, why)
if not DRY and new_box:
    p = os.path.join(ROOT, 'data/blippi-race-data.js'); s = open(p).read()
    pre, js = s.split('window.BlippiRaceData = ', 1); data = json.loads(js.rstrip().rstrip(';'))
    for veh in data['vehicles']:
        for vw in list(veh['box']):
            if (veh['id'], vw) in new_box: veh['box'][vw] = list(new_box[(veh['id'], vw)])
    open(p, 'w').write(pre + 'window.BlippiRaceData = ' + json.dumps(data, indent=1, ensure_ascii=False) + '\n')
