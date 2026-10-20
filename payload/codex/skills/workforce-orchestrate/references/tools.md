# Tools in Codex

Read the real tool schema in the session; fields vary by runtime. Roles installed
by this kit: `workforce_worker`, `workforce_probe`, `workforce_auditor`,
`workforce_reviewer`.

## V2: task_name, fork_turns, followup_task

```json
{ "task_name": "consumer_cutover", "agent_type": "workforce_worker",
  "model": "gpt-6-luna", "reasoning_effort": "xhigh",
  "fork_turns": "none", "message": "<work packet>" }
```

```json
{ "task_name": "review_consumer_cutover", "agent_type": "workforce_reviewer",
  "model": "gpt-6.1-sol", "reasoning_effort": "xhigh",
  "fork_turns": "none", "message": "<packet with MODE: block, REVIEW, SNAPSHOT, the audit log>" }
```

```json
{ "task_name": "audit_conventions", "agent_type": "workforce_auditor",
  "model": "gpt-6-luna", "reasoning_effort": "xhigh",
  "fork_turns": "none", "message": "<packet with LENS, SNAPSHOT, SCOPE, PROJECT_RULES, prior rounds>" }
```

- `followup_task({"target":"<task>","message":"<findings or next round>"})`
  continues an agent, including an idle one, with its context: the same worker
  for fixes, an auditor that returned `STATUS: partial` or stopped early (with
  its NOT_REACHED files), only the auditors whose lens won the last round for
  the next round, the same reviewer for the delta. It does not take model or
  effort overrides; for a different model, spawn a fresh task.
- Escalation is a fresh spawn on the next tier (`"model": "gpt-6.1-sol"` after
  Luna) with the escalation packet; Sol is the top tier. Once a worker's
  budget is spent, ask it only for a missing HANDOFF, never for more work.
- To wait for agents, call `wait_agent` without a short `timeout_ms`: the
  launch layers set the wait's minimum and default to 20 minutes, and a wait
  returns as soon as an agent sends a message or finishes. In the 2026-10-20
  measurement of v7 the cooperator waited 60 seconds at a time, and after most
  timeouts it only wrote a status or looked at the workers' files. Never
  `sleep` in a loop: every wake-up rereads your whole context.
  `send_message` delivers a message without restarting an idle agent;
  `interrupt_agent` interrupts a turn; `list_agents` reads status once.
- Use an empty fork with an explicit packet; a full-history fork may disallow
  model overrides. The reviewer is never the author.

## Snapshot for a parallel audit

When the next block may change what an audit reads, give the auditors a frozen
copy and point SNAPSHOT at it:

```sh
sha=$(git stash create)        # tracked changes as a commit; empty when clean
git worktree add --detach "$SCRATCH/snap-blk1" "${sha:-HEAD}"
# copy the block's new, untracked files from its WRITE_SET into the copy
git worktree remove --force "$SCRATCH/snap-blk1"   # after the round
```

The copy has no installed dependencies: run checks that need them in the main
checkout once the writer is done.

## Review snapshot and conditions

`{{CODEX_HOME}}/skills/workforce-orchestrate/scripts/accept.mjs` ties a review to
the state it read and closes its conditions without another review call:

```sh
A={{CODEX_HOME}}/skills/workforce-orchestrate/scripts/accept.mjs
node $A snapshot                     # tree:<hash> of the work tree, uncommitted files included
node $A run "npm run ci"             # runs the check, keeps its log, records its exit code and tree
node $A close --tree <hash> --check "npm run ci"
```

Put the `tree:<hash>` in the reviewer's SNAPSHOT. On `ACCEPTANCE: accepted_if
<check> on tree:<hash>`, run that check through `run` (or reuse a recorded run
on the same tree) and `close`: CLOSED accepts the block; OPEN names why (the
check failed, never ran on that tree, or the files changed since the review).
Changed files that bear on the review go to the same reviewer as a delta.

## V1: fork_context and send_input

If the schema exposes these instead, spawn with `agent_type`, `model`,
`reasoning_effort`, `fork_context: false`, and the packet as `message`, and use
the runtime's own send, wait, and close fields.

## Missing capability

If model or effort overrides, custom roles, or a required model are unavailable,
report the exact missing capability and fall back as dispatch describes. Never
emulate routing in text; a child's self-reported model name is not evidence.
