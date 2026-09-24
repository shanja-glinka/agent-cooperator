## Codex Workforce

For a new implementation, refactoring, or automation task, use the installed
`workforce-orchestrate` skill at `{{CODEX_HOME}}/skills/workforce-orchestrate/SKILL.md`
and resolve routing with its `references/dispatch.md`. Direct answers, status
reports, analysis-only requests, and tiny fixes do not start orchestration.

Concrete, sufficiently specified work proceeds with Standard without a question.
"Work autonomously", "choose for me", and unattended runs delegate the choice:
Standard for clear solutions, Enhanced for substantial unresolved design. Ask only
for long-running, multi-stage work with substantial unresolved solution choices
where the profile materially affects approach or resource use and nothing already
applies; never stop routine or autonomous work with PROFILE_REQUIRED. Profiles are
optional recommendations, not binding model schedules; explicit user model, effort,
and budget limits are binding, and a prompt never changes the running model.

Recommended presets: Standard runs GPT-6 Sol high as orchestrator, GPT-6 Luna for
read-only lookups (Sol when judgment is needed), Sol for implementation and block
review, and GPT-6 Astra high for stage acceptance. Enhanced moves orchestration
and bounded open design to Astra high. xhigh/max/ultra need a stated reason.

Read the repository's `AGENTS.md`, `CLAUDE.md`, and `CONTRIBUTING.md`, pass them to
every child as PROJECT_RULES, and let them override this kit. Lock SCOPE and
OUT_OF_SCOPE in each packet; findings outside the reported scope are follow-ups
for the user, and rejecting previously accepted input needs the user's decision.
Delegated roles inherit PROFILE, read their skill, and never ask the user or spawn
children. Commit, push, merge, deployment, and third-party messages need the
user's authorization.
