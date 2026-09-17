# Runtime tools in Claude Code, not an invented API

Read the actual tool schema in the running session. Field names below are the
documented ones for current Claude Code; if the session exposes different fields,
use those. Use [dispatch](dispatch.md) for the chosen profile and the packet.

## Agent: spawn a role with an explicit model

Roles installed by this kit are `workforce-worker`, `workforce-probe`, and
`workforce-reviewer`. Pass them as `subagent_type` and always set `model`
explicitly; the role files use `inherit` so the call decides.

```json
{
  "subagent_type": "workforce-worker",
  "model": "sonnet",
  "description": "Consumer cutover block",
  "prompt": "<complete work packet including PROFILE, WORK_CLASS, WRITE_SET, CHECKS>"
}
```

- Run independent workers concurrently by issuing their Agent calls in one
  message. Use `run_in_background: true` for anything expected to take more than
  about half a minute; you are notified when it finishes.
- Never pass your conversation history as the packet. A fresh context with exact
  sources is cheaper and more reliable than a fork. Use `subagent_type: "fork"`
  only when the child genuinely needs everything you have seen.
- `isolation: "worktree"` gives the child its own checkout; use it only for
  concrete write conflicts and merge the result back deliberately.
- The reviewer is never the author. Block review uses a `workforce-reviewer` with
  `model: "opus"`, MODE=block. Stage acceptance uses a separate `workforce-reviewer`
  (`opus`, or `fable` in Enhanced), MODE=stage.
- Read-only design investigation uses `workforce-probe`; implementation uses
  `workforce-worker`; a bounded open-design block in Enhanced uses
  `workforce-worker` with `model: "fable"` or `"opus"` and the open decision
  named explicitly in GOAL.

## SendMessage: continue the same agent

An agent that returned keeps its transcript. Continue it by name or id:

```json
{ "to": "<agent name or id>", "message": "<bundled findings or the correction delta>" }
```

- Fix rounds go back to the same worker; re-checks go back to the same reviewer.
  This is how a round costs only the delta context.
- Do not poll. Wait for the completion notification, then read the result.
- A message does not change the agent's model or effort. For a different tier,
  spawn a fresh agent with the bundled state.

## Skills and effort

- `/workforce-orchestrate <task>` starts this skill explicitly. The kit's worker,
  probe, and review skills are preloaded into the matching roles.
- Effort for a child comes from the `effort` field in role frontmatter or the
  session setting; state the intended effort in the packet so the child can
  confirm what it is running with. The user's session cap is binding.

## Missing capability

If the session cannot spawn custom roles, cannot set `model` on Agent calls, or
the account lacks a requested model, report the exact missing capability (for
example `MODEL_UNAVAILABLE: fable`) and fall back as dispatch describes. Do not
emulate routing in text, do not silently substitute a tier the user forbade, and
do not install another runtime. A self-reported model name in a child's message is
not runtime evidence.
