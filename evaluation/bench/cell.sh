#!/bin/zsh
# One benchmark cell: isolated repository and kit, one agent run, the suite's quality check.
# usage: cell.sh <out> <suite> <task> <variant-name> <model> <repeat>
set -uo pipefail
OUT=$1; SUITE=$2; TASK=$3; VARIANT=$4; MODEL=$5; REPEAT=$6
source $SUITE/suite.env
ID=$TASK-$VARIANT-$MODEL-r$REPEAT
# Results stay with the run; checkouts and homes live outside $HOME, because Claude Code
# reads CLAUDE.md and AGENTS.md from every parent directory of the checkout.
CELL=$OUT/cells/$ID; LOG=$CELL/logs
WORK=${BENCH_TMP:-/private/tmp/agent-cooperator-bench}/${OUT:t}/$ID; WT=$WORK/repo; HOMES=$WORK/homes
BRANCH=bench/${OUT:t}/$ID
mkdir -p $LOG $HOMES
echo "$TASK $VARIANT $MODEL $REPEAT" > $CELL/cell.txt

# A fresh repository with only the task's base commit and its history: no other branches,
# no remote, no results of other cells. BASE_<task> in the suite overrides BASE.
TASK_BASE=BASE_$TASK
BASE=$(git -C $REPO rev-parse "${(P)TASK_BASE:-$BASE}^{commit}")
git init -q $WT
git -C $WT fetch -q --no-tags $REPO $BASE
git -C $WT checkout -q -b $BRANCH $BASE
rm -f $WT/.git/FETCH_HEAD
# The kit is installed into each Claude checkout's .claude/; keep it out of the agents' git status.
echo '/.claude/' >> $WT/.git/info/exclude
(cd $WT && zsh $SUITE/setup.sh $REPO)

KIT=$OUT/kits/$VARIANT
# Signed-in Claude config dir and Codex auth file; the suite may set both.
CLAUDE_DIR=${BENCH_CLAUDE_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}
CODEX_AUTH=${BENCH_CODEX_AUTH:-${CODEX_HOME:-$HOME/.codex}/auth.json}
if [[ $MODEL == sol ]]; then
  CH=$HOMES/codex; FH=$HOMES/home
  mkdir -p $CH $FH/.agents/skills
  cat > $CH/config.toml <<TOML
model = "gpt-6.1-sol"
model_reasoning_effort = "high"
model_reasoning_summary = "detailed"
approval_policy = "never"
sandbox_mode = "danger-full-access"
cli_auth_credentials_store = "file"

[features]
multi_agent = true

[agents]
max_depth = 1

[projects."$WT"]
trust_level = "trusted"
TOML
  ln -sf $CODEX_AUTH $CH/auth.json
  printf '[user]\n\tname = %s\n\temail = %s\n' "$(git -C $REPO config user.name)" "$(git -C $REPO config user.email)" > $FH/.gitconfig
  [[ -d $KIT ]] && node $KIT/bin/agent-cooperator.js codex install --codex-home $CH --skills-dir $FH/.agents/skills >/dev/null
elif [[ -d $KIT ]]; then
  node $KIT/bin/agent-cooperator.js claude install --claude-home $WT/.claude >/dev/null
  for pair in ${=BENCH_MAXTURNS:-}; do
    f=$WT/.claude/agents/${pair%%:*}.md
    [[ -f $f ]] && sed -i '' -E "s/^maxTurns: .*/maxTurns: ${pair##*:}/" $f
  done
fi

if [[ -z ${DRY:-} ]]; then
  PROMPT=$(sed "s#{BRANCH}#$BRANCH#g" $SUITE/tasks/$TASK.txt)
  CLEAN=(-u CLAUDECODE -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_CODE_SESSION_ATTENDED -u CLAUDE_PID -u CLAUDE_EFFORT -u CLAUDE_CODE_ENTRYPOINT)
  date -u +%FT%TZ > $LOG/start.txt
  cd $WT
  if [[ $MODEL == opus ]]; then
    [[ -d $KIT ]] && PROMPT="/workforce-orchestrate $PROMPT"
    SID=$(uuidgen | tr A-Z a-z); echo $SID > $LOG/session-id.txt
    env $CLEAN CLAUDE_CONFIG_DIR=$CLAUDE_DIR claude -p "$PROMPT" --session-id $SID --model opus --effort medium \
      --setting-sources project,local --dangerously-skip-permissions --output-format stream-json --verbose \
      --forward-subagent-text --max-budget-usd 60 < /dev/null > $LOG/claude.stream.jsonl 2> $LOG/claude.stderr &
  else
    PROFILE=(); [[ -d $KIT ]] && PROFILE=(-p workforce-standard)
    env $CLEAN -u CLAUDE_CONFIG_DIR HOME=$HOMES/home CODEX_HOME=$HOMES/codex codex exec --json $PROFILE -C $WT \
      --dangerously-bypass-approvals-and-sandbox -o $LOG/codex.last.md "$PROMPT" < /dev/null > $LOG/codex.events.jsonl 2> $LOG/codex.stderr &
  fi
  PID=$!
  ( sleep 10800; kill -TERM $PID 2>/dev/null && echo watchdog > $LOG/killed.txt ) &
  WATCH=$!
  wait $PID; echo $? > $LOG/exit.txt
  kill $WATCH 2>/dev/null
  date -u +%FT%TZ > $LOG/end.txt
  cd $CELL

  if [[ $MODEL == opus ]]; then
    TRANSCRIPT=$(find $CLAUDE_DIR/projects -maxdepth 2 -name "$SID.jsonl" | head -1)
    mkdir -p $LOG/transcripts
    if [[ -n $TRANSCRIPT ]]; then
      cp $TRANSCRIPT $LOG/transcripts/main.jsonl
      [[ -d ${TRANSCRIPT:h}/$SID/subagents ]] && cp ${TRANSCRIPT:h}/$SID/subagents/* $LOG/transcripts/
    fi
  else
    mkdir -p $LOG/rollouts
    find $HOMES/codex/sessions -name '*.jsonl' -exec cp {} $LOG/rollouts/ \; 2>/dev/null
  fi
  # What the agent left: commits on top of the base and uncommitted files, before the check builds.
  printf '{"Коммитов":%d,"Незакоммичено файлов":%d}\n' $(git -C $WT rev-list --count $BASE..HEAD) $(git -C $WT status --porcelain | wc -l) > $CELL/git.json
  (cd $WT && zsh $SUITE/checks/$TASK.sh $REPO $BASE) > $CELL/check.json 2> $CELL/check.stderr
  git -C $WT diff --stat $BASE HEAD > $CELL/diffstat.txt
  git -C $WT diff $BASE HEAD > $CELL/diff.patch
  # The result also stays on a branch of the target repository (local; nothing is pushed elsewhere).
  git -C $WT push -q $REPO +HEAD:refs/heads/$BRANCH
fi

rm -f $HOMES/codex/auth.json
rm -rf $WORK
echo "cell $ID done"
