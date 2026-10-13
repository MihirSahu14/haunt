# "You Are the Haunting": Dread Direction

**Lens:** dread, pacing of fear, atmosphere, sound, foreshadowing.
**Scope:** what the player sees, hears and feels, and when. Map layout, economy, objectives and UI come up only where they affect fear. All numbers are starting values to tune. World units are logical pixels. Gains are linear values into the existing `master` (0.75) and compressor chain.

---

## 0. The short version

1. **Darkness is the default.** A low-resolution light map covers the world. Lamps, candles, lightning, the TV and your own glow cut holes in it. Light keeps you safe from the thing hunting you, but it also lets the family see you.
2. **Every scare has a fuse:** cue, rise, hush, payoff, aftermath. Haunts are charged by holding E. Victims *notice* before they break, and the best scares land during the notice.
3. **The family gets used to spam, the same way the player does.** If you repeat a haunt on the same person, it fades into a tired sigh. Variety and pacing are rewarded, and the combo becomes a **crescendo**.
4. **Noise brings the hunters.** Every haunt is a sound, and the hunters walk toward sounds. Spamming E now puts you in danger.
5. **The Pale hunt you.** When a family member flees, their pale double stays in the house. It is their true ghost self, and it is the twist in plain sight. The Pale move only in darkness and freeze in light. They have audio tells and touching them has consequences.
6. **A tension director paces the run** across three acts plus a finale in 2 to 5 minutes. It runs build, peak and relax phases, so quiet stretches are guaranteed.
7. **Full-screen faces are rare:** at most 3 during play and 1 in the ending, at least 50 s apart, and each one is a different kind of scare.
8. **The twist is foreshadowed in at least 12 ways.** These include the mirror, the breathing, footsteps that follow you, your light becoming a flashlight cone, "she" in the family's lines, a calendar showing today's date in 1986, a stopped clock at 11:40, and a music box melody that never resolves until the ending.
9. **Sound is mostly silence.** There is a rain bed, a few sparse diegetic sounds, heartbeat and breathing tied to danger, and real silence before payoffs. The saw-wave drone and the scheduled creaks go.
10. **Post effects follow dread instead of running constantly.** Scanlines, the always-on chromatic aberration, the global flicker metronome, pop text and screen shake on ordinary haunts are removed.

---

## 1. Why the current build isn't scary

| Problem | Where (index.html) | Effect on the player |
|---|---|---|
| The house is lit like a dollhouse. Every room gets a warm radial gradient and saturated wallpaper. | `drawHouse` ~L792–809, `PAPER_N` L550 | Nothing is hidden, so nothing can be waiting in the dark. |
| Constant feedback: "SPOOKED!", "+25 FEAR", "!!", combo banners, "IS OUTTA HERE!" | `pop()` calls at L2073, L2087, L1954, L1965; `bangT` L1206 | It reads as an arcade score loop, the opposite of dread. |
| Shake on every haunt; chromatic aberration always at 1.2 px; scanlines, grain and a random global darken every ~1.6 s | L2052, L2074, L2594, L2238–2239, L2618 | Effects that never stop become wallpaper. When everything is loud, nothing is. |
| Scares run on a metronome: stare every 23–28 s, creak every 4–9 s, one drone from frame 1 that never changes | L2190, L2218, L1845 | Players learn the rhythm within a minute. |
| The scare arrives before any dread: the kid gains fear automatically from 8 s so the first face lands around 20 s | L2182–2185 | A payoff without a setup is noise. |
| Five near-identical faces: one per member plus four at the end, same template, same 0.7 s, same sting | L1933–1945, L2489–2497 | The player is used to them by the third. |
| The player is never at risk: a mint-glowing cartoon sheet at 400 px/s and nothing hunting it | L1212–1239, L1216–1220, L1649 | Horror needs vulnerability. |
| The family's fear is slapstick: hair spikes, bug eyes, "!!" | L1094–1099, L1327–1330 | Comic fear doesn't transfer to the player. |
| The twist is told rather than foreshadowed: only "...you again." hints at it | L2367, L2542–2543 | The reveal is text the player reads, not something they recognize. |

---

## 2. Pillars

1. **The dark is the default.** Light is both safety and exposure.
2. **Silence is a sound.** Loudness is budgeted. Quiet stretches are designed, not leftover.
3. **Every scare has a fuse.** If the player can't feel it coming, it isn't a scare, it's an interruption.
4. **Rare, earned, and never the same twice.** Each face is a different kind of event.
5. **You are prey too.** Something in the house is coming for you, and that something is the truth.
6. **Show, never explain.** No wrongness is captioned, no hint is labelled, and no lore is dumped before the ending.

---

## 3. The fear loop: haunting with anticipation

### 3.1 The five beats of every scare
| Beat | Duration | What happens | What the player feels |
|---|---|---|---|
| **Cue** | instant | The target object makes a small sound and the victim pauses mid-step. | "Something's starting." |
| **Rise** | the charge (0.5–2.4 s, hold E) | The object reacts more and more (see 3.2). A low sine rises from 55 to 82 Hz at gain 0.015. The camera eases 3.5 % toward the object and the vignette tightens 6 %. | Anticipation and control. |
| **Hush** | 0.35–1.0 s, random (Medium and Big only) | Ambient, sfx and music buses duck to 8 % in 0.15 s. The heartbeat, if audible, skips a beat. | Breath held. |
| **Payoff** | 0.3–1.5 s | The haunt fires at full volume and the victim reacts. | Release. |
| **Aftermath** | 2–6 s | Ambience returns slowly (time constant 1.2 s, never a snap back). The victim breathes fast and dust settles. | Lingering unease. |

Small and Whisper tiers skip the hush and fire on release. That keeps the input responsive and saves the silence for the scares that matter.

### 3.2 Charging (replaces tap-E)
- **Input:** hold E, or hold the mouse on the object.
- **Charge times by tier:** Whisper 0.5 s, Small 1.0 s, Medium 1.6 s, Big 2.4 s.
- **What the object does as it charges (examples):**
  - Chair: rock amplitude rises from 0.03 to 0.18 rad.
  - Closet: door opens 0 to 4 px, and at 70 % the eyes from the existing L1458 glint for 1 frame.
  - Piano: one key depresses on its own at 50 %.
  - Mirror: fogs from the bottom up.
  - Lamp: flicker rate rises.
  - TV: snow brightness creeps up.
- **Releasing early:**
  - Below 40 %: cancels with no cost.
  - 40 % or more: plays the Whisper-tier cue and puts nearby victims into NOTICE with no fear gain. This is **teasing**, a legitimate tool for setting up a crescendo.

### 3.3 Victim states: NOTICE and UNEASE
- **NOTICE** triggers on a cue: a charge of 40 % or more, or a Whisper payoff, for living members in the same room within 500 px.
  - They stop, turn toward the source over 0.35 s and lower the held item.
  - A **breath-catch** plays (9.3).
  - The state holds for 1.2–3.0 s.
  - For a Medium or Big cue there is a 40 % chance they **investigate**, stepping toward the object at 30 px/s.
  - Reuse the existing `'stare'` front-facing pose code path for the turn (L1010).
- **UNEASE** follows a NOTICE that ends with no payoff:
  - Walk speed +20 %.
  - A look over the shoulder every 3 s (flip `facing` for 0.4 s).
  - Fear does not decay for 10 s.
- The cartoon reactions go: no hair spikes and no "!!". Fear shows in posture. Arms come in and up, the head drops, the steps back away, and the held item falls (keep `dropItem`).

### 3.4 Fear modifiers (anticipation is rewarded)
| Factor | Multiplier |
|---|---|
| Base fear by tier | Whisper 5, Small 12, Medium 22, Big 34 |
| Victim in NOTICE when the payoff lands | ×1.5, or ×1.7 if they are facing the object |
| Victim standing in darkness (litness < 0.35) | ×1.4 |
| Victim standing in lamp light | ×0.7 |
| Alone (no other living member within 400 px) | ×1.25 |
| In a group | ×0.8 (they reassure each other) |
| Victim **saw the ghost** in the last 15 s | ×0.5 ("it's just her again") |
| Habituation, same haunt *type* on the same victim | ×0.45ⁿ, where n is the uses in the last 45 s |
| Crescendo step k (3.6) | ×(1 + 0.35·(k−1)) |

No fear numbers ever appear on screen. Coarse state (calm, uneasy, afraid, breaking) is shown through body language and, if the UI pass keeps portraits, their faces.

### 3.5 Habituation is the anti-spam rule and also the theme
A habituated victim stops jumping. They **sigh** (9.3), their shoulders drop and they keep walking. The player watches spam fail inside the fiction, which teaches the rule without a tooltip. It also echoes the user's own complaint: fear that repeats becomes noise, for the family and for you.

### 3.6 Crescendo (replaces the 3-second combo)
A crescendo is up to 3 haunts on the **same victim** where:
- each step is a **strictly higher tier** than the last,
- each step comes **4–14 s** after the previous one, and
- the victim stays in NOTICE or UNEASE throughout.

A three-step crescendo ending on a Big haunt is a **Perfect Haunt**. A Perfect Haunt that terrifies its victim is the only thing that can earn the first full-screen face (7.2, F1). The scariest thing the player does is also the scariest thing they see.

Feedback stays in the fiction, with no banners: the victim's breathing quickens with each step, and on the third step the room's light flickers once.

### 3.7 Noise brings the hunters (the spam deterrent)
| Action | Noise radius (world px) |
|---|---|
| Charging (continuous) | 100 |
| Whisper payoff | 0 |
| Small payoff | 250 |
| Medium payoff | 500 |
| Big payoff | 900 |
| Ghost moving above 250 px/s | 120 (cloth rustle) |
| Lamp burst on a terrify | 700 |

Any Pale inside the radius sets its target to the noise position and gets +40 % speed for 4 s.

### 3.8 Snuff, then scare
The Whisper-tier haunt **Breath** blows out a candle (Act III) or makes a lamp gutter out for 8–15 s (Acts I–II).
- The victim is left in darkness (×1.4) and in NOTICE.
- They fumble for 6 s and then relight it (match strike, 9.3).

This is the standard way to build a scare: darkness, fumbling, a slow medium haunt, then the big one.

---

## 4. Darkness and light

### 4.1 What light means in play
- **Lit point:** total light strength of 0.35 or more, computed analytically (4.3). Never read pixels back.
- **In light:**
  - The Pale cannot move.
  - A living member facing you within 450 px **sees** you. They get the ×0.5 fear debuff for 15 s, director intensity rises by 0.2, and they sometimes speak a line (8.1).
- **In darkness:**
  - Your haunts hit ×1.4.
  - You can barely see.
  - The Pale move.
- **The stealth rhythm:** approach through the dark (the Pale), strike, then retreat to light that nobody is looking at.

### 4.2 Light sources
| Source | Radius / shape | Strength | Tint (additive pass) | Flicker | Notes |
|---|---|---|---|---|---|
| Lamp (ceiling or table) | 240 | 0.95 | warm `#ffb070` at 0.12 | ±1.5 % slow; dropout 60–140 ms about once per 40 s | Bursts when someone is terrified in its room. All die at the power cut. |
| Candle (family carries one, Act III) | 130, follows hand ±2 px sway | 0.80 | `#ff9a50` at 0.14 | ±6 % noise at ~9 Hz | Snuffable; relit after 6 s of fumbling. |
| Ghost glow (Acts I–II) | 95; 55 when still ≥ 1.2 s | 0.40; 0.22 when still | none (cold, reveal only) | ±4 % at 0.25 Hz, **synced to the breathing audio** | Replaces the mint halo and trail. |
| **Ghost cone** (Act III onward) | 420 long, 22° half-angle, plus 45 radius around you | 0.75 at apex, 0 at tip | `#fff0d0` at 0.06 | Battery dropout once per 25 s; every 0.4–1.0 s when a Pale is within 150 px | Secretly the girl's flashlight (5.7). |
| Window moonlight | static shaft polygons (reuse the ending's beam polygons, L2510–2513) | 0.16 in Act I, 0.08 from Act II (storm clouds) | `#8fa6c8` at 0.05 | none | Gives the corridors silhouettes. |
| Lightning | global plus window shafts | ambient drops to 0.12 | full-screen `#c8d6ff` at 0.10 | sequence in 4.4 | The director's flashbulb. |
| TV (Act III, **no power**) | 200 | 0.55 | `#9fb4d0` at 0.08 | 30 % per-frame jitter at 12 Hz | A safe island that shouldn't exist. |

**Ambient darkness alpha by act:** I 0.86, II 0.91, III 0.955, IV and finale 0.97. Darkness colour is `#030409`, very slightly blue.

### 4.3 Rendering recipe (Canvas 2D, cheap)
```
setup:
  lightCv = makeCanvas(320, 180)              // quarter-res light map
  LIGHT   = prerendered 128x128 radial sprite (stops 0:1, .35:.75, .7:.25, 1:0)
  CONE    = prerendered 256x128 cone sprite (radial falloff from apex)
  WARM    = LIGHT tinted #ffb070, CANDLE tinted #ff9a50

each frame (after world drawn to sc with camera transform):
  lc.globalCompositeOperation = 'source-over'
  lc.fillStyle = 'rgba(3,4,9,' + ambient + ')'
  lc.fillRect(0, 0, 320, 180)
  lc.globalCompositeOperation = 'destination-out'
  for each light: lc.globalAlpha = strength * flicker
                  lc.drawImage(LIGHT, (sx - r)/4, (sy - r)/4, r/2, r/2)   // screen coords /4
  cone: lc.save(); translate; rotate(aim); drawImage(CONE ...); lc.restore()
  lc.globalCompositeOperation = 'source-over'
  sc.imageSmoothingEnabled = true
  sc.drawImage(lightCv, 0, 0, W, H)           // upscale = free soft edges
  -> desaturate (post, sec 10)
  sc.globalCompositeOperation = 'lighter'      // colour comes back ONLY from lights
  for each warm light: sc.globalAlpha = tintAlpha; sc.drawImage(WARM, ...)
```
- **The look in one sentence: only light has colour.** Desaturate first, then add warm light back.
- **Litness function** for gameplay (seen checks, Pale freezing, mote alpha): `lit(x,y) = Σ strength·(1 − d/r)²` over lights with d < r, plus a cone test (angle and distance). Clamp to 0–1. Never call `getImageData`.
- **Dust motes:** 40 particles drifting 3–8 px/s. Draw them before the darkness layer so they only show inside light pools.
- **Pale and members** are drawn before the darkness layer. The Pale also get an alpha from litness (5.3).

### 4.4 Lightning
- **Flash sequence:**

  | Time | Ambient |
  |---|---|
  | 0–70 ms | 0.12 |
  | 70–150 ms | base × 0.8 |
  | 150–270 ms | 0.25 |
  | 270–700 ms | exponential decay back to base |

  That is two flashes in 0.27 s, which stays under the 3 flashes per second photosensitivity limit. No other full-screen flash may occur within 1 s of a strike.
- **While ambient < 0.4 (inside the flash):**
  - Every Pale is fully visible.
  - Living members render with the existing `PALE` palette (L943) with probability 0.3 in Act II and 1.0 in Act III. The roll happens once per member per strike, so both flashes agree.
  - From Act II, mirrors show the girl.
  - Wet footprints become visible.
  - Your shadow on the wall behind you is a girl's silhouette (prerendered from `drawGirl` as a black sprite), offset +30 px and stretched 1.4×.
- **Frequency and thunder delay (the storm approaches across the run, which works as a clock):**

  | Act | Strikes | Thunder delay |
  |---|---|---|
  | I | Distant only: a window flicker with no shafts, about once per 40 s | 6–8 s, rumble gain 0.08 |
  | II | Every 25–45 s | 1.5–3.5 s |
  | III | Every 12–28 s | 0.2–1.2 s |
  | Set pieces | — | close strike under 0.15 s, used only at the power cut and the finale |

- **Rules:** no strikes during RELAX. The director can request a strike for a sighting (6.5). It waits until the target Pale is on screen, then fires.

### 4.5 A readability floor (dark, not unplayable)
- Floor lines and door frames get a pre-rendered 1 px rim `#2a2f38` so the space reads at ambient 0.955.
- The family is always faintly visible: at 0.86 ambient a silhouette keeps about 14 % of its brightness, and from Act III they carry candles.
- **Brightness calibration** on the title screen, a stretch goal and a cheap seed: the classic "adjust until barely visible" screen, where the symbol is **a small girl's silhouette holding a flashlight**. The caption is lowercase: *adjust until she is barely visible.* The player doesn't know who "she" is yet.

---

## 5. The Pale: the thing that hunts you

### 5.1 What they are
The Pale are the family's true selves. The game never names them. At first they are faceless pale shapes: one tall, one medium, one small, and one low and four-legged. By Act III they are recognisable silhouettes: Mom's dress line, Dad's shoulders, the Kid's spiky hair, the dog.

**Render:** existing `drawMember(g, m, true)` (L1186). Remove `shadowBlur` (L1196–1197), which is slow every frame, and use one prerendered soft glow sprite at 0.25 instead. Eyes are dark hollows only, with no pupils. They never blink and never animate their walk cycle; they glide with a 0.5 px vertical drift. That wrongness is cheap to do.

### 5.2 When they wake
- **A member flees, and their Pale stays.** "They never left." This is consistent with the twist: ghosts can't leave their house.
- 20–35 s after a member flees, the director places that member's Pale at a dark spot at least 700 px from the ghost.
- It **reveals** the Pale through a lightning sighting (Tier 2) before the Pale ever moves.
- **Maximum active hunters:** 2. A third waits dormant on a stair, facing the wall, as scenery. When the fourth member flees, the finale starts, so there are never 4 hunters.
- **Stall valve** (no terrify by 1:40): the director does **not** spawn an early hunter. It makes the most frightened living member *restless*: they wander alone into dark rooms, which creates easy setups. The director makes openings; it never does the player's job.

### 5.3 Rules
- **Visibility:** `alpha = clamp(lit(x,y) × 1.6, 0, 1) × 0.85`. In total darkness alpha is 0, except a faint 0.04 silhouette when within 160 px of the ghost, so a contact is never completely unseen.
- **Movement:** only when `lit < 0.15`.
  - Speed is 30 px/s in Act II, 38 in Act III and 46 in Act IV, against a family walk speed of 72 and a ghost speed of 400. They win through persistence and the player's carelessness: a long charge, a fixation on a victim.
  - They walk the waypoint graph and take the stairs with the existing `makePath` (L1856), because they walk like people. **They never pass through walls; only you do.**
- **Targeting priority:**
  1. The last noise within 12 s.
  2. The ghost, if within 520 px and on the same floor.
  3. The nearest dark spot next to the ghost's current room (pressure).
  4. Dormant: face the wall at a fixed spot.
- **During director RELAX:** unlit Pale fade to 0 over 2 s and move to far-away dormant spots. They come back during BUILD. This guarantees breathing room.

### 5.4 The proximity ladder (fair warning, all non-verbal)
| Distance to ghost | Audio | Visual | Director |
|---|---|---|---|
| < 900 (any floor) | Signature sound (below), occluded and panned | — | dread +0.02/s |
| < 500 | Signature louder; rain −4 dB; any music box detunes | grain +0.03 | intensity +0.05/s |
| < 300 | **Your breathing stops (held)**; heartbeat fades in at 85 BPM | vignette tightens 8 %; glow stutters every 1.5 s | intensity +0.12/s |
| < 150 | Heartbeat 110 BPM; signature close and dry (no reverb send) | cone or glow dropouts; faint silhouette at the edge of your light | intensity +0.25/s |
| < 48 | — | **contact** | see 5.5 |

**Signatures**, so each Pale can be identified and located by ear:
- **Kid:** a rubber ball bouncing (9.3) every 6–9 s, and small bare footsteps 0.33 s apart.
- **Mom:** humming the music-box melody an octave down, slow and 30 cents flat (9.6).
- **Dad:** heavy footsteps 0.9 ± 0.15 s apart (arrhythmic), lowpass 160 Hz, and **no floor creak** even on boards that creak for the living.
- **Dog:** claws clicking in groups of 4 every 0.08 s, plus slow panting at 2.2 Hz.

### 5.5 Contact
1. **Hold the frame for 3 frames** (render nothing new; the last frame stays up).
2. Cut to black, or to face **F2** the first time (7.2).
3. 1.8 s of black with tinnitus (9.3).
4. The ghost reappears **rising slowly out of the girl's bed** in the attic. Foreshadow: ghosts don't sleep in beds.

**Suggested consequences** (the systems designer owns the numbers):
- You lose 1 of 3 *veils* (strikes).
- All living fear drops by 15, because they calmed down while you were gone.
- The Pale that touched you goes dormant for 45 s.
- The director forces RELAX for 25 s.
- The third contact ends the run in the **Found** ending (11.5).

### 5.6 Counterplay
- **Light:** stand in a lamp pool or the TV glow and the Pale freeze, but the family may see you.
- **Stillness:** after 1.2 s still, your glow dims and any Pale beyond 200 px loses you and goes to the last noise.
- **Lures:** a Big haunt in a far room pulls them away.
- **Lightning:** everything freezes during a flash, and each flash shows how far they moved since the last one. This is the most reliable chill in the design.
- **Floors:** the Pale use the stairs, and you can float through ceilings (if the map pass allows it).

### 5.7 Act III: your light becomes a cone
At the power cut your glow becomes a **cone**. The player reads it as a ghost power. At the reveal it is the girl's flashlight.
- **Aim:** facing direction from horizontal input. If the mouse moved in the last 2 s, aim at the mouse, clamped to ±60° from horizontal.
- **The cone freezes any Pale it touches,** so anything behind you moves. This is the classic "don't look away" tension, with audio coming from behind.
- **The family can see you in your own cone.** Your light both protects you and exposes you.

---

## 6. The tension director

### 6.1 Variables
```
dir = {
  act: 1,                 // 1 Settling, 2 Storm, 3 Lights Out, 4 Last One
  phase: 'build',         // build | peak | relax | hush
  phaseT: 0,              // seconds in phase
  intensity: 0,           // 0..1 short-term (L4D style)
  intensitySm: 0,         // smoothed, tau 8 s
  dread: 0,               // 0..1 long arc; drives look and sound bed
  faces: 0, lastFaceT: -999,
  sightings: 0, lastSightT: -999,
  fakeouts: 0, silences: 0, lines: 0, stares: 0,
  nextBeatT: 25,
  deck: [],               // shuffled beats for current act
}
progress  = 0.6 * fled / 4 + 0.4 * min(1, t / 240)
dread     = clamp(0.15 + 0.55 * progress + 0.30 * intensitySm, 0, 1)
```

### 6.2 Acts (gated by progress, with time fallbacks to stay inside 2–5 min)
| Act | Starts | Ends when | Time fallback |
|---|---|---|---|
| Cold open | 0:00 | after 20 s, or click | — |
| **I Settling** | 0:20 | the first terrify | At 1:40 the stall valve opens (5.2). No automatic fear. |
| **II The Storm** | the first terrify | a second member has fled | 2:50: the power cut fires anyway |
| **III Lights Out** | the power-cut set piece | a third member has fled | 4:20: Act IV starts anyway |
| **IV The Last One** | the third member flees | the fourth member flees, then the finale | 5:00: the **Dawn** ending (a loss) |

### 6.3 The phase machine
| Phase | Enters when | Lasts | Behaviour |
|---|---|---|---|
| **BUILD** | RELAX ends and intensity < 0.3 | until PEAK | Beats may fire, Pale hunt, lightning is allowed. |
| **PEAK** | intensity ≥ 0.8, or a Tier-3 event fires | 3–5 s | No new beats; the moment plays out. Then RELAX. |
| **RELAX** | after PEAK | I 25–35 s, II 20–30 s, III 14–22 s, IV 8–12 s | Pale withdraw, no lightning, rain −3 dB, heartbeat decays, breathing calms, no beats. Player haunts still add intensity but can't trigger PEAK below 0.95. |
| **HUSH** (sub-state) | wraps every Tier-3 event and fake-out | 0.4–1.8 s, random | All buses fall almost to silence; the heartbeat stops. |

### 6.4 Intensity inputs
| Event | Change |
|---|---|
| Pale within 300 px | +0.12/s × (1 − d/300) |
| Pale within 150 px | +0.25/s |
| Pale contact | set to 1.0 |
| Seen by a living member | +0.2 |
| Your Big or Medium payoff | +0.15 / +0.08 |
| Close lightning (thunder under 1 s) | +0.15 |
| Tier-2 sighting | +0.3 |
| Tier-3 face | set to 1.0 |
| Decay | −0.07/s in BUILD (only with no Pale within 300 px), −0.12/s in RELAX |

### 6.5 The beat deck
A beat is a Tier-1 or Tier-2 event that the director places.
- Beats are drawn **without replacement**. If a beat's precondition fails (for example, a drawing is on screen), put it back and draw the next.
- Beats fire **only in BUILD and only when intensity < 0.55**.
- Every interval is randomised. Nothing in the house runs on a fixed timer.

| Act | Interval | Deck |
|---|---|---|
| I | 22–40 s | footsteps in an empty upstairs room; a distant door click; one lamp flickers; the music box plays faintly from the attic (once); the clock skips a tick; the dog growls at an empty corner; the Kid's ball rolls across a doorway |
| II | 14–28 s | **lightning sighting of a Pale** (needs one awake); a drawing has changed (only when it's off screen); a member turns and **stares at the camera** (once); a whisper from inside a wall (panned far); footsteps take one step after the member stops; the rain stops for 6–10 s (silence window); wet small footprints; the portrait looks past you |
| III | 9–20 s | the TV turns on by itself; the music box winds down; a new height mark appears; your breathing stops but other breathing continues; lightning shows everyone pale; **fake-out** (7.4); a candle goes out on its own |
| IV | scripted only | see 11.3 |

### 6.6 Budgets and spacing (hard rules)
- **Faces:** at most 3 during play, at least 50 s apart, never during RELAX, never in Act I unless it's the earned F1 at 0:45 or later, and never the same variant twice. A face blocked by the budget is downgraded to a black-cut aftermath (7.3).
- **Tier-2 sightings:** at most 5, at least 25 s apart.
- **Fake-outs:** 2 per run (one in Act II, one in Act III), at least 30 s after any face.
- **Silence windows** (the rain stops): at most 3, each 6–10 s.
- **Stares at the camera:** at most 2.
- **Spoken lines:** at most 6 (8.1).
- **Loud sounds** (peak gain > 0.3) outside a payoff: at most 1 per 8 s.

### 6.7 Update sketch
```
function updateDirector(dt) {
  // inputs and decay (6.4)
  // phase machine (6.3)
  dir.phaseT += dt;
  if (dir.phase === 'build' && dir.intensity >= 0.8) setPhase('peak');
  if (dir.phase === 'peak' && dir.phaseT > dir.peakLen) setPhase('relax');
  if (dir.phase === 'relax' && dir.phaseT > dir.relaxLen && dir.intensity < 0.3) setPhase('build');
  // beats (6.5)
  if (dir.phase === 'build' && dir.intensity < 0.55 && game.time >= dir.nextBeatT) {
    const ok = fireNextBeat();                    // draws from deck, checks preconditions
    dir.nextBeatT = game.time + (ok ? beatInterval(dir.act) : 2);
  }
  // long arc
  dir.intensitySm += (dir.intensity - dir.intensitySm) * Math.min(1, dt / 8);
  dir.dread = clamp(0.15 + 0.55 * progress() + 0.3 * dir.intensitySm, 0, 1);
}
```
Remove the old fixed timers (`creepyT` L2188, `creakT` L2216, the global `flickerT` L2238) and the kid's automatic fear (L2182–2185). Ambient creaks become a Tier-1 card with ±40 % jitter, and they are silent during RELAX.

---

## 7. Scare tiers and the faces

### 7.1 Tiers
| Tier | What it is | Frequency |
|---|---|---|
| 0 Ambience | Rain, room tone, wind, hum | constant and low |
| 1 Wrongness | Distant footsteps, door clicks, flickers, a drawing changed | director beats, every 9–40 s |
| 2 Sighting | A Pale in a lightning flash, a stare at the camera, the mirror girl, everyone pale | ≤ 5 per run; quiet **glass tone** sting (9.3) |
| 3 Payoff | Full-screen faces and contact | ≤ 3 in play plus 1 in the ending |

### 7.2 Face variants (each one is a different kind of scare)
| ID | Name | Trigger | Build | Payoff | Audio | Aftermath |
|---|---|---|---|---|---|---|
| **F1** | Scream | First terrify that comes from a **Perfect Haunt**, 0:45 or later | The victim's NOTICE pose (0.6 s), then hush 0.5 s; the heart stops | The existing `drawScreamFace`, **desaturated**, comic hair spikes removed (L1327–1330), vertical stretch 1.25, slow push-in from 0.95 to 1.25 scale, slice glitch only on frames 0–6, **0.75 s** | `scream(pitch)` plus the **Snap** stinger | 0.4 s black, then a fade in with ambience muted and tinnitus for 3 s |
| **F2** | Too Close | First Pale contact | The proximity ladder (5.4) | A pale face with black hollow eyes and a **closed** mouth enters **off-centre** (x +380), cropped by the screen edge, **0.35 s** | Sub **Drop** plus one close loud inhale; **no scream** | 1.8 s black, tinnitus, rise from the bed |
| **F3** | The Turn | Director, Act III: BUILD with intensity < 0.4 and at least 25 s with no face, which catches the player relaxed | A living member stands in your light with their back to you. The camera drifts toward them imperceptibly over 2 s. They stop walking. The rain cuts out. **1.0–1.6 s** of silence | Their **head** turns (not the body) to show a pale face with black eyes, small and in-world. Then a hard cut to full-screen of that face, **0.45 s**, holding 2 frames | **Cluster** stinger, with its pre-swell running through the silence | Black, then a slow fade in; that member is visibly pale for 4 s and then "normal" again |
| **F4** | Reflection | Act III: the player lingers in front of a mirror ≥ 1.5 s (once) | The mirror slowly fogs. The reflection is the girl, looking at you | She raises the flashlight. The beam fills the screen: a **white-out** over 0.4 s, which is a *bright* scare instead of a dark one | A high glass tone rising from 1.2 to 2.4 kHz, then cut | White fades to the scene over 1.5 s; the mirror is cracked from then on |
| **F5** | Ending | Finale (11.4) | The girl turns in silence | Four pale faces caught **together in her beam**, not a grid | Drop plus Cluster | Black, then the text |

No variant repeats within a run. They differ in framing (centred, cropped, in-world turned full-screen, white-out), duration (0.35–0.75 s), sound (scream, nothing, cluster, glass) and aftermath (black, fade, white).

### 7.3 Terrify without a face (the rule from the second terrify on)
Once F1 has been used, or when the face budget is blocked, a terrify plays one of these *aftermaths*. Restraint is scarier than repetition.
- **(a) Burst:** the room's lamp bursts (9.3), the room goes dark, and you **hear** the scream through the walls, filtered and panned. Running footsteps follow, then the front door slams far away.
- **(b) Silent:** the member freezes, drops their item and backs away for 1.5 s with no sound but breathing, then runs. No scream at all.

### 7.4 Fake-outs (two per run)
Fake-outs run the full **cue, rise and hush**, then resolve into something small. Ambience returns over 3 s.
- **Act II:** heartbeat rises and a music-box note detunes in the room you're in, then silence for 1.2 s. The Kid's ball rolls slowly out of the dark and stops against you. Nothing else happens.
- **Act III:** a closet door opens by itself over 3 s and nothing is inside. The next time you pass, it is closed.

The ratio of 2 fake-outs to 1 real payoff means the player can never relax during a hush.

---

## 8. Foreshadowing: the wrongness ledger
The player should be able to guess the twist from these, and recognise it in hindsight. None of them is captioned.

| # | Seed | Act I | Act II | Act III | Ending payoff | Implementation | Priority |
|---|---|---|---|---|---|---|---|
| 1 | **Stopped clock** (hall) | Hands at 11:40, pendulum still, **ticking audible** | same | Ticks become irregular (15 % skipped, 5 % doubled) | The pendulum swings and the hands show the real time (`new Date()`) | Static drawing plus tick sound within 500 px | P1 |
| 2 | **Mirror** (bath, hall) | The reflection lags 0.25 s | Two small slippers show under the hem, **in the reflection only** | The reflection is the girl with a flashlight; the "GET OUT" haunt now writes **mirrored**, as if written from the other side *to you* | The final shot shows the girl in the mirror before the sprite changes | Clipped ellipse plus `scale(-1,1)`; position ring buffer; reuse `drawGirl` | P1 |
| 3 | **Pale in lightning** | — | 30 % of living members per strike | 100 % | They are the family's true selves | `PALE` palette swap during the flash | P1 |
| 4 | **Pronouns in lines** | "...you again." | "she's back." | "is that the girl?" | — | 8.1 | P1 |
| 5 | **Breathing** | — | Faint breathing when you're still for more than 2 s | It holds near the Pale; louder | Clearly a child's breathing | 9.3 | P1 |
| 6 | **Footsteps that follow you** | — | — | From the power cut: small slipper steps synced to your movement with a 0.12 s lag. Players first think something is following them | They were hers | 9.3 | P1 |
| 7 | **The music box never resolves** | Cold open: the phrase ends unresolved | Distant, once | Winds down and stops mid-phrase | It finally resolves to A4 | 9.6 | P1 |
| 8 | **Your light** | A soft glow | A soft glow | A **cone** | She holds the flashlight | 5.7 | P1 |
| 9 | **The bed** | You rise from a bed at the start | You rise again after contact | — | It's her bed | Free | P1 |
| 10 | **Portrait eyes** | Follow you (exists, L1605) | **Look past you**, at the nearest Pale | same | — | `look` target becomes the nearest Pale | P1 (trivial) |
| 11 | **Kid's drawings** (fridge) | A house, 4 coloured figures and a sun | Changes off screen: a 5th small figure appears in the attic window with a yellow cone | The 4 figures are white with black eyes; the small one is in colour | — | 64×48 offscreen canvas, jittered crayon strokes; swap only when off camera | P2 |
| 12 | **Calendar** (kitchen) | Shows **today's day and month, in 1986**; earlier days crossed out | same | same | "40 years" lands | `new Date()` with the year forced to 1986 | P2 |
| 13 | **Height marks** (Kid's doorframe) | Pencil marks '81 to '86, then nothing | — | A fresh mark appears at a different height, labelled with the current year | — | Ink Free 9 px, fallback `cursive` | P2 |
| 14 | **Dog** | **Wags** the first time it sees you (dogs love the living); growls at empty dark corners where dormant Pale stand | same | — | — | Tail-wag state; growl sound | P2 |
| 15 | **TV without power** | — | — | Turns on after the power cut and shows the house from outside with one lit attic window | — | A small render on the TV screen | P2 |
| 16 | **The sheet** | A classic sheet | Hem lifts 2 px | A slight shoulder line and a bump at the "hand" where the flashlight is; slipper toes show | — | A `girlness` 0 to 0.5 morph on `drawGhost` path points | P2 |
| 17 | **Wet footprints**, small and bare | — | Bathroom to hall, visible only in light or lightning | same | — | Decals drawn under the darkness layer | P3 |
| 18 | **Calibration screen** | "adjust until she is barely visible" | — | — | — | Title screen | P3 |

### 8.1 Lines (at most 6 per run, never on a timer)
- **Trigger:** the first time each member *sees* you in light, plus two Act III specials. Later sightings get only a **sigh**.
- **Lines, in order:**
  1. First sighting by anyone: *"...you again."*
  2. Mom: *"she's back."*
  3. Dad: *"don't look at her. she leaves if we don't look."*
  4. Kid (Act II or later): *"is that the girl?"*
  5. Act III, any adult alone: *"forty years of this."*
  6. Act IV, the last member: *"...please. just go home."* In hindsight, she *is* home.
- **Style:**
  - lowercase Palatino Linotype italic 20 px (fallback Book Antiqua, Georgia, serif)
  - colour `#aab2bb` at 0.7 alpha, no stroke or outline
  - letters fade in on a 35 ms stagger with 0.3 px jitter
  - hold 2.5 s, fade over 1.2 s, drift up 6 px
- **No synthesised voices.** The speaker's breath or sigh plays under the line; the words are text only.

---

## 9. Sound design (procedural Web Audio only)

### 9.1 Bus graph
```
source -> StereoPanner -> occlusion Lowpass -> distance Gain -> bus
ambBus   (rain, wind, room tone, hum, drone)   --+
sfxBus   (haunts, creaks, family foley)          +--> duckGain --+
musicBus (music box, Mom's humming)            --+               |
bodyBus  (heartbeat, breathing, tinnitus)  ----------------------+--> preMaster -> master -> comp -> out
stingBus (stingers, scream)                ----------------------+   (stingBus bypasses duck)
reverb send: ConvolverNode (2.4 s procedural IR) fed from sfx, music, footsteps
```
- **Refactor (smallest diff):** give `tone`, `noise`, `creak`, `whisper` and `scream` an optional last argument `out`, defaulting to `master`. Add `playAt(x, y)`, which builds a panner, lowpass and gain chain and returns its input node.
- **Duck:** `duckGain.gain.setTargetAtTime(0.08, now, 0.05)` for a hush. Restore with time constant 1.2 s, so the aftermath is the slow return.
- **Reverb IR:** 2 channels, 2.4 s, `sample = (rand*2-1) * pow(1 - i/len, 3.5)`. Per-room send: bath 0.45, hall 0.35, attic 0.25, basement 0.6, other rooms 0.2.

### 9.2 Spatialisation and occlusion
- **Pan:** `clamp((x - camCenterX) / 700, -0.85, 0.85)`.
- **Distance gain:** `clamp(1 - d/1800, 0.15, 1)`.
- **Occlusion:**

  | Listener vs source | Lowpass | Gain |
  |---|---|---|
  | Same room | open | ×1.0 |
  | Other room, same floor | 2200 Hz | ×0.75 |
  | One floor away | 700 Hz | ×0.5 |
  | Two floors away | 350 Hz | ×0.3 |

  The house becomes a space you can map by ear.
- **Laptop note:** laptop speakers roll off below about 150 Hz. Every sub-bass element (drops, thunder, heartbeat) gets a **2× and 3× harmonic at 30–40 % gain**, so it is still heard without headphones. The title screen says *headphones recommended*.

### 9.3 Recipes
| Sound | Recipe | Gain | When |
|---|---|---|---|
| **Rain bed** | A 3 s stereo buffer generated once: white noise plus 500 droplet impulses (4 ms exponential decay, amplitude 0.1–0.5), looped. Highpass 400, lowpass 2400 (interior). A second instance with lowpass 6000 fades in near windows ("rain on glass") | 0.05–0.10 | Acts I–III; **stops** in Act IV |
| **Wind** | Noise, bandpass 350 Hz Q 0.6 with a frequency LFO at 0.06 Hz ±150 and a gain LFO at 0.09 Hz. A howl layer: bandpass Q 14 at 820 Hz, gain 0.006, swelling occasionally | 0.015–0.035 | Act II onward |
| **Room tone** | A brown-noise buffer (`b = (b + 0.02*w) / 1.02`), lowpass 180 | 0.03–0.05 | always (0.005 in a hush) |
| **Mains hum** | Sines at 60, 120 and 180 Hz (0.004, 0.003, 0.0015), gain by camera distance to the nearest lit lamp | ≤ 0.004 | Acts I–II. **Its stopping at the power cut is the event.** |
| **Drone (replaces the 4-saw pad, L405)** | Two sines at 55 and 55.35 Hz (0.35 Hz beating). Act III adds a sine at 77.8 Hz (a tritone above) at 0.008 | 0–0.03 | Act II onward, scaled by dread |
| **Heartbeat** | *Lub:* sine 60 to 38 Hz over 0.11 s (attack 0.004) plus harmonic 120 to 76 Hz at 35 %. *Dub*, 0.16 s later: sine 52 to 34 Hz over 0.09 s at 70 %. BPM = 62 + 58·h, where h = max(Pale proximity term, 0.5·dread). Gain = 0.32·smoothstep(0.3, 0.85, h). Scheduled from the update loop with 0.1 s lookahead | 0–0.32 | Danger only. **Stops in a hush.** |
| **Breathing** (yours) | *Inhale:* noise, bandpass 900 to 1400 Hz over 1.0 s (Q 1), lowpass 3500, gain ramps 0 to 0.03 at 0.7 s and back to 0 at 1.05 s. 0.15 s pause. *Exhale:* bandpass 1200 to 650 Hz over 1.4 s, peak 0.025. Period 4.2 s calm, 2.4 s anxious, 1.6 s panicked. **Holds** (skips cycles) when a Pale is within 300 px. On release, a shaky exhale with an 8 Hz tremolo at 50 % depth. Finale: centre frequencies ×1.25 plus a faint 420 Hz sine on the exhale at 0.003, which makes it a child's breath | 0–0.04 | Act II onward, when still for more than 2 s |
| **Footsteps (living adult)** | Noise, lowpass 240 Hz, 0.07 s at 0.06, plus sine 75 to 52 Hz over 0.06 s at 0.035. Every 5th step on old boards: `creak(0.4, 0.04)`. Spacing 0.55 s | 0.06 | — |
| **Footsteps (Kid)** | Lowpass 400 Hz, 0.05 s, spacing 0.33 s | 0.04 | — |
| **Footsteps (yours, Act III)** | Highpass 300, lowpass 1200, 0.06 s, attack 0.01 (a slipper shuffle). One per 0.42 s while moving horizontally above 40 px/s, starting 0.12 s **after** movement starts | 0.018 | after the power cut |
| **Cloth rustle** (you, Acts I–II) | A continuous noise source, bandpass 2400 Hz Q 0.7, gain = 0.008·speed/400 | ≤ 0.008 | Acts I–II |
| **Breath-catch** (NOTICE) | Noise, bandpass 1600 Q 1.5, 0.16 s, attack 0.02 | 0.035 | NOTICE start |
| **Sigh** (habituated or seen) | Noise, bandpass 700 to 450 Hz, 0.9 s | 0.03 | — |
| **Clock tick** | Noise, bandpass 3400 Hz Q 6, 0.012 s; *tock* at 2700 Hz; every 1.0 s | 0.02 | within 500 px of the clock |
| **Distant door click** | Bandpass 2000 Q 3, 0.02 s, then a second click at 1500 Hz 0.08 s later, through occlusion | 0.03 | Tier 1 |
| **Lamp burst** | Highpass noise 3000 Hz, 0.08 s at 0.25, plus 6 sine pings at 4–7 kHz with 0.15 s decay and random 0–0.3 s offsets at 0.02. The lamp's hum stops | 0.25 | terrify aftermath |
| **Candle snuff** | Noise, bandpass 800 to 300 Hz, 0.3 s | 0.04 | Breath haunt |
| **Match strike** | Highpass 2000, 0.12 s at 0.06, plus bandpass 600, 0.6 s at 0.015 | 0.06 | relights |
| **Ball bounce** (Pale Kid) | 5 bounces at intervals 0.42, 0.33, 0.25, 0.18, 0.12 s; each a sine 160 to 120 Hz over 0.05 s at 0.05·0.8ⁱ plus lowpass noise click. Then a 1.2 s roll (lowpass 300) at 0.01 | 0.05 | signature |
| **Thunder** | *Crack* (delay under 0.6 s only): highpass 1500, 0.12 s at 0.3. *Rumble:* 4 noise bursts, lowpass 140 Q 0.7, each starting at t + delay + rand(0, 1.2), lasting rand(1.5, 3.5) s, gain rand(0.15, 0.35)·(1 − delay/8), attack 0.08–0.3. *Sub* (close strikes): sine 38 to 30 Hz over 2 s at 0.15, plus harmonics | ≤ 0.35 | — |
| **Glass tone** (Tier 2) | Sines at 1244.5 and 1318.5 Hz (a beating minor second), attack 0.5 s, hold 0.3 s, release 2.5 s, reverb send 0.6 | 0.02 each | sightings |
| **Snap stinger** | Highpass noise 1200, 0.09 s at 0.6 (attack 0.001), plus sine 50 to 30 Hz over 0.6 s at 0.7, plus harmonics | 0.6–0.7 | F1 |
| **Cluster stinger** | Sines at 880, 932.3, 987.8 and 1046.5 Hz. The pre-swell ramps linearly 0 to 0.06 over 1.2 s during the build; at the payoff it jumps to 0.12 with a 2.2 s exponential decay, plus the Snap's sub | 0.12 | F3, F5 |
| **Drop stinger** | Duck everything to 0, then sine 28 Hz for 1.4 s at 0.5 plus 56 and 84 Hz at 0.2 and 0.12 | 0.5 | F2, F5 |
| **Tinnitus** | Sine 4200 Hz at 0.012, 3.5 s exponential decay. All buses duck to 0.25 and come back with time constant 1.6 s | 0.012 | after Tier 3 |
| **Scream** | Keep the existing `scream()` (L299) | — | **F1 only**, plus filtered through walls in aftermath (a) |

The existing `sting()` (L338, 10 sawtooth oscillators) and `glitchSound()` are retired.

### 9.4 Mix by state
| Layer | Act I | Act II | Act III | Act IV | RELAX | HUSH |
|---|---|---|---|---|---|---|
| Rain (inside) | 0.05 | 0.08 | 0.10 | **0** | ×0.7 | 0 |
| Wind | 0 | 0.015 | 0.025 | 0.035 | ×0.7 | 0 |
| Room tone | 0.03 | 0.035 | 0.045 | 0.05 | same | 0.005 |
| Mains hum | 0.004 | 0.004 | **0** | 0 | same | 0 |
| Drone pair | 0 | 0.012 | 0.02 (+ tritone) | 0.03 | ×0.5 | 0 |
| Heartbeat | proximity only | proximity only | dread-driven | min 0.15 | decays | **stops** |
| Breathing | 0 | 0.02 when still | 0.03 | 0.04 | calm | holds |
| Music box | cold open | one distant play | power cut (wind-down) | — | — | — |

### 9.5 Silence rules
1. Every Tier-3 event is preceded by a hush. Every hush has a random length (0.4–1.8 s), so the player can't time it.
2. Up to 3 **rain-stop windows** per run (6–10 s). These are the most noticeable silences, because the player only notices the rain when it goes.
3. When a sound has an obvious end, such as the hum stopping, the music box stopping mid-phrase or the rain stopping, its absence is the event. Nothing replaces it for at least 1 s.
4. Outside payoffs, no more than one loud sound every 8 s, and none during RELAX.

### 9.6 The music-box motif (leitmotif)
- **Melody** (12 notes, A minor), ending on D5 so it stays **unresolved**:

  E5 C5 A4 C5 | E5 D5 C5 B4 | C5 A4 B4 D5 (held)

  Hz: A4 440, B4 493.88, C5 523.25, D5 587.33, E5 659.25.
- **Resolution, played only in the ending:** add C5 B4 A4, with the last A4 held 3 s.
- **Each note:**
  - sine f, gain 0.05, attack 0.002, 1.6 s exponential decay
  - sine at f×3.98, gain 0.012, 0.22 s decay (inharmonic tine)
  - click: highpass 4000 Hz noise, 0.006 s at 0.02
  - spacing 0.36 s
  - detune 6·sin(i·0.9) cents plus a random ±(1−rate)·30 cents
  - reverb send 0.45
- **Wind-down:** the rate falls linearly from r0 to r1 across the phrase. Note spacing is divided by rate; pitch is multiplied by rate^0.35. Settings per use: cold open 1.0 to 1.0; Act II 0.95 to 0.9; power cut 0.9 to 0.6, stopping on note 5.
- **Mom's hum (Pale):** the same notes ×0.5, spacing 0.6 s, triangle wave into bandpass 500 Hz Q 1.5, 5.5 Hz vibrato ±10 cents, legato with 0.08 s glides, 30 cents flat, gain 0.018.

---

## 10. Camera and post-processing

### 10.1 Camera
| Parameter | Value |
|---|---|
| Follow X | `k = 1 - exp(-3.2*dt)` toward `ghost.x + clamp(ghost.vx*0.22, -110, 110)` |
| Follow Y | `k = 1 - exp(-2.2*dt)` toward the **centre of the ghost's floor**, so the camera doesn't bob with the float |
| Dread zoom | `z = 1 + 0.05*dread + 0.035*charge + hushZoom` (hushZoom eases to 0.04 across a hush), smoothed with time constant 1.5 s. **No snap on payoff:** ease back over 2.5 s. On a fake-out the slow ease-back is itself the anticlimax. |
| Handheld drift | x += (sin(t·0.37)·1.4 + sin(t·0.91)·0.5)·(0.3 + 0.7·dread); y += sin(t·0.53)·0.9·(same factor). Felt rather than seen. |
| Shake budget | Normal haunts **0**. Lamp burst 1.5 px for 0.2 s. Close thunder 3 px for 0.4 s. Power cut 6 px. Tier 3 18 px decaying over 0.5 s. Contact 0 (frame hold instead). |
| Letterbox | 44 px bars eased in over 1.0 s for set pieces only (cold open, power cut, Act IV, finale). Their arrival tells the player something is coming. |
| Frame hold | 3 frames on contact; 2 frames on the F3 cut (`render()` returns early) |

### 10.2 Post pipeline (order matters)
world (camera) → light map (4.3) → desaturate → warm-light additive → lightning additive → fog → chromatic aberration (only when > 0.5 px) → grain → vignette → letterbox → UI and whisper text

| Effect | Base | Driven by | Peak |
|---|---|---|---|
| Desaturation | I 0.35, II 0.55, III 0.75, IV 0.85 | act | 1.0 at the twist; only her flashlight keeps warmth |
| Grain | alpha 0.09, **refreshed at 20 Hz** (every 3rd frame, a film cadence rather than digital fizz) | +0.10·dread | 0.5 spike on Tier 3 |
| Vignette | inner 360 / outer 780, alpha 0.72 | inner shrinks to 230 at dread 1; scale ±1.5 % **synced to the breathing audio**; +0.06 darkness on each audible heartbeat | — |
| Chromatic aberration | **0** | Tier 3: 10 px down to 0 over 0.4 s. Mirror events 2 px. Contact 6 px. | 14 |
| Fog | 2 floor-level layers at alpha 0.05 / 0.08, drifting 4 / 9 px/s, `screen` composite | +0.04 in Act III; basement 0.16 | — |
| Scanlines | **removed** (they read as a retro filter preset) | — | — |
| Global flicker | **removed** (L2238, L2618); per-lamp flicker replaces it | — | — |
| Letterbox | 0 | set pieces | 44 px |

Two vignettes are prerendered (soft and tight) and crossfaded by dread, so no gradient is rebuilt per frame. Fog is a prerendered 512×160 texture made from about 60 soft low-alpha circles, tiled horizontally.

### 10.3 Remove from the world layer
- All `pop()` text (L1717 and its callers).
- `bangT` "!!".
- The mint halo, `E` bubble and cooldown ring (`drawHalo` L1642). Readiness becomes a faint cold rim on the object plus a soft whisper when you are within 120 px. The *hold e* hint is shown small, lowercase, at alpha 0.5, for the first 2 uses only.
- The trail (L1242).
- The "FRONT DOOR ←" label (L2356–2357).
- The shaky RGB-split title (L149).

---

## 11. Set pieces and endings

### 11.1 Cold open (0:00–0:20)
1. 3 s of black with rain only.
2. The music box plays the full phrase from somewhere above, ending unresolved.
3. A 4 s fade in on the attic bedroom. Hall lamplight lays a door-shaped wedge across the floor.
4. **The sheet rises out of the bed** over 2 s and settles into its float.
5. The title appears small and fades. One hint line. Click skips.

### 11.2 Power cut (Act III start, 12 s, letterboxed)
| t | Event |
|---|---|
| 0 | The hum rises a semitone over 3 s. Lamps flicker in a wave across the house, from far to near, 0.15 s apart. |
| 3 | The attic music box starts by itself at rate 0.9. |
| 6 | It slows to 0.6 and **stops on note 5**. |
| 6–7.2 | **HUSH:** everything at zero, including the rain. |
| 7.2 | A relay thunk (sine 90 to 40 Hz over 0.15 s plus a click). The hum stops and all lamps die. |
| 7.3 | **Close lightning** (thunder delay 0.1 s, crack and rumble). In the flash: every living member is pale, two Pale stand in the hall, and **your shadow on the wall is a girl's.** |
| 8–9.5 | Dark at ambient 0.955. Breathing only. |
| 9.5 | Your light clicks on as a **cone**, with a double switch click (2.5 kHz, 0.01 s, twice, 0.09 s apart). |
| 10 | The family light candles one by one (match strikes). |
| 12 | The rain returns, heavier. BUILD. |

### 11.3 The Last One (Act IV)
- **The rain stops completely** for the first time since the cold open. Wind, breathing and heartbeat only.
- The last member doesn't wander. They hide in one place, such as under the kitchen table with a candle.
- Every awake Pale closes in at Act IV speed, but they freeze in the hiding member's candle light. The scene is a stealth climax built around a crescendo.
- Their line: *"...please. just go home."*

### 11.4 The twist ending (kept, but re-staged so the player recognises it before being told)
1. Near-silence. The clock begins ticking **properly** and the pendulum swings.
2. The abandoned crossfade (existing, L2501–2519).
3. The camera finds the bathroom mirror. **The reflection is the girl before the sprite changes.** The player gets there one beat ahead of the game.
4. The ghost becomes the girl (existing glitch, L2527–2532, slowed down). The cone the player carried is her flashlight. Her breathing is now close and clearly a child's.
5. The music box plays and **resolves** to A4 for the first time.
6. The family arrive **behind her**, in the dark behind her beam, not through the door. Lightning shows them right at her back. She turns, and the beam lands on four pale faces at once (F5). Drop plus Cluster. Black.
7. Typewriter text, Palatino italic, no box, no outline: *They've been trying to scare you out for 40 years.* Then 3 s of black, then *You were never the ghost.*
8. Over black, as the end card fades in, a whispered line: *"...you again."*

### 11.5 Other endings (tone only; the systems pass decides the conditions)
- **Found** (third contact): you rise from the bed again. The family stands pale at its foot, very still, in your cone. Dad: *"goodnight."* Cut. The card reads *forty-one years.*
- **Dawn** (5:00 timeout): the windows go grey-blue, the rain stops, a few procedural birds sound (sine chirps sweeping 3 to 5 kHz). The living family is still here, and your sprite fades in the daylight. The card reads *they're still here. so are you.*

---

## 12. A four-minute run, beat by beat
| Time | Act / phase | What the player sees | What the player hears |
|---|---|---|---|
| 0:00 | Cold open | Black, then the sheet rises from the bed | Rain; the music box above, unresolved |
| 0:20 | I build | Lamp-lit rooms, deep shadow between them; the family in routine | Rain, room tone, lamp hum, the clock ticking (pendulum still) |
| 0:35 | I | The first charged haunt: the chair rocks more and more and Dad turns to look | Charge sine; Dad's breath-catch |
| 0:50 | I beat | Nothing visible | Footsteps cross an empty room upstairs |
| 1:05 | I | Crescendo on the Kid: a whisper, then the TV, then the closet. A Perfect Haunt. | Hush; the heart stops |
| 1:08 | **F1** | The Scream face, 0.75 s | Scream plus Snap; tinnitus |
| 1:10 | II relax (30 s) | The Kid runs out; the attic lamp bursts; the house is a little darker | Slow return of ambience; a distant door slam |
| 1:40 | II build | The first real lightning; the shafts show an empty hall | Thunder 3 s later |
| 1:55 | II, Tier 2 | Lightning: **the Pale Kid** at the end of the upstairs hall, facing you | Glass tone |
| 2:05 | II | Seen in lamplight by Mom: *"she's back."* | A sigh |
| 2:15 | II | The ball rolls out of the dark (the Pale Kid is closer) | Ball bounce, panned left |
| 2:20 | II | Mom is terrified, silent variant (7.3b) | Breathing only |
| 2:30 | **Power cut** | The set piece; your light becomes a cone | The hum dies; close thunder |
| 2:45 | III build | Candles; two Pale hunting; the TV comes on with no power | Footsteps that match yours |
| 3:05 | III | **Fake-out:** the closet opens itself and is empty | Hush, then nothing |
| 3:20 | III, **F3** | Dad, back turned in your cone; his head turns | Silence, then Cluster |
| 3:35 | III | Dad flees (burst aftermath) | A scream through the walls |
| 3:45 | **IV** | The rain stops; the dog hides under the table with Mom's dropped candle | Wind, breathing, heartbeat |
| 4:05 | IV | Crescendo on the dog; it bolts | The door slams far away |
| 4:10 | Finale | The mirror, the girl, four pale faces in her beam | The clock running; the music box resolves |

That is 2 faces in play, 1 Tier-2 sighting, 1 fake-out, 3 RELAX windows and 2 silence windows.

---

## 13. Performance and implementation notes (60 fps on a normal laptop)
- **Light map:** 320×180, at most 16 sprite draws, one upscale. Sprites are prerendered; no `createRadialGradient` per frame.
- **Kill per-frame `shadowBlur`** (L1196, L1607, L2349–2350). Use prerendered glow sprites.
- **Chromatic aberration** costs 6 full-screen operations per frame today (L2599–2605). Skip the whole pass when the offset is under 0.5 px, which is almost always.
- The **`saturation` composite** (L2610) is a non-separable blend mode. Profile it on integrated graphics. Fallback: pre-desaturate the background canvases per act and run the composite only during transitions.
- **Grain** refreshes every 3rd frame. **Vignettes** are prerendered and crossfaded.
- **Audio:** at most about 24 voices at once, 1 ConvolverNode, and looping buffers for rain, wind and room tone (no per-drop nodes). Heartbeat, breathing, footsteps and clock ticks are scheduled from the update loop with a 0.1 s lookahead on `actx.currentTime`.
- **Code reuse:**
  - `drawMember(..., pale=true)` for the Pale
  - `drawGirl` for the mirror, the shadow silhouette and the calibration sprite (render once to an offscreen canvas, then `source-in` fill black)
  - `'stare'` state for NOTICE and the camera stare
  - `makePath` for Pale navigation
  - `drawScreamFace` for F1 and F2 (pale palette, mouth closed for F2)
  - the window shaft polygons from the ending
- **Fonts:** Palatino Linotype, then Book Antiqua, Georgia, serif for text. Ink Free, then cursive for handwriting (height marks, drawings). No outlines anywhere.

---

## 14. Restraint rules (the "never" list)
1. No floating numbers, combo words or "!!", ever.
2. No screen shake on ordinary haunts.
3. No effect that is always on: chromatic aberration, scanlines and the global flicker are gone. Grain and vignette respond to dread.
4. Nothing in the house runs on a fixed timer. Every interval is jittered or drawn from the deck.
5. No two faces within 50 s, no repeated face variant, and no face during RELAX.
6. No Tier 3 without a cue, a rise and a hush.
7. No caption explains a wrongness.
8. No synthesised speech.
9. No more than one loud sound per 8 s outside a payoff.
10. Never fully dark and silent for more than 3 s outside a set piece. The player must always have *something* to read, even if it is only breathing.

---

## 15. Build priority
- **P1 (this is what makes it scary):**
  - light map and darkness by act
  - charge, NOTICE, hush, payoff
  - habituation and crescendo (replacing combo and pop text)
  - noise lures
  - the Pale (wake on flee, move in dark only, freeze in light, audio signatures, contact)
  - the director (acts, phases, beats, budgets)
  - faces F1 to F3 with the 7.3 aftermaths
  - lightning
  - the bus graph with ducking, rain, room tone, heartbeat, breathing and the music box
  - seeds 1–10
  - power-cut set piece and the cone
  - removing the "never" list items
  - twist re-staging steps 1–7
- **P2:** F4 Reflection; seeds 11–16; wind and howl; the TV; Act IV hiding; the Found and Dawn endings; fog.
- **P3:** wet footprints, the calibration screen, the girl's shadow at every strike instead of only the power cut, rain-on-glass near windows.

**Playtest check after one 4-minute run:**
- no more than 3 faces, the first one no earlier than 0:45
- at least 2 RELAX windows of 15 s or more
- at least 1 silence window
- zero pop text
- no more than 4 loud events per minute outside payoffs
- the player can describe at least one moment when they didn't want to go somewhere in the house