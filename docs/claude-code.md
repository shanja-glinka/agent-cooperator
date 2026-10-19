# Agent Cooperator in Claude Code

This is the Claude Code edition of the kit. It installs five subagent roles, six
skills, a routing policy, and a managed block in the user `CLAUDE.md`. The workflow
is the same brain/worker pattern the [research](research.md) found in live public
configurations; the roles and skill names match the Codex edition so both can be
used side by side.

## Install

Requires Node.js 22+, npm, Git, and Claude Code with custom subagents, skills, and
the `model` field on Agent calls (any current release).

```sh
npx --yes github:shanja-glinka/agent-cooperator claude install
npx --yes github:shanja-glinka/agent-cooperator claude update
npx --yes github:shanja-glinka/agent-cooperator claude status
npx --yes github:shanja-glinka/agent-cooperator claude uninstall
```

Pin a release with `github:shanja-glinka/agent-cooperator#<tag>`. Start a new Claude Code session
after installing or updating. Options: `--claude-home PATH` (precedence: option,
`CLAUDE_CONFIG_DIR`, `~/.claude`), `--dry-run`, `--force`, `--json`. There is no
`--skills-dir`: Claude Code discovers skills inside its home directory.

```text
~/.claude/
  agents/workforce-worker.md
  agents/workforce-worker-lite.md
  agents/workforce-probe.md
  agents/workforce-auditor.md
  agents/workforce-reviewer.md
  skills/workforce-orchestrate/SKILL.md          /workforce-orchestrate
  skills/workforce-orchestrate/references/dispatch.md
  skills/workforce-orchestrate/references/tools.md
  skills/workforce-orchestrate/scripts/codex-run.mjs   Codex runner (Hybrid)
  skills/workforce-worker/SKILL.md               preloaded into both worker roles
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
The [orchestration skill](../payload/claude/skills/workforce-orchestrate/SKILL.md)
defines action selection, open obligations, and completion; the
[dispatch reference](../payload/claude/skills/workforce-orchestrate/references/dispatch.md)
defines the model, effort, and budget policy for those actions.

### Work classes

| Class | Looks like | What happens |
| --- | --- | --- |
| `direct` | question, status, analysis-only, config/doc edit, or any change the brain can describe exactly, however many files | Done inline, project checks run by the brain. No agents. |
| `build` | bug fix or ordinary feature with a known shape | One worker per complete block; the cooperator chooses audit and review subject to required project gates. |
| `pipeline` | multi-stage, cross-cutting, or design-open work | Plan, parallel workers with disjoint write sets, block review per block, stage review before closing. |

Classification comes first because it is the single largest lever on usage: the
public configurations that run well all refuse to run a pipeline on work that did
not need one.

### Profiles

Standard and Enhanced are optional starting recommendations, not binding schedules.
Selection is contextual: concrete work proceeds with Standard, autonomous or
unattended runs choose automatically, and a question is asked only for long
multi-stage work with substantial unresolved design where nothing already applies.

| Responsibility | Standard | Enhanced | Hybrid |
| --- | --- | --- | --- |
| Brain (this session) | `opus` medium | `opus` high | `opus` high |
| Bounded research (`workforce-probe`) | `haiku` medium, `sonnet` when judgment is needed | `sonnet` medium | `haiku` medium |
| Implementation | `sonnet` high (`workforce-worker`) | `sonnet` high, `opus` for non-trivial blocks | `haiku` high (`workforce-worker-lite`) |
| Worker ladder | `sonnet` → `opus` | `sonnet` → `opus` | `haiku` → Codex GPT-6.1 Sol xhigh → `opus` |
| Unresolved design or algorithm | targeted `opus` high | bounded `fable` high block (fallback `opus` high) | the brain decides before briefing |
| Auditor (up to 3 rounds) | `haiku` xhigh (`workforce-auditor`) | `haiku` xhigh (`workforce-auditor`) | Codex GPT-6 Luna xhigh |
| Block review (MODE=block) | `opus` high (`workforce-reviewer`) | `opus` high (`workforce-reviewer`) | Codex GPT-6.1 Sol xhigh |
| Stage acceptance (MODE=stage) | `opus` high (`workforce-reviewer`) | `fable` high (fallback `opus` high) | Codex GPT-6.1 Sol xhigh |

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
it, the fallback is `opus` at `high` through the existing high-effort roles.
Claude policy 1.6.0 changes the previously documented `opus` xhigh fallback for
stage acceptance and design to match those roles. A named profile permits this
adaptation; a separately explicit model or effort requirement needs the required
setting or an accepted fallback before dependent work.

### Hybrid: Claude thinks, Codex checks

Hybrid is the economy preset. `opus` at high effort is the brain: it plans,
decides design questions before briefing, judges every finding, and accepts.
`haiku` workers implement; a block that exhausts a `haiku` worker moves to a
Codex GPT-6.1 Sol xhigh worker, then to `opus`.
Auditors run on Codex GPT-6 Luna at xhigh, and block and stage review on Codex
GPT-6.1 Sol at xhigh, both read-only. Luna costs $0.1/$0.5 and Sol $2/$10 per
MTok (checked 2026-10-08), so the expensive model only thinks.

It runs only when you choose it (`/workforce-orchestrate Use Hybrid. ...`) or
record it as a standing preference; automatic selection never picks it. It
needs the `codex` CLI on PATH and logged in; the Codex edition of the kit is not
required. If Codex is unavailable or a run fails twice, that role falls back to
`haiku` xhigh auditors and `opus` high review through Agent, and the report
says so. If the session runs at medium effort, the brain says so once and
suggests `/effort high`.

Codex calls go through `skills/workforce-orchestrate/scripts/codex-run.mjs`,
never through bare `codex` or a hand-written `codex exec`. The wrapper exists
because of a real incident: a cooperator started Codex in the background and
waited for the completion notification for hours while Codex sat waiting for
input. The wrapper sets these execution boundaries:

- the packet goes in on stdin from a file, so Codex always sees end of input;
- `approval_policy="never"`, a read-only sandbox, and `--ignore-user-config`
  (no MCP servers from the user's config that ask for approval);
- `--role work` runs an escalated worker on Sol with a writable workspace;
  audits and reviews stay read-only;
- a watchdog ends the run when it goes silent for 15 minutes (`stalled`), shows
  an approval or input request (`waiting_for_input`), or passes 60 minutes
  (`timeout`); the cooperator reads the result status before using the output;
- it writes `<name>.result.json` with the status, the Codex thread id, the
  token usage, and the path of the final message. The next round of a winning
  lens, or the delta for the same reviewer, resumes that thread with
  `--resume <threadId>` and `--baseline <previous result.json>`.

Usage in `result.json`: `tokens.total` is the run's own `input + output`
(`cachedInput` is part of `input`), `tokens.uncached` is `input - cachedInput +
output`, and `tokens.status` is `known`, `partial` (a lower bound), or `unknown`
(`null`, never zero). `tokens.threadTotal` is the thread's running total: a
resumed Codex thread keeps counting from its previous total (checked
2026-10-19: a one-word reply on a resumed thread added 16,258 input and 5 output
tokens to a total of 79,910), so the latest `threadTotal` covers every run of
that agent. Without `--baseline`, a resumed run's own usage is `unknown`.
`model` and `effort` are what was requested, not proof of what ran.

### Worker ladder and handoff

The cooperator holds each worker's budget per block and moves a block that
exhausts it to a stronger model:

| Tier | Tool calls | Attempts | Token ceiling | Next tier |
| --- | --- | --- | --- | --- |
| `haiku` (`workforce-worker-lite`) | 120 per run, 360 per block | 3 | 400k | Hybrid: Codex GPT-6.1 Sol xhigh; otherwise `sonnet` |
| `sonnet` | role turn limit | 3 | 500k | `opus` |
| Codex GPT-6.1 Sol (Hybrid) | runner time limits | 3 | 500k | `opus` |
| `opus` | role turn limit | 3 | none | the cooperator re-plans or asks you |

Only a run that ends without a result spends an attempt: the worker hit its
limit, returned `STATUS: handoff`, or its fix left the finding open. A
submitted block, or a fix that closes its finding, spends none, but its tool
calls and tokens count. The token count Claude Code shows for an agent is its
context size at its last request, not its spend (measured 2026-10-19: a
`sonnet` worker showed 39,483 tokens while processing about 346k), so the
cooperator compares the agent's latest count with the ceiling instead of adding
counts across runs; the real spend is in `/cost`. These budgets are
instructions, not runtime guards, and `maxTurns` counts turns, not tool calls.

A worker at its limit returns `STATUS: handoff` with DONE, STOPPED_AT, TRIED,
OPEN, and NEXT. The cooperator reads it, finds the cause, decides the APPROACH
(same path with more effort, a different route, or a split or re-scoped block),
and starts the next tier with the original packet, APPROACH, and HANDOFF only;
earlier reports, audit rounds, and transcripts stay with the cooperator. The
[dispatch reference](../payload/claude/skills/workforce-orchestrate/references/dispatch.md)
has the details, including the auditor handoff at 400k.

### Rules that hold in every profile

- The session is the cooperator: it plans, briefs, judges, and accepts; agents
  do the work. In `direct` work it simply does the work.
- The repository's own rules come first: `CLAUDE.md`, `AGENTS.md`,
  `.claude/rules/`, `CONTRIBUTING.md` (Claude Code reads `AGENTS.md` only when the
  project has no `CLAUDE.md`). They go to every agent as PROJECT_RULES.
- Every Agent call sets `model`. Effort comes from the role frontmatter.
- A worker gets a complete packet with SCOPE, OUT_OF_SCOPE, WRITE_SET, and
  CHECKS, and edits only its write set.
- Fixes go back to the same worker, the next audit round only to the auditors
  whose lens won the last round, the delta to the same reviewer, all through
  SendMessage (in Hybrid, the Codex thread is resumed instead).
- Audits run at the cooperator's choice; checks the project requires always run:

```text
Worker submits a block
  │
  ▼
Cooperator (the orchestrator) chooses:
  a) audit this block              → auditors, up to 3 rounds
  b) no audit                      → next work to the worker
  c) next block to the worker      → and auditors in parallel on
                                     1, 2, 3 or N submitted blocks
                                     (only if that block changes nothing
                                     the audit reads; else a snapshot)

Audit game: auditors (Haiku 5.5 / GPT-6 Luna, xhigh) report everything
they find through one lens each: docs, task, conventions.
Round 1 runs every lens. Then each lens plays on its own:
real findings → that lens won, the same worker fixes, only winners
                play the next round;
nothing real  → that lens lost and is retired for this block.
Every lens lost, or round 3 done → the audit is over; real findings
not yet fixed still go to the worker, and the review reads the fix.
A round ends only when each auditor has read all its files; an auditor
that hits its limit is continued where it stopped, never replaced.
The cooperator takes only real findings; theoretical, hypothetical, and
out-of-scope ones are rejected.
```

- Nothing closes without evidence: a handoff, a new worker, a submitted block,
  or the third audit round leaves required checks and accepted findings open
  until they are done.
- Auditors and reviewers report everything; the cooperator decides what is real:
  in the diff or caused by it, breaks a named rule, document, or acceptance
  line, and reproduces.
- Turn limits per run: worker 60, light worker 130, probe 20, auditor 50,
  reviewer 30.

### Roles

| Role | Model field | Tools | Turns | Preloaded skill |
| --- | --- | --- | --- | --- |
| `workforce-worker` | inherit | all except Agent | 60 | `workforce-worker` |
| `workforce-worker-lite` | inherit (`haiku` on the call) | all except Agent | 130 | `workforce-worker` |
| `workforce-probe` | inherit | Read, Grep, Glob, Bash, WebFetch; no Agent/Edit/Write | 20 | `workforce-probe` |
| `workforce-auditor` | inherit (`haiku` on the call), `effort: xhigh` | Read, Grep, Glob, Bash; no Agent/Edit/Write | 50 | `workforce-audit` |
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

The kit is instructions, not a scheduler; it cannot promise lower usage. The
[historical survey recorded on 2026-09-17](research.md#controlled-experiment)
describes one external Fresh Worktree experiment, dated August 2026 in that record,
on a greenfield gym-booking app. Its reported median costs were about three times
the plain-agent baseline for a builder plus reviewer and six times for Superpowers.
Those ratios describe that task and those configurations; they are not cost
expectations for this kit. Measure completed outcomes, rework and actual usage
across all participants; use available `/cost` and `/usage` evidence.
