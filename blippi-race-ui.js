/* G32 Blippi -- BALAPAN UI + flow: hub -> vehicle-select -> arena-select -> pre-race -> countdown -> race -> results (-> retry | hub).
 * Every transition is state-driven and CANCELLABLE: one token, every timer and WAAPI animation is registered and cancelled before the next
 * state starts. Reduced motion: a 100 ms opacity cut, no iris/slide/scale. Reuses the trip UI classes for header, pills and result cards. */
(function (w) {
  'use strict'
  var Rc = w.BlippiRace
  var doc = w.document
  var root = null
  var S = {}
  var token = 0
  var timers = []
  var anims = []
  var sel = { vehicle: null, arena: null, mode: 'waktu', cat: 'darat' }
  var state = 'closed'
  var sayT = 0
  var lastHud = ''
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 6.6 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21.2l1.5-7L2 9.4l7-.8z"/></svg>'
  var BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'
  var PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>'
  var CATS = [['darat', 'DARAT', 'road-service'], ['udara', 'UDARA', 'aircraft'], ['air', 'AIR', 'watercraft']]
  var MODES = [['bebas', 'BEBAS', 'Jalan-jalan tanpa waktu'], ['waktu', 'ADU WAKTU', 'Dua putaran, catat waktu'], ['hantu', 'LAWAN HANTU', 'Balapan dengan bayanganmu']]

  function el (tag, cls, parent, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e }
  function btn (cls, parent, label, fn) { var b = el('button', cls, parent); b.type = 'button'; if (label) b.setAttribute('aria-label', label); b.addEventListener('click', function () { w.Blippi.sfx('tap'); fn() }); return b }
  function img (src, cls, parent) { var i = new Image(); i.alt = ''; i.draggable = false; i.src = src; i.className = cls || ''; if (parent) parent.appendChild(i); return i }
  function later (fn, ms) { var my = token; var id = setTimeout(function () { if (my === token) fn() }, ms); timers.push(id); return id }
  function cancelAll () {
    token++
    timers.forEach(clearTimeout)
    timers = []
    anims.forEach(function (a) { try { a.cancel() } catch (e) { /* done */ } })
    anims = []
  }
  function fade (node, from, to, ms, done) {
    if (!node.animate) { node.style.opacity = String(to); if (done) done(); return }
    var a = node.animate([{ opacity: from }, { opacity: to }], { duration: ms, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' })
    anims.push(a)
    a.onfinish = function () { node.style.opacity = String(to); try { a.cancel() } catch (e) { /* ok */ } if (done) done() }
  }
  function dur (ms) { return Rc.reduced() ? 100 : ms }

  function build () {
    if (root) return
    root = el('div', 'trip race', doc.body)
    root.id = 'race'
    root.hidden = true
    var pic = el('picture', 'tbg', root)
    var so = el('source', '', pic); so.media = '(orientation: portrait)'; so.srcset = 'assets/blippi/bg-garasi--portrait.webp'
    var bg = new Image(); bg.alt = ''; bg.src = 'assets/blippi/bg-garasi.webp'; pic.appendChild(bg)
    el('div', 'tveil', root)
    ;['vehicle', 'arena', 'pre', 'race', 'results'].forEach(function (n) { S[n] = el('section', 'tscr rscr', root); S[n].setAttribute('data-race', n) })
    S.iris = el('div', 'riris', root)
  }
  function header (parent, title, back, sub) {
    var h = el('header', 'thead', parent)
    btn('tcirc', h, 'Kembali', back).innerHTML = BACK
    var mid = el('div', 'tht', h)
    el('h1', 'tpill', mid, title)
    if (sub) el('p', 'tsub', mid, sub)
    var pf = el('span', 'tprof', h); img('assets/blippi/blippi-profil.webp', '', pf)
    return h
  }

  /* ---------- state transitions ---------- */
  function show (name, ms, after) {
    var prev = S[state] || null
    var next = S[name]
    state = name
    var d = dur(ms || 220)
    ;['vehicle', 'arena', 'pre', 'race', 'results'].forEach(function (n) { if (S[n] !== next && S[n] !== prev) { S[n].classList.remove('on'); S[n].style.opacity = '' } })
    if (prev && prev !== next) { prev.classList.add('on'); fade(prev, 1, 0, d, function () { prev.classList.remove('on'); prev.style.opacity = '' }) }
    next.classList.add('on')
    next.style.opacity = '0'
    fade(next, 0, 1, d, after)
  }

  /* ---------- vehicle-select ---------- */
  function buildVehicle () {
    var p = S.vehicle
    p.innerHTML = ''
    header(p, 'PILIH KENDARAAN', close, 'Darat, udara, atau air')
    var tabs = el('div', 'rtabs', p)
    CATS.forEach(function (c) {
      var b = btn('rtab' + (sel.cat === c[0] ? ' on' : ''), tabs, c[1], function () { sel.cat = c[0]; var f = Rc.D.vehicles.filter(function (v) { return v.category === c[2] })[0]; sel.vehicle = f.id; buildVehicle() })
      b.textContent = c[1]
      b.setAttribute('data-cat', c[0])
    })
    var body = el('div', 'rbody', p)
    var grid = el('div', 'rgrid', body)
    var cat = CATS.filter(function (c) { return c[0] === sel.cat })[0][2]
    Rc.D.vehicles.filter(function (v) { return v.category === cat }).forEach(function (v) {
      var b = btn('rcard' + (sel.vehicle === v.id ? ' sel' : ''), grid, Rc.NAMES[v.id], function () { sel.vehicle = v.id; buildVehicle() })
      b.setAttribute('data-vehicle', v.id)
      b.setAttribute('aria-pressed', sel.vehicle === v.id ? 'true' : 'false')
      var pic = el('span', 'rpic', b); img(Rc.vurl(v.id, 'standard', 'front-three-quarter'), '', pic)
      el('b', '', b, Rc.NAMES[v.id])
    })
    var pv = el('div', 'rprev', body)
    var big = el('span', 'rbig', pv); var im = img(Rc.vurl(sel.vehicle, 'standard', 'side'), '', big); im.style.transform = 'scaleX(-1)'
    el('b', 'rpname', pv, Rc.NAMES[sel.vehicle])
    var go = btn('tobtn', pv, 'Lanjut ke arena', function () { to('arena') })
    go.textContent = 'PILIH ARENA'
    go.setAttribute('data-act', 'ke-arena')
  }

  /* ---------- arena-select ---------- */
  function buildArena () {
    var p = S.arena
    p.innerHTML = ''
    header(p, 'PILIH ARENA', function () { to('vehicle') }, 'Pilih tempat dan cara bermain')
    var body = el('div', 'rbody', p)
    var grid = el('div', 'rgrid rarenas', body)
    var ori = Rc.oriNow()
    Rc.D.arenas.forEach(function (a) {
      var b = btn('rcard rarena' + (sel.arena === a.id ? ' sel' : ''), grid, Rc.ANAMES[a.id], function () { sel.arena = a.id; buildArena() })
      b.setAttribute('data-arena', a.id)
      b.setAttribute('aria-pressed', sel.arena === a.id ? 'true' : 'false')
      var pic = el('span', 'rpic wide', b); img('assets/arena/' + a.id + '-' + ori + '-thumb.webp', '', pic)
      el('b', '', b, Rc.ANAMES[a.id])
      var st = el('span', 'tstars small', b)
      var i
      for (i = 0; i < 3; i++) { var s = el('i', i < a.difficulty ? 'on' : '', st); s.innerHTML = STAR }
    })
    var side = el('div', 'rprev', body)
    var pv = el('span', 'rbig small', side); var im = img(Rc.vurl(sel.vehicle, 'standard', 'front-three-quarter'), '', pv)
    void im
    el('b', 'rpname', side, Rc.NAMES[sel.vehicle])
    var modes = el('div', 'rmodes', side)
    MODES.forEach(function (m) {
      var b = btn('rmode' + (sel.mode === m[0] ? ' on' : ''), modes, m[1], function () { sel.mode = m[0]; buildArena() })
      b.setAttribute('data-mode', m[0])
      b.innerHTML = '<b></b><em></em>'
      b.firstChild.textContent = m[1]
      b.lastChild.textContent = m[2]
    })
    var go = btn('tobtn', side, 'Mulai balapan', function () { if (sel.arena) to('pre'); else hintArena() })
    go.textContent = 'SIAP BALAPAN'
    go.setAttribute('data-act', 'ke-pre')
    var note = el('p', 'tnote', side, sel.arena ? '' : 'Pilih satu arena dulu ya.')
    note.setAttribute('data-note', 'arena')
  }
  function hintArena () { var n = S.arena.querySelector('[data-note]'); if (n) n.textContent = 'Pilih satu arena dulu ya.' }

  /* ---------- pre-race: preload exactly what the race needs, THEN transition ---------- */
  function buildPre () {
    var p = S.pre
    p.innerHTML = ''
    header(p, Rc.ANAMES[sel.arena].toUpperCase(), function () { to('arena') }, MODES.filter(function (m) { return m[0] === sel.mode })[0][2])
    var box = el('div', 'rpre', p)
    var ori = Rc.oriNow()
    var pic = el('span', 'rprepic', box); img('assets/arena/' + sel.arena + '-' + ori + '-thumb.webp', '', pic)
    el('p', 'tqtext', box, 'Sentuh dan geser. Kendaraanmu mengikuti jarimu.')
    var b = btn('tobtn', box, 'Mulai', function () { startCountdown() })
    b.textContent = 'MULAI'
    b.setAttribute('data-act', 'mulai-balap')
    b.disabled = true
    var load = el('p', 'tsub', box, 'Menyiapkan arena...')
    var urls = Rc.vehicleUrls(sel.vehicle).concat([Rc.aurl(sel.arena, ori), 'assets/vfx/dust.webp', 'assets/vfx/spark.webp', 'assets/vfx/confetti.webp', 'assets/vfx/gold-star.webp'])
    var my = token
    Rc.load(urls, function () { if (my !== token) return; b.disabled = false; load.textContent = 'Siap!' })
  }

  /* ---------- countdown + race ---------- */
  function startCountdown () {
    cancelAll()
    var my = token
    var canvasHost = S.race
    canvasHost.innerHTML = ''
    var cv = el('canvas', 'tcv', canvasHost)
    cv.setAttribute('aria-label', 'Arena ' + Rc.ANAMES[sel.arena])
    cv.setAttribute('role', 'img')
    // iris wipe (blue then orange ring) closes over the pre-race screen, race screen is already behind it
    var d = dur(240)
    state = 'count'
    S.race.classList.add('on'); S.race.style.opacity = '1'
    S.pre.classList.add('on')
    Rc.stop()
    var ok = Rc.start({ arena: sel.arena, vehicle: sel.vehicle, mode: sel.mode, canvas: cv })
    if (!ok) { to('arena'); return }
    hud()
    if (Rc.reduced()) {
      fade(S.pre, 1, 0, d, function () { S.pre.classList.remove('on'); S.pre.style.opacity = '' })
    } else {
      S.iris.className = 'riris on'
      var a = S.iris.animate([{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }], { duration: d, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' })
      anims.push(a)
      a.onfinish = function () { S.pre.classList.remove('on'); S.pre.style.opacity = ''; var b2 = S.iris.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }); anims.push(b2); b2.onfinish = function () { S.iris.className = 'riris' } }
    }
    ;['vehicle', 'arena', 'results'].forEach(function (n) { S[n].classList.remove('on') })
    var n = 3
    var cdn = el('div', 'rcount', S.race, '3')
    cdn.setAttribute('aria-live', 'assertive')
    cdn.setAttribute('data-count', '3')
    var tick = function () {
      if (my !== token) return
      n--
      if (n > 0) { cdn.textContent = String(n); cdn.setAttribute('data-count', String(n)); w.Blippi.sfx('tap'); later(tick, 800) } else {
        cdn.textContent = 'JALAN!'
        cdn.setAttribute('data-count', '0')
        w.Blippi.sfx('ok')
        Rc.begin()
        state = 'race'
        later(function () { if (cdn.parentNode) cdn.parentNode.removeChild(cdn) }, 700)
      }
    }
    later(tick, d + 800)
  }
  function hud () {
    var wrap = el('div', 'thud rhud', S.race)
    btn('tcirc tpause', wrap, 'Jeda', pause).innerHTML = PAUSE
    var sp = el('span', 'rflex', wrap)
    void sp
    var ch = el('div', 'rchips', wrap)
    S.lapChip = el('b', 'rchip', ch, 'Putaran 1')
    S.timeChip = el('b', 'rchip mono', ch, '0:00.0')
    var sayBox = el('div', 'tsay', S.race)
    sayBox.setAttribute('aria-live', 'polite')
    var pf = el('span', 'tprof small', sayBox); img('assets/blippi/blippi-profil.webp', '', pf)
    S.say = el('p', '', sayBox, '')
    S.sayBox = sayBox
    lastHud = ''
  }
  function fmt (ms) { var s = ms / 1000; var m = Math.floor(s / 60); return m + ':' + (s - m * 60 < 10 ? '0' : '') + (s - m * 60).toFixed(1) }
  function tick (R) {
    if (!S.lapChip) return
    var t = R.clock
    var txt = R.mode === 'bebas' ? 'Putaran ' + (R.lap + 1) : 'Putaran ' + Math.min(R.laps, R.lap + 1) + '/' + Math.ceil(R.laps)
    var h = txt + '|' + fmt(t)
    if (h === lastHud) return
    lastHud = h
    S.lapChip.textContent = txt
    S.timeChip.textContent = R.mode === 'bebas' ? fmt(t) : fmt(t)
    if (R.wrong > 2 && !S._wrong) { S._wrong = 1; say('Ayo putar balik, jalannya ke arah sana ya.'); setTimeout(function () { S._wrong = 0 }, 6000) }
  }
  function say (t) {
    if (!S.say) return
    S.say.textContent = t
    S.sayBox.classList.add('on')
    clearTimeout(sayT)
    sayT = setTimeout(function () { if (S.sayBox) S.sayBox.classList.remove('on') }, 3000)
  }
  function pause () {
    var q = Rc.qa()
    if (!q || q.state !== 'race') return
    Rc.pauseRun()
    var sc = el('div', 'tquiz', S.race)
    sc.setAttribute('role', 'dialog')
    var card = el('div', 'tqcard', sc)
    el('h2', 'tptitle', card, 'Jeda')
    el('p', 'tqtext', card, 'Balapanmu aman. Kembali kapan saja!')
    var row = el('div', 'tbtns', card)
    var pt0 = w.performance.now()
    var b1 = btn('tobtn', row, 'Lanjut', function () { S.race.removeChild(sc); resumeAdd(pt0); Rc.resumeRun() })
    b1.textContent = 'LANJUT'; b1.setAttribute('data-act', 'lanjut')
    var b2 = btn('tobtn blue', row, 'Ulangi', function () { retry() })
    b2.textContent = 'ULANGI'
    var b3 = btn('tobtn blue', row, 'Keluar', function () { to('arena') })
    b3.textContent = 'KELUAR'; b3.setAttribute('data-act', 'keluar')
  }
  function resumeAdd (pt0) { var q = Rc.qa(); void q; void pt0 }

  function finishHook (R) {
    // race -> results: input is already disabled by the core; let short VFX settle 180 ms, freeze on the current matched view, then 240 ms crossfade
    var res = Rc.saveResult(R)
    later(function () { buildResults(R, res); state = 'results'; show('results', 240) }, dur(180))
  }
  function buildResults (R, res) {
    var p = S.results
    p.innerHTML = ''
    var card = el('div', 'tquiz tresult', p)
    card.setAttribute('data-trip', 'result')
    var c = el('div', 'tqcard', card)
    el('h2', 'tptitle', c, 'Hore! Garis finis!')
    var bl = el('div', 'tqhd', c); var bp = el('span', 'tprof small', bl); img('assets/blippi/blippi-profil.webp', '', bp)
    el('b', '', bl, res.newBest ? 'Blippi: Rekor baru! Hebat sekali!' : 'Blippi: Bagus! Ayo coba lebih cepat!')
    el('p', 'tqtext', c, 'Waktu: ' + fmt(res.total) + (R.mode === 'bebas' ? '' : '  |  Putaran: ' + res.laps.map(function (x) { return x.toFixed(1) + ' dtk' }).join(', ')))
    var rec = el('p', 'treward', c, R.mode === 'bebas' ? 'Jalan-jalan selesai. Tanpa waktu, tanpa kalah!' : (res.prev == null ? 'Waktu pertamamu tersimpan!' : (res.newBest ? 'Lebih cepat ' + ((res.prev - res.total) / 1000).toFixed(1) + ' detik dari rekormu!' : 'Rekormu ' + fmt(res.prev) + '. Terus berlatih!')))
    rec.setAttribute('data-record', res.newBest ? 'new' : 'same')
    var row = el('div', 'tbtns', c)
    var b1 = btn('tobtn', row, 'Ulangi', function () { retry() }); b1.textContent = 'ULANGI'; b1.setAttribute('data-act', 'ulangi')
    var b2 = btn('tobtn blue', row, 'Pilih arena', function () { to('arena') }); b2.textContent = 'PILIH ARENA'; b2.setAttribute('data-act', 'arena-lain')
    var b3 = btn('tobtn blue', row, 'Ke beranda', function () { close() }); b3.textContent = 'KE BERANDA'; b3.setAttribute('data-act', 'beranda')
    if (w.BlippiFX) { /* canvas already burst */ }
  }
  function retry () {
    // results -> retry: stop the run, reset to standard + clock + progress, show the countdown again
    cancelAll()
    Rc.stop()
    S.results.classList.remove('on')
    var my = token
    void my
    startCountdown()
  }

  /* ---------- flow ---------- */
  function to (name) {
    cancelAll()
    if (name !== 'race') { Rc.stop(); S.race.innerHTML = ''; S.lapChip = null; S.say = null }
    if (name === 'vehicle') buildVehicle()
    else if (name === 'arena') buildArena()
    else if (name === 'pre') buildPre()
    show(name, name === 'arena' ? 200 : 220)
  }
  function orientationChanged () {
    // the plate (and route) are per-orientation: restart the race on the matching plate, never continue on the wrong one
    var q = Rc.qa()
    if (!q) return
    to('pre')
  }
  function open () {
    build()
    var B = w.Blippi
    if (w.BlippiFX) w.BlippiFX.stop()
    if (w.BlippiTrip && w.BlippiTrip.running()) w.BlippiTrip.close()
    doc.body.classList.add('trip-on')
    root.hidden = false
    B.stage.setAttribute('aria-hidden', 'true')
    if (!sel.vehicle) sel.vehicle = Rc.D.vehicles[0].id
    cancelAll()
    state = 'closed'
    S.vehicle.classList.remove('on')
    buildVehicle()
    show('vehicle', 230)
  }
  function close () {
    // results/any -> hub: dispose listeners + timers, destroy parallax (stopped in open), clear VFX pools, then enter the hub
    cancelAll()
    Rc.stop()
    if (!root) return
    root.hidden = true
    ;['vehicle', 'arena', 'pre', 'race', 'results'].forEach(function (n) { S[n].classList.remove('on'); S[n].innerHTML = ''; S[n].style.opacity = '' })
    S.iris.className = 'riris'
    S.lapChip = null; S.say = null
    state = 'closed'
    doc.body.classList.remove('trip-on')
    var B = w.Blippi
    B.stage.removeAttribute('aria-hidden')
    B.go('hub', null, true)
  }
  doc.addEventListener('visibilitychange', function () { if (doc.hidden && Rc.running()) pause() })

  Rc.setUI({ tick: tick, say: say, finish: finishHook, pause: pause, orientationChanged: orientationChanged })
  Rc.open = open
  Rc.close = close
  Rc.flow = function () { return { state: state, sel: sel, token: token, timers: timers.length, anims: anims.length } }
  Rc.goto = to
  Rc.select = function (o) { for (var k in o) sel[k] = o[k] }
  Rc.retry = retry
})(window)
