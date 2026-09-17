---
name: workforce-smoke
description: "Verify an installed Claude Workforce: role discovery, skill discovery, explicit model routing on Agent calls, and SendMessage continuation. Run on explicit request only; it starts real agents and uses quota."
disable-model-invocation: true
---

# Installation and live routing smoke

Use on a requested installation check or after the spawning interface changed, not
after every instruction edit. Static installer status does not prove live routing.
Read `{{CLAUDE_HOME}}/skills/workforce-orchestrate/references/dispatch.md` and
`references/tools.md` in that same directory first.

## Static check

Run the installed package's `status` command as documented by its CLI
(`npx --yes -p github:shanja-glinka/codex-workforce claude-workforce status` or
the local `bin/claude-workforce.js status`). Report missing files, drift, and a missing
or edited managed block in `CLAUDE.md`. Confirm the three roles appear in the
session's available agent types and that `/workforce-orchestrate` is listed.

## Live check (explicit request only)

Inherit the task's PROFILE; a bounded smoke uses Standard without a question.
Choose a bounded read-only question and a run token, and record them in the task
state. In one message spawn two probes:

- `workforce-probe` with `model: "haiku"` to inspect one concrete source path;
- an independent `workforce-probe` with `model: "sonnet"` to check a different
  bounded fact.

Pass PROFILE, ROOT, the token, exact scope, and the no-write, no-children
constraints. While they run, read the installation manifest without duplicating
their work. Obtain both results, verify the token and evidence, then send one
related follow-up to the haiku probe with SendMessage and await its reply.

Report PASS / FAIL / UNVERIFIED separately for: skill discovery, custom roles,
requested model on each call, the model each child reports (self-report is not
runtime evidence), child results, and the follow-up. Complete or stop all children
before returning. This is installation smoke, not product acceptance and not a
benchmark of cost savings.
