#!/bin/zsh
# Checks of the bench itself, without agents: the /tmp jail (two cells writing one absolute path
# at once, child processes, the file-tool hook, paths that must stay) and the suite's CI check
# (a failing CI stays a failure). usage: evaluation/bench/selftest.sh <suite-dir>
set -uo pipefail
BENCH=${0:A:h}
SUITE=${1:?usage: selftest.sh <suite-dir>}; SUITE=${SUITE:A}
T=$(mktemp -d /private/tmp/agent-cooperator-bench-selftest.XXXXXX)
FAILS=0
ok() { print -r -- "ok   $1"; }
bad() { print -r -- "FAIL $1"; FAILS=$((FAILS + 1)); }
jail() {  # jail <cell> <command>: run the command the way a cell's agent shell does
  local cell=$T/$1; mkdir -p $cell/tmp $cell/zdot
  cp $BENCH/tmpjail/zshenv $cell/zdot/.zshenv
  local link=${cell/#\/private\/tmp\//\/tmp\/}
  env BENCH_TMP=$link/tmp TMPDIR=$link/tmp/ ZDOTDIR=$cell/zdot /bin/zsh -lc "$2"
}
NAME=bench-selftest-$$-$RANDOM

# Two cells write different values to the same absolute path at the same time; each reads its own.
jail a "echo A > /tmp/$NAME.txt; sleep 1; cat /tmp/$NAME.txt" > $T/a.out &
jail b "echo B > /tmp/$NAME.txt; sleep 1; cat /tmp/$NAME.txt" > $T/b.out &
wait
[[ $(<$T/a.out) == A && $(<$T/b.out) == B ]] && ok "two cells, one path: each reads its own value" || bad "two cells, one path: a=$(<$T/a.out) b=$(<$T/b.out)"
[[ -e /private/tmp/$NAME.txt ]] && bad "the shared /tmp path was used" || ok "the shared /tmp path was not used"
[[ -f $T/a/tmp/$NAME.txt && -f $T/b/tmp/$NAME.txt ]] && ok "each value is in its cell's temp dir" || bad "cell temp dirs miss the files"

# Child processes: a path in the command text reaches shells it starts; TMPDIR reaches programs.
jail a "sh -c 'echo child > /tmp/$NAME-child.txt'; cat /tmp/$NAME-child.txt" > $T/child.out
[[ $(<$T/child.out) == child && ! -e /private/tmp/$NAME-child.txt ]] && ok "a child shell writes into the cell's temp dir" || bad "child shell: $(<$T/child.out)"
jail a "node -e 'require(\"fs\").writeFileSync(require(\"os\").tmpdir()+\"/$NAME-node.txt\",\"x\")'; ls \$TMPDIR" > $T/node.out
grep -q "$NAME-node.txt" $T/node.out && [[ ! -e /private/tmp/$NAME-node.txt ]] && ok "os.tmpdir() of a child program is the cell's temp dir" || bad "os.tmpdir(): $(<$T/node.out)"

# Like the macOS default, the cell's TMPDIR is reached through a symlink (its realpath differs).
out=$(jail a "node -e 'const fs=require(\"fs\"),os=require(\"os\");console.log(fs.realpathSync(os.tmpdir())!==os.tmpdir())'")
[[ $out == true ]] && ok "TMPDIR, like the macOS default, is reached through a symlink" || bad "TMPDIR realpath: $out"

# Paths that must stay: Claude Code's temp dirs, the bench's checkouts, and look-alikes.
out=$(jail a "print -r -- /tmp/claude-501/x /private/tmp/agent-cooperator-bench/r/c/repo ./tmp/x ~/tmp/x /tmpfoo http://h/tmp/x")
[[ $out == "/tmp/claude-501/x /private/tmp/agent-cooperator-bench/r/c/repo ./tmp/x $HOME/tmp/x /tmpfoo http://h/tmp/x" ]] && ok "excluded paths stay as they are" || bad "excluded paths changed: $out"
out=$(jail a "cd /tmp && pwd -P")
[[ $out == $T/a/tmp ]] && ok "cd /tmp goes to the cell's temp dir" || bad "cd /tmp: $out"
out=$(jail a "echo plain")
[[ $out == plain ]] && ok "a command without /tmp runs unchanged" || bad "plain command: $out"

# The file-tool hook moves /tmp paths and leaves the rest.
hook() { print -r -- "$1" | BENCH_TMP=$T/a/tmp node $BENCH/tmpjail/hook.mjs; }
out=$(hook '{"tool_name":"Read","tool_input":{"file_path":"/tmp/ci.log"}}')
[[ $out == *"\"file_path\":\"$T/a/tmp/ci.log\""* && $out == *'"permissionDecision":"allow"'* ]] && ok "hook: Read /tmp/ci.log goes to the cell" || bad "hook Read: $out"
out=$(hook '{"tool_name":"Read","tool_input":{"file_path":"/tmp/claude-501/x"}}')
[[ -z $out ]] && ok "hook: Claude Code's temp dir stays" || bad "hook claude dir: $out"
out=$(hook '{"tool_name":"Grep","tool_input":{"pattern":"/tmp","path":"/private/tmp"}}')
[[ $out == *"\"path\":\"$T/a/tmp\""* && $out == *'"pattern":"/tmp"'* ]] && ok "hook: Grep path moves, its pattern stays" || bad "hook Grep: $out"

# The suite's CI check keeps a failure a failure, and a retry that passes says so.
mkdir -p $T/bin
print -r -- '#!/bin/sh
echo "Tests: 0 skipped, 1 passed"; exit 3' > $T/bin/npm; chmod +x $T/bin/npm
( PATH=$T/bin:$PATH; source $SUITE/checks/lib.sh; CI_LOG_DIR=$T/ci1 run_ci; print -r -- $CIRC ) > $T/ci1.out
[[ $(<$T/ci1.out) == 3 ]] && ok "a failing CI stays a failure (exit 3)" || bad "failing CI gave $(<$T/ci1.out)"
print -r -- '#!/bin/sh
if [ -f "$0.once" ]; then echo "Tests: 0 skipped, 2 passed"; exit 0; fi
touch "$0.once"; exit 1' > $T/bin/npm
( PATH=$T/bin:$PATH; source $SUITE/checks/lib.sh; CI_LOG_DIR=$T/ci2 run_ci; print -r -- "$CIRC $TESTS" ) > $T/ci2.out
[[ $(<$T/ci2.out) == "retry 2" ]] && ok "a CI that passes on the second attempt is marked retry" || bad "retry CI gave $(<$T/ci2.out)"

rm -rf $T /private/tmp/$NAME*(N)
(( FAILS )) && { print -r -- "selftest: $FAILS failed"; exit 1; }
print -r -- "selftest: all passed"
