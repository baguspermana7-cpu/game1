/* G32 Blippi -- the road races (DARAT, MOBIL KERTAS) on the shared Mojo chase engine (owner 2026-10-20: "utilize the
 * mojo gameplay or lane instead of hard-coding each game ... iya yang darat termasuk mobil kertas dll").
 * A level opens ../Dunia-Emosi/games/mojo-chase-embed.html full screen in a frame (same origin): the child's own fleet
 * vehicle drives the Mojo road (hills, bends, 47 places, weather, jump, question lanes, turbo) against a rival from the
 * same fleet; the road runs at 80 % of the Mojo race's pace at the start, 90 % at the finish. The result comes back by
 * postMessage and is saved exactly like a trip level (s.trip.lv[id] = { stars, best, n }), so unlocks and category
 * stars work unchanged. ?land=old keeps the original Blippi land engine. */
;(function (w) {
  'use strict'
  var T = w.BlippiTrip
  if (!T) return
  // each level drives a Mojo place that matches its name
  var STAGE = {
    'darat-1': 'kota', 'darat-2': 'hutan', 'darat-3': 'pantai', 'darat-4': 'gurun',
    'mobilkertas-1': 'kota', 'mobilkertas-2': 'perumahan', 'mobilkertas-3': 'desa', 'mobilkertas-4': 'sakura',
    'mobilkertas-5': 'musim-gugur', 'mobilkertas-6': 'resor', 'mobilkertas-7': 'salju', 'mobilkertas-8': 'permen'
  }
  var cur = null
  function abs (u) { return new URL(u, w.location.href).href }
  function on () { return !/[?&]land=old\b/.test(w.location.search) }
  function save (lvl, stars, collected) {
    var first = false, improved = false
    w.Blippi.commit(function (s) {
      s.trip = s.trip || { lv: {}, rw: {} }; s.trip.lv = s.trip.lv || {}; s.trip.rw = s.trip.rw || {}
      var o = s.trip.lv[lvl.id]
      if (!o) { s.trip.lv[lvl.id] = { stars: stars, best: collected, n: 1 }; first = true; improved = true } else {
        improved = stars > o.stars
        s.trip.lv[lvl.id] = { stars: Math.max(o.stars, stars), best: Math.max(o.best || 0, collected), n: (o.n || 0) + 1 }
      }
      if (!s.trip.rw[lvl.id]) s.trip.rw[lvl.id] = 1
    })
    return { first: first, improved: improved }
  }
  function close () {
    if (!cur) return
    w.removeEventListener('message', cur.onMsg)
    if (cur.box && cur.box.parentNode) cur.box.parentNode.removeChild(cur.box)
    var cat = cur.lvl.cat
    cur = null
    if (T.open) T.open(cat)   // back to the level list (stars and unlocks refreshed)
  }
  function start (lvl, opts) {
    if (cur) close()
    var me = T.ride(lvl.cat), rivals = T.rideRivals(lvl.cat, lvl.id)
    if (!me) return false
    var idx = T.D.levels.filter(function (l) { return l.cat === lvl.cat }).indexOf(lvl)
    var st = w.Blippi && w.Blippi.state && w.Blippi.state()
    var q = {
      fleet: abs('data/blippi-fleet-' + lvl.cat + '.js'), cat: lvl.cat, me: me.item.id, rival: rivals[0] ? rivals[0].item.id : '',
      stage: STAGE[lvl.id] || 'kota', title: lvl.name, place: lvl.name, intro: lvl.say || '', seconds: String(Math.round(60 + Math.max(0, idx) * 5)),
      pace: '0.8,0.9', hero: me.item.name, caller: abs(T.url('g:blippi-profil')), sound: st && st.sound === false ? '0' : '1'
    }
    var qs = Object.keys(q).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(q[k]) }).join('&')
    var box = w.document.createElement('div')
    box.className = 'tmojo'
    box.style.cssText = 'position:fixed;inset:0;z-index:9000;background:#1F6FD1'
    var fr = w.document.createElement('iframe')
    fr.title = lvl.name
    fr.setAttribute('allow', 'autoplay; fullscreen')
    fr.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;display:block'
    fr.src = abs('../Dunia-Emosi/games/mojo-chase-embed.html') + '?' + qs
    box.appendChild(fr)
    w.document.body.appendChild(box)
    var onMsg = function (e) {
      if (e.origin !== w.location.origin || !e.data || e.data.type !== 'shared-race' || !cur || e.source !== fr.contentWindow) return
      var d = e.data
      cur.last = d.event
      if (d.event === 'done') { cur.result = save(lvl, Math.max(1, Math.min(3, d.stars | 0)), d.collected | 0); close() }
      else if (d.event === 'exit' || d.event === 'error') { cur.error = d.why || null; close() }
    }
    cur = { lvl: lvl, box: box, frame: fr, onMsg: onMsg, last: null }
    w.addEventListener('message', onMsg)
    fr.focus()
    return true
  }
  T.mojoRace = { on: on, start: start, close: close, stage: function (id) { return STAGE[id] || null }, frame: function () { return cur && cur.frame }, state: function () { return cur ? { lvl: cur.lvl.id, last: cur.last } : null } }
})(window)
