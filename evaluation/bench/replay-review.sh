#!/bin/zsh
# Reviews a saved Claude cell's result again, without its cooperator: the cell's first review packet
# on the same tree, through the kit's own codex-run.mjs, in a fresh checkout and a fresh Codex home.
# The tree is rebuilt as the reviewer saw it, the cell's base checked out and its result as
# uncommitted changes, and the replay stops when the work tree does not hash to the packet's
# SNAPSHOT. A packet older than SNAPSHOT (before v8) gets the cell's final result. Nothing tells
# the reviewer what was found before.
#
# usage: evaluation/bench/replay-review.sh <out-dir> <suite-dir> <kit-dir> <source-cell-dir> <repeat>
#   out-dir: the replay run; cells/<source cell>-r<repeat>/logs gets the reviewer's files.
#   kit-dir: a kit checkout (the working tree, or a worktree of a commit) installed for the reviewer.
set -uo pipefail
BENCH=${0:A:h}
OUT=${1:A}; SUITE=${2:A}; KIT=${3:A}; SRC=${4:A}; REPEAT=$5
source $SUITE/suite.env
ID=${SRC:t}-r$REPEAT
CELL=$OUT/cells/$ID; LOG=$CELL/logs
WORK=${BENCH_TMP:-/private/tmp/agent-cooperator-bench}/${OUT:t}/$ID; WT=$WORK/repo; CH=$WORK/codex
[[ -e $WORK ]] && { echo "replay $ID: $WORK exists; move it away first"; exit 1; }
mkdir -p $LOG $CH $WORK/tmp $WORK/out
echo "${SRC:t} $REPEAT" > $CELL/cell.txt
CODEX_BIN=${CODEX_BIN:-${commands[codex]:A}}
[[ $($CODEX_BIN --version) == *" $CODEX_VERSION" ]] || { echo "replay $ID: codex is $($CODEX_BIN --version), the suite names $CODEX_VERSION"; exit 1; }

BASE=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).base)' $SRC/provenance.json)
RESULT=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).head)' $SRC/provenance.json)
read -r NAME SNAPSHOT <<< "$(node $BENCH/replay-packet.mjs $SRC $WT $WORK/review.packet)"
[[ -n $NAME && -n $SNAPSHOT ]] || { echo "replay $ID: no review packet in ${SRC:t}"; exit 1; }
cp $WORK/review.packet $LOG/review.packet

git init -q $WT
git -C $WT fetch -q --no-tags $REPO $BASE $RESULT
git -C $WT checkout -q -b replay/$ID $BASE
rm -f $WT/.git/FETCH_HEAD
# The result as uncommitted changes on the base: files it changed or added, without files it deleted.
git -C $WT checkout -q $RESULT -- .
git -C $WT diff --name-only --diff-filter=D $BASE $RESULT | (cd $WT && xargs rm -f --)
git -C $WT reset -q
echo '/.claude/' >> $WT/.git/info/exclude
(cd $WT && zsh $SUITE/setup.sh $REPO) > $LOG/setup.log 2>&1 || { echo "replay $ID: setup failed, see $LOG/setup.log"; exit 1; }
node $KIT/bin/agent-cooperator.js claude install --claude-home $WT/.claude > $LOG/install.log 2>&1 || { echo "replay $ID: kit install failed"; exit 1; }
TREE=$(cd $WT && node .claude/skills/workforce-orchestrate/scripts/accept.mjs snapshot)
[[ $SNAPSHOT == none || $TREE == "tree:$SNAPSHOT" ]] || { echo "replay $ID: the work tree is $TREE, the packet reviewed tree:$SNAPSHOT"; exit 1; }

# A link, not a copy: a token refresh then writes through to the host's own file.
ln -sf ${BENCH_CODEX_AUTH:-${CODEX_HOME:-$HOME/.codex}/auth.json} $CH/auth.json
CLEAN=(-u CLAUDECODE -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_CODE_SESSION_ATTENDED -u CLAUDE_PID -u CLAUDE_EFFORT -u CLAUDE_CODE_ENTRYPOINT)
date -u +%FT%TZ > $LOG/start.txt
(cd $WT && env $CLEAN BENCH_CELL=replay-$ID CODEX_HOME=$CH TMPDIR=$WORK/tmp/ node .claude/skills/workforce-orchestrate/scripts/codex-run.mjs \
  --role review --name $NAME --packet $WORK/review.packet --cd $WT --out $WORK/out --codex-bin $CODEX_BIN) > $LOG/codex-run.txt 2>&1
echo $? > $LOG/exit.txt
date -u +%FT%TZ > $LOG/end.txt
cp $WORK/out/* $LOG/
mkdir -p $LOG/rollouts
find $CH/sessions -name '*.jsonl' -exec cp {} $LOG/rollouts/ \; 2>/dev/null
SKILL=$WT/.claude/skills/workforce-review/SKILL.md
printf '{"source":"%s","base":"%s","result":"%s","snapshot":"%s","kit":"%s","kitDirty":%s,"reviewSkillSha256":"%s","packetSha256":"%s","codex":"%s"}\n' \
  ${SRC:t} $BASE $RESULT $SNAPSHOT $(git -C $KIT rev-parse --short HEAD) $([[ -n $(git -C $KIT status --porcelain -- payload) ]] && echo true || echo false) \
  $(shasum -a 256 $SKILL | cut -c1-16) $(shasum -a 256 $LOG/review.packet | cut -c1-16) "$($CODEX_BIN --version)" > $CELL/provenance.json
rm -f $CH/auth.json
rm -rf $WORK
echo "replay $ID done: $(<$LOG/exit.txt)"
