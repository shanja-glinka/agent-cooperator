# Profiles, models, and task ownership

The product name and role names are independent of model generations. Codex uses
GPT-6.2 Sol and GPT-6 Luna. This 1.9.1 release updates Codex task routing; the
Claude Code payload remains the one shipped with 1.8.1. See
[claude-code.md](claude-code.md) for its profile table and [research.md](research.md)
for the evidence behind it. The progress critic is Codex-only. Codex has no
GPT-6.2 Astra route or Enhanced profile. Stage review runs only for an integration
part no block review covered. The cooperator runs project-wide checks once per
iteration and sends each failure to the worker that owns the failing file.

[`payload/codex/profiles.json`](../payload/codex/profiles.json) is the machine-readable routing
policy. [`dispatch.md`](../payload/codex/skills/workforce-orchestrate/references/dispatch.md)
explains its use and the contextual selection rules. Both ship with the release.
This is configuration and agent guidance, not a scheduler that intercepts tool calls.
The [orchestration skill](../payload/codex/skills/workforce-orchestrate/SKILL.md)
defines action selection, open obligations, and completion; profiles recommend the
model and effort for an action within those requirements.

## Standard

Economy and Standard are optional starting recommendations, not exhaustive or
binding model/effort schedules. Choosing a profile expresses an approach preference;
it does not by itself require its exact models, efforts, or team composition. Adapt
routing to the task, available capabilities, and user limits, or use a custom setup
without a named profile. Only separately explicit model/effort/budget constraints
make those settings mandatory. Keep review independence and verification requirements.

Standard is the user's choice. GPT-6.2 Sol high owns orchestration and GPT-6 Luna
handles read-only lookups (Sol when judgment is needed). Choose authorship by the
deliverable's acceptance boundary:

- A small, independently provable edit with its own check stays with the
  cooperator; it has no default reviewer.
- A connected deliverable whose semantic preservation can only be accepted on
  combined behavior stays with the Sol cooperator as sole author. After project
  checks pass, a fresh independent Sol reviewer at xhigh reads the whole immutable
  diff, the original observable contract, and the check results. This review is
  independent of `reviewBlock`; an explicit user prohibition on review overrides
  it. Corrections are checked by the same reviewer on the delta after affected
  checks pass.
- Genuinely independent deliverables with their own end-to-end acceptance and
  checks may go to Luna workers at xhigh. Do not split shared behavior just to
  parallelize it. General delegated block and stage reviews follow the installed
  switches.

A build or pipeline gets one Sol xhigh progress critic from 45 minutes of work on,
every 45 minutes and after each compaction. It checks whether the work still moves
toward the user's outcome. Stage review, also on Sol, runs only for an integration
part no block review covered.

## Enhanced (removed)

Enhanced was removed in policy 1.12.0. A stored or launched choice of it runs as
Standard.

## Economy

Economy is the default preset. It applies when nothing else does, including
unattended runs. You can also launch it explicitly with `codex -p workforce-economy`
or keep it as a standing preference. Sol high is the cooperator: it thinks, judges,
and integrates. Luna xhigh is the worker, reading and typing at xhigh; Sol
reviews the blocks Luna submits (`reviewBlock` on, the default), at high or xhigh
as the cooperator chooses for each review. Luna also
runs an audit lens when an area needs one. A build or pipeline gets one Sol xhigh
progress critic from 45 minutes of work on, every 45 minutes and after each
compaction: it checks whether the work still moves toward the user's outcome or
has dug in. The critic does not replace review. Sol is the stage reviewer, and only for an
integration part no block review covered (`reviewStage` on). A Luna
worker has 600 tool calls per run, 1800 per block, three attempts, and 400k tokens
per block; a block that exhausts it moves to Sol xhigh.

## Complex

Complex is Codex routing for a genuinely difficult, independently acceptable
delegated block: interacting constraints, complex concurrency, long tracing, or
bounded design decisions. In the absence of an explicit profile, active task
choice, or applicable standing preference, Codex uses Economy for described work
and selects Complex automatically when that difficult-block criterion applies;
large mechanical volume alone is not enough.
The cooperator remains on Sol and chooses low, medium, or high effort for each
Sol worker from the task. An explicit Economy or Standard choice takes precedence.
A connected deliverable stays with the Sol owner route, and an explicit
`codex-workforce-owner` launch keeps its single Sol author even when Complex might
otherwise apply.

## Worker ladder and handoff

| Tier | Tool calls | Attempts | Token ceiling | Next tier |
| --- | --- | --- | --- | --- |
| Luna | 600 per run, 1800 per block | 3 | 400k | Sol xhigh |
| Sol | no cap | 3 | 500k | the cooperator re-plans or asks you |

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
Earlier reports, review rounds, and transcripts stay with the cooperator. The
[dispatch reference](../payload/codex/skills/workforce-orchestrate/references/dispatch.md)
has the details, including the auditor handoff at 400k.

## Selection contract

This selection contract applies to Codex. Claude Code keeps its own routing in
[claude-code.md](claude-code.md).

Reuse an explicit task or native launch profile, active task choice, or applicable
standing preference; explicit model, effort, and budget limits remain binding.
Otherwise Codex uses Economy for described work, including autonomous instructions
and unattended execution. When a genuinely difficult independently acceptable
delegated block meets the Complex criterion above, the cooperator selects Complex
for that block without asking the user. A connected deliverable follows the
same single-owner route across profiles and in an unprofiled session. An explicit `codex-workforce-owner` launch selects
the same single-owner route. Preserve the applicable choice and its source across
continuations.

Ask once only for long-running, multi-stage work with substantial unresolved solution
choices and material approach or resource impact, when no explicit choice or
applicable automatic route resolves it. State the unresolved decision and wait before
dependent work. Continue independent authorized prerequisites. Duration, production
risk, urgency, and step count alone do not justify asking the user to choose a profile.

The installer does not change base model settings or invent a permanent user preference.
Economy is a routing default, not evidence that the running model changed. Examples:

```text
Create and verify backups, then enable the maintenance page. Work autonomously.
Fix the described validation error.
Use Standard. Resolve the ambiguous contract, then complete the migration.
Plan and implement a new platform across multiple stages; architecture is undecided.
Analyze these options only. Do not edit files.
```

The first two proceed without a profile question; the third honors Standard; the
fourth qualifies for a question only if no existing choice or automatic route
resolves its substantial design uncertainty; the fifth remains analysis-only.

## Actual model settings

Current Codex CLI supports named config layers. The kit installs three optional layers:

```sh
codex -p workforce-standard
codex -p workforce-economy
codex -p workforce-complex
```

For one explicitly selected connected deliverable, the package also provides
`codex-workforce-owner`. It launches Codex with `workforce-standard` and appends a
packaged instruction that assigns the full task to one Sol author followed by an
independent Sol xhigh full-diff review. The command takes the task as one argument;
its `exec` form forwards native Codex options. It is optional and is not invoked by
ordinary installed instructions. See [installation](installation.md).

All three layers set `[features.multi_agent_v2]` wait limits: a wait returns as soon as an
agent sends a message or finishes, and otherwise lasts 20 minutes.

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

## The cooperator and review

The orchestrator is the cooperator: it cooperates agents so that they do the
work. After a worker submits a block, the cooperator chooses what happens next.

```text
Worker submits a block
  │
  ▼
Cooperator runs the project's checks once for the blocks submitted together;
a failed check goes back to the worker that owns the failing file
  │
  ▼
Cooperator (the orchestrator) chooses:
  a) review this block              → one review run for the blocks ready
                                      together (with reviewBlock off, the
                                      cooperator reads the whole diff)
  b) small local change, clear contract, checks passed
                                   → accept on the cooperator's own reading
  c) next block to the worker      → and review the submitted blocks in
                                     parallel (only if that block changes
                                     nothing the review reads; else a snapshot)

Review: the block reviewer (GPT-6.2 Sol, high or xhigh) reads the whole diff. Real
findings go to the same worker as one bundle; the same reviewer checks the
fixes and what they touch.
```

Audit lenses run on demand: docs, task, or conventions, and only for an area
that the checks and the review do not cover. Each lens reports everything with
`file:line` and the rule or document behind it. The cooperator judges each
finding: it is real when it is in the diff or caused by it, breaks a named rule,
document, or acceptance line, and reproduces by a check or a concrete scenario.
The cooperator takes only real findings; theoretical, hypothetical, and
out-of-scope ones are rejected. Real findings go to the same worker as one
bundle. A lens with nothing real is retired for that block; one with real
findings may check the fix. A round ends only when its auditor returns
`STATUS: complete` (every assigned file read); an auditor that hits its limit is
continued where it stopped, never replaced.

With `reviewBlock` on, the block reviewer then reads the whole diff, fixes
included, together with the earlier findings and their outcome. It checks the change
against CONTRACT, the requirements the packet quotes with their sources, and lists every
changed protective site from the diff (a removed or changed condition, a changed
fallback, a normalization, null becoming undefined, a changed order of evaluation) with
one verdict: kept, violated, or not established. Checks the
project requires always run, and a reviewer's "accepted" does not replace one
that has not passed. A small local change with a clear contract and passing
checks may be accepted on the cooperator's own reading of the diff; a review that
the project, the user, or the task requires always runs. A review may end with
`ACCEPTANCE: accepted_if <check> on tree:<hash>`; the cooperator closes it with
`scripts/accept.mjs` when a recorded run of that check passed on the reviewed tree,
with no extra reviewer call.

## Complete blocks, proportional verification

Every implementation packet includes the user's original outcome, an acceptance
example, exact inputs, ownership, and intermediate results that do not count as done.
With `reviewBlock` on (the default), every block a light worker submits is
reviewed before it is accepted, and blocks ready together share one review run;
the review reads the whole diff. With `reviewBlock` off, the cooperator accepts
the block on its checks and its own reading of the whole diff. A stage review on
Sol runs only when `reviewStage` is on and an integration part (blocks that
interact, the cooperator's own integration edits, or a shared contract) was not covered
by a block review; one review of the final merged diff closes both.

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
