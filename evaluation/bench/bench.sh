#!/bin/zsh
# Measure kit versions on a fixed suite: every task x model x variant x repeat, then report.
#
# usage: evaluation/bench/bench.sh <suite-dir> <label> <variant> [<variant> ...]
#   variant: nokit | <name>=<kit commit>[@task,task][+key=value,key=value]
#   @task,task runs that variant on those tasks only; +key=value installs it with that
#   install-policy switch (installer --set), e.g. v7nr=abc123@big+reviewBlock=off,reviewStage=off. The comparison treats the first kit
#   variant of the run as the new version; a later one is shown beside it on its tasks.
# env:   MODELS="opus sol"  REPEATS=1  PARALLEL=4  DRY=1 (set up and clean up, no agents)
#        PREV_RUNS="<run dir>:<variant>,<variant> ...": take those variants' cells from earlier
#        runs of the same suite instead of running them again (PREV_RUN with PREV_VARIANTS
#        names one such run). CODEX_LAUNCH: the Codex launch layer of kit cells
#        (workforce-standard by default).
set -euo pipefail
BENCH=${0:A:h}
SUITE=${1:A}; LABEL=$2; shift 2
VARIANTS=("$@")
KIT_REPO=${BENCH:h:h}
source $SUITE/suite.env
MODELS=(${=${MODELS:-opus sol}})
REPEATS=${REPEATS:-1}
PARALLEL=${PARALLEL:-4}
export CODEX_LAUNCH=${CODEX_LAUNCH:-workforce-standard}
[[ -n ${PREV_RUN:-} ]] && PREV_RUNS="${PREV_RUNS:-} ${PREV_RUN}:${${PREV_VARIANTS:-nokit}// /,}"

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
printf 'codex launch %s\n' $CODEX_LAUNCH >> $OUT/versions.txt
# One line per earlier run: its directory and the variants taken from it.
: > $OUT/prev.txt
for p in ${=PREV_RUNS:-}; do printf '%s %s\n' ${${p%%:*}:A} "${${p#*:}//,/ }" >> $OUT/prev.txt; done
[[ -s $OUT/prev.txt ]] || rm -f $OUT/prev.txt
# The bench's own checks (the /tmp jail, the CI check) before any cell runs.
zsh $BENCH/selftest.sh $SUITE > $OUT/selftest.txt 2>&1 || { cat $OUT/selftest.txt; exit 1; }

for v in "${VARIANTS[@]}"; do
  [[ $v == nokit ]] && continue
  name=${v%%=*}; commit=${${${v#*=}%%@*}%%+*}
  [[ -d $OUT/kits/$name ]] || git -C $KIT_REPO worktree add -q --detach $OUT/kits/$name $commit
  # Install-policy switches of this variant, one key=value per line, read by cell.sh.
  mkdir -p $OUT/sets; : > $OUT/sets/$name.txt
  [[ $v == *+* ]] && print -l ${(s:,:)${v#*+}} > $OUT/sets/$name.txt
done
# The policy each variant delivers, checked in every installed text before any cell runs.
node $BENCH/policycheck.mjs $OUT > $OUT/policycheck.txt 2>&1 || { cat $OUT/policycheck.txt; exit 1; }
# Tasks per variant name: all, or the @task,task list of its spec.
typeset -A ONLY
for v in "${VARIANTS[@]}"; do [[ $v == *@* ]] && ONLY[${v%%=*}]=" ${${${v#*@}%%+*}//,/ } "; done

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
      [[ -n ${ONLY[${pair[2]}]:-} && ${ONLY[${pair[2]}]} != *" ${TASKS[$t]} "* ]] && continue
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
# Earlier runs' cells are recounted by the current metrics.mjs, so every column counts alike.
[[ -f $OUT/prev.txt ]] && while read -r dir names; do node $BENCH/metrics.mjs $dir $OUT/prev-metrics-${dir:t}.json; done < $OUT/prev.txt
node $BENCH/isolation.mjs $OUT
node $BENCH/baseline.mjs $OUT
node $BENCH/routes.mjs $OUT
node $BENCH/report.mjs $OUT
