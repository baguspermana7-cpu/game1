/* G32 Blippi -- W06-M05 "Festival Penemuan" (PRD 11.7: Finale; P01/P07/P08/P11/P12; "Pilih 3 kendaraan pajangan, urutan parade, dan wahana untuk dicoba"; replay "parade berbeda memakai karya yang sudah dimiliki"), played INSIDE bg-w06-m05-festival.
 * Four vehicles of the child's garage stand on the plaza, each with Blippi in the cab; three display podiums wait with ghosts; the big stage glows at the top right.
 * 1 PAJANG (choose 3 of 4, drag): drag three vehicles onto the three podiums (any vehicle on any podium). Then "4 kendaraan, 3 dipajang. Berapa yang belum?".
 * 2 PARADE (order, tap): tap the three display vehicles in the order they should parade (numbers 1-2-3 pop up); then they honk and drive to the stage, one after the other, in YOUR order. Then "3 lewat, 2 menyusul: berapa semuanya?".
 * 3 COBA   (choose a ride, tap): three rides appear (ferris wheel, see-saw, slide); tap one and it runs with sparkle and fireworks; the festival opens. Then a maths-only SoalEngine question. Badge W06 + the finished Wonder Lab island. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var VEH = [
    { id: 'monster', key: 'veh-monster-truck', w: 190, h: 152, win: { x: 0.38, y: 0.14, w: 0.27, h: 0.2 }, name: 'Truk uji monster', x: 470, y: 560 },
    { id: 'daur', key: 'veh-recycling-truck', w: 190, h: 142, win: { x: 0.71, y: 0.27, w: 0.25, h: 0.22 }, name: 'Truk daur ulang', x: 670, y: 566 },
    { id: 'sapu', key: 'veh-street-sweeper', w: 190, h: 132, win: { x: 0.25, y: 0.2, w: 0.2, h: 0.3 }, name: 'Truk sapu', x: 870, y: 572 },
    { id: 'dump', key: 'veh-dump-truck', w: 190, h: 137, win: { x: 0.13, y: 0.2, w: 0.2, h: 0.22 }, name: 'Dump truck', x: 1070, y: 569 }
  ]
  var PADS = [{ x: 333, y: 500 }, { x: 1447, y: 470 }, { x: 1227, y: 715 }]
  var STAGE = [{ x: 1190, y: 430 }, { x: 1340, y: 440 }, { x: 1490, y: 430 }]
  var RIDES = [
    { id: 'bianglala', key: 'w6-bianglala', w: 200, h: 220, x: 560, y: 505, name: 'Bianglala' },
    { id: 'jungkat', key: 'prop-jungkat', w: 230, h: 137, x: 810, y: 560, name: 'Jungkat-jungkit' },
    { id: 'seluncur', key: 'pc-slide', w: 230, h: 145, x: 1060, y: 555, name: 'Seluncuran' }
  ]
  var PW = 1.12

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var step0 = rs ? rs.step : 0
    var shown = saved.shown || {}                 // vehicle id -> pad index
    var order = saved.order || []                 // vehicle ids in parade order
    var busy = false
    var hd = null
    function save () { api.persist({ shown: shown, order: order }) }
    if (step0 >= 1 && Object.keys(shown).length < 3) { shown.monster = 0; shown.daur = 1; shown.sapu = 2 }
    if (step0 >= 2 && order.length < 3) order = ['monster', 'daur', 'sapu']
    function nShown () { return Object.keys(shown).length }
    function padTaken (i) { var t = false; Object.keys(shown).forEach(function (k) { if (shown[k] === i) t = true }); return t }
    function vById (id) { return VEH.filter(function (v) { return v.id === id })[0] }

    // ---- ghost podium targets
    var padG = []
    PADS.forEach(function (p, i) {
      var g = K.ghost(api, sc, 'veh-buggy', p.x - 100, p.y - 130, 200, 160, false, true)
      g.setAttribute('data-pad', String(i))
      g.style.display = padTaken(i) || step0 >= 1 ? 'none' : 'block'
      padG.push(g)
    })

    // ---- the four vehicles (Blippi in every cab)
    var vEl = {}
    function podiumPos (v, i) { return { x: PADS[i].x - v.w * PW / 2, y: PADS[i].y + 14 - v.h * PW } }
    VEH.forEach(function (v, idx) {
      var e = api.at(sc, 'cardveh', v.x, v.y, v.w, v.h, 'button')
      e.type = 'button'
      e.setAttribute('data-veh-card', v.id)
      e.setAttribute('aria-label', v.name)
      e.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none;pointer-events:none;transform-origin:50% 100%'
      var a = api.art(e, v.key, 0, 0, v.w, v.h, '')
      a.setAttribute('data-veh', v.id)
      K.driver(e, v.win)
      if (e.animate && !api.reduced() && shown[v.id] == null) e._bob = e.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 1700 + idx * 160, iterations: Infinity, easing: 'ease-in-out' })
      vEl[v.id] = e
      if (shown[v.id] != null) placeOnPad(v, e, shown[v.id], false)
      var d = null
      e.addEventListener('pointerdown', function (ev) {
        if (api.step() !== 0 || busy || d || shown[v.id] != null) return
        api.touch()
        var r = B.toRef(ev.clientX, ev.clientY)
        d = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r }
        e.classList.remove('glow'); e.style.zIndex = '30'
        if (e._bob) e._bob.cancel()
        api.sfx('collect'); api.fx('spark', r.x, r.y, 80)
        try { e.setPointerCapture(ev.pointerId) } catch (er) { /* synthetic */ }
      })
      e.addEventListener('pointermove', function (ev) {
        if (!d || ev.pointerId !== d.id) return
        var r = B.toRef(ev.clientX, ev.clientY)
        d.p = r
        d.moved = Math.max(d.moved, Math.abs(r.x - d.x0) + Math.abs(r.y - d.y0))
        e.style.transform = 'translate(' + (r.x - d.x0) + 'px,' + (r.y - d.y0) + 'px) scale(1.08)'
      })
      function end (ev, cancel) {
        if (!d || ev.pointerId !== d.id) return
        var cu = d
        d = null
        e.style.zIndex = '7'
        var pi = -1
        var bd = 1e9
        PADS.forEach(function (p, j) { if (padTaken(j)) return; var q = Math.hypot(cu.p.x - p.x, cu.p.y - (p.y - 50)); if (q < 190 && q < bd) { pi = j; bd = q } })
        if (!cancel && cu.moved > 10 && pi >= 0) { placeOnPad(v, e, pi, true); shown[v.id] = pi; save(); checkShown(); return }
        if (!cancel) { api.sfx('bad'); api.warn(cu.moved > 10 ? L.toPad : L.dragVeh); padG.forEach(function (g, j) { if (!padTaken(j)) K.glow(g, 2600) }) }
        api.tween({ x: cu.p.x - cu.x0, y: cu.p.y - cu.y0 }, { x: 0, y: 0 }, 300, function (t) { e.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)' }, function () { e.style.transform = '' })
      }
      e.addEventListener('pointerup', function (ev) { end(ev, false) })
      e.addEventListener('pointercancel', function (ev) { end(ev, true) })
      e.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
      e.addEventListener('click', function () { tapShown(v) })
    })
    function placeOnPad (v, e, i, anim) {
      if (e._bob) e._bob.cancel()
      var p = podiumPos(v, i)
      e.setAttribute('data-podium', String(i))
      e.style.pointerEvents = 'none'
      e.style.left = p.x + 'px'; e.style.top = p.y + 'px'
      e.style.width = v.w * PW + 'px'; e.style.height = v.h * PW + 'px'
      e.style.transform = ''
      e.style.zIndex = '6'
      if (padG[i]) padG[i].style.display = 'none'
      if (anim) {
        api.sfx('bump'); api.fx('dust', PADS[i].x, PADS[i].y + 10, 150); api.fx('gold-star', PADS[i].x, PADS[i].y - 80, 160)
        if (e.animate && !api.reduced()) e.animate([{ transform: 'translateY(-30px) scale(1.05)' }, { transform: 'translateY(4px) scale(1.04,.94)', offset: 0.6 }, { transform: 'translateY(0) scale(1)' }], { duration: 380, easing: 'cubic-bezier(.23,1,.32,1)' })
      }
    }
    function checkShown () {
      if (nShown() >= 3) {
        api.sfx('ok'); api.fx('confetti', 840, 520, 340)
        api.warn(L.displayed)
        api.later(function () {
          K.ask(api, { custom: { id: 'm06e-left', prompt: '4 kendaraan. 3 sudah dipajang. Berapa yang belum?', choices: ['0', '1', '2'], answer: '1', scene: { groups: VEH.filter(function (v) { return shown[v.id] == null }).map(function (v) { return { key: v.key, n: 1 } }).concat(VEH.filter(function (v) { return shown[v.id] != null }).map(function (v) { return { key: v.key, n: 1, role: 'leave' } })) }, hint1: 'Hitung yang masih di jalan.' }, done: function () { api.later(function () { api.advance() }, 400) } })
        }, 900)
      } else api.warn(L.more)
    }

    // ---- step 2: tap them in the parade order
    var badges = {}
    function tapShown (v) {
      if (api.step() !== 1 || busy || shown[v.id] == null) return
      if (order.indexOf(v.id) >= 0) { api.sfx('bad'); api.warn(L.alreadyOrder); return }
      api.touch()
      order.push(v.id)
      var n = order.length
      var e = vEl[v.id]
      e.classList.remove('glow')
      api.sfx('collect'); api.sfx(n === 3 ? 'ok' : 'tap')
      var b = api.at(sc, 'ordnum', PADS[shown[v.id]].x - 34, PADS[shown[v.id]].y - v.h * PW - 40, 68, 68)
      b.setAttribute('data-order-badge', String(n))
      b.style.cssText += ';z-index:20;pointer-events:none;border-radius:50%;background:#fff;border:6px solid #13318A;color:#13318A;font:900 44px/56px Fredoka,Nunito,sans-serif;text-align:center'
      b.textContent = String(n)
      K.land(api, b)
      badges[v.id] = b
      api.fx('spark', PADS[shown[v.id]].x, PADS[shown[v.id]].y - 90, 120)
      save()
      if (n >= 3) { api.warn(L.paradeGo); api.later(runParade, 700) } else api.warn(n === 1 ? L.next1 : L.next2)
    }
    function runParade () {
      busy = true
      var done = 0
      order.forEach(function (id, i) {
        var v = vById(id)
        var e = vEl[id]
        api.later(function () {
          api.sfx('honk'); api.sfx('boost')
          var p0 = { x: parseFloat(e.style.left), y: parseFloat(e.style.top) }
          var tx = STAGE[i].x - v.w * 0.7 / 2
          var ty = STAGE[i].y + 20 - v.h * 0.7
          e.style.zIndex = '12'
          e.style.transformOrigin = '0 0'
          if (badges[id] && badges[id].parentNode) badges[id].parentNode.removeChild(badges[id])
          api.tween(p0, { x: tx, y: ty }, 1500, function (p, k) {
            var s = PW + (0.7 - PW) * k
            e.style.transform = 'translate(' + (p.x - p0.x) + 'px,' + (p.y - p0.y - Math.abs(Math.sin(k * 18)) * 8) + 'px) scale(' + (s / PW) + ')'
            if (Math.random() < 0.3) api.fx('dust', p.x + 40, p.y + v.h * s - 4, 70)
          }, function () {
            api.sfx('bump'); api.fx('gold-star', STAGE[i].x, STAGE[i].y - 40, 150)
            done++
            if (done >= 3) { api.sfx('win'); api.fx('confetti', 1340, 330, 380); api.warn(L.paraded); api.later(askParade, 900) }
          })
        }, i * 900)
      })
    }
    function askParade () {
      K.ask(api, { custom: { id: 'm06e-par', prompt: '3 kendaraan sudah ikut parade, 1 lagi menyusul. Berapa semuanya?', choices: ['3', '4', '5'], answer: '4', scene: { groups: VEH.filter(function (v) { return shown[v.id] != null }).map(function (v) { return { key: v.key, n: 1 } }).concat(VEH.filter(function (v) { return shown[v.id] == null }).map(function (v) { return { key: v.key, n: 1 } })) }, hint1: 'Hitung: 3 dan 1 jadi berapa?' }, done: function () { busy = false; api.later(function () { api.advance() }, 400) } })
    }

    // ---- step 3: choose a ride and try it
    var rEl = {}
    var tried = false
    RIDES.forEach(function (r, i) {
      var e = api.at(sc, 'ride', r.x, r.y, r.w, r.h, 'button')
      e.type = 'button'
      e.setAttribute('data-ride', r.id)
      e.setAttribute('aria-label', r.name)
      e.style.cssText += ';background:none;border:0;padding:0;z-index:8;cursor:pointer;touch-action:manipulation;display:none'
      var a = api.art(e, r.key, 0, 0, r.w, r.h, '')
      e._art = a
      rEl[r.id] = e
      if (e.animate && !api.reduced()) e._bob = e.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], { duration: 1700 + i * 200, iterations: Infinity, easing: 'ease-in-out' })
      e.addEventListener('click', function () { tryRide(r) })
    })
    function tryRide (r) {
      if (api.step() !== 2 || busy || tried) return
      api.touch()
      busy = true
      tried = true
      var e = rEl[r.id]
      if (e._bob) e._bob.cancel()
      RIDES.forEach(function (o) { if (o.id !== r.id) rEl[o.id].style.opacity = '.35' })
      api.sfx('collect'); api.sfx('boost')
      api.fx('spark', r.x + r.w / 2, r.y + r.h / 2, 220)
      var a = e._art
      if (a.animate && !api.reduced()) {
        if (r.id === 'bianglala') a.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 2400, iterations: 2, easing: 'ease-in-out' })
        else if (r.id === 'jungkat') a.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(7deg)' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(7deg)' }, { transform: 'rotate(0)' }], { duration: 2400 })
        else a.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-14px) scale(1.06)' }, { transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-14px) scale(1.06)' }, { transform: 'translateY(0) scale(1)' }], { duration: 2400 })
      }
      var k
      for (k = 0; k < 5; k++) { (function (j) { api.later(function () { api.sfx(j % 2 ? 'ok' : 'collect'); api.fx(j % 2 ? 'gold-star' : 'confetti', r.x + r.w / 2 + (j - 2) * 120, r.y - 40 - (j % 2) * 40, 220) }, 400 + j * 450) })(k) }
      api.later(function () { api.sfx('win'); api.warn(L.opened); api.fx('confetti', 1340, 300, 420); api.fx('gold-star', 1340, 330, 320) }, 2700)
      api.later(function () { K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { busy = false; api.later(function () { api.advance() }, 300) } }) }, 3400)
    }

    function firstVeh () { var r = null; VEH.forEach(function (v) { if (!r && shown[v.id] == null) r = v }); return r }
    function freePad () { var r = -1; PADS.forEach(function (p, j) { if (r < 0 && !padTaken(j)) r = j }); return r }
    var ctl = {
      onStep: function (n) {
        VEH.forEach(function (v) { vEl[v.id].style.pointerEvents = n === 0 && shown[v.id] == null ? 'auto' : (n === 1 && shown[v.id] != null ? 'auto' : 'none'); vEl[v.id].classList.remove('glow'); if (n === 0 && shown[v.id] == null) vEl[v.id].classList.add('glow') })
        if (n === 0) padG.forEach(function (g, i) { g.style.display = padTaken(i) ? 'none' : 'block' })
        if (n === 1) { padG.forEach(function (g) { g.style.display = 'none' }); VEH.forEach(function (v) { if (shown[v.id] != null) { K.glow(vEl[v.id], 3200) } else vEl[v.id].style.display = 'none' }); api.warn(L.tapOrder) }
        if (n === 2) { RIDES.forEach(function (r) { rEl[r.id].style.display = 'block'; K.glow(rEl[r.id], 3200) }); api.warn(L.pickRide) }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) { var v = firstVeh(); var pi = freePad(); if (v && pi >= 0) hd.move([{ x: v.x + 90, y: v.y + 70 }, { x: PADS[pi].x - 20, y: PADS[pi].y - 70 }], 1500) }
        else if (n === 1) { var nx = null; Object.keys(shown).forEach(function (k) { if (!nx && order.indexOf(k) < 0) nx = k }); if (nx) hd.move([{ x: PADS[shown[nx]].x, y: PADS[shown[nx]].y - 90 }, { x: PADS[shown[nx]].x, y: PADS[shown[nx]].y - 90 }], 1500) }
        else hd.move([{ x: RIDES[0].x + 90, y: RIDES[0].y + 100 }, { x: RIDES[0].x + 90, y: RIDES[0].y + 100 }], 1500)
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          var v = firstVeh()
          var pi = freePad()
          if (!v) return
          K.glow(vEl[v.id], 3000)
          if (lvl >= 2 && pi >= 0) K.glow(padG[pi], 3000)
          if (lvl >= 4 && pi >= 0) { placeOnPad(v, vEl[v.id], pi, true); shown[v.id] = pi; save(); checkShown() }
        } else if (s === 1) {
          var nx = null
          Object.keys(shown).forEach(function (k) { if (!nx && order.indexOf(k) < 0) nx = k })
          if (!nx) return
          K.glow(vEl[nx], 3000)
          if (lvl >= 4) tapShown(vById(nx))
        } else {
          RIDES.forEach(function (r) { K.glow(rEl[r.id], 3000) })
          if (lvl >= 4) tryRide(RIDES[0])
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { busy = false }
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W06-M05', mod)
})(window)
