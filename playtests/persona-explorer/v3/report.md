AI persona playtest (Explorer, v3 after iteration 2), opinion only. Not a fun verdict; human playtests still required.

## Run summary
- 16 decisions. Visited 6 rooms plus the void.
- 2/4 fled. Suspicion peaked at 63.
- Branch A: banished in the void at 78 s. Branch B: died at 95 s with ecto at 100, most likely the lantern; the harness records no cause.

## v2 issues re-checked
- **Fixed:**
  - the ghost in the top HUD (the Attic is still reachable)
  - pops over the HUD
  - contradicting toasts
  - Tab while paused
  - arrow colour
  - hidden costs
- **Partly:** the tutorial now lags an active player; the fade countdown is small.
- **Still there:** the diary has no backing; room borders are invisible.

## Exorcist and void (live)
- The exorcist now appears: suspicion 63, then he spawned about 8 s later.
- The void is not safe: presence went 100 → 16, then banished.
- He has no marker or arrow, so his threat is invisible.

## New bugs and regressions
1. Reward banners stack over the play area (agent-10).
2. The exorcist has no edge arrow.
3. The cost tag collides with the "too weak" pop, producing garbled text (agent-08).
4. The off-screen arrow floats mid-scene and reads as an object marker.
5. Weak feedback at low presence.
6. Text piles up in the centre: speech, cost tag, toasts and the tutorial.

## Top 3 remaining changes
1. Queue the banners, or move them to a top strip.
2. A red exorcist arrow, a lantern warning and a presence countdown.
3. A text layout pass:
   - a backing panel for the diary
   - separate slots for the cost tag and pops
   - skip tutorial steps the player has already done
