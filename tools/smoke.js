// headless smoke test: loads src/*.js in index.html order with canvas/audio stubs,
// then simulates title -> play -> endings and reports the first errors.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const srcs = [];
html.replace(/<script src="([^"]+)"><\/script>/g, function (m, s) { srcs.push(s); return m; });

// a do-anything stub: every property is a callable stub, numbers read as 0
function stub(name) {
  const fn = function () { return stub(name + '()'); };
  return new Proxy(fn, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return function () { return 0; };
      if (k === 'then') return undefined;
      if (k === 'length') return 0;
      if (k in t) return t[k];
      return stub(name + '.' + String(k));
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

function makeCtx(canvas) {
  const base = {
    canvas: canvas,
    measureText: function (s) { return { width: String(s).length * 6 }; },
    getImageData: function (x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; },
    createImageData: function (w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; },
    createLinearGradient: function () { return { addColorStop: function () {} }; },
    createRadialGradient: function () { return { addColorStop: function () {} }; },
    createPattern: function () { return {}; },
    getTransform: function () { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; },
    isPointInPath: function () { return false; },
  };
  return new Proxy(base, {
    get(t, k) {
      if (k in t) return t[k];
      return function () {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

function makeCanvas() {
  const c = { width: 300, height: 150, style: {} };
  c.getContext = function () { if (!c._ctx) c._ctx = makeCtx(c); return c._ctx; };
  c.getBoundingClientRect = function () { return { left: 0, top: 0, width: 1280, height: 720 }; };
  c.addEventListener = function (t, f) { handlers.push([t, f]); };
  return c;
}

const handlers = [];
const mainCanvas = makeCanvas();
mainCanvas.width = 1280;
mainCanvas.height = 720;
let rafCb = null;
let now = 0;

function audioParam() {
  return { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}, connect() {} };
}
function audioNode() {
  return new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'connect' || k === 'disconnect' || k === 'start' || k === 'stop') return function () {};
      if (k === 'getChannelData') return function () { return new Float32Array(44100 * 2); };
      if (k === 'buffer' || k === 'type' || k === 'loop') return t[k];
      return audioParam();
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
function AudioContext() {
  this.currentTime = 0;
  this.sampleRate = 44100;
  this.state = 'running';
  this.destination = audioNode();
  this.resume = function () {};
  const names = ['createGain', 'createOscillator', 'createBiquadFilter', 'createBufferSource', 'createDynamicsCompressor', 'createDelay', 'createConvolver', 'createStereoPanner', 'createWaveShaper', 'createBuffer'];
  for (const n of names) this[n] = function () { return audioNode(); };
}

const errors = [];
const sandbox = {
  console: console,
  Math: Math,
  performance: { now: function () { return now; } },
  requestAnimationFrame: function (cb) { rafCb = cb; return 1; },
  cancelAnimationFrame: function () {},
  setTimeout: function (f) { return 0; },
  clearTimeout: function () {},
  AudioContext: AudioContext,
  innerWidth: 1280,
  innerHeight: 720,
  addEventListener: function (t, f) { handlers.push([t, f]); },
  removeEventListener: function () {},
  document: {
    getElementById: function () { return mainCanvas; },
    createElement: function () { return makeCanvas(); },
    addEventListener: function (t, f) { handlers.push([t, f]); },
    body: { appendChild() {} },
  },
  Image: function () {},
  localStorage: { getItem() { return null; }, setItem() {} },
};
sandbox.window = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);

// load every source file
for (const s of srcs) {
  const code = fs.readFileSync(path.join(root, s), 'utf8');
  try {
    vm.runInContext(code, sandbox, { filename: s });
  } catch (e) {
    console.log('LOAD ERROR in ' + s + ': ' + e.stack.split('\n').slice(0, 4).join('\n'));
    process.exit(1);
  }
}

function fire(type, ev) {
  ev.preventDefault = function () {};
  for (const h of handlers) if (h[0] === type) h[1](ev);
}
function key(code, down) { fire(down ? 'keydown' : 'keyup', { code: code, key: code, repeat: false }); }
function click(x, y) { fire('mousedown', { clientX: x, clientY: y, button: 0 }); fire('mouseup', { clientX: x, clientY: y, button: 0 }); }
function frames(n) {
  for (let i = 0; i < n; i++) {
    now += 1000 / 60;
    const cb = rafCb;
    rafCb = null;
    if (!cb) { errors.push('no requestAnimationFrame callback scheduled'); return; }
    try { cb(now); } catch (e) { errors.push(e.stack.split('\n').slice(0, 5).join('\n')); if (errors.length > 5) return; rafCb = cb; }
  }
}
function run(label, fn) {
  const before = errors.length;
  try { fn(); } catch (e) { errors.push('[' + label + '] ' + e.stack.split('\n').slice(0, 5).join('\n')); }
  console.log((errors.length === before ? 'ok   ' : 'FAIL ') + label + ' mode=' + vm.runInContext('typeof mode !== "undefined" ? mode : "?"', sandbox));
}

run('boot', function () { frames(30); });
run('title click', function () { click(640, 360); frames(30); });
run('wander + haunt', function () {
  const moves = ['KeyD', 'KeyS', 'KeyA', 'KeyW', 'ArrowRight', 'ArrowDown'];
  for (let k = 0; k < 24; k++) {
    key(moves[k % moves.length], true);
    frames(40);
    key(moves[k % moves.length], false);
    key('KeyE', true);
    frames(20);
    key('KeyE', false);
    frames(10);
  }
});
run('extra keys', function () {
  for (const c of ['KeyQ', 'KeyR', 'Tab', 'KeyM', 'Escape', 'Escape', 'KeyH', 'KeyH']) { key(c, true); frames(5); key(c, false); frames(5); }
});
run('click world', function () { for (let i = 0; i < 10; i++) { click(100 + i * 110, 200 + (i % 4) * 120); frames(20); } });
run('long play 120s', function () { frames(60 * 120); });
run('fear display floors', function () {
  const f = vm.runInContext('family[0].fear = 99.6; window.__game.state().family[0].fear', sandbox);
  if (f !== 99) errors.push('probe shows fear 99.6 as ' + f + ', want 99');
});
run('force jumpscare', function () {
  vm.runInContext('if (typeof family !== "undefined" && family[0] && typeof terrify === "function") { family[0].fear = 100; terrify(family[0]); }', sandbox);
  frames(120);
});
run('force win ending', function () {
  vm.runInContext('mode = "game"; for (const m of family) m.state = "gone"; if (typeof startEnding === "function") startEnding();', sandbox);
  frames(60 * 26);
  click(640, 450);
  frames(30);
});
run('force gameover', function () {
  vm.runInContext('if (typeof startGame === "function") startGame();', sandbox);
  frames(30);
  vm.runInContext('if (typeof threat !== "undefined" && threat) { threat.presence = 0; }', sandbox);
  frames(120);
  click(640, 450);
  frames(60);
});
run('whisper rules', function () {
  const r = vm.runInContext('(function () {' +
    ' startGame(); threat.whisper = true; const m = family[2];' +
    ' for (const o of family) if (o !== m) o.state = "gone";' +            // one victim alone in the room
    ' m.state = "idle"; ghost.x = m.x; ghost.y = m.y - 60;' +
    ' const w = function (f) { if (f !== undefined) m.fear = f; threat.whisperCool = 0; game.energy = 50; threatWhisper(); return m.fear; };' +
    ' m.scaredAgo = 99; const a = w(50), e = game.energy, b = w(), c = w(79), d = w(85);' +
    ' return [a, e, b, c, d, m.scaredAgo]; })()', sandbox);
  const want = [58, 42, 62, 80, 85, 99];   // +8, no single-victim refund, repeat halves, cap 80, never past it, decay clock untouched
  if (String(r) !== String(want)) errors.push('whisper rules: got ' + r + ', want ' + want);
});
run('ghost stays below the top HUD', function () {
  vm.runInContext('startGame(); ghost.x = 1280; ghost.y = 60;', sandbox);
  key('KeyW', true);
  frames(60);
  key('KeyW', false);
  const y = vm.runInContext('ghost.y - camY', sandbox);
  if (!(y >= vm.runInContext('HUD_BAND', sandbox) + 40)) errors.push('ghost screen y ' + y + ' is inside the top HUD band');
});
run('banner queue', function () {
  vm.runInContext('startGame(); banner("A", "a"); banner("B", "b"); banner("C", "c");', sandbox);
  frames(60);
  const a = vm.runInContext('threat.banners[0].text + threat.banners.length', sandbox);
  frames(60);
  const b = vm.runInContext('threat.banners[0].text + threat.banners.length', sandbox);
  if (a + ',' + b !== 'A3,B2') errors.push('banner queue: got ' + a + ',' + b + ', want A3,B2 (one at a time, 1.8 s each while others wait)');
});
run('whisper miss and crowd refund', function () {
  const r = vm.runInContext('(function () {' +
    ' startGame(); threat.whisper = true; const k = roomById("kitchen");' +
    ' ghost.x = k.x + k.w / 2; ghost.y = k.y + k.h / 2;' +
    ' for (const m of family) { m.state = "idle"; m.x = 40; m.y = 1500; }' +                   // nobody in the kitchen
    ' game.energy = 50; threat.whisperCool = 0; threatWhisper(); const miss = game.energy;' +
    ' for (const m of family.slice(0, 2)) { m.x = k.x + k.w / 2; m.y = k.y + k.h - 5; m.fear = 0; }' +
    ' game.energy = 50; threat.whisperCool = 0; threatWhisper();' +
    ' return [miss, game.energy <= 50]; })()', sandbox);
  if (String(r) !== '50,true') errors.push('whisper: got ' + r + ', want 50,true (a miss is free, crowd refund <= cost)');
});
run('x3 needs distinct tricks', function () {
  const r = vm.runInContext('(function () {' +
    ' startGame(); const d = family[0]; for (const m of family) if (m !== d) m.state = "gone";' +
    ' const put = function (id) { const r = roomById(id); d.x = r.x + r.w / 2; d.y = r.y + r.h - 5; d.state = "idle"; d.fear = 0; };' +
    ' const hit = function (o, t) { game.time = t; o.cool = 0; game.energy = 100; triggerObject(o); return game.combo; };' +
    ' const ko = OBJECTS.filter(function (o) { return o.room === "kitchen"; });' +
    ' const dp = OBJECTS.find(function (o) { return o.room === "dining" && o.type === "portrait"; });' +
    ' put("kitchen"); const aba = [hit(ko[0], 10), hit(ko[1], 11), hit(ko[0], 12)];' +
    ' put("kitchen"); const abc = [hit(ko[0], 20), hit(ko[1], 21)]; put("dining"); abc.push(hit(dp, 22));' +
    ' return aba.concat(abc); })()', sandbox);
  if (String(r) !== '1,2,1,1,2,3') errors.push('combo: got ' + r + ', want 1,2,1,1,2,3 (A-B-A restarts, A-B-C reaches x3)');
});
run('selection skips a seen trick', function () {
  const r = vm.runInContext('(function () {' +
    ' startGame(); const k = family[2]; const kr = roomById("kid"); k.x = kr.x + 60; k.y = kr.y + kr.h - 5; k.state = "idle"; k.habit = { lights: 1 };' +
    ' const li = OBJECTS.find(function (o) { return o.room === "kid" && o.type === "lights"; });' +
    ' ghost.x = li.x; ghost.y = li.y - li.h / 2;' +                                         // right on top of the seen lights
    ' return nearestObject(kr).type; })()', sandbox);
  if (r !== 'crib') errors.push('selection: got ' + r + ', want crib (the fresh trick, not the seen lights)');
});
run('flee task counts an earlier flee', function () {
  const r = vm.runInContext('(function () {' +
    ' startGame(); family[2].state = "gone"; const ob = threat.objectives;' +
    ' ob[0].done = true; ob[1].done = true;' +
    ' threatEvent({ kind: "scare", n: 2, combo: 1, room: "kitchen" });' +   // completes "two at once", "drive out" becomes active
    ' return [ob[2].done, ob[5].done]; })()', sandbox);
  if (String(r) !== 'true,true') errors.push('flee task: got ' + r + ', want true,true');
});
run('dawn', function () {
  vm.runInContext('if (typeof threat !== "undefined" && threat) { threat.clock = 1e6; }', sandbox);
  frames(120);
});

if (errors.length === 0) {
  console.log('SMOKE OK: 0 errors');
} else {
  console.log('\nERRORS (' + errors.length + '):');
  for (const e of errors.slice(0, 8)) console.log('---\n' + e);
  process.exit(1);
}
