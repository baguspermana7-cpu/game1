/* G32 Blippi -- mission screen template (the owner's mission reference) + W02-M01 "Kincir yang Menunggu".
 * Template: pause/home, title pill, step bar, instruction pill, tool tray, Blippi portrait + speaker, PETUNJUK.
 * A mission module (register) fills the scene and reacts to steps, tools and hints. */
(function (w) {
  'use strict'
  var B = w.Blippi
  var D = w.BlippiData
  var A = w.BlippiArt
  var ICON = B.ICON
  var modules = {}
  var run = null

  function register (id, mod) { modules[id] = mod }
  function reduced () { return w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches }

  function tween (from, to, ms, step, done) {
    if (reduced()) ms = 1
    var t0 = null
    function f (t) {
      if (!run || run.dead) return
      if (t0 === null) t0 = t
      var k = Math.min(1, (t - t0) / ms)
      var e = 1 - Math.pow(1 - k, 3)
      step({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }, k)
      if (k < 1) run.raf = requestAnimationFrame(f)
      else if (done) done()
    }
    run.raf = requestAnimationFrame(f)
  }

  function build (el, params) {
    var m = D.missions[params.mission]
    var steps = m.steps
    var saved = B.state().progress[m.id]
    run = { m: m, el: el, step: saved && saved.step > 0 && saved.step < steps.length ? saved.step : 0, tool: null, hint: 0, idle: 0, paused: false,
      dead: false, timers: [], raf: 0, data: (saved && saved.data) || {}, vehicle: params.vehicle || m.vehicle, ctl: null, warnT: 0 }
    B.bgslot(el, m.bg)
    var scene = B.at(el, '', 0, 0, B.W, B.H)
    scene.id = 'm-scene'
    scene.setAttribute('data-mission', m.id)
    scene.setAttribute('data-vehicle', run.vehicle)

    // chrome
    B.circle(el, 'pause', 25, 22, 'Jeda', pause).setAttribute('data-act', 'pause')
    B.circle(el, 'home', 125, 22, 'Ke beranda', function () { B.home() })
    if (w.BlippiArt.src('logo-blippi')) B.art(el, 'logo-blippi', 1465, 22, 185, 100, 'logo')
    var tp = B.at(el, 'pill big', 586, 12, 500, 58)
    tp.textContent = m.title
    var sb = B.at(el, 'bar stepbar', 470, 74, 735, 80)
    sb.setAttribute('data-stepbar', '1')
    var ins = B.at(el, 'bar instr', 608, 160, 458, 58)
    ins.setAttribute('data-instr', '1')
    var tray = B.at(el, 'panel tray', 462, 738, 752, 168)
    tray.setAttribute('data-tray', '1')
    tray.style.borderRadius = '30px'
    tray.style.borderWidth = '5px'
    var por = B.at(el, 'portrait', 30, 718, 196, 196)
    por.appendChild(A.frame('blippi-potret'))
    var sp = B.circle(el, 'speaker', 168, 820, 'Dengarkan petunjuk', function () { speak(currentText()) })
    sp.setAttribute('data-act', 'speaker')
    var hb = B.btn(el, 'hintbtn', 1378, 798, 268, 104, 'Petunjuk', function () { hintPress() })
    hb.setAttribute('data-act', 'petunjuk')
    hb.innerHTML = ICON.bulb + '<span>PETUNJUK</span>'

    var payoff = B.at(el, 'payoff', 0, 0, B.W, B.H)

    var api = {
      m: m, scene: scene, W: B.W, H: B.H,
      step: function () { return run.step },
      tool: function () { return run.tool },
      data: function () { return run.data },
      restore: saved && saved.step > 0 ? saved : null,
      at: B.at, art: B.art, B: B, sfx: B.sfx, toRef: B.toRef, tween: tween, reduced: reduced,
      touch: touch, warn: warn, advance: advance, persist: persist,
      later: function (fn, ms) { var id = setTimeout(function () { if (run && !run.dead) fn() }, ms); run.timers.push(id); return id },
      shakeTool: shakeTool, glowTool: glowTool,
      fx: function (name, x, y, size) { if (w.BlippiFX) w.BlippiFX.burst(scene, name, x, y, size) },
      paused: function () { return run.paused },
      lines: m.lines
    }
    run.api = api
    run.nodes = { ins: ins, sb: sb, tray: tray, payoff: payoff, scene: scene }
    var mod = modules[m.id]
    run.ctl = mod.mount(api)
    renderSteps()
    renderTray()
    setInstr(steps[run.step].instr)
    run.tool = steps[run.step].tool; renderTray()   // sync rule: the tray is progress, not a gate; the step's tool is always live (the action happens on the thing in the scene)
    if (run.ctl.onStep) run.ctl.onStep(run.step, true)
    run.idleT = setInterval(function () {
      if (run.paused || run.dead || run.winning) return
      run.idle++
      if (run.idle === 8 && run.hint < 1) { run.hint = 1; run.ctl.hint && run.ctl.hint(1) }
    }, 1000)
    kickDemo()
    document.addEventListener('visibilitychange', onVis)
  }

  // owner rule: within ~3 s of every step the target glows and a hand shows the first action (never completes it). A mission may supply ctl.demo().
  function kickDemo () {
    clearTimeout(run.demoT)
    var st = run.step
    run.demoT = setTimeout(function () {
      if (!run || run.dead || run.paused || run.winning || run.step !== st || run.idle < 2) return
      if (run.ctl.demo) run.ctl.demo(st); else if (run.ctl.hint) run.ctl.hint(1)
    }, 2600)
  }

  function onVis () { if (document.hidden && run && !run.dead && !run.paused && !run.winning && B.current() === 'mission') pause() }

  function leave () {
    if (!run) return
    run.dead = true
    clearInterval(run.idleT)
    clearTimeout(run.demoT)
    run.timers.forEach(clearTimeout)
    if (run.raf) cancelAnimationFrame(run.raf)
    if (run.ctl && run.ctl.destroy) run.ctl.destroy()
    document.removeEventListener('visibilitychange', onVis)
    if (w.speechSynthesis) { try { w.speechSynthesis.cancel() } catch (e) { /* ignore */ } }
    run = null
  }

  function currentText () { return run.nodes.ins.textContent }
  function speak (t) {
    if (!B.state().sound || !w.speechSynthesis) return
    try {
      w.speechSynthesis.cancel()
      var u = new w.SpeechSynthesisUtterance(t)
      u.lang = 'id-ID'
      u.rate = 0.9
      w.speechSynthesis.speak(u)
    } catch (e) { /* speech is optional */ }
  }
  function touch () { run.idle = 0 }

  function setInstr (text, warnMsg) {
    var n = run.nodes.ins
    n.textContent = text
    n.style.color = warnMsg ? '#C4500A' : ''
    var wd = Math.max(458, Math.min(900, text.length * 15 + 70))
    n.style.width = wd + 'px'
    n.style.left = (836 - wd / 2) + 'px'
  }
  function warn (text) {
    setInstr(text, true)
    B.sfx('bad')
    clearTimeout(run.warnT)
    run.warnT = setTimeout(function () { if (run && !run.dead && run.m.steps[run.step]) setInstr(run.m.steps[run.step].instr) }, 3400)
  }

  function renderSteps () {
    var sb = run.nodes.sb
    sb.innerHTML = ''
    run.m.steps.forEach(function (s, i) {
      if (i) { var sep = document.createElement('span'); sep.className = 'sep'; sb.appendChild(sep) }
      var d = document.createElement('div')
      d.className = 'step' + (i === run.step ? ' on' : (i < run.step ? ' done' : ''))
      d.setAttribute('data-step', String(i))
      d.innerHTML = '<span style="display:inline-flex;width:40px;height:40px">' + (ICON[s.icon] || '') + '</span><i>' + (i + 1) + '</i><span>' + s.label + '</span>'
      sb.appendChild(d)
    })
  }

  function renderTray () {
    var tray = run.nodes.tray
    tray.innerHTML = ''
    var steps = run.m.steps
    steps.forEach(function (s, i) {
      var t = document.createElement('button')
      t.type = 'button'
      t.className = 'tool' + (run.tool === s.tool ? ' sel' : '') + (i === run.step ? ' cur' : '') + (i < run.step ? ' done' : '')
      t.setAttribute('data-tool', s.tool)
      t.setAttribute('aria-pressed', run.tool === s.tool ? 'true' : 'false')
      t.style.cssText = 'position:absolute;left:' + (376 - (steps.length * 245 - 13) / 2 + i * 245) + 'px;top:12px;width:232px;height:140px'
      var a = document.createElement('div')
      a.className = 'art'
      a.style.cssText = 'inset:6px 20px 52px 20px;width:auto;height:auto'
      A.fill(a, s.toolArt)
      t.appendChild(a)
      var l = document.createElement('span')
      l.className = 'lb'
      l.textContent = s.toolName
      t.appendChild(l)
      t.addEventListener('click', function () { B.sfx('tap'); touch(); pickTool(s.tool) })
      tray.appendChild(t)
    })
  }
  function toolEl (id) { return run.nodes.tray.querySelector('[data-tool=' + id + ']') }
  function shakeTool (id) {
    var t = toolEl(id)
    if (!t) return
    t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake')
  }
  function glowTool (id, ms) {
    var t = toolEl(id)
    if (!t) return
    t.classList.add('glow')
    setTimeout(function () { if (t) t.classList.remove('glow') }, ms || 2600)
  }

  function pickTool (id) {
    if (!run || run.winning) return
    var s = run.m.steps[run.step]
    if (id === s.tool) {
      run.tool = id
      renderTray()
      if (run.ctl.onTool) run.ctl.onTool(id)
    } else {
      warn(s.wrong)
      shakeTool(id)
      glowTool(s.tool)
    }
  }

  function persist (data) {
    run.data = data
    var id = run.m.id
    var step = run.step
    B.commit(function (s) { s.progress[id] = { step: step, data: data } })
  }

  function advance () {
    if (!run || run.winning) return
    run.step++
    run.tool = run.m.steps[run.step] ? run.m.steps[run.step].tool : null
    run.hint = 0
    run.idle = 0
    var id = run.m.id
    var step = run.step
    if (run.step >= run.m.steps.length) return win()
    B.commit(function (s) { s.progress[id] = { step: step, data: run.data } })
    renderSteps()
    renderTray()
    setInstr(run.m.steps[run.step].instr)
    if (run.ctl.onStep) run.ctl.onStep(run.step, false)
    kickDemo()
  }

  function hintPress () {
    if (!run || run.winning) return
    touch()
    run.hint = Math.min(4, run.hint + 1)
    var msg = run.m.hints[Math.min(run.hint, 3) - 1]
    if (run.hint <= 3) setInstr(msg, true)
    if (run.ctl.hint) run.ctl.hint(run.hint)
    // owner: "kadang tangan saat minta petunjuk tidak keluar" - every PETUNJUK press shows the hand for this step,
    // whatever a mission's own hint() does at this rung (the last rung still does the step itself)
    if (run.hint < 4 && run.ctl.demo && !document.querySelector('#m-scene .ghost[style*="opacity: 1"]')) run.ctl.demo(run.step)
    if (run.hint >= 2) speak(msg)
    clearTimeout(run.warnT)
    run.warnT = setTimeout(function () { if (run && !run.dead && run.m.steps[run.step]) setInstr(run.m.steps[run.step].instr) }, 4200)
  }

  function pause () {
    if (!run || run.paused) return
    run.paused = true
    B.modal({ title: 'Jeda', text: 'Petualanganmu aman. Kembali kapan saja!', h: 420, buttons: [
      { id: 'lanjut', label: 'LANJUT', blue: true, fn: function () { if (run) { run.paused = false; run.idle = 0 } } },
      { id: 'peta', label: 'KE PETA', fn: function () { B.go('map') } },
      { id: 'beranda', label: 'BERANDA', blue: true, fn: function () { B.home() } }
    ] })
  }

  function win () {
    run.winning = true
    var m = run.m
    if (run.ctl.win) run.ctl.win()
    B.sfx('win')
    var first = B.grant(m)
    if (first) B.fresh.map = m.world
    B.commit(function (s) { delete s.progress[m.id] })
    run.api.later(function () {
      var p = run.nodes.payoff
      p.innerHTML = ''
      p.classList.add('on')
      if (w.BlippiFX) w.BlippiFX.celebrate(p, 836, 330)
      var box = B.at(p, 'panel box pp', 456, 190, 760, 560)
      box.setAttribute('data-payoff', first ? 'first' : 'again')
      B.txt(box, 'title', 0, 28, 760, 56, 'Hore!').style.fontSize = '58px'
      var line = B.txt(box, '', 40, 100, 680, 70, m.lines.win)
      line.style.cssText += ';font:900 30px/1.2 Nunito,sans-serif;color:#13318A;text-align:center'
      if (m.reward.badge) { B.art(box, m.reward.sticker, 130, 180, 220, 220, 'pp'); B.art(box, m.reward.badge, 410, 180, 220, 220, 'pp').setAttribute('data-badge', m.reward.badge) } else B.art(box, m.reward.sticker, 270, 180, 220, 220, 'pp')
      var cel = B.art(p, 'blippi-menunjuk', 40, 270, 300, 580, 'idle-blippi')
      cel.style.zIndex = '2'
      if (cel.animate && !(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches)) cel.animate([{ transform: 'translateY(40px) scale(.9)', opacity: 0 }, { transform: 'translateY(-14px) scale(1.04)', opacity: 1, offset: .6 }, { transform: 'none', opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'backwards' })
      B.sfx('win')
      if (w.BlippiFX) { w.BlippiFX.burst(p, 'spark', 220, 320, 260); w.BlippiFX.burst(p, 'confetti', 1450, 330, 300) }
      var l2 = B.txt(box, '', 40, 405, 680, 50, first ? ('Kamu dapat ' + m.reward.stickerName + (m.reward.badge ? ' dan ' + m.reward.badgeName : '') + (m.reward.vehicle ? ' dan ' + B.titleCase(B.vehicleById(m.reward.vehicle).name) + ' jadi milikmu!' : '!')) : 'Kamu sudah punya stikernya. Main lagi kapan saja!')
      l2.style.cssText += ';font:800 24px/1.2 Nunito,sans-serif;color:#C4500A;text-align:center'
      var nb = B.btn(box, 'obtn', 230, 462, 300, 80, 'Lanjut', function () { B.go('map', { world: m.world }) })
      nb.textContent = 'LANJUT'
      nb.setAttribute('data-act', 'lanjut')
    }, 1800)
  }

  function mission (el, params) { build(el, params) }
  B.register('mission', mission, leave)
  w.BlippiMissionRegister = register

  // W02-M01 lives in blippi-kincir.js
})(window)
