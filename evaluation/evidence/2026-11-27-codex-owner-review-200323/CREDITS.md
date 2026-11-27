# GPT-6.2 Sol consumption

Standard-speed credit equivalent from measured tokens of every Codex actor. GPT-6.2 Sol rates per million are 50 uncached input, 2.5 cached input and 250 output. GPT-6 Luna rates are 2.5, 0.25 and 12.5. Reasoning is included in output. Actual debits against a shared subscription allowance are unavailable per cell. [OpenAI token rates](https://learn.chatgpt.com/docs/pricing#token-rates)

Inputs: metrics.json SHA-256 6e40b22d1b18ce1f483b7170ed9ec1a9e2ef100060d004a3648a79095460a692, isolation.json SHA-256 9aedb5231645fdea515f1070594073e9d939607ca7e2333bb1c7a76bfe2fcaae.

## Cost per accepted result

Clean attempts include failed checks. The numerator sums their credits. The denominator counts delivered commits from successful GPT-6.2 Sol runs that passed the task contract and left a clean checkout. See the cell table for all incurred spend and isolation verdicts. A suite total with missing clean cells has a different task mix.

| Task | Variant | Clean / attempted | Accepted | Requests | Fresh input | Cached input | Output | Credits | Credits / accepted |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| All tasks | ownerreview | 2/2 | 2 | 127 | 546821 | 11865728 | 65199 | 73.31 | 36.65 |
| big | ownerreview | 2/2 | 2 | 127 | 546821 | 11865728 | 65199 | 73.31 | 36.65 |

## Individual attempts

| Cell | Isolation | Contract and delivery passed | Accepted clean | Requests | Root credits | Worker credits | Reviewer credits | Other credits | Total credits |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| big-ownerreview-sol-r1 | clean | yes | yes | 62 | 24.27 | 0.00 | 12.24 | 0.00 | 36.51 |
| big-ownerreview-sol-r2 | clean | yes | yes | 65 | 25.01 | 0.00 | 11.79 | 0.00 | 36.80 |
