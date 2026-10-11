/* G32 Blippi -- W01-M01 "Jalan Pertamaku", played INSIDE bg-misi-jalan.
 * Geometry (reference px, authored against the plate): left bank start pad ~(430,478), river gap between the two stone abutments
 * x 672..1078 (y ~500..520), right bank goal ~(1330,455). Three bridge segments snap onto the gap, then the buggy drives over them.
 * Step 1: drag a plank from the pile on the left bank to a dashed slot (tap also works; a wrong drop floats back with a kind line).
 * Step 2: HOLD to drive: suspension bob, the planks dip as the buggy passes. Step 3: deliver the parcel to the flag on the right bank.
 * Plank art is the shared library's wooden trestle-bridge segment (../Dunia-Emosi/assets/db/lib/kereta-tile/bridge.webp). */
(function (w) {
  'use strict'
  var B = w.Blippi
  var K = w.BlippiKit
  var PLANK = '../Dunia-Emosi/assets/db/lib/kereta-tile/bridge.webp'
  var SLOTS = [{ x: 740, y: 503 }, { x: 872, y: 511 }, { x: 1004, y: 518 }]
  var PILE = { x: 250, y: 500 }
  var START = { x: 480, y: 462 }
  var PATH = [START, { x: 672, y: 494 }, { x: 1078, y: 516 }, { x: 1230, y: 500 }]
  var FLAG = { x: 1335, y: 470 }
  var SW = 166
  var SH = 166

  function lens () {
    var legs = []
    var tot = 0
    var i
    for (i = 0; i < PATH.length - 1; i++) { var d = Math.hypot(PATH[i + 1].x - PATH[i].x, PATH[i + 1].y - PATH[i].y); legs.push(d); tot += d }
    return { legs: legs, total: tot }
  }
  var LEN = lens()
  function at (dist) {
    var d = dist
    var i
    for (i = 0; i < LEN.legs.length; i++) {
      if (d <= LEN.legs[i]) { var k = d / LEN.legs[i]; return { x: PATH[i].x + (PATH[i + 1].x - PATH[i].x) * k, y: PATH[i].y + (PATH[i + 1].y - PATH[i].y) * k } }
      d -= LEN.legs[i]
    }
    return PATH[PATH.length - 1]
  }
  function plankImg (parent, cls) {
    var i = new Image()
    i.alt = ''
    i.draggable = false
    i.src = PLANK
    i.className = cls || 'plk'
    i.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;pointer-events:none;clip-path:inset(0 0 13% 0)'
    if (parent) parent.appendChild(i)
    return i
  }

  var mod = { mount: function (api) {
    var sc = api.scene
    var L = api.lines
    var placed = []
    var dist = 0
    var holding = false
    var raf = 0
    var delivered = false
    var rs = api.restore
    var saved = api.data() || {}
    var drag = null
    var hd = null
    if (rs) { placed = [0, 1, 2]; if (rs.step >= 2) dist = LEN.total }
    void saved

    var slotEls = SLOTS.map(function (s, i) {
      var e = api.at(sc, 'jslot', s.x - SW / 2, s.y - 78, SW, SH)
      e.setAttribute('data-slot', 'S' + i)
      e.style.pointerEvents = 'none'
      var ph = document.createElement('div')
      ph.className = 'jslot-ph'
      ph.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;opacity:.82;filter:brightness(1.35) saturate(.55) drop-shadow(0 0 3px #fff) drop-shadow(0 0 12px rgba(255,255,255,.95))'
      plankImg(ph)
      if (ph.animate && !api.reduced()) ph.animate([{ opacity: 0.7, transform: 'scale(1)' }, { opacity: 0.92, transform: 'scale(1.04)' }, { opacity: 0.7, transform: 'scale(1)' }], { duration: 1500, iterations: Infinity, easing: 'ease-in-out' })
      e.appendChild(ph)
      return e
    })
    var shadow = api.at(sc, 'shd', 0, 0, 220, 36)
    var pile = api.at(sc, 'jpile', PILE.x - 150, PILE.y - 120, 320, 230, 'button')
    pile.type = 'button'
    pile.setAttribute('data-plank-pile', '1')
    pile.setAttribute('aria-label', 'Tumpukan papan: seret ke jembatan')
    pile.style.cssText += ';background:none;border:0;padding:0;cursor:grab;touch-action:none;z-index:4'
    ;[[-22, 8], [20, 0], [0, -14]].forEach(function (o) { var h = document.createElement('div'); h.style.cssText = 'position:absolute;left:' + (70 + o[0] * 1.6) + 'px;top:' + (40 + o[1] * 1.6) + 'px;width:170px;height:170px'; plankImg(h); pile.appendChild(h) })
    var flag = api.art(sc, 'prop-bendera', FLAG.x - 35, FLAG.y - 110, 70, 110)
    void flag
    var park = api.art(sc, 'prop-jalur-taman', 1130, 540, 420, 120, 'park')
    park.style.opacity = '0'
    park.setAttribute('data-park', 'off')
    var buggy = api.art(sc, 'veh-buggy-misi', 0, 0, 290, 189, 'jbuggy')
    buggy.setAttribute('data-buggy', '1')
    buggy.firstChild.style.transform = 'scaleX(-1)'
    w.BlippiKit.driver(buggy, { x: 0.37, y: 0.3, w: 0.17, h: 0.26 })
    var box = api.art(sc, 'prop-paket', 0, 0, 80, 70, 'jbox')
    box.style.zIndex = '1'
    box.style.cursor = 'pointer'
    box.setAttribute('data-box', '1')
    var go = api.at(sc, 'obtn bbtn', 686, 664, 300, 66, 'button')
    go.type = 'button'
    go.textContent = 'TAHAN UNTUK JALAN'
    go.style.fontSize = '26px'
    go.style.touchAction = 'none'
    go.setAttribute('data-act', 'jalan-hold')
    go.style.opacity = '0'
    go.style.pointerEvents = 'none'
    go.style.zIndex = '6'

    function place (pt, t) {
      var bob = holding || t ? Math.sin((t || 0) * 0.03) * 3.2 : 0
      var rot = holding || t ? Math.sin((t || 0) * 0.021) * 1.6 : 0
      buggy.style.transform = 'translate(' + (pt.x - 145) + 'px,' + (pt.y - 160 + bob) + 'px) rotate(' + rot + 'deg)'
      box.style.transform = 'translate(' + (pt.x - 128) + 'px,' + (pt.y - 118 + bob) + 'px)'
      shadow.style.transform = 'translate(' + (pt.x - 110) + 'px,' + (pt.y - 26) + 'px)'
      var i
      for (i = 0; i < SLOTS.length; i++) {
        if (placed.indexOf(i) < 0) continue
        var dip = 8 * Math.max(0, 1 - Math.abs(pt.x - SLOTS[i].x) / 120)
        slotEls[i].style.transform = 'translateY(' + dip.toFixed(1) + 'px)'
      }
    }
    function nextFree () { var i; for (i = 0; i < 3; i++) if (placed.indexOf(i) < 0) return i; return -1 }
    function show (i, anim) {
      var e = slotEls[i]
      e.innerHTML = ''
      plankImg(e)
      e.setAttribute('data-board', 'on')
      if (anim && e.animate && !api.reduced()) e.animate([{ transform: 'translateY(-70px) scale(1.12)', opacity: 0 }, { transform: 'translateY(6px) scale(1)', opacity: 1, offset: 0.7 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.23,1,.32,1)' })
    }
    placed.forEach(function (i) { show(i, false) })

    function put (i) {
      if (api.step() !== 0 || placed.indexOf(i) >= 0) return
      placed = placed.concat([i])
      show(i, true)
      api.sfx('bump')
      api.fx('dust', SLOTS[i].x, SLOTS[i].y + 40, 170)
      api.fx('spark', SLOTS[i].x, SLOTS[i].y - 20, 130)
      api.warn(L.board)
      if (placed.length >= 3) {
        api.persist({ route: 'R' })
        api.later(function () {
          api.sfx('ok')
          SLOTS.forEach(function (s) { api.fx('gold-star', s.x, s.y - 30, 170) })
          K.ask(api, { custom: { id: 'm01-count', prompt: 'Ada berapa papan di jembatan?', count: { key: 'pc-beam-short', n: 3 }, choices: ['2', '3', '4'], answer: '3', hint1: 'Hitung papannya satu-satu.' }, done: function () { api.advance() } })
        }, 520)
      }
    }
    function toolOk () {
      if (api.step() !== 0) return false
      api.touch()
      return true
    }
    // drag from the pile; drop near a free slot snaps, anywhere else floats back
    pile.addEventListener('pointerdown', function (ev) {
      if (!toolOk() || nextFree() < 0) return
      var g = api.at(sc, 'jghost', 0, 0, 120, 120)
      g.style.zIndex = '20'
      g.style.pointerEvents = 'none'
      plankImg(g)
      var p = B.toRef(ev.clientX, ev.clientY)
      drag = { g: g, x0: p.x, y0: p.y, moved: 0, id: ev.pointerId }
      g.style.transform = 'translate(' + (p.x - 60) + 'px,' + (p.y - 60) + 'px) scale(1.08)'
      try { pile.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
    })
    pile.addEventListener('pointermove', function (ev) {
      if (!drag) return
      var p = B.toRef(ev.clientX, ev.clientY)
      drag.moved = Math.max(drag.moved, Math.hypot(p.x - drag.x0, p.y - drag.y0))
      drag.g.style.transform = 'translate(' + (p.x - 60) + 'px,' + (p.y - 60) + 'px) scale(1.08)'
      drag.p = p
    })
    function end (ev) {
      if (!drag) return
      var d = drag
      drag = null
      var p = d.p || B.toRef(ev.clientX, ev.clientY)
      var best = -1
      var bd = 120
      var i
      for (i = 0; i < 3; i++) { if (placed.indexOf(i) >= 0) continue; var dd = Math.hypot(p.x - SLOTS[i].x, p.y - SLOTS[i].y); if (dd < bd) { bd = dd; best = i } }
      var done = function () { if (d.g.parentNode) d.g.parentNode.removeChild(d.g) }
      if (d.moved < 10) { done(); best = nextFree() } // a plain tap places the next plank
      if (best >= 0) { done(); put(best) } else if (d.moved >= 10) {
        api.warn(L.retryNear)
        api.sfx('bad')
        api.tween({ x: p.x - 60, y: p.y - 60 }, { x: PILE.x - 60, y: PILE.y - 60 }, 320, function (q) { d.g.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px)' }, done)
      }
    }
    pile.addEventListener('pointerup', end)
    pile.addEventListener('pointercancel', function () { if (drag) { if (drag.g.parentNode) drag.g.parentNode.removeChild(drag.g); drag = null } })

    function loop (t0) {
      var last = t0
      function f (t) {
        if (!holding || api.step() !== 1) return
        var dt = Math.min(50, t - last)
        last = t
        if (!api.paused()) {
          dist += dt * 0.3
          if (Math.random() < 0.18) api.fx('dust', at(dist).x - 70, at(dist).y + 10, 70)
          if (dist >= LEN.total) {
            dist = LEN.total
            place(at(dist), t)
            holding = false
            api.persist({ route: 'R' })
            api.advance()
            return
          }
          place(at(dist), t)
        }
        raf = requestAnimationFrame(f)
      }
      raf = requestAnimationFrame(f)
    }
    function startHold (ev) {
      if (api.step() !== 1) return
      api.touch()
      holding = true
      api.sfx('honk')
      try { ev.target.setPointerCapture && ev.target.setPointerCapture(ev.pointerId) } catch (e) { /* ignore */ }
      loop(performance.now())
    }
    function stopHold () { holding = false; place(at(dist), 0) }
    ;[go, buggy].forEach(function (el) {
      el.style.touchAction = 'none'
      el.addEventListener('pointerdown', startHold)
      el.addEventListener('pointerup', stopHold)
      el.addEventListener('pointercancel', stopHold)
      el.addEventListener('lostpointercapture', stopHold)
    })

    // step 3: drag the parcel from the buggy onto the flag (a tap only nudges the demo; the action is the drag)
    var bd = null
    box.style.touchAction = 'none'
    function boxHome () { var pt = at(LEN.total); return { x: pt.x - 128, y: pt.y - 118 } }
    box.addEventListener('pointerdown', function (ev) {
      if (api.step() !== 2 || delivered || bd) return
      api.touch()
      var p = B.toRef(ev.clientX, ev.clientY)
      bd = { id: ev.pointerId, x0: p.x, y0: p.y, moved: 0 }
      box.style.zIndex = '20'
      box.classList.remove('glow')
      try { box.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
    })
    box.addEventListener('pointermove', function (ev) {
      if (!bd || ev.pointerId !== bd.id) return
      var p = B.toRef(ev.clientX, ev.clientY)
      bd.moved = Math.max(bd.moved, Math.hypot(p.x - bd.x0, p.y - bd.y0))
      bd.p = p
      box.style.transform = 'translate(' + (p.x - 40) + 'px,' + (p.y - 40) + 'px) scale(1.1)'
    })
    function boxEnd (ev, cancel) {
      if (!bd || ev.pointerId !== bd.id) return
      var d = bd
      bd = null
      var p = d.p
      if (!cancel && p && d.moved >= 10 && Math.hypot(p.x - FLAG.x, p.y - (FLAG.y - 40)) <= 160) { deliver(p); return }
      var from = p ? { x: p.x - 40, y: p.y - 40 } : boxHome()
      var home = boxHome()
      if (!cancel && d.moved < 10) { api.warn(L.dragParcel); box.classList.add('glow'); return }
      api.warn(L.parcelMiss)
      flag.classList.add('glow'); setTimeout(function () { flag.classList.remove('glow') }, 2600)
      api.tween(from, home, 320, function (q) { box.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px)' })
    }
    box.addEventListener('pointerup', function (ev) { boxEnd(ev, false) })
    box.addEventListener('pointercancel', function (ev) { boxEnd(ev, true) })
    box.addEventListener('lostpointercapture', function (ev) { boxEnd(ev, true) })
    function deliver (p0) {
      delivered = true
      api.sfx('ok')
      var from = p0 ? { x: p0.x - 40, y: p0.y - 40 } : boxHome()
      var to = { x: FLAG.x - 40, y: FLAG.y - 10 }
      api.tween(from, to, 380, function (p) { box.style.transform = 'translate(' + p.x + 'px,' + (p.y - Math.sin(Math.min(1, (p.x - from.x) / Math.max(1, to.x - from.x)) * Math.PI) * 50) + 'px)' }, function () {
        api.sfx('bump')
        api.fx('dust', FLAG.x, FLAG.y + 30, 150)
        api.fx('confetti', FLAG.x, FLAG.y - 40, 280)
        if (flag.animate && !api.reduced()) flag.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(0)' }], { duration: 900, easing: 'ease-out' })
        api.persist({ route: 'R' })
        api.later(function () {
          K.ask(api, { custom: { id: 'm01-flag', prompt: 'Bendera ini warna apa?', choices: ['Merah', 'Biru', 'Hijau'], answer: 'Biru', hint1: 'Lihat bendera di tiang.' }, done: function () {
            K.ask(api, { context: 'gate', grade: 1, done: function () { api.advance() } })
          } })
        }, 700)
      })
    }

    place(rs && rs.step >= 2 ? at(LEN.total) : START, 0)
    var ctl = {
      onStep: function (n) {
        go.style.opacity = n === 1 ? '1' : '0'
        go.style.pointerEvents = n === 1 ? 'auto' : 'none'
        pile.style.opacity = n === 0 ? '1' : '0'
        pile.style.pointerEvents = n === 0 ? 'auto' : 'none'
        slotEls.forEach(function (e) { var ph = e.querySelector('.jslot-ph'); if (ph) ph.style.display = n === 0 ? 'block' : 'none' })
        box.style.pointerEvents = n === 2 ? 'auto' : 'none'
        box.style.cursor = n === 2 ? 'grab' : 'default'
        if (n === 2) { box.classList.add('glow'); flag.classList.add('glow') }
      },
      onTool: function () {},
      demo: function (n) {
        this.hint(1)
        if (!K) return
        if (!hd) hd = K.hand(api)
        if (n === 0) hd.move([{ x: PILE.x - 30, y: PILE.y - 20 }, { x: SLOTS[0].x - 30, y: SLOTS[0].y - 50 }], 900)
        else if (n === 1) hd.move([{ x: 760, y: 660 }, { x: 760, y: 660 }], 1800)
        else { var bh = boxHome(); hd.move([{ x: bh.x, y: bh.y }, { x: FLAG.x - 60, y: FLAG.y - 60 }], 1000) }
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          pile.classList.add('glow'); setTimeout(function () { pile.classList.remove('glow') }, 2600)
          if (lvl >= 4 && nextFree() >= 0) put(nextFree())
        } else if (s === 1) {
          go.classList.add('glow'); setTimeout(function () { go.classList.remove('glow') }, 2600)
          if (lvl >= 4) { dist = LEN.total; place(at(dist), 0); api.persist({ route: 'R' }); api.advance() }
        } else {
          box.classList.add('glow')
          if (lvl >= 4) deliver(null)
        }
      },
      win: function () {
        park.style.opacity = '1'
        park.setAttribute('data-park', 'on')
        api.sfx('ok')
      },
      destroy: function () { holding = false; cancelAnimationFrame(raf) }
    }
    return ctl
  } }

  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W01-M01', mod)
})(window)
