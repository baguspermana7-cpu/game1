/* G32 Blippi -- Petualangan Kendaraan: categories + levels (data only). Art keys: 'lib:<key>' = shared library
 * ../Dunia-Emosi/assets/db/lib/<key>.webp (never copied); 'g:<key>' = assets/blippi/<key>.webp (owner art; placeholder if absent).
 * len = run length in world seconds at speed 1; gates = question checkpoints (progress fractions). */
(function (w) {
  'use strict'
  var CATS = [
    { id: 'darat', name: 'DARAT', sub: 'Tiga jalur, geser kiri dan kanan', tint: '#CDEFE0', ink: '#1F6B4E', icon: 'lib:mojo-rear/delivery', engine: 'land', ctl: 'Geser atau ketuk kiri-kanan' },
    { id: 'udara', name: 'UDARA', sub: 'Pesawat laut lepas landas ke langit', tint: '#CFE6FB', ink: '#1D5FD4', icon: 'lib:vehicles/airplane', engine: 'air', ctl: 'Seret naik-turun' },
    { id: 'angkasa', name: 'LUAR ANGKASA', sub: 'Roket menyusuri bintang dan planet', tint: '#E3D7F7', ink: '#5B3FA8', icon: 'lib:mojo-chase/items/rocket', engine: 'space', ctl: 'Seret kiri-kanan' },
    { id: 'air', name: 'AIR', sub: 'Berlayar di laut, pulau dan es', tint: '#FFDCCB', ink: '#B4510F', icon: 'lib:tk-ship/tugboat-red', engine: 'water', ctl: 'Seret kiri-kanan' }
  ]
  // theme: palette + scenery keys used by the engine; speed 1 = relaxed; dens = obstacle density 0..1
  var LEVELS = [
    { id: 'darat-1', cat: 'darat', name: 'Kota Ceria', veh: 'lib:mojo-rear/delivery', vname: 'Mobil Antar', len: 46, speed: 1, dens: 0.35, gates: [0.34, 0.68], theme: { sky: 'clear-day-01', far: 'town', mid: 'town', grass: ['#BFE8A8', '#B3E09B'], road: ['#9AA3B8', '#8F98AE'], props: ['tree-round', 'lamp', 'bush', 'tree-small'] }, say: 'Ayo jalan-jalan keliling kota!' },
    { id: 'darat-2', cat: 'darat', name: 'Hutan Pinus', veh: 'lib:mojo-rear/dumper', vname: 'Truk Bak', len: 52, speed: 1.12, dens: 0.5, gates: [0.3, 0.6, 0.85], theme: { sky: 'cloudy-01', far: 'forest', mid: 'forest', grass: ['#A8DDA0', '#98D08F'], road: ['#9AA3B8', '#8F98AE'], props: ['pine', 'tree-round', 'rocks', 'bush'] }, say: 'Hutan ini sejuk. Hati-hati kerucutnya!' },
    { id: 'darat-3', cat: 'darat', name: 'Pantai Pelangi', veh: 'lib:mojo-rear/ambulance', vname: 'Mobil Tolong', len: 56, speed: 1.25, dens: 0.6, gates: [0.28, 0.55, 0.82], theme: { sky: 'clear-day-01', far: 'beach-resort', mid: 'coast', grass: ['#F6E7B4', '#EFDCA0'], road: ['#A9AEC0', '#9EA3B6'], props: ['palm', 'bush', 'rocks', 'lamp'] }, say: 'Pantai! Angin laut terasa segar.' },
    { id: 'darat-4', cat: 'darat', name: 'Gurun Senja', veh: 'lib:mojo-rear/excavator', vname: 'Ekskavator', len: 60, speed: 1.38, dens: 0.7, gates: [0.25, 0.5, 0.75, 0.9], theme: { sky: 'sunset-01', far: 'desert', mid: 'desert', grass: ['#F7D9A8', '#F2CD92'], road: ['#B7A9AE', '#AC9EA4'], props: ['cactus', 'rocks', 'cactus-2', 'boulders'] }, say: 'Gurun sudah hangat. Kumpulkan bintangnya!' },

    { id: 'udara-1', cat: 'udara', name: 'Pagi di Teluk', veh: 'seaplane', vname: 'Pesawat Laut', len: 50, speed: 1, dens: 0.3, gates: [0.34, 0.68], theme: { sky: ['#BFE6FF', '#EAF7FF'], far: 'coast', night: false }, say: 'Pesawat laut siap lepas landas dari air!' },
    { id: 'udara-2', cat: 'udara', name: 'Awan Pelangi', veh: 'seaplane', vname: 'Pesawat Laut', len: 54, speed: 1.1, dens: 0.45, gates: [0.3, 0.6, 0.85], theme: { sky: ['#C9E3FF', '#FFE8F3'], far: 'candy-land', night: false }, say: 'Awan hari ini seperti permen kapas.' },
    { id: 'udara-3', cat: 'udara', name: 'Langit Senja', veh: 'seaplane', vname: 'Pesawat Laut', len: 58, speed: 1.2, dens: 0.55, gates: [0.28, 0.55, 0.82], theme: { sky: ['#FFC9A6', '#FFEBC7'], far: 'beach-resort', night: false }, say: 'Matahari mulai turun. Langitnya jingga!' },
    { id: 'udara-4', cat: 'udara', name: 'Malam Berbintang', veh: 'seaplane', vname: 'Pesawat Laut', len: 62, speed: 1.3, dens: 0.65, gates: [0.25, 0.5, 0.75, 0.9], theme: { sky: ['#2B3A7A', '#8E86D6'], far: 'night-highway', night: true }, say: 'Malam yang tenang. Bintang menemani kita.' },

    { id: 'angkasa-1', cat: 'angkasa', name: 'Dekat Bulan', veh: 'rocket', vname: 'Roket Kecil', len: 46, speed: 1, dens: 0.3, gates: [0.34, 0.68], theme: { bg: ['#2A2F6B', '#5A4BA8'], planets: ['#FFD9A8', '#BFE3FF'], neb: ['#C9A8FF', '#8FD3FF'] }, say: 'Tiga, dua, satu, meluncur!' },
    { id: 'angkasa-2', cat: 'angkasa', name: 'Taman Planet', veh: 'rocket', vname: 'Roket Kecil', len: 52, speed: 1.12, dens: 0.45, gates: [0.3, 0.6, 0.85], theme: { bg: ['#1F2A66', '#6A4FB8'], planets: ['#FFB8C9', '#B8F0D8', '#FFE29A'], neb: ['#FFB8E0', '#9AD0FF'] }, say: 'Lihat, ada banyak planet cantik!' },
    { id: 'angkasa-3', cat: 'angkasa', name: 'Sabuk Batu', veh: 'rocket', vname: 'Roket Kecil', len: 56, speed: 1.24, dens: 0.6, gates: [0.28, 0.55, 0.82], theme: { bg: ['#222A5E', '#4F6BC4'], planets: ['#E3D7F7', '#FFD6A0'], neb: ['#A8E6FF', '#FFC9E8'] }, say: 'Batu-batu angkasa melayang. Pelan-pelan saja.' },
    { id: 'angkasa-4', cat: 'angkasa', name: 'Galaksi Permen', veh: 'rocket', vname: 'Roket Kecil', len: 60, speed: 1.36, dens: 0.7, gates: [0.25, 0.5, 0.75, 0.9], theme: { bg: ['#3A2370', '#C77DD0'], planets: ['#FFD1E8', '#CFF5E6', '#FFF1A8'], neb: ['#FFB3D9', '#B3E0FF'] }, say: 'Galaksi yang manis! Ayo terbang!' },

    { id: 'air-1', cat: 'air', name: 'Teluk Tenang', veh: 'lib:tk-top/tug', vname: 'Kapal Tunda', len: 46, speed: 1, dens: 0.3, gates: [0.34, 0.68], theme: { water: ['#9BE6F2', '#2E9FC9'], foam: '#FFFFFF', deco: ['palm-island'], obs: ['barrel'] }, say: 'Air tenang. Ayo berlayar!' },
    { id: 'air-2', cat: 'air', name: 'Laut Karang', veh: 'lib:tk-top/fastferry', vname: 'Kapal Cepat', len: 52, speed: 1.12, dens: 0.45, gates: [0.3, 0.6, 0.85], theme: { water: ['#8EE3E0', '#2A94BE'], foam: '#FFFFFF', deco: ['palm-island', 'arch-island'], obs: ['barrel', 'iceberg-2'] }, say: 'Banyak pulau kecil di sini.' },
    { id: 'air-3', cat: 'air', name: 'Samudra Es', veh: 'lib:tk-top/lifeboat', vname: 'Kapal Penolong', len: 56, speed: 1.22, dens: 0.55, gates: [0.28, 0.55, 0.82], theme: { water: ['#C4EEFA', '#4C9FD2'], foam: '#F4FBFF', deco: ['iceberg-big', 'snow-island'], obs: ['iceberg-2', 'barrel'] }, say: 'Brr, dingin! Hati-hati bongkahan es.' },
    { id: 'air-4', cat: 'air', name: 'Lautan Senja', veh: 'lib:tk-top/sailyacht', vname: 'Kapal Layar', len: 60, speed: 1.32, dens: 0.65, gates: [0.25, 0.5, 0.75, 0.9], theme: { water: ['#A9D8F0', '#2F78B4'], glow: 'rgba(255,150,80,.38)', foam: '#FFF3E4', deco: ['lighthouse-sunset', 'palm-island'], obs: ['barrel', 'iceberg-2'] }, say: 'Laut berwarna jingga. Cantik sekali.' }
  ]
  w.BlippiTripData = { cats: CATS, levels: LEVELS, byId: LEVELS.reduce(function (m, l) { m[l.id] = l; return m }, {}) }
})(window)
