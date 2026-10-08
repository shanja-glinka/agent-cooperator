# Tools in Claude Code

Read the real tool schema in the session; field names below are the documented
ones. Roles installed by this kit: `workforce-worker`, `workforce-probe`,
`workforce-auditor`, `workforce-reviewer`.

## Agent

```json
{ "subagent_type": "workforce-worker", "model": "sonnet",
  "description": "Consumer cutover block", "prompt": "<work packet>" }
```

```json
{ "subagent_type": "workforce-auditor", "model": "haiku",
  "description": "Audit lens: conventions",
  "prompt": "<packet with LENS, SNAPSHOT, SCOPE, PROJECT_RULES, prior rounds>" }
```

- Independent agents go in one message; `run_in_background: true` for anything
  longer than about half a minute. You are notified on completion.
- The packet is the agent's whole context: exact sources, not your history.
  `subagent_type: "fork"` is for the rare case where the child needs everything
  you have seen.
- The reviewer is never the author. Stage review is a separate agent.

## SendMessage

```json
{ "to": "<agent name or id>", "message": "<bundled findings or next round>" }
```

Continues an agent with its context intact: the same worker for fixes, the same
auditors for the next round, the same reviewer for the delta. A message does not
change the agent's model or effort; for a different tier, spawn a fresh agent.
Wait for the completion notification instead of polling.

## Missing capability

If a role cannot be spawned, `model` cannot be set, or the account lacks a model,
report the exact missing capability, fall back as dispatch describes, and never
emulate routing in text. A child's self-reported model name is not evidence.
