#!/bin/zsh
# Measure kit versions on a fixed suite: every task x model x variant x repeat, then report.
# Every cell runs in a container of its own (cell.sh); build the image first with image.sh
# and check the isolation with selftest.sh.
#
# usage: evaluation/bench/bench.sh <suite-dir> <label> <variant> [<variant> ...]
#   variant: nokit | <name>=<kit commit>, e.g.  nokit v3=35a5753 v4=dee8d3d
#   The last variant is the new version, the one before it the previous version.
# env:   MODELS="opus sol"  REPEATS=1  PARALLEL=<suite's BENCH_PARALLEL>  DRY=1 (set up and clean up, no agents)
set -euo pipefail
BENCH=${0:A:h}
SUITE=${1:A}; LABEL=$2; shift 2
VARIANTS=("$@")
KIT_REPO=${BENCH:h:h}
source $SUITE/suite.env
MODELS=(${=${MODELS:-opus sol}})
REPEATS=${REPEATS:-1}
PARALLEL=${PARALLEL:-${BENCH_PARALLEL:-2}}
docker image inspect $BENCH_IMAGE >/dev/null 2>&1 || { echo "no image $BENCH_IMAGE; build it with evaluation/bench/image.sh $SUITE"; exit 1; }
if (( ${MODELS[(Ie)opus]} )) && [[ -z ${DRY:-} && ! -s ${BENCH_CLAUDE_TOKEN_FILE:-} ]]; then
  echo "no Claude token in BENCH_CLAUDE_TOKEN_FILE; create one with: claude setup-token"; exit 1
fi
OUT=$KIT_REPO/evaluation/runs/$(date +%F)-$LABEL
mkdir -p $OUT/cells $OUT/kits
printf '%s\n' "$SUITE" > $OUT/suite.txt
printf '%s\n' "${VARIANTS[@]}" > $OUT/variants.txt
printf '%s\n' "${MODELS[@]}" > $OUT/models.txt
printf '%s\n' "${TASKS[@]}" > $OUT/tasks.txt
printf '%s %s\n' $BENCH_IMAGE $(docker image inspect -f '{{.Id}}' $BENCH_IMAGE) > $OUT/image.txt
echo container > $OUT/isolation.txt

for v in "${VARIANTS[@]}"; do
  [[ $v == nokit ]] && continue
  name=${v%%=*}; commit=${v#*=}
  [[ -d $OUT/kits/$name ]] || git -C $KIT_REPO worktree add -q --detach $OUT/kits/$name $commit
done

# Interleaved: within a repeat, the variants of one task and model run side by side,
# so they share the same load and time of day.
cells=()
for r in $(seq 1 $REPEATS); do
  for task in "${TASKS[@]}"; do
    for model in "${MODELS[@]}"; do
      for v in "${VARIANTS[@]}"; do
        cells+=("$task ${v%%=*} $model $r")
      done
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
node $BENCH/isolation.mjs $OUT
node $BENCH/baseline.mjs $OUT
node $BENCH/routes.mjs $OUT
node $BENCH/report.mjs $OUT
