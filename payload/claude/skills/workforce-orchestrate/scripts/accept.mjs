#!/usr/bin/env node
// Closes a review's `accepted_if <check> on tree:<hash>` without another reviewer call, and only
// when that check really passed on the state the reviewer read.
//   snapshot                          print the working state as tree:<hash> (uncommitted and new
//                                     files included, ignored files left out)
//   run "<check>"                     run the check, keep its log, and record the state before and
//                                     after it with its exit code; exits with the check's code
//   close --tree <hash> --check "<check>"
//                                     CLOSED when the state is still <hash> and a recorded run of
//                                     <check> passed on it; otherwise OPEN with the reason and the
//                                     files changed since the review
// Records live in the repository's git directory (workforce/checks.jsonl), outside the work tree.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const git = (args, env) => execFileSync('git', args, { encoding: 'utf8', env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const gitDir = path.resolve(git(['rev-parse', '--git-dir']));
const stateDir = path.join(gitDir, 'workforce');
const records = path.join(stateDir, 'checks.jsonl');

// The working state as a tree: a private copy of the index takes every change the checkout has.
function snapshot() {
  fs.mkdirSync(stateDir, { recursive: true });
  const index = path.join(stateDir, `index-${process.pid}`);
  if (fs.existsSync(path.join(gitDir, 'index'))) fs.copyFileSync(path.join(gitDir, 'index'), index);
  try {
    git(['add', '-A'], { GIT_INDEX_FILE: index });
    return git(['write-tree'], { GIT_INDEX_FILE: index });
  } finally {
    fs.rmSync(index, { force: true });
  }
}

const changedSince = (tree, now) => git(['diff-tree', '-r', '--name-only', tree, now]).split('\n').filter(Boolean);
const readRecords = () => (fs.existsSync(records) ? fs.readFileSync(records, 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }) : []);
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };

const [command, ...rest] = process.argv.slice(2);
if (command === 'snapshot') {
  console.log(`tree:${snapshot()}`);
} else if (command === 'run') {
  const check = rest.join(' ').trim();
  if (!check) { console.error('usage: accept.mjs run "<check>"'); process.exit(64); }
  const before = snapshot();
  fs.mkdirSync(path.join(stateDir, 'logs'), { recursive: true });
  const log = path.join(stateDir, 'logs', `${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
  const out = fs.openSync(log, 'w');
  // sh from PATH (Git for Windows ships one); without it, the platform shell.
  let result = spawnSync('sh', ['-c', check], { stdio: ['ignore', out, out] });
  if (result.error?.code === 'ENOENT') result = spawnSync(check, { shell: true, stdio: ['ignore', out, out] });
  fs.closeSync(out);
  const exit = result.status ?? 1;
  const after = snapshot();
  fs.appendFileSync(records, JSON.stringify({ check, before, after, exit, log, at: new Date().toISOString() }) + '\n');
  console.log(`exit=${exit} tree:${after}${before === after ? '' : ' (the check changed the work tree)'} log=${log}`);
  process.exit(exit);
} else if (command === 'close') {
  const tree = String(arg('--tree') ?? '').replace(/^tree:/, '');
  const check = arg('--check');
  if (!tree || !check) { console.error('usage: accept.mjs close --tree <hash> --check "<check>"'); process.exit(64); }
  const now = snapshot();
  if (now !== tree) {
    const files = changedSince(tree, now);
    console.log(`OPEN: the work tree changed since the review (${files.length} files): ${files.join(', ')}`);
    process.exit(2);
  }
  const runs = readRecords().filter((r) => r.check === check && r.before === tree && r.after === tree);
  const last = runs.at(-1);
  if (!last) { console.log(`OPEN: no recorded run of "${check}" on tree:${tree}; run it with accept.mjs run`); process.exit(3); }
  if (last.exit !== 0) { console.log(`OPEN: "${check}" failed on tree:${tree} (exit ${last.exit}), log ${last.log}`); process.exit(1); }
  console.log(`CLOSED: "${check}" passed on tree:${tree} (${last.at}), log ${last.log}`);
} else {
  console.error('usage: accept.mjs snapshot | run "<check>" | close --tree <hash> --check "<check>"');
  process.exit(64);
}
