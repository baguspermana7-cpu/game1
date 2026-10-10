#!/usr/bin/env python3
"""Authoring aid: draw a labelled 100 px grid over an arena plate (and, if given, the authored route from data/blippi-race-routes.js).
  python3 tools/arena-grid.py <arenaId> <landscape|portrait> <out.png> [--route]"""
import json, re, sys, os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
aid, ori, out = sys.argv[1:4]
im = Image.open(os.path.join(ROOT, 'assets/arena/%s-%s.webp' % (aid, ori))).convert('RGB')
d = ImageDraw.Draw(im, 'RGBA'); W, H = im.size
f = ImageFont.load_default()
for x in range(0, W, 100):
    d.line([(x, 0), (x, H)], fill=(255, 255, 255, 110) if x % 500 else (255, 255, 0, 200), width=1); d.text((x + 2, 2), str(x), fill=(255, 255, 0, 255), font=f)
for y in range(0, H, 100):
    d.line([(0, y), (W, y)], fill=(255, 255, 255, 110) if y % 500 else (255, 255, 0, 200), width=1); d.text((2, y + 2), str(y), fill=(255, 255, 0, 255), font=f)
if '--route' in sys.argv:
    txt = open(os.path.join(ROOT, 'data/blippi-race-routes.js')).read()
    j = json.loads(txt[txt.index('{'):txt.rindex('}') + 1])
    r = j[aid][ori]
    pts = [tuple(p) for p in r['centerline']]
    tw = r['trackWidth']
    for i in range(len(pts)):
        a = pts[i]; b = pts[(i + 1) % len(pts)]
        d.line([a, b], fill=(0, 255, 120, 90), width=int(tw))
    d.line(pts + [pts[0]], fill=(255, 0, 90, 255), width=4)
    for i, p in enumerate(pts): d.ellipse([p[0] - 7, p[1] - 7, p[0] + 7, p[1] + 7], fill=(255, 255, 0, 255)); d.text((p[0] + 9, p[1] - 6), str(i), fill=(255, 255, 255, 255), font=f)
    for poly in r['obstacles']: d.polygon([tuple(p) for p in poly], outline=(255, 60, 0, 255), fill=(255, 60, 0, 90))
    for h in r['hud']: d.rectangle(h, outline=(0, 160, 255, 255), width=3)
    s = r['start']; d.ellipse([s['x'] - 14, s['y'] - 14, s['x'] + 14, s['y'] + 14], fill=(255, 255, 255, 255), outline=(0, 0, 0, 255))
    import math
    d.line([(s['x'], s['y']), (s['x'] + 60 * math.cos(math.radians(s['dir'])), s['y'] + 60 * math.sin(math.radians(s['dir'])))], fill=(0, 0, 0, 255), width=5)
sc = 1100 / max(W, H)
im.resize((int(W * sc), int(H * sc))).save(out)
