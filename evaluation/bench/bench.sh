#!/bin/zsh
# Measure kit versions on a fixed suite: every task x model x variant x repeat, then report.
#
# usage: evaluation/bench/bench.sh <suite-dir> <label> <variant> [<variant> ...]
#   variant: nokit | <name>=<kit commit>, e.g.  nokit v3=35a5753 v4=dee8d3d
#   The last variant is the new version, the one before it the previous version.
# env:   MODELS="opus sol"  REPEATS=1  PARALLEL=4  DRY=1 (set up and clean up, no agents)
#        PREV_RUN=<run dir> PREV_VARIANTS="nokit v4": take those variants' cells from an
#        earlier run of the same suite for the comparison instead of running them again.
set -euo pipefail
BENCH=${0:A:h}
SUITE=${1:A}; LABEL=$2; shift 2
VARIANTS=("$@")
KIT_REPO=${BENCH:h:h}
source $SUITE/suite.env
MODELS=(${=${MODELS:-opus sol}})
REPEATS=${REPEATS:-1}
PARALLEL=${PARALLEL:-4}

# The CLI versions the suite names, resolved to fixed binaries: an update of the installed
# CLI during the run (another session may update it) does not reach the cells.
export CLAUDE_BIN=$HOME/.local/share/claude/versions/${CLAUDE_CODE_VERSION:?suite.env sets CLAUDE_CODE_VERSION}
[[ -x $CLAUDE_BIN ]] || { echo "Claude Code $CLAUDE_CODE_VERSION is not installed at $CLAUDE_BIN"; exit 1; }
export CODEX_BIN=${commands[codex]:A}
[[ $($CODEX_BIN --version) == *" ${CODEX_VERSION:?suite.env sets CODEX_VERSION}" ]] || { echo "codex is $($CODEX_BIN --version), the suite names $CODEX_VERSION"; exit 1; }

OUT=$KIT_REPO/evaluation/runs/$(date +%F)-$LABEL
# A run directory holds one run: cells of an earlier attempt would mix into the metrics.
[[ -n $(ls $OUT/cells 2>/dev/null) ]] && { echo "$OUT already has cells; use another label"; exit 1; }
mkdir -p $OUT/cells $OUT/kits $OUT/running
printf '%s\n' "$SUITE" > $OUT/suite.txt
printf '%s\n' "${VARIANTS[@]}" > $OUT/variants.txt
printf '%s\n' "${MODELS[@]}" > $OUT/models.txt
printf '%s\n' "${TASKS[@]}" > $OUT/tasks.txt
printf 'claude %s (%s)\ncodex %s (%s)\n' "$($CLAUDE_BIN --version)" $CLAUDE_BIN "$($CODEX_BIN --version)" $CODEX_BIN > $OUT/versions.txt
[[ -n ${PREV_RUN:-} ]] && printf '%s\n%s\n' ${PREV_RUN:A} "${PREV_VARIANTS:-nokit}" > $OUT/prev.txt

for v in "${VARIANTS[@]}"; do
  [[ $v == nokit ]] && continue
  name=${v%%=*}; commit=${v#*=}
  [[ -d $OUT/kits/$name ]] || git -C $KIT_REPO worktree add -q --detach $OUT/kits/$name $commit
done

# Within a repeat, cells that start one after another differ in task, and the model/variant
# pairs rotate across tasks: cells running side by side share the host's /tmp, and two cells
# of one task tend to choose the same file names there.
combos=()
for model in "${MODELS[@]}"; do for v in "${VARIANTS[@]}"; do combos+=("$model ${v%%=*}"); done; done
cells=()
for r in $(seq 1 $REPEATS); do
  for i in $(seq 0 $(( ${#combos} - 1 ))); do
    for t in $(seq 1 ${#TASKS}); do
      pair=(${=combos[$(( (t - 1 + i) % ${#combos} + 1 ))]})
      cells+=("${TASKS[$t]} ${pair[2]} ${pair[1]} $r")
    done
  done
done
echo "bench $LABEL: ${#cells[@]} cells, $PARALLEL at a time -> $OUT"
printf '%s\n' "${cells[@]}" | xargs -P $PARALLEL -L 1 zsh $BENCH/cell.sh $OUT $SUITE

for v in "${VARIANTS[@]}"; do
  [[ $v == nokit ]] || git -C $KIT_REPO worktree remove --force $OUT/kits/${v%%=*}
done
git -C $KIT_REPO worktree prune
[[ -n ${DRY:-} ]] && { echo "dry run: set up and cleaned up ${#cells[@]} cells"; exit 0; }
node $BENCH/metrics.mjs $OUT
[[ -n ${PREV_RUN:-} ]] && node $BENCH/metrics.mjs ${PREV_RUN:A} $OUT/prev-metrics.json
node $BENCH/isolation.mjs $OUT
node $BENCH/baseline.mjs $OUT
node $BENCH/routes.mjs $OUT
node $BENCH/report.mjs $OUT
