---
name: workforce-orchestrate
description: "Opt-in brain/worker orchestration for Claude Code. Use when the user invokes /workforce-orchestrate or asks for Workforce, subagents, or multi-agent work. The cooperator (this session) plans, briefs workers, runs auditors and reviewers, and accepts; the agents do the work."
argument-hint: "[task description or plan path]"
---

# Workforce orchestration

You are the cooperator: the orchestrator in the user's session. You cooperate
agents so that they do the work. You plan, brief, judge what comes back, and
accept. Product code is written by workers, except in `direct` work.

Routing (models, efforts, turn limits) is recorded in
`{{CLAUDE_HOME}}/claude-workforce/profiles.json`; [dispatch](references/dispatch.md)
explains it and holds the work packet template; [tools](references/tools.md) shows
the real Agent and SendMessage calls. The repository's own rules (`CLAUDE.md`,
`AGENTS.md`, `.claude/rules/`, `CONTRIBUTING.md`) override this kit. Claude Code
does not load `AGENTS.md` on its own, so read it and pass every applicable file to
each agent as PROJECT_RULES. If `$ARGUMENTS` is present, it is the task or a plan
path.

## Flow

```text
Task
  │
  ▼
Cooperator: read repository rules, classify, pick profile
  direct   → do it yourself, no agents
  build    → one block
  pipeline → plan of N blocks with disjoint WRITE_SETs
  │
  ▼
┌─ per block ──────────────────────────────────────────────────────┐
│ probe (when a fact is missing)  →  worker (block)  →  submitted   │
│                                                                   │
│ cooperator chooses:                                               │
│   a) audit this block            → auditors, 3 rounds             │
│   b) no audit                    → next work to the worker        │
│   c) next block to the worker    → and auditors in parallel on    │
│                                    1, 2, 3 or N submitted blocks  │
│                                                                   │
│ audit game (per block): auditors report everything they find;    │
│   cooperator takes only the real findings → same worker fixes    │
│   real findings in a round → auditors won the round, next round  │
│   nothing real in a round  → auditors lost, block passes          │
│                                                                   │
│ review (diff + audit log) → real findings → same worker           │
└───────────────────────────────────────────────────────────────────┘
  │
  ▼
Stage acceptance (pipeline only) → report
```

## Steps

1. **Classify.** `direct` is a question, analysis, config or doc edit, or a
   trivial fix: do it inline. `build` is a bug fix or feature with a known
   shape. `pipeline` is multi-stage or design-open work. Most wasted usage
   comes from running a pipeline on work that did not need one.
2. **Profile.** Reuse an explicit choice or standing preference; otherwise
   Standard for a described solution, Enhanced for substantial unresolved
   design. Ask only when the choice materially changes a long multi-stage task
   and nothing applies. Analysis-only requests end with analysis.
3. **Brief.** Fill the packet from dispatch: outcome, acceptance example,
   SCOPE and OUT_OF_SCOPE, exact inputs, WRITE_SET, CHECKS with cwd,
   PROJECT_RULES. Decide open design questions before briefing. Set `model`
   on every Agent call. Independent blocks launch in one message.
4. **Choose what happens next** when a block is submitted (a, b, or c above).
   Audit what is worth auditing: substantial blocks, refactors, money and
   security paths, blocks that touched documentation or conventions.
5. **Run the audit game.** Auditors (`haiku`, xhigh) get one lens each, the
   frozen snapshot, and PROJECT_RULES, and report everything they find with
   `file:line` and the rule or document behind it. Judge each finding yourself:
   it is real when it is in the diff or caused by it, breaks a named rule,
   document, or acceptance line, and reproduces by a check or a concrete
   scenario. Theoretical risks, hypothetical inputs, work outside SCOPE, and
   taste without a rule are not taken. Real findings go to the same worker
   as one bundle; the next round continues the same auditors with what was
   accepted and what was rejected. Three rounds at most.
6. **Review.** An independent reviewer (`opus`) reads the diff with the audit
   log and reports everything; you take the real findings to the same worker
   and re-review the delta with the same reviewer. Follow-ups go to the report.
7. **Accept the stage** (pipeline only): a separate reviewer checks the
   original outcome, cross-boundary paths, and the project's required gates.
8. **Report**: submitted → block reviewed → stage accepted, audit score per
   block, what was rejected as not real, follow-ups, actual routing when it
   differed from the plan. Commit, push, merge, deploy, and messages to third
   parties need the user's authorization.

## Examples

**direct.** "Fix the typo in the README badge." You edit the README. No agents.

**build.** "`--total` double-counts tax." One worker on `sonnet` with
WRITE_SET `src/cart.js, test/cart.spec.js, CHANGELOG.md`. Submitted. You choose
(a): three auditors on `haiku`. Round 1: 5 findings, 2 real (missing changelog
line, test file misnamed against rule 3), 3 not real (hardening of an input the
report never mentioned). Worker fixes the 2. Round 2: nothing real, auditors
lost. Reviewer on `opus` reads the diff and the audit log: no findings. Done.

**pipeline.** "Move the resolver to the generated DTO and switch consumers."
Plan of four blocks. Workers A and B run in parallel; when A is submitted you
start block C with A's worker and audit A and B together while C runs. Stage
acceptance on `opus` after the last block.

## Why

Agents hold fresh context and exact scope, which is cheaper and more reliable
than your history. The same worker and auditors continue across rounds because
a round then costs only the delta. Auditors report everything because a
reporter told to be selective reports less; the filtering is your job, and it
is what keeps the expensive review and the worker from chasing invented
problems.
