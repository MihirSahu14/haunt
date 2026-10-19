"use strict";
// =====================================================================
// INPUT
// =====================================================================
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}

// screen point -> world point (camera owned by 13-render-world.js)
function toWorld(pt) {
  const cx = typeof camX !== 'undefined' ? camX : 0;
  const cy = typeof camY !== 'undefined' ? camY : 0;
  return { x: pt.x + cx, y: pt.y + cy };
}

function onPress(pt) {
  if (mode === 'title') {
    startGame();
    return;
  }
  if (mode === 'ending') {
    if (ending.t >= END_CARD_T + 1) startGame();
    else if (ending.t > 3 && ending.t < END_CARD_T) skipEnding();
    return;
  }
  if (mode === 'gameover') {
    if (threat && threat.gameOverT > 1.5) startGame();
    return;
  }
  if (threat && threat.paused) {
    threat.paused = false;
    return;
  }
  if (game.freeze > 0 || !pt) return;
  pt = toWorld(pt);
  const o = objectAt(pt.x, pt.y);
  const gr = roomAt(ghost.x, ghost.y);
  if (o && gr && gr.id === o.room) {
    triggerObject(o);
    return;
  }
  ghost.tx = clamp(pt.x, 40, worldW() - 40);
  ghost.ty = clamp(pt.y, GHOST_TOP, worldH() - 40);
}

canvas.addEventListener('mousedown', function (e) {
  onPress(canvasPoint(e));
});

window.addEventListener('keydown', function (e) {
  keys[e.code] = true;
  if (e.code.indexOf('Arrow') === 0 || e.code === 'Space' || e.code === 'Tab') e.preventDefault();
  if (e.repeat) return;
  if (mode !== 'game') {
    if (e.code === 'Enter' || e.code === 'Space') onPress(null);
    return;
  }
  if (e.code === 'Escape') {
    threat.paused = !threat.paused;
    return;
  }
  if (e.code === 'Tab') threat.showObj = !threat.showObj;
  if (threat.paused || game.freeze > 0) return;
  if (e.code === 'KeyE' || e.code === 'Space') hauntNearest();
  if (e.code === 'KeyQ') threatWhisper();
  if (e.code === 'KeyR') threatManifest();
});

window.addEventListener('keyup', function (e) {
  keys[e.code] = false;
});

// =====================================================================
// MAIN LOOP
// =====================================================================
// director hook: every new run resets the director (startGame lives in 09-game)
const mainStartGame = startGame;
startGame = function () {
  mainStartGame();
  if (typeof resetDirector === 'function') resetDirector();
};

resetGame();
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt < 0) dt = 0;
  update(dt);
  if (typeof updateDirector === 'function') updateDirector(dt);   // pacing, beds, beats
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
