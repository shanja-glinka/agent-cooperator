# Installation contract

## Distribution and commands

Node.js 22+, npm, and Git are required for the GitHub package command. The
`agent-cooperator` command takes the runtime first:

```sh
npx --yes github:shanja-glinka/agent-cooperator claude install
npx --yes github:shanja-glinka/agent-cooperator claude update
npx --yes github:shanja-glinka/agent-cooperator claude status
npx --yes github:shanja-glinka/agent-cooperator claude uninstall

npx --yes github:shanja-glinka/agent-cooperator codex install
npx --yes github:shanja-glinka/agent-cooperator codex update
npx --yes github:shanja-glinka/agent-cooperator codex status
npx --yes github:shanja-glinka/agent-cooperator codex uninstall
```

`install` and `update` also take `--set KEY=on|off`, which sets one install-policy
switch for that run. `reviewBlock` (review of the blocks light workers submit)
and `reviewStage` (stage review of interacting pipeline blocks) are both on by
default; the defaults come from the `policy` block of the runtime's
`profiles.json`. For example, `npx --yes github:shanja-glinka/agent-cooperator
claude install --set reviewBlock=off --set reviewStage=off` installs with both
reviews off. Every installed text (skills, references, the managed instruction
block, `profiles.json`, and Codex launch layers) renders from the chosen values,
so pass `--set` again on `update`; a plain `update` renders the defaults. An
unknown key is rejected.

The package also keeps the older binaries `claude-workforce` and
`codex-workforce` (`npx -p github:shanja-glinka/agent-cooperator claude-workforce
status`). Pin a version with `github:shanja-glinka/agent-cooperator#<tag>` or a
reviewed commit SHA; tags up to v1.3.2 predate the `agent-cooperator` command
and use the older binaries. `update` reads the payload in the invoked package.
It does not run `git pull`, an npm updater, or a remote install script.

The package has no install/prepare lifecycle hooks. Downloading or packing it does
not modify anything. A mutation requires an explicit `install`, `update`, or
`uninstall` command. A separate npm registry publication is unnecessary.

## Destinations

### Codex

Codex home is selected in this order: `--codex-home PATH`, existing `CODEX_HOME`,
then `~/.codex`. The command does not rewrite environment variables or shell profiles.

```text
CODEX_HOME/
  agents/workforce_probe.toml
  agents/workforce_worker.toml
  agents/workforce_auditor.toml
  agents/workforce_reviewer.toml
  skills/workforce-orchestrate/...
  skills/workforce-worker/...
  skills/workforce-probe/...
  skills/workforce-audit/...
  skills/workforce-review/...
  skills/workforce-smoke/...
  workforce-standard.config.toml
  workforce-economy.config.toml
  codex-workforce/profiles.json
  codex-workforce/manifest.json
  AGENTS.md                         (or the active AGENTS.override.md)
```

Native skill discovery uses links in `~/.agents/skills`, or `--skills-dir PATH` when
specified. File contents stay in Codex home. Windows may require permission to create
directory links. An alternate discovery directory is useful for isolated tests but
is not automatically a Codex discovery root; use a directory your runtime scans.

Both destinations must be isolated when testing:

```sh
node bin/agent-cooperator.js codex install --codex-home /tmp/workforce-demo/codex --skills-dir /tmp/workforce-demo/skills
node bin/agent-cooperator.js codex status --codex-home /tmp/workforce-demo/codex --skills-dir /tmp/workforce-demo/skills
node bin/agent-cooperator.js codex uninstall --codex-home /tmp/workforce-demo/codex --skills-dir /tmp/workforce-demo/skills
```

For multiple Codex homes, the same global skill names cannot simultaneously link
to different owners. The installer must report this collision rather than replace
another home's links. Choose the intended installation and discovery arrangement.

### Claude Code

Claude home is selected in this order: `--claude-home PATH` (or `--home`), existing
`CLAUDE_CONFIG_DIR`, then `~/.claude`. Claude Code discovers agents and skills inside
that directory, so there is no discovery link and `--skills-dir` is rejected.

```text
CLAUDE_HOME/
  agents/workforce-worker.md
  agents/workforce-worker-lite.md
  agents/workforce-probe.md
  agents/workforce-auditor.md
  agents/workforce-reviewer.md
  skills/workforce-orchestrate/...
  skills/workforce-worker/...
  skills/workforce-probe/...
  skills/workforce-audit/...
  skills/workforce-review/...
  skills/workforce-smoke/...
  claude-workforce/profiles.json
  claude-workforce/manifest.json
  CLAUDE.md                         (managed block between claude-workforce markers)
```

The managed block goes into the user `CLAUDE.md`; there is no override file in
Claude Code. `settings.json`, the session model, effort caps, permissions, and
project-level `.claude/` directories are never touched. Both kits may share a home
directory: each has its own manifest, state directory, and markers, so installing,
updating, or removing one leaves the other intact.

```sh
node bin/agent-cooperator.js claude install --claude-home /tmp/workforce-demo/claude
node bin/agent-cooperator.js claude status --claude-home /tmp/workforce-demo/claude
node bin/agent-cooperator.js claude uninstall --claude-home /tmp/workforce-demo/claude
```

## Preservation and ownership

The installer tracks owned file hashes, skill links, and its exact marked instruction
block. It preserves other agents, skills, base `config.toml`, authentication files,
and instruction text outside its markers. It never deletes the entire agents or
skills directory to perform an update.

If a nonempty global `AGENTS.override.md` is active, the managed block belongs there;
otherwise it belongs in `AGENTS.md`. A symlinked instruction file remains a symlink;
the existing target receives the narrow block edit. `status` detects when another
effective global file hides the installed instructions.

Changes are preflighted before writes. Unowned collisions or unexpected edited owned
content produce an error with a path. `--force` is for backing up and replacing/removing
edited **owned** content, not for taking over arbitrary files. Keep reported backups
until you are satisfied. Updates remove stale unchanged owned files as well as writing
the new payload. Uninstall removes the kit's block and owned content while retaining
unrelated additions. Removal does not revoke tasks already running in Codex.

Use `--dry-run` with a mutation command to inspect the proposed operation without
writing. `--json` provides structured results for scripts. Consult `--help` for the
complete installed CLI surface. Do not manually edit the ownership manifest.

## Optional cost settings (not installed)

The kit never edits `config.toml`. These Codex settings cut usage without touching
the workflow and are worth setting yourself:

```toml
# Cap how much of each tool output is kept in history (fewer tokens per turn)
tool_output_token_limit = 4000
# Compact history before it grows past the point where every turn is expensive
model_auto_compact_token_limit = 200000
# Safety net if a spawn omits an explicit model: use the cheap default, not the root model
[agents]
default_subagent_model = "gpt-6.1-sol"
default_subagent_reasoning_effort = "medium"
max_concurrent_threads_per_session = 3
```

Adjust the numbers to your plan and project; the keys are documented in the Codex
config reference. `/usage` in Codex shows actual token totals per session.

## Loading and verification

Start a fresh Codex or Claude Code session after installing or updating. In Claude
Code, `/agents` lists the four roles and `/workforce-orchestrate` appears in the
skill menu; `/workforce-smoke` runs the live routing check on explicit request. Current Codex automatically
discovers named TOML agents; this kit does not add legacy agent registration tables
or change `[agents]` settings. If your configuration disables subagents, installation
does not silently enable them. You must resolve that runtime setting yourself.

Run `status` to verify owned files, links, and the effective instruction block. It also
prints a `routing:` section: the policy version, the default profile's worker, block and
stage reviewers, and ladder, and for Codex each launch layer's wait limits. This is a
file-level check. It does not prove account model access, runtime dispatch,
instruction-following quality, or a successful product implementation.

For native CLI profile layers, current Codex supports:

```sh
codex -p workforce-standard
codex -p workforce-economy
```

These optional shortcuts explicitly choose a profile and set the root model/effort
for that launch. They do not permanently select a profile for all future work. Both
layers also set `[features.multi_agent_v2]` wait limits: a wait returns as soon as an
agent sends a message or finishes, and otherwise lasts 20 minutes.
Each layer also supplies a short `developer_instructions` value identifying the
explicit choice. As with other Codex config layers, this replaces that configuration
key for the launch; it does not merge a custom base `developer_instructions` string.
If you rely on that base key, use the client's model/effort controls and state the
profile in your task instead. Global and project `AGENTS.md` discovery still applies.
Older clients may lack named layers or dynamic model overrides; use supported client
controls, and do not claim full compatibility until the relevant capability is proven.
The desktop app may use a different Codex home than your shell: target it explicitly
when needed. A text instruction cannot switch an already-running root model.

## Existing project-local packs

Project-local roles and instructions may take precedence; skills with the same name
can also appear more than once. The global installer does not recursively modify
your repositories. Inspect the project's managed workflow block and update it to
route to `workforce-orchestrate` and the four `workforce_*` roles when migrating.
Retire obsolete local copies only after existing tasks no longer depend on them.

The old `astra_*`/`astra-*` names are not installed by this package. Existing copies
are not claimed or deleted merely because their names look related. This prevents
an update from destroying unrelated or locally customized work.

## References

Native discovery and precedence follow [Codex custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents),
[skill discovery](https://learn.chatgpt.com/docs/build-skills), and
[global AGENTS instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
The local CLI's `--help` is the authority for supported launch flags on your machine.
