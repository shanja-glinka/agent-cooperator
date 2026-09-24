# Codex Workforce and Claude Workforce

**Complete work blocks. Reviews when the work is ready. Scope that stays put.**

[Русский](README.ru.md) · [Profiles and workflow](docs/profiles.md) · [Claude Code edition](docs/claude-code.md) · [Research](docs/research.md) · [Installer contract](docs/installation.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md)

A small, inspectable set of agents and skills for agentic development, shipped for
two runtimes from one package and one installer:

- **Codex Workforce** combines **GPT-6 Astra** with **GPT-5.6 Terra**. Astra orchestrates
  and accepts the result; GPT-5.6 Terra does the bulk of implementation.
- **Claude Workforce** applies the same roles to **Claude Code**: an `opus` brain,
  `sonnet` workers, `haiku` probes, `opus` reviewers, `fable` as a reserve tier.

Both editions share one workflow: the orchestrator reads the repository's own rules
first, briefs workers with complete owned blocks and a locked scope, reuses the same
worker and reviewer for correction rounds, reviews only finished blocks, and hands
findings outside the reported scope to the user as follow-ups instead of new work.
Choose Standard for a sufficiently described solution, or Enhanced when the solution
itself still needs to be found.

No API proxy, background service, GSD dependency, or new task management engine.
This is an instruction pack with a Node.js installer, not a guarantee of model
behavior or lower cost. Independent community project; not affiliated with OpenAI
or Anthropic.

## Install

Requires Node.js 22+, npm, and Git. The package runs directly from GitHub; an npm
registry publication is not required. It ships two binaries.

```sh
# Codex (default binary, same name as the package)
npx --yes github:shanja-glinka/codex-workforce install
npx --yes github:shanja-glinka/codex-workforce update
npx --yes github:shanja-glinka/codex-workforce status
npx --yes github:shanja-glinka/codex-workforce uninstall

# Claude Code (second binary, selected with -p)
npx --yes -p github:shanja-glinka/codex-workforce claude-workforce install
npx --yes -p github:shanja-glinka/codex-workforce claude-workforce update
npx --yes -p github:shanja-glinka/codex-workforce claude-workforce status
npx --yes -p github:shanja-glinka/codex-workforce claude-workforce uninstall
```

`update` replaces the kit's previous files and removes stale owned files; `status`
reports drift; `uninstall` removes only what the kit owns. For a reproducible
version, replace the package spec with `github:shanja-glinka/codex-workforce#v1.1.0`
or a reviewed commit SHA. `npx --yes` accepts npm's download prompt; it does not
answer the agent's Standard/Enhanced question or grant publishing rights. Start a
fresh Codex or Claude Code session after installing or updating. Both kits can live
on one machine; each owns its own files, state directory, and instruction markers.

Options shared by both binaries: `--dry-run`, `--force` (back up and replace edited
owned files), `--json`. Codex: `--codex-home PATH` (precedence: option, `CODEX_HOME`,
`~/.codex`) and `--skills-dir PATH` for the `~/.agents/skills` discovery links.
Claude Code: `--claude-home PATH` (precedence: option, `CLAUDE_CONFIG_DIR`,
`~/.claude`); skills are discovered inside that directory, so there is no
`--skills-dir`. The installer never touches `config.toml`, `settings.json`, model
defaults, or permissions.

## Codex edition

Roles `workforce_probe`, `workforce_worker`, `workforce_reviewer` (model-neutral
TOML), five skills, two optional native launch layers, and a managed block in the
effective global `AGENTS.md`:

```sh
codex -p workforce-standard
codex -p workforce-enhanced
```

| Responsibility | Standard | Enhanced |
| --- | --- | --- |
| Orchestrator | Astra low | Astra high |
| Bounded research | GPT-5.6 Terra medium | GPT-5.6 Terra medium |
| Main implementation | GPT-5.6 Terra high | GPT-5.6 Terra high |
| Unresolved design/algorithm | Targeted Astra assistance as needed | Bounded Astra high work |
| Completed block review | GPT-5.6 Terra high | GPT-5.6 Terra high |
| Major stage acceptance | Astra high | Astra high |

Concrete tasks proceed without a profile question. Autonomous instructions let the
agent choose; existing choices and standing preferences are reused. The question is
reserved for long-running, multi-stage work with substantial unresolved design where
the choice matters and has not been delegated. You can still write **"Use
Enhanced"**; workers inherit the resolved choice. See [selection rules](docs/profiles.md).

The presets are optional starting points; custom setups are allowed even after
choosing a profile. Only separately explicit model, effort, and budget constraints
make exact settings mandatory. **Instructions cannot change the already running
orchestrator's model.** Set Astra and the effort in your client; the agent must
disclose a mismatch instead of pretending it changed settings.

## Claude Code edition

Subagents `workforce-worker`, `workforce-probe`, `workforce-reviewer` (Markdown
roles with `model: inherit`, `effort`, `maxTurns`, no child spawning), the
`/workforce-orchestrate` skill with dispatch and tool references, worker, probe,
review, and smoke skills, a routing policy, and a managed block in the user
`CLAUDE.md`. See the [Claude Code edition](docs/claude-code.md).

The kit is opt-in. Ordinary sessions spawn nothing; it runs only on
`/workforce-orchestrate`, an explicit request for Workforce, subagents, or
multi-agent work, or a project instruction file that requires it. Inside the kit,
work is classified first: `direct` is done inline with no agents, `build` gets one
worker and one review of the finished diff, `pipeline` gets a plan, parallel
workers with disjoint write sets, block reviews, and a stage review.

| Responsibility | Standard | Enhanced |
| --- | --- | --- |
| Brain (your session) | `opus` medium | `opus` high |
| Bounded research | `haiku` medium | `sonnet` medium |
| Implementation | `sonnet` high | `sonnet` high, `opus` for non-trivial blocks |
| Unresolved design | targeted `opus` high | bounded `fable` high (fallback `opus` xhigh) |
| Block review | `opus` high | `opus` high |
| Stage acceptance | `opus` high | `fable` high (fallback `opus` xhigh) |

Aliases currently resolve to Fable 5.1, Opus 5.5, Sonnet 5, and Haiku 4.5 on the
Claude API (checked 2026-09-24; see `docs/claude-code.md`). Every Agent call sets
`model` explicitly; effort comes from role frontmatter or the session, and note
that Opus 5.5 defaults to `medium` effort. Correction rounds continue the same worker and reviewer with SendMessage;
a fresh agent is for independence, a different tier, or a polluted context.

## How work flows (both editions)

1. Read the repository's own rules (`AGENTS.md`, `CLAUDE.md`, `.claude/rules/`,
   `CONTRIBUTING.md`) and pass them to every child as PROJECT_RULES; they override
   the kit.
2. Resolve the profile once for the task; classify the work before spawning anyone.
3. Agree the actual outcome and a concrete acceptance example. "Analyze" stays analysis.
4. Assign complete blocks with clear ownership, exact sources, a locked SCOPE and
   OUT_OF_SCOPE. Design decisions are made before the brief, not delegated inside it.
5. Workers implement, connect consumers, self-review their whole result, and list
   out-of-scope observations as follow-ups instead of implementing them.
6. Independently review each completed substantial block on its diff. Findings are
   tagged in-scope, follow-up, or behavior-change; only in-scope findings go back to
   the same worker, and rejecting previously accepted input needs the user's decision.
7. A separate reviewer accepts a major stage against the original outcome and the
   required package gates. Nothing is done until proven end to end.

No permanent auditor per worker. No mandatory fan-out for tiny edits. No new reviewer
after every correction. An inventory, a generated shell, or a green typecheck is not
a completed migration. Changelog lines describe user-observable behavior only.

## What gets installed

| | Codex (`CODEX_HOME`, default `~/.codex`) | Claude Code (`~/.claude`) |
| --- | --- | --- |
| Roles | `agents/workforce_*.toml` | `agents/workforce-*.md` |
| Skills | `skills/workforce-*/` linked into `~/.agents/skills` | `skills/workforce-*/` |
| Launch layers | `workforce-standard.config.toml`, `workforce-enhanced.config.toml` | none |
| Policy and manifest | `codex-workforce/profiles.json`, `manifest.json` | `claude-workforce/profiles.json`, `manifest.json` |
| Instructions | marked block in `AGENTS.md` (or active `AGENTS.override.md`) | marked block in `CLAUDE.md` |

Existing project-local agents, skills, and instruction files may take precedence;
see [installation details](docs/installation.md).

## Develop

```sh
git clone https://github.com/shanja-glinka/codex-workforce.git
cd codex-workforce
npm test
node bin/codex-workforce.js --help
node bin/claude-workforce.js --help
```

Payloads live in `payload/codex` and `payload/claude`; `lib/targets.js` describes
each runtime and `lib/installer.js` serves both. Tests use disposable homes and do
not invoke paid models or mutate your actual installations. The Claude edition was
also exercised behaviorally on a fixture repository; the runs are documented in
[docs/claude-code.md](docs/claude-code.md). See [contributing](CONTRIBUTING.md).

## License

[MIT](LICENSE). Contributions and reproducible bug reports are welcome.
