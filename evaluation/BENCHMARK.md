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
   gaps afterwards. When the user decides so, a run measures only the new version
   on the full grid and takes the no-kit and previous-version cells from earlier
   runs of the same suite (`PREV_RUNS`); the comparison then names those runs, and
   their differences in day, conditions, and isolation are part of the result. A
   variant of the new version that changes one part (for example the review) may
   run on the tasks that part touches (`<name>=<commit>@task`); a variant that
   only switches an install policy carries it as `+key=value`
   (`v7nr=<commit>@big+reviewBlock=off,reviewStage=off`), and `policycheck.mjs`
   checks, before any cell runs, that every installed text of each variant
   delivers that policy.
3. **Nothing changes during a run.** Do not edit the kit while it is being
   measured. A fix makes a new version and a new run. A fix of the bench itself
   makes a new run of every variant, not only of the new version.
4. **A cell of its own, as far as the host allows.** Each cell has its own
   checkout, holding only the task's base commit and its history (no other
   branches, no remote, no results of other cells), its own CLI homes, and its own
   `/tmp`. Agents choose absolute paths such as `/tmp/ci.log` themselves, and on
   2026-10-19 and 2026-10-20 cells running side by side read each other's CI logs.
   From the v6 run on (2026-10-20) every zsh a cell's agents start reads `tmpjail/zshenv` first
   (`ZDOTDIR`): a command that names `/tmp` runs with those paths in the cell's
   temp dir, so the agent's command, its output, and its later reads agree and it
   gets no refusals; Claude Code's file tools go there through a PreToolUse hook
   (`tmpjail/hook.mjs`), programs through `TMPDIR`, which, like the macOS default,
   is reached through a symlink (`/tmp`), so tests that compare a temp path with
   its realpath behave as on the host; the user's zsh startup files still run. A path written inside a file the agent then runs is not moved: after
   its agent ends, a cell stops the processes it left (they carry its
   `BENCH_CELL` mark), and `tmpclean.mjs` finds and removes what still reached the
   host's `/tmp`; `isolation.mjs` counts only those names for a jailed cell.
   `selftest.sh` checks the jail and the CI check before every run. A comparison
   that involves a marked cell is not an effect of the kit.
5. **Same conditions.** The kit installed only into its cells; no user skills,
   agents, MCP servers (Claude Code runs with `--strict-mcp-config`, which also
   keeps out the account's claude.ai connectors), or private instruction files;
   the user's own `maxTurns` limits applied to the kit roles; the same task text
   and host for every variant. In a Claude cell the kit's instruction block goes
   into the system prompt, as a real install keeps it in the user's
   `~/.claude/CLAUDE.md`: in the checkout's `.claude/CLAUDE.md` it would count as
   the project's CLAUDE.md and stop Claude Code from loading the project's
   `AGENTS.md` (the v4 and v5 cells ran so). The skill gets the task as a file
   path, because Claude Code copies a skill's arguments into the skill text. A
   Claude cell has its own Codex home for the kit's Codex runs. The CLI versions
   named in the suite, run as fixed
   binaries with Claude Code's auto-update off, recorded in `versions.txt` and per
   cell in `provenance.json`.
6. **Repeats.** At least two repeats per cell when a decision depends on the
   result; single runs vary by up to about 60% in time and 40% in input.
   A difference smaller than the spread between repeats is not a result, and
   overlapping ranges do not prove two variants equal.
7. **Nothing leaves the machine.** Results stay in `evaluation/runs/` (ignored by
   git). Suites for private projects stay in `evaluation/suites/` (ignored by git).

## Run

```sh
evaluation/bench/bench.sh <suite-dir> <label> nokit <prev>=<commit> <new>=<commit>
# REPEATS=3 PARALLEL=4 MODELS="opus sol" ...
# DRY=1 sets up and removes every cell without starting agents.
# PREV_RUNS="<run dir>:nokit <run dir>:v5" bench.sh <suite-dir> <label> <new>=<commit> [<part>=<commit>@big]
#   runs only the new version (and a variant on the named tasks) and compares them with
#   those variants' cells of the earlier runs; PREV_RUN with PREV_VARIANTS names one run.
# CODEX_LAUNCH=workforce-economy: the Codex launch layer of kit cells (workforce-standard by default).
```

The run directory `evaluation/runs/<date>-<label>/` gets:

- `COMPARISON.md` — the conclusion table, also printed at the end of the run;
- `METRICS.md` — every metric for every variant;
- `metrics.json` — full data per cell, per agent, and per tool;
- `BASELINE.md`, `baseline.json` — the no-kit result per task and model: what
  the model did by itself, at what cost, and how it worked;
- `ROUTES.md` — whom each cooperator started, with which role and model, the
  reason it gave just before, what the agent returned, and the final report;
- `isolation.json` — per cell: clean, a file shared with a cell running at the
  same time, a read of another running cell's file, or a read of what an earlier
  cell left (`isolation.mjs`, from the command logs);
- `versions.txt` — the CLI binaries and versions the cells ran, and the Codex launch layer;
- `selftest.txt` — the bench's own checks before the run;
- `prev.txt` and `prev-metrics-<run>.json` — with `PREV_RUNS`: the earlier runs and
  their cells, recounted by the current `metrics.mjs` (the earlier runs' own files
  are not changed);
- `cells/<task>-<variant>-<model>-r<n>/` — logs, Claude transcripts or Codex
  rollouts, `timeline.md`, the quality check with a log per CI attempt
  (`check-logs/`), what the agent committed, `provenance.json` (base, checked
  head, CLI versions, the jail, how the kit was delivered), `tmp-cleaned.json`,
  `logs/tmp-rewrites.log` (commands the jail moved), and the diff.

Each cell leaves its result on a branch `bench/<run>/<cell>` in the target
repository (local; nothing is pushed elsewhere).

## Metrics

Per cell and per agent:

- wall time;
- number of agents;
- price at API list prices (`prices.mjs`), per request by its prompt's tier, in
  total and by role (cooperator, workers, auditors, reviewer); for Codex a low and
  a high value, because its logs report no cache writes and OpenAI bills them at
  1.25x input;
- turns per agent: its assignment and every message that continued it; fix
  rounds of the workers, and the auditors' and reviewer's turns;
- the cooperator's `REVIEW: rounds=<n> findings=<n> real=<n>` lines;
- tool calls (cooperator, agents, total);
- model requests;
- input without cache, cache writes, cache reads, total input, input per request;
- output and thinking tokens;
- handoffs;
- messages to and from agents;
- `sleep`/`wait_agent`;
- kit files read, and the kit text the cooperator received in characters: the
  skill Claude Code inserts into its context plus kit files it reads; for Codex
  the output of the cooperator's commands that read kit files (an upper bound when
  a command also read other files). The always-loaded instruction block is not
  counted;
- the suite's quality fields, plus commits made, files left uncommitted, and the
  cell's isolation.

Claude numbers come from the session transcripts (a fork's transcript repeats its
parent's messages; each counts once). Codex numbers come from the rollout files,
in a Claude cell from the kit's Codex runs.

## The conclusion

The no-kit cells are the factual result: what the model does by itself. A kit
version is judged by its difference from them, first in what was done, then in
cost.

For each task and model, one table:

| Metric | No kit | previous | new | previous vs no kit | new vs no kit | new vs previous |
| --- | --- | --- | --- | --- | --- | --- |

Changes are percentages; within ±5% is "no change"; several repeats show the mean
and the range. Values come from the cells with a clean isolation status; a group
without one is marked `*` as spend only, and its differences are not computed.
Under each table, one line per comparison says better, worse, or no change, and
why; then an overall verdict, including what the run did not test.

## Suites

A suite directory holds:

- `suite.env` with `REPO`, `BASE`, `TASKS=(…)`, optional `BASE_<task>` for a task
  with its own base commit, `BENCH_MAXTURNS`, the CLI versions
  (`CLAUDE_CODE_VERSION`, `CODEX_VERSION`), the signed-in Claude config dir
  (`BENCH_CLAUDE_CONFIG_DIR`; its login stays in the keychain, nothing to create)
  and the Codex `auth.json` (`BENCH_CODEX_AUTH`, linked so that a token refresh
  writes through to the same file);
- `setup.sh`, run in each fresh checkout to provide the project's dependencies;
- `tasks/<task>.txt`, the prompt, where `{BRANCH}` becomes the cell's branch;
- `checks/<task>.sh`, run inside the finished checkout, which prints one JSON object
  of quality fields. Hidden acceptance tests stay in the suite and enter the
  checkout only with the check, after the agent has finished.
