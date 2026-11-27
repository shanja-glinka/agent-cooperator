import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');
const ENTRY = path.join(ROOT, 'bin', 'codex-workforce-owner.js');
const PACKAGED_ROUTE = path.join(ROOT, 'payload', 'codex-owner', 'ROUTE.md');
const FROZEN_ROUTE = path.join(ROOT, 'evaluation', 'evidence', '2026-11-27-codex-owner-review-200323', 'ROUTE.md');

const FAKE_CODEX = `#!/usr/bin/env node
import fs from 'node:fs';
const record = {
  args: process.argv.slice(2),
  cwd: process.cwd(),
  pid: process.pid,
  marker: process.env.CODEX_OWNER_TEST_MARKER,
  codexHome: process.env.CODEX_HOME,
};
fs.writeFileSync(process.env.CODEX_OWNER_TEST_RECORD, JSON.stringify(record));
if (process.env.CODEX_OWNER_TEST_MODE === 'exit') {
  fs.writeSync(1, 'child stdout\\n');
  fs.writeSync(2, 'child stderr\\n');
  process.exit(23);
}
if (process.env.CODEX_OWNER_TEST_MODE === 'signal') process.kill(process.pid, 'SIGTERM');
if (process.env.CODEX_OWNER_TEST_MODE === 'wait') {
  const cancelled = (signal) => {
    fs.writeFileSync(process.env.CODEX_OWNER_TEST_CANCELLED, signal);
    process.exit(0);
  };
  process.on('SIGINT', () => cancelled('SIGINT'));
  process.on('SIGTERM', () => cancelled('SIGTERM'));
  setInterval(() => {}, 1000);
}
`;

async function fixture(t, mode = 'ok') {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex owner test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const codexBin = path.join(dir, 'fake codex.mjs');
  const recordPath = path.join(dir, 'record.json');
  const cancelledPath = path.join(dir, 'cancelled.txt');
  const codexHome = path.join(dir, 'codex home');
  await fs.mkdir(codexHome);
  await fs.writeFile(codexBin, FAKE_CODEX);
  return {
    dir,
    recordPath,
    codexHome,
    env: {
      ...process.env,
      CODEX_BIN: codexBin,
      CODEX_HOME: codexHome,
      CODEX_OWNER_TEST_MARKER: 'preserve this environment value',
      CODEX_OWNER_TEST_MODE: mode,
      CODEX_OWNER_TEST_RECORD: recordPath,
      CODEX_OWNER_TEST_CANCELLED: cancelledPath,
    },
    cancelledPath,
  };
}

function run(dir, env, args, extra = {}) {
  return spawnSync(process.execPath, [ENTRY, ...args], {
    cwd: dir,
    env,
    encoding: 'utf8',
    timeout: 10_000,
    ...extra,
  });
}

async function readRecord(recordPath) {
  return JSON.parse(await fs.readFile(recordPath, 'utf8'));
}

test('the packaged route is an exact copy of the frozen evidence route', async () => {
  assert.deepEqual(await fs.readFile(PACKAGED_ROUTE), await fs.readFile(FROZEN_ROUTE));
});

test('interactive launch preserves task bytes and starts normal Codex on workforce-standard', async (t) => {
  const f = await fixture(t);
  const task = '--task: Implement π.\r\nKeep trailing spaces.  \n';
  const result = run(f.dir, f.env, [task]);
  assert.equal(result.status, 0, result.stderr);

  const record = await readRecord(f.recordPath);
  const route = await fs.readFile(PACKAGED_ROUTE);
  const expectedPrompt = Buffer.concat([Buffer.from(task), Buffer.from('\n\n'), route]);
  assert.deepEqual(record.args.slice(0, 3), ['-p', 'workforce-standard', '--']);
  assert.deepEqual(Buffer.from(record.args[3]), expectedPrompt);
  assert.equal(record.args.length, 4);
  assert.equal(record.cwd, await fs.realpath(f.dir));
  assert.equal(record.marker, 'preserve this environment value');
  assert.equal(record.codexHome, f.codexHome);
});

test('exec forwards real native options exactly and adds no permission or sandbox overrides', async (t) => {
  const f = await fixture(t);
  const options = ['--json', '--ephemeral', '-c', 'approval_policy="on-request"', '--color', 'never'];
  const task = '--benchmark with these native settings';
  const result = run(f.dir, f.env, ['exec', ...options, '--', task]);
  assert.equal(result.status, 0, result.stderr);

  const record = await readRecord(f.recordPath);
  const route = await fs.readFile(PACKAGED_ROUTE, 'utf8');
  assert.deepEqual(record.args.slice(0, 3), ['exec', '-p', 'workforce-standard']);
  assert.deepEqual(record.args.slice(3, -2), options);
  assert.equal(record.args.at(-2), '--');
  assert.equal(record.args.at(-1), `${task}\n\n${route}`);
  assert.equal(record.cwd, await fs.realpath(f.dir));
  assert.equal(record.marker, 'preserve this environment value');
  assert.ok(!record.args.some((arg) => arg.startsWith('--dangerously-')));
  assert.ok(!record.args.includes('--sandbox'));
  assert.ok(!record.args.includes('--ask-for-approval=never'));
});

test('help, ambiguous tasks, and conflicting profiles exit before starting Codex', async (t) => {
  const f = await fixture(t);
  const help = run(f.dir, f.env, ['--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /codex-workforce-owner exec/);

  for (const args of [
    [], ['first', 'second'], ['exec'], ['exec', '--json'], ['exec', '--', 'one', 'two'],
    ['exec', '-p', 'other', '--', 'task'], ['exec', '--profile=other', '--', 'task'],
    ['exec', '-p=other', '--', 'task'], ['exec', '-p', 'workforce-standard', '--', 'task'],
  ]) {
    const result = run(f.dir, f.env, args);
    assert.equal(result.status, 2, `${args.join(' ')}: ${result.stderr}`);
    assert.match(result.stderr, /Usage:/);
  }
  await assert.rejects(fs.access(f.recordPath));
});

test('child exit status and inherited output propagate', async (t) => {
  const f = await fixture(t, 'exit');
  const result = run(f.dir, f.env, ['task']);
  assert.equal(result.status, 23);
  assert.equal(result.stdout, 'child stdout\n');
  assert.equal(result.stderr, 'child stderr\n');
});

test('a child signal terminates the wrapper with the same signal', async (t) => {
  if (process.platform === 'win32') return t.skip('child signal termination semantics are POSIX-specific');
  const f = await fixture(t, 'signal');
  const result = run(f.dir, f.env, ['task']);
  assert.equal(result.signal, 'SIGTERM');
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  test(`parent ${signal} is forwarded and waits for the child to stop`, async (t) => {
    if (process.platform === 'win32') return t.skip('process signal delivery is POSIX-specific');
    const f = await fixture(t, 'wait');
    const wrapper = spawn(process.execPath, [ENTRY, 'exec', '--ephemeral', '--', 'cancel test'], {
      cwd: f.dir,
      env: f.env,
      stdio: 'ignore',
    });
    t.after(async () => {
      if (wrapper.exitCode === null && wrapper.signalCode === null) wrapper.kill('SIGKILL');
      try {
        const record = await readRecord(f.recordPath);
        process.kill(record.pid, 'SIGKILL');
      } catch {}
    });
    const exit = new Promise((resolve, reject) => {
      wrapper.once('error', reject);
      wrapper.once('exit', (code, childSignal) => resolve({ code, signal: childSignal }));
    });

    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      try {
        await fs.access(f.recordPath);
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    const record = await readRecord(f.recordPath);
    wrapper.kill(signal);
    let timeout;
    const outcome = await Promise.race([
      exit,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error('wrapper did not exit after cancellation')), 5_000);
      }),
    ]).finally(() => clearTimeout(timeout));

    assert.equal(outcome.signal, signal);
    assert.equal(await fs.readFile(f.cancelledPath, 'utf8'), signal);
    assert.throws(() => process.kill(record.pid, 0), { code: 'ESRCH' });
  });
}

test('a missing Codex executable produces a clear failure and exit code', async (t) => {
  const f = await fixture(t);
  const env = { ...f.env, PATH: f.dir };
  delete env.CODEX_BIN;
  const result = run(f.dir, env, ['task']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unable to (?:start|resolve) Codex CLI/);
});
