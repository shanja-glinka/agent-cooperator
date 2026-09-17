# Profiles, routing, and assignments (Claude Code)

Current release routing is recorded in `{{CLAUDE_HOME}}/claude-workforce/profiles.json`.
This document explains that policy. A model upgrade changes the versioned policy
and this guidance together; it does not rename roles or alter the workflow.

Standard and Enhanced are optional starting recommendations, not binding model or
effort schedules. A named profile expresses an approach preference. Adapt routing
to the task, the models available to the account, and the user's limits, or use a
custom setup. Only separately explicit model, effort, and budget constraints make
exact settings mandatory. Review independence and verification always apply.

The recommended presets follow the brain/worker pattern that recurs across
published Claude Code configurations: an expensive brain that plans, briefs, and
accepts; cheaper workers with fresh context and explicit scope; reviews on
finished boundaries only.

| Responsibility | Standard | Enhanced |
| --- | --- | --- |
| User-facing brain (this session) | `opus`, `medium` | `opus`, `high` |
| Bounded research (`workforce-probe`) | `haiku`, `medium`; `sonnet` if the question needs judgment | `sonnet`, `medium` |
| Main implementation (`workforce-worker`) | `sonnet`, `high` | `sonnet`, `high`; `opus` for non-trivial blocks |
| Unresolved design or algorithm | Targeted `opus high` assistance when needed | Bounded `fable high` block (fallback `opus xhigh`) |
| Completed block (`workforce-reviewer`, MODE=block) | `opus`, `high` | `opus`, `high` |
| Major stage (`workforce-reviewer`, MODE=stage) | `opus`, `high` | `fable`, `high` (fallback `opus xhigh`) |

Model aliases are the ones Claude Code accepts in the `model` frontmatter field and
the Agent tool: `haiku`, `sonnet`, `opus`, `fable`, `inherit`, or a full model id.
The role files use `model: inherit` on purpose so that the explicit model on each
Agent call is what runs. Effort values are `low`, `medium`, `high`, `xhigh`, `max`;
a session effort cap set by the user is binding.

## Tier guidance

- `haiku`: mechanical edits, renames, lookups, single-file checks, smoke probes.
- `sonnet`: implementation with a decided shape, focused multi-file work, clear
  refactors, ordinary bug fixes. The default worker in both presets.
- `opus`: planning, review loops, architecture, debugging, non-trivial
  implementation, iteration on unclear failures. When in doubt go one tier cheaper
  and re-spawn stronger if it struggles, except for planning, review, debugging,
  and non-trivial implementation, which start on `opus`.
- `fable`: reserve tier for the hardest architecture, money-path, and security
  decisions, and for stage acceptance in Enhanced. Roughly twice the cost of
  `opus`; requires a stated unresolved problem and expected benefit. If the account
  cannot use it, fall back to `opus xhigh` and say so.

Turn count beats token price: a cheaper model that takes three times the turns on
a hard block costs more. Choose the worker tier by the block's uncertainty, not by
its line count.

## Resolve, ask only when useful, inherit

Apply these rules in order:

1. Classify WORK_CLASS as `direct`, `build`, or `pipeline`. Direct work never
   spawns agents and needs no profile.
2. Honor the user's explicit profile, active task choice, or applicable standing
   preference. The latest explicit instruction wins.
3. If the user delegates execution or selection ("work autonomously", "choose
   yourself", "no profile questions"), or execution is unattended or headless,
   choose without asking: Standard for a sufficiently described solution; Enhanced
   for substantial unresolved architecture or algorithm work. State the choice
   briefly when useful.
4. Concrete, sufficiently specified work and small fixes use Standard without
   asking. Importance, length, or production involvement do not change this;
   risk calls for checks and existing permissions, not a questionnaire.
5. Ask only before long-running, multi-stage work with substantial unresolved
   solution choices where the choice materially changes the approach or resource
   use, and only if none of the rules above applies. Ask once in the user's
   language, describe both presets in one line each, allow a custom setup, and
   continue independent authorized prerequisites while waiting.

Keep PROFILE, PROFILE_SOURCE (explicit, inherited, preference, automatic), and
WORK_CLASS in the task state. Follow-ups, corrections, resumption, and compaction
retain them. Children inherit them and never ask the user. Do not infer a
permanent preference from one task or create a preference file.

## Actual routing and escalation

Model and effort are selected through real controls: the `model` and `effort`
fields on each Agent call and in role frontmatter, and the session model and
effort the user set. A prompt cannot change the running session's model. If the
user asked for a specific brain model and the session runs another, say so once
and continue; do not pretend the setting changed and do not open a second session
to hide the mismatch.

Escalate a bounded reasoning problem, not a whole project. Use `fable` or
`opus xhigh` for a stated unresolved decision: an architecture choice, a money or
auth path, a security boundary, or a failure that repeated three rounds without new
evidence. State the question and the expected benefit first. No automatic `max`
based on elapsed time, task size, or a single failure. Stage-review effort rises
only when the acceptance problem itself warrants it.

Worker ladder: fix rounds 1-3 continue the same worker via SendMessage. From round
4, or when the worker loops, spawn a fresh worker one tier up with the bundled
findings and the same WRITE_SET. Record the escalation and its reason in the task
state.

Budgets (defaults in `profiles.json`, overridable by the user): at most three
parallel workers, worker `maxTurns` 60, probe 20, reviewer 30. A worker that runs
out of turns reports its state; the brain decides whether to continue it or
re-brief. Report usage evidence from the actual session (`/cost`, `/usage`) when
asked; do not invent token measurements or promise savings.

## Self-contained work packet

Put this in the Agent prompt (and in a brief file for pipeline work):

```text
TASK: identifier and assignment version
WORK_CLASS: build | pipeline
PROFILE: standard | enhanced | custom | none
PROFILE_SOURCE: explicit | inherited | preference | automatic
REQUEST_KIND: analysis | implementation
ROOT / BRANCH: absolute checkout and agreed branch
USER_OUTCOME: result requested by the user
GOAL: complete result owned by this block
ACCEPTANCE_EXAMPLE: concrete before/after scenario
NOT_DONE_IF: intermediate results that do not satisfy GOAL
INPUTS: exact sources, contracts, revision and relevant dirty diff
WRITE_SET: owned files/modules, or none for read-only work
DO_NOT_TOUCH: exclusions and others' ownership
DEPENDENCIES: ready inputs and handoff conditions
CHECKS: relevant commands with cwd and required behavior
RETURN: concise result, evidence, gaps
MODE: block | stage (reviewer only)
REVIEW_INSTRUCTIONS: exact applicable sources, or not_applicable
```

Include: read the assigned skill and applicable project instructions; preserve
others' changes; no children, branch switching, or push; a commit needs an explicit
assignment; an analysis assignment must not mutate source files; expand inadequate
ownership through the parent rather than quietly abandoning the outcome.

Workers share the checkout by default; a new child is not a new worktree. Use
`isolation: "worktree"` only for concrete conflicts between parallel writers or
when the user asked for it, and remember that a worktree's result must be merged
back and its summary read before the worktree is removed.
