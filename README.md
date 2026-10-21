# Agent Cooperator

**The session decides, briefs, and accepts. Light models read and type at xhigh effort. Hard blocks climb a ladder with a handoff.**

[Русский](README.ru.md) · [Profiles and workflow](docs/profiles.md) · [Claude Code edition](docs/claude-code.md) · [Research](docs/research.md) · [Installer contract](docs/installation.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md)

Agent Cooperator is a small, inspectable set of roles, skills, and routing
profiles for agentic development in **Claude Code** and **Codex**, shipped as
one package with one installer.

The user-facing session is the **cooperator**. It is the brain and the
integrator: it reads the repository's rules, looks only as far as the brief
needs, and decides. It does the direct work itself. Any other verifiable block
goes to a light worker at xhigh effort with a brief (goal, boundaries, sources,
checks, traps). The cooperator judges what comes back, integrates it, re-plans
when a block is harder than it looked, and accepts. Light models do the reading
and the typing; the cooperator thinks and does not forward results.

No API proxy, background service, or task-management engine: an instruction
pack with a Node.js installer. Routing and token budgets are instruction policy,
not runtime enforcement; model behavior and cost savings are not guaranteed.
Independent community project; not affiliated with Anthropic or OpenAI.

## Measured: with and without the kit

Four tasks in one private TypeScript project (a Telegram bot), three runs per
task and model, each in its own clean checkout: the same task text and the same
model, once with the kit (1.4.1, default profiles: Claude Code Hybrid with an
Opus cooperator, Codex Economy with a Sol cooperator) and once without it. Price
is at API list prices; for Codex it is the lower bound. One run without the kit
found its whole prompt already cached by an earlier session: the part beyond the
prefix every run shares is priced as a cache write, as if that session had not
run. A run met the contract when the task's own checks passed and, on the
large task, a hidden test confirmed that the defensive checks on database and
JSON data were kept.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/suite-dark.svg">
  <img alt="All four tasks: with Opus, $5.93 and 9 of 12 runs that met the contract without the kit against $4.85 and 12 of 12 with it; with Sol, $1.59 and 12 of 12 without the kit against $2.68 and 12 of 12 with it. Wall time is longer with the kit." src="docs/images/suite-light.svg">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/tasks-dark.svg">
  <img alt="Per task: price, wall time, and runs that met the contract, without and with the kit, for eight task and model pairs; the values are in the table below." src="docs/images/tasks-light.svg">
</picture>

| Task · model | Without the kit | With the kit |
| --- | --- | --- |
| Small fix · Opus | $0.69 · 4:23 · 3 of 3 | $1.01 · 7:55 · 3 of 3 |
| Small fix · Sol | $0.39* · 3:57* · 3 of 3 | $0.60 · 9:00 · 3 of 3 |
| Large cleanup · Opus | $4.43 · 12:24 · 0 of 3 | $2.96 · 22:53 · 3 of 3 |
| Large cleanup · Sol | $0.74* · 7:35* · 3 of 3 | $1.08 · 17:34 · 3 of 3 |
| Unknown bug · Opus | $0.43 · 2:29 · 3 of 3 | $0.45 · 2:01 · 3 of 3 |
| Unknown bug · Sol | $0.21 · 2:13 · 3 of 3 | $0.52 · 7:32 · 3 of 3 |
| Patch review · Opus | $0.38 · 2:26 · 3 of 3 | $0.43 · 1:54 · 3 of 3 |
| Patch review · Sol | $0.26* · 3:00* · 3 of 3 | $0.49 · 5:28 · 3 of 3 |
| **All four · Opus** | $5.93 · 21.7 min · 9 of 12 | $4.85 · 34.7 min · 12 of 12 |
| **All four · Sol** | $1.59* · 16.7 min* · 12 of 12 | $2.68 · 39.6 min · 12 of 12 |

Each cell: mean price · mean wall time · runs that met the contract. \* Actual
spend: those runs without the kit shared `/tmp` with other runs, so they are not
a clean comparison.

- **Claude Code.** On the large task the kit costs 33% less ($2.96 against
  $4.43) and keeps the required behavior in 3 runs of 3, where Opus alone kept
  it in none. Over all four tasks it costs 18% less and meets the contract in 12
  runs of 12 against 9. It takes about 1.6 times as long, and a small task costs
  more through a worker and a review than in the session.
- **Codex.** GPT-6.1 Sol alone is cheap on these tasks and met every contract;
  with the kit it meets the same contracts at about 1.7 times the price and 2.4
  times the time.
- **Against the previous kit version (1.4.0)** on the same tasks, 1.4.1 met the
  contract, by the checks above, in 24 runs of 24 instead of 23. It was cheaper on both lines (Opus
  −6%, Sol −5%) and faster (−14% and −26%).
- One project, four tasks, three runs per cell: an indication, not a guarantee.
  Method: [benchmark](evaluation/BENCHMARK.md); history: [research](docs/research.md).
  Regenerate the charts with `node docs/images/charts.mjs`. The data and a
  command that recomputes it: [Check it yourself](#check-it-yourself).

## Check it yourself

### Recompute these numbers

The data behind the charts is in [`evaluation/evidence/`](evaluation/evidence/).
It holds every cell's metrics and the token counts of every model request. The
project itself is left out: no code, task texts, transcripts, file names, paths,
or commits. The evidence lives in the repository only and is not part of the
npm package that `npx` installs.

One command recomputes every price from the token counts at the list prices in
[`prices.mjs`](evaluation/bench/prices.mjs), checks the sums per agent and per
run, and rebuilds the comparison tables byte for byte:

```sh
git clone https://github.com/shanja-glinka/agent-cooperator.git
cd agent-cooperator
node evaluation/bench/verify-evidence.mjs evaluation/evidence/2026-10-20-v9
```

It checks the arithmetic and the tables. The contract verdicts come from hidden
tests of the private project, and those are not published.

### Measure your own project

`evaluation/bench/bench.sh` runs each task in a fresh checkout of your
repository, once per model, variant, and repeat, and writes the comparison.

You need macOS (the scripts use zsh and BSD tools), Node.js 22+, Git, and
signed-in Claude Code and Codex CLIs. Every cell runs real models, so the runs
cost what your account pays for them.

1. Make a suite directory. Keep it outside this repository if your project is
   private.
   - `suite.env`: `REPO=<your repository>`, `BASE=<commit>`,
     `TASKS=(<task> ...)`, `CLAUDE_CODE_VERSION=<x.y.z>`, `CODEX_VERSION=<x.y.z>`.
   - `setup.sh`: installs the project's dependencies in a fresh checkout.
   - `tasks/<task>.txt`: the prompt, the same for every variant. `{BRANCH}`
     becomes the cell's branch.
   - `checks/<task>.sh`: runs in the finished checkout and prints one JSON object
     of quality fields, with `"Решено": "да"` when the task is solved.
2. Run the kit against the same models without it:

   ```sh
   REPEATS=3 PARALLEL=4 MODELS="opus sol" \
     evaluation/bench/bench.sh <suite-dir> <label> nokit kit=<kit commit>
   ```

3. Read `evaluation/runs/<date>-<label>/COMPARISON.md`; `METRICS.md` and
   `metrics.json` hold every metric. To publish a run without your data, run
   `EVIDENCE_PRIVATE='<names to keep out>' node evaluation/bench/evidence.mjs <run-dir> <out-dir>`.
   It refuses to write if any of those names, your home path, or your commits
   would be published.

Details: [benchmark method](evaluation/BENCHMARK.md).

## Install

Requires Node.js 22+, npm, and Git. The package runs directly from GitHub.

```sh
npx --yes github:shanja-glinka/agent-cooperator claude install
npx --yes github:shanja-glinka/agent-cooperator codex install
```

The same commands take `update`, `status`, and `uninstall`. `update` replaces
the kit's files and removes stale ones, `status` reports drift, `uninstall`
removes only what the kit owns. Pin a version with
`github:shanja-glinka/agent-cooperator#<tag>` or a reviewed commit SHA. Start a
fresh session after installing or updating.

Options: `--dry-run`, `--force` (back up and replace edited owned files),
`--json`, and `--set KEY=on|off` (install policy: `reviewBlock` and
`reviewStage`, both on by default; see [installation](docs/installation.md)).
Claude Code: `--claude-home PATH` (option, then `CLAUDE_CONFIG_DIR`,
then `~/.claude`). Codex: `--codex-home PATH` (option, then `CODEX_HOME`, then
`~/.codex`) and `--skills-dir PATH`. The installer never touches
`settings.json`, `config.toml`, model defaults, or permissions. The older
commands `claude-workforce` and `codex-workforce` still work.

## How work flows

```text
Task
  │
  ▼
Cooperator: read the repository's rules, look as far as the brief needs
  direct   → a question, analysis, config or doc edit, a few known lines:
             it does the work, no agents
  build    → one worker block: a fix, a feature, a bug with an unknown cause
  pipeline → blocks with disjoint write sets, run in parallel
  │
  ▼
per block:
  probe (when a fact is missing) → worker → submitted
  worker stuck (3 attempts without a result, or its volume spent)
     → HANDOFF → cooperator finds the cause and decides the approach
     → next tier starts fresh with packet + APPROACH + HANDOFF only
  submitted, then the cooperator chooses:
     a) review this block                → one review run for blocks ready
                                           together
     b) small local change, clear contract, checks passed
                                         → accept on its own reading
     c) next block to the worker         → review runs in parallel
  review → real findings → same worker → same reviewer checks the fixes
  audit lens (on demand): only for an area the checks and review miss
  │
  ▼
stage acceptance (pipeline) → required checks passed → report
```

**Choosing the next move.** At every decision the cooperator compares doing a
step itself with the whole route a brief sets off: its own turns to brief,
wait, and accept (each one rereads its whole context), the worker, the review
of its result, and the fix rounds. The user's limits, permissions, and required
project rules come first. The cooperator does by itself only work whose whole
route would cost more than doing it: a question, an analysis, a config or doc edit,
or a few lines it already knows exactly. Any other verifiable block goes to a
light worker, and parts with disjoint write sets run in parallel. The brief
gives the goal, the boundaries, the sources, the check, and the project's
constraints (CI steps, lint and size rules, frozen areas), each with the file
that sets it. It does not hand over the solution or add requirements the
project does not have. An unknown cause is a good block. The cooperator keeps
an OPEN list (the outcome, required checks, accepted findings); an item closes
only with evidence, never because work changed hands or a round limit was
reached.

**Review.** With the default policy (`reviewBlock` on), every block a light
worker submits is reviewed before it is accepted. The reviewer is GPT-6.1 Sol at
xhigh in the Codex presets and in Claude Hybrid (through the Codex CLI from
Claude Code), or opus at high in Claude Standard and Enhanced. Blocks that are
ready together go to one review run. The reviewer reads the whole diff and
checks it against CONTRACT (what the change must keep, quoted from the task or
the project's rules with its source): every changed protective site (a removed
or changed condition, a changed fallback, a normalization) gets a verdict of
kept, violated, or not established. Real
findings go to the same worker, and the same reviewer checks the fixes and what
they touch; a second round is normal, and the same finding twice without
progress stops the loop for the cooperator's decision. A small local change with
a clear contract and passing checks may be accepted on the cooperator's own
reading of the diff. A review that the project, the user, or the task requires
always runs. With `reviewBlock` off, the cooperator accepts a light worker's
block on its checks and its own reading of the whole diff. If Sol is
unavailable, the fallback review is marked as such. The report has one line per
reviewed block: `REVIEW: block=<label> rounds=<n> findings=<n> real=<n>
sites=<n> open=<n>`; the reviewer writes it and the cooperator adds `real`. A
review may end with `ACCEPTANCE: accepted_if <check> on tree:<hash>`; the
cooperator closes it with `scripts/accept.mjs` when a recorded run of that check
passed on the reviewed tree, without another reviewer call.

**Audit lenses on demand.** Audit lenses do not run by default. A lens (docs,
task, or conventions) reads a block only for an area that the checks and the
review do not cover. It reports everything; the cooperator takes only real
findings (in the diff, breaking a quoted rule or document line, reproducible) to
the same worker. A lens with nothing real is retired for that block; one with
real findings may check the fix.

**Worker ladder.** Each worker tier gets three attempts and a volume (tool
calls, tokens) per block. Only a run that ends without a result spends an
attempt: the worker hit its limit, handed off, or its fix left the finding
open; a submitted block or a fix that lands spends none. A worker that runs out
returns a HANDOFF (done, where it stopped, what it tried, what is open, what it
would do next). The cooperator reads it, finds the cause, decides whether to
continue the same path with more effort, take another route, or split and
re-scope the block, and gives the next tier a fresh packet with that APPROACH
and the HANDOFF. Earlier reports, review rounds, and transcripts stay with the
cooperator.

**While agents work.** The cooperator waits for their results: no polling,
sleeping, or scheduled wake-ups, because each of its turns rereads its context.
Workers send their packet, a blocker, or a contract question, not progress
messages.

## Claude Code

| Role | Standard | Enhanced | Hybrid (default) |
| --- | --- | --- | --- |
| Cooperator (your session) | `opus` medium | `opus` high | `opus` high |
| Probe | `haiku`, `sonnet` for judgment | `sonnet` | `haiku` |
| Worker | `sonnet` high | `sonnet`, `opus` for non-trivial blocks | `haiku` xhigh |
| Worker ladder | `sonnet` → `opus` | `sonnet` → `opus` | `haiku` → Codex GPT-6.1 Sol xhigh → `opus` |
| Audit lens (on demand) | `haiku` xhigh | `haiku` xhigh | Codex GPT-6 Luna xhigh |
| Block review | `opus` high | `opus` high | Codex GPT-6.1 Sol xhigh |
| Stage acceptance | `opus` high | `fable` high (fallback `opus` high) | Codex GPT-6.1 Sol xhigh |

Worker budgets per block: `haiku` 120 tool calls per run and 360 per block,
3 attempts, 400k tokens; `sonnet` and Codex Sol 3 attempts, 500k tokens; `opus`
3 attempts, then the cooperator re-plans or asks you. Native turn limits are
separate from tool-call budgets. Alias resolutions dated 2026-10-20 are recorded
in `profiles.json`; actual availability and routing depend on the runtime and
account. Hybrid is the default. It needs the `codex` CLI on PATH and logged in;
without it, Hybrid keeps `haiku` workers and runs the reviews on `opus` high
through Agent, marked as the fallback. Standard and Enhanced run only when you
choose them, never as an automatic replacement for Hybrid. Codex runs go through the bundled
`codex-run.mjs` wrapper. The kit is opt-in: an ordinary session spawns nothing.
Claude policy 1.10.0 is the current routing policy.
Details: [docs/claude-code.md](docs/claude-code.md).

## Codex

| Role | Economy (default) | Standard |
| --- | --- | --- |
| Cooperator (your session) | GPT-6.1 Sol high | GPT-6.1 Sol high |
| Probe | Luna medium, Sol for judgment | same |
| Worker | Luna xhigh | Sol xhigh |
| Worker ladder | Luna → Sol | Sol |
| Audit lens (on demand) | Luna xhigh | same |
| Block review | Sol xhigh | same |
| Stage acceptance | Sol xhigh, only for an integration part no block review covered | same |

Worker budgets per block: Luna 600 tool calls per run, 1800 per block, 3 attempts,
400k tokens, then Sol xhigh; Sol 3 attempts, 500k tokens, then the cooperator
re-plans or asks you. Economy is the default. Enhanced was removed in policy 1.12.0;
a stored or launched choice of it runs as Standard. Native launch layers:
`codex -p workforce-economy` and `workforce-standard`. Both set the agent wait: a
wait returns as soon as an agent sends a message or finishes, and otherwise lasts 20
minutes. A prompt never changes the running model. No profile uses GPT-6 Astra.
Details: [docs/profiles.md](docs/profiles.md).

## What gets installed

| | Claude Code (`~/.claude`) | Codex (`~/.codex`) |
| --- | --- | --- |
| Roles | `agents/workforce-{worker,worker-lite,probe,auditor,reviewer}.md` | `agents/workforce_{worker,probe,auditor,reviewer}.toml` |
| Skills | `skills/workforce-*/` | `skills/workforce-*/`, linked into `~/.agents/skills` |
| Launch layers | none | `workforce-{standard,economy}.config.toml` |
| Policy and manifest | `claude-workforce/profiles.json`, `manifest.json` | `codex-workforce/profiles.json`, `manifest.json` |
| Instructions | marked block in `CLAUDE.md` | marked block in `AGENTS.md` (or `AGENTS.override.md`) |

Role, state, and marker names keep their `workforce` prefix so existing
installations update in place. Project-local agents, skills, and instruction
files may take precedence; see [installation details](docs/installation.md).

## Develop

```sh
git clone https://github.com/shanja-glinka/agent-cooperator.git
cd agent-cooperator
npm test
node bin/agent-cooperator.js claude --help
```

Payloads live in `payload/claude` and `payload/codex`; `lib/targets.js`
describes each runtime and `lib/installer.js` serves both. Tests use
disposable homes and never call paid models. See [contributing](CONTRIBUTING.md).

## License

[MIT](LICENSE).
