# You Are the Haunting: Systems Design v2

**Lens:** gameplay systems, economy, counterplay, objectives, win/lose paths, pacing.
**Target:** a 2–5 minute run (about 3:20 on average, about 2:20 for a skilled player, a hard cap near 4:45). It stays a single file, with roughly 4,200 lines for the must-have scope and roughly 4,800 with the should-have scope.

---

## 0. What changes, and why

| Feedback | Root cause in v1 (read from `index.html`) | v2 fix |
|---|---|---|
| "I can spam E all the way" | Ecto regenerates 11/s on its own. Each scare costs only 20 with a 3 s cooldown. Every scare adds a flat +25 fear, scaled up by a speed combo. Nothing pushes back. | Ecto only comes from fear you actually cause. Light scares ("Stirs") can never break anyone (they stop adding fear at 60). Big scares ("Manifests") need a 1.2 s hold plus setup. Repeating a scare type gives less each time. The family escalates against you, and you have a health bar (Presence). |
| "Confusing" | Ten glowing objects, combo words, +FEAR pop-ups and a speed combo, with no reason why a scare worked. | One objective at a time. HUD elements appear only once they have been taught. Every scare shows a one-word reaction and which modifiers applied ("DARK · ALONE · USED TO IT"). |
| "Bigger map" | 5 rooms on one screen. | 13 rooms on 4 levels. The camera follows you, there are 2 staircases, and a minimap. |
| "Objectives" | Only "scare them out". | A chain of tasks that teaches the game and unlocks powers, plus situational tasks and optional Omens. |
| "2–5 minutes" | About 1 minute. | A night clock from 12:00 to 6:00 AM at 40 s per hour, after a short tutorial. |
| "Ways to win/lose" | One win, no lose. | 3 wins (Terror, Rout, Let Her Stay) and 3 losses (Faded, Exorcised, Dawn). That makes 6 endings. |
| "Not scary, spamming horror is normal" | A full-screen face every time someone breaks, a "stare" beat every 23–28 s, and arcade text. | A scare budget: about 4 full-screen faces per run, at least 35 s apart. Silence before big events. The house also haunts *you* (Echoes, one "Visit"). The minimap can lie. |

**Remove from v1:** the speed combo (3 s chain, "TRIPLE TERROR!"), the +FEAR pop-ups, the glow on every object in the room, the stare every 25 s, the Kid gaining fear on a timer, passive 11/s regen, and the "FLED!" pop-ups.

---

## 1. Controls (4 game inputs plus pause)

| Input | Verb | Notes |
|---|---|---|
| **WASD / Arrows** | Float | 300 px/s. Moves freely through walls and floors. Slowed to 170 px/s while Fading. |
| **E / Space, tap** | **Stir** | A small, ambiguous haunt on the highlighted target. |
| **E / Space, hold 1.2 s** | **Manifest** | The big scare. A ring fills around the ghost and the cost is paid when the hold completes. Letting go early costs nothing. |
| **Q** | **Lure** | Calls the nearest family member who can hear it to your position. Unlocked by the tutorial. |
| **Shift, hold** | **Fade** | Invisible, cannot act, regains Presence, costs Ecto every second. |
| Esc | Pause | |

The mouse is used only on the title and end cards. Drop v1's click-to-glide so there is one control scheme.

**Targeting:** E always acts on the single nearest interactable within 140 px of the ghost. Only that one target is highlighted, with its name, scare type and cost, for example `Music box · SOUND · 6`.
- **Objects:** Stir or Manifest.
- **A person within 90 px:** a Touch Stir. If the person carries a light (Dad's flashlight, the Medium's candle), E puts the light out instead. Hold E on a person to Manifest an Apparition, once that power is unlocked.

---

## 2. The house

### 2.1 Layout (world about 2720 × 1450, camera view 1280 × 720)

```
                        [ ATTIC (your lair, always dark) ]        floor y=400, x 700–2000
[KID'S ROOM][ BATH ][ MASTER BEDROOM ][ GUEST (dark) ][  LANDING  ]  floor y=720
[MUDROOM][  KITCHEN  ][ DINING ][  LIVING ROOM  ][ STUDY ][ FOYER ]→ FRONT DOOR   floor y=1040
[            CELLAR (fuse box, furnace)          ]                 floor y=1320, x 160–1320
 ^ back stair (x≈300: Cellar–Mudroom–Kid's Room)       main stair (x≈2250–2500: Foyer–Landing)
                                                        attic ladder at x≈2040 from the Landing
```

**Family pathing:** a two-column version of v1's `makePath`. On each floor, a member walks to the nearer stair column (back or main) that reaches the target floor, then walks across. The Attic is reached only by the ladder from the Landing. Only Dad goes up there (when lured) and the Medium (to place a seal).

**Camera:** follows the ghost with a 6/s lerp and a 200×120 dead zone, clamped to the world bounds. It **never** jumps to off-screen events. You hear them and see them on the minimap. Off-screen horror is part of the restraint.

**Minimap** (bottom-right, about 220×120): rooms drawn dim or lit, family members as dots, the Medium as a distinct mark, and the fuse box once unlocked. **Echo events never appear on it.** So "the minimap says this room is empty" becomes a source of dread.

### 2.2 Rooms

| Room | Light at midnight | Interactables (category) | Role |
|---|---|---|---|
| Attic | none, always dark | Rocking chair (SOUND), Dress form (SIGHT), Trunk (story) | **Lair:** Presence regenerates here. A dark trap for luring Dad. Seal target. |
| Kid's Room | night-light | Blanket/bed (TOUCH), Night-light (LIGHT), Music box (SOUND), Closet (SOUND) | Tutorial. Kid's home. |
| Bathroom | off | Mirror (SIGHT), Tub tap (SOUND), Ceiling light (LIGHT) | Best room for Dad (SIGHT weakness). |
| Master Bedroom | lit until 1:20 | Wardrobe (SOUND), Vanity (SIGHT), Lamp (LIGHT), Bed (TOUCH) | Parents sleep here from 1–2 AM. |
| Guest Room | none, dark | Sheeted chair (SIGHT), Window tap (SOUND) | Upstairs dark trap. Family avoids it. |
| Landing | lit | Portrait (SIGHT), Grandfather clock (SOUND), Hall light (LIGHT) | Hub. Main stairs and attic ladder. |
| Mudroom | off | Washer (SOUND), Dog's ball (distraction), Bulb (LIGHT) | Dog's room. **The dog exits by the back door here.** |
| Kitchen | lit | Plates (SOUND), Hanging lamp (LIGHT), **Wall phone** (SOUND, plus cutting the call) | Mom calls the Medium from here. |
| Dining | off | Chandelier (LIGHT), Chairs (SIGHT) | |
| Living Room | lit | TV (SIGHT), Piano (SOUND), Fireplace (LIGHT) | Mom's evening room. |
| Study | lit | Radio (SOUND), Typewriter (SIGHT), Desk lamp (LIGHT) | Dad's room. |
| Foyer | lit | Coat rack (SIGHT), Front-door knocker (SOUND), Foyer light (LIGHT) | **Exit.** Medium arrives here and chants the exorcism here. |
| Cellar | off | **Fuse box** (Blackout), Furnace (SOUND), Bulb (LIGHT) | Seal target. Blackout trap. |

That is 13 rooms and about 36 interactables. All 11 light objects share one draw and behavior routine, so the art cost is closer to 25 distinct objects.

### 2.3 Light (the main tactical resource)

- Each room is **lit** or **dark**. During a Blackout every room is dark. A carried flashlight or candle makes a lit circle 140 px across around the person carrying it.
- **Stir on a LIGHT object:** the room goes dark for 30 s, and anyone in the room takes LIGHT-category fear.
- **Manifest on a LIGHT object:** the bulb bursts and the room stays **dark for the rest of the run**.
- **Relighting:** once Belief ≥ 25, an adult who enters a dark room with a working bulb flips it on. This takes 1.5 s standing at the switch by the door, during which they don't move (a good opening to strike). Below Belief 25 they only switch lights on for things on their schedule.
- **The house gets brighter as the family believes more.** Belief is something you can read just by looking at the house.

---

## 3. Core loop

```
FIND a target → ISOLATE (Lure into a dark room / wait for the schedule)
→ DARKEN (Stir the light) → PRIME (1–2 Stirs of different types, fear ≥ 40)
→ MANIFEST (hold E) → BREAK (fear 100) → they flee → you feed (Ecto + Presence)
  ...while managing Belief (how loudly you work) and Presence (your own survival).
```

A well-prepared Manifest breaks someone in one hit. A careless one does almost nothing and makes the family believe more. The player is choosing **when** and **where** to act, not how quickly they can press E.

---

## 4. Resources

### 4.1 Ecto (what you spend). Start 40, max 100.

| Income | Amount |
|---|---|
| Base trickle | 0.5/s (1.0/s at 3–4 AM, the "dead hour"; 0.25/s from 5 AM) |
| **Harvest** | **0.6 × every point of fear you cause** (all members, anywhere) |
| Leak from frightened members | +0.4/s for each member at fear ≥ 30, +1.0/s at ≥ 60 |
| Break bonus | +35 |
| Omen reward | +25 (Omens alternate between Ecto and Presence rewards) |

| Cost | Ecto | Cooldown |
|---|---|---|
| Stir (object) | 6 | 0.8 s shared by all Stirs; 8 s for that object |
| Touch (person) / put out a carried light | 7 / 6 | 0.8 s shared |
| Manifest (object) | 30 | 6 s shared by all Manifests; 25 s for that object |
| Apparition (Manifest on a person, unlocked) | 40 | 6 s shared |
| Lure | 8 | 10 s |
| Fade | 3/s | — (stops automatically at 0 Ecto) |
| Blackout (fuse box, unlocked) | 40 | 60 s |
| Cut the phone line | 10 | — |
| Scatter salt | 15 | — |
| *Anything done inside a salted room* | ×2 | |

A Stir that lands on a frightened target pays for itself: about 10 fear harvests about 6 Ecto. A Stir that misses (no one there, they're used to it, they talk themselves out of it) loses Ecto. **A player who spams goes broke in about 12 s** and is then stuck at the 0.5/s trickle.

### 4.2 Presence (your health). Max 100, start 100.

| Drain | Amount |
|---|---|
| Caught in Dad's flashlight beam | −15/s (also cancels a Manifest in progress) |
| Dog bark | −6 per bark (also cancels a Manifest in progress) |
| Inside a salted room | −8/s |
| Inside the Medium's aura (200 px) once she has sensed you | −12/s |
| Echo whisper / Stare / The Visit | −3 / −10 / −25 |
| Exorcism chant in progress | −2/s anywhere |
| From 5 AM, outside the Attic and Cellar | −0.5/s |
| Each completed Medium seal | **max** Presence −20 |

| Regen | Amount |
|---|---|
| Fading | +5/s |
| In the Attic (lair), not sealed, not Fading | +3/s |
| Each Break | +20 |

At Presence 0 you lose (**Faded**). Below 40 a heartbeat plays (a ghost with a heartbeat is a twist clue), the vignette tightens and speed drops ×0.85. Below 30 a task appears: "You're fading. Hold SHIFT."

### 4.3 Belief (the family's conviction, shared by the whole house). 0–100, start 5.

Belief makes fear stick to Mom (and to Dad once he has seen something). It also drives every counter-measure. The tension is that you need enough Belief for scares to work, but not so much that the family fights back.

| Source | Δ Belief |
|---|---|
| Stir that lands, per adult who sees it: lit room / dark room | +1.5 / +0.5 (Kid +0.5 lit / 0 dark) |
| Manifest, per person who sees it: dark / lit | +5 / +8 |
| Kid reports a sighting (see 6.3) | +8 (20 s cooldown) |
| Dog barks with a human on the same floor | +2 |
| Ghost caught in the flashlight | +3/s |
| Break | +12 (Dad's Break +20: "even *he* saw it") |
| Cutting the phone or scattering salt | +4 |
| **Dad's Doubt:** a Stir lands with Dad in the room and his fear < 40 | **−2** |
| Quiet: no Belief gain for 15 s | −0.4/s, but never below (last threshold crossed − 5) |

**Belief ladder.** Each step is announced with one line from the family and a one-line HUD note explaining the change.

| Belief | Stage name (HUD) | Counter-measures turned on |
|---|---|---|
| 0–24 | "It's an old house." | None. Stirs in lit rooms are often talked away. |
| **25** | "Something's wrong." | Adults turn on the light in every room they enter. Members tend to move in pairs (50% chance to follow another member when wandering). The Kid sleeps in the parents' bed at the next hour. |
| **50** | "It's real." | **Mom salts a room** every 40 s (up to 3 rooms). **Dad carries a flashlight** and walks rounds of 3 rooms every 35 s. Members at fear ≥ 60 ignore Lures. Nobody sleeps. |
| **75** | "Call someone." | **Mom goes to the phone** to call the Medium. If Mom is gone, Dad calls at 85. If no adults remain, no call is made. |

---

## 5. Fear model

Each member has **Fear 0–100**, shown with one word on the roster: Calm < 30, Uneasy 30–59, Terrified 60–99, Broken.

### 5.1 Formulas

```
stirGain = obj.stir(6–12, default 8) × P.mult × P.cat[c] × lightS × companyS × hab × doubt × hourMult
fear     = min(fear + stirGain, max(fear, 60))          // Stirs can never push past 60

manGain  = obj.man(22–30, default 25) × P.mult × P.cat[c] × lightM × companyM
           × primed × hab × buildup × beliefMult × hourMult
fear     = fear + manGain                                // 100 → BREAK
```

| Modifier | Value | Shown to player as |
|---|---|---|
| lightS (Stir) | dark 1.3 (Kid 1.5) / lit 1.0 | DARK |
| lightM (Manifest) | dark 1.5 (Kid 1.8) / lit **0.6** | DARK / TOO BRIGHT |
| companyS / companyM | alone 1.3 / 1.4; one other person 1.0; two or more others **0.7** (the Dog counts as company) | ALONE / NOT ALONE |
| primed (Manifest only) | fear ≥ 40 → 1.3; fear < 20 → **0.5** (they startle, then laugh it off); otherwise 1.0 | PRIMED / CAUGHT COLD |
| hab (habituation) | 0.55^n, where n = times this member has had this category; +1 per exposure, −1 every 15 s | USED TO IT |
| buildup (replaces the combo) | 1 + 0.25 × k, where k = number of *different* Stir categories that hit this member in the last 25 s (0–3, so up to ×1.75) | DREAD ×k |
| doubt (Stirs only, not applied to Dad himself) | 0.6 if Dad is in the room with fear < 40 | "Old pipes." |
| beliefMult (B = Belief/100) | Mom 0.4 + 1.2B. Dad 0.5 flat **until he has witnessed a Manifest**, then 0.6 + 0.8B. Kid 1.0. Dog 1.0. | (background effect) |
| hourMult | 12–2: 1.0 · 2–3: 1.05 · **3–4: 1.2** · 4–5: 1.0 · 5–6: 0.8 | |

### 5.2 Decay, floors, cascades

- **Decay:** after 10 s with no new fear, −1.5/s. With "comfort" (lit room and another member present) it is −3/s. While asleep, −0.5/s. So priming gives you roughly a **15 s window to strike**.
- **Floor:** once a member has reached 60, their fear never falls below 30.
- **Cower:** at fear ≥ 80 a member freezes in place for 10 s and ignores Lures. They are stuck in place, which makes them a good target.
- **Contagion (the new combo):** when someone breaks, everyone else in the same room gets +15 fear (this can exceed the Stir cap, up to a maximum of 95). Everyone on the same floor gets +5. Members the fleeing person runs past get +8 once. Planning a break in front of the right person can set off a chain.
- **Dropped items:** a single fear gain of 10 or more makes the member drop what they're holding (as in v1). The Kid's teddy **stays on the floor** until it is returned or the Kid picks it up after 20 s.

### 5.3 Worked examples (these are the balance targets)

| Situation | Math | Result |
|---|---|---|
| **Spam:** Manifest the TV in the lit living room with Mom, Dad and Kid present. Mom fear 10, Belief 20. | 25 × 0.6 lit × 0.7 crowd × 0.5 cold × 0.64 belief | **+3 fear** to Mom. Belief **+24** (3 witnesses × 8). Costs 30, harvests about 3. |
| **Dad's first real scare:** lured into the dark bathroom, Stirs on the mirror (SIGHT) and the light, then Manifest the mirror. | Stirs: 17 + 11 → fear 28. Manifest: 25 × 0.8 × 1.6 × 1.5 × 1.4 × 1.0 × 0.55 (SIGHT again) × 1.5 (two categories) × 0.5 (Doubt) | **+28 → 56. He doesn't break, but he has now seen a Manifest,** so Belief now applies to him. The skeptic takes two acts. |
| **Good setup:** Mom alone in the dark kitchen, fear 45. Lamp Stirred (LIGHT), then Manifest the phone (SOUND). Belief 50. | 25 × 1.0 × 1.5 × 1.5 × 1.4 × 1.3 × 1.0 × 1.25 × 1.0 | **+128 → BREAK** |
| **Medium:** she is kneeling at a seal and you put her candle out first. | 25 × 0.7 × 2.0 channel × 1.5 dark | **+53** each, so 2 hits break her. With the candle lit it is **+21**, needing 5 hits. |

---

## 6. The family and the visitor

| | Dad: "The Skeptic" | Mom: "The Believer" | Kid: "The One Who Sees" | Dog: "The Sentinel" | Medium: "The Visitor" |
|---|---|---|---|---|---|
| Overall fear multiplier | 0.8 | 1.0 | 1.25 | 0.8 | 0.7 (×2 while kneeling or chanting) |
| SOUND / LIGHT / TOUCH / SIGHT | **0.4** / 1.0 / 1.0 / **1.6** | **1.5** / **0.6** / 1.0 / 1.0 | 1.0 / **1.3** / **1.6** / **0.3** | **1.5** / 0.7 / 0.5 / 0.5 | Immune to Stirs. Manifests only. |
| How Belief affects them | Doubt (see 4.3, 5.1) | Doubled sensitivity: 0.4–1.6 | Always believes: 1.0 | 1.0 | None |
| Threat to you | Flashlight from Belief 50 (or at 4 AM regardless) | Salt from 50; phone call from 75 | **Sees you** and reports it | **Senses you** and barks | Aura, seals, exorcism |
| Weak point | Lure him to the dark Bathroom or Attic | Sound in the dark once Belief is high | Touch in the dark (but she will see you) | Hit and run with SOUND before the sniff meter fills | Put out her candle, then strike while she kneels |
| Exit | Front door | Front door | Front door | **Back door (Mudroom)** | Front door → **ROUT win** |

### 6.1 Dad
- His **Doubt** is the main thing slowing Belief. Breaking him early or late is a strategic choice: breaking him gives Belief +20.
- He always answers Lures (even at fear 59) and always investigates the Kid's reports.
- **Flashlight:** a cone 280 px long and ±22° wide, pointing the way he faces. If the ghost is in the cone and not Fading: Presence −15/s, Belief +3/s, any Manifest in progress is cancelled, and he chases your last seen position for 6 s ("I SAW something").
- Counter: E on Dad within 140 px kills the flashlight for 8 s ("batteries"). While it's out, he counts as being in the dark.

### 6.2 Mom
- **Salt** (Belief ≥ 50, fear < 80): every 40 s she walks to a room and pours salt at the doorway for 4 s. Up to 3 rooms. She picks, in order: the Kid's current room, the room of the latest Manifest, then the Master Bedroom. A salted room drains Presence −8/s and doubles all costs inside. **Counter:** Scatter (E on the salt line, 15 Ecto, Belief +4). Interrupting her pour with a Lure also works.
- **Phone** (Belief ≥ 75): she walks to the Kitchen and spends 6 s on the call. **Counter:** Stir the phone during the call. The line goes dead and she tries again 25 s later (10 Ecto, Belief +4). Breaking her also stops the call.
- If she breaks within 1 room of the Kid, the Kid gets +20 ("Mother's panic").

### 6.3 Kid
- **Sight:** sees the ghost (when not Fading) on the same floor within 320 px in a lit room, or 160 px in the dark. A **report meter** fills over 1.5 s while she watches. When full she shouts "MOM! There's a **girl** in my room!" (Belief +8, 20 s cooldown) and gains +3 fear/s while watching, which stops at 60. The word "girl" is a twist clue.
- Barely scared by SIGHT. She has been watching you all along.
- **Bond** (hidden until the first time she drops her teddy). Stir the dropped teddy while she is in the room *and can see you*: it floats back to her. Bond +34, her fear −20, cost 6. Three returns reach Bond 100.
  - **Bond ≥ 34:** her sightings no longer raise Belief. She keeps your secret. This is useful on every path.
  - **Bond 100:** she can no longer be broken, and the **Let Her Stay** win becomes possible (section 9).

### 6.4 Dog
- **Sniff meter:** fills over 2.0 s while the ghost is within 220 px, through walls and floors (90 px while Fading). It drains at 1/s once you leave. While it fills: hackles rise and a growl gets louder. When full, it **barks every 2.5 s**: Presence −6, any Manifest in progress is cancelled, and the nearest human on the same floor comes to investigate the Dog's position (Belief +2).
- With a 140 px reach and a 1.2 s hold, Manifesting near the Dog is a race against the sniff meter. That is meant to be a skill check.
- **Distraction:** a Stir on the Dog's ball or a Lure keeps it busy for 8 s. It doesn't sniff during that time.
- From 1 AM it sleeps at the foot of the Kid's bed, counting as company for her. Breaking the Dog first removes the house's alarm.

### 6.5 The Medium (arrives 20 s after a completed call; knocks 3 times at the front door)
- Walks at 70 px/s carrying a candle, which lights a 140 px circle around her.
- **Sense** reaches 300 px (120 px while you Fade). Her pendulum swings toward you as a visible tell. Once she has sensed you for 1 s, her **aura** (200 px) drains Presence −12/s. When she senses you on her way somewhere, she follows you for up to 6 s.
- **Seals:** placed in 3 rooms, in this order: the room with the most haunting so far, the **Attic** (which removes your lair), then the **Cellar**. At each she kneels and channels for 8 s. A finished seal makes the room salted for the rest of the run and lowers your max Presence by 20. Three bell tolls mark seal 3 of 3.
- **Exorcism:** after the third seal she chants for 15 s in the Foyer. All costs are doubled and Presence drains −2/s. If she finishes, you lose (**Exorcised**).
- **Interrupting:** any Manifest that lands on her while she kneels or chants resets that seal's progress. Stirs do nothing to her ("I hear you, child." This is another twist clue).
- **Breaking her** wins the **ROUT** (section 9).

---

## 7. Threats and counterplay at a glance

| Threat | Warning sign | What it does | Counter |
|---|---|---|---|
| Kid sees you | She turns and faces the camera; report meter over her head | Belief +8 | Fade, stay in the dark beyond 160 px, Bond ≥ 34 |
| Dog | Growl gets louder, hackles, sniff meter | Bark: −6 Presence, cancels your Manifest, calls a human | Hit and run, Fade, ball or Lure distraction, break it |
| Dad's flashlight | A visible cone sweeping | −15/s, Belief +3/s, cancels your Manifest | Fade, stay out of the cone, kill the flashlight with E |
| Salt | White line at the doorway, faint glow | −8/s inside, costs doubled | Avoid the room, Scatter, Lure Mom away mid-pour |
| Phone call | Mom walking to the Kitchen; HUD task "She's calling someone." | The Medium is coming | Cut the line, break Mom first |
| Medium | Knocking, pendulum, chanting | Aura drain, seals, exorcism clock | Fade, candle plus Manifest while she kneels |
| Echoes (section 10) | Silence | Presence −3, −10, −25 | Nothing. They're meant to shake you. |
| Dawn | Windows turn grey at 5 AM; ticking from 5:45 | Lose at 6 AM | Speed |

---

## 8. Night clock and difficulty curve

40 s per in-game hour. The tutorial runs from 11:30 PM with the clock frozen (at most 45 s; if the player stalls, the Kid runs anyway). Midnight to dawn takes 240 s.

| Hour | Run time* | Family routine (when not disrupted) | Effect on difficulty |
|---|---|---|---|
| 11:30 | 0:00–0:40 | Kid awake in bed. Dad in the Study, Mom in the Living Room, Dog in the Mudroom. | Tutorial. Only the Kid. |
| 12 AM | 0:40–1:20 | Dad comes up to check on the Kid (scripted), then returns to the Study. Mom in the Living Room and Kitchen. Dog patrols the ground floor. | Lit and active. Hard targets. Lure is taught. |
| 1 AM | 1:20–2:00 | Mom goes to bed (if fear < 60). Kid asleep with the Dog at her bed. Dad in the Study. | The house darkens. Good chances to strike. |
| 2 AM | 2:00–2:40 | Dad goes to bed. The Dog patrols upstairs. | Sleepers are dark, stationary targets, but they sleep in pairs. |
| **3 AM** | 2:40–3:20 | Dad gets up for water (Kitchen). Kid gets up for the bathroom. | **Dead hour:** scares ×1.2, Ecto trickle 1.0/s. The clock turns red and 3 bell tolls sound. |
| 4 AM | 3:20–4:00 | Anyone at fear ≥ 40 is awake and wandering with lights on. Dad has the flashlight regardless of Belief. | Hardest stretch. |
| 5 AM | 4:00–4:40 | Dad makes coffee (Kitchen lit). Windows turn grey. | Scares ×0.8, Ecto income cut, Presence −0.5/s. Urgency. |
| 6 AM | 4:40 | — | **DAWN loss** |

*Run time assumes a 40 s tutorial.

Belief stages take priority over this routine. For example, nobody sleeps once Belief is 50 or more. **Difficulty therefore follows how the player plays:** quiet players get a dark, sleepy house, and loud players get a bright, armed one.

---

## 9. Win and lose conditions

| | Trigger | Warning signs during play | Ending headline (suggested) | Twist |
|---|---|---|---|---|
| **W1: THE HOUSE IS YOURS** | All 4 members have fled | Roster `n/4`, minimap dots disappearing | v1 sequence unchanged | **Full twist** (v1: "They've been trying to scare you out for 40 years." / "You were never the ghost.") |
| **W2: ROUT** | The Medium breaks | Task "Break her, or break them first. Seals x/3" | "Even she ran." Everyone left flees together, with no individual faces. | Full twist with an extra line before it: "She told them what she saw. A little girl." |
| **W3: LET HER STAY** | Bond 100 **and** Dad, Mom and Dog have all fled. Also wins if it is 6 AM and Bond is 100 (this replaces the Dawn loss). | The info line "The child kept your secret." appears once Bond ≥ 34 | "Only the child stayed." | Twist variant: the pale family sits with the girl at the table. "Tonight, one of them asked you to stay." |
| **L1: FADED** | Presence reaches 0 | Heartbeat below 40, a task below 30, the screen frosting over | "You ran." | Partial reveal: a girl curled on the floor of the abandoned house, a flashlight rolling away |
| **L2: EXORCISED** | The 15 s chant finishes | Knocks on arrival, bells per seal, rising chant, screen whitening | "The house is clean." | Partial reveal: the girl outside the front door, the abandoned house behind her. Four voices: "Get out of our house." |
| **L3: DAWN** | 6:00 AM with anyone still inside and Bond < 100 | Grey windows at 5 AM, "Dawn in 30 s" plus ticking at 5:45 | "Morning. They're still here." | 3 frames of the abandoned house over the breakfast scene. "Come back tonight." |

**End card:** the ending name, "Ending n of 6" (saved in `localStorage`, with every access wrapped in try/catch), the run time and the number of Breaks. **On a loss, add one line saying what drained you most**, for example "Most of your hold was lost to: the Medium (41) · Dad's flashlight (22)". This requires counting Presence loss by source.

---

## 10. Dread director and scare budget

**Rules (enforced in one `director` update function):**
1. **Full-screen faces:** at most 4 per run, at least 35 s apart, then 6–10 s of near-silence after each.
2. **2.5 s of silence** (drone and creaks fade to 0) before every Stare, the Visit, the Medium's knock and every full-screen Break.
3. Echo whispers come at least 25 s apart and never within 8 s after the player's own Manifest.
4. Every real scare aimed at the player has at least one **fake-out** first (silence, a flicker, then nothing).

**How a Break is shown:**

| Break | Presentation |
|---|---|
| First Break of the run | **Full face** (v1's 0.7 s freeze, sting and scream) |
| Breaks in the middle of the run, or any Break within 35 s of the last full face | **Shadow:** no freeze. The room flashes once, a scream is panned to where it happened, a silhouette runs. Off-screen, you only hear it and see a minimap ping. |
| The Break that wins (the last member, or the Medium) | **Full face** |

**Echoes (the house haunting you, which also sets up the twist):**

| Tier | When | What | Effect |
|---|---|---|---|
| Whisper | Every 25–40 s from 12:30 | Footsteps on the floor above when nobody is up there, the Kid giggling behind you (panned), a single piano note from an empty room, a door creaking open in your room, a dot appearing on the minimap for one frame | Presence −3 |
| **Stare** | About 1:30 and about 2:50 run time (±10 s), only if at least 2 members remain and no big event in the last 35 s | All remaining members stop, turn and face the camera for 3 s. Lights dim. A whisper. (Replaces v1's 25 s stare.) | Presence −10 |
| **The Visit** | Once. At least 25 s after task T5, in a dark room with no family or Medium, while you aren't charging a Manifest and Presence ≥ 30. Fallback at 3:40. | The minimap shows the room empty. A pale figure (v1's `pale` member render) appears in the corner only on flicker frames, closer each time over 3 flickers in 4 s. Then 1.5 s of silence, then a **full-screen pale face** of a member who has **already fled**. "They came back." | Presence −25 |

Planned faces in an average run: the first Break (~1:15), the Visit (~2:30), the final Break (~3:20), and the ending.

---

## 11. Objectives

### 11.1 Task chain (one line top-left, one task at a time)

| # | Text shown | Done when | Reward and what appears on the HUD |
|---|---|---|---|
| T0 | "Tug the child's blanket. [E]" | Stir on the Kid's bed | The **Ecto** bar and the Kid's fear meter appear |
| T1 | "Put out her light. [E]" | Stir on the night-light | Hint: "Fear grows in the dark." |
| T2 | "Now show yourself. Hold [E] on the closet." | Manifest on the closet (the Kid's fear is held at 85 or below here, so no Break) | The Kid screams "MOM! There's a girl in my closet!" The **Belief** meter, **roster** and **clock** appear: "12:00 AM. Drive them out before dawn." **Lure (Q) unlocked.** |
| T3 | "Her father doesn't believe her. Call him somewhere dark. [Q]" | Dad investigates a Lure in a dark room | +15 Ecto |
| T4 | "Break one of them." | First Break | **Blackout unlocked** (the fuse box appears on the minimap; 25 s of house-wide dark; Dad then goes down to the Cellar alone to reset it, which is another trap). Presence +30. |
| T5 | "Something in the attic is waiting for you." | E on the trunk: a photo of this family dated 1985 (twist clue). The lights flicker and nothing happens (a fake-out). | **Apparition unlocked:** hold E on a person to Manifest directly with SIGHT, 40 Ecto, ×1.2. This is useful against the moving Medium. |
| T6 | "Drive them out before dawn. (n/4)" | — | — |

**Tasks that interrupt the chain while they apply:**
- X1 "She's calling someone. Stop her." (Mom at the phone)
- X2 "The medium is sealing the house. Break her, or break them first. Seals x/3"
- X3 "You're fading. Hold SHIFT." (Presence < 30)
- X4 an info line, "The child kept your secret." (Bond ≥ 34)

**First-time hints** (one line at the bottom, shown once): the first growl gives "The dog senses you. Hold SHIFT to fade." The first flashlight, the first salt and the first "used to it" each get their own hint.

### 11.2 Omens (optional; one at a time from 12:30, every ~50 s, 40 s timer; +25 Ecto or +20 Presence, alternating)

- "Scare two people with one Manifest."
- "Hit one person with three different kinds of haunting within 20 s." (teaches the buildup multiplier)
- "Make someone drop what they're holding in the kitchen."
- "Lure the dog into the cellar."
- "Let a bulb die." (Manifest on a LIGHT object)
- "Make the clock strike 13 while someone is on the landing."
- "Don't be seen for 40 s."
- "Break the skeptic before 3 AM."

---

## 12. The first 40 seconds

Only the Kid's room is in the camera view. Nothing on screen except the ghost, the Kid and one prompt.

| t | On screen | What the player learns |
|---|---|---|
| 0–3 s | "11:30 PM" fades in and out. The Kid is reading under the covers. Prompt: **"WASD to drift."** | Movement |
| 3–10 s | T0. The blanket is highlighted: `Blanket · TOUCH · 6`. Tap E: the blanket slides off. Kid: "...hello?" The reaction tag reads "ALONE". The Ecto bar slides in and shows the cost and the harvest. | Stir, Ecto, fear is food |
| 10–18 s | T1. The night-light goes out and the room is dark. Tag: "DARK". Kid: "Mom...?" The meter reaches 60 and stops (the Stir cap): "Stirs alone won't break them." | Darkness, the Stir cap |
| 18–30 s | T2. Hold E on the closet: a ring fills over 1.2 s, the lights flicker and a tone rises. The closet bursts open and eyes appear. Tag: "DARK · ALONE · PRIMED · DREAD ×2". She screams and runs out (no jump-scare face; the scare budget saves it). | Manifest, setup pays off |
| 30–40 s | Belief meter: "They believe a little more." Clock: **12:00 AM**. Lure unlocked. T3 appears. Dad's footsteps on the stairs. | The stakes, the next verb |

Fade is taught by situation when the Dog first growls or the flashlight first appears, not in this sequence.

---

## 13. Expected flow

### 13.1 Average run (about 3:20, Win W1)

| Time | What happens |
|---|---|
| 0:00–0:40 | Tutorial. Kid at 85 fear → floor 30. Belief about 19. |
| 0:40–1:20 | Dad comes to check, says "Nothing in your closet, kiddo." (Doubt −2) and turns the light back on. The player Lures him into the dark Bathroom: mirror Stirs, then a Manifest takes him to 56. He doesn't break, but he has now seen it. **First Break at about 1:15, usually the Kid** after she settles back in her room: blanket, light, music box, closet. **Full face.** Blackout unlocked. Belief about 35, so adults now turn on lights. |
| 1:20–2:00 | Mom goes to bed. **Stare #1 at about 1:30.** T5 sends the player to the Attic for the photo and the fake-out. The Dog starts sniffing upstairs and the player learns to Fade. |
| 2:00–2:40 | Belief about 55: salt in the Master Bedroom, Dad's flashlight rounds. The player uses Blackout, then Lures Dad down to the Cellar and breaks him there (**shadow** presentation, Belief +20 → about 75). **The Visit at about 2:30.** |
| 2:40–3:20 | Dead hour. Mom heads to the phone. The player either cuts the line or breaks Mom in the dark Kitchen with SOUND (shadow). The Dog is the last one left: hit and run in the Mudroom with the washer, then a Manifest. **Final full face at about 3:15. Win → ending (about 25 s).** |

### 13.2 Skilled player (about 2:20)

- **Takes the Dog out first** (around 1:00) by luring it into the dark Cellar and hitting SOUND, which removes the alarm.
- **Breaks the Kid in front of Mom** while both are asleep, setting off contagion (+15 for Mom).
- **Keeps Belief under 50** by working only in the dark, so there is no salt and no flashlight. Breaks Dad last so his Doubt keeps Belief down for as long as possible.
- **Uses the dead hour** to break the last two in one Blackout window.
- **Or the speed route:** deliberately pushes Belief to 75 by 1:30, lets the Medium come, puts her candle out and lands two Manifests while she kneels. ROUT at about 2:30. This is high risk because of the aura drain and the salt.

### 13.3 Spammy or sloppy player (loses at about 2:45–3:45)

- **0:40–1:00:** spams E in the lit Living Room around Mom and Dad. Doubt and "used to it" cut every Stir to almost nothing ("Old pipes.").
- **About 0:55:** Ecto runs out, leaving only the 0.5/s trickle.
- **Turns to Manifests** in lit rooms with groups. Each one adds about 3 fear and Belief **+16 to +24**.
- **Belief 50 at about 1:30:** the house lights up, salt goes down, the flashlight burns Presence, the Dog barks.
- **Belief 75 at about 1:50:** the Medium arrives around 2:20 and finishes 3 seals by about 3:30.
- **Ends in either Faded** (about 2:45–3:15, from aura, flashlight and salt) **or Exorcised** (about 3:45).
- **The end card names the cause.** Both losses show a piece of the twist, which encourages a replay.

---

## 14. What the HUD must show (the art lens decides how it looks)

Elements appear progressively, as listed in section 12.

- **Top-left:** current task (one line) and the Omen with its timer.
- **Top-right:** clock (red during the dead hour), and the Belief meter with ticks at 25, 50 and 75 plus the stage name.
- **Bottom-left:** Ecto and Presence. Each shows a ghost "preview" of the cost of the currently highlighted action.
- **Roster:** 4 members plus the Medium when present. Each shows a face, a state word (Calm / Uneasy / Terrified / Asleep / Gone) and an icon for carrying a light or investigating.
- **In the world:** a small fear meter over a member only while they are within about 400 px. The single highlighted target with its name, category and cost. The hold ring. The Kid's report meter. The Dog's sniff meter. The Medium's pendulum.
- **Reaction readout** after each scare: a short line from the victim ("Old pipes." / "Mom?" / "WHAT WAS THAT") and **at most 3 modifier tags**. When a Stir gains less than 3 fear, show "RATIONALIZED".
- **Remove:** COMBO banners, +FEAR pop-ups, and the glow on every object in the room.

---

## 15. Tuning constants (keep them all in one `TUNE` object at the top of the file)

```
HOUR 40   TUTORIAL_MAX 45   GHOST_SPEED 300   FADE_SPEED 170   CHARGE 1.2
REACH 140   TOUCH_REACH 90
ECTO: START 40  MAX 100  REGEN 0.5 (3AM 1.0, 5AM 0.25)  HARVEST 0.6  LEAK30 0.4  LEAK60 1.0  BREAK 35
COST: STIR 6  TOUCH 7  SNUFF_CARRIED 6  MAN 30  APPARITION 40  LURE 8  FADE 3/s  BLACKOUT 40  CUT 10  SCATTER 15  SALT_MULT 2
CD:   STIR_GLOBAL 0.8  STIR_OBJ 8  MAN_GLOBAL 6  MAN_OBJ 25  LURE 10  BLACKOUT 60  INTERRUPT_LOCK 3
LIGHT_OUT 30  BLACKOUT_DUR 25  RELIGHT 1.5
FEAR: STIR_BASE 8  MAN_BASE 25  STIR_CAP 60  BREAK 100  DECAY_DELAY 10  DECAY 1.5  COMFORT 3  SLEEP 0.5
      FLOOR 30  COWER 80/10s  CONTAGION_ROOM 15  CONTAGION_FLOOR 5  PASSBY 8
MOD:  DARK_S 1.3  DARK_M 1.5  LIT_M 0.6  KID_DARK_S 1.5  KID_DARK_M 1.8  ALONE_S 1.3  ALONE_M 1.4  CROWD 0.7
      PRIMED 40→1.3  COLD 20→0.5  HAB 0.55 (stack −1/15s)  BUILDUP 0.25 (window 25s, max k 3)  DOUBT 0.6
      HOUR [1,1,1.05,1.2,1,0.8]
PRESENCE: MAX 100  FADE +5  LAIR +3  BREAK +20  FLASH −15  BARK −6  SALT −8  AURA −12
          WHISPER −3  STARE −10  VISIT −25  CHANT −2  DAWN −0.5  SEAL_MAX −20
BELIEF: START 5  THRESH 25/50/75  STIR_LIT 1.5  STIR_DARK 0.5  MAN_DARK 5  MAN_LIT 8  REPORT 8 (cd 20)
        BARK 2  FLASH 3/s  BREAK 12  DAD_BREAK 20  CUT/SCATTER 4  DOUBT −2  QUIET −0.4 after 15s
KID:  SIGHT_LIT 320  SIGHT_DARK 160  REPORT_TIME 1.5   BOND_STEP 34
DOG:  SENSE 220 (fade 90)  SNIFF 2.0  BARK_EVERY 2.5  DISTRACT 8
DAD:  BEAM 280 / ±22°  ROUNDS 35  CHASE 6  FLASH_KILL 8
MOM:  SALT_EVERY 40  POUR 4  SALT_MAX 3  CALL 6  RETRY 25
MEDIUM: ARRIVE 20  SPEED 70  SENSE 300 (fade 120)  AURA 200  KNEEL 8  SEALS 3  CHANT 15
        CANDLE_R 140  CANDLE_OUT 6  MULT 0.7  CHANNEL 2
DIRECTOR: FACE_GAP 35  WHISPER 25–40  STARES ~90s/~170s ±10  VISIT ≥T5+25s, fallback 220s  PRE_SILENCE 2.5
```

---

## 16. Data shapes and scope

**Data, not per-member code.** Behavior comes from tables:

```
ROOMS   { id, name, floor, x0, x1, lightDefault: 'lit'|'dark'|'none', lair, sealable }
OBJECTS { id, room, x, cat: 'sound'|'light'|'touch'|'sight', stir, man, special: null|'phone'|'fuse'|'ball'|'teddy'|'trunk' }
PROFILE { dad: { mult:0.8, cat:{sound:.4, light:1, touch:1, sight:1.6}, belief:'doubt', exit:'front' }, ... }
SCHEDULE[hour][id] = room id   // overridden by Belief stage and fear states
```

**Member states:** `idle, walk, sleep, investigate, relight, salt, phone, rounds, cower, flee, gone`. The Medium adds `seek, kneel, chant`. All of them are steps of one `followPath` plus a timer, reusing v1's code.

| Priority | Contents | Approx. lines (whole file) |
|---|---|---|
| **P0 (must)** | Bigger map, camera, minimap, two-column pathing. Ecto, Presence, Belief. Stir and Manifest with all modifiers. Room light states and putting lights out. Lure, Fade. Kid sight, Dog sniff, Dad's Doubt and flashlight, Mom's salt and phone. The Medium, seals and exorcism. Night clock and schedule. Tasks T0–T4 and T6 plus the interrupting tasks. W1, W2, L1, L2, L3. Director (Stares, the Visit, scare budget). Reaction readout. | ~4,200 |
| **P1 (should)** | Blackout and fuse box. T5 attic photo and the Apparition power. Omens. Bond and W3. Loss-cause line on the end card. The ending counter. | +~600 |
| **P2 (stretch)** | Fine sleep/wake behavior. Members the fleeing person passes get +8. Varied Lure voices. | +~150 |

**If over budget, cut in this order:** Omens, then Bond/W3, then Blackout. Never cut Belief, habituation, the Stir cap, the Manifest hold or Presence. Those are what fix "spam E".