AI persona playtest (Min-maxer), opinion only. Not a fun verdict; human playtests still required.

## Run summary
- 10 decisions, then a handoff with `--then policy`. The house was not cleared by hand.
- The Kid fled at about 35 s. At 68 s ECTO was down to 1 and the fading timer was running.
- From that 68 s state, the policy bot won at t=178.7.
- Baseline policy bot clear times: p10 140 s, p50 198 s, p90 214 s.
- Confound: the harness's Space start press counts as a haunt, so the Kid started at 49 fear and Q was already unlocked.

| D | t | ecto | susp | fear (dad/mom/kid/dog) | fled |
|---|---|---|---|---|---|
| 1 | 1 | 98 | 4 | 0/0/49/0 | 0 |
| 3 | 27 | 30 | 31 | Kid 92 | 0 |
| 4 | 29 | 42 | 39 | Kid 99.6 | 0 |
| 5 | 32 | 12 | 48 | Mom 36, R unlocked | 0 |
| 6 | 37 | 2 | 61 | Dad 45, salt | 1 |
| 7-10 | 44-68 | 1-17 | 35-47 | targets kept leaving the room | 1 |

## Optimal line found
1. One E on a fresh trick: 19 fear, ×1.2–1.4 with the combo.
2. Then Q every 2.55 s, alternating E between the room's 2 objects. Space the E's at least 5 s apart, or the ×0.4 nerve penalty applies.
3. Finish with an E once Q has capped fear at 99.

- The Kid goes from 49 to fled in about 9 s.
- R unlocks at about 31 s through a cross-room combo.
- The real limit is keeping the victim in the room: E only holds them for 1.4 s.

## Exploits / degenerate strategies
1. **Whisper is free fear** (high).
   - Costs 8, refunds 4.8 per victim, adds no suspicion and has no habituation.
   - Regen covers the cooldown, so each cast is net +0.55 ecto on 1 victim and +2.15 on 2.
   - It resets scaredAgo, so fear never decays.
2. **The x3 combo is trivial** (medium): an A-B-A sequence counts, and so do cross-room chains.
3. **Breaking the exorcist gives +40 fear to the whole house** (medium; read from the code, not tested). Empty-room haunts count toward it.
4. **E has no range check** (low-medium). It works from the far wall, outside the lantern radius.
5. **Salt only blocks horizontal crossing** (low; read from the code). You can float around it through floors.
6. **The fear display rounds 99.6 to 100** (low).

## Balance notes
- **Ecto is the wall:** four E's took it from 100 to 12 by 32 s.
- Suspicion peaked at 61, so `hunt_warn` 80 never fired.
- Policy clears take 140–214 s, so `night_len` 300 puts little pressure on a competent player.
- Fear decay only matters when family members have company.

## Top 3 suggested changes
1. Nerf whisper:
   - no refund on a single victim
   - habituation, or a cap around 80
   - stop it resetting scaredAgo
2. Make the x3 combo need 3 distinct trick types. Cut `HOPE_FEAR` to about 20, and don't count empty-room haunts toward breaking the exorcist.
3. Have a landed E hold victims for about 3 s (`idleT` 1.4 → 3). Round fear down in the HUD and the probe.
