"""Cut an owner vehicle pack (25 animated vehicles, rear view) into the game1 fleet for one journey.

Owner 2026-10-15: DARAT gets Vehicles_25_Animated_Asset_Pack, AIR gets Boats_25_Animated_Asset_Pack ("ada previewnya
dan ada animated asset yang tampak belakang utk di gameplaynya"). Each pack holds, per vehicle NN_<slug>:
  animation_sheets/NN_<slug>_<verb>.png  2560x1536, 10x6 frames of 256 px, 60 frames at 50 ms, full alpha, rear view
  sprites_diagonal/NN_<slug>.png         320x320, rear three-quarter still (the selection picture)
Output (alpha only, no outline, one fixed box per vehicle = union of its alpha over all frames, so nothing jitters):
  assets/fleet/<cat>/<id>.webp       play sheet, every frame in rows of 10, scale PLAY, 2 px clear margin per frame side
  assets/fleet/<cat>/<id>-tile.webp  the diagonal still, trimmed, longest side TILE px, 4 px clear margin
  data/blippi-fleet-<cat>.js         window.BlippiFleet.<cat> = { frameMs, items: [{ id, name, play, tile }] }
A pack with no sprites_diagonal/ (the aircraft download arrived without it) takes its stills from the 5x5 grid of
<Name>_25_Preview.png (diagonal view, 320 px cells). The paper-plane pack is a 5x5 grid GIF instead of per-plane sheets:
  python tools/ingest-fleet.py --grid <rear animated gif> <preview png> kertas
The full paper-plane pack (PaperPlanes_25_Animated_Asset_Pack, owner 2026-10-15) has per-plane sheets with soft alpha and
replaces the GIF cut: python tools/ingest-fleet.py <pack dir> kertas
The paper-boat pack (OrigamiShips_25_Animated_Asset_Pack, owner 2026-10-17) has 10x8-frame sheets (80 frames): the frame
rows are read from the sheet height. Its download arrived truncated (24 of 25 sheets): a missing sheet is cut from the pack's
5x5 rear GIF grid (200 px cells) at the same on-screen size:  python tools/ingest-fleet.py <pack dir> kapalkertas
Usage: python tools/ingest-fleet.py <pack dir> <darat|air|udara|kertas|kapalkertas>   (needs numpy + Pillow)"""
import glob, json, os, re, sys
from PIL import ImageSequence
import numpy as np
from PIL import Image

GRID = sys.argv[1] == '--grid'
if GRID:
    GIF, PREVIEW, CAT = sys.argv[2], sys.argv[3], sys.argv[4]
else:
    PACK, CAT = sys.argv[1], sys.argv[2]
PLAY = 0.75   # rear frames ~190 px: the road vehicle is drawn up to ~250 px, the boat ~150 px
TILE = 180
SHEET_COLS = 10
COLS, ROWS, CELL = 10, 6, 256

NAMES = {
  'darat': ['Mobil Pemadam', 'Truk Sampah', 'Mobil Penyapu Jalan', 'Ambulans', 'Mobil Polisi', 'Truk Molen', 'Truk Jungkit',
            'Truk Crane', 'Mobil Derek', 'Ekskavator', 'Buldoser', 'Loader', 'Forklift', 'Traktor', 'Bus Sekolah', 'Bus Kota',
            'Van Antar', 'Truk Boks', 'Truk Tangki', 'Mobil Bak', 'Truk Salju', 'Mesin Gilas', 'Truk Sedot', 'Bengkel Keliling',
            'Mobil Es Krim'],
  'air': ['Speedboat', 'Perahu Kayu', 'Perahu Karet', 'Kapal Tunda', 'Kapal Nelayan', 'Perahu Layar', 'Katamaran', 'Yacht Mini',
          'Kapal Feri', 'Kapal Roda Dayung', 'Kapal Kontainer', 'Kapal Tanker', 'Kapal Pemadam', 'Kapal Patroli', 'Sekoci',
          'Kapal Riset', 'Pemecah Es', 'Kapal Bajak Laut', 'Rumah Kapal', 'Perahu Cadik', 'Sampan Beratap', 'Perahu Bebek',
          'Hovercraft', 'Kapal Pendarat', 'Kapal Derek'],
  'udara': ['Pesawat Laut', 'Antonov Raksasa', 'Concorde', 'Helikopter Penyelamat', 'Biplane', 'Jumbo 747', 'Airbus A380',
            'Jet Bisnis', 'Turboprop', 'Pesawat Kargo', 'Pesawat Pemadam', 'Jet Pengintai', 'Sayap Terbang', 'Jet Delta',
            'Pesawat Pertanian', 'Glider', 'Pesawat Akrobat', 'Tiltrotor', 'Helikopter Kembar', 'Autogyro',
            'Helikopter Ambulans', 'DC-3 Klasik', 'Pesawat Ekor Kembar', 'Kapal Udara', 'Trike Ringan'],
  'kertas': ['Dart Klasik', 'Glider Sayap Lebar', 'Dart Jarum', 'Glider Bulldog', 'Sayap Delta', 'Cakram Planet', 'Glider Dua Cincin',
             'Naga Origami', 'Kelelawar Origami', 'Bangau Origami', 'Glider Walet', 'Glider Kupu-Kupu', 'Glider Pari',
             'Elang Kertas', 'Phoenix Koral', 'Glider Albatros', 'Jet Ekor Ganda', 'Jet Canard', 'Glider Sayap Kotak',
             'Glider Kipas', 'Glider Bumerang', 'Glider Ketupat', 'Glider Bintang', 'Roket Kertas', 'Ikan Terbang'],
  'kapalkertas': ['Perahu Kertas Klasik', 'Titanic Kertas', 'Britannic Kertas', 'Kapal Pesiar Kertas', 'Kapal Uap Kertas',
                  'Perahu Layar Kertas', 'Sekunar Kertas', 'Clipper Kertas', 'Kapal Viking Kertas', 'Jung Kertas',
                  'Kapal Kontainer Kertas', 'Kapal Tanker Kertas', 'Feri Kertas', 'Kapal Tunda Kertas', 'Speedboat Kertas',
                  'Yacht Kertas', 'Katamaran Kertas', 'Trimaran Kertas', 'Kapal Roda Dayung Kertas', 'Kapal Nelayan Kertas',
                  'Sekoci Kertas', 'Pemecah Es Kertas', 'Kapal Selam Kertas', 'Perahu Naga Kertas', 'Perahu Angsa Kertas'],
}[CAT]
IDS = {'kertas': ['classic-dart', 'blue-glider', 'orange-arrow', 'yellow-jet', 'green-wing', 'paper-disc', 'ring-wing', 'green-dragon',
                  'blue-bat', 'paper-crane', 'blue-swallow', 'butterfly', 'green-ray', 'brown-eagle', 'fire-bird', 'white-gull',
                  'navy-jet', 'salmon-jet', 'box-kite', 'green-peacock', 'v-wing', 'salmon-kite', 'yellow-star', 'paper-rocket',
                  'flying-fish']}.get(CAT)

out_dir = 'assets/fleet/%s' % CAT
os.makedirs(out_dir, exist_ok=True)


def grid_cells(img, n=5):
    """the 25 cells of a 5x5 grid image, row by row"""
    c = img.width // n
    return [img.crop(((i % n) * c, (i // n) * c, (i % n + 1) * c, (i // n + 1) * c)) for i in range(n * n)]


def save_tile(still, path):
    still = still.crop(still.getbbox())
    k = TILE / max(still.size)
    still = still.resize((max(1, round(still.width * k)), max(1, round(still.height * k))), Image.LANCZOS)
    tile = Image.new('RGBA', (still.width + 8, still.height + 8), (0, 0, 0, 0))
    tile.alpha_composite(still, (4, 4))
    tile.save(path, quality=88, method=4)
    return [tile.width, tile.height]


def save_strip(frames, path):
    """one fixed box over every frame (nothing jitters), alpha only, PLAY scale, 2 px clear margin per frame side"""
    alpha = np.stack([np.array(f)[..., 3] for f in frames]).max(0)
    ys, xs = np.where(alpha > 8)
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    w, h = box[2] - box[0], box[3] - box[1]
    pad = 2
    fw, fh = round(w * k_play) + pad * 2, round(h * k_play) + pad * 2
    # rows of SHEET_COLS frames: a single 60-80 frame row was 9000-12000 px wide, past a tablet GPU's texture limit
    cols = SHEET_COLS
    rows = -(-len(frames) // cols)
    strip = Image.new('RGBA', (fw * cols, fh * rows), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.alpha_composite(f.crop(box).resize((fw - pad * 2, fh - pad * 2), Image.LANCZOS), ((i % cols) * fw + pad, (i // cols) * fh + pad))
    strip.save(path, quality=86, method=4)
    return [fw, fh, len(frames), cols]


items = []
if GRID:
    # the paper planes: one GIF grid (200 px cells, 80 frames at 50 ms, binary alpha) + a 4K preview grid for the stills
    gif = Image.open(GIF)
    gframes = [grid_cells(f.convert('RGBA')) for f in ImageSequence.Iterator(gif)]
    k_play = 0.95   # 200 px cells: a plane ~150 px tall, like the boats
    stills = grid_cells(Image.open(PREVIEW).convert('RGBA'))
    for n in range(25):
        vid = IDS[n]
        play = save_strip([fr[n] for fr in gframes], '%s/%s.webp' % (out_dir, vid))
        tile = save_tile(stills[n], '%s/%s-tile.webp' % (out_dir, vid))
        items.append({'id': vid, 'name': NAMES[n], 'play': play, 'tile': tile})
        print(vid, play, tile)
else:
    k_play = PLAY
    sheets = sorted(glob.glob(os.path.join(PACK, 'animation_sheets', '*.png')))
    have = {os.path.basename(x)[:2] for x in sheets}
    missing = ['%02d' % i for i in range(1, 26) if '%02d' % i not in have]
    gifs = glob.glob(os.path.join(PACK, '*_25_Rear_Animated.gif'))
    assert len(sheets) == 25 or (missing and gifs), (len(sheets), missing)
    gframes = [grid_cells(f.convert('RGBA')) for f in ImageSequence.Iterator(Image.open(gifs[0]))] if missing else None
    for m in missing: sheets.append('GIF:' + m)
    sheets.sort(key=lambda x: os.path.basename(x)[:2] if not x.startswith('GIF:') else x[4:])
    previews = glob.glob(os.path.join(PACK, '*_25_Preview.png'))
    grid_stills = grid_cells(Image.open(previews[0]).convert('RGBA')) if not os.path.isdir(os.path.join(PACK, 'sprites_diagonal')) else None
    GIF_IDS = {'kapalkertas': {'25': 'paper-swan-boat'}}.get(CAT, {})
    for n, path in enumerate(sheets):
        if path.startswith('GIF:'):   # a sheet the download lost: the same ship from the GIF grid, scaled to the sheet size
            num = path[4:]
            vid = GIF_IDS.get(num, 'item-' + num)
            gf = [fr[int(num) - 1].resize((CELL, CELL), Image.LANCZOS) for fr in gframes]
            play = save_strip(gf, '%s/%s.webp' % (out_dir, vid))
        else:
            base = os.path.basename(path)
            num = base[:2]
            vid = re.sub(r'_[a-z]+\.png$', '', base[3:]).replace('_', '-')   # 15_school_bus_drive.png -> school-bus
            sheet = Image.open(path).convert('RGBA')
            rows = sheet.height // CELL   # 6 rows (60 frames) in the vehicle packs, 8 (80) in the paper-boat pack
            frames = [sheet.crop(((i % COLS) * CELL, (i // COLS) * CELL, (i % COLS + 1) * CELL, (i // COLS + 1) * CELL)) for i in range(COLS * rows)]
            play = save_strip(frames, '%s/%s.webp' % (out_dir, vid))
        still = grid_stills[n] if grid_stills else Image.open(glob.glob(os.path.join(PACK, 'sprites_diagonal', num + '_*.png'))[0]).convert('RGBA')
        tile = save_tile(still, '%s/%s-tile.webp' % (out_dir, vid))
        items.append({'id': vid, 'name': NAMES[n], 'play': play, 'tile': tile})
        print(vid, play, tile)

js = ('/* G32 Blippi -- the %s fleet (generated by tools/ingest-fleet.py from the owner\'s 25-vehicle animated pack; do not\n'
      ' * hand-edit). play = rear-view frame sheet [frameW, frameH, frames, columns] at frameMs; tile = the diagonal still for selection. */\n'
      'window.BlippiFleet = window.BlippiFleet || {}\n'
      'window.BlippiFleet[%s] = { frameMs: 50, items: %s }\n') % (CAT.upper(), json.dumps(CAT), json.dumps(items, indent=1))
open('data/blippi-fleet-%s.js' % CAT, 'w').write(js)
