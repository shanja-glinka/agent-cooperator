# Profiles and assignments

Current release routing is recorded in `{{CODEX_HOME}}/codex-workforce/profiles.json`.
This document explains that policy. A future model upgrade changes the versioned
policy and guidance together; it does not rename roles or alter the workflow.

Standard and Enhanced are optional starting recommendations, not exhaustive or
binding model/effort schedules. Choosing a profile expresses an approach preference;
it does not by itself require its exact models, efforts, or team composition. Adapt
routing to the task, available capabilities, and user limits, or use a custom setup
without a named profile. Only separately explicit model/effort/budget constraints
make those settings mandatory. Keep review independence and verification requirements.

The recommended presets combine **GPT-6 Astra and GPT-5.5**. Enhanced emphasizes
uncertain solution work; it does not automatically move all workers to Astra. The
table describes starting recommendations, not mandatory runtime settings.

| Responsibility | Standard | Enhanced |
| --- | --- | --- |
| User-facing orchestrator | `gpt-6-astra`, `low` | `gpt-6-astra`, `high` |
| Bounded research (`workforce_probe`) | `gpt-5.5`, `medium` | `gpt-5.5`, `medium` |
| Main implementation (`workforce_worker`) | `gpt-5.5`, `high` | `gpt-5.5`, `high` |
| Unresolved design/algorithm | Targeted Astra assistance when needed | Bounded Astra `high` block |
| Completed block (`workforce_reviewer`, `MODE=block`) | `gpt-5.5`, `xhigh` | `gpt-5.5`, `xhigh` |
| Major stage (`workforce_reviewer`, `MODE=stage`) | `gpt-6-astra`, `high` | `gpt-6-astra`, `high` |

## Resolve, ask only when useful, inherit

Apply these rules in order:

1. Honor the user's explicit profile, active task choice, native launch profile, or
   applicable standing preference. The latest explicit instruction takes precedence.
2. If the user delegates execution or selection ("work autonomously", "choose
   yourself", "no profile questions"), or execution is unattended, choose without
   asking: Standard for a sufficiently described solution; Enhanced for substantial
   unresolved architecture or algorithm work. Briefly state the choice when useful.
3. Concrete, sufficiently specified work and small fixes use Standard without asking.
   A release runbook with backups, verification, and a maintenance page qualifies,
   even if important, lengthy, or involving production. Risk calls for appropriate
   checks and existing permissions, not a profile questionnaire.
4. Ask only before long-running, multi-stage work with substantial unresolved solution
   choices where profile selection materially changes the approach or resource use,
   and only if none of the preceding rules applies. Briefly explain both profiles:
   Standard uses Astra low to orchestrate, GPT-5.5 medium to investigate, GPT-5.5 high
   to implement, GPT-5.5 xhigh to review blocks, and Astra high to accept stages.
   Enhanced retains those GPT-5.5 roles and uses Astra high for orchestration and
   bounded open design. Ask once in the user's language about the preferred approach;
   offer Standard and Enhanced as examples and allow a custom setup or delegated
   selection. Do not force a binary choice between the presets.
5. For remaining bounded tasks, default to Standard with targeted assistance as
   needed. Clarify genuinely missing task facts separately; do not substitute a
   profile questionnaire for understanding the task.

When rule 4 applies, wait for an explicit answer before profile-dependent work;
preselection or elapsed time is not an answer. Continue independent authorized
prerequisites, including requested backups and their verification, while waiting.
Do not finish with only a profile question while such work remains possible.
Missing a profile alone never blocks concrete, autonomous, or unattended execution.
Real missing access, ambiguous destructive scope, or explicit budget restrictions
remain separate constraints; autonomous selection grants no extra permissions.

Keep PROFILE and PROFILE_SOURCE (explicit, inherited, preference, or automatic) in
existing task state. Follow-ups, corrections, resumption, and compaction retain them.
Children inherit the approach and actual assignment. A missing profile name alone
is not a blocker when the task and constraints are clear.
Do not infer a permanent preference from one task's choice or create a new preference
file. Use an existing recorded standing preference across tasks when applicable.

## Actual routing and escalation

The role TOMLs intentionally omit model and effort: those fields would override
spawn choices. Pass explicit model/effort through the runtime, using an empty fork
and a short complete assignment. Inspect available models and tool schemas first.
Do not infer actual model identity from an agent's self-description.

A prompt cannot change the running orchestrator's model or effort. If runtime
controls allow changing it, use the authorized setting and verify it. Otherwise
continue authorized work with available runtime settings. A difference from the
recommendation is an adaptation, not an approval gate, even for a user-selected
profile. Mention actual routing when material to expectations; do not narrate every
routine adaptation. For an explicit strict model/effort or budget
requirement, request the required setting or an accepted deviation before dependent
work. Never claim exact profile execution when settings do not match.
Do not create an extra orchestrator or new user task to conceal a mismatch.
If availability cannot be verified, say so; never claim verified routing.

Use Astra high for a bounded unresolved decision, not routine searching or mechanical
edits. For prolonged uncertainty where better reasoning can reduce retries, xhigh/max
may be appropriate: state the unresolved question and expected benefit first. No
automatic max based on elapsed time, task size, or any single failure. In Standard,
adapt model/effort or team composition when evidence warrants it, without requiring
a new profile choice. Preserve the user's approach preference and state material
changes in approach or expected resource use; stay within explicit user limits.
Stage-review effort increases only when the acceptance problem itself warrants it.

Scope guard: a correction round carries in-scope findings only. A finding outside
SCOPE is a candidate follow-up for the user. A round that would widen WRITE_SET,
reject previously accepted input, or change accepted behavior stops for the
user's decision. Decide open design questions before briefing; a packet never
says "decide and document" for a behavior change.

Compare available total usage, attempts, rework, and accepted outcomes. If telemetry
is missing, report it as unavailable. Do not promise subscription savings or treat
benchmark results as a guaranteed price reduction for every coding task.

## Self-contained work packet

```text
TASK: identifier and assignment version
PROFILE: standard | enhanced | custom | none (approach preference)
PROFILE_SOURCE: explicit | inherited | preference | automatic
REQUEST_KIND: analysis | implementation
ROOT / BRANCH: absolute checkout and agreed branch
USER_OUTCOME: result requested by the user
GOAL: complete result owned by this block
ACCEPTANCE_EXAMPLE: concrete before/after scenario
NOT_DONE_IF: intermediate results that do not satisfy GOAL
SCOPE: reported scenarios and acceptance examples this block covers
OUT_OF_SCOPE: related things this block must not do; candidate follow-ups go to the report
PROJECT_RULES: repository instruction files to read first (AGENTS.md, CLAUDE.md, CONTRIBUTING)
INPUTS: exact sources, contracts, revision and relevant dirty diff
WRITE_SET: owned files/modules, or none for read-only work
DO_NOT_TOUCH: exclusions and others' ownership
DEPENDENCIES: ready inputs and handoff conditions
CHECKS: relevant commands with cwd and required behavior
RETURN: concise result, evidence, gaps
MODE: block | stage (reviewer only)
REVIEW_INSTRUCTIONS: exact applicable sources, or not_applicable
```

Include: read the assigned skill and applicable project instructions; preserve others'
changes; no children, branch switching, or push. A commit needs an explicit assignment.
An analysis assignment must not mutate source files. Expand inadequate ownership
through the parent rather than quietly abandoning the user outcome.

Shared checkout edits already exist on disk; a new child is not a new worktree.
Use worktrees only for concrete conflicts. Bundle follow-up findings to the same owner.
