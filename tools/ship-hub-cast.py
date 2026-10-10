#!/usr/bin/env python3
"""3b: copy the portrait-hub cast from the Codex pack by alpha only (largest component + parts inside its bbox; no outline)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
import importlib.util
spec = importlib.util.spec_from_file_location('rc', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'recrop-vehicles.py'))
A = '/home/baguspermana7/Documents/temporary/blippi/sudah organized/assets/'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from collections import deque
def comps(alpha, w, h):
    px = alpha.load(); seen = bytearray(w*h); out = []
    for y in range(h):
        for x in range(w):
            if px[x, y] > 20 and not seen[y*w+x]:
                q = deque([(x, y)]); seen[y*w+x] = 1; pts = []
                while q:
                    cx, cy = q.popleft(); pts.append((cx, cy))
                    for nx, ny in ((cx+1,cy),(cx-1,cy),(cx,cy+1),(cx,cy-1),(cx+1,cy+1),(cx-1,cy-1),(cx+1,cy-1),(cx-1,cy+1)):
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny*w+nx] and px[nx,ny] > 20: seen[ny*w+nx] = 1; q.append((nx,ny))
                out.append(pts)
    return out
def clean(src, dst):
    im = Image.open(src).convert('RGBA'); w, h = im.size
    cs = comps(im.split()[3], w, h); info = []
    for c in cs:
        xs = [p[0] for p in c]; ys = [p[1] for p in c]; info.append((len(c), min(xs), min(ys), max(xs), max(ys), c))
    m = max(info, key=lambda i: i[0])
    keep = [i for i in info if i is m or (m[1] <= (i[1]+i[3])/2 <= m[3] and m[2] <= (i[2]+i[4])/2 <= m[4] and i[0] >= 0.01*m[0])]
    out = Image.new('RGBA', (w, h), (0,0,0,0)); po = out.load(); pw = im.load()
    for i in keep:
        for (x, y) in i[5]: po[x, y] = pw[x, y]
    out = out.crop(out.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox())
    if out.height > 520: out = out.resize((round(out.width*520/out.height), 520), Image.LANCZOS)
    out.save(dst, 'WEBP', lossless=True, quality=100, method=4); return out.size
JOBS = {'cast-blippi-wave': 'blippi-25-pose-sprite-sheet/blippi-point-up.webp', 'cast-blippi-celebrate': 'blippi-25-pose-sprite-sheet/blippi-celebrate.webp',
  'cast-blippi-point': 'blippi-25-pose-sprite-sheet/blippi-point-right.webp', 'cast-cat': 'blippi-cast-and-vehicle-turnarounds/blue-cat-front-three-quarter.webp',
  'cast-guide': '25-supporting-characters-for-preschool-adventure/guide-cyan.webp', 'cast-builder': '25-supporting-characters-for-preschool-adventure/builder.webp',
  'cast-child': '25-supporting-characters-for-preschool-adventure/child-yellow.webp'}
for k, f in JOBS.items(): print(k, clean(A + f, os.path.join(ROOT, 'assets/blippi', k + '.webp')))
