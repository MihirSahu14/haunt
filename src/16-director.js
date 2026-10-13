"use strict";
// =====================================================================
// TENSION DIRECTOR: paces dread across the night (quiet > build > peak > relax)
// owns the sound beds, danger audio and the foreshadowing beats (docs/design-horror.md s6, s9)
// public: updateDirector(dt), drawDirectorWorld(g), drawDirectorScreen(g), resetDirector()
// =====================================================================
let dir = null;                                   // director state, null until a run starts
const dirCv = makeCanvas(320, 180);               // scratch buffer for low-alpha pale copies
const dirG = dirCv.getContext('2d');
const DIR_LINES = ['...you again.', "...she's back.", "...it's only her."];
const DIR_BEATS = ['steps', 'door', 'child', 'pale', 'line', 'crawl', 'watched', 'lightning', 'rainstop', 'steps', 'door', 'child'];
const DIR_MBOX = [[0.02, 1, 1, 12], [0.42, 0.95, 0.88, 12], [0.78, 0.9, 0.6, 5]];   // [night progress, rate from, rate to, notes]

// public: fresh director for a new run (called from startGame via 15-main)
function resetDirector() {
  dir = {
    t: 0, phase: 'quiet', phaseT: 0, phaseLen: rand(20, 28),
    inten: 0, bump: 0, I: 0, dread: 0, h: 0,
    beatT: rand(6, 10), deck: [],
    crawl: null, crawls: 0, lastCrawl: -99,
    pale: null, mirror: null, mirrors: 0, lastMirror: -99,
    texts: [], lines: 0,
    stings: 0, lastSting: -99, hushT: 0, hushFire: '',
    heartT: 1, breathT: 3, stillT: 0, breathP: 4.2,
    chantT: 1, bellT: 3, music: 0, rainStopT: 0, rainStops: 0,
    vigT: 0, lt: 99, ambT: 0, live: true, frozen: false,
  };
  if (typeof startAmbience === 'function') startAmbience();
  dirAmb(true);
}

// ---------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------
function dirBump(v) {
  dir.bump = Math.min(1, dir.bump + v);
}

// 0..1 through the night
function dirProgress() {
  if (typeof threat !== 'undefined' && threat && typeof NIGHT_LEN !== 'undefined') return clamp(threat.clock / NIGHT_LEN, 0, 1);
  return clamp(dir.t / 240, 0, 1);
}

// distance from the ghost to the exorcist (huge when none)
function dirHunterD() {
  if (typeof threat === 'undefined' || !threat || !threat.hunter) return 1e9;
  return Math.hypot(threat.hunter.x - ghost.x, threat.hunter.y - ghost.y);
}

// stereo pan of a world x relative to the camera
function dirPan(x) {
  const cx = typeof camX !== 'undefined' ? camX : 0;
  return clamp((x - cx - W / 2) / (W / 2), -1, 1);
}

// is a world point inside the camera view (with margin)
function dirOnScreen(x, y) {
  const cx = typeof camX !== 'undefined' ? camX : 0;
  const cy = typeof camY !== 'undefined' ? camY : 0;
  return x > cx + 40 && x < cx + W - 40 && y > cy + 40 && y < cy + H + 20;
}

// living members still in the house and visible on screen
function dirVisibleLiving(noDog) {
  const out = [];
  for (let i = 0; i < family.length; i++) {
    const m = family[i];
    if (m.state === 'gone' || m.state === 'flee') continue;
    if (noDog && m.id === 'dog') continue;
    if (dirOnScreen(m.x, m.y - 40)) out.push(m);
  }
  return out;
}

// play one-shots placed in the stereo field (falls back to centre)
function dirPlace(pan, lp, fn) {
  if (typeof atPlace === 'function') atPlace(pan, lp, fn);
  else fn();
}

function smooth01(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------
// phases
// ---------------------------------------------------------------------
function dirSetPhase(p) {
  const prog = dirProgress();
  dir.phase = p;
  dir.phaseT = 0;
  if (p === 'quiet') dir.phaseLen = rand(16, 26) * (1 - 0.4 * prog);
  if (p === 'build') dir.phaseLen = rand(32, 48);
  if (p === 'peak') dir.phaseLen = rand(3, 5);
  if (p === 'relax') dir.phaseLen = rand(14, 24) * (1 - 0.35 * prog);
  if (p === 'peak') dirPeak();
}

// the top of a wave: rare stinger, else lightning or an apparition
function dirPeak() {
  dir.vigT = 3;
  if (dir.stings < 2 && dir.t > 50 && dir.t - dir.lastSting > 60 && Math.random() < 0.55) {
    dirHush(rand(0.6, 1.5), 'sting');
    return;
  }
  if (Math.random() < 0.5 && typeof triggerLightning === 'function') {
    triggerLightning();
    return;
  }
  dirSpawnCrawler(false);
}

// near-silence before a payoff; fire = what plays when it ends
function dirHush(len, fire) {
  dir.hushT = len;
  dir.hushFire = fire;
  if (typeof setAmb === 'function') setAmb('bus', 0.04, 0.12);
}

function dirHushEnd() {
  if (typeof setAmb === 'function') setAmb('bus', 1, 1.2);
  if (dir.hushFire === 'sting') {
    if (typeof clusterSting === 'function') clusterSting(0.7);
    dir.stings += 1;
    dir.lastSting = dir.t;
    dir.vigT = 2.5;
    dirBump(0.4);
    shake = Math.max(shake, 5);
    dirSpawnCrawler(false);
  }
  dir.hushFire = '';
}

// ---------------------------------------------------------------------
// beats (fire only in BUILD, drawn from a shuffled deck)
// ---------------------------------------------------------------------
function dirDrawBeat() {
  if (dir.deck.length === 0) {
    dir.deck = DIR_BEATS.slice();
    for (let i = dir.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = dir.deck[i];
      dir.deck[i] = dir.deck[j];
      dir.deck[j] = tmp;
    }
  }
  return dir.deck.pop();
}

function dirFireBeat() {
  const prog = dirProgress();
  // the crawler is owed 2-3 appearances per run
  if (dir.crawls < Math.floor(prog * 3.2) && dirSpawnCrawler(false)) return;
  for (let k = 0; k < 3; k++) {
    if (dirBeat(dirDrawBeat(), prog)) return;
  }
}

function dirBeat(b, prog) {
  if (b === 'steps') {
    // someone walking in an empty room above; late in the night they are small
    const small = prog > 0.5 && Math.random() < 0.5;
    const n = 3 + Math.floor(Math.random() * 4);
    const gap = small ? 0.34 : rand(0.6, 0.9);
    dirPlace(rand(-0.7, 0.7), 320, function () {
      for (let i = 0; i < n; i++) footstep(small ? 0.05 : 0.08, i * gap * rand(0.9, 1.15), small);
    });
    return true;
  }
  if (b === 'door') {
    // a door creaks open off-screen
    dirPlace(Math.random() < 0.5 ? -0.9 : 0.9, 1400, function () { doorCreakOpen(0.8); });
    return true;
  }
  if (b === 'child') {
    // a child's voice, almost: humming the motif, or a high whisper
    const v = 0.006 + 0.004 * prog;
    dirPlace(rand(-1, 1), 2400, function () {
      if (Math.random() < 0.5) childHum(v);
      else whisper(1.4, 0.12, 0, 1.6);
    });
    return true;
  }
  if (b === 'pale') {
    // a family member flickers into their true pale self
    const ms = dirVisibleLiving(false);
    if (ms.length === 0) return false;
    dir.pale = { m: ms[Math.floor(Math.random() * ms.length)], t: 0, life: rand(0.5, 1.0) };
    return true;
  }
  if (b === 'line') {
    // "...you again." under a member's breath
    if (dir.lines >= 4) return false;
    const ms = dirVisibleLiving(true);
    if (ms.length === 0) return false;
    const m = ms[Math.floor(Math.random() * ms.length)];
    dirSay(m, DIR_LINES[dir.lines === 0 ? 0 : Math.floor(Math.random() * DIR_LINES.length)]);
    return true;
  }
  if (b === 'crawl') return dirSpawnCrawler(false);
  if (b === 'watched') {
    // the vignette breathes, and something else breathes with it
    dir.vigT = 6;
    dirPlace(rand(-0.8, 0.8), 2500, function () { breath(0.02, 3.5, true); });
    return true;
  }
  if (b === 'lightning') {
    if (typeof triggerLightning !== 'function') return false;
    triggerLightning();
    return true;
  }
  if (b === 'rainstop') {
    // the rain stops; the player only notices it when it goes
    if (dir.rainStops >= 2 || prog < 0.25) return false;
    dir.rainStopT = rand(6, 10);
    dir.rainStops += 1;
    if (typeof setAmb === 'function') setAmb('rain', 0, 0.4);
    return true;
  }
  return false;
}

// faint whispered line near a member (screen-space text + panned whisper)
function dirSay(m, text) {
  dir.texts.push({ m: m, x: m.x, y: m.y - m.h, text: text, t: 0, life: 3.4 });
  dir.lines += 1;
  dirPlace(dirPan(m.x), 3000, function () { whisper(1.8, 0.18); });
}

// ---------------------------------------------------------------------
// apparitions
// ---------------------------------------------------------------------
// the pale crawling woman, at the edge of a light pool on the ghost's floor
function dirSpawnCrawler(flash) {
  if (dir.crawl || dir.crawls >= 3) return false;
  if (!flash && dir.t - dir.lastCrawl < 35) return false;
  if (typeof drawCrawler !== 'function') return false;
  const gr = roomAt(ghost.x, ghost.y);
  if (!gr) return false;
  const floorY = gr.floor || gr.y + gr.h;
  const cx = typeof camX !== 'undefined' ? camX : 0;
  const spots = [];
  for (let x = cx + 60; x < cx + W - 60; x += 40) {
    if (Math.abs(x - ghost.x) < 300) continue;
    const r = roomAt(x, floorY - 10);
    if (!r || (r.floor || r.y + r.h) !== floorY) continue;
    if (x < r.x + 40 || x > r.x + r.w - 40) continue;
    const lit = typeof isLit === 'function' ? isLit(x, floorY - 30) : 0.3;
    if (flash || (lit > 0.1 && lit < 0.55)) spots.push(x);   // edge of light, not in it
  }
  if (spots.length === 0) return false;
  const x = spots[Math.floor(Math.random() * spots.length)];
  dir.crawl = { x: x, y: floorY - 2, t: 0, a: 0, life: flash ? 0.6 : rand(5, 8), face: x > ghost.x ? -1 : 1, flash: flash, seen: 0, fading: false, toned: false };
  dir.crawls += 1;
  dir.lastCrawl = dir.t;
  return true;
}

// crawl a little; vanish when lit, approached or stared at
function dirUpdateCrawler(dt) {
  const c = dir.crawl;
  if (!c) return;
  c.t += dt;
  if (c.fading) {
    c.a -= dt * 4;
    if (c.a <= 0) dir.crawl = null;
    return;
  }
  const d = Math.hypot(ghost.x - c.x, ghost.y - c.y);
  const lit = typeof isLit === 'function' ? isLit(c.x, c.y - 30) : 0;
  const toward = (c.x - ghost.x) * ghost.vx > 0 && Math.abs(ghost.vx) > 60;
  if (dirOnScreen(c.x, c.y)) c.seen += dt;
  if (c.t > c.life || d < 240 || lit > 0.7 || (toward && c.seen > 0.8)) c.fading = true;
  if (c.flash) {
    c.a = typeof lightningA === 'function' ? clamp(lightningA() * 1.4, 0, 0.9) : 0.6;
    return;
  }
  c.a = Math.min(0.9, c.a + dt * 1.5);
  const lurch = Math.sin(c.t * 4.4) > -0.2 ? 1 : 0.1;   // drag, pause, drag
  c.x += c.face * 22 * lurch * dt;
  if (!c.toned && c.seen > 0.4) {
    c.toned = true;
    if (typeof glassTone === 'function') glassTone(0.6);
    dirBump(0.25);
  }
}

// the mirror shows a girl instead of the ghost, for a moment
function dirUpdateMirror(dt) {
  if (dir.mirror) {
    dir.mirror.t += dt;
    if (dir.mirror.t > dir.mirror.life) dir.mirror = null;
    return;
  }
  if (dir.mirrors >= 3 || dir.t < 20 || dir.t - dir.lastMirror < 25) return;
  for (let i = 0; i < OBJECTS.length; i++) {
    const o = OBJECTS[i];
    if (o.type !== 'mirror') continue;
    if (Math.abs(ghost.x - o.x) > 130 || Math.abs(ghost.y - (o.y - 44)) > 170) continue;
    if (Math.random() > dt * 0.9) continue;
    dir.mirror = { o: o, t: 0, life: rand(0.5, 1.1), face: ghost.x < o.x ? -1 : 1 };
    dir.mirrors += 1;
    dir.lastMirror = dir.t;
    if (typeof glassTone === 'function') glassTone(0.5);
    dirBump(0.2);
    return;
  }
}

// ---------------------------------------------------------------------
// sound beds and danger audio
// ---------------------------------------------------------------------
// glide rain / room / wind / drone toward the current state (4 Hz is plenty)
function dirAmb(now) {
  if (typeof setAmb !== 'function') return;
  const prog = dirProgress();
  const relax = dir.phase === 'relax' ? 0.7 : 1;
  const rain = dir.rainStopT > 0 ? 0 : (0.05 + 0.05 * prog) * relax;
  setAmb('rain', rain, now ? 2 : 1.2);
  setAmb('room', 0.03 + 0.02 * prog, 1.5);
  setAmb('wind', prog < 0.25 ? 0 : (0.012 + 0.025 * prog) * relax, 2);
  if (typeof setDrone === 'function') setDrone(0.003 + 0.02 * dir.dread * (dir.phase === 'relax' ? 0.5 : 1), prog > 0.6 ? 1 : 0);
}

function dirAudio(dt, prog, hd) {
  // heartbeat: rate and level follow danger, stops in a hush
  dir.heartT -= dt;
  if (dir.heartT <= 0) {
    dir.heartT = 60 / (62 + 58 * dir.h);
    const v = 0.32 * smooth01(0.3, 0.85, dir.h) * (dir.phase === 'relax' ? 0.6 : 1);
    if (dir.hushT <= 0 && typeof heartbeat === 'function') heartbeat(v);
    if (v > 0.05) dir.vigT = Math.max(dir.vigT, 0.25);
  }
  // your breathing when you stay still; held when the exorcist is close
  const moving = Math.abs(ghost.vx) + Math.abs(ghost.vy) > 30;
  dir.stillT = moving ? 0 : dir.stillT + dt;
  dir.breathP = 4.2 - 2.6 * dir.h;
  dir.breathT -= dt;
  if (dir.breathT <= 0) {
    dir.breathT = dir.breathP;
    const want = dir.stillT > 2 && (prog > 0.15 || dir.h > 0.35);
    if (want && hd > 300 && dir.hushT <= 0 && typeof breath === 'function') breath(0.012 + 0.025 * dir.h, dir.breathP, prog > 0.6);
  }
  // the exorcist: murmured chant and a hand bell, placed where he is
  if (typeof threat !== 'undefined' && threat && threat.hunter) {
    const hx = threat.hunter.x;
    const near = clamp(1 - hd / 1400, 0.08, 1);
    dir.chantT -= dt;
    if (dir.chantT <= 0) {
      dir.chantT = rand(2.6, 4.5);
      dirPlace(dirPan(hx), 500 + 3000 * near, function () { chant(rand(1.6, 2.6), 0.05 * near); });
    }
    dir.bellT -= dt;
    if (dir.bellT <= 0) {
      dir.bellT = rand(5, 9);
      dirPlace(dirPan(hx), 1500 + 6000 * near, function () { bell(0.6 * near); });
    }
  }
  // the music box, three times a night, a little more out of tune each time
  if (dir.music < DIR_MBOX.length && prog >= DIR_MBOX[dir.music][0] && dir.t > 4 && dir.hushT <= 0 && typeof musicBox === 'function') {
    const mb = DIR_MBOX[dir.music];
    const k = dir.music;
    dirPlace(rand(-0.4, 0.4), 2600 - k * 700, function () { musicBox(mb[1], mb[2], mb[3], 0.55 - k * 0.1, false, prog * 45); });
    dir.music += 1;
  }
}

// thunder follows every flash; lightning held off while the house rests
function dirLightning() {
  if (typeof lightningT === 'undefined') return;
  if (lightningT < dir.lt) {
    if (typeof thunder === 'function') thunder(rand(0.3, 2.8));
    dirBump(0.1);
    if (dir.phase === 'build' && Math.random() < 0.4) dirSpawnCrawler(true);   // seen only in the flash
    else if (Math.random() < 0.3) dirBeat('pale', 0);
  }
  dir.lt = lightningT;
  if (dir.phase === 'relax' && typeof lightningNext !== 'undefined' && lightningNext < 1) lightningNext += rand(4, 9);
}

// ---------------------------------------------------------------------
// public: per-frame update (15-main calls it every frame)
// ---------------------------------------------------------------------
function updateDirector(dt) {
  if (!dir) return;
  if (mode !== 'game') {
    // ending / game over: let the beds fall away once
    if (dir.live && typeof setAmb === 'function') {
      setAmb('rain', 0.025, 2);
      setAmb('wind', 0, 2);
      setAmb('bus', 1, 0.5);
      if (typeof setDrone === 'function') setDrone(0.002, 0);
    }
    dir.live = false;
    return;
  }
  dir.live = true;
  if (typeof threat !== 'undefined' && threat && threat.paused) return;
  // jump scare in progress: duck the beds, hold everything
  if (game && game.freeze > 0) {
    if (!dir.frozen && typeof setAmb === 'function') setAmb('bus', 0.2, 0.1);
    dir.frozen = true;
    return;
  }
  if (dir.frozen && typeof setAmb === 'function') setAmb('bus', 1, 1.6);
  dir.frozen = false;
  dir.t += dt;
  const prog = dirProgress();
  // intensity: suspicion, the exorcist's distance, the family's fear, the hour
  const hd = dirHunterD();
  const hunt = clamp(1 - hd / 900, 0, 1);
  const susp = typeof threat !== 'undefined' && threat ? clamp(threat.suspicion / 100, 0, 1) : 0;
  let fearMax = 0;
  for (let i = 0; i < family.length; i++) {
    if (family[i].state !== 'gone') fearMax = Math.max(fearMax, (family[i].fear || 0) / 100);
  }
  const target = clamp(0.45 * susp + 0.6 * hunt + 0.2 * fearMax + 0.15 * prog, 0, 1);
  dir.inten += (target - dir.inten) * Math.min(1, dt / 3);
  dir.bump = Math.max(0, dir.bump - dt * 0.12);
  dir.I = clamp(dir.inten + dir.bump, 0, 1);
  dir.dread = clamp(0.15 + 0.55 * prog + 0.3 * dir.I, 0, 1);
  dir.h = Math.max(hunt, susp * 0.85, 0.45 * dir.dread, dir.bump);
  // phase machine
  dir.phaseT += dt;
  if (dir.phase === 'quiet' && (dir.phaseT > dir.phaseLen || hunt > 0.5)) dirSetPhase('build');
  else if (dir.phase === 'build' && (dir.I >= 0.75 || dir.phaseT > dir.phaseLen)) dirSetPhase('peak');
  else if (dir.phase === 'peak' && dir.phaseT > dir.phaseLen) dirSetPhase('relax');
  else if (dir.phase === 'relax' && dir.phaseT > dir.phaseLen && dir.I < 0.6) dirSetPhase('quiet');
  // hush countdown
  if (dir.hushT > 0) {
    dir.hushT -= dt;
    if (dir.hushT <= 0) dirHushEnd();
  }
  // beats
  if (dir.phase === 'build') {
    dir.beatT -= dt;
    if (dir.beatT <= 0 && dir.I < 0.6 && dir.hushT <= 0) {
      dirFireBeat();
      dir.beatT = (14 - 7 * prog) * rand(0.7, 1.3);
    }
  }
  // timers
  dir.vigT = Math.max(0, dir.vigT - dt);
  if (dir.rainStopT > 0) dir.rainStopT -= dt;
  if (dir.pale) {
    dir.pale.t += dt;
    if (dir.pale.t > dir.pale.life) dir.pale = null;
  }
  const keep = [];
  for (let i = 0; i < dir.texts.length; i++) {
    const tx = dir.texts[i];
    tx.t += dt;
    if (tx.m && tx.m.state !== 'gone') {
      tx.x = tx.m.x;
      tx.y = tx.m.y - tx.m.h;
    }
    if (tx.t < tx.life) keep.push(tx);
  }
  dir.texts = keep;
  dirUpdateCrawler(dt);
  dirUpdateMirror(dt);
  dirLightning();
  dirAudio(dt, prog, hd);
  dir.ambT -= dt;
  if (dir.ambT <= 0 && dir.hushT <= 0) {
    dir.ambT = 0.25;
    dirAmb(false);
  }
}

// ---------------------------------------------------------------------
// public: world-space drawing (low-res world buffer, after the family)
// ---------------------------------------------------------------------
function drawDirectorWorld(g) {
  if (!dir || mode !== 'game') return;
  // the crawler
  const c = dir.crawl;
  if (c && c.a > 0.01 && typeof drawCrawler === 'function') drawCrawler(g, c.x, c.y, c.t, c.a, c.face);
  // the girl in the mirror
  if (dir.mirror) dirDrawMirror(g, dir.mirror);
  // a member flickering pale (strobes, low alpha)
  const p = dir.pale;
  if (p && p.m.state !== 'gone' && Math.floor(p.t * 20) % 3 !== 1 && typeof drawMember === 'function') dirDrawPale(g, p.m, 0.32);
}

// girl drawn small inside the mirror glass (glass rect matches 07-objects)
function dirDrawMirror(g, mr) {
  if (typeof drawGirl !== 'function') return;
  const o = mr.o;
  const cy = o.y - 44;
  const a = Math.min(1, mr.t * 6, (mr.life - mr.t) * 6);
  g.save();
  g.beginPath();
  g.rect(o.x - 26, cy - 36, 52, 72);
  g.clip();
  g.globalAlpha = clamp(a, 0, 1);
  rect(g, o.x - 26, cy - 36, 52, 72, '#0c0f0d');
  g.translate(o.x, cy + 70);
  g.scale(0.5, 0.5);
  drawGirl(g, 0, 0, mr.face);
  g.restore();
}

// pale copy of a member drawn at low alpha through a scratch buffer
function dirDrawPale(g, m, a) {
  const same = g.canvas && g.canvas.width === dirCv.width && g.canvas.height === dirCv.height && typeof g.getTransform === 'function';
  if (!same) {
    drawMember(g, m, true);
    return;
  }
  dirG.setTransform(1, 0, 0, 1, 0, 0);
  dirG.clearRect(0, 0, dirCv.width, dirCv.height);
  dirG.setTransform(g.getTransform());
  dirG.imageSmoothingEnabled = false;
  drawMember(dirG, m, true);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = a;
  g.drawImage(dirCv, 0, 0);
  g.restore();
}

// ---------------------------------------------------------------------
// public: screen-space drawing (1280x720, after the HUD)
// ---------------------------------------------------------------------
function drawDirectorScreen(g) {
  if (!dir || mode !== 'game') return;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  // breathing vignette: tightens with intensity and on 'watched' beats
  const watch = dir.vigT > 0 ? 0.3 * Math.min(1, dir.vigT / 1.5) : 0;
  const va = dir.I * 0.2 + watch + (dir.hushT > 0 ? 0.2 : 0);
  if (va > 0.01) {
    const b = 0.5 + 0.5 * Math.sin(dir.t * Math.PI * 2 / Math.max(1.2, dir.breathP));
    const gr = g.createRadialGradient(W / 2, H / 2, 330 - 110 * b, W / 2, H / 2, 760);
    gr.addColorStop(0, 'rgba(2,4,3,0)');
    gr.addColorStop(1, 'rgba(2,4,3,' + clamp(va * (0.6 + 0.4 * b), 0, 0.85).toFixed(3) + ')');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  }
  // whispered lines, typed out faintly above the speaker
  const cx = typeof camX !== 'undefined' ? camX : 0;
  const cy = typeof camY !== 'undefined' ? camY : 0;
  for (let i = 0; i < dir.texts.length; i++) {
    const tx = dir.texts[i];
    if (typeof label !== 'function') break;
    const n = Math.min(tx.text.length, Math.floor(tx.t * 14));
    const fade = clamp(Math.min(tx.t * 2, (tx.life - tx.t) * 1.5), 0, 1);
    const jit = Math.random() < 0.08 ? rand(-2, 2) : 0;
    g.globalAlpha = clamp(0.34 * fade * (0.7 + Math.random() * 0.3), 0, 1);
    label(g, tx.text.slice(0, n), tx.x - cx + jit, tx.y - 60 - cy, 14, '#b9c4b4');
  }
  g.restore();
}
