"use strict";
// =====================================================================
// AUDIO (Web Audio, all procedural)
// =====================================================================
let actx = null;      // audio context
let master = null;    // master gain
let noiseBuf = null;  // shared white noise
let drone = null;     // active drone nodes
let sfxOut = null;    // when set, one-shot sounds route here (see atPlace)
let amb = null;       // looping ambience layers (rain, room tone, wind)

// where one-shot sounds connect: master, or a placed pan/lowpass chain
function sfxDest() {
  return sfxOut || master;
}

// create audio on first user click
function initAudio() {
  if (actx) {
    if (actx.state === 'suspended') actx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  actx = new AC();
  const comp = actx.createDynamicsCompressor();   // tame the screams
  comp.threshold.value = -14;
  comp.ratio.value = 6;
  comp.connect(actx.destination);
  master = actx.createGain();
  master.gain.value = 0.75;
  master.connect(comp);
  const len = actx.sampleRate * 2;                // 2s of noise
  noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
}

// attack/decay envelope
function env(gainNode, t0, vol, attack, dur) {
  gainNode.gain.setValueAtTime(0.0001, t0);
  gainNode.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}

// one oscillator note
function tone(freq, dur, type, vol, freqEnd, delay, attack) {
  if (!actx) return;
  const t0 = actx.currentTime + (delay || 0);
  const osc = actx.createOscillator();
  const g = actx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
  env(g, t0, vol, Math.min(attack || 0.01, dur * 0.5), dur);
  osc.connect(g);
  g.connect(sfxDest());
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// filtered noise burst
function noise(dur, vol, ftype, freq, q, delay, freqEnd, attack) {
  if (!actx) return;
  const t0 = actx.currentTime + (delay || 0);
  const src = actx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = actx.createBiquadFilter();
  f.type = ftype;
  f.frequency.setValueAtTime(freq, t0);
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
  f.Q.value = q || 1;
  const g = actx.createGain();
  env(g, t0, vol, Math.min(attack || 0.005, dur * 0.5), dur);
  src.connect(f);
  f.connect(g);
  g.connect(sfxDest());
  src.start(t0, Math.random() * 1.5);
  src.stop(t0 + dur + 0.05);
}

// wooden creak: slow irregular sawtooth through a resonant band
function creak(dur, vol, delay, pitch) {
  if (!actx) return;
  const p = pitch || 1;
  const t0 = actx.currentTime + (delay || 0);
  const osc = actx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(28 * p, t0);
  const steps = Math.floor(dur / 0.07);
  for (let i = 1; i <= steps; i++) {
    osc.frequency.linearRampToValueAtTime((22 + Math.random() * 30) * p, t0 + i * 0.07);
  }
  const bp = actx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 700 * p;
  bp.Q.value = 4;
  const g = actx.createGain();
  env(g, t0, vol, Math.min(0.15, dur * 0.3), dur);
  osc.connect(bp);
  bp.connect(g);
  g.connect(sfxDest());
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// breathy whisper: noise with wandering formant and syllable gating
function whisper(dur, vol, delay, hi) {
  const k = hi || 1;                              // formant scale (>1 = child-like)
  if (!actx) return;
  const t0 = actx.currentTime + (delay || 0);
  const src = actx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = actx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 9;
  f.frequency.setValueAtTime(1800 * k, t0);
  for (let i = 1; i <= 8; i++) f.frequency.linearRampToValueAtTime(rand(700, 3200) * k, t0 + dur * i / 8);
  const gate = actx.createGain();
  gate.gain.setValueAtTime(0.3, t0);
  for (let t = 0.12; t < dur; t += 0.12) gate.gain.setValueAtTime(rand(0.15, 1), t0 + t);
  const g = actx.createGain();
  env(g, t0, vol, 0.25, dur);
  src.connect(f);
  f.connect(gate);
  gate.connect(g);
  g.connect(sfxDest());
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

// scream: noise plus pitch-swept, vibrato'd voice
function scream(pitch, delay, vol) {
  if (!actx) return;
  const p = pitch;
  const v = vol || 0.45;
  const t0 = actx.currentTime + (delay || 0);
  const dur = 1.3;
  const bp = actx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1500 * p;
  bp.Q.value = 1.3;
  const g = actx.createGain();
  env(g, t0, v, 0.03, dur);
  bp.connect(g);
  g.connect(master);
  const lfo = actx.createOscillator();
  lfo.frequency.value = 11;
  const lg = actx.createGain();
  lg.gain.value = 40 * p;
  lfo.connect(lg);
  const types = ['sawtooth', 'square'];
  for (let i = 0; i < types.length; i++) {
    const osc = actx.createOscillator();
    osc.type = types[i];
    osc.detune.value = i * 35;
    osc.frequency.setValueAtTime(380 * p, t0);
    osc.frequency.linearRampToValueAtTime(1150 * p, t0 + 0.12);
    osc.frequency.linearRampToValueAtTime(950 * p, t0 + 0.8);
    osc.frequency.exponentialRampToValueAtTime(420 * p, t0 + dur);
    lg.connect(osc.frequency);
    osc.connect(bp);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
  lfo.start(t0);
  lfo.stop(t0 + dur + 0.05);
  noise(dur, v * 0.6, 'bandpass', 2600, 1.2, delay, 1800);
}

// jump-scare sting: dissonant chord, sharp attack, boom, hiss
function sting() {
  const freqs = [61.7, 65.4, 92.5, 130.8, 138.6, 196, 207.7, 311.1, 329.6, 493.9];
  for (let i = 0; i < freqs.length; i++) tone(freqs[i], 2.0, 'sawtooth', 0.06, freqs[i] * 0.94, 0, 0.004);
  noise(0.6, 0.9, 'highpass', 500, 0.7, 0, 3000, 0.002);
  tone(90, 1.0, 'sine', 0.9, 28, 0, 0.003);
}

// front door slam
function doorSlam() {
  noise(0.4, 0.9, 'lowpass', 300, 1);
  tone(70, 0.6, 'sine', 0.9, 30);
  creak(0.25, 0.2, 0, 1.4);
}

// short glitchy bleeps
function glitchSound() {
  for (let i = 0; i < 12; i++) {
    tone(rand(200, 2000), 0.06, 'square', 0.08, undefined, i * 0.12);
    noise(0.08, 0.3, 'bandpass', rand(1000, 5000), 2, i * 0.12 + 0.05);
  }
}

// a distinct sound for each haunt
function scareSound(type) {
  if (type === 'chair') {
    creak(0.5, 0.3, 0, 1.0);
    creak(0.5, 0.3, 0.55, 0.9);
    creak(0.5, 0.3, 1.1, 1.0);
  } else if (type === 'closet') {
    creak(1.0, 0.35, 0, 0.7);
    noise(0.25, 0.7, 'lowpass', 300, 1, 0.9);
    tone(55, 0.4, 'sine', 0.6, 40, 0.9);
  } else if (type === 'mirror') {
    tone(1800, 0.9, 'sine', 0.12, 2400);
    tone(1830, 0.9, 'sine', 0.1, 2350);
    whisper(1.3, 0.35, 0.1);
  } else if (type === 'faucet') {
    noise(1.4, 0.12, 'bandpass', 1200, 2);
    for (let i = 0; i < 7; i++) tone(900 - i * 40, 0.12, 'sine', 0.25, 300, i * 0.18);
  } else if (type === 'plates') {
    for (let i = 0; i < 5; i++) {
      noise(0.3, 0.5, 'highpass', rand(2500, 4500), 1, 0.35 + i * 0.1);
      tone(rand(3000, 4500), 0.25, 'triangle', 0.08, undefined, 0.35 + i * 0.1);
    }
    noise(0.3, 0.3, 'bandpass', 600, 1);
  } else if (type === 'lights') {
    tone(60, 1.2, 'square', 0.12);
    tone(120, 1.2, 'sawtooth', 0.06);
    noise(1.2, 0.12, 'bandpass', 4000, 3);
  } else if (type === 'tv') {
    noise(1.4, 0.35, 'bandpass', 3000, 0.5);
    tone(80, 1.4, 'sawtooth', 0.05);
    whisper(1.0, 0.2, 0.3);
  } else if (type === 'piano') {
    const cl = [110, 116.5, 123.5, 130.8, 138.6, 233.1, 246.9];
    for (let i = 0; i < cl.length; i++) tone(cl[i], 2.4, 'triangle', 0.15, undefined, i * 0.01, 0.005);
  } else if (type === 'portrait') {
    tone(110, 1.6, 'sawtooth', 0.08, 55);
    tone(112, 1.6, 'sine', 0.2, 50);
    whisper(1.4, 0.3);
  } else if (type === 'coat') {
    noise(0.15, 0.5, 'lowpass', 400, 1);
    for (let i = 0; i < 6; i++) tone(rand(180, 260), 0.06, 'square', 0.06, undefined, i * 0.08);
  }
}

// low ambient drone: two beating sines + 2x harmonic (laptops) + muted tritone
function startDrone(base, vol) {
  if (!actx) return;
  stopDrone(0.05);
  const t0 = actx.currentTime;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol * 0.15), t0 + 3);
  g.connect(master);
  const tri = actx.createGain();                  // tritone layer, director raises it late
  tri.gain.value = 0;
  tri.connect(g);
  const freqs = [base, base + 0.35, base * 2, base * 1.414];
  const oscs = [];
  for (let i = 0; i < freqs.length; i++) {
    const o = actx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freqs[i];
    const og = actx.createGain();
    og.gain.value = i === 2 ? 0.35 : 1;           // harmonic quieter
    o.connect(og);
    og.connect(i === 3 ? tri : g);
    o.start(t0);
    oscs.push(o);
  }
  drone = { g: g, oscs: oscs, tri: tri };
}

// glide the drone level (and its tritone 0..1)
function setDrone(v, tritone) {
  if (!actx || !drone) return;
  drone.g.gain.setTargetAtTime(Math.max(0.0001, v), actx.currentTime, 1.5);
  drone.tri.gain.setTargetAtTime(tritone || 0, actx.currentTime, 3);
}

// fade out and stop the drone
function stopDrone(fade) {
  if (!actx || !drone) return;
  const t0 = actx.currentTime;
  drone.g.gain.cancelScheduledValues(t0);
  drone.g.gain.setValueAtTime(drone.g.gain.value, t0);
  drone.g.gain.linearRampToValueAtTime(0, t0 + fade);
  for (let i = 0; i < drone.oscs.length; i++) drone.oscs[i].stop(t0 + fade + 0.05);
  drone = null;
}

// =====================================================================
// DIRECTOR SOUNDS (placed one-shots, ambience beds, leitmotif)
// =====================================================================
// run fn() with its one-shots panned (-1..1) and lowpassed (distance / walls)
function atPlace(pan, lp, fn) {
  if (!actx) return;
  const f = actx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lp || 18000;
  let last = f;
  if (actx.createStereoPanner) {
    const p = actx.createStereoPanner();
    p.pan.value = clamp(pan || 0, -1, 1);
    f.connect(p);
    last = p;
  }
  last.connect(master);
  sfxOut = f;
  fn();
  sfxOut = null;
}

// one looping buffer through a filter chain into the ambience bus
function loopLayer(buf, filters) {
  const src = actx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  let node = src;
  const fs = [];
  for (let i = 0; i < filters.length; i++) {
    const f = actx.createBiquadFilter();
    f.type = filters[i][0];
    f.frequency.value = filters[i][1];
    f.Q.value = filters[i][2] || 0.7;
    node.connect(f);
    node = f;
    fs.push(f);
  }
  const g = actx.createGain();
  g.gain.value = 0;
  node.connect(g);
  g.connect(amb.bus);
  src.start();
  return { g: g, f: fs };
}

// rain bed, room tone and wind; idempotent, all start silent
function startAmbience() {
  if (!actx || amb) return;
  amb = {};
  amb.bus = actx.createGain();
  amb.bus.gain.value = 1;
  amb.bus.connect(master);
  const sr = actx.sampleRate;
  // rain: soft noise plus 500 droplet ticks, 3 s loop
  const rlen = Math.floor(sr * 3);
  const rb = actx.createBuffer(1, rlen, sr);
  const rd = rb.getChannelData(0);
  for (let i = 0; i < rlen; i++) rd[i] = (Math.random() * 2 - 1) * 0.35;
  const dlen = Math.floor(sr * 0.012);
  for (let k = 0; k < 500; k++) {
    const at = Math.floor(Math.random() * (rlen - dlen));
    const a = rand(0.1, 0.5);
    for (let j = 0; j < dlen; j++) rd[at + j] += a * Math.exp(-j / (sr * 0.004)) * (Math.random() * 2 - 1);
  }
  amb.rain = loopLayer(rb, [['highpass', 400], ['lowpass', 2400]]);
  // room tone: brown noise, normalised
  const blen = Math.floor(sr * 2);
  const bb = actx.createBuffer(1, blen, sr);
  const bd = bb.getChannelData(0);
  let b = 0;
  for (let i = 0; i < blen; i++) {
    b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    bd[i] = b * 3.5;
  }
  amb.room = loopLayer(bb, [['lowpass', 180]]);
  // wind: slow wandering band of noise
  amb.wind = loopLayer(noiseBuf, [['bandpass', 350, 0.6]]);
  const lfo = actx.createOscillator();
  lfo.frequency.value = 0.06;
  const lg = actx.createGain();
  lg.gain.value = 150;
  lfo.connect(lg);
  lg.connect(amb.wind.f[0].frequency);
  lfo.start();
}

// glide one ambience layer ('rain' | 'room' | 'wind' | 'bus') to a level
function setAmb(name, v, tau) {
  if (!actx || !amb) return;
  const node = name === 'bus' ? amb.bus : (amb[name] ? amb[name].g : null);
  if (!node) return;
  node.gain.setTargetAtTime(Math.max(0, v), actx.currentTime, tau || 0.8);
}

// lub-dub, with harmonics so laptop speakers carry it
function heartbeat(vol) {
  if (!actx || vol < 0.003) return;
  tone(60, 0.11, 'sine', vol, 38, 0, 0.004);
  tone(120, 0.11, 'sine', vol * 0.35, 76, 0, 0.004);
  tone(52, 0.09, 'sine', vol * 0.7, 34, 0.16, 0.004);
  tone(104, 0.09, 'sine', vol * 0.25, 68, 0.16, 0.004);
}

// one breath cycle (inhale, exhale); child = higher, smaller breath
function breath(vol, period, child) {
  if (!actx || vol < 0.002) return;
  const k = child ? 1.25 : 1;
  const ex = Math.max(1.2, period * 0.35);       // exhale start
  noise(1.05, vol, 'bandpass', 900 * k, 1, 0, 1400 * k, 0.7);
  noise(1.4, vol * 0.85, 'bandpass', 1200 * k, 1, ex, 650 * k, 0.3);
  if (child) tone(420, 1.2, 'sine', 0.003, 400, ex, 0.3);
}

// one footstep; small = a child's bare foot
function footstep(vol, delay, small) {
  noise(small ? 0.05 : 0.07, vol, 'lowpass', small ? 400 : 240, 1, delay);
  if (!small) tone(75, 0.06, 'sine', vol * 0.6, 52, delay);
}

// thunder after a flash; delay = distance in seconds
function thunder(delay) {
  const d = delay || 0;
  const near = clamp(1 - d / 8, 0.2, 1);
  if (d < 0.6) noise(0.12, 0.3, 'highpass', 1500, 1, d);
  for (let i = 0; i < 4; i++) noise(rand(1.5, 3.5), rand(0.15, 0.35) * near, 'lowpass', 140, 0.7, d + rand(0, 1.2), 60, rand(0.08, 0.3));
  tone(38, 2, 'sine', 0.15 * near, 30, d, 0.05);
  tone(76, 2, 'sine', 0.05 * near, 60, d, 0.05);
}

// the leitmotif: A minor, ends on D5 (unresolved) unless resolve
const MBOX = [659.25, 523.25, 440, 523.25, 659.25, 587.33, 523.25, 493.88, 523.25, 440, 493.88, 587.33];
function musicBox(r0, r1, stopAt, vol, resolve, detune) {
  if (!actx) return;
  const notes = resolve ? MBOX.concat([523.25, 493.88, 440]) : MBOX;
  const n = Math.min(notes.length, stopAt || notes.length);
  const v = vol || 1;
  let t = 0;
  for (let i = 0; i < n; i++) {
    const rate = r0 + (r1 - r0) * i / Math.max(1, n - 1);   // winds down across the phrase
    const cents = 6 * Math.sin(i * 0.9) + rand(-1, 1) * ((1 - rate) * 30 + (detune || 0));
    const f = notes[i] * Math.pow(2, cents / 1200) * Math.pow(rate, 0.35);
    const hold = resolve && i === n - 1 ? 3 : 1.6;
    tone(f, hold, 'sine', 0.05 * v, undefined, t, 0.002);
    tone(f * 3.98, 0.22, 'sine', 0.012 * v, undefined, t, 0.002);   // inharmonic tine
    noise(0.006, 0.02 * v, 'highpass', 4000, 1, t);                  // comb click
    t += 0.36 / rate;
  }
}

// a child humming the first three notes, slightly flat
function childHum(vol, delay) {
  const ns = [659.25, 523.25, 440];
  for (let i = 0; i < ns.length; i++) tone(ns[i] * 0.985, 0.55, 'triangle', vol, ns[i] * 0.975, (delay || 0) + i * 0.52, 0.15);
  whisper(1.7, vol * 5, delay, 1.5);
}

// beating minor second: something is wrong (sightings)
function glassTone(vol) {
  const v = vol || 1;
  tone(1244.5, 3.3, 'sine', 0.02 * v, undefined, 0, 0.5);
  tone(1318.5, 3.3, 'sine', 0.02 * v, undefined, 0, 0.5);
}

// rare stinger: tone cluster + snap + sub
function clusterSting(vol) {
  const v = vol || 1;
  const fs = [880, 932.3, 987.8, 1046.5];
  for (let i = 0; i < fs.length; i++) tone(fs[i], 2.2, 'sine', 0.12 * v, fs[i] * 0.97, 0, 0.003);
  noise(0.09, 0.6 * v, 'highpass', 1200, 1, 0, undefined, 0.001);
  tone(50, 0.6, 'sine', 0.7 * v, 30, 0, 0.002);
  tone(100, 0.6, 'sine', 0.25 * v, 60, 0, 0.002);
}

// a door somewhere swings open: latch click, then a long slow creak
function doorCreakOpen(vol) {
  const v = vol || 1;
  noise(0.02, 0.05 * v, 'bandpass', 2000, 3);
  noise(0.02, 0.04 * v, 'bandpass', 1500, 3, 0.08);
  creak(1.6, 0.09 * v, 0.15, 0.7);
}

// exorcist's hand bell (inharmonic partials)
function bell(vol, delay) {
  const ps = [1, 2.32, 4.25, 6.63];
  const gs = [1, 0.5, 0.3, 0.15];
  for (let i = 0; i < ps.length; i++) tone(620 * ps[i], 2.6 / (1 + i * 0.5), 'sine', 0.08 * vol * gs[i], undefined, delay || 0, 0.002);
}

// low murmured chant: sawtooth voice through a wandering vowel formant
function chant(dur, vol, delay) {
  if (!actx) return;
  const t0 = actx.currentTime + (delay || 0);
  const osc = actx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(98, t0);
  const bp = actx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 3;
  bp.frequency.setValueAtTime(650, t0);
  const gate = actx.createGain();
  gate.gain.setValueAtTime(0.2, t0);
  for (let t = 0.32; t < dur; t += 0.32) {
    osc.frequency.linearRampToValueAtTime(Math.random() < 0.6 ? 98 : 110, t0 + t);   // two-note drone chant
    bp.frequency.linearRampToValueAtTime(rand(450, 950), t0 + t);                    // vowel shifts
    gate.gain.setValueAtTime(rand(0.3, 1), t0 + t);                                  // syllables
  }
  const g = actx.createGain();
  env(g, t0, vol, 0.3, dur);
  osc.connect(bp);
  bp.connect(gate);
  gate.connect(g);
  g.connect(sfxDest());
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}
