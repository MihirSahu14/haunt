"use strict";
// =====================================================================
// LIGHTING: one 320x180 lightmap, multiplied over the world buffer
// =====================================================================
const LW = 320;                                   // lightmap width (low-res px)
const LH = 180;                                   // lightmap height
const lmap = makeCanvas(LW, LH);                  // the light map canvas
const lc = lmap.getContext('2d');                 // its context
const AMBIENT = 'rgb(44,52,46)';                   // dim green-black: unlit rooms are silhouettes
const LAMP_RGB = '206,148,58';                    // dirty warm yellow (ambient adds the rest)
const MOON_RGB = '92,110,102';                    // cold green-gray moonlight
const GHOST_RGB = '96,116,108';                   // the ghost's cold carried glow

let lightList = [];                               // lights used last frame (for isLit)
let extraLights = [];                             // transient lights from addLight
let lightningT = 99;                              // time since last lightning strike
let lightningNext = 14;                           // seconds until next strike

// public: a transient light (flash, candle, scare burst) in world units
function addLight(x, y, r, rgb, intensity, life) {
  extraLights.push({ x: x, y: y, r: r, rgb: rgb || LAMP_RGB, i: intensity || 1, life: life || 0.5, max: life || 0.5 });
}

// public: force a lightning strike now
function triggerLightning() {
  lightningT = 0;
  lightningNext = rand(18, 40);
  if (typeof noise === 'function') noise(2.2, 0.35, 'lowpass', 140, 1, 0.25, 40, 0.05);   // thunder
  shake = Math.max(shake, 6);
}

// current lightning brightness 0..1 (double flash then decay)
function lightningA() {
  const t = lightningT;
  if (t < 0.07) return 1;
  if (t < 0.16) return 0.15;
  if (t < 0.26) return 0.85;
  return Math.max(0, 0.6 - (t - 0.26) * 1.5);
}

// advance lightning timer (called from render with frame dt estimate)
function updateLighting(dt) {
  lightningT += dt;
  if (mode === 'game') lightningNext -= dt;
  if (lightningNext <= 0) triggerLightning();
  const keep = [];
  for (let i = 0; i < extraLights.length; i++) {
    const l = extraLights[i];
    l.life -= dt;
    if (l.life > 0) keep.push(l);
  }
  extraLights = keep;
}

// public: how lit a world point is, 0..1
function isLit(x, y) {
  let s = 0;
  for (let i = 0; i < lightList.length; i++) {
    const l = lightList[i];
    const d = Math.hypot(x - l.x, y - l.y);
    if (d < l.r) s += (1 - d / l.r) * l.i;
  }
  return clamp(s + lightningA() * 0.5, 0, 1);
}

// punch one radial light into the lightmap (lightmap already in world transform)
function punch(x, y, r, rgb, a) {
  if (a <= 0.01) return;
  const gr = lc.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')');
  gr.addColorStop(0.55, 'rgba(' + rgb + ',' + (a * 0.85).toFixed(3) + ')');  // flat bright core
  gr.addColorStop(0.75, 'rgba(' + rgb + ',' + (a * 0.32).toFixed(3) + ')');  // hard falloff
  gr.addColorStop(0.9, 'rgba(' + rgb + ',' + (a * 0.08).toFixed(3) + ')');
  gr.addColorStop(1, 'rgba(' + rgb + ',0)');
  lc.fillStyle = gr;
  lc.fillRect(x - r, y - r, r * 2, r * 2);
  lightList.push({ x: x, y: y, r: r, i: a });
}

// is this room's lamp switched off?
function roomLampOff(r, idx) {
  if (r.dark !== undefined) return r.dark;         // world may decide
  for (let i = 0; i < OBJECTS.length; i++) {
    const o = OBJECTS[i];
    if (o.room === r.id && o.type === 'lights' && o.off) return true;
  }
  return idx % 3 === 1;                            // ponytail: every third room dark by default
}

// ambient occlusion: darken ceilings and wall corners of each room
function drawAO() {
  for (let i = 0; i < ROOMS.length; i++) {
    const r = ROOMS[i];
    const top = lc.createLinearGradient(0, r.y, 0, r.y + r.h * 0.35);
    top.addColorStop(0, 'rgba(0,0,0,0.6)');
    top.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = top;
    lc.fillRect(r.x, r.y, r.w, r.h * 0.35);
    const sw = Math.min(90, r.w * 0.2);
    const lft = lc.createLinearGradient(r.x, 0, r.x + sw, 0);
    lft.addColorStop(0, 'rgba(0,0,0,0.5)');
    lft.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = lft;
    lc.fillRect(r.x, r.y, sw, r.h);
    const rgt = lc.createLinearGradient(r.x + r.w, 0, r.x + r.w - sw, 0);
    rgt.addColorStop(0, 'rgba(0,0,0,0.5)');
    rgt.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = rgt;
    lc.fillRect(r.x + r.w - sw, r.y, sw, r.h);
    const flr = lc.createLinearGradient(0, r.y + r.h, 0, r.y + r.h - 24);
    flr.addColorStop(0, 'rgba(0,0,0,0.45)');
    flr.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = flr;
    lc.fillRect(r.x, r.y + r.h - 24, r.w, 24);
  }
}

// window beams slanting down to the floor
function drawBeams(a) {
  if (a <= 0.01) return;
  for (let i = 0; i < WINDOWS.length; i++) {
    const wd = WINDOWS[i];
    const fl = wd.floor !== undefined ? wd.floor : wd.y + 200;
    const gr = lc.createLinearGradient(0, wd.y, 0, fl);
    gr.addColorStop(0, 'rgba(' + MOON_RGB + ',' + a.toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(' + MOON_RGB + ',0)');
    poly(lc, [wd.x, wd.y, wd.x + wd.w, wd.y, wd.x + wd.w - 70, fl, wd.x - 150, fl], gr);
  }
}

// public: build the lightmap and multiply it over g (the world buffer)
function drawLighting(g) {
  lightList = [];
  // ending fades the lamps as the house turns abandoned
  let lampMul = 1;
  if (mode === 'ending' && ending) lampMul = 1 - clamp((ending.t - 4.5) / 3, 0, 1);
  if (flickerT > 0) lampMul *= Math.random() < 0.5 ? 0.15 : 0.6;
  // ambient fill
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.globalCompositeOperation = 'source-over';
  lc.fillStyle = AMBIENT;
  lc.fillRect(0, 0, LW, LH);
  // world transform, same as the world buffer
  lc.setTransform(0.25, 0, 0, 0.25, -camX * 0.25, -camY * 0.25);
  lc.globalCompositeOperation = 'lighter';
  // room lamps
  for (let i = 0; i < ROOMS.length; i++) {
    const r = ROOMS[i];
    if (roomLampOff(r, i)) continue;
    const fl = 0.92 + Math.sin(globalT * 7 + i * 3) * 0.03 + (Math.random() < 0.02 ? -0.3 : 0);
    const rad = Math.max(200, Math.min(320, r.w * 0.45));
    const lx = r.x + r.w * (0.32 + (i * 37 % 36) / 100);   // lamp off-centre per room
    lc.save();
    lc.beginPath();
    lc.rect(r.x, r.y, r.w, r.h);                       // light stays inside its walls
    lc.clip();
    punch(lx, r.y + r.h * 0.55, rad, LAMP_RGB, fl * lampMul);
    lc.restore();
  }
  // moonlight through windows
  const moon = 0.22 + (1 - lampMul) * 0.25;
  for (let i = 0; i < WINDOWS.length; i++) {
    const wd = WINDOWS[i];
    punch(wd.x + wd.w / 2, wd.y + wd.h / 2, 110, MOON_RGB, moon);
  }
  drawBeams(moon * 0.5);
  // TV glow when the tv animates
  for (let i = 0; i < OBJECTS.length; i++) {
    const o = OBJECTS[i];
    if (o.type === 'tv' && o.anim > 0) punch(o.x, o.y - o.h * 0.6, 260, '120,135,140', 0.5 + Math.random() * 0.3);
  }
  // hunter lantern
  if (typeof threat !== 'undefined' && threat && threat.hunter) {
    const h = threat.hunter;
    const hx = h.x + (h.facing || 1) * 18;
    punch(hx, h.y - 70, 300, LAMP_RGB, 0.9 + Math.sin(globalT * 11) * 0.05);
  }
  // the ghost's own faint cold glow
  if (typeof ghost !== 'undefined' && ghost && mode !== 'title') punch(ghost.x, ghost.y, 140, GHOST_RGB, 0.9);
  // transient lights
  for (let i = 0; i < extraLights.length; i++) {
    const l = extraLights[i];
    punch(l.x, l.y, l.r, l.rgb, l.i * l.life / l.max);
  }
  // lightning: flat wash + bright god-rays
  const la = lightningA();
  if (la > 0.01) {
    lc.fillStyle = 'rgba(150,165,158,' + (la * 0.55).toFixed(3) + ')';
    lc.fillRect(camX, camY, W, H);
    drawBeams(la);
  }
  // ambient occlusion on top
  lc.globalCompositeOperation = 'source-over';
  drawAO();
  // overlay onto the world buffer: 2x multiply, so lamps lift dark textures
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'overlay';
  g.drawImage(lmap, 0, 0);
  g.restore();
}
