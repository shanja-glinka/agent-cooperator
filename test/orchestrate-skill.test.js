import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { renderPolicySections } from '../lib/installer.js';

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
  for (const layer of ['economy', 'standard', 'complex']) {
    const text = read(`codex/config/workforce-${layer}.config.toml`);
    assert.match(text, /Whether to delegate follows the skill; doing a step yourself is part of the profile\./);
  }
  assert.match(read('codex/config/workforce-economy.config.toml'), /when you delegate, Luna workers at xhigh/);
  const complexLaunch = read('codex/config/workforce-complex.config.toml');
  assert.match(complexLaunch, /Use PROFILE=complex/);
  assert.match(complexLaunch, /low.*medium.*high/s);
  assert.match(complexLaunch, /Never use xhigh/);
});

test('Codex routes by acceptance boundary while preserving the ordinary Economy and Standard worker routes', () => {
  const profiles = JSON.parse(read('codex/profiles.json'));
  assert.equal(profiles.policyVersion, '1.17.2');
  assert.equal(profiles.selectionRules.default, 'economy');
  assert.deepEqual([profiles.profiles.economy.worker.model, profiles.profiles.economy.worker.effort], ['gpt-6-luna', 'xhigh']);
  assert.deepEqual([profiles.profiles.standard.worker.model, profiles.profiles.standard.worker.effort], ['gpt-6-luna', 'xhigh']);
  assert.deepEqual(profiles.profiles.standard.workerLadder, ['gpt-6-luna', 'gpt-6.2-sol']);

  const route = profiles.selectionRules.authoringRouting;
  assert.match(route, /regardless of layer/);
  assert.match(route, /small independently provable single edit and check stays with the cooperator without a default reviewer/);
  assert.match(route, /one connected deliverable[^]*combined behavior[^]*sole author[^]*fresh independent Sol xhigh review/);
  assert.match(route, /full immutable diff[^]*original observable contract and project checks/);
  assert.match(route, /unless the user explicitly prohibits review/);
  assert.match(route, /genuinely independent deliverables[^]*end-to-end acceptance and checks use the selected Economy or Standard Luna xhigh route/);
  assert.match(route, /Writable directories, file count, or per-slice lint alone do not establish independent acceptance/);
  assert.match(profiles.workClasses.build, /connected-owner/);
  assert.match(profiles.workClasses.build, /progress critic applies after 45 minutes/);

  const complex = profiles.profiles.complex;
  assert.equal(complex.worker.model, 'gpt-6.2-sol');
  assert.deepEqual(Object.keys(complex.worker.effortByBlock), ['low', 'medium', 'high']);
  assert.equal(complex.worker.effort, undefined);
  assert.match(complex.worker.selection, /independently for each block/);
  assert.match(complex.worker.effortContract, /Never use xhigh unless the user explicitly overrides/);
  assert.deepEqual(complex.workerLadder, ['gpt-6.2-sol']);
  assert.match(complex.selection, /difficult independently delegated work/);
  assert.match(profiles.selectionRules.automatic, /no explicit task.{0,2}launch profile/);
  assert.match(profiles.selectionRules.automatic, /genuinely difficult independently delegated blocks/);
  assert.match(profiles.selectionRules.automatic, /Explicit Economy, Standard, Complex, codex-workforce-owner/);
  assert.match(profiles.review.authoredBlocks, /fresh independent GPT-6\.2 Sol xhigh review/);
  assert.match(profiles.review.authoredBlocks, /reviewBlock and reviewStage do not disable it/);
  assert.match(profiles.review.delegatedBlocks, /including a Complex Sol worker block/);

  const skillText = skill('codex');
  assert.match(skillText, /invocation through\s+`codex-workforce-owner` wins/);
  assert.match(skillText, /regardless of launch-layer name/);
  assert.match(skillText, /a fresh independent Sol reviewer at xhigh/);
  assert.match(skillText, /A writable directory, file count, or\s+per-slice lint alone does not establish independent acceptance/);
  assert.match(skillText, /previously working normal input at the\s+changed boundary and the edge case/);
  assert.match(read('codex/global-instructions.md'), /choose the authoring route by each deliverable's\s+acceptance boundary, regardless of launch-layer name/);
  assert.match(dispatch('codex'), /`gpt-6-luna`, xhigh for independently accepted blocks \| `gpt-6\.2-sol`, low\/medium\/high by block/);
  assert.match(dispatch('codex'), /BASE: immutable revision before the implementation/);
  assert.match(dispatch('codex'), /REVIEW \(reviewer\): acceptance of a worker block \| connected-owner/);
  assert.match(read('codex/skills/workforce-orchestrate/references/complex.md'), /Explicit Economy,\s+Standard, `codex-workforce-owner`/);

  const cases = JSON.parse(fs.readFileSync(new URL('../evaluation/cases.json', import.meta.url), 'utf8')).cases;
  const scenario = cases.find((item) => item.id === 'codex-acceptance-boundary-routing');
  assert.ok(scenario);
  assert.match(scenario.expected, /small edit is direct.*connected serializer is cooperator-authored.*package blocks use Luna xhigh/s);
  assert.match(scenario.expected, /explicit Standard wins over automatic Complex/i);
  const ownerCritic = cases.find((item) => item.id === 'codex-connected-owner-progress-critic');
  assert.ok(ownerCritic);
  assert.match(ownerCritic.expected, /WORK_CLASS=build/);
  assert.match(ownerCritic.expected, /progress critic is due at 45 minutes/);
});

test('installed review switches affect delegated blocks but do not silently disable connected-owner review', () => {
  const template = skill('codex');
  const on = renderPolicySections(template, { reviewBlock: true, reviewStage: true }, 'Codex SKILL.md');
  const off = renderPolicySections(template, { reviewBlock: false, reviewStage: false }, 'Codex SKILL.md');
  assert.match(on, /A block a light worker submitted is accepted after an independent review/);
  assert.match(off, /Block review is off in this install/);
  for (const rendered of [on, off]) {
    assert.match(rendered, /This route's review is independent of `reviewBlock`/);
    assert.match(rendered, /explicit user\s+prohibition on review overrides it/);
  }
});
