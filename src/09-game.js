"use strict";
// =====================================================================
// GAME STATE
// =====================================================================
let mode = 'title';      // title | game | ending
let globalT = 0;         // seconds since load
let shake = 0;           // screen shake px
let abBoost = 0;         // extra chromatic aberration
let grainBoost = 0;      // extra film grain
let flickerT = 0;        // active light flicker time
let game = null;
let family = [];
let ghost = { x: 680, y: 540, vx: 0, vy: 0, tx: null, ty: null, face: 1 };
let particles = [];
let pops = [];
let trail = [];
let ending = null;
const door = { open: 0 };
const keys = {};
const SCARE_CD = 4;              // seconds per object
const COMBO_T = typeof COMBO_WINDOW === 'number' ? COMBO_WINDOW : 3;   // combo window (matches HUD bar)
const FEAR_BASE = (window.__playbench?.overrides ?? {}).fear_base ?? 19;     // fear per fresh scare (playbench knob)
const COMBO_MAX = 1.4;           // combo multiplier cap
const JS_GAP = 20;               // min seconds between full-screen jump scares
const FEAR_DECAY = (window.__playbench?.overrides ?? {}).fear_decay ?? 0.5; // fear lost per second once calm (x2 with company) (playbench knob: family courage)
const LONE_K = 0.05;             // extra fear per family member already gone
const NERVE_T = 5;               // seconds a victim stays numb after a scare
const NERVE_K = 0.4;             // fear multiplier while numb
const SUSP_SCARE = 3;            // suspicion per scare that lands
const SUSP_EMPTY = 10;           // suspicion for haunting an empty room (spam tax)
const GHOST_SPD = 400;           // ghost speed
const ECTO_REGEN = 1.5;          // passive ecto per second
const ECTO_PER_FEAR = 0.5;       // ecto gained per fear inflicted
const SCARE_HOLD = (window.__playbench?.overrides ?? {}).scare_hold ?? 3;   // seconds a landed scare roots the victim (playbench knob)
const EXO_CALM = (window.__playbench?.overrides ?? {}).exo_calm ?? 1.5;   // fear decay multiplier while the exorcist is in the house: ignoring him costs (playbench knob; 2 cost the policy bot 4 of 15 nights)
const GHOST_TOP = HUD_BAND + 48;  // highest ghost y: the sprite stays below the top HUD band
function worldW() { return typeof WORLD_W !== 'undefined' ? WORLD_W : W; }
function worldH() { return typeof WORLD_H !== 'undefined' ? WORLD_H : H; }
function ghostStart() {
  if (typeof GHOST_START !== 'undefined') return { x: GHOST_START.x, y: GHOST_START.y, vx: 0, vy: 0, tx: null, ty: null, face: 1 };
  return { x: 680, y: 540, vx: 0, vy: 0, tx: null, ty: null, face: 1 };
}

function resetGame() {
  game = {
    time: 0, energy: 100, combo: 0, lastScare: -99, freeze: 0, jsT: 0, js: null, jsQueue: [],
    lastJS: -99, jsLog: [], winKind: null, comboTypes: [],
    firstJS: false, creepyT: 22, winT: 0, lowFlash: 0, creakT: 3, stareDark: false,
  };
  family = makeFamily();
  // ponytail: cap starting fear so the first jump scare is earned, not instant
  for (let i = 0; i < family.length; i++) family[i].fear = Math.min(family[i].fear, 30);
  ghost = ghostStart();
  particles = [];
  pops = [];
  trail = [];
  door.open = 0;
  shake = 0;
  abBoost = 0;
  grainBoost = 0;
  for (let i = 0; i < OBJECTS.length; i++) {
    OBJECTS[i].anim = 0;
    OBJECTS[i].cool = 0;
    OBJECTS[i].off = false;
    OBJECTS[i].flickT = 0;
    OBJECTS[i].near = false;
  }
  if (typeof resetThreats === 'function') resetThreats();
}

function startGame() {
  initAudio();
  resetGame();
  mode = 'game';
  startDrone(55, 0.09);
}

// =====================================================================
// FAMILY BEHAVIOUR
// =====================================================================
// world helpers (owned by 04-world.js; fallbacks keep the game alive)
function doorPt() {
  if (typeof DOOR !== 'undefined') return DOOR;
  return { x: 1146, y: 640 };
}

function pathTo(m, tx, ty) {
  if (typeof makePath === 'function') return makePath(m, tx, ty);
  return [{ x: tx, y: ty }];
}

function pathOut(m) {
  if (typeof fleePath === 'function') return fleePath(m);
  const d = doorPt();
  return [{ x: d.x, y: d.y }, { x: d.x + 120, y: d.y }];
}

// pick a new random spot to stroll to
function wander(m) {
  if (typeof wanderTarget === 'function') {
    const t = wanderTarget(m);
    m.path = pathTo(m, t.x, t.y);
  } else {
    const r = ROOMS[Math.floor(Math.random() * ROOMS.length)];
    m.path = pathTo(m, rand(r.x + 40, r.x + r.w - 40), r.y + r.h);
  }
  m.state = 'walk';
}

// step along waypoints; true when done
function followPath(m, speed, dt) {
  if (m.path.length === 0) return true;
  const p = m.path[0];
  const dx = p.x - m.x;
  const dy = p.y - m.y;
  const d = Math.hypot(dx, dy);
  const step = speed * dt;
  if (Math.abs(dx) > 0.5) m.facing = dx > 0 ? 1 : -1;
  m.walkPhase += dt * speed * 0.09;
  if (d <= step) {
    m.x = p.x;
    m.y = p.y;
    m.path.shift();
  } else {
    m.x += dx / d * step;
    m.y += dy / d * step;
  }
  return m.path.length === 0;
}

// member hit 100 fear: full-screen jump scare, or a smaller scream if one just played
function terrify(m) {
  m.fear = 100;
  m.path = [];
  if (typeof addBlood === 'function') addBlood(m.x, m.y - 4, 22, 'splat');
  if (typeof threatEvent === 'function') threatEvent({ kind: 'terrify', m: m });
  // too soon after the last face: in-world scream, they still bolt
  if (game.js || game.time - game.lastJS < JS_GAP) {
    startFlee(m);
    scream(m.pitch, 0, 0.35);
    shake = Math.max(shake, 18);
    abBoost = Math.max(abBoost, 8);
    if (typeof addBlood === 'function') addBlood(m.x + rand(-30, 30), m.y - 4, 14, 'drip');
    return;
  }
  m.state = 'terrified';
  game.lastJS = game.time;
  game.jsLog.push(game.time);
  game.jsQueue.push(m);
  nextJumpscare();
}

// member bolts for the door; the HUD toasts it and points an arrow at them
function startFlee(m) {
  m.state = 'flee';
  m.path = pathOut(m);
  if (typeof toast === 'function') toast(m.name + ' is running for the door!', '#e0201f');
}

// start the next queued jump scare
function nextJumpscare() {
  const m = game.jsQueue.shift();
  if (!m) return;
  game.js = m;
  game.freeze = 0.7;
  game.jsT = 0;
  game.firstJS = true;
  sting();
  scream(m.pitch, 0, 0.5);
  shake = 40;
  abBoost = 16;
  grainBoost = 0.6;
}

// jump scare over: member bolts for the door
function endJumpscare() {
  const m = game.js;
  game.js = null;
  if (m) startFlee(m);
  if (game.jsQueue.length > 0) nextJumpscare();
}

// how many have already fled the house
function goneCount() {
  let n = 0;
  for (let i = 0; i < family.length; i++) {
    if (family[i].state === 'gone') n += 1;
  }
  return n;
}

// member reached the street
function exitHouse(m) {
  m.state = 'gone';
  door.open = 0;
  doorSlam();
  shake = Math.max(shake, 14);
  let left = 0;
  for (let i = 0; i < family.length; i++) {
    if (family[i].state !== 'gone') left += 1;
  }
  if (typeof toast === 'function') toast(m.name + ' is gone.  ' + left + ' left', '#b9bfae');
  if (typeof threatEvent === 'function') threatEvent({ kind: 'gone', m: m });
}

// drop the held item with a bounce
function dropItem(m) {
  m.hasItem = false;
  m.itemT = 5;
  addParticle({ kind: 'item', item: m.item, x: m.x + m.facing * m.h * 0.2, y: m.y - m.h * 0.45, vx: rand(-90, 90), vy: -220, g: 900, floor: m.y, life: 3, vr: rand(-8, 8) });
  if (typeof threatEvent === 'function') threatEvent({ kind: 'drop', m: m });
}

function updateMember(m, dt) {
  if (m.state === 'gone') return;
  m.jumpT = Math.max(0, m.jumpT - dt);
  m.hairT = Math.max(0, m.hairT - dt);
  m.bangT = Math.max(0, m.bangT - dt);
  m.scaredAgo += dt;
  if (!m.hasItem) {
    m.itemT -= dt;
    if (m.itemT <= 0) m.hasItem = true;
  }
  if (m.scaredAgo > 6 && m.state !== 'flee' && m.state !== 'terrified') {
    // resolve: calm twice as fast with company
    // the fewer left, the less they settle
    let rate = FEAR_DECAY * (1 - goneCount() * 0.15);
    const r = roomAt(m.x, m.y - 20);
    for (let i = 0; i < family.length; i++) {
      const o = family[i];
      if (o === m || o.state === 'gone' || o.state === 'flee' || !r) continue;
      const orm = roomAt(o.x, o.y - 20);
      if (orm && orm.id === r.id) rate = FEAR_DECAY * 2;
    }
    if (typeof threat !== 'undefined' && threat && threat.hunter && threat.hunter.state !== 'flee') rate *= EXO_CALM;   // his presence steadies them
    m.fear = Math.max(0, m.fear - rate * dt);
  }
  if (m.state === 'terrified') return;
  if (m.fear >= 100 && m.state !== 'flee') {
    terrify(m);
    return;
  }
  if (m.state === 'idle') {
    m.idleT -= dt;
    if (m.idleT <= 0) wander(m);
  } else if (m.state === 'stare') {
    m.stareT -= dt;
    if (m.stareT <= 0) {
      m.state = 'idle';
      m.idleT = 1;
    }
  } else if (m.state === 'walk') {
    if (followPath(m, m.speed, dt)) {
      m.state = 'idle';
      m.idleT = rand(2.5, 5);
    }
  } else if (m.state === 'flee') {
    if (followPath(m, m.speed * 3.6, dt) || m.x > doorPt().x + 100) exitHouse(m);
  }
}

// =====================================================================
// SCARING
// =====================================================================
function objectSpecial(o) {
  if (o.type === 'plates') {
    for (let i = 0; i < 4; i++) {
      addParticle({ kind: 'plate', x: o.x - 36 + i * 24, y: o.y - 20, vx: rand(-320, 320), vy: rand(-380, -180), g: 900, floor: 640, life: 3, rot: rand(0, 6), vr: rand(-12, 12) });
    }
  } else if (o.type === 'piano') {
    for (let i = 0; i < 6; i++) addParticle({ kind: 'note', x: o.x + rand(-40, 40), y: o.y - 70, vx: rand(-40, 40), vy: rand(-90, -50), life: 1.5 });
  } else if (o.type === 'faucet') {
    for (let i = 0; i < 8; i++) addParticle({ kind: 'drip', x: o.x + rand(-55, 55), y: o.y - 46, vx: 0, vy: rand(0, 40), g: 400, floor: 380, life: 1.4 });
  } else if (o.type === 'lights') {
    for (let i = 0; i < 8; i++) addParticle({ kind: 'spark', x: o.x, y: o.y - 10, vx: rand(-150, 150), vy: rand(-150, 50), g: 600, life: 0.6 });
  } else {
    for (let i = 0; i < 5; i++) addParticle({ kind: 'dust', x: o.x + rand(-30, 30), y: o.y - rand(0, o.h), vx: rand(-30, 30), vy: rand(-30, -5), life: 1, size: rand(3, 6) });
  }
}

const COMBO_WORDS = ['', 'SPOOKED!', 'DOUBLE FRIGHT!', 'TRIPLE TERROR!'];
const COMBO_COLS = ['#d2dcc6', '#d2dcc6', '#dcc870', '#c0181c', '#e0201f'];   // palette: bone, lamp, blood

function triggerObject(o) {
  if (o.cool > 0) {
    pop('not yet...', o.x, o.y + 36, 14, '#6a6f62', 0.8);   // failure pops sit under the object; the cost tag owns the slot above
    return;
  }
  const cost = typeof threatCost === 'function' ? threatCost(o) : 25;
  if (game.energy < cost) {
    pop('too weak (' + cost + ')', o.x, o.y + 36, 14, '#8a1010', 1);
    game.lowFlash = 0.5;
    tone(110, 0.2, 'square', 0.08, 90);
    return;
  }
  game.energy -= cost;
  o.cool = SCARE_CD;
  o.anim = 1.6;
  o.flickT = 0;
  scareSound(o.type);
  objectSpecial(o);
  shake = Math.max(shake, 6);
  // who is in the room
  const victims = [];
  for (let i = 0; i < family.length; i++) {
    const m = family[i];
    if (m.state !== 'idle' && m.state !== 'walk' && m.state !== 'stare') continue;
    const r = roomAt(m.x, m.y - 20);
    if (r && r.id === o.room) victims.push(m);
  }
  if (typeof hunterScare === 'function') hunterScare(o.type, o.room);
  if (victims.length === 0) {
    pop('...nobody here', o.x, o.y + 36, 14, '#6a6f62', 1.2);
    if (typeof addSuspicion === 'function') addSuspicion(SUSP_EMPTY);
    return;
  }
  // combo chain: distinct tricks inside the window; any trick already in the chain (A-B-A) restarts it
  if (game.time - game.lastScare <= COMBO_T && game.comboTypes.indexOf(o.type) < 0) {
    game.combo += 1;
    game.comboTypes.push(o.type);
  } else {
    game.combo = 1;
    game.comboTypes = [o.type];
  }
  game.lastScare = game.time;
  const mult = Math.min(COMBO_MAX, 1 + (game.combo - 1) * 0.2);
  if (game.combo >= 2) pop('x' + game.combo, o.x, o.y - o.h - 30, 18 + game.combo * 4, '#a01818', 1.4);
  shake = Math.max(shake, 8 + game.combo * 3);
  abBoost = Math.max(abBoost, 3 + game.combo * 1.5);
  // scare everybody here
  let fearSum = 0;
  let susp = SUSP_SCARE + Math.random() * 2;
  for (let i = 0; i < victims.length; i++) {
    const v = victims[i];
    let k = typeof threatFearMult === 'function' ? threatFearMult(v, o.type) : 1;
    // just scared: still numb, the next one barely lands
    if (v.scaredAgo < NERVE_T) k *= NERVE_K;
    // the house empties and the rest come apart faster
    k *= 1 + goneCount() * LONE_K;
    const add = FEAR_BASE * mult * k;
    if (v.id === 'mom') susp += 2;
    if (add <= 0) {
      pop(v.name + ' shrugs', v.x, v.y - v.h - 50, 14, '#6a6f62', 1.2);
      continue;
    }
    fearSum += add;
    v.fear = Math.min(100, v.fear + add);
    v.jumpT = 0.6;
    v.hairT = 1.3;
    v.bangT = 1.4;
    v.scaredAgo = 0;
    v.path = [];
    if (v.hasItem && add >= 15) dropItem(v);
    if (add >= 25 && typeof addBlood === 'function') addBlood(o.x + rand(-20, 20), o.y - 4, 10, 'drip');
    if (v.fear >= 100) {
      terrify(v);
    } else {
      v.state = 'idle';
      v.idleT = SCARE_HOLD;
    }
  }
  game.energy = Math.min(100, game.energy + fearSum * ECTO_PER_FEAR);
  if (typeof addSuspicion === 'function') addSuspicion(susp);
  if (typeof threat !== 'undefined' && threat) threat.rooms[o.room] = true;
  if (typeof threatEvent === 'function') threatEvent({ kind: 'scare', n: victims.length, combo: game.combo, room: o.room });
}

// E key: haunt nearest object in this room
function hauntNearest() {
  const room = roomAt(ghost.x, ghost.y);
  if (!room) {
    pop('Float into a room first', ghost.x, ghost.y - 40, 14, '#c6cfba', 1);
    return;
  }
  const o = nearestObject(room);
  if (o) triggerObject(o);
}

// =====================================================================
// UPDATE
// =====================================================================
function updateGhost(dt) {
  let ix = 0;
  let iy = 0;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyW || keys.ArrowUp) iy -= 1;
  if (keys.KeyS || keys.ArrowDown) iy += 1;
  let dvx = 0;
  let dvy = 0;
  if (ix !== 0 || iy !== 0) {
    ghost.tx = null;                                   // keys cancel click-glide
    const len = Math.hypot(ix, iy);
    dvx = ix / len * GHOST_SPD;
    dvy = iy / len * GHOST_SPD;
  } else if (ghost.tx !== null) {
    const dx = ghost.tx - ghost.x;
    const dy = ghost.ty - ghost.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) {
      ghost.tx = null;
    } else {
      const sp = Math.min(GHOST_SPD * 1.3, d * 5);
      dvx = dx / d * sp;
      dvy = dy / d * sp;
    }
  }
  const k = Math.min(1, dt * 7);
  ghost.vx += (dvx - ghost.vx) * k;
  ghost.vy += (dvy - ghost.vy) * k;
  const px = ghost.x;
  ghost.x = clamp(ghost.x + ghost.vx * dt, 40, worldW() - 40);
  ghost.y = clamp(ghost.y + ghost.vy * dt, GHOST_TOP, worldH() - 40);
  if (typeof saltBlock === 'function' && threat) saltBlock(px, ghost.y);
  if (Math.abs(ghost.vx) > 15) ghost.face = ghost.vx > 0 ? 1 : -1;
  trail.push({ x: ghost.x, y: ghost.y + Math.sin(globalT * 3) * 5 });
  if (trail.length > 18) trail.shift();
}

function updateGame(dt) {
  if (game.freeze > 0) {                                // jump scare freeze
    game.freeze -= dt;
    game.jsT += dt;
    shake = Math.max(shake, 22);
    abBoost = Math.max(abBoost, 12);
    grainBoost = Math.max(grainBoost, 0.6);
    if (game.freeze <= 0) endJumpscare();
    return;
  }
  game.time += dt;
  game.energy = Math.min(100, game.energy + ECTO_REGEN * dt);
  game.lowFlash = Math.max(0, game.lowFlash - dt);
  if (game.time - game.lastScare > COMBO_T) game.combo = 0;
  updateGhost(dt);
  const gr = roomAt(ghost.x, ghost.y);
  // objects
  for (let i = 0; i < OBJECTS.length; i++) {
    const o = OBJECTS[i];
    o.anim = Math.max(0, o.anim - dt);
    o.cool = Math.max(0, o.cool - dt);
    o.near = gr !== null && gr.id === o.room;
    if (o.type === 'lights') {
      if (o.anim > 0) {
        o.flickT -= dt;
        if (o.flickT <= 0) {
          o.off = !o.off;
          o.flickT = rand(0.04, 0.16);
        }
      } else {
        o.off = false;
      }
    }
  }
  for (let i = 0; i < family.length; i++) updateMember(family[i], dt);
  // creepy beat: someone turns and looks at you
  game.creepyT -= dt;
  // director's quiet stretch stays silent: hold the stare until it ends
  const dirQuiet = typeof dir !== 'undefined' && dir && dir.phase === 'quiet';
  if (game.creepyT <= 0 && !dirQuiet) {
    game.creepyT = rand(23, 28);
    const cands = [];
    for (let i = 0; i < family.length; i++) {
      if (family[i].state === 'idle' || family[i].state === 'walk') cands.push(family[i]);
    }
    if (cands.length > 0) {
      const m = cands[Math.floor(Math.random() * cands.length)];
      m.state = 'stare';
      m.stareT = 2.6;
      m.path = [];
      whisper(2.2, 0.3);
    }
  }
  game.stareDark = false;
  for (let i = 0; i < family.length; i++) {
    if (family[i].state === 'stare') game.stareDark = true;
  }
  // door opens for anyone fleeing nearby
  let near = false;
  for (let i = 0; i < family.length; i++) {
    const m = family[i];
    if (m.state === 'flee' && Math.hypot(m.x - doorPt().x, m.y - doorPt().y) < 200) near = true;
  }
  if (typeof threat !== 'undefined' && threat && threat.hunter) {
    const h = threat.hunter;
    if (Math.hypot(h.x - doorPt().x, h.y - doorPt().y) < 150) near = true;
  }
  door.open += ((near ? 1 : 0) - door.open) * Math.min(1, dt * 10);
  updateParticles(dt);
  if (typeof updateThreats === 'function') updateThreats(dt);
  if (mode !== 'game') return;
  // ambient creaks and thumps
  game.creakT -= dt;
  // no scheduled creaks during the director's quiet stretch
  const dirHush = typeof dir !== 'undefined' && dir && dir.phase === 'quiet';
  if (game.creakT <= 0 && !dirHush) {
    game.creakT = rand(4, 9);
    if (Math.random() < 0.75) creak(rand(0.4, 1.2), rand(0.08, 0.18), 0, rand(0.7, 1.3));
    else tone(50, 0.4, 'sine', 0.3, 35);
  }
  // win check
  let gone = 0;
  for (let i = 0; i < family.length; i++) {
    if (family[i].state === 'gone') gone += 1;
  }
  if (gone === family.length) {
    if (!game.winKind) game.winKind = typeof threat !== 'undefined' && threat && threat.hunterDone ? 'exorcist' : 'terror';
    game.winT += dt;
    if (game.winT > 1.5) startEnding();
  }
}

function update(dt) {
  globalT += dt;
  shake = shake * Math.pow(0.02, dt);
  abBoost = abBoost * Math.pow(0.05, dt);
  grainBoost = grainBoost * Math.pow(0.05, dt);
  flickerT -= dt;
  if (Math.random() < dt * 0.6) flickerT = rand(0.05, 0.18);
  const paused = typeof threat !== 'undefined' && threat && threat.paused;
  if (mode === 'game' && !paused) updateGame(dt);
  else if (mode === 'ending') updateEnding(dt);
  else if (mode === 'gameover' && threat) threat.gameOverT += dt;
}
