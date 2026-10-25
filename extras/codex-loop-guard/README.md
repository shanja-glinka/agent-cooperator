# Codex loop guard (experimental)

A Codex hook that notices a session digging in and says so in its context. The
kit does not install it.

- **Repeated call.** The same tool call returns the same result for the third
  time with nothing edited in between: one note to use what it already has,
  change the approach, or hand the rest to a fresh agent with a written handoff.
- **Repeated failure.** The same call fails the same way three times: one note
  to stop running it as is.
- **Compaction.** After a context compaction, the next tool call gets a note to
  continue from the task state note instead of re-reading code. From the third
  compaction on, the note also suggests handing the block to a fresh agent.

It never blocks a call, keeps a small per-session state in the system temp
directory, and exits silently on any error. One run takes about 80 ms.

## Enable

Add both events to `~/.codex/hooks.json`, with the path to `loop-guard.mjs`:

```json
{
  "hooks": {
    "PostToolUse": [{ "hooks": [{ "type": "command", "timeout": 5,
      "command": "/bin/sh -c 'command -v node >/dev/null 2>&1 || exit 0; exec node \"$0\"' /path/to/loop-guard.mjs" }] }],
    "PostCompact": [{ "hooks": [{ "type": "command", "timeout": 5,
      "command": "/bin/sh -c 'command -v node >/dev/null 2>&1 || exit 0; exec node \"$0\"' /path/to/loop-guard.mjs" }] }]
  }
}
```

Hooks must be enabled (`[features] hooks = true`). Codex runs a new hook only
after you approve it once in its interface. Restart open sessions afterwards:
a running session keeps the hook list it started with.

## Status

Tested with synthetic hook events (`node --test
extras/codex-loop-guard/loop-guard.test.mjs`). Not yet verified in a live
Codex session.
