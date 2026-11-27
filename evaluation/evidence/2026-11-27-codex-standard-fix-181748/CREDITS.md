# GPT-6.2 Sol consumption

Standard-speed credit equivalent from measured tokens of every Codex actor. GPT-6.2 Sol rates per million are 50 uncached input, 2.5 cached input and 250 output. GPT-6 Luna rates are 2.5, 0.25 and 12.5. Reasoning is included in output. Actual debits against a shared subscription allowance are unavailable per cell. [OpenAI token rates](https://learn.chatgpt.com/docs/pricing#token-rates)

Inputs: metrics.json SHA-256 e9976719970661a0cd2b3c971e8b88b3114fa74dca03b94d874f1f1ca95babd5, isolation.json SHA-256 a5f6c2c9b9888f8615790647ad267b848823bcf5e19b796444798eaf6bb212da.

## Cost per accepted result

Clean attempts include failed checks. The numerator sums their credits. The denominator counts delivered commits from successful GPT-6.2 Sol runs that passed the task contract and left a clean checkout. See the cell table for all incurred spend and isolation verdicts. A suite total with missing clean cells has a different task mix.

| Task | Variant | Clean / attempted | Accepted | Requests | Fresh input | Cached input | Output | Credits | Credits / accepted |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| All tasks | standard191 | 8/8 | 8 | 701 | 1723242 | 60032000 | 485512 | 153.44 | 19.18 |
| All tasks | complex191 | 2/2 | 2 | 241 | 925748 | 16681984 | 106380 | 114.59 | 57.29 |
| small | standard191 | 2/2 | 2 | 45 | 138801 | 2654592 | 16595 | 17.73 | 8.86 |
| big | standard191 | 2/2 | 2 | 582 | 1376013 | 54071424 | 446141 | 111.33 | 55.67 |
| big | complex191 | 2/2 | 2 | 241 | 925748 | 16681984 | 106380 | 114.59 | 57.29 |
| unknown | standard191 | 2/2 | 2 | 40 | 115646 | 1987072 | 12309 | 13.83 | 6.91 |
| review | standard191 | 2/2 | 2 | 34 | 92782 | 1318912 | 10467 | 10.55 | 5.28 |

## Individual attempts

| Cell | Isolation | Contract and delivery passed | Accepted clean | Requests | Root credits | Worker credits | Reviewer credits | Other credits | Total credits |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| big-complex191-sol-r1 | clean | yes | yes | 102 | 17.45 | 23.86 | 11.05 | 0.00 | 52.36 |
| big-complex191-sol-r2 | clean | yes | yes | 139 | 18.62 | 31.79 | 11.81 | 0.00 | 62.23 |
| big-standard191-sol-r1 | clean | yes | yes | 332 | 37.98 | 8.19 | 21.27 | 0.00 | 67.44 |
| big-standard191-sol-r2 | clean | yes | yes | 250 | 25.15 | 6.96 | 11.78 | 0.00 | 43.90 |
| review-standard191-sol-r1 | clean | yes | yes | 17 | 5.70 | 0.00 | 0.00 | 0.00 | 5.70 |
| review-standard191-sol-r2 | clean | yes | yes | 17 | 4.85 | 0.00 | 0.00 | 0.00 | 4.85 |
| small-standard191-sol-r1 | clean | yes | yes | 21 | 8.52 | 0.00 | 0.00 | 0.00 | 8.52 |
| small-standard191-sol-r2 | clean | yes | yes | 24 | 9.20 | 0.00 | 0.00 | 0.00 | 9.20 |
| unknown-standard191-sol-r1 | clean | yes | yes | 19 | 7.01 | 0.00 | 0.00 | 0.00 | 7.01 |
| unknown-standard191-sol-r2 | clean | yes | yes | 21 | 6.81 | 0.00 | 0.00 | 0.00 | 6.81 |
