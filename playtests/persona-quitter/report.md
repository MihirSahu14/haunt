AI persona playtest (Quitter), opinion only. Not a fun verdict; human playtests still required.

## Run summary
- 10 decisions over 35 s of game time (11:01 PM to 11:42 PM in game), seed 1, agent mode.
- Quit at t=35 s. Fled 0/4, score 0. The kid's fear peaked at 85 and fell back to 65.

## First impression
- **Title screen:** not seen. The harness put the run straight into play (`mode: game` at t=0.2).
- **First 10 s:**
  - The CRT pixel house looks great.
  - At t=1 a toast said "done: make the kid drop the teddy, Q whisper unlocked" before any input. That was a harness artifact: its Space start press counts as a haunt.
  - Pressing E on the kid got the line "there's a lady...", the best moment of the run.
  - The ghost is drawn behind the kid.
- **First 30 s:**
  - The tutorial shows one line at a time, and each line replaces the last.
  - The goal ("Get all 4 out the FRONT DOOR before 5 AM") first appeared at about t=19 s. By then ECTO had gone from 96 to 8 and "Fading... 18" was on screen.
  - There was no wow moment: nobody fled.

## Quit point
- **When:** t=35 s, in `shots/agent-10.png`. The build-up is in `agent-06.png` and `agent-08.png`.
- **Why:** ECTO was spent and a death countdown appeared that I didn't understand. The kid's fear was draining. The game told me twice to "Follow the yellow arrow", and no yellow arrow was on screen.

## What would have kept me playing
- An early flee with a big payoff.
- The goal shown first.
- Visible ECTO gains, such as "+12 ecto" when I scare someone.
- A yellow arrow that is actually there.

## Top 3 suggested changes (first 60 s)
1. Script an early flee within about 20 s.
2. Show the goal first. Explain ECTO, Fading and Suspicion in one line each before they can hurt you.
3. Fix the guidance bugs:
   - the yellow-arrow hint with no arrow
   - the ghost drawn behind family members
   - completed tasks need a visible pop
