"use strict";
// suspicion, hunter, presence, night clock, objectives, game over (threats agent)
let threat = null;
const NIGHT_LEN = (window.__playbench?.overrides ?? {}).night_len ?? 180;    // real seconds from 11 PM to 5 AM (playbench knob: dawn length; iteration 2: policy bot still wins 13/15)
const HUNT_WARN = (window.__playbench?.overrides ?? {}).hunt_warn ?? 60;     // suspicion that sends for the exorcist (playbench knob; iteration 2: the bot hushes at 65)
const HUNT_DELAY = 8;             // seconds of warning before he walks in
const TOAST_T = 3.2;              // seconds a toast line stays up
const BANNER_T = 4;               // seconds a task/unlock banner stays up (fully lit for 3.5)
const HUNT_STAY = 40;             // seconds he searches before giving up for now
const HOPE_FEAR = 40;             // fear everyone takes when the exorcist breaks
const FADE_T = 20;                // seconds starving (ecto < 10) before you fade
const VOID_DRAIN = 4;             // presence lost per second outside the rooms (the void is no hiding place)
const WHISPER_FEAR = (window.__playbench?.overrides ?? {}).whisper_fear ?? 8;   // fear per whisper, halved per repeat on the same victim (playbench knob)
const WHISPER_CAP = (window.__playbench?.overrides ?? {}).whisper_cap ?? 80;    // whisper alone never lifts fear past this (playbench knob)
const WHISPER_WINDOW = 10;        // seconds a whisper still counts as a repeat on that victim
const HUNT_R = 220;               // exorcist lantern radius (world units)
const SOUND_T = { piano: 1, plates: 1, tv: 1, radio: 1, clock: 1, door: 1 };
const SIGHT_T = { mirror: 1, portrait: 1, lights: 1, faucet: 1, bath: 1, blood: 1 };

// objective list: first 3 unfinished are active
function makeObjectives() {
  const L = [];
  L.push({ text: 'Haunt 3 different rooms', reward: 'ecto', test: function (e) { return e.kind === 'scare' && Object.keys(threat.rooms).length >= 3; } });
  L.push({ text: 'Make the Kid drop the teddy', reward: 'whisper', test: function (e) { return e.kind === 'drop' && e.m.id === 'kid'; } });
  L.push({ text: 'Scare two people at once', reward: 'ecto', test: function (e) { return e.kind === 'scare' && e.n >= 2; } });
  L.push({ text: 'Make Dad scream', reward: 'ecto', test: function (e) { return e.kind === 'terrify' && e.m.id === 'dad'; } });
  L.push({ text: 'Chain a x3 combo', reward: 'manifest', test: function (e) { return e.kind === 'scare' && e.combo >= 3; } });
  L.push({ text: 'Drive someone out the door', reward: 'ecto', test: function (e) { return e.kind === 'gone'; } });
  return L;
}

function resetThreats() {
  threat = {
    suspicion: 0, presence: 100, clock: 0, hunter: null, salt: [], objectives: makeObjectives(), gameOver: null,
    lights: false, saltT: 0, zeroT: 0, kidT: 0, barkT: 0, quietT: 0, rooms: {},
    whisper: false, manifest: false, showObj: true, paused: false, gameOverT: 0, hunterDone: false, whisperCool: 0,
    toasts: [], hunterT: -1, fadeWarn: false, banners: [], told: {},
  };
}

// short screen-space line, bottom-center, fades out (life: seconds, default TOAST_T)
function toast(text, color, life) {
  if (!threat) return;
  // same line already showing: just refresh it
  for (let i = 0; i < threat.toasts.length; i++) {
    const t = threat.toasts[i];
    if (t.text !== text) continue;
    t.t = Math.min(t.t, 0.3);
    return;
  }
  threat.toasts.push({ text: text, color: color || '#c6cfba', t: 0, life: life || TOAST_T });
  if (threat.toasts.length > 3) threat.toasts.shift();
}

// one-time explanation, the first time its situation comes up
function tellOnce(key, text) {
  if (!threat || threat.told[key]) return;
  threat.told[key] = true;
  toast(text, '#dcc870', 6);
}

// drop toasts starting with a prefix (a stale "Q is locked..." once Q unlocks)
function clearToasts(prefix) {
  threat.toasts = threat.toasts.filter(function (t) { return t.text.indexOf(prefix) !== 0; });
}

// room lamp on? (deterministic: lighting's lamp rule, so headless runs agree)
function roomIsLit(id) {
  const r = typeof roomById === 'function' ? roomById(id) : null;
  if (!r) return false;
  if (typeof roomLampOff === 'function') return !roomLampOff(r, ROOMS.indexOf(r));
  return true;
}

// active objectives (first 3 not done)
function activeObjectives() {
  const out = [];
  for (let i = 0; i < threat.objectives.length; i++) {
    if (!threat.objectives[i].done && out.length < 3) out.push(threat.objectives[i]);
  }
  return out;
}

// gameplay event hook: checks objectives
function threatEvent(e) {
  if (!threat) return;
  const act = activeObjectives();
  for (let i = 0; i < act.length; i++) {
    const ob = act[i];
    if (!ob.test(e)) continue;
    ob.done = true;
    if (ob.reward === 'whisper') {
      threat.whisper = true;
      clearToasts('Q');
    } else if (ob.reward === 'manifest') {
      threat.manifest = true;
      clearToasts('R');
    } else {
      game.energy = Math.min(100, game.energy + 30);
    }
    const msg = ob.reward === 'whisper' ? 'Q WHISPER UNLOCKED' : (ob.reward === 'manifest' ? 'R MANIFEST UNLOCKED' : '+30 ECTO');
    // loud reward: big centred banner and a rising three-note chime
    threat.banners.push({ text: msg, sub: 'done: ' + ob.text.toLowerCase(), t: 0 });
    if (threat.banners.length > 3) threat.banners.shift();
    tone(220, 0.6, 'sine', 0.1, 330);
    tone(330, 0.6, 'sine', 0.1, 440, 0.12);
    tone(440, 0.9, 'triangle', 0.1, 660, 0.24);
  }
}

// fear multiplier: habituation per member + personality
function threatFearMult(m, type) {
  if (!m.habit) m.habit = {};
  const n = m.habit[type] || 0;
  m.habit[type] = n + 1;
  const steps = [1, 0.5, 0.25, 0];
  let k = steps[Math.min(n, 3)];
  if (n >= 2) toast("they've stopped flinching at that", '#6a6f62');
  const sound = SOUND_T[type] === 1;
  const sight = SIGHT_T[type] === 1;
  if (m.id === 'dad' && sound) k *= 0.7;                 // skeptic
  if (m.id === 'dad' && sight) k *= 1.3;
  if (m.id === 'mom' && sight) k *= 1.2;                 // believer
  return k;
}

// cost of haunting an object (lit rooms cost more once lights are on)
function threatCost(o) {
  let c = 20;
  if (o.type === 'lights') c = 15;
  if (SIGHT_T[o.type] === 1 && o.type !== 'lights') c = 25;
  if (threat && threat.lights && roomIsLit(o.room)) c *= 1.5;
  return Math.round(c);
}

// noise raises suspicion; loud (ghost-made) noise also restarts the quiet timer
function addSuspicion(v, ambient) {
  threat.suspicion = clamp(threat.suspicion + v, 0, 100);
  if (!ambient) threat.quietT = 0;
}

function loseGame(reason, title, lines) {
  if (threat.gameOver) return;
  threat.gameOver = { reason: reason, title: title, lines: lines };
  threat.gameOverT = 0;
  mode = 'gameover';
  if (typeof sting === 'function') sting();
}

function alive(m) {
  return m.state !== 'gone';
}

// people in the ghost's room
function victimsIn(roomId) {
  const out = [];
  for (let i = 0; i < family.length; i++) {
    const m = family[i];
    if (m.state !== 'idle' && m.state !== 'walk' && m.state !== 'stare') continue;
    const r = roomAt(m.x, m.y - 20);
    if (r && r.id === roomId) out.push(m);
  }
  return out;
}

// Q: cheap low fear, no suspicion
function threatWhisper() {
  if (!threat.whisper) {
    toast('Q is locked. Make the Kid drop the teddy to unlock it.');
    return;
  }
  const r = roomAt(ghost.x, ghost.y);
  if (!r) {
    toast('Q: float into a room first.');
    return;
  }
  if (threat.whisperCool > 0) {
    toast('Q: recharging...');
    return;
  }
  if (game.energy < 8) {
    toast('Q: needs 8 ecto.');
    return;
  }
  game.energy -= 8;
  threat.whisperCool = 2.5;
  if (typeof whisper === 'function') whisper(1.6, 0.25);
  const v = victimsIn(r.id);
  if (v.length === 0) toast('You whisper. Nobody is here to hear it.');
  for (let i = 0; i < v.length; i++) {
    const add = whisperFear(v[i]);
    v[i].bangT = 0.8;                                   // visible flinch; scaredAgo untouched, so fear still decays
    // refund only for a crowd: one victim at a time is no free fear pump
    if (v.length >= 2) game.energy = Math.min(100, game.energy + add * 0.6);
    pop(add > 0 ? '+' + Math.round(add) : 'unmoved', v[i].x + 40, v[i].y - v[i].h - 30, 16, '#c6cfba', 1);
  }
}

// whisper fear on one victim: halves per repeat inside WHISPER_WINDOW, never lifts fear past WHISPER_CAP
function whisperFear(m) {
  m.whisperN = game.time - (m.whisperAt ?? -99) < WHISPER_WINDOW ? (m.whisperN || 0) + 1 : 0;
  m.whisperAt = game.time;
  const add = Math.max(0, Math.min(WHISPER_FEAR * Math.pow(0.5, m.whisperN), WHISPER_CAP - m.fear));
  m.fear += add;
  return add;
}

// R: big fear to everyone in room, +15 suspicion
function threatManifest() {
  if (!threat.manifest) {
    toast('R is locked. Chain a x3 combo to unlock it.');
    return;
  }
  const r = roomAt(ghost.x, ghost.y);
  if (!r) {
    toast('R: float into a room first.');
    return;
  }
  if (threat.manifestCool > 0) {
    toast('R: recharging (' + Math.ceil(threat.manifestCool) + 's).');
    return;
  }
  if (game.energy < 45) {
    toast('R: needs 45 ecto.');
    return;
  }
  game.energy -= 45;
  threat.manifestCool = 20;
  addSuspicion(15);
  shake = Math.max(shake, 24);
  abBoost = Math.max(abBoost, 10);
  if (typeof sting === 'function') sting();
  const v = victimsIn(r.id);
  for (let i = 0; i < v.length; i++) {
    v[i].fear = Math.min(100, v[i].fear + 45);
    v[i].scaredAgo = 0;
    v[i].jumpT = 0.6;
    if (v[i].fear >= 100 && typeof terrify === 'function') terrify(v[i]);
    if (typeof addBlood === 'function') addBlood(v[i].x, v[i].y - 4, 18, 'splat');
  }
  hunterScare('manifest', r.id);
}

// scaring the exorcist: 3 different types in his room breaks him
function hunterScare(type, roomId) {
  const h = threat.hunter;
  if (!h || h.state === 'flee') return;
  const hr = roomAt(h.x, h.y - 20);
  if (!hr || hr.id !== roomId) return;
  if (h.used[type]) {
    pop('he holds the lantern steady', h.x, h.y - 120, 14, '#8a8f80', 1.2);
    return;
  }
  h.used[type] = true;
  h.scares += 1;
  h.jumpT = 0.6;
  toast('the exorcist falters ' + h.scares + '/3', '#a01818');
  if (h.scares >= 3) {
    h.state = 'flee';
    h.path = pathOut(h);
    threat.hunterDone = true;
    toast('HE IS BROKEN.  their last hope runs out the door', '#a01818');
    // the family loses hope: a big jolt, not a free win
    for (let i = 0; i < family.length; i++) {
      const m = family[i];
      if (m.state === 'gone' || m.state === 'flee' || m.state === 'terrified') continue;
      m.fear = Math.min(100, m.fear + HOPE_FEAR);
      m.scaredAgo = 0;
      m.jumpT = 0.6;
    }
  }
}

// salt across two doorways the ghost is not in
function pourSalt() {
  const cand = [];
  const gr = roomAt(ghost.x, ghost.y);
  for (let i = 0; i < ROOMS.length; i++) {
    if (!gr || ROOMS[i].id !== gr.id) cand.push(ROOMS[i]);
  }
  threat.salt = [];
  for (let i = 0; i < 2 && cand.length > 0; i++) {
    const r = cand.splice(Math.floor(Math.random() * cand.length), 1)[0];
    const sx = Math.random() < 0.5 ? r.x : r.x + r.w;
    threat.salt.push({ x: sx, y1: r.y, y2: r.y + r.h });
  }
  threat.saltT = 50;
  toast('salt across the doorway', '#b9bfae');
}

// ghost cannot cross salt
function saltBlock(px, py) {
  for (let i = 0; i < threat.salt.length; i++) {
    const s = threat.salt[i];
    if (ghost.y < s.y1 || ghost.y > s.y2) continue;
    if ((px - s.x) * (ghost.x - s.x) < 0) {
      ghost.x = px;
      ghost.vx = -ghost.vx * 0.5;
      ghost.tx = null;
    }
  }
}

function spawnHunter() {
  const d = doorPt();
  threat.hunter = { x: d.x + 80, y: d.y, facing: -1, t: 0, state: 'walk', path: [{ x: d.x - 40, y: d.y }], walkPhase: 0, speed: 75, used: {}, scares: 0, repath: 2, jumpT: 0, h: 110 };
  toast('THE EXORCIST', '#a01818');
  if (typeof doorSlam === 'function') doorSlam();
}

// room whose rectangle is closest to a point
function nearestRoom(x, y) {
  let best = ROOMS[0];
  let bd = 1e9;
  for (let i = 0; i < ROOMS.length; i++) {
    const r = ROOMS[i];
    const d = Math.hypot(x - clamp(x, r.x, r.x + r.w), y - clamp(y, r.y, r.y + r.h));
    if (d < bd) {
      bd = d;
      best = r;
    }
  }
  return best;
}

function updateHunter(dt) {
  const h = threat.hunter;
  h.t += dt;
  h.jumpT = Math.max(0, h.jumpT - dt);
  // searched long enough: he leaves, the house settles a little
  if (h.state !== 'flee' && h.t > HUNT_STAY) {
    h.state = 'flee';
    h.path = pathOut(h);
    h.gaveUp = true;
    threat.suspicion = Math.min(threat.suspicion, 50);
    toast('the exorcist leaves... for now', '#c6cfba');
  }
  if (h.state === 'flee') {
    if (followPath(h, h.speed * 3, dt) || h.x > doorPt().x + 100) threat.hunter = null;
    return;
  }
  h.repath -= dt;
  if (h.repath <= 0) {
    h.repath = 4;
    const gr = roomAt(ghost.x, ghost.y) || nearestRoom(ghost.x, ghost.y);   // in the void he still closes in
    h.path = pathTo(h, clamp(ghost.x, gr.x + 30, gr.x + gr.w - 30), gr.y + gr.h);
  }
  followPath(h, h.speed, dt);
  // lantern burns the ghost
  const d = Math.hypot(ghost.x - h.x, ghost.y - (h.y - 60));
  if (d < HUNT_R) {
    threat.presence -= 25 * dt;
    shake = Math.max(shake, 4);
    abBoost = Math.max(abBoost, 5);
  }
}

function updateThreats(dt) {
  if (!threat || !game) return;
  threat.clock += dt;
  threat.quietT += dt;
  threat.whisperCool = Math.max(0, threat.whisperCool - dt);
  threat.manifestCool = Math.max(0, (threat.manifestCool || 0) - dt);
  if (threat.quietT > 4) threat.suspicion = Math.max(0, threat.suspicion - 1.5 * dt);
  const kid = family[2];
  const dog = family[3];
  // kid sees you and tells
  if (kid && alive(kid) && kid.state !== 'flee' && Math.hypot(kid.x - ghost.x, kid.y - 40 - ghost.y) < 250) {
    threat.kidT += dt;
    if (threat.kidT > 4) {
      threat.kidT = 0;
      addSuspicion(3, true);
      pop('"there\'s a lady..."', kid.x, kid.y - kid.h - 40, 14, '#b9bfae', 1.6);
    }
  }
  // dog barks: suspicion up, calms people nearby
  threat.barkT -= dt;
  if (dog && alive(dog) && dog.state !== 'flee' && threat.barkT <= 0 && Math.hypot(dog.x - ghost.x, dog.y - 20 - ghost.y) < 300) {
    threat.barkT = 4;
    addSuspicion(2, true);
    if (typeof tone === 'function') tone(320, 0.12, 'square', 0.06, 180);
    pop('WOOF', dog.x, dog.y - 70, 14, '#b9bfae', 0.8);
    for (let i = 0; i < family.length; i++) {
      const m = family[i];
      if (m !== dog && Math.abs(m.x - dog.x) < 200 && Math.abs(m.y - dog.y) < 100) m.fear = Math.max(0, m.fear - 5);
    }
  }
  // thresholds
  // toasts age out
  const keepT = [];
  for (let i = 0; i < threat.toasts.length; i++) {
    threat.toasts[i].t += dt;
    if (threat.toasts[i].t < threat.toasts[i].life) keepT.push(threat.toasts[i]);
  }
  threat.toasts = keepT;
  for (let i = 0; i < threat.banners.length; i++) threat.banners[i].t += dt;
  threat.banners = threat.banners.filter(function (b) { return b.t < BANNER_T; });
  if (threat.suspicion >= 25) tellOnce('susp', 'SUSPICION rises with noise. At ' + HUNT_WARN + ' they call the exorcist.');
  if (!threat.lights && threat.suspicion >= 40) {
    threat.lights = true;
    toast('the lights are on now', '#c9b56a');
  } else if (threat.lights && threat.suspicion < 20) {
    // quiet long enough: they go back to bed
    threat.lights = false;
    toast('the lights go out again', '#c6cfba');
  }
  if (threat.saltT > 0) {
    threat.saltT -= dt;
    if (threat.saltT <= 0) threat.salt = [];
  } else if (threat.suspicion >= 60) {
    pourSalt();
  }
  // exorcist: warning first, then he walks in
  if (!threat.hunter && !threat.hunterDone && threat.hunterT < 0 && threat.suspicion >= HUNT_WARN) {
    threat.hunterT = HUNT_DELAY;
    toast('someone is coming...', '#c9b56a');
  }
  if (threat.hunterT > 0) {
    threat.hunterT -= dt;
    if (threat.hunterT <= 0) spawnHunter();
  }
  if (threat.hunter) updateHunter(dt);
  // presence regen in the dark
  const gr = roomAt(ghost.x, ghost.y);
  const lit = threat.lights && gr && roomIsLit(gr.id);
  if (!gr) {
    threat.presence -= VOID_DRAIN * dt;                 // the void thins you
    if (threat.presence < 80) tellOnce('void', 'Outside the rooms your PRESENCE drains. Float back inside.');
  } else if (!lit) {
    threat.presence = Math.min(100, threat.presence + 3 * dt);
  }
  // warn once per dip
  const fading = threat.presence < 35 || threat.zeroT > 5;
  if (fading && !threat.fadeWarn) toast("you're fading", '#8a1010');
  threat.fadeWarn = fading;
  // lose checks
  if (threat.presence <= 0) {
    threat.presence = 0;
    loseGame('banished', 'BANISHED', [gr ? 'The lantern found you.' : 'You drifted out of the house.', 'The house forgets your name.']);
    return;
  }
  // starving: builds while ecto is low, drains slowly once fed
  if (game.energy < 10) {
    threat.zeroT += dt;
    tellOnce('fade', 'Ecto is empty: scare someone soon or you FADE away.');
  }
  else threat.zeroT = Math.max(0, threat.zeroT - dt * 0.5);
  if (threat.zeroT >= FADE_T) {
    loseGame('faded', 'FADED', ['You spent yourself on nothing.', 'Fear feeds you. You fed no one.']);
    return;
  }
  if (threat.clock >= NIGHT_LEN) {
    let inside = 0;
    for (let i = 0; i < family.length; i++) {
      if (alive(family[i])) inside += 1;
    }
    if (inside > 0) loseGame('dawn', 'DAWN', ['The sun comes up. They stay.', inside + ' still sleep in your house.']);
  }
}

// 11:00 PM -> 5:00 AM
function clockText() {
  const mins = Math.floor(threat.clock / NIGHT_LEN * 360);
  let hr = (23 + Math.floor(mins / 60)) % 24;
  const mm = mins % 60;
  const ampm = hr >= 12 ? 'PM' : 'AM';
  hr = hr % 12;
  if (hr === 0) hr = 12;
  return hr + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ampm;
}

// world space: salt lines and the exorcist
function drawThreatsWorld(g) {
  if (!threat) return;
  for (let i = 0; i < threat.salt.length; i++) {
    const s = threat.salt[i];
    const x = Math.round(s.x / 4) * 4 - 4;
    for (let y = s.y2 - 8; y > s.y1; y -= 12) {
      g.fillStyle = (y / 12) % 2 === 0 ? '#c8cbbd' : '#8f9384';
      g.fillRect(x, Math.round(y / 4) * 4, 8, 4);
    }
  }
  const h = threat.hunter;
  if (!h) return;
  if (typeof drawHunter === 'function') {
    drawHunter(g, h);
  } else {
    g.fillStyle = '#14160f';
    g.fillRect(Math.round(h.x / 4) * 4 - 16, h.y - 110, 32, 110);
    g.fillStyle = '#c9b56a';
    g.fillRect(Math.round(h.x / 4) * 4 + h.facing * 20, h.y - 64, 8, 8);
  }
}

// screen space HUD: clock, presence, suspicion, diary, pause help
function drawThreatHUD(g) {
  if (!threat) return;
  label(g, clockText(), W / 2, 30, 22, '#b9bfae', 'center');
  // presence bar
  g.fillStyle = '#0c0e0a';
  g.fillRect(W / 2 - 80, 48, 160, 6);
  g.fillStyle = threat.presence < 30 ? '#8a1010' : '#c6cfba';
  g.fillRect(W / 2 - 80, 48, 160 * threat.presence / 100, 6);
  label(g, 'PRESENCE', W / 2 - 86, 54, 10, '#95a493', 'right');
  // suspicion eye
  const s = threat.suspicion;
  const sc2 = s >= 85 ? '#a01818' : (s >= 60 ? '#a07a3a' : (s >= 35 ? '#8a8a5a' : '#95a493'));
  g.fillStyle = '#0c0e0a';
  g.fillRect(W / 2 - 80, 64, 160, 6);
  g.fillStyle = sc2;
  g.fillRect(W / 2 - 80, 64, 160 * s / 100, 6);
  rect(g, Math.round(W / 2 - 80 + 160 * HUNT_WARN / 100) - 1, 60, 2, 14, '#a01818');   // exorcist threshold tick
  label(g, 'SUSPICION', W / 2 - 86, 70, 10, '#95a493', 'right');
  if (threat.hunter) label(g, 'THE EXORCIST ' + threat.hunter.scares + '/3', W / 2, 92, 12, '#a01818', 'center');
  if (threat.zeroT > 0 && game.energy < 10) label(g, 'fading... ' + Math.ceil(FADE_T - threat.zeroT), W / 2, 112, 16, '#c0181c', 'center');
  // diary
  if (threat.showObj) {
    const act = activeObjectives();
    label(g, 'DIARY  [TAB]', 24, H - 110, 11, '#95a493', 'left');
    let dw = 0;
    for (let i = 0; i < act.length; i++) {
      let tag = '';
      if (act[i].reward === 'whisper') tag = '  (unlocks Q)';
      if (act[i].reward === 'manifest') tag = '  (unlocks R)';
      dw = Math.max(dw, measurePixelText('- ' + act[i].text + tag, fontScale(12)));
      label(g, '- ' + act[i].text + tag, 24, H - 90 + i * 18, 12, '#c6cfba', 'left');
    }
    threat.diaryR = 24 + dw;                          // the context hint slides right of this
    const q = threat.whisper ? (threat.whisperCool > 0 ? 'Q whisper ..' : 'Q whisper (8)') : 'Q locked';
    const rr2 = threat.manifest ? (threat.manifestCool > 0 ? 'R manifest ' + Math.ceil(threat.manifestCool) + 's' : 'R manifest (45)') : 'R locked';
    label(g, q + '    ' + rr2, 24, H - 130, 12, threat.whisper || threat.manifest ? '#c9b56a' : '#95a493', 'left');
  }
  // toasts, center (above the tutorial band), newest lowest
  for (let i = 0; i < threat.toasts.length; i++) {
    const t = threat.toasts[i];
    const a = Math.min(1, t.t / 0.2, (t.life - t.t) / 0.8);
    g.globalAlpha = clamp(a, 0, 1);
    const tw2 = measurePixelText(t.text, 2) + 24;      // solid slab so it never mixes with the diary
    const ty2 = 470 - (threat.toasts.length - 1 - i) * 30;
    rect(g, Math.round(W / 2 - tw2 / 2), ty2 - 14, Math.round(tw2), 28, 'rgba(8,11,8,0.92)');
    label(g, t.text, W / 2, ty2, 16, t.color, 'center');
  }
  g.globalAlpha = 1;
  if (threat.paused) {
    g.fillStyle = 'rgba(4,6,4,0.86)';
    g.fillRect(0, 0, W, H);
    const lines = ['PAUSED', '', 'WASD / click   drift', 'E / click object   haunt (costs ecto)', 'Q   whisper: small scare, no suspicion (task: Kid drops teddy)', 'R   manifest: huge scare, loud (task: x3 combo)', 'TAB   diary', 'ESC   resume', '', 'Fear feeds you. Empty rooms starve you.', 'Repeat a trick and they stop flinching.', 'Too loud and they call someone.'];
    for (let i = 0; i < lines.length; i++) label(g, lines[i], W / 2, 180 + i * 28, i === 0 ? 30 : 16, i === 0 ? '#a01818' : '#c6cfba', 'center');
  }
}

// task / unlock banners: big, centred, bright (drawn after post-fx so the grade can't dull them)
function drawBanners(g) {
  if (!threat || threat.paused) return;
  for (let i = 0; i < threat.banners.length; i++) {
    const b = threat.banners[i];
    const a = clamp(Math.min(b.t / 0.15, (BANNER_T - b.t) / 0.5), 0, 1);
    const y = 200 + i * 84;
    const w = Math.max(measurePixelText(b.text, fontScale(32)), measurePixelText(b.sub, fontScale(16))) + 64;
    const x0 = Math.round((W / 2 - w / 2) / 4) * 4;
    g.globalAlpha = a;
    rect(g, x0, y - 34, w, 76, b.t < 0.25 ? '#f2d43a' : '#5e7262');   // gold flash, then the panel edge
    rect(g, x0 + 4, y - 30, w - 8, 68, 'rgba(8,11,8,0.94)');
    label(g, b.text, W / 2, y - 6, 32, '#f2d43a', 'center');
    label(g, b.sub, W / 2, y + 24, 16, '#d2dcc6', 'center');
  }
  g.globalAlpha = 1;
}

// screen space lose screen
function drawGameOver(g, t) {
  if (!threat || !threat.gameOver) return;
  const go = threat.gameOver;
  g.fillStyle = 'rgba(3,4,3,' + Math.min(0.95, t * 0.8) + ')';
  g.fillRect(0, 0, W, H);
  if (t < 0.6) return;
  label(g, go.title, W / 2, H / 2 - 40, 52, '#8a1010', 'center');
  for (let i = 0; i < go.lines.length; i++) label(g, go.lines[i], W / 2, H / 2 + 20 + i * 26, 16, '#c6cfba', 'center');
  if (t > 2) label(g, 'click to haunt again', W / 2, H - 80, 12, '#95a493', 'center');
}
