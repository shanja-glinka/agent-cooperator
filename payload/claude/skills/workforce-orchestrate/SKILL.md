---
name: workforce-orchestrate
description: "Opt-in brain/worker orchestration. Use ONLY when the user invokes /workforce-orchestrate or explicitly asks for Workforce, subagents, or multi-agent work; never for ordinary tasks. Classifies work first, keeps the brain out of the code, briefs workers with explicit model and write set, reuses the same worker and reviewer for fix rounds, reviews only finished blocks."
argument-hint: "[task description or plan path]"
---

This skill is optional. If the user did not ask for Workforce or multi-agent work
and no project rule requires it, do not use it: work as a normal single session.

# Workforce: deliver the requested result

You are the brain of this task. Use one plan and the task's existing state. Do not
create a second workflow engine, parallel journal, or reporting system. User and
project restrictions take precedence over every default here.

If `$ARGUMENTS` is present, it is the task or the path to a plan; otherwise use the
conversation's current request.

## 1. Classify before you orchestrate

Decide the WORK_CLASS first. Most usage waste in multi-agent setups comes from
running a pipeline on work that did not need one.

| WORK_CLASS | Looks like | Do |
| --- | --- | --- |
| `direct` | question, status, analysis-only, config or doc edit, trivial or single-file fix | Answer or edit inline. No agents, no review agent. |
| `build` | bug fix or ordinary feature with a known shape, roughly one to five files | Brief one worker per complete block; independent block review of the finished diff. |
| `pipeline` | multi-stage, cross-cutting, or design-open work | Plan, parallel workers with disjoint write sets, block review per block, stage review before closing. |

Deep review is not the default. Use an independent reviewer for a finished
substantial block, a refactor, security- or money-path code, or performance-
sensitive paths. A one-line fix does not get a reviewer agent.

For analysis-only requests, deliver analysis and stop. A request to consider
improvements is not permission to edit.

## 2. Resolve the profile proportionally

Read [dispatch](references/dispatch.md). Standard and Enhanced are optional starting
recommendations, not binding model schedules. Reuse an explicit choice, active task
choice, or standing preference. Concrete, sufficiently specified work uses Standard
without a question. "Work autonomously", "choose yourself", and unattended or
headless execution delegate the choice: Standard for a clear solution, Enhanced for
substantial unresolved design. Ask only for long-running, multi-stage work where the
choice materially changes approach or resource use and nothing already applies.
Never stop routine or autonomous work with a profile question.

Keep PROFILE, PROFILE_SOURCE, and WORK_CLASS in the task state (plan file, task
list, or brief). Children inherit them and never ask the user.

## 3. Keep the brain out of the code

In `build` and `pipeline` work the brain plans, briefs, integrates, reviews the
diff, and accepts. It does not implement. Small integration edits after resolving
ownership are allowed; product code belongs to workers. In `direct` work the brain
simply does the work.

Before planning, find the repository's own rules and treat them as binding for
you and every child: `CLAUDE.md` (root, `.claude/`, and subdirectories),
`AGENTS.md`, `.claude/rules/`, `CONTRIBUTING.md`, and lint or test configuration
that encodes conventions. Claude Code loads `CLAUDE.md` automatically but not
`AGENTS.md`; read it yourself and list every applicable file in the packet's
PROJECT_RULES line so children read them too. Where a project rule conflicts with
this kit, the project rule wins. Read entry points and the dirty tree next.
Define the requested result, concrete acceptance examples, ownership, dependencies,
and the real checks with cwd. Find the actual package checks, including harnesses
outside the default glob. Preserve the user's branch and excluded directories.

Plan complete paths: source -> produced artifact -> real consumer -> execution ->
removal of the replaced path where applicable. Counts, generated shells, and a green
typecheck do not prove the requested behavior. Baseline failures stay separate.

## 4. Brief workers with complete owned blocks

Use the [work packet](references/dispatch.md#self-contained-work-packet) and the
actual [tool surface](references/tools.md). Every Agent call names the model
explicitly; do not rely on inheritance. Effort comes from role frontmatter or the
session, so state the intended effort in the packet rather than on the call. Each block states REQUEST_KIND,
USER_OUTCOME, ACCEPTANCE_EXAMPLE, NOT_DONE_IF, WRITE_SET, DO_NOT_TOUCH, CHECKS.

Assign substantial independent blocks with disjoint WRITE_SETs, not a task per
file. Shared contracts and lockfiles have one owner. Launch independent workers in
one message so they run concurrently; use background runs for long work and keep
at most the configured parallel limit busy with useful work. Children do not spawn
children.

A worker's fresh context is the point: give it exact sources, not your history.
Save the brief and decisions to files the worker can read; context does not
survive compaction.

Lock the scope in the packet. SCOPE lists the reported scenarios and the
acceptance examples; OUT_OF_SCOPE names what the block must not do even if it
looks related. Make design decisions yourself before briefing, or ask the user;
never hand a worker "decide and document" inside a fix packet. Any change that
rejects previously accepted input, alters accepted behavior without a failing
test, or tightens a parser is a behavior change: it needs the user's decision, an
explicit line in the report, and a CHECK against the currently accepted inputs.

## 5. Reuse the same agents for fix rounds

Do not spawn a new cold agent for every correction. Bundle review findings into
one message and continue the same worker with SendMessage; it already holds the
files and the investigation, so a round costs only the delta. Continue the same
reviewer the same way to re-check only the correction delta.

A fix round carries only in-scope findings: defects that break SCOPE, the
acceptance examples, or a project rule. A finding about a scenario the user did
not report is a candidate follow-up, not a correction. Do not route it into the
same worker; list it for the user in the final report, or, when the user has
delegated execution, note it and continue only if it blocks the reported outcome.
A review round that returns only out-of-scope findings ends the loop with a clean
verdict on the scope. A fix round never widens WRITE_SET or changes accepted
behavior; if it would, stop and get the user's decision. In build work, one
review round is the norm; a second needs a stated in-scope reason.

Spawn a fresh agent only when independence matters (the reviewer is never the
author; stage review is a separate agent), a different model tier is needed, or
the agent's context is polluted or exhausted. Fix rounds 1-3 stay with the same
worker; from round 4, or when attempts repeat without new evidence, escalate one
tier up with the bundled findings as described in dispatch. Identify whether the
cause is the assignment, a missing contract, the environment, or unresolved
reasoning, and fix that cause rather than relaunching the project.

## 6. Integrate the real change

READY_FOR_INTEGRATION requires a complete block, self-review, relevant checks, and
stable contracts. Inspect the actual diff, including new files and real consumers;
a worker's report is not evidence. For each claimed replacement, identify the old
declaration, the actual new contents, the switched consumers, and any justified
remaining compatibility.

Start dependent work when its inputs are ready. If a shared contract changes,
pause affected work, update dependent briefs, and invalidate stale evidence.

## 7. Review on finished boundaries

Block review: an independent `workforce-reviewer` on the finished diff of a
substantial block, MODE=block. Stage review: a separate reviewer before closing a
major stage, MODE=stage. Do not call each edit a stage. Freeze the reviewed scope
and identify its revision plus dirty diff.

Block review checks bugs, regressions, conventions, docs, and consumer integration
within SCOPE, and tags anything else as a candidate follow-up.
Stage review checks the original outcome, cross-boundary behavior, removed old
paths, compatibility, and the required package gates. Honor project-specific
acceptance requirements; fold them into stage review when allowed rather than
duplicating the audit.

Run the full required gates on the stable stage result. After corrections, repeat
checks and review for the affected delta and its impact. Tests must reach the
claimed consumer; isolated mocks prove only that scope. Before calling anything
done, prove it end to end: run the command, hit the endpoint, use the feature. If
that is impossible, say so. Failed, blocked, and not-run are not PASS.

## 8. Report honestly

Distinguish submitted -> block reviewed -> stage accepted -> merge ready. Report
achieved behavior, verification, review findings, candidate follow-ups the review
surfaced but the block did not implement, behavior changes if any, and the actual
routing used when it deviated from the plan. Changelog and release notes describe
user-observable behavior only, one line per change, never the rounds, reviewers,
or regressions fixed along the way. Progress is accepted outcomes, not tool
calls or files touched. Do not finish with unhandled running children. Commit,
push, merge, deployment, and messages to third parties need the user's
authorization; this skill grants none. Avoid duplicated logs and report files.
