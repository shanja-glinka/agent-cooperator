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
unavailable, the existing reviewer/design role uses `opus` at high; say so.
A separately explicit model/effort requirement still needs a matching capability
or an accepted deviation.

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

| Tier | Per run | Runs | Token ceiling | Next tier |
| --- | --- | --- | --- | --- |
| `haiku` (`workforce-worker-lite`) | 120 tool calls | 3 (360) | 400k | Hybrid: Codex `gpt-6.1-sol` xhigh; otherwise `sonnet` |
| `sonnet` | role limit | 3 | 500k | `opus` |
| Codex `gpt-6.1-sol` (Hybrid) | runner time limits | 3 | 500k | `opus` |
| `opus` | role limit | 3 | none | the cooperator re-plans or asks the user |

Count each implementation start or continuation, including post-submit fixes,
as one run under the same block and tier. A HANDOFF-only request asks for no
implementation and adds no work run, but its known usage still counts. Keep
counters when blocked, submitted, handed off or switched to another block.
Queue late findings under their original block; restore its packet and counters
before the worker returns to it.

Sum only confirmed, non-overlapping usage attributable to this block/tier/run.
Partial usage is a measured lower bound; unavailable usage is unknown, not zero.
Cumulative session totals need a valid starting baseline before they can be used
as run totals. Retain run counts when usage is unavailable and disclose that
exact token-ceiling compliance cannot be established. Token and tool-call
budgets here are instructions, not runtime guards.

At exhaustion, preserve and verify an already submitted result. If implementation
remains, diagnose the cause, restore prerequisites and launch the next allowed
tier with the original assignment, current snapshot, APPROACH and HANDOFF only.
The cooperator retains earlier transcripts, findings and accounting; current
unclosed obligations and their closure conditions must survive in HANDOFF.
Re-planning does not reset spent budget or drop the original outcome.

For native Agent notifications, establish whether reported `subagent_tokens`
is a run increment or a cumulative total before adding it. Do not guess its
scope from the field name. For the Hybrid runner, use `tokens.status` and the
nullable run counters; never add `threadTotal` as new run usage. A resumed Codex
thread without a starting baseline reports unknown run usage. See
[tools](tools.md) for the result contract.

An auditor on `haiku` at 400k transfers NOT_REACHED to a fresh `sonnet` auditor
using the xhigh auditor role. Hybrid's Codex Luna transfers to Codex Sol xhigh.
Preserve the same snapshot, lens, round, completed coverage and findings. If
Codex is unavailable in Hybrid, the `haiku` worker's next tier is `sonnet`.
Ordinary partial audits continue the same agent; the token-ceiling handoff is
an exception. The audit game has up to three rounds; only winning lenses repeat,
and ending it does not close findings or accept the block.

Use `fable` high for a stated unresolved design question with an expected benefit.
The installed high-effort roles fall back to `opus` high. Custom effort routing
must use a runtime capability that actually exists; an Agent model field alone
does not change role effort.

Native maxTurns per run: worker 60, light worker 120, probe 20, auditor 50,
reviewer 30; up to three workers in parallel. Turns and tool calls are different
units: the default auditor packet BUDGET is independently 40 tool calls, and the
light worker has a 120-call instruction budget alongside maxTurns: 120. Return
a packet before either boundary prevents reporting. Codex runs instead have
runner idle/total time limits. Continue through SendMessage or a resumed Codex
thread only within the remaining block/tier budget. For competing transitions,
use the orchestration skill's coinciding-conditions table. Report available
`/cost` or `/usage` data without claiming it proves exact per-block usage.

## Work packet

```text
TASK: identifier, assignment version and durable task-state location
TIER / RUN: worker model and run number on this block (worker)
WORK_CLASS: build | pipeline
PROFILE / PROFILE_SOURCE: standard | enhanced | hybrid | custom; explicit | preference | automatic
REQUEST_KIND: analysis | implementation
ROOT / BRANCH: absolute checkout and agreed branch
USER_OUTCOME: what the user asked for
GOAL: the complete result this block owns
ACCEPTANCE_EXAMPLE: concrete before/after
SCOPE / OUT_OF_SCOPE: what this block covers; what it must not do
PROJECT_RULES: repository instruction files to read first
INPUTS / SNAPSHOT: exact sources, contracts, stable read root, revision and relevant dirty/new files
WRITE_SET / DO_NOT_TOUCH: owned files; exclusions
CHECKS: commands with cwd and expected result
RETURN: concise result, evidence, gaps
MODE: block | stage (reviewer)   LENS: docs | task | conventions (auditor)
FILES / BUDGET (auditor): assigned files; tool calls before returning STATUS: partial
BUDGET (worker on a budgeted tier): tool calls before returning STATUS: handoff
APPROACH / HANDOFF (escalated worker): the cooperator's decision; the previous tier's handoff
```

Agents may share a checkout when writes and relevant reads stay stable. Before
parallel auditing, materialize a stable view including read dependencies or
serialize the writer. A revision label or disjoint WRITE_SETs alone are
insufficient. If using a worktree, verify its actual base and include relevant
dirty/new inputs; later integration needs its own affected checks.
