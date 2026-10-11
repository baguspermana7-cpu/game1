/* G32 Blippi -- CONTENT. Stable ids, Indonesian lines, reward keys.
 * Runtime (games/blippi*.js) reads this and never hardcodes a mission line.
 * PRD v3 refs: 10.1 vehicles, 10.2 capability tags, 11.2-11.3 catalogue, 13.2-13.3 rewards, 16.2 hint ladder.
 */
(function (w) {
  'use strict'

  var VEHICLES = [
    { id: 'buggy', name: 'BUGGY', art: 'veh-buggy', thumb: 'thumb-buggy', tags: ['drive_land', 'observe'],
      say: 'Ayo jelajah!', demo: { id: 'honk', label: 'COBA KLAKSON' },
      modules: [
        { id: 'ban-jalan', name: 'BAN JALAN', art: 'modul-ban-jalan', info: 'Ban halus. Melaju mulus di jalan yang keras.' },
        { id: 'ban-berpola', name: 'BAN BERPOLA', art: 'modul-ban-berpola', info: 'Ban bergerigi. Tidak mudah tergelincir di lumpur.' }
      ] },
    { id: 'truk-air', name: 'TRUK AIR', art: 'veh-truk-air', thumb: 'thumb-truk-air', tags: ['pump_water', 'spray', 'haul'],
      say: 'Ayo alirkan air!', demo: { id: 'spray', label: 'COBA SEMPROT' },
      modules: [
        { id: 'pompa', name: 'POMPA', art: 'modul-pompa', info: 'Pompa mendorong air dari tangki lewat selang.' },
        { id: 'semprot', name: 'SEMPROT', art: 'modul-semprot', info: 'Nozzle semprot. Air keluar jauh dan terarah.' }
      ] },
    { id: 'excavator', name: 'EXCAVATOR', art: 'veh-excavator', thumb: 'thumb-excavator', tags: ['dig'],
      say: 'Ayo gali pasirnya!', demo: { id: 'dig', label: 'COBA GALI' },
      modules: [
        { id: 'bucket-sempit', name: 'BUCKET SEMPIT', art: 'modul-bucket-sempit', info: 'Bucket sempit. Cocok untuk parit kecil.' },
        { id: 'bucket-lebar', name: 'BUCKET LEBAR', art: 'modul-bucket-lebar', info: 'Bucket lebar. Sekali gali dapat banyak pasir.' }
      ] },
    { id: 'dump-truck', name: 'DUMP TRUCK', art: 'veh-dump-truck', thumb: 'veh-dump-truck', tags: ['haul', 'tip'],
      say: 'Ayo muat dan tuang!', demo: { id: 'honk', label: 'COBA KLAKSON' }, modules: [] },
    { id: 'tow-truck', name: 'TRUK DEREK', art: 'veh-tow-truck', thumb: 'veh-tow-truck', tags: ['tow', 'drive_land'],
      say: 'Ayo tarik gerobaknya!', demo: { id: 'honk', label: 'COBA KLAKSON' }, modules: [] },
    { id: 'mobile-crane', name: 'DEREK', art: 'veh-mobile-crane', thumb: 'veh-mobile-crane', tags: ['lift_hook', 'haul'],
      say: 'Ayo angkat dan turunkan!', demo: { id: 'honk', label: 'COBA KLAKSON' }, modules: [] }
  ]

  var WORLDS = [
    { id: 'kota-roda', name: 'KOTA RODA', mission: 'W01-M01', missions: ['W01-M01', 'W01-M02', 'W01-M03', 'W01-M04', 'W01-M05'], finale: 'W01-M05', art: 'pulau-kota-roda', artDone: 'pulau-kota-roda-selesai', box: [15, 70, 640, 250], label: [275, 293, 235, 50], thumb: 'thumb-jalan-pertamaku' },
    { id: 'taman-air', name: 'TAMAN AIR', locked: 'Terbuka setelah Kota Roda.', after: 'W01-M05', mission: 'W02-M01', missions: ['W02-M01', 'W02-M02', 'W02-M03', 'W02-M04', 'W02-M05'], art: 'pulau-taman-air', artDone: 'pulau-taman-air-selesai', box: [625, 150, 480, 215], label: [750, 322, 208, 48], thumb: 'thumb-taman-air' },
    { id: 'eco-park', name: 'ECO PARK', mission: 'W03-M01', missions: ['W03-M01', 'W03-M02', 'W03-M03', 'W03-M04', 'W03-M05'], finale: 'W03-M05', thumb: 'veh-recycling-truck', art: 'pulau-eco-park', artDone: 'pulau-eco-park-selesai', box: [1090, 95, 560, 300], label: [1248, 320, 215, 50] },
    { id: 'kebun-ceria', name: 'KEBUN CERIA', locked: 'Terbuka setelah Eco Park.', art: 'pulau-kebun-ceria', box: [155, 355, 560, 330], label: [307, 598, 220, 50] },
    { id: 'pelabuhan', name: 'PELABUHAN PENJELAJAH', locked: 'Terbuka setelah Kebun Ceria.', art: 'pulau-pelabuhan', box: [665, 385, 480, 300], label: [800, 606, 248, 66] },
    { id: 'wonder-lab', name: 'WONDER LAB', mission: 'W06-M01', missions: ['W06-M01', 'W06-M02', 'W06-M03', 'W06-M04', 'W06-M05'], finale: 'W06-M05', thumb: 'veh-monster-truck', art: 'pulau-wonder-lab', artDone: 'pulau-wonder-lab-selesai', box: [1130, 395, 510, 310], label: [1303, 634, 218, 50] }
  ]

  var MISSIONS = {
    'W01-M01': {
      id: 'W01-M01', world: 'kota-roda', title: 'Jalan Pertamaku', sub: 'Kota Roda', thumb: 'thumb-jalan-pertamaku',
      needs: ['drive_land'], vehicle: 'buggy', bg: 'bg-misi-jalan',
      reward: { key: 'reward:W01-M01', sticker: 'stiker-buggy', stickerName: 'Stiker Buggy' },
      worldDelta: 'kota-roda:jalur-taman',
      steps: [
        { id: 'pasang', label: 'PASANG', tool: 'papan', toolName: 'PAPAN', toolArt: 'tool-papan', icon: 'plank',
          instr: 'Pilih jalan. Seret papan.',
          wrong: 'Belum waktunya. Sekarang kita pasang papan dulu.' },
        { id: 'jalan', label: 'JALAN', tool: 'jalan', toolName: 'JALAN', toolArt: 'tool-jalan', icon: 'wheel',
          instr: 'Tahan tombol, buggy melaju.',
          wrong: 'Pasang papan dulu, baru buggy bisa jalan.' },
        { id: 'antar', label: 'ANTAR', tool: 'paket', toolName: 'PAKET', toolArt: 'tool-paket', icon: 'box',
          instr: 'Seret paket ke bendera.',
          wrong: 'Antar paketnya setelah sampai di bendera.' }
      ],
      lines: {
        start: 'Pilih jalan atas atau bawah. Seret papan!',
        pickRoute: 'Bagus! Seret papannya satu per satu.',
        shortWay: 'Jalan atas: pendek, cuma dua papan!',
        longWay: 'Jalan bawah: panjang, tiga papan.',
        board: 'Satu papan terpasang!',
        built: 'Jembatan jadi! Tahan JALAN untuk menyeberang.',
        arrive: 'Sampai! Ketuk paketnya untuk mengantar.',
        dragParcel: 'Seret paketnya sampai ke bendera.',
        parcelMiss: 'Belum sampai. Letakkan paket di bendera ya.',
        retryNear: 'Tidak apa-apa. Taruh papan di tempat yang bergaris ya.',
        wrongTool: 'Belum waktunya. Pakai alat yang menyala oranye ya.',
        win: 'Hore! Jalur taman pertama sudah jadi!'
      },
      hints: ['Papan yang bergaris menunggu kamu.', 'Seret papan dari tumpukan ke tempat yang bergaris.', 'Lihat tanganku. Ketuk tumpukan papan ini!']
    },
    'W01-M02': {
      id: 'W01-M02', world: 'kota-roda', title: 'Harta di Bawah Pasir', sub: 'Kota Roda', thumb: 'thumb-jalan-pertamaku',
      needs: ['dig'], vehicle: 'excavator', bg: 'bg-w01-m02-pasir',
      reward: { key: 'reward:W01-M02', sticker: 'stiker-harta', stickerName: 'Stiker Harta' },
      worldDelta: 'kota-roda:harta-pasir',
      steps: [
        { id: 'baca', label: 'BACA', tool: 'baca', toolName: 'PETUNJUK', toolArt: 'tool-baca', icon: 'bulb',
          instr: 'Ketuk gulungan petunjuk.', wrong: 'Baca petunjuknya dulu. Menggali nanti ya.' },
        { id: 'gali', label: 'GALI', tool: 'gali', toolName: 'GALI', toolArt: 'tool-gali', icon: 'box',
          instr: 'Ketuk petak, ekskavator menggali.', wrong: 'Ketuk petak pasir supaya ekskavator menggali.' },
        { id: 'pasang', label: 'PASANG', tool: 'pasang', toolName: 'PASANG', toolArt: 'tool-taman', icon: 'wheel',
          instr: 'Seret ke bayangannya.', wrong: 'Semua sudah ketemu. Pasang di taman.' }
      ],
      lines: {
        start: 'Ada tiga mainan taman terkubur di pasir. Baca petunjuknya!',
        read: 'Cocokkan bentuknya. Ketuk petak yang menyala di peta kecil.',
        readFirst: 'Baca petunjuk dulu ya.',
        found: 'Ketemu!',
        empty: 'Cuma kerikil. Lihat petunjuknya lagi!',
        dugAlready: 'Petak ini sudah digali. Coba yang lain!',
        allFound: 'Semua ketemu! Pasang di taman.',
        dragIt: 'Seret ke bayangannya di taman.',
        wrongSpot: 'Bukan di sini. Cari bayangan yang sama.',
        wrongTool: 'Pakai alat yang menyala oranye ya.',
        win: 'Hore! Taman punya tiga mainan baru!'
      },
      hints: ['Gulungan petunjuk bercahaya. Baca dulu.', 'Lihat kotak kecil di petunjuk: petak oranye itu tempatnya.', 'Lihat tanganku. Ketuk petak ini!']
    },
    'W01-M03': {
      id: 'W01-M03', world: 'kota-roda', title: 'Bukit dan Muatan', sub: 'Kota Roda', thumb: 'thumb-jalan-pertamaku',
      needs: ['haul'], vehicle: 'dump-truck', bg: 'bg-w01-m03-bukit',
      reward: { key: 'reward:W01-M03', sticker: 'stiker-bukit', stickerName: 'Stiker Bukit', vehicle: 'dump-truck' },
      worldDelta: 'kota-roda:bukit-uji',
      steps: [
        { id: 'muat', label: 'MUAT', tool: 'muat', toolName: 'MUAT', toolArt: 'tool-antar', icon: 'box',
          instr: 'Seret 4 kotak ke truk.', wrong: 'Muat kotaknya dulu ke bak truk.' },
        { id: 'uji', label: 'UJI', tool: 'uji', toolName: 'UJI', toolArt: 'tool-uji', icon: 'wheel',
          instr: 'Seret truk ke tiap ramp.', wrong: 'Kotak sudah dimuat. Saatnya menguji ramp.' },
        { id: 'antar', label: 'TUANG', tool: 'tuang', toolName: 'TUANG', toolArt: 'tool-tuang', icon: 'box',
          instr: 'Ramp mana ke garis biru?', wrong: 'Ujinya sudah selesai. Antar muatan ke garis biru.' }
      ],
      lines: {
        start: 'Muat kotak, uji ramp, lalu tuang di garis biru!',
        dragCrate: 'Seret kotaknya ke bak truk.',
        crateMiss: 'Belum masuk. Lepas di atas bak truk ya.',
        more: 'Satu kotak masuk!',
        loaded: 'Muatan penuh! Sekarang uji ramp.',
        loadFirst: 'Muat kotaknya dulu ya.',
        guess: 'Tebakan tersimpan. Seret truk ke ramp untuk membuktikan!',
        dragTruck: 'Seret trukmu ke salah satu ramp.',
        noRamp: 'Belum di ramp. Taruh truk di atas ramp.',
        both: 'Ramp tinggi meluncur lebih jauh. Dua bendera tersimpan!',
        short: 'Kurang jauh. Coba ramp yang lain!',
        atBlue: 'Sampai di garis biru! Tahan truk untuk menuang.',
        holdLonger: 'Tahan terus sampai kotaknya meluncur.',
        wrongTool: 'Pakai alat yang menyala oranye ya.',
        win: 'Hore! Muatan sampai di garis biru!'
      },
      hints: ['Kotak yang berkedip bisa diseret ke truk.', 'Ramp yang lebih tinggi memberi dorongan lebih kuat.', 'Lihat tanganku. Seret seperti ini!']
    },
    'W01-M04': {
      id: 'W01-M04', world: 'kota-roda', title: 'Jembatan untuk Semua', sub: 'Kota Roda', thumb: 'thumb-jalan-pertamaku',
      needs: ['lift_hook'], vehicle: 'mobile-crane', bg: 'bg-w01-m04-jembatan',
      reward: { key: 'reward:W01-M04', sticker: 'stiker-jembatan', stickerName: 'Stiker Jembatan', vehicle: 'mobile-crane' },
      worldDelta: 'kota-roda:jembatan-akses',
      steps: [
        { id: 'pasang', label: 'PASANG', tool: 'balok', toolName: 'KAIT', toolArt: 'tool-kait', icon: 'wheel',
          instr: 'Angkat balok ke bayangan.', wrong: 'Pasang jembatannya dulu. Truk menunggu.' },
        { id: 'jalan', label: 'JALAN', tool: 'jalan', toolName: 'JALAN', toolArt: 'tool-jalan', icon: 'wheel',
          instr: 'Tahan truk agar menyeberang.', wrong: 'Jembatan sudah jadi. Tahan truknya!' },
        { id: 'antar', label: 'ANGKAT', tool: 'paket', toolName: 'ANGKAT', toolArt: 'tool-paket', icon: 'box',
          instr: 'Angkat paket ke bayangan.', wrong: 'Truk sudah sampai. Angkat paketnya.' }
      ],
      lines: {
        start: 'Sungai memisahkan jalan. Derek akan membuat jembatan!',
        short: 'Pendek belum sampai. Pasang tiang tengah!',
        dragHook: 'Seret kait ke balok.',
        dragHookParcel: 'Seret kait ke paket di truk.',
        lifted: 'Terangkat! Bawa ke bayangan.',
        dropMiss: 'Belum pas. Turunkan di bayangan ya.',
        postWhere: 'Tiang berdiri di air, di tengah sungai.',
        placed: 'Terpasang!',
        built: 'Jembatan jadi! Tahan truk untuk menyeberang.',
        wait: 'Jembatannya belum jadi. Truk menunggu di tepi.',
        parcelMiss: 'Belum pas. Turunkan paket di bayangan.',
        wrongTool: 'Pakai alat yang menyala oranye ya.',
        win: 'Hore! Jembatan terbuka untuk semua!'
      },
      hints: ['Kait yang menyala bisa mengangkat balok.', 'Bawa balok ke bentuk yang berkilau di sungai.', 'Lihat tanganku. Ikuti garis ini!']
    },
    'W01-M05': {
      id: 'W01-M05', world: 'kota-roda', title: 'Hari Pembukaan Taman', sub: 'Kota Roda', thumb: 'thumb-jalan-pertamaku',
      needs: ['dig'], vehicle: 'excavator', bg: 'bg-w01-m05-pembukaan',
      reward: { key: 'reward:W01-M05', sticker: 'stiker-taman', stickerName: 'Stiker Taman', badge: 'lencana-w01', badgeName: 'Lencana Kota Roda' },
      worldDelta: 'kota-roda:taman-buka',
      steps: [
        { id: 'siapkan', label: 'SIAPKAN', tool: 'siapkan', toolName: 'SIAPKAN', toolArt: 'tool-siapkan', icon: 'wheel',
          instr: 'Seret tiga benda ke tempatnya.', wrong: 'Siapkan tamannya dulu. Gerbang dibuka nanti.' },
        { id: 'buka', label: 'BUKA', tool: 'buka', toolName: 'BUKA', toolArt: 'tool-buka', icon: 'box',
          instr: 'Ketuk gerbang untuk membuka!', wrong: 'Semua siap. Sekarang buka gerbangnya.' }
      ],
      lines: {
        start: 'Hari ini taman dibuka! Kerjakan dalam urutan yang kamu mau.',
        dragIt: 'Seret bendanya ke tempat yang bergaris.',
        miss: 'Belum pas. Letakkan di tempat yang bergaris.',
        moreSand: 'Satu lagi pasir!',
        toysFirst: 'Mainan butuh pasir dulu. Taruh pasir ya.',
        done1: 'Selesai satu!',
        ready: 'Semua siap! Ketuk gerbang untuk membuka.',
        wrongTool: 'Pakai alat yang menyala oranye ya.',
        win: 'Hore! Taman Kota Roda resmi dibuka!'
      },
      hints: ['Benda yang menyala bisa diseret ke garis oranye.', 'Pasir dulu, supaya mainan punya tempat berdiri.', 'Lihat tanganku. Seret seperti ini!']
    },
    'W02-M01': {
      id: 'W02-M01', world: 'taman-air', title: 'Kincir yang Menunggu', sub: 'Taman Air', thumb: 'thumb-taman-air',
      needs: ['pump_water'], vehicle: 'truk-air', bg: 'bg-misi-kincir',
      reward: { key: 'reward:W02-M01', sticker: 'stiker-kincir', stickerName: 'Stiker Kincir', vehicle: 'truk-air' },
      worldDelta: 'taman-air:kincir-aktif',
      steps: [
        { id: 'sambung', label: 'SAMBUNG', tool: 'selang', toolName: 'SELANG', toolArt: 'tool-selang', icon: 'hose',
          instr: 'Sambungkan selang ke kincir.',
          wrong: 'Sambungkan selang dulu. Katup dan pompa dipakai nanti.' },
        { id: 'buka', label: 'BUKA', tool: 'katup', toolName: 'KATUP', toolArt: 'tool-katup', icon: 'valve',
          instr: 'Pilih katup, lalu putar untuk membuka.',
          wrong: 'Pilih katup untuk membuka jalan air. Pompa nanti ya.' },
        { id: 'pompa', label: 'POMPA', tool: 'pompa', toolName: 'POMPA', toolArt: 'tool-pompa', icon: 'drop',
          instr: 'Pilih pompa, lalu tahan untuk memompa.',
          wrong: 'Pompa dipakai setelah katup terbuka.' }
      ],
      lines: {
        start: 'Kincirnya menunggu air. Ayo sambungkan selang!',
        connected: 'Tersambung! Sekarang buka katupnya.',
        retry: 'Hampir! Coba lagi, dekatkan ke lubang pipa.',
        opened: 'Katup terbuka! Sekarang pompa airnya.',
        pumping: 'Terus pompa...',
        pickValve: 'Pilih katup dulu di bawah.',
        pickPump: 'Pilih pompa dulu di bawah.',
        win: 'Hore! Kincirnya berputar!'
      },
      hints: ['Ujung selang bercahaya. Seret ke lubang pipa.', 'Ikuti panah: dari ujung selang ke lubang pipa.', 'Lihat tanganku. Seret seperti ini!']
    },
    'W02-M02': {
      id: 'W02-M02', world: 'taman-air', title: 'Ke Mana Airnya Pergi?', sub: 'Taman Air', thumb: 'thumb-taman-air',
      needs: ['pump_water'], vehicle: 'truk-air', bg: 'bg-w02-m02-aliran',
      reward: { key: 'reward:W02-M02', sticker: 'stiker-sambung', stickerName: 'Stiker Sambungan' },
      worldDelta: 'taman-air:kolam-uji',
      steps: [
        { id: 'cari', label: 'CARI', tool: 'cari', toolName: 'POMPA', toolArt: 'tool-pompa', icon: 'drop',
          instr: 'Tahan pompa. Lihat airnya.', wrong: 'Tahan pompanya dulu untuk melihat aliran air.' },
        { id: 'sambung', label: 'SAMBUNG', tool: 'sambung', toolName: 'SAMBUNG', toolArt: 'tool-selang', icon: 'hose',
          instr: 'Seret konektor bulat ke celah.', wrong: 'Pasang konektor di celah selang dulu.' },
        { id: 'uji', label: 'UJI', tool: 'uji', toolName: 'UJI', toolArt: 'tool-pompa', icon: 'drop',
          instr: 'Tahan pompa. Isi kolamnya.', wrong: 'Sudah tersambung. Tahan pompa untuk menguji.' }
      ],
      lines: {
        start: 'Airnya tidak sampai ke kolam. Ayo cari sebabnya!',
        found: 'Airnya berhenti di sini. Selangnya terputus!',
        needPlug: 'Pasang konektor dulu, baru pompa.',
        dragPlug: 'Seret konektor ke celah selang.',
        wrongShape: 'Bentuknya belum pas. Cari yang bulat.',
        fits: 'Pas! Selangnya tersambung.',
        wrongTool: 'Pakai alat yang menyala oranye ya.',
        win: 'Hore! Kolam percobaan terisi air!'
      },
      hints: ['Pompa dan celah selang menyala. Mulai dari pompa.', 'Kartu bulat di selang: cari konektor yang sama.', 'Lihat tanganku. Seret seperti ini!']
    },
    'W02-M03': {
      id: 'W02-M03', world: 'taman-air', title: 'Gerobak di Lumpur', sub: 'Taman Air', thumb: 'thumb-taman-air',
      needs: ['tow'], vehicle: 'tow-truck', bg: 'bg-w02-m03-lumpur',
      reward: { key: 'reward:W02-M03', sticker: 'stiker-gerobak', stickerName: 'Stiker Gerobak', vehicle: 'tow-truck' },
      worldDelta: 'taman-air:jalur-kebun',
      steps: [
        { id: 'kait', label: 'KAIT', tool: 'kait', toolName: 'KAIT', toolArt: 'tool-kait', icon: 'wheel',
          instr: 'Seret kait ke gerobak.', wrong: 'Pasang kaitnya dulu ke gerobak.' },
        { id: 'ban', label: 'BAN', tool: 'ban', toolName: 'BAN', toolArt: 'tool-ban', icon: 'wheel',
          instr: 'Seret ban ke truk.', wrong: 'Kait sudah terpasang. Pilih ban untuk truk derek.' },
        { id: 'tarik', label: 'TARIK', tool: 'tarik', toolName: 'TARIK', toolArt: 'tool-rute', icon: 'box',
          instr: 'Gambar jalan ke bendera.', wrong: 'Ban sudah dipilih. Gambar jalan dengan jarimu.' }
      ],
      lines: {
        start: 'Gerobaknya harus sampai ke bendera!',
        dragHook: 'Seret kaitnya ke gerobak yang berkilau.',
        hookMiss: 'Belum pas. Taruh kait di bayangan kait.',
        hooked: 'Terkait! Sekarang pilih ban.',
        dragTire: 'Seret ban ke truk derek.',
        tireSmooth: 'Ban halus. Cepat di jalan kering.',
        tireTread: 'Ban bergerigi. Mencengkeram lumpur.',
        startAtTruck: 'Mulai gambar dari truk derek ya.',
        drawIt: 'Gambar jalan panjang dengan jarimu.',
        routeShort: 'Jalannya belum sampai bendera. Lanjutkan!',
        slip: 'Ban halus tergelincir di lumpur. Coba ban bergerigi, atau lewat jalan kering!',
        wrongTool: 'Pakai alat yang menyala ya.',
        win: 'Hore! Gerobak sampai di bendera!'
      },
      hints: ['Kait yang berkilau diseret ke gerobak.', 'Ban bergerigi mencengkeram lumpur. Jalan kering aman untuk semua ban.', 'Lihat tanganku. Ikuti garis ini!']
    },
    'W02-M04': {
      id: 'W02-M04', world: 'taman-air', title: 'Dua Jalan untuk Air', sub: 'Taman Air', thumb: 'thumb-taman-air',
      needs: ['pump_water'], vehicle: 'truk-air', bg: 'bg-w02-m04-dua-jalan',
      reward: { key: 'reward:W02-M04', sticker: 'stiker-aliran', stickerName: 'Stiker Aliran' },
      worldDelta: 'taman-air:kanal-bercabang',
      steps: [
        { id: 'kira', label: 'KIRA-KIRA', tool: 'kira', toolName: 'KIRA-KIRA', toolArt: 'tool-kira', icon: 'bulb',
          instr: 'Ketuk wadah yang akan terisi.', wrong: 'Tebak dulu wadah mana yang terisi air.' },
        { id: 'uji', label: 'UJI', tool: 'uji', toolName: 'POMPA', toolArt: 'tool-pompa', icon: 'drop',
          instr: 'Tahan pompa. Lihat airnya.', wrong: 'Tebakanmu tersimpan. Tahan pompa untuk menguji.' },
        { id: 'buka', label: 'BUKA', tool: 'buka', toolName: 'KATUP', toolArt: 'tool-katup', icon: 'valve',
          instr: 'Putar katup, lalu tahan pompa.', wrong: 'Buka katup jalur yang tertutup.' }
      ],
      lines: {
        start: 'Air punya dua jalan. Wadah mana yang akan terisi?',
        guessed: 'Tebakan tersimpan. Sekarang uji dengan pompa!',
        guessFirst: 'Tebak dulu: ketuk salah satu wadah.',
        hit: 'Tebakanmu benar! Satu jalan tertutup.',
        miss: 'Hampir! Satu jalan tertutup, jadi air hanya lewat jalan yang terbuka.',
        openFirst: 'Putar katup yang menyala dulu.',
        valveOpen: 'Terbuka! Tahan pompa lagi.',
        wrongTool: 'Pakai alat yang menyala oranye ya.',
        win: 'Hore! Kedua wadah terisi air!'
      },
      hints: ['Dua wadah menyala. Ketuk salah satu.', 'Pintu yang tertutup menahan air.', 'Lihat tanganku. Putar katup seperti ini!']
    },
    'W02-M05': {
      id: 'W02-M05', world: 'taman-air', title: 'Parade Air Ceria', sub: 'Taman Air', thumb: 'thumb-taman-air',
      needs: ['pump_water'], vehicle: 'truk-air', bg: 'bg-w02-m05-parade-air',
      reward: { key: 'reward:W02-M05', sticker: 'stiker-parade', stickerName: 'Stiker Parade', badge: 'lencana-w02', badgeName: 'Lencana Taman Air' },
      worldDelta: 'taman-air:parade',
      steps: [
        { id: 'sambung', label: 'SAMBUNG', tool: 'sambung', toolName: 'SELANG', toolArt: 'tool-selang', icon: 'hose',
          instr: 'Seret selang ke lubang kolam.', wrong: 'Sambungkan selang dulu ke kolam.' },
        { id: 'isi', label: 'ISI', tool: 'isi', toolName: 'POMPA', toolArt: 'tool-pompa', icon: 'drop',
          instr: 'Tahan pompa. Kolam terisi.', wrong: 'Selang sudah tersambung. Tahan pompa.' },
        { id: 'pola', label: 'POLA', tool: 'pola', toolName: 'PANCURAN', toolArt: 'tool-pancuran', icon: 'drop',
          instr: 'Seret dua pancuran ke kolam.', wrong: 'Kolam sudah penuh. Pasang dua pancuran.' }
      ],
      lines: {
        start: 'Hari parade! Ayo hidupkan air mancur.',
        hoseMiss: 'Belum sampai. Dekatkan ke lingkaran di tepi kolam.',
        hoseFirst: 'Sambungkan selang dulu ya.',
        dragJet: 'Seret pancurannya ke lingkaran.',
        jetMiss: 'Belum pas. Taruh di lingkaran yang bergaris.',
        moreJet: 'Bagus! Satu lagi.',
        show: 'Lihat urutan pancuran pilihanmu!',
        wrongTool: 'Pakai alat yang menyala oranye ya.',
        win: 'Hore! Parade air dimulai!'
      },
      hints: ['Ujung selang menyala. Seret ke lingkaran.', 'Pancuran A dan B bisa masuk lingkaran mana saja.', 'Lihat tanganku. Seret seperti ini!']
    }
  }

  var STICKERS = [
    { id: 'W01-M01', name: 'Stiker Buggy', art: 'stiker-buggy' },
    { id: 'W02-M01', name: 'Stiker Kincir', art: 'stiker-kincir' },
    { id: 'W01-M02', name: 'Stiker Harta', art: 'stiker-harta' },
    { id: 'W01-M03', name: 'Stiker Bukit', art: 'stiker-bukit' },
    { id: 'W01-M04', name: 'Stiker Jembatan', art: 'stiker-jembatan' },
    { id: 'W01-M05', name: 'Stiker Taman', art: 'stiker-taman' },
    { id: 'W02-M02', name: 'Stiker Sambungan', art: 'stiker-sambung' },
    { id: 'W02-M03', name: 'Stiker Gerobak', art: 'stiker-gerobak' },
    { id: 'W02-M04', name: 'Stiker Aliran', art: 'stiker-aliran' },
    { id: 'W02-M05', name: 'Stiker Parade', art: 'stiker-parade' }
  ]

  /* ---------- W03 Eco Park (added by the W03 build; each mission appends its own block here) ---------- */
  VEHICLES.push({ id: 'recycling-truck', name: 'TRUK DAUR ULANG', art: 'veh-recycling-truck', thumb: 'veh-recycling-truck', tags: ['sort', 'haul'],
    say: 'Ayo pilah dan angkut!', demo: { id: 'honk', label: 'COBA KLAKSON' }, modules: [] })
  MISSIONS['W03-M01'] = {
    id: 'W03-M01', world: 'eco-park', title: 'Muatan Campur-Campur', sub: 'Eco Park', thumb: 'veh-recycling-truck',
    needs: ['sort'], vehicle: 'recycling-truck', bg: 'bg-w03-m01-pilah',
    reward: { key: 'reward:W03-M01', sticker: 'stiker-pilah', stickerName: 'Stiker Pilah', vehicle: 'recycling-truck' },
    worldDelta: 'eco-park:stasiun-sortir',
    steps: [
      { id: 'pilah', label: 'PILAH', tool: 'pilah', toolName: 'PILAH', toolArt: 'w3-bin-kertas', icon: 'box',
        instr: 'Seret sampah ke kotaknya.', wrong: 'Pilah sampahnya dulu ke tiga kotak.' },
      { id: 'angkut', label: 'ANGKUT', tool: 'angkut', toolName: 'ANGKUT', toolArt: 'veh-recycling-truck', icon: 'wheel',
        instr: 'Seret truk ke kotak.', wrong: 'Sampah sudah terpilah. Sekarang jemput kotaknya dengan truk.' },
      { id: 'antar', label: 'ANTAR', tool: 'antar', toolName: 'ANTAR', toolArt: 'w3-bale-kertas', icon: 'hand',
        instr: 'Tahan truk, antar ke rumah.', wrong: 'Kotak sudah diangkut. Tahan truknya supaya melaju.' }
    ],
    lines: {
      start: 'Sampahnya campur-campur. Ayo pilah!',
      more: 'Bagus! Pilah yang lain.',
      sorted: 'Semua sudah terpilah!',
      dragItem: 'Seret sampahnya ke kotak yang cocok.',
      noBin: 'Taruh sampahnya di dalam kotak.',
      sortFirst: 'Pilah dulu sampahnya ke kotak.',
      dragTruck: 'Seret trukku ke kotak yang berkilau.',
      noBinTruck: 'Dekatkan truk ke satu kotak.',
      more2: 'Hore! Jemput kotak yang lain.',
      loaded: 'Truk sudah penuh. Antar ke rumah daur ulang!',
      holdMore: 'Tahan terus, truknya melaju.',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Sampah sudah sampai di rumah daur ulang!'
    },
    hints: ['Sampah yang berkilau cocok dengan satu kotak.', 'Kotak yang menyala itu tempatnya.', 'Lihat tanganku. Seret seperti ini!']
  }
  STICKERS.push({ id: 'W03-M01', name: 'Stiker Pilah', art: 'stiker-pilah' })
  VEHICLES.push({ id: 'street-sweeper', name: 'TRUK SAPU', art: 'veh-street-sweeper', thumb: 'veh-street-sweeper', tags: ['sweep', 'clean'],
    say: 'Ayo sapu jalannya!', demo: { id: 'honk', label: 'COBA KLAKSON' }, modules: [] })
  MISSIONS['W03-M02'] = {
    id: 'W03-M02', world: 'eco-park', title: 'Jejak Sapu Raksasa', sub: 'Eco Park', thumb: 'veh-street-sweeper',
    needs: ['sweep'], vehicle: 'street-sweeper', bg: 'bg-w03-m02-sapu',
    reward: { key: 'reward:W03-M02', sticker: 'stiker-sapu', stickerName: 'Stiker Sapu', vehicle: 'street-sweeper' },
    worldDelta: 'eco-park:jalur-bersih',
    steps: [
      { id: 'sapu', label: 'SAPU', tool: 'sapu', toolName: 'SAPU', toolArt: 'veh-street-sweeper', icon: 'wheel',
        instr: 'Gambar jalan sapu zigzag.', wrong: 'Sapu dulu daunnya. Gambar jalan dengan jarimu.' },
      { id: 'lengkapi', label: 'LENGKAPI', tool: 'lengkapi', toolName: 'LENGKAPI', toolArt: 'w3-papan-lingkaran', icon: 'box',
        instr: 'Pasang papan yang cocok.', wrong: 'Daun sudah bersih. Lengkapi papan yang kosong.' },
      { id: 'irama', label: 'IRAMA', tool: 'irama', toolName: 'IRAMA', toolArt: 'w3-papan-segitiga', icon: 'hand',
        instr: 'Ketuk papan dari kiri.', wrong: 'Pola sudah lengkap. Ketuk papannya satu per satu.' }
    ],
    lines: {
      start: 'Ada pola rahasia di bawah daun!',
      startAtTruck: 'Mulai gambar dari truk sapu ya.',
      drawIt: 'Gambar jalan panjang dengan jarimu.',
      more: 'Masih ada %n papan tertutup daun. Zigzag lagi!',
      found: 'Pola rahasia! Ada lingkaran dan segitiga.',
      dragBoard: 'Seret papan yang cocok ke tempat kosong.',
      toGap: 'Taruh papannya di tempat kosong.',
      wrongBoard: 'Belum cocok. Lihat polanya: bergantian.',
      patternDone: 'Pas! Polanya lengkap.',
      tapStart: 'Ketuk papan dari kiri atas.',
      order: 'Mulai dari kiri, baris demi baris.',
      rhythm: 'Merdu! Lantai taman menyala.',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Jalur taman bersih dan cantik!'
    },
    hints: ['Truk sapu menyapu di sepanjang garismu. Gambar zigzag.', 'Papan yang tertutup daun masih ada. Sapu di sana.', 'Lihat tanganku. Ikuti garis ini!']
  }
  STICKERS.push({ id: 'W03-M02', name: 'Stiker Sapu', art: 'stiker-sapu' })
  MISSIONS['W03-M03'] = {
    id: 'W03-M03', world: 'eco-park', title: 'Roda Pemilah Berhenti', sub: 'Eco Park', thumb: 'veh-recycling-truck',
    needs: ['sort', 'repair'], vehicle: 'recycling-truck', bg: 'bg-w03-m03-roda-pemilah',
    reward: { key: 'reward:W03-M03', sticker: 'stiker-gear', stickerName: 'Stiker Gear' },
    worldDelta: 'eco-park:mesin-sortir',
    steps: [
      { id: 'pasang', label: 'PASANG', tool: 'pasang', toolName: 'PASANG', toolArt: 'w3-gear-kuning', icon: 'wheel',
        instr: 'Seret gear ke bayangannya.', wrong: 'Mesinnya mati. Pasang gear dulu.' },
      { id: 'pilah', label: 'PILAH', tool: 'pilah', toolName: 'PILAH', toolArt: 'w3-bin-plastik', icon: 'box',
        instr: 'Ketuk kotak yang cocok.', wrong: 'Gear sudah terpasang. Sekarang pilah sampahnya.' },
      { id: 'angkut', label: 'ANGKUT', tool: 'angkut', toolName: 'ANGKUT', toolArt: 'veh-recycling-truck', icon: 'hand',
        instr: 'Tahan truk, jemput kotak.', wrong: 'Sudah terpilah. Tahan truknya supaya melaju.' }
    ],
    lines: {
      start: 'Mesin pemilah mati. Gearnya hilang!',
      dragGear: 'Seret gear ke bayangan di dinding mesin.',
      noSocket: 'Taruh gear di bayangannya.',
      tooBig: 'Gear ini terlalu besar untuk tempat kecil.',
      tooSmall: 'Gear ini terlalu kecil. Cari yang paling besar.',
      more: 'Pas! Pasang gear yang lain.',
      running: 'Gearnya berputar! Mesin menyala.',
      next: 'Bagus! Sampah berikutnya.',
      sorted: 'Semua sudah terpilah!',
      fixFirst: 'Pasang gear dulu supaya mesin menyala.',
      sortFirst: 'Pilah dulu sampahnya.',
      holdMore: 'Tahan terus, truknya melaju.',
      loaded: 'Semua kotak sudah di truk!',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Mesin pemilah berputar lagi!'
    },
    hints: ['Gear yang berkilau cocok dengan satu bayangan.', 'Gear besar di tengah, gear kecil di samping.', 'Lihat tanganku. Seret seperti ini!']
  }
  STICKERS.push({ id: 'W03-M03', name: 'Stiker Gear', art: 'stiker-gear' })
  MISSIONS['W03-M04'] = {
    id: 'W03-M04', world: 'eco-park', title: 'Dari Kotak Menjadi Mainan', sub: 'Eco Park', thumb: 'veh-recycling-truck',
    needs: ['sort', 'build'], vehicle: 'recycling-truck', bg: 'bg-w03-m04-kotak-mainan',
    reward: { key: 'reward:W03-M04', sticker: 'stiker-reuse', stickerName: 'Stiker Pakai Ulang' },
    worldDelta: 'eco-park:wahana-kotak',
    steps: [
      { id: 'pilih', label: 'PILIH', tool: 'pilih', toolName: 'PILIH', toolArt: 'w3-kardus', icon: 'box',
        instr: 'Ketuk kardus dan tabung.', wrong: 'Pilih dulu benda yang bisa dipakai lagi.' },
      { id: 'bangun', label: 'BANGUN', tool: 'bangun', toolName: 'BANGUN', toolArt: 'w3-tabung', icon: 'plank',
        instr: 'Seret ke bayangannya.', wrong: 'Benda sudah dipilih. Sekarang bangun wahananya.' },
      { id: 'main', label: 'MAIN', tool: 'main', toolName: 'MAIN', toolArt: 'cast-child', icon: 'hand',
        instr: 'Ketuk anaknya, ayo main!', wrong: 'Wahana sudah jadi. Ketuk anaknya.' }
    ],
    lines: {
      start: 'Benda bekas bisa jadi mainan!',
      more: 'Bagus! Pilih yang lain.',
      picked: 'Truk sudah membawa semuanya!',
      chooseFirst: 'Pilih dulu: terowongan atau menara?',
      dragPiece: 'Seret ke bayangan yang berkilau.',
      toGhost: 'Taruh di bayangannya.',
      boxSpot: 'Kardus itu cocok di bayangan kotak.',
      tubeSpot: 'Tabung itu cocok di bayangan tabung.',
      more2: 'Pas! Pasang yang lain.',
      built: 'Wahananya jadi!',
      tapGirl: 'Ketuk anaknya, ayo main!',
      played: 'Asyik! Seru sekali!',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Kotak bekas jadi mainan taman!'
    },
    hints: ['Kardus dan tabung yang berkilau bisa dipakai lagi.', 'Bayangan menunjukkan tempat tiap benda.', 'Lihat tanganku. Seret seperti ini!']
  }
  STICKERS.push({ id: 'W03-M04', name: 'Stiker Pakai Ulang', art: 'stiker-reuse' })
  MISSIONS['W03-M05'] = {
    id: 'W03-M05', world: 'eco-park', title: 'Eco Park Dibuka', sub: 'Eco Park', thumb: 'veh-recycling-truck',
    needs: ['sort', 'sweep', 'build'], vehicle: 'recycling-truck', bg: 'bg-w03-m05-eco-dibuka',
    reward: { key: 'reward:W03-M05', sticker: 'stiker-eco', stickerName: 'Stiker Eco Park', badge: 'lencana-w03', badgeName: 'Lencana Eco Park' },
    worldDelta: 'eco-park:taman-hidup',
    steps: [
      { id: 'bagi', label: 'BAGI', tool: 'bagi', toolName: 'BAGI', toolArt: 'veh-street-sweeper', icon: 'wheel',
        instr: 'Seret truk ke tugasnya.', wrong: 'Bagi tugas dulu: truk ke sampah, sapu ke daun.' },
      { id: 'hias', label: 'HIAS', tool: 'hias', toolName: 'HIAS', toolArt: 'pc-swing', icon: 'plank',
        instr: 'Seret mainan ke bayangan.', wrong: 'Tugas sudah selesai. Sekarang hias tamannya.' },
      { id: 'buka', label: 'BUKA', tool: 'buka', toolName: 'BUKA', toolArt: 'lencana-w03', icon: 'hand',
        instr: 'Ketuk pita, buka taman!', wrong: 'Taman sudah cantik. Ketuk pitanya.' }
    ],
    lines: {
      start: 'Taman akan dibuka! Bagi tugasnya.',
      dragVeh: 'Seret truk ke tugas yang berkilau.',
      toJob: 'Bawa truk dekat ke tugasnya.',
      truckLeaf: 'Truk daur ulang mengangkat sampah. Daun itu tugas truk sapu.',
      sweepLitter: 'Truk sapu menyapu daun. Sampah itu tugas truk daur ulang.',
      oneDone: 'Bagus! Satu tugas selesai. Satu lagi.',
      bothDone: 'Semua bersih!',
      more: 'Bagus! Pasang mainan yang lain.',
      decorated: 'Tamannya cantik sekali!',
      dragDecor: 'Seret mainan ke bayangan di batu.',
      toPad: 'Taruh mainannya di bayangan.',
      tapRibbon: 'Ketuk pitanya!',
      cut: 'Eco Park dibuka! Selamat datang!',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Eco Park sudah dibuka untuk semua!'
    },
    hints: ['Truk daur ulang ke sampah. Truk sapu ke daun.', 'Taruh mainan di batu yang berkilau. Bebas pilih!', 'Lihat tanganku. Ketuk pitanya!']
  }
  STICKERS.push({ id: 'W03-M05', name: 'Stiker Eco Park', art: 'stiker-eco' })

  /* ---------- W05 Pelabuhan Penjelajah (added by the W05 build; each mission appends its own block here) ---------- */
  ;(function () {
    var pw = WORLDS.filter(function (x) { return x.id === 'pelabuhan' })[0]
    if (pw) { delete pw.locked; pw.mission = 'W05-M01'; pw.missions = ['W05-M01', 'W05-M02', 'W05-M03', 'W05-M04', 'W05-M05']; pw.finale = 'W05-M05'; pw.artDone = 'pulau-pelabuhan-selesai'; pw.thumb = 'veh-harbor-ferry' }
  })()
  VEHICLES.push({ id: 'harbor-ferry', name: 'FERI PELABUHAN', art: 'veh-harbor-ferry', thumb: 'veh-harbor-ferry', tags: ['float', 'haul'],
    say: 'Ayo antar peti!', demo: { id: 'honk', label: 'COBA KLAKSON' }, modules: [] })
  MISSIONS['W05-M01'] = {
    id: 'W05-M01', world: 'pelabuhan', title: 'Perjalanan Ferry', sub: 'Pelabuhan Penjelajah', thumb: 'veh-harbor-ferry',
    needs: ['float'], vehicle: 'harbor-ferry', bg: 'bg-w05-m01-ferry',
    reward: { key: 'reward:W05-M01', sticker: 'stiker-ferry', stickerName: 'Stiker Feri', vehicle: 'harbor-ferry' },
    worldDelta: 'pelabuhan:rute-pulau',
    steps: [
      { id: 'muat', label: 'MUAT', tool: 'muat', toolName: 'MUAT', toolArt: 'pc2-peti', icon: 'box',
        instr: 'Seret peti ke kapal.', wrong: 'Muat petinya dulu ke kapal.' },
      { id: 'antar', label: 'ANTAR', tool: 'antar', toolName: 'ANTAR', toolArt: 'prop-bendera', icon: 'wheel',
        instr: 'Antar ke dermaga bendera.', wrong: 'Peti sudah di kapal. Sekarang antar ke dermaga bendera.' },
      { id: 'turun', label: 'TURUN', tool: 'turun', toolName: 'TURUN', toolArt: 'veh-harbor-ferry', icon: 'hand',
        instr: 'Ketuk peti, turunkan.', wrong: 'Kapal sudah sampai. Ketuk petinya supaya turun.' }
    ],
    lines: {
      start: 'Pulau menunggu peti. Ayo muat!',
      dragCrate: 'Seret petinya ke kapal.',
      toShip: 'Taruh petinya di atas kapal.',
      more: 'Bagus! Muat peti yang lain.',
      loaded: 'Kapal sudah penuh. Berlayar!',
      dragShip: 'Seret kapalnya di atas air.',
      wrongDock: 'Dermaga itu minta %n peti. Kita bawa 3. Cari yang bendera.',
      nearDock: 'Dekatkan kapal ke dermaga bendera.',
      docked: 'Sandar! Sekarang turunkan petinya.',
      tapCrate: 'Ketuk peti di kapal.',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Semua peti sampai di pulau!'
    },
    hints: ['Dermaga dengan bendera menunggu 3 peti.', 'Seret kapal ke dermaga yang berkilau.', 'Lihat tanganku. Seret seperti ini!']
  }
  STICKERS.push({ id: 'W05-M01', name: 'Stiker Feri', art: 'stiker-ferry' })
  MISSIONS['W05-M02'] = {
    id: 'W05-M02', world: 'pelabuhan', title: 'Crane dan Tiga Peti', sub: 'Pelabuhan Penjelajah', thumb: 'veh-mobile-crane',
    needs: ['lift_hook'], vehicle: 'mobile-crane', bg: 'bg-w05-m02-crane-peti',
    reward: { key: 'reward:W05-M02', sticker: 'stiker-peti', stickerName: 'Stiker Peti' },
    worldDelta: 'pelabuhan:gudang-mini',
    steps: [
      { id: 'cocok', label: 'COCOK', tool: 'cocok', toolName: 'COCOK', toolArt: 'pc2-peti', icon: 'box',
        instr: 'Angkat peti ke bentuknya.', wrong: 'Angkat petinya dulu dengan kait.' },
      { id: 'susun', label: 'SUSUN', tool: 'susun', toolName: 'SUSUN', toolArt: 'prop-kait', icon: 'plank',
        instr: 'Susun: besar dulu, kecil atas.', wrong: 'Tiga peti sudah di tempatnya. Sekarang susun dua peti.' },
      { id: 'hitung', label: 'HITUNG', tool: 'hitung', toolName: 'HITUNG', toolArt: 'veh-mobile-crane', icon: 'hand',
        instr: 'Ketuk peti dari kiri.', wrong: 'Peti sudah tersusun. Sekarang hitung petinya.' }
    ],
    lines: {
      start: 'Peti tiga bentuk. Ayo angkat dengan kait!',
      dragHook: 'Seret kait ke peti.',
      lifted: 'Terangkat! Bawa ke bentuknya.',
      dropMiss: 'Turunkan petinya di bentuk yang cocok.',
      wrongShape: 'Peti ini bentuk %s. Cari bentuk %s.',
      placed: 'Pas! Angkat peti yang lain.',
      shapesDone: 'Tiga peti sudah pas!',
      bigFirst: 'Peti kecil akan penyok. Besar dulu di bawah.',
      stacked: 'Menara peti sudah kokoh!',
      tapFirst: 'Mulai dari kiri, ketuk satu per satu.',
      order: 'Mulai dari kiri.',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Gudang mini sudah rapi dan menyala!'
    },
    hints: ['Peti punya gambar bentuk. Cari garis bentuk yang sama.', 'Bentuk yang berkilau itu tempatnya.', 'Lihat tanganku. Seret kaitnya seperti ini!']
  }
  STICKERS.push({ id: 'W05-M02', name: 'Stiker Peti', art: 'stiker-peti' })
  MISSIONS['W05-M03'] = {
    id: 'W05-M03', world: 'pelabuhan', title: 'Muatan Miring', sub: 'Pelabuhan Penjelajah', thumb: 'veh-harbor-ferry',
    needs: ['float'], vehicle: 'harbor-ferry', bg: 'bg-w05-m03-muatan-miring',
    reward: { key: 'reward:W05-M03', sticker: 'stiker-balance', stickerName: 'Stiker Seimbang' },
    worldDelta: 'pelabuhan:dek-uji',
    steps: [
      { id: 'tebak', label: 'TEBAK', tool: 'tebak', toolName: 'TEBAK', toolArt: 'veh-harbor-ferry', icon: 'hand',
        instr: 'Tebak: kapal miring ke mana?', wrong: 'Tebak dulu ke mana kapal miring.' },
      { id: 'sama', label: 'SAMA', tool: 'sama', toolName: 'SAMA', toolArt: 'pc2-peti', icon: 'box',
        instr: 'Seret peti sampai sama.', wrong: 'Kapal sudah ditebak. Sekarang seimbangkan dengan peti.' },
      { id: 'geser', label: 'GESER', tool: 'geser', toolName: 'GESER', toolArt: 'stiker-balance', icon: 'wheel',
        instr: 'Geser peti. Buat sama.', wrong: 'Sudah seimbang. Sekarang geser peti dari satu sisi.' }
    ],
    lines: {
      start: 'Muatannya di satu sisi. Kapal miring!',
      lean: 'Lihat! Kapal miring ke sisi yang berat.',
      dragCrate: 'Seret peti ke kapal.',
      toShip: 'Taruh peti di atas kapal.',
      leanLeft: 'Masih miring ke kiri. Tambah peti di kanan.',
      leanRight: 'Sekarang miring ke kanan. Kurangi peti di kanan.',
      level: 'Lurus! Kiri dan kanan sama berat.',
      moveOne: 'Geser satu peti dari kiri ke kanan.',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Kapal lurus. Dek uji sudah menyala!'
    },
    hints: ['Peti di kiri dan di kanan harus sama banyak.', 'Seret satu peti ke sisi kanan kapal.', 'Lihat tanganku. Seret seperti ini!']
  }
  STICKERS.push({ id: 'W05-M03', name: 'Stiker Seimbang', art: 'stiker-balance' })
  MISSIONS['W05-M04'] = {
    id: 'W05-M04', world: 'pelabuhan', title: 'Jembatan Antar-Dermaga', sub: 'Pelabuhan Penjelajah', thumb: 'veh-dump-truck',
    needs: ['haul'], vehicle: 'dump-truck', bg: 'bg-w05-m04-jembatan-dermaga',
    reward: { key: 'reward:W05-M04', sticker: 'stiker-dermaga', stickerName: 'Stiker Dermaga' },
    worldDelta: 'pelabuhan:jembatan-pulau',
    steps: [
      { id: 'sambung', label: 'SAMBUNG', tool: 'sambung', toolName: 'SAMBUNG', toolArt: 'w5-ponton', icon: 'plank',
        instr: 'Seret ponton ke celah.', wrong: 'Sambung dulu jembatannya dengan ponton.' },
      { id: 'jalan', label: 'JALAN', tool: 'jalan', toolName: 'JALAN', toolArt: 'veh-dump-truck', icon: 'wheel',
        instr: 'Tahan truk, seberangi.', wrong: 'Jembatan sudah jadi. Tahan truknya supaya melaju.' },
      { id: 'urutan', label: 'URUTAN', tool: 'urutan', toolName: 'URUTAN', toolArt: 'pc2-peti', icon: 'hand',
        instr: 'Ketuk peti sesuai nomor.', wrong: 'Truk sudah sampai. Ketuk petinya sesuai nomor.' }
    ],
    lines: {
      start: 'Dua dermaga terpisah. Ayo sambung!',
      dragPiece: 'Seret ponton ke celah.',
      toGap: 'Taruh ponton di celah air.',
      tooLong: 'Terlalu panjang! Pilih ponton yang lebih pendek.',
      placed: 'Pas! Masih ada celah.',
      built: 'Jembatan tersambung!',
      holdMore: 'Tahan terus, truknya melaju.',
      crossed: 'Sampai di dermaga seberang!',
      order: 'Ikuti nomor: mulai dari 1.',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Dua dermaga sudah tersambung!'
    },
    hints: ['Celahnya tiga petak. Ponton dua dan satu pas.', 'Ponton yang berkilau muat di celah.', 'Lihat tanganku. Seret seperti ini!']
  }
  STICKERS.push({ id: 'W05-M04', name: 'Stiker Dermaga', art: 'stiker-dermaga' })
  MISSIONS['W05-M05'] = {
    id: 'W05-M05', world: 'pelabuhan', title: 'Paket untuk Pulau', sub: 'Pelabuhan Penjelajah', thumb: 'veh-harbor-ferry',
    needs: ['float'], vehicle: 'harbor-ferry', bg: 'bg-w05-m05-paket-pulau',
    reward: { key: 'reward:W05-M05', sticker: 'stiker-paket', stickerName: 'Stiker Paket', badge: 'lencana-w05', badgeName: 'Lencana Pelabuhan' },
    worldDelta: 'pelabuhan:pulau-piknik',
    steps: [
      { id: 'rute', label: 'RUTE', tool: 'rute', toolName: 'RUTE', toolArt: 'prop-bendera', icon: 'wheel',
        instr: 'Gambar rute ke pulau bendera.', wrong: 'Gambar dulu rute kapal di atas air.' },
      { id: 'muat', label: 'MUAT', tool: 'muat', toolName: 'MUAT', toolArt: 'pc2-peti', icon: 'box',
        instr: 'Muat peti. Kiri kanan sama.', wrong: 'Rute sudah ada. Muat petinya dulu.' },
      { id: 'antar', label: 'ANTAR', tool: 'antar', toolName: 'ANTAR', toolArt: 'veh-harbor-ferry', icon: 'hand',
        instr: 'Tahan kapal, ikuti rute.', wrong: 'Peti sudah rata. Tahan kapalnya supaya berlayar.' }
    ],
    lines: {
      start: 'Pulau bendera menunggu paket!',
      startAtShip: 'Mulai gambar dari kapal ya.',
      drawIt: 'Gambar rute dengan jarimu di atas air.',
      wrongIsland: 'Pulau itu minta %n peti. Kita bawa 4. Cari bendera.',
      onLand: 'Rute lewat daratan! Cari jalan di air.',
      routeOk: 'Rute siap! Sekarang muat peti.',
      dragCrate: 'Seret peti ke kapal.',
      toShip: 'Taruh peti di atas kapal.',
      leanLeft: 'Kapal miring ke kiri. Tambah di kanan.',
      leanRight: 'Kapal miring ke kanan. Tambah di kiri.',
      level: 'Lurus! Berlayar!',
      holdMore: 'Tahan terus, kapalnya berlayar.',
      arrived: 'Sampai di pulau! Peti turun satu per satu.',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Pulau piknik menerima paketnya!'
    },
    hints: ['Pulau dengan bendera minta empat peti.', 'Gambar dari kapal sampai pulau bendera.', 'Lihat tanganku. Gambar seperti ini!']
  }
  STICKERS.push({ id: 'W05-M05', name: 'Stiker Paket', art: 'stiker-paket' })

  /* ---------- W04 Kebun Ceria (added by the W04 build; each mission appends its own block here) ---------- */
  WORLDS.forEach(function (wd) { if (wd.id === 'kebun-ceria') { wd.mission = 'W04-M01'; wd.missions = ['W04-M01', 'W04-M02', 'W04-M03', 'W04-M04', 'W04-M05']; wd.finale = 'W04-M05'; wd.artDone = 'pulau-kebun-ceria-selesai' } })
  VEHICLES.push({ id: 'farm-tractor', name: 'TRAKTOR', art: 'veh-farm-tractor', thumb: 'veh-farm-tractor', tags: ['haul', 'till'],
    say: 'Ayo olah kebunnya!', demo: { id: 'honk', label: 'COBA KLAKSON' }, modules: [] })
  MISSIONS['W04-M01'] = {
    id: 'W04-M01', world: 'kebun-ceria', title: 'Baris Kebun Pertamaku', sub: 'Kebun Ceria', thumb: 'veh-farm-tractor',
    needs: ['haul'], vehicle: 'farm-tractor', bg: 'bg-w04-m01-baris-kebun',
    reward: { key: 'reward:W04-M01', sticker: 'stiker-kebun', stickerName: 'Stiker Kebun', vehicle: 'farm-tractor' },
    worldDelta: 'kebun-ceria:kebun-awal',
    steps: [
      { id: 'gembur', label: 'GEMBUR', tool: 'gembur', toolName: 'GEMBUR', toolArt: 'veh-farm-tractor', icon: 'wheel',
        instr: 'Tahan traktor, gemburkan tanah.', wrong: 'Gemburkan tanahnya dulu dengan traktor.' },
      { id: 'muat', label: 'MUAT', tool: 'muat', toolName: 'MUAT', toolArt: 'w4-trailer', icon: 'box',
        instr: 'Seret bibit ke gerobak.', wrong: 'Tanah sudah gembur. Sekarang muat bibitnya ke gerobak.' },
      { id: 'tanam', label: 'TANAM', tool: 'tanam', toolName: 'TANAM', toolArt: 'w4-wortel', icon: 'hand',
        instr: 'Seret bibit ke tempat berkilau.', wrong: 'Bibit sudah di kebun. Sekarang tanam di tempat berkilau.' }
    ],
    lines: {
      start: 'Tanahnya keras. Ayo gemburkan dengan traktor!',
      tillMore: 'Tahan terus, traktornya melaju.',
      tilled: 'Tanahnya sudah gembur!',
      dragSeed: 'Seret bibitnya ke gerobak.',
      toTrailer: 'Taruh bibitnya di dalam gerobak.',
      loadMore: 'Bagus! Muat bibit yang lain.',
      loaded: 'Gerobak sudah penuh bibit!',
      unload: 'Gerobak menurunkan bibit di kebun.',
      dragPlant: 'Seret bibit ke tempat yang berkilau.',
      toGhost: 'Taruh bibitnya di tempat berkilau.',
      wrongKind: 'Di sini giliran %n. Lihat bayangannya.',
      plantMore: 'Hore! Tanam yang lain.',
      next2: 'Pola berlanjut! Tanam dua lagi.',
      tapTractor: 'Tahan traktornya supaya melaju.',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Kebun pertamamu sudah ditanam!'
    },
    hints: ['Yang berkilau itu tujuannya.', 'Bibit dan tempatnya sama gambarnya.', 'Lihat tanganku. Ikuti caraku!']
  }
  STICKERS.push({ id: 'W04-M01', name: 'Stiker Kebun', art: 'stiker-kebun' })
  MISSIONS['W04-M02'] = {
    id: 'W04-M02', world: 'kebun-ceria', title: 'Traktor Ikut Rencanaku', sub: 'Kebun Ceria', thumb: 'veh-farm-tractor',
    needs: ['haul'], vehicle: 'farm-tractor', bg: 'bg-w04-m02-traktor',
    reward: { key: 'reward:W04-M02', sticker: 'stiker-urutan', stickerName: 'Stiker Urutan' },
    worldDelta: 'kebun-ceria:lajur-air',
    steps: [
      { id: 'susun', label: 'SUSUN', tool: 'susun', toolName: 'SUSUN', toolArt: 'w4-kartu-kanan', icon: 'plank',
        instr: 'Susun panah ke kotak.', wrong: 'Susun kartu panahnya dulu, lalu tekan JALAN.' },
      { id: 'jalan', label: 'JALAN', tool: 'jalan', toolName: 'JALAN', toolArt: 'veh-farm-tractor', icon: 'wheel',
        instr: 'Tekan JALAN, traktor ikut.', wrong: 'Tekan tombol JALAN supaya traktor mengikuti kartunya.' },
      { id: 'siram', label: 'SIRAM', tool: 'siram', toolName: 'SIRAM', toolArt: 'w4-kaleng', icon: 'hand',
        instr: 'Tahan traktor, air mengalir.', wrong: 'Traktor sudah sampai. Tahan traktornya untuk menyiram.' }
    ],
    lines: {
      start: 'Antar air dari tangki ke kebun! Susun kartunya.',
      tapCard: 'Ketuk atau seret panah ke kotak.',
      full: 'Kotaknya penuh. Ketuk kartu untuk melepas.',
      few: 'Susun minimal tiga kartu dulu.',
      none: 'Susun kartu panah dulu ya.',
      fence: 'Ups, ada pagar! Ganti kartu yang menyala.',
      bale: 'Ups, ada jerami! Cari jalan lain.',
      short: 'Belum sampai kebun. Ubah kartunya, coba lagi.',
      arrived: 'Sampai! Traktor mengikuti rencanamu.',
      holdMore: 'Tahan terus, airnya mengalir.',
      tapTractor: 'Tahan traktornya.',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Tanamannya minum air dan tumbuh!'
    },
    hints: ['Traktor mulai dari tangki. Jerami menghalangi jalan lurus.', 'Turun dulu, jalan ke kanan, lalu naik ke kebun.', 'Lihat tanganku. Seret panah ke kotak!']
  }
  STICKERS.push({ id: 'W04-M02', name: 'Stiker Urutan', art: 'stiker-urutan' })
  VEHICLES.push({ id: 'forklift', name: 'FORKLIFT', art: 'veh-forklift', thumb: 'veh-forklift', tags: ['lift_low', 'haul'],
    say: 'Ayo angkat muatannya!', demo: { id: 'honk', label: 'COBA KLAKSON' }, modules: [] })
  MISSIONS['W04-M03'] = {
    id: 'W04-M03', world: 'kebun-ceria', title: 'Keranjang Seimbang', sub: 'Kebun Ceria', thumb: 'veh-forklift',
    needs: ['lift_low'], vehicle: 'forklift', bg: 'bg-w04-m03-keranjang',
    reward: { key: 'reward:W04-M03', sticker: 'stiker-timbang', stickerName: 'Stiker Timbang', vehicle: 'forklift' },
    worldDelta: 'kebun-ceria:meja-muat',
    steps: [
      { id: 'taruh', label: 'TARUH', tool: 'taruh', toolName: 'TARUH', toolArt: 'w4-keranjang', icon: 'box',
        instr: 'Taruh keranjang di sisi kiri.', wrong: 'Taruh dulu keranjangnya di papan timbangan.' },
      { id: 'seimbang', label: 'SEIMBANG', tool: 'seimbang', toolName: 'SEIMBANG', toolArt: 'w4-deck', icon: 'hand',
        instr: 'Pindahkan dua ke kanan.', wrong: 'Keranjang sudah di papan. Sekarang seimbangkan kiri dan kanan.' },
      { id: 'angkat', label: 'ANGKAT', tool: 'angkat', toolName: 'ANGKAT', toolArt: 'veh-forklift', icon: 'wheel',
        instr: 'Tahan forklift, antar ke meja.', wrong: 'Papan sudah seimbang. Tahan forklift supaya mengantar.' }
    ],
    lines: {
      start: 'Empat keranjang apel. Taruh di sisi kiri!',
      more: 'Bagus! Taruh yang lain di kiri.',
      leftFirst: 'Dulu taruh di sisi kiri ya.',
      full: 'Sisi ini sudah penuh.',
      dragIt: 'Seret keranjang ke papan.',
      tiltLeft: 'Miring ke kiri! Kiri lebih berat.',
      moveRight: 'Pindahkan dua keranjang ke kanan.',
      tiltRight: 'Sekarang miring ke kanan. Pindahkan satu kembali.',
      flat: 'Datar! Kiri dan kanan sama banyak.',
      loaded: 'Forklift mengangkat keranjangnya.',
      holdMore: 'Tahan terus, forklift melaju.',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Keranjang seimbang sampai di meja!'
    },
    hints: ['Papan miring ke sisi yang lebih banyak.', 'Pindahkan keranjang dari kiri ke tempat berkilau di kanan.', 'Lihat tanganku. Seret keranjangnya!']
  }
  STICKERS.push({ id: 'W04-M03', name: 'Stiker Timbang', art: 'stiker-timbang' })
  MISSIONS['W04-M04'] = {
    id: 'W04-M04', world: 'kebun-ceria', title: 'Air untuk Tiga Petak', sub: 'Kebun Ceria', thumb: 'veh-farm-tractor',
    needs: ['haul'], vehicle: 'farm-tractor', bg: 'bg-w04-m04-tiga-petak',
    reward: { key: 'reward:W04-M04', sticker: 'stiker-irigasi', stickerName: 'Stiker Irigasi' },
    worldDelta: 'kebun-ceria:kebun-berbunga',
    steps: [
      { id: 'isi', label: 'ISI', tool: 'isi', toolName: 'ISI', toolArt: 'prop-katup', icon: 'hand',
        instr: 'Tahan keran, isi kaleng air.', wrong: 'Isi kaleng air dulu. Tahan keran di kiri.' },
      { id: 'antar', label: 'ANTAR', tool: 'antar', toolName: 'ANTAR', toolArt: 'w4-kaleng', icon: 'wheel',
        instr: 'Seret traktor ke petak.', wrong: 'Kaleng sudah penuh. Seret traktor ke petak yang haus.' },
      { id: 'mekar', label: 'MEKAR', tool: 'mekar', toolName: 'MEKAR', toolArt: 'w4-tulip', icon: 'box',
        instr: 'Ketuk petak: 1, 2, 3.', wrong: 'Semua petak sudah minum. Ketuk petaknya berurutan.' }
    ],
    lines: {
      start: 'Tiga petak haus. Isi air dulu!',
      fillMore: 'Tahan terus, kalengnya terisi.',
      filled: 'Kaleng sudah penuh!',
      dragIt: 'Seret traktor ke petak.',
      near: 'Dekatkan traktor ke petak yang haus.',
      done: 'Petak ini sudah minum.',
      sip: 'Slurp! Petak itu minum %n.',
      left: 'Air tinggal %n kaleng.',
      allDone: 'Semua petak sudah minum!',
      tapOrder: 'Ketuk petak sesuai angkanya.',
      wrongOrder: 'Belum. Mulai dari angka 1.',
      bloom: 'Mekar! Cantik sekali.',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Kebun sekarang penuh bunga!'
    },
    hints: ['Isi kaleng sebanyak yang dibutuhkan petak.', 'Titik air di atas petak menunjukkan butuh berapa.', 'Lihat tanganku. Ikuti caraku!']
  }
  STICKERS.push({ id: 'W04-M04', name: 'Stiker Irigasi', art: 'stiker-irigasi' })
  MISSIONS['W04-M05'] = {
    id: 'W04-M05', world: 'kebun-ceria', title: 'Piknik Hasil Kebun', sub: 'Kebun Ceria', thumb: 'veh-farm-tractor',
    needs: ['haul'], vehicle: 'farm-tractor', bg: 'bg-w04-m05-piknik',
    reward: { key: 'reward:W04-M05', sticker: 'stiker-piknik', stickerName: 'Stiker Piknik', badge: 'lencana-w04', badgeName: 'Lencana Kebun Ceria' },
    worldDelta: 'kebun-ceria:piknik',
    steps: [
      { id: 'rencana', label: 'RENCANA', tool: 'rencana', toolName: 'RENCANA', toolArt: 'w4-b-wortel', icon: 'box',
        instr: 'Ketuk panen: mau ambil yang mana dulu?', wrong: 'Rencanakan dulu urutan panennya. Ketuk tiga tumpukan.' },
      { id: 'jemput', label: 'JEMPUT', tool: 'jemput', toolName: 'JEMPUT', toolArt: 'veh-farm-tractor', icon: 'wheel',
        instr: 'Tahan traktor, ikuti rencanamu.', wrong: 'Rencana sudah jadi. Tahan traktor supaya melaju.' },
      { id: 'hidang', label: 'HIDANG', tool: 'hidang', toolName: 'HIDANG', toolArt: 'w4-b-tomat', icon: 'hand',
        instr: 'Seret buah ke tikar piknik.', wrong: 'Buah sudah sampai. Sekarang hidangkan di tikar.' }
    ],
    lines: {
      start: 'Waktunya piknik! Rencanakan panennya.',
      pick: 'Ketuk lagi untuk mengubah urutan.',
      pickMore: 'Ketuk tumpukan berikutnya.',
      routed: 'Rencanamu jadi! Ada jalurnya.',
      holdMore: 'Tahan terus, traktor melaju.',
      holdLast: 'Penuh! Tahan lagi, menuju tikar.',
      dragFruit: 'Seret buahnya ke tempat berkilau.',
      unload: 'Gerobak menurunkan buahnya.',
      toGhost: 'Taruh buahnya di tempat berkilau.',
      wrongKind: 'Di sini tempat %n. Lihat bayangannya.',
      plantMore: 'Bagus! Hidangkan yang lain.',
      feast: 'Hore! Piknik siap, ayo makan bersama!',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Piknik hasil kebun sudah siap!'
    },
    hints: ['Ketuk tumpukan yang kamu mau ambil dulu.', 'Buah dan bayangannya sama gambarnya.', 'Lihat tanganku. Ikuti caraku!']
  }
  STICKERS.push({ id: 'W04-M05', name: 'Stiker Piknik', art: 'stiker-piknik' })

  /* ---------- W06 Wonder Lab (added by the W06 build; each mission appends its own block here) ---------- */
  VEHICLES.push({ id: 'monster-truck', name: 'TRUK UJI MONSTER', art: 'veh-monster-truck', thumb: 'veh-monster-truck', tags: ['terrain', 'stunt'],
    say: 'Ayo uji ban dan lompat!', demo: { id: 'honk', label: 'COBA KLAKSON' }, modules: [] })
  MISSIONS['W06-M01'] = {
    id: 'W06-M01', world: 'wonder-lab', title: 'Ban untuk Petualangan', sub: 'Wonder Lab', thumb: 'veh-monster-truck',
    needs: ['terrain', 'stunt'], vehicle: 'monster-truck', bg: 'bg-w06-m01-ban',
    reward: { key: 'reward:W06-M01', sticker: 'stiker-ban', stickerName: 'Stiker Ban', vehicle: 'monster-truck' },
    worldDelta: 'wonder-lab:jalur-terrain',
    steps: [
      { id: 'pasang', label: 'PASANG', tool: 'pasang', toolName: 'PASANG', toolArt: 'modul-ban-berpola', icon: 'wheel',
        instr: 'Seret ban ke truk.', wrong: 'Pasang ban dulu di truk.' },
      { id: 'uji', label: 'UJI', tool: 'uji', toolName: 'UJI', toolArt: 'veh-monster-truck', icon: 'wheel',
        instr: 'Seret truk ke lintasan.', wrong: 'Ban sudah dipasang. Seret truk ke lintasan.' },
      { id: 'lompat', label: 'LOMPAT', tool: 'lompat', toolName: 'LOMPAT', toolArt: 'prop-bendera', icon: 'hand',
        instr: 'Ketuk truk tiga kali.', wrong: 'Sudah diuji. Ketuk truknya untuk melompat.' }
    ],
    lines: {
      start: 'Ban mana yang kuat di lumpur?',
      askFirst: 'Jawab dulu pertanyaannya ya.',
      dragTire: 'Seret ban ke truk yang berkilau.',
      toTruck: 'Taruh ban di truk.',
      fitFirst: 'Pasang ban dulu di truk.',
      smooth: 'Ban halus. Cepat di jalan kering.',
      tread: 'Ban bergerigi. Mencengkeram lumpur.',
      dragTruck: 'Seret truknya ke kaki lintasan.',
      noLane: 'Bawa truk ke kaki lintasan.',
      slip: 'Ban halus tergelincir di lumpur. Coba ban bergerigi!',
      mudDone: 'Sampai di bendera lewat lumpur!',
      woodDone: 'Lintasan kayu juga sampai!',
      tryWood: 'Sekarang coba lintasan kayu.',
      tryMud: 'Sekarang coba lintasan lumpur.',
      tapTruck: 'Ketuk truknya tiga kali!',
      bounce1: 'Satu! Suspensinya empuk.',
      bounce2: 'Dua! Sekali lagi!',
      jumped: 'Tiga! Lompatan besar!',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Truk monster siap berpetualang!'
    },
    hints: ['Ban dan truk berkilau. Seret ban ke truk.', 'Lumpur butuh ban bergerigi. Kayu cocok untuk semua ban.', 'Lihat tanganku. Ketuk truknya!']
  }
  STICKERS.push({ id: 'W06-M01', name: 'Stiker Ban', art: 'stiker-ban' })
  MISSIONS['W06-M02'] = {
    id: 'W06-M02', world: 'wonder-lab', title: 'Laboratorium Warna', sub: 'Wonder Lab', thumb: 'veh-monster-truck',
    needs: ['mix', 'paint'], vehicle: 'monster-truck', bg: 'bg-w06-m02-warna',
    reward: { key: 'reward:W06-M02', sticker: 'stiker-campur', stickerName: 'Stiker Campuran' },
    worldDelta: 'wonder-lab:paviliun-cat',
    steps: [
      { id: 'campur', label: 'CAMPUR', tool: 'campur', toolName: 'CAMPUR', toolArt: 'w6-cat-biru', icon: 'drop',
        instr: 'Tahan cat biru dan kuning.', wrong: 'Campur catnya dulu di mangkuk.' },
      { id: 'cat', label: 'CAT', tool: 'cat', toolName: 'CAT', toolArt: 'w6-roller', icon: 'wheel',
        instr: 'Celup roller, cat pintunya.', wrong: 'Catnya sudah jadi. Cat pintunya dengan roller.' },
      { id: 'pasang', label: 'PASANG', tool: 'pasang', toolName: 'PASANG', toolArt: 'w6-pintu-hijau', icon: 'hand',
        instr: 'Seret pintu ke truk.', wrong: 'Pintunya sudah hijau. Pasang di truk.' }
    ],
    lines: {
      start: 'Ayo campur warna untuk pintu truk!',
      askFirst: 'Jawab dulu pertanyaannya ya.',
      holdPour: 'Tahan botol cat, catnya menetes.',
      noRed: 'Merah tidak ada di resep. Pakai biru dan kuning.',
      enough: 'Cukup dua sendok %c. Sekarang yang lain.',
      green: 'Hijau! Biru dan kuning jadi hijau.',
      dipped: 'Roller kena cat! Sekarang cat pintunya.',
      dipFirst: 'Celupkan roller di mangkuk dulu.',
      dragRoller: 'Seret roller ke mangkuk, lalu ke pintu.',
      moreCoat: 'Masih ada yang putih. Cat lagi!',
      painted: 'Pintunya hijau cantik!',
      dragDoor: 'Seret pintu hijau ke truk.',
      toTruck: 'Taruh pintunya di truk.',
      installed: 'Klik! Pintu baru terpasang.',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Truk monster punya pintu hijau baru!'
    },
    hints: ['Botol biru dan kuning menyala. Tahan satu per satu.', 'Celup roller di mangkuk, lalu gosok pintu putih.', 'Lihat tanganku. Seret seperti ini!']
  }
  STICKERS.push({ id: 'W06-M02', name: 'Stiker Campuran', art: 'stiker-campur' })
  MISSIONS['W06-M03'] = {
    id: 'W06-M03', world: 'wonder-lab', title: 'Lintasan Buatanku', sub: 'Wonder Lab', thumb: 'veh-monster-truck',
    needs: ['terrain', 'stunt', 'build'], vehicle: 'monster-truck', bg: 'bg-w06-m03-lintasan',
    reward: { key: 'reward:W06-M03', sticker: 'stiker-lintasan', stickerName: 'Stiker Lintasan' },
    worldDelta: 'wonder-lab:lintasan-buatan',
    steps: [
      { id: 'rakit', label: 'RAKIT', tool: 'rakit', toolName: 'RAKIT', toolArt: 'w6-trk-lurus', icon: 'plank',
        instr: 'Seret modul ke bayangannya.', wrong: 'Rakit lintasannya dulu.' },
      { id: 'uji', label: 'UJI', tool: 'uji', toolName: 'UJI', toolArt: 'veh-monster-truck', icon: 'wheel',
        instr: 'Ketuk truk, coba lintasan.', wrong: 'Lintasan sudah jadi. Ketuk truk untuk menguji.' },
      { id: 'ubah', label: 'UBAH', tool: 'ubah', toolName: 'UBAH', toolArt: 'w6-trk-tinggi', icon: 'hand',
        instr: 'Ganti tanjakan, ketuk truk.', wrong: 'Ganti tanjakannya dulu, baru coba lagi.' }
    ],
    lines: {
      start: 'Rakit lintasan dari modul!',
      dragPiece: 'Seret modul ke bayangan yang berkilau.',
      toSlot: 'Taruh modul di bayangannya.',
      wrongShape: 'Itu modul %a. Bayangan ini modul %b.',
      tallLater: 'Tanjakan tinggi dipakai nanti.',
      tooTall: 'Tanjakan itu terlalu tinggi untuk bayangan ini.',
      more: 'Pas! Pasang modul yang lain.',
      built: 'Lintasannya jadi!',
      buildFirst: 'Rakit lintasannya dulu.',
      tapTruck: 'Ketuk truknya, ayo coba!',
      splash: 'Byur! Lompatannya kurang jauh.',
      pickTall: 'Pakai tanjakan yang lebih tinggi.',
      swapFirst: 'Ganti tanjakannya dulu.',
      swapped: 'Tanjakan tinggi terpasang! Coba lagi.',
      finished: 'Hore! Truk melompat sampai garis akhir!',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Lintasan buatanmu berhasil!'
    },
    hints: ['Bentuk bayangan menunjukkan modul yang cocok.', 'Tanjakan rendah terlalu pendek. Ganti yang tinggi.', 'Lihat tanganku. Seret seperti ini!']
  }
  STICKERS.push({ id: 'W06-M03', name: 'Stiker Lintasan', art: 'stiker-lintasan' })
  MISSIONS['W06-M04'] = {
    id: 'W06-M04', world: 'wonder-lab', title: 'Lampu Wahana Menyala', sub: 'Wonder Lab', thumb: 'veh-monster-truck',
    needs: ['repair', 'sequence'], vehicle: 'monster-truck', bg: 'bg-w06-m04-lampu',
    reward: { key: 'reward:W06-M04', sticker: 'w6-lampion', stickerName: 'Stiker Lampu' },
    worldDelta: 'wonder-lab:panggung-cahaya',
    steps: [
      { id: 'sambung', label: 'SAMBUNG', tool: 'sambung', toolName: 'SAMBUNG', toolArt: 'w6-kon-bulat', icon: 'plank',
        instr: 'Seret konektor ke bentuknya.', wrong: 'Dayanya mati. Sambung konektor dulu.' },
      { id: 'urutan', label: 'URUTAN', tool: 'urutan', toolName: 'URUTAN', toolArt: 'w6-lampion', icon: 'hand',
        instr: 'Lihat, lalu ketuk sama.', wrong: 'Daya sudah menyala. Ikuti urutan lampion.' },
      { id: 'panggung', label: 'PANGGUNG', tool: 'panggung', toolName: 'PANGGUNG', toolArt: 'veh-monster-truck', icon: 'wheel',
        instr: 'Tahan truk ke panggung.', wrong: 'Lampu sudah menyala. Tahan truknya ke panggung.' }
    ],
    lines: {
      start: 'Wahana mati lampu! Ayo sambung.',
      dragKon: 'Seret konektor ke bayangan bentuknya.',
      toSocket: 'Taruh konektor di bayangannya.',
      wrongShape: 'Konektor %a belum cocok di lubang %b.',
      more: 'Klik! Sambung yang lain.',
      powered: 'Dayanya menyala! Lampion berkedip.',
      watch: 'Lihat urutan lampionnya.',
      yourTurn: 'Giliranmu! Ketuk sama.',
      slip: 'Hampir! Lihat lagi pelan-pelan.',
      remembered: 'Urutannya benar! Semua lampu menyala.',
      fixFirst: 'Sambung konektor dulu.',
      lightsFirst: 'Nyalakan lampion dulu.',
      tapTruck: 'Tahan truknya, ke panggung!',
      holdMore: 'Tahan terus, truknya melaju.',
      show: 'Pertunjukan cahaya dimulai!',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Panggung cahaya menyala!'
    },
    hints: ['Konektor dan bayangannya punya bentuk yang sama.', 'Lihat urutan kedipnya, lalu ketuk lampion yang sama.', 'Lihat tanganku. Ikuti lampion ini!']
  }
  STICKERS.push({ id: 'W06-M04', name: 'Stiker Lampu', art: 'w6-lampion' })
  MISSIONS['W06-M05'] = {
    id: 'W06-M05', world: 'wonder-lab', title: 'Festival Penemuan', sub: 'Wonder Lab', thumb: 'veh-monster-truck',
    needs: ['display', 'parade', 'ride'], vehicle: 'monster-truck', bg: 'bg-w06-m05-festival',
    reward: { key: 'reward:W06-M05', sticker: 'stiker-festival', stickerName: 'Stiker Festival', badge: 'lencana-w06', badgeName: 'Lencana Wonder Lab' },
    worldDelta: 'wonder-lab:festival',
    steps: [
      { id: 'pajang', label: 'PAJANG', tool: 'pajang', toolName: 'PAJANG', toolArt: 'veh-monster-truck', icon: 'wheel',
        instr: 'Seret tiga truk ke panggung.', wrong: 'Pilih dan pajang tiga kendaraan dulu.' },
      { id: 'parade', label: 'PARADE', tool: 'parade', toolName: 'PARADE', toolArt: 'veh-street-sweeper', icon: 'hand',
        instr: 'Ketuk urutan parade.', wrong: 'Kendaraan sudah dipajang. Pilih urutan parade.' },
      { id: 'coba', label: 'COBA', tool: 'coba', toolName: 'COBA', toolArt: 'w6-bianglala', icon: 'hand',
        instr: 'Ketuk wahana, coba!', wrong: 'Parade selesai. Pilih satu wahana untuk dicoba.' }
    ],
    lines: {
      start: 'Festival penemuan akan dibuka!',
      dragVeh: 'Seret truk ke panggung yang berkilau.',
      toPad: 'Taruh truk di panggung pajangan.',
      more: 'Bagus! Pajang truk yang lain.',
      displayed: 'Tiga truk sudah dipajang!',
      tapOrder: 'Ketuk truk, urutan parade.',
      next1: 'Satu! Siapa yang kedua?',
      next2: 'Dua! Siapa yang terakhir?',
      alreadyOrder: 'Truk itu sudah dapat nomor.',
      paradeGo: 'Parade dimulai!',
      paraded: 'Parade yang meriah!',
      pickRide: 'Pilih satu wahana, ketuk!',
      opened: 'Festival Penemuan dibuka! Selamat datang!',
      wrongTool: 'Pakai yang menyala ya.',
      win: 'Hore! Festival Penemuan dibuka untuk semua!'
    },
    hints: ['Truk berkilau. Seret ke panggung pajangan.', 'Ketuk truk satu per satu. Kamu yang memilih urutannya!', 'Lihat tanganku. Ketuk wahananya!']
  }
  STICKERS.push({ id: 'W06-M05', name: 'Stiker Festival', art: 'stiker-festival' })

  var HUB_LINES = {
    hub: 'Mau menjelajah?',
    map: 'Pilih pulau, lalu ketuk JELAJAHI.',
    park: 'Pilih kendaraanmu!'
  }

  w.BlippiData = {
    version: 1,
    vehicles: VEHICLES,
    worlds: WORLDS,
    missions: MISSIONS,
    stickers: STICKERS,
    hubLines: HUB_LINES,
    firstMission: 'W01-M01',
    order: ['W01-M01', 'W01-M02', 'W01-M03', 'W01-M04', 'W01-M05', 'W02-M01', 'W02-M02', 'W02-M03'],
    stickerTotal: 30
  }
})(window)
