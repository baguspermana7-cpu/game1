#!/usr/bin/env python3
"""AUTHORED race routes (by eye, against each plate) -> data/blippi-race-routes.js. Source of truth for centerline / start / track width /
HUD exclusions / obstacle polygons / occluders, per arena per orientation. Coordinates below are in the 1100-px-wide authoring grid view
(tools/arena-grid.py draws it); the script scales them to plate pixels (x 1/0.65789). NEVER inferred from pixels at runtime.
  python3 tools/author-routes.py      # rewrites data/blippi-race-routes.js
Fields: centerline (closed loop, ordered in driving direction), trackWidth (plate px of drivable width), start {x,y,dir deg (0=east,90=south)},
 finishIndex 0, hud (rects plate px the HUD covers: keep them clear of the road), obstacles (soft slow-down polygons: props on/next to the
 road, drawn from the plate, never from a mask), occluders (polygons re-drawn from the plate OVER the vehicle: building the road passes behind)."""
import json
K = 1 / 0.65789
def P(pts): return [[round(x * K), round(y * K)] for x, y in pts]
def R(x0, y0, x1, y1): return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
def O(rects): return [P(R(*r)) for r in rects]
# HUD per orientation (plate px). Landscape UI: top bar (pause/progress/score) + bottom hint strip; portrait: same plus bottom controls
HUD_L = [[0, 0, 190, 110], [1330, 0, 1672, 110]]   # pause button (top-left) + timer/lap chips (top-right); nothing else is drawn over the plate
HUD_P = [[0, 0, 190, 110], [660, 0, 941, 110]]
A = {}
def arena(id, ori, loop, width, startIdx, obst=(), occl=(), note=''):
    s = loop[startIdx]; n = loop[(startIdx + 1) % len(loop)]
    import math
    # rotate the loop so index 0 is the start
    loop = loop[startIdx:] + loop[:startIdx]
    pts = P(loop)
    d = math.degrees(math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]))
    A.setdefault(id, {})[ori] = {'centerline': pts, 'trackWidth': width, 'start': {'x': pts[0][0], 'y': pts[0][1], 'dir': round(d)},
        'hud': HUD_L if ori == 'landscape' else HUD_P, 'obstacles': O(obst) if obst else [], 'occluders': [P(o) for o in occl], 'note': note}

# ---------------------------------------------------------------- LANDSCAPE
arena('kota-roda', 'landscape', [(440,372),(600,388),(780,378),(900,350),(1000,325),(1050,290),(1070,240),(1025,195),(900,185),(760,205),(640,222),(540,258),(440,272),(300,268),(150,282),(70,330),(110,385),(220,410),(330,398)], 112, 0,
      [(535,418,640,450),(755,395,800,425),(895,395,925,425)], note='Closed inner circuit through the checkered gate; the lower diagonal road (bottom right) is NOT part of the route.')
arena('taman-air', 'landscape', [(520,470),(700,470),(850,465),(950,440),(1005,385),(1000,320),(950,272),(885,262),(850,300),(865,355),(845,405),(780,432),(700,440),(560,440),(420,438),(320,432),(230,420),(150,390),(100,335),(110,280),(165,245),(255,238),(320,262),(300,310),(255,360),(215,405),(250,448),(330,470),(420,472)], 88, 0,
      [(415,350,450,380),(580,380,610,415),(770,365,790,380)], note='Dumbbell circuit: east lane (lower) and west lane (upper) share the bottom straight; a lap around each lobe. The top middle is a waterfall wall, not road.')
arena('eco-park', 'landscape', [(500,392),(700,395),(900,385),(1000,350),(1040,290),(1000,230),(900,205),(800,195),(700,190),(560,190),(440,195),(340,215),(300,240),(200,235),(110,265),(60,320),(110,375),(250,392),(400,395)], 100, 0,
      [(392,405,430,440),(592,395,628,430)], [[(435,140),(500,112),(640,70),(780,125),(792,232),(436,232)]], note='Top of the ring passes BEHIND the recycling building (occluder redraws the building over the vehicle).')
arena('kebun-ceria', 'landscape', [(600,470),(850,470),(980,440),(1060,380),(1050,300),(980,230),(880,180),(760,160),(640,150),(530,200),(380,215),(220,220),(100,245),(75,290),(150,335),(260,372),(340,415),(430,452),(510,470)], 110, 0,
      [(300,440,332,480),(430,478,462,520),(685,495,708,530)], note='Ring around the vegetable island; the wooden bridge on the left is part of the route.')
arena('pelabuhan', 'landscape', [(500,445),(700,440),(880,420),(1000,380),(1060,310),(1040,220),(980,150),(880,110),(760,100),(640,95),(500,110),(380,135),(250,165),(130,210),(70,290),(70,370),(120,420),(230,445),(380,448)], 100, 0,
      [(360,385,385,420),(545,380,570,412),(680,368,705,400)], note='Oval around the harbour basin; the arched bridge at the top is on the route.')
arena('wonder-lab', 'landscape', [(150,425),(300,445),(450,455),(600,460),(750,465),(860,450),(940,410),(990,340),(1005,260),(960,200),(870,180),(760,170),(650,168),(540,165),(440,170),(360,195),(290,235),(240,290),(205,350),(160,400)], 105, 0,
      [(275,480,330,525),(395,452,425,478)], [[(415,300),(420,190),(470,140),(540,122),(610,140),(652,190),(656,300)]], note='Top straight passes behind the glass dome (occluder). The start line is the checkered flag at the left.')
arena('hutan-lumpur', 'landscape', [(600,420),(750,430),(900,445),(1000,420),(1055,355),(1045,260),(990,190),(900,145),(780,125),(650,115),(560,120),(470,150),(400,200),(330,235),(220,255),(130,280),(70,330),(80,390),(150,420),(280,443),(420,435),(520,425)], 105, 0,
      [(520,185,560,225)], note='Outer circuit only. The wooden bridge across the middle is a shortcut link and is NOT part of the route.')
arena('konstruksi', 'landscape', [(600,440),(800,450),(950,430),(1040,370),(1070,290),(1040,210),(960,170),(860,168),(780,168),(650,165),(520,165),(400,170),(300,175),(200,200),(120,240),(60,300),(70,370),(130,420),(250,440),(400,450),(520,448)], 120, 0,
      [(205,490,225,520),(360,485,385,525)], note='Ground-level circuit. The raised bridge/ramp (centre-right) and the gantry ramp (top right) are NOT part of the route.')

# ---------------------------------------------------------------- PORTRAIT (view coords: plate x 0.658)
arena('kota-roda', 'portrait', [(320,375),(440,385),(530,425),(570,490),(520,520),(400,512),(300,506),(190,500),(110,490),(65,450),(80,410),(150,385)], 82, 0,
      [], note='Ring around the TOP island of the S-road (the lower S leg and the bridge are not part of the route).')
arena('taman-air', 'portrait', [(320,770),(230,755),(140,720),(75,660),(65,590),(90,525),(160,478),(240,455),(330,450),(430,470),(520,520),(580,590),(600,660),(560,725),(470,765),(395,778)], 80, 0,
      [], note='Ring around the fountain pool; start is the checkered strip at the bottom of the ring.')
arena('eco-park', 'portrait', [(330,725),(220,712),(120,660),(60,570),(50,480),(80,400),(150,330),(240,290),(320,258),(410,275),(480,320),(540,400),(585,480),(595,560),(570,640),(500,700),(420,725)], 85, 0,
      [], note='Ring around the recycling building.')
arena('kebun-ceria', 'portrait', [(330,905),(200,890),(110,830),(70,740),(75,640),(65,540),(60,440),(80,360),(170,320),(300,305),(420,312),(520,360),(580,450),(600,560),(590,680),(540,790),(470,870)], 105, 0,
      [], note='Loop around the vegetable island; the bridge is a spur, not part of the route.')
arena('pelabuhan', 'portrait', [(310,820),(200,780),(100,700),(50,590),(40,480),(70,380),(150,310),(260,270),(370,260),(480,290),(560,370),(595,470),(600,590),(570,690),(480,780),(400,810)], 100, 0,
      [], note='Oval around the harbour basin; the single road at the bottom leads into it.')
arena('wonder-lab', 'portrait', [(330,665),(280,650),(180,615),(100,565),(60,495),(100,425),(180,358),(250,334),(340,328),(450,330),(555,345),(600,420),(605,520),(570,610),(480,658),(400,668)], 75, 0,
      [], note='Ring around the dome island on the road bands; the wide road below is the approach, not part of the route.')
arena('hutan-lumpur', 'portrait', [(330,245),(470,255),(550,300),(580,370),(520,430),(420,452),(330,448),(220,432),(130,400),(80,340),(110,280),(200,250)], 85, 0,
      [], note='Ring around the upper island only; the wooden bridge and the lower S are not part of the route.')
arena('konstruksi', 'portrait', [(320,915),(220,875),(120,815),(80,735),(130,655),(240,618),(360,610),(480,630),(560,690),(580,775),(540,860),(450,920)], 105, 0,
      [], note='Ground-level loop; the raised bridge is NOT part of the route.')
open('data/blippi-race-routes.js', 'w').write('/* AUTHORED by tools/author-routes.py (by eye against each plate; never inferred from pixels at runtime). */\nwindow.BlippiRaceRoutes = ' + json.dumps(A, indent=0) + '\n')
print('routes for', len(A), 'arenas')
