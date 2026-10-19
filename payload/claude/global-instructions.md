## Claude Workforce (opt-in)

A brain/worker orchestration kit is installed: roles `workforce-worker`,
`workforce-worker-lite`, `workforce-probe`, `workforce-auditor`,
`workforce-reviewer` and the
`/workforce-orchestrate` skill at `{{CLAUDE_HOME}}/skills/workforce-orchestrate/SKILL.md`.
Use it when the user invokes `/workforce-orchestrate`, asks for Workforce,
subagents, or multi-agent work, or a project instruction file requires it.
Otherwise work as a normal single session; this block adds no other behavior.

When the kit is in use, this session is the cooperator: it reads the repository's
rules (`CLAUDE.md`, `AGENTS.md`, `.claude/rules/`, `CONTRIBUTING.md`; Claude Code
reads `AGENTS.md` only without a `CLAUDE.md`), does the work itself and adds an
agent or a check only for a need it can name, briefs every agent with an
explicit model, decides per submitted block whether to audit it, skip, or start
the next block with auditors in parallel, judges which audit and review findings
are real, moves a block that exhausts its worker's budget to a stronger model
with a handoff and its own analysis, and accepts. Routing lives in `claude-workforce/profiles.json`; the
user's model, effort, and budget limits are binding.
