/* G32 Blippi -- W05-M01 "Perjalanan Ferry" (PRD 11.6: Explore & Discover; P01/P05; "Muat peti dan pilih dermaga bertanda"; V11 = HARBOR FERRY), played INSIDE bg-w05-m01-ferry.
 * The ferry (Blippi in the cab) floats in front of the quay; three crates lie on the stones; two piers each carry a sign (how many crates they want), one has the FLAG (random per play).
 * 1 MUAT   (drag-and-place + count): "Berapa peti?" then drag each crate onto the deck (a ghost crate waits at each deck place; the hull dips under the load).
 * 2 ANTAR  (steer on water): drag the ferry along the water lane to the flag pier (ghost ferry there). The wrong pier says how many crates it wants; never sinks, never a dead end.
 * 3 TURUN  (tap): tap each crate, it hops onto the pier (ghost crate places) next to the 2 that already wait there. Then "2 + 3" shown as pictures, then a SoalEngine maths question. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var TW = 380
  var TH = 365
  var CW = 152
  var CH = 114
  var DW = 66
  var DH = 50
  var START = { x: 640, y: 592 }
  var LANE_Y = 592
  var DOCKS = {
    a: { x: 985, y: 580, ox: 0, oy: 0, sx: 500, sy: 262 },
    b: { x: 1465, y: 566, ox: 585, oy: 34, sx: 1080, sy: 300 }
  }
  var STOCK = [{ x: 566, y: 418 }, { x: 624, y: 443 }]
  var SLOTS = [{ x: 696, y: 474 }, { x: 752, y: 498 }, { x: 690, y: 424 }]
  var PW = 84
  var PH = 63
  var DECK = [{ x: 0.6, y: 0.55 }, { x: 0.74, y: 0.6 }, { x: 0.88, y: 0.65 }]
  var QUAY = [{ x: 90, y: 612 }, { x: 270, y: 624 }, { x: 450, y: 612 }]

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var step0 = api.restore ? api.restore.step : 0
    var target = saved.target || (Math.random() < 0.5 ? 'a' : 'b')
    var wrongN = saved.wrongN || (Math.random() < 0.5 ? 2 : 4)
    var other = target === 'a' ? 'b' : 'a'
    var loaded = {}                 // crate index -> true once on the deck
    var unloaded = {}               // crate index -> true once on the pier
    var asked = !!saved.asked
    var busy = false
    var hd = null
    var cur = { x: START.x, y: START.y }
    var facing = 1
    if (step0 >= 1) { loaded[0] = loaded[1] = loaded[2] = true }
    if (step0 >= 2) cur = { x: DOCKS[target].x, y: DOCKS[target].y }
    function save () { api.persist({ target: target, wrongN: wrongN, asked: asked }) }
    function nLoaded () { return Object.keys(loaded).length }
    function nUnloaded () { return Object.keys(unloaded).length }

    // ---- water overlay for ripples under the ferry
    var NS = 'http://www.w3.org/2000/svg'
    var svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('viewBox', '0 0 1672 941')
    svg.setAttribute('width', '1672')
    svg.setAttribute('height', '941')
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:4'
    sc.appendChild(svg)

    // ---- the two piers: a sign (crates wanted) each; the flag marks the target; 2 crates already wait on every pier
    var signs = {}
    ;['a', 'b'].forEach(function (k) {
      var d = DOCKS[k]
      var n = k === target ? 3 : wrongN
      var sg = api.at(sc, 'psign', d.sx, d.sy, 170, 150)
      sg.setAttribute('data-pier', k)
      sg.setAttribute('data-want', String(n))
      sg.style.cssText += ';z-index:5;pointer-events:none;background:#FFF8E6;border:6px solid #13318A;border-radius:22px;box-shadow:0 8px 0 rgba(19,49,138,.35)'
      var w2 = n > 3 ? 2 : 3
      for (var i = 0; i < n; i++) {
        var col = i % w2
        var row = Math.floor(i / w2)
        api.art(sg, 'pc2-peti', 8 + col * (w2 === 3 ? 50 : 70), 10 + row * 64, w2 === 3 ? 50 : 70, w2 === 3 ? 38 : 52, '')
      }
      if (n <= 3) { var c0 = api.at(sg, '', 6, 78, 148, 58); c0.style.cssText += ';font:900 44px/58px Fredoka,Nunito,sans-serif;color:#13318A;text-align:center'; c0.textContent = String(n) }
      else { var c1 = api.at(sg, '', 110, 10, 52, 52); c1.style.cssText += ';font:900 44px/52px Fredoka,Nunito,sans-serif;color:#13318A;text-align:center'; c1.textContent = String(n) }
      var pole = api.at(sc, 'ppole', d.sx + 76, d.sy + 144, 18, 90)
      pole.style.cssText += ';z-index:4;pointer-events:none;background:linear-gradient(90deg,#8a5a2b,#c98f50);border-radius:6px'
      if (k === target) {
        var fl = api.art(sc, 'prop-bendera', d.sx + 98, d.sy - 78, 86, 120, 'pflag')
        fl.setAttribute('data-flag', k)
        fl.style.zIndex = '6'
        fl.style.pointerEvents = 'none'
        if (fl.animate && !api.reduced()) fl.animate([{ transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(-4deg)' }], { duration: 1800, iterations: Infinity, easing: 'ease-in-out' })
      }
      signs[k] = sg
    })
    // the crates already waiting on each pier
    ;['a', 'b'].forEach(function (k) {
      STOCK.forEach(function (s) {
        var d = DOCKS[k]
        var e = api.at(sc, 'stock', s.x + d.ox, s.y + d.oy, PW, PH)
        e.setAttribute('data-stock', k)
        e.style.cssText += ';z-index:5;pointer-events:none'
        api.art(e, 'pc2-peti', 0, 0, PW, PH, '')
      })
    })

    // ---- the ghost ferry at the flag pier (shown from step 1)
    var goalG = K.ghost(api, sc, 'veh-harbor-ferry', DOCKS[target].x - TW / 2, DOCKS[target].y - TH, TW, TH, false, true)
    goalG.setAttribute('data-goal', target)
    goalG.style.zIndex = '4'
    goalG.style.display = 'none'

    // ---- the ferry: positioned wrapper > flip > bob > art + driver + deck crates
    var ferry = api.at(sc, '', 0, 0, TW, TH, 'button')
    ferry.type = 'button'
    ferry.setAttribute('data-ferry', '1')
    ferry.setAttribute('aria-label', 'Feri pelabuhan')
    ferry.style.cssText += ';background:none;border:0;padding:0;z-index:6;touch-action:none;cursor:default'
    var flip = api.at(ferry, '', 0, 0, TW, TH)
    flip.style.pointerEvents = 'none'
    var bob = api.at(flip, '', 0, 0, TW, TH)
    bob.style.pointerEvents = 'none'
    var fart = api.art(bob, 'veh-harbor-ferry', 0, 0, TW, TH, '')
    fart.setAttribute('data-veh', 'harbor-ferry')
    K.driver(bob, { x: 0.275, y: 0.285, w: 0.2, h: 0.115 })
    if (bob.animate && !api.reduced()) bob.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px) rotate(-.5deg)' }, { transform: 'translateY(0)' }], { duration: 2400, iterations: Infinity, easing: 'ease-in-out' })
    var shade = api.at(sc, 'wake', 0, 0, 340, 46)
    shade.style.cssText += ';z-index:5;pointer-events:none;border-radius:50%;background:radial-gradient(ellipse at center,rgba(255,255,255,.55),rgba(255,255,255,0) 70%)'
    function place (x, y, dip) {
      cur = { x: x, y: y }
      ferry.style.transform = 'translate(' + (x - TW / 2) + 'px,' + (y - TH + (dip || 0)) + 'px)'
      shade.style.transform = 'translate(' + (x - 170) + 'px,' + (y - 26) + 'px)'
    }
    function face (d) { facing = d; flip.style.transform = d < 0 ? 'scaleX(-1)' : 'none' }
    function deckPos (i) { return { x: DECK[i].x * TW - DW / 2, y: DECK[i].y * TH - DH } }
    place(cur.x, cur.y)
    if (step0 >= 2) face(target === 'b' ? -1 : -1)
    function laneY (x) { return x < 900 ? LANE_Y : LANE_Y - Math.min(30, (x - 900) * 0.06) }

    // ---- deck: a ghost crate per place + the real crate once loaded
    var ghosts = []
    var deck = []
    for (var di = 0; di < 3; di++) {
      var dp = deckPos(di)
      var gd = K.ghost(api, bob, 'pc2-peti', dp.x, dp.y, DW, DH)
      gd.setAttribute('data-deck-ghost', String(di))
      gd.style.zIndex = '3'
      ghosts.push(gd)
      var rc = api.at(bob, 'dcrate', dp.x, dp.y, DW, DH, 'button')
      rc.type = 'button'
      rc.setAttribute('data-deckcrate', String(di))
      rc.setAttribute('aria-label', 'Peti di kapal')
      rc.style.cssText += ';background:none;border:0;padding:0;z-index:4;display:none;touch-action:none;pointer-events:none'
      api.art(rc, 'pc2-peti', 0, 0, DW, DH, '')
      deck.push(rc)
      if (loaded[di]) { gd.style.display = 'none'; rc.style.display = 'block' }
    }

    // ---- the pier slots (ghost crate where each will land), shown in step 2
    var pslots = []
    SLOTS.forEach(function (s, i) {
      var d = DOCKS[target]
      var g = K.ghost(api, sc, 'pc2-peti', s.x + d.ox, s.y + d.oy, PW, PH, false, true)
      g.setAttribute('data-pier-ghost', String(i))
      g.style.zIndex = '5'
      g.style.display = 'none'
      pslots.push(g)
    })

    // ---- the three crates on the quay
    var crates = []
    QUAY.forEach(function (q, i) {
      var c = api.at(sc, 'quaycrate', q.x, q.y, CW, CH, 'button')
      c.type = 'button'
      c.setAttribute('data-crate', String(i))
      c.setAttribute('aria-label', 'Peti')
      c.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none'
      api.art(c, 'pc2-peti', 0, 0, CW, CH, '')
      if (c.animate && !api.reduced()) c.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], { duration: 1700 + i * 170, iterations: Infinity, easing: 'ease-in-out' })
      if (loaded[i]) { c.style.display = 'none'; c.setAttribute('data-gone', '1') }
      crates.push(c)
      var d = null
      c.addEventListener('pointerdown', function (ev) {
        if (api.step() !== 0 || busy || d || c.getAttribute('data-gone') || !asked) return
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
        c.style.transform = 'translate(' + (r.x - d.x0) + 'px,' + (r.y - d.y0) + 'px) scale(1.1)'
      })
      function end (ev, cancel) {
        if (!d || ev.pointerId !== d.id) return
        var cu = d
        d = null
        c.style.zIndex = '7'
        var onShip = Math.abs(cu.p.x - cur.x) < TW / 2 + 30 && cu.p.y > cur.y - TH - 20 && cu.p.y < cur.y + 30
        if (!cancel && cu.moved > 10 && onShip) { load(i, cu.p); return }
        if (!cancel) api.warn(cu.moved > 10 ? L.toShip : L.dragCrate)
        api.tween({ x: cu.p.x - cu.x0, y: cu.p.y - cu.y0 }, { x: 0, y: 0 }, 280, function (t) { c.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)' }, function () { c.style.transform = '' })
      }
      c.addEventListener('pointerup', function (ev) { end(ev, false) })
      c.addEventListener('pointercancel', function (ev) { end(ev, true) })
      c.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
    })
    function freeDeck () { for (var i = 0; i < 3; i++) if (!loaded[i]) return i; return -1 }

    function load (i, from) {
      if (loaded[i] || busy) return
      var slot = freeDeck()
      if (slot < 0) return
      busy = true
      var c = crates[i]
      var dp = deckPos(slot)
      var to = { x: cur.x - TW / 2 + dp.x + DW / 2 - CW / 2, y: cur.y - TH + dp.y + DH / 2 - CH / 2 }
      var q = QUAY[i]
      var s0 = from ? { x: from.x - CW / 2, y: from.y - CH / 2 } : { x: q.x, y: q.y }
      c.style.transition = 'none'
      c.style.left = '0'
      c.style.top = '0'
      c.style.transformOrigin = '50% 50%'
      api.tween(s0, to, 420, function (p, k) {
        c.style.transform = 'translate(' + (p.x - q.x) + 'px,' + (p.y - q.y - Math.sin(k * Math.PI) * 60) + 'px) scale(' + (1 - k * (1 - DW / CW)) + ')'
      }, function () {
        loaded[i] = true
        c.setAttribute('data-gone', '1')
        c.style.display = 'none'
        ghosts[slot].style.display = 'none'
        deck[slot].style.display = 'block'
        api.sfx('bump')
        api.fx('dust', cur.x - TW / 2 + dp.x + DW / 2, cur.y - TH + dp.y + DH, 110)
        K.ripple(svg, cur.x, cur.y - 14, 120)
        api.tween({ x: 0, y: 0 }, { x: 0, y: 7 }, 160, function (p) { place(cur.x, cur.y, p.y) }, function () { api.tween({ x: 0, y: 7 }, { x: 0, y: 0 }, 220, function (p) { place(cur.x, cur.y, p.y) }) })
        busy = false
        if (nLoaded() >= 3) {
          save()
          api.warn(L.loaded)
          api.later(function () { api.advance() }, 900)
        } else api.warn(L.more)
      })
    }

    // ---- step 1: drag the ferry along the water lane
    var drag = null
    var lastWake = 0
    ferry.addEventListener('pointerdown', function (ev) {
      var s = api.step()
      api.touch()
      if (busy) return
      if (s === 0) { api.warn(L.dragCrate); crates.forEach(function (c) { if (!c.getAttribute('data-gone')) K.glow(c, 2400) }); return }
      if (s !== 1) return
      var r = B.toRef(ev.clientX, ev.clientY)
      drag = { id: ev.pointerId, ox: cur.x - r.x, moved: 0, x0: r.x, from: cur.x }
      ferry.classList.remove('glow')
      try { ferry.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
    })
    ferry.addEventListener('pointermove', function (ev) {
      if (!drag || ev.pointerId !== drag.id) return
      var r = B.toRef(ev.clientX, ev.clientY)
      drag.moved = Math.max(drag.moved, Math.abs(r.x - drag.x0))
      var x = Math.max(300, Math.min(DOCKS.b.x + 20, r.x + drag.ox))
      if (x > cur.x + 1) face(-1); else if (x < cur.x - 1) face(1)
      place(x, laneY(x))
      var now = performance.now()
      if (now - lastWake > 170) { lastWake = now; K.ripple(svg, cur.x + 60 * facing, cur.y - 10, 70) }
    })
    function nearDock (k) { var d = DOCKS[k]; return Math.abs(cur.x - d.x) < 140 }
    function fend (ev, cancel) {
      if (!drag || ev.pointerId !== drag.id) return
      var cu = drag
      drag = null
      if (cancel || cu.moved < 8) return
      if (nearDock(target)) { dock(); return }
      if (nearDock(other)) {
        api.warn(L.wrongDock.replace('%n', String(wrongN)))
        K.glow(signs[other], 2600); K.glow(signs[target], 3200)
        var sh = signs[other]
        if (sh.animate && !api.reduced()) sh.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(0)' }], { duration: 300 })
        busy = true
        api.tween({ x: cur.x, y: cur.y }, { x: START.x, y: START.y }, 700, function (p) { place(p.x, laneY(p.x)) }, function () { busy = false; face(1) })
        return
      }
      api.warn(L.nearDock)
    }
    ferry.addEventListener('pointerup', function (ev) { fend(ev, false) })
    ferry.addEventListener('pointercancel', function (ev) { fend(ev, true) })
    ferry.addEventListener('lostpointercapture', function (ev) { fend(ev, true) })

    function dock () {
      busy = true
      var d = DOCKS[target]
      goalG.style.display = 'none'
      api.tween({ x: cur.x, y: cur.y }, { x: d.x, y: d.y }, 380, function (p) { place(p.x, p.y) }, function () {
        api.sfx('bump')
        K.ripple(svg, cur.x, cur.y - 14, 150)
        api.fx('gold-star', cur.x, cur.y - 120, 160)
        busy = false
        save()
        api.warn(L.docked)
        api.later(function () { api.advance() }, 700)
      })
    }

    // ---- step 2: tap each crate, it hops onto the pier
    deck.forEach(function (rc, di) {
      rc.addEventListener('click', function () {
        if (api.step() !== 2 || busy || unloaded[di]) return
        api.touch()
        unload(di)
      })
    })
    function freeSlot () { for (var i = 0; i < 3; i++) if (!pslots[i].getAttribute('data-used')) return i; return -1 }
    function unload (di) {
      var sl = freeSlot()
      if (sl < 0) return
      busy = true
      var rc = deck[di]
      var rr = rc.getBoundingClientRect()
      var p0 = B.toRef(rr.left, rr.top)
      var d = DOCKS[target]
      var to = { x: SLOTS[sl].x + d.ox, y: SLOTS[sl].y + d.oy }
      pslots[sl].setAttribute('data-used', '1')
      rc.style.display = 'none'
      unloaded[di] = true
      var fl = api.at(sc, 'hopcrate', 0, 0, DW, DH)
      fl.style.cssText += ';z-index:9;pointer-events:none;transform-origin:50% 50%'
      api.art(fl, 'pc2-peti', 0, 0, DW, DH, '')
      api.tween(p0, to, 520, function (p, k) {
        fl.style.transform = 'translate(' + p.x + 'px,' + (p.y - Math.sin(k * Math.PI) * 90) + 'px) scale(' + (1 + k * (PW / DW - 1)) + ')'
      }, function () {
        if (fl.parentNode) fl.parentNode.removeChild(fl)
        pslots[sl].style.display = 'none'
        var real = api.at(sc, 'landed', to.x, to.y, PW, PH)
        real.setAttribute('data-landed', String(sl))
        real.style.cssText += ';z-index:5;pointer-events:none'
        api.art(real, 'pc2-peti', 0, 0, PW, PH, '')
        K.land(api, real)
        api.sfx('bump')
        api.fx('dust', to.x + PW / 2, to.y + PH, 110)
        busy = false
        if (nUnloaded() >= 3) {
          api.warn('Semua peti sudah di dermaga!')
          api.later(function () {
            K.ask(api, { custom: { id: 'f01-sum', prompt: '2 peti di dermaga, 3 peti dari kapal. Berapa semuanya?', choices: ['4', '5', '6'], answer: '5', scene: { groups: [{ key: 'pc2-peti', n: 2 }, { key: 'pc2-peti', n: 3 }] }, hint1: 'Hitung: 2, lalu 3 lagi. Dua tambah tiga.' }, done: function () {
              api.later(function () { K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { api.later(function () { api.advance() }, 300) } }) }, 400)
            } })
          }, 700)
        }
      })
    }
    function firstDeck () { for (var i = 0; i < 3; i++) if (!unloaded[i]) return i; return 0 }

    function firstQuay () { for (var i = 0; i < 3; i++) if (!loaded[i]) return i; return 0 }
    function askCount () {
      K.ask(api, { custom: { id: 'f01-count', prompt: 'Berapa peti di dermaga?', choices: ['2', '3', '4'], answer: '3', count: { key: 'pc2-peti', n: 3 }, hint1: 'Hitung satu per satu. Pulau butuh tiga peti.' }, done: function () {
        asked = true
        save()
        api.warn(L.dragCrate)
        crates.forEach(function (c) { if (!c.getAttribute('data-gone')) K.glow(c, 3000) })
      } })
    }

    var ctl = {
      onStep: function (n) {
        crates.forEach(function (c) { c.style.pointerEvents = n === 0 ? 'auto' : 'none'; c.classList.remove('glow') })
        ferry.style.cursor = n === 1 ? 'grab' : 'default'
        ghosts.forEach(function (g, i) { g.style.visibility = (n === 0 && !loaded[i]) ? 'visible' : 'hidden' })
        deck.forEach(function (rc) { rc.style.pointerEvents = n === 2 ? 'auto' : 'none'; rc.style.cursor = n === 2 ? 'pointer' : 'default'; if (n === 2) { rc.classList.add('glow'); rc.style.zIndex = '5' } else rc.classList.remove('glow') })
        if (n === 0) {
          crates.forEach(function (c) { if (!c.getAttribute('data-gone')) c.classList.add('glow') })
          if (!asked) api.later(askCount, 700)
        }
        if (n === 1) {
          place(START.x, START.y)
          face(1)
          goalG.style.display = 'block'
          K.glow(ferry, 3200)
          K.glow(signs[target], 3200)
        }
        if (n === 2) {
          goalG.style.display = 'none'
          place(DOCKS[target].x, DOCKS[target].y)
          face(-1)
          pslots.forEach(function (g) { if (!g.getAttribute('data-used')) g.style.display = 'block' })
        }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0 && asked) { var q = QUAY[firstQuay()]; hd.move([{ x: q.x + 70, y: q.y + 50 }, { x: cur.x + 20, y: cur.y - TH * 0.4 }], 1100) }
        else if (n === 1) { var d = DOCKS[target]; hd.move([{ x: cur.x, y: cur.y - 160 }, { x: d.x - 40, y: d.y - 160 }], 1500) }
        else if (n === 2) { var rr = deck[firstDeck()].getBoundingClientRect(); var pt = B.toRef(rr.left + rr.width / 2, rr.top + rr.height / 2); hd.move([{ x: pt.x - 20, y: pt.y - 10 }, { x: pt.x - 20, y: pt.y - 10 }], 1800) }
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          if (!asked) return
          var i = firstQuay()
          K.glow(crates[i], 3000)
          if (lvl >= 2) K.glow(ferry, 3000)
          if (lvl >= 4 && !busy && !crates[i].getAttribute('data-gone')) load(i, null)
        } else if (s === 1) {
          K.glow(ferry, 3000)
          K.glow(signs[target], 3000)
          if (lvl >= 4 && !busy) dock()
        } else {
          var j = firstDeck()
          K.glow(deck[j], 3000)
          if (lvl >= 4 && !busy && !unloaded[j]) unload(j)
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () {}
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W05-M01', mod)
})(window)
