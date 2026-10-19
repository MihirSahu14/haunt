# Haunt

## Hook
You are the ghost: drift through your old house in the dark and scare the family out the front door before dawn, without getting so loud that they call the exorcist.

## Pillars
- The dark is the default: light is safety for them and exposure for you.
- Every scare has a fuse: variety and timing beat spam (they stop flinching at repeats).
- You are prey too: noise brings salt, lights and the exorcist's lantern.

## Core loop
Find a family member, pick a trick they are not used to, haunt, then let the house settle.
30s: float to an occupied room -> haunt (E) a fresh object -> fear rises, ecto refills -> chain a different trick
5min: push each member to 100 fear -> jump scare, they flee -> the rest come apart faster while suspicion climbs (lights, salt, exorcist) before dawn

## Scope
| feature | must/should/cut | hours |
|---|---|---|
| Fear model tuning (habituation, nerve, decay, lone multiplier) against the 2-5 min target | must | 8 |
| Pacing director pass: quiet/build/peak, max 3 faces, first face after 0:45 | must | 8 |
| Onboarding in the first 30 s (diary, key prompts, no text walls) | must | 6 |
| Exorcist counterplay readable (lantern, 3 different tricks break him) | must | 6 |
| Ending twist re-staged so the player recognises it | must | 4 |
| Charged haunts (hold E) and NOTICE states from design-horror | should | 10 |
| The Pale, power cut, lightning set pieces | should | 12 |
| Lure, Fade, Belief, Medium from systems v2 | cut | - |
| 13-room house, minimap that lies | cut | - |

Budget: 40 h (must total: 32 h)

## Experience goals
- Fear model: the player understands that repeating one trick stops working and switches tricks on purpose.
- Pacing director: the player feels quiet stretches as dread, not as dead time, and the first jump scare feels earned.
- Onboarding: within 30 s a new player has moved, haunted an object and knows what Q and R unlock with.
- Exorcist counterplay: when the exorcist arrives the player feels hunted and knows they can flee or break him.
- Ending twist: the player recognises who the real ghosts were before the end card says it.

## Knobs
| name | file | key | min | max |
|---|---|---|---|---|
| <!-- file "-" = bundled, read via window.__playbench.overrides.<name>; CSV key = <id>.<column> or *.<column>; JSON key = dotted.path --> | | | | |
| fear_base | - | fear_base | 10 | 45 |
| fear_decay | - | fear_decay | 0 | 2 |
| night_len | - | night_len | 60 | 480 |
| hunt_warn | - | hunt_warn | 40 | 100 |

Defaults: fear_base 19 (fear per fresh scare, `src/09-game.js`), fear_decay 0.5 (fear lost per second once calm: family courage, `src/09-game.js`), night_len 300 (seconds to dawn, `src/10-threats.js`), hunt_warn 80 (suspicion that calls the exorcist, `src/10-threats.js`).

## Decision
Decision: 

## History
<!-- /playbench:iterate moves replaced text here as ### Iteration <n> (<date>). Not part of the one-page limit. Never use a Knobs or Experience goals heading in here. -->
