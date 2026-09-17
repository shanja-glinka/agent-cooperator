# Research: how people actually run agentic development in Claude Code

Sources were checked on 2026-09-17. This page records what the live configurations
say and the conclusions the Claude edition of this kit draws from them. It is not a
claim of measured performance for this kit.

## Live configurations

### LeanerCloud `dotclaude` (global CLAUDE.md)

- Loop: implementer does one atomic plan task; an Opus reviewer reads the diff on
  six dimensions (completeness, correctness, security, bugs, duplication,
  over-engineering); the implementer fixes; the same reviewer re-reviews until a
  pass has "no actionable findings".
- Continuity: "Reuse live agents via SendMessage when they already hold relevant
  files and context." Fresh agents only for independence (adversarial review), a
  different tier, or polluted context. Same-file work is batched into one agent;
  independent calls run in parallel with `run_in_background`.
- Routing: Haiku for mechanical edits and lookups; Sonnet for simpler
  implementation with a decided shape; Opus for planning, review loops,
  architecture, debugging, non-trivial implementation; Fable as a reserve tier for
  the hardest money-path and architecture calls. "When in doubt, go one tier
  cheaper and re-spawn stronger if it struggles" except for the Opus defaults.
- Every Agent call sets the model explicitly.
- Verification: "Never mark a task complete without proving it works." Trace the
  real end-to-end scenario; green tests are necessary but not sufficient.
- Source: https://github.com/LeanerCloud/dotclaude/blob/main/CLAUDE.md

### paulingham `.claude` (global playbook)

- Work-class routing before any pipeline: PAIR (questions, spikes, docs, config,
  trivial code), BUILD (bug fixes, standard features), PIPELINE (critical or
  cross-cutting). Only PIPELINE gets the heavy orchestration.
- Pipeline: Plan -> Build (worktrees, parallel subagents) -> Security review +
  Code review (parallel) -> Final gate (parallel validators) -> Ship.
- The orchestrator "never writes code/tests". Builders run on Sonnet; planning
  and ship on Opus; review roles currently execute on Sonnet despite an Opus
  contract.
- Source: https://github.com/paulingham/.claude/blob/main/CLAUDE.md

### AndreAlbuquerque `claude-config`

- `@pm` router classifies into DIRECT / SINGLE / BATCH / EPIC / DISCOVERY-NEEDED
  and routes to researcher, implementer, qa, reviewer. Small work is direct.
- "Deep review escalation is not the default. Use it only for: large features
  (> 5 files or multiple domains), refactors, security-sensitive code, or
  performance-sensitive paths."
- Agents carry `model`, `maxTurns`, `memory`, `tools` in frontmatter, with
  scope-drift guardrails and soft tool budgets.
- Source: https://github.com/AndreAlbuquerque/claude-config

### Frameworks

- Superpowers, subagent-driven development: fresh implementer per task; one task
  review covering spec compliance and code quality; fix rounds 1-3 resume the
  same implementer, rounds 4-5 use a fresh, more capable model; one broad final
  review; "Turn count beats token price"; ledger file as recovery because
  "Conversation memory does not survive compaction".
- GSD (Get Shit Done): plans grouped into dependency waves; fresh executor per
  plan with its own context, often in a worktree; executors write `SUMMARY.md`;
  "Orchestrator coordinates, not executes"; a verifier checks the phase goal.
- Compound Engineering: brainstorm -> plan -> build -> review -> capture
  learnings, as skills per stage rather than a mandatory per-task swarm.
- Sources: https://github.com/obra/superpowers,
  https://github.com/gsd-build/get-shit-done,
  https://github.com/EveryInc/compound-engineering-plugin

### Daily-use reports

A widely upvoted r/ClaudeCode workflow post (August 2026) and its top comment
describe the same shape: a planning brain that never writes code, versioned task
briefs, one task per fresh context, cheap workers and an expensive brain, hard
concurrency and turn limits, explicit allowed files per worker, verification gates,
and state saved to files rather than context. Reddit could not be fetched
programmatically during this check; the description follows the user-provided
summary.

### Controlled experiment

Fresh Worktree, "Are better models replacing Superpowers?" (August 2026): the same
greenfield gym-booking app, five runs per workflow, a frozen 66-test suite.

| Workflow | Median cost | Median time | Subagents | Tests |
| --- | ---: | ---: | ---: | ---: |
| Plain Opus 5 | $5.62 | 20.1 min | 0 | 66/66 |
| Opus builder + Fable reviewer | $17.48 | 42.1 min | 2 | 66/66 |
| Superpowers | $35.49 | 111.6 min | 28 | 64/66 |

Caveats from the author: plain Opus wrote zero unit tests; one benchmark on a
greenfield task; brownfield results pending.
Source: https://fresh-worktree.ghost.io/are-better-models-replacing-superpowers/

## Conclusions encoded in the Claude edition

1. **Classify before orchestrating.** Every mature setup has a gate (PAIR/BUILD/
   PIPELINE, DIRECT/SINGLE/BATCH/EPIC). The kit uses `direct` / `build` /
   `pipeline`, and `direct` never spawns agents.
2. **Brain/worker, not a tree of general-purpose agents.** An expensive brain
   plans, briefs, integrates, and accepts; cheaper workers implement in fresh
   contexts with explicit scope. The brain does not write product code outside
   `direct` work.
3. **Agent continuity for fix rounds.** Findings go back to the same worker and
   the same reviewer via SendMessage; a round costs the delta. Fresh agents are
   for independence, a tier change, or polluted context. Rounds 1-3 stay, round 4
   escalates one tier.
4. **Explicit model on every call.** Role files use `model: inherit` so the Agent
   call decides; the brief states the intended effort.
5. **Complete owned blocks with a write set.** One owner per block, disjoint
   write sets, one owner for shared contracts. Budgets: parallel limit, `maxTurns`
   per role, fix-round limit.
6. **Diff review on finished boundaries only.** Block review for substantial
   blocks, refactors, security/money/performance paths; stage review before
   closing; never a reviewer per edit.
7. **State in files.** Plans, briefs, decisions, and summaries live in files or
   git; context does not survive compaction.
8. **Prove it end to end.** Green tests are necessary, not sufficient; failed,
   blocked, and not-run are not PASS.
9. **Cost honesty.** The evidence says orchestration is a cost multiplier that
   only pays for itself when the task warrants it. The kit does not promise
   savings and asks for `/cost` or `/usage` evidence instead.
