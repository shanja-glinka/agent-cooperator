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
   measured. A fix makes a new version and a new run.
4. **Same conditions.** A fresh repository per cell outside the home directory,
   holding only the task's base commit and its history (no other branches, no
   remote, no results of other cells); the kit installed only into that cell; no
   user skills, agents, MCP servers, or private instruction files; the user's own
   `maxTurns` limits applied to the kit roles; the same task text for every
   variant. Within each repeat, the variants of one task and model run side by
   side, so they share the same load and time of day.
5. **Repeats.** At least two repeats per cell when a decision depends on the
   result; single runs vary by up to about 60% in time and 40% in input.
   A difference smaller than the spread between repeats is not a result.
6. **Nothing leaves the machine.** Results stay in `evaluation/runs/` (ignored by
   git). Suites for private projects stay in `evaluation/suites/` (ignored by git).

## Run

```sh
evaluation/bench/bench.sh <suite-dir> <label> nokit <prev>=<commit> <new>=<commit>
# REPEATS=2 PARALLEL=4 MODELS="opus sol" ...
# DRY=1 sets up and cleans up every cell without starting agents.
```

The run directory `evaluation/runs/<date>-<label>/` gets:

- `COMPARISON.md` — the conclusion table, also printed at the end of the run;
- `METRICS.md` — every metric for every variant;
- `metrics.json` — full data per cell, per agent, and per tool;
- `cells/<task>-<variant>-<model>-r<n>/` — logs, Claude transcripts or Codex
  rollouts, the quality check, what the agent committed, and the diff.

Each cell leaves its result on a branch `bench/<run>/<cell>` in the target
repository (a local push from the cell's repository).

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
- kit files read;
- the suite's quality fields, plus commits made and files left uncommitted.

Claude numbers come from the session transcripts. Codex numbers come from the
rollout files; Codex does not report cache writes.

## The conclusion

For each task and model, one table:

| Metric | No kit | previous | new | previous vs no kit | new vs no kit | new vs previous |
| --- | --- | --- | --- | --- | --- | --- |

Changes are percentages; within ±5% is "no change"; several repeats show the mean
and the range. Under each table, one line per comparison says better, worse, or no
change, and why; then an overall verdict, including what the run did not test.

## Suites

A suite directory holds:

- `suite.env` with `REPO`, `BASE`, `TASKS=(…)`, optional `BASE_<task>` for a task
  with its own base commit, and optional `BENCH_MAXTURNS`;
- `setup.sh`, run inside each fresh checkout (for example, to provide
  dependencies);
- `tasks/<task>.txt`, the prompt, where `{BRANCH}` becomes the cell's branch;
- `checks/<task>.sh`, run inside the finished checkout, which prints one JSON object
  of quality fields. Hidden acceptance tests stay in the suite and are copied into
  the checkout only by the check, after the agent has finished.
