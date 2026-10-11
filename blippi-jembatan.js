/* G32 Blippi -- W01-M04 "Jembatan untuk Semua" (PRD 12.1: Build & Use; length, fit, order), played INSIDE bg-w01-m04-jembatan.
 * Every step is a gesture ON a scene object:
 * 1 PASANG: drag beams / the post from the piece tray onto the river. LONG beam on the dashed span = done. SHORT beam without a post falls into the water (splash, kind line);
 *   post first, then two short beams, also works. A miss floats back, nothing is lost.
 * 2 JALAN: HOLD the dump truck (it stands on the right bank, loaded with a toy parcel) and it drives across the bridge the child built; release = it stops.
 * 3 ANTAR: drag the parcel off the truck onto the dashed spot by the playground. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var DECK = 330                       // y of the beam's top edge once laid (art is rotated level)
  var PIECE = {
    long: { key: 'pc-beam-long', w: 340, h: 131 },
    short: { key: 'pc-beam-short', w: 200, h: 84 },
    post: { key: 'pc-post', w: 66, h: 95 }
  }
  var SOCK = {
    span: { x: 708, y: DECK - 6, w: 340, h: 131 },
    post: { x: 845, y: 408, w: 66, h: 95 },
    sl: { x: 700, y: DECK + 2, w: 200, h: 84 },
    sr: { x: 862, y: DECK + 2, w: 200, h: 84 }
  }
  var TRUCK = { w: 250, h: 180, y: 392, x0: 1300, x1: 360 }
  var DROP = { x: 440, y: 200, w: 250, h: 110 }
  var CARDS = { x: 24, y: 452, w: 436, h: 226 }

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
    var cardEls = {}
    var socks = {}
    var hand = K.hand(api)
    function save () { api.persist({ placed: placed }) }
    function done () { return placed.indexOf('span') >= 0 || (placed.indexOf('post') >= 0 && placed.indexOf('sl') >= 0 && placed.indexOf('sr') >= 0) }

    // ---- the truck, loaded with the parcel, waits on the right bank
    var truck = api.at(sc, '', 0, 0, TRUCK.w, TRUCK.h, 'button')
    truck.type = 'button'
    truck.setAttribute('data-truck', '1')
    truck.setAttribute('aria-label', 'Truk')
    truck.style.cssText += ';background:none;border:0;padding:0;z-index:8;cursor:default;transform-origin:50% 100%;touch-action:none'
    api.art(truck, 'veh-dump-truck', 0, 0, TRUCK.w, TRUCK.h, '')
    var shade = api.at(sc, 'shd', 0, 0, TRUCK.w - 30, 40)
    shade.style.zIndex = '7'
    var parcel = api.art(sc, 'prop-paket', 0, 0, 78, 68, 'jbox')
    parcel.setAttribute('data-box', '1')
    parcel.style.cssText += ';z-index:9;touch-action:none;pointer-events:none'
    function setTruck (x, y, s) {
      s = s || 1
      truck.style.transform = 'translate(' + (x - TRUCK.w / 2) + 'px,' + (y - TRUCK.h) + 'px) scale(' + s + ')'
      shade.style.transform = 'translate(' + (x - TRUCK.w / 2 + 16) + 'px,' + (y - 22) + 'px) scale(' + s + ')'
      if (!parcelDrag) parcel.style.transform = 'translate(' + (x - 52 * s) + 'px,' + (y - TRUCK.h * s + 4) + 'px) scale(' + s + ')'
    }
    var parcelDrag = null
    function truckAt (k) { return { x: TRUCK.x0 + (TRUCK.x1 - TRUCK.x0) * k, y: TRUCK.y - 22 * k, s: 1 - 0.1 * k } }
    function placeTruck (k) { var t = truckAt(k); setTruck(t.x, t.y, t.s) }
    placeTruck(dist)
    if (rs && rs.step >= 3) delivered = false

    // ---- piece tray (sources only: drag from here)
    var panel = api.at(sc, 'panel', CARDS.x, CARDS.y, CARDS.w, CARDS.h)
    panel.setAttribute('data-pieces', '1')
    panel.style.zIndex = '6'
    var counts = function () { return { long: placed.indexOf('span') >= 0 ? 0 : 1, short: 2 - (placed.indexOf('sl') >= 0 ? 1 : 0) - (placed.indexOf('sr') >= 0 ? 1 : 0), post: placed.indexOf('post') >= 0 ? 0 : 1 } }
    function renderCards () {
      panel.innerHTML = ''
      cardEls = {}
      var list = [{ k: 'short', n: 'PENDEK' }, { k: 'long', n: 'PANJANG' }, { k: 'post', n: 'TIANG' }]
      var cw = 132
      var cnt = counts()
      list.forEach(function (it, i) {
        var c = api.at(panel, 'pcard', 12 + i * 144, 16, cw, CARDS.h - 40, 'button')
        c.type = 'button'
        c.setAttribute('data-piece', it.k)
        c.setAttribute('aria-label', 'Bagian ' + it.n.toLowerCase())
        c.style.cssText += ';background:rgba(255,255,255,.75);border:3px solid #E3C98A;border-radius:22px;cursor:grab;padding:0;touch-action:none;overflow:visible'
        var pw = it.k === 'short' ? 84 : (it.k === 'long' ? 114 : cw * 0.4)
        var ph = pw * PIECE[it.k].h / PIECE[it.k].w
        api.art(c, PIECE[it.k].key, (cw - pw) / 2, 22 + (it.k === 'post' ? 0 : 36), pw, ph, '')
        var lb = api.at(c, '', 0, CARDS.h - 94, cw, 40)
        lb.style.cssText += ';font:900 24px/40px Fredoka,Nunito,sans-serif;color:#13318A;text-align:center'
        lb.textContent = it.n
        if (cnt[it.k] <= 0 || api.step() !== 0) { c.style.opacity = api.step() === 0 ? '0.28' : '0.5'; c.style.pointerEvents = 'none' }
        cardEls[it.k] = c
        K.dragCard(api, c, {
          enabled: function () { return !busy && api.step() === 0 },
          make: function (parent) { return floater(parent, it.k) },
          home: function () { var r = c.getBoundingClientRect(); var p = api.toRef(r.left, r.top); return { x: p.x + 20, y: p.y + 30 } },
          tap: function () { api.warn(L.dragIt); K.glow(socks.span || socks.post, 2400) },
          drop: function (pt) { return dropPiece(it.k, pt) }
        })
      })
    }
    function floater (parent, k) {
      var f = api.at(parent, '', 0, 0, PIECE[k].w, PIECE[k].h)
      api.art(f, PIECE[k].key, 0, 0, PIECE[k].w, PIECE[k].h, '')
      f.style.filter = 'drop-shadow(0 12px 10px rgba(20,30,60,.35))'
      return f
    }

    // ---- sockets + built pieces
    function buildSockets () {
      Object.keys(socks).forEach(function (k) { if (socks[k].parentNode) socks[k].parentNode.removeChild(socks[k]) })
      socks = {}
      ;['span', 'post'].forEach(function (id) {
        if (placed.indexOf(id) >= 0) return
        if (id === 'post' && placed.indexOf('span') >= 0) return
        var s = SOCK[id]
        socks[id] = K.socket(api, sc, s.x, s.y, s.w, s.h, id)
        socks[id].style.opacity = api.step() === 0 ? '1' : '0'
      })
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
      if (socks[id] && socks[id].parentNode) { socks[id].parentNode.removeChild(socks[id]); delete socks[id] }
      installed(id, true)
      api.sfx('bump')
      var s = SOCK[id]
      api.fx('dust', s.x + s.w / 2, s.y + s.h, 160)
      save()
      renderCards()
      if (id === 'post' && socks.span) socks.span.style.opacity = '0.55'
      if (done()) {
        api.warn(L.built)
        api.fx('gold-star', 878, 330, 220)
        if (socks.span && socks.span.parentNode) socks.span.parentNode.removeChild(socks.span)
        api.later(function () { api.advance() }, 900)
      } else api.warn(L.placed)
    }
    function splash (x, y) {
      api.fx('droplets', x, y, 190)
      api.sfx('bad')
    }
    function dropPiece (k, pt) {
      var inGap = pt.x > 700 && pt.x < 1060 && pt.y > 290 && pt.y < 520
      if (k === 'long') {
        if (placed.indexOf('span') >= 0) return false
        if (K.within(pt, SOCK.span.x + SOCK.span.w / 2, SOCK.span.y + SOCK.span.h / 2, 150)) { place('span'); return true }
        return false
      }
      if (k === 'post') {
        if (placed.indexOf('post') >= 0) return false
        if (K.within(pt, SOCK.post.x + SOCK.post.w / 2, SOCK.post.y + SOCK.post.h / 2, 130)) { place('post'); return true }
        if (inGap) { api.warn(L.postWhere); K.glow(socks.post, 2600) }
        return false
      }
      // short beam
      if (!inGap) return false
      if (placed.indexOf('post') < 0) {
        // too short: it drops into the water, floats back
        splash(pt.x, pt.y + 60)
        api.warn(L.short)
        if (socks.post) K.glow(socks.post, 3000)
        return false
      }
      var id = pt.x < 878 ? 'sl' : 'sr'
      if (placed.indexOf(id) >= 0) id = id === 'sl' ? 'sr' : 'sl'
      if (placed.indexOf(id) >= 0) return false
      place(id)
      return true
    }

    // ---- step 2: hold the truck to drive across (release stops it)
    function loop (t0) {
      var last = t0
      function f (t) {
        if (!holding || api.step() !== 1) return
        var dt = Math.min(50, t - last)
        last = t
        if (!api.paused()) {
          var ease = Math.min(1, 0.35 + dist * 6)                       // eases in from a standstill
          var rem = Math.min(1, (1 - dist) * 5 + 0.2)                   // and eases out near the far bank
          dist = Math.min(1, dist + dt * 0.00034 * ease * Math.min(1, rem))
          if (Math.random() < 0.14) api.fx('dust', truckAt(dist).x + 90, TRUCK.y - 6, 70)
          placeTruck(dist)
          if (dist >= 1) { holding = false; api.fx('dust', TRUCK.x1, TRUCK.y, 150); api.sfx('ok'); api.persist({ placed: placed }); api.later(function () { api.advance() }, 400); return }
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
    // acceptance: before the bridge exists the truck creeps to the bank and stops
    function nudge () {
      if (busy) return
      busy = true
      api.tween({ x: 0, y: 0 }, { x: 150, y: 0 }, 380, function (p) { setTruck(TRUCK.x0 - p.x, TRUCK.y) }, function () {
        api.tween({ x: 150, y: 0 }, { x: 0, y: 0 }, 380, function (p) { setTruck(TRUCK.x0 - p.x, TRUCK.y) }, function () { busy = false })
      })
    }

    // ---- step 3: drag the parcel off the truck onto the dashed spot by the playground
    var dropZone = api.at(sc, 'jdrop', DROP.x, DROP.y, DROP.w, DROP.h)
    dropZone.setAttribute('data-dropzone', '1')
    dropZone.style.cssText += ';border:5px dashed #FF8A1F;border-radius:22px;background:rgba(255,196,64,.2);pointer-events:none;z-index:3;display:none'
    function parcelHome () { var t = truckAt(1); return { x: t.x - 52 * t.s, y: t.y - TRUCK.h * t.s + 4 } }
    parcel.addEventListener('pointerdown', function (ev) {
      if (api.step() !== 2 || delivered || parcelDrag) return
      api.touch()
      var p = B.toRef(ev.clientX, ev.clientY)
      parcelDrag = { id: ev.pointerId, x0: p.x, y0: p.y, moved: 0, p: p }
      parcel.classList.remove('glow')
      try { parcel.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
    })
    parcel.addEventListener('pointermove', function (ev) {
      if (!parcelDrag || ev.pointerId !== parcelDrag.id) return
      var p = B.toRef(ev.clientX, ev.clientY)
      parcelDrag.p = p
      parcelDrag.moved = Math.max(parcelDrag.moved, Math.abs(p.x - parcelDrag.x0) + Math.abs(p.y - parcelDrag.y0))
      parcel.style.transform = 'translate(' + (p.x - 39) + 'px,' + (p.y - 34) + 'px) scale(1.1)'
    })
    function pEnd (ev, cancel) {
      if (!parcelDrag || ev.pointerId !== parcelDrag.id) return
      var d = parcelDrag
      parcelDrag = null
      var p = d.p
      if (!cancel && d.moved > 10 && p.x > DROP.x - 30 && p.x < DROP.x + DROP.w + 30 && p.y > DROP.y - 30 && p.y < DROP.y + DROP.h + 40) { deliverParcel(p); return }
      if (!cancel) { api.warn(d.moved > 10 ? L.parcelMiss : L.dragParcel); K.glow(dropZone, 2600) }
      var h = parcelHome()
      api.tween({ x: p.x - 39, y: p.y - 34 }, h, 300, function (q) { parcel.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px)' })
    }
    parcel.addEventListener('pointerup', function (ev) { pEnd(ev, false) })
    parcel.addEventListener('pointercancel', function (ev) { pEnd(ev, true) })
    parcel.addEventListener('lostpointercapture', function (ev) { pEnd(ev, true) })
    function deliverParcel (p) {
      delivered = true
      api.sfx('collect')
      var from = p ? { x: p.x - 39, y: p.y - 34 } : parcelHome()
      var to = { x: DROP.x + DROP.w / 2 - 39, y: DROP.y + DROP.h / 2 - 30 }
      api.tween(from, to, 320, function (q) { parcel.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px)' }, function () {
        api.fx('dust', to.x + 40, to.y + 60, 150)
        api.fx('confetti', to.x + 40, to.y, 300)
        dropZone.style.display = 'none'
        api.later(function () { api.advance() }, 800)
      })
    }

    renderCards()
    buildSockets()
    if (api.step() === 2) { dropZone.style.display = 'block' }

    var ctl = {
      onStep: function (n) {
        renderCards()
        Object.keys(socks).forEach(function (k) { socks[k].style.opacity = n === 0 ? '1' : '0' })
        truck.style.cursor = n === 1 ? 'grab' : 'default'
        parcel.style.pointerEvents = n === 2 ? 'auto' : 'none'
        parcel.style.cursor = n === 2 ? 'grab' : 'default'
        dropZone.style.display = n === 2 ? 'block' : 'none'
        if (n === 1) { panel.style.display = 'none'; K.glow(truck, 3000) }
        if (n === 2) { parcel.classList.add('glow'); panel.style.display = 'none' }
      },
      onTool: function () {},
      demo: function (n) { ctl.hint(1); ctl.hint(3) },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          var next = !done() && placed.indexOf('post') < 0 && placed.indexOf('span') < 0 ? 'long' : null
          if (!next) next = placed.indexOf('post') < 0 ? 'post' : 'short'
          var sock = next === 'long' ? 'span' : (next === 'post' ? 'post' : (placed.indexOf('sl') < 0 ? 'sl' : 'sr'))
          var z = SOCK[sock]
          if (lvl === 1) { K.glow(cardEls[next], 3000); if (socks[sock] || socks.span) K.glow(socks[sock] || socks.span, 3000) }
          else if (lvl === 2) { var sk = socks[sock] || socks.span; if (sk) { sk.style.background = 'rgba(255,196,64,.5)'; setTimeout(function () { sk.style.background = 'rgba(255,196,64,.18)' }, 3000) } }
          else if (lvl === 3) { var cr = cardEls[next].getBoundingClientRect(); var cp = api.toRef(cr.left + cr.width / 2, cr.top + cr.height / 2); hand.move([{ x: cp.x - 30, y: cp.y - 30 }, { x: z.x + z.w / 2 - 40, y: z.y + z.h / 2 - 40 }], 900) }
          else place(sock)
        } else if (s === 1) {
          K.glow(truck, 3000)
          if (lvl === 3) hand.move([{ x: TRUCK.x0 - 40, y: TRUCK.y - 120 }, { x: TRUCK.x0 - 40, y: TRUCK.y - 120 }], 1800)
          if (lvl >= 4) { dist = 1; placeTruck(1); api.advance() }
        } else {
          K.glow(parcel, 3000)
          K.glow(dropZone, 3000)
          if (lvl === 3) { var h = parcelHome(); hand.move([{ x: h.x, y: h.y }, { x: DROP.x + 100, y: DROP.y + 20 }], 1000) }
          if (lvl >= 4 && !delivered) deliverParcel(null)
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
