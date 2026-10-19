# Agent Cooperator

**The session is the brain. Agents do the work. Hard blocks climb a ladder with a handoff.**

[Русский](README.ru.md) · [Profiles and workflow](docs/profiles.md) · [Claude Code edition](docs/claude-code.md) · [Research](docs/research.md) · [Installer contract](docs/installation.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md)

Agent Cooperator is a small, inspectable set of roles, skills, and routing
profiles for agentic development in **Claude Code** and **Codex**, shipped as
one package with one installer.

The user-facing session is the **cooperator**: it reads the repository's rules,
plans, briefs workers, judges what comes back, re-plans when a block is harder
than it looked, and accepts. Agents implement, look things up, audit, and
review. The cooperator is meant to think, not to forward results.

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
`--json`. Claude Code: `--claude-home PATH` (option, then `CLAUDE_CONFIG_DIR`,
then `~/.claude`). Codex: `--codex-home PATH` (option, then `CODEX_HOME`, then
`~/.codex`) and `--skills-dir PATH`. The installer never touches
`settings.json`, `config.toml`, model defaults, or permissions. The older
commands `claude-workforce` and `codex-workforce` still work.

## How work flows

```text
Task
  │
  ▼
Cooperator: read the repository's rules, classify, pick a profile
  direct   → it does the work itself, no agents
  build    → one block
  pipeline → a plan of blocks with disjoint write sets
  │
  ▼
per block:
  probe (when a fact is missing) → worker → submitted
  worker stuck (3 attempts without a result, or its volume spent)
     → HANDOFF → cooperator finds the cause and decides the approach
     → next tier starts fresh with packet + APPROACH + HANDOFF only
  after submission the cooperator chooses:
     a) audit this block             → auditors, up to 3 rounds
     b) no audit                     → next work to the worker
     c) next block to the worker     → and auditors in parallel on 1..N blocks
  review (whole diff + audit log) → real findings → the same worker
  │
  ▼
stage acceptance (pipeline) → required checks passed → report
```

**Choosing the next move.** At every decision the cooperator takes the move
that gets the task to a verified, delivered result at the lowest total cost,
counting every agent, check, and redo it sets off. The user's limits,
permissions, and required project rules come first. It keeps an OPEN list (the
outcome, required checks, accepted findings); an item closes only with evidence,
never because work changed hands or a round limit was reached.

**Audit game.** Auditors on a cheap model at xhigh effort read a block
through one lens each: docs, task, conventions. They report everything; the
cooperator keeps only real findings (in the diff, breaking a quoted rule or
document line, reproducible). A lens with real findings wins the round and
plays again; a lens with nothing real loses and is retired for that block.
After round 3 the game ends, and real findings not yet fixed still go to the
worker.

**Worker ladder.** Each worker tier gets three attempts and a volume (tool
calls, tokens) per block. Only a run that ends without a result spends an
attempt: the worker hit its limit, handed off, or its fix left the finding
open; a submitted block or a fix that lands spends none. A worker that runs out
returns a HANDOFF (done, where it stopped, what it tried, what is open, what it
would do next). The cooperator reads it, finds the cause, decides whether to
continue the same path with more effort, take another route, or split and
re-scope the block, and gives the next tier a fresh packet with that APPROACH
and the HANDOFF. Earlier reports, audit rounds, and transcripts stay with the
cooperator.

## Claude Code

| Role | Standard | Enhanced | Hybrid |
| --- | --- | --- | --- |
| Cooperator (your session) | `opus` medium | `opus` high | `opus` high |
| Probe | `haiku`, `sonnet` for judgment | `sonnet` | `haiku` |
| Worker | `sonnet` high | `sonnet`, `opus` for non-trivial blocks | `haiku` high |
| Worker ladder | `sonnet` → `opus` | `sonnet` → `opus` | `haiku` → Codex GPT-6.1 Sol xhigh → `opus` |
| Auditor (up to 3 rounds) | `haiku` xhigh | `haiku` xhigh | Codex GPT-6 Luna xhigh |
| Block review | `opus` high | `opus` high | Codex GPT-6.1 Sol xhigh |
| Stage acceptance | `opus` high | `fable` high (fallback `opus` high) | Codex GPT-6.1 Sol xhigh |

Worker budgets per block: `haiku` 120 tool calls per run and 360 per block,
3 attempts, 400k tokens; `sonnet` and Codex Sol 3 attempts, 500k tokens; `opus`
3 attempts, then the cooperator re-plans or asks you. Native turn limits are separate from tool-call
budgets. Alias resolutions dated 2026-10-08 are recorded in `profiles.json`;
actual availability and routing depend on the runtime and account. Hybrid runs
only when you choose it and needs the `codex` CLI; Codex runs go through the
bundled `codex-run.mjs` wrapper. The kit is opt-in: an ordinary session spawns
nothing. Details: [docs/claude-code.md](docs/claude-code.md).

## Codex

| Role | Standard | Enhanced | Economy |
| --- | --- | --- | --- |
| Cooperator (your session) | GPT-6.1 Sol high | GPT-6 Astra high | GPT-6.1 Sol high |
| Probe | Luna medium, Sol for judgment | same | same |
| Worker | Sol xhigh | Sol xhigh | Luna xhigh |
| Worker ladder | Sol → Astra | Sol → Astra | Luna → Sol → Astra |
| Auditor (up to 3 rounds) | Luna xhigh | same | same |
| Block review | Sol high | same | same |
| Stage acceptance | Astra high | same | same |

Worker budgets per block: Luna 600 tool calls per run, 3 attempts, 400k tokens;
Sol 3 attempts, 500k tokens; Astra 3 attempts, then the cooperator re-plans or
asks you.
Native launch layers: `codex -p workforce-standard`, `workforce-enhanced`,
`workforce-economy`. Economy runs only when you choose it. A prompt never
changes the running model. Details: [docs/profiles.md](docs/profiles.md).

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
