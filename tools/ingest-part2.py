#!/usr/bin/env python3
"""Ingest the owner's part2 art. Usage:
  ingest-part2.py bg <key> <src-landscape.png> <src-portrait.png>      -> assets/blippi/<key>.webp + <key>--portrait.webp (q82)
  ingest-part2.py sheet <sheet.png> <names...>                          -> one transparent webp per 5x5 cell, assets/blippi/<name>.webp
Sheet cells are found by connected components of the alpha (objects span cell borders: the long bridge beam), merged per grid cell, then
low-alpha speckle is dropped. Names are given row-major; use '-' to skip a cell."""
import sys, os
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'blippi')
def bg(key, land, port):
    for src, name in ((land, key), (port, key + '--portrait')):
        im = Image.open(src).convert('RGB'); im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=82, method=6)
        print(name, im.size, os.path.getsize(os.path.join(OUT, name + '.webp')) // 1024, 'KB')
def sheet(path, names, cols=5, rows=5):
    im = Image.open(path).convert('RGBA'); W, H = im.size
    al = im.getchannel('A'); S = 4
    sw, sh = W // S, H // S
    small = al.resize((sw, sh), Image.BOX).point(lambda v: 255 if v > 30 else 0)
    px = small.load()
    # dilate 5 small px
    dil = [[False] * sw for _ in range(sh)]
    R = 1
    for y in range(sh):
        for x in range(sw):
            if px[x, y]:
                for yy in range(max(0, y - R), min(sh, y + R + 1)):
                    for xx in range(max(0, x - R), min(sw, x + R + 1)): dil[yy][xx] = True
    lab = [[0] * sw for _ in range(sh)]; comps = []
    for y in range(sh):
        for x in range(sw):
            if dil[y][x] and not lab[y][x]:
                n = len(comps) + 1; st = [(x, y)]; lab[y][x] = n; pts = []
                while st:
                    cx, cy = st.pop(); pts.append((cx, cy))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < sw and 0 <= ny < sh and dil[ny][nx] and not lab[ny][nx]: lab[ny][nx] = n; st.append((nx, ny))
                solid = sum(1 for p in pts if px[p[0], p[1]])
                xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
                comps.append({'n': n, 'solid': solid, 'box': (min(xs), min(ys), max(xs), max(ys)), 'cx': (min(xs) + max(xs)) / 2, 'cy': (min(ys) + max(ys)) / 2})
    big = max(c['solid'] for c in comps)
    comps = [c for c in comps if c['solid'] > big * 0.02]
    cells = {}
    for c in comps:
        r = min(rows - 1, int(c['cy'] / (sh / rows))); k = min(cols - 1, int(c['cx'] / (sw / cols)))
        cells.setdefault((r, k), []).append(c)
    for (r, k), cs in sorted(cells.items()):
        name = names[r * cols + k] if r * cols + k < len(names) else '-'
        if name == '-': continue
        ids = {c['n'] for c in cs}
        x0 = min(c['box'][0] for c in cs) * S; y0 = min(c['box'][1] for c in cs) * S
        x1 = (max(c['box'][2] for c in cs) + 1) * S; y1 = (max(c['box'][3] for c in cs) + 1) * S
        crop = im.crop((x0, y0, x1, y1)); cp = crop.load()
        for y in range(crop.height):
            for x in range(crop.width):
                sx = (x0 + x) // S; sy = (y0 + y) // S
                r_, g_, b_, a_ = cp[x, y]
                if lab[min(sy, sh - 1)][min(sx, sw - 1)] not in ids or a_ < 24: cp[x, y] = (0, 0, 0, 0)
        bb = crop.getbbox(); crop = crop.crop(bb)
        crop.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6, exact=True)
        print(name, crop.size)
def cuts(path, spec, names):
    xs, ys = spec.split('/'); xs = [0] + [int(v) for v in xs.split(',')]; ys = [0] + [int(v) for v in ys.split(',')]
    im = Image.open(path).convert('RGBA'); xs.append(im.width); ys.append(im.height); i = 0
    for r in range(len(ys) - 1):
        for c in range(len(xs) - 1):
            name = names[i]; i += 1
            if name == '-': continue
            cell = im.crop((xs[c], ys[r], xs[c + 1], ys[r + 1])); cp = cell.load()
            for y in range(cell.height):
                for x in range(cell.width):
                    if cp[x, y][3] < 40: cp[x, y] = (0, 0, 0, 0)
            cell = cell.crop(cell.getbbox()); cell.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6, exact=True); print(name, cell.size)
if sys.argv[1] == 'bg': bg(*sys.argv[2:5])
elif sys.argv[2].startswith('--cuts='): cuts(sys.argv[3], sys.argv[2][7:], sys.argv[4:])
elif sys.argv[2].startswith('--grid='):
    c, r = sys.argv[2][7:].split('x'); sheet(sys.argv[3], sys.argv[4:], int(c), int(r))
else: sheet(sys.argv[2], sys.argv[3:])
