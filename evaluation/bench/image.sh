#!/bin/zsh
# Builds the cell image: the agent CLIs at the suite's versions, then the suite's own layer
# (its Dockerfile, with the build context its image-context.sh prepares).
# usage: evaluation/bench/image.sh <suite-dir>
set -euo pipefail
BENCH=${0:A:h}; SUITE=${1:A}
source $SUITE/suite.env
CLI_IMAGE=agent-cooperator-bench:claude-$CLAUDE_CODE_VERSION-codex-$CODEX_VERSION
docker build -q -t $CLI_IMAGE --build-arg CLAUDE_CODE_VERSION=$CLAUDE_CODE_VERSION --build-arg CODEX_VERSION=$CODEX_VERSION $BENCH/container
CTX=$(mktemp -d)
zsh $SUITE/image-context.sh $CTX
docker build -q -t $BENCH_IMAGE --build-arg BENCH_IMAGE=$CLI_IMAGE -f $SUITE/Dockerfile $CTX
rm -rf $CTX
echo "image: $BENCH_IMAGE"
