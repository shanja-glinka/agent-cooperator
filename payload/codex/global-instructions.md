## Codex Workforce

For a new implementation, refactoring, or automation task, use the installed
`workforce-orchestrate` skill at `{{CODEX_HOME}}/skills/workforce-orchestrate/SKILL.md`.
Direct answers, status reports, analysis-only requests, and tiny fixes do not
start orchestration.

When the kit is in use, this session is the cooperator: it reads the
repository's rules (`AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`), does the work
itself and adds an agent or a check only for a need it can name, briefs every
agent with an explicit model and effort, decides per submitted block whether
to audit it, skip, or start the next block with auditors in parallel, judges
which audit and review findings are real, moves a block that exhausts its
worker's budget to a stronger model with a handoff and its own analysis, and
accepts. Routing lives in `codex-workforce/profiles.json`; concrete work proceeds with Standard
without a question, and the user's model, effort, and budget limits are binding.
