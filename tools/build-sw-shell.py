#!/usr/bin/env python3
"""Regenerate the SHELL list + CACHE_VERSION in sw.js and the ?v= token everywhere. Usage: build-sw-shell.py g1-YYYYMMDDx
Shell = every game1 file the page loads (index.html refs, assets/blippi, assets/vfx, vendor) + the shared Dunia-Emosi files it reads
(save-engine, soal engine, icons) + the shared library art the vehicle journey draws (ART below, listed from the engines)."""
import os, re, sys, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tok = sys.argv[1] if len(sys.argv) > 1 else None
if not tok: sys.exit('usage: build-sw-shell.py g1-YYYYMMDDx')
for f in ['index.html', 'sw.js', 'sw-reload.js']:
    p = os.path.join(ROOT, f); s = open(p).read()
    s = re.sub(r'g1-\d{8}[a-z]?', tok, s); open(p, 'w').write(s)
lib = set()
for f in glob.glob(os.path.join(ROOT, 'data', 'blippi-trip.js')) + glob.glob(os.path.join(ROOT, 'blippi-trip-*.js')):
    for k in re.findall(r"lib:([A-Za-z0-9_\-/]+)", open(f).read()): lib.add(k)
# dynamic keys built from level themes
import json
d = open(os.path.join(ROOT, 'data', 'blippi-trip.js')).read()
for far in re.findall(r"far: '([a-z\-]+)'", d): lib.add('mojo-chase/cfar/' + far); lib.add('mojo-chase/cmid/' + far)
for mid in re.findall(r"mid: '([a-z\-]+)'", d): lib.add('mojo-chase/cmid/' + mid)
for pr in re.findall(r"props: \[([^\]]+)\]", d):
    for x in re.findall(r"'([a-z0-9\-]+)'", pr): lib.add('mojo-chase/props/' + x)
for x in re.findall(r"deco: \[([^\]]+)\]", d):
    for y in re.findall(r"'([a-z0-9\-]+)'", x): lib.add('tk-world/' + y)
lib.add('kereta-tile/bridge')
for ob in ['cone', 'crate', 'barrel', 'tyres-2', 'coin', 'star', 'boost-pad']: lib.add('mojo-chase/items/' + ob)
lib = {k for k in lib if not k.endswith('/')}
# only keep keys that exist
LIBROOT = os.path.join(ROOT, '..', 'Dunia-Emosi', 'assets', 'db', 'lib')
lib = sorted(k for k in lib if os.path.isfile(os.path.join(LIBROOT, k + '.webp')))
# quiz picture keys used by data/soal-pack-blippi.js and the maths generator nouns
for k in re.findall(r"'([a-z\-]+/[a-z0-9\-]+)'", open(os.path.join(ROOT, 'data', 'soal-pack-blippi.js')).read()):
    if os.path.isfile(os.path.join(LIBROOT, k + '.webp')) and k not in lib: lib.append(k)
lib = sorted(set(lib))
files = ['./', './index.html', './manifest.webmanifest']
vq = '?v=' + tok
for f in sorted(glob.glob(os.path.join(ROOT, '*.js')) + glob.glob(os.path.join(ROOT, '*.css'))):
    n = os.path.basename(f)
    if n == 'sw.js': continue
    files.append('./' + n + vq)
for f in sorted(glob.glob(os.path.join(ROOT, 'data', '*.js'))): files.append('./data/' + os.path.basename(f) + vq)
files.append('./vendor/parallax-js/3.1.0/parallax.min.js' + vq)
files += ['../Dunia-Emosi/games/data/save-engine.js' + vq, '../Dunia-Emosi/games/data/soal-engine.js' + vq, '../Dunia-Emosi/games/data/soal-gen-matematika.js' + vq,
          '../Dunia-Emosi/assets/apple-touch-icon.png', '../Dunia-Emosi/assets/favicon-32.png']
for f in sorted(glob.glob(os.path.join(ROOT, 'assets', 'blippi', '*.webp')) + glob.glob(os.path.join(ROOT, 'assets', 'vfx', '*.webp'))):
    files.append('./' + os.path.relpath(f, ROOT))
for f in sorted(glob.glob(os.path.join(ROOT, 'assets', 'race', '*', '*.webp')) + glob.glob(os.path.join(ROOT, 'assets', 'arena', '*.webp'))):
    files.append('./' + os.path.relpath(f, ROOT))
files += ['../Dunia-Emosi/assets/db/lib/' + k + '.webp' for k in lib]
sw = open(os.path.join(ROOT, 'sw.js')).read()
body = 'const SHELL = [\n' + ',\n'.join(' "%s"' % f for f in files) + '\n]'
sw = re.sub(r'const SHELL = \[.*?\n\]', lambda m: body, sw, count=1, flags=re.S)
open(os.path.join(ROOT, 'sw.js'), 'w').write(sw)
print('SHELL', len(files), 'files;', len(lib), 'shared library images; token', tok)
