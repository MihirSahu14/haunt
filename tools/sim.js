// headless balance sim: loads src/*.js like smoke.js, then plays full runs with
// three bots (careful / average / spammer) at dt=1/60 and prints a table.
// usage: node tools/sim.js [runsPerBot] [seed]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const srcs = [];
html.replace(/<script src="([^"]+)"><\/script>/g, function (m, s) { srcs.push(s); return m; });
const RUNS = Number(process.argv[2]) || 6;
let seed = Number(process.argv[3]) || 12345;

// seeded random so runs are repeatable
function prng() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

// do-anything stub (same idea as smoke.js)
function stub() {
  const fn = function () { return stub(); };
  return new Proxy(fn, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return function () { return 0; };
      if (k === 'then') return undefined;
      if (k in t) return t[k];
      return stub();
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
function makeCanvas() {
  const c = { width: 300, height: 150, style: {} };
  c.getContext = function () { return stub(); };
  c.getBoundingClientRect = function () { return { left: 0, top: 0, width: 1280, height: 720 }; };
  c.addEventListener = function () {};
  return c;
}
function AudioContext() {
  this.currentTime = 0;
  this.sampleRate = 44100;
  this.destination = stub();
  this.resume = function () {};
  const names = ['createGain', 'createOscillator', 'createBiquadFilter', 'createBufferSource', 'createDynamicsCompressor', 'createDelay', 'createConvolver', 'createStereoPanner', 'createWaveShaper', 'createBuffer'];
  for (const n of names) this[n] = function () { return stub(); };
}
const SM = Object.create(Math);
SM.random = prng;
const sandbox = {
  console: console,
  Math: SM,
  performance: { now: function () { return 0; } },
  requestAnimationFrame: function () { return 1; },
  cancelAnimationFrame: function () {},
  setTimeout: function () { return 0; },
  clearTimeout: function () {},
  AudioContext: AudioContext,
  innerWidth: 1280,
  innerHeight: 720,
  addEventListener: function () {},
  removeEventListener: function () {},
  document: { getElementById: makeCanvas, createElement: makeCanvas, addEventListener: function () {}, body: { appendChild() {} } },
  Image: function () {},
  localStorage: { getItem() { return null; }, setItem() {} },
};
sandbox.window = sandbox;
// SIM_KNOBS='{"hunt_warn":60}': playbench knob overrides, read like window.__playbench.overrides
if (process.env.SIM_KNOBS) sandbox.__playbench = { overrides: JSON.parse(process.env.SIM_KNOBS) };
vm.createContext(sandbox);
for (const s of srcs) vm.runInContext(fs.readFileSync(path.join(root, s), 'utf8'), sandbox, { filename: s });

// SIM_TRACE=1: log every scare and big suspicion jump
if (process.env.SIM_TRACE) {
  vm.runInContext(`
    const _tO = triggerObject;
    triggerObject = function (o) {
      _tO(o);
      console.log(game.time.toFixed(1), o.room, o.type, 'E' + Math.round(game.energy), 'S' + Math.round(threat.suspicion), 'P' + Math.round(threat.presence), 'x' + game.combo, '->', family.map(function (m) { return m.id + Math.round(m.fear) + m.state[0]; }).join(','));
    };
    const _aS = addSuspicion;
    addSuspicion = function (v) {
      if (v >= 5) console.log('   susp +' + v.toFixed(1) + ' at ' + game.time.toFixed(1));
      _aS(v);
    };`, sandbox);
}

// live view of the game's let-globals
const G = vm.runInContext('({ get game() { return game; }, get family() { return family; }, get ghost() { return ghost; }, get threat() { return threat; }, get mode() { return mode; },' +
  ' OBJECTS: OBJECTS, ROOMS: ROOMS, roomAt: roomAt, roomById: roomById, update: update, startGame: startGame, triggerObject: triggerObject, hauntNearest: hauntNearest,' +
  ' threatWhisper: threatWhisper, threatManifest: threatManifest, threatCost: threatCost })', sandbox);

const DT = 1 / 60;
const MAX_T = 420;

// ---------------------------------------------------------------- helpers
function scareable(m) { return m.state === 'idle' || m.state === 'walk' || m.state === 'stare'; }
function memberRoom(m) { return G.roomAt(m.x, m.y - 20); }
function ghostRoom() { return G.roomAt(G.ghost.x, G.ghost.y); }
function victimsIn(id) {
  const out = [];
  for (const m of G.family) {
    const r = memberRoom(m);
    if (scareable(m) && r && r.id === id) out.push(m);
  }
  return out;
}
function objsIn(id) { return G.OBJECTS.filter(function (o) { return o.room === id; }); }
function roomCenter(r) { return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
function hunterD() {
  const h = G.threat.hunter;
  if (!h || h.state === 'flee') return 1e9;
  return Math.hypot(G.ghost.x - h.x, G.ghost.y - (h.y - 60));
}
function hunterRoom() {
  const h = G.threat.hunter;
  if (!h || h.state === 'flee') return null;
  return G.roomAt(h.x, h.y - 20);
}
// steer the ghost; salt or a wall-hug gets a vertical detour
function steer(bot, x, y) {
  const g = G.ghost;
  if (bot.lastPos && Math.hypot(g.x - bot.lastPos.x, g.y - bot.lastPos.y) < 2 && Math.hypot(g.x - x, g.y - y) > 30) bot.stuck += 1;
  else bot.stuck = 0;
  bot.lastPos = { x: g.x, y: g.y };
  if (bot.stuck > 20) {
    const r = G.ROOMS[Math.floor(prng() * G.ROOMS.length)];
    bot.detour = { x: r.x + r.w / 2, y: r.y + r.h / 2, t: 2.5 };
    bot.stuck = 0;
  }
  if (bot.detour && bot.detour.t > 0) {
    g.tx = bot.detour.x;
    g.ty = bot.detour.y;
    return;
  }
  g.tx = x;
  g.ty = y;
}
// spot inside room r that keeps away from the lantern
function safeSpot(r) {
  const h = G.threat.hunter;
  const c = roomCenter(r);
  if (!h || h.state === 'flee') return c;
  const left = Math.abs(r.x + 40 - h.x);
  const right = Math.abs(r.x + r.w - 40 - h.x);
  return { x: left > right ? r.x + 40 : r.x + r.w - 40, y: r.y + 60 };
}
function freshness(o, vics) {
  let s = 0;
  for (const v of vics) s += (v.habit && v.habit[o.type]) || 0;
  return s;
}

// ---------------------------------------------------------------- bots
// careful: hunts rooms with people, varies types, chains, avoids the lantern
function carefulBot(bot, dt) {
  bot.cd -= dt;
  if (bot.detour) bot.detour.t -= dt;
  if (bot.cd > 0) return;
  bot.cd = 0.25;
  const hr = hunterRoom();
  // exorcist in a wide room: slip into the far corner and use a trick he hasn't seen
  if (hr && G.game.energy >= 35) {
    const h = G.threat.hunter;
    const spot = safeSpot(hr);
    const safe = Math.hypot(spot.x - h.x, spot.y - (h.y - 60)) > 250;
    let fresh = null;
    for (const o of objsIn(hr.id)) if (o.cool <= 0 && !h.used[o.type] && G.threatCost(o) <= G.game.energy) fresh = o;
    if (safe && fresh) {
      steer(bot, spot.x, spot.y);
      const gr0 = ghostRoom();
      if (gr0 && gr0.id === hr.id && hunterD() > 230) {
        G.triggerObject(fresh);
        bot.cd = 0.3;
      }
      return;
    }
    if (safe && G.threat.manifest && !h.used.manifest && h.scares >= 2 && G.game.energy >= 45) {
      steer(bot, spot.x, spot.y);
      const gr0 = ghostRoom();
      if (gr0 && gr0.id === hr.id && hunterD() > 230) G.threatManifest();
      return;
    }
  }
  // lantern close: leave
  if (hunterD() < 300) {
    let far = null;
    for (const r of G.ROOMS) {
      const c = roomCenter(r);
      const h = G.threat.hunter;
      if (!far || Math.hypot(c.x - h.x, c.y - h.y) > Math.hypot(far.x - h.x, far.y - h.y)) far = c;
    }
    steer(bot, far.x, far.y);
    return;
  }
  // pick the best room: people x fear, minus travel, skip the exorcist's room
  let best = null;
  let bestS = -1e9;
  for (const r of G.ROOMS) {
    if (hr && hr.id === r.id) continue;
    const vics = victimsIn(r.id);
    if (vics.length === 0) continue;
    let ready = 0;
    for (const o of objsIn(r.id)) if (o.cool <= 0 && freshness(o, vics) < 2 * vics.length) ready += 1;
    if (ready === 0) continue;
    let s = 0;
    for (const v of vics) s += 1 + v.fear / 50;
    const c = roomCenter(r);
    s -= Math.hypot(c.x - G.ghost.x, c.y - G.ghost.y) / 600;
    if (s > bestS) {
      bestS = s;
      best = r;
    }
  }
  if (!best) return;
  const spot = safeSpot(best);
  const gr = ghostRoom();
  if (!gr || gr.id !== best.id) {
    steer(bot, spot.x, spot.y);
    return;
  }
  steer(bot, spot.x, spot.y);
  const vics = victimsIn(best.id);
  // finishing blow with manifest
  let maxFear = 0;
  for (const v of vics) maxFear = Math.max(maxFear, v.fear);
  if (G.threat.manifest && G.game.energy >= 60 && (vics.length >= 2 || maxFear >= 60) && G.threat.suspicion < 40) {
    G.threatManifest();
    bot.cd = 0.6;
    return;
  }
  // too loud: let the house settle unless someone is about to break
  if (G.threat.suspicion > 65) bot.hush = true;
  if (G.threat.suspicion < 45) bot.hush = false;
  if (bot.hush && maxFear < 70) return;
  // freshest affordable ready object
  let pick = null;
  for (const o of objsIn(best.id)) {
    if (o.cool > 0) continue;
    if (G.threatCost(o) > G.game.energy - 4) continue;
    if (!pick || freshness(o, vics) < freshness(pick, vics)) pick = o;
  }
  if (pick && freshness(pick, vics) < 2 * vics.length) {
    G.triggerObject(pick);
    bot.cd = 0.4;
    return;
  }
  // spare ecto while tricks cool down: whisper to stop their nerves settling
  let minCost = 1e9;
  for (const o of objsIn(best.id)) minCost = Math.min(minCost, G.threatCost(o));
  if (G.threat.whisper && G.game.energy >= minCost + 10 && maxFear >= 40) G.threatWhisper();
}

// average: semi-random rooms, random objects, sometimes repeats
function averageBot(bot, dt) {
  bot.cd -= dt;
  if (bot.detour) bot.detour.t -= dt;
  if (bot.cd > 0) return;
  bot.cd = 0.8 + prng() * 0.8;
  if (hunterD() < 200 && prng() < 0.5) {
    bot.target = G.ROOMS[Math.floor(prng() * G.ROOMS.length)];
  }
  if (!bot.target || prng() < 0.12) {
    const occ = G.ROOMS.filter(function (r) { return victimsIn(r.id).length > 0; });
    bot.target = occ.length > 0 && prng() < 0.8 ? occ[Math.floor(prng() * occ.length)] : G.ROOMS[Math.floor(prng() * G.ROOMS.length)];
  }
  const c = roomCenter(bot.target);
  steer(bot, c.x, c.y);
  const gr = ghostRoom();
  if (!gr || gr.id !== bot.target.id) return;
  if (G.threat.manifest && G.game.energy >= 50 && prng() < 0.2) {
    G.threatManifest();
    return;
  }
  if (G.threat.whisper && prng() < 0.15) G.threatWhisper();
  let o = null;
  if (bot.lastObj && bot.lastObj.room === gr.id && prng() < 0.35) o = bot.lastObj;
  else {
    const os = objsIn(gr.id);
    o = os[Math.floor(prng() * os.length)];
  }
  // mostly waits for people, sometimes haunts an empty room anyway
  const here = victimsIn(gr.id).length > 0;
  if (prng() < (here ? 0.7 : 0.2)) {
    G.triggerObject(o);
    bot.lastObj = o;
  }
  if (!here && prng() < 0.6) bot.target = null;
}

// spammer: E as fast as the key repeats, wandering anywhere
function spamBot(bot, dt) {
  bot.cd -= dt;
  bot.wt -= dt;
  if (bot.detour) bot.detour.t -= dt;
  if (bot.wt <= 0) {
    bot.wt = 2 + prng() * 3;
    const r = G.ROOMS[Math.floor(prng() * G.ROOMS.length)];
    bot.wp = { x: r.x + 40 + prng() * (r.w - 80), y: r.y + 40 + prng() * (r.h - 80) };
  }
  if (bot.wp) steer(bot, bot.wp.x, bot.wp.y);
  if (bot.cd > 0) return;
  bot.cd = 0.15;
  G.hauntNearest();
}

// ---------------------------------------------------------------- runner
function runOnce(kind) {
  G.startGame();
  const bot = { cd: 0, wt: 0, stuck: 0 };
  const fn = kind === 'careful' ? carefulBot : (kind === 'average' ? averageBot : spamBot);
  const marks = [];
  let lastGone = 0;
  let t = 0;
  let hunterAt = null;
  let lightsAt = null;
  while (G.mode === 'game' && t < MAX_T) {
    if (!G.game.freeze || G.game.freeze <= 0) fn(bot, DT);
    G.update(DT);
    t += DT;
    if (G.threat && G.threat.hunter && hunterAt === null) hunterAt = t;
    if (G.threat && G.threat.lights && lightsAt === null) lightsAt = t;
    let gone = 0;
    for (const m of G.family) if (m.state === 'gone') gone += 1;
    if (gone > lastGone) {
      marks.push(Math.round(t));
      lastGone = gone;
    }
  }
  let outcome = G.mode === 'ending' ? 'WIN' : (G.mode === 'gameover' ? 'LOSE:' + G.threat.gameOver.reason : 'TIMEOUT');
  if (G.mode === 'ending' && G.game.winKind) outcome = 'WIN:' + G.game.winKind;
  const js = (G.game.jsLog || []).map(function (x) { return Math.round(x); });
  let minGap = 1e9;
  for (let i = 1; i < js.length; i++) minGap = Math.min(minGap, js[i] - js[i - 1]);
  return { kind: kind, outcome: outcome, t: Math.round(t), js: js, minGap: minGap === 1e9 ? '-' : minGap, gone: marks, hunter: hunterAt === null ? '-' : Math.round(hunterAt), lights: lightsAt === null ? '-' : Math.round(lightsAt), susp: Math.round(G.threat.suspicion), done: G.threat.objectives.filter(function (o) { return o.done; }).length };
}

function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
console.log(pad('bot', 9) + pad('outcome', 18) + pad('time', 7) + pad('#JS', 5) + pad('minGap', 8) + pad('lights', 8) + pad('hunter', 8) + pad('obj', 5) + pad('fled@', 22) + 'jumpscares@');
const summary = {};
const KINDS = process.argv[4] ? process.argv[4].split(',') : ['careful', 'average', 'spammer'];
for (const kind of KINDS) {
  summary[kind] = { wins: 0, times: [], js: [] };
  for (let i = 0; i < RUNS; i++) {
    const r = runOnce(kind);
    if (r.outcome.indexOf('WIN') === 0) summary[kind].wins += 1;
    summary[kind].times.push(r.t);
    summary[kind].js.push(r.js.length);
    console.log(pad(kind, 9) + pad(r.outcome, 18) + pad(r.t + 's', 7) + pad(r.js.length, 5) + pad(r.minGap, 8) + pad(r.lights, 8) + pad(r.hunter, 8) + pad(r.done, 5) + pad(r.gone.join(','), 22) + r.js.join(','));
  }
}
console.log('');
for (const k in summary) {
  const s = summary[k];
  const avg = s.times.reduce(function (a, b) { return a + b; }, 0) / s.times.length;
  console.log(pad(k, 9) + 'wins ' + s.wins + '/' + RUNS + '  avg ' + Math.round(avg) + 's  js ' + s.js.join(','));
}
