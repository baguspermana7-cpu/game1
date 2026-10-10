#!/usr/bin/env python3
"""3a: vehicle crop audit + re-crop BY ALPHA ONLY (no outline, no colour key) from the owner's transparent source sheets, using the Codex catalog boxes.
For every vehicle / driver-portrait file: take the catalog box as the nominal region, label alpha components in a window around it, keep the largest component
whose centre lies in the region (+ anything connected to it, e.g. a jet tail crossing the cell edge) and every other component whose centre lies in the region
and is >= 3% of it; drop every component whose centre lies OUTSIDE (a slice of the neighbouring view / vehicle). Writes assets/race/<id>/<state>-<view>.webp
and assets/blippi/driver-<view>.webp, and docs/sheets/vehicle-crop-audit.json (before/after island counts)."""
import json, os, sys
from collections import deque
from PIL import Image
PACK = '/home/baguspermana7/Documents/temporary/blippi/'
ORG = PACK + 'sudah organized/'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(ORG + 'database/vehicle-turnarounds.json'))
cat = json.load(open(ORG + 'database/catalog.json'))
by_file = {}
for s in cat['sources']:
    for c in s.get('crops', []):
        by_file[c['file']] = (s['source_path'], c['bbox'])
sheets = {}
def sheet(path):
    if path not in sheets: sheets[path] = Image.open(path).convert('RGBA')
    return sheets[path]
def components(alpha, w, h, thr=20):
    px = alpha.load(); seen = bytearray(w * h); comps = []
    for y in range(h):
        for x in range(w):
            if px[x, y] > thr and not seen[y * w + x]:
                q = deque([(x, y)]); seen[y * w + x] = 1; pts = []
                while q:
                    cx, cy = q.popleft(); pts.append((cx, cy))
                    for nx, ny in ((cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1), (cx+1, cy+1), (cx-1, cy-1), (cx+1, cy-1), (cx-1, cy+1)):
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny*w+nx] and px[nx, ny] > thr: seen[ny*w+nx] = 1; q.append((nx, ny))
                comps.append(pts)
    return comps
def audit_existing(path):
    im = Image.open(path).convert('RGBA'); comps = components(im.split()[3], *im.size)
    big = max((len(c) for c in comps), default=0)
    return sum(1 for c in comps if len(c) >= 0.03 * big), len(comps)
def cut_edge_strips(im):
    """A neighbour's slice that TOUCHES the vehicle is the same alpha component, so it survives the island rule. It is still a separate drawing: it sits
    in the outer 24% of the crop, is separated from the body by a (near-)empty column valley, and is small. Cut at the valley (alpha-only, nothing painted)."""
    a = im.split()[3].point(lambda v: 255 if v > 20 else 0); w, h = im.size; px = a.load()
    cols = [sum(1 for y in range(h) if px[x, y]) for x in range(w)]
    tot = sum(cols) or 1
    def valley(rng):
        for x in rng:
            if cols[x] <= max(2, h * 0.03):
                return x
        return None
    out = im.copy(); po = out.load()
    lim = int(w * 0.24)
    xl = valley(range(lim, 2, -1))   # scanning inward->outward so the valley nearest the body wins
    if xl is not None and sum(cols[:xl]) < 0.12 * tot:
        for x in range(0, xl + 1):
            for y in range(h): po[x, y] = (0, 0, 0, 0)
    xr = valley(range(w - lim, w - 3))
    if xr is not None and sum(cols[xr:]) < 0.12 * tot:
        for x in range(xr, w):
            for y in range(h): po[x, y] = (0, 0, 0, 0)
    return out
def recrop(src_path, bbox, dst, pad=0):
    """Alpha-only island removal on the Codex catalog crop (already cut at the catalog box, masked where the pack masked it): keep the largest
    component plus any detached part whose bbox CENTRE lies inside the main bbox (>= 1% of it); drop every disjoint component (a slice of the neighbouring view /
    vehicle). Re-cutting from the full source sheet was tried first and REJECTED: neighbouring vehicles touch there, so connected components merge
    several vehicles into one."""
    im = Image.open(src_path).convert('RGBA'); w, h = im.size
    comps = components(im.split()[3], w, h)
    info = []
    for c in comps:
        xs = [p[0] for p in c]; ys = [p[1] for p in c]
        info.append((len(c), min(xs), min(ys), max(xs), max(ys), c))
    main = max(info, key=lambda i: i[0])
    near = lambda i: main[1] <= (i[1] + i[3]) / 2 <= main[3] and main[2] <= (i[2] + i[4]) / 2 <= main[4]   # detached parts must sit INSIDE the main bbox (a neighbour's slice sits beside it)
    keep = [i for i in info if i is main or (near(i) and i[0] >= 0.01 * main[0])]
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0)); po = out.load(); pw = im.load()
    for i in keep:
        for (x, y) in i[5]: po[x, y] = pw[x, y]
    out = cut_edge_strips(out)
    bb = out.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
    out = out.crop(bb)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    out.save(dst, 'WEBP', lossless=True, quality=100, method=4)
    return {'size': out.size, 'dropped_components': len(info) - len(keep), 'kept': len(keep)}
report = {}
jobs = []
for v in T['vehicles']:
    for st, views in v['states'].items():
        for vw, rec in views.items():
            jobs.append((v['id'] + '/' + st + '-' + vw, rec['file'], os.path.join(ROOT, 'assets/race', v['id'], st + '-' + vw + '.webp')))
for vw, rec in T['driver_portraits'].items():
    jobs.append(('driver/' + vw, rec['file'], os.path.join(ROOT, 'assets/blippi', 'driver-' + vw + '.webp')))
only = sys.argv[1] if len(sys.argv) > 1 else None
for key, f, dst in jobs:
    if only and only not in key: continue
    if f not in by_file: report[key] = {'error': 'not in catalog'}; continue
    src, bbox = by_file[f]
    before = audit_existing(ORG + f)
    r = recrop(ORG + f, bbox, dst)
    after = audit_existing(dst) if r else None
    report[key] = {'before_islands': before[0], 'before_comps': before[1], 'after': r, 'after_islands': after[0] if after else None}
    print(key, report[key], flush=True)
json.dump(report, open(os.path.join(ROOT, 'docs/sheets/vehicle-crop-audit.json'), 'w'), indent=1)
