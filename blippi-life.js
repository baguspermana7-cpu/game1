/* G32 Blippi -- living scene. The owner's plates are single painted images; this layer keeps them from reading as
 * a static picture: (1) a slow camera (drift + pointer / device tilt) moves the plate AND every mission-scene piece together,
 * so overlays stay glued to the plate while the fixed UI frame gives depth; (2) per-plate ambient life in reference
 * pixels (1672x941): glints and ripples on water, mist at waterfalls, birds, falling leaves; (3) vehicles in a
 * mission scene get a ground shadow, an idle bob and dust puffs while they move. Transform/opacity only (the
 * individual `translate`/`scale` properties, so it composes with whatever transform a mission sets), one rAF for
 * the screen, capped spawns, paused when the tab is hidden, nothing at all under prefers-reduced-motion. */
(function (w) {
  'use strict'
  var V = w.BlippiVFX || {}
  var RW = 1672
  var RH = 941
  // per-plate zones, reference px [x, y, w, h]. water: glints + ripples; falls: mist + streaks; birds: flight band
  // [y0, y1]; leaves: tree crowns leaves fall from.
  var ZONES = {
    'bg-misi-jalan': { water: [[700, 290, 320, 150], [610, 450, 470, 230], [520, 690, 560, 240]], birds: [40, 150], leaves: [[40, 20, 220, 200], [1420, 10, 230, 200]] },
    'bg-w01-m02-pasir': { birds: [20, 90], leaves: [[1560, 300, 110, 200]] },
    'bg-w01-m03-bukit': { water: [[0, 200, 330, 120]], birds: [30, 120], leaves: [[0, 0, 160, 160]] },
    'bg-w01-m04-jembatan': { water: [[700, 190, 520, 110], [420, 430, 880, 170]], birds: [20, 110], leaves: [[1320, 220, 220, 160]] },
    'bg-w01-m05-pembukaan': { birds: [30, 120], leaves: [[0, 0, 160, 140]] },
    'bg-misi-kincir': { water: [[960, 300, 700, 280]], falls: [[390, 190, 140, 150]], leaves: [[40, 0, 260, 160], [560, 0, 300, 140]] },
    'bg-w02-m02-aliran': { water: [[640, 280, 760, 140]], falls: [[390, 90, 120, 140]], birds: [20, 90], leaves: [[60, 0, 260, 150]] },
    'bg-w02-m03-lumpur': { water: [[640, 330, 740, 130]], falls: [[390, 90, 120, 140]], birds: [20, 90], leaves: [[60, 0, 260, 150]] },
    'bg-hub': { birds: [30, 140] },
    'bg-peta': { water: [[200, 300, 1200, 500]], birds: [20, 120] }
  }
  var BIRD = '<svg viewBox="0 0 40 16" width="100%" height="100%"><path d="M2 10 Q11 1 20 9 Q29 1 38 10 Q29 5 20 13 Q11 5 2 10Z" fill="#2c3e66"/></svg>'

  var cur = null
  function reduced () { return !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches) }
  function rnd (a, b) { return a + Math.random() * (b - a) }
  function pick (a) { return a[Math.floor(Math.random() * a.length)] }
  function div (parent, cls, css) {
    var e = document.createElement('div')
    e.className = cls
    if (css) e.style.cssText = css
    parent.appendChild(e)
    return e
  }
  function img (parent, name, css) {
    var d = V[name]
    if (!d) return null
    var im = new Image()
    im.alt = ''
    im.draggable = false
    im.src = d.file
    im.style.cssText = 'position:absolute;pointer-events:none;' + (d.blend === 'screen' ? 'mix-blend-mode:screen;' : '') + css
    parent.appendChild(im)
    return im
  }
  function once (el, frames, opts) {
    var a = el.animate(frames, opts)
    function done () { if (el.parentNode) el.parentNode.removeChild(el) }
    a.onfinish = done
    a.oncancel = done
    return a
  }

  /* ---------- ambient spawners (all inside the plate's own life layer, so they ride the camera) ---------- */
  function glint (L, z) {
    var r = pick(z.water)
    var s = rnd(60, 110)
    var im = img(L, 'spark', 'left:' + (rnd(r[0], r[0] + r[2]) - s / 2) + 'px;top:' + (rnd(r[1], r[1] + r[3]) - s / 2) + 'px;width:' + s + 'px;opacity:0')
    if (im) once(im, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.4 }, { opacity: 0, transform: 'scale(.7)' }], { duration: rnd(1100, 1700), easing: 'ease-in-out' })
  }
  function ripple (L, z) {
    var r = pick(z.water)
    var s = rnd(110, 170)
    var e = div(L, 'life-ripple', 'left:' + (rnd(r[0] + 40, r[0] + r[2] - 40) - s / 2) + 'px;top:' + (rnd(r[1] + 20, r[1] + r[3] - 20) - s * 0.2) + 'px;width:' + s + 'px;height:' + (s * 0.4) + 'px')
    once(e, [{ opacity: 0.95, transform: 'scale(.2)' }, { opacity: 0.6, offset: 0.5 }, { opacity: 0, transform: 'scale(1)' }], { duration: 2600, easing: 'cubic-bezier(.23,1,.32,1)' })
  }
  function mist (L, z) {
    z.falls.forEach(function (f) {
      var s = rnd(70, 120)
      var e = div(L, 'life-mist', 'left:' + (rnd(f[0], f[0] + f[2]) - s / 2) + 'px;top:' + (f[1] + f[3] - s * 0.5) + 'px;width:' + s + 'px;height:' + s + 'px')
      once(e, [{ opacity: 0, transform: 'translate(0,0) scale(.5)' }, { opacity: 0.55, offset: 0.3 }, { opacity: 0, transform: 'translate(' + rnd(-30, 30) + 'px,-' + rnd(20, 50) + 'px) scale(1.4)' }], { duration: 1800, easing: 'ease-out' })
    })
  }
  function birds (L, z) {
    var left = Math.random() < 0.5
    var y = rnd(z.birds[0], z.birds[1])
    var n = 2 + Math.floor(Math.random() * 3)
    for (var i = 0; i < n; i++) {
      var s = rnd(30, 46)
      var b = div(L, 'life-bird', 'left:' + (left ? -80 : RW + 40) + 'px;top:' + (y + rnd(-26, 26)) + 'px;width:' + s + 'px;height:' + (s * 0.4) + 'px;animation-delay:' + (-i * 0.13) + 's')
      b.innerHTML = BIRD
      var dx = (left ? 1 : -1) * (RW + 160)
      once(b, [{ transform: 'translate(0,0)' }, { transform: 'translate(' + (dx * 0.5) + 'px,' + rnd(-40, 20) + 'px)' }, { transform: 'translate(' + dx + 'px,' + rnd(-60, 10) + 'px)' }], { duration: rnd(13000, 17000), delay: i * rnd(150, 400), easing: 'linear' })
    }
  }
  function leaf (L, z) {
    var r = pick(z.leaves)
    var s = rnd(34, 52)
    var im = img(L, 'leaves', 'left:' + rnd(r[0], r[0] + r[2]) + 'px;top:' + rnd(r[1], r[1] + r[3]) + 'px;width:' + s + 'px;opacity:0')
    if (!im) return
    var dx = rnd(-90, 90)
    once(im, [{ opacity: 0, transform: 'translate(0,0) rotate(0deg)' }, { opacity: 0.95, offset: 0.12 },
      { transform: 'translate(' + (dx * 0.5 + 30) + 'px,110px) rotate(' + rnd(60, 140) + 'deg)', offset: 0.5 },
      { opacity: 0, transform: 'translate(' + dx + 'px,240px) rotate(' + rnd(160, 300) + 'deg)' }], { duration: rnd(4200, 6000), easing: 'ease-in-out' })
  }

  /* ---------- vehicles: shadow + idle bob + dust while moving ---------- */
  function isVeh (e) { return e.nodeType === 1 && /^veh-/.test(e.getAttribute('data-art') || e.getAttribute('data-slot') || '') }
  function dress (v) {
    if (v.__life) return
    v.__life = { x: null, y: null, t: 0 }
    v.classList.add('life-veh')
    var sh = document.createElement('i')
    sh.className = 'life-shadow'
    v.insertBefore(sh, v.firstChild)
  }
  function puff (scene, x, y, dir) {
    var s = rnd(34, 58)
    var e = div(scene, 'life-puff', 'left:' + (x - s / 2) + 'px;top:' + (y - s / 2) + 'px;width:' + s + 'px;height:' + s + 'px')
    once(e, [{ opacity: 0.75, transform: 'translate(0,0) scale(.35)' }, { opacity: 0, transform: 'translate(' + (-dir * rnd(20, 50)) + 'px,-' + rnd(14, 34) + 'px) scale(1.3)' }], { duration: rnd(600, 850), easing: 'cubic-bezier(.23,1,.32,1)' })
  }
  function trackVehicles (c, now) {
    var sc = c.scene
    if (!sc) return
    var vs = sc.querySelectorAll('.life-veh')
    if (!vs.length) return
    var sr = sc.getBoundingClientRect()
    if (!sr.width) return
    var k = RW / sr.width
    for (var i = 0; i < vs.length && i < 4; i++) {
      var v = vs[i]
      var r = v.getBoundingClientRect()
      if (!r.width || getComputedStyle(v).visibility === 'hidden') continue
      var st = v.__life
      var x = (r.left - sr.left) * k
      var y = (r.top - sr.top) * k
      var vw = r.width * k
      var vh = r.height * k
      if (st.x != null) {
        var dx = x - st.x
        var dy = y - st.y
        var moving = Math.abs(dx) + Math.abs(dy) > 1.2
        v.classList.toggle('life-moving', moving)
        if (moving && now - st.t > 85) {
          st.t = now
          var dir = dx >= 0 ? 1 : -1
          puff(sc, x + (dir > 0 ? vw * 0.18 : vw * 0.82), y + vh * 0.9, dir)
        }
      }
      st.x = x
      st.y = y
    }
  }

  /* ---------- the screen loop: camera + spawns ---------- */
  function start (el) {
    stop()
    var slot = el.querySelector('.bgslot')
    if (!slot || reduced()) return
    var key = (slot.querySelector('[data-art]') || {}).getAttribute ? slot.querySelector('[data-art]').getAttribute('data-art') : ''
    var z = ZONES[key] || {}
    var L = div(slot, 'life-layer')
    ;(z.water || []).forEach(function (r) { div(div(slot, 'life-sheen', 'left:' + r[0] + 'px;top:' + r[1] + 'px;width:' + r[2] + 'px;height:' + r[3] + 'px'), 'life-sheen-in') })
    ;(z.falls || []).forEach(function (r) { div(div(slot, 'life-falls', 'left:' + r[0] + 'px;top:' + r[1] + 'px;width:' + r[2] + 'px;height:' + r[3] + 'px'), 'life-falls-in') })
    var scene = el.querySelector('#m-scene')
    var c = { el: el, slot: slot, scene: scene, L: L, z: z, raf: 0, mo: null, px: 0, py: 0, tx: 0, ty: 0, t0: performance.now(), next: {} }
    // the scene itself must stay untransformed: a transform would make it a stacking context and sink controls that
    // sit above the tray (Jalan's hold button). Its children ride the camera one by one instead.
    c.world = function () { return scene ? [slot].concat(Array.prototype.slice.call(scene.children)) : [slot] }
    function onMove (ev) {
      var r = el.getBoundingClientRect()
      if (!r.width) return
      c.tx = Math.max(-1, Math.min(1, ((ev.clientX - r.left) / r.width) * 2 - 1))
      c.ty = Math.max(-1, Math.min(1, ((ev.clientY - r.top) / r.height) * 2 - 1))
    }
    function onTilt (ev) {
      if (ev.gamma == null) return
      c.tx = Math.max(-1, Math.min(1, ev.gamma / 25))
      c.ty = Math.max(-1, Math.min(1, ((ev.beta || 0) - 40) / 25))
    }
    // a finger that is down holds the camera still: a held button or a dragged piece must not slide under it
    function onDown () { c.held = true }
    function onUp () { c.held = false }
    w.addEventListener('pointerdown', onDown, true)
    w.addEventListener('pointerup', onUp, true)
    w.addEventListener('pointercancel', onUp, true)
    w.addEventListener('pointermove', onMove, { passive: true })
    w.addEventListener('deviceorientation', onTilt, { passive: true })
    c.off = function () { w.removeEventListener('pointerdown', onDown, true); w.removeEventListener('pointerup', onUp, true); w.removeEventListener('pointercancel', onUp, true); w.removeEventListener('pointermove', onMove); w.removeEventListener('deviceorientation', onTilt) }
    if (scene) {
      Array.prototype.forEach.call(scene.querySelectorAll('[data-art^="veh-"]'), dress)
      c.mo = new MutationObserver(function (list) {
        list.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes, function (n) {
            if (n.nodeType !== 1) return
            if (isVeh(n)) dress(n)
            if (n.querySelectorAll) Array.prototype.forEach.call(n.querySelectorAll('[data-art^="veh-"]'), dress)
          })
        })
      })
      c.mo.observe(scene, { childList: true, subtree: true })
    }
    var every = { glint: 260, ripple: 2600, mist: 320, birds: 16000, leaf: 3800 }
    function due (name, now) {
      if (!c.next[name]) c.next[name] = now + rnd(0.2, 1) * every[name]
      if (now < c.next[name]) return false
      c.next[name] = now + every[name] * rnd(0.7, 1.3)
      return true
    }
    function tick (now) {
      c.raf = requestAnimationFrame(tick)
      if (document.hidden || !el.classList.contains('on') || !el.isConnected) return
      // camera: slow figure-eight drift plus the pointer / tilt target, eased
      if (c.held) { c.t0 += now - (c.last || now) } // the drift clock stops too, so release resumes without a jump
      c.last = now
      var t = (now - c.t0) / 1000
      if (!c.held) {
        c.px += (c.tx - c.px) * 0.05
        c.py += (c.ty - c.py) * 0.05
      }
      var x = Math.sin(t * 0.21) * 5 - c.px * 9
      var y = Math.sin(t * 0.33) * 3 - c.py * 5
      var tr = x.toFixed(2) + 'px ' + y.toFixed(2) + 'px'
      var world = c.world()
      for (var i = 0; i < world.length; i++) if (world[i].style.translate !== tr && !world[i].classList.contains('life-puff')) world[i].style.translate = tr
      L.style.translate = (-c.px * 5).toFixed(2) + 'px ' + (-c.py * 3).toFixed(2) + 'px'
      if (L.childElementCount < 22) {
        if (z.water && due('glint', now)) glint(L, z)
        if (z.water && due('ripple', now)) ripple(L, z)
        if (z.falls && due('mist', now)) mist(L, z)
        if (z.birds && due('birds', now)) birds(L, z)
        if (z.leaves && due('leaf', now)) leaf(L, z)
      }
      trackVehicles(c, now)
    }
    c.raf = requestAnimationFrame(tick)
    cur = c
  }
  function stop () {
    if (!cur) return
    cancelAnimationFrame(cur.raf)
    if (cur.mo) cur.mo.disconnect()
    cur.off()
    cur.world().forEach(function (n) { n.style.translate = '' })
    if (cur.L.parentNode) cur.L.parentNode.removeChild(cur.L)
    Array.prototype.forEach.call(cur.slot.querySelectorAll('.life-sheen,.life-falls'), function (n) { n.parentNode.removeChild(n) })
    cur = null
  }
  w.BlippiLife = { start: start, stop: stop, zones: ZONES, live: function () { return cur ? { key: cur.slot.querySelector('[data-art]').getAttribute('data-art'), spawned: cur.L.childElementCount, vehicles: cur.scene ? cur.scene.querySelectorAll('.life-veh').length : 0 } : null } }
})(window)
