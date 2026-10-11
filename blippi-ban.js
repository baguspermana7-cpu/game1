/* G32 Blippi -- W06-M01 "Ban untuk Petualangan" (PRD 11.7: Predict & Test; P09/P12; "Uji dua ban, pilih lintasan lumpur/kayu"; replay "bandingkan waktu tempuh visual tanpa ranking"; V12 = MONSTER TEST TRUCK), played INSIDE bg-w06-m01-ban.
 * The monster truck (Blippi at the wheel) waits on the test pad; two tyres lie beside it; two lanes climb to a flag: a MUD lane (left) and a WOOD lane (middle).
 * 1 PASANG (predict + fit): "Ban mana tidak mudah tergelincir di lumpur?" then drag a tyre onto the ghost wheel of the truck.
 * 2 UJI    (test): drag the truck to the foot of a lane; it climbs on its own. Smooth tyres spin in the mud and slide back (kind reason), patterned tyres climb; the wood lane takes both. Each finished climb leaves a row of dots = seconds (a picture, not a ranking). Swap tyres any time. Then "kayu 2 titik, lumpur 5 titik: mana lebih cepat?".
 * 3 LOMPAT (stunt, count): tap the truck 3 times on the pad; its soft suspension bounces, 1-2-3, the third is the big jump. Then a maths-only SoalEngine question. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var TW = 300
  var TH = 240
  var HOME = { x: 1240, y: 730 }
  var HS = 0.9
  var LANE = {
    mud: { start: { x: 480, y: 705 }, top: { x: 300, y: 440 }, flag: { x: 232, y: 330 }, chip: { x: 80, y: 250 }, secs: 5, ms: 4800 },
    wood: { start: { x: 800, y: 620 }, top: { x: 560, y: 450 }, flag: { x: 500, y: 335 }, chip: { x: 430, y: 250 }, secs: 2, ms: 2400 }
  }
  var TIRES = [{ id: 'jalan', key: 'modul-ban-jalan', x: 760, y: 580 }, { id: 'berpola', key: 'modul-ban-berpola', x: 940, y: 580 }]
  var TW2 = 150
  var TH2 = 155

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var step0 = rs ? rs.step : 0
    var tire = saved.tire || (step0 >= 1 ? 'berpola' : null)
    var done = saved.done || {}
    var busy = false
    var hd = null
    var cur = { x: HOME.x, y: HOME.y, s: HS }
    var bounces = 0
    if (step0 >= 2) { done.mud = true; done.wood = true }
    function save () { api.persist({ tire: tire, done: done }) }

    // ---- lanes: flags + (after a climb) the dots of how long it took
    var chips = {}
    ;['mud', 'wood'].forEach(function (k) {
      var l = LANE[k]
      var f = api.art(sc, 'prop-bendera', l.flag.x, l.flag.y, 56, 90, '')
      f.style.zIndex = '3'
      f.setAttribute('data-flag', k)
      var ch = api.at(sc, 'timechip', l.chip.x, l.chip.y, 190, 56)
      ch.setAttribute('data-time', k)
      ch.style.cssText += ';z-index:3;pointer-events:none;display:none;background:#fff;border:5px solid ' + (k === 'mud' ? '#8E5A28' : '#C98F50') + ';border-radius:28px;align-items:center;justify-content:center;gap:8px'
      var i
      for (i = 0; i < l.secs; i++) { var d = document.createElement('i'); d.style.cssText = 'width:20px;height:20px;border-radius:50%;background:' + (k === 'mud' ? '#8E5A28' : '#E8A33C') + ';display:block'; ch.appendChild(d) }
      chips[k] = ch
      if (done[k]) ch.style.display = 'flex'
    })

    // ---- the monster truck, Blippi at the wheel
    var truck = api.at(sc, '', 0, 0, TW, TH, 'button')
    truck.type = 'button'
    truck.setAttribute('data-truck', '1')
    truck.setAttribute('aria-label', 'Truk uji monster')
    truck.style.cssText += ';background:none;border:0;padding:0;z-index:6;touch-action:none;transform-origin:50% 100%;cursor:default'
    var tart = api.art(truck, 'veh-monster-truck', 0, 0, TW, TH, '')
    tart.setAttribute('data-veh', 'monster-truck')
    K.driver(truck, { x: 0.38, y: 0.14, w: 0.27, h: 0.2 })
    var shade = api.at(sc, 'shd', 0, 0, 280, 40)
    shade.style.zIndex = '5'
    function placeTruck (x, y, s, o) {
      o = o || {}
      cur = { x: x, y: y, s: s }
      truck.style.transform = 'translate(' + (x - TW / 2) + 'px,' + (y - TH - (o.lift || 0)) + 'px) scale(' + s + ',' + (s * (o.sq || 1)) + ')' + (o.tilt ? ' rotate(' + o.tilt + 'deg)' : '')
      shade.style.transform = 'translate(' + (x - 140 * s) + 'px,' + (y - 22 * s) + 'px) scale(' + s + ')'
    }
    placeTruck(HOME.x, HOME.y, HS)
    var badge = api.at(truck, '', 6, -50, 82, 84)
    badge.setAttribute('data-badge-tire', '1')
    badge.style.cssText += ';pointer-events:none;z-index:2;display:none'
    function setBadge () {
      badge.innerHTML = ''
      if (!tire) { badge.style.display = 'none'; return }
      api.art(badge, TIRES.filter(function (t) { return t.id === tire })[0].key, 0, 0, 82, 84, '')
      badge.style.display = 'block'
    }
    setBadge()
    var ghostWheel = tire ? null : K.ghost(api, truck, 'modul-ban-berpola', TW * 0.4, TH * 0.5, 120, 124, false, true)
    if (ghostWheel) ghostWheel.setAttribute('data-wheel-ghost', '1')

    // ---- the two tyres
    var tireEls = {}
    TIRES.forEach(function (t) {
      var el = api.at(sc, 'tire', t.x, t.y, TW2, TH2, 'button')
      el.type = 'button'
      el.setAttribute('data-tire', t.id)
      el.setAttribute('aria-label', t.id === 'jalan' ? 'Ban halus' : 'Ban bergerigi')
      el.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none;pointer-events:none'
      api.art(el, t.key, 0, 0, TW2, TH2, '')
      if (el.animate && !api.reduced()) el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 1900, iterations: Infinity, easing: 'ease-in-out' })
      tireEls[t.id] = el
      var d = null
      el.addEventListener('pointerdown', function (ev) {
        if (api.step() > 1 || busy || d) return
        if (!asked) { api.warn(L.askFirst); return }
        api.touch()
        var r = B.toRef(ev.clientX, ev.clientY)
        d = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r }
        el.classList.remove('glow'); el.style.zIndex = '30'
        try { el.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      })
      el.addEventListener('pointermove', function (ev) {
        if (!d || ev.pointerId !== d.id) return
        var r = B.toRef(ev.clientX, ev.clientY)
        d.p = r
        d.moved = Math.max(d.moved, Math.abs(r.x - d.x0) + Math.abs(r.y - d.y0))
        el.style.transform = 'translate(' + (r.x - d.x0) + 'px,' + (r.y - d.y0) + 'px) scale(1.05)'
      })
      function end (ev, cancel) {
        if (!d || ev.pointerId !== d.id) return
        var cu = d
        d = null
        el.style.zIndex = '7'
        var onTruck = cu.p.x > cur.x - TW * cur.s / 2 - 30 && cu.p.x < cur.x + TW * cur.s / 2 + 30 && cu.p.y > cur.y - TH * cur.s - 30 && cu.p.y < cur.y + 30
        if (!cancel && cu.moved > 10 && onTruck) {
          tire = t.id
          setBadge()
          if (ghostWheel) { ghostWheel.style.display = 'none' }
          api.sfx('bump')
          api.fx('spark', cur.x - 30, cur.y - 70, 180)
          el.style.transform = ''
          api.warn(t.id === 'jalan' ? L.smooth : L.tread)
          save()
          if (api.step() === 0) api.later(function () { api.advance() }, 800)
          return
        }
        if (!cancel) { api.warn(cu.moved > 10 ? L.toTruck : L.dragTire); K.glow(truck, 2600) }
        api.tween({ x: cu.p.x - cu.x0, y: cu.p.y - cu.y0 }, { x: 0, y: 0 }, 280, function (q) { el.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px)' }, function () { el.style.transform = '' })
      }
      el.addEventListener('pointerup', function (ev) { end(ev, false) })
      el.addEventListener('pointercancel', function (ev) { end(ev, true) })
      el.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
    })
    var asked = !!saved.asked || step0 >= 1
    function askTread () {
      K.ask(api, { custom: { id: 'm06-ban', prompt: 'Ban mana tidak mudah tergelincir di lumpur?', choices: ['Halus', 'Bergerigi'], choicePics: ['assets/blippi/modul-ban-jalan.webp', 'assets/blippi/modul-ban-berpola.webp'], answer: 'Bergerigi', hint1: 'Cari ban yang punya alur timbul.' }, done: function () { asked = true; api.warn(L.dragTire); TIRES.forEach(function (t) { K.glow(tireEls[t.id], 3000) }); K.glow(truck, 3000) } })
    }

    // ---- step 2: drag the truck to a lane, it climbs on its own
    function scaleAt (k) { return 0.62 - 0.27 * k }
    function run (k) {
      busy = true
      var l = LANE[k]
      var slips = k === 'mud' && tire !== 'berpola'
      api.sfx('honk')
      api.tween({ x: cur.x, y: cur.y }, l.start, 600, function (p) { placeTruck(p.x, p.y, cur.s + (scaleAt(0) - cur.s) * 0.5) }, function () {
        var stop = slips ? 0.42 : 1
        api.tween({ x: 0, y: 0 }, { x: stop, y: 0 }, slips ? l.ms * 0.45 : l.ms, function (q, kk) {
          var u = q.x
          var x = l.start.x + (l.top.x - l.start.x) * u
          var y = l.start.y + (l.top.y - l.start.y) * u
          placeTruck(x, y, scaleAt(u), { tilt: Math.sin(u * 40) * 1.6 })
          if (k === 'mud' && Math.random() < 0.3) api.fx('dust', x, y - 10, 70)
        }, function () {
          if (slips) {
            api.sfx('bad')
            var hx = l.start.x + (l.top.x - l.start.x) * stop
            var hy = l.start.y + (l.top.y - l.start.y) * stop
            api.fx('dust', hx, hy, 220); api.fx('droplets', hx, hy - 30, 170)
            api.warn(L.slip)
            api.tween({ x: stop, y: 0 }, { x: 0, y: 0 }, 900, function (q) {
              var x = l.start.x + (l.top.x - l.start.x) * q.x
              var y = l.start.y + (l.top.y - l.start.y) * q.x
              placeTruck(x, y, scaleAt(q.x))
            }, function () { toPad(function () { busy = false; K.glow(tireEls.berpola, 3200) }) })
            return
          }
          // arrived
          done[k] = true
          chips[k].style.display = 'flex'
          K.land(api, chips[k])
          api.sfx('ok')
          api.fx('confetti', l.flag.x + 30, l.flag.y, 260)
          api.warn(k === 'mud' ? L.mudDone : L.woodDone)
          save()
          api.later(function () {
            toPad(function () {
              busy = false
              if (done.mud && done.wood) {
                api.later(function () {
                  K.ask(api, { custom: { id: 'm06-time', prompt: 'Kayu 2 titik, lumpur 5 titik. Mana lebih cepat?', choices: ['Kayu', 'Lumpur'], answer: 'Kayu', hint1: 'Makin sedikit titik, makin sebentar.' }, done: function () { api.later(function () { api.advance() }, 300) } })
                }, 500)
              } else api.warn(done.mud ? L.tryWood : L.tryMud)
            })
          }, 900)
        })
      })
    }
    function toPad (cb) { api.tween({ x: cur.x, y: cur.y }, HOME, 800, function (p) { placeTruck(p.x, p.y, cur.s + (HS - cur.s) * 0.35) }, function () { placeTruck(HOME.x, HOME.y, HS); if (cb) cb() }) }

    // ---- truck gestures: drag onto a lane (step 2) / tap to bounce (step 3)
    var td = null
    truck.addEventListener('pointerdown', function (ev) {
      if (busy) return
      var s = api.step()
      api.touch()
      if (s === 0) { api.warn(L.fitFirst); TIRES.forEach(function (t) { K.glow(tireEls[t.id], 2400) }); return }
      if (s === 2) { td = { id: ev.pointerId, jump: true }; try { truck.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ } return }
      var p = B.toRef(ev.clientX, ev.clientY)
      td = { id: ev.pointerId, x0: p.x, y0: p.y, moved: 0, p: p }
      try { truck.setPointerCapture(ev.pointerId) } catch (e2) { /* synthetic */ }
    })
    truck.addEventListener('pointermove', function (ev) {
      if (!td || td.jump || ev.pointerId !== td.id) return
      var p = B.toRef(ev.clientX, ev.clientY)
      td.p = p
      td.moved = Math.max(td.moved, Math.abs(p.x - td.x0) + Math.abs(p.y - td.y0))
      if (td.moved > 10) placeTruck(p.x, p.y + 90, 0.62)
    })
    function tEnd (ev, cancel) {
      if (!td || ev.pointerId !== td.id) return
      var cu = td
      td = null
      if (cu.jump) { if (!cancel) bounce(); return }
      var hit = null
      ;['mud', 'wood'].forEach(function (k) { if (K.within(cu.p, LANE[k].start.x, LANE[k].start.y - 40, 190)) hit = k })
      if (!cancel && cu.moved > 10 && hit) { run(hit); return }
      if (!cancel) { api.warn(cu.moved > 10 ? L.noLane : L.dragTruck); ;['mud', 'wood'].forEach(function (k) { K.glow(chips[k], 0) }) }
      api.tween({ x: cur.x, y: cur.y }, HOME, 320, function (p) { placeTruck(p.x, p.y, cur.s + (HS - cur.s) * 0.5) }, function () { placeTruck(HOME.x, HOME.y, HS) })
    }
    truck.addEventListener('pointerup', function (ev) { tEnd(ev, false) })
    truck.addEventListener('pointercancel', function (ev) { tEnd(ev, true) })
    truck.addEventListener('lostpointercapture', function (ev) { tEnd(ev, true) })

    // ---- step 3: tap 3 times, the soft suspension bounces; the third is the big jump
    var count = null
    function bounce () {
      if (api.step() !== 2 || busy) return
      busy = true
      bounces++
      api.sfx(bounces >= 3 ? 'ok' : 'bump')
      if (!count) { count = api.at(sc, 'cnt', 0, 0, 90, 90); count.style.cssText += ';z-index:9;pointer-events:none;border-radius:50%;background:#fff;border:6px solid #13318A;color:#13318A;font:900 56px/78px Fredoka,Nunito,sans-serif;text-align:center' }
      count.textContent = String(bounces)
      count.style.left = (HOME.x - 45) + 'px'
      count.style.top = (HOME.y - TH * HS - 120) + 'px'
      var big = bounces >= 3
      var h = big ? 150 : 50
      api.tween({ x: 0, y: 0 }, { x: 1, y: 0 }, big ? 900 : 480, function (p) {
        var t = p.x
        var lift = Math.sin(t * Math.PI) * h
        var sq = t < 0.15 ? 1 - t * 1.2 : (t > 0.85 ? 1 - (1 - t) * 1.2 : 1)
        placeTruck(HOME.x, HOME.y, HS, { lift: lift, sq: sq })
      }, function () {
        placeTruck(HOME.x, HOME.y, HS)
        api.fx('dust', HOME.x, HOME.y, big ? 260 : 120)
        if (big) {
          api.fx('confetti', HOME.x, HOME.y - 200, 340)
          api.warn(L.jumped)
          api.later(function () { K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { busy = false; api.later(function () { api.advance() }, 300) } }) }, 900)
        } else { api.warn(bounces === 1 ? L.bounce1 : L.bounce2); busy = false }
      })
    }

    function nextLane () { return done.mud ? 'wood' : 'mud' }
    var ctl = {
      onStep: function (n) {
        TIRES.forEach(function (t) { tireEls[t.id].style.pointerEvents = n <= 1 ? 'auto' : 'none'; tireEls[t.id].classList.remove('glow') })
        truck.style.cursor = n >= 1 ? 'grab' : 'default'
        if (n === 0) { if (!asked) api.later(askTread, 500); else { TIRES.forEach(function (t) { K.glow(tireEls[t.id], 3000) }) } }
        if (n === 1) { placeTruck(cur.x, cur.y, cur.s); K.glow(truck, 3200); if (!done.mud) K.glow(chips.mud, 0) }
        if (n === 2) { TIRES.forEach(function (t) { tireEls[t.id].style.display = 'none' }); K.glow(truck, 3200); api.warn(L.tapTruck) }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) hd.move([{ x: TIRES[1].x + 50, y: TIRES[1].y + 50 }, { x: cur.x - 40, y: cur.y - 100 }], 1100)
        else if (n === 1) { var l = LANE[nextLane()]; hd.move([{ x: cur.x - 40, y: cur.y - 100 }, { x: l.start.x, y: l.start.y - 70 }], 1200) }
        else hd.move([{ x: HOME.x - 30, y: HOME.y - 140 }, { x: HOME.x - 30, y: HOME.y - 140 }], 1800)
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          TIRES.forEach(function (t) { K.glow(tireEls[t.id], 2800) }); K.glow(truck, 2800)
          if (lvl >= 3 && ghostWheel) K.glow(ghostWheel, 2800)
          if (lvl >= 4) { if (!asked) asked = true; tire = 'berpola'; setBadge(); if (ghostWheel) ghostWheel.style.display = 'none'; save(); api.advance() }
        } else if (s === 1) {
          K.glow(truck, 2800)
          if (tire !== 'berpola') K.glow(tireEls.berpola, 2800)
          if (lvl >= 4 && !busy) { if (tire !== 'berpola') { tire = 'berpola'; setBadge() } run(nextLane()) }
        } else {
          K.glow(truck, 2800)
          if (lvl >= 4 && !busy) bounce()
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { busy = false }
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W06-M01', mod)
})(window)
