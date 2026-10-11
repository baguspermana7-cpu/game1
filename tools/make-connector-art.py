#!/usr/bin/env python3
"""Draw the three W06-M04 shape connectors (circle / square / triangle plugs) as transparent webp."""
import os, math
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'blippi')
S = 3
N = 300
def new(): return Image.new('RGBA', (N * S, N * S), (0, 0, 0, 0))
def P(pts): return [(x * S, y * S) for x, y in pts]
GREY = (178, 184, 196, 255); GREY2 = (120, 126, 140, 255)
def prongs(d):
    for x in (95, 175):
        d.rectangle([x * S, 215 * S, (x + 30) * S, 290 * S], fill=GREY); d.rectangle([(x + 22) * S, 215 * S, (x + 30) * S, 290 * S], fill=GREY2)
def shape(kind, col, dark):
    im = new(); d = ImageDraw.Draw(im); prongs(d)
    if kind == 'bulat':
        d.ellipse([20 * S, 20 * S, 280 * S, 240 * S], fill=dark); d.ellipse([28 * S, 24 * S, 272 * S, 226 * S], fill=col); d.ellipse([60 * S, 46 * S, 150 * S, 100 * S], fill=(255, 255, 255, 90))
    elif kind == 'kotak':
        d.rounded_rectangle([24 * S, 24 * S, 276 * S, 236 * S], radius=34 * S, fill=dark); d.rounded_rectangle([32 * S, 28 * S, 268 * S, 224 * S], radius=30 * S, fill=col); d.rounded_rectangle([52 * S, 44 * S, 150 * S, 84 * S], radius=18 * S, fill=(255, 255, 255, 90))
    else:
        d.polygon(P([(150, 16), (284, 236), (16, 236)]), fill=dark); d.polygon(P([(150, 40), (258, 222), (42, 222)]), fill=col); d.polygon(P([(150, 62), (176, 106), (124, 106)]), fill=(255, 255, 255, 110))
    return im.resize((N, N), Image.LANCZOS)
for kind, col, dark in (('bulat', (47, 111, 224, 255), (22, 60, 140, 255)), ('kotak', (244, 118, 26, 255), (170, 70, 6, 255)), ('segitiga', (61, 181, 68, 255), (28, 110, 36, 255))):
    shape(kind, col, dark).save(os.path.join(OUT, 'w6-kon-' + kind + '.webp'), 'WEBP', quality=90, method=6); print('w6-kon-' + kind)
