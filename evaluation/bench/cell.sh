#!/bin/zsh
# One benchmark cell in a container of its own: the checkout, /tmp, the CLI homes, the agent,
# its subagents, and every process they start live there and end with it. The suite's quality
# check runs in the same container after the agent has finished.
# usage: cell.sh <out> <suite> <task> <variant-name> <model> <repeat>
set -uo pipefail
OUT=$1; SUITE=$2; TASK=$3; VARIANT=$4; MODEL=$5; REPEAT=$6
source $SUITE/suite.env
ID=$TASK-$VARIANT-$MODEL-r$REPEAT
CELL=$OUT/cells/$ID; LOG=$CELL/logs
WORK=${BENCH_TMP:-/private/tmp/agent-cooperator-bench}/${OUT:t}/$ID
BRANCH=bench/${OUT:t}/$ID
CID=bench-${OUT:t}-$ID
mkdir -p $LOG $WORK
echo "$TASK $VARIANT $MODEL $REPEAT" > $CELL/cell.txt
in_cell() { docker exec -u node -w /work/repo $CID "$@"; }
# macOS tar would add AppleDouble files and extended attributes.
pack() { COPYFILE_DISABLE=1 tar --no-mac-metadata --no-xattrs -cf - "$@"; }

# A fresh repository with only the task's base commit and its history: no other branches,
# no remote, no results of other cells. BASE_<task> in the suite overrides BASE.
TASK_BASE=BASE_$TASK
BASE=$(git -C $REPO rev-parse "${(P)TASK_BASE:-$BASE}^{commit}")
git init -q $WORK/repo
git -C $WORK/repo fetch -q --no-tags $REPO $BASE
git -C $WORK/repo checkout -q -b $BRANCH $BASE
rm -f $WORK/repo/.git/FETCH_HEAD
# The kit is installed into each Claude checkout's .claude/; keep it out of the agents' git status.
echo '/.claude/' >> $WORK/repo/.git/info/exclude

MOUNTS=()
[[ $MODEL == sol ]] && MOUNTS=(-v ${BENCH_CODEX_AUTH:-${CODEX_HOME:-$HOME/.codex}/auth.json}:/home/node/.codex/auth.json)
docker rm -f $CID >/dev/null 2>&1
docker run -d --init --name $CID --memory ${BENCH_MEMORY:-3g} --cpus ${BENCH_CPUS:-4} $MOUNTS $BENCH_IMAGE sleep infinity >/dev/null
(cd $WORK/repo && pack .) | docker exec -i -u node $CID tar -C /work/repo -xf -
docker exec -u node $CID git config --global user.name "$(git -C $REPO config user.name)"
docker exec -u node $CID git config --global user.email "$(git -C $REPO config user.email)"

KIT=$OUT/kits/$VARIANT
if [[ $MODEL == sol ]]; then
  docker exec -i -u node $CID sh -c 'cat > /home/node/.codex/config.toml' <<TOML
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

[projects."/work/repo"]
trust_level = "trusted"
TOML
fi
if [[ -d $KIT ]]; then
  (cd $KIT && pack --exclude ./.git .) | docker exec -i -u node $CID sh -c 'mkdir -p /home/node/kit && tar -C /home/node/kit -xf -'
  if [[ $MODEL == sol ]]; then
    docker exec -u node $CID node /home/node/kit/bin/agent-cooperator.js codex install --codex-home /home/node/.codex --skills-dir /home/node/.agents/skills >/dev/null
  else
    docker exec -u node $CID node /home/node/kit/bin/agent-cooperator.js claude install --claude-home /work/repo/.claude >/dev/null
    for pair in ${=BENCH_MAXTURNS:-}; do
      in_cell sed -i -E "s/^maxTurns: .*/maxTurns: ${pair##*:}/" .claude/agents/${pair%%:*}.md 2>/dev/null
    done
  fi
  docker exec -u node $CID rm -rf /home/node/kit
fi

if [[ -z ${DRY:-} ]]; then
  PROMPT=$(sed "s#{BRANCH}#$BRANCH#g" $SUITE/tasks/$TASK.txt)
  date -u +%FT%TZ > $LOG/start.txt
  # The watchdog runs inside the container: stopping a `docker exec` client leaves its process running.
  if [[ $MODEL == opus ]]; then
    [[ -d $KIT ]] && PROMPT="/workforce-orchestrate $PROMPT"
    SID=$(uuidgen | tr A-Z a-z); echo $SID > $LOG/session-id.txt
    CLAUDE_CODE_OAUTH_TOKEN=$(<$BENCH_CLAUDE_TOKEN_FILE) docker exec -i -u node -w /work/repo \
      -e CLAUDE_CODE_OAUTH_TOKEN -e CLAUDE_CONFIG_DIR=/home/node/.claude $CID \
      timeout -s TERM 10800 claude -p "$PROMPT" --session-id $SID --model opus --effort medium \
      --setting-sources project,local --dangerously-skip-permissions --strict-mcp-config --output-format stream-json --verbose \
      --forward-subagent-text --max-budget-usd 60 < /dev/null > $LOG/claude.stream.jsonl 2> $LOG/claude.stderr
  else
    PROFILE=(); [[ -d $KIT ]] && PROFILE=(-p workforce-standard)
    docker exec -i -u node -w /work/repo -e CODEX_HOME=/home/node/.codex $CID \
      timeout -s TERM 10800 codex exec --json $PROFILE -C /work/repo --dangerously-bypass-approvals-and-sandbox \
      -o /home/node/codex.last.md "$PROMPT" < /dev/null > $LOG/codex.events.jsonl 2> $LOG/codex.stderr
  fi
  echo $? > $LOG/exit.txt
  [[ $(<$LOG/exit.txt) == 124 ]] && echo watchdog > $LOG/killed.txt
  date -u +%FT%TZ > $LOG/end.txt

  mkdir -p $LOG/transcripts $LOG/rollouts
  if [[ $MODEL == opus ]]; then
    docker cp -q $CID:/home/node/.claude/projects $WORK/projects 2>/dev/null
    TRANSCRIPT=$(find $WORK/projects -maxdepth 2 -name "$SID.jsonl" 2>/dev/null | head -1)
    if [[ -n $TRANSCRIPT ]]; then
      cp $TRANSCRIPT $LOG/transcripts/main.jsonl
      [[ -d ${TRANSCRIPT:h}/$SID/subagents ]] && cp ${TRANSCRIPT:h}/$SID/subagents/* $LOG/transcripts/
    fi
  else
    docker cp -q $CID:/home/node/codex.last.md $LOG/codex.last.md 2>/dev/null
    docker cp -q $CID:/home/node/.codex/sessions $WORK/sessions 2>/dev/null
    find $WORK/sessions -name '*.jsonl' -exec cp {} $LOG/rollouts/ \; 2>/dev/null
  fi

  # What the agent left, recorded before the check builds anything.
  COMMITS=$(in_cell git rev-list --count $BASE..HEAD)
  DIRTY=$(in_cell sh -c 'git status --porcelain | wc -l')
  printf '{"Коммитов":%d,"Незакоммичено файлов":%d}\n' $COMMITS $DIRTY > $CELL/git.json
  printf '{"base":"%s","head":"%s","image":"%s"}\n' $BASE $(in_cell git rev-parse HEAD) $(docker inspect -f '{{.Image}}' $CID) > $CELL/provenance.json
  # The suite's checks and hidden tests enter the container only now.
  (cd $SUITE && pack ./checks) | docker exec -i -u node $CID sh -c 'mkdir -p /home/node/suite /home/node/check-logs && tar -C /home/node/suite -xf -'
  docker exec -u node -w /work/repo -e CI_LOG_DIR=/home/node/check-logs $CID \
    zsh /home/node/suite/checks/$TASK.sh /work/repo $BASE > $CELL/check.json 2> $CELL/check.stderr
  docker cp -q $CID:/home/node/check-logs $CELL/check-logs 2>/dev/null
  in_cell git diff --stat $BASE HEAD > $CELL/diffstat.txt
  in_cell git diff $BASE HEAD > $CELL/diff.patch
  # The result stays on a branch of the target repository (a local fetch; nothing is pushed elsewhere).
  if (( COMMITS > 0 )); then
    in_cell git bundle create -q /home/node/result.bundle HEAD ^$BASE
    docker cp -q $CID:/home/node/result.bundle $WORK/result.bundle
    git -C $REPO fetch -q $WORK/result.bundle +HEAD:refs/heads/$BRANCH
  else
    git -C $REPO branch -f $BRANCH $BASE
  fi
fi

docker rm -f $CID >/dev/null
rm -rf $WORK
echo "cell $ID done"
