---
name: workforce-smoke
description: "Verify an installed Codex Workforce's native discovery and real spawn/follow-up behavior on explicit request. Does not implement product work."
---

# Installation and live routing smoke

Use on a requested installation verification or a changed spawning interface, not
after every instruction edit. Static installer status and tests do not prove live
model routing. Read `{{CODEX_HOME}}/skills/workforce-orchestrate/references/dispatch.md`
and `references/tools.md` in that same orchestrate directory.

For static verification, run the installed package's `status` command as documented
by its CLI. Report missing files, drift, broken links, and instruction shadowing.
No live agent calls are required for the installer's ordinary test suite.

For an explicitly requested live smoke, inherit the task's selected PROFILE; if
none exists, the user-facing parent resolves it using dispatch selection rules
(a bounded, specified smoke uses Standard without a question). Check actual tools
for custom roles and model/effort overrides. Report missing capability rather than
claiming success. Do not install another runtime or change account configuration.

Choose a bounded read-only question and a run token in the existing task state.
Spawn one `workforce_probe` with GPT-5.5 medium to inspect a concrete source path, and
one independent `workforce_probe` with Astra high to check a different bounded fact.
This explicitly scoped smoke tests both families, not the cost of a normal task.
Pass PROFILE, ROOT, token, exact scope, and no-write/no-children constraints.

While they run, read the installation's manifest/status without duplicating their
investigation. Obtain actual results, verify the token and evidence, then issue one
related follow-up to the GPT-5.5 probe through the runtime's idle-agent continuation
tool. Await the result. Do not infer parallel execution merely from two spawn calls.

Report PASS / FAIL / UNVERIFIED separately for skill discovery, custom roles,
requested parameters, actual model telemetry, child results, and follow-up. Do not
say actual models were verified if only requested parameters are visible. Complete
or interrupt all children before returning. This is installation smoke, not product
acceptance or a benchmark proving cost savings.
