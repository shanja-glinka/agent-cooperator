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
