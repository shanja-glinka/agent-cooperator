---
name: workforce-orchestrate
description: "Orchestrate implementation, refactoring, and automation through complete owned blocks, independent review, and stage acceptance. User-facing session only; use proportional profile selection without blocking concrete authorized work."
---

# Workforce: deliver the requested result

Use one plan and the task's existing state. Do not create a second workflow engine,
parallel journal, or reporting system. User restrictions, including no GSD, take
precedence over workflow defaults.

## Resolve the profile proportionally

Standard and Enhanced are optional starting recommendations, not exhaustive or
binding model/effort schedules. Choosing a profile expresses an approach preference;
it does not by itself require its exact models, efforts, or team composition. Adapt
routing to the task, available capabilities, and user limits, or use a custom setup
without a named profile. Only separately explicit model/effort/budget constraints
make those settings mandatory. Keep review independence and verification requirements.

Read [dispatch](references/dispatch.md). Reuse an explicit profile, active task choice,
native launch choice, or applicable standing preference. Concrete, sufficiently
specified work and small fixes proceed without a profile question, using Standard
as the routing default. "Work autonomously", "choose yourself", "do not ask about
profiles", and unattended execution delegate selection: choose Standard for a clear
solution or Enhanced for substantial unresolved design, explain briefly, and proceed.

Ask only for a long-running, multi-stage task with substantial unresolved solution
choices where the profile materially affects the approach or resource use, and only
when no choice, preference, or delegated selection already applies. Duration, number
of steps, production risk, and urgency alone do not trigger the question. Wait for
an explicit answer only when this narrow question is required; independent authorized
prerequisites can proceed. Never manufacture a PROFILE_REQUIRED stop for routine,
autonomous, or unattended work. Preserve PROFILE and its source in existing context;
children inherit them and never ask the user again.

For analysis-only requests, deliver analysis and stop before implementation.
A request to consider improvements is not permission to edit. Direct questions and
status reports do not require profile selection. Small authorized changes can run
inline without inventing stages or spawning workers.

## Preserve the deliverable

Before planning, find the repository's own rules and treat them as binding for
you and every child: `AGENTS.md` (root and subdirectories), `CLAUDE.md`,
`CONTRIBUTING.md`, and lint or test configuration that encodes conventions. List
every applicable file in the packet's PROJECT_RULES line so children read them
too; where a project rule conflicts with this kit, the project rule wins.
Read relevant entry points and existing dirty changes next.
Define the requested result, concrete acceptance examples, ownership, dependencies,
and necessary checks with cwd. Preserve the user's branch and excluded directories.
Find actual package checks, including relevant harnesses outside the default glob.

Each block states REQUEST_KIND (analysis or implementation), USER_OUTCOME,
ACCEPTANCE_EXAMPLE, NOT_DONE_IF, SCOPE, and OUT_OF_SCOPE. SCOPE lists the reported
scenarios and acceptance examples; OUT_OF_SCOPE names what the block must not do
even if it looks related. Make design decisions yourself before briefing, or ask
the user; never hand a worker "decide and document" inside a fix packet. A change
that rejects previously accepted input, alters accepted behavior without a
failing test, or tightens a parser is a behavior change: it needs the user's
decision, an explicit line in the report, and a check against the currently
accepted inputs. These belong in the assignment or existing plan,
not mandatory new files. A worker cannot replace implementation with an inventory,
or treat an intermediate prerequisite as completion. If its scope cannot reach the
outcome, fix ownership/dependencies rather than silently shrinking that outcome.

Plan complete paths: source -> produced artifact -> real consumer -> execution ->
removal of the replaced path where applicable. For migrations, retain required
historical compatibility and neighboring consumers. Counts and typecheck alone
do not prove the requested behavior. Baseline failures remain separate from new bugs.

## Delegate coherent work

Use [dispatch](references/dispatch.md) and the actual [tool schema](references/tools.md).
Assign substantial independent blocks with disjoint WRITE_SETs, not tasks per file.
Give shared contracts and lockfiles one owner. Launch independent work before waiting;
do not fill slots without useful work. Children do not spawn more children.

The recommended presets assign Astra requirements, open decisions, integration,
dependencies, and acceptance. Adapt the following model assignments under dispatch;
they are recommendations, not requirements implied by the profile name.
GPT-6 Sol is the recommended implementation model in **both** presets, and the
Standard orchestrator itself; Luna answers read-only lookups. The orchestrator need
not write product code to stay busy; small integration edits are allowed after
resolving file ownership. In Enhanced, Astra may own a bounded unresolved
design/algorithm block. Once that contract is stable, pass ordinary implementation
to Sol. Set effort per block: `medium` when the contract is settled and the shape
is clear, `high` for debugging and non-trivial work.

Reuse workers for related corrections. Do not repeat their investigation; inspect
exact evidence needed for a decision or verification. A correction round carries
only in-scope findings: defects that break SCOPE, the acceptance examples, or a
project rule. A finding about a scenario the user did not report is a candidate
follow-up for the user's report, not a correction; a round never widens the
WRITE_SET or changes accepted behavior without the user's decision. A review that
returns only out-of-scope findings ends the loop with a clean verdict on the
scope; for a bounded block one review round is the norm. Workers self-review conventions,
documentation, compatibility, and completeness. No permanent paired auditors and
no independent review after each small edit.

If attempts repeat without new evidence or a changed result, stop that loop. Identify
whether the cause is the assignment, missing contract, environment, or unresolved
reasoning. Correct that cause and revise the same owner's assignment. Escalate a
bounded reasoning problem under dispatch; do not relaunch the whole project blindly.

## Integrate the real change

READY_FOR_INTEGRATION requires a complete block, self-review, relevant checks, and
stable contracts. Inspect the actual diff, including new files and real consumers;
an author's report is not a substitute. For each claimed replacement, be able to
identify the old declaration/path, actual replacement contents, switched consumers,
and justified remaining compatibility. No fictional fields or empty generated shells
count as implemented replacements.

Start dependent work when its inputs are ready. Bundle findings back to the owner;
the reviewer does not fix them. If a shared contract changes, pause affected work,
confirm the pause, and update dependent assignments and invalidated evidence.

## Review once the block is ready

Use an independent reviewer for a completed substantial block (GPT-6 Sol high is the
recommended starting point). Before closing a major stage, use a separate stage
reviewer (Astra high is recommended). Adapt models and effort under dispatch. Do not call each edit
a stage. Freeze the reviewed scope and identify its revision plus dirty diff.

Block review checks bugs, regressions, conventions, docs, and consumer integration.
Stage review checks the original outcome, cross-boundary behavior, removed old paths,
compatibility, and mandatory affected-package gates. Honor project-specific acceptance
requirements; incorporate them into stage review when allowed rather than duplicating
the same audit. Do not silently skip a genuinely separate required gate.

Run full required gates on the stable stage result. After corrections, repeat checks
and review for the affected delta and its impact, not the entire repository without
reason. Tests must reach the claimed consumer; isolated mocks prove only that scope.
Do not blame the environment without evidence. Failed, blocked, and not-run are not PASS.

## Report honestly

Distinguish submitted -> block reviewed -> stage accepted -> merge ready. Every major
stage criterion must be met before acceptance. Report achieved behavior, verification,
review findings, candidate follow-ups the review surfaced but the block did not
implement, behavior changes if any, and remaining scope. Changelog and release
notes describe user-observable behavior only, one line per change, never the
rounds or regressions fixed along the way. Progress is accepted outcomes, not tool calls or
files touched. Label estimates. Do not finish with unhandled running children.
Commit, push, merge, deployment, and messages to third parties require authorization
from the user; the skill does not grant it. Avoid duplicated logs and report files.
