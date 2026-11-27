# Codex routing experiment on GPT-6.2 Sol

The experiment compared no kit, release 1.8.1 (`cf61bb5`) and a Codex-only routing candidate (`e444402`) on four frozen development tasks. Each variant ran twice on Codex and Claude Code. The runtime, suite, conditional decision rule and original expectations are recorded with the bundle. The candidate stays on the experiment branch.

## Recorded spend and outcomes

Each pair below gives the standard-speed credit equivalent for GPT-6.2 Sol and all its child models in repeats 1 and 2. Values include trials flagged by the original isolation check, since those requests consumed resources. The clean-only, outcome-normalized tables are in [CREDITS.md](CREDITS.md). Account-window counters aggregate concurrent activity and do not identify a single cell's subscription debit.

| Task | No kit | 1.8.1 | Routing candidate |
| --- | ---: | ---: | ---: |
| Existing supplied patch | 5.88 / 5.29 | 6.07 / 6.45 | 5.20 / 5.57 |
| Small implementation | 7.32 / 9.12 | 7.90 / 7.11 | 8.84 / 7.26 |
| Investigate and fix | 5.46 / 6.29 | 5.35 / 5.69 | 6.67 / 5.53 |
| Large behavior-preserving migration | 19.76 / 21.65 | 42.57 / 43.58 | 57.79 / 60.36 |
| Spend over eight attempts | 80.76 | 124.72 | 157.22 |

All 24 Codex results passed the preregistered task contracts. On the large task, every Codex result passed four hidden cases. A separate 42-input behavior replay found one difference from the base in the second no-kit result. All four final trees produced with a kit passed that replay. On Claude Code, both kit variants met all eight contracts. No kit met six of eight, passing only two and three of four hidden cases in the large-task repeats despite green CI.

## What explains the difference

In the large-task runs the released kit's cooperator and reviewer together consumed 37.72 and 38.85 credits. The Luna workers together consumed 4.85 and 4.73. The candidate increased cooperator, reviewer and worker spend in both repeats. In the released kit's first repeat, replaying the exact tree immediately before review fixes showed 16 differences on 42 inputs. The corrected tree had none. This connects some of the expensive review to specific observed behavior that ordinary CI missed.

In both patch-review repeats the release opened the orchestration skill and then worked alone. The candidate worked alone and skipped the read. The different token counts are consistent with a narrower saving on supplied patches. The two small implementation trials still opened the skill. Their diffs and traces identify bulk rewriting, input cached across requests, output tokens, and an extra implementation attempt as separate contributors. The investigation task's cost difference changed sign on repetition. Further per-trial evidence is in [TRACE-NOTES.md](TRACE-NOTES.md).

## Isolation and decision

The original product validator classified 31 cells as clean and 17 as shared. All 17 shared cells used Codex. Its official clean-only table has seven Codex cells and lacks a matched release–candidate pair on the large task. Its clean-only cross-task averages have different task mixes. Preserve this restriction when using the figures to compare policies. An additional path audit investigates the flagged commands separately.

The candidate has no established suite-wide saving. Its observed large-task spend increased in both repeats with the same preregistered outcome. The next version retains a narrower supplied-patch rule for a fresh test, and introduces the user-requested Complex worker profile as a separate feature. Neither the two repeats nor the behavior replay justify a general claim that every review pays for itself or that a higher worker tier is more efficient.
