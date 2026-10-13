"use strict";
// =====================================================================
// PROMO: store art and screenshots drawn by the real game code
// tools/promo.html?mode=<name> -> data url in <pre id="png">
// (tools/promo-shoot.js reads it back with chrome --dump-dom)
// =====================================================================
const PROMO_DT = 1 / 60;
const PAGE_BG = '#0a0d0a';                         // suggested itch page background

// run the real loop n frames; pin() fixes state before each render
function promoStep(n, pin) {
  for (let i = 0; i < n; i++) {
    update(PROMO_DT);
    if (typeof updateDirector === 'function') updateDirector(PROMO_DT);
    if (pin) pin();
    render();
  }
}

// no random flicker / lightning, blood fully grown
function calm() {
  flickerT = -1;
  lightningT = 99;
  lightningNext = 999;
  for (let i = 0; i < BLOOD.length; i++) BLOOD[i].born = -99;
  if (threat) threat.toasts = [];
}

// new run with the tutorial prompts already done
function freshGame() {
  startGame();
  onboard = { game: game, step: 99, t0: 0, sx: ghost.x, sy: ghost.y };
  for (let i = 0; i < family.length; i++) family[i].idleT = 99;
  threat.showObj = false;
  calm();
}

// put a member somewhere and keep them there
function placeMember(m, x, y, facing, fear) {
  m.x = x;
  m.y = y;
  m.facing = facing;
  m.fear = fear;
  m.state = 'idle';
  m.idleT = 99;
  m.path = [];
}

// object by room + type
function objectOf(room, type) {
  for (let i = 0; i < OBJECTS.length; i++) {
    if (OBJECTS[i].room === room && OBJECTS[i].type === type) return OBJECTS[i];
  }
  return null;
}

// =====================================================================
// SCREENSHOTS (1280x720, the game canvas itself)
// =====================================================================
// 1: title screen
function shotTitle() {
  promoStep(90, calm);
  return canvas;
}

// 2: the ghost haunts the crib, Mom and the Kid jump; full HUD
function shotHaunt() {
  freshGame();
  ghost.x = 1248;
  ghost.y = 608;
  ghost.face = 1;
  placeMember(family[1], 1110, 780, 1, 34);
  placeMember(family[2], 1352, 780, -1, 58);
  threat.clock = 95;
  snapCamera(ghost.x, ghost.y);
  promoStep(30, calm);
  game.energy = 90;
  triggerObject(objectOf('kid', 'crib'));
  promoStep(14, calm);
  return canvas;
}

// 3: full-screen jump scare
function shotScare() {
  freshGame();
  promoStep(10, calm);
  terrify(family[1]);
  // hold the face mid-scare, past the white flash
  const hold = function () {
    calm();
    game.freeze = 0.5;
    game.jsT = 0.32;
    shake = 8;
    abBoost = 5;
    grainBoost = 0.15;
  };
  promoStep(6, hold);
  return canvas;
}

// 4: the exorcist's lantern in the dark living room
function shotExorcist() {
  freshGame();
  ghost.x = 1288;
  ghost.y = 984;
  ghost.face = 1;
  placeMember(family[0], 1668, 1120, -1, 72);
  spawnHunter();
  const h = threat.hunter;
  h.scares = 1;
  threat.suspicion = 86;
  threat.clock = 190;
  addBlood(1300, 1114, 30, 'pool');
  addBlood(1420, 1010, 20, 'hand');
  addBlood(1236, 1000, 16, 'drip');
  snapCamera(ghost.x, ghost.y);
  // he stands still, lantern raised toward the ghost
  const hold = function () {
    calm();
    h.x = 1560;
    h.y = 1120;
    h.facing = -1;
    h.path = [];
    h.repath = 99;
    family[0].jumpT = 0;
  };
  promoStep(50, hold);
  return canvas;
}

// =====================================================================
// SHARED ART HELPERS
// =====================================================================
// the game's post grade: drain 25%, green-gray multiply
function grade(g, w, h) {
  g.globalCompositeOperation = 'saturation';
  g.globalAlpha = 0.25;
  rect(g, 0, 0, w, h, '#808080');
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'multiply';
  rect(g, 0, 0, w, h, 'rgb(212,230,206)');
  g.globalCompositeOperation = 'source-over';
}

// darkened corners like the game's vignette
function vignetteOn(g, w, h, a) {
  const vgr2 = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.78);
  vgr2.addColorStop(0, 'rgba(2,6,3,0)');
  vgr2.addColorStop(1, 'rgba(2,6,3,' + a + ')');
  g.fillStyle = vgr2;
  g.fillRect(0, 0, w, h);
}

// sheet ghost at 2x size (still on the 4-unit grid)
function bigGhost(g, x, y, face) {
  g.save();
  g.translate(x, y);
  g.scale(2, 2);
  drawGhost(g, 0, 0, face, 0);
  g.restore();
}

// blood runs hanging off the bottom of title letters (output px, 4px grid)
function titleDrips(g, x, y, lens) {
  for (let i = 0; i < lens.length; i++) {
    const dx = x + i * 8;
    const len = lens[i];
    if (len <= 0) continue;
    rect(g, dx, y, 4, len, '#5c0a0c');
    rect(g, dx, y + len, 4, 4, '#3a0507');
  }
}

// chunky pixel disc (no anti-aliasing)
function pixDisc(g, cx, cy, r, color) {
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy));
    rect(g, cx - w, cy + dy, w * 2 + 1, 1, color);
  }
}

// =====================================================================
// COVER 630x500: kid's room cutaway, one lamp, the ghost, Mom, the crawler
// =====================================================================
function artCover() {
  const OW = 630;
  const OH = 500;
  const bw = 158;                                  // quarter res, x4 = 632
  const bh = 125;
  mode = 'game';
  calm();
  ROOMS[0].dark = true;                            // attic lamp off: dark band for the title
  camX = 964;
  camY = 300;
  // props and gore in the kid's room
  const crib = objectOf('kid', 'crib');
  crib.anim = 1;                                   // pale hand rising out of the crib
  addBlood(1356, 776, 22, 'pool');
  addBlood(1420, 772, 14, 'drag');
  addBlood(1474, 690, 18, 'hand');
  addBlood(1118, 612, 18, 'splat');
  calm();
  // world pass on the game's own low-res buffer
  beginWorld();
  wc.imageSmoothingEnabled = false;
  wc.drawImage(bgNormal, 0, 0);
  drawObject(wc, crib);                            // first draw drops the crib's blood
  calm();
  drawBlood(wc);
  for (let i = 0; i < OBJECTS.length; i++) drawObject(wc, OBJECTS[i]);
  const mom = family[1];
  placeMember(mom, 1100, 780, 1, 0);
  mom.state = 'terrified';
  family = [mom];                                  // rims for her only
  drawMember(wc, mom, false);
  drawCrawler(wc, 1404, 778, 0, 0.95, -1);
  ghost.x = 1284;
  ghost.y = 604;
  bigGhost(wc, 1284, 584, -1);
  drawLighting(wc);
  wc.setTransform(1, 0, 0, 1, 0, 0);
  drawRims();
  // dark band at the top for the title (4px steps after upscale)
  const band = wc.createLinearGradient(0, 0, 0, 44);
  band.addColorStop(0, 'rgba(3,5,3,0.9)');
  band.addColorStop(1, 'rgba(3,5,3,0)');
  wc.fillStyle = band;
  wc.fillRect(0, 0, bw, 44);
  // upscale x4, hard pixels
  const out = makeCanvas(OW, OH);
  const g = out.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(wbuf, 0, 0, bw, bh, -1, 0, bw * 4, bh * 4);
  grade(g, OW, OH);
  vignetteOn(g, OW, OH, 0.55);
  // title, blood running off it, tag line
  shakyText(g, 'HAUNT', OW / 2, 76, 128, '#c3cdb9');
  titleDrips(g, 100, 132, [0, 20, 0, 0, 36, 8]);
  titleDrips(g, 388, 132, [12, 0, 28]);
  label(g, 'They moved into your house.', OW / 2, 160, 24, '#a8b5a0');
  return out;
}

// =====================================================================
// BANNER 960x260: the house at night, lit attic, title over the gable
// =====================================================================
function artBanner() {
  const OW = 960;
  const OH = 260;
  const bw = 240;                                  // eighth-res world, x4
  const bh = 65;
  const cx = 320;
  const cy = 0;
  const s = 0.125;
  mode = 'game';
  calm();
  const cv = makeCanvas(bw, bh);
  const g = cv.getContext('2d');
  // house, downsampled like the title screen
  g.imageSmoothingEnabled = true;
  g.drawImage(bgNormal, cx, cy, bw / s, bh / s, 0, 0, bw, bh);
  g.imageSmoothingEnabled = false;
  g.setTransform(s, 0, 0, s, -cx * s, -cy * s);
  for (let i = 0; i < OBJECTS.length; i++) drawObject(g, OBJECTS[i]);
  bigGhost(g, 1248, 336, 1);
  // light: the game's lightmap at eighth scale
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.globalCompositeOperation = 'source-over';
  lc.fillStyle = AMBIENT;
  lc.fillRect(0, 0, LW, LH);
  lc.setTransform(s, 0, 0, s, -cx * s, -cy * s);
  lc.globalCompositeOperation = 'lighter';
  const at = ROOMS[0];
  lc.save();
  lc.beginPath();
  lc.rect(at.x, at.y, at.w, at.h);
  lc.clip();
  punch(1180, 360, 300, LAMP_RGB, 0.95);
  lc.restore();
  punch(1232, 330, 140, GHOST_RGB, 0.8);
  punch(WINDOWS[0].x + 32, WINDOWS[0].y + 40, 110, MOON_RGB, 0.3);
  lc.globalCompositeOperation = 'source-over';
  drawAO();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'overlay';
  g.drawImage(lmap, 0, 0);
  g.globalCompositeOperation = 'source-over';
  // moon, top right
  pixDisc(g, 214, 12, 5, '#4f564b');
  rect(g, 211, 10, 2, 2, '#434a40');
  rect(g, 215, 14, 1, 1, '#434a40');
  // rain, chunky streaks
  g.fillStyle = 'rgba(90,110,95,0.22)';
  for (let i = 0; i < 60; i++) {
    const rx = Math.floor((i * 97.3) % (bw + 10)) - 5;
    const ry = Math.floor((i * 53.7 + i * i) % (bh + 6)) - 3;
    g.fillRect(rx, ry, 1, 3);
  }
  // upscale x4
  const out = makeCanvas(OW, OH);
  const og = out.getContext('2d');
  og.imageSmoothingEnabled = false;
  og.drawImage(cv, 0, 0, OW, OH);
  grade(og, OW, OH);
  // melt the edges into the page colour
  const lf = og.createLinearGradient(0, 0, 140, 0);
  lf.addColorStop(0, PAGE_BG);
  lf.addColorStop(1, 'rgba(10,13,10,0)');
  og.fillStyle = lf;
  og.fillRect(0, 0, 140, OH);
  const rf = og.createLinearGradient(OW, 0, OW - 140, 0);
  rf.addColorStop(0, PAGE_BG);
  rf.addColorStop(1, 'rgba(10,13,10,0)');
  og.fillStyle = rf;
  og.fillRect(OW - 140, 0, 140, OH);
  const bf = og.createLinearGradient(0, OH, 0, OH - 90);
  bf.addColorStop(0, PAGE_BG);
  bf.addColorStop(1, 'rgba(10,13,10,0)');
  og.fillStyle = bf;
  og.fillRect(0, OH - 90, OW, 90);
  // title over the gable
  shakyText(og, 'HAUNT', OW / 2, 58, 96, '#c3cdb9');
  label(og, 'They moved into your house.', OW / 2, 232, 16, '#95a493');
  return out;
}

// =====================================================================
// BG TILE 384x384: near-black wallpaper, one old blood mark (seamless)
// =====================================================================
function artTile() {
  const N = 384;                                   // 8 paper repeats
  const cv = makeCanvas(N, N);
  const g = cv.getContext('2d');
  g.fillStyle = g.createPattern(makePaper(4, '#0c0f0c', '#0a0d09'), 'repeat');
  g.fillRect(0, 0, N, N);
  // grime streaks, wrapped so the tile stays seamless
  seedVal = 77;
  for (let k = 0; k < 10; k++) {
    const sx = Math.floor(srand() * N / 4) * 4;
    const sw = 8 + Math.floor(srand() * 4) * 4;
    const sy = Math.floor(srand() * N / 4) * 4;
    const sh = 96 + Math.floor(srand() * 40) * 4;
    for (let ox = -N; ox <= N; ox += N) {
      for (let oy = -N; oy <= N; oy += N) rect(g, sx + ox, sy + oy, sw, sh, 'rgba(0,0,0,0.12)');
    }
  }
  // one faint dried handprint with a run under it
  g.save();
  g.globalAlpha = 0.3;
  bloodShape(g, 248, 132, 22, 'hand', function (k) { return [0.3, 0.7, 0.5, 0.2, 0.9, 0.4, 0.6][k % 7]; }, 1);
  g.restore();
  return cv;
}

// =====================================================================
// DISPATCH
// =====================================================================
const PROMO = {
  title: shotTitle,
  haunt: shotHaunt,
  scare: shotScare,
  exorcist: shotExorcist,
  cover: artCover,
  banner: artBanner,
  tile: artTile,
};
const promoQuery = new URLSearchParams(location.search);
const promoMode = promoQuery.get('mode') || 'title';
const promoPre = document.createElement('pre');
try {
  const cvOut = PROMO[promoMode]();
  promoPre.id = 'png';
  promoPre.textContent = cvOut.toDataURL('image/png');
} catch (err) {
  promoPre.id = 'err';
  promoPre.textContent = String(err && err.stack ? err.stack : err);
}
document.body.appendChild(promoPre);
