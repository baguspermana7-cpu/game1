/* G32 Blippi -- BALAP PESAWAT (owner 2026-10-18): an air race seen from above the clouds. The owner: "bener2 immersive,
 * langitnya seolah itu pov dari atas awan, terlihat daratan dan laut, accurate, detail". The racers are the owner's
 * Planes pack (fleet 'balap', tools/ingest-planes.py), each with straight / left / right banking poses.
 *
 * The world under the plane, drawn far to near:
 *   ground   a procedural map (no tiles repeat): fbm height -> deep sea, shallow sea, surf, beach, farm fields in a
 *            patchwork with hedgerows, rivers, towns with street grids, forest, rock, snow; hill-shaded from the sun.
 *            Rendered at low resolution into chunk canvases (one row slice per frame, never a frame spike) and scaled up.
 *   shadows  each cloud's shadow on the ground, offset away from the sun, moving with the ground
 *   haze     aerial perspective: the ground fades toward the sky colour (it is kilometres below)
 *   deck     a broken cloud deck between the ground and the plane (faster than the ground: parallax = height)
 *   glint    the sun's reflection on the sea, a moving sparkle band
 *   fg       (over the plane) thin wisps rushing past, the speed of the race
 * Everything moves by world z (Z * G.pyu), so the scenery scrolls exactly with the obstacles. */
(function (w) {
  'use strict'
  var T = w.BlippiTrip
  T.skins = T.skins || {}

  // fallback racers: the UDARA pack, only if data/blippi-fleet-balap.js (the owner's planes) did not load
  w.BlippiFleet = w.BlippiFleet || {}
  if (!w.BlippiFleet.balap && w.BlippiFleet.udara) {
    var RACERS = ['crop-duster', 'aerobatic-monoplane', 'vintage-biplane', 'delta-canard-jet', 'supersonic-recon-jet', 'business-jet', 'twin-boom-pusher', 'flying-wing', 'concorde', 'long-wing-glider', 'float-seaplane', 'ultralight-trike', 'regional-turboprop', 'vintage-dc-3']
    var U = w.BlippiFleet.udara
    w.BlippiFleet.balap = { frameMs: U.frameMs, dir: 'udara', placeholder: true, items: RACERS.map(function (id) { return U.items.filter(function (x) { return x.id === id })[0] }).filter(Boolean) }
  }

  // ---- deterministic noise (integer hash, no Math.random: the map must be the same every frame and every visit) ----
  function ih (x, y, s) {
    var h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  function vnoise (x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
    var a = ih(xi, yi, s), b = ih(xi + 1, yi, s), c = ih(xi, yi + 1, s), d = ih(xi + 1, yi + 1, s)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
  function fbm (x, y, s, oct) {
    var t = 0, amp = 0.5, f = 1, n = 0, i
    for (i = 0; i < oct; i++) { t += vnoise(x * f, y * f, s + i * 17) * amp; n += amp; amp *= 0.5; f *= 2.03 }
    return t / n
  }
  function hash (i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
  function wrap (v, m) { return ((v % m) + m) % m }
  function mix (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] }
  function hex (h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255] }

  // ---- the four worlds: where the sea is, how high the land goes, the light ----
  // sea: sea level on the 0..1 height; coast: how strongly the left of the map is pushed under water (a coastline run);
  // relief: mountain height; snow: snow line (> 1 = none); town / river: how much of each; time: the light
  var WORLD = {
    coast: { sea: 0.47, coast: 0.42, relief: 0.55, snow: 9, town: 0.62, river: 1, seed: 11,
      deep: '#1D5C8E', shallow: '#4FB3CF', sand: '#E9DBA8', fields: ['#9CC66A', '#B5CF72', '#D8CB84', '#86B95C', '#A9C463', '#C9B977'], forest: '#3F7A3D', rock: '#8E8676',
      sky: ['#9FD3FF', '#E3F4FF'], haze: '205,230,250', sun: [0.78, 0.12], grade: null, road: 0.6, boats: 1, birds: 1 },
    mountain: { sea: 0.24, coast: 0.05, relief: 1.35, mask: 0.42, snow: 0.8, rock: 0.5, town: 0.35, river: 1, seed: 23,
      deep: '#24577F', shallow: '#5AA7C4', sand: '#D9D0A8', fields: ['#8DBB5E', '#A3C468', '#B8C478', '#7CAE55', '#C2BE7D'], forest: '#2F6B3A', rock: '#9A8A74',
      sky: ['#8EC8FF', '#E8F5FF'], haze: '210,232,252', sun: [0.25, 0.1], grade: null, road: 0.35, boats: 0.5, birds: 1 },
    islands: { sea: 0.6, coast: 0, relief: 0.6, snow: 9, town: 0.2, river: 0, seed: 37,
      deep: '#0F6A9A', shallow: '#3FD0D6', sand: '#F3E6B6', fields: ['#7CC25A', '#93CF62', '#6DB453'], forest: '#2E8A45', rock: '#8F8A72',
      sky: ['#8FDAFF', '#E6FBFF'], haze: '200,240,250', sun: [0.7, 0.14], grade: null, reef: true, road: 0, boats: 1, birds: 1 },
    sunset: { sea: 0.4, coast: 0.25, relief: 0.6, snow: 9, town: 0.82, river: 1, seed: 53,
      deep: '#1F4F86', shallow: '#4C93BF', sand: '#E8C59A', fields: ['#9BB86A', '#B6B870', '#CDB27A', '#8BAA5E', '#C4A472'], forest: '#3E6A3C', rock: '#8C7A6C',
      sky: ['#FFB27A', '#FFE2B8'], haze: '255,190,140', sun: [0.2, 0.08], grade: 'rgba(255,140,70,.16)', glint: '255,190,120', road: 0.7, boats: 0.8, birds: 1 },
    // ---- the eight worlds added 2026-10-19 (owner: "hanya 4 level, kurang immersive"); `style` picks a hook set in styleOf() ----
    terrace: { style: 'terrace', sea: 0.42, coast: 0.3, relief: 0.25, mask: 0.74, snow: 9, rock: 0.9, town: 0.3, river: 1, seed: 61, road: 0.4, boats: 0.7, birds: 1,
      deep: '#1B6A93', shallow: '#4CC0C4', sand: '#B8AD8C', fields: ['#7DB84E', '#98C65A', '#B4CC66', '#6AA845'], forest: '#2C7A3A', rock: '#7C7468',
      sky: ['#7FD0FF', '#E5F7FF'], haze: '205,235,245', sun: [0.74, 0.12], grade: null },
    farm: { style: 'farm', sea: 0.36, coast: 0.2, relief: 0.4, mask: 0.62, snow: 9, rock: 0.5, town: 0.25, river: 1, seed: 113, road: 0.8, boats: 0.6, birds: 1,
      deep: '#2B628C', shallow: '#68AFC2', sand: '#D8CDA0', fields: ['#E2BA4E', '#D67C30', '#D4C86C', '#7CA844', '#4E8038'], forest: '#3E6A34', rock: '#8E8672',
      sky: ['#A2D2F2', '#F0EEDC'], haze: '235,228,205', sun: [0.25, 0.12], grade: 'rgba(255,170,70,.06)', glint: '255,236,190' },
    canyon: { style: 'canyon', sea: 0, coast: 0, relief: 0, snow: 9, rock: 9, town: 0, river: 0, seed: 71, road: 0.3, boats: 0, birds: 1,
      deep: '#2B628C', shallow: '#68AFC2', sand: '#E6C79A', fields: ['#D9A066'], forest: '#7A7A3C', rock: '#B5583A',
      sky: ['#79BEF2', '#F7ECD8'], haze: '242,216,182', sun: [0.3, 0.1], grade: 'rgba(255,170,90,.07)', glint: '255,226,170' },
    atoll: { style: 'atoll', sea: 0.5, coast: 0, relief: 0, mask: 0.99, snow: 9, rock: 9, town: 0, river: 0, seed: 127, road: 0, boats: 0.7, birds: 1, reef: true,
      deep: '#0B4A86', shallow: '#2EE0D0', sand: '#F6EBC0', fields: ['#46A05A'], forest: '#2E8A45', rock: '#8F8A72',
      sky: ['#7BD6FF', '#E4FBFF'], haze: '200,242,250', sun: [0.7, 0.12], grade: null },
    jungle: { style: 'jungle', sea: 0, coast: 0, relief: 0.2, snow: 9, rock: 9, town: 0, river: 0, seed: 97, road: 0, boats: 0, birds: 1,
      deep: '#2B628C', shallow: '#68AFC2', sand: '#D6BE8C', fields: ['#3E8A42'], forest: '#245E30', rock: '#6F6A52',
      sky: ['#86CCEE', '#E0F2EA'], haze: '208,236,224', sun: [0.7, 0.1], grade: 'rgba(40,120,70,.05)', glint: '255,250,225' },
    fjord: { style: 'arctic', sea: 0.5, coast: 0.38, relief: 1.5, mask: 0.38, snow: 0.62, rock: 0.05, town: 0, river: 0, seed: 83, road: 0, boats: 0.35, birds: 1,
      deep: '#08283F', shallow: '#2D9AB0', sand: '#8E8F88', fields: ['#6C7A62', '#7A8570', '#5E6E5A'], forest: '#4D5B52', rock: '#5F6469', shelf: [150, 210, 214],
      sky: ['#98C4E8', '#EAF3FA'], haze: '200,222,240', sun: [0.35, 0.09], grade: 'rgba(160,200,255,.05)', glint: '235,245,255' },
    city: { style: 'city', sea: 0.45, coast: 0.42, relief: 0.1, mask: 0.9, snow: 9, rock: 0.9, town: 1, river: 0, seed: 101, road: 0, boats: 1, birds: 1, grid: true,
      deep: '#1E5F8E', shallow: '#4DA6C2', sand: '#B6B4AA', fields: ['#9CC66A'], forest: '#3F7A3D', rock: '#8E8676', shelf: [170, 214, 214],
      sky: ['#A6CAEE', '#E6EEF5'], haze: '215,225,238', sun: [0.8, 0.1], grade: null },
    night: { style: 'night', night: true, sea: 0.45, coast: 0.45, relief: 0.1, mask: 0.9, snow: 9, rock: 0.9, town: 1, river: 0, seed: 139, road: 0.7, boats: 0.9, birds: 0, grid: true, bloom: true, rays: 0,
      deep: '#040C1A', shallow: '#12294A', sand: '#2A2A30', fields: ['#10161F'], forest: '#0C1A18', rock: '#1A1E28', shelf: false, wave: [70, 96, 150], foamCol: [60, 82, 120], cloud: [0.32, 0.36, 0.52],
      sky: ['#06102A', '#1B2C58'], haze: '8,16,38', hazeA: 0.3, sun: [0.78, 0.14], grade: null, glint: '150,180,255' }
  }
  function worldOf (lvl) { return WORLD[(lvl.theme && lvl.theme.world) || 'coast'] || WORLD.coast }

  // ---- ground generator: chunks of RES x ROWS map pixels, one slice of rows per call ----
  // RES map pixels across the screen: about one per 2 screen px (a tablet gets more, a small phone less); every
  // feature size is written for 168 across and scaled by Q, so the world looks the same at any RES
  var ROWS = 64, SLICE = 3, LIGHT = [-0.55, -0.6, 0.58]
  function ss (a, b, t) { t = (t - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t) }
  function dim (c, f) { return [c[0] * f, c[1] * f, c[2] * f] }

  // ---- the hook sets of the eight added worlds. x, v are in 168-wide units (already scaled by Q); e is height above sea ----
  //   h / hFull  change the height field (hFull replaces it)      sea(x,v,h,c,ds)   repaint the water (ds = depth)
  //   land(x,v,h,e,c) repaint the land after the common chain      full: land() replaces the whole land colour
  var TPAL = [[92, 150, 58], [116, 168, 66], [140, 178, 76], [78, 130, 52], [178, 184, 98], [158, 196, 186], [106, 156, 70]]
  var STRATA = [[200, 88, 58], [217, 115, 63], [227, 154, 88], [181, 69, 47], [232, 183, 122], [158, 59, 44], [210, 128, 80]]
  var FARM = [[226, 186, 78], [214, 124, 48], [212, 200, 108], [124, 168, 68], [78, 128, 56], [140, 98, 64], [170, 190, 100], [176, 92, 54], [232, 160, 60]]
  var ROOFD = [[182, 180, 174], [152, 152, 158], [206, 200, 192], [170, 130, 112], [122, 150, 172], [196, 190, 170], [160, 166, 160]]
  function styleOf (WD, Q, RES, P) {
    var sd = WD.seed, st = WD.style
    function cityCol (x, v, e, night) {
      var BLK = 8, bx = Math.floor(x / BLK), by = Math.floor(v / BLK), lx = x - bx * BLK, ly = v - by * BLK
      var sdist = Math.min(lx, BLK - lx, ly, BLK - ly)                       // distance to the nearest street centre line
      var ax = x - Math.round(x / 32) * 32, ay = v - Math.round(v / 32) * 32 // distance to the nearest avenue
      var hwy = ((Math.round(v / 32) % 3) + 3) % 3 === 0
      var da = Math.min(Math.abs(ax), Math.abs(ay) - (hwy ? 0.5 : 0)), st1 = 1 - ss(0.3 * Q, 1.0 * Q, sdist), av = 1 - ss(1.2 * Q, 2.1 * Q, da)
      var dn = fbm(x / 90 + 500, v / 90, sd + 30, 3), lot = Math.floor(lx / 4), lotY = Math.floor(ly / 4), lh = ih(bx * 2 + lot, by * 2 + lotY, sd + 22)
      var park = ih(bx, by, sd + 21) < 0.07 + 0.2 * (1 - dn), c
      var lx2 = lx - lot * 4, ly2 = ly - lotY * 4
      if (night) {
        var lit = ss(0.3, 0.38, fbm(x / 80 + 500, v / 80, sd + 33, 3)), wn = ih(Math.floor(x * 1.4), Math.floor(v * 1.4), sd + 32)
        c = park ? [9, 20, 17] : (wn > 0.8 ? mix([22, 26, 42], [255, 204, 116], 0.7 * lit * (0.5 + 0.5 * ih(Math.floor(x), Math.floor(v), sd + 35))) : [20 + 12 * lh, 24 + 12 * lh, 40 + 14 * lh])
        var sg = 0.5 + 0.5 * ih(Math.floor(x / 3), Math.floor(v / 3), sd + 31)
        c = mix(c, [255, 150, 56 + 40 * sg], st1 * (0.3 + 0.45 * sg) * lit)
        if (av > 0) c = mix(c, hwy && Math.abs(ay) < 2 * Q ? [255, 236, 190] : [255, 190, 104], av * 0.72 * (0.75 + 0.25 * sg) * (0.3 + 0.7 * lit))
        if (lit < 1) { var dk = mix([8, 14, 24], [16, 26, 34], fbm(x / 30, v / 30, sd + 37, 2)), vl = ih(Math.floor(x / 2), Math.floor(v / 2), sd + 36) > 0.988; c = mix(vl ? [200, 140, 80] : dk, c, lit) }
        return c
      }
      if (park) {
        c = mix([112, 164, 88], [78, 138, 70], vnoise(x / 1.6, v / 1.6, sd + 23))
        if (ih(bx, by, sd + 24) > 0.7 && lx > 2 && lx < 6 && ly > 2 && ly < 6) c = mix(c, [96, 170, 196], 0.8)   // a pond
      } else {
        var pi = Math.floor(ih(bx * 2 + lot + 7, by * 2 + lotY, sd + 25) * 4), rc = ROOFD[dn > 0.5 ? [4, 0, 1, 6][pi] : [2, 3, 5, 3][pi]], f = 0.9 + 0.18 * lh
        c = [rc[0] * f, rc[1] * f, rc[2] * f]
        if (lx2 > 3.1 || ly2 < 0.9) c = dim(c, 0.72)            // the wall in shadow (light from the top left)
        else if (lx2 < 0.7 || ly2 > 3.2) c = dim(c, 1.06)
      }
      c = mix(c, hwy ? [66, 68, 74] : [96, 98, 104], st1 * 0.9)
      if (av > 0) {
        var ac = hwy ? [60, 62, 68] : [80, 82, 88]
        if (hwy && Math.abs(ay) < 0.35 * Q) ac = [92, 138, 84]                       // the green median
        else if (Math.abs(ax) < 0.18 * Q || Math.abs(ay) < 0.18 * Q) ac = [214, 200, 130]
        c = mix(c, ac, av)
      }
      return c
    }
    // a gently winding highway used by the countryside worlds: x as a function of the along-flight coordinate
    function hwx (v) { return RES * Q * (0.1 + 0.8 * fbm(v / 120 + sd * 3, 7.7, sd + 71, 2)) }
    var S = {
      terrace: {
        h: function (x, v, h) {
          var cx0 = Math.floor(x / 300), cy0 = Math.floor(v / 300), i, j
          for (i = -1; i <= 1; i++) for (j = -1; j <= 1; j++) {
            var ci = cx0 + i, cj = cy0 + j
            if (ih(ci, cj, sd + 7) < 0.45) continue
            var px = (ci + 0.2 + 0.6 * ih(ci, cj, sd + 8)) * 300, py = (cj + 0.2 + 0.6 * ih(ci, cj, sd + 9)) * 300
            var dx = x - px, dy = v - py, t = 1 - Math.sqrt(dx * dx + dy * dy) / 95
            if (t <= 0) continue
            h += Math.pow(t, 1.3) * 0.66 + 0.035 * Math.sin(Math.atan2(dy, dx) * 9 + t * 5) * ss(0.1, 0.45, t) * (1 - ss(0.8, 0.95, t)) - 0.14 * ss(0.9, 1.0, t)
          }
          return h
        },
        land: function (x, v, h, e, c) {
          var w = ss(0.03, 0.06, e) * (1 - ss(0.3, 0.38, e))
          if (w > 0) {
            // contour-stepped paddies: every 1/30 of height is one terrace, each with its own crop / flooded mirror
            var u = h * 26 + (vnoise(x / 16, v / 16, sd + 15) - 0.5) * 1.6, fi = Math.floor(u), fr = u - fi, pz = Math.floor(vnoise(x / 34, v / 34, sd + 12) * 3)
            var tc = TPAL[Math.floor(ih(fi, pz, sd + 13) * TPAL.length)], n = 0.92 + 0.16 * vnoise(x / 5, v / 5, sd + 14)
            var t = [tc[0] * n, tc[1] * n, tc[2] * n]
            if (fr < 0.12) t = mix(t, [58, 86, 44], 0.55 * (1 - fr / 0.12))
            else if (fr < 0.22) t = mix(t, [210, 226, 150], 0.18)
            c = mix(c, t, w)
          }
          var fo = ss(0.27, 0.33, e)
          if (fo > 0) c = mix(c, mix(P.forest, [24, 68, 34], ih(x, v, 19) * 0.5), fo)
          var rk = ss(0.42, 0.52, e)
          if (rk > 0) c = mix(c, mix([88, 80, 74], [114, 104, 96], vnoise(x / 8, v / 8, sd + 15)), rk)
          return c
        }
      },
      canyon: {
        hFull: function (x, v) {
          var m = fbm(x / 80 + 5, v / 80, sd + 3, 4), tier = ss(0.44, 0.48, m) + ss(0.55, 0.59, m)
          var h = 0.12 + 0.04 * fbm(x / 34, v / 34, sd + 4, 3) + tier * 0.15 + 0.008 * fbm(x / 10, v / 10, sd + 6, 2)
          var rv = Math.abs(fbm(x / 75 + 200, v / 115, sd + 41, 4) - 0.5)
          return Math.max(0.02, h - 0.05 * (1 - ss(0.012, 0.05, rv)) * (0.5 + 0.5 * Math.min(1, tier)))
        },
        full: true,
        land: function (x, v, h) {
          var m = fbm(x / 80 + 5, v / 80, sd + 3, 4), edge = Math.min(Math.abs(m - 0.46), Math.abs(m - 0.57))
          var sc = STRATA[Math.floor(ih(Math.floor(h * 30), 0, sd + 2) * STRATA.length)], flat = ss(0.02, 0.045, edge)
          var top = h > 0.2 ? mix([208, 128, 84], [224, 152, 102], vnoise(x / 5, v / 5, sd + 5)) : mix([232, 206, 162], [240, 220, 178], vnoise(x / 9, v / 3, sd + 7))
          var c = mix(sc, top, flat)
          if (flat > 0.5 && h < 0.2 && ih(x, v, sd + 31) > 0.9 && fbm(x / 10, v / 10, sd + 32, 2) > 0.58) c = mix(c, [112, 120, 62], 0.45)
          var rv = Math.abs(fbm(x / 75 + 200, v / 115, sd + 41, 4) - 0.5), rw = 0.011
          c = mix(c, [112, 138, 72], 0.65 * (1 - ss(rw * 1.2, rw * 2.4, rv)))
          return mix(c, mix([72, 144, 138], [96, 164, 152], vnoise(x / 4, v / 4, sd + 9)), 1 - ss(rw * 0.5, rw * 1.2, rv))
        }
      },
      arctic: {
        land: function (x, v, h, e, c) {
          var sn = ss(WD.snow - 0.01, WD.snow + 0.1, h)
          c = mix(c, mix([78, 88, 76], [104, 108, 96], vnoise(x / 6, v / 6, sd + 4)), 0.8 * (1 - sn) * ss(0.02, 0.05, e))   // lichen and scree, no field grid
          if (sn > 0) {   // the glacier: blue streaks along the flow, dark crevasses
            var g = mix([236, 243, 250], [176, 208, 232], vnoise(x / 3.2, v / 16, sd + 5))
            g = mix(g, [100, 142, 186], vnoise(x / 2, v / 5, sd + 6) > 0.8 ? 0.4 : 0)
            c = mix(c, g, sn * 0.85)
          }
          return c
        },
        sea: function (x, v, h, c, ds) {
          var f = fbm(x / 9 + 100, v / 9, sd + 81, 3), th = 0.68 - 0.1 * (1 - Math.min(1, ds / 0.06)), ice = ss(th, th + 0.025, f)
          if (ice > 0) return mix(c, mix([234, 243, 250], [188, 220, 238], vnoise(x / 2, v / 2, sd + 82)), ice)
          return fbm((x - 1.6) / 9 + 100, (v + 1.6) / 9, sd + 81, 3) > th ? mix(c, [8, 44, 70], 0.5) : c   // the floe's shadow
        }
      },
      jungle: {
        full: true,
        hFull: function (x, v) { return 0.3 + 0.4 * fbm(x / 70, v / 70, sd, 4) + (fbm(x / 22, v / 22, sd + 5, 3) - 0.5) * 0.1 },
        land: function (x, v) {
          var g = vnoise(x / 1.3, v / 1.3, sd + 2) * 0.5 + vnoise(x / 3.5, v / 3.5, sd + 3) * 0.5
          var c = mix(mix([22, 70, 32], [36, 100, 44], g), [56, 124, 56], ss(0.55, 0.9, g))
          var cx = Math.floor(x / 9), cy = Math.floor(v / 9)
          if (ih(cx, cy, sd + 4) > 0.6) {   // emergent crowns, taller than the canopy
            var px = (cx + 0.2 + 0.6 * ih(cx, cy, sd + 5)) * 9, py = (cy + 0.2 + 0.6 * ih(cx, cy, sd + 6)) * 9, r = (2.2 + 1.4 * ih(cx, cy, sd + 7)) * (0.8 + 0.4 * vnoise(x / 2, v / 2, sd + 16))
            var cr = 1 - ss(r * 0.7, r, Math.sqrt((x - px) * (x - px) + (v - py) * (v - py)))
            if (cr > 0) c = mix(c, mix([54, 118, 52], [78, 138, 58], ih(cx, cy, sd + 8)), cr * 0.8)
          }
          var cl = ss(0.66, 0.69, fbm(x / 46 + 700, v / 46, sd + 9, 3))   // a clearing: crops and a few roofs
          if (cl > 0) {
            var fx = Math.floor(x / 6), fy = Math.floor(v / 7), fc = [[168, 176, 84], [196, 180, 96], [132, 160, 70]][Math.floor(ih(fx, fy, sd + 12) * 3)]
            if (ih(fx, fy, sd + 14) > 0.82 && (x - fx * 6) > 1.5 && (x - fx * 6) < 4 && (v - fy * 7) > 2 && (v - fy * 7) < 4) fc = [190, 96, 66]
            c = mix(c, fc, cl)
          }
          var rv = Math.min(Math.abs(fbm(x / 66 + 300, v / 100, sd + 41, 4) - 0.5), Math.abs(fbm(x / 45 + 500, v / 70, sd + 42, 3) - 0.5) * 2.6), rw = 0.008
          var ms = ss(0.58, 0.85, fbm(x / 20 + 1200, v / 26, sd + 14, 3))
          c = mix(c, [232, 242, 238], 0.5 * ms * (0.3 + 0.7 * (1 - ss(0.02, 0.12, rv))))
          c = mix(c, vnoise(x / 5, v / 5, sd + 15) > 0.62 ? [214, 190, 140] : [150, 124, 84], 0.7 * (1 - ss(rw * 1.0, rw * 1.9, rv)))   // mud bank / sandbar
          return mix(c, mix([128, 92, 60], [154, 114, 76], vnoise(x / 6, v / 3, sd + 12)), 1 - ss(rw * 0.55, rw * 1.1, rv))
        }
      },
      city: { full: true, land: function (x, v, h, e) { return e < 0.03 ? [176, 176, 170] : cityCol(x, v, e, false) } },
      night: {
        full: true,
        land: function (x, v, h, e) {
          var c = e < 0.03 ? [30, 32, 40] : cityCol(x, v, e, true)
          var d = Math.abs(x - hwx(v)), cov = (1 - ss(0.3 * Q, 0.9 * Q, d)) * ss(0.03, 0.05, e)   // the bypass: a lit ribbon over everything
          return cov > 0 ? mix(c, ih(Math.floor(v / 2), 0, sd + 40) > 0.72 ? [255, 90, 70] : [255, 214, 140], cov * 0.85) : c
        },
        sea: function (x, v, h, c, ds) {
          if (ds < 0.05) c = mix(c, [255, 190, 100], 0.4 * (1 - ds / 0.05) * (vnoise(x / 1.2, v / 6, sd + 8) > 0.6 ? 1 : 0.25))   // quay lights on the water
          return ih(x, v, sd + 55) > 0.994 ? mix(c, [200, 220, 255], 0.6) : c
        }
      },
      farm: {
        land: function (x, v, h, e, c) {
          var w = ss(0.025, 0.045, e) * (1 - ss(0.32, 0.42, e))
          if (w <= 0) return c
          var wx = x + (vnoise(x / 21, v / 21, sd + 2) - 0.5) * 8, wy = v + (vnoise(x / 21 + 40, v / 21, sd + 3) - 0.5) * 8
          var fx = wx * 0.95 + wy * 0.3, fy = wy * 0.95 - wx * 0.3, cx = Math.floor(fx / 12), cy = Math.floor(fy / 15), ex = fx - cx * 12, ey = fy - cy * 15
          var fc = FARM[Math.floor(ih(cx, cy, sd + 5) * FARM.length)]
          var k = (1 + 0.07 * Math.sin((ih(cx, cy, sd + 6) > 0.5 ? fx : fy) * 2.2)) * (0.94 + 0.12 * vnoise(x / 8, v / 8, sd + 4))
          var col = [fc[0] * k, fc[1] * k, fc[2] * k], dd = Math.min(ex, 12 - ex, ey, 15 - ey)
          if (ih(cx, cy, sd + 7) > 0.35) col = mix(col, [44, 92, 44], 0.6 * (1 - ss(0.25 * Q, 0.9 * Q, dd)))   // hedgerows
          var rd = 0
          if (ih(cx, cy, sd + 91) > 0.72) rd = 1 - ss(0.3 * Q, 0.85 * Q, ex)                                      // farm tracks on the field edges
          if (ih(cx, cy, sd + 93) > 0.72) rd = Math.max(rd, 1 - ss(0.3 * Q, 0.85 * Q, ey))
          if (rd > 0) col = mix(col, [206, 184, 138], rd * 0.9)
          if (ih(cx, cy, sd + 8) > 0.86) {   // a farmstead: yard, barn, house
            var dx = ex - 6, dy = ey - 7.5
            if (dx * dx + dy * dy < 11) col = mix(col, [190, 170, 130], 0.8)
            if (Math.abs(dx + 0.6) < 2 && Math.abs(dy - 0.4) < 1.1) col = [176, 66, 48]
            else if (Math.abs(dx - 2.4) < 1.1 && Math.abs(dy + 1.4) < 0.9) col = [222, 214, 200]
          }
          if (fbm(x / 6 + 300, v / 6, sd + 9, 2) > 0.66 && ih(cx, cy, sd + 10) > 0.5) col = mix(col, [52, 100, 44], 0.8)   // copse
          return mix(c, col, w)
        }
      },
      atoll: {
        full: true,
        h: function (x, v) {
          var cx0 = Math.floor(x / 260), cy0 = Math.floor(v / 260), shelf = 0, ring = 0, i, j, wob = (fbm(x / 40 + 30, v / 40, sd + 12, 3) - 0.5) * 44
          for (i = -1; i <= 1; i++) for (j = -1; j <= 1; j++) {
            var ci = cx0 + i, cj = cy0 + j
            if (ih(ci, cj, sd + 7) < 0.25) continue
            var px = (ci + 0.2 + 0.6 * ih(ci, cj, sd + 8)) * 260, py = (cj + 0.2 + 0.6 * ih(ci, cj, sd + 9)) * 260
            var R = 62 + 28 * ih(ci, cj, sd + 10), d = Math.sqrt((x - px) * (x - px) + (v - py) * (v - py) * 1.35) + wob
            shelf = Math.max(shelf, 1 - ss(R, R * 1.55, d)); ring = Math.max(ring, Math.exp(-((d - R) / 7) * ((d - R) / 7)))
          }
          var bars = ss(0.76, 0.8, fbm(x / 9 + 50, v / 9, sd + 13, 3)) * shelf * 0.1     // sandbars inside the lagoon
          return 0.28 + 0.07 * fbm(x / 60, v / 60, sd + 2, 3) + shelf * (0.16 + 0.035 * (fbm(x / 6, v / 6, sd + 4, 2) - 0.5)) + bars + ring * 0.26 * (1.6 * fbm(x / 13 + 50, v / 13, sd + 11, 3) - 0.4)
        },
        land: function (x, v, h, e) {
          var vc = mix([46, 128, 62], [78, 160, 76], vnoise(x / 2, v / 2, sd + 3))
          if (ih(x, v, 41) > 0.78) vc = mix(vc, [26, 86, 44], 0.7)
          return mix(mix([246, 236, 198], [236, 222, 170], vnoise(x / 3, v / 3, sd + 4)), vc, ss(0.018, 0.05, e))
        },
        sea: function (x, v, h, c, ds) {
          var t = ds < 0.03 ? mix([212, 248, 238], [118, 232, 218], ds / 0.03) : ds < 0.07 ? mix([118, 232, 218], [34, 178, 206], (ds - 0.03) / 0.04) : ds < 0.12 ? mix([34, 178, 206], [14, 112, 172], (ds - 0.07) / 0.05) : mix([14, 112, 172], [10, 72, 134], Math.min(1, (ds - 0.12) / 0.1))
          if (ds < 0.1) t = mix(t, [30, 122, 120], 0.3 * ss(0.52, 0.66, fbm(x / 5 + 90, v / 5, sd + 6, 3)))   // coral heads and patch reefs
          var br = (1 - ss(0.01, 0.028, Math.abs(ds - 0.07))) * ss(0.3, 0.5, fbm(x / 4, v / 4, sd + 7, 2))     // breakers on the reef edge
          return br > 0 ? mix(t, [255, 255, 255], 0.65 * br) : t
        }
      }
    }
    return { st: S[st] || null, hwx: hwx }
  }

  function makeGround (WD, RES) {
    var Q = 168 / RES
    var P = { deep: hex(WD.deep), shallow: hex(WD.shallow), sand: hex(WD.sand), forest: hex(WD.forest), rock: hex(WD.rock), snow: [244, 246, 249], fields: WD.fields.map(hex),
      foam: WD.foamCol || [250, 252, 255], wave: WD.wave || [255, 255, 255], river: mix(hex(WD.shallow), hex(WD.deep), 0.35), roof: [[196, 92, 70], [214, 120, 84], [186, 180, 172], [150, 150, 158], [232, 226, 214]], street: [168, 164, 160] }
    var chunks = {}, queue = []
    var SO = styleOf(WD, Q, RES, P), ST = SO.st, hasSea = WD.sea > 0.01, rowMs = 0.5
    // height at map pixel (x across the screen 0..RES, v upward along the flight)
    function height (x, v) {
      var nx = x / RES
      x *= Q; v *= Q
      if (ST && ST.hFull) return ST.hFull(x, v)
      if (ST && ST.h && WD.style === 'atoll') return ST.h(x, v)
      var h = fbm(x / 70, v / 70, WD.seed, 4)
      h += (fbm(x / 22, v / 22, WD.seed + 5, 3) - 0.5) * 0.12
      h -= (0.5 - nx) * WD.coast + (WD.coast ? 0.08 * Math.sin(v / 160) * WD.coast : 0)   // the coast bends in and out
      var m = fbm(x / 48 + 9, v / 48, WD.seed + 9, 4)
      var mk = WD.mask || 0.5
      if (m > mk) {
        // ridged noise inside the mountain mask: sharp crests and valleys, the way ranges look from above
        var rg = 1 - Math.abs(fbm(x / 13 + 300, v / 13, WD.seed + 61, 4) * 2 - 1)
        h += Math.pow((m - mk) / (1 - mk), 1.4) * (0.3 + 0.35 * rg * rg) * WD.relief
      }                     // ridges where the mountain mask rises
      if (ST && ST.h) h = ST.h(x, v, h)
      return h
    }
    // every boundary (coast, beach, forest edge, rock, snow line, river bank) is a short smooth blend over its
    // threshold, not a hard per-pixel switch: scaled up 2x by the canvas, a hard switch reads as stair steps
    function seaCol (x, v, h, s) {
      var ds = s - h, d = Math.min(1, Math.max(0, ds / 0.22))
      var c = mix(P.shallow, P.deep, Math.pow(d, 0.7))
      if (WD.shelf !== false && ds < 0.07) c = mix(c, WD.shelf || [196, 240, 230], 0.42 * (1 - ss(0, 0.07, ds)))   // the shallow shelf: pale where the sand is near
      if (WD.reef && d < 0.2 && ih(x >> 1, v >> 1, 3) > 0.55) c = mix(c, [120, 230, 220], 0.35)   // lagoon reef patches
      var wv = vnoise(x / 3, v / 1.6, WD.seed + 3)                                                 // wave texture
      if (wv > 0.8) c = mix(c, P.wave, (wv - 0.8) * 0.7)
      if (ds > 0.012 && ds < 0.11) {                                                                // swell lines running parallel to the shore
        var sw = Math.sin(ds * 150 + vnoise(x / 7, v / 7, WD.seed + 6) * 3.4)
        if (sw > 0.78) c = mix(c, P.foam, (sw - 0.78) * 1.1 * (1 - ds / 0.11) * (vnoise(x / 3, v / 3, WD.seed + 8) > 0.35 ? 1 : 0.25))
      }
      if (ST && ST.sea) c = ST.sea(x, v, h, c, ds)
      return mix(c, P.foam, ss(s - 0.016, s - 0.002, h) * (0.6 + 0.4 * ih(x, v, 7)))               // the surf line
    }
    function fieldCol (x, v, e) {
      // farm fields: a patchwork on a slightly rotated grid, each field its own crop colour, hedgerows between
      var fx = x * 0.96 + v * 0.28, fy = v * 0.96 - x * 0.28
      var cx = Math.floor(fx / 7), cy = Math.floor(fy / 9), ex = fx - cx * 7, ey = fy - cy * 9
      var c = P.fields[Math.floor(ih(cx, cy, WD.seed) * P.fields.length)]
      if (ih(cx, cy, 4) > 0.7) c = mix(c, [255, 255, 255], 0.1 * Math.sin(fx * 1.7) * Math.sin(fx * 1.7))   // plough lines
      var dd = Math.min(ex, 7 - ex, ey, 9 - ey), hg = 1 - ss(0.25 * Q, 1.15 * Q, dd)
      if (hg > 0) c = mix(c, P.forest, 0.5 * hg)
      // towns: blocks of roofs on a street grid where the town mask is high, near the coast and the rivers
      var tm = fbm(x / 26 + 70, v / 26, WD.seed + 31, 3), tt = ss(1 - WD.town * 0.42, 1 - WD.town * 0.42 + 0.03, tm) * (1 - ss(0.17, 0.2, e))
      if (tt > 0) {
        var bx = Math.floor(fx / 5), by = Math.floor(fy / 5), sx = fx - bx * 5, sy = fy - by * 5
        var sd = Math.min(sx, sy, 5 - sx, 5 - sy), st2 = 1 - ss(0.3 * Q, 1.0 * Q, sd)
        var rc = P.roof[Math.floor(ih(bx, by, 13) * 5)], rs = 0.88 + 0.24 * ih(Math.floor(fx / 1.6), Math.floor(fy / 1.6), 17)
        c = mix(c, mix([rc[0] * rs, rc[1] * rs, rc[2] * rs], P.street, st2), tt)
      }
      return c
    }
    function landCol (x, v, h, s) {
      var e = h - s
      if (ST && ST.full) return ST.land(x, v, h, e)
      var c = fieldCol(x, v, e)
      // above the farmland: open meadow (fields stop where the land gets steep and high)
      var md = ss(0.13, 0.22, e)
      if (md > 0) c = mix(c, mix([128, 168, 88], [104, 146, 72], vnoise(x / 5, v / 5, 33)), md)
      var fm = fbm(x / 30 + 40, v / 30, WD.seed + 21, 3)
      var fo = ss(0.54, 0.58, fm) * ss(0.04, 0.07, e)
      if (fo > 0) c = mix(c, mix(P.forest, [30, 70, 34], ih(x, v, 9) * 0.5), fo)   // forest: dark, speckled crowns
      // up the slopes: forest, then bare rock, then snow
      var r0 = WD.rock || 0.34
      var hi = ss(r0 - 0.08, r0, e)
      if (hi > 0) c = mix(c, mix(P.forest, [28, 66, 36], ih(x, v, 19) * 0.4), hi)
      var rk = Math.max(ss(r0, r0 + 0.1, e), ss(WD.snow - 0.1, WD.snow - 0.04, h))
      if (rk > 0) c = mix(c, mix(P.rock, [120, 112, 100], ih(x >> 1, v >> 1, 23) * 0.5), rk)
      var sn = ss(WD.snow - 0.01, WD.snow + 0.03, h + (vnoise(x / 4, v / 4, 29) - 0.5) * 0.03)
      if (sn > 0) c = mix(c, P.snow, sn)
      c = mix(P.sand, c, ss(0.012, 0.028, e))   // the beach
      if (ST && ST.land) c = ST.land(x, v, h, e, c)
      if (WD.road) {   // a highway linking the flat land: a pale ribbon with a darker edge, only where the ground is low
        var rw = ss(0.03, 0.05, e) * (1 - ss(0.14, 0.2, e)), rd = Math.abs(x - SO.hwx(v))
        if (rw > 0 && rd < 1.2 * Q) c = mix(c, mix([120, 120, 122], [176, 174, 168], 1 - ss(0.3 * Q, 0.9 * Q, rd)), rw * (1 - ss(0.7 * Q, 1.2 * Q, rd)) * 0.9)
      }
      // rivers: a meandering band where a second noise crosses its middle, down to the sea
      if (WD.river && e < 0.26) {
        var rv = Math.abs(fbm(x / 60 + 200, v / 90, WD.seed + 41, 4) - 0.5), rw2 = 0.009 + e * 0.004
        var rb = 1 - ss(rw2 * 0.55, rw2 * 1.25, rv)
        if (rb > 0) c = mix(c, P.river, rb)
      }
      return c
    }
    function colour (x, v, h, shade, out, o) {
      x *= Q; v *= Q
      var s = WD.sea, c, k = ss(s - 0.004, s + 0.004, h)   // 0 = sea, 1 = land, a pixel-wide blend between
      if (k <= 0) c = seaCol(x, v, h, s)
      else if (k >= 1) { c = landCol(x, v, h, s); c = [c[0] * shade, c[1] * shade, c[2] * shade] }
      else { var l = landCol(x, v, h, s); c = mix(seaCol(x, v, h, s), [l[0] * shade, l[1] * shade, l[2] * shade], k) }
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255
    }
    function chunk (n) {
      var cv = w.document.createElement('canvas')
      cv.width = RES; cv.height = ROWS
      var ch = { n: n, cv: cv, c: cv.getContext('2d'), row: 0, done: false }
      chunks[n] = ch; queue.push(ch)
      return ch
    }
    // one slice of rows: heights with a one-pixel border for the slope, then the hill shade and the colour
    function work (ch, n) {
      var r0 = ch.row, r1 = Math.min(ROWS, r0 + (n || SLICE)), rows = r1 - r0
      var img = ch.c.createImageData(RES, rows), out = img.data
      var hw = RES + 1, hb = new Float32Array(hw * (rows + 1)), r, x
      for (r = 0; r <= rows; r++) {
        var v = (ch.n + 1) * ROWS - (r0 + r)   // row 0 is the chunk's far (top) edge
        for (x = 0; x < hw; x++) hb[r * hw + x] = height(x, v)
      }
      for (r = 0; r < rows; r++) {
        var vv = (ch.n + 1) * ROWS - (r0 + r)
        for (x = 0; x < RES; x++) {
          var h = hb[r * hw + x], dx = (hb[r * hw + x + 1] - h) * 46 / Q, dy = (hb[(r + 1) * hw + x] - h) * 46 / Q
          var nl = Math.sqrt(dx * dx + dy * dy + 1)
          var sh = 0.72 + 0.55 * ((-dx * LIGHT[0] - dy * LIGHT[1] + LIGHT[2]) / nl)
          colour(x, vv, h, WD.night ? 1 : Math.max(0.55, Math.min(1.18, sh)), out, (r * RES + x) * 4)
        }
      }
      ch.c.putImageData(img, 0, r0)
      ch.row = r1
      if (r1 >= ROWS) ch.done = true
    }
    var memo = {}, memoN = 0
    return {
      // make sure chunks a..b exist. budget >= 2: that many 3-row slices (the start, the loading screen). budget 1: one slice of
      // 1..3 rows per frame, sized from the measured cost of a row so a slice stays near 1.6 ms: a heavy world or a slow
      // device generates fewer rows per frame instead of spiking the frame
      need: function (a, b, budget) {
        var n
        for (n = a; n <= b; n++) if (!chunks[n]) chunk(n)
        for (n in chunks) if (+n < a - 1) delete chunks[n]
        queue = queue.filter(function (q) { return !q.done && chunks[q.n] === q })
        queue.sort(function (p, q) { return p.n - q.n })
        if (budget > 1) { while (budget-- > 0 && queue.length) { work(queue[0]); if (queue[0].done) queue.shift() }; return }
        if (budget < 1 || !queue.length) return
        var rows = Math.max(1, Math.min(3, Math.floor(1.6 / rowMs))), t0 = w.performance.now()
        work(queue[0], rows); if (queue[0].done) queue.shift()
        var dt = (w.performance.now() - t0) / rows
        rowMs = rowMs * 0.8 + dt * 0.2
      },
      res: RES,
      q: Q,
      hasSea: hasSea,
      get: function (n) { return chunks[n] || null },
      pending: function () { return queue.length },
      // depth of the water at a map point (> 0 = water), and whether a point is dry land: for the boats and the cars
      water: function (xm, vm) { return hasSea ? WD.sea - height(xm, vm) : -1 },
      land: function (xm, vm) {
        var key = (xm >> 3) + ',' + (vm >> 3), r = memo[key]
        if (r === undefined) {
          if (memoN > 1500) { memo = {}; memoN = 0 }
          r = height(xm, vm) - WD.sea > 0.03; memo[key] = r; memoN++
        }
        return r
      },
      // the highway's x (map pixels) at flight coordinate vm, or -1 where there is no road (water, mountain)
      road: function (vm) {
        if (!WD.road) return -1
        var xm = SO.hwx(vm * Q) / Q, e = height(xm, vm) - WD.sea
        return e > 0.05 && e < 0.15 ? xm : -1
      }
    }
  }

  function rgb (r, g, b, a, t) { return 'rgba(' + Math.round(r * t[0]) + ',' + Math.round(g * t[1]) + ',' + Math.round(b * t[2]) + ',' + a + ')' }
  // ---- cloud puffs from above: rounded heaps, sunlit tops, soft grey undersides; and their shadows ----
  function puff (seed, wpx, hpx, dark, tone) {
    var tn = tone || [1, 1, 1]
    var cv = w.document.createElement('canvas')
    cv.width = wpx; cv.height = hpx
    var c = cv.getContext('2d'), i
    for (i = 0; i < 26; i++) {
      var a = hash(seed + i) * 6.283, rr = Math.sqrt(hash(seed + i + 40))
      var x = wpx / 2 + Math.cos(a) * rr * wpx * 0.3, y = hpx / 2 + Math.sin(a) * rr * hpx * 0.26
      var r = Math.min(wpx, hpx) * (0.16 + hash(seed + i + 80) * 0.16)
      var g = c.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r)
      if (dark) { g.addColorStop(0, 'rgba(18,40,62,.34)'); g.addColorStop(1, 'rgba(18,40,62,0)') } else {
        g.addColorStop(0, rgb(255, 255, 255, 1, tn)); g.addColorStop(0.55, rgb(246, 249, 252, 0.95, tn)); g.addColorStop(0.85, rgb(214, 224, 236, 0.6, tn)); g.addColorStop(1, rgb(214, 224, 236, 0, tn))
      }
      c.fillStyle = g
      c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill()
    }
    return cv
  }

  var A = null   // per-run state (built by assets(): the run's world, its ground generator and its cloud canvases)
  function state (run) {
    if (A && A.lvl === run.lvl) return A
    var WD = worldOf(run.lvl)
    var vw = run.W || w.innerWidth || 800
    A = { lvl: run.lvl, WD: WD, ground: makeGround(WD, Math.max(150, Math.min(300, Math.round(vw / 2)))), puffs: [], shadows: [], wisps: [], frame: 0, boats: {} }
    var i
    for (i = 0; i < 4; i++) { A.puffs.push(puff(i * 31 + WD.seed, 300, 190, false, WD.cloud)); A.shadows.push(puff(i * 31 + WD.seed, 300, 190, true)) }
    for (i = 0; i < 2; i++) A.wisps.push(puff(i * 57 + 900, 360, 120, false, WD.cloud))
    return A
  }

  // the ground scrolls at GROUND x the obstacle speed, the deck at DECK, the wisps at WISP: height above the ground
  var GROUND = 0.32, DECK = 0.62, WISP = 2.1
  function drawGround (c, run, Z, G, S) {
    var RES = S.ground.res, W = run.W, H = run.H, k = W / RES, chH = ROWS * k
    var off = Z * G.pyu * GROUND + run.t * 2   // a little drift even on the grid, the plane never hangs still
    var nBot = Math.floor(off / chH), nTop = Math.floor((off + H) / chH)
    // two chunks of map kept ready above the screen; one slice every other frame keeps the frame cost flat
    S.ground.need(nBot, nTop + 2, S.warm ? 2 : 1)
    c.imageSmoothingEnabled = true
    var n
    S.vis = 0
    for (n = nBot; n <= nTop; n++) {
      var ch = S.ground.get(n)
      if (!ch || !ch.done) S.vis++
      var y = H - ((n + 1) * chH - off)
      if (ch && ch.row > 0) c.drawImage(ch.cv, 0, 0, RES, ch.row, 0, Math.floor(y), W, Math.ceil(ch.row * k) + 1)
    }
    if (S.WD.bloom) {   // night: the lights bleed a little past their edges
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.18
      for (n = nBot; n <= nTop; n++) {
        var bc = S.ground.get(n), by = H - ((n + 1) * chH - off)
        if (bc && bc.row > 0) c.drawImage(bc.cv, 0, 0, RES, bc.row, -W * 0.012, Math.floor(by) - 3, W * 1.024, Math.ceil(bc.row * k) + 7)
      }
      c.restore()
    }
    if (!S.grain) S.grain = grain()
    if (S.grain) {
      c.save(); c.globalAlpha = S.WD.night ? 0.3 : 0.5; c.globalCompositeOperation = 'overlay'
      c.translate(0, wrap(off, 128)); c.fillStyle = S.grain; c.fillRect(0, -128, W, H + 128); c.restore()
    }
    return off
  }
  // a 128 px tile of fine grain (crop rows, tree crowns, roofs at screen resolution): drawn in 'overlay' it adds detail
  // the low-resolution map cannot hold, and it scrolls with the ground
  function grain () {
    try {
      var cv = w.document.createElement('canvas'); cv.width = cv.height = 128
      var c = cv.getContext('2d'), im = c.createImageData(128, 128), d = im.data, i
      for (i = 0; i < 128 * 128; i++) { var v = 128 + (ih(i & 127, i >> 7, 77) - 0.5) * 70 + (vnoise((i & 127) / 3, (i >> 7) / 3, 78) - 0.5) * 50; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255 }
      c.putImageData(im, 0, 0)
      return c.createPattern(cv, 'repeat')
    } catch (e) { return null }
  }
  function drawShadows (c, run, off, S) {
    var W = run.W, H = run.H, gap = H * 0.42, sx = W * 0.07, sy = H * 0.05
    var first = Math.floor(off / gap) - 1, i
    for (i = first; i < first + Math.ceil(H / gap) + 3; i++) {
      if (hash(i * 3 + S.WD.seed) < 0.35) continue
      var y = H - (i * gap - off) + sy, x = hash(i + 11) * W * 1.1 - W * 0.05 + sx, s = W * (0.32 + hash(i + 23) * 0.3)
      c.globalAlpha = 0.6
      c.drawImage(S.shadows[i & 3], x - s / 2, y - s * 0.32, s, s * 0.63)
    }
    c.globalAlpha = 1
  }
  function drawDeck (c, run, Z, G, S, alpha, speed, size, so) {
    var W = run.W, H = run.H, gap = H * 0.42 * size, off = Z * G.pyu * (speed || DECK) + run.t * 5
    var first = Math.floor(off / gap) - 1, i
    for (i = first; i < first + Math.ceil(H / gap) + 3; i++) {
      if (hash(i * 3 + S.WD.seed + (so || 0)) < 0.35) continue
      var y = H - (i * gap - off), x = hash(i + 11 + (so || 0)) * W * 1.1 - W * 0.05, s = W * (0.32 + hash(i + 23 + (so || 0)) * 0.3) * size
      c.globalAlpha = alpha * (0.78 + hash(i + 5) * 0.22)
      c.drawImage(S.puffs[(i + (so ? 1 : 0)) & 3], x - s / 2, y - s * 0.32, s, s * 0.63)
    }
    c.globalAlpha = 1
  }

  // ---- life on the ground and in the air: boats with V wakes, cars on the roads, a flock, an airliner, light shafts ----
  var CARS = ['#E2463F', '#F2F2F0', '#2E6FD8', '#F5C531', '#2F2F34', '#4FA85C', '#E8782E']
  function boats (c, run, off, S, tt) {
    var G = S.ground, WD = S.WD, k = run.W / G.res, H = run.H, u = run.W / 390, night = WD.night, sp = 34, i
    if (!WD.boats || !G.hasSea) return
    var v0 = Math.floor(off / k / sp) - 1, v1 = Math.ceil((off + H) / k / sp) + 1
    delete S.boats[v0 - 6]
    c.lineCap = 'round'
    for (i = v0; i <= v1; i++) {
      var b = S.boats[i]
      if (b === undefined) {
        var xm = (0.06 + 0.88 * hash(i * 5 + WD.seed)) * G.res, vm = (i + hash(i * 3 + 7 + WD.seed)) * sp
        b = G.water(xm, vm) > 0.085 && hash(i * 7 + 3) < WD.boats * 0.85 ? { x: xm, v: vm, dir: hash(i * 11) < 0.5 ? -1 : 1, big: hash(i * 13) > 0.78, col: hash(i * 17), ang: (hash(i * 19) - 0.5) * 0.5 } : null
        S.boats[i] = b
      }
      if (!b) continue
      var vv = b.v + b.dir * tt * 0.45, y = H - (vv * k - off), x = (b.x + b.ang * b.dir * tt * 0.45) * k
      if (y < -40 || y > H + 40) continue
      var L = (b.big ? 22 : 11) * u, rot = Math.atan2(-b.dir, b.ang * b.dir)
      c.save(); c.translate(x, y); c.rotate(rot)
      var wk = c.createLinearGradient(-L * 0.5, 0, -L * 3.2, 0)   // the wake: a foam V, widening and fading behind the stern
      wk.addColorStop(0, 'rgba(255,255,255,' + (night ? 0.22 : 0.34) + ')'); wk.addColorStop(1, 'rgba(255,255,255,0)')
      c.fillStyle = wk
      c.beginPath(); c.moveTo(-L * 0.45, 0); c.lineTo(-L * 3.2, -L * 0.8); c.lineTo(-L * 3.2, L * 0.8); c.closePath(); c.fill()
      c.strokeStyle = night ? 'rgba(200,220,255,.3)' : 'rgba(255,255,255,.7)'; c.lineWidth = Math.max(1, 1.2 * u)
      c.beginPath(); c.moveTo(-L * 0.45, 0); c.lineTo(-L * 3.2, -L * 0.8); c.moveTo(-L * 0.45, 0); c.lineTo(-L * 3.2, L * 0.8); c.stroke()
      if (night) {
        c.fillStyle = 'rgba(255,240,200,.95)'; c.fillRect(-L * 0.2, -1.1 * u, 2.2 * u, 2.2 * u)
        c.fillStyle = b.col < 0.5 ? 'rgba(255,70,60,.9)' : 'rgba(80,255,130,.9)'; c.fillRect(L * 0.3, -L * 0.2, 1.6 * u, 1.6 * u)
      } else if (b.big) {   // a freighter: dark hull, stacked containers
        c.fillStyle = '#2B3340'; c.beginPath(); c.ellipse(0, 0, L * 0.5, L * 0.17, 0, 0, 6.3); c.fill()
        var j
        for (j = 0; j < 5; j++) { c.fillStyle = ['#D64B3C', '#3A7BD5', '#E9A93A', '#EDEDED', '#4FA85C'][(j + Math.floor(b.col * 7)) % 5]; c.fillRect(-L * 0.36 + j * L * 0.115, -L * 0.1, L * 0.1, L * 0.2) }
        c.fillStyle = '#F4F4F2'; c.fillRect(L * 0.32, -L * 0.08, L * 0.1, L * 0.16)
      } else {
        c.fillStyle = 'rgba(8,30,50,.25)'; c.beginPath(); c.ellipse(0.8 * u, 1 * u, L * 0.52, L * 0.22, 0, 0, 6.3); c.fill()
        c.fillStyle = b.col < 0.5 ? '#F4F4F2' : '#E2463F'; c.beginPath(); c.ellipse(0, 0, L * 0.5, L * 0.2, 0, 0, 6.3); c.fill()
        c.fillStyle = '#3A7BD5'; c.fillRect(-L * 0.1, -L * 0.1, L * 0.22, L * 0.2)
      }
      c.restore()
    }
  }
  // cars: tiny moving dots on the highway (countryside) and on the avenues (the cities), two lanes, each lane its own way
  function car (c, x, y, ci, night, u, dirY) {
    if (night) {
      c.fillStyle = 'rgba(255,200,120,.28)'; c.fillRect(x - 2 * u, y - 2.4 * u, 4 * u, 4.8 * u)
      c.fillStyle = dirY < 0 ? '#FFF6D8' : '#FF5A4A'; c.fillRect(x - 0.7 * u, y - 1.1 * u, 1.4 * u, 2.2 * u)
    } else { c.fillStyle = CARS[ci % CARS.length]; c.fillRect(x - 0.9 * u, y - 1.7 * u, 1.8 * u, 3.4 * u) }
  }
  function cars (c, run, off, S, tt) {
    var G = S.ground, WD = S.WD, k = run.W / G.res, H = run.H, u = run.W / 390, night = !!WD.night, j, s
    var vlo = off / k - 20, vhi = (off + H) / k + 20
    if (night) c.globalCompositeOperation = 'lighter'
    if (WD.road) {
      var sp = 11
      for (j = Math.floor(vlo / sp); j <= Math.ceil(vhi / sp); j++) {
        if (hash(j * 3 + WD.seed) < 0.3) continue
        var dir = hash(j * 5 + 2) < 0.5 ? -1 : 1, vm = j * sp + hash(j * 7) * sp * 0.8 + dir * tt * 3, xm = G.road(vm)
        if (xm < 0) continue
        car(c, xm * k + dir * 1.4 * u, H - (vm * k - off), j, night, u, -dir)
      }
    }
    if (WD.grid) {
      var Qk = G.q, step = 32 / Qk, lines = Math.round(vlo / step) - 1, lh
      for (lh = lines; lh <= Math.round(vhi / step) + 1; lh++) {   // along the avenues
        var hwy = ((lh % 3) + 3) % 3 === 0
        for (s = 0; s < 6; s++) {
          if (hash(lh * 13 + s * 7 + WD.seed) < 0.35) continue
          var d2 = s & 1 ? 1 : -1, vm2 = lh * step + d2 * (hwy ? 0.9 : 0.6) / Qk, xm2 = (hash(lh * 17 + s * 3) * G.res + d2 * tt * (hwy ? 9 : 5) + G.res * 4) % G.res
          if (G.land(xm2, vm2)) car(c, xm2 * k, H - (vm2 * k - off), lh + s, night, u * 0.9, 0)
        }
      }
      var cols = Math.floor(G.res * Qk / 32)
      for (lh = 1; lh <= cols; lh++) {   // and down the cross streets
        var xm3 = lh * step
        for (s = Math.floor(vlo / 30); s <= Math.ceil(vhi / 30); s++) {
          if (hash(lh * 19 + s * 11 + WD.seed) < 0.55) continue
          var d3 = hash(lh * 3 + s) < 0.5 ? 1 : -1, vm3 = s * 30 + hash(lh + s * 5) * 26 + d3 * tt * 5
          if (G.land(xm3, vm3)) car(c, xm3 * k + d3 * 0.7 * u * 1.8, H - (vm3 * k - off), lh * 7 + s, night, u * 0.9, -d3)
        }
      }
    }
    c.globalCompositeOperation = 'source-over'
  }
  // a V of birds crossing the deck, and a high airliner trailing a contrail (it passes under the cloud deck)
  function flock (c, run, Z, G, S, tt) {
    if (!S.WD.birds) return
    var W = run.W, H = run.H, u = W / 390, gap = H * 1.3, off = Z * G.pyu * 0.5 + tt * 8, first = Math.floor(off / gap) - 1, i, b
    c.strokeStyle = 'rgba(40,52,64,.7)'; c.lineWidth = Math.max(1, 1.1 * u); c.lineCap = 'round'
    for (i = first; i < first + 3; i++) {
      if (hash(i * 5 + 31) < 0.5) continue
      var y = H - (i * gap - off), x = W * (0.15 + 0.7 * hash(i + 77)) + Math.sin(tt * 0.4 + i) * W * 0.04
      for (b = 0; b < 7; b++) {
        var side = b & 1 ? 1 : -1, rank = Math.ceil(b / 2), bx = x + side * rank * 9 * u, by = y + rank * 7 * u, fl = Math.sin(tt * 9 + b * 1.3) * 1.6 * u
        c.beginPath(); c.moveTo(bx - 3.4 * u, by - 1.6 * u + fl); c.lineTo(bx, by); c.lineTo(bx + 3.4 * u, by - 1.6 * u + fl); c.stroke()
      }
    }
  }
  function airliner (c, run, S, tt) {
    var W = run.W, H = run.H, u = W / 390, cyc = 30, ep = Math.floor(tt / cyc), p = tt / cyc - ep
    if (p > 0.8 || hash(ep * 3 + 5) < 0.2) return
    var q = p / 0.8, dirx = hash(ep + 9) < 0.5 ? 1 : -1, y0 = H * (0.12 + 0.5 * hash(ep + 3)), dy = H * 0.12 * (hash(ep + 6) - 0.5)
    var x = dirx > 0 ? -0.1 * W + q * 1.2 * W : 1.1 * W - q * 1.2 * W, y = y0 + dy * q, ang = Math.atan2(dy * 1.0 / 1.2 / W * 0.8, dirx)
    var tx = dirx > 0 ? -0.1 * W : 1.1 * W, ty = y0
    var g = c.createLinearGradient(x, y, tx, ty)
    g.addColorStop(0, 'rgba(255,255,255,' + (S.WD.night ? 0.18 : 0.55) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)')
    c.strokeStyle = g; c.lineWidth = 2.2 * u; c.lineCap = 'round'
    c.beginPath(); c.moveTo(x, y); c.lineTo(tx, ty); c.stroke()
    c.save(); c.translate(x, y); c.rotate(ang + (dirx > 0 ? 0 : Math.PI))
    c.fillStyle = S.WD.night ? 'rgba(210,220,240,.9)' : '#F8F8F6'
    c.beginPath(); c.moveTo(-9 * u, -1.1 * u); c.lineTo(8 * u, -0.7 * u); c.lineTo(11 * u, 0); c.lineTo(8 * u, 0.7 * u); c.lineTo(-9 * u, 1.1 * u); c.closePath(); c.fill()   // fuselage
    c.beginPath(); c.moveTo(-1 * u, 0); c.lineTo(-6 * u, -9 * u); c.lineTo(-3.4 * u, -9 * u); c.lineTo(4 * u, 0); c.lineTo(-3.4 * u, 9 * u); c.lineTo(-6 * u, 9 * u); c.closePath(); c.fill()   // swept wings
    c.beginPath(); c.moveTo(-8 * u, 0); c.lineTo(-11 * u, -3.6 * u); c.lineTo(-9.4 * u, -3.6 * u); c.lineTo(-6.6 * u, 0); c.lineTo(-9.4 * u, 3.6 * u); c.lineTo(-11 * u, 3.6 * u); c.closePath(); c.fill()   // tailplane
    if (S.WD.night && Math.sin(tt * 6) > 0.3) { c.fillStyle = '#FF5A4A'; c.fillRect(-1 * u, -9 * u, 1.6 * u, 1.6 * u); c.fillStyle = '#7CFF9A'; c.fillRect(-1 * u, 7.6 * u, 1.6 * u, 1.6 * u) }
    c.restore()
  }
  // light shafts: a few long soft beams from the sun's side, drifting slowly; they lighten, never block
  function rays (c, run, S, tt) {
    var WD = S.WD, W = run.W, H = run.H
    if (WD.rays === 0) return
    var sx = WD.sun[0] * W, i, a = 0.5 + 0.12 * Math.sin(tt * 0.35)
    c.save(); c.globalCompositeOperation = 'lighter'
    for (i = 0; i < 5; i++) {
      var ang = 0.22 + (i - 2) * 0.13 + Math.sin(tt * 0.12 + i * 1.7) * 0.03, wd = W * (0.05 + 0.06 * hash(i + 4)), len = H * 1.3, dx = Math.sin(ang) * len * (sx < W / 2 ? 1 : -1), dy = Math.cos(ang) * len
      var g = c.createLinearGradient(sx, -H * 0.1, sx + dx, -H * 0.1 + dy)
      g.addColorStop(0, 'rgba(' + (WD.glint || '255,248,228') + ',' + (0.11 * a) + ')'); g.addColorStop(1, 'rgba(' + (WD.glint || '255,248,228') + ',0)')
      c.fillStyle = g
      c.beginPath(); c.moveTo(sx - wd * 0.2, -H * 0.1); c.lineTo(sx + wd * 0.2, -H * 0.1); c.lineTo(sx + dx + wd, -H * 0.1 + dy); c.lineTo(sx + dx - wd, -H * 0.1 + dy); c.closePath(); c.fill()
    }
    c.restore()
  }

  function bunting (c, run, y, sc) {
    var W = run.W, cols = ['#E2463F', '#FFD24A', '#3FA9F5', '#5BC46A', '#FF8A3D'], n = 12, i
    c.strokeStyle = 'rgba(60,60,60,.6)'; c.lineWidth = 2
    c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(W / 2, y + 24 * sc, W, y); c.stroke()
    for (i = 0; i < n; i++) {
      var t = (i + 0.5) / n, x = t * W, yy = y + 4 * t * (1 - t) * 24 * sc
      c.fillStyle = cols[i % cols.length]
      c.beginPath(); c.moveTo(x - 9 * sc, yy); c.lineTo(x + 9 * sc, yy); c.lineTo(x, yy + 20 * sc); c.closePath(); c.fill()
    }
  }
  // an air-race pylon: a tall inflatable cone, two colour bands, a soft ground shadow (seen from above it is a ring + cone)
  function pylon (c, x, y, s, col) {
    c.fillStyle = 'rgba(10,30,50,.18)'
    c.beginPath(); c.ellipse(x + s * 0.5, y + s * 0.35, s * 0.42, s * 0.2, 0.4, 0, 6.3); c.fill()
    var g = c.createLinearGradient(x - s * 0.3, 0, x + s * 0.3, 0)
    g.addColorStop(0, col); g.addColorStop(0.55, '#FFFFFF'); g.addColorStop(1, col)
    c.fillStyle = g
    c.beginPath(); c.moveTo(x - s * 0.3, y + s * 0.2); c.lineTo(x - s * 0.08, y - s * 0.95); c.lineTo(x + s * 0.08, y - s * 0.95); c.lineTo(x + s * 0.3, y + s * 0.2); c.closePath(); c.fill()
    c.fillStyle = col
    c.fillRect(x - s * 0.2, y - s * 0.45, s * 0.4, s * 0.14)
    c.beginPath(); c.ellipse(x, y + s * 0.2, s * 0.3, s * 0.09, 0, 0, 6.3); c.fill()
  }
  function opening (run) { return run.progress < 0.075 ? run.progress / 0.075 : -1 }
  function arrival (run) { if (run.progress <= 0.9) return -1; var o = Math.min(1, (run.progress - 0.9) / 0.1); return o * o * (3 - 2 * o) }

  T.skins.aerial = {
    cat: 'balap',
    assets: function (lvl) {
      A = null
      state({ lvl: lvl })
      // the first screens of map, generated while the art loads (the race starts on a finished ground)
      A.ground.need(0, 6, 0)
      while (A.ground.pending()) A.ground.need(0, 6, 8)
      return ['lib:tk-prop/seagull', 'lib:game/hot-air-balloon', 'lib:tk-world/storm-cloud', 'lib:game/gem-blue']
    },
    obs: ['gull', 'balloon', 'storm'],
    keys: { gull: 'lib:tk-prop/seagull', balloon: 'lib:game/hot-air-balloon', storm: 'lib:tk-world/storm-cloud' },
    big: 'lib:game/gem-blue',
    laneCol: '255,255,255',
    zoneLine: 'Angin dari belakang! Tekan TURBO saat lingkarannya merah!',
    layers: ['ground-map', 'cloud-shadows', 'haze', 'sea-glint', 'cloud-deck', 'plane', 'wisps'],
    // the start: the plane climbs out of a white cloud bank; the finish: two race pylons with a chequered banner
    ends: function (c, run, G) {
      var S = state(run), W = run.W, H = run.H, k = opening(run), i
      if (k >= 0) {
        var a = 1 - k
        c.globalAlpha = a * 0.92
        c.fillStyle = '#F4F8FC'
        c.fillRect(0, H * (0.55 + k * 0.6), W, H)
        for (i = 0; i < 9; i++) {
          var s = W * (0.45 + hash(i + 3) * 0.3)
          c.drawImage(S.puffs[i & 3], hash(i) * W - s / 2, H * (0.45 + k * 0.6) + hash(i + 9) * H * 0.2 - s * 0.3, s, s * 0.63)
        }
        c.globalAlpha = 1
      }
      var o = arrival(run)
      if (o >= 0) {
        var ay = -80 + o * (G.py - G.ps * 1.9 + 80), ps = G.ps * 1.3
        pylon(c, W * 0.14, ay, ps, '#E2463F'); pylon(c, W * 0.86, ay, ps, '#E2463F')
        var sq = Math.max(8, W * 0.022), x
        for (x = W * 0.14; x < W * 0.86; x += sq) {
          c.fillStyle = Math.floor((x - W * 0.14) / sq) % 2 ? '#1F2328' : '#FFFFFF'
          c.fillRect(x, ay - ps * 0.85, Math.min(sq, W * 0.86 - x), sq)
          c.fillStyle = Math.floor((x - W * 0.14) / sq) % 2 ? '#FFFFFF' : '#1F2328'
          c.fillRect(x, ay - ps * 0.85 + sq, Math.min(sq, W * 0.86 - x), sq)
        }
        bunting(c, run, ay - ps * 0.55, 0.8)
      }
    },
    bg: function (c, run, Z, G) {
      var S = state(run), WD = S.WD, W = run.W, H = run.H
      S.warm = run.progress < 0.02
      c.fillStyle = WD.sky[0]; c.fillRect(0, 0, W, H)
      var off = drawGround(c, run, Z, G, S)
      drawShadows(c, run, off, S)
      var tt = run.reduced() ? 0 : run.t
      boats(c, run, off, S, tt)
      cars(c, run, off, S, tt)
      drawDeck(c, run, Z, G, S, 0.5, 0.42, 0.8, 100)   // a thin low deck, further down: slower than the main one (parallax)
      // aerial perspective: the ground is far below, so it is lighter and bluer toward the top of the screen (further off)
      var hz = c.createLinearGradient(0, 0, 0, H)
      var ha = WD.hazeA || 1
      hz.addColorStop(0, 'rgba(' + WD.haze + ',' + 0.5 * ha + ')'); hz.addColorStop(0.45, 'rgba(' + WD.haze + ',' + 0.24 * ha + ')'); hz.addColorStop(1, 'rgba(' + WD.haze + ',' + 0.12 * ha + ')')
      c.fillStyle = hz; c.fillRect(0, 0, W, H)
      // the sun's glint: a bright soft spot and a sparkle band that slides as the plane moves
      var gx = WD.sun[0] * W + Math.sin(run.t * 0.1) * W * 0.02, gy = WD.sun[1] * H + H * 0.3
      var gl = c.createRadialGradient(gx, gy, 0, gx, gy, W * 0.5)
      var gc = WD.glint || '255,248,228'
      gl.addColorStop(0, 'rgba(' + gc + ',.42)'); gl.addColorStop(0.4, 'rgba(' + gc + ',.12)'); gl.addColorStop(1, 'rgba(' + gc + ',0)')
      c.globalCompositeOperation = 'lighter'
      c.fillStyle = gl; c.fillRect(0, 0, W, H)
      if (!run.reduced()) {
        var i
        c.fillStyle = '#FFFFFF'
        for (i = 0; i < 26; i++) {
          var px = gx + (hash(i) - 0.5) * W * 0.55, py = gy + (hash(i + 30) - 0.5) * H * 0.4
          var tw = Math.sin(run.t * (3 + hash(i + 60) * 4) + i * 2.1)
          if (tw > 0.75) { c.globalAlpha = (tw - 0.75) * 2.4; c.fillRect(px, py, 2, 2) }
        }
        c.globalAlpha = 1
      }
      c.globalCompositeOperation = 'source-over'
      rays(c, run, S, tt)
      if (WD.grade) { c.fillStyle = WD.grade; c.fillRect(0, 0, W, H) }
      if (!run.reduced()) airliner(c, run, S, tt)
      drawDeck(c, run, Z, G, S, 0.9, DECK, 1, 0)
      if (!run.reduced()) flock(c, run, Z, G, S, tt)
    },
    // over the plane: a few thin wisps rushing past (speed); never more than a light veil, the race stays readable
    fg: function (c, run, Z, G) {
      if (run.reduced()) return
      var S = state(run), W = run.W, H = run.H, gap = H * 0.9, off = Z * G.pyu * WISP + run.t * 30
      var first = Math.floor(off / gap) - 1, i
      for (i = first; i < first + 3; i++) {
        if (hash(i * 7 + 2) < 0.45) continue
        var y = H - (i * gap - off), x = hash(i + 41) < 0.5 ? W * 0.12 : W * 0.88, s = W * 0.5
        c.globalAlpha = 0.28
        c.drawImage(S.wisps[i & 1], x - s / 2, y - s * 0.17, s, s * 0.33)
      }
      c.globalAlpha = 1
    },
    debug: function () { return A ? { world: A.lvl && A.lvl.theme && A.lvl.theme.world, pending: A.ground.pending(), visPending: A.vis || 0 } : null }
  }
})(window)
