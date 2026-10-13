"use strict";
// =====================================================================
// POST-PROCESS ASSETS
// =====================================================================
// noise frames for film grain
function makeGrain() {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() < 0.5 ? 0 : 255;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = Math.floor(Math.random() * 70);
  }
  g.putImageData(img, 0, 0);
  return c;
}
const GRAIN = [];
for (let i = 0; i < 4; i++) GRAIN.push(ctx.createPattern(makeGrain(), 'repeat'));

// scanline tile
const scanTile = makeCanvas(4, 4);
rect(scanTile.getContext('2d'), 0, 0, 4, 1, 'rgba(0,0,0,0.18)');
const SCAN = ctx.createPattern(scanTile, 'repeat');

// vignette overlay
const vignette = makeCanvas(W, H);
const vg = vignette.getContext('2d');
const vgr = vg.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 900);
vgr.addColorStop(0, 'rgba(0,0,0,0)');
vgr.addColorStop(1, 'rgba(2,6,3,0.6)');
vg.fillStyle = vgr;
vg.fillRect(0, 0, W, H);
