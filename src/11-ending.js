"use strict";
// =====================================================================
// ENDING (the twist)
// =====================================================================
const END_CARD_T = 22;

function startEnding() {
  mode = 'ending';
  stopDrone(0.08);
  // stage the twist on the ground floor, a short walk in from the front door
  const dr = typeof DOOR !== 'undefined' ? DOOR : { x: 1140, y: 640 };
  ghost.x = Math.max(200, dr.x - 420);
  ghost.y = dr.y - 70;
  ghost.vx = 0;
  ghost.vy = 0;
  ghost.face = 1;
  trail = [];
  particles = [];
  pops = [];
  door.open = 0;
  const ghosts = makeFamily();
  const targets = [ghost.x + 370, ghost.x + 290, ghost.x + 220, ghost.x + 150];
  for (let i = 0; i < ghosts.length; i++) {
    const m = ghosts[i];
    m.x = dr.x + 90 + i * 30;
    m.y = dr.y;
    m.facing = -1;
    m.state = 'idle';
    m.fear = 0;
    m.hasItem = false;
    m.tx = targets[i];
    m.start = 3 + i * 0.6;
  }
  const dust = [];
  for (let i = 0; i < 70; i++) dust.push({ x: rand(ghost.x - 640, ghost.x + 640), y: rand(dr.y - 420, dr.y), vx: rand(-5, 5), vy: rand(-3, 3), s: rand(0.6, 1.8) });
  if (typeof snapCamera === 'function') snapCamera(ghost.x, ghost.y);
  ending = {
    t: 0,
    floorY: dr.y,
    ghosts: ghosts,
    dust: dust,
    events: [
      { t: 2.0, done: false, fn: function () { creak(2.4, 0.45, 0, 0.6); } },
      { t: 4.5, done: false, fn: function () { startDrone(41.2, 0.1); } },
      { t: 9.0, done: false, fn: function () { glitchSound(); } },
      { t: 10.5, done: false, fn: function () { tone(220, 3, 'sine', 0.08, 110); } },
      { t: 12.0, done: false, fn: function () { whisper(1.6, 0.25); } },
      { t: 16.0, done: false, fn: function () { tone(98, 3, 'sine', 0.15, 49); } },
      { t: 20.5, done: false, fn: function () { finalScare(); } },
      { t: END_CARD_T, done: false, fn: function () { stopDrone(0.05); doorSlam(); } },
    ],
  };
}

function finalScare() {
  sting();
  scream(0.75, 0, 0.35);
  scream(1.05, 0.05, 0.35);
  scream(1.35, 0.1, 0.35);
  scream(1.7, 0.15, 0.35);
  shake = 40;
  abBoost = 18;
  grainBoost = 0.7;
}

function skipEnding() {
  for (let i = 0; i < ending.events.length; i++) ending.events[i].done = true;
  stopDrone(0.05);
  ending.t = END_CARD_T;
}

function updateEnding(dt) {
  ending.t += dt;
  const t = ending.t;
  for (let i = 0; i < ending.events.length; i++) {
    const ev = ending.events[i];
    if (!ev.done && t >= ev.t) {
      ev.done = true;
      ev.fn();
    }
  }
  door.open += ((t > 2 && t < END_CARD_T ? 1 : 0) - door.open) * Math.min(1, dt * 2.5);
  for (let i = 0; i < ending.ghosts.length; i++) {
    const m = ending.ghosts[i];
    if (t > 13) m.tx = Math.max(ghost.x + 80 + i * 40, m.tx - 6 * dt);   // drift toward her
    if (t >= m.start && m.x > m.tx) m.x = Math.max(m.tx, m.x - 60 * dt);
  }
  for (let i = 0; i < ending.dust.length; i++) {
    const d = ending.dust[i];
    d.x += d.vx * dt;
    d.y += d.vy * dt + Math.sin(globalT + i) * 0.1;
  }
  if (t >= 20.5 && t < END_CARD_T) {
    shake = Math.max(shake, 18);
    abBoost = Math.max(abBoost, 10);
  }
}
