/* G32 Blippi -- W03-M02 "Jejak Sapu Raksasa" (PRD 11.4: Explore & Discover; P01/P07; "Bersihkan jalur untuk menemukan pola lantai tersembunyi"; V08 = STREET SWEEPER), played INSIDE bg-w03-m02-sapu.
 * A blanket of leaves hides a mosaic of floor boards (circle / triangle). The street sweeper (Blippi in the cab) waits on the pier.
 * 1 SAPU      (draw the route): draw a path with a finger from the truck; it drives along YOUR line and its brushes sweep the leaves away. One straight pass is too thin: ZIGZAG or loop until every board shows.
 *             Then "Berapa papan semuanya?" (3 circles + 4 triangles).
 * 2 LENGKAPI  (pattern): the last board of the second row is missing: "Papan apa untuk yang kosong?" then drag the circle or the triangle into the gap.
 * 3 IRAMA     (tap the rhythm): tap the 8 boards in order, left to right, row by row; each lights and rings. Then "Berapa lingkaran?". */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var TW = 330
  var TH = 229
  var HOME = { x: 1190, y: 718 }
  var CV = { x: 205, y: 425, w: 800, h: 305 }          // the leaf blanket
  var BW = 150
  var BH = 128
  var COLX = [255, 435, 615, 795]
  var ROWY = [455, 590]
  var SHAPE = ['c', 't', 'c', 't', 't', 'c', 't', 'c']    // circle / triangle; index 7 is the gap
  var GAP = 7
  var KEY = { c: 'w3-papan-lingkaran', t: 'w3-papan-segitiga' }
  var BR = { x1: -0.33, x2: -0.05, y: -0.13 }          // brush centres relative to the truck bottom-centre (art faces left)
  var PALETTE = ['#E8731A', '#D93A1E', '#F2A71B', '#C2551A', '#F5C542', '#B8402A', '#E58B2C']

  function bx (i) { return COLX[i % 4] }
  function by (i) { return ROWY[i < 4 ? 0 : 1] }

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var step0 = rs ? rs.step : 0
    var placed = !!saved.placed || step0 >= 2
    var swept = step0 >= 1
    var busy = false
    var hd = null
    var cur = { x: HOME.x, y: HOME.y }
    var face = 'l'
    function save () { api.persist({ placed: placed, swept: swept }) }

    // ---- the mosaic under the leaves
    var boards = []
    var gapEl = null
    SHAPE.forEach(function (sh, i) {
      if (i === GAP) {
        gapEl = api.at(sc, 'gapslot', bx(i), by(i), BW, BH)
        gapEl.setAttribute('data-gap', '1')
        gapEl.style.cssText += ';z-index:3;pointer-events:none;border-radius:16px;background:radial-gradient(ellipse at 50% 40%,#7a5a3a,#4d3721);box-shadow:inset 0 6px 14px rgba(0,0,0,.55);color:#fff;font:900 70px/' + BH + 'px Fredoka,Nunito,sans-serif;text-align:center;opacity:.92'
        gapEl.textContent = '?'
      }
      var b = api.at(sc, 'board', bx(i), by(i), BW, BH, 'button')
      b.type = 'button'
      b.setAttribute('data-board', String(i))
      b.setAttribute('data-shape', sh === 'c' ? 'lingkaran' : 'segitiga')
      b.setAttribute('aria-label', sh === 'c' ? 'Papan lingkaran' : 'Papan segitiga')
      b.style.cssText += ';background:none;border:0;padding:0;z-index:3;pointer-events:none;cursor:pointer;touch-action:manipulation'
      api.art(b, KEY[sh], 0, 0, BW, BH, '')
      if (i === GAP && !placed) b.style.display = 'none'
      boards.push(b)
    })

    // ---- the leaf blanket (canvas); the brushes erase it
    var cover = api.at(sc, 'leafcover', CV.x, CV.y, CV.w, CV.h)
    cover.setAttribute('data-cover', '1')
    cover.style.cssText += ';z-index:4;pointer-events:none'
    var cv = document.createElement('canvas')
    cv.width = CV.w
    cv.height = CV.h
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%'
    cover.appendChild(cv)
    var cx = cv.getContext('2d')
    function leaf (x, y, a, s, col) {
      cx.save(); cx.translate(x, y); cx.rotate(a); cx.fillStyle = col
      cx.beginPath(); cx.moveTo(-s, 0); cx.quadraticCurveTo(0, -s * 0.62, s, 0); cx.quadraticCurveTo(0, s * 0.62, -s, 0); cx.fill()
      cx.strokeStyle = 'rgba(90,30,0,.35)'; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(-s * 0.85, 0); cx.lineTo(s * 0.9, 0); cx.stroke()
      cx.restore()
    }
    function maple (x, y, a, s, col) {
      cx.save(); cx.translate(x, y); cx.rotate(a); cx.fillStyle = col; cx.beginPath()
      var k
      for (k = 0; k < 10; k++) { var r = k % 2 ? s * 0.45 : s; var an = k * Math.PI / 5; cx.lineTo(Math.cos(an) * r, Math.sin(an) * r) }
      cx.closePath(); cx.fill(); cx.restore()
    }
    var seed = 7
    function rnd () { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    function paintLeaves () {
      cx.fillStyle = 'rgba(176,98,40,.97)'
      cx.beginPath()
      if (cx.roundRect) cx.roundRect(22, 20, CV.w - 44, CV.h - 40, 40); else cx.rect(22, 20, CV.w - 44, CV.h - 40)
      cx.fill()
      var n = 1250
      var i
      for (i = 0; i < n; i++) {
        var x = -10 + rnd() * (CV.w + 20)
        var y = -8 + rnd() * (CV.h + 16)
        // thin out toward the rim so the blanket edge is ragged
        var ex = Math.min(x, CV.w - x) / 70
        var ey = Math.min(y, CV.h - y) / 50
        if (Math.min(ex, ey) < 1 && rnd() > Math.max(0.05, Math.min(ex, ey))) continue
        var col = PALETTE[Math.floor(rnd() * PALETTE.length)]
        if (rnd() < 0.4) maple(x, y, rnd() * 6.28, 17 + rnd() * 10, col); else leaf(x, y, rnd() * 6.28, 20 + rnd() * 14, col)
      }
    }
    if (placed && gapEl) gapEl.style.display = 'none'
    if (swept) cover.style.display = 'none'; else paintLeaves()
    function erase (px, py, r) {
      var x = px - CV.x
      var y = py - CV.y
      var g = cx.createRadialGradient(x, y, r * 0.55, x, y, r)
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)')
      cx.save(); cx.globalCompositeOperation = 'destination-out'; cx.fillStyle = g
      cx.beginPath(); cx.arc(x, y, r, 0, 6.2832); cx.fill(); cx.restore()
    }
    // how much of a board is bare: 3x3 samples
    function clearOf (i) {
      var n = 0
      var a
      var b
      for (a = 0; a < 3; a++) for (b = 0; b < 3; b++) {
        var x = Math.round(bx(i) - CV.x + BW * (0.15 + 0.35 * a))
        var y = Math.round(by(i) - CV.y + BH * (0.15 + 0.35 * b))
        if (cx.getImageData(x, y, 1, 1).data[3] < 40) n++
      }
      return n / 9
    }
    function bareBoards () { var n = 0; var i; for (i = 0; i < SHAPE.length; i++) if (clearOf(i) >= 0.75) n++; return n }

    // ---- the street sweeper, Blippi in the cab
    var truck = api.at(sc, '', 0, 0, TW, TH, 'button')
    truck.type = 'button'
    truck.setAttribute('data-truck', '1')
    truck.setAttribute('aria-label', 'Truk sapu jalan')
    truck.style.cssText += ';background:none;border:0;padding:0;z-index:6;pointer-events:none;transform-origin:50% 100%;cursor:default'
    var tart = api.art(truck, 'veh-street-sweeper', 0, 0, TW, TH, '')
    tart.setAttribute('data-veh', 'street-sweeper')
    K.driver(truck, { x: 0.25, y: 0.2, w: 0.2, h: 0.3 })
    var shade = api.at(sc, 'shd', 0, 0, 290, 40)
    shade.style.zIndex = '5'
    function placeTruck (x, y, f, tilt) {
      cur = { x: x, y: y }
      if (f) face = f
      truck.style.transform = 'translate(' + (x - TW / 2) + 'px,' + (y - TH) + 'px) scale(' + (face === 'r' ? -1 : 1) + ',1)' + (tilt ? ' rotate(' + tilt + 'deg)' : '')
      shade.style.transform = 'translate(' + (x - 145) + 'px,' + (y - 22) + 'px)'
    }
    function brushPt (k) { var sg = face === 'l' ? 1 : -1; return { x: cur.x + sg * (k === 2 ? BR.x2 : BR.x1) * TW, y: cur.y + BR.y * TH } }
    function placeByBrush (p, f) { var sg = f === 'l' ? 1 : -1; placeTruck(p.x - sg * BR.x1 * TW, p.y - BR.y * TH, f) }
    placeTruck(HOME.x, HOME.y, 'l')
    var goalG = null
    if (!swept) {
      goalG = K.ghost(api, sc, 'veh-street-sweeper', 200, 560 - TH * 0.6, TW * 0.9, TH * 0.9)
      goalG.setAttribute('data-goal', '1')
      goalG.style.zIndex = '5'
    }

    // ---- step 1: draw the route
    var rsvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    rsvg.setAttribute('viewBox', '0 0 1672 941'); rsvg.setAttribute('width', '1672'); rsvg.setAttribute('height', '941')
    rsvg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:8'
    rsvg.innerHTML = '<path id="route" fill="none" stroke="#FFFFFF" stroke-opacity=".85" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><path id="route2" fill="none" stroke="#1F6FD1" stroke-opacity=".9" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 22"/>'
    sc.appendChild(rsvg)
    var routeEl = rsvg.querySelector('#route')
    var routeEl2 = rsvg.querySelector('#route2')
    function pathD (a) { var d = ''; a.forEach(function (p, i) { d += (i ? 'L' : 'M') + p.x.toFixed(0) + ',' + p.y.toFixed(0) }); return d }
    function showRoute (a) { routeEl.setAttribute('d', a.length ? pathD(a) : ''); routeEl2.setAttribute('d', a.length ? pathD(a) : '') }
    var cap = api.at(sc, 'drawcap', 0, 0, 1672, 941)
    cap.setAttribute('data-draw', '1')
    cap.style.cssText += ';z-index:5;touch-action:none;pointer-events:none'
    var pts = []
    var drawing = null
    cap.addEventListener('pointerdown', function (ev) {
      if (api.step() !== 0 || busy || drawing) return
      api.touch()
      var r = B.toRef(ev.clientX, ev.clientY)
      if (!K.within(r, cur.x, cur.y - TH * 0.5, 230)) { api.warn(L.startAtTruck); K.glow(truck, 2600); return }
      drawing = ev.pointerId
      pts = [brushPt(1), r]
      showRoute(pts)
      try { cap.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
    })
    cap.addEventListener('pointermove', function (ev) {
      if (drawing !== ev.pointerId) return
      var r = B.toRef(ev.clientX, ev.clientY)
      var l = pts[pts.length - 1]
      if (Math.hypot(r.x - l.x, r.y - l.y) > 14) { pts.push(r); showRoute(pts) }
    })
    function drawEnd (ev, cancel) {
      if (drawing !== ev.pointerId) return
      drawing = null
      if (cancel || pts.length < 6) { if (!cancel) api.warn(L.drawIt); api.later(function () { showRoute([]) }, 700); return }
      sweep(pts.slice())
    }
    cap.addEventListener('pointerup', function (ev) { drawEnd(ev, false) })
    cap.addEventListener('pointercancel', function (ev) { drawEnd(ev, true) })
    function resample (a, step) {
      var out = [a[0]]
      var acc = 0
      var i
      for (i = 1; i < a.length; i++) {
        var seg = Math.hypot(a[i].x - a[i - 1].x, a[i].y - a[i - 1].y)
        var k = 0
        while (acc + seg - k >= step) { k += step - acc; acc = 0; var f = k / seg; out.push({ x: a[i - 1].x + (a[i].x - a[i - 1].x) * f, y: a[i - 1].y + (a[i].y - a[i - 1].y) * f }) }
        acc += seg - k
      }
      out.push(a[a.length - 1])
      return out
    }
    function sweep (raw) {
      busy = true
      if (goalG) goalG.style.display = 'none'
      var P = resample(raw, 10)
      var i = 0
      api.sfx('honk')
      function stepFn () {
        if (!busy) return
        if (api.paused()) { api.later(stepFn, 120); return }
        var p = P[i]
        var q = P[Math.min(P.length - 1, i + 4)]
        var f = Math.abs(q.x - p.x) > 3 ? (q.x - p.x < 0 ? 'l' : 'r') : face
        placeByBrush(p, f)
        var b1 = brushPt(1)
        var b2 = brushPt(2)
        erase(b1.x, b1.y, 88)
        erase(b2.x, b2.y, 78)
        if (i % 7 === 0) api.fx('dust', b1.x, b1.y, 70)
        if (i >= P.length - 1) { finishSweep(); return }
        i++
        api.later(stepFn, 24)
      }
      stepFn()
    }
    function finishSweep () {
      showRoute([])
      var n = bareBoards()
      if (n < SHAPE.length) {
        busy = false
        api.warn(L.more.replace('%n', String(SHAPE.length - n)))
        api.fx('dust', cur.x, cur.y - 40, 120)
        return
      }
      swept = true
      busy = false
      cx.clearRect(0, 0, CV.w, CV.h)
      api.sfx('ok')
      api.fx('confetti', 630, 560, 340)
      api.fx('gold-star', 630, 520, 240)
      save()
      api.warn(L.found)
      api.later(function () {
        K.ask(api, { custom: { id: 'm02-sum', prompt: 'Berapa papan semuanya?', choices: ['6', '7', '8'], answer: '7', scene: { groups: [{ key: 'w3-papan-lingkaran', n: 3 }, { key: 'w3-papan-segitiga', n: 4 }] }, hint1: 'Hitung: 3 lingkaran dan 4 segitiga.' }, done: function () { goHome(function () { api.advance() }) } })
      }, 1100)
    }
    function goHome (cb) { api.tween({ x: cur.x, y: cur.y }, HOME, 700, function (p) { placeTruck(p.x, p.y, 'l') }, function () { if (cb) cb() }) }

    // ---- step 2: the pattern, then the missing board
    var spares = []
    function makeSpares () {
      ;[{ s: 't', x: 30, y: 455 }, { s: 'c', x: 30, y: 600 }].forEach(function (sp) {
        var e = api.at(sc, 'spare', sp.x, sp.y, BW, BH, 'button')
        e.type = 'button'
        e.setAttribute('data-spare', sp.s === 'c' ? 'lingkaran' : 'segitiga')
        e.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none'
        api.art(e, KEY[sp.s], 0, 0, BW, BH, '')
        if (e.animate && !api.reduced()) e.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], { duration: 1700, iterations: Infinity, easing: 'ease-in-out' })
        K.land(api, e)
        spares.push(e)
        var d = null
        e.addEventListener('pointerdown', function (ev) {
          if (api.step() !== 1 || d || placed) return
          api.touch()
          var r = B.toRef(ev.clientX, ev.clientY)
          d = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r }
          e.classList.remove('glow'); e.style.zIndex = '30'
          try { e.setPointerCapture(ev.pointerId) } catch (er) { /* synthetic */ }
        })
        e.addEventListener('pointermove', function (ev) {
          if (!d || ev.pointerId !== d.id) return
          var r = B.toRef(ev.clientX, ev.clientY)
          d.p = r
          d.moved = Math.max(d.moved, Math.abs(r.x - d.x0) + Math.abs(r.y - d.y0))
          e.style.transform = 'translate(' + (r.x - d.x0) + 'px,' + (r.y - d.y0) + 'px) scale(1.1)'
        })
        function end (ev, cancel) {
          if (!d || ev.pointerId !== d.id) return
          var cu = d
          d = null
          e.style.zIndex = '7'
          var onGap = K.within(cu.p, bx(GAP) + BW / 2, by(GAP) + BH / 2, 150)
          if (!cancel && cu.moved > 10 && onGap) {
            if (sp.s === SHAPE[GAP]) { place(e); return }
            api.warn(L.wrongBoard); K.glow(gapEl, 2400)
            spares.forEach(function (o) { if (o !== e) K.glow(o, 2600) })
          } else if (!cancel) api.warn(cu.moved > 10 ? L.toGap : L.dragBoard)
          api.tween({ x: cu.p.x - cu.x0, y: cu.p.y - cu.y0 }, { x: 0, y: 0 }, 280, function (t) { e.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)' }, function () { e.style.transform = '' })
        }
        e.addEventListener('pointerup', function (ev) { end(ev, false) })
        e.addEventListener('pointercancel', function (ev) { end(ev, true) })
        e.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
      })
    }
    function askPattern () {
      K.ask(api, { custom: { id: 'm02-pat', prompt: 'Papan apa untuk yang kosong?', choices: ['Lingkaran', 'Segitiga'], choicePics: ['assets/blippi/w3-papan-lingkaran.webp', 'assets/blippi/w3-papan-segitiga.webp'], answer: 'Lingkaran', hint1: 'Lihat barisnya: segitiga, lingkaran, segitiga... lalu apa?', explain: 'Polanya bergantian!' }, done: function () { api.warn(L.dragBoard); spares.forEach(function (o) { K.glow(o, 3000) }); K.glow(gapEl, 3000) } })
    }
    function place (e) {
      placed = true
      if (e.parentNode) e.parentNode.removeChild(e)
      spares.forEach(function (o) { if (o.parentNode) o.parentNode.removeChild(o) })
      spares = []
      boards[GAP].style.display = 'block'
      gapEl.style.display = 'none'
      K.land(api, boards[GAP])
      api.sfx('ok')
      api.fx('gold-star', bx(GAP) + BW / 2, by(GAP) + BH / 2, 200)
      api.fx('dust', bx(GAP) + BW / 2, by(GAP) + BH, 130)
      save()
      api.warn(L.patternDone)
      api.later(function () { api.advance() }, 1000)
    }

    // ---- step 3: tap the rhythm
    var nextTap = 0
    function lightBoard (i) {
      var b = boards[i]
      if (b.animate && !api.reduced()) b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.16)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 380 })
      b.style.filter = 'brightness(1.25) drop-shadow(0 0 14px #fff)'
      api.later(function () { b.style.filter = '' }, 520)
      api.sfx('tap')
    }
    function tapBoard (i) {
      if (api.step() !== 2 || busy) return
      api.touch()
      if (i !== nextTap) { api.warn(L.order); K.glow(boards[nextTap], 2600); return }
      lightBoard(i)
      boards[i].classList.remove('glow')
      nextTap++
      if (nextTap >= SHAPE.length) { rhythmDone(); return }
      K.glow(boards[nextTap], 2600)
    }
    boards.forEach(function (b, i) { b.addEventListener('click', function () { tapBoard(i) }) })
    function rhythmDone () {
      busy = true
      api.sfx('ok')
      api.fx('confetti', 630, 540, 360)
      api.warn(L.rhythm)
      api.later(function () {
        K.ask(api, { custom: { id: 'm02-circles', prompt: 'Berapa papan lingkaran?', choices: ['3', '4', '5'], answer: '4', count: { key: 'w3-papan-lingkaran', n: 4 }, hint1: 'Hitung papan yang bulat satu per satu.' }, done: function () { busy = false; api.later(function () { api.advance() }, 300) } })
      }, 900)
    }

    // ---- demo route (also hint rung 4): a zigzag over both rows
    var ZIG = [{ x: 960, y: 520 }, { x: 760, y: 520 }, { x: 560, y: 520 }, { x: 330, y: 520 }, { x: 330, y: 610 }, { x: 560, y: 650 }, { x: 760, y: 650 }, { x: 960, y: 650 }]
    function zig () { return [brushPt(1)].concat(ZIG) }
    function firstBare () { var i; for (i = 0; i < SHAPE.length; i++) if (clearOf(i) < 0.75) return i; return 0 }

    var ctl = {
      onStep: function (n) {
        cap.style.pointerEvents = n === 0 && !swept ? 'auto' : 'none'
        boards.forEach(function (b, i) { b.style.pointerEvents = n === 2 && (i !== GAP || placed) ? 'auto' : 'none' })
        if (n === 0) { K.glow(truck, 3200); if (goalG) K.glow(goalG, 3200) }
        if (n === 1) { if (!spares.length && !placed) { makeSpares(); api.later(askPattern, 500) } }
        if (n === 2) { nextTap = 0; K.glow(boards[0], 3200); api.warn(L.tapStart) }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) { var b = brushPt(1); hd.move([{ x: b.x, y: b.y - 40 }, { x: 900, y: 520 }, { x: 560, y: 520 }, { x: 330, y: 540 }, { x: 330, y: 640 }, { x: 640, y: 650 }], 700) }
        else if (n === 1) hd.move([{ x: 70, y: 640 }, { x: bx(GAP) + 60, y: by(GAP) + 50 }], 1200)
        else hd.move([{ x: bx(0) + 50, y: by(0) + 40 }, { x: bx(1) + 50, y: by(1) + 40 }, { x: bx(2) + 50, y: by(2) + 40 }], 600)
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          K.glow(truck, 3000)
          if (lvl >= 2) { var i = firstBare(); if (cover.style.display !== 'none') { /* the next bare-less board pulses */ var gh = boards[i]; K.glow(gh, 2600) } }
          if (lvl >= 4 && !busy) { showRoute(zig()); sweep(zig()) }
        } else if (s === 1) {
          spares.forEach(function (o) { if (o.getAttribute('data-spare') === 'lingkaran') K.glow(o, 3000) })
          K.glow(gapEl, 3000)
          if (lvl >= 4 && !placed) { var c = spares.filter(function (o) { return o.getAttribute('data-spare') === 'lingkaran' })[0]; if (c) place(c) }
        } else {
          K.glow(boards[Math.min(nextTap, SHAPE.length - 1)], 3000)
          if (lvl >= 4 && nextTap < SHAPE.length) tapBoard(nextTap)
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { busy = false }
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W03-M02', mod)
})(window)
