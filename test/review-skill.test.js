import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// The reviewer's verdict rules: from "Protective sites." to the paragraph on grouping sites.
const rules = (edition) => {
  const text = fs.readFileSync(new URL(`../payload/${edition}/skills/workforce-review/SKILL.md`, import.meta.url), 'utf8');
  return text.slice(text.indexOf('Protective sites.'), text.indexOf('Sites with one basis'));
};

test('both editions judge protective sites by the same rules', () => {
  assert.ok(rules('claude').length > 500);
  assert.equal(rules('claude'), rules('codex'));
});

test('a kept site holds on the inputs the contract covers, not only on what today\'s callers pass', () => {
  const text = rules('claude');
  assert.doesNotMatch(text, /the value's real range/);
  assert.match(text, /every input the\s+CONTRACT covers/);
  assert.match(text, /any value taken from it,\s+can hold anything/);
  assert.match(text, /guard in today's\s+callers counts only when the CONTRACT protects an outer\s+behavior/);
  assert.doesNotMatch(text, /on the same path is a basis/);
  assert.match(text, /not-established site keeps ACCEPTANCE at not_accepted/);
});

test('Codex connected-owner reviews use the immutable base diff and check normal and edge correction paths', () => {
  const codex = fs.readFileSync(new URL('../payload/codex/skills/workforce-review/SKILL.md', import.meta.url), 'utf8');
  assert.match(codex, /immutable `BASE` and/);
  assert.match(codex, /`BASE[.][.]SNAPSHOT` diff/);
  assert.match(codex, /original user-observable\s+contract[\s\S]*all required project-check results/);
  assert.match(codex, /previously working\s+normal input at the actual changed boundary[\s\S]*edge case that exposed/);
  assert.match(codex, /observable values and identity, errors, and propagation/);
  assert.match(codex, /edge-only regression check does not establish that normal\s+behavior stayed intact/);
  assert.doesNotMatch(fs.readFileSync(new URL('../payload/claude/skills/workforce-review/SKILL.md', import.meta.url), 'utf8'), /connected-owner review/);
});
