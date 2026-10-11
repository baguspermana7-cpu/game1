/* G32 Blippi -- W05-M02 "Crane dan Tiga Peti" (PRD 11.6: Build & Use; P05/P07; "Cocokkan peti dengan tempat bongkar, pilih urutan"; V04 = MOBILE CRANE with a HOOK on a rope), played INSIDE bg-w05-m02-crane-peti.
 * The harbour crane painted in the plate is the crane (Blippi in its cab); its hook hangs on a rope from the boom and the child drags it. Three crates (a stamp on each: circle, square, triangle) lie on the quay,
 * the three shapes are painted on the deck.
 * 1 COCOK  (match the shape): hook a crate, lower it onto the painted shape with the same stamp (ghost crate there). Wrong shape: it goes back and the line says which shape it is. Then "Bentuk mana punya 3 sisi?".
 * 2 SUSUN  (order, sizes): a BIG and a SMALL crate arrive; stack them on the left: big first (a small one under a big one would be crushed: kind line, back it goes), small on top.
 * 3 HITUNG (count aloud): tap the five crates from the left, a number pops over each; then "Berapa semuanya?" (pictures) and a SoalEngine maths question. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var NS = 'http://www.w3.org/2000/svg'
  var TIP = { x: 1140, y: 84 }
  var HW = 92
  var HH = 94
  var CW = 140
  var CH = 105
  // shape crates: where they lie on the quay (never under their own shape) and where they belong (centre of the painted outline)
  var SHAPES = {
    lingkaran: { name: 'lingkaran', home: { x: 790, y: 560 }, goal: { x: 425, y: 480 } },
    persegi: { name: 'persegi', home: { x: 1150, y: 566 }, goal: { x: 795, y: 482 } },
    segitiga: { name: 'segitiga', home: { x: 390, y: 556 }, goal: { x: 1185, y: 486 } }
  }
  var ORDER = ['lingkaran', 'persegi', 'segitiga']
  var BIG = { w: 190, h: 142, home: { x: 560, y: 548 }, goal: { x: 70, y: 414 } }
  var SMALL = { w: 110, h: 82, home: { x: 930, y: 580 }, goal: { x: 110, y: 332 } }

  function stamp (parent, kind, w0, h0) {
    var s = document.createElementNS(NS, 'svg')
    s.setAttribute('viewBox', '0 0 100 100')
    var sz = Math.round(Math.min(w0, h0) * 0.46)
    s.style.cssText = 'position:absolute;left:' + Math.round((w0 - sz) / 2) + 'px;top:' + Math.round(h0 * 0.18) + 'px;width:' + sz + 'px;height:' + sz + 'px;pointer-events:none'
    var g = kind === 'lingkaran' ? '<circle cx="50" cy="50" r="40"/>' : (kind === 'persegi' ? '<rect x="12" y="12" width="76" height="76" rx="6"/>' : '<path d="M50 10 L92 88 L8 88 Z" stroke-linejoin="round"/>')
    s.innerHTML = '<g fill="#fff" stroke="#13318A" stroke-width="9">' + g + '</g>'
    parent.appendChild(s)
    return s
  }

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var step0 = api.restore ? api.restore.step : 0
    var placed = saved.placed || {}     // 'lingkaran'|'persegi'|'segitiga'|'big'|'small' -> true
    var busy = false
    var hd = null
    var carrying = null
    if (step0 >= 1) ORDER.forEach(function (k) { placed[k] = true })
    if (step0 >= 2) { placed.big = true; placed.small = true }
    var counted = 0
    function save () { api.persist({ placed: placed }) }

    // ---- Blippi in the painted crane's cab
    var cab = api.at(sc, 'cabwin', 1380, 182, 76, 78)
    cab.style.cssText += ';z-index:3;pointer-events:none;border-radius:12px'
    cab.setAttribute('data-crane', '1')
    K.driver(cab, { x: 0, y: 0, w: 1, h: 1 })

    // ---- rope + hook
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
    var hp = { x: 0, y: 0 }
    var loadW = 0
    var loadH = 0
    function hookRest () { return { x: TIP.x - HW / 2 - 6, y: TIP.y + 70 } }
    function hb () { return { x: hp.x + HW / 2, y: hp.y + HH } }
    function setHook (x, y) {
      hp = { x: x, y: y }
      hook.style.transform = 'translate(' + x + 'px,' + y + 'px)'
      rope.setAttribute('d', 'M' + TIP.x + ',' + TIP.y + ' Q' + ((TIP.x + x + HW / 2) / 2 + 6) + ',' + ((TIP.y + y + 20) / 2 + 14) + ' ' + (x + HW / 2) + ',' + (y + 14))
      if (carrying) { var b = hb(); load.style.transform = 'translate(' + (b.x - loadW / 2) + 'px,' + (b.y - 14) + 'px)' }
    }
    setHook(hookRest().x, hookRest().y)
    function b0x () { return hb().x }
    function b0y () { return hb().y }
    function home () { var r = hookRest(); api.tween({ x: hp.x, y: hp.y }, r, 380, function (q) { setHook(q.x, q.y) }) }

    // ---- crates: id -> { el, w, h, home, goal, shape }
    var crates = {}
    function mkCrate (id, w0, h0, home, shape, big) {
      var c = api.at(sc, 'quaycrate', home.x, home.y, w0, h0)
      c.setAttribute('data-piece', id)
      c.style.cssText += ';z-index:4;pointer-events:none'
      api.art(c, 'pc2-peti', 0, 0, w0, h0, '')
      if (shape) stamp(c, shape, w0, h0)
      if (c.animate && !api.reduced()) c.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 1900 + w0 * 3, iterations: Infinity, easing: 'ease-in-out' })
      var it = { id: id, el: c, w: w0, h: h0, home: home, shape: shape, big: !!big, used: false }
      crates[id] = it
      return it
    }
    ORDER.forEach(function (k) { mkCrate(k, CW, CH, SHAPES[k].home, k) })
    var cBig = mkCrate('big', BIG.w, BIG.h, BIG.home, null, true)
    var cSmall = mkCrate('small', SMALL.w, SMALL.h, SMALL.home, null)
    function crateGoal (it) {
      if (it.shape) { var g = SHAPES[it.shape].goal; return { x: g.x - it.w / 2, y: g.y - it.h + 24 } }
      return it.id === 'big' ? BIG.goal : SMALL.goal
    }
    function seat (it) {
      var g = crateGoal(it)
      it.el.style.left = g.x + 'px'
      it.el.style.top = g.y + 'px'
      it.el.style.display = 'block'
      it.el.style.visibility = 'visible'
      it.el.style.zIndex = '4'
      it.used = true
      it.el.setAttribute('data-landed', it.id)
    }
    ORDER.forEach(function (k) { if (placed[k]) seat(crates[k]) })
    if (placed.big) seat(cBig)
    if (placed.small) seat(cSmall)
    cBig.el.style.display = step0 >= 1 ? 'block' : 'none'
    cSmall.el.style.display = step0 >= 1 ? 'block' : 'none'
    if (step0 < 1) { cBig.el.style.visibility = 'hidden'; cSmall.el.style.visibility = 'hidden' }

    // ---- ghosts: the crate (with its stamp) where it will stand
    var ghosts = {}
    function mkGhost (id, w0, h0, pos, shape) {
      var g = K.ghost(api, sc, 'pc2-peti', pos.x, pos.y, w0, h0, false, true)
      g.setAttribute('data-ghost', id)
      g.style.zIndex = '3'
      if (shape) stamp(g, shape, w0, h0)
      ghosts[id] = g
      return g
    }
    ORDER.forEach(function (k) { var it = crates[k]; var gp = crateGoal(it); mkGhost(k, CW, CH, gp, k); if (placed[k]) ghosts[k].style.display = 'none' })
    mkGhost('big', BIG.w, BIG.h, BIG.goal)
    mkGhost('small', SMALL.w, SMALL.h, SMALL.goal)
    ghosts.big.style.display = 'none'
    ghosts.small.style.display = 'none'

    // ---- the hook drag
    var drag = null
    var hookStart = null
    function active () { var s = api.step(); return s === 0 || s === 1 }
    function centre (it) { return { x: it.home.x + it.w / 2, y: it.home.y + it.h / 2 } }
    function pickable () { var l = []; Object.keys(crates).forEach(function (k) { var it = crates[k]; if (!it.used && ((api.step() === 0 && it.shape) || (api.step() === 1 && !it.shape))) l.push(it) }); return l }
    hook.addEventListener('pointerdown', function (ev) {
      if (busy || drag || !active()) return
      api.touch()
      var r = B.toRef(ev.clientX, ev.clientY)
      drag = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0 }
      hookStart = { x: hp.x, y: hp.y }
      hook.classList.remove('glow')
      try { hook.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
    })
    hook.addEventListener('pointermove', function (ev) {
      if (!drag || ev.pointerId !== drag.id) return
      var r = B.toRef(ev.clientX, ev.clientY)
      drag.moved = Math.max(drag.moved, Math.abs(r.x - drag.x0) + Math.abs(r.y - drag.y0))
      setHook(hookStart.x + (r.x - drag.x0), hookStart.y + (r.y - drag.y0))
    })
    function attach (it) {
      carrying = it
      loadW = it.w
      loadH = it.h
      load.innerHTML = ''
      load.style.width = it.w + 'px'
      load.style.height = it.h + 'px'
      load.style.display = 'block'
      api.art(load, 'pc2-peti', 0, 0, it.w, it.h, '')
      if (it.shape) stamp(load, it.shape, it.w, it.h)
      it.el.style.visibility = 'hidden'
      setHook(hp.x, hp.y)
    }
    function setBack (it) { carrying = null; load.style.display = 'none'; it.el.style.visibility = 'visible' }
    function endDrag (ev, cancel) {
      if (!drag || ev.pointerId !== drag.id) return
      var d = drag
      drag = null
      if (cancel) { if (carrying) setBack(carrying); home(); return }
      var b = hb()
      if (carrying) {
        var it = carrying
        var bc = { x: b.x, y: b.y + it.h / 2 - 8 }
        carrying = null
        load.style.display = 'none'
        if (drop(it, bc)) { home(); return }
        it.el.style.visibility = 'visible'
        home()
        return
      }
      if (d.moved > 10) {
        var best = null
        var bd = 140
        pickable().forEach(function (q) { var c = centre(q); var dd = Math.hypot(b.x - c.x, b.y + 20 - c.y); if (dd < bd) { bd = dd; best = q } })
        if (best) {
          K.juice(api, 'pop', b.x, b.y)
          K.juice(api, 'whirr', b.x, b.y - 40)
          attach(best)
          api.warn(L.lifted)
          api.tween({ x: hp.x, y: hp.y }, { x: hp.x, y: hp.y - 60 }, 300, function (q) { setHook(q.x, q.y) })
          return
        }
      }
      api.warn(L.dragHook)
      pickable().forEach(function (q) { K.glow(q.el, 2400) })
      home()
    }
    hook.addEventListener('pointerup', function (ev) { endDrag(ev, false) })
    hook.addEventListener('pointercancel', function (ev) { endDrag(ev, true) })
    hook.addEventListener('lostpointercapture', function (ev) { if (drag && ev.pointerId === drag.id) endDrag(ev, true) })

    function land (it) {
      seat(it)
      placed[it.id] = true
      if (ghosts[it.id]) ghosts[it.id].style.display = 'none'
      K.land(api, it.el)
      K.juice(api, 'whirr', TIP.x, TIP.y + 60)
      api.sfx('bump')
      var g = crateGoal(it)
      K.juice(api, 'cheer', g.x + it.w / 2, g.y)
      api.fx('dust', g.x + it.w / 2, g.y + it.h, 140)
      save()
    }
    function drop (it, bc) {
      var s = api.step()
      if (s === 0) {
        // nearest painted shape to where the crate is let go
        var near = null
        var nd = 190
        ORDER.forEach(function (k) { var g = SHAPES[k].goal; var dd = Math.hypot(bc.x - g.x, bc.y - g.y); if (dd < nd) { nd = dd; near = k } })
        if (!near) { api.warn(L.dropMiss); return false }
        if (near !== it.shape) {
          api.warn(L.wrongShape.replace('%s', it.shape).replace('%s', it.shape))
          K.juice(api, 'wobble', b0x(), b0y(), hook)
          K.glow(ghosts[it.shape], 3200)
          return false
        }
        land(it)
        var left = ORDER.filter(function (k) { return !placed[k] }).length
        if (left === 0) {
          api.warn(L.shapesDone)
          api.later(function () {
            K.ask(api, { custom: { id: 'k02-shape', prompt: 'Bentuk mana yang punya 3 sisi?', choices: ['Lingkaran', 'Persegi', 'Segitiga'], answer: 'Segitiga', hint1: 'Hitung sisinya. Segitiga punya tiga sisi.' }, done: function () { api.advance() } })
          }, 800)
        } else api.warn(L.placed)
        return true
      }
      // step 1: stack, big first
      var g0 = BIG.goal
      var onStack = Math.hypot(bc.x - (g0.x + BIG.w / 2), bc.y - (g0.y + BIG.h / 2)) < 200 || Math.hypot(bc.x - (SMALL.goal.x + SMALL.w / 2), bc.y - (SMALL.goal.y + SMALL.h / 2)) < 130
      if (!onStack) { api.warn(L.dropMiss); return false }
      if (it.id === 'small' && !placed.big) {
        api.warn(L.bigFirst)
        K.juice(api, 'wobble', hb().x, hb().y, hook)
        K.glow(ghosts.big, 3200)
        return false
      }
      if (it.id === 'big' && placed.big) return false
      if (it.id === 'big') {
        land(it)
        ghosts.small.style.display = 'block'
        api.warn(L.placed)
        return true
      }
      land(it)
      api.warn(L.stacked)
      api.fx('gold-star', SMALL.goal.x + 55, SMALL.goal.y, 200)
      api.later(function () { api.advance() }, 900)
      return true
    }

    // ---- step 2: tap the five crates from the left
    var seq = ['big', 'small', 'lingkaran', 'persegi', 'segitiga']
    seq.forEach(function (id, i) {
      var el = crates[id].el
      el.addEventListener('pointerdown', function () {
        if (api.step() !== 2 || busy) return
        api.touch()
        if (el.getAttribute('data-counted')) return
        if (i !== counted) { api.warn(L.order); K.glow(crates[seq[counted]].el, 2400); return }
        counted++
        el.setAttribute('data-counted', '1')
        el.classList.remove('glow')
        var n = api.at(sc, 'cnum', crates[id].el.offsetLeft + crates[id].w / 2 - 30, crates[id].el.offsetTop - 44, 60, 60)
        n.style.cssText += ';z-index:15;pointer-events:none;border-radius:50%;background:#fff;border:5px solid #13318A;color:#13318A;font:900 38px/50px Fredoka,Nunito,sans-serif;text-align:center'
        n.textContent = String(counted)
        n.setAttribute('data-num', String(counted))
        K.land(api, n)
        K.juice(api, 'pop', crates[id].el.offsetLeft + crates[id].w / 2, crates[id].el.offsetTop, el)
        api.sfx('ok')
        if (counted < 5) { K.glow(crates[seq[counted]].el, 2600); return }
        busy = true
        api.later(function () {
          K.ask(api, { custom: { id: 'k02-count', prompt: 'Berapa peti semuanya?', choices: ['4', '5', '6'], answer: '5', count: { key: 'pc2-peti', n: 5 }, hint1: 'Hitung lagi dari kiri. Ada satu, dua, tiga, empat, lima.' }, done: function () {
            api.fx('confetti', 836, 380, 300)
            api.later(function () { K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { api.later(function () { busy = false; api.advance() }, 300) } }) }, 500)
          } })
        }, 700)
      })
    })

    var ctl = {
      onStep: function (n) {
        if (n === 1) {
          ;[cBig, cSmall].forEach(function (it, i) {
            it.el.style.visibility = 'visible'
            it.el.style.display = 'block'
            api.later(function () { K.land(api, it.el) }, i * 250)
          })
          ghosts.big.style.display = 'block'
          ghosts.small.style.display = placed.big ? 'block' : 'none'
        }
        if (n === 2) {
          ;['big', 'small'].forEach(function (k) { ghosts[k].style.display = 'none' })
          seq.forEach(function (id) { crates[id].el.style.pointerEvents = 'auto'; crates[id].el.style.cursor = 'pointer' })
          K.glow(crates[seq[0]].el, 3000)
        }
        if (n < 2) K.glow(hook, 3000)
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) { var q = pickable()[0]; if (q) { var c = centre(q); var g = SHAPES[q.shape].goal; hd.move([{ x: c.x - 20, y: c.y - 40 }, { x: g.x - 20, y: g.y - 40 }], 1500) } }
        else if (n === 1) { var big = placed.big ? cSmall : cBig; var c1 = centre(big); var gg = placed.big ? SMALL.goal : BIG.goal; hd.move([{ x: c1.x - 20, y: c1.y - 40 }, { x: gg.x + 40, y: gg.y + 30 }], 1500) }
        else { var e = crates[seq[counted]].el; hd.move([{ x: e.offsetLeft + e.offsetWidth / 2 - 20, y: e.offsetTop + 20 }, { x: e.offsetLeft + e.offsetWidth / 2 - 20, y: e.offsetTop + 20 }], 1800) }
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 2) { K.glow(crates[seq[counted]].el, 3000); if (lvl >= 4 && !busy) { var e = crates[seq[counted]].el; e.dispatchEvent(new w.Event('pointerdown')) } return }
        K.glow(hook, 3000)
        var q = pickable()[0]
        if (!q) return
        K.glow(q.el, 3000)
        var gh = ghosts[q.shape || q.id]
        if (lvl >= 2 && gh) K.glow(gh, 3000)
        if (lvl >= 4 && !busy && !carrying) {
          if (q.id === 'small' && !placed.big) q = cBig
          land(q)
          if (s === 0) {
            if (ORDER.filter(function (k) { return !placed[k] }).length === 0) api.later(function () { api.advance() }, 600)
          } else if (q.id === 'big') ghosts.small.style.display = 'block'
          else api.later(function () { api.advance() }, 600)
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () {}
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W05-M02', mod)
})(window)
