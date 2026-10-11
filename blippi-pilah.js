/* G32 Blippi -- W03-M01 "Muatan Campur-Campur" (PRD 11.4: Help & Deliver; P01/P07; "Pilah benda mainan berdasarkan material; tentukan urutan pickup"; V07 = RECYCLING TRUCK), played INSIDE bg-w03-m01-pilah.
 * Three sorting bays (LOGAM green, KERTAS blue, PLASTIK orange) are painted in the plate; six things lie on the road, the recycling truck (Blippi at the wheel) waits on the right.
 * 1 PILAH  (sort into bins): drag each thing into the bin of its material (wrong bin: it floats back, the kind line says what it is). Then "Berapa kertas?" (count).
 * 2 ANGKUT (collect, YOUR order): drag the truck to a bin; its arm lifts the bin and tips it into the hopper, the truck squashes it into a bale on its load row (a ghost bale per bin). Then a sum.
 * 3 ANTAR  (hold to drive): HOLD the truck and it rolls to the recycling shed (ghost truck at the door); release = brake. The bales unload into the shed. Then a SoalEngine question. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var TW = 340
  var TH = 254
  var TS = 0.85
  var PARK = { x: 1420, y: 700 }
  var START = { x: 520, y: 705 }
  var DEST = { x: 1380, y: 585 }
  var BW = 230
  var BH = 166
  var BINS = {
    logam: { x: 190, y: 325, key: 'w3-bin-logam', bale: 'w3-bale-logam', slot: 0, col: 'hijau' },
    kertas: { x: 575, y: 320, key: 'w3-bin-kertas', bale: 'w3-bale-kertas', slot: 1, col: 'biru' },
    plastik: { x: 885, y: 315, key: 'w3-bin-plastik', bale: 'w3-bale-plastik', slot: 2, col: 'oranye' }
  }
  var KINDS = ['logam', 'kertas', 'plastik']
  var IW = 150
  var IH = 130
  var ITEMS = [
    { id: 'remuk', kind: 'kertas', key: 'w3-kertas-remuk', name: 'Kertas remuk', x: 230, y: 580 },
    { id: 'kaleng', kind: 'logam', key: 'w3-kaleng', name: 'Kaleng', x: 395, y: 604 },
    { id: 'gelas', kind: 'plastik', key: 'w3-gelas', name: 'Gelas', x: 560, y: 580 },
    { id: 'koran', kind: 'kertas', key: 'w3-koran', name: 'Koran', x: 725, y: 604 },
    { id: 'botol', kind: 'plastik', key: 'w3-botol', name: 'Botol', x: 890, y: 580 },
    { id: 'kardus', kind: 'kertas', key: 'w3-kardus', name: 'Kardus', x: 1055, y: 604 }
  ]
  var COUNT = { logam: 1, kertas: 3, plastik: 2 }
  var SLOT = [{ fx: 0.04, fy: -0.36 }, { fx: 0.36, fy: -0.36 }, { fx: 0.68, fy: -0.36 }]
  var BLW = 96
  var BLH = 82

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var step0 = rs ? rs.step : 0
    var inBin = saved.inBin || {}                    // item id -> true once sorted
    var taken = saved.taken || {}                    // kind -> true once collected
    var busy = false
    var hd = null
    var arrived = false
    var cur = { x: PARK.x, y: PARK.y }
    function save () { api.persist({ inBin: inBin, taken: taken }) }
    function nSorted () { return Object.keys(inBin).length }
    function nTaken () { return Object.keys(taken).length }
    if (step0 >= 1) ITEMS.forEach(function (it) { inBin[it.id] = true })
    if (step0 >= 2) KINDS.forEach(function (k) { taken[k] = true })

    // ---- the three bins (in their bays) with a count bubble
    var bins = {}
    var badges = {}
    KINDS.forEach(function (k) {
      var b = BINS[k]
      var el = api.at(sc, 'bin', b.x, b.y, BW, BH)
      el.setAttribute('data-bin', k)
      el.style.cssText += ';z-index:4;pointer-events:none'
      api.art(el, b.key, 0, 0, BW, BH, '')
      var bd = api.at(el, 'cnt', BW - 52, -26, 62, 62)
      bd.style.cssText += ';border-radius:50%;background:#fff;border:5px solid #13318A;color:#13318A;font:900 36px/52px Fredoka,Nunito,sans-serif;text-align:center;display:none;z-index:2'
      bins[k] = el
      badges[k] = bd
    })
    function setBadge (k) {
      var n = ITEMS.filter(function (it) { return it.kind === k && inBin[it.id] }).length
      var gone = !!taken[k]
      badges[k].textContent = String(n)
      badges[k].style.display = n > 0 && !gone ? 'block' : 'none'
    }
    KINDS.forEach(setBadge)

    // ---- the recycling truck, Blippi at the wheel
    var truck = api.at(sc, '', 0, 0, TW, TH, 'button')
    truck.type = 'button'
    truck.setAttribute('data-truck', '1')
    truck.setAttribute('aria-label', 'Truk daur ulang')
    truck.style.cssText += ';background:none;border:0;padding:0;z-index:6;touch-action:none;transform-origin:50% 100%;cursor:default'
    var tart = api.art(truck, 'veh-recycling-truck', 0, 0, TW, TH, '')
    tart.setAttribute('data-veh', 'recycling-truck')
    K.driver(truck, { x: 0.71, y: 0.27, w: 0.25, h: 0.22 })
    var shade = api.at(sc, 'shd', 0, 0, 290, 40)
    shade.style.zIndex = '5'
    function placeTruck (x, y, sq) {
      cur = { x: x, y: y }
      truck.style.transform = 'translate(' + (x - TW / 2) + 'px,' + (y - TH) + 'px) scale(' + TS + ',' + (TS * (sq || 1)) + ')'
      shade.style.transform = 'translate(' + (x - 145 * TS) + 'px,' + (y - 24) + 'px) scale(' + TS + ')'
    }
    placeTruck(PARK.x, PARK.y)

    // ---- the load row on the truck: one ghost bale per bin, solid once collected (carries the count)
    var slots = {}
    KINDS.forEach(function (k) {
      var b = BINS[k]
      var s = SLOT[b.slot]
      var g = K.ghost(api, truck, b.bale, s.fx * TW, s.fy * TH, BLW, BLH)
      g.setAttribute('data-bale-ghost', k)
      g.style.zIndex = '2'
      var real = api.at(truck, '', s.fx * TW, s.fy * TH, BLW, BLH)
      real.setAttribute('data-bale', k)
      real.style.cssText += ';pointer-events:none;z-index:3;display:none'
      api.art(real, b.bale, 0, 0, BLW, BLH, '')
      var nb = api.at(real, '', BLW - 34, -14, 44, 44)
      nb.style.cssText += ';border-radius:50%;background:#fff;border:4px solid #13318A;color:#13318A;font:900 26px/36px Fredoka,Nunito,sans-serif;text-align:center'
      nb.textContent = String(COUNT[k])
      slots[k] = { ghost: g, real: real }
      if (taken[k]) { g.style.display = 'none'; real.style.display = 'block' }
    })
    function slotShown () { KINDS.forEach(function (k) { slots[k].ghost.style.visibility = (api.step() >= 1 ? 'visible' : 'hidden') }) }

    // ---- step 1: the six things on the road
    var itemEls = []
    ITEMS.forEach(function (it, i) {
      var c = api.at(sc, 'litter', it.x, it.y, IW, IH, 'button')
      c.type = 'button'
      c.setAttribute('data-item', it.id)
      c.setAttribute('data-kind', it.kind)
      c.setAttribute('aria-label', it.name)
      c.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none'
      api.art(c, it.key, 0, 0, IW, IH, '')
      if (c.animate && !api.reduced()) c.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], { duration: 1700 + i * 150, iterations: Infinity, easing: 'ease-in-out' })
      itemEls.push(c)
      if (inBin[it.id]) { c.style.display = 'none'; c.setAttribute('data-gone', '1') }
      var d = null
      c.addEventListener('pointerdown', function (ev) {
        if (api.step() !== 0 || busy || d || c.getAttribute('data-gone')) return
        api.touch()
        var r = B.toRef(ev.clientX, ev.clientY)
        d = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r }
        c.classList.remove('glow')
        c.style.zIndex = '30'
        try { c.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      })
      c.addEventListener('pointermove', function (ev) {
        if (!d || ev.pointerId !== d.id) return
        var r = B.toRef(ev.clientX, ev.clientY)
        d.p = r
        d.moved = Math.max(d.moved, Math.abs(r.x - d.x0) + Math.abs(r.y - d.y0))
        c.style.transform = 'translate(' + (r.x - d.x0) + 'px,' + (r.y - d.y0) + 'px) scale(1.12)'
      })
      function end (ev, cancel) {
        if (!d || ev.pointerId !== d.id) return
        var cu = d
        d = null
        c.style.zIndex = '7'
        var hit = null
        KINDS.forEach(function (k) { var b = BINS[k]; if (K.within({ x: cu.p.x, y: cu.p.y }, b.x + BW / 2, b.y + BH / 2, 150)) hit = k })
        if (!cancel && cu.moved > 10 && hit === it.kind) { sortIn(it, c); return }
        if (!cancel) {
          if (cu.moved > 10 && hit) { wrongBin(it, hit) } else api.warn(cu.moved > 10 ? L.noBin : L.dragItem)
        }
        api.tween({ x: cu.p.x - cu.x0, y: cu.p.y - cu.y0 }, { x: 0, y: 0 }, 280, function (t) { c.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)' }, function () { c.style.transform = '' })
      }
      c.addEventListener('pointerup', function (ev) { end(ev, false) })
      c.addEventListener('pointercancel', function (ev) { end(ev, true) })
      c.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
    })
    function wrongBin (it, hit) {
      var right = BINS[it.kind]
      api.warn(it.name + ' itu ' + it.kind + '. Masukkan ke kotak ' + right.col + ' ' + it.kind.toUpperCase() + '.')
      var bn = bins[hit]
      if (bn.animate && !api.reduced()) bn.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(0)' }], { duration: 300 })
      K.glow(bins[it.kind], 2800)
    }
    function sortIn (it, c) {
      inBin[it.id] = true
      c.setAttribute('data-gone', '1')
      c.style.display = 'none'
      var b = BINS[it.kind]
      api.sfx('bump')
      api.fx('dust', b.x + BW / 2, b.y + BH * 0.6, 120)
      if (bins[it.kind].animate && !api.reduced()) bins[it.kind].animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1,.92)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 320 })
      setBadge(it.kind)
      save()
      if (nSorted() >= ITEMS.length) {
        api.later(function () {
          K.ask(api, { custom: { id: 'm01-count', prompt: 'Berapa kertas di kotak biru?', choices: ['2', '3', '4'], answer: '3', count: { key: 'w3-kertas-remuk', n: 3 }, hint1: 'Hitung satu per satu: remuk, koran, kardus.' }, done: function () { api.warn(L.sorted); api.later(function () { api.advance() }, 500) } })
        }, 500)
      } else api.warn(L.more)
    }

    // ---- step 2: drive the truck to a bin, the arm tips it into the hopper, a bale appears on the load row
    function nextBinFor (p) {
      var best = null
      var bd = 1e9
      KINDS.forEach(function (k) {
        if (taken[k]) return
        var b = BINS[k]
        var dx = p.x - (b.x + BW / 2)
        var dy = p.y - (b.y + BH / 2)
        var dd = Math.sqrt(dx * dx + dy * dy)
        if (dd < 230 && dd < bd) { best = k; bd = dd }
      })
      return best
    }
    function collect (k) {
      if (busy || taken[k]) return
      busy = true
      var b = BINS[k]
      var tx = b.x + BW / 2
      var from = { x: cur.x, y: cur.y }
      api.sfx('honk')
      api.tween(from, { x: tx, y: 700 }, 700, function (p) { placeTruck(p.x, p.y) }, function () {
        // the arm: a copy of the full bin lifts, swings over the hopper and tips in
        var fly = api.at(sc, 'binfly', b.x, b.y, BW, BH)
        fly.style.cssText += ';z-index:9;pointer-events:none;transform-origin:50% 50%'
        api.art(fly, b.key, 0, 0, BW, BH, '')
        bins[k].style.visibility = 'hidden'
        badges[k].style.display = 'none'
        var hop = { x: tx - TW * TS * 0.18 - BW / 2, y: 700 - TH * TS - BH * 0.55 }
        api.tween({ x: b.x, y: b.y }, { x: hop.x, y: hop.y - 40 }, 420, function (p) { fly.style.transform = 'translate(' + (p.x - b.x) + 'px,' + (p.y - b.y) + 'px)' }, function () {
          api.tween({ x: hop.x, y: hop.y - 40 }, { x: hop.x, y: hop.y + 20 }, 380, function (p, kk) { fly.style.transform = 'translate(' + (p.x - b.x) + 'px,' + (p.y - b.y) + 'px) rotate(' + (kk * 105) + 'deg) scale(' + (1 - kk * 0.35) + ')' }, function () {
            if (fly.parentNode) fly.parentNode.removeChild(fly)
            bins[k].style.visibility = 'visible'
            taken[k] = true
            setBadge(k)
            api.sfx('bump')
            api.fx('dust', hop.x + BW / 2, hop.y + 20, 150)
            api.tween({ x: 0.82, y: 0 }, { x: 1, y: 0 }, 420, function (p) { placeTruck(cur.x, cur.y, p.x) })
            slots[k].ghost.style.display = 'none'
            slots[k].real.style.display = 'block'
            K.land(api, slots[k].real)
            save()
            busy = false
            if (nTaken() >= KINDS.length) {
              api.later(function () {
                K.ask(api, { custom: { id: 'm01-sum', prompt: '3 kertas, 2 plastik, 1 kaleng. Berapa semuanya?', choices: ['5', '6', '7'], answer: '6', count: { key: 'w3-kertas-remuk', n: 6 }, hint1: 'Hitung: 3 dan 2 jadi 5, tambah 1 lagi.' }, done: function () { api.warn(L.loaded); api.later(function () { goStart(function () { api.advance() }) }, 500) } })
              }, 600)
            } else api.warn(L.more2)
          })
        })
      })
    }
    function goStart (cb) { api.tween({ x: cur.x, y: cur.y }, START, 700, function (p) { placeTruck(p.x, p.y) }, function () { if (cb) cb() }) }

    // ---- step 3: hold to drive to the shed, bales roll in
    var goalG = null
    var u = 0
    var hold = false
    var raf = 0
    var lastT = 0
    function pathAt (v) { return { x: START.x + (DEST.x - START.x) * v, y: START.y + (DEST.y - START.y) * v - Math.sin(v * Math.PI) * 18 } }
    function drive (now) {
      if (!hold || arrived) return
      var dt = Math.min(50, now - lastT)
      lastT = now
      u = Math.min(1, u + dt / 3200)
      var p = pathAt(u)
      placeTruck(p.x, p.y + Math.sin(now / 70) * 1.2)
      if (u >= 1) { hold = false; arrive(); return }
      raf = requestAnimationFrame(drive)
    }
    function startHold () { hold = true; lastT = performance.now(); api.sfx('honk'); K.glow(truck, 0); raf = requestAnimationFrame(drive) }
    function arrive () {
      if (arrived) return
      arrived = true
      hold = false
      cancelAnimationFrame(raf)
      if (goalG) goalG.style.display = 'none'
      placeTruck(DEST.x, DEST.y)
      api.sfx('bump')
      api.fx('dust', DEST.x - 120, DEST.y, 160)
      unload()
    }
    function unload () {
      var n = 0
      KINDS.forEach(function (k, i) {
        var e = slots[k].real
        var r = e.getBoundingClientRect()
        var pt = api.toRef(r.left, r.top)
        e.style.display = 'none'
        var cl = api.at(sc, 'bale-fly', 0, 0, BLW, BLH)
        cl.style.cssText += ';z-index:9;pointer-events:none;transform-origin:50% 50%'
        cl.setAttribute('data-slid', k)
        api.art(cl, BINS[k].bale, 0, 0, BLW, BLH, '')
        api.later(function () {
          api.tween({ x: pt.x, y: pt.y }, { x: 1300 + i * 40, y: 300 }, 650, function (p, kk) { cl.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px) scale(' + (1 - kk * 0.4) + ')'; cl.style.opacity = String(1 - Math.max(0, kk - 0.7) * 3.3) }, function () {
            if (cl.parentNode) cl.parentNode.removeChild(cl)
            api.sfx('ok')
            api.fx('gold-star', 1300 + i * 40, 300, 140)
            n++
            if (n === KINDS.length) finish()
          })
        }, i * 280)
      })
    }
    function finish () {
      api.fx('confetti', 1380, 300, 340)
      save()
      api.later(function () {
        K.ask(api, { context: 'gate', grade: 1, done: function () { api.later(function () { api.advance() }, 300) } })
      }, 700)
    }
    truck.addEventListener('pointerdown', function (ev) {
      if (busy) return
      var s = api.step()
      api.touch()
      if (s === 0) { api.warn(L.sortFirst); itemEls.forEach(function (c) { if (!c.getAttribute('data-gone')) K.glow(c, 2400) }); return }
      if (s === 2) {
        if (arrived) return
        try { truck.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
        td = { id: ev.pointerId, drive: true }
        startHold()
        return
      }
      var p = B.toRef(ev.clientX, ev.clientY)
      td = { id: ev.pointerId, x0: p.x, y0: p.y, moved: 0, p: p, tx: cur.x, ty: cur.y }
      try { truck.setPointerCapture(ev.pointerId) } catch (e2) { /* synthetic */ }
    })
    var td = null
    truck.addEventListener('pointermove', function (ev) {
      if (!td || td.drive || ev.pointerId !== td.id) return
      var p = B.toRef(ev.clientX, ev.clientY)
      td.p = p
      td.moved = Math.max(td.moved, Math.abs(p.x - td.x0) + Math.abs(p.y - td.y0))
      if (td.moved > 10) placeTruck(Math.max(200, Math.min(1560, p.x)), Math.max(560, Math.min(730, p.y + 90)))
    })
    function tEnd (ev, cancel) {
      if (!td || ev.pointerId !== td.id) return
      var cu = td
      td = null
      if (cu.drive) { hold = false; cancelAnimationFrame(raf); if (!arrived && u < 1) api.warn(L.holdMore); return }
      var k = !cancel && cu.moved > 10 ? nextBinFor(cu.p) : null
      if (k) { collect(k); return }
      if (!cancel) { api.warn(cu.moved > 10 ? L.noBinTruck : L.dragTruck); KINDS.forEach(function (q) { if (!taken[q]) K.glow(bins[q], 2600) }) }
      api.tween({ x: cur.x, y: cur.y }, { x: cu.tx, y: cu.ty }, 320, function (p) { placeTruck(p.x, p.y) })
    }
    truck.addEventListener('pointerup', function (ev) { tEnd(ev, false) })
    truck.addEventListener('pointercancel', function (ev) { tEnd(ev, true) })
    truck.addEventListener('lostpointercapture', function (ev) { tEnd(ev, true) })

    function firstItem () { var i = 0; while (i < ITEMS.length - 1 && inBin[ITEMS[i].id]) i++; return i }
    function firstBin () { var k = null; KINDS.forEach(function (q) { if (!k && !taken[q]) k = q }); return k }

    var ctl = {
      onStep: function (n) {
        itemEls.forEach(function (c) { c.style.pointerEvents = n === 0 ? 'auto' : 'none'; c.classList.remove('glow') })
        slotShown()
        truck.style.cursor = n >= 1 ? 'grab' : 'default'
        if (n === 0) itemEls.forEach(function (c) { if (!c.getAttribute('data-gone')) c.classList.add('glow') })
        if (n === 1) { placeTruck(PARK.x, PARK.y); KINDS.forEach(function (k) { if (!taken[k]) K.glow(bins[k], 3200) }); K.glow(truck, 3200) }
        if (n === 2) {
          placeTruck(START.x, START.y)
          u = 0
          if (!goalG) {
            goalG = K.ghost(api, sc, 'veh-recycling-truck', DEST.x - TW * TS / 2, DEST.y - TH * TS, TW * TS, TH * TS, false, true)
            goalG.setAttribute('data-goal', '1')
          }
          K.glow(truck, 3200)
        }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) { var it = ITEMS[firstItem()]; var b = BINS[it.kind]; hd.move([{ x: it.x + 50, y: it.y + 30 }, { x: b.x + BW / 2 - 30, y: b.y + BH / 2 }], 1100) }
        else if (n === 1) { var k = firstBin(); if (k) hd.move([{ x: cur.x - 30, y: cur.y - 150 }, { x: BINS[k].x + BW / 2 - 30, y: BINS[k].y + BH / 2 }], 1100) }
        else hd.move([{ x: cur.x - 30, y: cur.y - 130 }, { x: cur.x - 30, y: cur.y - 130 }], 2200)
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          var i = firstItem()
          K.glow(itemEls[i], 3000)
          if (lvl >= 2) K.glow(bins[ITEMS[i].kind], 3000)
          if (lvl >= 4 && !inBin[ITEMS[i].id]) sortIn(ITEMS[i], itemEls[i])
        } else if (s === 1) {
          var k = firstBin()
          K.glow(truck, 3000)
          if (k) K.glow(bins[k], 3000)
          if (lvl >= 4 && k && !busy) collect(k)
        } else {
          K.glow(truck, 3000)
          if (lvl >= 4 && !arrived) { placeTruck(DEST.x, DEST.y); arrive() }
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { hold = false; cancelAnimationFrame(raf) }
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W03-M01', mod)
})(window)
