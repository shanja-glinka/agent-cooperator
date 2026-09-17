# Codex Workforce

**Two hybrid profiles. Complete work blocks. Reviews when the work is ready.**

[Русский](README.ru.md) · [Profiles and workflow](docs/profiles.md) · [Claude Code edition](docs/claude-code.md) · [Research](docs/research.md) · [Installer contract](docs/installation.md) · [Contributing](CONTRIBUTING.md)

A small, inspectable set of agents and skills for agentic development, shipped for
two runtimes from one package:

- **Codex Workforce** combines **GPT-6 Astra** with **GPT-5.5**. Astra orchestrates
  and accepts the result; GPT-5.5 does the bulk of implementation.
- **Claude Workforce** applies the same roles to **Claude Code**: an `opus` brain,
  `sonnet` workers, `haiku` probes, `opus` reviewers, and `fable` as a reserve tier.
  See the [Claude Code edition](docs/claude-code.md).

Choose Standard for a sufficiently described solution, or Enhanced when the
solution itself still needs to be found.

No API proxy, background service, GSD dependency, or new task management engine.
This is an instruction pack with a Node.js installer, not a guarantee of model
behavior or lower cost. Independent community project; not affiliated with OpenAI.

## Install

Requires Node.js 22+ and npm, Git for the GitHub package spec, and a Codex runtime
with custom agents, explicit model/effort overrides, and access to both models.
The package runs directly from GitHub; an npm registry publication is not required.

```sh
# Codex
npx --yes github:shanja-glinka/codex-workforce install

# Claude Code (second binary of the same package)
npx --yes -p github:shanja-glinka/codex-workforce claude-workforce install
```

The current release also installs optional native launch shortcuts:

```sh
codex -p workforce-standard
codex -p workforce-enhanced
```

These explicitly choose a profile and set the root model/effort for that launch.

Restart Codex or start a fresh session to load the new global instructions and roles.
Concrete tasks proceed without a profile question. Autonomous instructions let the
agent choose; existing choices and standing preferences are reused. The question is
reserved for long-running, multi-stage work with substantial unresolved design where
the choice matters and has not been delegated. See [selection rules](docs/profiles.md).
You can still write **“Use Enhanced”**; workers inherit the resolved choice.

```sh
# Replace the kit's previous version, removing stale owned files
npx --yes github:shanja-glinka/codex-workforce update

# Inspect the installed files and discovery links
npx --yes github:shanja-glinka/codex-workforce status

# Remove this kit, preserving other agents, settings, and instructions
npx --yes github:shanja-glinka/codex-workforce uninstall
```

The same `update`, `status`, and `uninstall` commands exist for `claude-workforce`.
For a reproducible version, replace the package spec with
`github:shanja-glinka/codex-workforce#v1.1.0`. Use a newer tag when updating a pinned
installation. `npx --yes` accepts npm's download prompt; it does not answer the
agent's Standard/Enhanced question or grant publishing rights.

## Choose a profile

| Responsibility | Standard | Enhanced |
| --- | --- | --- |
| Orchestrator | Astra low | Astra high |
| Bounded research | GPT-5.5 medium | GPT-5.5 medium |
| Main implementation | GPT-5.5 high | GPT-5.5 high |
| Unresolved design/algorithm | Targeted Astra assistance as needed | Bounded Astra high work |
| Completed block review | GPT-5.5 xhigh | GPT-5.5 xhigh |
| Major stage acceptance | Astra high | Astra high |

The presets recommend both families. They are optional starting points; custom
setups and adaptations are allowed even after choosing a profile. Only separately
explicit model, effort, and budget constraints make exact settings mandatory.
Enhanced does not automatically move all work to Astra.
A fully specified difficult algorithm can stay with GPT-5.5. Astra xhigh/max is a
reasoned escalation for uncertainty, not an automatic choice for every long task.

The selected profile is a routing policy. **Instructions cannot change the already
running orchestrator's model.** Set Astra and the corresponding effort in your
client; the agent must disclose a mismatch instead of pretending it changed settings.
For any approach, including a user-selected profile, adapt to available settings and
continue; explicit strict model, effort, and budget requirements remain binding.
The installer does not overwrite your `config.toml`, model defaults, or permissions.

## How work flows

1. Choose a profile once for the task.
2. Agree the actual outcome and concrete acceptance example. “Analyze” stays analysis.
3. Assign complete blocks with clear ownership and exact sources.
4. Workers implement, connect consumers, and self-review their whole result.
5. Independently review each completed substantial block; return findings as one packet.
6. Astra checks the original outcome before closing a major stage.

No permanent auditor per worker. No mandatory fan-out for tiny edits. No new reviewer
after every correction. Repeat affected checks and review the correction's impact.
An inventory, a generated shell, or a green typecheck is not a completed migration.

## What gets installed

- Three model-neutral roles: `workforce_probe`, `workforce_worker`, `workforce_reviewer`.
- Five skills: orchestration, worker, probe, review, and optional live smoke.
- A marked instruction block in the effective global `AGENTS` file.
- Owned-file metadata for update, status, and removal.

Files live under `CODEX_HOME` (default `~/.codex`). Skills are linked into
`~/.agents/skills` for native discovery. Paths can be overridden for isolated profiles
and tests. Existing project-local agents/skills and global overrides may take
precedence; see [installation details](docs/installation.md).

## Claude Code edition

`claude-workforce` installs the Claude Code counterpart into `~/.claude` (or
`CLAUDE_CONFIG_DIR` / `--claude-home`): subagents `workforce-worker`,
`workforce-probe`, `workforce-reviewer`; the `/workforce-orchestrate` skill with its
dispatch and tool references; worker, probe, review, and smoke skills; a routing
policy; and a managed block in the user `CLAUDE.md`. Both kits can live in one
machine; each owns only its own files and markers. The kit is opt-in: ordinary
sessions spawn nothing; it runs only on `/workforce-orchestrate` or an explicit
request for Workforce, subagents, or multi-agent work.

The Claude workflow adds what the [research](docs/research.md) found in live
configurations: classify work as `direct` / `build` / `pipeline` before spawning
anything, keep the brain out of product code, set `model` on every Agent call, give
workers an explicit write set and turn budget, continue the same worker and
reviewer for fix rounds with SendMessage, and review only on finished boundaries.

| Responsibility | Standard | Enhanced |
| --- | --- | --- |
| Brain (your session) | `opus` medium | `opus` high |
| Bounded research | `haiku` medium | `sonnet` medium |
| Implementation | `sonnet` high | `sonnet` high, `opus` for non-trivial blocks |
| Unresolved design | targeted `opus` high | bounded `fable` high (fallback `opus` xhigh) |
| Block review | `opus` high | `opus` high |
| Stage acceptance | `opus` high | `fable` high (fallback `opus` xhigh) |

## Develop

```sh
git clone https://github.com/shanja-glinka/codex-workforce.git
cd codex-workforce
npm test
node bin/codex-workforce.js --help
```

Tests use disposable homes. They do not invoke paid models or mutate your actual
Codex installation. See [contributing](CONTRIBUTING.md) for the distinction between
installer tests, instruction cases, and live model verification.

## License

[MIT](LICENSE). Contributions and reproducible bug reports are welcome.
