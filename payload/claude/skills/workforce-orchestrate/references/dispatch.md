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
unavailable, use `opus` at xhigh and say so.

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

Tokens are the sum over the runs of one worker on one block: `subagent_tokens`
from each completion notification, `tokens.total` from `result.json` for
Codex. The token ceiling applies even when runs are left. Escalation hands the
next tier a fresh packet: the original block packet, the cooperator's APPROACH,
and the worker's HANDOFF; nothing else from earlier runs. The same ceilings
apply to an auditor on `haiku` (or Codex Luna in Hybrid): at 400k on one block
its lens moves to `sonnet` (Codex Sol) with its NOT_REACHED files, and its
findings stay with the cooperator. If Codex is unavailable in Hybrid, the
`haiku` worker escalates to `sonnet`.

`fable` or `opus` xhigh is also for a stated unresolved decision: architecture,
a money or auth path, a security boundary. State the question and the expected
benefit first.

Turn limits per run: worker 60, light worker 120, probe 20, auditor 50,
reviewer 30; up to three workers in parallel; up to three audit rounds per block, and after round 1
only lenses that won the last round play again. Codex runs are bounded by the
wrapper's idle and total time limits instead of turns. Auditor BUDGET is 40 tool
calls (80% of 50) unless the role's limit differs. A run that hits its limit is
continued, never replaced: the same agent through SendMessage with a new budget,
an auditor with its NOT_REACHED files. Report
usage from `/cost` or `/usage` when asked.

## Work packet

```text
TASK: identifier and assignment version
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
INPUTS: exact sources, contracts, revision, relevant dirty diff
WRITE_SET / DO_NOT_TOUCH: owned files; exclusions
CHECKS: commands with cwd and expected result
RETURN: concise result, evidence, gaps
MODE: block | stage (reviewer)   LENS: docs | task | conventions (auditor)
FILES / BUDGET (auditor): assigned files; tool calls before returning STATUS: partial
BUDGET (worker on a budgeted tier): tool calls before returning STATUS: handoff
APPROACH / HANDOFF (escalated worker): the cooperator's decision; the previous tier's handoff
```

Agents share the checkout; use `isolation: "worktree"` only for a concrete write
conflict, and merge the result back.
