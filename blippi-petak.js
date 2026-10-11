/* G32 Blippi -- W04-M04 "Air untuk Tiga Petak" (PRD 11.5: Help & Deliver; P06/P07; "Bagi jumlah air diskrit dan pilih urutan petak"; V09 = FARM TRACTOR with water cans), played INSIDE bg-w04-m04-tiga-petak.
 * Three thirsty beds (big, round, small) each show how many water drops they need (first play 2 / 2 / 2; replay 2 / 3 / 4). The tap stands at the left, the tractor (Blippi in the cab) with its trailer waits under it.
 * 1 ISI   (pour/fill, hold): HOLD the tap valve and water arcs into the trailer; a can fills every moment (ghost cans show how many are needed). Then "Berapa kaleng?" (count).
 * 2 ANTAR (deliver, YOUR order): drag the tractor to a bed; it pours that many cans (the trailer empties by the need), the bud grows, the drop chip ticks. After the first bed: "6 - 2 = ?" (subtract, with the cans shown); after the last: the sum of cans used.
 * 3 MEKAR (tap the order): numbers 1-2-3 sit on the beds; tap them in order and each bud blooms with a chime. Then a colour question and a SoalEngine maths question. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var TW = 150
  var TH = 130
  var TRW = 118
  var TRH = 66
  var BASE = 735
  var X0 = 360
  var BEDS = [
    { cx: 507, fy: 600, fw: 200, fh: 167, key: 'w4-tulip', stop: 565, zone: [250, 770], cy: 470 },
    { cx: 1091, fy: 596, fw: 150, fh: 138, key: 'w4-hibiskus', stop: 1150, zone: [900, 1290], cy: 500 },
    { cx: 1454, fy: 652, fw: 140, fh: 118, key: 'w4-hortensia', stop: 1509, zone: [1290, 1650], cy: 560 }
  ]
  var VALVE = { x: 40, y: 430, w: 150, h: 150 }
  var SPOUT = { x: 118, y: 515 }

  var mod = { mount: function (api) {
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var step0 = api.restore ? api.restore.step : 0
    var again = !!(api.B.missionDone && api.B.missionDone('W04-M04'))
    var NEED = again ? [2, 3, 4] : [2, 2, 2]
    var T = NEED[0] + NEED[1] + NEED[2]
    var ORDER = again ? [2, 0, 1] : [1, 2, 0]
    var st = { done: (saved.done || [false, false, false]).slice(), bloom: (saved.bloom || [false, false, false]).slice(), canN: saved.canN || 0 }
    if (step0 >= 1) st.canN = T
    if (step0 >= 2) { st.done = [true, true, true]; st.canN = 0 }
    var busy = false
    var hd = null
    var holding = false
    var level = st.canN
    var raf = 0
    var lastT = 0
    var face = -1
    var curX = step0 >= 2 ? BEDS[2].stop : X0
    var nextOrd = 0
    function save () { api.persist({ done: st.done, bloom: st.bloom, canN: st.canN }) }
    function nDone () { return st.done.filter(Boolean).length }

    // ---- the three beds: ghost flower (what will grow), bud, thirst chip, tap target
    var ghostF = []
    var flowers = []
    var chips = []
    var zones = []
    BEDS.forEach(function (b, i) {
      var g = K.ghost(api, sc, b.key, b.cx - b.fw / 2, b.fy - b.fh, b.fw, b.fh, false, true)
      g.setAttribute('data-gap', String(i))
      ghostF.push(g)
      var f = api.at(sc, 'flower', b.cx - b.fw / 2, b.fy - b.fh, b.fw, b.fh)
      f.setAttribute('data-flower', String(i))
      f.style.cssText += ';z-index:5;pointer-events:none;transform-origin:50% 100%;opacity:0'
      api.art(f, b.key, 0, 0, b.fw, b.fh, '')
      flowers.push(f)
      var cw = NEED[i] * 40 + 24
      var c = api.at(sc, 'chip', b.cx - cw / 2, b.cy - 70, cw, 64)
      c.setAttribute('data-need', String(NEED[i]))
      c.style.cssText += ';z-index:5;border-radius:22px;background:rgba(255,255,255,.9);border:4px solid #2F8FD8;display:flex;align-items:center;justify-content:center;gap:2px;pointer-events:none'
      for (var k = 0; k < NEED[i]; k++) { var d = document.createElement('div'); d.style.cssText = 'position:relative;width:34px;height:46px'; api.B.A.fill(d, 'pc2-tetes'); c.appendChild(d) }
      chips.push(c)
      var z = api.at(sc, 'bedzone', b.zone[0], b.cy - 20, b.zone[1] - b.zone[0], 230, 'button')
      z.type = 'button'
      z.setAttribute('data-bed', String(i))
      z.setAttribute('aria-label', 'Petak ' + (i + 1))
      z.style.cssText += ';background:none;border:0;padding:0;z-index:8;cursor:pointer;pointer-events:none'
      z.addEventListener('click', function () { onBed(i) })
      zones.push(z)
    })
    function setFlower (i, v) { flowers[i].style.opacity = v > 0 ? '1' : '0'; flowers[i].style.transform = 'scale(' + (0.3 + 0.7 * v) + ')'; ghostF[i].style.display = v > 0 ? 'none' : 'block' }
    function tick (i) {
      chips[i].innerHTML = ''
      chips[i].style.borderColor = '#2FAE3A'
      var t = document.createElement('div'); t.style.cssText = 'width:44px;height:44px'; t.innerHTML = api.B.ICON.check; chips[i].appendChild(t)
    }
    BEDS.forEach(function (b, i) { if (st.done[i]) { setFlower(i, st.bloom[i] || step0 >= 3 ? 1 : 0.45); tick(i) } })

    // ---- the tap + valve
    var valve = api.at(sc, 'valve', VALVE.x, VALVE.y, VALVE.w, VALVE.h, 'button')
    valve.type = 'button'
    valve.setAttribute('data-tap', '1')
    valve.setAttribute('aria-label', 'Keran')
    valve.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none'
    var vart = api.art(valve, 'prop-katup', 0, 0, VALVE.w, VALVE.h, '')
    if (vart.animate && !api.reduced()) vart.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(0)' }], { duration: 1600, iterations: Infinity, easing: 'ease-in-out' })

    // ---- tractor + trailer with the water cans (unit origin = tractor centre on the ground line)
    var unit = api.at(sc, '', 0, 0, 1, 1)
    unit.setAttribute('data-unit', '1')
    unit.style.cssText += ';z-index:6;touch-action:none'
    api.at(unit, 'shd', -TW / 2 + 6, -16, TW + TRW - 40, 26)
    var body = api.at(unit, '', 0, 0, 1, 1)
    var trailer = api.at(body, '', TW / 2 - 16, -TRH, TRW, TRH)
    trailer.setAttribute('data-trailer', '1')
    api.art(trailer, 'w4-trailer', 0, 0, TRW, TRH, '')
    var tractor = api.at(body, '', -TW / 2, -TH, TW, TH, 'button')
    tractor.type = 'button'
    tractor.setAttribute('data-tractor', '1')
    tractor.setAttribute('aria-label', 'Traktor')
    tractor.style.cssText += ';background:none;border:0;padding:0;cursor:default;touch-action:none'
    var tart = api.art(tractor, 'veh-farm-tractor', 0, 0, TW, TH, '')
    tart.setAttribute('data-veh', 'farm-tractor')
    K.driver(tractor, { x: 0.41, y: 0.16, w: 0.34, h: 0.34 })
    if (tractor.animate && !api.reduced()) tart.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }, { transform: 'translateY(0)' }], { duration: 1200, iterations: Infinity, easing: 'ease-in-out' })
    function canXY (k) { return { x: 12 + (k % 5) * 20, y: k < 5 ? -16 : -34 } }
    var canGhost = []
    var canEls = []
    for (var k = 0; k < T; k++) {
      var cp = canXY(k)
      var cg = K.ghost(api, trailer, 'w4-kaleng', cp.x, cp.y, 30, 24, false, true)
      cg.setAttribute('data-canghost', String(k))
      cg.style.zIndex = '2'
      canGhost.push(cg)
      var ce = api.at(trailer, 'can', cp.x, cp.y, 30, 24)
      ce.setAttribute('data-can', String(k))
      ce.style.cssText += ';z-index:3;pointer-events:none;display:none'
      api.art(ce, 'w4-kaleng', 0, 0, 30, 24, '')
      canEls.push(ce)
    }
    function showCans () { for (var q = 0; q < T; q++) { var on = q < st.canN; canEls[q].style.display = on ? 'block' : 'none'; canGhost[q].style.display = on || api.step() > 0 ? 'none' : 'block' } }
    function place (x, bob) { curX = x; unit.style.transform = 'translate(' + x + 'px,' + (BASE + (bob || 0)) + 'px)'; body.style.transform = 'scaleX(' + face + ')' }
    place(curX)
    showCans()
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 1672 941'); svg.setAttribute('width', '1672'); svg.setAttribute('height', '941')
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:8'
    sc.appendChild(svg)
    function trailerCenter () { return curX + face * (TW / 2 - 16 + TRW / 2) }

    // ---- step 1: hold the valve
    var s1stream = null
    function fillLoop (now) {
      if (!holding || st.canN >= T) return
      var dt = Math.min(50, now - lastT)
      lastT = now
      level += dt / 640
      while (Math.floor(level) > st.canN && st.canN < T) {
        canEls[st.canN].style.display = 'block'
        canGhost[st.canN].style.display = 'none'
        K.land(api, canEls[st.canN])
        api.sfx('collect')
        api.fx('droplets', trailerCenter() - 30 + st.canN * 8, BASE - TRH - 30, 90)
        st.canN++
      }
      if (Math.floor(now / 300) !== Math.floor((now - dt) / 300)) api.sfx('water')
      if (st.canN >= T) { holding = false; if (s1stream) s1stream.set(0); filled(); return }
      raf = requestAnimationFrame(fillLoop)
    }
    function streamTo (tx, ty) { var d = 'M' + SPOUT.x + ',' + SPOUT.y + ' Q' + ((SPOUT.x + tx) / 2) + ',' + (SPOUT.y + 20) + ' ' + tx + ',' + ty; return K.waterPath(svg, d, 14) }
    var vd = null
    valve.addEventListener('pointerdown', function (ev) {
      if (busy) return
      api.touch()
      if (api.step() !== 0) { api.warn(api.step() === 1 ? L.dragIt : L.tapOrder); return }
      if (st.canN >= T) return
      try { valve.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      vd = ev.pointerId
      holding = true
      lastT = performance.now()
      valve.classList.remove('glow')
      if (!s1stream) s1stream = streamTo(trailerCenter(), BASE - TRH - 20)
      s1stream.set(1)
      api.sfx('water')
      raf = requestAnimationFrame(fillLoop)
    })
    function vrel (ev) {
      if (vd === null || ev.pointerId !== vd) return
      vd = null
      holding = false
      cancelAnimationFrame(raf)
      if (s1stream) s1stream.set(0)
      if (st.canN < T) api.warn(L.fillMore)
    }
    valve.addEventListener('pointerup', vrel)
    valve.addEventListener('pointercancel', vrel)
    valve.addEventListener('lostpointercapture', vrel)
    function filled () {
      busy = true
      api.sfx('ok')
      api.fx('check-burst', trailerCenter(), BASE - 150, 200)
      api.warn(L.filled)
      save()
      api.later(function () {
        var ch = [T - 1, T, T + 1].map(String)
        K.ask(api, { custom: { id: 'w4m04-kaleng', prompt: 'Berapa kaleng air yang penuh?', choices: ch, answer: String(T), count: { key: 'w4-kaleng', n: T }, hint1: 'Hitung kalengnya satu per satu.' }, done: function () { busy = false; api.later(function () { api.advance() }, 350) } })
      }, 800)
    }

    // ---- step 2: drag the tractor to a bed, it pours
    var dd = null
    unit.addEventListener('pointerdown', function (ev) {
      if (busy) return
      api.touch()
      var s = api.step()
      if (s !== 1) { if (s === 0) api.warn(L.fillMore); return }
      if (nDone() >= 3) return
      var p = api.toRef(ev.clientX, ev.clientY)
      try { unit.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      dd = { id: ev.pointerId, x0: p.x, from: curX, moved: 0, last: 0 }
      tractor.classList.remove('glow')
      api.sfx('honk')
    })
    unit.addEventListener('pointermove', function (ev) {
      if (!dd || ev.pointerId !== dd.id) return
      var p = api.toRef(ev.clientX, ev.clientY)
      dd.moved = Math.max(dd.moved, Math.abs(p.x - dd.x0))
      var nx = Math.max(300, Math.min(1560, dd.from + (p.x - dd.x0)))
      if (Math.abs(nx - curX) > 1) face = nx > curX ? -1 : 1
      place(nx, Math.sin(performance.now() / 55) * 1.2)
      var now = performance.now()
      if (now - dd.last > 200) { dd.last = now; api.fx('dust', curX + (face === -1 ? -(TW / 2 + TRW + 10) : (TW / 2 + TRW + 10)), BASE - 8, 70); api.sfx('boost') }
    })
    function drel (ev, cancel) {
      if (!dd || ev.pointerId !== dd.id) return
      var cu = dd
      dd = null
      var hit = -1
      var bd = 1e9
      BEDS.forEach(function (b, i) { var d = Math.abs(curX - b.stop); if (!st.done[i] && d < 200 && d < bd) { hit = i; bd = d } })
      if (!cancel && cu.moved > 12 && hit >= 0) { deliver(hit); return }
      if (!cancel && cu.moved > 12) { api.warn(L.near); BEDS.forEach(function (b, i) { if (!st.done[i]) K.glow(ghostF[i], 2400) }) }
      else if (!cancel) { api.warn(L.dragIt) }
      api.tween({ x: curX, y: 0 }, { x: cu.from, y: 0 }, 300, function (q) { place(q.x) })
    }
    unit.addEventListener('pointerup', function (ev) { drel(ev, false) })
    unit.addEventListener('pointercancel', function (ev) { drel(ev, true) })
    unit.addEventListener('lostpointercapture', function (ev) { drel(ev, true) })
    function deliver (i) {
      busy = true
      var b = BEDS[i]
      api.tween({ x: curX, y: 0 }, { x: b.stop, y: 0 }, 260, function (q) { place(q.x) }, function () {
        face = -1
        place(b.stop)
        var n = 0
        var tc = trailerCenter()
        var arc = K.waterPath(svg, 'M' + tc + ',' + (BASE - TRH - 36) + ' Q' + ((tc + b.cx) / 2) + ',' + (b.fy - 200) + ' ' + b.cx + ',' + (b.fy - 40), 14)
        arc.set(1)
        function one () {
          if (n >= NEED[i]) { arc.set(0); return bloomIn(i) }
          st.canN--
          canEls[st.canN].style.display = 'none'
          api.sfx('water')
          api.fx('droplets', b.cx - 20 + n * 30, b.fy - 40, 110)
          api.fx('splash', b.cx, b.fy - 20, 90)
          n++
          api.later(one, 560)
        }
        one()
      })
    }
    function bloomIn (i) {
      st.done[i] = true
      setFlower(i, 0.45)
      if (flowers[i].animate && !api.reduced()) flowers[i].animate([{ transform: 'scale(.1)' }, { transform: 'scale(.55)', offset: 0.6 }, { transform: 'scale(.45)' }], { duration: 520, easing: 'cubic-bezier(.23,1,.32,1)' })
      tick(i)
      api.sfx('ok')
      api.fx('gold-star', BEDS[i].cx, BEDS[i].fy - 100, 140)
      save()
      var first = nDone() === 1
      var need = NEED[i]
      var left = st.canN
      if (nDone() >= 3) {
        api.warn(L.allDone)
        api.later(function () {
          var row = []
          NEED.forEach(function (nn, j) { if (j) row.push('+'); for (var q = 0; q < nn; q++) row.push('w4-kaleng') })
          K.ask(api, { custom: { id: 'w4m04-semua', prompt: 'Berapa kaleng dipakai semuanya?', choices: [T - 1, T, T + 1].map(String), answer: String(T), row: row, rowNoBox: true, hint1: 'Hitung semua kalengnya, satu per satu.' }, done: function () { busy = false; api.later(function () { api.advance() }, 350) } })
        }, 700)
      } else if (first) {
        api.warn(L.left.replace('%n', String(left)))
        api.later(function () {
          var row = []
          for (var q = 0; q < left; q++) row.push('w4-kaleng')
          for (var q2 = 0; q2 < need; q2++) row.push('-w4-kaleng')
          K.ask(api, { custom: { id: 'w4m04-sisa', prompt: 'Ada ' + T + ' kaleng, dipakai ' + need + '. Tinggal berapa?', choices: [left - 1, left, left + 1].filter(function (v) { return v >= 0 }).map(String), answer: String(left), row: row, rowNoBox: true, hint1: 'Hitung kaleng yang masih terang.' }, done: function () { busy = false; api.warn(L.dragIt) } })
        }, 700)
      } else { api.warn(L.left.replace('%n', String(left))); busy = false }
    }

    // ---- step 3: tap the beds in order, buds bloom
    function onBed (i) {
      if (api.step() !== 2 || busy) return
      api.touch()
      if (st.bloom[i]) return
      if (i !== ORDER[nextOrd]) { api.warn(L.wrongOrder); api.sfx('bad'); if (zones[i].animate && !api.reduced()) zones[i].animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 280 }); K.glow(numEl[ORDER[nextOrd]], 2400); return }
      bloom(i)
    }
    var numEl = []
    BEDS.forEach(function (b, i) {
      var n = api.at(sc, 'num', b.cx - 40, b.cy - 150, 80, 80)
      n.setAttribute('data-num', String(i))
      n.style.cssText += ';z-index:6;border-radius:50%;background:#fff;border:6px solid #13318A;color:#13318A;font:900 52px/68px Fredoka,Nunito,sans-serif;text-align:center;pointer-events:none;display:none'
      n.textContent = String(ORDER.indexOf(i) + 1)
      numEl.push(n)
    })
    function bloom (i) {
      st.bloom[i] = true
      nextOrd++
      numEl[i].style.display = 'none'
      flowers[i].animate && !api.reduced() && flowers[i].animate([{ transform: 'scale(.45)' }, { transform: 'scale(1.12)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 560, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' })
      flowers[i].style.transform = 'scale(1)'
      api.sfx(nextOrd === 3 ? 'ok' : 'collect')
      api.fx('leaves', BEDS[i].cx, BEDS[i].fy - 90, 170)
      api.fx('spark', BEDS[i].cx, BEDS[i].fy - 100, 150)
      save()
      if (nextOrd >= 3) {
        busy = true
        api.warn(L.bloom)
        api.later(function () { api.fx('confetti', 836, 520, 380); api.sfx('win') }, 400)
        api.later(function () {
          K.ask(api, { custom: { id: 'w4m04-biru', prompt: 'Bunga mana yang berwarna biru?', choices: ['Tulip', 'Hibiskus', 'Hortensia'], choicePics: ['assets/blippi/w4-tulip.webp', 'assets/blippi/w4-hibiskus.webp', 'assets/blippi/w4-hortensia.webp'], answer: 'Hortensia', hint1: 'Cari bunga yang warnanya seperti langit.' }, done: function () {
            api.later(function () { K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { busy = false; api.later(function () { api.advance() }, 300) } }) }, 300)
          } })
        }, 1500)
      } else { api.warn(L.tapOrder); K.glow(numEl[ORDER[nextOrd]], 2600) }
    }
    BEDS.forEach(function (b, i) { if (st.bloom[i]) { flowers[i].style.transform = 'scale(1)'; nextOrd++ } })

    function firstUndone () { for (var q = 0; q < 3; q++) if (!st.done[q]) return q; return -1 }
    var ctl = {
      onStep: function (n, initial) {
        showCans()
        valve.style.display = n === 0 ? '' : 'none'
        zones.forEach(function (z) { z.style.pointerEvents = n === 2 ? 'auto' : 'none' })
        tractor.style.cursor = n === 1 ? 'grab' : 'default'
        numEl.forEach(function (e, i) { e.style.display = n === 2 && !st.bloom[i] ? 'block' : 'none' })
        if (n === 0) { K.glow(valve, 3400); canGhost.forEach(function (g, q) { if (q >= st.canN) g.style.display = 'block' }) }
        if (n === 1) { K.glow(tractor, 3400); BEDS.forEach(function (b, i) { if (!st.done[i]) K.glow(ghostF[i], 3400) }) }
        if (n === 2) { K.glow(numEl[ORDER[nextOrd]], 3400); if (!initial) { place(BEDS[2].stop) } }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) hd.move([{ x: VALVE.x + 75, y: VALVE.y + 75 }, { x: VALVE.x + 75, y: VALVE.y + 75 }], 2200)
        else if (n === 1) { var i = firstUndone(); if (i >= 0) hd.move([{ x: curX, y: BASE - 90 }, { x: BEDS[i].stop, y: BASE - 90 }], 1400) }
        else { var o = BEDS[ORDER[Math.min(2, nextOrd)]]; hd.move([{ x: o.cx, y: o.cy + 40 }, { x: o.cx, y: o.cy + 40 }], 1800) }
      },
      hint: function (lvl) {
        var s = api.step()
        if (busy) return
        if (s === 0) { K.glow(valve, 3000); if (lvl >= 4) { st.canN = T; level = T; showCans(); filled() } }
        else if (s === 1) { var i = firstUndone(); if (i >= 0) { K.glow(ghostF[i], 3000); K.glow(tractor, 3000); chips[i].animate && chips[i].animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 700 }); if (lvl >= 4) deliver(i) } }
        else { var o = ORDER[Math.min(2, nextOrd)]; K.glow(numEl[o], 3000); if (lvl >= 4) bloom(o) }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { holding = false; cancelAnimationFrame(raf) }
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W04-M04', mod)
})(window)
