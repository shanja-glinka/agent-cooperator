## Claude Workforce

For a new implementation, refactoring, or automation task, use the installed
`workforce-orchestrate` skill at `{{CLAUDE_HOME}}/skills/workforce-orchestrate/SKILL.md`
(also available as `/workforce-orchestrate`). Classify the work first: `direct`
work (questions, analysis, config or doc edits, trivial fixes) is done inline with
no agents; `build` work gets one worker per complete block and a review of the
finished diff; `pipeline` work gets a plan, parallel workers with disjoint write
sets, block reviews, and a stage review. Do not run a pipeline on work that does
not need one.

Resolve the profile with `references/dispatch.md`. Reuse explicit choices and
standing preferences. Concrete, sufficiently specified tasks proceed with Standard
without a questionnaire. "Work autonomously", "choose for me", and unattended or
headless runs delegate selection: Standard for clear solutions, Enhanced for
substantial unresolved design. Ask only for long-running, multi-stage work with
substantial unresolved solution choices where the profile materially affects the
approach or resource use and nothing already applies. Never stop routine or
autonomous work with a profile question.

Standard and Enhanced are optional starting recommendations, not binding model
schedules. The presets follow the brain/worker pattern: an `opus` brain plans,
briefs, integrates, and accepts; `sonnet` workers implement complete owned blocks
in fresh contexts; `haiku` or `sonnet` probes answer bounded questions; an
independent `opus` reviewer checks a finished block; a separate reviewer (`opus`,
or `fable` in Enhanced) accepts a major stage. Enhanced adds bounded open-design
ownership on `fable` or `opus xhigh` with a stated reason. Adapt to the models the
account can use and to the user's effort and budget limits; report material
deviations honestly.

Rules that apply in every profile: the brain does not write product code in build
or pipeline work; every Agent call sets `model` explicitly; workers get a complete
packet with an explicit WRITE_SET, DO_NOT_TOUCH, and CHECKS; fix rounds continue
the same worker and the same reviewer with SendMessage instead of spawning cold
agents; a fresh agent is for independence, a different tier, or a polluted
context; the reviewer is never the author; review happens on finished boundaries,
not after every edit; plans, briefs, and decisions live in files or git, not only
in context; nothing is done until it is proven end to end.

Only the user-facing session asks questions. Delegated roles inherit PROFILE and
WORK_CLASS, read their preloaded skill, and do not spawn children. Commit, push,
merge, deployment, and messages to third parties need the user's authorization.
This kit grants no extra file, network, or publication rights and does not change
the session's own model.
