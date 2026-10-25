// Checks the loop guard with synthetic hook events: a repeated identical read gets one note on its
// third run, an edit in between resets the count, a repeated failure gets the failure note, and a
// compaction gets a note on the next tool call. usage: node --test extras/codex-loop-guard/loop-guard.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const guard = new URL('./loop-guard.mjs', import.meta.url).pathname;
const run = (event) => {
  const r = spawnSync(process.execPath, [guard], { input: JSON.stringify(event), encoding: 'utf8' });
  assert.equal(r.status, 0);
  return r.stdout ? JSON.parse(r.stdout).hookSpecificOutput.additionalContext : '';
};
const call = (session, cmd, response, tool = 'exec_command') => run({ session_id: session, hook_event_name: 'PostToolUse', tool_name: tool, tool_input: { cmd }, tool_response: response });

test('the third identical read with nothing edited in between gets one note', () => {
  const s = `t1-${process.pid}-${Date.now()}`;
  assert.equal(call(s, "sed -n '1,80p' src/a.ts", 'same text'), '');
  assert.equal(call(s, "sed -n '1,80p' src/a.ts", 'same text'), '');
  assert.match(call(s, "sed -n '1,80p' src/a.ts", 'same text'), /returned the same result 3 times/);
  assert.equal(call(s, "sed -n '1,80p' src/a.ts", 'same text'), '');
});

test('an edit in between resets the count', () => {
  const s = `t2-${process.pid}-${Date.now()}`;
  call(s, 'cat src/b.ts', 'x'); call(s, 'cat src/b.ts', 'x');
  call(s, '*** Begin Patch', 'ok', 'apply_patch');
  assert.equal(call(s, 'cat src/b.ts', 'x'), '');
});

test('the same failure three times gets the failure note', () => {
  const s = `t3-${process.pid}-${Date.now()}`;
  call(s, 'npm test', 'exit_code: 1 error in x'); call(s, 'npm test', 'exit_code: 1 error in x');
  assert.match(call(s, 'npm test', 'exit_code: 1 error in x'), /failed the same way 3 times/);
});

test('a compaction is noted on the next tool call, with a handoff from the third', () => {
  const s = `t4-${process.pid}-${Date.now()}`;
  run({ session_id: s, hook_event_name: 'PostCompact' });
  assert.match(call(s, 'ls', 'a'), /compacted \(1 in this session\)/);
  run({ session_id: s, hook_event_name: 'PostCompact' }); run({ session_id: s, hook_event_name: 'PostCompact' });
  assert.match(call(s, 'ls', 'b'), /After 3 compactions[\s\S]*fresh agent/);
});

test('bad input fails open', () => {
  const r = spawnSync(process.execPath, [guard], { input: 'not json', encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});
