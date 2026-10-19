# Tools in Codex

Read the real tool schema in the session; fields vary by runtime. Roles installed
by this kit: `workforce_worker`, `workforce_probe`, `workforce_auditor`,
`workforce_reviewer`.

## V2: task_name, fork_turns, followup_task

```json
{ "task_name": "consumer_cutover", "agent_type": "workforce_worker",
  "model": "gpt-6.1-sol", "reasoning_effort": "xhigh",
  "fork_turns": "none", "message": "<work packet>" }
```

```json
{ "task_name": "audit_conventions", "agent_type": "workforce_auditor",
  "model": "gpt-6-luna", "reasoning_effort": "xhigh",
  "fork_turns": "none", "message": "<packet with LENS, SNAPSHOT, SCOPE, PROJECT_RULES, prior rounds>" }
```

- `followup_task({"target":"<task>","message":"<findings or next round>"})`
  continues an agent, including an idle one, with its context within remaining
  budget: the same worker for fixes, an auditor that returned `STATUS: partial` or stopped early (with
  its NOT_REACHED files), only the auditors whose lens won the last round for
  the next round, the same reviewer for the delta. At the auditor token ceiling,
  follow dispatch's handoff on the same snapshot/lens/round. The call does not take
  model or effort overrides; for a different model, spawn a fresh task.
- Escalation is a fresh spawn on the next tier (`"model": "gpt-6.1-sol"` after
  Luna, `"gpt-6-astra"` after Sol) with the escalation packet. After exhaustion,
  request only a missing HANDOFF from the old worker, with no implementation;
  its known usage still counts. Further implementation requires the permitted
  continuation from dispatch.
- Queue findings for A if the worker currently owns B. At a safe boundary,
  restore A's packet, WRITE_SET and budget before requesting its fixes.
- Point auditors and reviewers at the packet's actual stable checkout or copied
  tree, including relevant dirty/new files and read dependencies. Materialize it
  with writers paused or serialize them; disjoint WRITE_SETs do not freeze reads.
- `send_message` delivers a message without restarting an idle agent.
  `interrupt_agent` interrupts a turn. `wait_agent` waits for notifications;
  `list_agents` reads status without polling loops.
- Use an empty fork with an explicit packet; a full-history fork may disallow
  model overrides. The reviewer is never the author.

## V1: fork_context and send_input

If the schema exposes these instead, spawn with `agent_type`, `model`,
`reasoning_effort`, `fork_context: false`, and the packet as `message`, and use
the runtime's own send, wait, and close fields.

## Missing capability

If model or effort overrides, custom roles, or a required model are unavailable,
report the exact missing capability and fall back as dispatch describes. Never
emulate routing in text; a child's self-reported model name is not evidence.
