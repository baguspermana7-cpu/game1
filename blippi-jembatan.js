/* G32 Blippi -- W01-M04 "Jembatan untuk Semua" (PRD 12.1: Build & Use; length, fit, order; V = MOBILE CRANE), played INSIDE bg-w01-m04-jembatan.
 * The mobile crane (Blippi in the cab) stands on the right bank; its boom carries a HOOK on a rope. The bridge pieces lie in the scene (a long beam, two short beams, a post).
 * 1 PASANG: drag the HOOK onto a piece (it lifts it, the rope stretches), carry it to its ghost over the river and let go: the crane lowers it. LONG beam on the ghost = done.
 *   SHORT beam without a post drops into the water (splash, kind line); post first, then two short beams, also works. A miss sets the piece back, nothing is lost.
 * 2 JALAN: HOLD the dump truck (waiting on the left bank, loaded with a toy parcel): it drives across the bridge the child built; release = it stops.
 * 3 ANGKAT: hook the parcel on the truck and lower it onto its ghost. Questions: a vehicle question after the bridge, maths (SoalEngine) after the crossing and after the parcel. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var NS = 'http://www.w3.org/2000/svg'
  var DECK = 330
  var PIECE = {
    long: { key: 'pc-beam-long', w: 340, h: 131 },
    short: { key: 'pc-beam-short', w: 200, h: 84 },
    post: { key: 'pc-post', w: 66, h: 95 }
  }
  var PILE = {
    long: { x: 440, y: 545, w: 300, h: 115 },
    s0: { x: 800, y: 505, w: 180, h: 76 },
    s1: { x: 800, y: 600, w: 180, h: 76 },
    post: { x: 640, y: 590, w: 84, h: 120 }
  }
  var SOCK = {
    span: { x: 708, y: DECK - 6, w: 340, h: 131 },
    post: { x: 845, y: 408, w: 66, h: 95 },
    sl: { x: 700, y: DECK + 2, w: 200, h: 84 },
    sr: { x: 862, y: DECK + 2, w: 200, h: 84 }
  }
  var CR = { x: 1075, y: 100, w: 363, h: 364 }
  var TIP = { x: 1121, y: 162 }
  var HW = 100
  var HH = 102
  var TRUCK = { w: 250, h: 180, y: 392, x0: 330, x1: 1010 }
  var PARCEL = { w: 110, h: 96 }
  var DROP = { x: 1150, y: 560, w: 160, h: 138 }

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var placed = saved.placed || []          // 'span' | 'post' | 'sl' | 'sr'
    var delivered = false
    var busy = false
    var holding = false
    var dist = rs && rs.step >= 2 ? 1 : 0
    var raf = 0
    var socks = {}
    var hand = K.hand(api)
    var carrying = null                      // a pile item, or 'parcel'
    function save () { api.persist({ placed: placed }) }
    function done () { return placed.indexOf('span') >= 0 || (placed.indexOf('post') >= 0 && placed.indexOf('sl') >= 0 && placed.indexOf('sr') >= 0) }

    // ---- the crane (Blippi in the cab), flipped to face the river
    var crane = api.at(sc, '', CR.x, CR.y, CR.w, CR.h)
    crane.setAttribute('data-crane', '1')
    crane.style.zIndex = '5'
    crane.style.pointerEvents = 'none'
    var cart = api.art(crane, 'veh-mobile-crane', 0, 0, CR.w, CR.h, '')
    cart.setAttribute('data-veh', 'mobile-crane')
    if (cart.firstChild) cart.firstChild.style.transform = 'scaleX(-1)'
    K.driver(crane, { x: 0.27, y: 0.52, w: 0.155, h: 0.155 })

    // ---- the dump truck waits on the left bank, loaded with the parcel
    var truck = api.at(sc, '', 0, 0, TRUCK.w, TRUCK.h, 'button')
    truck.type = 'button'
    truck.setAttribute('data-truck', '1')
    truck.setAttribute('aria-label', 'Truk')
    truck.style.cssText += ';background:none;border:0;padding:0;z-index:8;cursor:default;transform-origin:50% 100%;touch-action:none'
    var tr = api.art(truck, 'veh-dump-truck', 0, 0, TRUCK.w, TRUCK.h, '')
    if (tr.firstChild) tr.firstChild.style.transform = 'scaleX(-1)'
    var shade = api.at(sc, 'shd', 0, 0, TRUCK.w - 30, 40)
    shade.style.zIndex = '7'
    var parcel = api.art(sc, 'prop-paket', 0, 0, PARCEL.w, PARCEL.h, 'jbox')
    parcel.setAttribute('data-box', '1')
    parcel.style.cssText += ';z-index:9;pointer-events:none'
    function truckAt (k) { return { x: TRUCK.x0 + (TRUCK.x1 - TRUCK.x0) * k, y: TRUCK.y - 22 * k, s: 1 - 0.1 * k } }
    function setTruck (x, y, s) {
      s = s || 1
      truck.style.transform = 'translate(' + (x - TRUCK.w / 2) + 'px,' + (y - TRUCK.h) + 'px) scale(' + s + ')'
      shade.style.transform = 'translate(' + (x - TRUCK.w / 2 + 16) + 'px,' + (y - 22) + 'px) scale(' + s + ')'
      if (!parcelGone) parcel.style.transform = 'translate(' + (x - 52 * s) + 'px,' + (y - TRUCK.h * s + 4) + 'px) scale(' + s + ')'
    }
    var parcelGone = false
    function placeTruck (k) { var t = truckAt(k); setTruck(t.x, t.y, t.s) }
    placeTruck(dist)
    function parcelHome () { var t = truckAt(1); return { x: t.x - 52 * t.s, y: t.y - TRUCK.h * t.s + 4 } }

    // ---- the pieces lie in the scene (sources for the hook)
    var pile = []
    function mkPile (id, kind) {
      var g = PILE[id]
      var el = api.at(sc, 'pilepiece', g.x, g.y, g.w, g.h)
      el.setAttribute('data-piece', kind)
      el.setAttribute('data-pile', id)
      el.style.cssText += ';z-index:4;pointer-events:none'
      api.art(el, PIECE[kind].key, 0, 0, g.w, g.h, '')
      if (el.animate && !api.reduced()) el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], { duration: 2100, iterations: Infinity, easing: 'ease-in-out' })
      var it = { id: id, kind: kind, el: el, used: false }
      pile.push(it)
      return it
    }
    var pLong = mkPile('long', 'long')
    var pS0 = mkPile('s0', 'short')
    var pS1 = mkPile('s1', 'short')
    var pPost = mkPile('post', 'post')
    function markUsed (it) { it.used = true; it.el.style.display = 'none' }
    if (placed.indexOf('span') >= 0) markUsed(pLong)
    if (placed.indexOf('post') >= 0) markUsed(pPost)
    if (placed.indexOf('sl') >= 0) markUsed(pS0)
    if (placed.indexOf('sr') >= 0) markUsed(pS1)
    function freeOf (kind) { var i; for (i = 0; i < pile.length; i++) if (pile[i].kind === kind && !pile[i].used) return pile[i]; return null }

    // ---- rope + hook (the crane's own picker)
    var svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('viewBox', '0 0 1672 941')
    svg.setAttribute('width', '1672')
    svg.setAttribute('height', '941')
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:11'
    svg.innerHTML = '<path id="rope" fill="none" stroke="#2f2f2f" stroke-width="6" stroke-linecap="round"/>'
    sc.appendChild(svg)
    var rope = svg.querySelector('#rope')
    var hook = api.at(sc, 'hookpiece', 0, 0, HW, HH)
    hook.setAttribute('data-hook', '1')
    hook.style.cssText += ';z-index:12;touch-action:none;cursor:grab'
    api.art(hook, 'prop-kait', 0, 0, HW, HH, '')
    var load = api.at(sc, 'carryfl', 0, 0, 10, 10)
    load.style.cssText += ';z-index:11;pointer-events:none;display:none;filter:drop-shadow(0 10px 8px rgba(20,30,60,.35))'
    var loadW = 0
    var loadH = 0
    var hp = { x: 0, y: 0 }
    function hookRest () { return { x: TIP.x - HW / 2 + 10, y: TIP.y + 100 } }
    function hb () { return { x: hp.x + HW / 2, y: hp.y + HH } }        // the hook's bottom point
    function beamCentre () { var b = hb(); return { x: b.x, y: b.y + loadH / 2 - 8 } }
    function setHook (x, y) {
      hp = { x: x, y: y }
      hook.style.transform = 'translate(' + x + 'px,' + y + 'px)'
      rope.setAttribute('d', 'M' + TIP.x + ',' + TIP.y + ' Q' + ((TIP.x + x + HW / 2) / 2 + 6) + ',' + ((TIP.y + y + 20) / 2 + 14) + ' ' + (x + HW / 2) + ',' + (y + 14))
      if (carrying) { var b = hb(); load.style.transform = 'translate(' + (b.x - loadW / 2) + 'px,' + (b.y - 14) + 'px)' }
    }
    function attach (it) {
      carrying = it
      var kind = it === 'parcel' ? null : it.kind
      loadW = it === 'parcel' ? PARCEL.w : PILE[it.id].w
      loadH = it === 'parcel' ? PARCEL.h : PILE[it.id].h
      load.innerHTML = ''
      load.style.width = loadW + 'px'
      load.style.height = loadH + 'px'
      load.style.display = 'block'
      api.art(load, it === 'parcel' ? 'prop-paket' : PIECE[kind].key, 0, 0, loadW, loadH, '')
      if (it === 'parcel') { parcelGone = true; parcel.style.display = 'none' } else it.el.style.display = 'none'
      setHook(hp.x, hp.y)
    }
    function release (back) {
      // set the carried thing down where it came from (a miss)
      var it = carrying
      carrying = null
      load.style.display = 'none'
      if (it === 'parcel') { parcelGone = false; parcel.style.display = 'block'; var h = parcelHome(); parcel.style.transform = 'translate(' + h.x + 'px,' + h.y + 'px)' } else if (it && back) it.el.style.display = 'block'
    }
    function home () {
      var r = hookRest()
      api.tween({ x: hp.x, y: hp.y }, r, 380, function (q) { setHook(q.x, q.y) })
    }
    setHook(hookRest().x, hookRest().y)

    // ---- ghosts: the finished piece, pulsing, where it will lie
    function buildSockets () {
      Object.keys(socks).forEach(function (k) { if (socks[k].parentNode) socks[k].parentNode.removeChild(socks[k]) })
      socks = {}
      function mk (id, type, tilt) {
        var s = SOCK[id]
        var c = api.at(sc, '', s.x, s.y, s.w, s.h)
        c.setAttribute('data-socket', id)
        c.style.cssText += ';pointer-events:none;z-index:3' + (tilt ? ';transform:rotate(9deg)' : '')
        K.ghost(api, c, PIECE[type].key, 0, 0, s.w, s.h, false, true)
        socks[id] = c
      }
      if (placed.indexOf('span') >= 0) return
      mk('span', 'long', true)
      if (placed.indexOf('post') < 0) mk('post', 'post', false)
      else {
        if (placed.indexOf('sl') < 0) mk('sl', 'short', true)
        if (placed.indexOf('sr') < 0) mk('sr', 'short', true)
        socks.span.style.opacity = '0.55'
      }
    }
    function installed (id, animate) {
      var s = SOCK[id]
      var type = id === 'span' ? 'long' : (id === 'post' ? 'post' : 'short')
      var p = api.art(sc, PIECE[type].key, s.x, s.y, s.w, s.h, 'built')
      p.setAttribute('data-built', id)
      p.style.zIndex = id === 'post' ? '3' : '5'
      p.style.pointerEvents = 'none'
      if (type !== 'post') p.style.transform = 'rotate(9deg)'
      if (animate) K.land(api, p)
    }
    placed.forEach(function (id) { installed(id, false) })

    function place (id) {
      placed = placed.concat([id])
      installed(id, true)
      api.sfx('bump')
      var s = SOCK[id]
      api.fx('dust', s.x + s.w / 2, s.y + s.h, 160)
      save()
      buildSockets()
      if (done()) {
        api.warn(L.built)
        api.fx('gold-star', 878, 330, 220)
        api.later(function () {
          K.ask(api, { custom: { id: 'm04-veh', prompt: 'Siapa yang mengangkat dengan kait?', choices: ['Sepeda', 'Derek', 'Perahu'], answer: 'Derek', hint1: 'Dia punya lengan panjang dan kait besar.' }, done: function () { api.advance() } })
        }, 900)
      } else api.warn(L.placed)
    }
    function splash (x, y) { api.fx('droplets', x, y, 190); api.sfx('bad') }
    // bc = the carried piece's centre when the hook lets go
    function dropPiece (it, bc) {
      var k = it.kind
      var inGap = bc.x > 690 && bc.x < 1070 && bc.y > 280 && bc.y < 540
      if (k === 'long') {
        if (K.within(bc, SOCK.span.x + SOCK.span.w / 2, SOCK.span.y + SOCK.span.h / 2, 150)) { markUsed(it); place('span'); return true }
        return false
      }
      if (k === 'post') {
        if (K.within(bc, SOCK.post.x + SOCK.post.w / 2, SOCK.post.y + SOCK.post.h / 2, 130)) { markUsed(it); place('post'); return true }
        if (inGap) { api.warn(L.postWhere); K.glow(socks.post, 2600) }
        return false
      }
      if (!inGap) return false
      if (placed.indexOf('post') < 0) {
        splash(bc.x, bc.y + 60)
        api.warn(L.short)
        if (socks.post) K.glow(socks.post, 3000)
        return false
      }
      var id = bc.x < 878 ? 'sl' : 'sr'
      if (placed.indexOf(id) >= 0) id = id === 'sl' ? 'sr' : 'sl'
      if (placed.indexOf(id) >= 0) return false
      markUsed(it)
      place(id)
      return true
    }

    // ---- the hook drag
    var drag = null
    var hookStart = null
    hook.addEventListener('pointerdown', function (ev) {
      var s = api.step()
      if (busy || drag || (s !== 0 && s !== 2) || (s === 2 && delivered)) return
      api.touch()
      var r = B.toRef(ev.clientX, ev.clientY)
      drag = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r }
      hookStart = { x: hp.x, y: hp.y }
      hook.classList.remove('glow')
      try { hook.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
    })
    hook.addEventListener('pointermove', function (ev) {
      if (!drag || ev.pointerId !== drag.id) return
      var r = B.toRef(ev.clientX, ev.clientY)
      drag.p = r
      drag.moved = Math.max(drag.moved, Math.abs(r.x - drag.x0) + Math.abs(r.y - drag.y0))
      setHook(hookStart.x + (r.x - drag.x0), hookStart.y + (r.y - drag.y0))
    })
    function nearest (list, pt, range) {
      var best = null
      var bd = range
      list.forEach(function (it) {
        var cx = it.cx
        var d = Math.hypot(pt.x - cx.x, pt.y - cx.y)
        if (d < bd) { bd = d; best = it.ref }
      })
      return best
    }
    function endDrag (ev, cancel) {
      if (!drag || ev.pointerId !== drag.id) return
      var d = drag
      drag = null
      if (cancel) { home(); if (carrying) release(true); return }
      var s = api.step()
      if (carrying) {
        // let go: the crane lowers it
        if (s === 0 && carrying !== 'parcel') {
          var it = carrying
          var bc = beamCentre()
          carrying = null
          load.style.display = 'none'
          if (dropPiece(it, bc)) { home(); return }
          it.el.style.display = 'block'
          if (!(it.kind === 'short' && placed.indexOf('post') < 0)) api.warn(L.dropMiss)
          home()
          return
        }
        if (s === 2 && carrying === 'parcel') {
          var pc = beamCentre()
          if (K.within(pc, DROP.x + DROP.w / 2, DROP.y + DROP.h / 2, 120)) { deliverParcel(pc); return }
          release(true)
          api.warn(L.parcelMiss)
          K.glow(dropG, 2600)
          home()
          return
        }
      }
      // empty hook: did it land on a piece?
      var b = hb()
      if (d.moved > 10) {
        if (s === 0) {
          var items = pile.filter(function (q) { return !q.used }).map(function (q) { var g = PILE[q.id]; return { ref: q, cx: { x: g.x + g.w / 2, y: g.y + g.h / 2 } } })
          var got = nearest(items, { x: b.x, y: b.y + 20 }, 130)
          if (got) {
            api.sfx('bump')
            api.fx('spark', b.x, b.y, 160)
            attach(got)
            api.warn(L.lifted)
            api.tween({ x: hp.x, y: hp.y }, { x: hp.x, y: hp.y - 70 }, 300, function (q) { setHook(q.x, q.y) })
            return
          }
          api.warn(L.dragHook)
          Object.keys(pile).forEach(function (k) { if (!pile[k].used) K.glow(pile[k].el, 2400) })
        } else if (s === 2) {
          var ph = parcelHome()
          if (K.within(b, ph.x + PARCEL.w / 2, ph.y + PARCEL.h / 2, 130)) {
            api.sfx('bump')
            api.fx('spark', b.x, b.y, 160)
            attach('parcel')
            api.warn(L.lifted)
            api.tween({ x: hp.x, y: hp.y }, { x: hp.x, y: hp.y - 60 }, 300, function (q) { setHook(q.x, q.y) })
            return
          }
          api.warn(L.dragHookParcel)
          K.glow(parcel, 2400)
        }
      } else api.warn(s === 0 ? L.dragHook : L.dragHookParcel)
      home()
    }
    hook.addEventListener('pointerup', function (ev) { endDrag(ev, false) })
    hook.addEventListener('pointercancel', function (ev) { endDrag(ev, true) })
    hook.addEventListener('lostpointercapture', function (ev) { if (drag && ev.pointerId === drag.id) endDrag(ev, true) })

    // ---- step 2: hold the truck to drive across (release stops it)
    function loop (t0) {
      var last = t0
      function f (t) {
        if (!holding || api.step() !== 1) return
        var dt = Math.min(50, t - last)
        last = t
        if (!api.paused()) {
          var ease = Math.min(1, 0.35 + dist * 6)
          var rem = Math.min(1, (1 - dist) * 5 + 0.2)
          dist = Math.min(1, dist + dt * 0.00034 * ease * Math.min(1, rem))
          if (Math.random() < 0.14) api.fx('dust', truckAt(dist).x - 90, TRUCK.y - 6, 70)
          placeTruck(dist)
          if (dist >= 1) {
            holding = false
            api.fx('dust', TRUCK.x1, TRUCK.y, 150)
            api.sfx('ok')
            save()
            api.later(function () { K.ask(api, { context: 'gate', grade: 1, done: function () { api.advance() } }) }, 500)
            return
          }
        }
        raf = requestAnimationFrame(f)
      }
      raf = requestAnimationFrame(f)
    }
    truck.addEventListener('pointerdown', function (ev) {
      if (api.step() === 0) { api.touch(); api.warn(L.wait); nudge(); return }
      if (api.step() !== 1 || holding) return
      api.touch()
      holding = true
      api.sfx('honk')
      try { truck.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      loop(performance.now())
    })
    function stop () { holding = false }
    truck.addEventListener('pointerup', stop)
    truck.addEventListener('pointercancel', stop)
    truck.addEventListener('lostpointercapture', stop)
    function nudge () {
      if (busy) return
      busy = true
      api.tween({ x: 0, y: 0 }, { x: 110, y: 0 }, 380, function (p) { setTruck(TRUCK.x0 + p.x, TRUCK.y) }, function () {
        api.tween({ x: 110, y: 0 }, { x: 0, y: 0 }, 380, function (p) { setTruck(TRUCK.x0 + p.x, TRUCK.y) }, function () { busy = false })
      })
    }

    // ---- step 3: the hook lifts the parcel off the truck and lowers it onto its ghost
    var dropG = api.at(sc, '', DROP.x, DROP.y, DROP.w, DROP.h)
    dropG.setAttribute('data-dropzone', '1')
    dropG.style.cssText += ';pointer-events:none;z-index:3;display:none'
    K.ghost(api, dropG, 'prop-paket', 0, 0, DROP.w, DROP.h, false, true)
    function deliverParcel (pc) {
      delivered = true
      api.sfx('collect')
      carrying = null
      load.style.display = 'none'
      var p = api.art(sc, 'prop-paket', DROP.x, DROP.y, DROP.w, DROP.h, 'jbox-done')
      p.setAttribute('data-delivered', '1')
      p.style.cssText += ';z-index:6;pointer-events:none'
      K.land(api, p)
      api.fx('dust', DROP.x + DROP.w / 2, DROP.y + DROP.h, 150)
      api.fx('confetti', DROP.x + DROP.w / 2, DROP.y, 300)
      dropG.style.display = 'none'
      home()
      api.later(function () { K.ask(api, { context: 'gate', grade: 1, done: function () { api.advance() } }) }, 900)
    }

    buildSockets()
    function nextPiece () { return placed.indexOf('post') < 0 && placed.indexOf('span') < 0 ? pLong : (placed.indexOf('post') < 0 ? pPost : freeOf('short')) }
    function nextSock () { return placed.indexOf('post') < 0 && placed.indexOf('span') < 0 ? 'span' : (placed.indexOf('post') < 0 ? 'post' : (placed.indexOf('sl') < 0 ? 'sl' : 'sr')) }

    var ctl = {
      onStep: function (n) {
        hook.style.pointerEvents = n === 0 || n === 2 ? 'auto' : 'none'
        Object.keys(socks).forEach(function (k) { if (socks[k]) socks[k].style.opacity = n === 0 ? (k === 'span' && placed.indexOf('post') >= 0 ? '.55' : '1') : '0' })
        truck.style.cursor = n === 1 ? 'grab' : 'default'
        dropG.style.display = n === 2 && !delivered ? 'block' : 'none'
        if (n === 0) { K.glow(hook, 3000) }
        if (n === 1) K.glow(truck, 3000)
        if (n === 2) { K.glow(hook, 3000); K.glow(parcel, 3000); K.glow(dropG, 3000) }
      },
      onTool: function () {},
      demo: function () { ctl.hint(1); ctl.hint(3) },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          var nx = nextPiece()
          if (!nx) return
          var sock = nextSock()
          var z = SOCK[sock]
          var g = PILE[nx.id]
          if (lvl === 1) { K.glow(hook, 3000); K.glow(nx.el, 3000); if (socks[sock]) K.glow(socks[sock], 3000) }
          else if (lvl === 2) { K.glow(nx.el, 3000); if (socks[sock]) K.glow(socks[sock], 3000) }
          else if (lvl === 3) hand.move([{ x: hp.x + 30, y: hp.y + 40 }, { x: g.x + g.w / 2 - 20, y: g.y + 10 }, { x: z.x + z.w / 2 - 30, y: z.y + z.h / 2 - 90 }], 1500)
          else if (!carrying) { markUsed(nx); place(sock) }
        } else if (s === 1) {
          K.glow(truck, 3000)
          if (lvl === 3) hand.move([{ x: TRUCK.x0 - 40, y: TRUCK.y - 120 }, { x: TRUCK.x0 - 40, y: TRUCK.y - 120 }], 1800)
          if (lvl >= 4) { dist = 1; placeTruck(1); api.advance() }
        } else {
          K.glow(parcel, 3000)
          K.glow(dropG, 3000)
          if (lvl === 3) { var h = parcelHome(); hand.move([{ x: hp.x + 30, y: hp.y + 40 }, { x: h.x + 20, y: h.y }, { x: DROP.x + 20, y: DROP.y - 30 }], 1500) }
          if (lvl >= 4 && !delivered) { if (carrying) release(true); deliverParcel(null) }
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { holding = false; cancelAnimationFrame(raf) }
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W01-M04', mod)
})(window)
