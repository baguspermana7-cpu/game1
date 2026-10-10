#!/usr/bin/env python3
"""Re-runnable sync of the Codex art pack into game1/assets/blippi + data/blippi-art.js SHIPPED map.

  python3 tools/sync-codex-art.py            # dry run: prints what would change
  python3 tools/sync-codex-art.py --apply    # copy files, strip slivers, rewrite SHIPPED
  python3 tools/sync-codex-art.py --apply --wait   # first wait until the pack is unchanged for 2 minutes

Reads database/slot-status.json + database/runtime-manifest.json from the pack. Every `ready` slot's resolved
file (and its --portrait variant) is copied. Transparent crops get detached edge slivers stripped (alpha
components < 3% of the largest that touch the image border). DENY = wrong art for the slot. APPROVED = owner-approved
`candidate-ready` slots (empty until the owner says so). sha256 is checked against the manifest.
"""
import hashlib, json, os, re, shutil, sys, time
from collections import deque
from PIL import Image

PACK = '/home/baguspermana7/Documents/temporary/blippi/sudah organized'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST = os.path.join(ROOT, 'assets', 'blippi')
STATE = os.path.join(ROOT, 'tools', 'sync-codex-art.state.json')
ARTJS = os.path.join(ROOT, 'data', 'blippi-art.js')
DENY = {'prop-papan', 'tool-papan'}      # resolved crops are a flange plate / cardboard stack, not the bridge plank
APPROVED = set()                          # candidate-ready slots the owner has approved (e.g. 'hub-papan')
SLIVER = 0.03


def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def pack_mtime():
    m = 0
    for d, _, fs in os.walk(PACK):
        if '/preview' in d or '/references' in d:
            continue
        for f in fs:
            m = max(m, os.path.getmtime(os.path.join(d, f)))
    return m


def strip_slivers(path):
    """remove small alpha components that touch the border; returns pixels removed"""
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    a = im.split()[3]
    px = a.load()
    seen = bytearray(w * h)
    comps = []
    for y in range(h):
        for x in range(w):
            if px[x, y] > 20 and not seen[y * w + x]:
                q = deque([(x, y)]); seen[y * w + x] = 1; pts = []; border = False
                while q:
                    cx, cy = q.popleft(); pts.append((cx, cy))
                    if cx == 0 or cy == 0 or cx == w - 1 or cy == h - 1:
                        border = True
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny] > 20:
                            seen[ny * w + nx] = 1; q.append((nx, ny))
                comps.append((len(pts), border, pts))
    if len(comps) < 2:
        return 0
    big = max(c[0] for c in comps)
    removed = 0
    pix = im.load()
    for n, border, pts in comps:
        if border and n < SLIVER * big:
            for (x, y) in pts:
                pix[x, y] = (0, 0, 0, 0)
            removed += n
    if removed:
        im.save(path, 'WEBP', lossless=True, quality=100, method=6)
    return removed


def main():
    apply = '--apply' in sys.argv
    if '--wait' in sys.argv:
        while time.time() - pack_mtime() < 120:
            print('pack changed %.0fs ago, waiting...' % (time.time() - pack_mtime())); time.sleep(15)
    status = json.load(open(os.path.join(PACK, 'database', 'slot-status.json')))
    manifest = json.load(open(os.path.join(PACK, 'database', 'runtime-manifest.json')))['assets']
    state = json.load(open(STATE)) if os.path.isfile(STATE) else {}
    old = set(re.findall(r"'([a-z0-9-]+)': true", open(ARTJS).read().split('var ROWS')[0]))
    ship, notes, newfiles = set(), [], []
    for key, s in sorted(status.items()):
        ok = s['status'] == 'ready' or (s['status'] == 'candidate-ready' and key in APPROVED)
        if key in DENY or not ok:
            continue
        variants = (manifest.get(key) or {}).get('variants') or s.get('variants') or {}
        files = []
        if variants:
            for v in variants.values():
                files.append((v['file'], v.get('sha256')))
        elif s.get('resolved_file'):
            files.append((s['resolved_file'], None))
        for rel, want in files:
            src = os.path.join(PACK, rel)
            if not os.path.isfile(src):
                notes.append('MISSING FILE ' + rel); continue
            if want and sha(src) != want:
                notes.append('SHA MISMATCH (pack mid-update?) ' + rel); continue
            dst = os.path.join(DEST, os.path.basename(rel))
            if not os.path.isfile(dst) or state.get(os.path.basename(rel)) != sha(src):
                newfiles.append(os.path.basename(rel))
                if apply:
                    shutil.copyfile(src, dst)
                    state[os.path.basename(rel)] = sha(src)
                    if not key.startswith('bg-'):
                        r = strip_slivers(dst)
                        if r:
                            notes.append('stripped %d sliver px from %s' % (r, os.path.basename(rel)))
        ship.add(key)
    added, dropped = sorted(ship - old), sorted(old - ship)
    print('ready+approved: %d | NEW slots: %s | dropped: %s' % (len(ship), added, dropped))
    print('files %s: %s' % ('copied' if apply else 'would copy', newfiles))
    for n in notes:
        print(' ', n)
    if apply:
        json.dump(state, open(STATE, 'w'), indent=1, sort_keys=True)
        txt = open(ARTJS).read()
        body = ',\n'.join("    '%s': true" % k for k in sorted(ship))
        txt = re.sub(r"var SHIPPED = \{.*?\n  \}\n", "var SHIPPED = {\n" + body + "\n  }\n", txt, count=1, flags=re.S)
        open(ARTJS, 'w').write(txt)
        print('SHIPPED rewritten. Now: review new slots on a checkerboard sheet, regenerate the sw.js SHELL, bump the ?v= token.')


main()
