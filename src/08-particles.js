"use strict";
// =====================================================================
// PARTICLES & POP TEXT
// =====================================================================
function addParticle(p) {
  p.max = p.life;
  if (p.rot === undefined) p.rot = 0;
  if (p.vr === undefined) p.vr = 0;
  if (p.g === undefined) p.g = 0;
  particles.push(p);
}

function pop(text, x, y, size, color, life) {
  pops.push({ text: text, x: x, y: y, size: size, color: color, t: 0, max: life || 1.4 });
}

function updateParticles(dt) {
  const keep = [];
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.life -= dt;
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    if (p.floor !== undefined && p.y >= p.floor) {
      p.y = p.floor;
      if (p.kind === 'blood' || p.kind === 'drip') {
        p.life = 0;                                   // lands as a stain
        if (typeof addBlood === 'function') addBlood(p.x, p.y, p.size || 6, 'splat');
      } else if (p.kind === 'plate') {
        p.life = 0;                                   // shatter
        for (let k = 0; k < 7; k++) {
          addParticle({ kind: 'shard', x: p.x, y: p.y - 2, vx: rand(-220, 220), vy: rand(-260, -80), g: 900, floor: p.floor, life: 2, rot: rand(0, 6), vr: rand(-10, 10) });
        }
      } else {
        p.vy = p.vy * -0.35;
        p.vx = p.vx * 0.6;
        p.vr = p.vr * 0.5;
      }
    }
    if (p.life > 0) keep.push(p);
  }
  particles = keep;
  const keepPops = [];
  for (let i = 0; i < pops.length; i++) {
    pops[i].t += dt;
    if (pops[i].t < pops[i].max) keepPops.push(pops[i]);
  }
  pops = keepPops;
}

function drawParticles(g) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const a = clamp(p.life / p.max * 2, 0, 1);
    g.globalAlpha = a;
    if (p.kind === 'plate') {
      const rx = Math.max(1, Math.abs(Math.cos(p.rot)) * 13);
      ellipse(g, p.x, p.y, rx, 13, '#c9c8b8');
      ellipse(g, p.x, p.y, rx * 0.4, 5, '#6f7a6c');
    } else if (p.kind === 'shard') {
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      poly(g, [-4, 0, 4, -2, 1, 4], '#c9c8b8');
      g.restore();
    } else if (p.kind === 'item') {
      drawItem(g, p.item, p.x, p.y - 6, p.rot);
    } else if (p.kind === 'note') {
      rect(g, p.x, p.y - 12, 4, 12, '#a89c78');      // note stem (shapes only in world space)
      rect(g, p.x - 8, p.y - 4, 8, 8, '#a89c78');
    } else if (p.kind === 'drip') {
      circle(g, p.x, p.y, 2.5, '#7a0609');
    } else if (p.kind === 'blood') {
      rect(g, p.x - 4, p.y - 4, 8, 8, '#6e0508');
    } else if (p.kind === 'dust') {
      circle(g, p.x, p.y, p.size || 4, 'rgba(170,180,165,0.35)');
    } else if (p.kind === 'spark') {
      circle(g, p.x, p.y, 2, '#d8cf98');
    }
  }
  g.globalAlpha = 1;
}

function drawPops(g) {
  for (let i = 0; i < pops.length; i++) {
    const p = pops[i];
    let s = 1.2 - Math.min(0.2, p.t - 0.15);
    if (p.t < 0.15) s = 0.5 + p.t / 0.15 * 0.7;
    const a = 1 - Math.pow(p.t / p.max, 3);
    g.save();
    g.globalAlpha = clamp(a, 0, 1);
    const hw = measurePixelText(p.text, fontScale(p.size)) * s / 2 + 8;
    g.translate(clamp(p.x - camX, hw, W - hw), clamp(p.y - camY - p.t * 30, 16, H - 16));   // world -> screen, kept fully on screen
    g.scale(s, s);
    label(g, p.text, 0, 0, p.size, p.color);
    g.restore();
  }
}
