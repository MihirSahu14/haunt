"use strict";
// =====================================================================
// HUD (screen space, 1280x720, hard-edged pixel panels)
// =====================================================================
const UI_BG = '#0b0f0c';                          // panel fill
const UI_EDGE = '#5e7262';                        // panel border
const UI_TEXT = '#d2dcc6';                        // main text
const UI_DIM = '#95a493';                         // dim text
const UI_BLOOD = '#c0181c';                       // blood accent
const UI_LAMP = '#dcc870';                        // dirty lamp yellow
const UI_ARROW = '#f2d43a';                       // guidance arrow: loud yellow, must read as "the yellow arrow"
const UI_EXO = '#e0201f';                         // exorcist arrow: loud red
const photoCv = makeCanvas(28, 32);               // tiny portrait buffer
const photoG = photoCv.getContext('2d');
const titleCv = makeCanvas(320, 180);             // low-res house for title
const titleG = titleCv.getContext('2d');
let hudArrows = [];                               // [wx, wy, color] queued this frame, drawn after post-fx

// hard-edged panel with a 2px border
function uiPanel(g, x, y, w, h) {
  rect(g, x, y, w, h, UI_EDGE);
  rect(g, x + 2, y + 2, w - 4, h - 4, UI_BG);
}

// stepped pixel line made of s x s squares
function pixLine(g, x1, y1, x2, y2, s, color) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / s));
  g.fillStyle = color;
  for (let i = 0; i <= n; i++) {
    const px = Math.round((x1 + (x2 - x1) * i / n) / s) * s;
    const py = Math.round((y1 + (y2 - y1) * i / n) / s) * s;
    g.fillRect(px, py, s, s);
  }
}

// ecto candle: wax height = energy, flame flickers on top
function drawEctoCandle(g) {
  uiPanel(g, 16, 16, 168, 100);
  const e = clamp(game.energy / 100, 0, 1);
  const low = game.lowFlash > 0;
  const baseY = 100;                              // dish top
  const waxH = Math.max(4, Math.round(e * 60 / 4) * 4);
  rect(g, 28, baseY, 40, 8, UI_EDGE);             // dish
  rect(g, 40, baseY - waxH, 16, waxH, low ? '#6a3a36' : '#8f9a86');  // wax
  rect(g, 52, baseY - waxH, 4, waxH, '#5d665a');  // shaded side
  rect(g, 44, baseY - waxH + 4, 4, Math.min(12, waxH - 4), '#b9c2ae');  // drip
  rect(g, 47, baseY - waxH - 4, 2, 4, '#1a1a14'); // wick
  const fl = 8 + Math.round((Math.sin(globalT * 13) + Math.sin(globalT * 7.3)) * 2) * 2;
  const fx = 44 + (Math.random() < 0.15 ? 4 * (Math.random() < 0.5 ? -1 : 1) : 0);
  const flameCol = low ? UI_BLOOD : UI_LAMP;
  if (e > 0.05) {
    rect(g, fx, baseY - waxH - 4 - fl, 8, fl, flameCol);       // outer flame
    rect(g, fx + 2, baseY - waxH - 4 - fl / 2, 4, fl / 2, '#d8cc94');  // core
  }
  label(g, 'ECTO', 80, 40, 16, UI_TEXT, 'left');
  label(g, String(Math.floor(game.energy)), 80, 64, 16, low ? UI_BLOOD : UI_DIM, 'left');
  // combo, only while active
  const win = typeof COMBO_WINDOW === 'number' ? COMBO_WINDOW : 3;
  if (game.combo > 1 && game.time - game.lastScare < win) {
    const left = 1 - (game.time - game.lastScare) / win;
    label(g, 'x' + game.combo, 80, 90, 16, UI_BLOOD, 'left');
    rect(g, 112, 88, Math.round(60 * left / 4) * 4, 4, UI_BLOOD);
  }
}

// one family member as a small cracked photograph
function drawPhoto(g, m, i, x, y) {
  const f = clamp(m.fear / 100, 0, 1);
  const gone = m.state === 'gone';
  // portrait into the tiny buffer, then upscale x2
  photoG.globalCompositeOperation = 'source-over';
  rect(photoG, 0, 0, 28, 32, '#1a201b');
  if (typeof drawFaceIcon === 'function') drawFaceIcon(photoG, m, 14, 15, 9);
  photoG.globalCompositeOperation = 'saturation';    // drain colour with fear
  photoG.globalAlpha = 0.55 + f * 0.45;
  rect(photoG, 0, 0, 28, 32, '#808080');
  photoG.globalAlpha = 1;
  photoG.globalCompositeOperation = 'multiply';      // green-gray print tint
  rect(photoG, 0, 0, 28, 32, '#a8b5a0');
  photoG.globalCompositeOperation = 'source-over';
  rect(photoG, 0, 0, 28, 32, 'rgba(138,15,18,' + (f * 0.45) + ')');  // blood tint
  uiPanel(g, x, y, 64, 88);
  g.imageSmoothingEnabled = false;
  g.drawImage(photoCv, x + 4, y + 4, 56, 64);
  g.imageSmoothingEnabled = true;
  // cracks once fear passes half
  if (f > 0.5) {
    const ox = x + 8 + (i * 13) % 40;
    pixLine(g, ox, y + 4, ox + 8, y + 24, 2, '#050705');
    pixLine(g, ox + 8, y + 24, ox + 2, y + 40, 2, '#050705');
  }
  if (f > 0.8) {
    const ox2 = x + 56 - (i * 7) % 30;
    pixLine(g, ox2, y + 68, ox2 - 10, y + 44, 2, '#050705');
    pixLine(g, ox2 - 10, y + 44, ox2 - 4, y + 30, 2, UI_BLOOD);
  }
  // fear strip under the photo
  rect(g, x + 4, y + 72, 56, 4, '#1a201b');
  rect(g, x + 4, y + 72, Math.floor(56 * f / 2) * 2, 4, UI_BLOOD);   // floor: 99.6 never reads full
  label(g, String(m.name || m.id).slice(0, 5), x + 32, y + 82, 8, gone ? UI_DIM : UI_TEXT);
  // fled: dim and cross out
  if (gone) {
    rect(g, x + 4, y + 4, 56, 64, 'rgba(5,7,5,0.6)');
    pixLine(g, x + 8, y + 8, x + 54, y + 62, 4, UI_BLOOD);
    pixLine(g, x + 54, y + 8, x + 8, y + 62, 4, UI_BLOOD);
  }
}

function drawHUD() {
  const g = sc;
  drawEctoCandle(g);
  // family photographs, top right
  let fled = 0;
  for (let i = 0; i < family.length; i++) {
    const m = family[i];
    if (m.state === 'gone') fled += 1;
    drawPhoto(g, m, i, W - 16 - (family.length - i) * 72 + 8, 16);
  }
  // fled count sits under the photos (bottom-left belongs to the diary)
  label(g, 'FLED ' + fled + ' / ' + family.length, W - 16, 122, 16, fled > 0 ? UI_BLOOD : UI_TEXT, 'right');
  drawCostTag(g);
  if (typeof drawThreatHUD === 'function') drawThreatHUD(g);
  hudArrows = [];
  drawOnboard(g);
}

// ecto price over the selected object's brackets, before you press E
function drawCostTag(g) {
  if (game.freeze > 0 || typeof threatCost !== 'function') return;
  const o = nearestObject(roomAt(ghost.x, ghost.y));
  if (!o || o.cool > 0) return;
  const c = threatCost(o);
  const lit = threat && threat.lights && roomIsLit(o.room);
  const s = 'E ' + c + ' ecto' + (lit ? ' (lit x1.5)' : '') + (objSeen(o) ? ' - seen, weaker' : '');
  const y = Math.max(HUD_BAND + 12, o.y - o.h - 36 - camY);
  label(g, s, o.x - camX, y, 12, game.energy >= c ? UI_TEXT : UI_BLOOD, 'center');
}

// after post-fx, straight onto the visible canvas: the grade, grain and vignette would dull these
function drawHUDOverlay(g) {
  if (mode !== 'game' || !game || game.freeze > 0) return;
  for (let i = 0; i < hudArrows.length; i++) drawEdgeArrow(g, hudArrows[i][0], hudArrows[i][1], hudArrows[i][2]);
  if (typeof drawBanners === 'function') drawBanners(g);
}

// =====================================================================
// ONBOARDING: one prompt at a time, each waits for the action
// =====================================================================
const ONBOARD_TEXT = [
  'Get all 4 out the FRONT DOOR before 5 AM.',
  'Move with WASD. You float through walls.',
  'Follow the yellow arrow to someone.',
  'In their room, press E to haunt the nearest object.',
  'Scares cost ECTO (top left). Their fear refills it.',
  'Same trick twice scares less. Switch objects and rooms.',
];
let onboard = null;                               // { game, step, t0, sx, sy }

// nearest family member still in the house, or null
function hudNearestMember() {
  let best = null;
  let bd = 1e9;
  for (let i = 0; i < family.length; i++) {
    const m = family[i];
    if (m.state === 'gone') continue;
    const d = Math.hypot(m.x - ghost.x, m.y - 60 - ghost.y);
    if (d < bd) {
      bd = d;
      best = m;
    }
  }
  return best;
}

// is a world point inside the camera view
function hudOnScreen(wx, wy) {
  const sx = wx - camX;
  const sy = wy - camY;
  return sx > 0 && sx < W && sy > 0 && sy < H;
}

// has the player already done this step's action (null: read-only line)
function onboardAct(step) {
  if (step === 1) return Math.hypot(ghost.x - onboard.sx, ghost.y - onboard.sy) > 160;
  if (step === 2) {
    const m = hudNearestMember();
    return m !== null && hudOnScreen(m.x, m.y - 60) && Math.hypot(m.x - ghost.x, m.y - 60 - ghost.y) < 520;
  }
  if (step === 3) return onboard.haunted;
  return null;
}

// is the current step's action done
function onboardDone(step, held) {
  const typed = ONBOARD_TEXT[step].length / 40;   // typing speed in drawOnboard
  if (held < typed + 1) return false;             // never cut a line mid-sentence
  const act = onboardAct(step);
  return act === null ? held > typed + 4 : act;   // read-only lines stay 4 s once typed
}

// chunky pixel arrow on the screen edge toward a world point
function drawEdgeArrow(g, wx, wy, color) {
  const sx = wx - camX;
  const sy = wy - camY;
  const dx = sx - W / 2;
  const dy = sy - H / 2;
  // each stroke gets a dark drop shadow so it reads on lit rooms too
  const seg = function (x1, y1, x2, y2) {
    pixLine(g, x1 + 4, y1 + 4, x2 + 4, y2 + 4, 4, FONT_SHADOW);
    pixLine(g, x1, y1, x2, y2, 4, color);
  };
  if (hudOnScreen(wx, wy)) {
    // on screen: a bobbing pixel chevron over the head, clear of the sprite and its fear pips
    const bx = Math.round(sx / 4) * 4;
    const by = Math.max(HUD_BAND + 28, Math.round((sy - 100 + Math.sin(globalT * 5) * 6) / 4) * 4);
    seg(bx - 20, by - 20, bx, by);
    seg(bx + 20, by - 20, bx, by);
    return;
  }
  // off screen: pin the tip to an inner rectangle that dodges the HUD
  const t = Math.min((W / 2 - 56) / Math.max(1, Math.abs(dx)), (dy < 0 ? H / 2 - HUD_BAND - 24 : H / 2 - 140) / Math.max(1, Math.abs(dy)));
  const px = W / 2 + dx * t;
  const py = H / 2 + dy * t;
  const ang = Math.atan2(dy, dx);
  const pulse = 4 * Math.round(Math.sin(globalT * 6));
  const tx = px + Math.cos(ang) * pulse;
  const ty = py + Math.sin(ang) * pulse;
  seg(tx, ty, tx + Math.cos(ang + 2.5) * 28, ty + Math.sin(ang + 2.5) * 28);
  seg(tx, ty, tx + Math.cos(ang - 2.5) * 28, ty + Math.sin(ang - 2.5) * 28);
  seg(tx, ty, tx - Math.cos(ang) * 36, ty - Math.sin(ang) * 36);
}

// prompts + pointer arrows (screen space)
function drawOnboard(g) {
  if (mode !== 'game' || !game) return;
  if (typeof threat !== 'undefined' && threat && threat.paused) return;   // pause overlay stays on top
  if (!onboard || onboard.game !== game) {
    onboard = { game: game, step: 0, t0: game.time, sx: ghost.x, sy: ghost.y, last: game.time, haunted: false };
  }
  for (let i = 0; i < OBJECTS.length; i++) if (OBJECTS[i].cool > 0) onboard.haunted = true;
  // one hint at a time: while a one-time explanation is up, the tutorial / context slab waits (and its clock holds)
  const hintUp = !!threat && threat.toasts.some(function (t) { return t.hint; });
  if (hintUp) onboard.t0 += game.time - onboard.last;
  onboard.last = game.time;
  const held = game.time - onboard.t0;
  if (onboard.step < ONBOARD_TEXT.length && onboardDone(onboard.step, held)) {
    onboard.step += 1;
    onboard.t0 = game.time;
    while (onboard.step < ONBOARD_TEXT.length && onboardAct(onboard.step) === true) onboard.step += 1;   // skip steps already done
  }
  const step = onboard.step;
  // arrow to the nearest family member when nobody is in view or in the ghost's room (always on)
  const m = hudNearestMember();
  const gr = roomAt(ghost.x, ghost.y);
  const lonely = step >= ONBOARD_TEXT.length && gr && hudRoomPeople(gr) === 0;   // the "Follow the yellow arrow" hint is up
  let anyVisible = false;
  for (let i = 0; i < family.length; i++) {
    const f = family[i];
    if (f.state !== 'gone' && hudOnScreen(f.x, f.y - 60)) anyVisible = true;
  }
  if (m && (!anyVisible || step === 2 || lonely)) hudArrows.push([m.x, m.y - 60, UI_ARROW]);
  // anyone running for the door, while they are off screen
  for (let i = 0; i < family.length; i++) {
    const f = family[i];
    if (f.state === 'flee' && !hudOnScreen(f.x, f.y - 60)) hudArrows.push([f.x, f.y - 60, UI_ARROW]);
  }
  // the front door during its prompt
  const dr = typeof DOOR !== 'undefined' ? DOOR : null;
  if (step === 0 && dr) hudArrows.push([dr.x, dr.y - 80, UI_BLOOD]);
  // the exorcist, whenever he is in the house (red, so it never reads as "follow me")
  const h = threat && threat.hunter;
  if (h && h.state !== 'flee') hudArrows.push([h.x, h.y - 60, UI_EXO]);
  // repeat-trick warning lives on the cost tag of the selected object ("seen, weaker"), not in a toast
  if (hintUp) return;
  if (step >= ONBOARD_TEXT.length) {
    drawContextHint(g);
    return;
  }
  // the prompt, typed out, on a hard-edged slab under the ghost
  const s = ONBOARD_TEXT[step];
  const n = Math.min(s.length, Math.floor((game.time - onboard.t0) * 40));
  const k = fontScale(16);
  const w = measurePixelText(s, k);
  const x0 = Math.round((W / 2 - w / 2 - 16) / 4) * 4;
  uiPanel(g, x0, 500, w + 32, 40);
  rect(g, x0 + 2, 536, 8, 2, UI_BLOOD);           // tiny blood tick, no glow
  label(g, s.slice(0, n), W / 2 - w / 2, 520, 16, UI_TEXT, 'left');
}

// =====================================================================
// TITLE
// =====================================================================
function drawTitle() {
  const g = sc;
  rect(g, 0, 0, W, H, '#000');
  // lightning: rare double flash
  const ph = globalT % 9;
  const flash = (ph > 6 && ph < 6.08) || (ph > 6.2 && ph < 6.26);
  // house, pixelated and barely lit
  if (typeof bgNormal !== 'undefined' && bgNormal) {
    titleG.imageSmoothingEnabled = true;
    titleG.drawImage(bgNormal, 0, 0, 320, 180);
    g.imageSmoothingEnabled = false;
    g.globalAlpha = flash ? 0.55 : 0.16;
    g.drawImage(titleCv, 0, 0, W, H);
    g.imageSmoothingEnabled = true;
    g.globalAlpha = 1;
  }
  // one window glowing dirty yellow
  if (typeof WINDOWS !== 'undefined' && WINDOWS.length && typeof WORLD_W === 'number') {
    const wn = WINDOWS[0];
    const k = W / WORLD_W;
    const flick = Math.random() < 0.06 ? 0.1 : 0.35;
    g.globalAlpha = flick;
    rect(g, Math.round(wn.x * k / 4) * 4, Math.round(wn.y * k / 4) * 4, Math.max(8, Math.round(wn.w * k / 4) * 4), Math.max(8, Math.round(wn.h * k / 4) * 4), UI_LAMP);
    g.globalAlpha = 1;
  }
  // rain: chunky diagonal streaks
  g.fillStyle = 'rgba(90,110,95,0.35)';
  for (let i = 0; i < 140; i++) {
    const rx = Math.round(((i * 97.3 + globalT * 120) % (W + 80)) / 4) * 4 - 40;
    const ry = Math.round(((i * 53.7 + globalT * 700 + i * i) % (H + 40)) / 4) * 4 - 20;
    g.fillRect(rx, ry, 4, 12);
  }
  rect(g, 0, 0, W, H, 'rgba(0,0,0,0.35)');
  shakyText(g, 'HAUNT', W / 2, 196, 96, '#b9c4b0');
  label(g, 'They moved into your house.', W / 2, 270, 16, UI_DIM);
  // blinking prompt
  if (Math.floor(globalT * 1.6) % 2 === 0) label(g, 'click to begin', W / 2, 350, 24, UI_LAMP);
  // how to play card
  uiPanel(g, W / 2 - 330, 410, 660, 250);
  label(g, 'GOAL', W / 2 - 300, 438, 16, UI_BLOOD, 'left');
  label(g, 'Scare all 4 of them out the front door before 5 AM.', W / 2 - 300, 466, 16, UI_TEXT, 'left');
  label(g, 'HOW', W / 2 - 300, 506, 16, UI_BLOOD, 'left');
  label(g, 'WASD        move (you float through walls)', W / 2 - 300, 534, 16, UI_TEXT, 'left');
  label(g, 'E           haunt the object nearest you', W / 2 - 300, 560, 16, UI_TEXT, 'left');
  label(g, 'TAB / ESC   tasks / help', W / 2 - 300, 586, 16, UI_TEXT, 'left');
  label(g, 'Haunt rooms with people in them. Mix it up.', W / 2 - 300, 620, 16, UI_DIM, 'left');
  label(g, 'Too much noise brings the exorcist.', W / 2 - 300, 644, 16, UI_DIM, 'left');
  label(g, 'sound on', W / 2, 692, 16, UI_DIM);
}

// one line of typewriter text (ending)
function typeLine(s, start, y, size) {
  const n = Math.max(0, Math.floor((ending.t - start) * 24));
  const k = fontScale(size);
  const w = measurePixelText(s, k);
  rect(sc, Math.round(W / 2 - w / 2 - 12), Math.round(y - 6 * k), w + 24, 12 * k, '#050705');  // solid slab, hard edge
  label(sc, s.slice(0, n), W / 2 - w / 2, y, size, UI_TEXT, 'left');
}

function drawEndCard(t) {
  rect(sc, 0, 0, W, H, '#000');
  sc.globalAlpha = clamp(t / 1.2, 0, 1);
  shakyText(sc, 'THE END?', W / 2, 300, 96, '#b9c4b0');
  sc.globalAlpha = 1;
  if (t > 1) {
    const on = Math.floor(globalT * 1.6) % 2 === 0;
    uiPanel(sc, W / 2 - 110, 420, 220, 56);
    label(sc, 'PLAY AGAIN', W / 2, 448, 16, on ? UI_LAMP : UI_DIM);
  }
}

// =====================================================================
// CONTEXT HINT: one plain line telling the player what to do right now
// =====================================================================
// who shares a room with the ghost (fleeing members don't count)
function hudRoomPeople(room) {
  let people = 0;
  for (let i = 0; i < family.length; i++) {
    const m = family[i];
    if (m.state === 'gone' || m.state === 'flee') continue;
    const r = roomAt(m.x, m.y - 20);
    if (r && r.id === room.id) people += 1;
  }
  return people;
}

// would E on this room's selected object repeat a trick someone here has already seen
function hudRepeat(room) {
  const o = nearestObject(room);
  return !!o && o.cool <= 0 && objSeen(o);
}

function contextHint() {
  if (typeof roomAt !== 'function') return '';
  const room = roomAt(ghost.x, ghost.y);
  if (!room) return 'Float into a room.';
  const people = hudRoomPeople(room);
  if (people === 0) return 'Nobody here. Follow the yellow arrow.';
  const o = typeof nearestObject === 'function' ? nearestObject(room) : null;
  if (!o) return 'Nothing to haunt here. Try another room.';
  if (o.cool > 0) return 'Recharging... try the other object in this room.';
  const cost = typeof threatCost === 'function' ? threatCost(o) : 25;
  if (game.energy < cost) return 'Not enough ecto (this costs ' + cost + '). Wait a moment.';
  if (hudRepeat(room)) return 'They have seen this one: it scares less. Try another.';
  if (people > 1) return 'Press E now - you will scare ' + people + ' at once.';
  return 'Press E to haunt.';
}

// draws the hint on a small slab near the bottom
function drawContextHint(g) {
  if (game.freeze > 0) return;
  const s = contextHint();
  if (!s) return;
  const k = fontScale(16);
  const w = measurePixelText(s, k);
  let x0 = Math.round((W / 2 - w / 2 - 16) / 4) * 4;
  if (threat && threat.showObj && threat.diaryR) x0 = Math.max(x0, Math.round((threat.diaryR + 16) / 4) * 4);  // never over the diary
  uiPanel(g, x0, 640, w + 32, 40);
  label(g, s, x0 + 16, 660, 16, UI_TEXT, 'left');
}
