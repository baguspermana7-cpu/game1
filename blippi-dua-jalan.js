/* G32 Blippi -- W02-M04 "Dua Jalan untuk Air" (PRD 11.3: Predict & Test; one channel closed, one connected; steer to two basins), played INSIDE bg-w02-m04-dua-jalan.
 * The waterfall feeds two stone channels, each ending in a basin. One channel has a closed dam gate on it (random per play, saved).
 * 1 KIRA: tap the basin you think the water will reach (a guess, never wrong).
 * 2 UJI: HOLD the pump beside the waterfall. Water runs down BOTH channels: the open one fills its basin, the closed one stops at its dam and splashes. The scene answers your guess.
 * 3 BUKA: turn the closed channel's valve wheel (3 turns): the dam swings open. HOLD the pump again and the second basin fills; both fountains start. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var NS = 'http://www.w3.org/2000/svg'
  var CH = {
    L: [[775, 300], [650, 340], [520, 395], [410, 455], [330, 535], [335, 610], [400, 660]],
    R: [[815, 300], [960, 350], [1090, 410], [1190, 480], [1260, 550], [1290, 610], [1320, 660]]
  }
  var BASIN = { L: { x: 395, y: 664, rx: 195, ry: 54 }, R: { x: 1318, y: 664, rx: 195, ry: 54 } }
  var DAM_AT = { L: 0.22, R: 0.22 }
  var PUMP = { x: 470, y: 168, w: 170, h: 116 }

  function path (pts) {
    // smooth: quadratic curves through the midpoints of the polyline
    var d = 'M' + pts[0][0] + ',' + pts[0][1]
    var i
    for (i = 1; i < pts.length - 1; i++) { var mx = (pts[i][0] + pts[i + 1][0]) / 2; var my = (pts[i][1] + pts[i + 1][1]) / 2; d += ' Q' + pts[i][0] + ',' + pts[i][1] + ' ' + mx + ',' + my }
    d += ' L' + pts[pts.length - 1][0] + ',' + pts[pts.length - 1][1]
    return d
  }
  function polyLen (pts) { var t = 0; var i; for (i = 0; i < pts.length - 1; i++) t += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return t }
  function polyAt (pts, f) {
    var tot = polyLen(pts)
    var d = f * tot
    var i
    for (i = 0; i < pts.length - 1; i++) { var s = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); if (d <= s) { var k = d / s; return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k } } d -= s }
    return { x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] }
  }

  var mod = { mount: function (api) {
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var closed = saved.closed || (Math.random() < 0.5 ? 'L' : 'R')
    var open = closed === 'L' ? 'R' : 'L'
    var guess = saved.guess || null
    var valveOpen = !!saved.valveOpen || !!(rs && rs.step >= 3 && saved.valveOpen)
    var turns = valveOpen ? 3 : 0
    var prog = { L: 0, R: 0 }
    var level = { L: 0, R: 0 }
    var holding = false
    var raf = 0
    var hand = K.hand(api)
    if (rs && rs.step >= 2 && level[open] === 0) level[open] = 1       // the first test is remembered
    function save () { api.persist({ closed: closed, guess: guess, valveOpen: valveOpen }) }

    // ---- water: channel dashes + basin ellipses
    var svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('viewBox', '0 0 1672 941')
    svg.setAttribute('width', '1672')
    svg.setAttribute('height', '941')
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:3'
    sc.appendChild(svg)
    var wb = { L: K.waterBody(svg, BASIN.L.x, BASIN.L.y, BASIN.L.rx, BASIN.L.ry), R: K.waterBody(svg, BASIN.R.x, BASIN.R.y, BASIN.R.rx, BASIN.R.ry) }
    var wp = { L: K.waterPath(svg, path(CH.L), 24), R: K.waterPath(svg, path(CH.R), 24) }
    var ripT = 0
    function paint (k) {
      wp[k].set(prog[k])
      wb[k].set(level[k])
    }
    ;['L', 'R'].forEach(function (k) { if (level[k] >= 1) prog[k] = 1; paint(k) })

    // ---- the pump (hold), valve wheels + dam gates (one per channel; only the closed one blocks), guess markers
    var pump = api.art(sc, 'modul-pompa', PUMP.x, PUMP.y, PUMP.w, PUMP.h, 'pumpunit')
    pump.setAttribute('data-pump', '1')
    pump.style.cssText += ';z-index:6;touch-action:none;cursor:pointer'
    var damEls = {}
    var valveEls = {}
    ;['L', 'R'].forEach(function (k) {
      var p = polyAt(CH[k], DAM_AT[k])
      var isClosed = k === closed && !valveOpen
      var dam = api.art(sc, isClosed ? 'pc-gate-closed' : 'pc-gate-open', p.x - 60, p.y - 62, 120, 83, 'dam')
      dam.setAttribute('data-dam', k)
      dam.style.cssText += ';z-index:4;pointer-events:none;' + (k === open ? 'opacity:.0' : '')
      damEls[k] = dam
      var v = api.art(sc, 'prop-katup', p.x - 36 + (k === 'L' ? -50 : 50), p.y - 80, 72, 72, 'valve')
      v.setAttribute('data-valve', k === closed ? (valveOpen ? 'open' : 'closed') : 'open')
      v.setAttribute('data-valve-ch', k)
      v.style.cssText += ';z-index:6;cursor:' + (k === closed ? 'pointer' : 'default') + ';touch-action:manipulation;transform-origin:50% 50%'
      if (k === closed) v.style.transform = 'rotate(' + (turns * 90) + 'deg)'; else v.style.transform = 'rotate(270deg)'
      valveEls[k] = v
    })
    var guessBtns = {}
    ;['L', 'R'].forEach(function (k) {
      var b = api.at(sc, 'basinhit', BASIN[k].x - 200, BASIN[k].y - 70, 400, 140, 'button')
      b.type = 'button'
      b.setAttribute('data-basin', k)
      b.setAttribute('aria-label', k === 'L' ? 'Wadah kiri' : 'Wadah kanan')
      b.style.cssText += ';background:none;border:0;padding:0;z-index:5;cursor:pointer;border-radius:50%;display:none;touch-action:manipulation'
      b.addEventListener('click', function () { tapBasin(k) })
      guessBtns[k] = b
    })
    var jets = {}
    ;['L', 'R'].forEach(function (k) {
      var j = api.art(sc, 'pc-jets-a', BASIN[k].x - 100, BASIN[k].y - 170, 200, 165, 'jets')
      j.style.cssText += ';z-index:4;pointer-events:none;opacity:0'
      jets[k] = j
    })
    var mark = api.at(sc, 'guessmark', 0, 0, 70, 70)
    mark.style.cssText += ';z-index:7;pointer-events:none;display:none;border-radius:50%;background:#FF8A1F;color:#fff;font:900 40px/70px Fredoka,Nunito,sans-serif;text-align:center;box-shadow:0 4px 8px rgba(0,0,0,.3)'
    mark.textContent = '?'
    function showMark () {
      if (!guess) { mark.style.display = 'none'; return }
      mark.style.display = 'block'
      mark.style.transform = 'translate(' + (BASIN[guess].x - 35) + 'px,' + (BASIN[guess].y - 110) + 'px)'
    }
    showMark()

    // ---- step 1: guess
    function tapBasin (k) {
      if (api.step() !== 0) return
      api.touch()
      guess = k
      api.sfx('ok')
      showMark()
      guessBtns[k].classList.add('bounce')
      save()
      api.warn(L.guessed)
      api.later(function () { api.advance() }, 800)
    }

    // ---- hold the pump: flow, spill at a closed dam, fill basins
    function tick (dt) {
      var s = api.step()
      if (s === 1 || s === 2) {
        ;['L', 'R'].forEach(function (k) {
          var blocked = k === closed && !valveOpen
          var cap = blocked ? DAM_AT[k] : 1
          if (prog[k] < cap) prog[k] = Math.min(cap, prog[k] + dt / 2400)
          else if (!blocked && level[k] < 1 && prog[k] >= 1) {
            level[k] = Math.min(1, level[k] + dt / 1900)
            ripT += dt
            if (ripT > 380) { ripT = 0; var e = CH[k][CH[k].length - 1]; K.ripple(svg, e[0], e[1] + 6, 46) }
          }
          paint(k)
        })
        var c = closed
        if (!valveOpen && prog[c] >= DAM_AT[c] - 0.002 && !tick.spilled) { tick.spilled = true; spill() }
        if (s === 1 && level[open] >= 1) { holding = false; testDone() }
        if (s === 2 && valveOpen && level[closed] >= 1) { holding = false; allDone() }
      }
    }
    function spill () {
      var p = polyAt(CH[closed], DAM_AT[closed])
      api.sfx('bad')
      api.fx('droplets', p.x, p.y, 150)
    }
    function loop (t0) {
      var last = t0
      function f (t) {
        if (!holding) return
        var dt = Math.min(50, t - last)
        last = t
        if (!api.paused()) tick(dt)
        raf = requestAnimationFrame(f)
      }
      raf = requestAnimationFrame(f)
    }
    pump.addEventListener('pointerdown', function (ev) {
      var s = api.step()
      if (s === 0) { api.touch(); api.warn(L.guessFirst); K.glow(guessBtns.L, 2600); K.glow(guessBtns.R, 2600); return }
      if (s === 2 && !valveOpen) { api.touch(); api.warn(L.openFirst); K.glow(valveEls[closed], 2800); return }
      api.touch()
      holding = true
      tick.spilled = tick.spilled && !valveOpen ? true : false
      api.sfx('water')
      pump.classList.remove('glow')
      try { pump.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      loop(performance.now())
    })
    function release () { holding = false }
    pump.addEventListener('pointerup', release)
    pump.addEventListener('pointercancel', release)
    pump.addEventListener('lostpointercapture', release)

    function testDone () {
      api.sfx('ok')
      var hit = guess === open
      api.warn(hit ? L.hit : L.miss)
      api.fx('gold-star', BASIN[open].x, BASIN[open].y - 80, 220)
      K.glow(valveEls[closed], 4000)
      save()
      api.later(function () { api.advance() }, 2200)
    }
    function allDone () {
      api.sfx('ok')
      ;['L', 'R'].forEach(function (k) { jets[k].style.opacity = '1'; if (jets[k].animate && !api.reduced()) jets[k].animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 600, easing: 'cubic-bezier(.23,1,.32,1)' }) })
      api.fx('confetti', 860, 400, 360)
      save()
      api.later(function () { api.advance() }, 1200)
    }

    // ---- step 3: turn the wheel of the closed channel
    function turn () {
      if (api.step() !== 2 || valveOpen) return
      api.touch()
      turns++
      api.sfx('tap')
      var v = valveEls[closed]
      v.style.transform = 'rotate(' + (turns * 90) + 'deg)'
      if (turns >= 3) {
        valveOpen = true
        v.setAttribute('data-valve', 'open')
        damEls[closed].parentNode.removeChild(damEls[closed])
        damEls[closed] = api.art(sc, 'pc-gate-open', polyAt(CH[closed], DAM_AT[closed]).x - 60, polyAt(CH[closed], DAM_AT[closed]).y - 62, 120, 83, 'dam')
        damEls[closed].style.cssText += ';z-index:4;pointer-events:none'
        K.land(api, damEls[closed])
        api.sfx('ok')
        api.warn(L.valveOpen)
        K.glow(pump, 3000)
        save()
      }
    }
    valveEls.L.addEventListener('click', function () { if (closed === 'L') turn() })
    valveEls.R.addEventListener('click', function () { if (closed === 'R') turn() })
    if (valveOpen) { damEls[closed].parentNode && 0 }

    var ctl = {
      onStep: function (n) {
        holding = false
        guessBtns.L.style.display = n === 0 ? 'block' : 'none'
        guessBtns.R.style.display = n === 0 ? 'block' : 'none'
        tick.spilled = false
        if (n === 0) { K.glow(guessBtns.L, 3000); K.glow(guessBtns.R, 3000) }
        if (n === 1) K.glow(pump, 3000)
        if (n === 2) K.glow(valveEls[closed], 3000)
      },
      onTool: function () {},
      demo: function () { ctl.hint(1); ctl.hint(3) },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          K.glow(guessBtns.L, 3000); K.glow(guessBtns.R, 3000)
          if (lvl === 3) hand.move([{ x: BASIN.L.x - 30, y: BASIN.L.y - 20 }, { x: BASIN.L.x - 30, y: BASIN.L.y - 36 }, { x: BASIN.L.x - 30, y: BASIN.L.y - 20 }], 450)
          else if (lvl >= 4) tapBasin(closed === 'L' ? 'R' : 'L')
        } else if (s === 1) {
          K.glow(pump, 3000)
          if (lvl === 3) hand.move([{ x: PUMP.x + 70, y: PUMP.y + 40 }, { x: PUMP.x + 70, y: PUMP.y + 40 }], 1800)
          else if (lvl >= 4) { prog[open] = 1; level[open] = 1; paint(open); testDone() }
        } else {
          if (!valveOpen) {
            K.glow(valveEls[closed], 3000)
            if (lvl === 3) { var vp = polyAt(CH[closed], DAM_AT[closed]); hand.move([{ x: vp.x + (closed === 'L' ? -80 : 20), y: vp.y - 60 }, { x: vp.x + (closed === 'L' ? -80 : 20), y: vp.y - 76 }, { x: vp.x + (closed === 'L' ? -80 : 20), y: vp.y - 60 }], 450) }
            else if (lvl >= 4) { turns = 2; turn() }
          } else {
            K.glow(pump, 3000)
            if (lvl === 3) hand.move([{ x: PUMP.x + 70, y: PUMP.y + 40 }, { x: PUMP.x + 70, y: PUMP.y + 40 }], 1800)
            else if (lvl >= 4) { prog[closed] = 1; level[closed] = 1; paint(closed); allDone() }
          }
        }
      },
      win: function () { api.sfx('water') },
      destroy: function () { holding = false; cancelAnimationFrame(raf) }
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W02-M04', mod)
})(window)
