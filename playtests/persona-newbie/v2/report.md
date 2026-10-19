AI persona playtest (Newbie, v2 after iteration-1 fixes), opinion only. Not a fun verdict; human playtests still required.

## Run summary
- 12 decisions, 51 s of game time. The game was not over.
- **1/4 fled** (the Kid, at about 51 s). v1 had 0/4 at 41 s. Kept playing; v1 would have quit at about 50 s.
- End state: ecto 49, suspicion 60, 5 tasks done, Q and R unlocked.

## Compared with v1
1. No idea when someone flees: **better**. The red FLED counter and the X on the portrait are clear, but the flee happens off-screen with no toast.
2. Fear invisible: **better**. Portraits turn red; still no number.
3. Hints cut off: **fixed**. New problem: they arrive late ("Move with WASD" shows after I had already moved).
4. Yellow arrow missing: **better**. It is drawn now but overlaps the clock (agent-11).
5. E in an empty room: same (not retested).
6. First task auto-completing: **fixed** (it was the harness).
7. Tab hiding the diary: same.
8. No Q/R feedback: same. Both unlocks were silent, and R took about 36 ecto with no warning, which led to "fading... 16" (agent-12).

## New issues
- Task toasts vanish before you notice them. I only caught 3 of 4 completions when a diary line disappeared.
- "Not enough ecto (38)" doesn't say what 38 is.
- Mom's stare and the rising suspicion are never explained.
- "Nobody here" fires while someone is visible in the next room.
- "Press E to haunt" stays pinned long after I knew it.

## Top 3 remaining changes
1. Show the flee as it happens: "Kid is running for the door!", with the camera or arrow following.
2. Visible Q/R effects and confirmations. Show R's cost before use. Explain fading and suspicion in one line each.
3. Keep task toasts up for at least 3 s, and move the arrow off the clock and the HUD.
