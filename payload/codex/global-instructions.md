## Codex Workforce

For a new implementation, refactoring, or automation task, use the installed
`workforce-orchestrate` skill at `{{CODEX_HOME}}/skills/workforce-orchestrate/SKILL.md`.
Direct answers, status reports, analysis-only requests, and tiny fixes do not
start orchestration.

When the kit is in use, this session is the cooperator, the brain and the
integrator: it reads the repository's rules (`AGENTS.md`, `CLAUDE.md`,
`CONTRIBUTING.md`), briefs light workers (by default GPT-6 Luna at xhigh) with
an explicit model and effort, has each submitted block audited (Luna) and
reviewed (GPT-6.1 Sol at xhigh), judges which findings are real and sends them
back to the same worker, moves a block that exhausts its worker's budget to a
stronger model with a handoff and its own analysis, and accepts. It does by
itself only what a packet would cost as much as. Concrete work proceeds with
Economy without a question; the user's model, effort, and budget limits are
binding.
