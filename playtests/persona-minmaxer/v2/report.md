AI persona playtest (Min-maxer, v2 after iteration-1 fixes), opinion only. Not a fun verdict; human playtests still required.

## Run summary
- 14 decisions; the final script is 7.
- Best replay: the Kid fled at about 9.7 s, all 6 tasks were done and R unlocked at 21 s, and 2/4 were out by 29.5 s.
- **Agent-mode replays were not deterministic.** The same script and seed gave a Kid at 72 vs 92 fear at t=11.6.
- Final replay plus `--then policy` won at 135 s.
- The adaptive min-max bot (`v2/bot/bot-minmaxer-v2.py`) won **5/5 seeds**: 85.7, 43.4, 71.9, 61.7 and 78.8 s, median 72 s.

## Compared with v1
- The Space confound is gone: the Kid starts at 29 fear and Q is locked.
- First flee: about 12 s (v1: about 35 s).
- 2/4 out by 29.5 s (v1: 1/4 by 68 s).
- The ecto wall is still there for a scripted player. Task rewards (4 × +30) carry the first 30 s.
- Policy bot p50 is 198 s; the min-maxer clears in about 72 s. `night_len` 300 puts no pressure on a skilled player.

## Exploits re-verified
1. **Whisper is free fear: still works.** +4.8 ecto per victim, no suspicion, no habituation.
2. **x3 combo is trivial: still works**, and newly confirmed live across rooms.
3. **Exorcist break gives +40 house-wide: newly confirmed live** (seed 2). Dad went 64→100 and Dog 40→88. Forcing the exorcist in by spamming empty rooms starves ecto (faded at 116 s).
4. E has no range check: still works.
5. Salt only blocks horizontal moves: not retested.
6. Fear display: **fixed** (floored).

## Top 3 remaining changes
1. Fix harness replay determinism before trusting agent-mode replays.
2. Nerf whisper: no single-victim refund, plus habituation or a fear cap around 80.
3. Slow the opener (Kid farther from the door, a longer E hold) and tighten `night_len` toward 180, or make the x3 combo need distinct types.
