"use strict";
// =====================================================================
// HAUNT OBJECTS (world space, chunky shapes, no text)
// =====================================================================
const BLOOD_C = '#5c0a0c';               // fresh blood
const BLOOD_D = '#3a0507';               // dried blood

// leave persistent gore once per trigger
function bleedOnce(o, k) {
  if (k <= 0) {
    o.bled = false;
    return;
  }
  if (o.bled || typeof addBlood !== 'function') return;
  o.bled = true;
  if (o.type === 'faucet') {
    addBlood(o.x - 40, o.y - 2, 40, 'smear');               // flood spills over the floor
    addBlood(o.x + 50, o.y - 2, 30, 'smear');
  } else if (o.type === 'mirror') {
    addBlood(o.x, o.y + 10, 22, 'drip');
  } else if (o.type === 'portrait') {
    addBlood(o.x, o.y + 4, 16, 'drip');
  } else if (o.type === 'plates') {
    addBlood(o.x, o.y + 30, 18, 'splat');
  } else if (o.type === 'bloodwall') {
    addBlood(o.x - 30 + Math.random() * 60, o.y - 60, 24, 'hand');
  } else if (o.type === 'crib' || o.type === 'doll') {
    addBlood(o.x, o.y - 4, 20, 'smear');
    addBlood(o.x + rand(-20, 20), o.y - 2, 18, 'pool');
  } else if (o.type === 'furnace' || o.type === 'closet') {
    addBlood(o.x + rand(-60, 60), o.y - 2, 16, 'drag');
  }
  // every scare sprays a little more onto the wall behind it (accumulates)
  addBlood(o.x + rand(-o.w * 0.6, o.w * 0.6), o.y - o.h * rand(0.4, 0.9), rand(8, 16), 'splat');
}

// floor-standing objects that need a contact shadow
const GROUNDED = { chair: 1, closet: 1, faucet: 1, crib: 1, tv: 1, piano: 1, coat: 1, furnace: 1, doll: 1 };

function drawObject(g, o) {
  const k = o.anim > 0 ? o.anim / 1.6 : 0;            // trigger strength 1 -> 0
  const t = globalT;
  bleedOnce(o, k);
  if (GROUNDED[o.type]) {
    ellipse(g, o.x, o.y - 2, o.w * 0.6, 12, 'rgba(0,0,0,0.6)');
    ellipse(g, o.x, o.y - 2, o.w * 0.35, 6, 'rgba(0,0,0,0.5)');
  }
  if (o.type === 'chair') {
    let a = Math.sin(t * 1.3) * 0.03;
    if (k > 0) a = Math.sin(t * 16) * 0.4 * k;
    g.save();
    g.translate(o.x, o.y - 4);
    g.rotate(a);
    rect(g, -40, -8, 80, 8, '#1e1a12');                    // rocker
    rect(g, -24, -44, 6, 40, '#2a2418');
    rect(g, 18, -44, 6, 40, '#2a2418');
    rect(g, -28, -48, 56, 8, '#332c1e');
    rect(g, -30, -104, 8, 60, '#2a2418');
    rect(g, -18, -98, 6, 52, '#2a2418');
    rect(g, -26, -96, 14, 44, '#3a1416');                   // stained blanket
    rect(g, 18, -64, 6, 20, '#2a2418');
    rect(g, -10, -66, 36, 6, '#2a2418');
    g.restore();
  } else if (o.type === 'closet') {
    const x0 = o.x - 38;
    const y0 = o.y - 150;
    rect(g, x0 - 6, y0 - 6, 88, 156, '#1a1710');
    rect(g, x0, y0, 76, 150, '#020202');
    let open = 0;
    if (k > 0) {
      const p = 1 - k;
      open = p < 0.15 ? p / 0.15 : (p > 0.75 ? (1 - p) / 0.25 : 1);
    }
    if (open > 0.3) {
      rect(g, o.x + 4, y0 + 46, 8, 4, '#c8c2a0');           // pale eyes in the dark
      rect(g, o.x + 24, y0 + 46, 8, 4, '#c8c2a0');
      rect(g, o.x - 20, y0 + 110, 30, 8, '#b8b4a4');        // fingers on the floor
    }
    const dw = 76 * (1 - open * 0.8);
    rect(g, x0, y0, dw, 150, '#2e2a1f');
    if (dw > 24) {
      rect(g, x0 + 8, y0 + 10, dw - 16, 4, '#1a1710');
      rect(g, x0 + 8, y0 + 76, dw - 16, 4, '#1a1710');
    }
    rect(g, x0 + dw - 12, y0 + 72, 6, 8, '#6a6040');
  } else if (o.type === 'mirror') {
    const cy = o.y - 44;
    rect(g, o.x - 34, cy - 44, 68, 88, '#2a2418');
    rect(g, o.x - 26, cy - 36, 52, 72, '#4a554f');
    rect(g, o.x - 18, cy - 28, 8, 20, '#6a756e');
    if (k > 0) rect(g, o.x - 26, cy - 36, 52, 72, 'rgba(200,210,200,' + (0.3 * k).toFixed(3) + ')');
    if (o.cool > 0) {
      // finger-smeared blood strokes and runs
      const reveal = clamp((COOLDOWN - o.cool) / 0.8, 0, 1);
      g.save();
      g.globalAlpha = clamp(o.cool / 0.6, 0, 1);
      rect(g, o.x - 20, cy - 24, 40 * reveal, 8, BLOOD_C);
      rect(g, o.x - 16, cy - 8, 32 * reveal, 8, BLOOD_C);
      rect(g, o.x - 12, cy + 8, 26 * reveal, 8, BLOOD_C);
      rect(g, o.x - 14, cy - 16, 4, 40 * reveal, BLOOD_D);
      rect(g, o.x + 8, cy, 4, 34 * reveal, BLOOD_D);
      g.restore();
    }
  } else if (o.type === 'faucet') {
    const x0 = o.x - 60;
    const y0 = o.y - 48;
    rect(g, x0 + 8, o.y - 8, 12, 8, '#1a1710');
    rect(g, x0 + 100, o.y - 8, 12, 8, '#1a1710');
    rect(g, x0, y0, 120, 40, '#5a5f57');                     // tub
    rect(g, x0 - 4, y0 - 4, 128, 8, '#6a6f66');
    rect(g, x0 + 106, y0 - 24, 6, 24, '#3a3d38');
    rect(g, x0 + 94, y0 - 24, 18, 6, '#3a3d38');
    if (o.cool > 0) {
      const lvl = clamp((COOLDOWN - o.cool) / 1.2, 0, 1) * clamp(o.cool / 0.8, 0, 1);
      rect(g, x0 + 4, y0, 112, 8 * lvl, BLOOD_C);            // tub brims with blood
      for (let i = 0; i < 6; i++) rect(g, x0 + 4 + i * 20, y0 + 4, 4, 30 * lvl * (0.5 + (i % 2) * 0.5), BLOOD_C);
      rect(g, x0 - 20, o.y - 4, 160 * lvl, 4, BLOOD_D);
    }
    if (k > 0) rect(g, x0 + 94, y0 - 18, 6, 20, BLOOD_C);
  } else if (o.type === 'plates') {
    rect(g, o.x - 56, o.y - 6, 112, 6, '#2a2418');
    rect(g, o.x - 46, o.y, 4, 12, '#1a1710');
    rect(g, o.x + 42, o.y, 4, 12, '#1a1710');
    if (o.cool <= 0) {
      for (let i = 0; i < 4; i++) {
        const px = o.x - 36 + i * 24;
        const py = o.y - 20 + Math.sin(t * 9 + i) * (o.near ? 2 : 0);
        rect(g, px - 12, py - 12, 24, 24, '#8a8d80');
        rect(g, px - 6, py - 6, 12, 12, '#6e7166');
      }
    } else {
      // shattered shards on the floor below
      const r = roomById(o.room);
      const fy = r ? r.floor : o.y + 120;
      for (let i = 0; i < 7; i++) rect(g, o.x - 50 + i * 16, fy - 8 - (i % 3) * 4, 8, 4, '#7a7d72');
    }
  } else if (o.type === 'lights') {
    const r = roomById(o.room);
    const top = r ? r.y : o.y - 160;
    const sway = k > 0 ? Math.sin(t * 9) * 0.25 * k : Math.sin(t * 0.8) * 0.03;
    g.save();
    g.translate(o.x, top);
    g.rotate(sway);
    const sy = o.y - top;
    rect(g, -2, 0, 4, sy - 40, '#0a0a08');
    if (!o.off) {
      const cone = g.createLinearGradient(0, sy - 14, 0, sy + 200);
      cone.addColorStop(0, 'rgba(170,150,90,0.22)');
      cone.addColorStop(1, 'rgba(170,150,90,0)');
      poly(g, [-20, sy - 14, 20, sy - 14, 100, sy + 200, -100, sy + 200], cone);
    }
    poly(g, [-12, sy - 40, 12, sy - 40, 28, sy - 14, -28, sy - 14], '#2c281c');
    rect(g, -6, sy - 16, 12, 12, o.off ? '#1a1a14' : '#b8a868');
    g.restore();
  } else if (o.type === 'tv') {
    rect(g, o.x - 40, o.y - 40, 80, 40, '#1e1a12');
    rect(g, o.x - 44, o.y - 108, 88, 68, '#151511');
    const sx0 = o.x - 36;
    const sy0 = o.y - 100;
    if (k > 0) {
      rect(g, sx0, sy0, 64, 52, '#6a6f68');
      for (let i = 0; i < 40; i++) {
        const v = Math.floor(Math.random() * 160);
        rect(g, sx0 + Math.floor(Math.random() * 15) * 4, sy0 + Math.floor(Math.random() * 12) * 4, 4, 4, 'rgb(' + v + ',' + (v + 8) + ',' + v + ')');
      }
      rect(g, o.x - 16, o.y - 86, 8, 12, '#000');             // face in the static
      rect(g, o.x + 4, o.y - 86, 8, 12, '#000');
      rect(g, o.x - 8, o.y - 66, 12, 16, '#000');
    } else {
      const b = 30 + Math.floor(Math.sin(t * 7) * 6 + Math.random() * 4);
      rect(g, sx0, sy0, 64, 52, 'rgb(' + (b - 6) + ',' + (b + 6) + ',' + (b - 2) + ')');
      rect(g, sx0, sy0 + Math.floor((t * 30) % 48), 64, 4, 'rgba(160,170,150,0.12)');
    }
  } else if (o.type === 'piano') {
    rect(g, o.x - 50, o.y - 110, 100, 110, '#16130d');
    rect(g, o.x - 54, o.y - 114, 108, 8, '#0e0c08');
    rect(g, o.x - 54, o.y - 62, 108, 6, '#0e0c08');
    rect(g, o.x - 48, o.y - 56, 96, 14, '#8a8a78');
    for (let i = 0; i < 12; i++) {
      const kx = o.x - 48 + i * 8;
      if (k > 0 && Math.random() < 0.35) rect(g, kx, o.y - 56, 8, 14, '#4a4a3e');
      if (i % 7 !== 2 && i % 7 !== 6) rect(g, kx + 4, o.y - 56, 4, 8, '#0a0a08');
    }
    if (k > 0) rect(g, o.x - 30, o.y - 52, 60, 4, BLOOD_C);    // bloody keys
    rect(g, o.x - 46, o.y - 42, 8, 42, '#0e0c08');
    rect(g, o.x + 38, o.y - 42, 8, 42, '#0e0c08');
  } else if (o.type === 'portrait') {
    const tilt = k > 0 ? Math.sin(t * 20) * 0.1 * k : 0.04;
    g.save();
    g.translate(o.x, o.y - 42);
    g.rotate(tilt);
    rect(g, -32, -40, 64, 80, '#3a321e');
    rect(g, -24, -32, 48, 64, '#1a1e17');
    rect(g, -20, 16, 40, 16, '#0e100c');
    rect(g, -12, -20, 24, 30, '#7a7660');
    rect(g, -14, -24, 28, 10, '#0e0c08');
    const look = Math.round(clamp((ghost.x - o.x) / 200, -1, 1)) * 2;
    if (k > 0) {
      rect(g, -8, -10, 4, 4, '#000');
      rect(g, 4, -10, 4, 4, '#000');
      rect(g, -8, -6, 4, 24 * (1 - k * 0.5), BLOOD_C);         // weeping blood
      rect(g, 4, -6, 4, 30 * (1 - k * 0.5), BLOOD_C);
    } else {
      rect(g, -8, -10, 4, 4, '#c8c2a8');
      rect(g, 4, -10, 4, 4, '#c8c2a8');
      rect(g, -8 + look, -10, 2, 4, '#000');
      rect(g, 4 + look, -10, 2, 4, '#000');
      if (o.cool > 0) {
        rect(g, -8, -6, 4, 18, BLOOD_D);
        rect(g, 4, -6, 4, 22, BLOOD_D);
      }
    }
    g.restore();
  } else if (o.type === 'coat') {
    const shk = k > 0 ? Math.sin(t * 30) * 0.12 * k : 0;
    g.save();
    g.translate(o.x, o.y);
    g.rotate(shk);
    rect(g, -16, -6, 32, 6, '#1a1710');
    rect(g, -3, -130, 6, 126, '#1a1710');
    poly(g, [-4, -118, -20, -106, -24, -50, 16, -50, 14, -106, 4, -118], '#24261f');
    if (k > 0) {
      const fl = Math.sin(t * 25) * 0.8;
      line(g, -18, -104, -18 - Math.cos(fl) * 26, -104 - Math.sin(fl) * 26, '#24261f', 8);
      line(g, 12, -104, 12 + Math.cos(fl) * 26, -104 + Math.sin(fl) * 26, '#24261f', 8);
    }
    rect(g, -18, -132, 36, 6, '#121210');
    rect(g, -10, -146, 20, 16, '#121210');
    g.restore();
  } else if (o.type === 'crib') {
    // crib rocks on its own; blanket hides a small shape
    const a = k > 0 ? Math.sin(t * 12) * 0.12 * k : Math.sin(t * 0.9) * 0.02;
    // mobile hanging from the ceiling, turning slowly (faster when triggered)
    const rm = roomById(o.room);
    const mt = rm ? rm.y + 24 : o.y - 300;
    const spin = t * (k > 0 ? 4 : 0.4);
    rect(g, o.x - 2, mt, 4, o.y - 150 - mt, '#0a0a08');
    rect(g, o.x - 40, o.y - 150, 80, 4, '#2a2418');
    for (let i = 0; i < 4; i++) {
      const mx = o.x + Math.cos(spin + i * 1.57) * 36;
      line(g, mx, o.y - 146, mx, o.y - 118 - (i % 2) * 8, '#0a0a08', 2);
      rect(g, mx - 6, o.y - 118 - (i % 2) * 8, 12, 12, i === 2 ? '#3a1416' : '#5a5a4c');
    }
    g.save();
    g.translate(o.x, o.y);
    g.rotate(a);
    rect(g, -56, -12, 112, 8, '#2a2418');
    rect(g, -56, -80, 8, 76, '#2a2418');
    rect(g, 48, -80, 8, 76, '#2a2418');
    rect(g, -48, -40, 96, 28, '#3c3a33');
    // old blood soaked into the mattress, running through the slats
    rect(g, -30, -40, 50, 10, BLOOD_D);
    rect(g, -20, -30, 30, 12, BLOOD_D);
    rect(g, -14, -18, 4, 14, BLOOD_D);
    rect(g, 8, -18, 4, 10, BLOOD_C);
    for (let i = 0; i < 7; i++) rect(g, -44 + i * 14, -76, 4, 36, '#2a2418');
    rect(g, -56, -80, 112, 6, '#2a2418');
    rect(g, -2, -76, 4, 30, BLOOD_D);                         // smeared slat
    if (k > 0) {
      rect(g, -12, -52, 24, 14, '#9a978a');                   // small pale hand
      rect(g, -8, -56, 4, 6, '#9a978a');
      rect(g, 0, -58, 4, 8, '#9a978a');
      rect(g, -10, -40, 20, 10, BLOOD_C);
      rect(g, -4, -4, 6, 30 * (1 - k), BLOOD_C);               // fresh drip to the floor
    }
    g.restore();
  } else if (o.type === 'furnace') {
    rect(g, o.x - 70, o.y - 170, 140, 170, '#1a1a15');
    rect(g, o.x - 20, o.y - 220, 40, 50, '#151511');
    rect(g, o.x - 40, o.y - 90, 80, 56, '#0a0806');
    const flare = k > 0 ? k : 0.25 + Math.sin(t * 3) * 0.08;
    rect(g, o.x - 34, o.y - 70, 68, 30, 'rgba(150,40,10,' + flare.toFixed(3) + ')');
    rect(g, o.x - 24, o.y - 60, 48, 16, 'rgba(190,120,40,' + (flare * 0.8).toFixed(3) + ')');
    for (let i = 0; i < 5; i++) rect(g, o.x - 38 + i * 16, o.y - 92, 6, 60, '#121210');   // grate
    if (k > 0) rect(g, o.x - 10, o.y - 74, 20, 12, '#6a665a');   // something inside reaching out
  } else if (o.type === 'doll') {
    // porcelain doll; head snaps toward the ghost when triggered
    rect(g, o.x - 14, o.y - 34, 28, 34, '#3a2a2a');
    rect(g, o.x - 20, o.y - 8, 40, 8, '#2a2020');
    g.save();
    g.translate(o.x, o.y - 44);
    if (k > 0) g.rotate(Math.PI * (0.5 + k * 0.5) * (ghost.x < o.x ? -1 : 1));
    rect(g, -12, -12, 24, 24, '#a8a494');
    rect(g, -14, -16, 28, 8, '#0c0a08');
    rect(g, -8, -4, 4, 4, '#000');
    rect(g, 4, -4, 4, 4, '#000');
    if (k > 0 || o.cool > 0) {
      rect(g, -8, 0, 4, 12, BLOOD_C);
      rect(g, 4, 0, 4, 10, BLOOD_C);
    }
    g.restore();
  } else if (o.type === 'bloodwall') {
    // patch of wall that seeps blood through the paper
    const cy = o.y - 50;
    const seep = o.cool > 0 ? clamp((COOLDOWN - o.cool) / 1, 0, 1) : 0;
    rect(g, o.x - 50, cy - 40, 100, 80, 'rgba(10,8,6,0.35)');
    if (seep > 0) {
      rect(g, o.x - 40, cy - 30, 80 * seep, 12, BLOOD_C);
      rect(g, o.x - 30, cy - 6, 64 * seep, 12, BLOOD_C);
      for (let i = 0; i < 5; i++) rect(g, o.x - 36 + i * 18, cy - 18, 4, 60 * seep * (0.4 + (i % 3) * 0.3), BLOOD_D);
    }
    if (k > 0) {
      rect(g, o.x - 6 + Math.sin(t * 30) * 4, cy - 36, 12, 70, 'rgba(90,10,12,' + (0.6 * k).toFixed(3) + ')');
    }
  }
}

// dim pixel brackets around a hauntable object (no glow, no text)
function drawHalo(g, o, nearest) {
  const x0 = o.x - o.w / 2 - 12;
  const y0 = o.y - o.h - 12;
  const x1 = o.x + o.w / 2 + 12;
  const y1 = o.y + 4;
  const ready = o.cool <= 0 && game.energy >= (typeof threatCost === 'function' ? threatCost(o) : COST);
  const a = nearest ? 0.55 + Math.sin(globalT * 3) * 0.15 : 0.18;
  const col = ready ? 'rgba(180,184,160,' + a.toFixed(3) + ')' : 'rgba(110,40,40,' + (a * 0.8).toFixed(3) + ')';
  rect(g, x0, y0, 16, 4, col);
  rect(g, x0, y0, 4, 16, col);
  rect(g, x1 - 16, y0, 16, 4, col);
  rect(g, x1 - 4, y0, 4, 16, col);
  rect(g, x0, y1 - 4, 16, 4, col);
  rect(g, x0, y1 - 16, 4, 16, col);
  rect(g, x1 - 16, y1 - 4, 16, 4, col);
  rect(g, x1 - 4, y1 - 16, 4, 16, col);
  if (o.cool > 0) {
    // cooldown bar: drained width shows remaining time
    const f = 1 - o.cool / COOLDOWN;
    rect(g, x0, y0 - 12, (x1 - x0) * f, 4, 'rgba(110,30,30,0.7)');
  }
}

// has someone in this object's room already seen its kind of trick (habit is per type, so another
// portrait elsewhere counts too)
function objSeen(o) {
  for (let i = 0; i < family.length; i++) {
    const m = family[i];
    if (m.state === 'gone' || m.state === 'flee' || !m.habit || !m.habit[o.type]) continue;
    const r = roomAt(m.x, m.y - 20);
    if (r && r.id === o.room) return true;
  }
  return false;
}

// closest object in a room (ready ones first, then ones they have not seen yet)
function nearestObject(room) {
  if (!room) return null;
  let best = null;
  let bestD = 1e9;
  for (let i = 0; i < OBJECTS.length; i++) {
    const o = OBJECTS[i];
    if (o.room !== room.id) continue;
    let d = Math.hypot(o.x - ghost.x, o.y - o.h / 2 - ghost.y);
    if (o.cool > 0) d += 5000;
    else if (objSeen(o)) d += 2500;                   // don't snap back to a spent trick while a fresh one is ready
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

// which object is under a click point (world coords)
function objectAt(px, py) {
  for (let i = 0; i < OBJECTS.length; i++) {
    const o = OBJECTS[i];
    if (px > o.x - o.w / 2 - 10 && px < o.x + o.w / 2 + 10 && py > o.y - o.h - 10 && py < o.y + 10) return o;
  }
  return null;
}

// front door on the right wall, swings outward
function drawDoor(g, open) {
  const x = DOOR.x;
  const top = DOOR.y - 150;
  rect(g, x, top, 20, 150, '#020302');
  if (open > 0.05) {
    // dirty porch light spills in
    poly(g, [x + 20, top, x + 20, DOOR.y, x + 160, DOOR.y + 8, x + 120, top + 40], 'rgba(150,135,80,' + (0.12 * open).toFixed(3) + ')');
  }
  poly(g, [x, top, x + 20 + open * 70, top - open * 12, x + 20 + open * 70, DOOR.y + open * 8, x, DOOR.y], '#2a1a14');
  rect(g, x + 6 + open * 60, top + 76, 6, 6, '#6a6040');
}
