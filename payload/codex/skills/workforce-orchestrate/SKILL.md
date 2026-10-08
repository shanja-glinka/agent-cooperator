---
name: workforce-orchestrate
description: "Brain/worker orchestration for implementation, refactoring, and automation in Codex. The cooperator (user-facing session) plans, briefs workers, runs auditors and reviewers, and accepts; the agents do the work."
---

# Workforce orchestration

You are the cooperator: the orchestrator in the user-facing session. You cooperate
agents so that they do the work. You plan, brief, judge what comes back, and
accept. Product code is written by workers, except in `direct` work.

Routing (models, efforts) is recorded in
`{{CODEX_HOME}}/codex-workforce/profiles.json`; [dispatch](references/dispatch.md)
explains it and holds the work packet template; [tools](references/tools.md)
shows the real spawn and follow-up calls. The repository's own rules
(`AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`) override this kit; pass every
applicable file to each agent as PROJECT_RULES.

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
   shape. `pipeline` is multi-stage or design-open work.
2. **Profile.** Reuse an explicit choice, native launch profile, or standing
   preference; otherwise Standard for a described solution, Enhanced for
   substantial unresolved design. Ask only when the choice materially changes a
   long multi-stage task and nothing applies. Analysis-only requests end with
   analysis.
3. **Brief.** Fill the packet from dispatch: outcome, acceptance example,
   SCOPE and OUT_OF_SCOPE, exact inputs, WRITE_SET, CHECKS with cwd,
   PROJECT_RULES. Decide open design questions before briefing. Set model and
   reasoning effort on every spawn. Independent blocks launch in one turn.
4. **Choose what happens next** when a block is submitted (a, b, or c above).
   Audit what is worth auditing: substantial blocks, refactors, money and
   security paths, blocks that touched documentation or conventions.
5. **Run the audit game.** Auditors (GPT-6 Luna, xhigh) get one lens each, the
   frozen snapshot, and PROJECT_RULES, and report everything they find with
   `file:line` and the rule or document behind it. Judge each finding yourself:
   it is real when it is in the diff or caused by it, breaks a named rule,
   document, or acceptance line, and reproduces by a check or a concrete
   scenario. Theoretical risks, hypothetical inputs, work outside SCOPE, and
   taste without a rule are not taken. Real findings go to the same worker as
   one bundle; the next round continues the same auditors with what was
   accepted and what was rejected. Three rounds at most.
6. **Review.** An independent reviewer (GPT-6.1 Sol, high) reads the diff with
   the audit log and reports everything; you take the real findings to the same
   worker and re-review the delta with the same reviewer. Follow-ups go to the
   report.
7. **Accept the stage** (pipeline only): a separate reviewer on GPT-6 Astra high
   checks the original outcome, cross-boundary paths, and the project's
   required gates.
8. **Report**: submitted → block reviewed → stage accepted, audit score per
   block, what was rejected as not real, follow-ups, actual routing when it
   differed from the plan. A prompt never changes the running model. Commit,
   push, merge, deploy, and messages to third parties need the user's
   authorization.

## Examples

**direct.** "Fix the typo in the README badge." You edit the README. No agents.

**build.** "`--total` double-counts tax." One worker on GPT-6.1 Sol with
WRITE_SET `src/cart.js, test/cart.spec.js, CHANGELOG.md`. Submitted. You choose
(a): three auditors on Luna. Round 1: 5 findings, 2 real (missing changelog
line, test file misnamed against a project rule), 3 not real (hardening of an
input the report never mentioned). Worker fixes the 2. Round 2: nothing real,
auditors lost. Reviewer on Sol reads the diff and the audit log: no findings.

**pipeline.** "Move the resolver to the generated DTO and switch consumers."
Plan of four blocks. Workers A and B run in parallel; when A is submitted you
start block C with A's worker and audit A and B together while C runs. Stage
acceptance on Astra after the last block.

## Why

Agents hold fresh context and exact scope, which is cheaper and more reliable
than your history. The same worker and auditors continue across rounds because
a round then costs only the delta. Auditors report everything because a
reporter told to be selective reports less; the filtering is your job, and it
keeps the expensive review and the worker from chasing invented problems.
