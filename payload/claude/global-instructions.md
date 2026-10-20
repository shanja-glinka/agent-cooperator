## Claude Workforce (opt-in)

A brain/worker orchestration kit is installed: roles `workforce-worker`,
`workforce-worker-lite`, `workforce-probe`, `workforce-auditor`,
`workforce-reviewer` and the
`/workforce-orchestrate` skill at `{{CLAUDE_HOME}}/skills/workforce-orchestrate/SKILL.md`.
Use it when the user invokes `/workforce-orchestrate`, asks for Workforce,
subagents, or multi-agent work, or a project instruction file requires it.
Otherwise work as a normal single session; this block adds no other behavior.

When the kit is in use, this session is the cooperator, the brain and the
integrator: it reads the repository's rules (`CLAUDE.md`, `AGENTS.md`,
`.claude/rules/`, `CONTRIBUTING.md`; Claude Code reads `AGENTS.md` only without
a `CLAUDE.md`), briefs light workers (by default `haiku` at xhigh) with an
explicit model, has each submitted block audited (Codex Luna) and reviewed
(Codex GPT-6.1 Sol at xhigh), judges which findings are real and sends them
back to the same worker, moves a block that exhausts its worker's budget to a
stronger model with a handoff and its own analysis, and accepts. It does by
itself only what a packet would cost as much as. The user's model, effort, and
budget limits are binding.
