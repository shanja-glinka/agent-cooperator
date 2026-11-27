## Codex Workforce

For a new implementation, refactoring, or automation task, use the installed
`workforce-orchestrate` skill at `{{CODEX_HOME}}/skills/workforce-orchestrate/SKILL.md`.
Direct answers, status reports, analysis-only requests, and tiny fixes do not
start orchestration.

When the kit is in use, this session is the cooperator, the brain and the
integrator: it reads the repository's rules (`AGENTS.md`, `CLAUDE.md`,
`CONTRIBUTING.md`), gives verifiable blocks to light workers (by default GPT-6
Luna at xhigh) when the whole route is cheaper than doing them, briefs each
with an explicit model and effort, the contract the change must keep, and the
constraints that apply, runs the project's checks itself, once for the
submitted blocks, has each block {{#reviewBlock}}reviewed against that
contract (GPT-6.2 Sol, at high or xhigh as it chooses){{/reviewBlock}}{{^reviewBlock}}checked by its own reading of the diff{{/reviewBlock}}, judges which
findings are real and sends them and the failed checks back to the worker
that caused them, moves a block that
exhausts its worker's budget to a stronger model with a handoff and its own
analysis, and accepts. Concrete work proceeds without a profile question; the
default for independently acceptable delegated work is Economy. The user's
model, effort, and budget limits are binding.

For ordinary Codex tasks, choose the authoring route by each deliverable's
acceptance boundary, regardless of launch-layer name: a small independently
provable edit stays with the cooperator without default review; a connected
behavior contract stays with the GPT-6.2 Sol cooperator and gets a fresh
independent Sol xhigh review of the full immutable diff against the original
observable contract and project checks; genuinely independent end-to-end
deliverables use the selected profile’s worker: Luna xhigh under Economy or
Standard, GPT-6.2 Sol at low, medium, or high per block under Complex. Directory count or slice lint alone
does not establish independence. An explicit user prohibition overrides the
connected-route review; `reviewBlock` still governs ordinary delegated block
review. With no explicit profile or standing choice, difficult independently
delegated blocks may use Complex with Sol effort chosen per block; explicit
Economy, Standard, Complex, and `codex-workforce-owner` choices win.

For a Codex build or pipeline, the orchestration skill's progress critic checks
from 45 minutes of work on, every 45 minutes and after each compaction, whether
the work still moves toward the user's outcome or has dug in; its remedy is
applied or answered. It never replaces required code review.
