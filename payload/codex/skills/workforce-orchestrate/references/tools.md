# Runtime tools, not an invented API

Read the actual tool schema in the receiving session. These are examples of tool
arguments, not shell commands. Model availability and accepted fields vary by runtime.
Use [dispatch](dispatch.md) for the chosen hybrid profile and complete assignment.

## V2: task_name, fork_turns, followup_task

Typical bounded implementation in either profile:

```json
{
  "task_name": "consumer_cutover",
  "agent_type": "workforce_worker",
  "model": "gpt-5.6-terra",
  "reasoning_effort": "high",
  "fork_turns": "none",
  "message": "<complete assignment including PROFILE>"
}
```

For a bounded Enhanced design block, use the same appropriate role with
`gpt-6-astra` and `high`, explicitly assigning that open decision. A read-only design
investigation uses `workforce_probe`; an implementation uses `workforce_worker`.
Block review uses `workforce_reviewer`, GPT-5.6 Terra high, MODE=block. Major stage acceptance
uses a separate `workforce_reviewer`, Astra high, MODE=stage. Do not reuse the author as
its independent reviewer.

Keep the returned canonical task name. In a runtime exposing these exact fields:

- `send_message({"target":"<task>","message":"<clarification>"})` delivers a message
  but does not restart an idle agent.
- `followup_task({"target":"<task>","message":"<bundled corrections>"})` continues
  that agent, including an idle one. It does not take model/effort overrides.
- `interrupt_agent({"target":"<task>"})` interrupts a turn; it does not imply permanent
  deletion or a freed slot.
- `list_agents({})` reads status. Do not poll without a need.
- `wait_agent({})` waits for notifications; consume actual delivered child results.

If V2 has no close tool, do not invent one from V1. Reuse suitable idle workers; do
not leave active children unhandled. A full-history fork may disallow model overrides;
use an empty fork with explicit context instead.

## V1: fork_context and send_input

Only if the actual schema exposes these fields, spawn with `agent_type`, `model`,
`reasoning_effort`, `fork_context: false`, and a complete `message`. Keep its returned
agent id. Use the runtime's documented send/wait/close fields; do not send V2 fields
or guess names. Some builds have `send_input` and `close_agent`, others differ.

## Missing capability

If model/effort overrides, required custom roles, or required models are unavailable,
report the exact missing capability (for example DYNAMIC_ROUTING_UNAVAILABLE). Do
not emulate model selection in text, silently substitute a model, or install a new
runtime. A runtime-accepted request proves the submitted parameters; if actual model
telemetry is absent, mark effective routing unverified. Self-reported model names
are not runtime evidence. Ask the user about a materially different fallback.
