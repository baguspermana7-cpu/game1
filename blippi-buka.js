/* G32 Blippi -- W03-M05 "Eco Park Dibuka" (PRD 11.4: Finale; P01/P07/P08; "Pilih pembagian tugas pickup, sapu, dan penempatan dekorasi"; replay "ubah layout hasil konstruksi"; V07 recycling truck + V08 street sweeper), played INSIDE bg-w03-m05-eco-dibuka.
 * Litter waits at the middle, a patch of leaves at the right, and both vehicles (Blippi in each cab) are parked: the truck left, the sweeper right.
 * 1 BAGI    (assign the jobs): drag each vehicle to a job. The recycling truck lifts the litter into its hopper, the street sweeper brushes the leaves away; the wrong vehicle floats back and says who does that job. Then 3 + 2 = ?.
 * 2 HIAS    (decorate, YOUR layout): the swing, the slide and the see-saw lie on the blue pad; drag each onto any of the three stone pads (ghost pieces on the pads). Then "Berapa mainan taman?".
 * 3 BUKA    (open): tap the ribbon; it is cut, fireworks, the visitors run in. Then "Berapa pengunjung?" and a maths-only SoalEngine question. Badge W03 + the finished island. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var TW = 340
  var TH = 254
  var TS = 0.85
  var NS = 'http://www.w3.org/2000/svg'
  var TRUCK = { home: { x: 330, y: 735 }, work: { x: 820, y: 735 }, away: { x: 180, y: 735 } }
  var SWEEP = { home: { x: 1520, y: 735 }, work: { x: 1360, y: 735 }, away: { x: 1560, y: 735 } }
  var LITTER = { x: 580, y: 590, w: 260, h: 140 }
  var LEAF = { x: 1120, y: 570, w: 260, h: 165 }
  var JOB = { litter: { x: 710, y: 660 }, leaf: { x: 1250, y: 655 } }
  var PADS = [{ x: 853, y: 480 }, { x: 1320, y: 575 }, { x: 1330, y: 725 }]
  var DECOR = [
    { id: 'ayun', key: 'pc-swing', w: 190, h: 113, x: 700, y: 610 },
    { id: 'seluncur', key: 'pc-slide', w: 190, h: 119, x: 910, y: 606 },
    { id: 'jungkat', key: 'prop-jungkat', w: 190, h: 113, x: 1120, y: 610 }
  ]
  var RIB = { x: 790, y: 560, w: 330, h: 150 }

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var step0 = rs ? rs.step : 0
    var jobs = saved.jobs || {}
    var put = saved.put || {}                        // decor id -> pad index
    var busy = false
    var hd = null
    function save () { api.persist({ jobs: jobs, put: put }) }
    if (step0 >= 1) { jobs.litter = true; jobs.leaf = true }
    if (step0 >= 2) DECOR.forEach(function (d, i) { if (put[d.id] == null) put[d.id] = i })

    // ---- vehicles (each carries Blippi in the cab)
    function makeVeh (id, key, label, win, pos, flip) {
      var v = api.at(sc, '', 0, 0, TW, TH, 'button')
      v.type = 'button'
      v.setAttribute('data-veh-btn', id)
      v.setAttribute('aria-label', label)
      v.style.cssText += ';background:none;border:0;padding:0;z-index:6;touch-action:none;transform-origin:50% 100%;cursor:grab'
      var a = api.art(v, key, 0, 0, TW, TH, '')
      a.setAttribute('data-veh', id)
      K.driver(v, win)
      var sh = api.at(sc, 'shd', 0, 0, 290, 40)
      sh.style.zIndex = '5'
      var o = { id: id, el: v, shade: sh, flip: flip, pos: { x: pos.x, y: pos.y } }
      o.place = function (x, y, sq) {
        o.pos = { x: x, y: y }
        v.style.transform = 'translate(' + (x - TW / 2) + 'px,' + (y - TH) + 'px) scale(' + TS + ',' + (TS * (sq || 1)) + ')'
        sh.style.transform = 'translate(' + (x - 145 * TS) + 'px,' + (y - 24) + 'px) scale(' + TS + ')'
      }
      o.place(pos.x, pos.y)
      return o
    }
    var truck = makeVeh('truck', 'veh-recycling-truck', 'Truk daur ulang', { x: 0.71, y: 0.27, w: 0.25, h: 0.22 }, jobs.litter ? TRUCK.away : TRUCK.home)
    var sweeper = makeVeh('sweeper', 'veh-street-sweeper', 'Truk sapu jalan', { x: 0.25, y: 0.2, w: 0.2, h: 0.3 }, jobs.leaf ? SWEEP.away : SWEEP.home)

    // ---- the two jobs
    var litter = api.at(sc, 'job', LITTER.x, LITTER.y, LITTER.w, LITTER.h)
    litter.setAttribute('data-job', 'litter')
    litter.style.cssText += ';z-index:4;pointer-events:none'
    ;[['w3-koran', 0, 10], ['w3-gelas', 85, 0], ['w3-kaleng2', 160, 12]].forEach(function (q, i) {
      var e = api.at(litter, '', q[1], q[2], 110, 110)
      api.art(e, q[0], 0, 0, 110, 110, '')
      if (e.animate && !api.reduced()) e.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 1600 + i * 200, iterations: Infinity, easing: 'ease-in-out' })
    })
    var leaf = api.at(sc, 'job', LEAF.x, LEAF.y, LEAF.w, LEAF.h)
    leaf.setAttribute('data-job', 'leaf')
    leaf.style.cssText += ';z-index:4;pointer-events:none'
    api.art(leaf, 'w3-daun', 0, 0, LEAF.w, LEAF.h, '')
    if (jobs.litter) litter.style.display = 'none'
    if (jobs.leaf) leaf.style.display = 'none'
    var gT = K.ghost(api, sc, 'veh-recycling-truck', TRUCK.work.x - TW * TS / 2, TRUCK.work.y - TH * TS, TW * TS, TH * TS)
    gT.setAttribute('data-goal', 'litter')
    var gS = K.ghost(api, sc, 'veh-street-sweeper', SWEEP.work.x - TW * TS / 2, SWEEP.work.y - TH * TS, TW * TS, TH * TS)
    gS.setAttribute('data-goal', 'leaf')
    if (jobs.litter) gT.style.display = 'none'
    if (jobs.leaf) gS.style.display = 'none'

    function drag (o, onDrop) {
      var d = null
      o.el.addEventListener('pointerdown', function (ev) {
        if (api.step() !== 0 || busy || d || jobs[o.id === 'truck' ? 'litter' : 'leaf']) return
        api.touch()
        var r = B.toRef(ev.clientX, ev.clientY)
        d = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r, ox: o.pos.x, oy: o.pos.y }
        o.el.classList.remove('glow')
        try { o.el.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      })
      o.el.addEventListener('pointermove', function (ev) {
        if (!d || ev.pointerId !== d.id) return
        var r = B.toRef(ev.clientX, ev.clientY)
        d.p = r
        d.moved = Math.max(d.moved, Math.abs(r.x - d.x0) + Math.abs(r.y - d.y0))
        if (d.moved > 10) o.place(Math.max(150, Math.min(1560, d.ox + r.x - d.x0)), Math.max(560, Math.min(735, d.oy + r.y - d.y0)))
      })
      function end (ev, cancel) {
        if (!d || ev.pointerId !== d.id) return
        var cu = d
        d = null
        var back = function () { api.tween({ x: o.pos.x, y: o.pos.y }, { x: cu.ox, y: cu.oy }, 320, function (p) { o.place(p.x, p.y) }) }
        if (cancel || cu.moved <= 10) { if (!cancel) api.warn(L.dragVeh); back(); return }
        var job = null
        ;['litter', 'leaf'].forEach(function (k) { if (K.within(cu.p, JOB[k].x, JOB[k].y, 230) && !jobs[k]) job = k })
        if (!job) { api.warn(L.toJob); back(); return }
        if ((job === 'litter') !== (o.id === 'truck')) { api.warn(o.id === 'truck' ? L.truckLeaf : L.sweepLitter); back(); K.glow(o.id === 'truck' ? sweeper.el : truck.el, 2600); return }
        work(o, job)
      }
      o.el.addEventListener('pointerup', function (ev) { end(ev, false) })
      o.el.addEventListener('pointercancel', function (ev) { end(ev, true) })
      o.el.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
    }
    drag(truck)
    drag(sweeper)

    function work (o, job) {
      busy = true
      var tgt = o.id === 'truck' ? TRUCK : SWEEP
      api.sfx('honk')
      if (job === 'litter') gT.style.display = 'none'; else gS.style.display = 'none'
      api.tween({ x: o.pos.x, y: o.pos.y }, tgt.work, 650, function (p) { o.place(p.x, p.y) }, function () {
        if (job === 'litter') {
          // the hopper takes the three things one by one, the truck squashes a little
          var kids = [].slice.call(litter.children)
          var i = 0
          var next = function () {
            if (i >= kids.length) { done(); return }
            var e = kids[i++]
            e.style.transition = 'transform .4s ease-in, opacity .4s'
            e.style.transform = 'translate(' + (TRUCK.work.x - LITTER.x - 130 - (i * 40)) + 'px,' + (-140) + 'px) scale(.4)'
            e.style.opacity = '0'
            api.sfx('bump'); api.fx('dust', TRUCK.work.x - 90, TRUCK.work.y - 200, 90)
            api.tween({ x: 0.84, y: 0 }, { x: 1, y: 0 }, 300, function (p) { o.place(o.pos.x, o.pos.y, p.x) })
            api.later(next, 480)
          }
          next()
        } else {
          // the brushes drive across the leaf pile and sweep it away
          var from = { x: tgt.work.x, y: tgt.work.y }
          api.tween(from, { x: from.x - 120, y: from.y }, 700, function (p, kk) { o.place(p.x, p.y); leaf.style.opacity = String(1 - kk); leaf.style.transform = 'translateX(' + (-kk * 60) + 'px)'; if (Math.random() < 0.3) api.fx('dust', p.x - 110, p.y - 20, 80) }, function () { done() })
        }
        function done () {
          jobs[job] = true
          if (job === 'litter') litter.style.display = 'none'; else leaf.style.display = 'none'
          api.sfx('ok')
          api.fx('gold-star', JOB[job].x, JOB[job].y - 60, 180)
          var away = tgt.away
          api.tween({ x: o.pos.x, y: o.pos.y }, away, 700, function (p) { o.place(p.x, p.y) })
          save()
          busy = false
          if (jobs.litter && jobs.leaf) {
            api.warn(L.bothDone)
            api.later(function () {
              K.ask(api, { custom: { id: 'm05-sum', prompt: 'Truk angkat 3 sampah, sapu 2 daun. Berapa semuanya?', choices: ['4', '5', '6'], answer: '5', scene: { groups: [{ key: 'w3-koran', n: 1 }, { key: 'w3-gelas', n: 1 }, { key: 'w3-kaleng2', n: 1 }, { key: 'w3-daun', n: 2 }] }, hint1: 'Hitung: 3 sampah, lalu 2 daun lagi.' }, done: function () { api.later(function () { api.advance() }, 400) } })
            }, 700)
          } else api.warn(L.oneDone)
        }
      })
    }

    // ---- step 2: decorations onto the pads (any piece on any pad)
    var padGhost = []
    var decEls = {}
    PADS.forEach(function (p, i) {
      var g = K.ghost(api, sc, 'pc-swing', p.x - 95, p.y - 100, 190, 113)
      g.setAttribute('data-pad', String(i))
      g.style.display = 'none'
      padGhost.push(g)
    })
    function padTaken (i) { var t = false; Object.keys(put).forEach(function (k) { if (put[k] === i) t = true }); return t }
    function showPads () { padGhost.forEach(function (g, i) { g.style.display = padTaken(i) ? 'none' : 'block' }) }
    function placeDecor (d, i, anim) {
      var c = decEls[d.id]
      var p = PADS[i]
      put[d.id] = i
      c.setAttribute('data-placed', String(i))
      c.style.pointerEvents = 'none'
      c.style.transform = 'translate(' + (p.x - d.w / 2 - d.x) + 'px,' + (p.y - d.h + 10 - d.y) + 'px)'
      if (anim) {
        if (c._bob) c._bob.cancel()
        api.sfx('bump'); api.fx('dust', p.x, p.y, 130)
        if (c.animate && !api.reduced()) c.animate([{ transform: c.style.transform + ' scale(1)' }, { transform: c.style.transform + ' scale(1.1,.92)', offset: 0.4 }, { transform: c.style.transform + ' scale(1)' }], { duration: 320 })
      }
      showPads()
    }
    function decorCheck () {
      if (Object.keys(put).length >= DECOR.length) {
        api.sfx('ok'); api.fx('confetti', 836, 560, 340); api.warn(L.decorated)
        api.later(function () {
          K.ask(api, { custom: { id: 'm05-decor', prompt: 'Berapa mainan taman yang kamu pasang?', choices: ['2', '3', '4'], answer: '3', scene: { groups: [{ key: 'pc-swing', n: 1 }, { key: 'pc-slide', n: 1 }, { key: 'prop-jungkat', n: 1 }] }, hint1: 'Ayunan, seluncuran, dan jungkat-jungkit.' }, done: function () { api.later(function () { api.advance() }, 400) } })
        }, 800)
      } else api.warn(L.more)
    }
    DECOR.forEach(function (d, i) {
      var c = api.at(sc, 'decor', d.x, d.y, d.w, d.h, 'button')
      c.type = 'button'
      c.setAttribute('data-decor', d.id)
      c.setAttribute('aria-label', d.id)
      c.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none;display:none'
      api.art(c, d.key, 0, 0, d.w, d.h, '')
      decEls[d.id] = c
      if (!put[d.id] && put[d.id] !== 0 && c.animate && !api.reduced()) c._bob = c.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], { duration: 1700 + i * 180, iterations: Infinity, easing: 'ease-in-out' })
      var dd = null
      c.addEventListener('pointerdown', function (ev) {
        if (api.step() !== 1 || busy || dd || c.getAttribute('data-placed') != null) return
        api.touch()
        var r = B.toRef(ev.clientX, ev.clientY)
        dd = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r }
        c.classList.remove('glow'); c.style.zIndex = '30'
        if (c._bob) c._bob.cancel()
        try { c.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      })
      c.addEventListener('pointermove', function (ev) {
        if (!dd || ev.pointerId !== dd.id) return
        var r = B.toRef(ev.clientX, ev.clientY)
        dd.p = r
        dd.moved = Math.max(dd.moved, Math.abs(r.x - dd.x0) + Math.abs(r.y - dd.y0))
        c.style.transform = 'translate(' + (r.x - dd.x0) + 'px,' + (r.y - dd.y0) + 'px) scale(1.05)'
      })
      function end (ev, cancel) {
        if (!dd || ev.pointerId !== dd.id) return
        var cu = dd
        dd = null
        c.style.zIndex = '7'
        var pi = -1
        var bd = 1e9
        PADS.forEach(function (p, j) { if (padTaken(j)) return; var q = Math.hypot(cu.p.x - p.x, cu.p.y - (p.y - 50)); if (q < 170 && q < bd) { pi = j; bd = q } })
        if (!cancel && cu.moved > 10 && pi >= 0) {
          placeDecor(d, pi, true)
          save()
          decorCheck()
          return
        }
        if (!cancel) { api.warn(cu.moved > 10 ? L.toPad : L.dragDecor); padGhost.forEach(function (g, j) { if (!padTaken(j)) K.glow(g, 2600) }) }
        api.tween({ x: cu.p.x - cu.x0, y: cu.p.y - cu.y0 }, { x: 0, y: 0 }, 280, function (t) { c.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)' }, function () { c.style.transform = '' })
      }
      c.addEventListener('pointerup', function (ev) { end(ev, false) })
      c.addEventListener('pointercancel', function (ev) { end(ev, true) })
      c.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
      if (put[d.id] != null) { c.style.display = 'block'; placeDecor(d, put[d.id], false) }
    })

    // ---- step 3: the ribbon
    var rib = api.at(sc, 'ribbon', RIB.x, RIB.y, RIB.w, RIB.h, 'button')
    rib.type = 'button'
    rib.setAttribute('data-ribbon', '1')
    rib.setAttribute('aria-label', 'Pita pembukaan')
    rib.style.cssText += ';background:none;border:0;padding:0;z-index:8;cursor:pointer;touch-action:manipulation;display:none'
    rib.innerHTML = '<svg viewBox="0 0 330 150" width="330" height="150"><rect x="8" y="30" width="16" height="116" rx="6" fill="#B87A3E"/><rect x="306" y="30" width="16" height="116" rx="6" fill="#B87A3E"/><circle cx="16" cy="28" r="12" fill="#F4761A"/><circle cx="314" cy="28" r="12" fill="#F4761A"/>' +
      '<g class="rl"><path d="M16 50 Q90 92 165 70 L165 100 Q90 124 16 82 Z" fill="#E23B3B"/></g><g class="rr"><path d="M314 50 Q240 92 165 70 L165 100 Q240 124 314 82 Z" fill="#E23B3B"/></g>' +
      '<path d="M140 62 L165 82 L190 62 L190 112 L165 92 L140 112 Z" fill="#FFC83D" stroke="#C4500A" stroke-width="3"/><circle cx="165" cy="82" r="11" fill="#FFC83D" stroke="#C4500A" stroke-width="3"/></svg>'
    var opened = false
    var visitors = []
    function cut () {
      if (api.step() !== 2 || busy || opened) return
      api.touch()
      opened = true
      busy = true
      rib.classList.remove('glow')
      api.sfx('win')
      var l = rib.querySelector('.rl')
      var r = rib.querySelector('.rr')
      if (l.animate && !api.reduced()) { l.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-18deg) translateY(30px)' }], { duration: 500, fill: 'forwards', transformOrigin: '5% 20%' }); r.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(18deg) translateY(30px)' }], { duration: 500, fill: 'forwards', transformOrigin: '95% 20%' }) }
      api.fx('confetti', 955, 560, 380)
      api.fx('gold-star', 955, 520, 260)
      api.warn(L.cut)
      ;[{ k: 'cast-child', w: 130, h: 132 }, { k: 'cast-cat', w: 120, h: 146 }, { k: 'cast-guide', w: 110, h: 178 }].forEach(function (v, i) {
        var e = api.at(sc, 'visitor', 1672, 520 + i * 40, v.w, v.h)
        e.setAttribute('data-visitor', v.k)
        e.style.cssText += ';z-index:5;pointer-events:none'
        api.art(e, v.k, 0, 0, v.w, v.h, '')
        visitors.push(e)
        api.later(function () {
          api.tween({ x: 1672, y: 520 + i * 40 }, { x: 760 + i * 130, y: 520 + i * 25 }, 1400, function (p, kk) { e.style.left = p.x + 'px'; e.style.top = (p.y - Math.abs(Math.sin(kk * 14)) * 14) + 'px' }, function () {
            if (i === 2) {
              api.sfx('ok')
              api.later(function () {
                K.ask(api, { custom: { id: 'm05-visit', prompt: 'Berapa pengunjung yang datang?', choices: ['2', '3', '4'], answer: '3', scene: { groups: [{ key: 'cast-child', n: 1 }, { key: 'cast-cat', n: 1 }, { key: 'cast-guide', n: 1 }] }, hint1: 'Hitung: anak, kucing, dan kakak.' }, done: function () {
                  api.later(function () { K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { busy = false; api.later(function () { api.advance() }, 300) } }) }, 300)
                } })
              }, 600)
            }
          })
        }, 500 + i * 450)
      })
    }
    rib.addEventListener('click', cut)
    if (step0 >= 2) rib.style.display = 'block'

    function firstVeh () { return jobs.litter ? sweeper : truck }
    function undecor () { var r = null; DECOR.forEach(function (d) { if (!r && put[d.id] == null) r = d }); return r }
    function freePad () { var r = -1; PADS.forEach(function (p, j) { if (r < 0 && !padTaken(j)) r = j }); return r }

    var ctl = {
      onStep: function (n) {
        truck.el.style.pointerEvents = n === 0 ? 'auto' : 'none'
        sweeper.el.style.pointerEvents = n === 0 ? 'auto' : 'none'
        if (n === 0) { if (!jobs.litter) { K.glow(truck.el, 3200); K.glow(litter, 3200); K.glow(gT, 3200) } if (!jobs.leaf) { K.glow(sweeper.el, 3200); K.glow(gS, 3200) } }
        if (n === 1) { DECOR.forEach(function (d) { decEls[d.id].style.display = 'block'; if (put[d.id] == null) decEls[d.id].classList.add('glow') }); showPads() }
        if (n === 2) { padGhost.forEach(function (g) { g.style.display = 'none' }); rib.style.display = 'block'; K.glow(rib, 3200); api.warn(L.tapRibbon) }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) { var v = firstVeh(); var j = v === truck ? JOB.litter : JOB.leaf; hd.move([{ x: v.pos.x - 20, y: v.pos.y - 130 }, { x: j.x - 30, y: j.y - 60 }], 1300) }
        else if (n === 1) { var d = undecor(); var pi = freePad(); if (d && pi >= 0) hd.move([{ x: d.x + 80, y: d.y + 50 }, { x: PADS[pi].x - 30, y: PADS[pi].y - 90 }], 1200) }
        else hd.move([{ x: RIB.x + 160, y: RIB.y + 70 }, { x: RIB.x + 160, y: RIB.y + 70 }], 1800)
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          var v = firstVeh()
          K.glow(v.el, 3000)
          K.glow(v === truck ? litter : leaf, 3000)
          if (lvl >= 4 && !busy) work(v, v === truck ? 'litter' : 'leaf')
        } else if (s === 1) {
          var d = undecor()
          var pi = freePad()
          if (!d) return
          K.glow(decEls[d.id], 3000)
          if (pi >= 0) K.glow(padGhost[pi], 3000)
          if (lvl >= 4 && pi >= 0) { decEls[d.id].style.display = 'block'; placeDecor(d, pi, true); save(); decorCheck() }
        } else {
          K.glow(rib, 3000)
          if (lvl >= 4) cut()
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { busy = false }
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W03-M05', mod)
})(window)
