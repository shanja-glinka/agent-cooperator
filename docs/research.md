# Research and routing rationale

The v5 section below was prepared on 2026-10-20 and the Route Decision synthesis on
2026-10-19, both for both editions.
The earlier Claude Code configuration survey was recorded on 2026-09-17; later
project observations carry their own dates. Those historical reports are not
current routing instructions or independently repeated benchmarks for this kit.
The authoritative workflow is the [Codex orchestration skill](../payload/codex/skills/workforce-orchestrate/SKILL.md)
and its [Claude counterpart](../payload/claude/skills/workforce-orchestrate/SKILL.md).

## v5 — 2026-10-20: start yourself, one independence rule, a short default path

Claude policy 1.7.0, Codex policy 1.9.0. Three changes, motivated by a local
benchmark of v4 against no kit on 2026-10-19 (private suite; the numbers below
are observations from that run, not a measurement of v5):

- **An unknown cause is not a reason for an agent.** The cooperator looks first
  and adds an agent only for a need it can name. On a bug known only by its
  symptom, the Codex cooperator handed the investigation to a worker and added
  a reviewer in two of three repeats: 51 and 61 model requests against 16–17
  without the kit, for the same result; its repeat without agents took 19.
- **One independence rule for own and delegated work.** Required review runs
  whatever it costs; the kit itself requires only that the cooperator read every
  delegated diff; an optional reviewer or audit lens needs a named open question.
  The Codex cooperator had added a reviewer under "money, security, data" in 7
  of 12 runs although the project had no review rule; those reviewers received
  diffs that were already fixed, so their value was not measured.
- **A short default path.** The orchestration skill keeps what every task
  needs; the delegation procedure moved to `references/delegation.md`, read in
  full before the first agent; the routing record is read only when a model is
  chosen. The Codex cooperator had read the 12k-character routing record in 12
  of 12 runs, including runs without agents. In its runs without agents the
  extra input over no kit (+12–18%) is of the order of the kit text times the
  number of requests; that is an estimate, not a measurement.

| Source | What it reports, as read | Use here and its boundary |
| --- | --- | --- |
| [Towards a Science of Scaling Agent Systems](https://arxiv.org/html/2512.08296) (v3; journal version in *Nature Machine Intelligence*, 2026-07-24, not read) | 260 runs on six benchmarks: when one agent already succeeds on about 45% or more, more agents lowered results; on SWE-bench Verified every multi-agent design was worse (−2% to −15%); token overhead +58% to +515% | Start yourself; add agents for a named need. Older models; no threshold is transferred. |
| [Evaluating AGENTS.md](https://arxiv.org/html/2602.11988) (2026-02) | Context files: success change not significant, cost +20–23%; tools named in the file get used (1.6 against under 0.01 per task); no dependence on file length | Procedures named on the default path get used, so delegation moves off it instead of only getting shorter. |
| [SWE-CC](https://arxiv.org/html/2610.06193v1) (2026-10) | Functionally correct runs violated 43% of applicable mandatory policies; half of the violations happen in intermediate steps | Required independence stays required and is tracked on the OPEN list. |
| [ParanoiaEval](https://arxiv.org/html/2610.08662) (2026-10) | Excess defensive work in 11–59% of runs; the evidence that makes it unnecessary halves it (24% against 48%); validation owned by CI or maintainer review was repeated regardless; native-harness comparisons only | An optional review needs an open question; validation the project already owns is not repeated. |
| [MCR-Bench](https://arxiv.org/html/2608.27442v1) (2026-08) | Reviewers flag resolved defects as new (38% of state errors) | The reviewer packet says what is already fixed and which checks ran. |
| [Sentry](https://arxiv.org/html/2610.02994v1) (2026-10) | A lesson collection kept in context lowered scores against the same lessons attached at the failure | The delegation procedure is attached at the fork, not loaded for every task. |
| [SkillsBench](https://arxiv.org/html/2602.12670v1) (2026-02) | Curated skills +16 points on average, software engineering +4.5; two or three skills best; comprehensive documentation −2.9 on a small sample | A focused default path. |
| [SkillReducer](https://arxiv.org/html/2603.29919v2) (2026) | In 600 skills: 38.5% rules, 40.7% background, 12.9% examples; moving non-rules to on-demand files cut bodies by 39% with quality not lower for 86% of skills; failures came from examples that act as requirements and rules hidden in examples | Rules stay in `SKILL.md`; procedures and rationale move to a reference; one example per concept, rules stated outside examples. |
| [SkillZip Pro](https://arxiv.org/html/2608.30785) (2026-08) | Compression fails through lost reachability; contracts must stay verbatim | Each moved part has an explicit "read when" line; the packet template is unchanged. |
| [Is Progressive Disclosure All You Need?](https://arxiv.org/html/2607.17598) (2026-07) | One flat level of disclosure helps; a second level hurts | References sit one level below `SKILL.md`. |
| [Skill-use](https://arxiv.org/html/2608.04828) (2026-08) | Triggering a skill and following it fail separately; a partial procedure is worse than none | Delegation is read in full before the first agent. |
| [Token Reduction Is Not Cost Reduction](https://arxiv.org/abs/2607.12161) (2026-07, abstract only); [instruction-compression trial](https://arxiv.org/html/2603.23525v1) (2026-03) | Token cuts did not track billed cost under prompt caching; moderate compression cut cost, aggressive compression did not | v5 is judged by cost per solved task and by requests, not by skill size; the trim is moderate. |

These sources were read on 2026-10-20 through a page-extraction tool that
covers the first 100,000 characters of each HTML version; later sections were
not read. Their results do not establish performance for this kit.

## Route Decision — 2026-10-19

The 1.4.0 draft (Codex policy 1.8.0, Claude policy 1.6.0) uses this objective:

$$
a^*(s)=\underset{a\in A_{\mathrm{allowed}}(s)}{\arg\min}
\left[C_{\mathrm{step}}(s,a)+\mathbb{E}\!\left[V^*(S')\mid s,a\right]\right].
$$

Choose the next allowed action by the expected full cost of reaching the agreed,
verified and delivered outcome. This is a design synthesis, not a formula copied
from one paper or a claim that this instruction pack computes an optimal policy.
`s` describes the available task knowledge; `S'` is the state after observing the
action's result. `V*` denotes the best allowed continuation cost under an assumed
model. That cost is unknown in ordinary use. The instructions use grounded
qualitative comparisons, without invented probabilities or numerical scores.
The [POMDP introduction](https://www.pomdp.org/talks/who-needs-pomdps/index.html)
provides background on decisions under partial information; [metareasoning for
planning](https://arxiv.org/abs/1505.00399) provides background on the cost of
deliberation itself. Neither supplies a fitted transition model for this kit.

### Practical interpretation

Permissions, separately explicit user constraints and applicable mandatory
project rules define admissibility before cost comparison. Recommendations do
not become mandatory solely because a document or skill exists. Required skills
remain required. An action that is already known to leave a necessary prerequisite
unavailable is not made useful by choosing a more capable model.

The working state covers the agreed outcome, observed work, current evidence,
open obligations, permissions and remaining budgets: `(G, X, E, U, P, B)`. These
are conceptual fields in the existing task record, not six required files. For
build/pipeline work, the cooperator retains the record in the permitted task
store and restores it after handoff or compaction. Direct work needs no separate
state file. An obligation closes only with evidence of completion or a sourced
reason it does not apply. Changing workers, reaching the audit cap, submission,
environmental blockage and budget exhaustion preserve unresolved obligations.
New task-relevant dependencies can add obligations; minimizing their count is
not the objective.

Evidence remains useful only for the source, scope and relevant conditions it
actually covers. Reuse a passed check while those conditions hold; recheck
affected conclusions after a relevant source, environment or dependency changes.
Parallel audits require a stable view of their read dependencies, including
relevant uncommitted work. Disjoint write sets alone do not establish that view.
A reviewer verdict cannot replace a missing mandatory check. Once the outcome
and requirements are confirmed, perform the agreed delivery and stop. BLOCKED
and BUDGET_STOP retain unfinished work; they are not zero-cost successful ends.

Cost comparison includes routing, all participating agents, context transfer,
checks, failed attempts, recovery and necessary human work. One script call can
still contain many costly operations. Money, elapsed time and human effort can
conflict; no universal weights are supplied. The policy therefore does not run
an elaborate route search before each routine read. The executable instructions
live under "Choosing the next move" in the
[Codex](../payload/codex/skills/workforce-orchestrate/SKILL.md#choosing-the-next-move) and
[Claude](../payload/claude/skills/workforce-orchestrate/SKILL.md#choosing-the-next-move)
orchestration skills, and the situation table for delegated work in their
`references/delegation.md`; the skills state the rule in words, without the formula.

### Primary research and the limited inference used here

The following September–October 2026 papers motivate parts of the design.
Their results do not establish performance for Agent Cooperator.

| Source | Relevant contribution and boundary of use |
| --- | --- |
| [Jev](https://arxiv.org/html/2610.13092v1) | Evaluates cost of delivered results, including auxiliary work and unsuccessful attempts. Motivates whole-execution accounting; supplies no savings estimate for this kit. |
| [RepoNorm](https://arxiv.org/html/2610.07757v1) | Represents repository norms with scope, conditions and strength. Motivates applicability-aware obligations rather than promoting every convention to a hard constraint. |
| [CaMeLoT](https://arxiv.org/html/2609.18674v1) | Examines action and execution-sequence constraints. Motivates checking necessary transition conditions; this Markdown policy does not reproduce its formal planning machinery. |
| [SemNav](https://arxiv.org/html/2609.31176v1) | Builds task-relative context and connects reuse to repository state. Motivates targeted reading and explicit evidence scope. |
| [SWE-CC](https://arxiv.org/html/2610.06193v1) | Separates functional results from compliance during execution. Motivates tracking process requirements alongside output correctness. |
| [Sentry](https://arxiv.org/html/2610.02994v1) | Distinguishes invocation failures, lack of progress and unsupported actions. Motivates diagnosis before a retry or handoff. |
| [CIPO](https://arxiv.org/html/2610.04991v1) | Learns choices between primitive tools and composed procedures using alternative continuations from a state. Motivates optional skill selection; installing a skill does not reproduce the learned policy. |
| [HEXIS, v2](https://arxiv.org/html/2609.30123v2) | Separates model reasoning from state and transition control. Motivates retained state and explicit conditions; this kit does not add a runtime state machine. |
| [StateWise](https://arxiv.org/html/2610.05241v1) | Examines the validity of stored premises used for continuation. Motivates revisiting affected evidence when its assumptions change. |
| [ParanoiaEval](https://arxiv.org/html/2610.08662v1) | Uses controlled changes in evidence to examine unnecessary defensive work. Motivates paired behavior cases and stopping when task-local requirements are satisfied. |

### Usage provenance and validation limits

The [OpenAI Codex exec mapper at commit
`1b89beea82ae60e0dbeacb38f1ad2eae9dfed377`](https://github.com/openai/codex/blob/1b89beea82ae60e0dbeacb38f1ad2eae9dfed377/codex-rs/exec/src/event_processor_with_jsonl_output.rs)
was inspected on 2026-10-19. `usage_from_last_total()` copies the accumulated
thread counters into `turn.completed.usage`; it returns default zeros when no
usage was captured. A completion label alone does not establish a per-run delta,
and a zero report alone does not prove that no resources were spent.

The Hybrid wrapper consequently replaces cumulative snapshots instead of summing
them and exposes `tokens.status`, nullable run fields, source and scope. Cached
input is included in input and is not added again. Incomplete run evidence is
marked partial; incremental-only events without reliable identity are not
summed. The internal raw `token_count` adapter is exercised by synthetic
fixtures and is not claimed to be a public exec stdout event.

Live measurements on 2026-10-19 (codex-cli 0.163.0, Claude Code 2.1.303):

- A Codex thread keeps counting across `codex exec resume`. A Luna audit run
  reported 79,504 input (69,888 cached) and 406 output tokens; a one-word reply
  on the resumed thread reported 95,762 input and 411 output, that is +16,258
  input and +5 output. The latest `threadTotal` is therefore the running total
  of that agent, and the wrapper's `--baseline <previous result.json>` gives a
  resumed run's own usage by subtraction.
- The token count Claude Code reports for a subagent (`totalTokens`) equals the
  usage of its last request: a `sonnet` worker reported 39,483 (2 input, 537
  cache creation, 37,228 cache read, 1,716 output), while the session's
  `modelUsage` for `sonnet` was 298,092 cache read, 37,765 cache creation and
  9,856 output. The count is the agent's context size, not its spend; ceilings
  compare the latest count and never add counts across continuations.
- Claude Code reads `AGENTS.md` only when the project has no `CLAUDE.md`
  (checked with marker files in both arrangements).
- Kit versus a plain session on a real 16-file mechanical fix in a private
  TypeScript service (9 lint errors plus 25 async route handlers), one run each,
  same model and effort, all results green: Opus 5.5 took 4:42 and $0.68 alone,
  6:18 and $0.98 with the kit at `0d1e02f`, 7:48 and $1.48 at `4232092`;
  GPT-6.1 Sol took 3:33 and about $0.41 alone, 9:39 and about $1.76 at
  `0d1e02f`, 7:10 and about $1.59 at `4232092`. Both cooperators had
  classified the work as `build`. This is why mechanical changes are now
  `direct`.
- A known 49-file change (178 warnings of two behavior-sensitive lint rules,
  same requirements, one run each): Opus 5.5 alone made 87 tool calls and 88
  model requests in 11:12; with the kit, a cooperator, three workers, and a
  reviewer made 179 calls and 181 requests in 17:32. GPT-6.1 Sol alone made 45
  calls and 41 requests in 8:44; with the kit, 228 calls and 166 requests in
  12:05 (three Sol xhigh workers, a Sol reviewer, and Astra stage acceptance).
  The mean input per request fell with the team (Opus 99.6k to 53.8k, Sol
  79.3k to 70.5k) but the number of requests rose two to four times. No
  worker hit its budget, so the ladder was not exercised. This is why size no
  longer justifies a team and every agent needs a named reason.

Behavior cases compare decisions from states that differ in one material fact,
such as current versus stale evidence or completed versus missing required work.
Installer tests establish installation behavior; runner tests establish parsing
and process boundaries. Neither proves agent adherence, optimality, effective
model availability, or reduced cost. Measuring a policy change requires matched
tasks, outcome and obligation checks, actual usage from all participants,
rework and elapsed time. No before/after savings result is claimed here.

## Live configurations — historical survey, 2026-09-17

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

## Historical policy rationale

Items 1–9 describe the 2026-09-17 design; items 10–12 record later project reports.
They explain the evolution of the kit. Current budgets and transition rules in
the orchestration skill supersede earlier round-based escalation and unconditional
continuity statements here.

1. **Classify before orchestrating.** The surveyed setups used a gate (PAIR/BUILD/
   PIPELINE, DIRECT/SINGLE/BATCH/EPIC). The kit uses `direct` / `build` /
   `pipeline`, and `direct` never spawns agents.
2. **Brain/worker, not a tree of general-purpose agents.** An expensive brain
   plans, briefs, integrates, and accepts; cheaper workers implement in fresh
   contexts with explicit scope. The brain does not write product code outside
   `direct` work.
3. **Agent continuity for fix rounds (2026-09-17).** The early design returned
   findings to the same worker and reviewer via SendMessage, retaining context
   for correction deltas. It kept rounds 1–3 and escalated on round 4. That
   escalation rule is superseded: current continuity is subject to per-tier,
   per-block budgets and the documented handoff, including fixes after submission.
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
9. **Cost honesty.** The reported experiment illustrates orchestration overhead
   for its particular task and configurations. It does not establish a general
   multiplier. The kit does not promise savings and asks for actual `/cost` or
   `/usage` evidence instead.
10. **Only winning audit lenses play again (2026-10-11).** Running every lens
    every round re-audited clean areas: in live use a lens that had already
    found nothing real kept being re-run on fixes made for another lens. Round
    1 runs every lens; after that a lens continues only while it finds
    something real, and the reviewer covers the whole diff afterwards.
11. **Hybrid runs Codex through a wrapper that always exits (2026-10-11).** In
    live use a cooperator started Codex in the background and waited hours for
    the completion notification while Codex waited for input. `codex exec`
    (codex-cli 0.162.0, checked 2026-10-11) reads stdin until end of input when
    stdin is piped, and the user's config can enable MCP tools that ask for
    approval. The wrapper feeds stdin from a file, sets
    `approval_policy="never"`, a read-only sandbox, and `--ignore-user-config`,
    and ends silent, input-requesting, or overlong runs, so the background job
    always reports back. `codex exec resume` has no `-s` or `-C` flag: the
    sandbox is set through `-c sandbox_mode=...`, and the run starts in the
    project root because resume filters sessions by working directory.
12. **Partial audit coverage (2026-10-12).** A project report described a
    120-file block receiving 46 audit cycles: each
    Haiku auditor stopped at its turn limit after a part of the block and
    reported as if it had covered the whole; the next one started from zero,
    reread everything, found "new" places in another part, and the cooperator
    sent each part's findings to the worker as a new round. Minor wording
    without a rule was accepted as findings. This motivated packets with
    `STATUS: complete | partial`, NOT_REACHED, an explicit tool-call budget,
    and continuation on unread files. Native turn limits are a separate counter.
    Current policy
    continues the same auditor within budget and permits a token-ceiling
    handoff without restarting coverage. A round ends only when every lens is
    complete, and only findings with a quoted rule count (the rest are NOTES).
