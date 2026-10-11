/* G32 Blippi -- W05-M04 "Jembatan Antar-Dermaga" (PRD 11.6: Build & Use; P08/P11; "Sambungkan modul dan susun urutan pengiriman"; two valid routes; V03 = DUMP TRUCK), played INSIDE bg-w05-m04-jembatan-dermaga.
 * Two docks, a gap of water between them: THREE cells wide (ghost pontoon at each). Pontoon modules lie on the left dock: one of 2 cells and three of 1 cell.
 * 1 SAMBUNG (connect modules): drag modules into the gap from the left; 2+1 or 1+1+1 both close it (two valid solutions); too long = floats back with a kind line. "Berapa petak celahnya?" first, then "2 + 1 = ?".
 * 2 JALAN   (hold to drive): HOLD the dump truck (Blippi at the wheel): it rolls across the bridge you built to the ghost truck on the far dock; release = stop.
 * 3 URUTAN  (sequence): a plan card shows three coloured crates in an order; tap the crates on the far dock in THAT order, each flies to the warehouse. Then a SoalEngine maths question. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var CX0 = 652
  var CW = 155
  var CH = 87
  var CY = 428
  var TWd = 250
  var THd = 180
  var START = { x: 330, y: 515 }
  var DEST = { x: 1320, y: 515 }
  var MODS = [
    { id: 'm2', n: 2, x: 80, y: 392 },
    { id: 'm1a', n: 1, x: 430, y: 392 },
    { id: 'm1b', n: 1, x: 90, y: 492 },
    { id: 'm1c', n: 1, x: 270, y: 492 }
  ]
  var COLS = { biru: 'hue-rotate(190deg)', oranye: 'none', hijau: 'hue-rotate(85deg) saturate(1.2)' }
  var CRATES = [{ id: 'biru', x: 1180, y: 505 }, { id: 'oranye', x: 1340, y: 520 }, { id: 'hijau', x: 1500, y: 505 }]
  var CRW = 130
  var CRH = 98
  var STORE = { x: 1490, y: 310 }

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var step0 = api.restore ? api.restore.step : 0
    var order = saved.order || ['biru', 'oranye', 'hijau'].sort(function () { return Math.random() - 0.5 })
    var filled = step0 >= 1 ? 3 : 0
    var busy = false
    var hd = null
    var tapped = 0
    var arrived = step0 >= 3
    var cur = { x: START.x, y: START.y }
    var u = 0
    var hold = false
    var raf = 0
    var lastT = 0
    var started = false
    function save () { api.persist({ order: order }) }

    // ---- ghost cells in the gap
    var gh = []
    for (var gi = 0; gi < 3; gi++) {
      var g = K.ghost(api, sc, 'w5-ponton', CX0 + gi * CW, CY, CW, CH, false, true)
      g.setAttribute('data-ghost', String(gi))
      g.style.zIndex = '3'
      if (filled > gi) g.style.display = 'none'
      gh.push(g)
    }

    // ---- modules: n ponton blocks chained
    function mkChain (parent, n, x, y) {
      var el = api.at(parent, 'chain', x, y, n * CW, CH)
      for (var i = 0; i < n; i++) api.art(el, 'w5-ponton', i * CW, 0, CW, CH, '')
      return el
    }
    var mods = []
    MODS.forEach(function (m, i) {
      var el = mkChain(sc, m.n, m.x, m.y)
      el.setAttribute('data-mod', m.id)
      el.setAttribute('data-n', String(m.n))
      el.style.cssText += ';z-index:7;touch-action:none;cursor:grab'
      if (el.animate && !api.reduced()) el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 1900 + i * 200, iterations: Infinity, easing: 'ease-in-out' })
      var it = { m: m, el: el, used: false }
      mods.push(it)
      var d = null
      el.addEventListener('pointerdown', function (ev) {
        if (api.step() !== 0 || busy || d || it.used) return
        api.touch()
        var r = B.toRef(ev.clientX, ev.clientY)
        d = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r }
        el.classList.remove('glow')
        el.style.zIndex = '30'
        try { el.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      })
      el.addEventListener('pointermove', function (ev) {
        if (!d || ev.pointerId !== d.id) return
        var r = B.toRef(ev.clientX, ev.clientY)
        d.p = r
        d.moved = Math.max(d.moved, Math.abs(r.x - d.x0) + Math.abs(r.y - d.y0))
        el.style.transform = 'translate(' + (r.x - d.x0) + 'px,' + (r.y - d.y0) + 'px) scale(1.06)'
      })
      function end (ev, cancel) {
        if (!d || ev.pointerId !== d.id) return
        var cu = d
        d = null
        el.style.zIndex = '7'
        var inGap = cu.p.x > CX0 - 60 && cu.p.x < CX0 + 3 * CW + 60 && cu.p.y > CY - 90 && cu.p.y < CY + CH + 90
        if (!cancel && cu.moved > 10 && inGap) {
          if (filled + m.n > 3) { api.warn(L.tooLong); api.sfx('bad'); for (var k = filled; k < 3; k++) K.glow(gh[k], 2800) } else { put(it); return }
        } else if (!cancel) api.warn(cu.moved > 10 ? L.toGap : L.dragPiece)
        api.tween({ x: cu.p.x - cu.x0, y: cu.p.y - cu.y0 }, { x: 0, y: 0 }, 280, function (t) { el.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)' }, function () { el.style.transform = '' })
      }
      el.addEventListener('pointerup', function (ev) { end(ev, false) })
      el.addEventListener('pointercancel', function (ev) { end(ev, true) })
      el.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
    })
    function put (it) {
      it.used = true
      var n = it.m.n
      it.el.style.display = 'none'
      for (var k = filled; k < filled + n; k++) gh[k].style.display = 'none'
      var b = mkChain(sc, n, CX0 + filled * CW, CY)
      b.setAttribute('data-built', it.m.id)
      b.style.cssText += ';z-index:5;pointer-events:none'
      K.land(api, b)
      api.sfx('bump')
      api.fx('dust', CX0 + (filled + n / 2) * CW, CY + CH, 150)
      filled += n
      save()
      if (filled >= 3) {
        api.warn(L.built)
        api.fx('gold-star', CX0 + 1.5 * CW, CY - 30, 220)
        api.later(function () {
          K.ask(api, { custom: { id: 'm04-sum', prompt: 'Ponton 2 petak dan 1 petak. Berapa petak semuanya?', choices: ['2', '3', '4'], answer: '3', scene: { groups: [{ key: 'w5-ponton', n: 2 }, { key: 'w5-ponton', n: 1 }] }, hint1: 'Hitung semua petak: dua, lalu tiga.' }, done: function () { api.advance() } })
        }, 800)
      } else api.warn(L.placed)
    }
    // already built (restore): draw plain cells
    if (filled >= 3) { var rb = mkChain(sc, 3, CX0, CY); rb.setAttribute('data-built', 'all'); rb.style.cssText += ';z-index:5;pointer-events:none'; mods.forEach(function (q) { q.used = true; q.el.style.display = 'none' }) }

    // ---- the dump truck (flipped to face right), Blippi at the wheel
    var truck = api.at(sc, '', 0, 0, TWd, THd, 'button')
    truck.type = 'button'
    truck.setAttribute('data-truck', '1')
    truck.setAttribute('aria-label', 'Dump truck')
    truck.style.cssText += ';background:none;border:0;padding:0;z-index:8;touch-action:none;cursor:default;transform-origin:50% 100%;display:none'
    var flip = api.at(truck, '', 0, 0, TWd, THd)
    flip.style.cssText += ';transform:scaleX(-1);pointer-events:none'
    var tart = api.art(flip, 'veh-dump-truck', 0, 0, TWd, THd, '')
    tart.setAttribute('data-veh', 'dump-truck')
    K.driver(flip, { x: 0.13, y: 0.2, w: 0.2, h: 0.22 })
    var shade = api.at(sc, 'shd', 0, 0, 220, 34)
    shade.style.cssText += ';z-index:7;pointer-events:none;display:none'
    function placeTruck (x, y) {
      cur = { x: x, y: y }
      truck.style.transform = 'translate(' + (x - TWd / 2) + 'px,' + (y - THd) + 'px)'
      shade.style.transform = 'translate(' + (x - 110) + 'px,' + (y - 24) + 'px)'
    }
    placeTruck(START.x, START.y)
    var goalG = K.ghost(api, sc, 'veh-dump-truck', DEST.x - TWd / 2, DEST.y - THd, TWd, THd, true, true)
    goalG.setAttribute('data-goal', '1')
    goalG.style.display = 'none'
    function pathAt (v) { return { x: START.x + (DEST.x - START.x) * v, y: START.y + (DEST.y - START.y) * v - Math.sin(v * Math.PI) * 10 } }
    function drive (now) {
      if (!hold || arrived) return
      var dt = Math.min(50, now - lastT)
      lastT = now
      u = Math.min(1, u + dt / 3400)
      var p = pathAt(u)
      placeTruck(p.x, p.y + Math.sin(now / 70) * 1.2)
      if (u >= 1) { hold = false; arrive(); return }
      raf = requestAnimationFrame(drive)
    }
    function arrive () {
      if (arrived) return
      arrived = true
      hold = false
      cancelAnimationFrame(raf)
      goalG.style.display = 'none'
      placeTruck(DEST.x, DEST.y)
      api.sfx('bump')
      api.fx('dust', DEST.x - 100, DEST.y, 160)
      api.warn(L.crossed)
      api.later(function () { api.advance() }, 900)
    }
    truck.addEventListener('pointerdown', function (ev) {
      var s = api.step()
      api.touch()
      if (s !== 1 || arrived || busy) return
      try { truck.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      hold = true
      lastT = performance.now()
      api.sfx('honk')
      truck.classList.remove('glow')
      raf = requestAnimationFrame(drive)
    })
    function relHold () { hold = false; cancelAnimationFrame(raf); if (api.step() === 1 && !arrived && u < 1 && started) api.warn(L.holdMore) }
    truck.addEventListener('pointerup', relHold)
    truck.addEventListener('pointercancel', relHold)
    truck.addEventListener('lostpointercapture', relHold)

    // ---- step 3: the plan card + the three crates on the far dock
    var card = api.at(sc, 'plancard', 60, 150, 370, 140)
    card.setAttribute('data-order', order.join(','))
    card.style.cssText += ';z-index:9;pointer-events:none;background:#FFF8E6;border:6px solid #13318A;border-radius:24px;display:none'
    order.forEach(function (c, i) {
      var cx = 18 + i * 118
      var cr = api.at(card, '', cx, 22, 92, 70)
      cr.style.filter = COLS[c]
      api.art(cr, 'pc2-peti', 0, 0, 92, 70, '')
      var nb = api.at(card, '', cx + 26, 92, 44, 38)
      nb.style.cssText += ';font:900 32px/38px Fredoka,Nunito,sans-serif;color:#13318A;text-align:center'
      nb.textContent = String(i + 1)
    })
    var crs = {}
    CRATES.forEach(function (c, i) {
      var el = api.at(sc, 'ordcrate', c.x, c.y, CRW, CRH, 'button')
      el.type = 'button'
      el.setAttribute('data-ord', c.id)
      el.setAttribute('aria-label', 'Peti ' + c.id)
      el.style.cssText += ';background:none;border:0;padding:0;z-index:9;display:none;cursor:pointer;touch-action:none'
      var inner = api.at(el, '', 0, 0, CRW, CRH)
      inner.style.cssText += ';filter:' + COLS[c.id] + ';pointer-events:none'
      api.art(inner, 'pc2-peti', 0, 0, CRW, CRH, '')
      if (el.animate && !api.reduced()) el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 1800 + i * 160, iterations: Infinity, easing: 'ease-in-out' })
      crs[c.id] = el
      el.addEventListener('click', function () {
        if (api.step() !== 2 || busy || el.getAttribute('data-sent')) return
        api.touch()
        if (c.id !== order[tapped]) { api.warn(L.order); K.glow(crs[order[tapped]], 2600); api.sfx('bad'); return }
        send(el, c)
      })
    })
    function send (el, c) {
      busy = true
      el.setAttribute('data-sent', '1')
      el.classList.remove('glow')
      el.style.pointerEvents = 'none'
      tapped++
      var n = tapped
      api.tween({ x: c.x, y: c.y }, { x: STORE.x + (n - 1) * 20, y: STORE.y + (n - 1) * 40 }, 600, function (p, k) { el.style.transform = 'translate(' + (p.x - c.x) + 'px,' + (p.y - c.y - Math.sin(k * Math.PI) * 120) + 'px) scale(' + (1 - k * 0.45) + ')' }, function () {
        api.sfx('ok')
        api.fx('gold-star', STORE.x + 40, STORE.y + 30, 140)
        var nb = api.at(sc, 'snum', STORE.x + (n - 1) * 20 + 50, STORE.y + (n - 1) * 40 - 20, 50, 50)
        nb.style.cssText += ';z-index:15;pointer-events:none;border-radius:50%;background:#fff;border:5px solid #13318A;color:#13318A;font:900 32px/40px Fredoka,Nunito,sans-serif;text-align:center'
        nb.textContent = String(n)
        nb.setAttribute('data-num', String(n))
        busy = false
        if (tapped >= 3) {
          busy = true
          api.later(function () {
            K.ask(api, { custom: { id: 'm04-left', prompt: '3 peti sudah diantar, 2 peti menunggu. Berapa semuanya?', choices: ['4', '5', '6'], answer: '5', scene: { groups: [{ key: 'pc2-peti', n: 3 }, { key: 'pc2-peti', n: 2 }] }, hint1: 'Tiga tambah dua. Hitung dari tiga.' }, done: function () {
              api.fx('confetti', 836, 380, 300)
              api.later(function () { K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { api.later(function () { busy = false; api.advance() }, 300) } }) }, 400)
            } })
          }, 600)
        } else { api.warn(L.placed); K.glow(crs[order[tapped]], 2600) }
      })
    }

    function firstFree () { for (var i = 0; i < mods.length; i++) if (!mods[i].used) return mods[i]; return null }
    var ctl = {
      onStep: function (n) {
        mods.forEach(function (q) { q.el.style.pointerEvents = n === 0 ? 'auto' : 'none'; q.el.classList.remove('glow') })
        gh.forEach(function (g) { g.style.visibility = n === 0 ? 'visible' : 'hidden' })
        if (n === 0) {
          mods.forEach(function (q) { if (!q.used) q.el.classList.add('glow') })
          if (!saved.asked) api.later(function () {
            K.ask(api, { custom: { id: 'm04-gap', prompt: 'Berapa petak celah airnya?', choices: ['2', '3', '4'], answer: '3', count: { key: 'w5-ponton', n: 3 }, hint1: 'Hitung kotak bayangan di celah. Ada tiga.' }, done: function () { api.warn(L.dragPiece); mods.forEach(function (q) { if (!q.used) K.glow(q.el, 3000) }) } })
          }, 700)
        }
        if (n === 1) {
          started = true
          truck.style.display = 'block'
          shade.style.display = 'block'
          placeTruck(START.x, START.y)
          u = 0
          goalG.style.display = 'block'
          K.glow(truck, 3200)
        }
        if (n === 2) {
          started = true
          truck.style.display = 'block'
          shade.style.display = 'block'
          placeTruck(DEST.x, DEST.y)
          goalG.style.display = 'none'
          card.style.display = 'block'
          K.land(api, card)
          CRATES.forEach(function (c) { crs[c.id].style.display = 'block'; crs[c.id].style.pointerEvents = 'auto' })
          K.glow(crs[order[0]], 3200)
        }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) { var q = firstFree(); if (q) hd.move([{ x: q.m.x + 70, y: q.m.y + 40 }, { x: CX0 + filled * CW + 70, y: CY + 40 }], 1400) }
        else if (n === 1) hd.move([{ x: cur.x - 30, y: cur.y - 150 }, { x: cur.x - 30, y: cur.y - 150 }], 2200)
        else { var c = CRATES.filter(function (z) { return z.id === order[tapped] })[0]; if (c) hd.move([{ x: c.x + 60, y: c.y + 30 }, { x: c.x + 60, y: c.y + 30 }], 1800) }
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          var q = firstFree()
          if (!q) return
          // the module that fits the gap that is left
          var left = 3 - filled
          var fit = mods.filter(function (z) { return !z.used && z.m.n <= left })[0] || q
          K.glow(fit.el, 3000)
          if (lvl >= 2) for (var k = filled; k < 3; k++) K.glow(gh[k], 3000)
          if (lvl >= 4 && !busy) put(fit)
        } else if (s === 1) {
          K.glow(truck, 3000)
          if (lvl >= 4 && !arrived) { placeTruck(DEST.x, DEST.y); arrive() }
        } else {
          K.glow(crs[order[tapped]], 3000)
          if (lvl >= 4 && !busy) { var cc = CRATES.filter(function (z) { return z.id === order[tapped] })[0]; send(crs[cc.id], cc) }
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { hold = false; cancelAnimationFrame(raf) }
    }
    saved.asked = false
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W05-M04', mod)
})(window)
