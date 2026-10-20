#!/bin/zsh
# A cell's node_modules from a frozen copy: built once per package-lock.json from the npm cache
# (npm ci --offline), checked against that lockfile, and APFS-cloned into the checkout (no data
# copied). A project's own node_modules follows its live working copy and must not be used: on
# 2026-10-20 one install there moved seven packages off the task bases' lockfile between the v6
# and v7 runs, and every v7 cell started with a red test.
# usage, in the cell's checkout: frozen-deps.sh <deps-root>
set -uo pipefail
BENCH=${0:A:h}
ROOT=$1
KEY=$(shasum -a 256 package-lock.json | cut -c1-16)
D=$ROOT/$KEY
mkdir -p $ROOT
build() {
  rm -rf $D && mkdir -p $D && cp package.json package-lock.json $D/ || return 1
  (cd $D && npm ci --offline --no-audit --no-fund) > $D.npm-ci.log 2>&1 || { echo "npm ci --offline failed, see $D.npm-ci.log"; return 1; }
  node $BENCH/depscheck.mjs $D || return 1
  print -r -- "$(date -u +%FT%TZ) node $(node --version) npm $(npm --version)" > $D/ready
}
# Cells start several at a time: the first one builds, the others wait. A lock left by a killed
# build is taken over.
until mkdir $D.lock 2>/dev/null; do
  if [[ -f $D.lock/pid ]] && ! kill -0 $(<$D.lock/pid) 2>/dev/null; then rm -rf $D.lock; continue; fi
  sleep 2
done
print $$ > $D.lock/pid
rc=0; [[ -f $D/ready ]] || build || rc=1
rm -rf $D.lock
(( rc == 0 )) || exit 1
cp -cR $D/node_modules node_modules || exit 1
node $BENCH/depscheck.mjs . || exit 1
print -r -- "deps $KEY, built $(<$D/ready)"
