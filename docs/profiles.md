# Profiles, models, and task ownership

The product name and role names are independent of model generations. The current
release combines GPT-6 Astra, Sol, and Luna for Codex. The Claude Code edition uses the
same roles with Claude model tiers; see [claude-code.md](claude-code.md) for its
profile table and [research.md](research.md) for the evidence behind it. Future
releases can update model policy without changing the install command or renaming
your agents.

[`payload/codex/profiles.json`](../payload/codex/profiles.json) is the machine-readable routing
policy. [`dispatch.md`](../payload/codex/skills/workforce-orchestrate/references/dispatch.md)
explains its use and the contextual selection rules. Both ship with the release.
This is configuration and agent guidance, not a scheduler that intercepts tool calls.
The [orchestration skill](../payload/codex/skills/workforce-orchestrate/SKILL.md)
defines action selection, open obligations, and completion; profiles recommend the
model and effort for an action within those requirements.

## Standard

Standard and Enhanced are optional starting recommendations, not exhaustive or
binding model/effort schedules. Choosing a profile expresses an approach preference;
it does not by itself require its exact models, efforts, or team composition. Adapt
routing to the task, available capabilities, and user limits, or use a custom setup
without a named profile. Only separately explicit model/effort/budget constraints
make those settings mandatory. Keep review independence and verification requirements.

Standard is the user's choice. Use it when the requirements and solution are
sufficiently described. GPT-6.1 Sol high owns orchestration, GPT-6 Luna owns
read-only lookups (Sol when judgment is needed), Sol implements at xhigh, Sol at
xhigh independently reviews complete blocks, and Astra high accepts major stages.
A bounded open decision can still receive Astra high assistance. The Sol
orchestrator is a deliberate cost choice for the longest context: the per-token
input/output prices recorded on 2026-10-20 give a 5:1 Astra-to-Sol ratio. That
price ratio does not establish the full cost of a completed result. Stage
acceptance and uncertain design keep their recommended Astra roles.

## Enhanced

The same workers, block reviewers, and acceptance flow remain. Astra high orchestrates
and owns bounded uncertain design or algorithm work. Once a contract is clear, ordinary
implementation and consumer migration return to Sol. Raising **Astra above high**
to xhigh/max requires a stated unresolved question and expected benefit, respecting
the user's limits. Sol workers and Luna audit roles still use their
profile's xhigh setting; the ordinary worker ladder to Astra high is unchanged.

The distinction is solution uncertainty. Many lines of code, a long runtime, or a
sophisticated algorithm do not automatically require Enhanced.

## Economy

Economy is the default preset. It applies when nothing else does, including
unattended runs. You can also launch it explicitly with `codex -p workforce-economy`
or keep it as a standing preference. Sol high is the cooperator: it thinks, judges,
and integrates. Luna xhigh is the worker and the auditor, reading and typing at
xhigh; Sol at xhigh reviews every submitted block; Astra high is the stage
reviewer for pipelines whose blocks interact. A Luna worker has 600 tool calls per
run, three runs, and 400k tokens per block; a block that exhausts it moves to Sol
xhigh, then to Astra.

## Worker ladder and handoff

| Tier | Tool calls | Attempts | Token ceiling | Next tier |
| --- | --- | --- | --- | --- |
| Luna | 600 per run, 1800 per block | 3 | 400k | Sol xhigh |
| Sol | no cap | 3 | 500k | Astra high |
| Astra | no cap | 3 | none | the cooperator re-plans or asks you |

Only a run that ends without a result spends an attempt: the worker hit its
BUDGET, returned `STATUS: handoff`, or its fix left the finding open. A
submitted block, or a fix that closes its finding, spends none, but its tool
calls and tokens count. Tokens are the new tokens the worker's thread has
processed (input minus cached input, plus output), all its runs together; a
continued Codex thread keeps counting from its previous total. These budgets
are instructions; Codex does not enforce them.

A worker at its limit returns `STATUS: handoff` with DONE, STOPPED_AT, TRIED,
OPEN, and NEXT. The cooperator treats an exhausted tier as evidence the block is
hard: it reads the handoff, finds the cause, decides the APPROACH (same path
with more effort, a different route, or a split or re-scoped block), and spawns
the next tier fresh with the original packet, APPROACH, and HANDOFF only.
Earlier reports, audit rounds, and transcripts stay with the cooperator. The
[dispatch reference](../payload/codex/skills/workforce-orchestrate/references/dispatch.md)
has the details, including the auditor handoff at 400k.

## Selection contract

Reuse an explicit task or native launch profile, active task choice, or applicable
standing preference. Concrete, sufficiently specified tasks and small fixes proceed
with Economy without asking. Autonomous instructions and unattended execution
allow the agent to choose Economy for described work or Enhanced for substantial
unresolved design. Standard is chosen by the user. Preserve the choice and its
source across continuations.

Ask once only for long-running, multi-stage work with substantial unresolved solution
choices where the profile materially changes approach or resource use, if no prior
choice or delegated selection applies. Explain both profiles and wait for an explicit
answer before dependent work. Continue independent authorized prerequisites. Duration,
production risk, urgency, and step count alone do not justify the question.

The installer does not change base model settings or invent a permanent user preference.
Economy is a routing default, not evidence that the running model changed. Examples:

```text
Create and verify backups, then enable the maintenance page. Work autonomously.
Fix the described validation error.
Use Enhanced. Resolve the ambiguous contract, then complete the migration.
Plan and implement a new platform across multiple stages; architecture is undecided.
Analyze these options only. Do not edit files.
```

The first two proceed without a profile question; the third honors Enhanced; the
fourth qualifies for the question absent a preference or delegated selection; the
fifth remains analysis-only.

## Actual model settings

Current Codex CLI supports named config layers. The kit installs three optional layers:

```sh
codex -p workforce-standard
codex -p workforce-enhanced
codex -p workforce-economy
```

Launching one is an explicit profile choice. It sets the root model/effort for that
launch and tells the agent which policy to follow. It does not modify base settings.
If a client lacks these config layers, set the root model and effort through that
client's controls. A prompt alone cannot change a running model. Effective routing
must be reported as unverified if the runtime doesn't expose it.

Roles omit model/effort intentionally, because Codex role configuration can override
spawn parameters. The orchestrator supplies actual model/effort per role. A runtime
without those capabilities cannot provide this routing; the agent must disclose
the available settings when material. A user-selected profile also allows adaptation;
explicit strict model/effort/budget requirements need the required
setting or an accepted fallback before dependent work. Do not claim exact routing.

## The cooperator and the audit game

The orchestrator is the cooperator: it cooperates agents so that they do the
work. After a worker submits a block, the cooperator chooses what happens next.

```text
Worker submits a block
  │
  ▼
Cooperator (the orchestrator) chooses:
  a) audit and review this block   → auditors, up to 3 rounds, then review
  b) small local change, clear contract, checks passed
                                   → accept on the cooperator's own reading
  c) next block to the worker      → and audit and review in parallel on
                                     1, 2, 3 or N submitted blocks
                                     (only if that block changes nothing
                                     the audit reads; else a snapshot)

Audit game: auditors (GPT-6 Luna, xhigh) report everything they find
through one lens each: docs, task, conventions.
Round 1 runs every lens. Then each lens plays on its own:
real findings → that lens won, the same worker fixes, only winners
                play the next round;
nothing real  → that lens lost and is retired for this block.
Every lens lost, or round 3 done → the audit is over; real findings
not yet fixed still go to the worker, and the review reads the fix.
A round ends only when each auditor has read all its files; an auditor
that hits its limit is continued where it stopped, never replaced.
The cooperator takes only real findings; theoretical, hypothetical, and
out-of-scope ones are rejected.

Review: the block reviewer (GPT-6.1 Sol, xhigh) reads the whole diff with
the audit log. Real findings go to the same worker as one bundle; the same
reviewer checks the delta.
```

Auditors report everything they find with `file:line` and the rule or document
behind it. The cooperator judges each finding: it is real when it is in the
diff or caused by it, breaks a named rule, document, or acceptance line, and
reproduces by a check or a concrete scenario. Real findings go to the same
worker as one bundle. Only the lenses that won a round play the next one, with
what was accepted and what was rejected; a lens that found nothing real is
retired for that block. The reviewer then reads the whole diff, fixes included,
together with the audit log. Checks the project requires always run, and a
reviewer's "accepted" does not replace one that has not passed. A small local
change with a clear contract and passing checks may be accepted on the
cooperator's own reading of the diff; a review that the project, the user, or
the task requires always runs.

## Complete blocks, proportional verification

Every implementation packet includes the user's original outcome, an acceptance
example, exact inputs, ownership, and intermediate results that do not count as done.
Every block a light worker submits is reviewed before it is accepted; the review
reads the whole diff. A stage review on Astra high checks the original outcome,
and runs only when blocks interact in ways no block review saw.

A minimal isolated test can establish a component contract; it cannot by itself
prove a real consumer was switched. An inventory can support planning; it cannot
stand in for implementation. Review reports state the scope they actually prove.
Findings return to the same owner as one packet, followed by affected checks and
review of the correction's impact. Required project acceptance gates still apply.

## What the research does and does not establish

Higher reasoning effort can reduce the number of attempts enough to offset a more
expensive request. That happened in the [ARC Astra benchmark](https://arcprize.org/blog/astra).
A [coding experiment](https://dev.to/shinpr/switching-from-gpt-56-sol-to-gpt-6-astra-start-with-medium-effort-25ao)
instead favored medium over high on cost for its particular task. Neither establishes
a universal best effort or a guaranteed reduction in subscription quota usage.

Use available total usage, accepted outcomes, and rework as evidence. Do not invent
token measurements. The kit has no telemetry collection, paid API client, or billing
integration, and ordinary installer tests never launch models.
