AI persona playtest (Explorer), opinion only. Not a fun verdict; human playtests still required.

## Run summary
- 14 decisions over 102 s of game time (11:00 PM to 1:02 AM). Ended alive at the end of the script.
- Fled 0/4, 2 tasks done, R never unlocked.
- Rooms visited: all 11, plus the void outside the house.
- Suspicion peaked at 54, so salt and the exorcist never triggered. Ecto ran out first.

## Bugs & glitches (most severe first)
1. **The yellow-arrow hint names an arrow that isn't drawn** (agent-06, -08, -09, -11, -14).
   - The hint shows whenever the ghost's room is empty.
   - The arrow only draws when nobody is on screen (`src/14-hud.js` line 221 vs line 329).
2. **The tutorial band draws over the pause menu** (agent-03).
3. **HUD text overlaps:**
   - the tutorial band over the diary's last line (agent-13)
   - diary text over the ghost (agent-05)
   - speech over combo pops (agent-13)
   - the fade countdown behind sprites (agent-08)
4. **The "Float into a room first" pop is cut off at the right edge of the world** (agent-12).
5. Tab still toggles the diary while paused. Minor.
6. Harness artifact, not a game bug: the harness presses Space at start, and Space haunts. The teddy task completes at t=0.

## UX issues
- Object costs, and the 1.5× cost when lights are on, are hidden until a "too weak (38)" pop.
- Room borders are invisible: a family member on screen can be in the next room.
- Empty rooms punish hard: +10 suspicion and the full ecto cost, with regen at only 1.5/s.
- The family wanders off with no warning that they're about to leave.
- Floating outside the house may be a safe place to hide (from the code; not verified live).
- `REGEN = 11` in `src/04-world.js` is unused; the game uses `ECTO_REGEN = 1.5`.

## Cool discoveries
- Locked R and Q show helpful toasts.
- "Recharging... try the other object" is a good nudge.
- The combo pops and blood drips give strong feedback.
- Every room has its own art.

## Top 3 suggested changes
1. Make the hint match the screen: draw the edge arrow whenever the hint mentions it, or reword the hint.
2. Give the HUD one stacking order: hide the tutorial band while paused, and stop the tutorial, diary and pops overlapping or running off screen.
3. Show each object's cost, including the lit 1.5×, before you press E.
