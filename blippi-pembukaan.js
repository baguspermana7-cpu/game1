/* G32 Blippi -- W01-M05 "Hari Pembukaan Taman" (PRD 11.2 finale: the CHILD chooses the order of three jobs), played INSIDE bg-w01-m05-pembukaan.
 * 1 RENCANA: tap the three job cards in the order you want (PASIR, GERBANG, MAINAN). Toys need the sand first: asking for them earlier gets a kind reason, never a fail.
 * 2 KERJA: the jobs run in YOUR order; the next one glows, tap its place (sand pit / gate wall / playground). Tapping another place says whose turn it is.
 * 3 BUKA: tap the new gate and the park opens. A different order = a different build sequence on screen. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var JOBS = {
    pasir: { n: 'PASIR', art: 'pc-sand-flat', zone: { x: 290, y: 272, w: 460, h: 140 } },
    gerbang: { n: 'GERBANG', art: 'pc-gate-closed', zone: { x: 752, y: 222, w: 240, h: 196 } },
    mainan: { n: 'MAINAN', art: 'pc-slide', zone: { x: 330, y: 138, w: 420, h: 124 } }
  }
  var ORDER_IDS = ['pasir', 'gerbang', 'mainan']
  var PADS = [{ x: 350, y: 308, w: 160, h: 90 }, { x: 560, y: 318, w: 160, h: 90 }]
  var SLIDE = { x: 322, y: 232, w: 210, h: 132 }
  var SWING = { x: 548, y: 256, w: 190, h: 112 }
  var GATE = { x: 760, y: 236, w: 226, h: 156 }
  var CARDS = { x: 24, y: 452, w: 436, h: 226 }

  var mod = { mount: function (api) {
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var order = saved.order || []
    var done = saved.done || []
    var opened = !!saved.opened
    var busy = false
    var cards = {}
    var zones = {}
    var hand = K.hand(api)
    if (rs && rs.step >= 1 && order.length < 3) order = ORDER_IDS.slice()

    function save () { api.persist({ order: order, done: done, opened: opened }) }
    function nextJob () { var i; for (i = 0; i < order.length; i++) if (done.indexOf(order[i]) < 0) return order[i]; return null }

    // ---- built results (drawn again after a reload)
    var built = {}
    function showSand (anim) {
      PADS.forEach(function (p, i) {
        var e = api.art(sc, 'pc-sand-flat', p.x, p.y, p.w, p.h, 'built')
        e.setAttribute('data-built', 'pasir' + i)
        e.style.zIndex = '2'
        e.style.pointerEvents = 'none'
        if (anim) K.land(api, e)
      })
    }
    function showGate () {
      var g = api.art(sc, opened ? 'pc-gate-open' : 'pc-gate-closed', GATE.x, GATE.y, GATE.w, GATE.h, 'built')
      g.setAttribute('data-built', 'gerbang')
      g.style.zIndex = '4'
      g.style.pointerEvents = 'none'
      built.gate = g
      return g
    }
    function showToys () {
      var a = api.art(sc, 'pc-slide', SLIDE.x, SLIDE.y, SLIDE.w, SLIDE.h, 'built')
      var b = api.art(sc, 'pc-swing', SWING.x, SWING.y, SWING.w, SWING.h, 'built')
      a.setAttribute('data-built', 'slide'); b.setAttribute('data-built', 'swing')
      a.style.zIndex = b.style.zIndex = '3'
      a.style.pointerEvents = b.style.pointerEvents = 'none'
      return [a, b]
    }
    if (done.indexOf('pasir') >= 0) showSand(false)
    if (done.indexOf('gerbang') >= 0) showGate()
    if (done.indexOf('mainan') >= 0) showToys()

    // ---- the plan cards
    var panel = api.at(sc, 'panel', CARDS.x, CARDS.y, CARDS.w, CARDS.h)
    panel.setAttribute('data-jobs', '1')
    panel.style.zIndex = '6'
    function renderCards () {
      panel.innerHTML = ''
      cards = {}
      ORDER_IDS.forEach(function (id, i) {
        var j = JOBS[id]
        var c = api.at(panel, 'pcard', 14 + i * 138, 16, 126, CARDS.h - 40, 'button')
        c.type = 'button'
        c.setAttribute('data-job', id)
        c.setAttribute('aria-label', j.n.toLowerCase())
        var pos = order.indexOf(id)
        c.style.cssText += ';background:' + (done.indexOf(id) >= 0 ? 'rgba(46,156,91,.25)' : 'rgba(255,255,255,.75)') + ';border:3px solid ' + (pos >= 0 ? '#FF8A1F' : '#E3C98A') + ';border-radius:22px;cursor:pointer;padding:0;overflow:visible'
        api.art(c, j.art, 12, 40, 102, 78, '')
        var lb = api.at(c, '', 0, CARDS.h - 94, 126, 40)
        lb.style.cssText += ';font:900 22px/40px Fredoka,Nunito,sans-serif;color:#13318A;text-align:center'
        lb.textContent = j.n
        var nb = api.at(c, '', 40, -14, 46, 46)
        nb.style.cssText += ';border-radius:50%;background:#FF8A1F;color:#fff;font:900 30px/46px Fredoka,Nunito,sans-serif;text-align:center;box-shadow:0 3px 6px rgba(0,0,0,.3);' + (pos >= 0 ? '' : 'display:none')
        nb.textContent = String(pos + 1)
        nb.setAttribute('data-order', pos >= 0 ? String(pos + 1) : '')
        cards[id] = c
        c.addEventListener('click', function () { tapCard(id) })
      })
    }
    function tapCard (id) {
      if (api.step() !== 0) return
      api.touch()
      if (api.tool() !== 'rencana') { api.warn(L.wrongTool); api.shakeTool('rencana'); return }
      var pos = order.indexOf(id)
      if (pos >= 0) { order = order.slice(0, pos); api.sfx('tap'); renderCards(); save(); return }   // tap a numbered card: take it (and later ones) back
      if (id === 'mainan' && order.indexOf('pasir') < 0) {
        api.warn(L.toysFirst)
        cards.mainan.classList.remove('shake'); void cards.mainan.offsetWidth; cards.mainan.classList.add('shake')
        K.glow(cards.pasir, 3000)
        return
      }
      order = order.concat([id])
      api.sfx('tap')
      renderCards()
      save()
      if (order.length === 3) {
        api.sfx('ok')
        api.warn(L.planned)
        api.later(function () { api.advance() }, 900)
      }
    }

    // ---- the places (step 2 targets, step 3 gate)
    ORDER_IDS.forEach(function (id) {
      var z = JOBS[id].zone
      var b = api.at(sc, 'jzone', z.x, z.y, z.w, z.h, 'button')
      b.type = 'button'
      b.setAttribute('data-zone', id)
      b.setAttribute('aria-label', 'Tempat ' + JOBS[id].n.toLowerCase())
      b.style.cssText += ';background:none;border:0;padding:0;z-index:5;border-radius:26px;pointer-events:none;cursor:pointer'
      b.addEventListener('click', function () { tapZone(id) })
      zones[id] = b
    })
    function setZones () {
      var s = api.step()
      var nx = s === 1 ? nextJob() : null
      ORDER_IDS.forEach(function (id) {
        var on = (s === 1) || (s === 2 && id === 'gerbang')
        zones[id].style.pointerEvents = on ? 'auto' : 'none'
        zones[id].classList.remove('glow')
        zones[id].style.boxShadow = ''
        zones[id].style.border = '0'
        if ((s === 1 && id === nx) || (s === 2 && id === 'gerbang')) { zones[id].style.border = '5px dashed #FF8A1F'; zones[id].style.background = 'rgba(255,196,64,.2)'; zones[id].classList.add('glow') } else zones[id].style.background = 'none'
      })
    }

    function bucketDrop (pad, cb) {
      var bk = api.art(sc, 'modul-bucket-sempit', pad.x + pad.w / 2 - 115, pad.y - 200, 230, 275, 'bucket')
      bk.style.cssText += ';z-index:7;pointer-events:none;transform-origin:50% 100%'
      if (bk.animate && !api.reduced()) bk.animate([{ transform: 'translateY(-110px) rotate(-14deg)', opacity: 0 }, { transform: 'translateY(8px) rotate(0)', opacity: 1, offset: 0.45 }, { transform: 'translateY(-70px) rotate(8deg)', opacity: 0 }], { duration: 640, easing: 'cubic-bezier(.23,1,.32,1)' })
      api.fx('dust', pad.x + pad.w / 2, pad.y + pad.h / 2, 190)
      api.later(function () { if (bk.parentNode) bk.parentNode.removeChild(bk); if (cb) cb() }, 620)
    }
    function jobPasir (cb) {
      api.sfx('bump')
      bucketDrop(PADS[0], function () {
        api.sfx('bump')
        bucketDrop(PADS[1], function () { showSand(true); api.fx('gold-star', 530, 340, 200); cb() })
      })
    }
    function jobGerbang (cb) {
      var g = showGate()
      K.land(api, g)
      api.sfx('bump')
      api.fx('spark', GATE.x + GATE.w / 2, GATE.y + GATE.h, 200)
      api.later(cb, 700)
    }
    function jobMainan (cb) {
      var cart = api.art(sc, 'pc-cart', 1040, 470, 150, 122, 'cartpiece')
      cart.style.cssText += ';z-index:6;pointer-events:none'
      api.sfx('honk')
      api.tween({ x: 1040, y: 470 }, { x: 650, y: 380 }, 1500, function (p) { cart.style.left = p.x + 'px'; cart.style.top = p.y + 'px' }, function () {
        api.sfx('collect')
        var t = showToys()
        t.forEach(function (e) { K.land(api, e) })
        api.fx('confetti', 540, 300, 300)
        if (cart.animate && !api.reduced()) cart.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' })
        api.later(function () { if (cart.parentNode) cart.parentNode.removeChild(cart); cb() }, 560)
      })
    }
    var RUN = { pasir: jobPasir, gerbang: jobGerbang, mainan: jobMainan }

    function tapZone (id) {
      var s = api.step()
      api.touch()
      if (busy) return
      if (s === 1) {
        if (api.tool() !== 'kerja') { api.warn(L.wrongTool); api.shakeTool('kerja'); return }
        var nx = nextJob()
        if (id !== nx) { api.warn(L.turn); zones[id].classList.remove('shake'); void zones[id].offsetWidth; zones[id].classList.add('shake'); K.glow(zones[nx], 3000); return }
        runJob(id)
      } else if (s === 2) {
        if (id !== 'gerbang') return
        if (api.tool() !== 'buka') { api.warn(L.wrongTool); api.shakeTool('buka'); return }
        openPark()
      }
    }
    function runJob (id) {
      busy = true
      zones[id].style.pointerEvents = 'none'
      RUN[id](function () {
        busy = false
        done = done.concat([id])
        save()
        renderCards()
        if (done.length >= 3) { api.warn(L.ready); api.later(function () { api.advance() }, 700) } else { api.warn(L.done1); setZones() }
      })
    }
    function openPark () {
      busy = true
      opened = true
      api.sfx('ok')
      if (built.gate && built.gate.parentNode) built.gate.parentNode.removeChild(built.gate)
      var g = showGate()
      K.land(api, g)
      api.fx('confetti', 870, 300, 380)
      api.fx('gold-star', 870, 330, 260)
      save()
      api.later(function () { busy = false; api.advance() }, 1300)
    }

    renderCards()
    var ctl = {
      onStep: function (n) {
        setZones()
        if (n === 1) { renderCards(); K.glow(zones[nextJob()], 3000) }
        if (n === 2) { panel.style.display = 'none' }
        if (n === 0) renderCards()
      },
      onTool: function () {},
      demo: function () { ctl.hint(1); ctl.hint(3) },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          if (api.tool() !== 'rencana') api.glowTool('rencana', 3000)
          var want = order.length === 0 ? 'pasir' : (ORDER_IDS.filter(function (i) { return order.indexOf(i) < 0 })[0])
          if (lvl === 1) K.glow(cards[want], 3000)
          else if (lvl === 2) { K.glow(cards.pasir, 3000); K.glow(cards[want], 3000) }
          else if (lvl === 3) { var r = cards[want].getBoundingClientRect(); var p = api.toRef(r.left + r.width / 2, r.top + r.height / 2); hand.move([{ x: p.x - 20, y: p.y - 10 }, { x: p.x - 20, y: p.y - 24 }, { x: p.x - 20, y: p.y - 10 }], 400) }
          else if (api.tool() === 'rencana') tapCard(want)
        } else if (s === 1) {
          var nx = nextJob()
          if (!nx) return
          if (api.tool() !== 'kerja') api.glowTool('kerja', 3000)
          K.glow(zones[nx], 3000)
          if (lvl === 3) { var z = JOBS[nx].zone; hand.move([{ x: z.x + z.w / 2 - 40, y: z.y + z.h / 2 - 20 }, { x: z.x + z.w / 2 - 40, y: z.y + z.h / 2 - 40 }, { x: z.x + z.w / 2 - 40, y: z.y + z.h / 2 - 20 }], 400) }
          else if (lvl >= 4 && api.tool() === 'kerja') tapZone(nx)
        } else {
          if (api.tool() !== 'buka') api.glowTool('buka', 3000)
          K.glow(zones.gerbang, 3000)
          if (lvl === 3) { var gz = JOBS.gerbang.zone; hand.move([{ x: gz.x + 90, y: gz.y + 80 }, { x: gz.x + 90, y: gz.y + 64 }, { x: gz.x + 90, y: gz.y + 80 }], 400) }
          if (lvl >= 4 && api.tool() === 'buka') tapZone('gerbang')
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { busy = false }
    }
    if (rs && rs.step >= 1 && order.length === 3) save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W01-M05', mod)
})(window)
