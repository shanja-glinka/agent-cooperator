## Codex Workforce

For a new implementation, refactoring, or automation task, use the installed
`workforce-orchestrate` skill at `{{CODEX_HOME}}/skills/workforce-orchestrate/SKILL.md`.
Resolve the profile using `references/dispatch.md`. Reuse explicit choices and
applicable standing preferences. Concrete, sufficiently specified tasks and small
fixes proceed with Standard without a questionnaire. "Work autonomously", "choose
for me", "no profile questions", and unattended execution delegate selection: choose
Standard for clear solutions or Enhanced for substantial unresolved design and proceed.
Ask only for long-running, multi-stage work with substantial unresolved solution
choices where the profile materially affects approach or resource use, with no prior
choice or delegated selection. Duration, production risk, urgency, and step count alone
are not reasons to ask. If this narrow question applies, explain both profiles and
wait for an explicit answer while completing independent authorized prerequisites.
Preserve the choice and its source for continuations; do not stop routine or autonomous
work with PROFILE_REQUIRED.

Standard and Enhanced are optional starting recommendations, not exhaustive or
binding model/effort schedules. Choosing a profile expresses an approach preference;
it does not by itself require its exact models, efforts, or team composition. Adapt
routing to the task, available capabilities, and user limits, or use a custom setup
without a named profile. Only separately explicit model/effort/budget constraints
make those settings mandatory. Keep review independence and verification requirements.

The recommended presets combine GPT-6 Astra and GPT-5.5. Standard suggests Astra low for
orchestration, GPT-5.5 medium for research, GPT-5.5 high for implementation,
GPT-5.5 xhigh for block review, and Astra high for stage acceptance. Enhanced
retains these GPT-5.5 roles, uses Astra high for orchestration, and assigns bounded
unresolved design/algorithm work to Astra high; xhigh/max requires a stated reason.

Only the user-facing orchestrator asks. Delegated agents inherit PROFILE and read
their assigned worker/probe/review skill; they do not ask the user again or spawn
children. Direct answers, status reports, and analysis-only requests do not start
implementation. For tiny changes, use the selected profile without mandatory fan-out.
A selected profile also permits adaptation to available runtime settings without
a new approval gate; disclose material routing choices honestly. Explicit strict model,
effort, and budget requirements still apply; never claim a model changed through text.

Delegate complete results with explicit ownership; workers self-review, an
independent reviewer checks a completed substantial block, and an independent stage reviewer accepts a
major stage (Astra high is the recommended starting point). Do not attach permanent auditors, repeat reviews after every edit,
or substitute inventory/counts for requested implementation. Follow applicable
project conventions and the user's scope and publication permissions.

Model and effort must be selected through actual runtime controls. Never claim
that an instruction changed the running model. Read dispatch for mismatch handling.
This kit neither requires GSD nor grants extra file, network, or publication rights.
