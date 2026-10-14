"""Cut the owner's animated 5x5 spacecraft sheet into per-craft frame strips for LUAR ANGKASA (game1).

Owner 2026-10-15: the first sheet's craft did not face up; this sheet (Spacecraft_5x5_Animated-1.webp, 1280 px, 60
frames at 50 ms, transparent) is the right one. Same 25 craft in the same order as data/blippi-space.js.
  - one fixed box per craft = the union of its alpha over ALL frames (no jitter), cut by alpha only, no outline
  - play strip  assets/space/<id>.webp       every frame, scale PLAY, 2 px clear margin per frame side
  - pick strip  assets/space/<id>-pick.webp  every 2nd frame, scale PICK, 4 px clear margin per frame side
Rewrites the play/pick sizes and frameMs in data/blippi-space.js (ids and names kept).
Usage: python tools/ingest-space-craft.py <sheet.webp>   (needs numpy + Pillow)"""
import json, re, sys
import numpy as np
from PIL import Image, ImageSequence

SRC = sys.argv[1]
CELL = 256
PLAY = 0.55   # the in-game strip keeps the first cut's size (about 120 px tall)
PICK = 0.42
DATA = 'data/blippi-space.js'

sheet = Image.open(SRC)
frames, durs = [], []
for f in ImageSequence.Iterator(sheet):
    frames.append(f.convert('RGBA').copy())
    durs.append(f.info.get('duration') or 80)
alpha = np.stack([np.array(f)[..., 3] for f in frames]).max(0)

src = open(DATA).read()
head, tail = src[:src.index('craft:') + 6], src[src.rindex(']') + 1:]
craft = json.loads(src[src.index('craft:') + 6:src.rindex(']') + 1])
assert len(craft) == 25

def strip(boxes, step, k, pad):
    l, t, r, b = boxes
    w, h = r - l, b - t
    fw, fh = round(w * k) + pad * 2, round(h * k) + pad * 2
    sel = frames[::step]
    out = Image.new('RGBA', (fw * len(sel), fh), (0, 0, 0, 0))
    for i, f in enumerate(sel):
        out.alpha_composite(f.crop(boxes).resize((fw - pad * 2, fh - pad * 2), Image.LANCZOS), (i * fw + pad, pad))
    return out, [fw, fh, len(sel)]

for i, c in enumerate(craft):
    r0, c0 = (i // 5) * CELL, (i % 5) * CELL
    ys, xs = np.where(alpha[r0:r0 + CELL, c0:c0 + CELL] > 8)
    box = (c0 + int(xs.min()), r0 + int(ys.min()), c0 + int(xs.max()) + 1, r0 + int(ys.max()) + 1)
    play, c['play'] = strip(box, 1, PLAY, 2)
    pick, c['pick'] = strip(box, 2, PICK, 4)
    play.save('assets/space/%s.webp' % c['id'], quality=86, method=4)
    pick.save('assets/space/%s-pick.webp' % c['id'], quality=86, method=4)
    print(c['id'], c['play'], c['pick'])

ms = round(sum(durs) / len(durs))
body = json.dumps(craft, indent=1)
head = re.sub(r'frameMs: \d+', 'frameMs: %d' % ms, head)
open(DATA, 'w').write(head + ' ' + body + tail)
print('frameMs', ms)
