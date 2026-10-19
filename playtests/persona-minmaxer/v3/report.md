AI persona playtest (Min-maxer, v3 after iteration 2), opinion only. Not a fun verdict; human playtests still required.

## Run summary
- v2 script on the new build: lost at 39.8 s. v2 strategy: 2/5 wins.
- **Best bot (v3c): 5/5**, median 106 s (71-137 s). The final script cleared at 72.4 s.

## Determinism check
**Fixed:** identical state hashes across 3 replays on seed 1 and seed 5. Bot-recorded scripts replay in the harness with the same values.

## Compared with v2
| | v2 | v3 |
|---|---|---|
| fastest clear | 43.4 s | 71.3 s |
| bot median | 72 s | 106 s |
| win rate | 5/5 | 5/5 (v3c) |
| first flee | 10-12 s | 15-20 s |

## Exploits
1. Whisper: **nerfed**. The crowd refund remains: net +1.6 ecto on 2 victims.
2. x3 combo trivial (A-B-A): still works.
3. Exorcist break +40: still in the code, but never reached live in 10 tries.
4. E has no range check: still works.
5. Salt only blocks horizontal moves: unchanged in the code.
6. Void: no longer free.

## Balance
- A skilled run uses about 59% of the night, so it is no longer trivial.
- The last survivor takes 30-70 s.
- **New dominant strategy: ignore the exorcist.** He leaves after 40 s and caps suspicion.

## Top 3 remaining changes
1. Make ignoring the exorcist cost something, and make the break reachable.
2. Ease the last-survivor grind.
3. Cap the crowd whisper refund at 8, and make the x3 combo need distinct types.
