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

  // last input was a key (true) or a touch / mouse (false): decides whether a new screen moves focus
  var kbd = false
  w.addEventListener('keydown', function () { kbd = true }, true)
  w.addEventListener('pointerdown', function () { kbd = false }, true)
  function el (tag, cls, parent, text) {
    var e = doc.createElement(tag)
    if (cls) e.className = cls
    if (text != null) e.textContent = text
    if (parent) parent.appendChild(e)
    return e
  }
  // an animated craft: its frame strip as a background stepped through by CSS (steps, jump-none: every frame exactly once)
  // the craft's picker strip (one row, every 2nd frame) - also for the big picture: the play sheet is a grid now, which a CSS
  // background cannot step through
  function anim (parent, cr, big, cls) {
    return strip(parent, 'assets/space/' + cr.id + '-pick.webp', cr.pick, (w.BlippiSpace.frameMs || 80) * 2, cr.name, cls)
  }
  function strip (parent, src, meta, ms, name, cls) {
    var sp = el('span', 'tanim' + (cls ? ' ' + cls : ''), parent)
    sp.style.backgroundImage = 'url(' + src + ')'
    sp.style.backgroundSize = (meta[2] * 100) + '% 100%'
    sp.style.aspectRatio = meta[0] + ' / ' + meta[1]
    sp.style.setProperty('--n', String(meta[2]))
    sp.style.setProperty('--d', (meta[2] * ms) + 'ms')
    sp.setAttribute('role', 'img')
    sp.setAttribute('aria-label', name)
    return sp
  }
  // the child's own vehicle picture for a journey: the space craft (animated), or a fleet vehicle - its diagonal still on
  // tiles, its rear-view loop when big; null when the journey has no choice of vehicle
  var RIDE_WORD = { angkasa: ['Pesawatmu', 'pesawat', 'Pilih Pesawatmu'], darat: ['Kendaraanmu', 'kendaraan', 'Pilih Kendaraanmu'], mobilkertas: ['Mobilmu', 'mobil', 'Pilih Mobil Kertasmu'], air: ['Kapalmu', 'kapal', 'Pilih Kapalmu'], udara: ['Pesawatmu', 'pesawat', 'Pilih Pesawatmu'], kertas: ['Pesawat kertasmu', 'pesawat kertas', 'Pilih Pesawat Kertasmu'], kapalkertas: ['Kapal kertasmu', 'kapal kertas', 'Pilih Kapal Kertasmu'], balap: ['Pesawat balapmu', 'pesawat balap', 'Pilih Pesawat Balapmu'] }
  function myRide (cat) {
    if (cat === 'angkasa') { var cr = T.craft && T.craft(); return cr ? { id: cr.id, name: cr.name, craft: cr } : null }
    var r = T.ride && T.ride(cat)
    return r ? { id: r.item.id, name: r.item.name, ride: r } : null
  }
  function rideList (cat) {
    if (cat === 'angkasa') return T.crafts().map(function (cr) { return { id: cr.id, name: cr.name, craft: cr } })
    var f = T.fleet && T.fleet(cat)
    return f ? f.items.map(function (it) { return { id: it.id, name: it.name, ride: { key: 'fl:' + cat + '/' + it.id, tile: 'fl:' + cat + '/' + it.id + '-tile', meta: [it.play[0], it.play[1], it.play[2], it.play[3], f.frameMs] } } }) : []
  }
  function ridePic (parent, r, big, cls) {
    if (r.craft) return anim(parent, r.craft, big, cls)
    return imgEl(r.ride.tile, cls || '', parent, r.name)
  }
  function setMyRide (cat, id) { if (cat === 'angkasa') T.setCraft(id); else T.setRide(cat, id) }
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
      if (c.wide) b.classList.add('wide')   // an odd last arena spans its row, so the grid stays aligned (3 + 3 + 1)
      b.style.setProperty('--tint', c.tint)
      b.style.setProperty('--ink', c.ink)
      var ic = el('span', 'tcicon', b)
      var ccr = myRide(c.id) // the child's own craft / vehicle / boat instead of the stock icon
      if (ccr) ridePic(ic, ccr, false); else imgEl(c.icon, '', ic)
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
  /* ---------- the child's own vehicle per journey (space craft 2026-10-14, road vehicle + boat 2026-10-15) ---------- */
  function craftBar (parent, cat) {
    var cr = myRide(cat)
    var wd = RIDE_WORD[cat]
    var bar = el('div', 'tcbar', parent)
    var pic = el('span', 'tcbig', bar)
    ridePic(pic, cr, true)
    var tx = el('div', 'tctx', bar)
    el('em', '', tx, wd[0])
    el('b', '', tx, cr.name)
    var go = btn('tobtn blue tcgo', bar, 'Ganti ' + wd[1], function () { craftPicker(cat) })
    go.textContent = 'GANTI ' + wd[1].toUpperCase()
    go.setAttribute('data-act', 'ganti-' + wd[1].replace(/ /g, '-'))
  }
  function craftPicker (cat) {
    var cur = myRide(cat)
    var ov = el('div', 'tcpick', $.lev)
    ov.setAttribute('role', 'dialog')
    ov.setAttribute('aria-modal', 'true')
    ov.setAttribute('aria-label', RIDE_WORD[cat][2])
    var card = el('div', 'tcpcard', ov)
    var hd = el('div', 'tcphd', card)
    el('h2', '', hd, RIDE_WORD[cat][2])
    btn('tcirc', hd, 'Tutup', function () { ov.remove() }).innerHTML = BACK
    var grid = el('div', 'tcgrid', card)
    rideList(cat).forEach(function (r) {
      var b = btn('tct' + (r.id === cur.id ? ' on' : ''), grid, r.name, function () {
        setMyRide(cat, r.id)
        w.Blippi.sfx('collect')
        ;[].forEach.call(grid.querySelectorAll('.tct'), function (x) { x.classList.toggle('on', x === b) })
        b.classList.add('chose')
        setTimeout(function () { ov.remove(); showLevels(cat) }, 420)
      })
      b.setAttribute('data-craft', r.id)
      ridePic(el('span', 'tctpic', b), r, false)
      el('i', '', b, r.name)
    })
    var on = grid.querySelector('.tct.on')
    if (on) setTimeout(function () { on.scrollIntoView({ block: 'nearest' }); on.focus({ preventScroll: true }) }, 60)
  }
  function showLevels (catId) {
    T.stop()
    build()
    curCat = catId
    var cat = D.cats.filter(function (c) { return c.id === catId })[0]
    $.lev.innerHTML = ''
    $.lev.style.setProperty('--tint', cat.tint)
    $.lev.style.setProperty('--ink', cat.ink)
    header($.lev, cat.name, showPick, cat.ctl)
    if (myRide(catId)) craftBar($.lev, catId)
    var lvs = D.levels.filter(function (l) { return l.cat === catId })
    var grid = el('div', 'tlvls' + (lvs.length > 4 ? ' many' : ''), $.lev)   // more than 4 levels (BALAP PESAWAT 12, MOBIL KERTAS 8): the grid scrolls on a phone, 3 / 4 columns on a wide screen
    lvs.forEach(function (l, i) {
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
      var place = T.mojoRace && T.mojoRace.pic ? T.mojoRace.pic(l.id) : null   // a road race: the place it runs in
      if (place) { ph.className += ' place'; ph.style.backgroundImage = 'url("' + place + '")' }
      var cr = myRide(catId)
      if (cr) ridePic(ph, cr, false)
      else imgEl(l.vui || (typeof l.veh === 'string' && l.veh.indexOf(':') > 0 ? l.veh : cat.icon), '', ph)
      var tx = el('span', 'tltx', b)
      el('b', '', tx, l.name)
      el('em', '', tx, open ? (cr ? cr.name : l.vname) : 'Selesaikan level sebelumnya')
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
    var mcr = myRide(run.lvl.cat)
    if (mcr) ridePic($.mark, mcr, false) // the child's own craft / vehicle / boat
    else imgEl(run.lvl.vui || cat.icon, '', $.mark) // the vehicle this level drives, not the category icon
    var sc = el('div', 'tscore', wrap)
    sc.innerHTML = STAR
    $.score = el('u', '', sc, '0')
    $.combo = el('b', 'tcombo', sc, '')
    // race position (every journey with rivals): 4/4 at the start, the child races up the field
    $.pos = run.eng && run.eng.rivals && run.eng.rivals.length ? el('div', 'tpos', wrap) : null
    $.posN = 0
    // Blippi's speech line
    var sp = el('div', 'tsay', $.run)
    sp.setAttribute('aria-live', 'polite')
    var pf = el('span', 'tprof small', sp)
    imgEl('g:blippi-profil', '', pf)
    $.say = el('p', '', sp, '')
    $.sayBox = sp
    // lane arrows (land only): real buttons, same effect as a swipe
    if (T.laneCat ? T.laneCat(run.lvl.cat) : run.lvl.cat === 'darat') {
      var ar = el('div', 'tarrows', $.run)
      // the lane moves on the PRESS (a click fires only on release, ~100-200 ms late on a tablet); the click that follows a
      // press is ignored, so a keyboard Enter / Space still works through the click
      var pdT = 0
      var lanes = function (dir) { return function () { if (Date.now() - pdT > 700) run.in.moves.push(dir) } }
      var press = function (b, dir) { b.addEventListener('pointerdown', function (e) { pdT = Date.now(); run.in.moves.push(dir); b.classList.add('hit'); setTimeout(function () { b.classList.remove('hit') }, 140); e.preventDefault() }) }
      var bl = btn('tarr', ar, 'Geser ke kiri', lanes(-1))
      bl.innerHTML = LARR
      bl.setAttribute('data-act', 'kiri')
      press(bl, -1)
      var br = btn('tarr', ar, 'Geser ke kanan', lanes(1))
      br.innerHTML = RARR
      br.setAttribute('data-act', 'kanan')
      press(br, 1)
    }
    // TURBO (CTR): the start turbo on every journey (press just before GO); in a run it fires the meter turbo (a road corner,
    // a wind stream, a current, a warp lane) when its ring is red. Moves on the PRESS like the arrows; the click after a press is ignored.
    var tbT = 0
    var tb = btn('tturbo', $.run, 'Turbo', function () { if (Date.now() - tbT > 700) run.press() })
    tb.setAttribute('data-act', 'turbo')
    tb.innerHTML = '<i class="tring"></i><b>TURBO</b>'
    tb.addEventListener('pointerdown', function (e) { tbT = Date.now(); run.press(); tb.classList.add('hit'); setTimeout(function () { tb.classList.remove('hit') }, 140); e.preventDefault() })
    $.turbo = tb
    $.turboKeep = !!(run.eng && run.eng.drift)
    // how-to chip for the first seconds
    var how = el('div', 'thow', $.run, cat.ctl)
    setTimeout(function () { if (how.parentNode) how.classList.add('gone') }, 3600)
    setTimeout(function () { if (how.parentNode) how.parentNode.removeChild(how) }, 4200)
  }
  function tick (run) {
    if (run !== curRun || !$.fill) return
    if (run.stars !== lastStars) { lastStars = run.stars; $.score.textContent = String(run.stars) }
    if ($.combo) { var cb = run.combo >= 2 ? 'x' + run.combo : ''; if ($.combo.textContent !== cb) $.combo.textContent = cb }
    var p = Math.round(run.progress * 200) / 2
    if (p !== lastProg) {
      lastProg = p
      $.fill.style.transform = 'scaleX(' + (p / 100) + ')'
      $.mark.style.left = p + '%'
      $.pg.setAttribute('aria-valuenow', String(Math.round(p)))
    }
    if ($.pos && run.pos && run.pos !== $.posN) {
      $.posN = run.pos
      $.pos.innerHTML = '<b>' + run.pos + '</b><i>/' + (run.racers || 4) + '</i>'
      $.pos.classList.remove('pop'); void $.pos.offsetWidth; $.pos.classList.add('pop')
      $.pos.classList.toggle('first', run.pos === 1)
    }
    var tb = $.turbo
    if (tb) {
      if (run.state === 'play' && !$.turboKeep) { if (!tb.classList.contains('gone')) tb.classList.add('gone') } else {
        // the ring is the CTR turbo meter: it fills while drifting, turns red in the last half second
        var dr = run.eng && run.eng.drift ? run.eng.drift() : null
        var m = dr && dr.on ? Math.round(dr.meter * 50) / 50 : 0
        if (m !== tb._m) { tb._m = m; tb.style.setProperty('--m', String(m)) }
        var cls = run.state === 'count' ? 'tturbo ready' : !dr || !dr.on ? 'tturbo idle' : dr.red ? 'tturbo on red' : 'tturbo on'
        // until the child's first meter turbo, a red meter shows TEKAN! over the button (a 4-year-old does not read the ring)
        if (dr && dr.red && !run.meterN) cls += ' teach'
        if (run.fire && run.reserves > 0) cls += ' fire' + run.fire
        if (tb.className !== cls) tb.className = cls
      }
    }
  }
  // start lights: a big 3, 2, 1, GO! over the road
  function count (txt) {
    if (!$.run) return
    var o = $.run.querySelector('.tcount') || el('div', 'tcount', $.run)
    o.textContent = txt
    o.classList.remove('pop'); void o.offsetWidth; o.classList.add('pop')
    o.classList.toggle('go', txt === 'GO!')
    if (txt === 'GO!') setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o) }, 800)
  }
  function say (t) {
    if (!$.say || !$.sayBox) return
    $.say.textContent = t
    $.sayBox.classList.add('on')
    clearTimeout(sayT)
    sayT = setTimeout(function () { if ($.sayBox) $.sayBox.classList.remove('on') }, 3400)
  }

  /* ---------- question card ---------- */
  // the picture of every question (owner 2026-10-13 "Soal nggak ada gambarnya"): the same pictures as BlippiKit.ask in the
  // missions - the clock, the counted things, the pattern strip, the amounts of a number question, or the question's own picture
  function src (key) { return /^assets\//.test(key) ? key + '.webp' : /^(w6-|w3-|veh-|pc2-|w5-|cast-|pc-|prop-)/.test(key) ? 'assets/blippi/' + key + '.webp' : T.url('lib:' + key) }
  function icons (parent, q) {
    var K = w.BlippiKit || {}, sc = q.scene, box
    if (sc && sc.mode === 'clock' && K.clockSVG) {
      box = el('div', 'tqclock', parent); box.innerHTML = K.clockSVG(sc.h, sc.m || 0)
    } else if (sc && sc.groups && sc.groups.length && sc.mode !== 'none') {
      var row = el('div', 'tqicons', parent)
      sc.groups.forEach(function (g, gi) {
        if (gi > 0 && g.role !== 'leave') el('b', 'tplus', row, '+')
        var grp = el('span', 'tqg' + (g.role === 'leave' ? ' leave' : ''), row)
        for (var k = 0; k < Math.min(10, g.n || 0); k++) imgEl(src(g.key), '', grp)
      })
    } else if (q.row && q.row.length) {
      box = el('div', 'tqicons tqrow', parent)
      q.row.forEach(function (key) {
        if (key === '+') { el('b', 'tplus', box, '+'); return }
        var fade = key.charAt(0) === '-'
        imgEl('assets/blippi/' + (fade ? key.slice(1) : key) + '.webp', fade ? 'leave' : '', box)
      })
      if (!q.rowNoBox) el('b', 'tqq', box, '?')
    } else if ((/^(biggest|smallest)$/.test(q.kind) || q.kind === 'pattern') && K.amount && K.nounKey) {
      var nums = q.kind === 'pattern' ? (q.prompt.match(/\d+/g) || []) : q.choices, key = K.nounKey(q.noun)
      box = el('div', 'tqicons tqamt', parent)
      nums.forEach(function (v) { box.appendChild(K.amount(+v, key, 130, true)) })
      if (q.kind === 'pattern') el('b', 'tqq', box, '?')
    } else if (q.pic) {
      imgEl(src(q.pic), 'tqpic', parent)
    }
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
    // the first button focus lets keyboard play; only for a keyboard player, or its ring reads as a pre-picked answer on a tablet
    var f = ch.querySelector('button')
    if (f && kbd) setTimeout(function () { f.focus({ preventScroll: true }) }, 60)
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
  // the finishing order (CTR's podium): four chips, rivals by how far they got, the child at its place, own chip marked KAMU
  function standings (parent, run, place) {
    var rv = (run.eng && run.eng.rivals || []).slice().sort(function (a, b) { return b.z - a.z })
    var mr = myRide(run.lvl.cat)
    var mine = mr ? (mr.craft ? { craft: mr.craft, me: true } : { key: mr.ride.tile, tile: true, me: true }) : { key: run.lvl.vui || run.lvl.veh, me: true }
    rv.splice(place - 1, 0, mine)
    var row = el('ol', 'tstand', parent)
    row.setAttribute('aria-label', 'Urutan finis')
    rv.forEach(function (r, i) {
      var li = el('li', r.me ? 'me' : '', row)
      el('b', '', li, String(i + 1))
      var pic = el('span', 'tsv', li)
      if (r.craft) anim(pic, r.craft, false)
      else if (r.ride || r.tile) imgEl(r.ride ? r.ride.tile : r.key, '', pic)
      else imgEl(String(r.key).replace(/\/standard-[a-z-]+$/, '/standard-front-three-quarter'), '', pic)
      if (r.me) el('i', '', li, 'KAMU')
    })
  }
  function result (run, stars, first, improved) {
    var place = run.pos && run.racers ? run.pos : 0
    var p = panel('tresult', place === 1 ? 'Juara 1! Kamu tercepat!' : place ? 'Finis posisi ' + place + '!' : 'Hore! Sampai di tujuan!')
    if (place) p.sc.setAttribute('data-place', String(place))
    p.sc.setAttribute('data-trip', 'result')
    var bl = el('div', 'tqhd', p.card)
    var bp = el('span', 'tprof small', bl)
    imgEl('g:blippi-profil', '', bp)
    el('b', '', bl, stars === 3 ? 'Blippi: Luar biasa! Kamu jagoan!' : stars === 2 ? 'Blippi: Bagus sekali! Sedikit lagi!' : 'Blippi: Hebat sudah sampai! Ayo coba lagi!')
    if (place) standings(p.card, run, place)
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

  // where the star counter is, in canvas CSS px (the flying stars land there), and its pop when one lands
  function scoreAt () {
    if (!$.score || !curRun || !curRun.cv) return null
    var b = $.score.parentNode.getBoundingClientRect(), c = curRun.cv.getBoundingClientRect()
    return { x: b.left + 26 - c.left, y: b.top + b.height / 2 - c.top }
  }
  function pop () {
    var el2 = $.score && $.score.parentNode
    if (!el2) return
    el2.classList.remove('pop'); void el2.offsetWidth; el2.classList.add('pop')
  }
  T.setUI({ showRun: showRun, hud: hud, tick: tick, say: say, quiz: quiz, pause: pause, result: result, scoreAt: scoreAt, pop: pop, count: count })
  T.open = open
  T.close = close
  T.showLevels = showLevels
  T.showPick = showPick
})(window)
