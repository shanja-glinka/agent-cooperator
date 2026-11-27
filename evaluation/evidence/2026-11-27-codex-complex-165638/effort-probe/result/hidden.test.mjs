import test from 'node:test';
import assert from 'node:assert/strict';
import { label } from './label.mjs';
import { ranges } from './intervals.mjs';
import { createQueue } from './queue.mjs';

test('label contract on missing, blank and non-string values', () => {
  for (const x of ['', '  \t ', undefined, null, 8, {}]) assert.equal(label(x), 'untitled');
  assert.equal(label('  A B\n'), 'A B');
});

test('ranges preserve order of caller data and safe boundaries', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const min = Number.MIN_SAFE_INTEGER;
  const input = Object.freeze([[max, max], [min, min], [max - 2, max - 1], [min + 1, min + 3]].map(Object.freeze));
  assert.deepEqual(ranges(input), [[min, min + 3], [max - 2, max]]);
  assert.deepEqual(ranges([[3, 3], [0, 2], [0, 1], [7, 7]]), [[0, 3], [7, 7]]);
  assert.deepEqual(ranges([]), []);
});

test('ranges validate before merging', () => {
  for (const x of [null, {}, [[1]], [[0, 1.5]], [[0, Infinity]], [[0, 1, 2]], [[Number.MAX_SAFE_INTEGER+1, Number.MAX_SAFE_INTEGER+1]]]) assert.throws(() => ranges(x), TypeError);
  assert.throws(() => ranges([[3, 2]]), RangeError);
});

function latch() {
  let resolve;
  const done = new Promise(r => { resolve = r; });
  return { resolve, done };
}
const aborted = promise => assert.rejects(promise, { name: 'AbortError' });

test('one waiter leaves while another receives the result', {timeout: 2000}, async () => {
  const q = createQueue(), clock = latch(), a = new AbortController();
  let calls = 0, opSignal;
  function op(s) { calls++; opSignal = s; return clock.done; }
  const p = q.run('a', op, a.signal), p2 = q.run('a', op);
  await Promise.resolve();
  a.abort(); await aborted(p); assert.equal(opSignal.aborted, false);
  assert.equal(await q.run('b', () => 4), 4); clock.resolve(3);
  assert.equal(await p2, 3); assert.equal(calls, 1);
});

test('late completion cannot evict replacement', {timeout: 2000}, async () => {
  const q = createQueue(), a = new AbortController(), old = latch(), fresh = latch();
  let sig, freshCalls = 0;
  const p = q.run('a', s => { sig = s; return old.done; }, a.signal);
  await Promise.resolve(); a.abort();
  const next = q.run('a', () => { freshCalls++; return fresh.done; });
  await aborted(p); assert.equal(sig.aborted, true);
  old.resolve('old'); await new Promise(resolve => setImmediate(resolve));
  const joined = q.run('a', () => { freshCalls++; return 'unexpected'; });
  fresh.resolve('new');
  assert.deepEqual(await Promise.all([next, joined]), ['new', 'new']); assert.equal(freshCalls, 1);
});

test('pre-abort, synchronous failure and retry', {timeout: 2000}, async () => {
  const q = createQueue(), a = new AbortController(); a.abort(); let calls = 0;
  await aborted(q.run('q', () => { calls++; }, a.signal)); assert.equal(calls, 0);
  const err = new Error('trial');
  await assert.rejects(q.run('q', () => { throw err; }), e => e === err);
  await assert.rejects(q.run('q', () => Promise.reject(err)), e => e === err);
  assert.equal(await q.run('q', () => 7), 7);
});
