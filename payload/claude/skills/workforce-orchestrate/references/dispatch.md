# Routing and the work packet (Claude Code)

`{{CLAUDE_HOME}}/claude-workforce/profiles.json` is the routing record; this file
holds its defaults. A model release updates the record, not the workflow.
Read the record only to route outside the defaults below.

## Presets

| Role | Hybrid (default) | Standard | Enhanced |
| --- | --- | --- | --- |
| Cooperator (this session) | `opus`, high | `opus`, medium | `opus`, high |
| Probe (`workforce-probe`) | `haiku`; `sonnet` when judgment is needed | `haiku`; `sonnet` when judgment is needed | `sonnet` |
| Worker | `haiku`, xhigh (`workforce-worker-lite`) | `sonnet`, high (`workforce-worker`) | `sonnet`; `opus` for non-trivial blocks |
| Worker ladder | `haiku` → Codex `gpt-6.1-sol` xhigh → `opus` | `sonnet` → `opus` | `sonnet` → `opus` |
| Audit lens (on demand) | Codex `gpt-6-luna`, xhigh | `haiku`, xhigh (Agent) | `haiku`, xhigh (Agent) |
| Block reviewer (MODE=block) | Codex `gpt-6.1-sol`, xhigh | `opus`, high (Agent) | `opus`, high (Agent) |
| Stage reviewer (MODE=stage) | Codex `gpt-6.1-sol`, xhigh | `opus`, high (Agent) | `fable`, high (Agent) |
| Unresolved design | the cooperator decides before briefing | targeted `opus` help | bounded `fable` block |

Presets are starting recommendations. A named profile is an approach preference;
the user's explicit model, effort, and budget limits are binding. If `fable` is
unavailable, use `opus` at high and say so.

Hybrid is the default: `opus` thinks, judges, and integrates, and `haiku` reads
and types at xhigh{{#reviewBlock}}; GPT-6.1 Sol at xhigh reviews the blocks light workers
submit{{/reviewBlock}}{{^reviewBlock}}; block review is off in this install{{/reviewBlock}}{{^reviewStage}}, and so is stage review{{/reviewStage}}. Audit lenses run only on
demand (delegation, step 6). Codex runs go through the wrapper in
[tools](tools.md), never through the Agent tool; they need the `codex` CLI on
PATH and logged in (the Codex edition of the kit is not required). If Codex is
unavailable or fails twice, audit on `haiku` xhigh and review on `opus` high
through Agent, mark that review as the fallback, and say so once. Hybrid
wants the session at high effort: if it runs at medium, say so once and
suggest `/effort high`.

Prices per MTok (checked 2026-10-20): `opus` Claude Opus 5.5 $4 in / $20 out,
cache read $0.20, 1-hour cache write $8 (default effort medium); `sonnet`
Claude Sonnet 5.5 $2 / $10, cache read $0.10; `haiku` Claude Haiku 5.5 $0.10 /
$0.50, cache read $0.01, while a request's prompt stays at or under 100k
tokens, and $0.50 / $2.50, cache read $0.05, above (effort up to xhigh);
`fable` Claude Fable 5.1 $10 / $50. Codex: GPT-6 Luna $0.10 / $0.50, cached
$0.01; GPT-6.1 Sol $2 / $10, cached $0.10. Role files use `model: inherit` so
the model on the Agent call is what runs. The Agent tool has no per-call
effort; effort comes from the role frontmatter (light worker xhigh, worker
high, probe medium, auditor xhigh, reviewer high) or the session. A
cooperator on `opus` runs at medium unless `/effort` is set.

## Selection

1. Explicit choice, active task choice, or standing preference wins; the latest
   instruction takes precedence.
2. Otherwise Hybrid, also for "work autonomously", "choose yourself", and
   unattended runs; Enhanced for substantial unresolved design.
3. Standard on the user's choice, or when Codex is unavailable; say which.
4. Ask once, in the user's language, only before long multi-stage work where
   the choice materially changes the approach and nothing above applies.

Keep PROFILE, its source, and WORK_CLASS in the task state; agents inherit them
and never ask the user.

## Escalation and budgets

Worker budgets per block, counted by the cooperator:

| Tier | Tool calls | Attempts | Token ceiling | Next tier |
| --- | --- | --- | --- | --- |
| `haiku` (`workforce-worker-lite`) | 120 per run, 360 per block | 3 | 400k | Codex `gpt-6.1-sol` xhigh; without Codex `sonnet` |
| `sonnet` | role turn limit | 3 | 500k | `opus` |
| Codex `gpt-6.1-sol` (Hybrid) | runner time limits | 3 | 500k | `opus` |
| `opus` | role turn limit | 3 | none | the cooperator re-plans or asks the user |

An attempt is spent only by a run that ends without a result: the worker hit
its BUDGET or turn limit, returned `STATUS: handoff`, or its fix left the
finding open. A submitted block, or a fix that closes its finding, spends no
attempt. Tool calls and tokens count for every run on the block, fixes
included. Asking a stopped worker only for its HANDOFF is not a new run. The
counters stay with the block when it is blocked, submitted, handed off, or put
aside for another block.

Tokens (measured 2026-10-19). The token count Claude Code reports for an agent
(`totalTokens` on completion) is the size of its last request, that is, its
context, not its spend: a `sonnet` worker reported 39,483 while its requests
processed about 346k. A continued agent carries its context, so compare the
agent's latest count with the ceiling and never add counts across its runs.
For a Codex run in Hybrid, compare `tokens.threadTotal.uncached` from the
latest `result.json` (new tokens the thread has processed, all its runs
included; see [tools](tools.md)). The real spend is in `/cost`. When a count is
missing, go by attempts and tool calls and say so in the report. These budgets
are instructions; neither Claude Code nor the runner enforces them.

The next tier gets a fresh packet: the original block packet, the current
snapshot, the cooperator's APPROACH, and the worker's HANDOFF; nothing else from
earlier runs. Re-planning does not reset spent budget or drop the outcome. If
Codex is unavailable, the `haiku` worker's next tier is `sonnet`.

Audit lenses (on demand): the packet BUDGET is 40 tool calls per run, separate from the role's
50-turn limit. An auditor on `haiku` (Codex Luna in Hybrid) whose count reaches
400k hands its lens to `sonnet` in the auditor role (Codex Sol xhigh) on the
same snapshot and round, with its NOT_REACHED files; its findings stay with the
cooperator. A lens with nothing real is retired for the block.

`fable` high is for a stated unresolved design question and its expected
benefit: architecture, a money or auth path, a security boundary. When the
account cannot use `fable`, the high-effort roles run on `opus` high; say so.
The Agent tool has no per-call effort: effort comes from the role.

Turn limits per run: worker 60, light worker 130, probe 20, auditor 50,
reviewer 30; up to three workers in parallel. Codex runs are bounded by the
runner's idle and total time limits instead. Report usage from `/cost` or
`/usage` when asked.

## Work packet

```text
TASK: identifier and assignment version; task state file (pipeline)
TIER / RUN: worker model; run number and attempts spent on this block (worker)
WORK_CLASS: build | pipeline
PROFILE / PROFILE_SOURCE: hybrid | standard | enhanced | custom; explicit | preference | automatic
REQUEST_KIND: analysis | implementation
ROOT / BRANCH: absolute checkout and agreed branch
USER_OUTCOME: what the user asked for
GOAL: the complete result this block owns
ACCEPTANCE_EXAMPLE: concrete before/after
SCOPE / OUT_OF_SCOPE: what this block covers; what it must not do
PROJECT_RULES: repository instruction files to read first
INPUTS / SNAPSHOT: exact sources, contracts, revision, relevant dirty diff; the tree to read
WRITE_SET / DO_NOT_TOUCH: owned files; exclusions
CHECKS: commands with cwd and expected result
CONSTRAINTS: what the project checks on this change (CI steps, lint and size rules, frozen areas), each with the file that sets it
TRAPS: what you saw that can go wrong (a behavior-changing rewrite)
RETURN: concise result, evidence, gaps
MODE: block | stage (reviewer)   LENS: docs | task | conventions (auditor)
REVIEW (reviewer): acceptance of a light worker's block | required (<rule or request>) | question (<what is in doubt>); what is already fixed; checks already run; the audit log
FILES / BUDGET (auditor): assigned files; tool calls before returning STATUS: partial
BUDGET (worker on a budgeted tier): tool calls before returning STATUS: handoff
APPROACH / HANDOFF (escalated worker): the cooperator's decision; the previous tier's handoff
```

Agents share the checkout; use `isolation: "worktree"` only for a concrete write
conflict, and merge the result back. An audit beside a running writer follows
step 4 of [delegation](delegation.md).
