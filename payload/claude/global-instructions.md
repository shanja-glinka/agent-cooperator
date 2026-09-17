## Claude Workforce (opt-in)

A brain/worker orchestration kit is installed: roles `workforce-worker`,
`workforce-probe`, `workforce-reviewer` and the `/workforce-orchestrate` skill at
`{{CLAUDE_HOME}}/skills/workforce-orchestrate/SKILL.md`. It is optional. Use it
only when the user invokes `/workforce-orchestrate`, asks for "workforce",
subagents, or multi-agent work, or a project instruction file requires it.
Otherwise work as a normal single session and do not spawn agents for ordinary
tasks; this block adds no other behavior.

When the kit is invoked: read the skill and `references/dispatch.md`; classify the
work as `direct` (done inline, no agents), `build`, or `pipeline` first; read the
repository's `CLAUDE.md`, `AGENTS.md`, `.claude/rules/`, and `CONTRIBUTING.md` and
pass them to every child as PROJECT_RULES, letting them override the kit; set
`model` on every Agent call; lock SCOPE and OUT_OF_SCOPE in each packet; continue
the same worker and reviewer for fix rounds with SendMessage; treat findings
outside the reported scope as follow-ups for the user; review only finished
blocks. Profiles (Standard, Enhanced) are optional recommendations; the user's
model, effort, and budget limits are binding. Commit, push, merge, deployment,
and messages to third parties need the user's authorization.
