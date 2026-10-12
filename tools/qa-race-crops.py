#!/usr/bin/env python3
"""Race vehicle sprites are whole (owner 2026-10-12: the bus had "sisi potongan di sebelah kiri"). A sprite whose alpha runs
along its left / right / top edge (> 15% of that edge; a straight tyre side reaches 13%) was cut at a sheet cell and lost its nose or tail. Fix with
tools/recut-truncated-vehicles.py. KNOWN would list, BY NAME, a sprite with no clean alpha cut on the owner's sheet.   python3 tools/qa-race-crops.py"""
import glob, os, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KNOWN = set()   # 2026-10-12: the last five (vehicles touching a neighbour on the sheet) were split at the thinnest alpha column/row
fails = []; n = 0
for f in sorted(glob.glob(os.path.join(ROOT, 'assets/race/*/*.webp'))):
    n += 1; key = os.path.relpath(f, os.path.join(ROOT, 'assets/race'))[:-5]
    a = Image.open(f).split()[3].point(lambda v: 255 if v > 128 else 0); w, h = a.size; px = a.load()
    e = {'left': sum(1 for y in range(h) if px[0, y]) / h, 'right': sum(1 for y in range(h) if px[w - 1, y]) / h, 'top': sum(1 for x in range(w) if px[x, 0]) / w}
    cut = [k for k, v in e.items() if v > 0.15]
    if cut and key not in KNOWN: fails.append('%s cut at the %s edge' % (key, '/'.join(cut)))
for f in fails: print('FAIL', f)
print('qa-race-crops: %d/%d sprites whole' % (n - len(fails), n))
sys.exit(1 if fails else 0)
