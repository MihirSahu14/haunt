"use strict";
// =====================================================================
// PLAYBENCH PROBE (tier 2): lets playbench bots read the game and play it.
// Only defines window.__game; nothing here runs unless a harness calls it,
// so normal play is unchanged. Contract: playbench docs/reference.md "Probe contract".
// Knobs read window.__playbench.overrides in 09-game.js / 10-threats.js:
//   fear_base, fear_decay, scare_hold, exo_calm, night_len, hunt_warn, whisper_fear, whisper_cap, lantern_drain (defaults: design/design.md).
// =====================================================================
(function () {
  const r0 = function (v) { return Math.round(v); };
  const r10 = function (v) { return Math.round(v / 10) * 10; };   // coarse position: hash stays still when the ghost does

  const T = { smax: 0, hunted: false };                            // run-long peaks (one page load = one run)
  function state() {
    const live = mode === 'game' || mode === 'gameover' || mode === 'ending';
    const gr = live ? roomAt(ghost.x, ghost.y) : null;
    const toasts = threat ? threat.toasts.concat(threat.banners.slice(0, 1)) : [];   // the showing reward banner wins the toast slot
    if (threat) {
      T.smax = Math.max(T.smax, threat.suspicion);
      T.hunted = T.hunted || !!threat.hunter;
    }
    return {
      over: mode === 'ending' || mode === 'gameover',
      won: mode === 'ending',
      paused: mode === 'title' || !!(threat && threat.paused),
      score: family.filter(function (m) { return m.state === 'gone'; }).length,
      mode: mode,
      lose: threat && threat.gameOver ? threat.gameOver.reason : null,     // banished | faded | dawn
      ghost: { x: r10(ghost.x), y: r10(ghost.y), room: gr ? gr.id : null },
      family: family.map(function (m) {
        const r = roomAt(m.x, m.y - 20);
        return { id: m.id, fear: Math.floor(m.fear), state: m.state, room: r ? r.id : null };
      }),
      ecto: game ? r0(game.energy) : 0,
      suspicion: threat ? r0(threat.suspicion) : 0,
      presence: threat ? r0(threat.presence) : 0,
      lights: !!(threat && threat.lights),
      hunter: !!(threat && threat.hunter),
      powers: { q: !!(threat && threat.whisper), r: !!(threat && threat.manifest) },
      tasks: threat ? threat.objectives.filter(function (o) { return o.done; }).length : 0,
      diary: !!(threat && threat.showObj),
      toast: toasts.length ? toasts[toasts.length - 1].text : '',
      t: threat ? r0(threat.clock) : 0,                                     // night clock (ignored by the hash)
      _dawn_in: threat ? r0(NIGHT_LEN - threat.clock) : NIGHT_LEN,
      _susp_max: r0(T.smax),                                                // peak suspicion this run
      _hunted: T.hunted,                                                    // the exorcist came at least once
    };
  }

  // ---------------------------------------------------------------- policy bot
  // ponytail: greedy port of tools/sim.js "careful" bot, driven by keys only. No pathing (the ghost floats
  // through walls), no exorcist-breaking play; upgrade from sim.js if sweeps need a stronger bot.
  const B = { eDown: false, qDown: false, rDown: false, last: null, still: 0, detour: null, hush: false };
  const scareable = function (m) { return m.state === 'idle' || m.state === 'walk' || m.state === 'stare'; };
  function victimsIn(id) {
    return family.filter(function (m) { const r = roomAt(m.x, m.y - 20); return scareable(m) && r && r.id === id; });
  }
  function staleness(o, vics) {
    let s = 0;
    for (let i = 0; i < vics.length; i++) s += (vics[i].habit && vics[i].habit[o.type]) || 0;
    return s;
  }
  function moveKeys(tx, ty) {
    const k = [];
    if (tx - ghost.x > 25) k.push('d');
    if (ghost.x - tx > 25) k.push('a');
    if (ty - ghost.y > 25) k.push('s');
    if (ghost.y - ty > 25) k.push('w');
    return k;
  }
  // tap a key: down on one step, up on the next (the game acts on keydown only)
  function tap(flag, key, keys) {
    if (B[flag]) { B[flag] = false; return; }
    B[flag] = true;
    keys.push(key);
  }

  function bot(s) {
    if (mode === 'title') return ['Enter'];
    if (s.over) return [];
    if (threat && threat.paused) return ['Escape'];
    const h = threat && threat.hunter && threat.hunter.state !== 'flee' ? threat.hunter : null;
    // stuck on salt or a wall: float to a random room centre for a moment
    if (B.last && Math.hypot(ghost.x - B.last.x, ghost.y - B.last.y) < 2) B.still += 1; else B.still = 0;
    B.last = { x: ghost.x, y: ghost.y };
    if (B.still > 15 && !B.detour) {
      const rr = ROOMS[Math.floor(Math.random() * ROOMS.length)];
      B.detour = { x: rr.x + rr.w / 2, y: rr.y + rr.h / 2, n: 25 };
    }
    if (B.detour) {
      B.detour.n -= 1;
      const d = B.detour;
      if (d.n <= 0) B.detour = null;
      return moveKeys(d.x, d.y);
    }
    // lantern close: float to the room farthest from it
    if (h && Math.hypot(ghost.x - h.x, ghost.y - (h.y - 60)) < 320) {
      let far = ROOMS[0];
      for (let i = 1; i < ROOMS.length; i++) {
        const a = ROOMS[i];
        if (Math.hypot(a.x + a.w / 2 - h.x, a.y + a.h / 2 - h.y) > Math.hypot(far.x + far.w / 2 - h.x, far.y + far.h / 2 - h.y)) far = a;
      }
      return moveKeys(far.x + far.w / 2, far.y + far.h / 2);
    }
    const hr = h ? roomAt(h.x, h.y - 20) : null;
    // best room: people (weighted by fear) minus travel, with a ready trick they are not used to yet
    let best = null;
    let bestS = -1e9;
    let pick = null;
    for (let i = 0; i < ROOMS.length; i++) {
      const r = ROOMS[i];
      if (hr && hr.id === r.id) continue;
      const vics = victimsIn(r.id);
      if (vics.length === 0) continue;
      let o = null;
      for (let j = 0; j < OBJECTS.length; j++) {
        const c = OBJECTS[j];
        if (c.room !== r.id || c.cool > 0 || staleness(c, vics) >= 2 * vics.length) continue;
        if (!o || staleness(c, vics) < staleness(o, vics)) o = c;
      }
      if (!o) continue;
      let sc = 0;
      for (let j = 0; j < vics.length; j++) sc += 1 + vics[j].fear / 50;
      sc -= Math.hypot(r.x + r.w / 2 - ghost.x, r.y + r.h / 2 - ghost.y) / 600;
      if (sc > bestS) { bestS = sc; best = r; pick = o; }
    }
    if (!best) return [];
    const ox = pick.x;
    const oy = pick.y - pick.h / 2;
    const keys = moveKeys(ox, oy);
    const gr = roomAt(ghost.x, ghost.y);
    if (!gr || gr.id !== best.id) return keys;
    const vics = victimsIn(best.id);
    let maxFear = 0;
    for (let i = 0; i < vics.length; i++) maxFear = Math.max(maxFear, vics[i].fear);
    // finishing blow
    if (threat.manifest && !(threat.manifestCool > 0) && game.energy >= 60 && (vics.length >= 2 || maxFear >= 60) && threat.suspicion < 40) {
      tap('rDown', 'r', keys);
      return keys;
    }
    // too loud: let the house settle unless someone is about to break
    if (threat.suspicion > 65) B.hush = true;
    if (threat.suspicion < 45) B.hush = false;
    if (B.hush && maxFear < 70) return keys;
    const near = Math.hypot(ghost.x - ox, ghost.y - oy) < 60;
    if (near && game.energy >= threatCost(pick) + 4) {
      tap('eDown', 'e', keys);
    } else if (threat.whisper && threat.whisperCool <= 0 && maxFear >= 40 && game.energy >= threatCost(pick) + 10) {
      tap('qDown', 'q', keys);
    }
    return keys;
  }

  window.__game = {
    state: state,
    actions: ['w', 'a', 's', 'd', 'e', 'q', 'r', 'Tab', 'Escape', 'Enter'],
    bot: bot,
  };
})();
