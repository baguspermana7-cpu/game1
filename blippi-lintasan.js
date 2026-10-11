/* G32 Blippi -- W06-M03 "Lintasan Buatanku" (PRD 11.7: Build & Use; P08/P12; "Susun maksimal 8 modul, uji, lalu revisi"; replay "ubah ramp, tikungan, atau jalur alternatif"; V12 monster test truck), played INSIDE bg-w06-m03-lintasan.
 * A foam mat with a blue start pad (left) and an orange finish pad (right). Seven slots in a row, six of them need a module (ghost silhouette = which one), the fifth is a water gap. The modules lie in four piles: LURUS x4, BELOK, TANJAKAN, TANJAKAN TINGGI. The truck (Blippi at the wheel) waits on the start pad.
 * 1 RAKIT (build, drag): drag each module onto the ghost of its shape. Wrong shape floats back and says why. Then "4 lurus, 1 belok, 1 tanjakan: berapa modul?" (6, never more than 8).
 * 2 UJI   (test, tap): tap the truck; it drives the track, climbs the LOW ramp, jumps and falls into the water gap (splash, kind line). It rolls back to the pad.
 * 3 UBAH  (revise, drag + tap): the ramp slot now shows the TALL ghost; drag the tall ramp onto it (the low one pops out), tap the truck again: it clears the gap, drives to the finish pad. Then a maths-only SoalEngine question. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var TW = 300
  var TH = 240
  var PAD = { x: 235, y: 735, s: 0.7 }
  var FIN = { x: 1465, y: 735, s: 0.7 }
  var X0 = 330
  var CELL = 150
  var TRACK_Y = 430
  var PW = 150
  var PH = 115
  var SURF = TRACK_Y + 68                       // truck wheels run here
  var GAPI = 4
  var SLOTS = [{ i: 0, k: 'L' }, { i: 1, k: 'B' }, { i: 2, k: 'L' }, { i: 3, k: 'T' }, { i: 5, k: 'L' }, { i: 6, k: 'L' }]
  var KEY = { L: 'w6-trk-lurus', B: 'w6-trk-belok', T: 'w6-trk-tanjakan', H: 'w6-trk-tinggi' }
  var NAME = { L: 'lurus', B: 'belok', T: 'tanjakan', H: 'tanjakan tinggi' }
  var PIECES = [
    { id: 'l1', k: 'L', x: 330, y: 618 }, { id: 'l2', k: 'L', x: 344, y: 608 }, { id: 'l3', k: 'L', x: 358, y: 598 }, { id: 'l4', k: 'L', x: 372, y: 588 },
    { id: 'b1', k: 'B', x: 580, y: 612 }, { id: 't1', k: 'T', x: 770, y: 612 }, { id: 'h1', k: 'H', x: 960, y: 612 }
  ]
  var RISE = { T: 17, H: 36 }
  function cellX (i) { return X0 + i * CELL }

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var step0 = rs ? rs.step : 0
    var placed = saved.placed || {}               // slot cell index -> piece id
    var tall = !!saved.tall || step0 >= 3
    var busy = false
    var hd = null
    var cur = { x: PAD.x, y: PAD.y, s: PAD.s }
    function save () { api.persist({ placed: placed, tall: tall }) }
    var kindOf = {}
    PIECES.forEach(function (p) { kindOf[p.id] = p.k })
    if (step0 >= 1) { SLOTS.forEach(function (s, j) { if (!placed[s.i]) placed[s.i] = ['l1', 'b1', 'l2', 't1', 'l3', 'l4'][j] }) }
    if (step0 >= 3) placed[3] = 'h1'
    function slotKind (i) { return i === 3 && tall ? 'H' : (SLOTS.filter(function (s) { return s.i === i })[0] || {}).k }
    function nPlaced () { return Object.keys(placed).length }

    // ---- start / finish pads get a flag, the water gap gets a pit
    var f1 = api.art(sc, 'prop-bendera', 150, 640, 56, 90, '')
    f1.style.zIndex = '3'
    var f2 = api.art(sc, 'prop-bendera', 1520, 650, 56, 90, '')
    f2.style.zIndex = '3'; f2.setAttribute('data-finish', '1')
    var pit = api.at(sc, 'pit', cellX(GAPI) + 6, TRACK_Y + 62, CELL - 12, 90)
    pit.setAttribute('data-gap', '1')
    pit.style.cssText += ';z-index:2;pointer-events:none;border-radius:20px;background:linear-gradient(#6a4a2a,#3a2614);box-shadow:inset 0 8px 14px rgba(0,0,0,.5);overflow:hidden'
    var water = api.at(pit, '', 0, 36, CELL - 12, 60)
    water.style.cssText += ';background:linear-gradient(#5CC3F5,#2F8FD8);border-radius:50% 50% 0 0/22% 22% 0 0'
    if (water.animate && !api.reduced()) water.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], { duration: 1400, iterations: Infinity, easing: 'ease-in-out' })

    // ---- ghosts for the slots (the shape tells which module goes where)
    var ghosts = {}
    function drawGhost (i) {
      if (ghosts[i] && ghosts[i].parentNode) ghosts[i].parentNode.removeChild(ghosts[i])
      var k = slotKind(i)
      var g = K.ghost(api, sc, KEY[k], cellX(i), TRACK_Y, PW, PH, false, true)
      g.setAttribute('data-slot', String(i))
      g.setAttribute('data-slot-kind', k)
      if (placed[i]) g.style.display = 'none'
      ghosts[i] = g
    }
    SLOTS.forEach(function (s) { drawGhost(s.i) })

    // ---- the modules in four piles
    var pEls = {}
    var badge = api.at(sc, 'cnt', 480, 560, 54, 54)
    badge.style.cssText += ';z-index:20;pointer-events:none;border-radius:50%;background:#fff;border:5px solid #13318A;color:#13318A;font:900 30px/44px Fredoka,Nunito,sans-serif;text-align:center'
    function lLeft () { return ['l1', 'l2', 'l3', 'l4'].filter(function (id) { var t = false; Object.keys(placed).forEach(function (k) { if (placed[k] === id) t = true }); return !t }).length }
    function setBadge () { var n = lLeft(); badge.textContent = '×' + n; badge.style.display = n > 0 ? 'block' : 'none' }
    PIECES.forEach(function (p, idx) {
      var e = api.at(sc, 'trkpiece', p.x, p.y, PW, PH, 'button')
      e.type = 'button'
      e.setAttribute('data-piece', p.id)
      e.setAttribute('data-kind', p.k)
      e.setAttribute('aria-label', 'Modul ' + NAME[p.k])
      e.style.cssText += ';background:none;border:0;padding:0;z-index:' + (7 + idx) + ';cursor:grab;touch-action:none;pointer-events:none'
      api.art(e, KEY[p.k], 0, 0, PW, PH, '')
      pEls[p.id] = e
      var slotOf = null
      Object.keys(placed).forEach(function (k) { if (placed[k] === p.id) slotOf = +k })
      if (slotOf !== null) { e.style.left = cellX(slotOf) + 'px'; e.style.top = TRACK_Y + 'px'; e.setAttribute('data-placed', String(slotOf)) }
      else if (p.k === 'L' || p.k === 'B' || p.k === 'T') { /* normal pile */ }
      if (p.k === 'H' && !placed[3]) e.style.opacity = '0.95'
      var d = null
      e.addEventListener('pointerdown', function (ev) {
        if (busy || d || e.getAttribute('data-placed') !== null) return
        var s = api.step()
        if (s === 1) return
        if (s === 0 && p.k === 'H') { api.sfx('bad'); api.warn(L.tallLater); wobble(e); return }
        if (s === 2 && p.k !== 'H') { api.sfx('bad'); api.warn(L.pickTall); wobble(e); K.glow(pEls.h1, 2400); return }
        api.touch()
        var r = B.toRef(ev.clientX, ev.clientY)
        d = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r, ox: parseFloat(e.style.left), oy: parseFloat(e.style.top) }
        e.classList.remove('glow'); e.style.zIndex = '40'
        if (e._bob) e._bob.cancel()
        api.sfx('collect'); api.fx('spark', d.x0 || r.x, r.y, 70)
        try { e.setPointerCapture(ev.pointerId) } catch (er) { /* synthetic */ }
      })
      e.addEventListener('pointermove', function (ev) {
        if (!d || ev.pointerId !== d.id) return
        var r = B.toRef(ev.clientX, ev.clientY)
        d.p = r
        d.moved = Math.max(d.moved, Math.abs(r.x - d.x0) + Math.abs(r.y - d.y0))
        e.style.transform = 'translate(' + (r.x - d.x0) + 'px,' + (r.y - d.y0) + 'px) scale(1.06)'
      })
      function end (ev, cancel) {
        if (!d || ev.pointerId !== d.id) return
        var cu = d
        d = null
        e.style.zIndex = String(7 + idx)
        var si = -1
        var bd = 1e9
        SLOTS.forEach(function (s) {
          if (placed[s.i] && !(s.i === 3 && tall && kindOf[placed[3]] === 'T' && p.k === 'H')) return
          var q = Math.hypot(cu.p.x - (cellX(s.i) + PW / 2), cu.p.y - (TRACK_Y + PH / 2))
          if (q < 140 && q < bd) { si = s.i; bd = q }
        })
        if (!cancel && cu.moved > 10 && si >= 0) {
          if (slotKind(si) === p.k) { dropIn(p, e, si, cu); return }
          api.sfx('bad'); api.warn(p.k === 'H' ? L.tooTall : L.wrongShape.replace('%a', NAME[p.k]).replace('%b', NAME[slotKind(si)]))
          wobble(ghosts[si]); K.glow(ghosts[si], 2400)
        } else if (!cancel) { api.sfx('bad'); api.warn(cu.moved > 10 ? L.toSlot : L.dragPiece) }
        api.tween({ x: cu.p.x - cu.x0, y: cu.p.y - cu.y0 }, { x: 0, y: 0 }, 300, function (t) { e.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)' }, function () { e.style.transform = '' })
      }
      e.addEventListener('pointerup', function (ev) { end(ev, false) })
      e.addEventListener('pointercancel', function (ev) { end(ev, true) })
      e.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
    })
    function wobble (el) { if (el && el.animate && !api.reduced()) el.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(0)' }], { duration: 320 }) }
    setBadge()
    function dropIn (p, e, si, cu) {
      var old = placed[si]
      placed[si] = p.id
      e.setAttribute('data-placed', String(si))
      e.style.transform = ''
      e.style.pointerEvents = 'none'
      e.style.left = cellX(si) + 'px'; e.style.top = TRACK_Y + 'px'
      if (ghosts[si]) ghosts[si].style.display = 'none'
      api.sfx('bump'); api.fx('dust', cellX(si) + PW / 2, TRACK_Y + PH, 130)
      if (e.animate && !api.reduced()) e.animate([{ transform: 'translateY(-26px)' }, { transform: 'translateY(4px) scale(1.05,.94)', offset: 0.6 }, { transform: 'translateY(0)' }], { duration: 340, easing: 'cubic-bezier(.23,1,.32,1)' })
      if (old && pEls[old]) { // the low ramp pops out and away
        var o = pEls[old]
        o.removeAttribute('data-placed')
        o.style.pointerEvents = 'none'
        api.sfx('collect')
        if (o.animate && !api.reduced()) o.animate([{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: 'translateY(-90px) rotate(18deg)', opacity: 0 }], { duration: 480, fill: 'forwards' })
        else o.style.opacity = '0'
      }
      setBadge()
      save()
      if (api.step() === 0) {
        if (nPlaced() >= SLOTS.length) {
          api.sfx('ok'); api.fx('confetti', 780, 440, 320)
          api.warn(L.built)
          api.later(function () {
            K.ask(api, { custom: { id: 'm06c-count', prompt: '4 lurus, 1 belok, 1 tanjakan. Berapa modul semuanya?', choices: ['5', '6', '7'], answer: '6', scene: { groups: [{ key: 'w6-trk-lurus', n: 4 }, { key: 'w6-trk-belok', n: 1 }, { key: 'w6-trk-tanjakan', n: 1 }] }, hint1: 'Hitung: 4 dan 1 jadi 5, tambah 1 lagi.' }, done: function () { api.later(function () { api.advance() }, 400) } })
          }, 800)
        } else api.warn(L.more)
      } else if (api.step() === 2) {
        api.sfx('ok'); api.fx('gold-star', cellX(3) + PW / 2, TRACK_Y + 30, 200)
        api.warn(L.swapped)
        K.glow(truck, 3200)
      }
    }

    // ---- the truck (Blippi at the wheel) on the start pad
    var truck = api.at(sc, '', 0, 0, TW, TH, 'button')
    truck.type = 'button'
    truck.setAttribute('data-truck', '1')
    truck.setAttribute('aria-label', 'Truk uji monster')
    truck.style.cssText += ';background:none;border:0;padding:0;z-index:30;touch-action:manipulation;transform-origin:50% 100%;cursor:default'
    var tart = api.art(truck, 'veh-monster-truck', 0, 0, TW, TH, '')
    tart.setAttribute('data-veh', 'monster-truck')
    K.driver(truck, { x: 0.38, y: 0.14, w: 0.27, h: 0.2 })
    var shade = api.at(sc, 'shd', 0, 0, 280, 40)
    shade.style.zIndex = '5'
    function placeTruck (x, y, s, o) {
      o = o || {}
      cur = { x: x, y: y, s: s }
      truck.style.transform = 'translate(' + (x - TW / 2) + 'px,' + (y - TH) + 'px) scale(' + s + ',' + (s * (o.sq || 1)) + ')' + (o.tilt ? ' rotate(' + o.tilt + 'deg)' : '')
      shade.style.transform = 'translate(' + (x - 140 * s) + 'px,' + (y - 20 * s) + 'px) scale(' + s + ')'
      shade.style.opacity = o.air ? '0.3' : '1'
    }
    placeTruck(PAD.x, PAD.y, PAD.s)
    if (step0 >= 3 && rs) { /* resumed after the revision: truck stays at the pad */ }

    // ---- the run: drive the track, climb, jump; the low ramp drops into the water gap
    var ts = 0.46
    function run () {
      if (busy) return
      busy = true
      var high = !!placed[3] && kindOf[placed[3]] === 'H'
      var rise = high ? RISE.H : RISE.T
      var x3 = cellX(3)
      var x4 = cellX(4)
      var x5 = cellX(5)
      api.sfx('honk'); api.sfx('boost')
      api.fx('dust', cur.x, cur.y, 150)
      api.tween({ x: cur.x, y: cur.y }, { x: X0 + 30, y: SURF }, 700, function (p, k) { placeTruck(p.x, p.y - Math.sin(k * Math.PI) * 40, PAD.s + (ts - PAD.s) * k, { air: k > 0.2 && k < 0.9 }) }, function () {
        api.fx('dust', X0 + 30, SURF, 100)
        // along the flat pieces and the bend (a little hop on the bend)
        api.tween({ x: X0 + 30, y: SURF }, { x: x3 - 20, y: SURF }, 1500, function (p, k) {
          var onBend = p.x > cellX(1) && p.x < cellX(2)
          var y = p.y - (onBend ? Math.sin((p.x - cellX(1)) / CELL * Math.PI) * 20 : 0)
          placeTruck(p.x, y, ts, { tilt: Math.sin(k * 60) * 1.4 })
          if (Math.random() < 0.28) api.fx('dust', p.x - 40, y, 60)
        }, function () {
          // up the ramp
          api.sfx('boost')
          api.tween({ x: x3 - 20, y: SURF }, { x: x4 - 6, y: SURF - rise }, 520, function (p) { placeTruck(p.x, p.y, ts, { tilt: -Math.atan(rise / CELL) * 57 }) }, function () {
            if (high) {
              // flies over the water and lands on the next module
              api.tween({ x: x4 - 6, y: SURF - rise }, { x: x5 + 30, y: SURF }, 760, function (p, k) { placeTruck(p.x, p.y - Math.sin(k * Math.PI) * 70, ts, { tilt: -10 + k * 22, air: true }) }, function () {
                api.sfx('bump'); api.fx('dust', x5 + 30, SURF, 180); api.fx('gold-star', x5 + 30, SURF - 80, 200)
                api.tween({ x: x5 + 30, y: SURF }, { x: cellX(6) + 120, y: SURF }, 700, function (p) { placeTruck(p.x, p.y, ts, { tilt: Math.sin(p.x / 9) * 1.2 }); if (Math.random() < 0.3) api.fx('dust', p.x - 40, p.y, 60) }, function () {
                  api.tween({ x: cellX(6) + 120, y: SURF }, { x: FIN.x, y: FIN.y }, 800, function (p, k) { placeTruck(p.x, p.y - Math.sin(k * Math.PI) * 30, ts + (FIN.s - ts) * k) }, function () { win() })
                })
              })
            } else {
              // too short: it drops into the water
              api.tween({ x: x4 - 6, y: SURF - rise }, { x: x4 + 70, y: SURF + 70 }, 640, function (p, k) { placeTruck(p.x, p.y - Math.sin(k * Math.PI) * 26, ts, { tilt: -6 + k * 40, air: true }) }, function () {
                api.sfx('bad'); api.sfx('water')
                api.fx('droplets', x4 + 70, SURF + 50, 240); api.fx('dust', x4 + 70, SURF + 60, 160)
                api.warn(L.splash)
                if (pit.animate && !api.reduced()) pit.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(5px)' }, { transform: 'translateY(0)' }], { duration: 400 })
                api.later(function () {
                  api.tween({ x: x4 + 70, y: SURF + 70 }, { x: PAD.x, y: PAD.y }, 1000, function (p, k) { placeTruck(p.x, p.y - Math.sin(k * Math.PI) * 60, ts + (PAD.s - ts) * k, { air: k > 0.1 && k < 0.9 }) }, function () {
                    placeTruck(PAD.x, PAD.y, PAD.s)
                    busy = false
                    if (api.step() === 1) {
                      tall = true
                      drawGhost(3)
                      ghosts[3].style.display = 'block'
                      save()
                      api.later(function () { api.advance() }, 400)
                    }
                  })
                }, 700)
              })
            }
          })
        })
      })
    }
    function win () {
      api.sfx('ok'); api.sfx('win')
      api.fx('confetti', FIN.x, FIN.y - 160, 380); api.fx('gold-star', FIN.x, FIN.y - 140, 280)
      if (f2.animate && !api.reduced()) f2.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(0)' }], { duration: 900 })
      api.warn(L.finished)
      save()
      api.later(function () { K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { busy = false; api.later(function () { api.advance() }, 300) } }) }, 1000)
    }
    truck.addEventListener('click', function () {
      var s = api.step()
      api.touch()
      if (busy) return
      if (s === 0) { api.sfx('bad'); api.warn(L.buildFirst); wobble(truck); PIECES.forEach(function (p) { if (p.k !== 'H' && !pEls[p.id].getAttribute('data-placed')) K.glow(pEls[p.id], 1800) }); return }
      if (s === 2 && !(placed[3] && kindOf[placed[3]] === 'H')) { api.sfx('bad'); api.warn(L.swapFirst); K.glow(pEls.h1, 2600); K.glow(ghosts[3], 2600); return }
      run()
    })

    function nextPiece () { var r = null; SLOTS.forEach(function (s) { if (!r && !placed[s.i]) { var id = null; PIECES.forEach(function (p) { if (!id && p.k === s.k && !pEls[p.id].getAttribute('data-placed')) id = p.id }); if (id) r = { p: PIECES.filter(function (q) { return q.id === id })[0], slot: s.i } } }); return r }

    var ctl = {
      onStep: function (n) {
        PIECES.forEach(function (p) {
          var e = pEls[p.id]
          var on = (n === 0 && p.k !== 'H') || (n === 2 && p.k === 'H')
          e.style.pointerEvents = on && e.getAttribute('data-placed') === null ? 'auto' : 'none'
          e.classList.remove('glow')
          if (on && e.getAttribute('data-placed') === null && !e._bob && e.animate && !api.reduced()) e._bob = e.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 1800, iterations: Infinity, easing: 'ease-in-out' })
        })
        truck.style.cursor = n >= 1 ? 'pointer' : 'default'
        if (n === 0) PIECES.forEach(function (p) { if (p.k !== 'H' && p.id !== 'l2' && p.id !== 'l3' && p.id !== 'l4' && !pEls[p.id].getAttribute('data-placed')) pEls[p.id].classList.add('glow') })
        if (n === 1) { K.glow(truck, 3200); api.warn(L.tapTruck) }
        if (n === 2) { if (!tall) { tall = true; drawGhost(3) } ghosts[3].style.display = placed[3] && kindOf[placed[3]] === 'H' ? 'none' : 'block'; K.glow(pEls.h1, 3200); K.glow(ghosts[3], 3200) }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) { var np = nextPiece(); if (np) hd.move([{ x: np.p.x + 60, y: np.p.y + 50 }, { x: cellX(np.slot) + 70, y: TRACK_Y + 55 }], 1200) }
        else if (n === 1) hd.move([{ x: PAD.x - 20, y: PAD.y - 110 }, { x: PAD.x - 20, y: PAD.y - 110 }], 1800)
        else hd.move([{ x: pEls.h1.offsetLeft + 60, y: pEls.h1.offsetTop + 50 }, { x: cellX(3) + 70, y: TRACK_Y + 55 }], 1200)
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          var np = nextPiece()
          if (!np) return
          K.glow(pEls[np.p.id], 3000)
          if (lvl >= 2) K.glow(ghosts[np.slot], 3000)
          if (lvl >= 4) dropIn(np.p, pEls[np.p.id], np.slot)
        } else if (s === 1) {
          K.glow(truck, 3000)
          if (lvl >= 4 && !busy) run()
        } else {
          if (!(placed[3] && kindOf[placed[3]] === 'H')) {
            K.glow(pEls.h1, 3000); K.glow(ghosts[3], 3000)
            if (lvl >= 4) dropIn(PIECES.filter(function (q) { return q.id === 'h1' })[0], pEls.h1, 3)
          } else {
            K.glow(truck, 3000)
            if (lvl >= 4 && !busy) run()
          }
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { busy = false }
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W06-M03', mod)
})(window)
