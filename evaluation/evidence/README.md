# Evidence for the published measurements

The numbers in the [README](../../README.md#measured-with-and-without-the-kit)
come from these files. They are produced from the raw run logs by
[`evidence.mjs`](../bench/evidence.mjs) and checked by
[`verify-evidence.mjs`](../bench/verify-evidence.mjs). They are kept in the
repository only: the npm package that `npx` installs does not contain
`evaluation/`.

```sh
node evaluation/bench/verify-evidence.mjs evaluation/evidence/2026-10-21-v11
node evaluation/bench/verify-evidence.mjs evaluation/evidence/2026-10-20-v9
```

The README's Opus numbers with the kit come from the 1.5.0 run (`2026-10-21-v11`),
its Sol numbers from the 1.4.1 run (`2026-10-20-v9`). On 2026-10-21 the OpenAI
API answered 20–60% slower per request, so Sol's wall time that day is not
comparable; the 1.5.0 Sol cells are published here too.

It recomputes the price of every model request from its token counts at the
list prices in [`prices.mjs`](../bench/prices.mjs). It checks each agent's and
each cell's sums and the cold-start prices. Then it rebuilds `METRICS.md` and
`COMPARISON.md` from the published files in a copy and compares them byte for
byte. It also recomputes what the long-prompt tiers added to each agent's price.

It checks the arithmetic and the tables, not the contract verdicts: those come
from the private project's hidden tests, which are not published.

## What is here

| Path | What it holds |
| --- | --- |
| `2026-10-21-v11/metrics.json` | The kit 1.5.0 run (named v11 in the bench): 24 cells, 4 tasks × 2 models × 3 runs. Per cell: wall time, route, contract and quality fields, review and `accept.mjs` counts, waits, the long-prompt surcharge, seconds per request, files written after the last review, and per agent its model, effort, turns, tool calls by name, requests, tokens, and price. One Opus cell was run again after its model looped on one reply up to the 128k-token output limit; its `EXPECTATIONS.md` records that and the price with that cell. |
| `2026-10-21-v11/prev-metrics-*.json` | The columns it is compared with: no kit (2026-10-19), 1.4.1 (v9, 2026-10-20), and v10 (2026-10-21), an unreleased version that also split Haiku blocks to stay under the 100k tier and cost more on the large task. |
| `2026-10-20-v9/metrics.json` | The kit 1.4.1 run (named v9): the same fields; the README's Sol numbers come from here. |
| `2026-10-20-v9/prev-metrics-*.json` | Its columns: no kit (2026-10-19) and v8 (1.4.0, 2026-10-20). |
| `*/requests.jsonl` | Every model request of those cells, one line each: the cell, the agent's index in it, role, model, and token counts (Claude: input, cache writes for 5 minutes and 1 hour, cache reads, output; Codex: input, cached input, output, reasoning). |
| `*/isolation.json` | Whether a cell shared `/tmp` files with a cell running at the same time (which cells, not the files). |
| `*/COMPARISON.md`, `METRICS.md` | The comparison tables, rebuilt by `report.mjs` from the files above. |
| `*/EXPECTATIONS.md` | What the run was expected to show, written before it started; what happened during the run is added below it. |
| `contract-recheck/summary.txt` | The large task's contract for the earlier runs, rechecked by one hidden test on their final code. |

## What is left out

The project behind the suite is private. These files hold no code, task texts,
agent messages or reports, file names, paths, commits, or other names of that
project. The quality fields keep counts and verdicts; a field that named one of
the project's files is left out, and the patch-review task's defects keep only
their numbers. `evidence.mjs` refuses to write if any private name, the home
path, or a commit of the private repository would be published.

## How to read it

- A cell is `<task>-<variant>-<model>-r<n>`: tasks `small`, `big`, `unknown`,
  `review`; variants `nokit`, `v8` (1.4.0), `v9` (1.4.1), `v10` (unreleased),
  `v11` (1.5.0); models `opus` (Claude Code, Opus 5.5
  cooperator) and `sol` (Codex, GPT-6.1 Sol cooperator).
- A run met the contract when its task's own checks passed (`Решено`: solved).
  On the large task it also needs the hidden contract test (`Контракт
  выполнен`): the defensive checks on database and JSON data must stay.
- Prices are API list prices. For Codex they are the lower bound, because its
  logs do not report cache writes. The cold-start price reprices a prompt an
  earlier session had cached: the part beyond the prefix every cell of the run
  shares counts as a cache write (see `evaluation/BENCHMARK.md`).
- Seconds per request are the model's response time without tool runs and waits
  for agents: the API's speed on the day of the run.
- The tables are in Russian, like the bench's own output.
