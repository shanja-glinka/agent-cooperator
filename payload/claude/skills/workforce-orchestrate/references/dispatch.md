# Routing and the work packet (Claude Code)

`{{CLAUDE_HOME}}/claude-workforce/profiles.json` is the routing record; this file
explains it. A model release updates the record, not the workflow.

## Presets

| Role | Standard | Enhanced | Hybrid |
| --- | --- | --- | --- |
| Cooperator (this session) | `opus`, medium | `opus`, high | `opus`, high |
| Probe (`workforce-probe`) | `haiku`; `sonnet` when judgment is needed | `sonnet` | `haiku`; `sonnet` when judgment is needed |
| Worker (`workforce-worker`) | `sonnet`, high | `sonnet`; `opus` for non-trivial blocks | `haiku`, high; `sonnet` when it loops |
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

`fable` or `opus` xhigh is for a stated unresolved decision: architecture, a
money or auth path, a security boundary, or attempts that repeat without new
evidence. State the question and the expected benefit first. When a worker
loops, re-brief or move it one tier up with the bundled findings rather than
sending the same correction again. In Hybrid the next tier for a `haiku`
worker is `sonnet`.

Turn limits per run: worker 60, probe 20, auditor 50, reviewer 30; up to three
workers in parallel; up to three audit rounds per block, and after round 1
only lenses that won the last round play again. Codex runs are bounded by the
wrapper's idle and total time limits instead of turns. Auditor BUDGET is 40 tool
calls (80% of 50) unless the role's limit differs. A run that hits its limit is
continued, never replaced: the same agent through SendMessage with a new budget,
an auditor with its NOT_REACHED files. Report
usage from `/cost` or `/usage` when asked.

## Work packet

```text
TASK: identifier and assignment version
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
```

Agents share the checkout; use `isolation: "worktree"` only for a concrete write
conflict, and merge the result back.
