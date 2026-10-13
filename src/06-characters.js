"use strict";
// =====================================================================
// CHARACTERS - pixel sprites (1 canvas px per sprite px, drawn at 4x in world units)
// =====================================================================
// muted green-gray palette per character (blood is the only saturated color)
const COLS = {
  dad: { skin: '#8f8a72', hair: '#26261e', shirt: '#4b5646', pants: '#30352c', shoe: '#16180f' },
  mom: { skin: '#958e78', hair: '#121310', shirt: '#554c46', pants: '#2c2a26', shoe: '#14120f' },
  kid: { skin: '#9a947b', hair: '#463f2f', shirt: '#6f6c48', pants: '#363d34', shoe: '#1a1b16' },
  dog: { skin: '#6c6247', hair: '#3c3426', shirt: '#6c6247', pants: '#6c6247', shoe: '#1a1610' },
  girl: { skin: '#a29c84', hair: '#16140f', shirt: '#6e6460', pants: '#5e5652', shoe: '#8a8678' },
  hunter: { skin: '#8a8670', hair: '#121410', shirt: '#22241c', pants: '#181a14', shoe: '#0c0d0a' },
};
const PALE = { skin: '#c2cec2', hair: '#7e8c84', shirt: '#aab8ae', pants: '#98a69c', shoe: '#7e8c84' };
const GORE = '#7a0a0a';
const GORE_DK = '#3e0505';

// body plans: height, head size, torso width, leg width, leg share, hair style, dress length
const HSPEC = {
  dad: { hgt: 34, headH: 5, headW: 5, tw: 6, lw: 2, legF: 0.46, hair: 'short', dress: 0 },
  mom: { hgt: 32, headH: 5, headW: 5, tw: 5, lw: 1, legF: 0.47, hair: 'long', dress: 0.55 },
  kid: { hgt: 22, headH: 5, headW: 5, tw: 5, lw: 2, legF: 0.38, hair: 'messy', dress: 0 },
  girl: { hgt: 22, headH: 5, headW: 5, tw: 5, lw: 2, legF: 0.38, hair: 'long', dress: 0 },
  hunter: { hgt: 35, headH: 6, headW: 5, tw: 6, lw: 2, legF: 0.44, hair: 'hat', dress: 0.8 },
};

// ---------------------------------------------------------------------
// tiny pixel helpers
// ---------------------------------------------------------------------
// one filled pixel block
function px(g, x, y, w, h, c) {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}

// darken (f<1, toward green-black) or lighten (f>1, toward dirty bone) a hex color
function shadeC(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let gg = (n >> 8) & 255;
  let b = n & 255;
  const k = f < 1 ? 1 - f : f - 1;
  const tr = f < 1 ? 10 : 204;
  const tg = f < 1 ? 14 : 206;
  const tb = f < 1 ? 11 : 182;
  r = Math.round(r + (tr - r) * k);
  gg = Math.round(gg + (tg - gg) * k);
  b = Math.round(b + (tb - b) * k);
  return 'rgb(' + r + ',' + gg + ',' + b + ')';
}

// pixel line, w px thick
function pline(g, x0, y0, x1, y1, w, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  if (n === 0) {
    px(g, x0, y0, w, 1, c);
    return;
  }
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + (x1 - x0) * i / n);
    const y = Math.round(y0 + (y1 - y0) * i / n);
    px(g, x, y, w, 1, c);
  }
}

// snap world coords to the 4-unit pixel grid
function snap4(v) {
  return Math.round(v / 4) * 4;
}

// small seeded rng so cached art is stable
function lcg(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// sprite cache
const SPR = {};
function getSpr(key, fn) {
  if (!SPR[key]) SPR[key] = fn();
  return SPR[key];
}

// pale ghost copy: keep near-black pixels (hollow eyes), wash the rest blue-green white
function paleCopy(s) {
  const cv = makeCanvas(s.cv.width, s.cv.height);
  const g = cv.getContext('2d');
  g.drawImage(s.cv, 0, 0);
  const id = g.getImageData(0, 0, cv.width, cv.height);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const L = (d[i] + d[i + 1] + d[i + 2]) / 3;
    if (L < 18) continue;                         // keep hollow black
    const v = 120 + L * 0.7;                      // lift toward pale
    d[i] = Math.min(255, v * 0.92);
    d[i + 1] = Math.min(255, v);
    d[i + 2] = Math.min(255, v * 0.95);
  }
  g.putImageData(id, 0, 0);
  return { cv: cv, ox: s.ox, oy: s.oy };
}

// draw a cached sprite anchored at its feet, at 4x, optionally flipped
function blit(g, s, x, y, flip) {
  g.save();
  g.imageSmoothingEnabled = false;
  g.translate(snap4(x), snap4(y));
  if (flip < 0) g.scale(-1, 1);
  g.drawImage(s.cv, -s.ox * 4, -s.oy * 4, s.cv.width * 4, s.cv.height * 4);
  g.restore();
}

// soft dark oval under a character
function footShadow(g, x, y, rx, a) {
  ellipse(g, snap4(x), snap4(y), rx, rx * 0.22, 'rgba(0,0,0,' + a.toFixed(2) + ')');
  ellipse(g, snap4(x), snap4(y), rx * 0.55, rx * 0.14, 'rgba(0,0,0,' + (a * 0.8).toFixed(2) + ')');   // dark contact core
}

// ---------------------------------------------------------------------
// members
// ---------------------------------------------------------------------
// one family member
function makeMember(id, name, x, y, fear, h, speed, item, pitch) {
  return {
    id: id, name: name, x: x, y: y, fear: fear, h: h, speed: speed, item: item, pitch: pitch,
    state: 'idle', path: [], idleT: rand(1.5, 4), facing: Math.random() < 0.5 ? 1 : -1,
    walkPhase: 0, jumpT: 0, hairT: 0, bangT: 0, scaredAgo: 99, stareT: 0,
    hasItem: true, itemT: 0, seed: rand(0, 10),
  };
}

// floor point inside the first room found from ids, else fallback
function roomSpot(ids, fx, fy) {
  if (typeof roomById === 'function') {
    for (let i = 0; i < ids.length; i++) {
      const r = roomById(ids[i]);
      if (r) return { x: r.x + r.w * 0.5 + rand(-r.w * 0.2, r.w * 0.2), y: r.y + r.h };
    }
  }
  return { x: fx, y: fy };
}

// the family in their starting rooms
function makeFamily() {
  const dp = roomSpot(['kitchen', 'dining', 'living'], 230, 640);
  let mp = roomSpot(['master', 'bedroom', 'nursery', 'attic'], 400, 380);
  let kp = roomSpot(['living', 'hall'], 590, 640);
  const gp = roomSpot(['hall', 'foyer', 'living'], 980, 640);
  // kid starts in the ghost's room
  if (typeof GHOST_START !== 'undefined' && typeof roomAt === 'function') {
    const r = roomAt(GHOST_START.x, GHOST_START.y);
    if (r) kp = { x: clamp(GHOST_START.x + 140, r.x + 40, r.x + r.w - 40), y: r.y + r.h };
  }
  const list = [];
  list.push(makeMember('dad', 'Dad', dp.x, dp.y, 0, 136, 72, 'mug', 0.75));
  list.push(makeMember('mom', 'Mom', mp.x, mp.y, 0, 128, 72, 'book', 1.05));
  list.push(makeMember('kid', 'Kid', kp.x, kp.y, 60, 88, 88, 'teddy', 1.35));
  list.push(makeMember('dog', 'Dog', gp.x, gp.y, 0, 48, 95, 'bone', 1.7));
  list[2].idleT = 9;                              // kid lingers near the ghost
  return list;
}

// item pixels held at a hand point
function itemPx(g, item, hx, hy) {
  if (item === 'mug') {
    px(g, hx, hy - 2, 2, 2, '#aeac98');
    px(g, hx + 2, hy - 1, 1, 1, '#8a8876');
  } else if (item === 'book') {
    px(g, hx, hy - 2, 3, 3, '#4a1212');
    px(g, hx, hy - 2, 1, 3, '#9a9480');
  } else if (item === 'teddy') {
    px(g, hx, hy - 3, 3, 3, '#5a4a30');
    px(g, hx, hy - 4, 1, 1, '#5a4a30');
    px(g, hx + 2, hy - 4, 1, 1, '#5a4a30');
  } else if (item === 'flash') {
    px(g, hx, hy - 1, 3, 2, '#34342e');
    px(g, hx + 3, hy - 1, 1, 2, '#d0c48a');
  } else if (item === 'lantern') {
    px(g, hx, hy, 1, 1, '#1a1a14');
    px(g, hx - 1, hy + 1, 3, 4, '#c8a850');
    px(g, hx - 1, hy + 1, 3, 1, '#22221a');
    px(g, hx - 1, hy + 4, 3, 1, '#22221a');
  } else {
    px(g, hx, hy - 1, 4, 1, '#aeaa92');
    px(g, hx, hy - 2, 1, 3, '#aeaa92');
    px(g, hx + 3, hy - 2, 1, 3, '#aeaa92');
  }
}

// held item icon (world space, e.g. a dropped item flying)
function drawItem(g, item, x, y, rot) {
  const s = getSpr('item' + item, function () {
    const cv = makeCanvas(8, 8);
    itemPx(cv.getContext('2d'), item, 2, 5);
    return { cv: cv, ox: 4, oy: 4 };
  });
  g.save();
  g.imageSmoothingEnabled = false;
  g.translate(snap4(x), snap4(y));
  g.rotate(rot || 0);
  g.drawImage(s.cv, -16, -16, 32, 32);
  g.restore();
}

// is this member visibly panicking
function isScared(m) {
  return m.jumpT > 0 || m.state === 'flee' || m.state === 'terrified' || m.fear > 75;
}

// build one human frame, side view facing right (or front when 'stare')
function buildHuman(id, pose, f, item) {
  const s = HSPEC[id];
  const p = COLS[id];
  const cw = 22;
  const ch = s.hgt + 7;
  const cv = makeCanvas(cw, ch);
  const g = cv.getContext('2d');
  const cx = 10;
  const foot = ch - 1;
  const front = pose === 'stare';
  let stride = 0;
  let lean = 0;
  let bob = 0;
  let up = false;
  let breath = 0;
  let mouth = false;
  if (pose === 'idle') breath = f;
  if (pose === 'walk') {
    stride = [2, 0, -2, 0][f];
    bob = f % 2 ? -1 : 0;
  }
  if (pose === 'flee') {
    stride = f ? -3 : 3;
    lean = 1;
    up = true;
    mouth = true;
  }
  if (pose === 'scared') {
    stride = 2;
    up = true;
    mouth = true;
  }
  const legH = Math.round(s.hgt * s.legF);
  const top = ch - s.hgt + bob;
  const headTop = top + breath;
  const shY = top + s.headH + 1;
  const hipY = foot - legH + bob;
  const torsoH = hipY - shY;
  const armLen = Math.round(torsoH * 0.95);
  const armW = s.hgt > 30 ? 2 : 1;
  const tx = cx - (s.tw >> 1) + lean;
  // legs: back one darker
  const hipF = front ? cx + 1 : cx + lean;
  const hipB = front ? cx - 2 : cx - 1 + lean;
  const footF = front ? cx + 1 : cx + stride;
  const footB = front ? cx - 2 : cx - stride - 1;
  pline(g, hipB, hipY, footB, foot - 1, s.lw, shadeC(p.pants, 0.6));
  px(g, footB, foot, front ? 2 : 3, 1, shadeC(p.shoe, 0.7));
  pline(g, hipF, hipY, footF, foot - 1, s.lw, p.pants);
  px(g, footF, foot, front ? 2 : 3, 1, p.shoe);
  // hand targets
  const shX = tx + (s.tw >> 1);
  const swing = -stride;
  let bh = { x: shX - swing, y: shY + armLen };
  let fh = { x: shX + swing, y: shY + armLen };
  const holding = item && !up && !front;
  if (holding) fh = { x: shX + 3, y: shY + armLen - 3 };
  if (up) {
    bh = { x: shX - 2, y: shY - 5 - (f % 2) };
    fh = { x: shX + 2, y: shY - 6 + (f % 2) };
  }
  // back arm behind the torso
  if (!front) {
    pline(g, shX, shY + 1, bh.x, bh.y, armW, shadeC(p.shirt, 0.55));
    px(g, bh.x, bh.y, 1, 1, shadeC(p.skin, 0.6));
  }
  // torso (dress / coat flares out)
  if (s.dress) {
    const end = hipY + Math.round(legH * s.dress);
    for (let y = shY; y <= end; y++) {
      const w = s.tw + Math.floor((y - shY) / 4);
      const x0 = cx - (w >> 1) + lean;
      px(g, x0, y, w, 1, p.shirt);
      px(g, x0, y, 1, 1, shadeC(p.shirt, 0.6));
      px(g, x0 + w - 1, y, 1, 1, shadeC(p.shirt, 1.35));
    }
  } else {
    px(g, tx, shY, s.tw, torsoH, p.shirt);
    px(g, tx + 1, shY, 1, torsoH, shadeC(p.shirt, 0.8));          // mid tone
    px(g, tx, shY, 1, torsoH, shadeC(p.shirt, 0.6));
    px(g, tx + s.tw - 1, shY, 1, torsoH, shadeC(p.shirt, 1.3));   // light rim
    px(g, tx, shY, s.tw, 1, shadeC(p.shirt, 0.7));                // chin shadow
    px(g, tx, hipY - 1, s.tw, 1, shadeC(p.pants, 0.8));
  }
  // neck
  px(g, cx + lean, shY - 1, 2, 1, shadeC(p.skin, 0.7));
  // head
  const hx = front ? cx - (s.headW >> 1) : cx - (s.headW >> 1) + lean + 1;
  const hd = p.hair;
  if (s.hair === 'long') {
    if (front) px(g, hx - 1, headTop, s.headW + 2, s.headH + 5, hd);
    else px(g, hx - 1, headTop + 1, 2, s.headH + 5, hd);
  }
  px(g, hx, headTop, s.headW, s.headH, p.skin);
  px(g, hx, headTop + s.headH - 1, s.headW, 1, shadeC(p.skin, 0.75));
  if (!front) {
    px(g, hx, headTop, 1, s.headH, shadeC(p.skin, 0.7));
    px(g, hx + s.headW - 1, headTop + 1, 1, s.headH - 2, shadeC(p.skin, 1.25));
    px(g, hx + s.headW, headTop + 3, 1, 1, p.skin);
  }
  // hair styles
  if (s.hair === 'short') {
    px(g, hx, headTop - 1, s.headW, 2, hd);
    if (!front) px(g, hx, headTop, 2, 3, hd);
  } else if (s.hair === 'long') {
    px(g, hx - 1, headTop - 1, s.headW + 1, 2, hd);
    if (!front) px(g, hx - 1, headTop, 2, s.headH, hd);
  } else if (s.hair === 'messy') {
    px(g, hx - 1, headTop - 1, s.headW + 1, 2, hd);
    px(g, hx, headTop - 2, 1, 1, hd);
    px(g, hx + 2, headTop - 2, 1, 1, hd);
    if (!front) px(g, hx - 1, headTop + 1, 2, 2, hd);
  } else if (s.hair === 'hat') {
    px(g, hx - 2, headTop, s.headW + 4, 1, hd);
    px(g, hx, headTop - 3, s.headW, 3, hd);
    px(g, hx, headTop - 1, s.headW, 1, '#3a2a1a');
  }
  // hair on end in terror
  if (up && s.hair !== 'hat') {
    px(g, hx, headTop - 3, 1, 2, hd);
    px(g, hx + 2, headTop - 4, 1, 3, hd);
    px(g, hx + 4, headTop - 3, 1, 2, hd);
  }
  // face
  if (front) {
    px(g, hx + 1, headTop + 2, 1, 2, '#000');
    px(g, hx + s.headW - 2, headTop + 2, 1, 2, '#000');
    px(g, hx + 1, headTop + 4, 1, 2, GORE);
    px(g, hx + (s.headW >> 1), headTop + s.headH - 2, 1, 1, '#120404');
  } else {
    px(g, hx + s.headW - 2, headTop + 2, 1, 1, up ? '#d4d2ba' : '#0a0c08');
    if (mouth) px(g, hx + s.headW - 1, headTop + s.headH - 2, 1, 1, '#140404');
  }
  // front arm(s)
  if (front) {
    px(g, tx - 1, shY + 1, 1, armLen, shadeC(p.shirt, 0.6));
    px(g, tx + s.tw, shY + 1, 1, armLen, shadeC(p.shirt, 1.2));
    px(g, tx - 1, shY + armLen + 1, 1, 1, p.skin);
    px(g, tx + s.tw, shY + armLen + 1, 1, 1, p.skin);
  } else {
    pline(g, shX, shY + 1, fh.x, fh.y, armW, shadeC(p.shirt, 1.1));
    px(g, fh.x, fh.y, armW, 1, p.skin);
    if (holding) itemPx(g, item, fh.x + 1, fh.y);
  }
  return { cv: cv, ox: cx, oy: ch };
}

// build one dog frame, side view facing right (or front when 'stare')
function buildDog(pose, f, bone) {
  const p = COLS.dog;
  const cv = makeCanvas(24, 14);
  const g = cv.getContext('2d');
  const dk = p.hair;
  if (pose === 'stare') {
    px(g, 9, 7, 6, 4, shadeC(p.skin, 0.8));
    px(g, 9, 11, 2, 3, p.skin);
    px(g, 13, 11, 2, 3, p.skin);
    px(g, 9, 1, 6, 6, p.skin);
    px(g, 8, 0, 1, 3, dk);
    px(g, 15, 0, 1, 3, dk);
    px(g, 10, 3, 1, 2, '#000');
    px(g, 13, 3, 1, 2, '#000');
    px(g, 11, 5, 2, 2, shadeC(p.skin, 0.85));
    px(g, 11, 5, 2, 1, '#080808');
    return { cv: cv, ox: 12, oy: 14 };
  }
  const scared = pose === 'scared' || pose === 'flee';
  let run = 0;
  if (pose === 'walk') run = [1, 0, -1, 0][f];
  if (pose === 'flee') run = f ? -2 : 2;
  // legs: back pair darker
  const lx = [6, 8, 15, 17];
  for (let i = 0; i < 4; i++) {
    const off = i % 2 === 0 ? run : -run;
    pline(g, lx[i], 9, lx[i] + off, 13, 1, i % 2 ? shadeC(p.skin, 0.55) : p.skin);
  }
  // tail
  if (scared) pline(g, 5, 7, 3, 10, 1, dk);
  else pline(g, 5, 5, 2, 2 + (f % 2), 1, dk);
  // body
  px(g, 5, 5, 13, 5, p.skin);
  px(g, 6, 9, 11, 1, shadeC(p.skin, 0.65));
  px(g, 5, 5, 13, 1, shadeC(p.skin, 1.25));
  // head and snout
  px(g, 16, 2, 5, 5, p.skin);
  px(g, 21, 4, 3, 2, p.skin);
  px(g, 23, 4, 1, 1, '#080808');
  px(g, 16, 1, 2, 3, dk);
  px(g, 19, 3, 1, 1, scared ? '#d4d2ba' : '#0a0c08');
  // hackles up
  if (scared) {
    px(g, 7, 4, 1, 1, dk);
    px(g, 9, 3, 1, 2, dk);
    px(g, 11, 4, 1, 1, dk);
    px(g, 13, 3, 1, 2, dk);
  }
  if (bone && !scared) px(g, 21, 6, 4, 1, '#aeaa92');
  return { cv: cv, ox: 12, oy: 14 };
}

// pick the sprite for a member's current state
function memberSprite(m, pale) {
  let pose = 'idle';
  let f = Math.floor(globalT * 1.2 + m.seed) % 2;
  const wp = Math.floor(m.walkPhase / (Math.PI / 2));
  if (pale || m.state === 'stare') pose = 'stare';
  else if (m.jumpT > 0 || m.state === 'terrified') pose = 'scared';
  else if (m.state === 'flee') pose = 'flee';
  else if (m.state === 'walk') pose = 'walk';
  if (pose === 'walk') f = ((wp % 4) + 4) % 4;
  if (pose === 'flee') f = ((wp % 2) + 2) % 2;
  if (pose === 'stare' || pose === 'scared') f = 0;
  const item = m.hasItem && (pose === 'idle' || pose === 'walk') ? m.item : '';
  const key = m.id + pose + f + item;
  const base = getSpr(key, function () {
    if (m.id === 'dog') return buildDog(pose, f, item);
    return buildHuman(m.id, pose, f, item);
  });
  if (!pale) return { s: base, front: pose === 'stare' };
  return { s: getSpr('pale' + key, function () { return paleCopy(base); }), front: true };
}

// fear pips + red '!' marks above a head (pixel shapes, no text)
function drawFearPips(g, m, x, top) {
  if (m.fear > 1) {
    const n = Math.ceil(clamp(m.fear, 0, 100) / 20);
    let col = '#6a6e5c';
    if (m.fear >= 50) col = '#8a7a3a';
    if (m.fear >= 80) col = GORE;
    const x0 = snap4(x) - 28;
    const y0 = snap4(top) - 16;
    px(g, x0 - 4, y0 - 4, 64, 12, 'rgba(6,8,6,0.8)');
    for (let i = 0; i < 5; i++) px(g, x0 + i * 12, y0, 8, 4, i < n ? col : '#1c1f1a');
  }
  if (m.bangT > 0) {
    const by = snap4(top - 28 - Math.abs(Math.sin(globalT * 14)) * 8);
    const bx = snap4(x);
    px(g, bx - 12, by - 24, 8, 16, '#9a1010');
    px(g, bx - 12, by - 4, 8, 4, '#9a1010');
    px(g, bx + 4, by - 24, 8, 16, '#9a1010');
    px(g, bx + 4, by - 4, 8, 4, '#9a1010');
  }
}

// any member, normal or as a pale ghost
function drawMember(g, m, pale) {
  if (m.state === 'gone' && !pale) return;
  let lift = 0;
  if (m.jumpT > 0) lift = Math.sin((1 - m.jumpT / 0.6) * Math.PI) * 48;
  if (pale) lift = 22 + Math.sin(globalT * 1.8 + m.seed) * 7;
  const sp = memberSprite(m, pale);
  const wide = m.id === 'dog' ? 40 : 28;
  g.save();
  if (pale) g.globalAlpha = 0.5 + Math.sin(globalT * 3 + m.seed) * 0.08;
  footShadow(g, m.x, m.y, wide, pale ? 0.2 : clamp(0.55 - lift / 160, 0.15, 0.55));
  blit(g, sp.s, m.x, m.y - lift, sp.front ? 1 : m.facing);
  g.restore();
  if (!pale) drawFearPips(g, m, m.x, m.y - lift - m.h);
}

// ---------------------------------------------------------------------
// player ghost: dirty sheet with eye holes
// ---------------------------------------------------------------------
function buildGhost(f, face) {
  const cv = makeCanvas(16, 21);
  const g = cv.getContext('2d');
  // a sheet draped over someone: small skull bump, pinched neck, slumped shoulders
  const half = [2, 3, 3, 3, 3, 3, 2, 4, 5, 6, 6, 6, 6, 7, 7, 7, 7, 7];
  const base = '#8e907e';
  for (let y = 0; y < half.length; y++) {
    const w = half[y];
    let sh = y < 7 ? face : 0;                   // head leans toward travel
    if (f && y > 11) sh = 1;                      // hem drags behind
    const x0 = 8 - w + sh;
    px(g, x0, y, w * 2, 1, base);
    px(g, x0, y, 1, 1, '#34362c');                // shadow side
    if (w > 2) px(g, x0 + 1, y, 1, 1, '#5e6052');
    px(g, x0 + w * 2 - 1, y, 1, 1, '#bfc0aa');    // dirty light rim
    // hanging fold lines
    if (y > 8) {
      px(g, x0 + Math.floor(w * 0.7), y, 1, 1, '#686a5a');
      px(g, x0 + Math.floor(w * 1.4), y, 1, 1, '#727464');
    }
  }
  // torn hem: uneven strips, some long, some missing
  for (let x = 1; x < 15; x++) {
    const len = (x * 7 + f * 3) % 4;
    if (len === 0) continue;
    px(g, x + f, 18, 1, len, x < 6 ? '#4e5044' : '#727464');
  }
  px(g, 3 + f, 18, 1, 3, '#3e0505');             // hem soaked in old blood
  px(g, 11 + f, 17, 2, 2, '#3e0505');
  // grime and rot blotches
  px(g, 4, 12, 2, 2, '#5c5e4e');
  px(g, 10, 14, 2, 1, '#5c5e4e');
  px(g, 9, 9, 1, 2, '#5c5e4e');
  px(g, 5, 15, 1, 2, '#3e0505');
  // eye holes: uneven, the right one sags, streaks running down
  const ex = 8 + face;
  px(g, ex - 2, 2, 1, 2, '#020202');
  px(g, ex + 1, 2, 1, 3, '#020202');
  px(g, ex - 2, 4, 1, 2, '#2c2a22');
  px(g, ex + 1, 5, 1, 2, '#3e0505');
  // torn mouth slit
  px(g, ex - 1, 5, 1, 1, '#020202');
  return { cv: cv, ox: 8, oy: 10 };
}

// the player ghost
function drawGhost(g, x, y, face, tilt) {
  const bob = Math.sin(globalT * 3) * 6;
  const f = Math.floor(globalT * 2.5) % 2;
  const fc2 = face < 0 ? -1 : 1;
  const s = getSpr('ghost' + f + fc2, function () { return buildGhost(f, fc2); });
  g.save();
  g.imageSmoothingEnabled = false;
  g.translate(snap4(x), snap4(y + bob));
  g.rotate(tilt || 0);
  g.globalAlpha = 0.9;
  g.drawImage(s.cv, -s.ox * 4, -s.oy * 4, 64, 84);
  g.restore();
}

// fading ghost trail: faint drifting pixel motes
function drawTrail(g) {
  const n = trail.length;
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const sz = k > 0.6 ? 8 : 4;
    px(g, snap4(trail[i].x), snap4(trail[i].y + 20), sz, sz, 'rgba(150,158,140,' + (k * 0.22).toFixed(3) + ')');
  }
}

// ---------------------------------------------------------------------
// ending girl, hunter, crawler
// ---------------------------------------------------------------------
// the living girl with her flashlight
function drawGirl(g, x, y, face) {
  const fl = Math.random() < 0.05 ? 0.08 : 0.3;
  const hx = x + face * 28;
  const hy = y - 48;
  // dirty yellow beam
  g.save();
  g.globalCompositeOperation = 'lighter';
  const bm = g.createLinearGradient(hx, hy, hx + face * 320, hy);
  bm.addColorStop(0, 'rgba(190,170,100,' + fl + ')');
  bm.addColorStop(1, 'rgba(190,170,100,0)');
  poly(g, [hx, hy, hx + face * 320, hy - 90, hx + face * 320, hy + 70], bm);
  g.restore();
  const s = getSpr('girl', function () { return buildHuman('girl', 'idle', 0, 'flash'); });
  footShadow(g, x, y, 24, 0.5);
  blit(g, s, x, y, face);
}

// exorcist / medium with a lantern; h = {x, y, facing, t, state}
function drawHunter(g, h) {
  const st = h.state || 'walk';
  let pose = 'walk';
  let f = (Math.floor((h.t || 0) * 3) % 2) * 2;
  if (st === 'chant' || st === 'banish' || st === 'ritual' || st === 'exorcise') pose = 'scared';
  else if (st === 'idle' || st === 'wait' || st === 'listen') pose = 'idle';
  if (pose !== 'walk') f = 0;
  const s = getSpr('hunter' + pose + f, function () { return buildHuman('hunter', pose, f, 'lantern'); });
  const face = h.facing < 0 ? -1 : 1;
  // lantern glow
  const lx = h.x + face * 24;
  const ly = h.y - 56;
  const fl = 0.28 + Math.sin((h.t || 0) * 17) * 0.04 + Math.random() * 0.03;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(lx, ly, 4, lx, ly, 180);
  gr.addColorStop(0, 'rgba(180,150,80,' + fl.toFixed(3) + ')');
  gr.addColorStop(1, 'rgba(180,150,80,0)');
  g.fillStyle = gr;
  g.fillRect(lx - 180, ly - 180, 360, 360);
  g.restore();
  footShadow(g, h.x, h.y, 30, 0.6);
  blit(g, s, h.x, h.y, face);
}

// pale emaciated crawling woman, hair over face (2 frames)
function buildCrawler(f) {
  const cv = makeCanvas(32, 16);
  const g = cv.getContext('2d');
  const sk = '#b4b8a6';
  const md = '#8c907e';
  const dk = '#5e6254';
  const hr = '#050605';
  // shins along the floor, feet trailing
  px(g, 1, 14, 8, 2, md);
  px(g, 0, 13, 2, 1, dk);
  // thigh up to raised hips
  pline(g, 7, 13, 9, 8, 2, md);
  px(g, 8, 7, 4, 3, sk);
  // torso sloping down, spine and ribs showing
  pline(g, 10, 8, 21, 10, 3, sk);
  pline(g, 10, 10, 21, 12, 1, dk);
  px(g, 13, 8, 1, 1, dk);
  px(g, 15, 8, 1, 1, dk);
  px(g, 17, 9, 1, 1, dk);
  // back arm
  pline(g, 20, 11, 22 - f, 15, 1, dk);
  px(g, 21 - f, 15, 2, 1, dk);
  // front arm reaching
  if (f) {
    pline(g, 22, 10, 28, 13, 1, sk);
    pline(g, 28, 13, 29, 15, 1, sk);
    px(g, 29, 15, 3, 1, sk);
  } else {
    pline(g, 22, 10, 26, 15, 1, sk);
    px(g, 26, 15, 3, 1, sk);
  }
  // head hidden under long black hair to the floor
  px(g, 22, 10 + f, 4, 4, md);
  px(g, 21, 8 + f, 6, 3, hr);
  px(g, 22, 8 + f, 3, 1, '#1c1e1a');
  for (let x = 21; x < 28; x++) px(g, x, 11 + f, 1, 2 + ((x * 5 + f) % 4), hr);
  if (!f) px(g, 25, 12, 1, 1, '#d4d2ba');      // one eye through the hair
  px(g, 24, 15, 3, 1, GORE_DK);
  return { cv: cv, ox: 16, oy: 16 };
}

// crawling apparition (world space); facing optional (default right)
function drawCrawler(g, x, y, t, alpha, facing) {
  const f = Math.floor(t * 2.2) % 2;
  const s = getSpr('crawl' + f, function () { return buildCrawler(f); });
  const tw = Math.sin(t * 13) > 0.92 ? 4 : 0;   // rare twitch
  g.save();
  g.globalAlpha = alpha === undefined ? 1 : clamp(alpha, 0, 1);
  footShadow(g, x, y, 56, 0.5);
  blit(g, s, x + tw, y, facing < 0 ? -1 : 1);
  g.restore();
}

// ---------------------------------------------------------------------
// jump-scare faces (SCREEN space): 160x90 pixel art, cached, scaled x8
// ---------------------------------------------------------------------
function buildScream(id, pale) {
  const cv = makeCanvas(160, 90);
  const g = cv.getContext('2d');
  const img = g.createImageData(160, 90);
  const d = img.data;
  const R = lcg(id.length * 977 + (pale ? 31 : 7));
  const dog = id === 'dog';
  const skin = pale ? [190, 204, 194] : (dog ? [112, 100, 72] : [152, 146, 118]);
  const hair = pale ? [70, 82, 76] : (id === 'kid' ? [62, 54, 40] : [20, 20, 16]);
  const bl = pale ? [34, 8, 8] : [122, 10, 10];
  // write one pixel
  function put(x, y, c, k) {
    if (x < 0 || y < 0 || x >= 160 || y >= 90) return;
    const i = (y * 160 + x) * 4;
    d[i] = c[0] * k;
    d[i + 1] = c[1] * k;
    d[i + 2] = c[2] * k;
    d[i + 3] = 255;
  }
  // inside an ellipse?
  function inE(x, y, cx, cy, rx, ry) {
    const nx = (x - cx) / rx;
    const ny = (y - cy) / ry;
    return nx * nx + ny * ny;
  }
  const rx = dog ? 38 : 32;
  const ry = dog ? 40 : 44;
  for (let y = 0; y < 90; y++) {
    for (let x = 0; x < 160; x++) {
      // long hair framing (mom) / ears (dog)
      if (id === 'mom' && Math.abs(x - 80) < 40 && y > 4 && inE(x, y, 80, 46, 40, 60) < 1) put(x, y, hair, 0.8 + R() * 0.3);
      if (dog && (inE(x, y, 40, 30, 10, 26) < 1 || inE(x, y, 120, 30, 10, 26) < 1)) put(x, y, [60, 50, 34], pale ? 2.4 : 1);
      const e = inE(x, y, 80, 46, rx, ry);
      if (e > 1) continue;
      // banded shading, light from the left
      let k = 1.05 - 0.45 * e - 0.25 * (x - 80) / rx + (R() - 0.5) * 0.08;
      k = Math.round(k * 5) / 5;
      put(x, y, skin, clamp(k, 0.2, 1.2));
      // hair cap on top
      if (!dog && y < 46 - ry * 0.55 + Math.sin(x * 0.7) * 2) put(x, y, hair, 0.7 + R() * 0.4);
    }
  }
  // hair standing up in terror
  if (!dog) {
    for (let x = 52; x < 108; x += 3) {
      const len = 3 + Math.floor(R() * 6);
      for (let j = 0; j < len; j++) put(x, 6 - j, hair, 0.8);
    }
  }
  // cracks in the skin
  for (let c = 0; c < 7; c++) {
    let x = 58 + Math.floor(R() * 44);
    let y = 20 + Math.floor(R() * 50);
    for (let j = 0; j < 14; j++) {
      put(x, y, skin, 0.35);
      x += Math.floor(R() * 3) - 1;
      y += R() < 0.6 ? 1 : 0;
    }
  }
  // hollow eye sockets
  const eyes = [[66, 38], [94, 38]];
  for (let i = 0; i < 2; i++) {
    const ex = eyes[i][0];
    const ey = eyes[i][1];
    for (let y = ey - 12; y <= ey + 12; y++) {
      for (let x = ex - 11; x <= ex + 11; x++) {
        const e = inE(x, y, ex, ey, 9, 10);
        if (e < 0.55) put(x, y, [4, 2, 2], 1);
        else if (e < 1) put(x, y, skin, 0.3);
      }
    }
    // brow furrow
    for (let x = ex - 9; x <= ex + 9; x++) put(x, ey - 10 + Math.floor(Math.abs(x - ex) / 4) * (i ? 1 : -1), skin, 0.3);
    // blood streaming down from the socket
    for (let s = 0; s < 4; s++) {
      const bx = ex - 4 + s * 3;
      const len = 12 + Math.floor(R() * 34);
      for (let j = 0; j < len; j++) {
        put(bx, ey + 6 + j, bl, j > len - 3 ? 0.6 : 1);
        if (R() < 0.3) put(bx + 1, ey + 6 + j, bl, 0.6);
      }
    }
  }
  // nose holes
  put(77, 56, [8, 4, 4], 1);
  put(83, 56, [8, 4, 4], 1);
  if (dog) {
    // snout and snarl with fangs
    for (let y = 52; y < 90; y++) {
      for (let x = 60; x < 100; x++) {
        if (inE(x, y, 80, 64, 16, 12) < 1) put(x, y, skin, 1.15);
        if (inE(x, y, 80, 74, 13, 9) < 1) put(x, y, [10, 2, 2], 1);
      }
    }
    for (let i = 0; i < 4; i++) {
      const fx = 70 + i * 6;
      for (let j = 0; j < 5; j++) put(fx + (j > 2 ? 1 : 0), 66 + j, [200, 194, 166], 1);
    }
    for (let x = 77; x < 84; x++) put(x, 57, [8, 6, 6], 1);
  } else {
    // stretched, torn mouth
    for (let y = 52; y < 90; y++) {
      for (let x = 66; x < 95; x++) {
        const e = inE(x, y, 80, 70, 10, 17);
        if (e < 0.8) put(x, y, [10, 2, 2], 1);
        else if (e < 1) put(x, y, bl, 0.7);
      }
    }
    // jagged teeth
    for (let x = 72; x < 89; x++) {
      if (x % 3 === 0) continue;
      put(x, 55, [196, 190, 160], 1);
      put(x, 56, [196, 190, 160], 0.85);
      put(x, 85, [170, 164, 136], 1);
    }
    // cheeks torn up toward the eyes
    for (let j = 0; j < 14; j++) {
      put(70 - j, 66 - Math.floor(j * 0.7), bl, 0.9);
      put(70 - j, 67 - Math.floor(j * 0.7), bl, 0.5);
      put(90 + j, 66 - Math.floor(j * 0.7), bl, 0.9);
      put(90 + j, 67 - Math.floor(j * 0.7), bl, 0.5);
    }
  }
  // blood pouring from the mouth and spatter
  for (let s = 0; s < 5; s++) {
    const bx = 74 + s * 3;
    for (let y = 82; y < 90; y++) put(bx, y, bl, 1);
  }
  for (let s = 0; s < 40; s++) put(50 + Math.floor(R() * 60), 20 + Math.floor(R() * 68), bl, 0.5 + R() * 0.5);
  // scalp wound: blood sheets down the forehead in uneven runs
  for (let x = 56; x < 104; x++) {
    if (R() < 0.35) continue;
    const len = 4 + Math.floor(R() * 22);
    for (let j = 0; j < len; j++) put(x, 12 + j, bl, j > len - 3 ? 0.55 : 0.9);
  }
  // nose bleed into the mouth
  for (let j = 0; j < 14; j++) {
    put(77, 57 + j, bl, 1);
    put(83, 57 + j, bl, 0.8);
  }
  // chin and jaw soaked, dripping off the bottom of the frame
  for (let y = 78; y < 90; y++) {
    for (let x = 58; x < 102; x++) {
      if (inE(x, y, 80, 92, 24, 16) < 1 && R() < 0.85) put(x, y, bl, 0.6 + R() * 0.4);
    }
  }
  // heavy spatter blobs across the whole face
  for (let s = 0; s < 26; s++) {
    const bx = 44 + Math.floor(R() * 72);
    const by = 8 + Math.floor(R() * 80);
    const r2 = 1 + Math.floor(R() * 2);
    for (let yy = -r2; yy <= r2; yy++) {
      for (let xx = -r2; xx <= r2; xx++) put(bx + xx, by + yy, bl, 0.7 + R() * 0.3);
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

// huge screaming close-up face (SCREEN space)
function drawScreamFace(g, id, cx, cy, s, pale, t) {
  const key = 'scream' + id + (pale ? 'p' : '');
  const cv = getSpr(key, function () { return buildScream(id, pale); });
  const k = 8 * s;
  const w = 160 * k * (1 + Math.sin(t * 37) * 0.03);
  const h = 90 * k * (1.06 + Math.sin(t * 29) * 0.04);
  g.save();
  g.imageSmoothingEnabled = false;
  g.drawImage(cv, Math.round(cx - w / 2 + rand(-6, 6)), Math.round(cy - h * 0.51 + rand(-6, 6)), Math.round(w), Math.round(h));
  g.restore();
}

// ---------------------------------------------------------------------
// HUD face portrait (SCREEN space), 12x12 pixel art per fear level
// ---------------------------------------------------------------------
function buildIcon(id, lvl) {
  const cv = makeCanvas(12, 12);
  const g = cv.getContext('2d');
  const c = COLS[id] || COLS.dad;
  const dog = id === 'dog';
  if (dog) {
    px(g, 1, 1, 2, 5, c.hair);
    px(g, 9, 1, 2, 5, c.hair);
    px(g, 3, 2, 6, 7, c.skin);
    px(g, 4, 7, 4, 3, shadeC(c.skin, 0.85));
    px(g, 5, 7, 2, 1, '#080808');
  } else {
    if (id === 'mom') px(g, 1, 2, 10, 9, c.hair);
    px(g, 3, 2, 6, 8, c.skin);
    px(g, 3, 2, 1, 8, shadeC(c.skin, 0.75));
    px(g, 2, 1, 8, 2, c.hair);
    if (id === 'kid') px(g, 3, 0, 1, 1, c.hair);
    if (id === 'kid') px(g, 6, 0, 1, 1, c.hair);
  }
  const my = dog ? 9 : 8;
  if (lvl === 0) {
    px(g, 4, 5, 1, 1, '#0a0a08');
    px(g, 7, 5, 1, 1, '#0a0a08');
    if (!dog) px(g, 5, my, 2, 1, '#3a2a20');
  } else if (lvl === 1) {
    px(g, 4, 4, 1, 2, '#d0cfb8');
    px(g, 7, 4, 1, 2, '#d0cfb8');
    px(g, 5, my, 2, 1, '#140404');
  } else {
    px(g, 4, 4, 1, 3, '#000');
    px(g, 7, 4, 1, 3, '#000');
    px(g, 5, my, 2, 2, '#000');
    px(g, 4, 7, 1, 3, GORE);
    px(g, 7, 7, 1, 2, GORE);
  }
  return cv;
}

// face icon for the HUD
function drawFaceIcon(g, m, x, y, r) {
  let lvl = 0;
  if (m.fear >= 40) lvl = 1;
  if (m.fear >= 75) lvl = 2;
  const cv = getSpr('icon' + m.id + lvl, function () { return buildIcon(m.id, lvl); });
  const sz = Math.round(r * 2);
  g.save();
  g.imageSmoothingEnabled = false;
  g.drawImage(cv, Math.round(x - r), Math.round(y - r), sz, sz);
  g.restore();
}
