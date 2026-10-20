# Routing and the work packet (Codex)

`{{CODEX_HOME}}/codex-workforce/profiles.json` is the routing record; this file
holds its defaults. A model release updates the record, not the workflow.
Read the record only to route outside the defaults below.

## Presets

| Role | Economy (default) | Standard |
| --- | --- | --- |
| Cooperator (user-facing session) | `gpt-6.1-sol`, high | `gpt-6.1-sol`, high |
| Probe (`workforce_probe`) | `gpt-6-luna`, medium; `gpt-6.1-sol` when judgment is needed | same |
| Worker (`workforce_worker`) | `gpt-6-luna`, xhigh | `gpt-6.1-sol`, xhigh |
| Worker ladder | Luna → Sol | Sol |
| Audit lens (`workforce_auditor`, on demand) | `gpt-6-luna`, xhigh | same |
| Block reviewer (`workforce_reviewer`, MODE=block) | `gpt-6.1-sol`, xhigh | same |
| Stage reviewer (`workforce_reviewer`, MODE=stage) | `gpt-6.1-sol`, xhigh, only for an integration part no block review covered | same |
| Open design | you decide architecture, block boundaries, and how blocks interact before briefing; the worker keeps bounded search, reproduction, the local way to implement, and testing its hypotheses | same |

Presets are starting recommendations. A named profile is an approach preference;
the user's explicit model, effort, and budget limits are binding. Economy is the
default: Sol thinks, judges, and integrates, and Luna reads and types at
xhigh{{#reviewBlock}}; Sol at xhigh reviews the blocks light workers submit{{/reviewBlock}}{{^reviewBlock}}; block review
is off in this install{{/reviewBlock}}{{^reviewStage}}, and so is stage review{{/reviewStage}}. Audit lenses run only on demand
(delegation, step 6). The native launch layers `codex -p workforce-economy` and
`codex -p workforce-standard` set the cooperator's model and effort for that
launch and the wait limits (tools); a prompt never changes the running model,
so report a mismatch instead of claiming one. No model above Sol is in this
kit. If Sol is unavailable for a review that must run, the block is not
independently reviewed: say so and ask the user; your own reading of the diff
is not an independent review.

Prices per MTok (checked 2026-10-20): GPT-6.1 Sol $2 in / $10 out, cached
$0.10; GPT-6 Luna $0.10 / $0.50, cached $0.01 (effort up to xhigh); above 272k
input tokens a request costs about twice. Role files omit model and effort on
purpose: the spawn sets them. Sol and Luna default to medium, so set effort on
every spawn: workers, auditors, and reviewers run at xhigh.

## Selection

1. Explicit choice, native launch profile, active task choice, or standing
   preference wins; the latest instruction takes precedence.
2. Otherwise Economy, also for "work autonomously", "choose yourself", and
   unattended runs.
3. Standard on the user's choice. A stored or launched choice of Enhanced
   (removed in policy 1.12.0) runs as Standard; say so.
4. Ask once, in the user's language, only before long multi-stage work where
   the choice materially changes the approach and nothing above applies.

Keep PROFILE, its source, and WORK_CLASS in the task state; agents inherit them
and never ask the user.

## Escalation and budgets

Worker budgets per block, counted by the cooperator:

| Tier | Tool calls | Attempts | Token ceiling | Next tier |
| --- | --- | --- | --- | --- |
| Luna | 600 per run, 1800 per block | 3 | 400k | Sol xhigh |
| Sol | no cap | 3 | 500k | the cooperator re-plans or asks the user |

An attempt is spent only by a run that ends without a result: the worker hit
its BUDGET, returned `STATUS: handoff`, or its fix left the finding open. A
submitted block, or a fix that closes its finding, spends no attempt. Tool
calls and tokens count for every run on the block, fixes included. Asking a
stopped worker only for its HANDOFF is not a new run. The counters stay with
the block when it is blocked, submitted, handed off, or put aside for another
block.

Tokens: count the new tokens a worker's thread has processed (input minus
cached input, plus output), all its runs together; a continued thread keeps
counting from its previous total. Use the usage the runtime reports for the
agent; when it reports none, go by attempts and tool calls and say so in the
report. These budgets are instructions; Codex does not enforce them.

The next tier gets a fresh spawn: the original block packet, the current
snapshot, the cooperator's APPROACH, and the worker's HANDOFF; nothing else from
earlier runs. Re-planning does not reset spent budget or drop the outcome.

Sol at xhigh is the top tier. When it does not finish a block, a pricier run is
not the next step: find the cause (the stop, the brief, the split, the way of
checking) and re-plan, or ask the user.

Audit lenses (on demand): a lens with nothing real is retired for the block. An auditor that returns `STATUS: partial` or stops early
is continued with `followup_task` on its NOT_REACHED files. A Luna auditor that
reaches 400k on a block hands its lens to a fresh Sol xhigh auditor on the same
snapshot and round, with its NOT_REACHED files; its findings stay with the
cooperator. Report usage from `/usage` when asked.

## Work packet

```text
TASK: identifier and assignment version; task state file (pipeline)
TIER / RUN: worker model; run number and attempts spent on this block (worker)
WORK_CLASS: build | pipeline
PROFILE / PROFILE_SOURCE: economy | standard | custom; explicit | inherited | preference | automatic
REQUEST_KIND: analysis | implementation
ROOT / BRANCH: absolute checkout and agreed branch
USER_OUTCOME: what the user asked for
GOAL: the complete result this block owns
ACCEPTANCE_EXAMPLE: concrete before/after
SCOPE / OUT_OF_SCOPE: what this block covers; what it must not do
PROJECT_RULES: repository instruction files to read first
CONTRACT: what the change must keep (behavior, interfaces, data at the boundaries), quoted with its source (the task, a rule file)
INPUTS / SNAPSHOT: exact sources, revision, relevant dirty diff; the tree to read (reviewer: tree:<hash> from scripts/accept.mjs snapshot)
WRITE_SET / DO_NOT_TOUCH: owned files; exclusions
CHECKS: commands with cwd and expected result
CONSTRAINTS: the limits of the touched areas that can change how the work is done, each once with its scope and source: a check and the files it covers; a size limit with the file's current value (bot.ts 2998 of 3000 lines, scripts/check-architecture.cjs:351); a limit still to find, as the worker's first step
TRAPS: what you saw that can go wrong (a behavior-changing rewrite)
RETURN: concise result, evidence, gaps
MODE: block | stage (reviewer)   LENS: docs | task | conventions (auditor)
REVIEW (reviewer): acceptance of a light worker's block | required (<rule or request>) | question (<what is in doubt>); what is already fixed; checks already run and the tree they ran on; the audit log
FILES / BUDGET (auditor): assigned files; tool calls before returning STATUS: partial
BUDGET (worker on a budgeted tier): tool calls before returning STATUS: handoff
APPROACH / HANDOFF (escalated worker): the cooperator's decision; the previous tier's handoff
```

Agents share the checkout; use worktrees only for a concrete write conflict. An
audit beside a running writer follows step 4 of [delegation](delegation.md).
