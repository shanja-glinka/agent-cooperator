#!/bin/zsh
# Narrow check of an update from an installed older kit: install <old-commit> into a temporary
# CODEX_HOME that also holds the user's own files, update it with <new-kit-dir>, and show that the
# kit's removed launch layers are gone, the user's files are untouched, and status reports the new
# routing.
# usage: upgradecheck.sh <old-commit> <new-kit-dir> <out-dir>
set -uo pipefail
OLD=$1; NEW=${2:A}; OUT=${3:A}
REPO=${0:A:h:h:h}
mkdir -p $OUT
git -C $REPO worktree add -q --detach $OUT/old-kit $OLD
CH=$OUT/codex; SK=$OUT/skills
mkdir -p $CH/skills/user-skill $SK
print -r -- 'model = "user-model"' > $CH/config.toml
print -r -- 'user notes' > $CH/user-notes.md
print -r -- '# user skill' > $CH/skills/user-skill/SKILL.md
node $OUT/old-kit/bin/agent-cooperator.js codex install --codex-home $CH --skills-dir $SK > $OUT/install-old.txt
print -r -- "launch layers before: ${(j: :)$(print -l $CH/*.config.toml(:t))}"
node $NEW/bin/agent-cooperator.js codex update --codex-home $CH --skills-dir $SK > $OUT/update.txt
print -r -- "update exit=$?"
print -r -- "launch layers after: ${(j: :)$(print -l $CH/*.config.toml(:t))}"
for f in config.toml user-notes.md skills/user-skill/SKILL.md; do print -r -- "$f: $(<$CH/$f)"; done
node $NEW/bin/agent-cooperator.js codex status --codex-home $CH --skills-dir $SK
git -C $REPO worktree remove --force $OUT/old-kit
