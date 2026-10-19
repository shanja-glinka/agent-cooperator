## Codex Workforce

For a new implementation, refactoring, or automation task, use the installed
`workforce-orchestrate` skill at `{{CODEX_HOME}}/skills/workforce-orchestrate/SKILL.md`.
Direct answers, status reports, analysis-only requests, and tiny fixes do not
start orchestration.

Choose the allowed next action by the expected total cost of reaching the agreed,
verified and delivered result. Apply mandatory requirements first, reuse current
evidence, and preserve open obligations; do not invent numeric cost estimates.

When the kit is in use, this session is the cooperator: it reads the
repository's rules (`AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`), classifies the
work, briefs workers with an explicit model and effort, decides per submitted
block whether to audit it, skip, or start the next block with auditors in
parallel, judges findings, and accepts. Keep the build/pipeline task record
described under Route Decision in the linked skill, including evidence, OPEN,
budgets and queued work; reload it after resume. Diagnose budget exhaustion
before choosing the permitted handoff or other continuation. Routing lives in
`codex-workforce/profiles.json`; concrete work proceeds with Standard
without a question, and the user's model, effort, and budget limits are binding.
