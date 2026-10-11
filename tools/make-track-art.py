#!/usr/bin/env python3
"""Draw the four W06-M03 track modules (straight / bend / low ramp / high ramp) as transparent webp (owner style: blue deck, orange rails, grey posts)."""
import os, math
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'blippi')
S = 3
W, H = 300, 230
BLUE = (47, 111, 224, 255); BLUE2 = (31, 84, 190, 255); ORG = (244, 118, 26, 255); ORG2 = (196, 80, 10, 255); GREY = (150, 156, 168, 255); GREY2 = (104, 110, 124, 255); WHITE = (255, 255, 255, 255)
CY = 130   # deck centre line at the joins
TH = 56    # deck thickness (top surface)
def new(): return Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0))
def P(pts): return [(x * S, y * S) for x, y in pts]
def post(d, x, ytop, ybot, w=26):
    d.rectangle([x * S, ytop * S, (x + w) * S, ybot * S], fill=GREY); d.rectangle([(x + w - 7) * S, ytop * S, (x + w) * S, ybot * S], fill=GREY2)
def band(d, f, thick=TH, lip=22, col=BLUE, rail=ORG, rail2=ORG2, dash=True, posts=True):
    xs = [i * 3 for i in range(0, 101)]
    top = [(x, f(x) - thick / 2) for x in xs]; bot = [(x, f(x) + thick / 2) for x in xs]
    if posts:
        for px in (14, 130, 260):
            yb = f(px + 13) + thick / 2 + lip
            post(d, px, yb - 4, 205)
    # front lip (orange darker) then deck, then rails
    d.polygon(P(bot + [(x, y + lip) for x, y in reversed(bot)]), fill=rail2)
    d.polygon(P(top + list(reversed(bot))), fill=col)
    d.polygon(P(top + [(x, y + 9) for x, y in reversed(top)]), fill=rail)
    d.polygon(P([(x, y - 9) for x, y in bot] + [(x, y + 3) for x, y in reversed(bot)]), fill=rail)
    if dash:
        for k in range(6):
            x0 = 20 + k * 46; x1 = x0 + 26
            seg = [(x, f(x)) for x in range(x0, x1 + 1, 2)]
            d.line(P(seg), fill=WHITE, width=5 * S)
def save(im, name):
    im = im.resize((W, H), Image.LANCZOS); im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=90, method=6); print(name, im.size)
def straight():
    im = new(); d = ImageDraw.Draw(im); band(d, lambda x: CY); save(im, 'w6-trk-lurus')
def bend():
    im = new(); d = ImageDraw.Draw(im); band(d, lambda x: CY - 42 * math.sin(math.pi * x / 300) ** 1.0, dash=True); save(im, 'w6-trk-belok')
def ramp(rise, name):
    im = new(); d = ImageDraw.Draw(im); band(d, lambda x: CY - rise * (x / 300.0)); save(im, name)
if __name__ == '__main__':
    straight(); bend(); ramp(34, 'w6-trk-tanjakan'); ramp(72, 'w6-trk-tinggi')
