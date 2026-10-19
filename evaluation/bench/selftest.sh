#!/bin/zsh
# Checks the isolation of bench cells and the evidence of their checks without starting an agent.
# With --agents it also asks each CLI for one short answer inside a cell (a few tokens).
# usage: evaluation/bench/selftest.sh <suite-dir> [--agents]
set -uo pipefail
BENCH=${0:A:h}; SUITE=${1:A}; AGENTS=${2:-}
source $SUITE/suite.env
FAIL=0
ok() { echo "ok   $1"; }
bad() { echo "FAIL $1"; FAIL=1; }
start() { docker rm -f $1 >/dev/null 2>&1; docker run -d --init --name $1 --memory 1g "${@:2}" $BENCH_IMAGE sleep infinity >/dev/null; }
x() { local c=$1; shift; docker exec -u node $c "$@"; }
pack() { COPYFILE_DISABLE=1 tar --no-mac-metadata --no-xattrs -cf - "$@"; }

# 1. Two cells running at once write the same absolute path; each reads back only its own.
start bench-selftest-a; start bench-selftest-b
x bench-selftest-a sh -c 'echo A > /tmp/ci.log'; x bench-selftest-b sh -c 'echo B > /tmp/ci.log'
[[ $(x bench-selftest-a cat /tmp/ci.log) == A && $(x bench-selftest-b cat /tmp/ci.log) == B ]] \
  && ok "two running cells writing /tmp/ci.log each read their own file" || bad "two running cells share /tmp/ci.log"

# 2. Nothing of a removed cell reaches the next one: no file, no process.
x bench-selftest-a sh -c 'nohup sleep 600 >/dev/null 2>&1 &'
docker rm -f bench-selftest-a bench-selftest-b >/dev/null
start bench-selftest-c
x bench-selftest-c test ! -e /tmp/ci.log && ok "a new cell does not see a removed cell's /tmp" || bad "a removed cell's /tmp/ci.log is visible"
[[ -z $(x bench-selftest-c pgrep -f 'sleep 600') && -z $(docker ps -aq --filter name=bench-selftest-a) ]] \
  && ok "a removed cell leaves no process or container" || bad "a removed cell left a process or container"

# 3. The checks keep a failing CI failing, even when its log says tests passed; a CI that passes
#    on the second attempt is marked as such; each attempt keeps its own log.
(cd $SUITE && pack ./checks) | docker exec -i -u node bench-selftest-c sh -c 'mkdir -p /home/node/suite && tar -C /home/node/suite -xf -'
ci() { x bench-selftest-c sh -c "rm -rf /home/node/ci /home/node/logs && mkdir -p /home/node/ci && cd /home/node/ci && printf '%s' '{\"scripts\":{\"ci\":\"$1\"}}' > package.json && CI_LOG_DIR=/home/node/logs zsh -c 'source /home/node/suite/checks/lib.sh; run_ci; echo \$CIRC \$TESTS' && ls /home/node/logs | tr '\n' ' '"; }
[[ $(ci 'echo Tests: 0 skipped, 5 passed; exit 3') == "3 5"*"ci-1.log ci-2.log " ]] \
  && ok "a failing CI stays failing and both attempts keep their logs" || bad "a failing CI was not recorded as failing"
[[ $(ci 'test -f flag && echo Tests: 0 skipped, 7 passed || { touch flag; exit 1; }') == "retry 7"*"ci-1.log ci-2.log " ]] \
  && ok "a CI that passes on the second attempt is marked retry" || bad "a second-attempt pass was not marked"

# 4. A cell's checkout arrives intact: the base commit, no AppleDouble files, a clean tree, writable.
SEED=$(mktemp -d)/repo
git init -q $SEED && git -C $SEED fetch -q --no-tags $REPO $(git -C $REPO rev-parse "$BASE^{commit}") && git -C $SEED checkout -q -b selftest FETCH_HEAD && rm -f $SEED/.git/FETCH_HEAD
(cd $SEED && pack .) | docker exec -i -u node bench-selftest-c tar -C /work/repo -xf -
[[ $(x bench-selftest-c git -C /work/repo rev-parse HEAD) == $(git -C $REPO rev-parse "$BASE^{commit}") \
   && -z $(x bench-selftest-c git -C /work/repo status --porcelain) \
   && -z $(x bench-selftest-c find /work/repo -name '._*' -not -path '*/node_modules/*') ]] \
   && x bench-selftest-c git -C /work/repo fsck --no-progress >/dev/null 2>&1 && x bench-selftest-c touch /work/repo/.w \
  && ok "the checkout arrives intact and writable" || bad "the checkout is not intact"
rm -rf ${SEED:h}

# 5. Optional: each CLI answers inside a cell with the suite's credentials.
if [[ $AGENTS == --agents ]]; then
  [[ $(CLAUDE_CODE_OAUTH_TOKEN=$(<$BENCH_CLAUDE_TOKEN_FILE) docker exec -u node -w /work/repo -e CLAUDE_CODE_OAUTH_TOKEN -e CLAUDE_CONFIG_DIR=/home/node/.claude bench-selftest-c \
     claude -p 'Reply with the single word OK.' --model haiku --strict-mcp-config --max-turns 1 < /dev/null 2>&1) == *OK* ]] \
    && ok "Claude Code answers in a cell" || bad "Claude Code does not answer in a cell"
  start bench-selftest-d -v $BENCH_CODEX_AUTH:/home/node/.codex/auth.json
  [[ $(docker exec -u node -w /work -e CODEX_HOME=/home/node/.codex bench-selftest-d \
     codex exec --skip-git-repo-check -c model_reasoning_effort=low 'Reply with the single word OK.' < /dev/null 2>/dev/null) == *OK* ]] \
    && ok "Codex answers in a cell" || bad "Codex does not answer in a cell"
  docker rm -f bench-selftest-d >/dev/null
fi
docker rm -f bench-selftest-c >/dev/null
exit $FAIL
