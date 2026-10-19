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
// Synchronous fixture output survives an immediate exit, including nested Node
// pipes. The production assertions still exercise the actual runner process.
const emit = (event, newline = true) => fs.writeSync(1, JSON.stringify(event) + (newline ? '\\n' : ''));
emit({ type: 'thread.started', thread_id: 'thread-123' });
if (mode === 'ok') {
  emit({ type: 'turn.started' });
  emit({ type: 'turn.completed', usage: { input_tokens: 1200, cached_input_tokens: 800, output_tokens: 300 } });
  fs.writeFileSync(args[args.indexOf('-o') + 1], 'FINDINGS: none');
  process.exit(0);
}
if (mode === 'events' || mode === 'no-newline') {
  const events = JSON.parse(process.env.FAKE_EVENTS);
  for (let i = 0; i < events.length; i += 1) emit(events[i], mode !== 'no-newline' || i < events.length - 1);
  fs.writeFileSync(args[args.indexOf('-o') + 1], 'FINDINGS: none');
  process.exit(0);
}
if (mode === 'approval') emit({ type: 'exec_approval_request' });
setInterval(() => {}, 1000);
`;

async function runFake(t, mode, extra = [], role = 'audit', events = []) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-run-test-'));
  t.after(() => fs.rm(temp, { recursive: true, force: true }));
  const fake = path.join(temp, 'fake-codex.mjs');
  const packet = path.join(temp, 'packet.txt');
  const record = path.join(temp, 'record.json');
  const out = path.join(temp, 'out');
  await fs.writeFile(fake, FAKE_CODEX);
  await fs.writeFile(packet, 'LENS: task\nSCOPE: token-42\n');
  const result = spawnSync(process.execPath, [
    RUNNER, '--role', role, '--name', 'blk-task-r1', '--packet', packet, '--cd', temp,
    '--out', out, '--codex-bin', fake, '--idle-minutes', '0.01', '--timeout-minutes', '1', ...extra,
  ], { env: { ...process.env, FAKE_MODE: mode, FAKE_RECORD: record, FAKE_EVENTS: JSON.stringify(events) }, encoding: 'utf8', timeout: 30_000 });
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
  assert.deepEqual(summary.tokens, {
    input: 1200, cachedInput: 800, output: 300, total: 1500, uncached: 700,
    status: 'known', source: 'turn.completed.usage', scope: 'run', reason: null,
    threadTotal: { input: 1200, cachedInput: 800, output: 300, total: 1500, uncached: 700 },
  });
});

test('codex-run work role runs an escalated worker on Sol with a writable workspace', async (t) => {
  const { result, summary, recorded } = await runFake(t, 'ok', [], 'work');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(summary.role, 'work');
  assert.equal(summary.model, 'gpt-6.1-sol');
  assert.match(recorded.stdin, /# Complete the owned block/);
  assert.ok(recorded.args.includes('workspace-write'));
  assert.ok(!recorded.args.includes('read-only'));
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

const completed = (usage) => ({ type: 'turn.completed', usage });
const tokenCount = (total, last) => ({
  type: 'token_count', info: { total_token_usage: total, last_token_usage: last },
});
const firstUsage = { input_tokens: 100, cached_input_tokens: 50, output_tokens: 10 };
const finalUsage = { input_tokens: 250, cached_input_tokens: 100, output_tokens: 25 };

test('codex-run leaves absent usage unknown even when the task succeeded', async (t) => {
  const { summary } = await runFake(t, 'events', [], 'audit', [{ type: 'turn.started' }, completed(undefined)]);
  assert.equal(summary.status, 'ok');
  assert.deepEqual(summary.tokens, {
    input: null, cachedInput: null, output: null, total: null, uncached: null,
    status: 'unknown', source: null, scope: 'run', reason: 'usage_unavailable', threadTotal: null,
  });
});

test('codex-run does not mistake the CLI default zero for measured zero', async (t) => {
  const zero = { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0 };
  const { summary } = await runFake(t, 'events', [], 'audit', [completed(zero)]);
  assert.equal(summary.tokens.status, 'unknown');
  assert.equal(summary.tokens.total, null);
  assert.equal(summary.tokens.reason, 'zero_may_be_upstream_default');
  assert.equal(summary.tokens.threadTotal.total, 0);
});

test('codex-run preserves an explicit zero counter followed by a matching completion', async (t) => {
  // token_count is the explicitly supported raw-event adapter, not exec stdout.
  const zero = { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0 };
  const { summary } = await runFake(t, 'events', [], 'audit', [tokenCount(zero), completed(zero)]);
  assert.equal(summary.tokens.status, 'known');
  assert.equal(summary.tokens.total, 0);
  assert.equal(summary.tokens.input, 0);
  assert.equal(summary.tokens.output, 0);
});

test('codex-run replaces two cumulative completion snapshots instead of summing them', async (t) => {
  const { summary } = await runFake(t, 'events', [], 'audit', [completed(firstUsage), completed(finalUsage)]);
  assert.equal(summary.tokens.status, 'known');
  assert.equal(summary.tokens.input, 250);
  assert.equal(summary.tokens.cachedInput, 100);
  assert.equal(summary.tokens.output, 25);
  assert.equal(summary.tokens.total, 275);
});

test('codex-run does not add increments, repeated events, or cached input to cumulative totals', async (t) => {
  const last = { input_tokens: 150, cached_input_tokens: 50, output_tokens: 15 };
  const repeated = tokenCount(finalUsage, last);
  const { summary } = await runFake(t, 'events', [], 'audit', [
    tokenCount(firstUsage, firstUsage), repeated, repeated,
    { type: 'item.completed', usage: finalUsage },
    completed(finalUsage), completed(finalUsage),
  ]);
  assert.equal(summary.tokens.status, 'known');
  assert.equal(summary.tokens.total, 275);
  assert.equal(summary.tokens.cachedInput, 100);
  assert.equal(summary.tokens.source, 'turn.completed.usage');
});

test('codex-run reports unfinished raw cumulative usage as partial', async (t) => {
  const { summary } = await runFake(t, 'events', [], 'audit', [tokenCount(firstUsage), tokenCount(finalUsage)]);
  assert.equal(summary.tokens.status, 'partial');
  assert.equal(summary.tokens.total, 275);
  assert.equal(summary.tokens.reason, 'final_usage_unavailable');
  assert.equal(summary.tokens.source, 'token_count.info.total_token_usage');
});

test('codex-run does not infer missing fields as zero', async (t) => {
  const { summary } = await runFake(t, 'events', [], 'audit', [completed({ input_tokens: 100, output_tokens: 10 })]);
  assert.equal(summary.tokens.status, 'partial');
  assert.equal(summary.tokens.total, 110);
  assert.equal(summary.tokens.cachedInput, null);
  assert.equal(summary.tokens.reason, 'incomplete_fields');
});

test('codex-run refuses malformed numeric usage fields', async (t) => {
  const { summary } = await runFake(t, 'events', [], 'audit', [
    completed({ input_tokens: '100', cached_input_tokens: -1, output_tokens: 10 }),
  ]);
  assert.equal(summary.tokens.status, 'partial');
  assert.equal(summary.tokens.input, null);
  assert.equal(summary.tokens.cachedInput, null);
  assert.equal(summary.tokens.output, 10);
  assert.equal(summary.tokens.total, null);
});

test('codex-run does not sum unidentifiable incremental-only token_count events', async (t) => {
  const { summary } = await runFake(t, 'events', [], 'audit', [tokenCount(undefined, firstUsage), tokenCount(undefined, firstUsage)]);
  assert.equal(summary.tokens.status, 'unknown');
  assert.equal(summary.tokens.total, null);
  assert.equal(summary.tokens.reason, 'increment_identity_unavailable');
});

test('codex-run ignores usage on unrelated event types', async (t) => {
  const { summary } = await runFake(t, 'events', [], 'audit', [{ type: 'item.completed', usage: finalUsage }]);
  assert.equal(summary.tokens.status, 'unknown');
  assert.equal(summary.tokens.total, null);
});

test('codex-run leaves resumed run usage unknown without a baseline', async (t) => {
  const { summary } = await runFake(t, 'events', ['--resume', 'thread-123'], 'audit', [
    tokenCount(firstUsage), tokenCount(finalUsage), completed(finalUsage),
  ]);
  assert.equal(summary.tokens.status, 'unknown');
  assert.equal(summary.tokens.total, null);
  assert.equal(summary.tokens.input, null);
  assert.equal(summary.tokens.reason, 'resume_baseline_missing');
  assert.equal(summary.tokens.threadTotal.total, 275);
});

test('codex-run does not silently treat regressing cumulative counters as new increments', async (t) => {
  const { summary } = await runFake(t, 'events', [], 'audit', [tokenCount(finalUsage), completed(firstUsage)]);
  assert.equal(summary.tokens.status, 'unknown');
  assert.equal(summary.tokens.total, null);
  assert.equal(summary.tokens.reason, 'cumulative_counter_regressed');
});

test('codex-run parses a final usage event without a trailing newline', async (t) => {
  const { summary } = await runFake(t, 'no-newline', [], 'audit', [completed(finalUsage)]);
  assert.equal(summary.tokens.status, 'known');
  assert.equal(summary.tokens.total, 275);
});

async function writeBaseline(t, threadId, threadTotal) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-run-baseline-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'previous.result.json');
  await fs.writeFile(file, JSON.stringify({ threadId, tokens: { threadTotal } }));
  return file;
}

test('codex-run reports a resumed run as the thread total minus the previous run', async (t) => {
  const baseline = await writeBaseline(t, 'thread-123', { input: 100, cachedInput: 50, output: 10, total: 110 });
  const { summary } = await runFake(t, 'events', ['--resume', 'thread-123', '--baseline', baseline], 'audit', [
    completed(finalUsage),
  ]);
  assert.equal(summary.tokens.status, 'known');
  assert.equal(summary.tokens.input, 150);
  assert.equal(summary.tokens.cachedInput, 50);
  assert.equal(summary.tokens.output, 15);
  assert.equal(summary.tokens.total, 165);
  assert.equal(summary.tokens.uncached, 115);
  assert.equal(summary.tokens.threadTotal.total, 275);
});

test('codex-run refuses a baseline from another thread', async (t) => {
  const baseline = await writeBaseline(t, 'thread-999', { input: 100, cachedInput: 50, output: 10, total: 110 });
  const { summary } = await runFake(t, 'events', ['--resume', 'thread-123', '--baseline', baseline], 'audit', [
    completed(finalUsage),
  ]);
  assert.equal(summary.tokens.status, 'unknown');
  assert.equal(summary.tokens.total, null);
  assert.equal(summary.tokens.reason, 'baseline_mismatch');
});

test('codex-run refuses a baseline larger than the thread total', async (t) => {
  const baseline = await writeBaseline(t, 'thread-123', { input: 900, cachedInput: 50, output: 10, total: 910 });
  const { summary } = await runFake(t, 'events', ['--resume', 'thread-123', '--baseline', baseline], 'audit', [
    completed(finalUsage),
  ]);
  assert.equal(summary.tokens.status, 'unknown');
  assert.equal(summary.tokens.reason, 'baseline_mismatch');
});
