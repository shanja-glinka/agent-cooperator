# GPT-6.2 Sol consumption

Standard-speed credit equivalent from measured tokens of every Codex actor. GPT-6.2 Sol rates per million are 50 uncached input, 2.5 cached input and 250 output. GPT-6 Luna rates are 2.5, 0.25 and 12.5. Reasoning is included in output. Actual debits against a shared subscription allowance are unavailable per cell. [OpenAI token rates](https://learn.chatgpt.com/docs/pricing#token-rates)

Inputs: metrics.json SHA-256 e9a024718fc8512f115458ebeb6493472560f6d63a33d20718e1c3f8f6653a70, isolation.json SHA-256 c56e8b4540385a3f387300c83326f8b1927fa8381988c0861ef403010de69a3f.

## Cost per accepted result

Clean attempts include failed checks. The numerator sums their credits. The denominator counts delivered commits from successful GPT-6.2 Sol runs that passed the task contract and left a clean checkout. See the cell table for all incurred spend and isolation verdicts. A suite total with missing clean cells has a different task mix.

| Task | Variant | Clean / attempted | Accepted | Requests | Fresh input | Cached input | Output | Credits | Credits / accepted |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| All tasks | nokit | 4/8 | 4 | 106 | 321994 | 6533888 | 38659 | 42.10 | 10.52 |
| All tasks | current | 2/8 | 2 | 35 | 121336 | 1380992 | 7639 | 11.43 | 5.71 |
| All tasks | candidate | 1/8 | 1 | 26 | 69593 | 1331072 | 8141 | 8.84 | 8.84 |
| small | nokit | 1/2 | 1 | 31 | 59742 | 1643904 | 8087 | 9.12 | 9.12 |
| small | current | 0/2 | 0 | 0 | 0 | 0 | 0 | 0.00 | — |
| small | candidate | 1/2 | 1 | 26 | 69593 | 1331072 | 8141 | 8.84 | 8.84 |
| big | nokit | 1/2 | 1 | 42 | 146933 | 3611648 | 21084 | 21.65 | 21.65 |
| big | current | 0/2 | 0 | 0 | 0 | 0 | 0 | 0.00 | — |
| big | candidate | 0/2 | 0 | 0 | 0 | 0 | 0 | 0.00 | — |
| unknown | nokit | 1/2 | 1 | 18 | 44079 | 775680 | 5255 | 5.46 | 5.46 |
| unknown | current | 1/2 | 1 | 20 | 46462 | 854272 | 3584 | 5.35 | 5.35 |
| unknown | candidate | 0/2 | 0 | 0 | 0 | 0 | 0 | 0.00 | — |
| review | nokit | 1/2 | 1 | 15 | 71240 | 502656 | 4233 | 5.88 | 5.88 |
| review | current | 1/2 | 1 | 15 | 74874 | 526720 | 4055 | 6.07 | 6.07 |
| review | candidate | 0/2 | 0 | 0 | 0 | 0 | 0 | 0.00 | — |

## Individual attempts

| Cell | Isolation | Contract and delivery passed | Accepted clean | Requests | Root credits | Worker credits | Reviewer credits | Other credits | Total credits |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| big-candidate-sol-r1 | shared | yes | no | 307 | 23.37 | 9.22 | 25.19 | 0.00 | 57.79 |
| big-candidate-sol-r2 | shared | yes | no | 329 | 28.28 | 8.59 | 23.49 | 0.00 | 60.36 |
| big-current-sol-r1 | shared | yes | no | 230 | 20.64 | 4.85 | 17.08 | 0.00 | 42.57 |
| big-current-sol-r2 | shared | yes | no | 220 | 23.76 | 4.73 | 15.09 | 0.00 | 43.58 |
| big-nokit-sol-r1 | shared | yes | no | 39 | 19.76 | 0.00 | 0.00 | 0.00 | 19.76 |
| big-nokit-sol-r2 | clean | yes | yes | 42 | 21.65 | 0.00 | 0.00 | 0.00 | 21.65 |
| review-candidate-sol-r1 | shared | yes | no | 15 | 5.20 | 0.00 | 0.00 | 0.00 | 5.20 |
| review-candidate-sol-r2 | shared | yes | no | 17 | 5.57 | 0.00 | 0.00 | 0.00 | 5.57 |
| review-current-sol-r1 | clean | yes | yes | 15 | 6.07 | 0.00 | 0.00 | 0.00 | 6.07 |
| review-current-sol-r2 | shared | yes | no | 16 | 6.45 | 0.00 | 0.00 | 0.00 | 6.45 |
| review-nokit-sol-r1 | clean | yes | yes | 15 | 5.88 | 0.00 | 0.00 | 0.00 | 5.88 |
| review-nokit-sol-r2 | shared | yes | no | 15 | 5.29 | 0.00 | 0.00 | 0.00 | 5.29 |
| small-candidate-sol-r1 | clean | yes | yes | 26 | 8.84 | 0.00 | 0.00 | 0.00 | 8.84 |
| small-candidate-sol-r2 | shared | yes | no | 18 | 7.26 | 0.00 | 0.00 | 0.00 | 7.26 |
| small-current-sol-r1 | shared | yes | no | 20 | 7.90 | 0.00 | 0.00 | 0.00 | 7.90 |
| small-current-sol-r2 | shared | yes | no | 19 | 7.11 | 0.00 | 0.00 | 0.00 | 7.11 |
| small-nokit-sol-r1 | shared | yes | no | 20 | 7.32 | 0.00 | 0.00 | 0.00 | 7.32 |
| small-nokit-sol-r2 | clean | yes | yes | 31 | 9.12 | 0.00 | 0.00 | 0.00 | 9.12 |
| unknown-candidate-sol-r1 | shared | yes | no | 20 | 6.67 | 0.00 | 0.00 | 0.00 | 6.67 |
| unknown-candidate-sol-r2 | shared | yes | no | 16 | 5.53 | 0.00 | 0.00 | 0.00 | 5.53 |
| unknown-current-sol-r1 | clean | yes | yes | 20 | 5.35 | 0.00 | 0.00 | 0.00 | 5.35 |
| unknown-current-sol-r2 | shared | yes | no | 18 | 5.69 | 0.00 | 0.00 | 0.00 | 5.69 |
| unknown-nokit-sol-r1 | clean | yes | yes | 18 | 5.46 | 0.00 | 0.00 | 0.00 | 5.46 |
| unknown-nokit-sol-r2 | shared | yes | no | 19 | 6.29 | 0.00 | 0.00 | 0.00 | 6.29 |
