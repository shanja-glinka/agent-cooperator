# Claude Workforce: agentic development in Claude Code

This is the Claude Code edition of the kit. It installs four subagent roles, six
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
with `github:shanja-glinka/codex-workforce#v1.3.0`. Start a new Claude Code session
after installing or updating. Options: `--claude-home PATH` (precedence: option,
`CLAUDE_CONFIG_DIR`, `~/.claude`), `--dry-run`, `--force`, `--json`. There is no
`--skills-dir`: Claude Code discovers skills inside its home directory.

```text
~/.claude/
  agents/workforce-worker.md
  agents/workforce-probe.md
  agents/workforce-auditor.md
  agents/workforce-reviewer.md
  skills/workforce-orchestrate/SKILL.md          /workforce-orchestrate
  skills/workforce-orchestrate/references/dispatch.md
  skills/workforce-orchestrate/references/tools.md
  skills/workforce-worker/SKILL.md               preloaded into workforce-worker
  skills/workforce-probe/SKILL.md                preloaded into workforce-probe
  skills/workforce-audit/SKILL.md                preloaded into workforce-auditor
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

The kit is opt-in. Ordinary sessions are unaffected: the managed block in
`CLAUDE.md` only tells Claude that the kit exists and when to use it, and the
orchestration skill refuses to run for tasks that did not ask for it. Nothing is
spawned unless you invoke `/workforce-orchestrate`, ask for Workforce, subagents,
or multi-agent work, or a project's own instruction file requires it. The only
per-session cost is the short block and the skill descriptions.

Start a task with the kit explicitly:

```text
/workforce-orchestrate Migrate the resolver to the generated DTO and switch its consumers.
/workforce-orchestrate Use Enhanced. Resolve the ambiguous contract, then complete the migration.
Use workforce: fix the described validation error.   (build, no question)
Fix the described validation error.                  (no kit: normal session)
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
| Auditor (`workforce-auditor`, 3 rounds) | `haiku` xhigh | `haiku` xhigh |
| Block review (`workforce-reviewer`, MODE=block) | `opus` high | `opus` high |
| Stage acceptance (`workforce-reviewer`, MODE=stage) | `opus` high | `fable` high (fallback `opus` xhigh) |

The kit routes on aliases. What they run is decided by Claude Code and the
provider; the current resolution is recorded in `profiles.json` under
`modelResolution`:

| Alias | Resolves to (Claude API provider, checked 2026-10-08) | Price in/out per MTok | Default effort |
| --- | --- | --- | --- |
| `fable` | Claude Fable 5.1 (`claude-fable-5-1`) | $10 / $50 | `high` |
| `opus` | Claude Opus 5.5 (`claude-opus-5-5`) | $4 / $20 | `medium` |
| `sonnet` | Claude Sonnet 5.5 (`claude-sonnet-5-5`) | $2 / $10 | `high` |
| `haiku` | Claude Haiku 5.5 (`claude-haiku-5-5`) | from $0.10 / $0.50 | `medium` |
| `best` | `fable` where available, else `opus` | | |

Opus 5.5 replaced Opus 5 behind the `opus` alias at a lower price and with a
`medium` default effort, so the reviewer role pins `effort: high` and a brain on
`opus` runs at `medium` unless you set `/effort`. `fable` costs about 2.5x `opus`
per token. Sonnet 5.5 and Haiku 5.5 arrived on 2026-10-07; Haiku 5.5 supports
effort up to `xhigh`, which is what the auditor role runs at. Legacy models
(Sonnet 5, Haiku 4.5, Opus 5, Fable 5) are reachable only by full id.

The session's own model is whatever the user selected; a prompt cannot change it.
If it differs from the preset, the brain says so once and continues. The role files
declare `model: inherit` so that the `model` passed on each Agent call is what runs.
`fable` is a reserve tier that needs a stated reason; when the account cannot use
it, the fallback is `opus` at `xhigh`.

### Rules that hold in every profile

- The session is the cooperator: it plans, briefs, judges, and accepts; agents
  do the work. In `direct` work it simply does the work.
- The repository's own rules come first: `CLAUDE.md`, `AGENTS.md`,
  `.claude/rules/`, `CONTRIBUTING.md` (Claude Code does not load `AGENTS.md` by
  itself). They go to every agent as PROJECT_RULES.
- Every Agent call sets `model`. Effort comes from the role frontmatter.
- A worker gets a complete packet with SCOPE, OUT_OF_SCOPE, WRITE_SET, and
  CHECKS, and edits only its write set.
- Fixes go back to the same worker, the next audit round to the same auditors,
  the delta to the same reviewer, all through SendMessage.
- Audits run at the cooperator's choice:

```text
Worker submits a block
  │
  ▼
Cooperator (the orchestrator) chooses:
  a) audit this block              → auditors, 3 rounds
  b) no audit                      → next work to the worker
  c) next block to the worker      → and auditors in parallel on
                                     1, 2, 3 or N submitted blocks

Audit game: auditors (Haiku 5.5 / GPT-6 Luna, xhigh) report everything
they find through one lens each: docs, task, conventions.
Real findings in a round → auditors won, the same worker fixes, next round.
Nothing real in a round  → auditors lost, the block passes the audit.
The cooperator takes only real findings; theoretical, hypothetical, and
out-of-scope ones are rejected.
```

- Auditors and reviewers report everything; the cooperator decides what is real:
  in the diff or caused by it, breaks a named rule, document, or acceptance
  line, and reproduces.
- Turn limits per run: worker 60, probe 20, auditor 25, reviewer 30.

### Roles

| Role | Model field | Tools | Turns | Preloaded skill |
| --- | --- | --- | --- | --- |
| `workforce-worker` | inherit | all except Agent | 60 | `workforce-worker` |
| `workforce-probe` | inherit | Read, Grep, Glob, Bash, WebFetch; no Agent/Edit/Write | 20 | `workforce-probe` |
| `workforce-auditor` | inherit (`haiku` on the call), `effort: xhigh` | Read, Grep, Glob, Bash; no Agent/Edit/Write | 25 | `workforce-audit` |
| `workforce-reviewer` | inherit | all except Agent/Edit/Write/NotebookEdit | 30 | `workforce-review` |

Roles do not spawn children. Only the user-facing session asks questions.

## Behavioral check on 2026-09-17

The instructions were exercised, not only installed. A fixture repository with an
`AGENTS.md` (CommonJS only, JSDoc on exports, regression test per fix, frozen
`src/legacy/`, integer cents, run test and lint before done, no commits, changelog
line per fix) contained two planted bugs. A `sonnet` session was given the kit's
files, the bug report, and "work autonomously", and asked to report every Agent
call, continuation, and check.

Run 1, before the scope rules existed: `AGENTS.md` was found unprompted and all
eight rules were honored; classification `build` / Standard / automatic; worker
`sonnet` and reviewer `opus` with explicit models; fix rounds reused the same two
agents through SendMessage. But the reviewer's findings about unreported inputs
were routed into two extra fix rounds, `qty` was silently narrowed to integers, a
parser change regressed `.50` for one round, and the changelog grew to ten lines.

| | Run 1 | Run 2 |
| --- | ---: | ---: |
| Source and test lines changed | ~230 | ~80 |
| Changelog lines | 10 | 2 |
| Review rounds | 3 | 1 |
| SendMessage continuations | 6 | 0 |
| Child tokens (worker + reviewer) | ~462k | ~114k |
| Previously valid inputs rejected | fractional `qty`, `1e2` | none |

The post-mortem answers from that session led to locking SCOPE in the packet and
to the cooperator judging which findings are real. Run 2 on a
reset fixture with the updated instructions produced the table's second column
and listed the unreported inputs as candidate follow-ups for the user instead of
implementing them. One run each; treat the numbers as an illustration of the
failure mode and its fix, not as a benchmark.

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
