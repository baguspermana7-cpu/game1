/* G32 Blippi -- AIR (the sea, seen from above): eight procedural worlds for blippi-trip-top.js (T.rich.sea).
 * Drawn far to near (the engine paints its own three wave bands, the old island sprites and the boat between `under` and `over`):
 *   under  seabed (reef / sand / ice / silt / lagoon, parallax 0.5), caustic net, fish schools, rays, turtles, whales, jellyfish,
 *          bioluminescence  -- everything beneath the surface, softly tinted by the water
 *   over   structures at the edges (harbour docks + lighthouse, palm islets, ice floes with seals, delta banks with reeds, rock
 *          stacks), ambient vessels, dolphins that leap, gulls and their shadows, cloud shadows, sun / moon glitter, storm swell,
 *          whitecaps, lightning, mist, god rays, a vignette
 *   fg     bow spray / snow / bioluminescent wake over the boat
 * Everything scrolls by world z (Z * G.pyu * factor). Obstacles live in x 0.14..0.86, so structures hug the edges. */
(function (w) {
  'use strict'
  var T = w.BlippiTrip
  var R = T.rich
  var hash = R.hash, wrap = R.wrap, css = R.css

  // ---- the eight worlds (theme.world); bed = seabed kind + alpha, caust = caustic alpha, the rest are counts ----
  var W = {
    harbour: { bed: 'sand', bedA: 0.4, caust: 0.16, fish: 2, fishCol: '#2E6C8A', dolphin: 0, gull: 2, gullCol: '#FFFFFF', dock: 1, light: 1, buoy: 1, vessel: ['sail', 'ferry'], shadow: 0.1, rays: [[255, 226, 170], 0.16, 0.8], glint: [[255, 244, 210], 0.55, 0.7], tint: [255, 214, 150, 0.06] },
    reef: { bed: 'reef', bedA: 0.42, caust: 0.24, fish: 6, fishCol: '#FF9A3C', turtle: 2, dolphin: 1, gull: 1, gullCol: '#FFFFFF', islet: 1, buoy: 1, shadow: 0.1, rays: [[255, 255, 230], 0.14, 0.3], glint: [[255, 255, 240], 0.55, 0.5] },
    arctic: { bed: 'ice', bedA: 0.3, whale: 1, floe: 1, gull: 1, gullCol: '#F4FBFF', fog: 0.36, shadow: 0.1, glint: [[235, 248, 255], 0.5, 0.5], tint: [200, 230, 255, 0.1], snow: 1 },
    sunset: { light: 1, fish: 2, fishCol: '#1F4E7A', dolphin: 2, gull: 3, gullCol: '#40305A', vessel: ['sail', 'sail', 'sail'], silhouette: 1, buoy: 1, shadow: 0.14, rays: [[255, 170, 90], 0.22, 0.62], glint: [[255, 214, 120], 0.8, 0.62], tint: [255, 140, 70, 0.08], flare: 1 },
    lagoon: { bed: 'lagoon', bedA: 0.55, caust: 0.28, fish: 5, fishCol: '#2B8FA8', ray: 2, turtle: 1, dolphin: 1, gull: 1, gullCol: '#FFFFFF', islet: 2, vessel: ['canoe'], shadow: 0.08, rays: [[255, 255, 235], 0.14, 0.4], glint: [[255, 255, 255], 0.75, 0.4] },
    delta: { bed: 'silt', bedA: 0.4, fish: 1, fishCol: '#4C4430', bank: 1, duck: 2, lily: 1, gull: 1, gullCol: '#EDEDE0', vessel: ['fisher'], fog: 0.3, shadow: 0.1, rays: [[255, 240, 190], 0.1, 0.25], glint: [[255, 250, 220], 0.4, 0.5], tint: [190, 200, 120, 0.06] },
    storm: { stack: 1, swell: 1, caps: 1, bolt: 1, shadow: 0.2, buoy: 1, dark: 0.2, spray: 1, gull: 0 },
    night: { bio: 1, jelly: 5, fish: 2, fishCol: '#4FD8E6', dolphin: 1, light: 1, vessel: ['lantern', 'lantern'], buoy: 1, shadow: 0.12, glint: [[225, 235, 255], 0.7, 0.4], moon: 1, dark: 0.1, stars: 1 }
  }

  function wd (cx, x, y, fn, S) {   // draw fn at (x, y) and its 8 wrapped copies (seamless tiles)
    var a, b
    for (a = -1; a <= 1; a++) for (b = -1; b <= 1; b++) fn(cx, x + a * S, y + b * S)
  }
  // ---- seabed tiles ----
  function bedTile (kind) {
    return R.sprite('sea-bed-' + kind, 320, 320, function (x, S) {
      var i, j, N = 320
      var blot = function (col, n, r0, r1, a) {
        for (i = 0; i < n; i++) {
          var px = hash(i * 3 + 1 + n) * N, py = hash(i * 3 + 2 + n) * N, r = r0 + hash(i + 7 + n) * (r1 - r0)
          wd(x, px, py, function (cx, ax, ay) { var g = cx.createRadialGradient(ax, ay, 0, ax, ay, r); g.addColorStop(0, css(col, a)); g.addColorStop(1, css(col, 0)); cx.fillStyle = g; cx.fillRect(ax - r, ay - r, r * 2, r * 2) }, N)
        }
      }
      if (kind === 'sand') { blot([236, 220, 160], 9, 50, 90, 0.7); blot([120, 110, 80], 5, 14, 26, 0.35) }
      if (kind === 'ice') { blot([225, 245, 255], 8, 60, 110, 0.7); blot([90, 150, 200], 6, 30, 60, 0.4) }
      if (kind === 'silt') { blot([150, 130, 80], 10, 50, 100, 0.65); blot([70, 90, 50], 6, 24, 46, 0.4) }
      if (kind === 'lagoon') { blot([245, 240, 205], 8, 70, 110, 0.85); blot([60, 160, 120], 7, 28, 54, 0.5); blot([20, 90, 140], 4, 40, 70, 0.35) }
      if (kind === 'reef') {
        blot([240, 225, 170], 6, 60, 100, 0.55); blot([30, 100, 90], 6, 30, 56, 0.4)
        var CC = ['#FF7F9E', '#FFB347', '#B26BE0', '#FF6B5E', '#6BE0C2', '#FFD84A']
        for (i = 0; i < 24; i++) {
          var cx0 = hash(i * 5 + 1) * N, cy0 = hash(i * 5 + 2) * N, col = CC[i % CC.length], big = 8 + hash(i + 40) * 12
          wd(x, cx0, cy0, function (cx, ax, ay) {
            cx.fillStyle = 'rgba(10,60,80,.28)'; cx.beginPath(); cx.arc(ax + 4, ay + 5, big * 1.35, 0, 6.3); cx.fill()
            for (j = 0; j < 6; j++) { cx.fillStyle = col; cx.beginPath(); cx.arc(ax + Math.cos(j * 1.05 + i) * big * 0.7, ay + Math.sin(j * 1.05 + i) * big * 0.7, big * 0.5, 0, 6.3); cx.fill() }
            cx.fillStyle = 'rgba(255,255,255,.35)'; cx.beginPath(); cx.arc(ax - 2, ay - 2, big * 0.35, 0, 6.3); cx.fill()
          }, N)
        }
        x.strokeStyle = 'rgba(40,150,90,.55)'; x.lineWidth = 2; x.lineCap = 'round'
        for (i = 0; i < 30; i++) { var gx = hash(i + 90) * N, gy = hash(i + 130) * N; wd(x, gx, gy, function (cx, ax, ay) { cx.beginPath(); cx.moveTo(ax, ay); cx.quadraticCurveTo(ax + 4, ay - 8, ax + 1, ay - 15); cx.moveTo(ax + 4, ay); cx.quadraticCurveTo(ax + 9, ay - 6, ax + 8, ay - 12); cx.stroke() }, N) }
      }
      if (kind === 'sand' || kind === 'lagoon') {   // sand ripples
        x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 1.5
        for (i = 0; i < 10; i++) { var ry = (i + 0.5) * N / 10; x.beginPath(); for (j = 0; j <= N; j += 8) { var yy = ry + Math.sin(j / N * 6.283 * 2 + i) * 4; if (!j) x.moveTo(j, yy); else x.lineTo(j, yy) } x.stroke() }
      }
    }, 1)
  }
  function causticTile () {
    return R.sprite('sea-caustic', 256, 256, function (x) {
      var i
      x.lineCap = 'round'
      for (i = 0; i < 46; i++) {
        var px = hash(i + 5) * 256, py = hash(i + 55) * 256, r = 12 + hash(i + 95) * 20, a0 = hash(i + 15) * 6.3
        x.strokeStyle = 'rgba(255,255,255,' + (0.35 + hash(i + 25) * 0.4) + ')'; x.lineWidth = 1.4
        var a, b
        for (a = -1; a <= 1; a++) for (b = -1; b <= 1; b++) { x.beginPath(); x.arc(px + a * 256, py + b * 256, r, a0, a0 + 2.1 + hash(i + 35) * 1.6); x.stroke() }
      }
    }, 1)
  }
  function bioTile () {
    return R.sprite('sea-bio', 360, 360, function (x) {
      var i, g = R.glow('120,255,230', 14)
      for (i = 0; i < 70; i++) {
        var px = hash(i + 3) * 360, py = hash(i + 73) * 360, s = 6 + hash(i + 33) * 14
        x.globalAlpha = 0.25 + hash(i + 13) * 0.6
        var a, b
        for (a = -1; a <= 1; a++) for (b = -1; b <= 1; b++) x.drawImage(g, px + a * 360 - s, py + b * 360 - s, s * 2, s * 2)
      }
      x.globalAlpha = 1
    }, 1)
  }
  // ---- creatures ----
  function fishS (col) {
    return R.sprite('sea-fish' + col, 18, 9, function (x) {
      x.fillStyle = col; x.beginPath(); x.ellipse(7, 4.5, 6.5, 3.2, 0, 0, 6.3); x.fill()
      x.beginPath(); x.moveTo(11, 4.5); x.lineTo(18, 0.5); x.lineTo(18, 8.5); x.closePath(); x.fill()
      x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.arc(3.5, 3.5, 1, 0, 6.3); x.fill()
    })
  }
  var jellyS = function (col) {
    return R.sprite('sea-jelly' + col, 40, 56, function (x) {
      var g = x.createRadialGradient(20, 16, 2, 20, 16, 22); g.addColorStop(0, 'rgba(' + col + ',.95)'); g.addColorStop(0.6, 'rgba(' + col + ',.45)'); g.addColorStop(1, 'rgba(' + col + ',0)')
      x.fillStyle = g; x.fillRect(0, 0, 40, 40)
      x.fillStyle = 'rgba(' + col + ',.85)'; x.beginPath(); x.ellipse(20, 16, 11, 9, 0, Math.PI, 0); x.lineTo(31, 18); x.lineTo(9, 18); x.closePath(); x.fill()
      x.strokeStyle = 'rgba(' + col + ',.65)'; x.lineWidth = 1.4; x.lineCap = 'round'
      var i
      for (i = 0; i < 5; i++) { x.beginPath(); x.moveTo(11 + i * 4.5, 18); x.bezierCurveTo(8 + i * 5, 28, 14 + i * 3, 36, 11 + i * 4.5, 52); x.stroke() }
    })
  }
  var turtleS = R.sprite('sea-turtle', 44, 54, function (x) {
    x.fillStyle = '#4A8F4E'
    x.beginPath(); x.ellipse(8, 17, 9, 4, -0.6, 0, 6.3); x.ellipse(36, 17, 9, 4, 0.6, 0, 6.3); x.ellipse(11, 40, 7, 3.5, 0.6, 0, 6.3); x.ellipse(33, 40, 7, 3.5, -0.6, 0, 6.3); x.fill()
    x.beginPath(); x.ellipse(22, 8, 5, 6, 0, 0, 6.3); x.fill()
    x.fillStyle = '#6FA84A'; x.beginPath(); x.ellipse(22, 28, 13, 17, 0, 0, 6.3); x.fill()
    x.strokeStyle = '#3B7A3F'; x.lineWidth = 1.6; x.stroke()
    x.beginPath(); x.moveTo(22, 12); x.lineTo(22, 44); x.moveTo(10, 28); x.lineTo(34, 28); x.moveTo(13, 19); x.lineTo(31, 37); x.moveTo(31, 19); x.lineTo(13, 37); x.stroke()
  })
  var rayS = R.sprite('sea-ray', 70, 64, function (x) {
    x.fillStyle = '#2D3F5A'; x.beginPath(); x.moveTo(35, 6); x.quadraticCurveTo(52, 6, 68, 34); x.quadraticCurveTo(48, 28, 35, 42); x.quadraticCurveTo(22, 28, 2, 34); x.quadraticCurveTo(18, 6, 35, 6); x.fill()
    x.strokeStyle = '#2D3F5A'; x.lineWidth = 2; x.beginPath(); x.moveTo(35, 42); x.quadraticCurveTo(33, 54, 36, 63); x.stroke()
    x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.arc(30, 14, 1.6, 0, 6.3); x.arc(40, 14, 1.6, 0, 6.3); x.fill()
  })
  var whaleS = R.sprite('sea-whale', 70, 200, function (x) {
    x.fillStyle = '#3B6F96'
    x.beginPath(); x.moveTo(35, 4); x.bezierCurveTo(58, 24, 56, 90, 44, 150); x.lineTo(35, 168); x.lineTo(26, 150); x.bezierCurveTo(14, 90, 12, 24, 35, 4); x.fill()
    x.beginPath(); x.moveTo(35, 160); x.lineTo(6, 196); x.quadraticCurveTo(35, 182, 64, 196); x.closePath(); x.fill()
    x.beginPath(); x.moveTo(50, 60); x.quadraticCurveTo(70, 84, 62, 100); x.lineTo(46, 80); x.moveTo(20, 60); x.quadraticCurveTo(0, 84, 8, 100); x.lineTo(24, 80); x.fill()
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1.6; for (var i = 0; i < 6; i++) { x.beginPath(); x.moveTo(26, 60 + i * 12); x.lineTo(44, 60 + i * 12); x.stroke() }
  })
  var dolphinS = R.sprite('sea-dolphin', 24, 62, function (x) {
    x.fillStyle = '#5E7E9A'
    x.beginPath(); x.moveTo(12, 0); x.bezierCurveTo(24, 10, 22, 36, 14, 50); x.lineTo(12, 54); x.lineTo(10, 50); x.bezierCurveTo(2, 36, 0, 10, 12, 0); x.fill()
    x.beginPath(); x.moveTo(12, 52); x.lineTo(0, 62); x.quadraticCurveTo(12, 57, 24, 62); x.closePath(); x.fill()
    x.beginPath(); x.moveTo(20, 24); x.lineTo(28, 34); x.lineTo(18, 31); x.moveTo(4, 24); x.lineTo(-4, 34); x.lineTo(6, 31); x.fill()
    x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(12, 24, 4, 14, 0, 0, 6.3); x.fill()
    x.fillStyle = '#3E5A74'; x.beginPath(); x.moveTo(12, 30); x.lineTo(9, 42); x.lineTo(15, 42); x.closePath(); x.fill()
  })
  var sealS = R.sprite('sea-seal', 22, 40, function (x) {
    x.fillStyle = '#7C8794'; x.beginPath(); x.ellipse(11, 22, 8, 16, 0, 0, 6.3); x.fill()
    x.beginPath(); x.ellipse(11, 6, 5.5, 6, 0, 0, 6.3); x.fill()
    x.fillStyle = '#2B2F36'; x.beginPath(); x.arc(8.8, 4, 1.1, 0, 6.3); x.arc(13.2, 4, 1.1, 0, 6.3); x.arc(11, 8, 1.4, 0, 6.3); x.fill()
    x.fillStyle = '#6A7480'; x.beginPath(); x.moveTo(8, 36); x.lineTo(2, 40); x.lineTo(11, 38); x.lineTo(20, 40); x.lineTo(14, 36); x.fill()
  })
  var duckS = R.sprite('sea-duck', 16, 24, function (x) {
    x.fillStyle = '#8A6B3E'; x.beginPath(); x.ellipse(8, 15, 6, 8, 0, 0, 6.3); x.fill()
    x.fillStyle = '#2E7D4F'; x.beginPath(); x.arc(8, 5.5, 3.8, 0, 6.3); x.fill()
    x.fillStyle = '#F2B632'; x.beginPath(); x.moveTo(6, 8); x.lineTo(10, 8); x.lineTo(8, 11); x.fill()
  })
  var lilyS = R.sprite('sea-lily', 26, 26, function (x) {
    x.fillStyle = '#3F9A4C'; x.beginPath(); x.moveTo(13, 13); x.arc(13, 13, 11, 0.4, 6.0); x.closePath(); x.fill()
    x.fillStyle = '#FF9EC4'; x.beginPath(); x.arc(15, 10, 3, 0, 6.3); x.fill()
  })
  function sailS (col, hull) {
    return R.sprite('sea-sail' + col + hull, 34, 62, function (x) {
      x.fillStyle = 'rgba(0,30,60,.18)'; x.beginPath(); x.ellipse(21, 33, 8, 26, 0, 0, 6.3); x.fill()
      x.fillStyle = hull; x.beginPath(); x.moveTo(17, 4); x.bezierCurveTo(28, 18, 27, 44, 22, 58); x.lineTo(12, 58); x.bezierCurveTo(7, 44, 6, 18, 17, 4); x.fill()
      x.fillStyle = col; x.beginPath(); x.moveTo(17, 10); x.bezierCurveTo(30, 22, 32, 36, 27, 50); x.lineTo(17, 46); x.closePath(); x.fill()
      x.fillStyle = col; x.globalAlpha = 0.85; x.beginPath(); x.moveTo(16, 12); x.bezierCurveTo(5, 24, 3, 34, 6, 44); x.lineTo(16, 42); x.closePath(); x.fill(); x.globalAlpha = 1
      x.fillStyle = '#7A5A3A'; x.beginPath(); x.arc(17, 24, 2, 0, 6.3); x.fill()
    })
  }
  function shipS (kind) {
    return R.sprite('sea-ship' + kind, 40, kind === 'ferry' ? 110 : 80, function (x) {
      var L = kind === 'ferry' ? 110 : 80, i
      x.fillStyle = 'rgba(0,30,60,.2)'; x.beginPath(); x.ellipse(22, L / 2 + 3, 13, L / 2 - 2, 0, 0, 6.3); x.fill()
      if (kind === 'ferry') {
        x.fillStyle = '#F5F7FA'; x.beginPath(); x.moveTo(20, 2); x.bezierCurveTo(36, 24, 36, 80, 32, 108); x.lineTo(8, 108); x.bezierCurveTo(4, 80, 4, 24, 20, 2); x.fill()
        x.fillStyle = '#2D7DD2'; x.fillRect(9, 50, 22, 4)
        x.fillStyle = '#D6E6F5'; x.fillRect(11, 30, 18, 70)
        x.fillStyle = '#4A90D9'; for (i = 0; i < 6; i++) x.fillRect(13, 34 + i * 10, 14, 5)
        x.fillStyle = '#E2463F'; x.fillRect(16, 78, 8, 12)
      } else {   // fishing boat
        x.fillStyle = '#C94B3B'; x.beginPath(); x.moveTo(20, 2); x.bezierCurveTo(34, 20, 34, 56, 30, 76); x.lineTo(10, 76); x.bezierCurveTo(6, 56, 6, 20, 20, 2); x.fill()
        x.fillStyle = '#F3E9D2'; x.fillRect(11, 36, 18, 20); x.fillStyle = '#7A4A2B'; x.fillRect(13, 40, 14, 12)
        x.strokeStyle = '#D9CBA0'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(20, 6); x.lineTo(20, 34); x.stroke()
      }
    })
  }
  var canoeS = R.sprite('sea-canoe', 30, 66, function (x) {
    x.fillStyle = 'rgba(0,40,70,.16)'; x.beginPath(); x.ellipse(18, 36, 6, 28, 0, 0, 6.3); x.fill()
    x.fillStyle = '#C9733B'; x.beginPath(); x.moveTo(15, 2); x.quadraticCurveTo(22, 32, 15, 64); x.quadraticCurveTo(8, 32, 15, 2); x.fill()
    x.strokeStyle = '#8A5A2B'; x.lineWidth = 2; x.beginPath(); x.moveTo(2, 22); x.lineTo(2, 46); x.moveTo(2, 28); x.lineTo(12, 28); x.moveTo(2, 40); x.lineTo(12, 40); x.stroke()
    x.fillStyle = '#FFD84A'; x.fillRect(11, 20, 8, 6)
  })
  var lanternBoatS = R.sprite('sea-lantern', 30, 50, function (x) {
    x.fillStyle = '#1B2744'; x.beginPath(); x.moveTo(15, 2); x.bezierCurveTo(26, 16, 25, 36, 21, 48); x.lineTo(9, 48); x.bezierCurveTo(5, 36, 4, 16, 15, 2); x.fill()
    var g = x.createRadialGradient(15, 22, 0, 15, 22, 16); g.addColorStop(0, 'rgba(255,220,120,.95)'); g.addColorStop(1, 'rgba(255,200,90,0)')
    x.fillStyle = g; x.fillRect(0, 6, 30, 32); x.fillStyle = '#FFE9A0'; x.beginPath(); x.arc(15, 22, 3, 0, 6.3); x.fill()
  })
  var buoyS = R.sprite('sea-buoy', 22, 22, function (x) {
    x.fillStyle = 'rgba(0,40,70,.2)'; x.beginPath(); x.ellipse(13, 13, 8, 8, 0, 0, 6.3); x.fill()
    x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(11, 11, 8, 0, 6.3); x.fill()
    x.fillStyle = '#E2463F'; x.beginPath(); x.arc(11, 11, 8, 0.5, 2.6); x.fill(); x.beginPath(); x.arc(11, 11, 8, 3.6, 5.7); x.fill()
    x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(11, 11, 3.2, 0, 6.3); x.fill()
  })
  var dockS = R.sprite('sea-dock', 80, 300, function (x) {
    var i
    x.fillStyle = 'rgba(0,30,50,.22)'; x.fillRect(8, 6, 26, 296)
    x.fillStyle = '#A97C4F'; x.fillRect(0, 0, 24, 300)
    x.fillStyle = '#8A6238'; for (i = 0; i < 30; i++) x.fillRect(0, i * 10 + 8, 24, 1.5)
    x.fillStyle = '#C69A66'; x.fillRect(22, 0, 3, 300)
    for (i = 0; i < 3; i++) {   // jetty fingers with a moored boat in each slip
      var y = 28 + i * 98
      x.fillStyle = 'rgba(0,30,50,.2)'; x.fillRect(26, y + 3, 34, 9)
      x.fillStyle = '#A97C4F'; x.fillRect(24, y, 34, 8); x.fillStyle = '#8A6238'; for (var k = 0; k < 6; k++) x.fillRect(26 + k * 6, y, 1.2, 8)
      x.fillStyle = '#5B3F27'; x.beginPath(); x.arc(58, y + 4, 3.5, 0, 6.3); x.fill()
      var bc = ['#FFFFFF', '#4A90D9', '#E2463F'][i]
      x.fillStyle = 'rgba(0,30,60,.2)'; x.beginPath(); x.ellipse(40, y + 58, 8, 22, 0, 0, 6.3); x.fill()
      x.fillStyle = bc; x.beginPath(); x.moveTo(36, y + 22); x.bezierCurveTo(46, y + 34, 46, y + 66, 41, y + 80); x.lineTo(31, y + 80); x.bezierCurveTo(26, y + 66, 26, y + 34, 36, y + 22); x.fill()
      x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(33, y + 44, 6, 14)
    }
    var lamp = R.glow('255,220,140', 10)
    for (i = 0; i < 3; i++) { x.drawImage(lamp, 2, 40 + i * 98 - 8, 16, 16); x.fillStyle = '#FFF3C4'; x.beginPath(); x.arc(10, 40 + i * 98, 2, 0, 6.3); x.fill() }
  })
  var bankS = R.sprite('sea-bank', 60, 300, function (x) {
    var i, N = 300
    x.fillStyle = 'rgba(40,30,10,.22)'; x.beginPath(); x.moveTo(0, 0); for (i = 0; i <= N; i += 6) x.lineTo(40 + Math.sin(i / N * 6.283 * 3) * 6 + Math.sin(i / N * 6.283 * 7) * 3 + 5, i); x.lineTo(0, N); x.fill()
    x.fillStyle = '#B9A36B'; x.beginPath(); x.moveTo(0, 0); for (i = 0; i <= N; i += 6) x.lineTo(36 + Math.sin(i / N * 6.283 * 3) * 6 + Math.sin(i / N * 6.283 * 7) * 3, i); x.lineTo(0, N); x.fill()
    x.fillStyle = '#6E9A3E'; x.beginPath(); x.moveTo(0, 0); for (i = 0; i <= N; i += 6) x.lineTo(28 + Math.sin(i / N * 6.283 * 3) * 6 + Math.sin(i / N * 6.283 * 7) * 3, i); x.lineTo(0, N); x.fill()
    x.fillStyle = '#4F7F2E'; for (i = 0; i < 14; i++) { x.beginPath(); x.arc(hash(i + 1) * 20, hash(i + 21) * N, 6 + hash(i + 41) * 6, 0, 6.3); x.fill() }
    x.strokeStyle = '#8FB35A'; x.lineWidth = 1.6; x.lineCap = 'round'
    for (i = 0; i < 30; i++) { var rx = 22 + hash(i + 60) * 14, ry = hash(i + 90) * N; x.beginPath(); x.moveTo(rx, ry); x.lineTo(rx + 5, ry - 12); x.moveTo(rx + 2, ry); x.lineTo(rx - 3, ry - 10); x.stroke(); x.fillStyle = '#7A5230'; x.fillRect(rx + 4.2, ry - 16, 2.6, 6) }
  })
  var floeS = function (v) {
    return R.sprite('sea-floe' + v, 150, 150, function (x) {
      var n = 9, i, pts = []
      for (i = 0; i < n; i++) { var a = i / n * 6.283, r = 38 + hash(v * 17 + i) * 30; pts.push([75 + Math.cos(a) * r, 75 + Math.sin(a) * r * 0.9]) }
      var path = function (s) { x.beginPath(); pts.forEach(function (p, j) { var px = 75 + (p[0] - 75) * s, py = 75 + (p[1] - 75) * s; if (!j) x.moveTo(px, py); else x.lineTo(px, py) }); x.closePath() }
      x.fillStyle = 'rgba(150,205,235,.35)'; path(1.22); x.fill()
      x.fillStyle = 'rgba(0,50,90,.2)'; x.save(); x.translate(5, 7); path(1); x.fill(); x.restore()
      x.fillStyle = '#E3F3FC'; path(1.04); x.fill()
      x.fillStyle = '#FFFFFF'; path(0.9); x.fill()
      x.strokeStyle = 'rgba(120,175,215,.55)'; x.lineWidth = 1.4
      x.beginPath(); x.moveTo(56, 52); x.lineTo(78, 70); x.lineTo(70, 96); x.moveTo(78, 70); x.lineTo(100, 66); x.stroke()
    })
  }
  var stackS = R.sprite('sea-stack', 100, 100, function (x) {
    x.fillStyle = 'rgba(255,255,255,.4)'; x.beginPath(); x.arc(50, 50, 44, 0, 6.3); x.fill()
    x.fillStyle = 'rgba(0,20,40,.3)'; x.beginPath(); x.arc(56, 58, 30, 0, 6.3); x.fill()
    var i
    for (i = 0; i < 3; i++) { x.fillStyle = ['#4A4F5C', '#5A6070', '#3B404B'][i]; x.beginPath(); x.moveTo(50 + i * 5 - 14, 54); x.lineTo(44 + i * 8, 26 + i * 6); x.lineTo(58 + i * 6, 34); x.lineTo(60 + i * 5, 62); x.closePath(); x.fill() }
    x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 2.5; x.beginPath(); x.arc(50, 50, 30, 0.2, 5.6); x.stroke()
  })
  var isletS = R.sprite('sea-islet', 150, 150, function (x) {
    var g = x.createRadialGradient(75, 75, 28, 75, 75, 72); g.addColorStop(0, 'rgba(160,240,225,.8)'); g.addColorStop(1, 'rgba(100,220,220,0)')
    x.fillStyle = g; x.fillRect(0, 0, 150, 150)
    x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.arc(75, 75, 40, 0, 6.3); x.fill()
    x.fillStyle = '#F4E6B4'; x.beginPath(); x.arc(75, 75, 36, 0, 6.3); x.fill()
    x.fillStyle = '#5DB35E'; x.beginPath(); x.arc(72, 70, 20, 0, 6.3); x.arc(86, 82, 11, 0, 6.3); x.fill()
    var i
    x.strokeStyle = '#2E7D3A'; x.lineWidth = 3; x.lineCap = 'round'
    for (i = 0; i < 7; i++) { var a = i / 7 * 6.283; x.beginPath(); x.moveTo(70, 68); x.quadraticCurveTo(70 + Math.cos(a) * 12, 68 + Math.sin(a) * 12 - 3, 70 + Math.cos(a) * 20, 68 + Math.sin(a) * 20 + 3); x.stroke() }
    x.fillStyle = '#7A5230'; x.beginPath(); x.arc(70, 68, 3, 0, 6.3); x.fill()
  })
  var lightS = R.sprite('sea-light', 90, 90, function (x) {
    x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.arc(45, 45, 40, 0, 6.3); x.fill()
    x.fillStyle = '#6B6558'; x.beginPath(); x.arc(45, 45, 32, 0, 6.3); x.fill()
    x.fillStyle = '#8F887A'; x.beginPath(); x.arc(38, 40, 14, 0, 6.3); x.arc(56, 56, 12, 0, 6.3); x.fill()
    x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(45, 45, 15, 0, 6.3); x.fill()
    x.fillStyle = '#E2463F'; x.beginPath(); x.arc(45, 45, 10, 0, 6.3); x.fill()
    x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(45, 45, 5.5, 0, 6.3); x.fill()
    x.fillStyle = '#FFE680'; x.beginPath(); x.arc(45, 45, 2.6, 0, 6.3); x.fill()
  })
  var beamS = R.sprite('sea-beam', 200, 40, function (x) {
    var g = x.createLinearGradient(0, 0, 200, 0); g.addColorStop(0, 'rgba(255,240,170,.55)'); g.addColorStop(1, 'rgba(255,240,170,0)')
    x.fillStyle = g; x.beginPath(); x.moveTo(0, 20); x.lineTo(200, 0); x.lineTo(200, 40); x.closePath(); x.fill()
  }, 1)
  var fogS = R.sprite('sea-fog', 420, 200, function (x) {
    var i
    x.translate(0, 40)
    for (i = 0; i < 7; i++) { var cx = 40 + i * 55, cy = 60 + Math.sin(i * 1.7) * 18, r = 50 + hash(i) * 22; var g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2) }
  }, 1)
  var cshadowS = R.sprite('sea-cshadow', 260, 220, function (x) {
    var i
    x.translate(0, 30)
    for (i = 0; i < 6; i++) { var cx = 60 + i * 28 + hash(i + 2) * 20, cy = 80 + Math.sin(i * 2.1) * 26, r = 40 + hash(i + 9) * 24; var g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(0,30,60,.5)'); g.addColorStop(1, 'rgba(0,30,60,0)'); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2) }
  }, 1)
  var capS = R.sprite('sea-cap', 40, 16, function (x) {
    x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 3; x.lineCap = 'round'
    x.beginPath(); x.moveTo(3, 12); x.quadraticCurveTo(10, 1, 20, 8); x.quadraticCurveTo(28, 12, 37, 4); x.stroke()
  })
  var flareS = R.sprite('sea-flare', 60, 60, function (x) {
    var g = x.createRadialGradient(30, 30, 0, 30, 30, 30); g.addColorStop(0, 'rgba(255,230,160,.5)'); g.addColorStop(0.5, 'rgba(255,200,120,.18)'); g.addColorStop(1, 'rgba(255,180,100,0)')
    x.fillStyle = g; x.fillRect(0, 0, 60, 60)
  }, 1)

  // ---- the world ----
  T.rich.sea = function (run, th) {
    var key = (th.world && W[th.world]) ? th.world : 'harbour'
    var C = W[key]
    var S = { bands: {}, key: key, storm: C.bolt ? R.storm() : null, sx: 0.5 }
    var len = run.len
    var items = []
    var z = 1, q = 0
    // structures at the edges, by world z
    var step = C.dock ? 1.8 : C.bank ? 1.8 : C.floe ? 1.5 : C.islet ? 3.4 : C.stack ? 3.2 : 4.5
    while (z < len + 8) {
      var side = hash(q * 3 + 7) < 0.5 ? -1 : 1
      if (C.dock) items.push({ k: 'dock', z: z, side: -1, s: 1 })
      if (C.dock && q % 4 === 1) items.push({ k: 'light', z: z + 0.6, side: 1, s: 1 })
      if (C.bank) { items.push({ k: 'bank', z: z, side: -1, s: 1 }); items.push({ k: 'bank', z: z, side: 1, s: 1 }) }
      if (C.floe) items.push({ k: 'floe', z: z, side: side, s: 0.55 + hash(q + 4) * 0.7, v: q % 3 + 1, seal: hash(q + 12) < 0.4 })
      if (C.islet && q % 2 === 0) items.push({ k: 'islet', z: z, side: side, s: 0.7 + hash(q + 5) * 0.5 })
      if (C.stack) items.push({ k: 'stack', z: z, side: side, s: 0.7 + hash(q + 5) * 0.6 })
      if (C.light && !C.dock && q % 3 === 0) items.push({ k: 'light', z: z, side: side, s: 1 })
      if (C.buoy) items.push({ k: 'buoy', z: z + 1.1, side: hash(q + 1) < 0.5 ? -1 : 1, s: 1, ph: q })
      if (C.vessel && q % 2 === 0) items.push({ k: 'vessel', z: z + 0.7, side: -side, s: 1, v: C.vessel[q % C.vessel.length], sp: 0.35 + hash(q + 8) * 0.4 })
      if (C.lily) items.push({ k: 'lily', z: z + 0.5, side: side, s: 1, ph: q })
      z += step * (0.8 + hash(q + 11) * 0.5); q++
    }
    var layers = ['gradient', 'waves-swell', 'waves-mid', 'waves-glint', 'boat']
    if (C.bed) layers.splice(1, 0, 'seabed')
    if (C.caust) layers.splice(2, 0, 'caustics')
    if (C.fish || C.ray || C.turtle || C.whale) layers.push('sea-life')
    if (C.jelly || C.bio) layers.push('bioluminescence')
    layers.push('structures', 'vessels')
    if (C.dolphin) layers.push('dolphins')
    if (C.gull || C.duck) layers.push('birds')
    layers.push('cloud-shadows', 'glitter')
    if (C.rays) layers.push('god-rays')
    if (C.fog) layers.push('mist')
    if (C.bolt) layers.push('lightning')
    if (C.swell || C.caps) layers.push('storm-swell')
    layers.push('vignette', 'spray')

    function col (a) { return R.css(th.water ? R.rgb(th.water[0]) : [160, 220, 240], a) }
    // the GPU sea (blippi-trip-gl.js): the surface, its waves, the bed seen through the shallows and the caustics in one
    // pass; null (no WebGL) keeps the baked bands below
    function surface (Z, G, px) {
      S.gl = T.gl && !S.glOff ? T.gl.sea(run, key, -R.par(px, 26), Z * G.pyu) : null
      if (!S.gl && T.gl) S.glOff = true
      return S.gl
    }
    function under (c, Z, G, px) {
      var W_ = run.W, H = run.H, t = run.t, k = G.pyu, par = R.par(px, 26), i, j, lite = R.lite(run)
      if (C.bed && !S.gl) R.band(S, c, run, 'bed', bedTile(C.bed), 320, Z * k * 0.5, par, C.bedA)
      if (C.caust && !S.gl) {
        R.band(S, c, run, 'caust', causticTile(), 256, Z * k * 0.3 + t * 9, par * 0.6 + t * 7, C.caust)
        if (!lite) R.band(S, c, run, 'caust', causticTile(), 256, Z * k * 0.38 - t * 6, par * 0.8 - t * 5 + 90, C.caust * 0.6)   // the same baked canvas, a second drift
      }
      if (C.bio) {
        c.globalAlpha = 0.75 + 0.25 * Math.sin(t * 1.7)
        R.band(S, c, run, 'bio', bioTile(), 360, Z * k * 0.6, par, 1)
        c.globalAlpha = 1
        if (!lite) R.band(S, c, run, 'bio', bioTile(), 360, Z * k * 0.9 + 140, par * 1.5 + 90, 0.55 + 0.35 * Math.sin(t * 2.3 + 1))
      }
      // schools of fish: a loose cluster per school, drifting slowly against the flow, wiggling
      var ns = lite ? Math.ceil((C.fish || 0) / 2) : (C.fish || 0)
      for (i = 0; i < ns; i++) {
        var cx = hash(i * 7 + 1) * W_ + Math.sin(t * 0.4 + i) * 26 + par * 0.8
        var cy = wrap(hash(i * 7 + 2) * (H + 260) + Z * k * 0.55 - t * 16, H + 260) - 130
        var fs = fishS(C.fishCol)
        c.globalAlpha = key === 'night' ? 0.8 : 0.5
        var nf = lite ? 5 : 8
        for (j = 0; j < nf; j++) {
          var fx = cx + (hash(i * 31 + j) - 0.5) * 70 + Math.sin(t * 2 + j) * 3, fy = cy + (hash(i * 31 + j + 9) - 0.5) * 80 + Math.cos(t * 1.6 + j * 2) * 3
          c.save(); c.translate(fx, fy); c.rotate(-Math.PI / 2 + Math.sin(t * 5 + j * 1.3 + i) * 0.28 + (hash(i + 3) - 0.5) * 0.5); c.drawImage(fs, -9, -4.5, 18, 9); c.restore()
        }
        c.globalAlpha = 1
      }
      for (i = 0; i < (C.turtle || 0); i++) {
        var ty = wrap(hash(i + 60) * (H + 200) + Z * k * 0.6 - t * 10, H + 200) - 100, tx = hash(i + 61) * W_ * 0.8 + W_ * 0.1 + par
        R.put(c, turtleS, tx + Math.sin(t * 0.7 + i) * 10, ty, 44, 54, Math.sin(t * 0.9 + i) * 0.12, 0.6)
      }
      for (i = 0; i < (C.ray || 0); i++) {
        var ry = wrap(hash(i + 70) * (H + 240) + Z * k * 0.7 - t * 22, H + 240) - 120, rx = hash(i + 71) * W_ * 0.9 + W_ * 0.05 + par
        R.put(c, rayS, rx + Math.sin(t * 0.6 + i * 2) * 14, ry, 70, 64, Math.sin(t * 0.8 + i) * 0.1, 0.38)
      }
      if (C.whale) {
        var wy = wrap(Z * k * 0.55 - t * 12 + 200, H + 500) - 250, wx = W_ * (0.28 + 0.44 * (0.5 + 0.5 * Math.sin(Z * 0.07)))
        R.put(c, whaleS, wx + par * 0.6, wy, 70, 200, Math.sin(t * 0.5) * 0.06, 0.5)
        // the spout: a ring of mist opening at the blowhole every few seconds
        var sp = wrap(t, 6) / 6
        if (sp < 0.4) { c.strokeStyle = 'rgba(255,255,255,' + (0.6 * (1 - sp / 0.4)) + ')'; c.lineWidth = 3; c.beginPath(); c.ellipse(wx + par * 0.6, wy - 70, 6 + sp * 70, 3 + sp * 30, 0, 0, 6.3); c.stroke() }
      }
      for (i = 0; i < (C.jelly || 0); i++) {
        if (lite && i > 2) break
        var jy = wrap(hash(i + 80) * (H + 160) + Z * k * 0.7 - t * 12, H + 160) - 80, jx = hash(i + 81) * W_ + Math.sin(t * 0.5 + i * 2) * 14 + par
        var pu = 1 + Math.sin(t * 2.2 + i) * 0.1
        R.put(c, jellyS(i % 2 ? '255,140,230' : '120,255,235'), jx, jy, 30 * pu, 42 / pu, 0, 0.9)
      }
    }
    function drawItem (c, it, Z, G, px) {
      var W_ = run.W, H = run.H, t = run.t, k = G.pyu
      var y = G.py - (it.z - Z) * k * 0.9
      if (y < -200 || y > H + 200) return
      var par = R.par(px, 18)
      var edge = it.side < 0 ? 1 : -1
      if (it.k === 'dock') {
        var u = Math.min(1.1, Math.max(0.3, k * 1.8 / 300))
        c.save(); c.translate(0, y); c.scale(u, u); c.drawImage(dockS, -2 + par * 0.3, -150, 80, 300); c.restore()
      } else if (it.k === 'bank') {
        var ub = Math.min(1.1, Math.max(0.3, k * 1.8 / 300))
        c.save(); c.translate(it.side < 0 ? 0 : W_, y); c.scale(it.side < 0 ? ub : -ub, ub); c.drawImage(bankS, -8, -150, 60, 300); c.restore()
      } else if (it.k === 'light') {
        var lx = it.side < 0 ? W_ * 0.07 : W_ * 0.93, ls = 64 * Math.min(1.2, Math.max(0.5, k / 150))
        R.put(c, lightS, lx + par, y, ls, ls)
        c.save(); c.translate(lx + par, y); c.rotate(t * 0.9 + it.z); c.globalAlpha = key === 'night' ? 0.8 : 0.28; c.drawImage(beamS, 0, -22 * ls / 64, 200 * ls / 64 + 60, 44 * ls / 64); c.restore(); c.globalAlpha = 1
      } else if (it.k === 'floe') {
        var fs = 120 * it.s, fx = it.side < 0 ? fs * 0.18 : W_ - fs * 0.18
        R.put(c, floeS(it.v), fx + par + Math.sin(t * 0.4 + it.z) * 3, y + Math.sin(t * 0.5 + it.z) * 2, fs, fs, it.z * 0.9)
        if (it.seal) R.put(c, sealS, fx + par + (it.side < 0 ? 4 : -4), y, 16 * it.s + 6, 28 * it.s + 8, it.z * 0.9 + 0.8)
      } else if (it.k === 'islet') {
        var is = 130 * it.s, ix = it.side < 0 ? is * 0.2 : W_ - is * 0.2
        R.put(c, isletS, ix + par, y, is, is, it.z)
      } else if (it.k === 'stack') {
        var ss = 96 * it.s, sx = it.side < 0 ? ss * 0.25 : W_ - ss * 0.25
        R.put(c, stackS, sx + par, y + Math.sin(t * 1.5 + it.z) * 2, ss, ss, 0)
      } else if (it.k === 'buoy') {
        var bx = it.side < 0 ? W_ * 0.13 : W_ * 0.87, bob = Math.sin(t * 2 + it.ph) * 2
        R.put(c, buoyS, bx + par, y + bob, 22, 22)
        if (key === 'night' || key === 'storm') { var on = (Math.floor(t * 1.4 + it.ph) % 2) === 0; if (on) { c.globalAlpha = 0.85; R.put(c, R.glow('255,90,90', 18), bx + par, y + bob, 40, 40); c.globalAlpha = 1 } }
      } else if (it.k === 'vessel') {
        var vz = y - Math.sin(it.z) * 0 - t * it.sp * k * 0.15
        var vx = it.side < 0 ? W_ * 0.09 : W_ * 0.91
        var sp = it.v === 'sail' ? sailS(C.silhouette ? '#3B2C55' : '#FFFFFF', C.silhouette ? '#2A1F40' : '#FFFFFF') : it.v === 'lantern' ? lanternBoatS : it.v === 'canoe' ? canoeS : shipS(it.v)
        var sc = it.v === 'ferry' ? 0.7 : 0.82
        // wake: two faint V strokes behind the hull
        c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2
        c.beginPath(); c.moveTo(vx + par - 3, vz + sp.lh * sc * 0.4); c.lineTo(vx + par - 14, vz + sp.lh * sc * 0.4 + 46); c.moveTo(vx + par + 3, vz + sp.lh * sc * 0.4); c.lineTo(vx + par + 14, vz + sp.lh * sc * 0.4 + 46); c.stroke()
        R.put(c, sp, vx + par + Math.sin(t * 1.3 + it.z) * 2, vz, sp.lw * sc, sp.lh * sc, Math.sin(t * 1.1 + it.z) * 0.04)
      } else if (it.k === 'lily') {
        var lx2 = it.side < 0 ? W_ * 0.17 : W_ * 0.83
        R.put(c, lilyS, lx2 + par, y, 26, 26, it.z); R.put(c, lilyS, lx2 + par + 18, y + 16, 20, 20, it.z * 2)
      }
    }
    function over (c, Z, G, px) {
      var W_ = run.W, H = run.H, t = run.t, k = G.pyu, par = R.par(px, 22), i, lite = R.lite(run)
      var si
      for (si = 0; si < items.length; si++) drawItem(c, items[si], Z, G, px)
      // dolphins: each leaps from the water every few seconds, rising toward the camera, ringed by two splashes
      for (i = 0; i < (C.dolphin || 0); i++) {
        var P = 6 + hash(i + 3) * 3, u = wrap(t + hash(i + 5) * P, P) / 1.4
        var by = wrap(hash(i + 6) * (H + 300) + Z * k * 0.9, H + 300) - 150, bx = W_ * (0.25 + hash(i + 7) * 0.5) + par
        // the course scrolls; the leap only plays while u < 1
        if (u < 1) {
          var yy = by - u * 100, hh = Math.sin(u * Math.PI), s = 1 + hh * 0.4
          c.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - u)) + ')'; c.lineWidth = 2.5
          c.beginPath(); c.ellipse(bx, by, 6 + u * 34, 2.5 + u * 14, 0, 0, 6.3); c.stroke()
          c.fillStyle = 'rgba(0,40,70,' + (0.16 * hh) + ')'; c.beginPath(); c.ellipse(bx + 10 * hh, yy + 12 * hh, 7, 22, 0, 0, 6.3); c.fill()
          R.put(c, dolphinS, bx, yy, 24 * s, 62 * s, Math.sin(u * 3) * 0.12 + (u > 0.5 ? 0.15 : -0.1) * 0)
          if (u > 0.8) { var v2 = (u - 0.8) / 0.2; c.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - v2)) + ')'; c.beginPath(); c.ellipse(bx, by - 100, 4 + v2 * 30, 2 + v2 * 12, 0, 0, 6.3); c.stroke() }
        }
      }
      // gulls and ducks: flocks crossing at height (parallax 1.15), their shadows on the water
      var nflock = lite ? Math.min(1, C.gull || 0) : (C.gull || 0)
      for (i = 0; i < nflock; i++) {
        var bird = R.bird(C.gullCol), dir = i % 2 ? -1 : 1
        var fx = wrap(hash(i + 20) * (W_ + 200) + t * 22 * dir, W_ + 200) - 100, fy = wrap(hash(i + 21) * (H + 300) + Z * k * 1.15 - t * 30, H + 300) - 150, n = lite ? 3 : 5, j
        for (j = 0; j < n; j++) {
          var ox = (j % 2 ? 1 : -1) * (j >> 1) * 22 - 6, oy = (j >> 1) * 20
          var rot = dir * 0.9 + Math.sin(t + j) * 0.05
          c.globalAlpha = 0.14; R.flap(c, bird, fx + ox + 12, fy + oy + 26, 20, rot, t, j + i)
          c.globalAlpha = 1; R.flap(c, bird, fx + ox, fy + oy, 20 + (key === 'delta' ? 0 : 2), rot, t, j + i)
        }
      }
      for (i = 0; i < (C.duck || 0); i++) {
        var dy = wrap(hash(i + 40) * (H + 200) + Z * k * 0.9, H + 200) - 100, dx = (i % 2 ? 0.2 : 0.8) * W_ + Math.sin(t * 0.8 + i) * 8
        var dj
        for (dj = 0; dj < 4; dj++) { R.put(c, duckS, dx + dj * 12 + par, dy + Math.sin(t * 1.6 + dj) * 2 + dj * 9, 14, 21, 0.1 * dj) }
      }
      // cloud shadows drifting over the sea
      if (C.shadow) {
        var nc = lite ? 2 : 3
        for (i = 0; i < nc; i++) {
          var cx = wrap(hash(i + 30) * (W_ + 200) + t * 5 * (i + 1), W_ + 300) - 150 + par * 0.4, cy = wrap(hash(i + 31) * (H + 300) + Z * k * 1.1 + t * 4, H + 300) - 150
          R.put(c, cshadowS, cx, cy, 300 + i * 70, (190 + i * 40) * 1.375, 0, C.shadow * (C.dark ? 1.6 : 1) * 1.6)
        }
      }
      if (C.fog) {
        for (i = 0; i < 3; i++) {
          var fgx = wrap(hash(i + 50) * (W_ + 300) + t * (6 + i * 3), W_ + 500) - 250, fgy = wrap(hash(i + 51) * (H + 300) + Z * k * (0.95 + i * 0.1) , H + 300) - 150
          R.put(c, fogS, fgx, fgy, 520, 250, 0, C.fog)
        }
      }
      // sun / moon glitter: a column of short bright dashes that twinkle
      if (C.glint) {
        var G3 = C.glint, gx = W_ * G3[2] + par * 0.5, n = lite ? 16 : 30
        c.fillStyle = R.css(G3[0], 1)
        for (i = 0; i < n; i++) {
          var gy = wrap(hash(i + 100) * H * 0.9 + t * 11 + Z * k * 0.2, H * 0.9)
          var spread = (0.18 + 0.5 * gy / H) * W_ * 0.5, tw = 0.5 + 0.5 * Math.sin(t * (2 + hash(i + 130) * 3) + i * 2.3)
          c.globalAlpha = G3[1] * tw * (key === 'night' ? 0.8 : 1) * (1 - gy / H * 0.55)
          c.fillRect(gx + (hash(i + 110) - 0.5) * 2 * spread, gy, 5 + hash(i + 120) * 11, 2)
        }
        c.globalAlpha = 1
      }
      if (C.moon) {
        var mx = W_ * 0.62 + par * 0.4
        c.globalAlpha = 0.5 + 0.1 * Math.sin(t)
        R.put(c, R.glow('220,232,255', 60), mx, H * 0.16, 190, 190); c.globalAlpha = 1
      }
      if (C.flare) { R.put(c, flareS, W_ * 0.62 + par * 0.4, H * 0.05, 340, 340, 0, 0.8) }
      // the storm: dark swell bands, whitecaps, a dim grade, then the flash and the bolt
      if (C.swell) R.band(S, c, run, 'swell', swellTile(), 420, Z * k * 0.8 + t * 20, par * 0.4 + t * 6, 1)
      if (C.caps) {
        var ncap = lite ? 12 : 22
        for (i = 0; i < ncap; i++) {
          var cpx = hash(i + 150) * W_, cpy = wrap(hash(i + 170) * (H + 80) + Z * k * 1.2 + t * 26, H + 80) - 40
          R.put(c, capS, cpx + par * 0.5, cpy, 32 + hash(i + 190) * 22, 13, Math.sin(t + i) * 0.1, 0.45)
        }
      }
      if (C.dark) { c.fillStyle = 'rgba(8,18,36,' + C.dark + ')'; c.fillRect(0, 0, W_, H) }
      if (C.stars) {   // star glints in the black water
        c.fillStyle = '#FFFFFF'
        for (i = 0; i < (lite ? 14 : 28); i++) { c.globalAlpha = 0.15 + 0.5 * Math.abs(Math.sin(t * 1.4 + i)); c.fillRect(hash(i + 200) * W_, wrap(hash(i + 230) * H + Z * k * 0.15, H), 2, 2) }
        c.globalAlpha = 1
      }
      if (C.rays) R.rays(S, c, run, C.rays[0], C.rays[1], C.rays[2])
      if (C.tint) { c.fillStyle = 'rgba(' + C.tint[0] + ',' + C.tint[1] + ',' + C.tint[2] + ',' + C.tint[3] + ')'; c.fillRect(0, 0, W_, H) }
      if (C.bolt) {
        var fl = R.stormStep(S.storm, run)
        if (fl > 0) { c.fillStyle = 'rgba(225,235,255,' + (fl * 0.5) + ')'; c.fillRect(0, 0, W_, H) }
        R.drawBolt(c, S.storm, run)
      }
      R.full(S, c, run, 'vig', function (x, Wd, Hd) {
        var g = x.createRadialGradient(Wd / 2, Hd * 0.5, Math.min(Wd, Hd) * 0.4, Wd / 2, Hd * 0.5, Math.max(Wd, Hd) * 0.75)
        g.addColorStop(0, 'rgba(0,30,60,0)'); g.addColorStop(1, 'rgba(0,30,60,' + (C.dark ? 0.32 : 0.16) + ')')
        x.fillStyle = g; x.fillRect(0, 0, Wd, Hd)
      }, null, 0.5)
    }
    function swellTile () {
      return R.sprite('sea-swell', 420, 420, function (x) {
        var i
        for (i = 0; i < 4; i++) {
          var y0 = (i + 0.5) * 105, g = x.createLinearGradient(0, y0 - 40, 0, y0 + 40)
          g.addColorStop(0, 'rgba(10,30,60,0)'); g.addColorStop(0.5, 'rgba(10,30,60,.22)'); g.addColorStop(1, 'rgba(10,30,60,0)')
          x.fillStyle = g; x.beginPath(); x.moveTo(0, y0 - 40)
          var j
          for (j = 0; j <= 420; j += 30) x.lineTo(j, y0 - 40 + Math.sin(j / 420 * 6.283 + i) * 16)
          for (j = 420; j >= 0; j -= 30) x.lineTo(j, y0 + 40 + Math.sin(j / 420 * 6.283 + i) * 16)
          x.closePath(); x.fill()
        }
      }, 1)
    }
    // over the boat: spray / snow / glowing wake
    function fg (c, Z, G, px) {
      if (run.reduced()) return
      var t = run.t, W_ = run.W, H = run.H, k = G.pyu, i, x0 = px * W_, lite = R.lite(run)
      if (C.spray) {
        c.fillStyle = 'rgba(255,255,255,.75)'
        for (i = 0; i < (lite ? 10 : 20); i++) {
          var u = wrap(t * (1.1 + hash(i) * 0.8) + hash(i + 3), 1)
          c.globalAlpha = (1 - u) * 0.6
          c.fillRect(wrap(hash(i + 50) * W_ + u * 60, W_), u * H * 0.9, 2.5, 7 + u * 10)
        }
        c.globalAlpha = 1
      }
      if (C.snow) {
        c.fillStyle = '#FFFFFF'
        for (i = 0; i < (lite ? 12 : 26); i++) { c.globalAlpha = 0.65; c.beginPath(); c.arc(wrap(hash(i + 60) * W_ + Math.sin(t + i) * 20, W_), wrap(hash(i + 90) * H + t * (30 + hash(i) * 30) + Z * k * 0.4, H), 1.6 + hash(i + 120) * 1.4, 0, 6.3); c.fill() }
        c.globalAlpha = 1
      }
      if (C.bio || C.jelly) {   // the glowing wake: cyan motes spread out behind the hull
        var g = R.glow('120,255,230', 14)
        for (i = 0; i < 14; i++) {
          var u2 = i / 14, age = wrap(t * 1.4 + u2, 1)
          c.globalAlpha = (1 - age) * 0.8
          c.drawImage(g, x0 + Math.sin(i * 2.7 + t * 2) * (8 + age * 38) - 9, G.py + G.ps * 0.55 + age * G.pyu * 0.9, 18, 18)
        }
        c.globalAlpha = 1
      }
    }
    if (T.gl && T.gl.ok()) layers.splice(1, 0, 'gpu-sea')
    S.hooks = { surface: surface, under: under, over: over, fg: fg, layers: layers, key: key }
    return S.hooks
  }
})(window)
