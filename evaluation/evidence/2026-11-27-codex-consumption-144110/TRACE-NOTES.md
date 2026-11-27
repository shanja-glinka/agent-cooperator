# What happened in the individual trials

The task names and trial IDs below match the public metrics and request records. Command descriptions summarize the private rollouts. The Git diff counts compare each recorded final revision with the task base. The private implementation, task text and source paths stay with the original suite.

## Small task, repeat 1

Both kit versions read the orchestration skill and completed the work in the root thread. Release 1.8.1 opened the skill on its first model request. The candidate opened it on its fifth. The candidate made 26 requests versus 20 for the release. Both ran the full CI check once and passed. The candidate's suite ran 2,082 passing tests, versus 2,080 for the release.

The candidate generated a bulk-edit script that stopped on a handler shape it did not anticipate. A second script reread the original files from Git and explicitly indented every nonempty line of a wrapped handler body. The candidate then compared 26 handler bodies and route registrations with their originals. Its formatter also processed one new helper. The bulk edit explains the widespread indentation changes. The two formatter-related steps were a format check and a format write, and the format check returned a failure. The final full CI run passed on its first invocation.

| Git view | Without kit | 1.8.1 | Candidate |
| --- | ---: | ---: | ---: |
| Added / removed lines | 211 / 154 | 105 / 59 | 1,005 / 906 |
| Added / removed ignoring whitespace | 120 / 63 | 105 / 59 | 162 / 63 |

Against 1.8.1 the candidate used 10,896 fewer fresh input tokens, 332,160 more cached input tokens, and 2,625 more output tokens. The requests show more context reprocessed and more generated output during this implementation. They cannot assign a fraction of those tokens to a single source file or establish that the changed routing text caused the implementation choice.

## Unknown task, repeat 1

All three versions used only the root. The candidate skipped the orchestration skill and the release read it. Both made 20 requests and passed the hidden fix check. The candidate made a further test edit after the implementation change and used three edit-related test/check commands. The release used two. The candidate used 13,001 more fresh input tokens, 18,048 more cached tokens and 2,471 more output tokens. Its reasoning-token subset increased by 1,168. Skipping the skill saved one read, but equal request counts still led to different consumption.

## Large task, repeat 1

All three Codex results passed the four preregistered hidden cases. The released kit used three Luna workers and an xhigh Sol reviewer. The candidate used two Luna workers and an xhigh Sol reviewer. The release reviewer recorded eight findings across 170 sites and closed them in the second round. The candidate reviewer recorded nine findings across 171 sites and closed them in the second round. These counts and round numbers come from the reviewers’ own reports. A round describes an iteration within the review. The benchmark recorded one successful acceptance-script close for the candidate and none for 1.8.1. A focused independent replay, when available, is reported separately from the original hidden tests.

| Standard-rate credits | Without kit | 1.8.1 | Candidate |
| --- | ---: | ---: | ---: |
| Root | 19.76 | 20.64 | 23.37 |
| Workers combined | 0 | 4.85 | 9.22 |
| Reviewer | 0 | 17.08 | 25.19 |
| Reviewer requests | 0 | 27 | 53 |

The candidate reviewer alone accounts for about 8.1 additional credits over 1.8.1. The two candidate workers made 185 requests combined versus 145 for the three release workers. This trial demonstrates why the head count cannot predict total consumption. The original acceptance result leaves open how much of the review work an alternative implementation would still need.

For Claude Code on this large-task repeat, no kit passed CI and two of the four hidden cases. Both kit variants passed CI and all four. The ordinary CI outcome alone would miss that difference.

## Review of a supplied patch, both repeats

Every Codex result passed both seeded behavior checks, the compatibility check and CI. All were root-only. The release read the orchestration skill on the first request in both repeats, returning approximately 16 KB. The routing candidate and no-kit controls had no recorded read. The candidate used 15 and 17 requests, versus 15 and 16 for the release. Its credits were 5.20 and 5.57 versus 6.07 and 6.45. Consumption fell in both repeats despite the second candidate attempt making one more request. The different token mixes preclude attributing the entire difference to the omitted read. These observations motivated a narrower supplied-patch rule in the separate Complex-profile study.

## Repeat checks on the small and unknown tasks

The second small-task candidate again opened the skill, used 18 requests and cost 7.26 credits; the release opened it, used 19 and cost 7.11. The large indentation diff recurred in both the candidate and the no-kit control. The candidate changed +1,001/−906 lines (+158/−63 ignoring whitespace), no kit +1,003/−906 (+160/−63 ignoring whitespace), and the release +116/−63 in either view. This rules out the new routing prompt being a necessary condition for the indentation pattern. It also shows how implementation choices and cache reuse can matter more than a single request.

On the unknown task the second candidate still skipped the skill. It used 16 requests and 5.53 credits versus 18 and 5.69 for the release. The single-repeat cost increase described above reversed on repetition. The route observation reproduced; a cost penalty did not.

## Comparing the large-task results with the base

The reviewer recorded a snapshot before the release's first-repeat fixes. Its Git object was unavailable after the working checkout was cleaned. Reversing the saved seven-file correction diff on the final tree produced exactly the tree hash recorded at review. A separate offline runner compared returned values and caught exceptions on 42 inputs against the immutable base. The base matched itself on 42/42. Before the corrections, 26/42 inputs matched. Afterwards, 42/42 matched. Sixteen differing inputs need not correspond one-to-one to the eight reviewer findings.

The same focused probes ran on all six final Codex trees. Both release and both candidate trees matched the base on all 42 inputs. No kit matched on 42/42 in repeat 1 and 41/42 in repeat 2. All six had passed the four preregistered hidden cases. The added test set originated in one review, so it demonstrates particular behaviors and cannot estimate overall defect prevalence. Counts by trial and behavior category are in behavior-replay.json.

On repeat 2, the released kit spent 23.76 root, 4.73 worker and 15.09 reviewer credits, 43.58 in total. The candidate used 28.28, 8.59 and 23.49 respectively, 60.36 in total. Both kit runs carried the benchmark's original shared-path flag. Read the isolation audit before treating the totals as a comparison.

## Where the large-task requests increased

The four kit runs kept the same worker-and-review route, including Sol high as cooperator, Luna xhigh as worker and Sol xhigh as reviewer. Within that route the candidate did more coordination and used more model requests. Counts below come from the recorded actors and their tool calls.

| Measurement | 1.8.1 r1 | Candidate r1 | 1.8.1 r2 | Candidate r2 |
| --- | ---: | ---: | ---: | ---: |
| Root model requests | 58 | 69 | 74 | 82 |
| Reviewer model requests | 27 | 53 | 30 | 39 |
| Worker model requests combined | 145 | 185 | 116 | 208 |
| Root calls to continue a worker or reviewer | 1 | 5 | 3 | 5 |
| Root message calls | 1 | 6 | 5 | 8 |
| Root wait calls | 6 | 14 | 6 | 13 |

Root and reviewer cached input together increased by approximately 3.90 million tokens in the first repeat and 3.20 million in the second. More requests with a long accumulated context contributed to the observed spending. A wait call measures an orchestration action. Time spent blocked inside it does not itself imply a model charge. The two trials cannot establish which wording induced a particular follow-up or what its outcome would have been without it.
