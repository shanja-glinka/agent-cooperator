# Routing and the work packet (Codex)

`{{CODEX_HOME}}/codex-workforce/profiles.json` is the routing record; this file
explains it. A model release updates the record, not the workflow.

## Presets

| Role | Standard | Enhanced |
| --- | --- | --- |
| Cooperator (user-facing session) | `gpt-6.1-sol`, high | `gpt-6-astra`, high |
| Probe (`workforce_probe`) | `gpt-6-luna`, medium; `gpt-6.1-sol` when judgment is needed | same |
| Worker (`workforce_worker`) | `gpt-6.1-sol`, high; medium for settled blocks | same |
| Auditor (`workforce_auditor`) | `gpt-6-luna`, xhigh | same |
| Block reviewer (`workforce_reviewer`, MODE=block) | `gpt-6.1-sol`, high | same |
| Stage reviewer (`workforce_reviewer`, MODE=stage) | `gpt-6-astra`, high | same |
| Unresolved design | targeted Astra help | bounded Astra high block |

Presets are starting recommendations. A named profile is an approach preference;
the user's explicit model, effort, and budget limits are binding. The native
launch layers `codex -p workforce-standard` and `codex -p workforce-enhanced` set
the cooperator's model and effort for that launch; a prompt never changes the
running model, so report a mismatch instead of claiming one.

Models as checked on 2026-10-08: GPT-6 Astra $10/$50 per MTok in/out, GPT-6.1 Sol
$2/$10 (near-Astra on complex work), GPT-6 Luna $0.1/$0.5 (effort up to xhigh).
Role files omit model and effort on purpose: the spawn sets them. Sol and Luna
default to medium, so set effort on every spawn.

## Selection

1. Explicit choice, native launch profile, active task choice, or standing
   preference wins; the latest instruction takes precedence.
2. "Work autonomously", "choose yourself", and unattended runs delegate the
   choice: Standard for a described solution, Enhanced for substantial
   unresolved design.
3. Concrete work and small fixes use Standard without a question.
4. Ask once, in the user's language, only before long multi-stage work where
   the choice materially changes the approach and nothing above applies.

Keep PROFILE, its source, and WORK_CLASS in the task state; agents inherit them
and never ask the user.

## Escalation

Astra high is for a bounded unresolved decision; xhigh, max, and ultra need a
stated question and expected benefit. When a worker loops, re-brief or move the
block to a stronger model with the bundled findings rather than sending the
same correction again. Up to three audit rounds per block; after round 1
only the lenses that won the last round play again. Report usage from
`/usage` when asked.

## Work packet

```text
TASK: identifier and assignment version
WORK_CLASS: build | pipeline
PROFILE / PROFILE_SOURCE: standard | enhanced | custom; explicit | inherited | preference | automatic
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

Agents share the checkout; use worktrees only for a concrete write conflict.
