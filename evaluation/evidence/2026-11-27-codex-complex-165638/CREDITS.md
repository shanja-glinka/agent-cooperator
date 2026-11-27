# GPT-6.2 Sol consumption

Standard-speed credit equivalent from measured tokens of every Codex actor. GPT-6.2 Sol rates per million are 50 uncached input, 2.5 cached input and 250 output. GPT-6 Luna rates are 2.5, 0.25 and 12.5. Reasoning is included in output. Actual debits against a shared subscription allowance are unavailable per cell. [OpenAI token rates](https://learn.chatgpt.com/docs/pricing#token-rates)

Inputs: metrics.json SHA-256 75bf0b3aa42eb650c7b9e49acfe2883107f8c351d1f60723990f552b3b4bc668, isolation.json SHA-256 2435f9073e75eefd0ca584ff569acb8decc8111ced617e34df6f0b896ba0d8b1.

## Cost per accepted result

Clean attempts include failed checks. The numerator sums their credits. The denominator counts delivered commits from successful GPT-6.2 Sol runs that passed the task contract and left a clean checkout. See the cell table for all incurred spend and isolation verdicts. A suite total with missing clean cells has a different task mix.

| Task | Variant | Clean / attempted | Accepted | Requests | Fresh input | Cached input | Output | Credits | Credits / accepted |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| All tasks | standard | 2/8 | 2 | 33 | 125987 | 1588608 | 10188 | 12.82 | 6.41 |
| All tasks | complex | 0/2 | 0 | 0 | 0 | 0 | 0 | 0.00 | — |
| small | standard | 0/2 | 0 | 0 | 0 | 0 | 0 | 0.00 | — |
| big | standard | 0/2 | 0 | 0 | 0 | 0 | 0 | 0.00 | — |
| big | complex | 0/2 | 0 | 0 | 0 | 0 | 0 | 0.00 | — |
| unknown | standard | 2/2 | 2 | 33 | 125987 | 1588608 | 10188 | 12.82 | 6.41 |
| review | standard | 0/2 | 0 | 0 | 0 | 0 | 0 | 0.00 | — |

## Individual attempts

| Cell | Isolation | Contract and delivery passed | Accepted clean | Requests | Root credits | Worker credits | Reviewer credits | Other credits | Total credits |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| big-complex-sol-r1 | shared | yes | no | 146 | 19.80 | 33.49 | 13.35 | 0.00 | 66.64 |
| big-complex-sol-r2 | shared | yes | no | 159 | 27.74 | 31.61 | 12.22 | 0.00 | 71.57 |
| big-standard-sol-r1 | shared | yes | no | 193 | 31.34 | 3.60 | 13.36 | 0.00 | 48.31 |
| big-standard-sol-r2 | shared | yes | no | 239 | 25.02 | 6.63 | 10.86 | 0.00 | 42.51 |
| review-standard-sol-r1 | shared | yes | no | 14 | 4.39 | 0.00 | 0.00 | 0.00 | 4.39 |
| review-standard-sol-r2 | shared | yes | no | 15 | 5.07 | 0.00 | 0.00 | 0.00 | 5.07 |
| small-standard-sol-r1 | shared | yes | no | 70 | 13.12 | 0.61 | 7.68 | 0.00 | 21.40 |
| small-standard-sol-r2 | shared | yes | no | 111 | 13.80 | 1.59 | 8.35 | 0.00 | 23.74 |
| unknown-standard-sol-r1 | clean | yes | yes | 18 | 7.35 | 0.00 | 0.00 | 0.00 | 7.35 |
| unknown-standard-sol-r2 | clean | yes | yes | 15 | 5.47 | 0.00 | 0.00 | 0.00 | 5.47 |
