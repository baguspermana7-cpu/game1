/* G32 Blippi -- MOBIL KERTAS (owner 2026-10-19): the 8th arena, a three-lane road race of the owner's 25 origami cars
 * (fleet 'mobilkertas', tools/ingest-origami-cars.py) through a paper-craft world: construction-paper fields, a kraft
 * road with paper-tape lines, the land engine's lanes, ramps, rivals and question gates. Data only; it slots its
 * category in before BALAP PESAWAT and appends its levels to BlippiTripData. */
(function (w) {
  'use strict'
  var D = w.BlippiTripData
  if (!D) return
  var CAT = { id: 'mobilkertas', name: 'MOBIL KERTAS', sub: 'Balapan mobil origami di kota kertas', tint: '#FFF1D6', ink: '#A0561A', icon: 'fl:mobilkertas/school-bus-tile', engine: 'land', ctl: 'Geser atau ketuk kiri-kanan' }
  var V = 'fl:mobilkertas/school-bus-tile', N = 'Mobil Kertas'
  // grass = construction-paper field (two tones, the bands stream toward you); road = kraft paper
  var LEVELS = [
    { id: 'mobilkertas-1', name: 'Kota Kertas', len: 46, speed: 1, dens: 0.32, gates: [0.34, 0.68],
      theme: { sky: 'clear-day-01', far: 'town', mid: 'town', grass: ['#CFE9B4', '#C2E0A4'], road: ['#C9B08A', '#BFA580'], props: ['tree-round', 'lamp', 'bush', 'planter'] },
      say: 'Mobil kertas siap balapan! Ayo keliling kota kertas!' },
    { id: 'mobilkertas-2', name: 'Kompleks Origami', len: 50, speed: 1.08, dens: 0.42, gates: [0.32, 0.64, 0.86],
      theme: { sky: 'clear-day-01', far: 'suburb', mid: 'suburb', grass: ['#D4EDBE', '#C6E4AC'], road: ['#CDB592', '#C2AA86'], props: ['hedge', 'tree-small', 'lamp', 'planter'] },
      say: 'Rumah-rumah kertas berjajar rapi. Hati-hati di tikungan!' },
    { id: 'mobilkertas-3', name: 'Ladang Lipat', len: 54, speed: 1.16, dens: 0.5, gates: [0.3, 0.6, 0.85],
      theme: { sky: 'clear-day-01', far: 'farm', mid: 'farm', grass: ['#E6E3A2', '#DCD891'], road: ['#C4A57E', '#B99A73'], props: ['hay', 'fence', 'windmill', 'tree-round'] },
      say: 'Ladang dari kertas kuning. Ada kincir lipat di sana!' },
    { id: 'mobilkertas-4', name: 'Taman Sakura Kertas', len: 56, speed: 1.24, dens: 0.55, gates: [0.28, 0.55, 0.82],
      theme: { sky: 'clear-day-01', far: 'cherry-blossom', mid: 'cherry-blossom', grass: ['#F6D9E3', '#EFCBD8'], road: ['#CDB295', '#C2A789'], props: ['tree-small', 'lamp', 'bush', 'planter'] },
      say: 'Kelopak kertas merah muda beterbangan. Cantik sekali!' },
    { id: 'mobilkertas-5', name: 'Lembah Daun Gugur', len: 60, speed: 1.32, dens: 0.6, gates: [0.25, 0.5, 0.75, 0.9],
      theme: { sky: 'sunset-01', far: 'autumn', mid: 'autumn', grass: ['#F2C89A', '#E9BB88'], road: ['#BF9B74', '#B48F68'], props: ['tree-round', 'hay', 'fence', 'rock'] },
      say: 'Daun kertas oranye berguguran. Tetap di jalurmu!' },
    { id: 'mobilkertas-6', name: 'Pantai Kertas', len: 62, speed: 1.4, dens: 0.64, gates: [0.25, 0.5, 0.75, 0.9],
      theme: { sky: 'clear-day-01', far: 'beach-resort', mid: 'coast', grass: ['#F4E6C4', '#EADBB4'], road: ['#C8AE8A', '#BDA37E'], props: ['palm', 'bush', 'lamp', 'rock'] },
      say: 'Pasir kertas dan laut biru. Ngebut di jalan pantai!' },
    { id: 'mobilkertas-7', name: 'Gunung Salju Kertas', len: 64, speed: 1.48, dens: 0.68, gates: [0.22, 0.44, 0.66, 0.86],
      theme: { sky: 'cloudy-01', far: 'snow', mid: 'snow', grass: ['#F4F7FA', '#E6EDF3'], road: ['#BCA88E', '#B19D83'], props: ['snow-pine', 'rock', 'sign', 'snow-pine'] },
      say: 'Salju kertas putih bersih. Jalannya licin, pelan-pelan di tikungan!' },
    { id: 'mobilkertas-8', name: 'Negeri Permen Kertas', len: 68, speed: 1.56, dens: 0.72, gates: [0.2, 0.4, 0.6, 0.78, 0.92],
      theme: { sky: 'clear-day-01', far: 'candy-land', mid: 'candy-land', grass: ['#E8D9F6', '#DDCBF0'], road: ['#D3B796', '#C8AC8A'], props: ['tree-small', 'planter', 'bush', 'banner-red'] },
      say: 'Final! Negeri permen dari kertas warna-warni. Siapa juaranya?' }
  ]
  LEVELS.forEach(function (l) { l.cat = 'mobilkertas'; l.veh = V; l.vname = N; D.levels.push(l); if (D.byId) D.byId[l.id] = l })
  var at = -1
  for (var i = 0; i < D.cats.length; i++) if (D.cats[i].id === 'balap') at = i
  if (at < 0) D.cats.push(CAT); else D.cats.splice(at, 0, CAT)
  // eight arenas fill two rows of four: BALAP PESAWAT no longer needs to span the last row
  D.cats.forEach(function (c) { if (c.id === 'balap') c.wide = false })
})(window)
