#!/bin/zsh
# Derives a bench run's metrics and reports from its saved logs, without running any agent:
# metrics.json, the earlier runs' columns, isolation, baseline, routes, METRICS.md and
# COMPARISON.md. bench.sh runs it after the cells; run it again after a change to the counters.
#
# usage: evaluation/bench/post.sh <run-dir>
set -euo pipefail
BENCH=${0:A:h}
OUT=${1:A}
node $BENCH/metrics.mjs $OUT
# Earlier runs' cells are recounted by the current metrics.mjs, so every column counts alike.
[[ -f $OUT/prev.txt ]] && while read -r dir names; do node $BENCH/metrics.mjs $dir $OUT/prev-metrics-${dir:t}.json; done < $OUT/prev.txt
node $BENCH/isolation.mjs $OUT
node $BENCH/baseline.mjs $OUT
node $BENCH/routes.mjs $OUT
node $BENCH/report.mjs $OUT
