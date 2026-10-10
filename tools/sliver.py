"""Strip small detached slivers that touch the image border (alpha components < 3% of the largest). Shared by the art tools."""
from collections import deque
from PIL import Image
def strip_slivers(path, frac=0.03):
    im = Image.open(path).convert('RGBA'); w, h = im.size
    px = im.split()[3].load(); seen = bytearray(w * h); comps = []
    for y in range(h):
        for x in range(w):
            if px[x, y] > 20 and not seen[y * w + x]:
                q = deque([(x, y)]); seen[y * w + x] = 1; pts = []; border = False
                while q:
                    cx, cy = q.popleft(); pts.append((cx, cy))
                    if cx == 0 or cy == 0 or cx == w - 1 or cy == h - 1: border = True
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny] > 20:
                            seen[ny * w + nx] = 1; q.append((nx, ny))
                comps.append((len(pts), border, pts))
    if len(comps) < 2: return 0
    big = max(c[0] for c in comps); removed = 0; pix = im.load()
    for n, border, pts in comps:
        if border and n < frac * big:
            for (x, y) in pts: pix[x, y] = (0, 0, 0, 0)
            removed += n
    if removed: im.save(path, 'WEBP', lossless=True, quality=100, method=6)
    return removed
