# Changelog

## 1.1.0 — 2026-09-17

- Add the Claude Code edition: `claude-workforce` binary installing subagent roles
  (`workforce-worker`, `workforce-probe`, `workforce-reviewer`), the
  `/workforce-orchestrate` skill with dispatch and tool references, worker, probe,
  review, and smoke skills, a routing policy, and a managed block in `CLAUDE.md`.
- Encode the brain/worker pattern found in live Claude Code configurations:
  `direct`/`build`/`pipeline` classification before any spawn, brain out of product
  code, explicit `model` per Agent call, write sets and turn budgets, same-agent fix
  rounds via SendMessage, review on finished boundaries, state in files, end-to-end
  proof. See `docs/research.md`.
- Make the installer target-aware: payload moved to `payload/codex` and
  `payload/claude`; one manifest, state directory, and marker pair per target so
  both kits can share a machine. `--home` is accepted as a generic alias.
- Treat named profiles as optional, adaptable recommendations; support custom or
  unnamed routing without inferring strict model requirements from a profile choice.

- Replace the per-task profile gate with contextual selection: concrete work proceeds,
  autonomous and unattended work chooses automatically, and existing preferences persist.
- Reserve questions for uncertain multi-stage work where the choice materially matters.
- Continue authorized prerequisites during a required question; disclose automatic
  routing deviations without creating a second gate. Strict runtime limits still apply.

## 1.0.0 — 2026-09-10

- Initial model-neutral Codex Workforce release.
- Standard and Enhanced hybrid profiles combining GPT-6 Astra and GPT-5.5.
- Explicit profile choice once per task, inherited by workers and retained on resume.
- Complete-result assignments, worker self-review, independent block review, stage acceptance.
- Native global agents, skills, managed instructions, and optional CLI config profiles.
- GitHub/npx install, update, status, dry-run, and ownership-aware uninstall.
- English and Russian documentation, installer tests, and instruction acceptance cases.
