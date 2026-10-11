/* G32 Blippi -- W06-M02 "Laboratorium Warna" (PRD 11.7: Explore & Discover; P09/P10; "Campur dua pigmen preset dan cat panel parade"; replay "resep lain dan tambah putih sebagai variabel terpisah"; the monster test truck gets its new door), played INSIDE bg-w06-m02-warna.
 * The recipe board on the wall shows the goal as a picture: the GREEN door + 2 blue dots + 2 yellow dots. Three paint dispensers stand on the lab table, an empty glass bowl in front, the paint roller beside it, a white door panel on the easel, and the monster truck (Blippi at the wheel) parked at the left.
 * 1 CAMPUR (pour, HOLD): "Biru + kuning jadi warna apa?"; then HOLD a dispenser: a scoop drops into the bowl every moment. Red is not in the recipe (wobble + kind line), a third scoop of the same colour is refused. 2 blue + 2 yellow turns the bowl green. Then "2 + 2 sendok. Berapa semuanya?".
 * 2 CAT    (paint, drag): drag the roller into the bowl (it takes the colour), then drag it over the white door until it is covered.
 * 3 PASANG (drop): drag the green door onto the truck; it clicks into the door slot, the truck honks. Then a maths-only SoalEngine question. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var TW = 300
  var TH = 240
  var TS = 0.85
  var HOME = { x: 270, y: 735 }
  var DISP = {
    biru: { x: 440, y: 462, key: 'w6-cat-biru', rgb: [47, 111, 224], name: 'biru' },
    kuning: { x: 600, y: 462, key: 'w6-cat-kuning', rgb: [246, 199, 30], name: 'kuning' },
    merah: { x: 760, y: 462, key: 'w6-cat-merah', rgb: [226, 59, 59], name: 'merah' }
  }
  var DW = 150
  var DH = 195
  var BOWL = { x: 900, y: 480, w: 220, h: 160 }
  var ROLLER = { x: 1135, y: 470, w: 160, h: 173 }
  var DOOR = { x: 1365, y: 405, w: 240, h: 190 }
  var GREEN = '#3DB544'
  var NEED = 2

  function hex (c) { return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')' }

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var step0 = rs ? rs.step : 0
    var scoops = saved.scoops || { biru: 0, kuning: 0, merah: 0 }
    var busy = false
    var hd = null
    var cur = { x: HOME.x, y: HOME.y }
    var mixed = step0 >= 1
    var painted = step0 >= 2
    if (mixed) { scoops.biru = NEED; scoops.kuning = NEED }
    function save () { api.persist({ scoops: scoops }) }
    function total () { return scoops.biru + scoops.kuning + scoops.merah }
    function mixRgb () {
      var t = total()
      if (!t) return [200, 230, 255]
      if (scoops.biru === NEED && scoops.kuning === NEED) return [61, 181, 68]
      var r = 0; var g = 0; var b = 0
      Object.keys(scoops).forEach(function (k) { r += DISP[k].rgb[0] * scoops[k]; g += DISP[k].rgb[1] * scoops[k]; b += DISP[k].rgb[2] * scoops[k] })
      return [r / t, g / t, b / t]
    }

    // ---- the recipe board: the goal as a picture (ghost green door + the dots)
    var board = api.at(sc, 'recipe', 790, 245, 180, 175)
    board.setAttribute('data-recipe', '1')
    board.style.cssText += ';z-index:3;pointer-events:none'
    var gd = K.ghost(api, board, 'w6-pintu-hijau', 5, 0, 170, 136, false, true)
    gd.setAttribute('data-goal', '1')
    var dots = api.at(board, '', 0, 140, 180, 32)
    dots.style.cssText += ';display:flex;gap:10px;justify-content:center;align-items:center'
    ;['#2F6FE0', '#2F6FE0', '#F6C71E', '#F6C71E'].forEach(function (c) { var d = document.createElement('i'); d.style.cssText = 'width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px rgba(19,49,138,.35);background:' + c; dots.appendChild(d) })

    // ---- the glass bowl (svg) with the liquid
    var bowl = api.at(sc, 'bowl', BOWL.x, BOWL.y, BOWL.w, BOWL.h)
    bowl.setAttribute('data-bowl', '1')
    bowl.style.cssText += ';z-index:4;pointer-events:none'
    bowl.innerHTML = '<svg viewBox="0 0 220 160" width="220" height="160"><ellipse cx="110" cy="52" rx="100" ry="26" fill="rgba(255,255,255,.35)" stroke="#9CC9E8" stroke-width="5"/>' +
      '<path d="M10 52 Q14 150 110 152 Q206 150 210 52" fill="rgba(230,245,255,.45)" stroke="#9CC9E8" stroke-width="5"/>' +
      '<clipPath id="bowlclip"><path d="M14 54 Q18 146 110 148 Q202 146 206 54 Z"/></clipPath>' +
      '<g clip-path="url(#bowlclip)"><rect class="liq" x="0" y="150" width="220" height="100" fill="#fff"/><ellipse class="liqtop" cx="110" cy="150" rx="96" ry="20" fill="#fff" opacity=".85"/></g>' +
      '<ellipse cx="110" cy="52" rx="100" ry="26" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/></svg>'
    var liq = bowl.querySelector('.liq')
    var liqTop = bowl.querySelector('.liqtop')
    function setLiquid () {
      var lvl = Math.min(1, total() / 4)
      var y = 150 - lvl * 78
      var c = hex(mixRgb())
      liq.setAttribute('y', String(y)); liq.setAttribute('fill', c)
      liqTop.setAttribute('cy', String(y)); liqTop.setAttribute('fill', c)
      liq.style.display = total() ? 'block' : 'none'; liqTop.style.display = total() ? 'block' : 'none'
    }
    setLiquid()

    // ---- the three dispensers: HOLD to pour
    var dEls = {}
    ;['biru', 'kuning', 'merah'].forEach(function (k, i) {
      var d = DISP[k]
      var el = api.at(sc, 'disp', d.x, d.y, DW, DH, 'button')
      el.type = 'button'
      el.setAttribute('data-disp', k)
      el.setAttribute('aria-label', 'Cat ' + k)
      el.style.cssText += ';background:none;border:0;padding:0;z-index:5;cursor:pointer;touch-action:none;pointer-events:none'
      api.art(el, d.key, 0, 0, DW, DH, '')
      if (el.animate && !api.reduced()) el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 1800 + i * 200, iterations: Infinity, easing: 'ease-in-out' })
      dEls[k] = el
      var timer = null
      var holding = false
      function pourOne () {
        if (api.step() !== 0 || mixed) { stop(); return }
        if (k === 'merah') { api.sfx('bad'); api.warn(L.noRed); wobble(el); K.glow(dEls.biru, 2400); K.glow(dEls.kuning, 2400); return }
        if (scoops[k] >= NEED) { api.sfx('bad'); api.warn(L.enough.replace('%c', k)); wobble(el); var other = k === 'biru' ? 'kuning' : 'biru'; if (scoops[other] < NEED) K.glow(dEls[other], 2400); return }
        scoops[k]++
        api.sfx('water')
        // a drop falls from the nozzle into the bowl, a splash and a ripple on the surface
        var from = { x: d.x + DW * 0.5, y: d.y + DH * 0.92 }
        var to = { x: BOWL.x + BOWL.w / 2, y: BOWL.y + 55 }
        var dr = api.at(sc, 'drop', from.x - 14, from.y, 28, 36)
        dr.style.cssText += ';z-index:9;pointer-events:none;border-radius:50% 50% 50% 50%/62% 62% 38% 38%;background:' + hex(d.rgb) + ';box-shadow:inset -4px -4px 0 rgba(255,255,255,.35)'
        api.tween(from, to, 380, function (p) { dr.style.left = (p.x - 14) + 'px'; dr.style.top = p.y + 'px' }, function () {
          if (dr.parentNode) dr.parentNode.removeChild(dr)
          api.fx('droplets', to.x, to.y, 150)
          setLiquid()
          if (bowl.animate && !api.reduced()) bowl.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04,.97)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 300 })
          save()
          check()
        })
      }
      function stop () { holding = false; clearInterval(timer); timer = null }
      el.addEventListener('pointerdown', function (ev) {
        if (api.step() !== 0 || busy || holding) return
        if (!predicted) { api.warn(L.askFirst); return }
        api.touch()
        holding = true
        try { el.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
        api.sfx('collect')
        pourOne()
        timer = setInterval(pourOne, 700)
      })
      el.addEventListener('pointerup', stop)
      el.addEventListener('pointercancel', stop)
      el.addEventListener('lostpointercapture', stop)
    })
    function wobble (el) { if (el.animate && !api.reduced()) el.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(0)' }], { duration: 320 }) }
    var predicted = !!saved.pred || step0 >= 1
    function predict () {
      K.ask(api, { custom: { id: 'm06b-pred', prompt: 'Biru dicampur kuning jadi warna apa?', choices: ['Hijau', 'Ungu', 'Jingga'], answer: 'Hijau', hint1: 'Daun dan rumput punya warna itu.', explain: 'Coba campur dan lihat sendiri!' }, done: function () { predicted = true; api.warn(L.holdPour); ;['biru', 'kuning'].forEach(function (c) { K.glow(dEls[c], 3000) }) } })
    }
    function check () {
      if (scoops.biru === NEED && scoops.kuning === NEED && !mixed) {
        mixed = true
        api.sfx('ok'); api.sfx('collect')
        api.fx('gold-star', BOWL.x + BOWL.w / 2, BOWL.y + 70, 220)
        api.fx('spark', BOWL.x + BOWL.w / 2, BOWL.y + 60, 200)
        api.warn(L.green)
        busy = true
        api.later(function () {
          K.ask(api, { custom: { id: 'm06b-sum', prompt: '2 sendok biru, 2 sendok kuning. Berapa semuanya?', choices: ['3', '4', '5'], answer: '4', scene: { groups: [{ key: 'w6-cat-biru', n: 2 }, { key: 'w6-cat-kuning', n: 2 }] }, hint1: 'Hitung: 2 dan 2 jadi berapa?' }, done: function () { busy = false; api.later(function () { api.advance() }, 400) } })
        }, 900)
      }
    }

    // ---- the door on the easel (white panel + a painting canvas on top)
    var door = api.at(sc, 'doorpiece', DOOR.x, DOOR.y, DOOR.w, DOOR.h, 'button')
    door.type = 'button'
    door.setAttribute('data-door', '1')
    door.setAttribute('aria-label', 'Pintu truk')
    door.style.cssText += ';background:none;border:0;padding:0;z-index:4;touch-action:none;pointer-events:none;cursor:default'
    api.art(door, 'w6-pintu-putih', 0, 0, DOOR.w, DOOR.h, '')
    var cv = document.createElement('canvas')
    cv.width = DOOR.w; cv.height = DOOR.h
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;border-radius:18px'
    door.appendChild(cv)
    var cx = cv.getContext('2d')
    function paintAll (rgb) { cx.fillStyle = hex(rgb); cx.beginPath(); if (cx.roundRect) cx.roundRect(4, 4, DOOR.w - 8, DOOR.h - 8, 22); else cx.rect(4, 4, DOOR.w - 8, DOOR.h - 8); cx.fill() }
    if (painted) { paintAll([61, 181, 68]) }

    // ---- the roller: dip it in the bowl, then paint
    var roller = api.at(sc, 'roller', ROLLER.x, ROLLER.y, ROLLER.w, ROLLER.h, 'button')
    roller.type = 'button'
    roller.setAttribute('data-roller', '1')
    roller.setAttribute('aria-label', 'Roller cat')
    roller.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none;pointer-events:none'
    api.art(roller, 'w6-roller', 0, 0, ROLLER.w, ROLLER.h, '')
    var tint = api.at(roller, '', 18, 8, 84, 60)
    tint.style.cssText += ';pointer-events:none;border-radius:14px;background:' + GREEN + ';mix-blend-mode:multiply;opacity:0'
    var loaded = painted
    if (roller.animate && !api.reduced() && !painted) roller._bob = roller.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 1700, iterations: Infinity, easing: 'ease-in-out' })
    var rd = null
    var lastP = null
    roller.addEventListener('pointerdown', function (ev) {
      if (api.step() !== 1 || busy || rd) return
      api.touch()
      if (roller._bob) roller._bob.cancel()
      var r = B.toRef(ev.clientX, ev.clientY)
      rd = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r }
      lastP = null
      roller.classList.remove('glow'); roller.style.zIndex = '30'
      api.sfx('collect')
      try { roller.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
    })
    roller.addEventListener('pointermove', function (ev) {
      if (!rd || ev.pointerId !== rd.id) return
      var r = B.toRef(ev.clientX, ev.clientY)
      rd.p = r
      rd.moved = Math.max(rd.moved, Math.abs(r.x - rd.x0) + Math.abs(r.y - rd.y0))
      roller.style.transform = 'translate(' + (r.x - rd.x0) + 'px,' + (r.y - rd.y0) + 'px)'
      var inBowl = r.x > BOWL.x - 20 && r.x < BOWL.x + BOWL.w + 20 && r.y > BOWL.y - 30 && r.y < BOWL.y + BOWL.h
      if (inBowl && !loaded) {
        loaded = true
        tint.style.opacity = '.85'
        api.sfx('water'); api.fx('droplets', r.x, r.y, 120); api.fx('spark', r.x, r.y, 120)
        api.warn(L.dipped)
      }
      var onDoor = r.x > DOOR.x && r.x < DOOR.x + DOOR.w && r.y > DOOR.y && r.y < DOOR.y + DOOR.h
      if (onDoor) {
        if (!loaded) { if (!rd.warned) { rd.warned = true; api.warn(L.dipFirst); K.glow(bowl, 2400); api.sfx('bad') } return }
        var px = r.x - DOOR.x
        var py = r.y - DOOR.y
        cx.save()
        cx.fillStyle = GREEN
        cx.beginPath(); cx.arc(px, py, 38, 0, 6.2832); cx.fill()
        if (lastP) { cx.strokeStyle = GREEN; cx.lineWidth = 76; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(lastP.x, lastP.y); cx.lineTo(px, py); cx.stroke() }
        cx.restore()
        lastP = { x: px, y: py }
        if (Math.random() < 0.12) api.fx('spark', r.x, r.y, 60)
      } else lastP = null
    })
    function coverage () {
      var n = 0
      var tot = 0
      var a
      var b
      for (a = 0; a < 10; a++) for (b = 0; b < 7; b++) {
        var x = Math.round(DOOR.w * (0.1 + 0.8 * a / 9))
        var y = Math.round(DOOR.h * (0.14 + 0.72 * b / 6))
        tot++
        if (cx.getImageData(x, y, 1, 1).data[3] > 100) n++
      }
      return n / tot
    }
    function endRoll (ev, cancel) {
      if (!rd || ev.pointerId !== rd.id) return
      var cu = rd
      rd = null
      lastP = null
      roller.style.zIndex = '7'
      if (!cancel && cu.moved > 10 && coverage() >= 0.8 && loaded && !painted) { finishPaint(); return }
      if (!cancel && cu.moved <= 10) api.warn(L.dragRoller)
      else if (!cancel && loaded && !painted) { api.warn(L.moreCoat) }
      api.tween({ x: cu.p.x - cu.x0, y: cu.p.y - cu.y0 }, { x: 0, y: 0 }, 300, function (t) { roller.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)' }, function () { roller.style.transform = '' })
    }
    roller.addEventListener('pointerup', function (ev) { endRoll(ev, false) })
    roller.addEventListener('pointercancel', function (ev) { endRoll(ev, true) })
    roller.addEventListener('lostpointercapture', function (ev) { endRoll(ev, true) })
    function finishPaint () {
      painted = true
      paintAll([61, 181, 68])
      roller.style.transform = ''
      api.sfx('ok'); api.sfx('collect')
      api.fx('gold-star', DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h / 2, 240)
      api.fx('confetti', DOOR.x + DOOR.w / 2, DOOR.y, 260)
      api.warn(L.painted)
      if (door.animate && !api.reduced()) door.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 420 })
      api.later(function () { api.advance() }, 900)
    }

    // ---- the monster truck, Blippi at the wheel, with a slot for the new door
    var truck = api.at(sc, '', 0, 0, TW, TH, 'button')
    truck.type = 'button'
    truck.setAttribute('data-truck', '1')
    truck.setAttribute('aria-label', 'Truk uji monster')
    truck.style.cssText += ';background:none;border:0;padding:0;z-index:6;pointer-events:none;transform-origin:50% 100%'
    var tart = api.art(truck, 'veh-monster-truck', 0, 0, TW, TH, '')
    tart.setAttribute('data-veh', 'monster-truck')
    K.driver(truck, { x: 0.38, y: 0.14, w: 0.27, h: 0.2 })
    var shade = api.at(sc, 'shd', 0, 0, 280, 40)
    shade.style.zIndex = '5'
    function placeTruck (x, y, sq, lift) {
      cur = { x: x, y: y }
      truck.style.transform = 'translate(' + (x - TW / 2) + 'px,' + (y - TH - (lift || 0)) + 'px) scale(' + TS + ',' + (TS * (sq || 1)) + ')'
      shade.style.transform = 'translate(' + (x - 140 * TS) + 'px,' + (y - 22) + 'px) scale(' + TS + ')'
    }
    placeTruck(HOME.x, HOME.y)
    var slotG = K.ghost(api, truck, 'w6-pintu-hijau', TW * 0.36, TH * 0.3, 96, 77, false, true)
    slotG.setAttribute('data-door-ghost', '1')
    slotG.style.display = step0 >= 2 ? 'block' : 'none'
    var newDoor = api.at(truck, '', TW * 0.36, TH * 0.3, 96, 77)
    newDoor.setAttribute('data-newdoor', '1')
    newDoor.style.cssText += ';pointer-events:none;z-index:2;display:none'
    api.art(newDoor, 'w6-pintu-hijau', 0, 0, 96, 77, '')

    // ---- step 3: drag the green door onto the truck
    var dd = null
    door.addEventListener('pointerdown', function (ev) {
      if (api.step() !== 2 || busy || dd) return
      api.touch()
      var r = B.toRef(ev.clientX, ev.clientY)
      dd = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r }
      door.classList.remove('glow'); door.style.zIndex = '30'
      api.sfx('collect')
      try { door.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
    })
    door.addEventListener('pointermove', function (ev) {
      if (!dd || ev.pointerId !== dd.id) return
      var r = B.toRef(ev.clientX, ev.clientY)
      dd.p = r
      dd.moved = Math.max(dd.moved, Math.abs(r.x - dd.x0) + Math.abs(r.y - dd.y0))
      door.style.transform = 'translate(' + (r.x - dd.x0) + 'px,' + (r.y - dd.y0) + 'px) scale(.8)'
    })
    function endDoor (ev, cancel) {
      if (!dd || ev.pointerId !== dd.id) return
      var cu = dd
      dd = null
      door.style.zIndex = '4'
      var onTruck = cu.p.x > cur.x - TW * TS / 2 - 40 && cu.p.x < cur.x + TW * TS / 2 + 40 && cu.p.y > cur.y - TH * TS - 40 && cu.p.y < cur.y + 20
      if (!cancel && cu.moved > 10 && onTruck) { install(); return }
      if (!cancel) { api.sfx('bad'); api.warn(cu.moved > 10 ? L.toTruck : L.dragDoor); K.glow(truck, 2600) }
      api.tween({ x: cu.p.x - cu.x0, y: cu.p.y - cu.y0 }, { x: 0, y: 0 }, 300, function (t) { door.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px) scale(.8)' }, function () { door.style.transform = '' })
    }
    door.addEventListener('pointerup', function (ev) { endDoor(ev, false) })
    door.addEventListener('pointercancel', function (ev) { endDoor(ev, true) })
    door.addEventListener('lostpointercapture', function (ev) { endDoor(ev, true) })
    function install () {
      busy = true
      door.style.display = 'none'
      slotG.style.display = 'none'
      newDoor.style.display = 'block'
      K.land(api, newDoor)
      api.sfx('bump'); api.sfx('honk')
      api.fx('dust', cur.x, cur.y, 200)
      api.fx('spark', cur.x, cur.y - 120, 220)
      api.fx('gold-star', cur.x, cur.y - 130, 220)
      // the truck bounces on its soft suspension and rolls a little forward
      api.tween({ x: 0, y: 0 }, { x: 1, y: 0 }, 700, function (p) { placeTruck(cur.x, cur.y, 1 - Math.sin(p.x * Math.PI * 3) * 0.04, Math.abs(Math.sin(p.x * Math.PI * 2)) * 18) }, function () { placeTruck(HOME.x, HOME.y); api.sfx('ok'); api.fx('confetti', cur.x, cur.y - 160, 320) })
      api.warn(L.installed)
      api.later(function () { K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { busy = false; api.later(function () { api.advance() }, 300) } }) }, 1300)
    }

    var ctl = {
      onStep: function (n) {
        ;['biru', 'kuning', 'merah'].forEach(function (k) { dEls[k].style.pointerEvents = n === 0 && !mixed ? 'auto' : 'none'; dEls[k].classList.remove('glow') })
        roller.style.pointerEvents = n === 1 ? 'auto' : 'none'
        door.style.pointerEvents = n === 2 ? 'auto' : 'none'
        if (n === 0 && !predicted) api.later(predict, 500)
        if (n === 0 && predicted) { K.glow(dEls.biru, 3000); K.glow(dEls.kuning, 3000) }
        if (n === 1) { if (mixed) { liq.setAttribute('fill', GREEN) } K.glow(roller, 3200); K.glow(bowl, 3200) }
        if (n === 2) { slotG.style.display = 'block'; door.style.cursor = 'grab'; K.glow(door, 3200); K.glow(truck, 3200); api.warn(L.dragDoor) }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) { var c = scoops.biru < NEED ? 'biru' : 'kuning'; hd.move([{ x: DISP[c].x + 70, y: DISP[c].y + 150 }, { x: DISP[c].x + 70, y: DISP[c].y + 150 }], 2000) }
        else if (n === 1) hd.move([{ x: ROLLER.x + 60, y: ROLLER.y + 60 }, { x: BOWL.x + 110, y: BOWL.y + 70 }, { x: DOOR.x + 40, y: DOOR.y + 60 }, { x: DOOR.x + 200, y: DOOR.y + 60 }, { x: DOOR.x + 200, y: DOOR.y + 130 }, { x: DOOR.x + 40, y: DOOR.y + 130 }], 600)
        else hd.move([{ x: DOOR.x + 100, y: DOOR.y + 70 }, { x: cur.x - 20, y: cur.y - 160 }], 1500)
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          K.glow(scoops.biru < NEED ? dEls.biru : dEls.kuning, 3000)
          if (lvl >= 2) K.glow(bowl, 3000)
          if (lvl >= 4 && !mixed) { predicted = true; scoops.biru = NEED; scoops.kuning = NEED; setLiquid(); save(); check() }
        } else if (s === 1) {
          K.glow(roller, 3000); K.glow(bowl, 3000)
          if (lvl >= 4 && !painted) { loaded = true; finishPaint() }
        } else {
          K.glow(door, 3000); K.glow(truck, 3000)
          if (lvl >= 4 && !busy) install()
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { busy = false }
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W06-M02', mod)
})(window)
