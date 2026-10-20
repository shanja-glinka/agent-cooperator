import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const EDITIONS = ['claude', 'codex'].map((edition) => path.resolve(import.meta.dirname, '..', 'payload', edition, 'skills', 'workforce-orchestrate', 'scripts', 'accept.mjs'));

async function repo() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'accept-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  await fs.writeFile(path.join(dir, '.gitignore'), 'ignored/\n');
  await fs.writeFile(path.join(dir, 'a.txt'), 'a\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  return dir;
}
const run = (script, dir, ...args) => spawnSync('node', [script, ...args], { cwd: dir, encoding: 'utf8' });

for (const script of EDITIONS) {
  const edition = script.includes(`${path.sep}claude${path.sep}`) ? 'claude' : 'codex';

  test(`${edition} accept: a passing check on the reviewed state closes the condition`, async () => {
    const dir = await repo();
    // An uncommitted change is part of the reviewed state.
    await fs.writeFile(path.join(dir, 'a.txt'), 'changed, not committed\n');
    const tree = run(script, dir, 'snapshot').stdout.trim();
    assert.match(tree, /^tree:[0-9a-f]{40}$/);
    assert.equal(run(script, dir, 'run', 'true').status, 0);
    const closed = run(script, dir, 'close', '--tree', tree, '--check', 'true');
    assert.equal(closed.status, 0);
    assert.match(closed.stdout, /^CLOSED: "true" passed/);
  });

  test(`${edition} accept: a change after the review, a failed or missing check keeps it open`, async () => {
    const dir = await repo();
    const tree = run(script, dir, 'snapshot').stdout.trim();
    // Ignored output does not change the state.
    await fs.mkdir(path.join(dir, 'ignored'));
    await fs.writeFile(path.join(dir, 'ignored', 'build.log'), 'x\n');
    assert.equal(run(script, dir, 'snapshot').stdout.trim(), tree);
    // No recorded run of the named check.
    assert.equal(run(script, dir, 'close', '--tree', tree, '--check', 'true').status, 3);
    // A failed check.
    assert.equal(run(script, dir, 'run', 'false').status, 1);
    const failed = run(script, dir, 'close', '--tree', tree, '--check', 'false');
    assert.equal(failed.status, 1);
    assert.match(failed.stdout, /^OPEN: "false" failed/);
    // Code changed after the review: a passing run on the new state does not close the old one.
    await fs.writeFile(path.join(dir, 'b.txt'), 'new file\n');
    assert.equal(run(script, dir, 'run', 'true').status, 0);
    const changed = run(script, dir, 'close', '--tree', tree, '--check', 'true');
    assert.equal(changed.status, 2);
    assert.match(changed.stdout, /^OPEN: the work tree changed since the review \(1 files\): b\.txt/);
  });

  test(`${edition} accept: a check that edits the work tree does not close a condition`, async () => {
    const dir = await repo();
    const tree = run(script, dir, 'snapshot').stdout.trim();
    const edited = run(script, dir, 'run', 'echo more >> a.txt');
    assert.equal(edited.status, 0);
    assert.match(edited.stdout, /the check changed the work tree/);
    assert.notEqual(run(script, dir, 'close', '--tree', tree, '--check', 'echo more >> a.txt').status, 0);
  });
}
