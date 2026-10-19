# Routing and the work packet (Claude Code)

`{{CLAUDE_HOME}}/claude-workforce/profiles.json` is the routing record; this file
explains it. A model release updates the record, not the workflow.

## Presets

| Role | Standard | Enhanced | Hybrid |
| --- | --- | --- | --- |
| Cooperator (this session) | `opus`, medium | `opus`, high | `opus`, high |
| Probe (`workforce-probe`) | `haiku`; `sonnet` when judgment is needed | `sonnet` | `haiku`; `sonnet` when judgment is needed |
| Worker | `sonnet`, high (`workforce-worker`) | `sonnet`; `opus` for non-trivial blocks | `haiku`, high (`workforce-worker-lite`) |
| Worker ladder | `sonnet` → `opus` | `sonnet` → `opus` | `haiku` → Codex `gpt-6.1-sol` xhigh → `opus` |
| Auditor | `haiku`, xhigh (Agent) | `haiku`, xhigh (Agent) | Codex `gpt-6-luna`, xhigh |
| Block reviewer (MODE=block) | `opus`, high (Agent) | `opus`, high (Agent) | Codex `gpt-6.1-sol`, xhigh |
| Stage reviewer (MODE=stage) | `opus`, high (Agent) | `fable`, high (Agent) | Codex `gpt-6.1-sol`, xhigh |
| Unresolved design | targeted `opus` help | bounded `fable` block | the cooperator decides before briefing |

Presets are starting recommendations. A named profile is an approach preference;
the user's explicit model, effort, and budget limits are binding. If `fable` is
unavailable, use `opus` at high and say so.

Hybrid is the economy preset: `opus` thinks and judges, `haiku` types, and
cheap Codex models audit and review at xhigh (GPT-6 Luna $0.1/$0.5 and
GPT-6.1 Sol $2/$10 per MTok, checked 2026-10-08). Codex runs go through the
wrapper in [tools](tools.md), never through the Agent tool. It needs the
`codex` CLI on PATH and logged in; the Codex edition of the kit is not
required. If Codex is unavailable, audit on `haiku` xhigh and review on `opus`
high through Agent, and say so once. Hybrid wants the session at high effort:
if it runs at medium, say so once and suggest `/effort high`.

Aliases as Claude Code resolves them on the Claude API (checked 2026-10-08):
`fable` Claude Fable 5.1 ($10/$50 per MTok in/out), `opus` Claude Opus 5.5
($4/$20, default effort medium), `sonnet` Claude Sonnet 5.5 ($2/$10), `haiku`
Claude Haiku 5.5 (from $0.10/$0.50, effort up to xhigh). Role files use
`model: inherit` so the model on the Agent call is what runs. The Agent tool has
no per-call effort; effort comes from the role frontmatter (worker high, probe
medium, auditor xhigh, reviewer high) or the session. A cooperator on `opus`
runs at medium unless `/effort` is set.

## Selection

1. Explicit choice, active task choice, or standing preference wins; the latest
   instruction takes precedence.
2. "Work autonomously", "choose yourself", and unattended runs delegate the
   choice: Standard for a described solution, Enhanced for substantial
   unresolved design. Hybrid is chosen only by the user, explicitly or as a
   standing preference.
3. Concrete work and small fixes use Standard without a question.
4. Ask once, in the user's language, only before long multi-stage work where
   the choice materially changes the approach and nothing above applies.

Keep PROFILE, its source, and WORK_CLASS in the task state; agents inherit them
and never ask the user.

## Escalation and budgets

Worker budgets per block, counted by the cooperator:

| Tier | Tool calls | Attempts | Token ceiling | Next tier |
| --- | --- | --- | --- | --- |
| `haiku` (`workforce-worker-lite`) | 120 per run, 360 per block | 3 | 400k | Hybrid: Codex `gpt-6.1-sol` xhigh; otherwise `sonnet` |
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
Codex is unavailable in Hybrid, the `haiku` worker's next tier is `sonnet`.

Auditors: the packet BUDGET is 40 tool calls per run, separate from the role's
50-turn limit. An auditor on `haiku` (Codex Luna in Hybrid) whose count reaches
400k hands its lens to `sonnet` in the auditor role (Codex Sol xhigh) on the
same snapshot and round, with its NOT_REACHED files; its findings stay with the
cooperator. Up to three audit rounds per block; after round 1 only lenses that
won the last round play again.

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
PROFILE / PROFILE_SOURCE: standard | enhanced | hybrid | custom; explicit | preference | automatic
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
RETURN: concise result, evidence, gaps
MODE: block | stage (reviewer)   LENS: docs | task | conventions (auditor)
FILES / BUDGET (auditor): assigned files; tool calls before returning STATUS: partial
BUDGET (worker on a budgeted tier): tool calls before returning STATUS: handoff
APPROACH / HANDOFF (escalated worker): the cooperator's decision; the previous tier's handoff
```

Agents share the checkout; use `isolation: "worktree"` only for a concrete write
conflict, and merge the result back. An audit beside a running writer follows
step 5 of the skill.
