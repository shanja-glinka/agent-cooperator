import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (p) => fs.readFileSync(new URL(`../payload/${p}`, import.meta.url), 'utf8');
const editions = ['claude', 'codex'];
const skill = (edition) => read(`${edition}/skills/workforce-orchestrate/SKILL.md`);
const delegation = (edition) => read(`${edition}/skills/workforce-orchestrate/references/delegation.md`);

test('the route is chosen from measured anchors: a task of about 20 turns is done directly', () => {
  for (const e of editions) {
    const text = skill(e);
    assert.doesNotMatch(text, /do not invent numbers/);
    assert.match(text, /a task you\s+finish in about 20 turns/);
    assert.match(text, /\*\*Yourself:\*\*[^]*a task of about 20 turns: a small fix, a bug with a clear\s+symptom, a patch review/);
    assert.match(text, /\*\*Worker blocks:\*\* work several times that size/);
    const profiles = JSON.parse(read(`${e}/profiles.json`));
    assert.match(profiles.workClasses.direct, /a task of about 20 turns/);
    assert.doesNotMatch(profiles.workClasses.build, /of any size/);
  }
});

test('every code change after a review goes back to the same reviewer as a delta', () => {
  for (const e of editions) {
    for (const text of [skill(e), delegation(e)]) {
      assert.doesNotMatch(text, /bears on/);
      assert.doesNotMatch(text, /A small local change\s+with a clear contract and passing checks you may accept/);
    }
    assert.match(skill(e), /Every code change after the review, whoever writes it,\s+goes back to the\s+same reviewer as a delta before you accept/);
    assert.match(delegation(e), /Any code change after the\s+review, by a worker\s+or by you, a fix for a failed check included, goes to\s+the same reviewer as\s+a delta before you accept/);
    const profiles = JSON.parse(read(`${e}/profiles.json`));
    assert.doesNotMatch(JSON.stringify(profiles), /bears on/);
    assert.match(profiles.review.smallLocal, /^On a direct route/);
  }
});

test('a haiku block is sized to finish before its prompt passes the 100k tier', () => {
  assert.match(skill('claude'), /`haiku` block is sized to finish in about 25 requests/);
  assert.match(delegation('claude'), /size\s+each `haiku` block to finish in about 25 requests/);
});

test('the Codex launch layers set the models for delegation, not delegation itself', () => {
  for (const layer of ['economy', 'standard']) {
    const text = read(`codex/config/workforce-${layer}.config.toml`);
    assert.match(text, /Whether to delegate follows the skill; doing a step yourself is part of the profile\./);
  }
  assert.match(read('codex/config/workforce-economy.config.toml'), /when you delegate, Luna workers at xhigh/);
});
