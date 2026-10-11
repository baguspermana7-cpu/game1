/* G32 Blippi -- W01-M03 "Bukit dan Muatan" (PRD 11.2: Predict & Test; "Uji ramp rendah/tinggi pada rig terkontrol, lalu antar muatan"; V03 = DUMP TRUCK), played INSIDE bg-w01-m03-bukit.
 * The dump truck (Blippi at the wheel) waits on the lane; six crates lie on the loading pad.
 * 1 MUAT  (count-and-load): drag 4 crates into the truck bed (the bed shows 4 ghost crates); then "Berapa kotak di truk?"
 * 2 UJI   (predict-and-test): "Ramp mana lebih jauh?" (pictures), then drag the truck onto EACH ramp: it climbs, rolls off and stops further for the tall one; a flag marks each stop. Then a maths question on the two stripes.
 * 3 ANTAR (tip): drag the truck onto a ramp; only the TALL one reaches the BLUE line (the low one stops short, kind line). At the blue line HOLD the truck: the bed tilts and the crates slide onto the line. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var STOP = { low: 598, high: 690 }          // truck bottom y after the roll (yellow stripe y566, blue y656)
  var START_Y = 520
  var TX = 840
  var TW = 340
  var TH = 245
  var RAMP = { low: { x: 40, y: 500, w: 230, h: 108, key: 'pc-ramp-low' }, high: { x: 250, y: 400, w: 240, h: 168, key: 'pc-ramp-high' } }
  var PARK = { x: 640, y: 540 }               // truck waits here
  var CRATE = 150
  var PADS = [{ x: 1180, y: 470 }, { x: 1335, y: 470 }, { x: 1490, y: 470 }, { x: 1180, y: 610 }, { x: 1335, y: 610 }, { x: 1490, y: 610 }]
  var BEDSLOT = [{ fx: 0.40, fy: 0.07 }, { fx: 0.62, fy: 0.07 }, { fx: 0.40, fy: 0.30 }, { fx: 0.62, fy: 0.30 }]
  var CR = 66                                 // crate size inside the bed at scale 1

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var tested = saved.tested || { low: false, high: false }
    var loaded = saved.loaded || 0
    var predicted = !!saved.pred
    var rs = api.restore
    var busy = false
    var hd = null
    var cur = { x: PARK.x, y: PARK.y, s: 0.85 }
    var flags = {}
    function save () { api.persist({ tested: tested, loaded: loaded, pred: predicted ? 1 : 0 }) }

    // ---- ramps on the grass slope (pieces you can see, the tall one is taller)
    var ramps = {}
    ;['low', 'high'].forEach(function (k) {
      var r = RAMP[k]
      var c = api.at(sc, 'ramp', r.x, r.y, r.w, r.h)
      c.setAttribute('data-ramp', k)
      c.style.cssText += ';z-index:4;pointer-events:none'
      api.art(c, r.key, 0, 0, r.w, r.h, '')
      ramps[k] = c
    })

    // ---- the dump truck, Blippi at the wheel
    var truck = api.at(sc, '', 0, 0, TW, TH, 'button')
    truck.type = 'button'
    truck.setAttribute('data-truck', '1')
    truck.setAttribute('aria-label', 'Truk sampah dan muatan')
    truck.style.cssText += ';background:none;border:0;padding:0;z-index:6;touch-action:none;transform-origin:78% 92%;cursor:default'
    var tart = api.art(truck, 'veh-dump-truck', 0, 0, TW, TH, '')
    tart.setAttribute('data-veh', 'dump-truck')
    K.driver(truck, { x: 0.13, y: 0.2, w: 0.2, h: 0.22 })
    var shade = api.at(sc, 'shd', 0, 0, 280, 40)
    shade.style.zIndex = '5'
    var bedLoad = []                                   // crates riding in the bed
    function placeTruck (x, y, s, tilt) {
      cur = { x: x, y: y, s: s }
      truck.style.transform = 'translate(' + (x - TW * 0.5) + 'px,' + (y - TH) + 'px) scale(' + s + ')' + (tilt ? ' rotate(' + tilt + 'deg)' : '')
      shade.style.transform = 'translate(' + (x - 140 * s) + 'px,' + (y - 26 * s) + 'px) scale(' + s + ')'
    }
    function bedXY (i) { return { x: BEDSLOT[i].fx * TW, y: BEDSLOT[i].fy * TH } }
    function addBedCrate (i, anim) {
      var cEl = api.at(truck, '', bedXY(i).x, bedXY(i).y, CR, CR)
      cEl.setAttribute('data-bedcrate', String(i))
      cEl.style.cssText += ';pointer-events:none;z-index:2'
      api.art(cEl, 'prop-kotak', 0, 0, CR, CR, '')
      if (anim) K.land(api, cEl)
      bedLoad[i] = cEl
    }
    placeTruck(PARK.x, PARK.y, 0.85)
    var q
    for (q = 0; q < loaded; q++) addBedCrate(q, false)

    // ---- step 1: crates on the pad -> bed ghosts
    var ghosts = []
    BEDSLOT.forEach(function (b, i) {
      var g = K.ghost(api, truck, 'prop-kotak', b.fx * TW, b.fy * TH, CR, CR)
      g.setAttribute('data-ghost', String(i))
      g.style.zIndex = '2'
      if (i < loaded) g.style.display = 'none'
      ghosts.push(g)
    })
    var crates = []
    PADS.forEach(function (p, i) {
      var c = api.at(sc, 'crate', p.x, p.y, CRATE, CRATE, 'button')
      c.type = 'button'
      c.setAttribute('data-crate', String(i))
      c.setAttribute('aria-label', 'Kotak')
      c.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none'
      api.art(c, 'prop-kotak', 0, 0, CRATE, CRATE, '')
      if (c.animate && !api.reduced()) c.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 1800 + i * 160, iterations: Infinity, easing: 'ease-in-out' })
      crates.push(c)
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
        c.style.transform = 'translate(' + (r.x - d.x0) + 'px,' + (r.y - d.y0) + 'px) scale(.8)'
      })
      function end (ev, cancel) {
        if (!d || ev.pointerId !== d.id) return
        var cu = d
        d = null
        c.style.zIndex = '7'
        // the bed rectangle on screen
        var inBed = cu.p.x > cur.x - TW * 0.5 * cur.s + TW * 0.28 * cur.s && cu.p.x < cur.x + TW * 0.5 * cur.s && cu.p.y > cur.y - TH * cur.s && cu.p.y < cur.y - TH * cur.s * 0.25
        if (!cancel && cu.moved > 10 && inBed && loaded < 4) { load(c); return }
        if (!cancel) { api.warn(cu.moved > 10 ? L.crateMiss : L.dragCrate); K.glow(truck, 2400) }
        api.tween({ x: cu.p.x - cu.x0, y: cu.p.y - cu.y0 }, { x: 0, y: 0 }, 280, function (t) { c.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)' }, function () { c.style.transform = '' })
      }
      c.addEventListener('pointerup', function (ev) { end(ev, false) })
      c.addEventListener('pointercancel', function (ev) { end(ev, true) })
      c.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
    })
    function load (c) {
      var i = loaded
      loaded++
      c.setAttribute('data-gone', '1')
      c.style.display = 'none'
      ghosts[i].style.display = 'none'
      addBedCrate(i, true)
      api.sfx('bump')
      api.fx('dust', cur.x - 20, cur.y - TH * cur.s * 0.55, 120)
      save()
      if (loaded >= 4) {
        api.later(function () {
          K.ask(api, { custom: { id: 'm03-count', prompt: 'Berapa kotak di truk?', choices: ['3', '4', '5'], answer: '4', count: { key: 'prop-kotak', n: 4 }, hint1: 'Hitung kotaknya satu per satu.' }, done: function () { api.warn(L.loaded); api.later(function () { api.advance() }, 500) } })
        }, 500)
      } else api.warn(L.more)
    }
    if (loaded > 0) crates.forEach(function (c, i) { if (i < loaded) { c.setAttribute('data-gone', '1'); c.style.display = 'none' } })

    // ---- flags for the two stops
    function flag (k, y) {
      if (flags[k]) return
      var f = api.art(sc, 'prop-bendera', k === 'low' ? 630 : 1040, y - 90, 56, 90, '')
      f.style.zIndex = '3'
      f.style.filter = k === 'low' ? 'none' : 'hue-rotate(160deg) saturate(1.2)'
      if (f.animate && !api.reduced()) f.animate([{ transform: 'translateY(-60px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.23,1,.32,1)' })
      flags[k] = f
    }
    if (tested.low) flag('low', STOP.low)
    if (tested.high) flag('high', STOP.high)

    // ---- rolling: climb the ramp, roll off its foot, coast to where the push runs out
    function scaleAt (y) { return Math.max(0.62, Math.min(1.0, 0.62 + (y - START_Y) / 520)) }
    function roll (k, cargo, done) {
      busy = true
      var rp = RAMP[k]
      var top = { x: rp.x + rp.w * 0.45, y: rp.y + rp.h * 0.62 }
      api.sfx('honk')
      api.tween({ x: cur.x, y: cur.y }, top, 380, function (p) { placeTruck(p.x, p.y, 0.62) }, function () {
        api.tween(top, { x: TX, y: START_Y }, 700, function (p) { placeTruck(p.x, p.y, 0.62, 6) }, function () {
          api.fx('dust', TX, START_Y, 150)
          api.tween({ x: START_Y, y: 0 }, { x: STOP[k], y: 0 }, k === 'high' ? 1500 : 1100, function (p) { placeTruck(TX, p.x, scaleAt(p.x)) }, function () {
            api.fx('dust', TX, STOP[k], 200)
            api.sfx('bump')
            busy = false
            if (done) done()
          })
        })
      })
    }
    function park () { api.tween({ x: cur.x, y: cur.y }, PARK, 600, function (p) { placeTruck(p.x, p.y, 0.85) }) }

    function useRamp (k) {
      var s = api.step()
      if (s === 1) {
        roll(k, false, function () {
          tested[k] = true
          flag(k, STOP[k])
          save()
          if (tested.low && tested.high) {
            api.warn(L.both)
            api.fx('gold-star', TX, 620, 220)
            api.later(function () {
              K.ask(api, { context: 'gate', grade: 1, done: function () { park(); api.later(function () { api.advance() }, 700) } })
            }, 1400)
          } else api.later(park, 900)
        })
      } else if (s === 2) {
        roll(k, true, function () {
          if (k === 'high') { api.warn(L.atBlue); K.glow(truck, 3200); armTip() } else {
            api.warn(L.short)
            K.glow(ramps.high, 3200)
            api.later(park, 1000)
          }
        })
      }
    }
    // ---- tip: hold the truck at the blue line
    var tipOn = false
    var tipRaf = 0
    function armTip () { tipOn = true; truck.style.cursor = 'grab' }
    function tipLoop (t0) {
      var t = 0
      var last = t0
      function f (now) {
        if (!holding) return
        t += Math.min(50, now - last)
        last = now
        var k = Math.min(1, t / 1400)
        placeTruck(cur.x, cur.y, cur.s, -22 * k)
        if (k >= 0.55 && !truck.getAttribute('data-tipped')) slideCrates()
        if (k >= 1) { holding = false; return }
        tipRaf = requestAnimationFrame(f)
      }
      tipRaf = requestAnimationFrame(f)
    }
    var holding = false
    function slideCrates () {
      truck.setAttribute('data-tipped', '1')
      api.sfx('bump')
      var i
      for (i = 0; i < 4; i++) {
        ;(function (j) {
          var e = bedLoad[j]
          var r = e.getBoundingClientRect()
          var pt = api.toRef(r.left, r.top)
          if (e.parentNode) e.parentNode.removeChild(e)
          var d = api.art(sc, 'prop-kotak', 0, 0, 90, 90, 'slid')
          d.style.cssText += ';z-index:7;pointer-events:none'
          d.setAttribute('data-slid', String(j))
          var to = { x: TX - 220 + j * 100, y: STOP.high - 60 + (j % 2) * 12 }
          api.later(function () {
            api.tween({ x: pt.x, y: pt.y }, to, 520, function (p) { d.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)' }, function () { api.fx('dust', to.x + 45, to.y + 80, 110); if (j === 3) finishTip() })
          }, j * 150)
        })(i)
      }
    }
    function finishTip () {
      api.sfx('ok')
      api.fx('confetti', TX, STOP.high, 320)
      tipOn = false
      save()
      api.later(function () { api.advance() }, 1000)
    }

    // ---- truck gestures: drag onto a ramp (tests / delivery) or hold (tip)
    var td = null
    truck.addEventListener('pointerdown', function (ev) {
      if (busy || td) return
      var s = api.step()
      if (s === 0) { api.touch(); api.warn(L.loadFirst); return }
      api.touch()
      if (s === 2 && tipOn) { holding = true; api.sfx('honk'); try { truck.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ } tipLoop(performance.now()); td = { id: ev.pointerId, tip: true }; return }
      var p = api.toRef(ev.clientX, ev.clientY)
      td = { id: ev.pointerId, x0: p.x, y0: p.y, moved: 0, p: p }
      try { truck.setPointerCapture(ev.pointerId) } catch (e2) { /* synthetic */ }
    })
    truck.addEventListener('pointermove', function (ev) {
      if (!td || td.tip || ev.pointerId !== td.id) return
      var p = api.toRef(ev.clientX, ev.clientY)
      td.p = p
      td.moved = Math.max(td.moved, Math.abs(p.x - td.x0) + Math.abs(p.y - td.y0))
      if (td.moved > 10) placeTruck(p.x, p.y + 90, 0.7)
    })
    function tEnd (ev, cancel) {
      if (!td || ev.pointerId !== td.id) return
      var cu = td
      td = null
      if (cu.tip) { holding = false; if (!truck.getAttribute('data-tipped')) { placeTruck(cur.x, cur.y, cur.s, 0); api.warn(L.holdLonger) } return }
      var hit = null
      ;['low', 'high'].forEach(function (k) { var r = RAMP[k]; if (cu.p.x > r.x - 40 && cu.p.x < r.x + r.w + 40 && cu.p.y > r.y - 60 && cu.p.y < r.y + r.h + 50) hit = k })
      if (!cancel && cu.moved > 10 && hit && api.step() >= 1) { useRamp(hit); return }
      if (!cancel && api.step() >= 1) { api.warn(cu.moved > 10 ? L.noRamp : L.dragTruck); ;['low', 'high'].forEach(function (k) { K.glow(ramps[k], 2600) }) }
      api.tween({ x: cur.x, y: cur.y }, tipOn ? { x: TX, y: STOP.high } : PARK, 320, function (p) { placeTruck(p.x, p.y, tipOn ? scaleAt(STOP.high) : 0.85) })
    }
    truck.addEventListener('pointerup', function (ev) { tEnd(ev, false) })
    truck.addEventListener('pointercancel', function (ev) { tEnd(ev, true) })
    truck.addEventListener('lostpointercapture', function (ev) { tEnd(ev, true) })

    // ---- the prediction: a question with the two ramps as picture answers
    function predict () {
      K.ask(api, { custom: { id: 'm03-pred', prompt: 'Ramp mana membuat truk meluncur lebih jauh?', choices: ['Rendah', 'Tinggi'], choicePics: ['assets/blippi/pc-ramp-low.webp', 'assets/blippi/pc-ramp-high.webp'], answer: 'Tinggi', hint1: 'Ramp yang lebih tinggi memberi dorongan lebih kuat.', explain: 'Coba buktikan sendiri!' }, done: function () { predicted = true; save(); api.warn(L.guess) } })
    }

    var ctl = {
      onStep: function (n) {
        crates.forEach(function (c) { c.style.pointerEvents = n === 0 ? 'auto' : 'none' })
        truck.style.cursor = n >= 1 ? 'grab' : 'default'
        crates.forEach(function (c) { c.classList.remove('glow') })
        if (n === 0) crates.forEach(function (c) { if (!c.getAttribute('data-gone')) c.classList.add('glow') })
        if (n === 1 && !predicted) { api.later(predict, 400) }
        if (n === 2) { tipOn = false; K.glow(ramps.high, 3000); K.glow(truck, 3000) }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) { var i = 0; while (i < PADS.length - 1 && crates[i].getAttribute('data-gone')) i++; hd.move([{ x: PADS[i].x + 40, y: PADS[i].y + 30 }, { x: cur.x + 40, y: cur.y - TH * cur.s * 0.7 }], 1100) }
        else if (n === 2 && tipOn) hd.move([{ x: cur.x - 40, y: cur.y - 120 }, { x: cur.x - 40, y: cur.y - 120 }], 1800)
        else { var want = (n === 1 && tested.low) || n === 2 ? 'high' : 'low'; var r = RAMP[want]; hd.move([{ x: cur.x - 40, y: cur.y - 120 }, { x: r.x + r.w / 2 - 30, y: r.y + r.h / 2 - 30 }], 1100) }
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          crates.forEach(function (c) { if (!c.getAttribute('data-gone')) K.glow(c, 2600) })
          if (lvl >= 4) { var i = 0; while (i < PADS.length - 1 && crates[i].getAttribute('data-gone')) i++; if (loaded < 4) load(crates[i]) }
        } else if (s === 1) {
          var want = tested.low ? 'high' : 'low'
          K.glow(ramps[want], 3000); K.glow(truck, 3000)
          if (lvl >= 4 && !busy) useRamp(want)
        } else {
          if (tipOn) { K.glow(truck, 3000); if (lvl >= 4 && !truck.getAttribute('data-tipped')) { placeTruck(cur.x, cur.y, cur.s, -22); slideCrates() } } else { K.glow(ramps.high, 3000); if (lvl >= 4 && !busy) useRamp('high') }
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { holding = false; cancelAnimationFrame(tipRaf) }
    }
    if (rs && rs.step >= 1) { /* loaded state restored above */ }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W01-M03', mod)
})(window)
