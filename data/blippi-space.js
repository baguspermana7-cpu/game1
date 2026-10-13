/* G32 Blippi -- the space craft of the LUAR ANGKASA journey (owner 2026-10-14: "ambil semua animated sprite kendaraan luar
 * angkasa ... masukkan ke selection ... ada micro movement nya agar tidak static"). Cut from the owner's animated 5x5 sheet
 * (Spacecraft_5x5_Animated.webp, 48 frames at 80 ms, transparent): one fixed box per craft over all frames (no jitter),
 * alpha only, no outline. Each craft has two horizontal frame strips in assets/space/:
 *   <id>.webp       play strip, every frame  [frameW, frameH, frames]   drawn in the run, frame = time / FRAME_MS
 *   <id>-pick.webp  picker strip, every 2nd  [frameW, frameH, frames]   a CSS steps() animation on the selection tile
 * Order = the sheet, row by row. */
window.BlippiSpace = {
  frameMs: 80,
  craft: [
 {
  "id": "rocket",
  "name": "Roket Merah",
  "play": [
   80,
   117,
   48
  ],
  "pick": [
   58,
   85,
   24
  ]
 },
 {
  "id": "ufo",
  "name": "Piring Terbang",
  "play": [
   116,
   77,
   48
  ],
  "pick": [
   84,
   56,
   24
  ]
 },
 {
  "id": "space-station",
  "name": "Stasiun Angkasa",
  "play": [
   117,
   117,
   48
  ],
  "pick": [
   85,
   85,
   24
  ]
 },
 {
  "id": "cargo-hauler",
  "name": "Kapal Kargo",
  "play": [
   116,
   99,
   48
  ],
  "pick": [
   84,
   72,
   24
  ]
 },
 {
  "id": "star-jet",
  "name": "Jet Bintang",
  "play": [
   116,
   106,
   48
  ],
  "pick": [
   84,
   77,
   24
  ]
 },
 {
  "id": "moon-lander",
  "name": "Pendarat Bulan",
  "play": [
   116,
   116,
   48
  ],
  "pick": [
   84,
   84,
   24
  ]
 },
 {
  "id": "manta-ship",
  "name": "Kapal Pari",
  "play": [
   116,
   112,
   48
  ],
  "pick": [
   84,
   82,
   24
  ]
 },
 {
  "id": "space-shuttle",
  "name": "Pesawat Ulang-alik",
  "play": [
   117,
   103,
   48
  ],
  "pick": [
   85,
   75,
   24
  ]
 },
 {
  "id": "probe",
  "name": "Probe Bola",
  "play": [
   112,
   119,
   48
  ],
  "pick": [
   82,
   86,
   24
  ]
 },
 {
  "id": "drill-ship",
  "name": "Kapal Bor",
  "play": [
   116,
   94,
   48
  ],
  "pick": [
   84,
   68,
   24
  ]
 },
 {
  "id": "ring-station",
  "name": "Stasiun Cincin",
  "play": [
   117,
   106,
   48
  ],
  "pick": [
   85,
   77,
   24
  ]
 },
 {
  "id": "red-cruiser",
  "name": "Kapal Merah",
  "play": [
   117,
   97,
   48
  ],
  "pick": [
   85,
   70,
   24
  ]
 },
 {
  "id": "jelly-ship",
  "name": "Kapal Ubur-ubur",
  "play": [
   98,
   118,
   48
  ],
  "pick": [
   72,
   86,
   24
  ]
 },
 {
  "id": "satellite",
  "name": "Satelit",
  "play": [
   117,
   87,
   48
  ],
  "pick": [
   85,
   63,
   24
  ]
 },
 {
  "id": "crescent-ship",
  "name": "Kapal Sabit",
  "play": [
   116,
   104,
   48
  ],
  "pick": [
   84,
   76,
   24
  ]
 },
 {
  "id": "nautilus-ship",
  "name": "Kapal Siput",
  "play": [
   116,
   104,
   48
  ],
  "pick": [
   84,
   76,
   24
  ]
 },
 {
  "id": "dragonfly-ship",
  "name": "Kapal Capung",
  "play": [
   117,
   95,
   48
  ],
  "pick": [
   85,
   69,
   24
  ]
 },
 {
  "id": "bubble-pod",
  "name": "Pod Merah",
  "play": [
   116,
   107,
   48
  ],
  "pick": [
   84,
   78,
   24
  ]
 },
 {
  "id": "twin-pod",
  "name": "Kapal Kembar",
  "play": [
   116,
   94,
   48
  ],
  "pick": [
   84,
   68,
   24
  ]
 },
 {
  "id": "solar-sail",
  "name": "Layar Surya",
  "play": [
   111,
   121,
   48
  ],
  "pick": [
   81,
   88,
   24
  ]
 },
 {
  "id": "donut-ship",
  "name": "Kapal Donat",
  "play": [
   117,
   88,
   48
  ],
  "pick": [
   85,
   64,
   24
  ]
 },
 {
  "id": "asteroid-miner",
  "name": "Penambang Asteroid",
  "play": [
   116,
   92,
   48
  ],
  "pick": [
   84,
   67,
   24
  ]
 },
 {
  "id": "space-sub",
  "name": "Kapal Selam Angkasa",
  "play": [
   117,
   113,
   48
  ],
  "pick": [
   85,
   82,
   24
  ]
 },
 {
  "id": "freighter",
  "name": "Kapal Barang",
  "play": [
   117,
   91,
   48
  ],
  "pick": [
   85,
   66,
   24
  ]
 },
 {
  "id": "glass-pod",
  "name": "Pod Kaca",
  "play": [
   114,
   101,
   48
  ],
  "pick": [
   83,
   73,
   24
  ]
 }
]
}
