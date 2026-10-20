#!/bin/zsh
# Narrow check, before a run, of the wait limits the Codex launch layer sets. In an isolated
# CODEX_HOME with the kit installed, a Sol cooperator (codex -p workforce-economy) spawns one Luna
# worker and waits for it:
#   finish   the worker sleeps 60 s and finishes; wait_agent without timeout_ms must return on the
#            finish (about 60 s), not on Codex's 30-second default
#   message  the worker messages the cooperator first, then sleeps 60 s; the wait must return on
#            the message within seconds
#   short    the cooperator asks for timeout_ms 60000 while the worker sleeps 120 s; Codex must
#            raise it to the layer's minimum and the wait must return on the finish
# usage: waitcheck.sh <kit-dir> <out-dir>   env: BENCH_CODEX_AUTH (the bench's Codex auth file)
set -uo pipefail
KIT=${1:A}; OUT=${2:A}; BENCH=${0:A:h}
mkdir -p $OUT
for name in finish message short; do
  W=$OUT/$name
  mkdir -p $W/home $W/work $W/skills
  CH=$W/home
  ln -sf ${BENCH_CODEX_AUTH:-$HOME/.codex/auth.json} $CH/auth.json
  cat > $CH/config.toml <<TOML
model = "gpt-6.1-sol"
model_reasoning_effort = "high"
approval_policy = "never"
sandbox_mode = "danger-full-access"
cli_auth_credentials_store = "file"

[features]
multi_agent = true

[agents]
max_depth = 1

[projects."$W/work"]
trust_level = "trusted"
TOML
  node $KIT/bin/agent-cooperator.js codex install --codex-home $CH --skills-dir $W/skills > $W/install.txt
  git -C $W/work init -q
  case $name in
    finish) TASK='Run the shell command `sleep 60`, then reply DONE and nothing else.'; WAIT='call wait_agent once without timeout_ms' ;;
    message) TASK='First send the message "BLOCKER: test" to your parent agent with send_message. Then run the shell command `sleep 60`, then reply DONE.'; WAIT='call wait_agent once without timeout_ms' ;;
    short) TASK='Run the shell command `sleep 120`, then reply DONE and nothing else.'; WAIT='call wait_agent once with timeout_ms 60000' ;;
  esac
  PROMPT="This is a test of the waiting mechanism, not a task. Do exactly this and nothing else: 1) spawn one agent with spawn_agent: agent_type workforce_worker, model gpt-6-luna, reasoning_effort low, fork_turns none, message: '$TASK' 2) $WAIT. 3) Reply with what wait_agent returned, verbatim."
  START=$(date +%s)
  env CODEX_HOME=$CH codex exec --json -p workforce-economy -C $W/work --dangerously-bypass-approvals-and-sandbox -o $W/last.md "$PROMPT" < /dev/null > $W/events.jsonl 2> $W/stderr.txt
  print -r -- "$name: codex exit=$? wall=$(( $(date +%s) - START ))s"
  node $BENCH/waitcheck.mjs $CH/sessions
done
