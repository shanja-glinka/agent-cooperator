# Claude Workforce: agentic development in Claude Code

This is the Claude Code edition of the kit. It installs three subagent roles, five
skills, a routing policy, and a managed block in the user `CLAUDE.md`. The workflow
is the same brain/worker pattern the [research](research.md) found in live public
configurations; the roles and skill names match the Codex edition so both can be
used side by side.

## Install

Requires Node.js 22+, npm, Git, and Claude Code with custom subagents, skills, and
the `model` field on Agent calls (any current release).

```sh
npx --yes -p github:shanja-glinka/codex-workforce claude-workforce install
npx --yes -p github:shanja-glinka/codex-workforce claude-workforce update
npx --yes -p github:shanja-glinka/codex-workforce claude-workforce status
npx --yes -p github:shanja-glinka/codex-workforce claude-workforce uninstall
```

`-p` selects the package; `claude-workforce` is its second binary. Pin a release
with `github:shanja-glinka/codex-workforce#v1.1.0`. Start a new Claude Code session
after installing or updating. Options: `--claude-home PATH` (precedence: option,
`CLAUDE_CONFIG_DIR`, `~/.claude`), `--dry-run`, `--force`, `--json`. There is no
`--skills-dir`: Claude Code discovers skills inside its home directory.

```text
~/.claude/
  agents/workforce-worker.md
  agents/workforce-probe.md
  agents/workforce-reviewer.md
  skills/workforce-orchestrate/SKILL.md          /workforce-orchestrate
  skills/workforce-orchestrate/references/dispatch.md
  skills/workforce-orchestrate/references/tools.md
  skills/workforce-worker/SKILL.md               preloaded into workforce-worker
  skills/workforce-probe/SKILL.md                preloaded into workforce-probe
  skills/workforce-review/SKILL.md               preloaded into workforce-reviewer
  skills/workforce-smoke/SKILL.md                /workforce-smoke (explicit only)
  claude-workforce/profiles.json
  claude-workforce/manifest.json
  CLAUDE.md                                      managed block between markers
```

The installer never touches `settings.json`, the session model, effort caps, or
permissions. Project-level `.claude/agents` and `.claude/skills` with the same names
take precedence over the user-level files, as in any Claude Code setup.

## Use

Start any implementation task normally, or explicitly:

```text
/workforce-orchestrate Migrate the resolver to the generated DTO and switch its consumers.
Use Enhanced. Resolve the ambiguous contract, then complete the migration.
Fix the described validation error.            (direct or build, no question)
Analyze these options only. Do not edit files. (analysis stays analysis)
```

The user-facing session is the brain. It classifies the work, resolves the profile,
writes briefs, spawns roles with an explicit model, integrates the diff, and accepts.

### Work classes

| Class | Looks like | What happens |
| --- | --- | --- |
| `direct` | question, status, analysis-only, config/doc edit, trivial or single-file fix | Done inline. No agents. |
| `build` | bug fix or ordinary feature with a known shape, roughly 1-5 files | One worker per complete block, independent review of the finished diff. |
| `pipeline` | multi-stage, cross-cutting, or design-open work | Plan, parallel workers with disjoint write sets, block review per block, stage review before closing. |

Classification comes first because it is the single largest lever on usage: the
public configurations that run well all refuse to run a pipeline on work that did
not need one.

### Profiles

Standard and Enhanced are optional starting recommendations, not binding schedules.
Selection is contextual: concrete work proceeds with Standard, autonomous or
unattended runs choose automatically, and a question is asked only for long
multi-stage work with substantial unresolved design where nothing already applies.

| Responsibility | Standard | Enhanced |
| --- | --- | --- |
| Brain (this session) | `opus` medium | `opus` high |
| Bounded research (`workforce-probe`) | `haiku` medium, `sonnet` when judgment is needed | `sonnet` medium |
| Implementation (`workforce-worker`) | `sonnet` high | `sonnet` high, `opus` for non-trivial blocks |
| Unresolved design or algorithm | targeted `opus` high | bounded `fable` high block (fallback `opus` xhigh) |
| Block review (`workforce-reviewer`, MODE=block) | `opus` high | `opus` high |
| Stage acceptance (`workforce-reviewer`, MODE=stage) | `opus` high | `fable` high (fallback `opus` xhigh) |

The session's own model is whatever the user selected; a prompt cannot change it.
If it differs from the preset, the brain says so once and continues. The role files
declare `model: inherit` so that the `model` passed on each Agent call is what runs.
`fable` is a reserve tier that needs a stated reason; when the account cannot use
it, the fallback is `opus` at `xhigh`.

### Rules that hold in every profile

- The brain does not write product code in `build` or `pipeline` work.
- Every Agent call sets `model` explicitly. Nothing relies on inheritance.
- A worker gets a complete packet: outcome, acceptance example, `NOT_DONE_IF`,
  exact inputs, `WRITE_SET`, `DO_NOT_TOUCH`, `CHECKS`. It edits only its write set.
- Fix rounds continue the same worker with SendMessage. Re-checks continue the same
  reviewer. A round costs the delta, not a cold start. Rounds 1-3 stay; from round 4
  or on a loop without new evidence, a fresh worker one tier up gets the bundle.
- A fresh agent is for independence (the reviewer is never the author; stage review
  is a separate agent), a different tier, or a polluted context.
- Review happens on finished boundaries: a substantial block, a refactor, security
  or money paths, performance-sensitive code. Not after every edit.
- Plans, briefs, decisions, and summaries live in files or git; context does not
  survive compaction.
- Budgets: at most three parallel workers, `maxTurns` 60/20/30 for
  worker/probe/reviewer. User limits override these.
- Nothing is done until it is proven end to end. Green tests are necessary, not
  sufficient. Failed, blocked, and not-run are not PASS.

### Roles

| Role | Model field | Tools | Turns | Preloaded skill |
| --- | --- | --- | --- | --- |
| `workforce-worker` | inherit | all except Agent | 60 | `workforce-worker` |
| `workforce-probe` | inherit | Read, Grep, Glob, Bash, WebFetch; no Agent/Edit/Write | 20 | `workforce-probe` |
| `workforce-reviewer` | inherit | all except Agent/Edit/Write/NotebookEdit | 30 | `workforce-review` |

Roles do not spawn children. Only the user-facing session asks questions.

## Verify

`status` checks owned files and the managed block. `/workforce-smoke` is the live
check: it spawns two cheap probes with explicit models, continues one with
SendMessage, and reports discovery, requested models, results, and follow-up
separately. It runs only on explicit request because it uses quota.

## Cost expectations

The kit is instructions, not a scheduler. It cannot promise lower usage. What the
public evidence supports: a single strong agent is often the cheapest way to finish
a well-specified task; a builder plus one reviewer costs about three times that;
a full per-task swarm costs about six times that on the same task without a
quality gain. The kit's classification step and agent continuity rules exist to
keep you on the cheap side of that curve. Use `/cost` and `/usage` in the session
as the evidence, not estimates.
