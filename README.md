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
ready together go to one review run. The reviewer reads the whole diff. Real
findings go to the same worker, and the same reviewer checks the fixes and what
they touch; a second round is normal, and the same finding twice without
progress stops the loop for the cooperator's decision. A small local change with
a clear contract and passing checks may be accepted on the cooperator's own
reading of the diff. A review that the project, the user, or the task requires
always runs. With `reviewBlock` off, the cooperator accepts a light worker's
block on its checks and its own reading of the whole diff. If Sol is
unavailable, the fallback review is marked as such. The report has one line per
reviewed block: `REVIEW: rounds=<n> findings=<n> real=<n>`.

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
without it, use Standard and say so. Codex runs go through the bundled
`codex-run.mjs` wrapper. The kit is opt-in: an ordinary session spawns nothing.
Policy 1.9.0 keeps the models and prices of the previous release.
Details: [docs/claude-code.md](docs/claude-code.md).

## Codex

| Role | Standard | Enhanced | Economy (default) |
| --- | --- | --- | --- |
| Cooperator (your session) | GPT-6.1 Sol high | GPT-6 Astra high | GPT-6.1 Sol high |
| Probe | Luna medium, Sol for judgment | same | same |
| Worker | Sol xhigh | Sol xhigh | Luna xhigh |
| Worker ladder | Sol → Astra | Sol → Astra | Luna → Sol → Astra |
| Audit lens (on demand) | Luna xhigh | same | same |
| Block review | Sol xhigh | same | same |
| Stage acceptance | Astra high | same | same |

Worker budgets per block: Luna 600 tool calls per run, 3 attempts, 400k tokens;
Sol 3 attempts, 500k tokens; Astra 3 attempts, then the cooperator re-plans or
asks you. Economy is the default. Native launch layers:
`codex -p workforce-economy`, `workforce-standard`, and `workforce-enhanced`.
A prompt never changes the running model. Policy 1.11.0 keeps the models and
prices of the previous release. Details: [docs/profiles.md](docs/profiles.md).

## What gets installed

| | Claude Code (`~/.claude`) | Codex (`~/.codex`) |
| --- | --- | --- |
| Roles | `agents/workforce-{worker,worker-lite,probe,auditor,reviewer}.md` | `agents/workforce_{worker,probe,auditor,reviewer}.toml` |
| Skills | `skills/workforce-*/` | `skills/workforce-*/`, linked into `~/.agents/skills` |
| Launch layers | none | `workforce-{standard,enhanced,economy}.config.toml` |
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
