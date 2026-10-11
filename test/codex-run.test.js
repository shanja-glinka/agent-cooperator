import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const RUNNER = path.resolve(import.meta.dirname, '..', 'payload', 'claude', 'skills', 'workforce-orchestrate', 'scripts', 'codex-run.mjs');

// A stand-in for the codex CLI. MODE selects its behavior; it records its argv and stdin.
const FAKE_CODEX = `
import fs from 'node:fs';
const args = process.argv.slice(2);
const mode = process.env.FAKE_MODE;
const stdin = fs.readFileSync(0, 'utf8');
fs.writeFileSync(process.env.FAKE_RECORD, JSON.stringify({ args, stdin, cwd: process.cwd() }));
console.log(JSON.stringify({ type: 'thread.started', thread_id: 'thread-123' }));
if (mode === 'ok') {
  fs.writeFileSync(args[args.indexOf('-o') + 1], 'FINDINGS: none');
  process.exit(0);
}
if (mode === 'approval') console.log(JSON.stringify({ type: 'exec_approval_request' }));
setInterval(() => {}, 1000);
`;

async function runFake(t, mode, extra = []) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-run-test-'));
  t.after(() => fs.rm(temp, { recursive: true, force: true }));
  const fake = path.join(temp, 'fake-codex.mjs');
  const packet = path.join(temp, 'packet.txt');
  const record = path.join(temp, 'record.json');
  const out = path.join(temp, 'out');
  await fs.writeFile(fake, FAKE_CODEX);
  await fs.writeFile(packet, 'LENS: task\nSCOPE: token-42\n');
  const result = spawnSync(process.execPath, [
    RUNNER, '--role', 'audit', '--name', 'blk-task-r1', '--packet', packet, '--cd', temp,
    '--out', out, '--codex-bin', fake, '--idle-minutes', '0.01', '--timeout-minutes', '1', ...extra,
  ], { env: { ...process.env, FAKE_MODE: mode, FAKE_RECORD: record }, encoding: 'utf8', timeout: 30_000 });
  const summary = JSON.parse(await fs.readFile(path.join(out, 'blk-task-r1.result.json'), 'utf8'));
  const recorded = JSON.parse(await fs.readFile(record, 'utf8'));
  return { result, summary, recorded, temp };
}

test('codex-run feeds the skill and packet on stdin and runs read-only without approvals', async (t) => {
  const { result, summary, recorded, temp } = await runFake(t, 'ok');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(summary.status, 'ok');
  assert.equal(summary.threadId, 'thread-123');
  assert.equal(summary.model, 'gpt-6-luna');
  assert.equal(summary.effort, 'xhigh');
  assert.match(recorded.stdin, /# Audit one lens/);
  assert.match(recorded.stdin, /token-42/);
  assert.deepEqual(recorded.args.slice(0, 3), ['exec', '-m', 'gpt-6-luna']);
  for (const arg of ['model_reasoning_effort="xhigh"', 'approval_policy="never"', '--ignore-user-config', 'read-only', '--json']) {
    assert.ok(recorded.args.includes(arg), arg);
  }
  assert.equal(recorded.args.at(-1), '-');
  assert.equal(await fs.realpath(recorded.cwd), await fs.realpath(temp));
});

test('codex-run resumes a thread with the packet only and the sandbox as config', async (t) => {
  const { summary, recorded } = await runFake(t, 'ok', ['--resume', 'thread-123']);
  assert.equal(summary.status, 'ok');
  assert.deepEqual(recorded.args.slice(0, 3), ['exec', 'resume', 'thread-123']);
  assert.ok(recorded.args.includes('sandbox_mode="read-only"'));
  assert.ok(!recorded.args.includes('-s'));
  assert.doesNotMatch(recorded.stdin, /# Audit one lens/);
});

test('codex-run ends a silent run so the background job always exits', async (t) => {
  const { result, summary } = await runFake(t, 'silent');
  assert.equal(result.status, 2);
  assert.equal(summary.status, 'stalled');
  assert.equal(summary.threadId, 'thread-123');
});

test('codex-run ends a run that asks for approval', async (t) => {
  const { result, summary } = await runFake(t, 'approval');
  assert.equal(result.status, 2);
  assert.equal(summary.status, 'waiting_for_input');
});
