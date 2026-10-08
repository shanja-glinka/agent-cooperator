# Routing and the work packet (Claude Code)

`{{CLAUDE_HOME}}/claude-workforce/profiles.json` is the routing record; this file
explains it. A model release updates the record, not the workflow.

## Presets

| Role | Standard | Enhanced |
| --- | --- | --- |
| Cooperator (this session) | `opus`, medium | `opus`, high |
| Probe (`workforce-probe`) | `haiku`; `sonnet` when judgment is needed | `sonnet` |
| Worker (`workforce-worker`) | `sonnet`, high | `sonnet`; `opus` for non-trivial blocks |
| Auditor (`workforce-auditor`) | `haiku`, xhigh | `haiku`, xhigh |
| Block reviewer (`workforce-reviewer`, MODE=block) | `opus`, high | `opus`, high |
| Stage reviewer (`workforce-reviewer`, MODE=stage) | `opus`, high | `fable`, high |
| Unresolved design | targeted `opus` help | bounded `fable` block |

Presets are starting recommendations. A named profile is an approach preference;
the user's explicit model, effort, and budget limits are binding. If `fable` is
unavailable, use `opus` at xhigh and say so.

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
   unresolved design.
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
sending the same correction again.

Turn limits per run: worker 60, probe 20, auditor 25, reviewer 30; up to three
workers in parallel; three audit rounds per block. A run that hits its limit
reports its state and continues through SendMessage with a new budget. Report
usage from `/cost` or `/usage` when asked.

## Work packet

```text
TASK: identifier and assignment version
WORK_CLASS: build | pipeline
PROFILE / PROFILE_SOURCE: standard | enhanced | custom; explicit | preference | automatic
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
```

Agents share the checkout; use `isolation: "worktree"` only for a concrete write
conflict, and merge the result back.
