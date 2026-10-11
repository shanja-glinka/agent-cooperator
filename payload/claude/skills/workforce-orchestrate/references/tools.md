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

Continues an agent with its context intact: the same worker for fixes, only the
auditors whose lens won the last round for the next round, the same reviewer for
the delta. A message does not change the agent's model or effort; for a different
tier, spawn a fresh agent. Wait for the completion notification instead of
polling.

## Codex CLI (Hybrid profile)

In Hybrid, auditors and reviewers are Codex runs, not Agent calls. Start every
one through the kit's wrapper, never with bare `codex` (an interactive UI that
waits for a person) and never with `codex exec` directly:

```sh
node {{CLAUDE_HOME}}/skills/workforce-orchestrate/scripts/codex-run.mjs \
  --role audit --name blk1-docs-r1 --packet "$SCRATCH/blk1-docs.packet" \
  --cd "$ROOT" --out "$SCRATCH/codex"
```

- Write the packet to a file first (same packet as for an Agent call, with LENS
  or MODE). The wrapper prepends the `workforce-audit` or `workforce-review`
  skill, feeds the packet on stdin from that file, and runs read-only with
  approvals off and the user's Codex config ignored (no MCP servers that ask for
  approval). Defaults: `audit` → `gpt-6-luna`, `review` → `gpt-6.1-sol`, effort
  `xhigh`.
- Run each call with Bash `run_in_background: true`; the three lenses go in one
  message. Do not sleep or poll: the completion notification always arrives,
  because the wrapper ends the run when it finishes, goes silent for 15 minutes
  (`stalled`), shows an approval or input request (`waiting_for_input`), or
  passes 60 minutes (`timeout`). Raise `--timeout-minutes` for a large stage
  review instead of waiting without one.
- On the notification read `<out>/<name>.result.json`: `status`, `threadId`,
  and `lastMessage` (the auditor's or reviewer's packet). Only `ok` counts as a
  result. On any other status read `stderrTail` and the end of the `.jsonl`,
  fix the cause, and relaunch once; if it fails again, run that lens on the
  Agent fallback from dispatch and say so in the report.
- Next round for a winning lens, or the delta for the same reviewer: same
  command with a new `--name`, the round packet, and `--resume <threadId>`.
  A lens that lost is not resumed.
- Never hand Codex a task that needs a reply mid-run. If a result says Codex
  needed something, answer it in the next round's packet.

## Missing capability

If a role cannot be spawned, `model` cannot be set, or the account lacks a model,
report the exact missing capability, fall back as dispatch describes, and never
emulate routing in text. A child's self-reported model name is not evidence.
