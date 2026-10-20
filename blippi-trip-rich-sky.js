/* G32 Blippi -- UDARA (the sky, seen from above the clouds): eight procedural worlds for the 'sky' skin (T.rich.sky).
 * Far to near: sky gradient with the sun's glow baked in -> stars / moon / aurora / shooting stars (night) -> a far GROUND map
 * (bay, candy patchwork, village lights, green valley with snow peaks, dunes, city blocks) tinted by haze, parallax 0.12 ->
 * rainbow -> cloud shadows -> clouds at three depths (puffy baked sprites tinted per world) -> ambient life (flocks, eagles, an
 * airliner with a contrail, balloons, kites, a blimp, helicopters, lanterns, other aircraft lights) -> weather and light (god
 * rays, heat shimmer, dust devils, mist, thunder with lightning that lights the clouds) -> vignette; `fg` draws thin wisps and
 * motes over the plane. All motion is a function of world z (Z * G.pyu) and run.t, never of a random number per frame. */
(function (w) {
  'use strict'
  var T = w.BlippiTrip
  var R = T.rich
  var hash = R.hash, wrap = R.wrap, css = R.css

  // ground: kind, haze (rgb) amount; cloud tint; sun [x,y,r] (fractions), rays; life lists
  var WORLDS = {
    bay: { ground: 'bay', hazeA: 0.4, cloud: [255, 255, 255], sun: [0.8, 0.04, 0.5], rays: [[255, 240, 200], 0.14], birds: 2, bird: '#FFFFFF', airliner: 1, balloon: 1, boats: 1, deck: [5, 4, 2], shadow: 1 },
    rainbow: { ground: 'candy', hazeA: 0.3, cloud: [255, 214, 236], sun: [0.2, 0.02, 0.4], rays: [[255, 250, 230], 0.1], rainbow: 1, kite: 4, balloon: 3, sparkle: 1, deck: [5, 4, 2], shadow: 1 },
    sunset: { ground: 'bay', hazeA: 0.5, cloud: [255, 190, 160], sun: [0.5, 0.2, 1], rays: [[255, 170, 90], 0.14], birds: 3, bird: '#4A3558', airliner: 1, warm: 1, deck: [5, 4, 2], shadow: 1, dim: [255, 120, 70, 0.1] },
    night: { ground: 'lights', hazeA: 0.32, hazeCol: '#0E1840', cloud: [120, 130, 200], stars: 1, moon: 1, aurora: 1, shoot: 1, lantern: 1, planes: 1, deck: [4, 3, 2], shadow: 0 },
    valley: { ground: 'valley', hazeA: 0.35, cloud: [255, 255, 255], sun: [0.25, 0.04, 0.5], rays: [[255, 245, 210], 0.14], eagle: 2, balloon: 1, mist: 1, deck: [4, 3, 2], shadow: 1 },
    desert: { ground: 'desert', hazeA: 0.45, cloud: [255, 240, 220], sun: [0.7, 0.0, 0.7], rays: [[255, 220, 140], 0.12], eagle: 2, shimmer: 1, dust: 1, balloon: 1, deck: [3, 2, 1], shadow: 1, dim: [255, 180, 80, 0.06] },
    city: { ground: 'city', hazeA: 0.3, cloud: [255, 225, 215], sun: [0.3, 0.1, 0.6], rays: [[255, 200, 150], 0.12], blimp: 1, heli: 2, airliner: 1, search: 1, deck: [4, 3, 2], shadow: 1 },
    thunder: { ground: null, cloud: [58, 64, 92], dark: 1, thunder: 1, deck: [7, 6, 4], shadow: 0, dim: [20, 30, 60, 0.25], wall: 1, curtains: 1, sheet: 1 }
  }

  // ---- ground tiles: periodic noise baked at 128 px, smoothed up to 512 ----
  var N = 256
  function pn (i, j, p, s, o) { return R.pfbm(i / N * p, j / N * p, p, s, o || 4) }
  var HEX = R.rgb
  function m3 (a, b, t) { return R.mix(a, b, Math.max(0, Math.min(1, t))) }
  var GFN = {
    bay: function (i, j) {
      var h = pn(i, j, 5, 11), n2 = pn(i, j, 8, 5, 3)
      if (h < 0.5) { var t = h / 0.5; return h > 0.47 ? [236, 246, 250] : m3(HEX('#2F7FB5'), HEX('#6CC6D8'), t * t * 1.3) }
      if (h < 0.525) return HEX('#EAD9A0')
      var g = m3(m3(HEX('#8CBF63'), HEX('#B5C86C'), n2), HEX('#4F8A46'), (h - 0.55) * 4)
      if (n2 > 0.66 && h < 0.62) g = ((i >> 4) + (j >> 4)) % 2 ? [201, 200, 120] : [150, 190, 96]   // fields
      return g
    },
    candy: function (i, j) {
      var n = pn(i, j, 5, 21, 3), C = ['#FFC1DD', '#C9B8FF', '#BDEBD8', '#FFE6A6', '#FFD3B0', '#B8DFFF'], k = Math.floor(n * 6) % 6
      var c = HEX(C[k]); return ((i + j) % 22 < 2) ? m3(c, [255, 255, 255], 0.4) : c
    },
    lights: function (i, j) {
      var n = pn(i, j, 5, 31, 3), c = m3(HEX('#0B1330'), HEX('#16244A'), n), tw = pn(i, j, 14, 77, 2)
      // towns glow where the density noise peaks: a warm halo, bright windows inside, thin road lines of light between them
      if (n > 0.56) { c = m3(c, [120, 90, 70], Math.min(0.35, (n - 0.56) * 1.6)); if (R.hash(i * 131 + j * 7 + 3) < (n - 0.5) * 0.55) { var l = R.hash(i + j * 17); return m3(c, l < 0.75 ? [255, 218, 140] : [200, 225, 255], 0.95) } }
      if (Math.abs(tw - 0.5) < 0.008) c = m3(c, [255, 200, 130], 0.4)
      return c
    },
    valley: function (i, j) {
      var h = pn(i, j, 4, 41, 5), hx = pn(i + 1, j, 4, 41, 5), hy = pn(i, j - 1, 4, 41, 5), n2 = pn(i, j, 9, 3, 3)
      var c = h < 0.42 ? m3(HEX('#8FC46A'), HEX('#A6CF72'), n2) : h < 0.56 ? m3(HEX('#4F8A46'), HEX('#3F7A3D'), n2) : h < 0.68 ? m3(HEX('#8E8A7C'), HEX('#A39E8E'), n2) : [244, 248, 252]
      var rv = Math.abs(pn(i, j, 4, 7, 3) - 0.5)
      if (rv < 0.012 && h < 0.6) c = HEX('#6FB5D8')
      var sh = 1 + ((h - hx) + (hy - h)) * 70
      return [c[0] * Math.max(0.6, Math.min(1.35, sh)), c[1] * Math.max(0.6, Math.min(1.35, sh)), c[2] * Math.max(0.6, Math.min(1.35, sh))]
    },
    desert: function (i, j) {
      var w2 = pn(i, j, 4, 51, 3) * 6, ph = (i * 3 + j * 2) / N * 6.283, v = Math.sin(ph + w2) * 0.5 + 0.5, mesa = pn(i, j, 5, 61, 3)   // whole cycles per tile: no seam
      var c = m3(HEX('#E9BE70'), HEX('#F6DDA2'), v)
      if (Math.cos(ph + w2) < -0.7) c = m3(c, HEX('#C98F4A'), 0.7)
      if (mesa > 0.68) c = m3(HEX('#B5683A'), HEX('#D88B52'), (mesa - 0.68) * 6)
      return c
    },
    city: function (i, j) {
      var ci = i >> 4, cj = j >> 4, li = i & 15, lj = j & 15, hh = R.hash(ci * 73 + cj * 19 + 5)
      if (Math.abs(pn(i, j, 3, 9, 2) - 0.5) < 0.025) return HEX('#7FA9D0')   // the river
      var road = li < 2 || lj < 2 || (ci % 4 === 0 && li < 4) || (cj % 4 === 0 && lj < 4)
      if (road) return (li === 0 || lj === 0) && R.hash(i + j * 3) < 0.5 ? HEX('#6B7280') : HEX('#4F5663')
      if (hh < 0.13) return m3(HEX('#5E9A58'), HEX('#79B06A'), R.hash(i * 3 + j)) // a park
      // two buildings per block, each with its own roof, a lit side, a shadow side and a few lit windows
      var half = lj < 9 ? 0 : 1, bh2 = R.hash(ci * 31 + cj * 17 + half * 7), roofs = ['#C9CED8', '#9AA3B5', '#E3D5C6', '#B7C2D6', '#D9B8A6', '#E8DCCB', '#8E9AB0']
      var c = HEX(roofs[(bh2 * 61 | 0) % roofs.length]), top = lj < 9 ? 2 : 9
      if (lj === 8 || lj === 15 || li === 15) c = m3(c, [30, 36, 60], 0.5)
      else if (li < 4 && lj < top + 3 + half * 0) c = m3(c, [255, 255, 255], 0.28)
      if (bh2 > 0.62 && li > 3 && li < 13 && lj % 4 === 1 && R.hash(i * 5 + j) < 0.5) c = [255, 226, 150]
      if (bh2 < 0.18) c = m3(c, [60, 70, 100], 0.25)   // a lower, shadier block
      return c
    }
  }
  function groundTile (kind, hz, ha) {
    return R.sprite('sky-g' + kind + hz[0] + hz[1] + hz[2] + ha, 512, 512, function (x) {
      var cv = w.document.createElement('canvas'); cv.width = cv.height = N
      var cx = cv.getContext('2d'), im = cx.createImageData(N, N), d = im.data, i, j
      for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
        var c = R.mix(GFN[kind](i, j), hz, ha), p = (j * N + i) * 4
        d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255
      }
      cx.putImageData(im, 0, 0)
      x.imageSmoothingEnabled = true; x.drawImage(cv, 0, 0, 512, 512)
    }, 1)
  }

  // ---- sprites ----
  function cloudS (tint, v, dark) {
    var key = 'sky-cloud' + tint.join('-') + v
    return R.sprite(key, 260, 160, function (x) {
      var i, n = 9
      x.translate(20, 20)   // a margin: the puffs reach past the 220 x 120 core, and a clipped puff is a flat edge
      for (i = 0; i < n; i++) {
        var cx = 40 + hash(v * 31 + i) * 140, cy = 62 + (hash(v * 31 + i + 9) - 0.5) * 36, r = 26 + hash(v * 31 + i + 19) * 24
        var g = x.createRadialGradient(cx, cy + r * 0.28, 0, cx, cy + r * 0.28, r)
        var sh = R.mix(tint, [60, 70, 110], dark ? 0.5 : 0.35)
        g.addColorStop(0, R.css(sh, 0.5)); g.addColorStop(1, R.css(sh, 0)); x.fillStyle = g; x.fillRect(cx - r, cy - r + r * 0.28, r * 2, r * 2)
      }
      for (i = 0; i < n; i++) {
        var cx2 = 40 + hash(v * 31 + i) * 140, cy2 = 56 + (hash(v * 31 + i + 9) - 0.5) * 36, r2 = 26 + hash(v * 31 + i + 19) * 24
        var g2 = x.createRadialGradient(cx2, cy2, 0, cx2, cy2, r2), top = dark ? R.mix(tint, [190, 198, 224], 0.42) : R.mix(tint, [255, 255, 255], 0.6)
        g2.addColorStop(0, R.css(top, 1)); g2.addColorStop(0.55, R.css(R.mix(top, tint, 0.35), 0.92)); g2.addColorStop(1, R.css(tint, 0))
        x.fillStyle = g2; x.fillRect(cx2 - r2, cy2 - r2, r2 * 2, r2 * 2)
      }
    }, 1)
  }
  function balloonS (a, b) {
    return R.sprite('sky-bal' + a + b, 44, 54, function (x) {
      x.fillStyle = 'rgba(20,40,80,.16)'; x.beginPath(); x.ellipse(26, 28, 17, 19, 0, 0, 6.3); x.fill()
      var i
      for (i = 0; i < 8; i++) { x.fillStyle = i % 2 ? a : b; x.beginPath(); x.moveTo(22, 24); x.arc(22, 24, 19, i * 0.785, (i + 1) * 0.785); x.closePath(); x.fill() }
      var g = x.createRadialGradient(16, 17, 1, 22, 24, 19); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(22, 24, 19, 0, 6.3); x.fill()
      x.fillStyle = '#8A5A2B'; x.fillRect(19, 43, 6, 6)
    })
  }
  var kiteS = function (a) {
    return R.sprite('sky-kite' + a, 30, 56, function (x) {
      x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(15, 28); x.bezierCurveTo(8, 38, 22, 44, 14, 54); x.stroke()
      x.fillStyle = a; x.beginPath(); x.moveTo(15, 2); x.lineTo(28, 16); x.lineTo(15, 32); x.lineTo(2, 16); x.closePath(); x.fill()
      x.fillStyle = 'rgba(255,255,255,.4)'; x.beginPath(); x.moveTo(15, 2); x.lineTo(28, 16); x.lineTo(15, 16); x.closePath(); x.fill()
      x.strokeStyle = 'rgba(0,0,0,.2)'; x.beginPath(); x.moveTo(15, 2); x.lineTo(15, 32); x.moveTo(2, 16); x.lineTo(28, 16); x.stroke()
    })
  }
  var linerS = R.sprite('sky-liner', 70, 76, function (x) {
    x.fillStyle = 'rgba(20,40,80,.14)'; x.beginPath(); x.ellipse(40, 42, 24, 30, 0, 0, 6.3); x.fill()
    x.fillStyle = '#F3F6FA'
    x.beginPath(); x.moveTo(35, 4); x.quadraticCurveTo(41, 10, 40, 30); x.lineTo(68, 52); x.lineTo(68, 58); x.lineTo(40, 48); x.lineTo(40, 62); x.lineTo(50, 70); x.lineTo(50, 74); x.lineTo(35, 70); x.lineTo(20, 74); x.lineTo(20, 70); x.lineTo(30, 62); x.lineTo(30, 48); x.lineTo(2, 58); x.lineTo(2, 52); x.lineTo(30, 30); x.quadraticCurveTo(29, 10, 35, 4); x.fill()
    x.fillStyle = '#4A90D9'; x.fillRect(33, 10, 4, 52)
  })
  var blimpS = R.sprite('sky-blimp', 54, 120, function (x) {
    x.fillStyle = 'rgba(20,40,80,.15)'; x.beginPath(); x.ellipse(32, 66, 17, 50, 0, 0, 6.3); x.fill()
    x.fillStyle = '#E2463F'; x.beginPath(); x.moveTo(27, 108); x.lineTo(14, 120); x.lineTo(27, 114); x.lineTo(40, 120); x.lineTo(27, 108); x.fill()
    x.beginPath(); x.moveTo(18, 100); x.lineTo(4, 110); x.lineTo(22, 104); x.fill(); x.beginPath(); x.moveTo(36, 100); x.lineTo(50, 110); x.lineTo(32, 104); x.fill()
    var g = x.createLinearGradient(8, 0, 46, 0); g.addColorStop(0, '#C9D4E6'); g.addColorStop(0.45, '#FFFFFF'); g.addColorStop(1, '#9AA9C4')
    x.fillStyle = g; x.beginPath(); x.ellipse(27, 56, 19, 54, 0, 0, 6.3); x.fill()
    x.fillStyle = '#FFB347'; x.fillRect(8, 40, 38, 6); x.fillRect(8, 64, 38, 6)
    x.fillStyle = '#3B4A66'; x.fillRect(24, 52, 6, 14)
  })
  var heliS = R.sprite('sky-heli', 40, 60, function (x) {
    x.fillStyle = 'rgba(20,40,80,.16)'; x.beginPath(); x.ellipse(24, 32, 8, 20, 0, 0, 6.3); x.fill()
    x.fillStyle = '#E2463F'; x.beginPath(); x.ellipse(20, 22, 8, 14, 0, 0, 6.3); x.fill(); x.fillRect(18.5, 30, 3, 26)
    x.fillStyle = '#9CD8FF'; x.beginPath(); x.ellipse(20, 14, 5, 6, 0, 0, 6.3); x.fill()
    x.fillStyle = '#E2463F'; x.fillRect(14, 54, 12, 3)
  })
  var eagleS = R.sprite('sky-eagle', 70, 44, function (x) {
    x.fillStyle = '#5A3E2A'; x.beginPath(); x.moveTo(35, 6)
    x.quadraticCurveTo(22, 4, 2, 20); x.lineTo(6, 22); x.quadraticCurveTo(14, 18, 24, 22); x.lineTo(28, 32); x.lineTo(24, 42); x.lineTo(35, 36); x.lineTo(46, 42); x.lineTo(42, 32); x.lineTo(46, 22)
    x.quadraticCurveTo(56, 18, 64, 22); x.lineTo(68, 20); x.quadraticCurveTo(48, 4, 35, 6); x.fill()
    x.fillStyle = '#F4EDE0'; x.beginPath(); x.arc(35, 9, 4, 0, 6.3); x.fill()
    x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; x.beginPath(); x.moveTo(12, 16); x.lineTo(30, 24); x.moveTo(58, 16); x.lineTo(40, 24); x.stroke()
  })
  var wispS = R.sprite('sky-wisp', 300, 50, function (x) {
    var g = x.createRadialGradient(150, 75, 0, 150, 75, 150); g.addColorStop(0, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)')
    x.save(); x.scale(1, 0.33); x.fillStyle = g; x.fillRect(0, 0, 300, 150); x.restore()   // centred in the 50 px sprite, nothing clipped
  }, 1)
  var rainbowS = R.sprite('sky-rainbow', 520, 300, function (x) {
    var C = ['#FF6B6B', '#FFA94D', '#FFE066', '#8CE99A', '#74C0FC', '#9775FA'], i
    x.lineCap = 'butt'
    for (i = 0; i < C.length; i++) { x.strokeStyle = C[i]; x.lineWidth = 15; x.beginPath(); x.arc(260, 290, 240 - i * 14, Math.PI, 0); x.stroke() }
  }, 1)
  var auroraS = R.sprite('sky-aurora', 400, 600, function (x) {
    var i
    for (i = 0; i < 44; i++) {
      var cx = i * 9, top = 70 + Math.sin(i * 0.35) * 70 + Math.sin(i * 0.9) * 26, bot = 330 + Math.sin(i * 0.5 + 1) * 90
      var g = x.createLinearGradient(0, top, 0, bot)
      var t = i / 44, col = t < 0.5 ? R.mix([90, 255, 170], [90, 230, 230], t * 2) : R.mix([90, 230, 230], [170, 120, 255], (t - 0.5) * 2)
      g.addColorStop(0, R.css(col, 0)); g.addColorStop(0.2, R.css(col, 0.85)); g.addColorStop(0.7, R.css(col, 0.36)); g.addColorStop(1, R.css(col, 0))
      x.fillStyle = g; x.fillRect(cx, top, 10, bot - top)
    }
  }, 1)
  var moonS = R.sprite('sky-moon', 80, 80, function (x) {
    var g = x.createRadialGradient(40, 40, 8, 40, 40, 40); g.addColorStop(0, 'rgba(230,238,255,.55)'); g.addColorStop(1, 'rgba(230,238,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 80, 80)
    x.fillStyle = '#F5F2DC'; x.beginPath(); x.arc(40, 40, 15, 0, 6.3); x.fill()
    x.fillStyle = 'rgba(190,180,150,.5)'; x.beginPath(); x.arc(35, 36, 3.5, 0, 6.3); x.arc(46, 44, 4.5, 0, 6.3); x.arc(40, 30, 2.4, 0, 6.3); x.fill()
  }, 1)
  var swirlS = R.sprite('sky-swirl', 70, 70, function (x) {
    x.strokeStyle = 'rgba(214,160,90,.55)'; x.lineWidth = 3; x.lineCap = 'round'
    var i
    for (i = 0; i < 4; i++) { x.beginPath(); x.arc(35, 35, 8 + i * 7, i * 1.3, i * 1.3 + 3.6); x.stroke() }
  }, 1)

  var curtainS = R.sprite('sky-curtain', 320, 320, function (x) {
    var i, a, b
    x.lineCap = 'round'
    for (i = 0; i < 14; i++) {
      var px = hash(i + 1) * 320, py = hash(i + 21) * 320, len = 90 + hash(i + 41) * 120
      for (a = -1; a <= 1; a++) for (b = -1; b <= 1; b++) {
        var g = x.createLinearGradient(px + a * 320, py + b * 320, px + a * 320 - len * 0.3, py + b * 320 + len)
        g.addColorStop(0, 'rgba(210,225,255,0)'); g.addColorStop(0.5, 'rgba(210,225,255,.2)'); g.addColorStop(1, 'rgba(210,225,255,0)')
        x.strokeStyle = g; x.lineWidth = 6 + hash(i + 61) * 10; x.beginPath(); x.moveTo(px + a * 320, py + b * 320); x.lineTo(px + a * 320 - len * 0.3, py + b * 320 + len); x.stroke()
      }
    }
  }, 1)

  T.rich.skyGround = groundTile
  T.rich.sky = function (run, th) {
    var key = (th.world && WORLDS[th.world]) ? th.world : 'bay'
    var C = WORLDS[key]
    var S = { bands: {}, key: key, storm: C.thunder ? R.storm() : null, sx: 0.5, shoot: { next: 3, t: -9, x: 0, y: 0 }, sheet: { next: 1, t: -9, x: 0, y: 0 } }
    var sk = th.sky || ['#BFE6FF', '#EAF7FF']
    var hz = R.rgb(C.hazeCol || sk[1])
    var layers = ['gradient']
    if (C.stars) layers.push('stars', 'moon')
    if (C.aurora) layers.push('aurora')
    if (C.shoot) layers.push('shooting-stars')
    if (C.ground) layers.push('ground-map')
    if (C.rainbow) layers.push('rainbow')
    if (C.shadow) layers.push('cloud-shadows')
    layers.push('clouds-far', 'clouds-mid')
    if (C.birds || C.eagle) layers.push('birds')
    if (C.airliner) layers.push('airliner-contrail')
    if (C.balloon || C.kite || C.blimp) layers.push('balloons-kites')
    if (C.heli) layers.push('helicopters')
    if (C.lantern || C.planes) layers.push('night-lights')
    if (C.search) layers.push('searchlights')
    if (C.shimmer) layers.push('heat-shimmer')
    if (C.dust) layers.push('dust-devils')
    if (C.mist) layers.push('mist')
    if (C.rays) layers.push('god-rays')
    if (C.wall) layers.push('storm-wall')
    if (C.sheet) layers.push('sheet-lightning')
    if (C.curtains) layers.push('rain-curtains')
    if (C.thunder) layers.push('lightning', 'cloud-glow')
    layers.push('clouds-near', 'vignette', 'plane', 'wisps')

    var tint = C.cloud
    function sky (x, W, H) {
      var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, sk[0]); g.addColorStop(1, sk[1]); x.fillStyle = g; x.fillRect(0, 0, W, H)
      if (C.sun) {
        var sx = C.sun[0] * W, sy = C.sun[1] * H, r = Math.max(W, H) * 0.55 * C.sun[2]
        var g2 = x.createRadialGradient(sx, sy, 2, sx, sy, r); g2.addColorStop(0, 'rgba(255,248,215,.85)'); g2.addColorStop(0.2, 'rgba(255,225,160,.4)'); g2.addColorStop(1, 'rgba(255,210,150,0)')
        x.fillStyle = g2; x.fillRect(0, 0, W, H)
        if (C.warm) { x.fillStyle = '#FFF3C4'; x.beginPath(); x.arc(sx, sy, 34, 0, 6.3); x.fill() }
      }
    }
    function cloudLayer (c, Z, G, n, f, size, a, seed, par, dk) {
      var W = run.W, H = run.H, span = H + size * 2, i
      for (i = 0; i < n; i++) {
        var x = hash(seed + i) * (W + size) - size / 2 + par
        var y = wrap(hash(seed + i + 50) * span + Z * G.pyu * f + run.t * 6 * f, span) - size
        var s = size * (0.75 + hash(seed + i + 90) * 0.5)
        c.globalAlpha = a
        c.drawImage(cloudS(tint, (seed + i) % 4, dk), x - s * 0.6 * 1.1818, y - s * 0.33 * 1.3333, s * 1.2 * 1.1818, s * 0.66 * 1.3333)
      }
      c.globalAlpha = 1
    }
    function flock (c, Z, G, i, col, n, par, speed) {
      var W = run.W, H = run.H, t = run.t, k = G.pyu, dir = i % 2 ? -1 : 1
      var fx = wrap(hash(i + 20) * (W + 240) + t * speed * dir, W + 240) - 120 + par, fy = wrap(hash(i + 21) * (H + 300) + Z * k * 0.85 - t * 10, H + 300) - 150, j, b = R.bird(col)
      for (j = 0; j < n; j++) {
        var ox = (j % 2 ? 1 : -1) * ((j + 1) >> 1) * 20 * dir * 0 + (j % 2 ? 1 : -1) * ((j + 1) >> 1) * 18, oy = ((j + 1) >> 1) * 16
        R.flap(c, b, fx + ox, fy + oy, 22, dir * 0.7 + Math.sin(t * 0.8 + j) * 0.04, t, j + i)
      }
    }
    function bg (c, run_, Z, G) {
      var W = run.W, H = run.H, t = run.t, k = G.pyu, lite = R.lite(run), i
      S.sx += (run.in.x - S.sx) * 0.08
      var par = R.par(S.sx, 30)
      R.full(S, c, run, 'sky', sky)
      if (C.ground) R.band(S, c, run, 'ground', groundTile(C.ground, hz, C.hazeA), 512, Z * k * 0.12, par * 0.35)
      if (C.stars) {
        c.fillStyle = '#FFFFFF'
        for (i = 0; i < (lite ? 30 : 64); i++) { c.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.3 + i)); c.fillRect(hash(i + 7) * W + par * 0.2, hash(i + 77) * H * 0.9, i % 7 === 0 ? 3 : 2, i % 7 === 0 ? 3 : 2) }
        c.globalAlpha = 1
      }
      if (C.moon) R.put(c, moonS, W * 0.72 + par * 0.25, H * 0.13, 150, 150)
      if (C.aurora) {
        var sw = 1 + Math.sin(t * 0.6) * 0.06
        c.globalAlpha = 0.8 + 0.2 * Math.sin(t * 0.8)
        c.drawImage(auroraS, -W * 0.1 + par * 0.3 + Math.sin(t * 0.3) * 18, -H * 0.02, W * 1.2 * sw, H * 0.62)
        if (!lite) { c.globalAlpha = 0.35 + 0.2 * Math.sin(t * 0.55 + 2); c.save(); c.translate(W * 0.9 + par * 0.2, 0); c.scale(-1, 1); c.drawImage(auroraS, 0, H * 0.02, W * 0.9, H * 0.5); c.restore() }
        c.globalAlpha = 1
      }
      if (C.shoot && !lite) {
        var sh = S.shoot
        if (t > sh.next) { sh.t = t; sh.next = t + 3 + Math.random() * 4; sh.x = W * (0.2 + Math.random() * 0.7); sh.y = H * (0.02 + Math.random() * 0.3) }
        var age = t - sh.t
        if (age < 0.9) {
          var px = sh.x - age * W * 0.5, py = sh.y + age * H * 0.2, g = c.createLinearGradient(px, py, px + W * 0.12, py - H * 0.048)
          g.addColorStop(0, 'rgba(255,255,255,' + (1 - age / 0.9) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)')
          c.strokeStyle = g; c.lineWidth = 2.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(px, py); c.lineTo(px + W * 0.12, py - H * 0.048); c.stroke()
        }
      }
      if (C.rainbow) {
        var ry = wrap(Z * k * 0.3 + H * 0.45, H * 1.8) - H * 0.35
        c.globalAlpha = 0.75; c.drawImage(rainbowS, W * 0.5 - W * 0.55 + par * 0.5, ry, W * 1.1, W * 0.64); c.globalAlpha = 1
      }
      if (C.thunder) { c.fillStyle = 'rgba(20,30,60,' + C.dim[3] + ')'; c.fillRect(0, 0, W, H) }
      if (C.wall) {   // a dark wall of storm along the horizon edge, baked once
        R.full(S, c, run, 'wall', function (x, Wd, Hd) {
          var q
          for (q = 0; q < 16; q++) { var cx = hash(q + 300) * Wd, cy = hash(q + 330) * Hd * 0.22, r = 70 + hash(q + 360) * 90, g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(24,30,52,.7)'); g.addColorStop(1, 'rgba(24,30,52,0)'); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2) }
        }, null, 0.5)
      }
      if (C.shadow) {   // the far deck's shadows on the ground, pushed away from the sun
        var off = C.sun && C.sun[0] > 0.5 ? -26 : 26
        for (i = 0; i < 3; i++) {
          var sx2 = hash(1 + i) * (W + 160) - 80 + off + par * 0.4, sy2 = wrap(hash(51 + i) * (H + 300) + Z * k * 0.18, H + 300) - 150
          c.globalAlpha = 0.09; c.fillStyle = '#1B2A4A'; c.beginPath(); c.ellipse(sx2, sy2, 90 + i * 22, 40 + i * 9, 0.2, 0, 6.3); c.fill()
        }
        c.globalAlpha = 1
      }
      var dk = !!C.dark || key === 'night'
      cloudLayer(c, Z, G, lite ? Math.ceil(C.deck[0] / 2) : C.deck[0], 0.25, 140, key === 'thunder' ? 0.95 : 0.62, 1, par * 0.3, dk)
      cloudLayer(c, Z, G, C.deck[1], 0.55, 210, key === 'thunder' ? 0.95 : 0.72, 20, par * 0.6, dk)
      // ambient life, between the far clouds and the near ones
      if (C.birds) for (i = 0; i < (lite ? 1 : C.birds); i++) flock(c, Z, G, i, C.bird, lite ? 3 : 5, par * 0.7, 20 + i * 5)
      if (C.eagle) for (i = 0; i < C.eagle; i++) {
        var ex = W * (0.2 + 0.6 * hash(i + 3)) + Math.sin(t * 0.35 + i * 3) * 70 + par * 0.7, ey = wrap(hash(i + 8) * (H + 260) + Z * k * 0.8 - t * 8, H + 260) - 130
        R.put(c, eagleS, ex, ey, 60, 38, Math.cos(t * 0.35 + i * 3) * 0.5)
      }
      if (C.airliner) {
        var ax = wrap(t * 12 + hash(5) * W, W + 200) - 100, ay = wrap(hash(6) * (H + 400) + Z * k * 0.6, H + 400) - 200
        var rot = 1.05
        c.save(); c.translate(ax + par * 0.5, ay); c.rotate(rot)
        var cg = c.createLinearGradient(0, 0, 0, 300); cg.addColorStop(0, 'rgba(255,255,255,.55)'); cg.addColorStop(1, 'rgba(255,255,255,0)')
        c.fillStyle = cg; c.fillRect(-3, 34, 6, 300); c.fillRect(-12, 34, 4, 220); c.fillRect(8, 34, 4, 220)
        c.drawImage(linerS, -24, -26, 48, 52); c.restore()
      }
      if (C.balloon) for (i = 0; i < C.balloon; i++) {
        var bx = hash(i + 90) * W * 0.8 + W * 0.1 + Math.sin(t * 0.3 + i) * 12 + par * 0.8, by = wrap(hash(i + 91) * (H + 300) + Z * k * 0.45 - t * 9, H + 300) - 150
        var cols = [['#FF6B6B', '#FFE066'], ['#4DABF7', '#FFFFFF'], ['#9775FA', '#FFA94D']][i % 3]
        R.put(c, balloonS(cols[0], cols[1]), bx, by, 38, 46, Math.sin(t * 0.5 + i) * 0.08, 0.9)
      }
      if (C.kite) for (i = 0; i < C.kite; i++) {
        var kx = hash(i + 100) * W + Math.sin(t * 0.9 + i * 2) * 28 + par * 0.6, ky = wrap(hash(i + 101) * (H + 240) + Z * k * 0.5 - t * 15, H + 240) - 120
        R.put(c, kiteS(['#FF8FB1', '#FFD86B', '#7CE3B0', '#7FB8FF'][i % 4]), kx, ky, 26, 48, Math.sin(t * 1.4 + i) * 0.25, 0.9)
      }
      if (C.sparkle && !lite) { c.fillStyle = '#FFFFFF'; for (i = 0; i < 26; i++) { var tw = Math.sin(t * (2 + hash(i + 140) * 3) + i * 1.7); if (tw > 0.55) { c.globalAlpha = (tw - 0.55) * 2.2; var sx3 = hash(i + 150) * W, sy3 = wrap(hash(i + 160) * H + Z * k * 0.3, H); c.fillRect(sx3 - 1, sy3 - 4, 2, 8); c.fillRect(sx3 - 4, sy3 - 1, 8, 2) } } c.globalAlpha = 1 }
      if (C.blimp) R.put(c, blimpS, wrap(t * 6 + 60, W + 160) - 80 + par * 0.6, wrap(Z * k * 0.5 + 300, H + 400) - 200, 40, 90, 0.9)
      if (C.heli) for (i = 0; i < C.heli; i++) {
        var hx = wrap(hash(i + 110) * (W + 200) + t * (24 + i * 8) * (i % 2 ? -1 : 1), W + 200) - 100 + par * 0.6, hy = wrap(hash(i + 111) * (H + 300) + Z * k * 0.7, H + 300) - 150
        R.put(c, heliS, hx, hy, 30, 45, (i % 2 ? -1 : 1) * 1.1)
        c.save(); c.translate(hx, hy); c.rotate(t * 28); c.strokeStyle = 'rgba(40,50,70,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-20, 0); c.lineTo(20, 0); c.moveTo(0, -20); c.lineTo(0, 20); c.stroke(); c.restore()
        if (Math.floor(t * 2 + i) % 2) { c.fillStyle = '#FF5A5A'; c.beginPath(); c.arc(hx, hy, 2.5, 0, 6.3); c.fill() }
      }
      if (C.planes) for (i = 0; i < 2; i++) {
        var lx = wrap(hash(i + 120) * (W + 200) + t * 10 * (i ? -1 : 1), W + 200) - 100, ly = wrap(hash(i + 121) * (H + 300) + Z * k * 0.5, H + 300) - 150
        R.put(c, linerS, lx, ly, 30, 32, (i ? -1 : 1) * 1.1, 0.35)
        c.fillStyle = Math.floor(t * 1.6 + i) % 2 ? '#FF5A5A' : '#7DFFA0'; c.beginPath(); c.arc(lx, ly, 2.2, 0, 6.3); c.fill()
      }
      if (C.lantern) {
        var g = R.glow('255,200,110', 12)
        for (i = 0; i < (lite ? 6 : 12); i++) { c.globalAlpha = 0.5 + 0.4 * Math.sin(t * 2 + i); c.drawImage(g, wrap(hash(i + 130) * W + Math.sin(t * 0.6 + i) * 16, W) - 12, wrap(hash(i + 131) * (H + 80) + Z * k * 0.5 - t * 14, H + 80) - 52, 24, 24) }
        c.globalAlpha = 1
      }
      if (C.search) for (i = 0; i < 2; i++) {
        var bx2 = W * (0.2 + i * 0.6), by2 = wrap(hash(i + 170) * (H + 300) + Z * k * 0.12, H + 300) - 100
        c.save(); c.translate(bx2, by2); c.rotate(-1.1 + Math.sin(t * 0.7 + i * 2) * 0.5); c.globalAlpha = 0.16
        c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(0, 0); c.lineTo(520, -34); c.lineTo(520, 34); c.closePath(); c.fill(); c.restore(); c.globalAlpha = 1
      }
      if (C.shimmer && !lite) {
        c.strokeStyle = 'rgba(255,240,200,.1)'; c.lineWidth = 3
        for (i = 0; i < 6; i++) { var yy = H * (0.45 + i * 0.09); c.beginPath(); var xx; for (xx = 0; xx <= W; xx += 18) { var wy = yy + Math.sin(xx * 0.03 + t * 2 + i * 1.7) * 5; if (!xx) c.moveTo(xx, wy); else c.lineTo(xx, wy) } c.stroke() }
      }
      if (C.dust) for (i = 0; i < 2; i++) {
        var dx = W * (0.25 + 0.5 * hash(i + 180)) + par * 0.35, dy = wrap(hash(i + 181) * (H + 300) + Z * k * 0.12, H + 300) - 100
        c.save(); c.translate(dx, dy); c.rotate(t * 2.4); c.globalAlpha = 0.7; c.drawImage(swirlS, -32, -32, 64, 64); c.restore(); c.globalAlpha = 1
      }
      if (C.mist) { c.globalAlpha = 0.4; for (i = 0; i < 2; i++) c.drawImage(wispS, wrap(hash(i + 190) * W + t * 7, W + 400) - 300, wrap(hash(i + 191) * H + Z * k * 0.3, H + 100) - 50, 600, 100); c.globalAlpha = 1 }
      if (C.rays) R.rays(S, c, run, C.rays[0], C.rays[1] * (C.sun ? 1 : 0.6), C.sun ? C.sun[0] : 0.5)
      if (C.curtains) R.band(S, c, run, 'curtain', curtainS, 320, Z * k * 1.7 + t * 260, par * 0.6 - t * 80, 0.7)
      if (C.sheet && !lite) {   // sheet lightning: a far cloud lights up from inside, no bolt
        var sh2 = S.sheet
        if (t > sh2.next) { sh2.t = t; sh2.next = t + 1.4 + Math.random() * 2.6; sh2.x = Math.random() * W; sh2.y = Math.random() * H * 0.6 }
        var ag = t - sh2.t
        if (ag < 0.35) { c.globalAlpha = (1 - ag / 0.35) * 0.75; R.put(c, R.glow('200,215,255', 90), sh2.x, sh2.y, 300, 300); c.globalAlpha = 1 }
      }
      if (C.thunder) {
        var fl = R.stormStep(S.storm, run)
        if (fl > 0) {
          c.fillStyle = 'rgba(225,232,255,' + (fl * 0.4) + ')'; c.fillRect(0, 0, W, H)
          if (S.storm.bolt) { c.globalAlpha = fl * 0.9; c.drawImage(R.glow('220,230,255', 90), S.storm.bolt[3][0] - 140, S.storm.bolt[3][1] - 140, 280, 280); c.globalAlpha = 1 }
        }
        R.drawBolt(c, S.storm, run)
      }
      cloudLayer(c, Z, G, lite ? 1 : C.deck[2], 1.1, 320, key === 'thunder' ? 0.8 : 0.42, 40, par * 1.1, dk)
      if (C.dim) { c.fillStyle = 'rgba(' + C.dim[0] + ',' + C.dim[1] + ',' + C.dim[2] + ',' + (key === 'thunder' ? 0 : C.dim[3]) + ')'; c.fillRect(0, 0, W, H) }
      R.full(S, c, run, 'vig', function (x, Wd, Hd) {
        var g = x.createRadialGradient(Wd / 2, Hd * 0.5, Math.min(Wd, Hd) * 0.45, Wd / 2, Hd * 0.5, Math.max(Wd, Hd) * 0.8)
        g.addColorStop(0, 'rgba(20,30,70,0)'); g.addColorStop(1, 'rgba(20,30,70,' + (key === 'night' || key === 'thunder' ? 0.3 : 0.1) + ')')
        x.fillStyle = g; x.fillRect(0, 0, Wd, Hd)
      }, null, 0.5)
    }
    function fg (c, run_, Z, G) {
      if (run.reduced()) return
      var W = run.W, H = run.H, gap = H * 0.9, off = Z * G.pyu * 1.5 + run.t * 30, first = Math.floor(off / gap) - 1, i
      for (i = first; i < first + 3; i++) {
        if (hash(i * 7 + 2) < 0.5) continue
        var y = H - (i * gap - off), x = hash(i + 41) < 0.5 ? W * 0.1 : W * 0.9
        c.globalAlpha = key === 'night' ? 0.12 : 0.22
        c.drawImage(wispS, x - 150, y - 25, 300, 50)
      }
      c.globalAlpha = 1
    }
    return { layers: layers, bg: bg, fg: fg, key: key }
  }
})(window)
