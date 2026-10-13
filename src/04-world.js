"use strict";
// =====================================================================
// WORLD LAYOUT (world units; view is 1280x720, drawn 4x pixelated)
// =====================================================================
const WORLD_W = 2560;                   // world width
const WORLD_H = 1440;                   // world height
const COST = 20;                        // ecto per scare
const REGEN = 11;                       // ecto per second
const COOLDOWN = 4;                     // seconds per object (matches SCARE_CD in 09-game)
const COMBO_WINDOW = 3;                 // seconds to chain
const GHOST_SPEED = 400;                // units per second

// floor lines per level: attic, upstairs, ground, basement
const FLOORS = [440, 780, 1120, 1400];

const ROOMS = [
  { id: 'attic', name: 'Attic', x: 860, y: 230, w: 840, h: 210, paper: 0, floor: 440 },
  { id: 'master', name: 'Master Bedroom', x: 200, y: 460, w: 500, h: 320, paper: 1, floor: 780 },
  { id: 'bath', name: 'Bathroom', x: 700, y: 460, w: 360, h: 320, paper: 2, floor: 780 },
  { id: 'kid', name: "Kid's Room", x: 1060, y: 460, w: 440, h: 320, paper: 3, floor: 780 },
  { id: 'uphall', name: 'Upstairs Hall', x: 1500, y: 460, w: 740, h: 320, paper: 4, floor: 780 },
  { id: 'kitchen', name: 'Kitchen', x: 200, y: 800, w: 500, h: 320, paper: 2, floor: 1120 },
  { id: 'dining', name: 'Dining Room', x: 700, y: 800, w: 440, h: 320, paper: 1, floor: 1120 },
  { id: 'living', name: 'Living Room', x: 1140, y: 800, w: 560, h: 320, paper: 3, floor: 1120 },
  { id: 'hall', name: 'Front Hall', x: 1700, y: 800, w: 540, h: 320, paper: 4, floor: 1120 },
  { id: 'furnace', name: 'Furnace Room', x: 200, y: 1160, w: 840, h: 240, paper: 5, floor: 1400 },
  { id: 'storage', name: 'Storage', x: 1040, y: 1160, w: 860, h: 240, paper: 5, floor: 1400 },
];

const WINDOWS = [
  { x: 1200, y: 290, w: 64, h: 80, floor: 440 },
  { x: 300, y: 540, w: 96, h: 120, floor: 780 },
  { x: 1240, y: 540, w: 88, h: 110, floor: 780 },
  { x: 300, y: 880, w: 96, h: 110, floor: 1120 },
  { x: 1300, y: 870, w: 140, h: 120, floor: 1120 },
  { x: 2080, y: 540, w: 80, h: 110, floor: 780 },
];

// stairs: bot is on the lower floor, top on the upper floor
const STAIRS = [
  { bot: { x: 1780, y: 1120 }, top: { x: 2100, y: 780 } },   // ground <-> upstairs (front hall)
  { bot: { x: 1960, y: 780 }, top: { x: 1640, y: 440 } },    // upstairs <-> attic (upstairs hall)
  { bot: { x: 320, y: 1400 }, top: { x: 640, y: 1120 } },    // basement <-> ground (kitchen)
];
const STAIR_BOT = STAIRS[0].bot;        // v1 alias (main stairs)
const STAIR_TOP = STAIRS[0].top;        // v1 alias (main stairs)

const DOOR = { x: 2240, y: 1120 };      // front door threshold, right wall of ground floor
const GHOST_START = { x: 1280, y: 640 }; // kid's room

const OBJECTS = [
  { room: 'attic', type: 'chair', x: 1040, y: 440, w: 76, h: 100 },
  { room: 'attic', type: 'doll', x: 1420, y: 440, w: 44, h: 64 },
  { room: 'master', type: 'closet', x: 620, y: 780, w: 80, h: 152 },
  { room: 'master', type: 'portrait', x: 300, y: 700, w: 68, h: 84 },
  { room: 'bath', type: 'mirror', x: 790, y: 690, w: 66, h: 88 },
  { room: 'bath', type: 'faucet', x: 960, y: 780, w: 128, h: 76 },
  { room: 'kid', type: 'crib', x: 1160, y: 780, w: 110, h: 90 },
  { room: 'kid', type: 'lights', x: 1400, y: 600, w: 60, h: 66 },
  { room: 'uphall', type: 'portrait', x: 1580, y: 690, w: 68, h: 84 },
  { room: 'uphall', type: 'bloodwall', x: 2170, y: 680, w: 110, h: 100 },
  { room: 'kitchen', type: 'plates', x: 420, y: 930, w: 116, h: 44 },
  { room: 'kitchen', type: 'lights', x: 540, y: 940, w: 60, h: 66 },
  { room: 'dining', type: 'lights', x: 920, y: 950, w: 60, h: 66 },
  { room: 'dining', type: 'portrait', x: 1080, y: 1020, w: 68, h: 84 },
  { room: 'living', type: 'tv', x: 1240, y: 1120, w: 92, h: 116 },
  { room: 'living', type: 'piano', x: 1600, y: 1120, w: 104, h: 116 },
  { room: 'hall', type: 'coat', x: 2200, y: 1120, w: 52, h: 140 },
  { room: 'hall', type: 'mirror', x: 1960, y: 1060, w: 66, h: 88 },
  { room: 'furnace', type: 'furnace', x: 800, y: 1400, w: 140, h: 170 },
  { room: 'furnace', type: 'bloodwall', x: 1000, y: 1340, w: 110, h: 100 },
  { room: 'storage', type: 'doll', x: 1300, y: 1400, w: 44, h: 64 },
  { room: 'storage', type: 'closet', x: 1760, y: 1400, w: 80, h: 152 },
];

// which room contains a point (null = outside / slab)
function roomAt(x, y) {
  for (let i = 0; i < ROOMS.length; i++) {
    const r = ROOMS[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
  }
  return null;
}

// look up room by id
function roomById(id) {
  for (let i = 0; i < ROOMS.length; i++) {
    if (ROOMS[i].id === id) return ROOMS[i];
  }
  return null;
}

// =====================================================================
// NAVIGATION (family walks on floor lines, stairs link levels)
// =====================================================================
// level index of the floor nearest y
function levelOf(y) {
  let best = 0;
  for (let i = 1; i < FLOORS.length; i++) {
    if (Math.abs(FLOORS[i] - y) < Math.abs(FLOORS[best] - y)) best = i;
  }
  return best;
}

// stair segment a point is on (null when standing on a floor)
function stairAt(x, y) {
  for (let i = 0; i < FLOORS.length; i++) {
    if (Math.abs(FLOORS[i] - y) < 4) return null;     // on a floor line
  }
  let best = null;
  let bestD = 1e9;
  for (let i = 0; i < STAIRS.length; i++) {
    const s = STAIRS[i];
    if (y < s.top.y || y > s.bot.y) continue;
    const f = (s.bot.y - y) / (s.bot.y - s.top.y);  // 0 at bottom, 1 at top
    const sx = s.bot.x + (s.top.x - s.bot.x) * f;
    const d = Math.abs(sx - x);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

// true while a member is mid-stairs
function onStairs(m) {
  return stairAt(m.x, m.y) !== null;
}

// stairs whose lower floor is level L (going up from L)
function stairUpFrom(L) {
  for (let i = 0; i < STAIRS.length; i++) {
    if (levelOf(STAIRS[i].bot.y) === L) return STAIRS[i];
  }
  return null;
}

// waypoints to (tx, ty) through any number of stairs
function makePath(m, tx, ty) {
  const path = [];
  const T = levelOf(ty);
  let L = levelOf(m.y);
  const s0 = stairAt(m.x, m.y);
  if (s0) {
    // finish the current flight in the useful direction
    const topL = levelOf(s0.top.y);
    if (T <= topL) {
      path.push({ x: s0.top.x, y: s0.top.y });
      L = topL;
    } else {
      path.push({ x: s0.bot.x, y: s0.bot.y });
      L = levelOf(s0.bot.y);
    }
  }
  let guard = 0;
  while (L !== T && guard < 8) {
    guard++;
    if (T < L) {
      const s = stairUpFrom(L);                    // climb one level
      if (!s) break;
      path.push({ x: s.bot.x, y: s.bot.y });
      path.push({ x: s.top.x, y: s.top.y });
      L = levelOf(s.top.y);
    } else {
      const s = stairUpFrom(L + 1);                // descend one level
      if (!s) break;
      path.push({ x: s.top.x, y: s.top.y });
      path.push({ x: s.bot.x, y: s.bot.y });
      L = levelOf(s.bot.y);
    }
  }
  path.push({ x: tx, y: FLOORS[T] });
  return path;
}

// path out the front door into the yard
function fleePath(m) {
  const path = makePath(m, DOOR.x - 10, DOOR.y);
  path.push({ x: DOOR.x + 120, y: DOOR.y });
  return path;
}

// random floor point in a different room
function wanderTarget(m) {
  const cur = roomAt(m.x, m.y - 20);
  let r = ROOMS[Math.floor(Math.random() * ROOMS.length)];
  if (cur && r.id === cur.id) r = ROOMS[(ROOMS.indexOf(r) + 1) % ROOMS.length];
  return { x: rand(r.x + 50, r.x + r.w - 50), y: r.floor };
}

// =====================================================================
// BLOOD DECALS (persistent, world space)
// =====================================================================
const BLOOD = [];

// add a decal: kind = 'splat' | 'drip' | 'hand' | 'smear'
function addBlood(x, y, size, kind) {
  const d = { x: x, y: y, s: size || 20, kind: kind || 'splat', born: globalT, pts: [] };
  for (let i = 0; i < 7; i++) {
    d.pts.push(Math.random());
  }
  BLOOD.push(d);
  if (BLOOD.length > 240) BLOOD.shift();          // ponytail: oldest decal drops, raise cap if needed
}

// one blood shape; rnd(i) gives stable randoms
function bloodShape(g, x, y, s, kind, rnd, grow) {
  const dark = '#3a0507';
  const red = '#5c0a0c';
  if (kind === 'drip') {
    rect(g, x - s * 0.3, y - 4, s * 0.6, 8, red);
    for (let i = 0; i < 3; i++) {
      const dx = x - s * 0.3 + rnd(i) * s * 0.6;
      const len = s * (1 + rnd(i + 3) * 3) * grow;
      rect(g, dx, y, 4, len, red);
      rect(g, dx - 2, y + len - 2, 8, 8, dark);
    }
  } else if (kind === 'hand') {
    rect(g, x - s * 0.3, y - s * 0.2, s * 0.6, s * 0.5, red);
    for (let i = 0; i < 4; i++) rect(g, x - s * 0.3 + i * s * 0.16, y - s * 0.7, s * 0.1 + 2, s * 0.5, red);
    rect(g, x + s * 0.3, y - s * 0.1, s * 0.25, s * 0.12 + 2, red);
    rect(g, x - s * 0.2, y + s * 0.3, 4, s * 0.8 * grow, dark);
  } else if (kind === 'smear') {
    g.save();
    g.globalAlpha = 0.85;
    rect(g, x - s, y - 4, s * 2 * grow, 10, red);
    rect(g, x - s * 0.8, y + 6, s * 1.6 * grow, 4, dark);
    g.restore();
  } else if (kind === 'pool') {
    // flat floor pool: dark rim, wet core, one dull sheen
    ellipse(g, x, y, s * 1.6 * grow, s * 0.28, dark);
    ellipse(g, x - s * 0.1, y - 2, s * 1.3 * grow, s * 0.2, red);
    rect(g, x - s * 0.5, y - s * 0.12, s * 0.4 * grow, 4, '#7a1416');
  } else if (kind === 'drag') {
    // body dragged along the floor: long streak, finger lines, broken end
    const len = s * 6 * grow;
    rect(g, x, y - 6, len, 8, red);
    rect(g, x, y + 2, len * 0.8, 4, dark);
    for (let i = 0; i < 4; i++) rect(g, x + len * rnd(i) * 0.7, y - 10, s * (0.6 + rnd(i + 2)), 4, dark);
    ellipse(g, x, y - 2, s * 0.5, 8, dark);
  } else {
    ellipse(g, x, y, s * 0.7, s * 0.45, red);
    ellipse(g, x - s * 0.15, y - s * 0.1, s * 0.3, s * 0.18, '#6c1012');
    for (let i = 0; i < 6; i++) {
      const a = rnd(i) * Math.PI * 2;
      const r = s * (0.6 + rnd(i + 1) * 0.9);
      rect(g, x + Math.cos(a) * r - 3, y + Math.sin(a) * r * 0.6 - 3, 6 + rnd(i + 2) * 6, 6, dark);
    }
    // a couple of thin runs below the splat
    rect(g, x - s * 0.3, y, 4, s * 0.8 * grow * rnd(4), dark);
    rect(g, x + s * 0.2, y, 4, s * 1.1 * grow * rnd(5), red);
  }
}

// draw all persistent decals (drips grow over a few seconds)
function drawBlood(g) {
  for (let i = 0; i < BLOOD.length; i++) {
    const d = BLOOD[i];
    const grow = clamp((globalT - d.born) / 3, 0.15, 1);
    const pts = d.pts;
    bloodShape(g, d.x, d.y, d.s, d.kind, function (k) { return pts[k % pts.length]; }, grow);
  }
}

// =====================================================================
// HOUSE PRE-RENDER (lived-in and abandoned versions)
// =====================================================================
let AB = false;                              // drawing the abandoned version?
function C(normal, abandoned) { return AB ? abandoned : normal; }

// small grimy wallpaper tile (low contrast)
function makePaper(kind, base, ink) {
  const c = makeCanvas(48, 48);
  const g = c.getContext('2d');
  rect(g, 0, 0, 48, 48, base);
  if (kind === 0) {                          // attic planks
    rect(g, 0, 0, 48, 4, ink);
    rect(g, 0, 24, 48, 4, ink);
    rect(g, 20, 4, 4, 20, ink);
  } else if (kind === 1) {                   // stripes
    rect(g, 0, 0, 12, 48, ink);
    rect(g, 28, 0, 4, 48, ink);
  } else if (kind === 2) {                   // tiles
    rect(g, 0, 0, 48, 4, ink);
    rect(g, 0, 24, 48, 4, ink);
    rect(g, 0, 0, 4, 48, ink);
    rect(g, 24, 0, 4, 48, ink);
  } else if (kind === 3) {                   // damask dots
    rect(g, 8, 8, 8, 8, ink);
    rect(g, 32, 32, 8, 8, ink);
  } else if (kind === 4) {                   // diamonds
    poly(g, [24, 4, 36, 24, 24, 44, 12, 24], ink);
  } else {                                   // basement brick
    rect(g, 0, 20, 48, 4, ink);
    rect(g, 0, 44, 48, 4, ink);
    rect(g, 24, 0, 4, 20, ink);
    rect(g, 8, 24, 4, 20, ink);
  }
  return c;
}

const PAPER_N = [
  makePaper(0, '#2b2f26', '#22261e'),
  makePaper(1, '#343b31', '#2d332a'),
  makePaper(2, '#3a413a', '#2f3530'),
  makePaper(3, '#30372d', '#283026'),
  makePaper(4, '#353a2c', '#2b3024'),
  makePaper(5, '#24261f', '#1a1c16'),
];
const PAPER_A = [
  makePaper(0, '#1d201a', '#151812'),
  makePaper(1, '#232820', '#1b2019'),
  makePaper(2, '#262b25', '#1c201b'),
  makePaper(3, '#20251d', '#181c16'),
  makePaper(4, '#23261c', '#1a1d15'),
  makePaper(5, '#181a14', '#10120e'),
];

// seeded blood splat for the pre-render
function bgBlood(g, x, y, s, kind) {
  const pts = [srand(), srand(), srand(), srand(), srand(), srand(), srand()];
  bloodShape(g, x, y, s, kind, function (k) { return pts[k % pts.length]; }, 1);
}

// window: dark sky glass, heavy frame
function drawWindow(g, wd) {
  const x = wd.x;
  const y = wd.y;
  const w = wd.w;
  const h = wd.h;
  const trim = C('#2a2c22', '#1a1b16');
  rect(g, x - 8, y - 8, w + 16, h + 16, trim);
  rect(g, x, y, w, h, C('#141a17', '#0c100e'));
  rect(g, x, y + h * 0.6, w, h * 0.4, C('#18201b', '#0e1310'));
  rect(g, x + w / 2 - 4, y, 8, h, trim);
  rect(g, x, y + h / 2 - 4, w, 8, trim);
  rect(g, x - 12, y + h + 4, w + 24, 8, trim);
  if (AB) {
    rect(g, x - 10, y + h * 0.3, w + 20, 12, '#2a241c');      // boards nailed across
    rect(g, x - 10, y + h * 0.7, w + 20, 12, '#241f18');
  } else {
    rect(g, x - 10, y - 12, w * 0.3, h + 16, '#2c1a17');    // heavy drapes
    rect(g, x + w * 0.7 + 10, y - 12, w * 0.3, h + 16, '#2c1a17');
  }
}

// corner cobweb (thick strands so they survive pixelation)
function cobweb(g, x, y, dx, dy, s) {
  for (let i = 0; i <= 4; i++) {
    const a = i / 4 * Math.PI / 2;
    line(g, x, y, x + dx * Math.cos(a) * s, y + dy * Math.sin(a) * s, 'rgba(150,160,145,0.22)', 4);
  }
  for (let k = 1; k <= 3; k++) {
    const r = s * k / 3.5;
    line(g, x + dx * r, y, x, y + dy * r, 'rgba(150,160,145,0.18)', 4);
  }
}

// dusty sheet over furniture
function sheet(g, x, y, w, h) {
  poly(g, [x, y + h, x + 4, y + 12, x + w * 0.3, y, x + w * 0.7, y + 4, x + w - 4, y + 14, x + w, y + h], '#4a4d44');
  rect(g, x + w * 0.3, y + 8, 6, h - 10, '#34372f');
  rect(g, x + w * 0.65, y + 8, 6, h - 10, '#34372f');
}

// staircase from s.bot to s.top
function drawStair(g, s) {
  const n = 12;
  const sw = (s.top.x - s.bot.x) / n;
  const sh = (s.bot.y - s.top.y) / n;
  const tread = C('#3a3528', '#24221b');
  const riser = C('#1f1d16', '#12110d');
  line(g, s.bot.x, s.bot.y + 8, s.top.x, s.top.y + 20, '#0c0c09', 16);
  for (let i = 0; i < n; i++) {
    if (AB && (i === 4 || i === 9)) continue;           // missing steps
    const x = s.bot.x + i * sw;
    const y = s.bot.y - (i + 1) * sh;
    const x0 = Math.min(x, x + sw);
    rect(g, x0 - 4, y, Math.abs(sw) + 8, 8, tread);
    rect(g, x0 - 4, y + 8, Math.abs(sw) + 8, sh - 8, riser);
  }
  const railC = C('#2a2418', '#1a1712');
  line(g, s.bot.x, s.bot.y - 70, s.top.x, s.top.y - 70, railC, 6);
  for (let i = 0; i <= n; i += 2) {
    const x = s.bot.x + i * sw;
    const y = s.bot.y - i * sh;
    line(g, x, y, x, y - 70, railC, 4);
  }
}

// room interior: paper, grime, ambient occlusion, floor strip, beams
function drawRoom(g, r) {
  const fy = r.y + r.h;
  g.fillStyle = g.createPattern(AB ? PAPER_A[r.paper] : PAPER_N[r.paper], 'repeat');
  g.fillRect(r.x, r.y, r.w, r.h);
  // grime streaks
  for (let k = 0; k < 8; k++) {
    const sx = r.x + srand() * r.w;
    rect(g, sx, r.y, 8 + srand() * 16, r.h * (0.3 + srand() * 0.6), 'rgba(8,10,6,' + (AB ? 0.3 : 0.15) + ')');
  }
  // vertical falloff: dark ceiling, dim middle
  const vg = g.createLinearGradient(0, r.y, 0, fy);
  vg.addColorStop(0, 'rgba(0,0,0,0.75)');
  vg.addColorStop(0.45, 'rgba(0,0,0,0.25)');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = vg;
  g.fillRect(r.x, r.y, r.w, r.h);
  // ambient occlusion at the side walls
  const lg = g.createLinearGradient(r.x, 0, r.x + 90, 0);
  lg.addColorStop(0, 'rgba(0,0,0,0.7)');
  lg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lg;
  g.fillRect(r.x, r.y, 90, r.h);
  const rg = g.createLinearGradient(r.x + r.w, 0, r.x + r.w - 90, 0);
  rg.addColorStop(0, 'rgba(0,0,0,0.7)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(r.x + r.w - 90, r.y, 90, r.h);
  // wainscot
  if (r.h > 260) {
    rect(g, r.x, fy - 120, r.w, 96, 'rgba(10,12,8,0.4)');
    rect(g, r.x, fy - 124, r.w, 8, C('#2a2a1e', '#191a14'));
    rect(g, r.x, fy - 116, r.w, 4, 'rgba(0,0,0,0.5)');
  }
  // box-room perspective: back wall sits inset, side walls and ceiling slope toward us
  const depth = 40;
  const inset = 36;
  const cd = 24;
  // side walls (darker than the back wall)
  poly(g, [r.x, r.y, r.x + inset, r.y + cd, r.x + inset, fy - depth, r.x, fy], 'rgba(0,0,0,0.55)');
  poly(g, [r.x + r.w, r.y, r.x + r.w - inset, r.y + cd, r.x + r.w - inset, fy - depth, r.x + r.w, fy], 'rgba(0,0,0,0.55)');
  line(g, r.x + inset, r.y + cd, r.x + inset, fy - depth, 'rgba(0,0,0,0.6)', 4);
  line(g, r.x + r.w - inset, r.y + cd, r.x + r.w - inset, fy - depth, 'rgba(0,0,0,0.6)', 4);
  // floor strip: boards converge to the back edge, lit at the back, dark at the front cut
  poly(g, [r.x + inset, fy - depth, r.x + r.w - inset, fy - depth, r.x + r.w, fy, r.x, fy], C('#2c291e', '#1b1a14'));
  const cx = r.x + r.w / 2;
  for (let k = -10; k <= 10; k++) {
    const bx = cx + k * r.w / 20;
    line(g, cx + (bx - cx) * (1 - inset * 2 / r.w), fy - depth, bx, fy, 'rgba(0,0,0,0.45)', 4);
  }
  rect(g, r.x + inset, fy - depth + 12, r.w - inset * 2, 4, 'rgba(0,0,0,0.25)');
  rect(g, r.x, fy - 12, r.w, 12, 'rgba(0,0,0,0.45)');
  rect(g, r.x + inset, fy - depth, r.w - inset * 2, 4, 'rgba(0,0,0,0.7)');
  // baseboard shadow line where wall meets floor
  rect(g, r.x + inset, fy - depth - 8, r.w - inset * 2, 8, 'rgba(0,0,0,0.5)');
  // corner ambient occlusion where floor meets side walls
  ellipse(g, r.x + inset, fy - depth, 60, 30, 'rgba(0,0,0,0.45)');
  ellipse(g, r.x + r.w - inset, fy - depth, 60, 30, 'rgba(0,0,0,0.45)');
  // ceiling in perspective with beams running back
  poly(g, [r.x, r.y, r.x + r.w, r.y, r.x + r.w - inset, r.y + cd, r.x + inset, r.y + cd], '#0b0c09');
  for (let bx = r.x + 40; bx < r.x + r.w - 20; bx += 120) {
    const back = cx + (bx - cx) * (1 - inset * 2 / r.w);
    poly(g, [bx - 10, r.y, bx + 10, r.y, back + 6, r.y + cd, back - 6, r.y + cd], '#15160f');
    rect(g, back - 6, r.y + cd, 12, 6, 'rgba(0,0,0,0.6)');
  }
  rect(g, r.x + inset, r.y + cd, r.w - inset * 2, 8, 'rgba(0,0,0,0.6)');
}

// static (non-hauntable) furniture
function drawFurniture(g) {
  const wood = C('#2e2a1f', '#1e1c16');
  const dark = C('#1c1a13', '#12110d');
  const cloth = C('#3c3a33', '#2a2a25');
  // master bed (with dark stain)
  rect(g, 360, 690, 16, 90, dark);
  rect(g, 370, 716, 220, 34, wood);
  rect(g, 372, 700, 214, 20, cloth);
  rect(g, 380, 690, 50, 16, C('#55574c', '#3a3b33'));
  rect(g, 586, 704, 14, 76, dark);
  ellipse(g, 480, 716, 70, 20, 'rgba(0,0,0,0.6)');
  // bath: toilet + tub edge
  rect(g, 870, 730, 30, 50, C('#4c514a', '#33362f'));
  rect(g, 860, 716, 40, 18, C('#565b53', '#3a3d35'));
  // kid: small bed + toy box
  rect(g, 1300, 730, 150, 30, wood);
  rect(g, 1300, 718, 150, 16, cloth);
  rect(g, 1440, 700, 12, 80, dark);
  rect(g, 1080, 744, 50, 36, '#2b261c');
  // kitchen: counter, fridge, table
  rect(g, 210, 990, 60, 130, C('#41463f', '#2a2d28'));
  rect(g, 280, 1040, 200, 80, wood);
  rect(g, 276, 1032, 208, 10, C('#4a4b40', '#2e2f28'));
  // dining: long table, chairs
  rect(g, 760, 1040, 300, 12, wood);
  rect(g, 776, 1052, 8, 68, dark);
  rect(g, 1036, 1052, 8, 68, dark);
  rect(g, 740, 1000, 8, 120, dark);
  rect(g, 1072, 1000, 8, 120, dark);
  // living: sofa
  rect(g, 1360, 1060, 160, 40, cloth);
  rect(g, 1352, 1030, 18, 70, cloth);
  rect(g, 1512, 1030, 18, 70, cloth);
  rect(g, 1370, 1100, 8, 20, dark);
  rect(g, 1500, 1100, 8, 20, dark);
  // hall: rug + bench
  rect(g, 2010, 1112, 180, 8, '#2a1414');
  // furnace room pipes
  rect(g, 760, 1160, 16, 80, '#22221c');
  rect(g, 760, 1180, 280, 16, '#22221c');
  // storage crates and shelves
  for (let i = 0; i < 4; i++) {
    const bx = 1440 + i * 70;
    const bh = 50 + (i % 2) * 30;
    rect(g, bx, 1400 - bh, 60, bh, '#262219');
    rect(g, bx, 1400 - bh, 60, 6, '#1a1712');
  }
  rect(g, 1080, 1240, 160, 8, wood);
  rect(g, 1080, 1300, 160, 8, wood);
  dressRooms(g, wood, dark, cloth);
  // under-furniture contact shadows
  ellipse(g, 1440, 1112, 110, 12, 'rgba(0,0,0,0.65)');
  ellipse(g, 910, 1112, 170, 12, 'rgba(0,0,0,0.65)');
  ellipse(g, 380, 1112, 120, 12, 'rgba(0,0,0,0.65)');
  ellipse(g, 480, 776, 130, 12, 'rgba(0,0,0,0.65)');
  ellipse(g, 1375, 776, 90, 10, 'rgba(0,0,0,0.6)');
  ellipse(g, 240, 1116, 44, 8, 'rgba(0,0,0,0.6)');
  ellipse(g, 1580, 1396, 160, 10, 'rgba(0,0,0,0.6)');
  if (AB) {
    sheet(g, 356, 680, 250, 100);
    sheet(g, 1344, 1020, 192, 100);
    sheet(g, 1540, 1000, 120, 120);
    sheet(g, 1180, 1000, 120, 120);
  }
}

// per-room set dressing so every room reads at a glance
function dressRooms(g, wood, dark, cloth) {
  const bone = C('#6e7064', '#4a4c44');
  const steel = C('#8a8e86', '#5a5e58');
  // MASTER: headboard, nightstand, dead lamp
  rect(g, 356, 640, 24, 140, dark);
  rect(g, 360, 650, 16, 6, wood);
  rect(g, 250, 730, 44, 50, wood);
  rect(g, 254, 738, 36, 4, dark);
  rect(g, 264, 700, 16, 30, '#2a2a20');
  poly(g, [256, 700, 288, 700, 280, 680, 264, 680], C('#4a463a', '#2e2c24'));
  ellipse(g, 272, 778, 30, 6, 'rgba(0,0,0,0.6)');
  // dark stain soaking through the mattress
  ellipse(g, 520, 704, 40, 8, '#3a0507');
  rect(g, 540, 706, 4, 30, '#3a0507');
  // BATH: pedestal sink under the mirror, shower rod and torn curtain
  rect(g, 776, 712, 28, 68, C('#4c514a', '#33362f'));
  rect(g, 766, 704, 48, 12, C('#5e635a', '#3c3f38'));
  rect(g, 900, 560, 120, 6, '#2a2c26');
  for (let i = 0; i < 6; i++) rect(g, 900 + i * 12, 566, 10, 90 + (i % 3) * 24, C('#3e443c', '#2a2e28'));
  rect(g, 900, 640, 70, 4, 'rgba(0,0,0,0.4)');
  // KID / NURSERY: crayon stick family on the wall, one figure scribbled out
  const cray = '#4a0a0c';
  for (let i = 0; i < 4; i++) {
    const fx = 1236 + i * 30;
    circle(g, fx, 620, 6, cray);
    rect(g, fx - 2, 626, 4, 22, cray);
    line(g, fx, 646, fx - 8, 662, cray, 4);
    line(g, fx, 646, fx + 8, 662, cray, 4);
  }
  for (let i = 0; i < 5; i++) line(g, 1318, 604 + i * 12, 1350, 612 + i * 12, cray, 4);
  // toy blocks on the floor
  rect(g, 1100, 764, 16, 16, '#3c3424');
  rect(g, 1120, 768, 12, 12, '#2c3428');
  // UPHALL: runner rug and a narrow hall table
  rect(g, 1560, 770, 360, 8, '#2a1414');
  rect(g, 1760, 720, 80, 8, wood);
  rect(g, 1766, 728, 6, 52, dark);
  rect(g, 1828, 728, 6, 52, dark);
  rect(g, 1790, 700, 12, 20, '#2a2a20');
  // KITCHEN: fridge handle, upper cabinets, knife rack, sink, cleaver in the board
  rect(g, 256, 1010, 6, 40, steel);
  rect(g, 212, 1056, 56, 4, 'rgba(0,0,0,0.5)');
  rect(g, 290, 880, 180, 64, wood);
  rect(g, 290, 940, 180, 6, dark);
  rect(g, 378, 880, 4, 64, dark);
  rect(g, 300, 960, 120, 6, '#1a1a14');
  for (let i = 0; i < 6; i++) {
    const kx = 306 + i * 18;
    rect(g, kx, 966, 6, 10, '#1a1610');
    rect(g, kx, 976, 6, 28 + (i % 3) * 8, steel);
  }
  rect(g, 306 + 3 * 18, 1000, 6, 16, '#5c0a0c');
  rect(g, 420, 1036, 50, 6, '#1a1a14');
  rect(g, 440, 1006, 4, 30, steel);
  rect(g, 430, 1006, 24, 4, steel);
  rect(g, 330, 1022, 48, 12, '#3a3020');
  poly(g, [344, 1008, 368, 1008, 368, 1022, 340, 1022], steel);
  rect(g, 336, 1030, 40, 6, '#5c0a0c');
  rect(g, 352, 1036, 4, 30, '#3a0507');
  // DINING: hutch with plates, table settings
  rect(g, 1000, 900, 60, 140, dark);
  rect(g, 1006, 910, 48, 4, wood);
  rect(g, 1006, 950, 48, 4, wood);
  for (let i = 0; i < 3; i++) circle(g, 1016 + i * 14, 902, 6, bone);
  for (let i = 0; i < 4; i++) rect(g, 790 + i * 64, 1034, 28, 6, bone);
  rect(g, 900, 1012, 8, 22, C('#8a8470', '#4a4840'));
  // LIVING: grandfather clock, rug
  rect(g, 1150, 960, 28, 160, dark);
  rect(g, 1146, 952, 36, 12, wood);
  circle(g, 1164, 990, 10, bone);
  rect(g, 1162, 982, 4, 10, '#0a0a08');
  rect(g, 1158, 1030, 12, 40, '#0a0a08');
  rect(g, 1340, 1112, 220, 8, '#2a1414');
  // HALL: bench and dead phone table
  rect(g, 2010, 1080, 100, 10, wood);
  rect(g, 2014, 1090, 6, 30, dark);
  rect(g, 2100, 1090, 6, 30, dark);
  // ATTIC: stacked boxes, trunk, dress form, sheeted shapes
  rect(g, 900, 380, 70, 60, '#2a2519');
  rect(g, 910, 340, 54, 40, '#252014');
  rect(g, 900, 380, 70, 4, '#1a1610');
  rect(g, 930, 360, 20, 4, '#1a1610');
  rect(g, 1500, 396, 80, 44, '#241f15');
  rect(g, 1500, 396, 80, 6, '#14110c');
  rect(g, 1536, 410, 8, 8, '#4a4430');
  ellipse(g, 1260, 330, 18, 26, C('#5a5a4c', '#3a3a32'));
  rect(g, 1256, 356, 8, 70, '#1a1610');
  rect(g, 1244, 432, 32, 6, '#1a1610');
  sheet(g, 1310, 370, 70, 70);
  ellipse(g, 935, 438, 50, 6, 'rgba(0,0,0,0.6)');
  ellipse(g, 1540, 438, 50, 6, 'rgba(0,0,0,0.6)');
  // FURNACE ROOM: hooks and chains from the joists, drain, workbench
  for (let i = 0; i < 3; i++) {
    const hx = 480 + i * 70;
    rect(g, hx, 1180, 4, 90 + i * 20, '#22221c');
    line(g, hx + 2, 1270 + i * 20, hx + 12, 1282 + i * 20, steel, 4);
    rect(g, hx + 8, 1282 + i * 20, 6, 10, '#5c0a0c');
  }
  rect(g, 240, 1320, 140, 10, wood);
  rect(g, 246, 1330, 8, 70, dark);
  rect(g, 366, 1330, 8, 70, dark);
  ellipse(g, 600, 1396, 26, 6, '#050505');
  // STORAGE: shelf jars
  for (let i = 0; i < 6; i++) {
    rect(g, 1090 + i * 24, 1218, 14, 22, C('#3e4436', '#2a2e26'));
    rect(g, 1090 + i * 24, 1278, 14, 22, i % 2 ? '#3a1416' : C('#3e4436', '#2a2e26'));
  }
}

// interior wall with a black doorway between two rooms (thick, lit jamb on one side)
function drawWall(g, x, top, floorY) {
  const doorTop = floorY - 150;
  rect(g, x - 16, top, 32, doorTop - top, C('#191a14', '#121310'));
  rect(g, x - 16, top, 4, doorTop - top, C('#23251c', '#17180f'));
  rect(g, x + 12, top, 4, doorTop - top, '#070806');
  rect(g, x - 20, doorTop - 10, 40, 10, '#0d0d0a');
  rect(g, x - 16, doorTop, 32, 150, '#010101');
  rect(g, x - 20, doorTop, 4, 150, C('#26261c', '#18180f'));
  rect(g, x + 16, doorTop, 4, 150, '#0d0d0a');
}

// fixed gore: pooled blood, drag marks, handprints near the stairs
function staticGore(g) {
  bgBlood(g, 960, 776, 46, 'pool');                 // under the tub
  bgBlood(g, 905, 770, 20, 'drag');                 // dragged out of the bath
  bgBlood(g, 1600, 772, 22, 'drag');
  bgBlood(g, 1760, 772, 18, 'drag');
  bgBlood(g, 1830, 1000, 22, 'hand');               // handprints climbing beside the main stairs
  bgBlood(g, 1880, 960, 20, 'hand');
  bgBlood(g, 1930, 920, 22, 'hand');
  bgBlood(g, 1700, 640, 18, 'hand');                // and up to the attic
  bgBlood(g, 1740, 600, 20, 'hand');
  bgBlood(g, 600, 1396, 30, 'pool');                // basement drain
  bgBlood(g, 380, 1392, 18, 'drag');
  bgBlood(g, 1200, 1112, 16, 'splat');
}

// whole house picture
function drawHouse(g, abandoned) {
  AB = abandoned;
  seedVal = 4242;
  // sickly night sky
  const sky = g.createLinearGradient(0, 0, 0, 1120);
  sky.addColorStop(0, C('#0c100e', '#070908'));
  sky.addColorStop(1, C('#1a201b', '#101411'));
  g.fillStyle = sky;
  g.fillRect(0, 0, WORLD_W, WORLD_H);
  // pale smudged moon
  circle(g, 2320, 150, 44, C('#5d6458', '#4a5048'));
  circle(g, 2304, 140, 10, C('#50574b', '#3e443c'));
  for (let i = 0; i < 40; i++) rect(g, srand() * WORLD_W, srand() * 400, 4, 4, 'rgba(160,170,150,0.25)');
  // earth and dead grass
  rect(g, 0, 1120, WORLD_W, WORLD_H - 1120, '#0b0d0a');
  for (let i = 0; i < 160; i++) {
    const x = srand() * WORLD_W;
    line(g, x, 1124, x + rs(6), 1108 - srand() * 10, C('#1e2419', '#161a13'), 4);
  }
  // path to the street
  rect(g, 2260, 1120, 300, 12, '#1c1c16');
  // dead tree
  const tree = '#060706';
  line(g, 90, 1120, 110, 640, tree, 20);
  line(g, 104, 820, 30, 720, tree, 10);
  line(g, 108, 760, 170, 660, tree, 8);
  line(g, 106, 700, 60, 600, tree, 6);
  // roof
  poly(g, [140, 470, 1280, 50, 2420, 470], C('#14150f', '#0d0e0a'));
  for (let y = 80; y < 470; y += 24) {
    const hw = 1140 * (y - 50) / 420;
    rect(g, 1280 - hw, y, hw * 2, 4, 'rgba(0,0,0,0.45)');
  }
  if (AB) {
    poly(g, [700, 330, 760, 320, 780, 370, 710, 380], '#020302');
    poly(g, [1900, 300, 1960, 312, 1950, 350, 1890, 340], '#020302');
  }
  // chimney
  rect(g, 1820, 120, 70, 200, C('#1e1c16', '#15140f'));
  // house body and basement foundation
  rect(g, 180, 450, 2080, 690, C('#171913', '#10120d'));
  rect(g, 180, 1140, 1740, 280, '#121310');
  // rooms
  for (let i = 0; i < ROOMS.length; i++) drawRoom(g, ROOMS[i]);
  // sloped attic ceiling shadows
  poly(g, [860, 230, 1080, 230, 860, 330], 'rgba(0,0,0,0.85)');
  poly(g, [1700, 230, 1480, 230, 1700, 330], 'rgba(0,0,0,0.85)');
  // windows
  for (let i = 0; i < WINDOWS.length; i++) drawWindow(g, WINDOWS[i]);
  // old stains and dried blood (more when abandoned)
  const nStain = AB ? 6 : 2;
  for (let i = 0; i < ROOMS.length; i++) {
    const r = ROOMS[i];
    for (let k = 0; k < nStain; k++) {
      ellipse(g, r.x + 40 + srand() * (r.w - 80), r.y + 40 + srand() * (r.h - 80), 20 + srand() * 40, 12 + srand() * 24, 'rgba(6,8,4,0.4)');
    }
    const nB = AB ? 4 : 1;
    for (let k = 0; k < nB; k++) {
      const kinds = ['splat', 'drip', 'hand', 'smear'];
      const kind = kinds[Math.floor(srand() * 4)];
      const bx = r.x + 40 + srand() * (r.w - 80);
      const by = kind === 'smear' ? r.y + r.h - 12 : r.y + 50 + srand() * (r.h - 140);
      bgBlood(g, bx, by, 14 + srand() * 18, kind);
    }
    if (AB) {
      const hx = r.x + 60 + srand() * (r.w - 160);
      const hy = r.y + 40 + srand() * 60;
      poly(g, [hx, hy, hx + 40, hy - 8, hx + 60, hy + 24, hx + 30, hy + 50, hx + 4, hy + 34], '#030403');   // hole
      cobweb(g, r.x + 4, r.y + 16, 1, 1, 60 + srand() * 40);
      cobweb(g, r.x + r.w - 4, r.y + 16, -1, 1, 50 + srand() * 40);
    }
  }
  // drag trail toward the basement
  if (AB) {
    rect(g, 300, 1108, 340, 10, '#3a0507');
    rect(g, 1200, 1388, 400, 10, '#3a0507');
  }
  // furnace glow bleeding onto the basement wall
  const fg = g.createRadialGradient(800, 1320, 10, 800, 1320, 260);
  fg.addColorStop(0, C('rgba(120,50,18,0.35)', 'rgba(60,24,10,0.2)'));
  fg.addColorStop(1, 'rgba(120,50,18,0)');
  g.fillStyle = fg;
  g.fillRect(540, 1160, 500, 240);
  // furniture
  drawFurniture(g);
  staticGore(g);
  // interior walls between neighbours on the same floor
  for (let i = 0; i < ROOMS.length; i++) {
    for (let j = 0; j < ROOMS.length; j++) {
      const a = ROOMS[i];
      const b = ROOMS[j];
      if (a.floor === b.floor && a.x + a.w === b.x) drawWall(g, b.x, Math.max(a.y, b.y), a.floor);
    }
  }
  // outer walls
  const wallC = C('#14150f', '#0e0f0b');
  rect(g, 180, 450, 20, 690, wallC);
  rect(g, 2240, 450, 20, DOOR.y - 150 - 450, wallC);
  rect(g, 180, 1140, 20, 280, wallC);
  rect(g, 1900, 1140, 20, 280, wallC);
  // floor slabs
  const slabC = C('#1d1b14', '#14130e');
  rect(g, 860, 440, 840, 20, slabC);
  rect(g, 180, 780, 2080, 20, slabC);
  rect(g, 180, 1120, 2080, 40, slabC);
  rect(g, 180, 1400, 1740, 20, slabC);
  // foreground cut edge: bright top lip, near-black body below it
  rect(g, 860, 444, 840, 16, '#070806');
  rect(g, 180, 784, 2080, 16, '#070806');
  rect(g, 180, 1124, 2080, 36, '#070806');
  rect(g, 180, 1404, 1740, 16, '#070806');
  for (let jx = 200; jx < 2240; jx += 80) {
    rect(g, jx, 788, 12, 8, '#141510');
    rect(g, jx, 1132, 12, 10, '#141510');
  }
  // stair openings in the slabs
  rect(g, 1600, 440, 80, 20, '#030403');
  rect(g, 2040, 780, 100, 20, '#030403');
  rect(g, 560, 1120, 120, 40, '#030403');
  if (AB) {
    rect(g, 400, 782, 50, 16, '#030403');                 // broken boards
    rect(g, 1500, 1122, 60, 30, '#030403');
  }
  // stairs
  for (let i = 0; i < STAIRS.length; i++) drawStair(g, STAIRS[i]);
  // front door frame
  rect(g, DOOR.x - 6, DOOR.y - 160, 32, 10, '#0d0d0a');
  // final grade: crush toward green-black
  rect(g, 0, 0, WORLD_W, WORLD_H, C('rgba(4,8,4,0.15)', 'rgba(2,6,3,0.35)'));
  AB = false;
}

const bgNormal = makeCanvas(WORLD_W, WORLD_H);
drawHouse(bgNormal.getContext('2d'), false);
const bgAband = makeCanvas(WORLD_W, WORLD_H);
drawHouse(bgAband.getContext('2d'), true);
