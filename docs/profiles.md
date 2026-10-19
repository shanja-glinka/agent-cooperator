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

## Standard

Standard and Enhanced are optional starting recommendations, not exhaustive or
binding model/effort schedules. Choosing a profile expresses an approach preference;
it does not by itself require its exact models, efforts, or team composition. Adapt
routing to the task, available capabilities, and user limits, or use a custom setup
without a named profile. Only separately explicit model/effort/budget constraints
make those settings mandatory. Keep review independence and verification requirements.

Use when the requirements and solution are sufficiently described. GPT-6.1 Sol high
owns orchestration, GPT-6 Luna owns read-only lookups (Sol when judgment is needed),
Sol implements at xhigh, Sol high independently reviews complete blocks, and Astra
high accepts major stages. A bounded open decision can still receive Astra high
assistance. The Sol orchestrator is a deliberate cost choice: it holds the longest
context and costs about five times less per token than Astra; the places where
Astra's reasoning changes the outcome keep Astra.

## Enhanced

The same workers, block reviewers, and acceptance flow remain. Astra high orchestrates
and owns bounded uncertain design or algorithm work. Once a contract is clear, ordinary
implementation and consumer migration return to Sol. Use xhigh/max only with a
stated unresolved question and expected benefit, respecting the user's limits.

The distinction is solution uncertainty. Many lines of code, a long runtime, or a
sophisticated algorithm do not automatically require Enhanced.

## Economy

The cheapest preset, chosen only by the user (explicitly, with
`codex -p workforce-economy`, or as a standing preference). Sol high is the
cooperator, Luna xhigh implements, and auditors and reviewers stay as in
Standard. A Luna worker has 600 tool calls per run, three runs, and 400k tokens
per block; a block that exhausts it moves to Sol xhigh, then to Astra.

## Worker ladder and handoff

| Tier | Per run (BUDGET) | Runs | Token ceiling | Next tier |
| --- | --- | --- | --- | --- |
| Luna | 600 tool calls | 3 | 400k | Sol xhigh |
| Sol | none | 3 | 500k | Astra high |
| Astra | none | 3 | none | the cooperator re-plans or asks you |

Tokens are summed over one worker's runs on one block; the ceiling applies even
when runs are left. A worker at its limit returns `STATUS: handoff` with DONE,
STOPPED_AT, TRIED, OPEN, and NEXT. The cooperator treats an exhausted tier as
evidence the block is hard: it reads the handoff, decides the APPROACH (same
path with more effort, a different route, or a split or re-scoped block), and
spawns the next tier fresh with the original packet, APPROACH, and HANDOFF only.
Earlier reports, audit rounds, and transcripts stay with the cooperator.

## Selection contract

Reuse an explicit task or native launch profile, active task choice, or applicable
standing preference. Concrete, sufficiently specified tasks and small fixes proceed
with Standard without asking. Autonomous instructions and unattended execution
allow the agent to choose Standard for clear solutions or Enhanced for substantial
unresolved design. Preserve the choice and its source across continuations.

Ask once only for long-running, multi-stage work with substantial unresolved solution
choices where the profile materially changes approach or resource use, if no prior
choice or delegated selection applies. Explain both profiles and wait for an explicit
answer before dependent work. Continue independent authorized prerequisites. Duration,
production risk, urgency, and step count alone do not justify the question.

The installer does not change base model settings or invent a permanent user preference.
Standard is a routing default, not evidence that the running model changed. Examples:

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

Current Codex CLI supports named config layers. The kit installs two optional layers:

```sh
codex -p workforce-standard
codex -p workforce-enhanced
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
  a) audit this block              → auditors, up to 3 rounds
  b) no audit                      → next work to the worker
  c) next block to the worker      → and auditors in parallel on
                                     1, 2, 3 or N submitted blocks

Audit game: auditors (Haiku 5.5 / GPT-6 Luna, xhigh) report everything
they find through one lens each: docs, task, conventions.
Round 1 runs every lens. Then each lens plays on its own:
real findings → that lens won, the same worker fixes, only winners
                play the next round;
nothing real  → that lens lost and is retired for this block.
Every lens lost (or round 3 done) → the block passes the audit.
A round ends only when each auditor has read all its files; an auditor
that hits its turn limit is continued where it stopped, never replaced.
The cooperator takes only real findings; theoretical, hypothetical, and
out-of-scope ones are rejected.
```

Auditors report everything they find with `file:line` and the rule or document
behind it. The cooperator judges each finding: it is real when it is in the
diff or caused by it, breaks a named rule, document, or acceptance line, and
reproduces by a check or a concrete scenario. Real findings go to the same
worker as one bundle. Only the lenses that won a round play the next one, with
what was accepted and what was rejected; a lens that found nothing real is
retired for that block. The reviewer then reads the diff together with
the audit log.

## Complete blocks, proportional verification

Every implementation packet includes the user's original outcome, an acceptance
example, exact inputs, ownership, and intermediate results that do not count as done.
Independent review happens after a substantial block is ready, not after every edit. An independent Astra stage review checks the original outcome.

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
