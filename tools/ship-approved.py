#!/usr/bin/env python3
"""Ship the owner-approved GENERATED-REVIEW art (approval delegated to the main session 2026-10-10: "yang terbaik") into assets/blippi/.
Provenance is recorded in data/blippi-approved.json (source path, sha256 of the source, generation id, review note, approval). NOT shipped on purpose:
hub-meja-peta and hub-papan (bg-hub already paints the table and the board; they would be doubled)."""
import hashlib, json, os
from PIL import Image
PACK = '/home/baguspermana7/Documents/temporary/blippi/'
C = PACK + 'kekurangan/generated-review/candidates/'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
man = {c['slot']: c for c in json.load(open(PACK + 'kekurangan/generated-review/generated-candidates-manifest.json'))['candidates']}
JOBS = {  # slot: (source, max width px)
  'pulau-kota-roda': (C + 'pulau-kota-roda.webp', 700), 'pulau-taman-air': (C + 'pulau-taman-air.webp', 700), 'pulau-taman-air-aktif': (C + 'pulau-taman-air-aktif.webp', 700),
  'pulau-eco-park': (C + 'pulau-eco-park.webp', 700), 'pulau-kebun-ceria': (C + 'pulau-kebun-ceria.webp', 700), 'pulau-pelabuhan': (C + 'pulau-pelabuhan.webp', 700),
  'pulau-wonder-lab': (C + 'pulau-wonder-lab.webp', 700), 'prop-kincir-rumah': (C + 'prop-kincir-rumah.webp', 800), 'modul-semprot': (C + 'modul-semprot.webp', 420),
  'modul-bucket-sempit': (C + 'modul-bucket-sempit.webp', 420),
  'blippi-potret': (PACK + 'sudah organized/assets/colorful-preschool-mission-vehicle-sprite-sheet/blippi-presenting.webp', 400)}
out = {}
for slot, (src, mw) in JOBS.items():
    im = Image.open(src).convert('RGBA')
    bb = im.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
    if bb: im = im.crop(bb)
    if im.width > mw: im = im.resize((mw, round(im.height * mw / im.width)), Image.LANCZOS)
    dst = os.path.join(ROOT, 'assets/blippi', slot + '.webp')
    im.save(dst, 'WEBP', lossless=True, quality=100, method=6)
    m = man.get(slot, {})
    out[slot] = {'file': 'assets/blippi/%s.webp' % slot, 'source': src.replace(PACK, ''), 'source_sha256': hashlib.sha256(open(src, 'rb').read()).hexdigest(),
                 'generation_id': m.get('generation_id'), 'review_notes': m.get('review_notes'), 'status': 'generated-review', 'approved': 'owner-delegated, 2026-10-10', 'size': [im.width, im.height]}
open(os.path.join(ROOT, 'data/blippi-approved.json'), 'w').write(json.dumps(out, indent=1))
print(len(out), 'shipped', {k: v['size'] for k, v in out.items()})
