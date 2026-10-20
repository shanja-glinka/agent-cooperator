# Changelog

## Unreleased

- The reviewer judges a protective site against the inputs the contract covers.
  "Kept" used to accept "the value's real range" as a basis, and in a measured
  run a reviewer drew that range from today's callers and accepted a changed
  fallback on database data that the contract protected. Now outside data (a
  database row, a message, parsed JSON, an environment variable) and any value
  taken from it can hold anything, whatever its type; a guard counts when the
  code under review runs it itself, and a guard in today's callers counts only
  when the contract protects an outer behavior and every path to it is traced.
  A violated or not-established site keeps the block not accepted. Same rule in
  both editions.
- `accept.mjs run` started checks with `/bin/sh`, which Windows does not have, so
  no check could pass there. It now uses `sh` from `PATH` (Git for Windows ships
  one) and falls back to the platform shell.

## 1.4.0 — 2026-10-20

- README: measurements with and without the kit on four tasks, three runs per
  task and model, as charts (`docs/images/*.svg`, rebuilt by
  `node docs/images/charts.mjs`) and a table.
- v8: review against the contract. The packet carries `CONTRACT` (what the
  change must keep, with its source); the reviewer lists every changed
  protective site from the diff and gives each kept, violated, or not
  established. A review may end with `accepted_if <check> on tree:<hash>`,
  which `skills/workforce-orchestrate/scripts/accept.mjs` closes when a
  recorded run of that check passed on the reviewed tree, without another
  reviewer call. Stage review runs only for an integration part no block
  review covered, on GPT-6.1 Sol xhigh. Briefs carry the constraints of the
  touched areas once each, with scope and source; an unknown limit is the
  worker's first step. Codex: GPT-6 Astra and the Enhanced profile are
  removed (a stored Enhanced choice runs as Standard), the worker ladder ends
  at Sol, and the launch layers set `[features.multi_agent_v2]` waits to 20
  minutes (min = default = 1200000 ms, max 3600000 ms). `status` prints the
  installed routing. Policy: Claude 1.10.0, Codex 1.12.0.
- v7: the organization around light workers. The route decision counts the
  whole route a brief sets off (the cooperator's turns, the worker, the
  review, the fix rounds). Audit lenses run only on demand, for an area the
  checks and the review do not cover; the Sol xhigh review of light workers'
  blocks stays, and blocks ready together share one review run. While agents
  run the cooperator waits (no polling, sleep, or scheduled wake-ups); workers
  send no progress. Briefs carry `CONSTRAINTS` with their source files;
  workers keep long output in files. Policy: Claude 1.9.0, Codex 1.11.0.
- Install policy: `profiles.json` `policy` holds `reviewBlock` and
  `reviewStage`; the installer renders `{{#key}}…{{/key}}` and `{{^key}}…{{/key}}`
  sections of every installed text from it, `--set key=on|off` overrides a
  switch, and an unknown key is rejected. The launch layers and global blocks
  no longer name a review of their own.
- Bench: a variant may carry install switches (`name=commit@task+key=value`),
  and `policycheck.mjs` checks every variant's delivered texts before a run;
  the metrics record each agent's request effort, Codex usage per response
  (compaction included), the cooperator's requests, and the workers' prompt
  sizes.
- A light-worker team under a strong cooperator is the default (replaces the
  v5 rule "start yourself; size is not a reason" below). Claude Code: Hybrid
  by default, with `haiku` workers and probes (`workforce-worker-lite` now at
  xhigh), Codex Luna auditors, and a Codex GPT-6.1 Sol xhigh reviewer; Standard
  on the user's choice or when Codex is unavailable. Codex: Economy by default,
  with Luna workers and auditors at xhigh and the block reviewer on Sol at
  xhigh in every profile. The cooperator does itself only work whose packet
  would cost as much as doing it, looks only as far as the brief needs, and
  does not solve a task first to dictate it; parts with disjoint write sets run
  in parallel. Policy: Claude 1.8.0, Codex 1.10.0.
- Every block a light worker submits goes through the audit game and the Sol
  xhigh review before acceptance; real findings go back to the same worker and
  the same reviewer checks the delta; a repeated finding without progress
  stops the loop for the cooperator. The report carries one `REVIEW:
  rounds=<n> findings=<n> real=<n>` line per reviewed block. Packets carry
  `REVIEW` (acceptance, required, or question) instead of `INDEPENDENCE`, and
  `TRAPS`.
- Checks keep their exit code (`cmd > log 2>&1; echo "exit=$?"`), and commits
  follow only a passing check. Prices in dispatch and the routing records are
  checked on 2026-10-20, with Haiku's tier above 100k prompt tokens.
- Bench: every cell has its own `/tmp` (`tmpjail/`), the Claude kit's block goes
  into the system prompt so the project's `AGENTS.md` still loads, the task
  goes to the skill as a file path, Claude cells get their own Codex home, and
  the metrics price every request and count agents' turns and review rounds.
- The cooperator starts itself. An unknown cause is the normal start of a fix,
  not a reason for an agent; workers no longer write every non-`direct` change
  by rule. An agent is added only when the cooperator's own look shows a need it
  can name: the rest will not fit its context, a broad search with a short
  answer (a probe), exhausted hypotheses, required independence, or the user's
  request. The report states the open question each agent or check round
  closed. The work class records the route taken after the look.
- One independence rule for own and delegated work. A review that a project
  rule, the user, or the task requires runs whatever it costs; the kit itself
  only requires the cooperator to read every delegated diff; an optional
  reviewer or audit lens needs a named open question (property at risk, place,
  evidence so far, what it does not answer) and does not repeat what the
  project's CI or reviewers already do. "Money, security, data" alone is no
  longer a trigger. Packets carry `INDEPENDENCE`; on an optional review the
  reviewer answers the question first and repeats a check only when its sources
  changed, its result is not trustworthy, or the scenario is not covered.
- A short default path. The orchestration skills keep only what every task
  needs (Claude 17.0k → about 6k characters); the delegation procedure moved
  without changes of meaning into `references/delegation.md`, read in full
  before the first agent; dispatch and the routing record are read only when a
  model is chosen. The examples no longer copy a benchmark task. Motivation
  (2026-10-19, v4 against no kit): the Codex cooperator read the routing record
  in 12 of 12 runs, also without agents, and on a bug known only by its symptom
  delegating the investigation took 51 and 61 model requests against 16–17
  without the kit for the same result. v5 itself is not measured yet. Policy:
  Claude 1.7.0, Codex 1.9.0.

- Doing the next step itself is always one of the cooperator's moves. Work is
  classified by what is still unknown, not by size: any change the cooperator
  can describe exactly is `direct`, however many files. Each agent, audit,
  review, and stage acceptance needs a named reason (an unknown to find out,
  work beyond its context, required independence, risk, or the user's model
  choice); the report states it. Measured on a known 49-file change: a team
  made two to four times the model requests of one session for the same
  result.
- Mechanical work goes `direct`: a change the cooperator can already describe
  exactly, even across many files, is made inline with the project's checks; the
  skill being invoked does not oblige it to spawn agents. Codex cooperators wait
  for agents with `wait_agent`, never with `sleep`. Measured on a real 16-file
  mechanical fix: with agents the same result cost 1.4–2.2× (Claude) and about
  4× (Codex) more than a single session.
- Choosing the next move, both editions: the cooperator takes the move that
  gets the task to a verified, delivered result at the lowest total cost, with
  the user's limits, permissions, and required project rules first. It keeps an
  OPEN list of the outcome, required checks, and accepted findings; an item
  closes only with evidence, never by a handoff, a new worker, a submitted
  block, round 3, or a blocker. A short table covers situations that meet
  (submitted at the limit, unchanged blocker, auditor at its ceiling, reviewer
  accepting without a required check, findings for a block whose worker moved
  on, a parallel audit over changing files). DONE, BLOCKED, and BUDGET_STOP
  are the ends.
- Worker attempts: only a run that ends without a result spends one of the
  three attempts (limit hit, handoff, or a fix that left its finding open); a
  submitted block or a fix that lands spends none, while its tool calls and
  tokens still count. `profiles.json` records `attempts` and tool calls per
  block (`haiku` 360, Luna 1800).
- Token ceilings are measurable (checked live on 2026-10-19). Claude Code's
  per-agent token count is the agent's context size at its last request, so the
  latest count is compared and never summed. A Codex thread keeps counting
  across resume, so `codex-run.mjs` takes `--baseline <previous result.json>`
  to report a resumed run's own usage, and `result.json` adds `tokens.uncached`
  (input minus cached input, plus output). `tokens.status` (`known`, `partial`,
  `unknown`) says how far the counters can be trusted: unknown is `null`, never
  zero, and cumulative snapshots are no longer summed. A final JSONL event
  without a trailing newline is parsed.
- The cooperator scheme, examples, and reasons are back in both orchestration
  skills, the READMEs, and the docs. Round 3 ends the audit, and real findings
  not yet fixed still go to the worker. Option (c) audits in parallel only when
  the next block changes nothing the audit reads, or on a snapshot made with
  `git stash create` and a detached worktree.
- Worker, auditor, and reviewer skills: a required check that did not run is
  not a pass; the reviewer reads the whole diff, fixes and earlier audited
  areas included; HANDOFF.OPEN keeps everything still open.
- The always-loaded instruction blocks keep their previous text, with one
  correction: Claude Code reads `AGENTS.md` only when there is no `CLAUDE.md`.
- Claude `workforce-worker-lite` turn limit 130, so the handoff fits after its
  120-call budget. Enhanced design and stage fallback is `opus` high, matching
  the installed roles. Codex escalation rules no longer contradict the Sol and
  Luna xhigh roles. Behavior cases cover these transitions in pairs. Policy:
  Claude 1.6.0, Codex 1.8.0.

- Rename the project to Agent Cooperator (`shanja-glinka/agent-cooperator`).
  New entry command `agent-cooperator claude|codex <install|update|status|uninstall>`;
  the `claude-workforce` and `codex-workforce` binaries, role names, state
  directories, and instruction markers are unchanged, so installations update
  in place.
- Worker ladder with handoff, both editions. The cooperator holds a budget per
  worker tier and block: Claude `haiku` 120 tool calls per run (new role
  `workforce-worker-lite`), 3 attempts, 400k tokens; `sonnet` 3 attempts, 500k;
  Codex Luna 600 tool calls per run, 3 attempts, 400k; Sol 3 attempts, 500k. A worker at its
  limit returns `STATUS: handoff` (DONE, STOPPED_AT, TRIED, OPEN, NEXT); a block
  that exhausts a tier moves up (Claude: `sonnet` → `opus`, Hybrid `haiku` →
  Codex GPT-6.1 Sol xhigh → `opus`; Codex: Luna → Sol → Astra) as a fresh
  agent with the original packet, the cooperator's APPROACH, and the handoff
  only. Auditors on `haiku` or Luna follow the same 400k ceiling.
- The orchestration skills now describe the cooperator as the brain of the
  task: it analyzes handoffs and decides whether to continue, change approach,
  or split and re-scope a block.
- Codex: Standard workers run GPT-6.1 Sol at xhigh; new Economy profile with
  Luna xhigh workers and the `workforce-economy` launch layer.
- Claude Hybrid: `codex-run.mjs --role work` runs an escalated worker on Sol
  with a writable workspace; `result.json` includes observed usage and its
  availability status.

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
