# Codex 6.2 consumption comparison

Credits use the measured input, cacheRead, and output tokens of every Codex actor. Rates per million are 50/2.5/250 for GPT-6.2 Sol and 2.5/0.25/12.5 for GPT-6 Luna; totals are summed before display rounding. Wall seconds are summed across task attempts and do not represent parallel batch elapsed time.

“Pass + delivered” follows the existing credits calculation: exit code 0, a GPT-6.2 Sol cooperator with requests, contract passed, at least one commit, and no uncommitted files. The credits per delivery column divides the spend of every finalized cell, including failed cells, by the number of delivered results. Infrastructure-interrupted attempts stopped before finalization. The [main report](REPORT.md) includes their measured usage and recalculates spend per delivery across all starts. The official isolation-clean attempt count is reported separately; per-attempt verdicts are shown below.

## Matched Standard arms (8 Codex attempts each; four tasks × two repeats)

| Arm | Attempts | Original pass + delivered | Official isolation-clean attempts | Credits in finalized cells | Finalized-cell credits / delivery | Wall seconds summed across tasks |
|---|---:|---:|---:|---:|---:|---:|
| No kit | 8 | 8 | 4 | 80.76 | 10.10 | 2288 |
| 1.8.1 | 8 | 8 | 2 | 124.72 | 15.59 | 4664 |
| Standard 1.9.0 | 8 | 8 | 2 | 158.24 | 19.78 | 5708 |
| Standard 1.9.1 | 8 | 8 | 8 | 153.44 | 19.18 | 5681 |

## Matched Standard attempts

| Arm | Task | Repeat | Credits (all Codex actors) | Wall seconds | Pass + delivered | Official isolation |
|---|---|---:|---:|---:|---|---|
| No kit | small | r1 | 7.32 | 222 | yes | shared |
| No kit | small | r2 | 9.12 | 276 | yes | clean |
| No kit | big | r1 | 19.76 | 524 | yes | shared |
| No kit | big | r2 | 21.65 | 549 | yes | clean |
| No kit | unknown | r1 | 5.46 | 180 | yes | clean |
| No kit | unknown | r2 | 6.29 | 197 | yes | shared |
| No kit | review | r1 | 5.88 | 172 | yes | clean |
| No kit | review | r2 | 5.29 | 168 | yes | shared |
| 1.8.1 | small | r1 | 7.90 | 189 | yes | shared |
| 1.8.1 | small | r2 | 7.11 | 297 | yes | shared |
| 1.8.1 | big | r1 | 42.57 | 1724 | yes | shared |
| 1.8.1 | big | r2 | 43.58 | 1710 | yes | shared |
| 1.8.1 | unknown | r1 | 5.35 | 161 | yes | clean |
| 1.8.1 | unknown | r2 | 5.69 | 186 | yes | shared |
| 1.8.1 | review | r1 | 6.07 | 185 | yes | clean |
| 1.8.1 | review | r2 | 6.45 | 212 | yes | shared |
| Standard 1.9.0 | small | r1 | 21.40 | 651 | yes | shared |
| Standard 1.9.0 | small | r2 | 23.74 | 957 | yes | shared |
| Standard 1.9.0 | big | r1 | 48.31 | 1388 | yes | shared |
| Standard 1.9.0 | big | r2 | 42.51 | 2065 | yes | shared |
| Standard 1.9.0 | unknown | r1 | 7.35 | 182 | yes | clean |
| Standard 1.9.0 | unknown | r2 | 5.47 | 152 | yes | clean |
| Standard 1.9.0 | review | r1 | 4.39 | 143 | yes | shared |
| Standard 1.9.0 | review | r2 | 5.07 | 170 | yes | shared |
| Standard 1.9.1 | small | r1 | 8.52 | 234 | yes | clean |
| Standard 1.9.1 | small | r2 | 9.20 | 277 | yes | clean |
| Standard 1.9.1 | big | r1 | 67.44 | 2333 | yes | clean |
| Standard 1.9.1 | big | r2 | 43.90 | 2077 | yes | clean |
| Standard 1.9.1 | unknown | r1 | 7.01 | 194 | yes | clean |
| Standard 1.9.1 | unknown | r2 | 6.81 | 207 | yes | clean |
| Standard 1.9.1 | review | r1 | 5.70 | 183 | yes | clean |
| Standard 1.9.1 | review | r2 | 4.85 | 176 | yes | clean |

## Complex arms (two extra big-task attempts each; separate from matched Standard arms)

| Arm | Attempts | Original pass + delivered | Official isolation-clean attempts | Credits in finalized cells | Finalized-cell credits / delivery | Wall seconds across big attempts |
|---|---:|---:|---:|---:|---:|---:|
| Complex 1.9.0 | 2 | 2 | 0 | 138.21 | 69.10 | 1884 |
| Complex 1.9.1 | 2 | 2 | 2 | 114.59 | 57.29 | 1537 |

| Arm | Task | Repeat | Credits (all Codex actors) | Wall seconds | Pass + delivered | Official isolation |
|---|---|---:|---:|---:|---|---|
| Complex 1.9.0 | big | r1 | 66.64 | 1024 | yes | shared |
| Complex 1.9.0 | big | r2 | 71.57 | 860 | yes | shared |
| Complex 1.9.1 | big | r1 | 52.36 | 653 | yes | clean |
| Complex 1.9.1 | big | r2 | 62.23 | 884 | yes | clean |
