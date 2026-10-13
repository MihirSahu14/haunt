"use strict";
// =====================================================================
// SETUP
// =====================================================================
const W = 1280;                                   // logical width
const H = 720;                                    // logical height
const canvas = document.getElementById('game');   // visible canvas
const ctx = canvas.getContext('2d');              // visible context
const scene = makeCanvas(W, H);                   // world is drawn here first
const sc = scene.getContext('2d');                // scene context
const chan = makeCanvas(W, H);                    // scratch buffer for RGB split
const cc = chan.getContext('2d');                 // channel context
const faceCv = makeCanvas(W, H);                  // jump-scare face buffer
const fc = faceCv.getContext('2d');               // face context

// make an offscreen canvas
function makeCanvas(w, h) {
  const c = document.createElement('canvas');     // new element
  c.width = w;                                    // set width
  c.height = h;                                   // set height
  return c;
}

// scale the canvas to fit the window, keep aspect
function fit() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = (W * s) + 'px';            // css width
  canvas.style.height = (H * s) + 'px';           // css height
}
window.addEventListener('resize', fit);
fit();

// =====================================================================
// SMALL HELPERS
// =====================================================================
function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

// seeded random so both house versions share a layout
let seedVal = 1;
function srand() {
  seedVal = (seedVal * 16807) % 2147483647;       // park-miller step
  return seedVal / 2147483647;                    // 0..1
}
function rs(a) { return (srand() * 2 - 1) * a; }  // seeded +-a

// filled circle
function circle(g, x, y, r, color) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  g.fill();
}

// filled ellipse
function ellipse(g, x, y, rx, ry, color, rot) {
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(x, y, Math.max(0, Math.abs(rx)), Math.max(0, Math.abs(ry)), rot || 0, 0, Math.PI * 2);
  g.fill();
}

// filled rectangle
function rect(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
}

// filled rounded rectangle
function rr(g, x, y, w, h, r, color) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath();
  g.fillStyle = color;
  g.fill();
}

// filled polygon from flat [x,y,x,y...] list
function poly(g, pts, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fill();
}

// stroked line
function line(g, x1, y1, x2, y2, color, w) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
}

// wobbly outlined box (furniture), bottom stays flat
function wobRect(g, x, y, w, h, color, amt) {
  const a = amt === undefined ? 2 : amt;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x + rs(a), y + rs(a));
  g.lineTo(x + w + rs(a), y + rs(a));
  g.lineTo(x + w, y + h);
  g.lineTo(x, y + h);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(40,22,12,0.75)';
  g.lineWidth = 2;
  g.stroke();
}

