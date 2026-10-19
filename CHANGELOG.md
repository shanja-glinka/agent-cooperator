# Changelog

## Unreleased

- Rename the project to Agent Cooperator (`shanja-glinka/agent-cooperator`).
  New entry command `agent-cooperator claude|codex <install|update|status|uninstall>`;
  the `claude-workforce` and `codex-workforce` binaries, role names, state
  directories, and instruction markers are unchanged, so installations update
  in place.
- Worker ladder with handoff, both editions. The cooperator holds a budget per
  worker tier and block: Claude `haiku` 120 tool calls per run (new role
  `workforce-worker-lite`), 3 runs, 400k tokens; `sonnet` 3 runs, 500k; Codex
  Luna 600 tool calls per run, 3 runs, 400k; Sol 3 runs, 500k. A worker at its
  limit returns `STATUS: handoff` (DONE, STOPPED_AT, TRIED, OPEN, NEXT); a block
  that exhausts a tier moves up (Claude: `sonnet` → `opus`, Hybrid `haiku` →
  Codex GPT-6.1 Sol xhigh → `opus`; Codex: Luna → Sol → Astra) as a fresh
  agent with the original packet, the cooperator's APPROACH, and the handoff
  only. Auditors on `haiku` or Luna follow the same 400k ceiling.
- The orchestration skills now describe the cooperator as the brain of the
  task: it analyzes handoffs and decides whether to continue, change approach,
  or split and re-scope a block.
- Codex: Standard workers run GPT-6.1 Sol at xhigh; new Economy profile with
  Luna xhigh workers and the `workforce-economy` launch layer. Policy: Claude
  1.5.0, Codex 1.7.0.
- Claude Hybrid: `codex-run.mjs --role work` runs an escalated worker on Sol
  with a writable workspace, and every `result.json` reports token usage.

## 1.3.2 — 2026-10-12

- Audit coverage, both editions: the auditor gets its assigned FILES and a
  BUDGET (Claude: 40 tool calls, 80% of the 50-turn limit), and returns
  `STATUS: complete | partial` with NOT_REACHED. A partial pass is never
  presented as the whole.
- An auditor that returns `partial` or hits its turn limit is continued with
  SendMessage / `followup_task` (Hybrid: `codex-run.mjs --resume`) on its
  NOT_REACHED files, never replaced by a fresh auditor that rereads everything.
  A round ends only when every lens is complete; nothing goes to the worker
  before that.
- Only findings that quote a rule, document line, or acceptance line at a line
  that really violates it count; the cooperator opens both before accepting.
  Everything else is NOTES, which never go to the worker and never win a round.
  Policy: Claude 1.4.1, Codex 1.6.2.

## 1.3.1 — 2026-10-11

- Audit game, both editions: round 1 runs every lens, after that only the
  lenses that won the last round (found something real) play again. A lens
  that found nothing real is retired for that block and is not re-run to
  double-check; the reviewer still reads the whole diff. Policy: Claude 1.4.0,
  Codex 1.6.1.
- Claude Code: add the opt-in Hybrid profile. `opus` at high effort is the
  brain, `haiku` workers implement (`sonnet` when a worker loops), Codex GPT-6
  Luna xhigh audits and Codex GPT-6.1 Sol xhigh reviews blocks and stages,
  read-only. Chosen only explicitly or by standing preference; falls back to
  Agent roles when Codex is unavailable.
- Claude Code: add `skills/workforce-orchestrate/scripts/codex-run.mjs`, the only
  way the cooperator starts Codex. It feeds the packet on stdin from a file,
  turns approvals off, ignores the user's Codex config, and ends runs that go
  silent, ask for input, or run too long, so a background Codex run always
  reports back. Fixes a cooperator waiting hours on a Codex run that was
  waiting for input.

## 1.3.0 — 2026-10-08

- Reject AI co-author trailers in commit messages: CI job plus a versioned
  `commit-msg` hook in `.githooks/` (enable with `git config core.hooksPath .githooks`).
- Add the auditor role to both editions: `workforce-auditor` (Claude Code,
  `haiku` at effort xhigh) and `workforce_auditor` (Codex, GPT-6 Luna at xhigh),
  read-only, with the `workforce-audit` skill. After a worker submits a block,
  the cooperator (the orchestrator) chooses to audit it, skip, or start the next
  block with auditors running in parallel on one or more submitted blocks.
  Auditors play up to three rounds per block, report everything through one
  lens (docs, task, conventions), and the cooperator takes only real findings to
  the same worker.
- Rewrite the orchestration skills, dispatch, tools, roles, and global blocks of
  both editions around the cooperator flow: one routing record per edition, no
  duplicated rules, no instructed self-verification, reporters report
  everything and the cooperator judges.
- Update model resolution: Claude `sonnet` and `haiku` now resolve to Sonnet 5.5
  and Haiku 5.5 (Haiku 5.5 supports effort up to `xhigh`); Codex moves from
  GPT-6 Sol to GPT-6.1 Sol at the same price (policy 1.5.0). Checked 2026-10-08.

## 1.2.0 — 2026-09-24

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
