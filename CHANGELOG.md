# Changelog

## Unreleased

- Move the Codex edition to the GPT-6 family (policy 1.4.0): GPT-6 Sol replaces
  GPT-5.6 Terra for implementation and block review and becomes the Standard
  orchestrator (a stated cost choice; Astra keeps stage acceptance, the Enhanced
  brain, and open design); GPT-6 Luna answers read-only lookups with Sol as the
  judgment fallback; effort is set per block (`medium` for settled blocks, `high`
  for debugging and non-trivial work). The `workforce-standard` launch layer now
  sets Sol high. Trim the Codex global block and document optional `config.toml`
  cost settings the kit does not install.
- Document the current Claude model resolution behind the kit's aliases: `fable`
  is Claude Fable 5.1, `opus` is Claude Opus 5.5 (lower price, `medium` default
  effort), `sonnet` is Claude Sonnet 5, `haiku` is Claude Haiku 4.5 with a
  retirement commitment no sooner than 2026-10-15 and `sonnet` as the probe
  fallback. Recorded in `profiles.json` (`modelResolution`, policy 1.1.0),
  dispatch, and the Claude Code docs. Workflow and role files unchanged.
- Codex delegates to GPT-5.6 Terra instead of GPT-5.5; block review defaults to high, with xhigh/max reserved for rare justified reasoning needs.

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
- Port the shared workflow rules to the Codex edition: repository rules as
  PROJECT_RULES, SCOPE/OUT_OF_SCOPE packet fields, in-scope/follow-up/
  behavior-change finding tags, decision-before-brief, changelog content rule
  (Codex policy 1.2.0). Rewrite both READMEs around the two editions.
- Make the Claude kit opt-in: the managed block and the orchestration skill run
  only on `/workforce-orchestrate` or an explicit request; ordinary sessions spawn
  nothing. Normalize CRLF payload checkouts (Windows CI) and pin LF in git.
- Add repository-rule reading (`CLAUDE.md`, `AGENTS.md`, `.claude/rules/`,
  `CONTRIBUTING.md`) to every Claude role and a `PROJECT_RULES` packet field;
  add scope lock (`SCOPE`, `OUT_OF_SCOPE`), reviewer finding tags
  (in-scope / follow-up / behavior-change), and changelog content rules after a
  behavioral check showed a Sonnet brain expanding a two-bug fix into three review
  rounds. See "Behavioral check" in `docs/claude-code.md`.
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
