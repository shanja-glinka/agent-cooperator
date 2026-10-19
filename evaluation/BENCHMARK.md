# Measuring a kit version

Every new kit version is measured before it is called done, released, or installed.
The order is fixed: **make the version → commit it → run the full measurement →
read the comparison → decide**. A version is not "checked" until every cell of the
suite has run.

## Rules

1. **One suite, always the same.** A suite is a fixed set of tasks on a fixed base
   commit of a real project, with a quality check per task. Do not change the
   tasks, the base, or the checks between versions; a new task goes into the suite
   and is then run for every variant.
2. **Full grid in one run.** Every task × model × variant × repeat runs in the same
   batch: no kit, the previous version, and the new version, on both runtimes
   (Opus 5.5 in Claude Code, GPT-6.1 Sol in Codex). No partial runs, no filling of
   gaps afterwards.
3. **Nothing changes during a run.** Do not edit the kit while it is being
   measured. A fix makes a new version and a new run. A fix of the bench itself
   makes a new run of every variant, not only of the new version.
4. **A cell of its own.** Each cell runs in a container of its own: its checkout,
   holding only the task's base commit and its history (no other branches, no
   remote, no results of other cells); its own `/tmp`, CLI homes, and processes,
   all removed with the container. Agents choose absolute paths such as
   `/tmp/ci.log` themselves, so separate checkouts on one host are not enough:
   on 2026-10-19 cells running side by side read each other's CI logs.
5. **Same conditions.** The kit installed only into its cells; no user skills,
   agents, MCP servers (Claude Code runs with `--strict-mcp-config`, which also
   keeps out the account's claude.ai connectors), or private instruction files;
   the user's own `maxTurns` limits applied to the kit roles; the same task text,
   image, memory, and CPUs for every variant. Within each repeat, the variants of
   one task and model run side by side, so they share the same time of day.
6. **Repeats.** At least two repeats per cell when a decision depends on the
   result; single runs vary by up to about 60% in time and 40% in input.
   A difference smaller than the spread between repeats is not a result, and
   overlapping ranges do not prove two variants equal.
7. **Nothing leaves the machine.** Results stay in `evaluation/runs/` (ignored by
   git). Suites for private projects stay in `evaluation/suites/` (ignored by git).

## Run

```sh
evaluation/bench/image.sh <suite-dir>                 # the cell image, once per CLI version
evaluation/bench/selftest.sh <suite-dir> [--agents]   # isolation and evidence, before every run
evaluation/bench/bench.sh <suite-dir> <label> nokit <prev>=<commit> <new>=<commit>
# REPEATS=2 PARALLEL=<n> MODELS="opus sol" ...
# DRY=1 sets up and removes every cell without starting agents.
```

`selftest.sh` checks, without starting an agent, that two running cells writing
the same `/tmp` path each read their own file, that a removed cell leaves no
file or process to the next one, that a failing CI stays failing and a pass on
the second attempt is marked, and that a checkout arrives intact. With
`--agents` it also asks each CLI for one short answer inside a cell.

The run directory `evaluation/runs/<date>-<label>/` gets:

- `COMPARISON.md` — the conclusion table, also printed at the end of the run;
- `METRICS.md` — every metric for every variant;
- `metrics.json` — full data per cell, per agent, and per tool;
- `BASELINE.md`, `baseline.json` — the no-kit result per task and model: what
  the model did by itself, at what cost, and how it worked;
- `ROUTES.md` — whom each cooperator started, with which role and model, the
  reason it gave just before, what the agent returned, and the final report;
- `isolation.json` — whether each cell kept its `/tmp` to itself (for runs
  before containers, `isolation.mjs` finds shared files in the command logs);
- `image.txt` — the cell image and its id;
- `cells/<task>-<variant>-<model>-r<n>/` — logs, Claude transcripts or Codex
  rollouts, `timeline.md`, the quality check with a log per CI attempt
  (`check-logs/`), what the agent committed, `provenance.json` (base, checked
  head, image), and the diff.

Each cell leaves its result on a branch `bench/<run>/<cell>` in the target
repository (fetched locally from a bundle).

## Metrics

Per cell and per agent:

- wall time;
- number of agents;
- tool calls (cooperator, agents, total);
- model requests;
- input without cache, cache writes, cache reads, total input, input per request;
- output and thinking tokens;
- handoffs;
- messages to and from agents;
- `sleep`/`wait_agent`;
- kit files read (Claude Code receives the orchestrate skill in context without
  reading a file, so this does not measure the instructions delivered);
- the suite's quality fields, plus commits made, files left uncommitted, and the
  cell's isolation.

Claude numbers come from the session transcripts. Codex numbers come from the
rollout files; Codex does not report cache writes.

## The conclusion

The no-kit cells are the factual result: what the model does by itself. A kit
version is judged by its difference from them, first in what was done, then in
cost.

For each task and model, one table:

| Metric | No kit | previous | new | previous vs no kit | new vs no kit | new vs previous |
| --- | --- | --- | --- | --- | --- | --- |

Changes are percentages; within ±5% is "no change"; several repeats show the mean
and the range. Under each table, one line per comparison says better, worse, or no
change, and why; then an overall verdict, including what the run did not test.
A comparison that involves a cell without isolation is not an effect of the kit.

## Suites

A suite directory holds:

- `suite.env` with `REPO`, `BASE`, `TASKS=(…)`, optional `BASE_<task>` for a task
  with its own base commit, `BENCH_MAXTURNS`, the CLI versions
  (`CLAUDE_CODE_VERSION`, `CODEX_VERSION`), `BENCH_IMAGE`, the cell resources
  (`BENCH_PARALLEL`, `BENCH_MEMORY`, `BENCH_CPUS`), and the credentials: a Claude
  token file from `claude setup-token` (`BENCH_CLAUDE_TOKEN_FILE`; a container
  cannot read the macOS keychain) and the Codex `auth.json` (`BENCH_CODEX_AUTH`,
  mounted so that a token refresh writes through to the same file);
- `Dockerfile` and `image-context.sh`, the project's layer of the cell image (its
  dependencies, installed at `/work/repo`);
- `tasks/<task>.txt`, the prompt, where `{BRANCH}` becomes the cell's branch;
- `checks/<task>.sh`, run inside the finished checkout, which prints one JSON object
  of quality fields. Hidden acceptance tests stay in the suite and enter the
  container only with the check, after the agent has finished.
