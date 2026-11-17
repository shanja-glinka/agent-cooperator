import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (p) => fs.readFileSync(new URL(`../payload/${p}`, import.meta.url), 'utf8');
const editions = ['claude', 'codex'];
const skill = (edition) => read(`${edition}/skills/workforce-orchestrate/SKILL.md`);
const delegation = (edition) => read(`${edition}/skills/workforce-orchestrate/references/delegation.md`);
const dispatch = (edition) => read(`${edition}/skills/workforce-orchestrate/references/dispatch.md`);
const worker = (edition) => read(`${edition}/skills/workforce-worker/SKILL.md`);

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

test('a haiku block is not split only to stay under the 100k tier', () => {
  for (const text of [skill('claude'), delegation('claude'), read('claude/profiles.json')]) assert.doesNotMatch(text, /about 25 requests/);
  assert.match(delegation('claude'), /so blocks are not split only to stay under it/);
});

// One rule seen from three sides: the cooperator owns the project-wide checks, the packet says which
// checks are the worker's, and the worker runs those and no others.
test('project-wide checks run once per iteration, by the cooperator, and a failure goes to its owner', () => {
  for (const e of editions) {
    const text = skill(e);
    assert.match(text, /The project-wide checks \(the test suite, the build, lint and types over the\s+project, the CI script\) are yours\. They run once per iteration/);
    assert.match(text, /Workers do not each run them/);
    assert.match(text, /A failed\s+check goes to the worker whose WRITE_SET holds the failing file/);
    assert.match(text, /a failure that no block explains is yours to trace/);
    assert.match(text, /you run the project's\s+checks once on the whole tree \(Checks\)/);
    assert.match(delegation(e), /5\. \*\*Check and accept the block\.\*\* When the blocks of an iteration are\s+submitted, run the project-wide checks once on the whole tree/);
    assert.match(dispatch(e), /^CHECKS: the commands this worker runs itself, .*otherwise the cooperator runs those once for all blocks\)$/m);
    assert.match(worker(e), /Run the CHECKS your packet gives you, and only those/);
    assert.match(worker(e), /The project's whole test suite, build, and CI are not yours\s+unless the packet assigns them/);
    assert.doesNotMatch(worker(e), /^Run CHECKS and report each exit code/m);
    assert.match(JSON.parse(read(`${e}/profiles.json`)).review.checks, /run once per iteration/);
  }
});

// The reviewer stays GPT-6.2 Sol; what changed is that its effort is a choice with stated grounds.
test('the cooperator chooses the reviewer\'s effort, high or xhigh, for each review', () => {
  for (const e of editions) {
    const text = skill(e);
    assert.match(text, /Choose the effort of\s+each review\./);
    assert.match(text, /`high` is the working level/);
    assert.match(text, /`xhigh`\s+is for a review\s+where a miss is\s+expensive or the tracing is long/);
    assert.match(text, /the worker's SITES names them/);
    for (const t of [text, delegation(e), dispatch(e), read(`${e}/global-instructions.md`)]) {
      assert.doesNotMatch(t, /independent review by\s+GPT-6\.2 Sol at xhigh|reviewer of their results on (Codex )?GPT-6\.2 Sol at\s+xhigh|Sol at xhigh\s+reviews|stage review \(Sol at xhigh\)/i);
    }
    const profiles = JSON.parse(read(`${e}/profiles.json`));
    const byDefault = profiles.profiles[profiles.selectionRules.default];
    for (const reviewer of [byDefault.blockReviewer, byDefault.stageReviewer]) {
      assert.deepEqual([reviewer.model, reviewer.effort, reviewer.effortUp], ['gpt-6.2-sol', 'high', 'xhigh']);
    }
    assert.match(profiles.review.effort, /The cooperator chooses the reviewer's effort for each review/);
  }
  assert.equal(JSON.parse(read('claude/profiles.json')).selectionRules.default, 'hybrid');
  assert.match(read('codex/skills/workforce-orchestrate/references/tools.md'), /The reviewer's `reasoning_effort` is `high` or `xhigh`, chosen for each review/);
  assert.match(read('claude/skills/workforce-orchestrate/references/tools.md'), /`review` →\s+`gpt-6\.2-sol` at `high`; add `--effort xhigh` for a review that needs it/);
});

test('the Codex launch layers set the models for delegation, not delegation itself', () => {
  for (const layer of ['economy', 'standard']) {
    const text = read(`codex/config/workforce-${layer}.config.toml`);
    assert.match(text, /Whether to delegate follows the skill; doing a step yourself is part of the profile\./);
  }
  assert.match(read('codex/config/workforce-economy.config.toml'), /when you delegate, Luna workers at xhigh/);
});
