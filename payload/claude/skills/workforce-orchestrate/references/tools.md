# Tools in Claude Code

Read the real tool schema in the session; field names below are the documented
ones. Roles installed by this kit: `workforce-worker`, `workforce-worker-lite`
(for `haiku`, a packet budget of 120 tool calls per run), `workforce-probe`, `workforce-auditor`,
`workforce-reviewer`.
Native `maxTurns` limits turns independently; do not derive call budgets from it.

## Agent

```json
{ "subagent_type": "workforce-worker", "model": "sonnet",
  "description": "Consumer cutover block", "prompt": "<work packet>" }
```

```json
{ "subagent_type": "workforce-worker-lite", "model": "haiku",
  "description": "Export pagination block", "prompt": "<work packet with BUDGET: 120>" }
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

Continues an agent with its context intact within remaining budget: the same
worker for fixes, an auditor that returned `STATUS: partial` or hit its turn limit (with its NOT_REACHED
files), only the auditors whose lens won the last round for the next round, the
same reviewer for the delta. The auditor token-ceiling handoff is an exception;
preserve its snapshot, lens, round and covered files as dispatch describes. After a
worker exhausts its budget, request only a missing HANDOFF, without implementation;
its known usage still counts. A message does not change model or effort: a different
tier needs a fresh agent. Wait for the completion notification instead of polling.

Queue findings for A while its worker owns B. Switch at a safe boundary with A's
packet, WRITE_SET and budget restored. For parallel audit/review, use the actual
stable checkout or copied tree identified in SNAPSHOT, including dirty/new files
and relevant read dependencies; pause writers to materialize it or serialize them.

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
  message. Wait for completion. The wrapper ends a run that goes silent for 15 minutes
  (`stalled`), shows an approval or input request (`waiting_for_input`), or
  passes 60 minutes (`timeout`). Set `--timeout-minutes` for a large stage
  review only within the applicable time budget.
- On the notification read `<out>/<name>.result.json`: `status`, `threadId`,
  and `lastMessage` (the auditor's or reviewer's packet). `ok` is an execution
  result, not acceptance. For an `ok` partial audit, resume NOT_REACHED within
  budget or use the permitted token-ceiling handoff. On `timeout` or `stalled`,
  inspect the cause and remaining budget; use a known thread to recover only a
  missing packet before deciding whether continuation is useful. Do not repeat
  an unchanged blocked operation. Without a usable thread, or on `failed` or
  `waiting_for_input`, inspect `stderrTail` and the end of `.jsonl`, fix the cause
  and relaunch at most once within budget. If it fails again, use dispatch's
  permitted Agent fallback and report it; retain spent runs and usage.
- A Hybrid block escalated from `haiku` runs as a Codex worker: the same
  command with `--role work` (defaults: `gpt-6.1-sol`, effort `xhigh`, sandbox
  `workspace-write`, the `workforce-worker` skill prepended) and the escalation
  packet. Apply the usage rules below. Continue with `--resume <threadId>` only
  while implementation budget remains; a packet-only HANDOFF request asks for
  no further implementation.
- Next round for a winning lens, or the delta for the same reviewer: same
  command with a new `--name`, the round packet, and `--resume <threadId>`.
  Continue within budget; a lens that lost is not resumed.
- Never hand Codex a task that needs a reply mid-run. If a result says Codex
  needed something, answer it in the next round's packet.

### Usage in result.json

`tokens.scope` is `run`; `tokens.status` is `known`, `partial`, or `unknown`.
Use nullable `input`, `cachedInput`, `output`, and `total` only in that scope.
`total = input + output`; cachedInput is already included in input. `source`
records provenance and `reason` explains incomplete or unusable observations.
Known usage is the observed complete run total; partial usage is only its measured
portion and may have null fields. Unknown usage is null, never a zero-cost run.
`model` and `effort` record requested CLI settings. `tokens.status: known` establishes
counter completeness, not the actual model or billing; do not calculate money from
these fields. A requested-tier ledger records policy history with actual routing
unverified unless separate evidence establishes it.

`tokens.threadTotal` preserves a cumulative observation for inspection. Never add
it as a new run charge or use a resumed thread total as a run lower bound. This
runner has no resume baseline, so resumed cumulative usage remains `unknown`;
`resume_baseline_missing` identifies that limitation. Retain run counts and disclose incomplete
token accounting; do not promise exact token-ceiling enforcement when usage is missing.

## Missing capability

If a role cannot be spawned, `model` cannot be set, or the account lacks a model,
report the exact missing capability, fall back as dispatch describes, and never
emulate routing in text. A child's self-reported model name is not evidence.
