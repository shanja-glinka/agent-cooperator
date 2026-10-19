# Tools in Claude Code

Read the real tool schema in the session; field names below are the documented
ones. Roles installed by this kit: `workforce-worker`, `workforce-worker-lite`
(for `haiku`, 120 tool calls per run), `workforce-probe`, `workforce-auditor`,
`workforce-reviewer`.

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

Continues an agent with its context intact: the same worker for fixes, an
auditor that returned `STATUS: partial` or hit its turn limit (with its
NOT_REACHED files), only the auditors whose lens won the last round for the
next round, the same reviewer for the delta. After a worker's budget is spent,
ask it only for a missing HANDOFF, no more work. A message does not change the
agent's model or effort; for a different tier, spawn a fresh agent. Wait for
the completion notification instead of polling.

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
  message. Do not sleep or poll: the completion notification arrives, because
  the wrapper ends the run when it finishes, goes silent for 15 minutes
  (`stalled`), shows an approval or input request (`waiting_for_input`), or
  passes 60 minutes (`timeout`). Raise `--timeout-minutes` for a large stage
  review instead of waiting without one.
- On the notification read `<out>/<name>.result.json`: `status`, `threadId`,
  and `lastMessage` (the auditor's or reviewer's packet). Only `ok` counts as a
  result, and an `ok` packet with `STATUS: partial` is not finished: resume
  the thread with "continue with NOT_REACHED". On `timeout` or `stalled` with
  a `threadId`, resume the same thread with "return your packet and
  NOT_REACHED"; do not start a fresh run that rereads everything. Only when
  there is no thread, or on `failed` and `waiting_for_input`, read
  `stderrTail` and the end of the `.jsonl`, fix the cause, and relaunch once;
  if it fails again, run that lens on the Agent fallback from dispatch and say
  so in the report.
- A Hybrid block escalated from `haiku` runs as a Codex worker: the same
  command with `--role work` (defaults: `gpt-6.1-sol`, effort `xhigh`, sandbox
  `workspace-write`, the `workforce-worker` skill prepended) and the escalation
  packet. Continue the same worker with `--resume <threadId>` and
  `--baseline <previous result.json>` while its budget lasts.
- Next round for a winning lens, or the delta for the same reviewer: same
  command with a new `--name`, the round packet, `--resume <threadId>`, and
  `--baseline <previous result.json>`. A lens that lost is not resumed.
- Never hand Codex a task that needs a reply mid-run. If a result says Codex
  needed something, answer it in the next round's packet.

### Usage in result.json

`tokens.total` is the run's own usage (`input + output`; `cachedInput` is part of
`input`), and `tokens.uncached` is `input - cachedInput + output`: the new tokens
the run processed. `tokens.status` says how far to trust them: `known`,
`partial` (a lower bound), or `unknown` (`null`, never zero). `tokens.threadTotal`
is the thread's running total: a resumed thread keeps counting from its previous
total (checked 2026-10-19), so the latest `threadTotal` covers every run of that
agent. Pass the previous run's file as `--baseline` when you resume, and the
runner reports the resumed run's own usage; without it that run is `unknown`.
`model` and `effort` are what was requested, not proof of what ran.

## Missing capability

If a role cannot be spawned, `model` cannot be set, or the account lacks a model,
report the exact missing capability, fall back as dispatch describes, and never
emulate routing in text. A child's self-reported model name is not evidence.
