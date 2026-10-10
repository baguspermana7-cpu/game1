/* G32 Blippi -- Petualangan Kendaraan: DOM UI (category picker, level picker, run HUD, question card, pause, result).
 * Responsive in both orientations (the old stage is hidden while this is open). All text is HTML so it is selectable for
 * focus, readable and checked by the clip/cover gate. Touch targets >= 56 px. No emoji; icons are inline SVG or shared art. */
(function (w) {
  'use strict'
  var T = w.BlippiTrip
  var D = T.D
  var doc = w.document
  var root = null
  var $ = {}
  var sayT = 0
  var lastStars = -1
  var lastProg = -1
  var curRun = null
  var curCat = null

  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 6.6 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21.2l1.5-7L2 9.4l7-.8z"/></svg>'
  var BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'
  var PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>'
  var LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>'
  var PLAY = '<svg viewBox="0 0 24 28" aria-hidden="true"><path d="M3 2l19 12L3 26z"/></svg>'
  var LARR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'
  var RARR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'

  function el (tag, cls, parent, text) {
    var e = doc.createElement(tag)
    if (cls) e.className = cls
    if (text != null) e.textContent = text
    if (parent) parent.appendChild(e)
    return e
  }
  function btn (cls, parent, label, fn) {
    var b = el('button', cls, parent)
    b.type = 'button'
    if (label) b.setAttribute('aria-label', label)
    b.addEventListener('click', function () { w.Blippi.sfx('tap'); fn() })
    return b
  }
  function imgEl (key, cls, parent, alt) {
    var i = new Image()
    i.alt = alt || ''
    i.draggable = false
    i.src = T.url(key)
    i.className = cls || ''
    i.onerror = function () { i.style.visibility = 'hidden' }
    if (parent) parent.appendChild(i)
    return i
  }
  function starsRow (parent, have, cls) {
    var row = el('span', 'tstars ' + (cls || ''), parent)
    row.setAttribute('role', 'img')
    row.setAttribute('aria-label', have + ' dari 3 bintang')
    var i
    for (i = 0; i < 3; i++) { var s = el('i', i < have ? 'on' : '', row); s.innerHTML = STAR }
    return row
  }

  function build () {
    if (root) return
    root = el('div', 'trip', doc.body)
    root.id = 'trip'
    root.hidden = true
    var pic = el('picture', 'tbg', root)
    var so = el('source', '', pic)
    so.media = '(orientation: portrait)'
    so.srcset = 'assets/blippi/bg-garasi--portrait.webp'
    var bgi = new Image()
    bgi.alt = ''
    bgi.src = 'assets/blippi/bg-garasi.webp'
    pic.appendChild(bgi)
    el('div', 'tveil', root)
    $.pick = el('section', 'tscr tpick', root)
    $.lev = el('section', 'tscr tlev', root)
    $.run = el('section', 'tscr trun', root)
    $.pick.setAttribute('data-trip', 'pick')
    $.lev.setAttribute('data-trip', 'levels')
    $.run.setAttribute('data-trip', 'run')
  }

  function header (parent, title, onBack, sub) {
    var h = el('header', 'thead', parent)
    btn('tcirc', h, 'Kembali', onBack).innerHTML = BACK
    var mid = el('div', 'tht', h)
    el('h1', 'tpill', mid, title)
    if (sub) el('p', 'tsub', mid, sub)
    var prof = el('span', 'tprof', h)
    imgEl('g:blippi-profil', '', prof)
    return h
  }

  /* ---------- category picker ---------- */
  function showPick () {
    T.stop()
    build()
    $.pick.innerHTML = ''
    header($.pick, 'PETUALANGAN KENDARAAN', close, 'Pilih tempat bermain')
    var grid = el('div', 'tcats', $.pick)
    D.cats.forEach(function (c) {
      var b = btn('tcat', grid, c.name, function () { showLevels(c.id) })
      b.setAttribute('data-cat', c.id)
      b.style.setProperty('--tint', c.tint)
      b.style.setProperty('--ink', c.ink)
      var ic = el('span', 'tcicon', b)
      imgEl(c.icon, '', ic)
      var tx = el('span', 'tctx', b)
      el('b', '', tx, c.name)
      el('em', '', tx, c.sub)
      var cs = T.catStars(c.id)
      var st = el('span', 'tcst', b)
      st.innerHTML = STAR
      el('u', '', st, cs.have + ' / ' + cs.of)
    })
    swap($.pick)
  }

  /* ---------- level picker ---------- */
  function showLevels (catId) {
    T.stop()
    build()
    curCat = catId
    var cat = D.cats.filter(function (c) { return c.id === catId })[0]
    $.lev.innerHTML = ''
    $.lev.style.setProperty('--tint', cat.tint)
    $.lev.style.setProperty('--ink', cat.ink)
    header($.lev, cat.name, showPick, cat.ctl)
    var grid = el('div', 'tlvls', $.lev)
    D.levels.filter(function (l) { return l.cat === catId }).forEach(function (l, i) {
      var open = T.unlocked(l)
      var st = T.levelState(l.id)
      var b = btn('tlvl' + (open ? '' : ' lk'), grid, l.name, function () {
        if (!open) { hintLocked(grid); return }
        start(l.id)
      })
      b.setAttribute('data-level', l.id)
      b.setAttribute('aria-disabled', open ? 'false' : 'true')
      b.style.setProperty('--hue', String(i * 22))
      var num = el('span', 'tnum', b, String(i + 1))
      void num
      var ph = el('span', 'tlpic', b)
      imgEl(l.vui || (typeof l.veh === 'string' && l.veh.indexOf(':') > 0 ? l.veh : cat.icon), '', ph)
      var tx = el('span', 'tltx', b)
      el('b', '', tx, l.name)
      el('em', '', tx, open ? l.vname : 'Selesaikan level sebelumnya')
      if (open) starsRow(b, st ? st.stars : 0)
      else { var lk = el('span', 'tlock', b); lk.innerHTML = LOCK }
    })
    swap($.lev)
  }
  function hintLocked (grid) {
    var n = grid.parentNode.querySelector('.tnote')
    if (!n) n = el('p', 'tnote', grid.parentNode)
    n.textContent = 'Selesaikan level sebelumnya dulu ya. Kamu pasti bisa!'
  }

  function swap (scr) {
    ;[$.pick, $.lev, $.run].forEach(function (s) { s.classList.toggle('on', s === scr) })
  }

  /* ---------- run ---------- */
  function start (id) {
    T.start(id)
  }
  function showRun (lvl) {
    build()
    $.run.innerHTML = ''
    var cv = el('canvas', 'tcv', $.run)
    cv.setAttribute('aria-label', 'Arena ' + lvl.name)
    cv.setAttribute('role', 'img')
    swap($.run)
    curRun = null
    return cv
  }
  function hud (run) {
    curRun = run
    lastStars = -1
    lastProg = -1
    var wrap = el('div', 'thud', $.run)
    btn('tcirc tpause', wrap, 'Jeda', pause).innerHTML = PAUSE
    var pg = el('div', 'tprog', wrap)
    pg.setAttribute('role', 'progressbar')
    pg.setAttribute('aria-label', 'Perjalanan')
    pg.setAttribute('aria-valuemin', '0')
    pg.setAttribute('aria-valuemax', '100')
    var fill = el('i', 'tfill', pg)
    $.fill = fill
    $.pg = pg
    run.lvl.gates.forEach(function (f) { var p = el('b', 'tpin', pg); p.style.left = (f * 100) + '%' })
    el('b', 'tflag', pg).style.left = '100%'
    var cat = D.cats.filter(function (c) { return c.id === run.lvl.cat })[0]
    $.mark = el('span', 'tmark', pg)
    imgEl(cat.icon, '', $.mark)
    var sc = el('div', 'tscore', wrap)
    sc.innerHTML = STAR
    $.score = el('u', '', sc, '0')
    // Blippi's speech line
    var sp = el('div', 'tsay', $.run)
    sp.setAttribute('aria-live', 'polite')
    var pf = el('span', 'tprof small', sp)
    imgEl('g:blippi-profil', '', pf)
    $.say = el('p', '', sp, '')
    $.sayBox = sp
    // lane arrows (land only): real buttons, same effect as a swipe
    if (run.lvl.cat === 'darat') {
      var ar = el('div', 'tarrows', $.run)
      var bl = btn('tarr', ar, 'Geser ke kiri', function () { run.in.moves.push(-1) })
      bl.innerHTML = LARR
      bl.setAttribute('data-act', 'kiri')
      var br = btn('tarr', ar, 'Geser ke kanan', function () { run.in.moves.push(1) })
      br.innerHTML = RARR
      br.setAttribute('data-act', 'kanan')
    }
    // how-to chip for the first seconds
    var how = el('div', 'thow', $.run, cat.ctl)
    setTimeout(function () { if (how.parentNode) how.classList.add('gone') }, 3600)
    setTimeout(function () { if (how.parentNode) how.parentNode.removeChild(how) }, 4200)
  }
  function tick (run) {
    if (run !== curRun || !$.fill) return
    if (run.stars !== lastStars) { lastStars = run.stars; $.score.textContent = String(run.stars) }
    var p = Math.round(run.progress * 200) / 2
    if (p !== lastProg) {
      lastProg = p
      $.fill.style.transform = 'scaleX(' + (p / 100) + ')'
      $.mark.style.left = p + '%'
      $.pg.setAttribute('aria-valuenow', String(Math.round(p)))
    }
  }
  function say (t) {
    if (!$.say || !$.sayBox) return
    $.say.textContent = t
    $.sayBox.classList.add('on')
    clearTimeout(sayT)
    sayT = setTimeout(function () { if ($.sayBox) $.sayBox.classList.remove('on') }, 3400)
  }

  /* ---------- question card ---------- */
  function icons (parent, q) {
    var sc = q.scene
    if (!sc || !sc.groups || !sc.groups.length || sc.mode === 'none') {
      if (q.pic) imgEl('lib:' + q.pic, 'tqpic', parent)
      return
    }
    var row = el('div', 'tqicons', parent)
    sc.groups.forEach(function (g, gi) {
      if (gi > 0 && sc.mode === 'add') el('b', 'tplus', row, '+')
      if (gi > 0 && sc.mode === 'sub') el('b', 'tplus', row, '−')
      var grp = el('span', 'tqg' + (g.role === 'leave' ? ' leave' : ''), row)
      var n = Math.min(10, g.n || 0)
      var k
      for (k = 0; k < n; k++) imgEl('lib:' + g.key, '', grp)
    })
  }
  function quiz (qz) {
    var q = qz.q
    var sc = el('div', 'tquiz', $.run)
    sc.setAttribute('role', 'dialog')
    sc.setAttribute('aria-modal', 'true')
    sc.setAttribute('aria-label', 'Pertanyaan')
    var card = el('div', 'tqcard', sc)
    var hd = el('div', 'tqhd', card)
    var pf = el('span', 'tprof small', hd)
    imgEl('g:blippi-profil', '', pf)
    el('b', '', hd, 'Pos Soal ' + (qz.gate + 1))
    el('p', 'tqtext', card, q.prompt)
    icons(card, q)
    var fb = el('p', 'tqfb', card, 'Pilih jawabanmu.')
    fb.setAttribute('aria-live', 'polite')
    var ch = el('div', 'tqch', card)
    q.choices.forEach(function (c, i) {
      var b = btn('tans', ch, '', function () {
        if (b.disabled) return
        var r = T.answer(i)
        if (r === 'ok') {
          b.classList.add('good')
          fb.textContent = 'Benar! ' + (q.explain && q.explain.indexOf('Jawabannya') !== 0 ? q.explain + ' ' : '') + 'Siap? Jalan!'
          lock(ch)
          finishQuiz(sc, 2000)
        } else if (r === 'again') {
          b.classList.add('bad')
          b.disabled = true
          fb.textContent = 'Hampir! ' + (q.hint1 || 'Coba hitung pelan-pelan.') + ' Coba lagi ya.'
        } else if (r === 'reveal') {
          b.classList.add('bad')
          lock(ch)
          markAnswer(ch, q)
          fb.textContent = 'Jawabannya ' + q.answer + '. ' + (q.explain || '') + ' Ayo lanjut!'
          finishQuiz(sc, 2600)
        }
      })
      b.textContent = String(c)
      b.setAttribute('data-ans', String(i))
    })
    // the first button focus lets keyboard play
    var f = ch.querySelector('button')
    if (f) setTimeout(function () { f.focus({ preventScroll: true }) }, 60)
  }
  function lock (ch) { [].forEach.call(ch.querySelectorAll('button'), function (b) { b.disabled = true }) }
  function markAnswer (ch, q) {
    ;[].forEach.call(ch.querySelectorAll('button'), function (b, i) { if (String(q.choices[i]) === String(q.answer)) b.classList.add('good') })
  }
  function finishQuiz (sc, ms) {
    setTimeout(function () {
      if (sc.parentNode) sc.parentNode.removeChild(sc)
      T.resumeFromQuiz()
    }, ms)
  }

  /* ---------- pause + result ---------- */
  function panel (cls, title) {
    var sc = el('div', 'tquiz ' + cls, $.run)
    sc.setAttribute('role', 'dialog')
    sc.setAttribute('aria-modal', 'true')
    var card = el('div', 'tqcard', sc)
    el('h2', 'tptitle', card, title)
    return { sc: sc, card: card }
  }
  function pause () {
    var run = curRun
    if (!run || run.state !== 'play') return
    T.pauseRun()
    var p = panel('tpause-card', 'Jeda')
    el('p', 'tqtext', p.card, 'Petualanganmu aman. Kembali kapan saja!')
    var row = el('div', 'tbtns', p.card)
    var b1 = btn('tobtn', row, 'Lanjut', function () { p.sc.parentNode.removeChild(p.sc); T.resumeRun() })
    b1.textContent = 'LANJUT'
    b1.setAttribute('data-act', 'lanjut')
    var b2 = btn('tobtn blue', row, 'Ulangi', function () { p.sc.parentNode.removeChild(p.sc); start(run.lvl.id) })
    b2.textContent = 'ULANGI'
    var b3 = btn('tobtn blue', row, 'Keluar', function () { showLevels(run.lvl.cat) })
    b3.textContent = 'KELUAR'
    b3.setAttribute('data-act', 'keluar')
  }
  function result (run, stars, first, improved) {
    var p = panel('tresult', 'Hore! Sampai di tujuan!')
    p.sc.setAttribute('data-trip', 'result')
    var bl = el('div', 'tqhd', p.card)
    var bp = el('span', 'tprof small', bl)
    imgEl('g:blippi-profil', '', bp)
    el('b', '', bl, stars === 3 ? 'Blippi: Luar biasa! Kamu jagoan!' : stars === 2 ? 'Blippi: Bagus sekali! Sedikit lagi!' : 'Blippi: Hebat sudah sampai! Ayo coba lagi!')
    starsRow(p.card, stars, 'big')
    var okN = run.qlog.filter(function (x) { return x.ok }).length
    el('p', 'tqtext', p.card, 'Bintang terkumpul: ' + run.stars + '. Soal benar: ' + okN + ' dari ' + run.gates.length + '.')
    var rw = el('p', 'treward', p.card, first ? 'Lencana baru: ' + run.lvl.name + '!' : (improved ? 'Bintangmu bertambah. Hebat!' : 'Kamu sudah punya lencana ini. Main lagi kapan saja!'))
    rw.setAttribute('data-reward', first ? 'new' : 'again')
    var row = el('div', 'tbtns', p.card)
    var idx = D.levels.indexOf(run.lvl)
    var nx = D.levels[idx + 1]
    if (nx && nx.cat === run.lvl.cat) {
      var n = btn('tobtn', row, 'Level berikutnya', function () { start(nx.id) })
      n.textContent = 'LEVEL BERIKUTNYA'
      n.setAttribute('data-act', 'berikut')
    }
    var again = btn('tobtn blue', row, 'Main lagi', function () { start(run.lvl.id) })
    again.textContent = 'MAIN LAGI'
    var back = btn('tobtn blue', row, 'Daftar level', function () { showLevels(run.lvl.cat) })
    back.textContent = 'DAFTAR LEVEL'
    back.setAttribute('data-act', 'daftar')
    if (w.BlippiFX) { /* DOM fx belong to the stage; the run already burst confetti on canvas */ }
  }

  /* ---------- open / close ---------- */
  function open (catId) {
    build()
    var B = w.Blippi
    if (w.BlippiFX) w.BlippiFX.stop()
    doc.body.classList.add('trip-on')
    root.hidden = false
    if (catId) showLevels(catId)
    else showPick()
    B.stage.setAttribute('aria-hidden', 'true')
  }
  function close () {
    T.stop()
    if (!root) return
    root.hidden = true
    doc.body.classList.remove('trip-on')
    var B = w.Blippi
    B.stage.removeAttribute('aria-hidden')
    var on = B.stage.querySelector('.scr.on')
    if (on && w.BlippiFX) w.BlippiFX.start(on)
    B.go(B.current() || 'hub', null, true)
  }

  T.setUI({ showRun: showRun, hud: hud, tick: tick, say: say, quiz: quiz, pause: pause, result: result })
  T.open = open
  T.close = close
  T.showLevels = showLevels
  T.showPick = showPick
})(window)
