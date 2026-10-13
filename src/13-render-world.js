"use strict";
// =====================================================================
// RENDER
// =====================================================================
// world buffer: everything in world space is drawn here at 1/4 scale
const wbuf = makeCanvas(320, 180);                 // low-res world canvas
const wc = wbuf.getContext('2d');                  // its context
wc.imageSmoothingEnabled = false;
let camX = 0;                                      // camera left (world units, snapped to 4)
let camY = 0;                                      // camera top
let camFX = 0;                                     // smooth float camera x
let camFY = 0;                                     // smooth float camera y
let renderLast = performance.now();                // for render-side dt
const rimBuf = makeCanvas(320, 180);               // one character, for its outline
const rimG = rimBuf.getContext('2d');
const rimOut = makeCanvas(320, 180);               // the outline built from it
const rimOG = rimOut.getContext('2d');

// follow a world point smoothly, clamp to the house, snap to 4 units
function updateCamera(tx, ty, k) {
  camFX += (tx - W / 2 - camFX) * k;
  camFY += (ty - H / 2 - camFY) * k;
  camFX = clamp(camFX, 0, Math.max(0, worldW() - W));
  camFY = clamp(camFY, 0, Math.max(0, worldH() - H));
  camX = Math.round(camFX / 4) * 4;
  camY = Math.round(camFY / 4) * 4;
}

// jump the camera straight to a point
function snapCamera(tx, ty) {
  updateCamera(tx, ty, 1);
}

// begin a world pass on the low-res buffer
function beginWorld() {
  wc.setTransform(1, 0, 0, 1, 0, 0);
  wc.globalAlpha = 1;
  wc.globalCompositeOperation = 'source-over';
  wc.fillStyle = '#000';
  wc.fillRect(0, 0, 320, 180);
  wc.setTransform(0.25, 0, 0, 0.25, -camX * 0.25, -camY * 0.25);
}

// 1px pixel outline around each family member so they read in the dark
function drawRims() {
  for (let i = 0; i < family.length; i++) {
    const m = family[i];
    if (m.state === 'gone') continue;
    const lit = typeof isLit === 'function' ? isLit(m.x, m.y - 60) : 0;
    const a = 0.6 - lit * 0.4;                     // stronger rim when unlit
    // silhouette of this one member
    rimG.setTransform(1, 0, 0, 1, 0, 0);
    rimG.clearRect(0, 0, 320, 180);
    rimG.setTransform(0.25, 0, 0, 0.25, -camX * 0.25, -camY * 0.25);
    drawMember(rimG, m, false);
    rimG.setTransform(1, 0, 0, 1, 0, 0);
    rimG.globalCompositeOperation = 'source-in';
    rect(rimG, 0, 0, 320, 180, '#9aa592');          // flat pale green-gray
    rimG.globalCompositeOperation = 'source-over';
    // shift it 1px four ways, then cut the body out -> outline only
    rimOG.globalCompositeOperation = 'source-over';
    rimOG.clearRect(0, 0, 320, 180);
    rimOG.drawImage(rimBuf, -1, 0);
    rimOG.drawImage(rimBuf, 1, 0);
    rimOG.drawImage(rimBuf, 0, -1);
    rimOG.drawImage(rimBuf, 0, 1);
    rimOG.globalCompositeOperation = 'destination-out';
    rimOG.drawImage(rimBuf, 0, 0);
    rimOG.globalCompositeOperation = 'source-over';
    // body lift: a faint copy of the silhouette too
    wc.globalAlpha = a;
    wc.drawImage(rimOut, 0, 0);
    wc.globalAlpha = a * 0.12;
    wc.drawImage(rimBuf, 0, 0);
    wc.globalAlpha = 1;
  }
}

// upscale the low-res buffer onto the scene canvas
function endWorld() {
  wc.setTransform(1, 0, 0, 1, 0, 0);
  sc.setTransform(1, 0, 0, 1, 0, 0);
  sc.imageSmoothingEnabled = false;
  sc.drawImage(wbuf, 0, 0, 320, 180, 0, 0, W, H);
}

function drawWorld() {
  updateCamera(ghost.x, ghost.y, 0.1);
  beginWorld();
  wc.drawImage(bgNormal, 0, 0);
  if (typeof drawBlood === 'function') drawBlood(wc);
  for (let i = 0; i < OBJECTS.length; i++) drawObject(wc, OBJECTS[i]);
  drawDoor(wc, door.open);
  for (let i = 0; i < family.length; i++) drawMember(wc, family[i], false);
  if (typeof drawDirectorWorld === 'function') drawDirectorWorld(wc);
  if (typeof drawThreatsWorld === 'function') drawThreatsWorld(wc);
  drawParticles(wc);
  drawTrail(wc);
  drawGhost(wc, ghost.x, ghost.y, ghost.face, clamp(ghost.vx * 0.0006, -0.3, 0.3));
  drawLighting(wc);
  // characters keep a 1px rim above the darkness
  wc.setTransform(1, 0, 0, 1, 0, 0);
  drawRims();
  // interact halos stay readable above the darkness
  wc.setTransform(0.25, 0, 0, 0.25, -camX * 0.25, -camY * 0.25);
  const gr = roomAt(ghost.x, ghost.y);
  const near = nearestObject(gr);
  for (let i = 0; i < OBJECTS.length; i++) {
    const o = OBJECTS[i];
    if (gr !== null && gr.id === o.room) drawHalo(wc, o, o === near);
  }
  endWorld();
  // whispers (screen space)
  for (let i = 0; i < family.length; i++) {
    const m = family[i];
    if (m.state !== 'stare') continue;
    const a = (0.35 + Math.random() * 0.25).toFixed(2);
    label(sc, '...you again.', m.x - camX, m.y - m.h - 44 - camY, 16, 'rgba(190,200,185,' + a + ')');
  }
  drawPops(sc);
}

function drawJumpscare() {
  const m = game.js;
  const p = clamp(game.jsT / 0.7, 0, 1);
  const bg = sc.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 700);
  bg.addColorStop(0, '#2a0405');
  bg.addColorStop(1, '#000');
  sc.fillStyle = bg;
  sc.fillRect(0, 0, W, H);
  fc.clearRect(0, 0, W, H);
  drawScreamFace(fc, m.id, W / 2, H / 2 + 40, 0.95 + p * 0.35, false, globalT);
  slices(faceCv, 18, 0.25, 50);
  if (game.jsT < 0.06) rect(sc, 0, 0, W, H, 'rgba(255,255,255,0.85)');
}

// copy a buffer onto the scene in horizontally jittered strips
function slices(src, band, chance, amt) {
  for (let y = 0; y < H; y += band) {
    let off = 0;
    if (Math.random() < chance) off = rand(-amt, amt);
    sc.drawImage(src, 0, y, W, band, off, y, W, band);
  }
}

function drawEnding() {
  const t = ending.t;
  if (t >= END_CARD_T) {
    drawEndCard(t - END_CARD_T);
    return;
  }
  if (t >= 20.5) {                                      // all four faces at once
    rect(sc, 0, 0, W, H, '#000');
    fc.clearRect(0, 0, W, H);
    const pos = [[330, 190], [950, 190], [330, 540], [950, 540]];
    const ids = ['dad', 'mom', 'kid', 'dog'];
    for (let i = 0; i < 4; i++) drawScreamFace(fc, ids[i], pos[i][0], pos[i][1], 0.5 + (t - 20.5) * 0.12, true, globalT + i);
    slices(faceCv, 16, 0.3, 60);
    if (t < 20.58) rect(sc, 0, 0, W, H, 'rgba(255,255,255,0.85)');
    return;
  }
  updateCamera(ghost.x, ghost.y, 0.08);
  beginWorld();
  wc.drawImage(bgNormal, 0, 0);
  if (typeof drawBlood === 'function') drawBlood(wc);
  for (let i = 0; i < OBJECTS.length; i++) drawObject(wc, OBJECTS[i]);
  const ab = clamp((t - 4.5) / 3, 0, 1);
  if (ab > 0) {
    wc.globalAlpha = ab;
    wc.drawImage(bgAband, 0, 0);
    wc.globalAlpha = 1;
    // dust in the moonlight
    for (let i = 0; i < ending.dust.length; i++) {
      const d = ending.dust[i];
      rect(wc, Math.round(d.x / 4) * 4, Math.round(d.y / 4) * 4, 4, 4, 'rgba(170,185,175,' + (0.45 * ab).toFixed(3) + ')');
    }
  }
  drawDoor(wc, door.open);
  for (let i = 0; i < ending.ghosts.length; i++) {
    if (t >= ending.ghosts[i].start) drawMember(wc, ending.ghosts[i], true);
  }
  // the ghost becomes a girl
  const gy = ending.floorY;
  if (t < 9) {
    drawGhost(wc, ghost.x, ghost.y, 1, 0);
  } else if (t < 10.6) {
    const jx = rand(-8, 8);
    if (Math.random() < 0.5) drawGhost(wc, ghost.x + jx, ghost.y, 1, 0);
    else drawGirl(wc, ghost.x + jx, gy, 1);
    if (Math.random() < 0.4) rect(wc, ghost.x - 60, ghost.y + rand(-60, 60), 120, 4 * Math.ceil(rand(1, 2)), Math.random() < 0.5 ? 'rgba(140,8,10,0.7)' : 'rgba(170,185,175,0.5)');
    abBoost = Math.max(abBoost, 6);
  } else {
    drawGirl(wc, ghost.x, gy, 1);
  }
  drawLighting(wc);
  endWorld();
  // text
  if (t < 4.5) {
    sc.globalAlpha = clamp(Math.min(t / 0.6, (4.5 - t) / 0.7), 0, 1);
    shakyText(sc, 'THE HOUSE IS YOURS.', 640, 300, 56, '#c9cbbd');
    sc.globalAlpha = 1;
  }
  if (t >= 12) typeLine("They've been trying to scare you out for 40 years.", 12, 250, 34);
  if (t >= 16) typeLine('You were never the ghost.', 16, 310, 42);
  if (t > 3) label(sc, 'click to skip', 1200, 700, 12, 'rgba(150,160,150,0.6)', 'center');
}

// =====================================================================
// POST-PROCESSING
// =====================================================================
function splitChannel(color) {
  cc.globalCompositeOperation = 'copy';
  cc.drawImage(scene, 0, 0);
  cc.globalCompositeOperation = 'multiply';
  cc.fillStyle = color;
  cc.fillRect(0, 0, W, H);
  cc.globalCompositeOperation = 'source-over';
}

function desatAmount() {
  if (mode === 'title') return 0.15;
  if (mode === 'ending') return 0.5;
  let gone = 0;
  for (let i = 0; i < family.length; i++) {
    if (family[i].state === 'gone') gone += 1;
  }
  return gone / 4 * 0.75;
}

let frameNo = 0;
function postProcess() {
  frameNo += 1;
  const ox = rand(-shake, shake);
  const oy = rand(-shake, shake);
  const ab = 1.2 + abBoost;
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  rect(ctx, 0, 0, W, H, '#000');
  // chromatic aberration: rebuild the frame from shifted R, G, B
  splitChannel('#ff0000');
  ctx.drawImage(chan, ox + ab, oy);
  ctx.globalCompositeOperation = 'lighter';
  splitChannel('#00ff00');
  ctx.drawImage(chan, ox, oy);
  splitChannel('#0000ff');
  ctx.drawImage(chan, ox - ab, oy + ab * 0.3);
  ctx.globalCompositeOperation = 'source-over';
  // palette drains as family leaves
  const ds = desatAmount();
  if (ds > 0.01) {
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = ds;
    rect(ctx, 0, 0, W, H, '#808080');
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  // green-gray grade: drain colour, then tint; deep reds still read
  ctx.globalCompositeOperation = 'saturation';
  ctx.globalAlpha = 0.25;                        // keep lamp warmth and blood
  rect(ctx, 0, 0, W, H, '#808080');
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'multiply';
  rect(ctx, 0, 0, W, H, 'rgb(212,230,206)');
  ctx.globalCompositeOperation = 'source-over';
  // light flicker
  let dark = 0.03 + Math.random() * 0.03;
  if (flickerT > 0) dark += 0.22;
  if (mode === 'game' && game.stareDark) dark += 0.12;
  rect(ctx, 0, 0, W, H, 'rgba(0,0,0,' + dark.toFixed(3) + ')');
  // scanlines
  ctx.fillStyle = SCAN;
  ctx.fillRect(0, 0, W, H);
  // film grain
  const gx = Math.floor(rand(0, 256));
  const gy = Math.floor(rand(0, 256));
  ctx.save();
  ctx.translate(-gx, -gy);
  ctx.globalAlpha = clamp(0.35 + grainBoost, 0, 1);
  ctx.fillStyle = GRAIN[frameNo % GRAIN.length];
  ctx.fillRect(gx, gy, W, H);
  ctx.restore();
  // vignette
  ctx.drawImage(vignette, 0, 0);
}

function render() {
  const now = performance.now();
  const rdt = Math.min(0.05, Math.max(0, (now - renderLast) / 1000));
  renderLast = now;
  updateLighting(rdt);
  sc.setTransform(1, 0, 0, 1, 0, 0);
  sc.globalAlpha = 1;
  sc.globalCompositeOperation = 'source-over';
  if (mode === 'title') {
    drawTitle();
  } else if (mode === 'game' || mode === 'gameover') {
    drawWorld();
    drawHUD();
    if (typeof drawDirectorScreen === 'function') drawDirectorScreen(sc);
    if (game.freeze > 0 && game.js) drawJumpscare();
    if (mode === 'gameover' && typeof drawGameOver === 'function') drawGameOver(sc, threat && threat.gameOverT !== undefined ? threat.gameOverT : globalT);
  } else {
    drawEnding();
  }
  postProcess();
}
