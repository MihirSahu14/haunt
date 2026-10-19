AI persona playtest (Explorer, v2 after iteration-1 fixes), opinion only. Not a fun verdict; human playtests still required.

## Run summary
- 14 decisions, 105.6 s of game time. Still alive at the end.
- 1/4 fled. 5 of 6 tasks done. Q and R unlocked.
- Suspicion peaked at 67 even with deliberately loud play, so the exorcist never came.
- Agent mode defaulted to 60 s; reran with `--seconds 200`.

## v1 bugs re-checked
1. The hint names an arrow that isn't drawn: **fixed** (agent-09, agent-13). The arrow renders a dull khaki, not loud yellow, and is about 28 px.
2. Tutorial band over the pause menu: **fixed** (agent-02).
3. HUD overlaps: **partly**.
   - Fixed: the diary and the tutorial band no longer overlap.
   - Still there: the diary has no backing, so sprites show through (agent-05), and the "+8" whisper pop lands on speech (agent-07).
   - The fade countdown is barely readable (agent-12).
4. Pop clipped at the right edge: fixed in code (not revisited live).
5. Tab while paused: still there.

## New bugs
1. The ghost can float into the top HUD bars and clock (hold W above the Attic) (agent-14).
2. Pops can cover the top HUD (from the code).
3. Contradicting toasts: "Q is locked..." stays up next to "Q whisper unlocked" (agent-03).
4. "Follow the yellow arrow to someone" stayed up 10+ s while Mom was visible at the bottom edge (agent-06).
5. The `threatManifest` comment says +25 suspicion; the code adds 15.

## UX issues still open
- **The exorcist may effectively never appear.** Lit rooms cost 1.5×, so ecto starves before suspicion reaches 80 (agent-11).
- No costs are shown before you press E, or for R (45).
- Room borders are invisible (agent-09).
- The void may be a safe zone (from the code; still not verified live).

## Top 3 remaining changes
1. Keep the ghost and pops out of the top HUD band.
2. Make the exorcist reachable, or make the void unsafe.
3. One set of HUD rules:
   - a backing panel for the diary
   - pops offset from speech
   - stale toasts cleared
   - a bigger fade countdown
   - Tab blocked while paused
