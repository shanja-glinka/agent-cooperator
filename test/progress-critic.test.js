import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runCli } from '../lib/cli.js';

const read = (relative) => fs.readFile(new URL(`../payload/${relative}`, import.meta.url), 'utf8');

test('the Codex progress critic checks progress, read-only and bounded, separate from review', async () => {
  const [skill, criticRole, orchestration, tools, dispatch, delegation] = await Promise.all([
    read('codex/skills/workforce-progress-critic/SKILL.md'),
    read('codex/agents/workforce_progress_critic.toml'),
    read('codex/skills/workforce-orchestrate/SKILL.md'),
    read('codex/skills/workforce-orchestrate/references/tools.md'),
    read('codex/skills/workforce-orchestrate/references/dispatch.md'),
    read('codex/skills/workforce-orchestrate/references/delegation.md'),
  ]);

  assert.match(criticRole, /sandbox_mode = "read-only"/);
  assert.match(criticRole, /workforce-progress-critic\/SKILL\.md/);
  assert.match(skill, /At most 8 tool calls and 250 words/);
  assert.match(skill, /Progress since the last check/);
  assert.match(skill, /\*Repeater:\*[\s\S]*\*Wanderer:\*[\s\S]*\*Looper:\*/);
  assert.match(skill, /PROGRESS: on_track \| at_risk \| stuck \| blocked \| goal_met/);
  assert.match(skill, /REMEDY:/);
  assert.match(skill, /Name an input from the user only when nothing\s+in the task can supply it/);
  assert.match(orchestration, /does not\s+replace block or stage review/);
  assert.match(orchestration, /after 45 minutes of\s+wall-clock work/);
  assert.match(orchestration, /Two `stuck` reports in a row on the same criterion make the reset mandatory/);
  assert.match(dispatch, /Progress critic[\s\S]*gpt-6\.2-sol/);
  assert.match(dispatch, /PROGRESS_SINCE_LAST/);
  assert.match(tools, /followup_task/);
  assert.match(delegation, /nothing sleeps for\s+it/);
  for (const text of [skill, criticRole, orchestration, tools, dispatch, delegation]) {
    assert.doesNotMatch(text, /critic_scheduler|clock\.sleep|duePending|CRITIC-SCHEDULE|30-minute/);
    assert.doesNotMatch(text, /Telegram|Codex session id/i);
  }
});

test('the Codex routing policy assigns the critic in every profile and no scheduler', async () => {
  const codex = JSON.parse(await read('codex/profiles.json'));
  const claude = JSON.parse(await read('claude/profiles.json'));
  assert.equal(codex.policyVersion, '1.17.2');
  assert.deepEqual(Object.keys(codex.profiles), ['standard', 'economy', 'complex']);
  for (const profile of Object.values(codex.profiles)) {
    assert.equal(profile.progressCritic.model, 'gpt-6.2-sol');
    assert.equal(profile.progressCritic.effort, 'xhigh');
    assert.match(profile.progressCritic.when, /first after 45 minutes of work, then every 45 minutes/);
    assert.equal(profile.criticScheduler, undefined);
  }
  assert.equal(claude.policyVersion, '1.13.0');
  assert.ok(Object.values(claude.profiles).every((profile) => !profile.progressCritic));
});

test('a disposable Codex install contains the progress critic role and skill and no scheduler', async (t) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'workforce-progress-install-'));
  t.after(() => fs.rm(temp, { recursive: true, force: true }));
  const home = path.join(temp, 'Codex Home');
  const skillsDir = path.join(temp, 'Native Skills');

  let stdout = '';
  let stderr = '';
  const run = (args) => runCli([...args, '--codex-home', home, '--skills-dir', skillsDir], {
    target: 'codex',
    env: process.env,
    stdout: { write: (value) => { stdout += value; } },
    stderr: { write: (value) => { stderr += value; } },
  });
  assert.equal(await run(['install']), 0);
  assert.equal(stderr, '');
  assert.match(stdout, /install: completed/);
  assert.equal((await fs.stat(path.join(home, 'agents', 'workforce_progress_critic.toml'))).isFile(), true);
  await assert.rejects(fs.lstat(path.join(home, 'agents', 'workforce_critic_scheduler.toml')));
  assert.match(await fs.readFile(path.join(home, 'agents', 'workforce_progress_critic.toml'), 'utf8'), /workforce-progress-critic\/SKILL\.md/);
  const link = await fs.readlink(path.join(skillsDir, 'workforce-progress-critic'));
  assert.equal(link, path.join(home, 'skills', 'workforce-progress-critic'));
  assert.match(await fs.readFile(path.join(home, 'skills', 'workforce-progress-critic', 'SKILL.md'), 'utf8'), /# Progress critic/);

  stdout = '';
  assert.equal(await run(['status']), 0);
  assert.match(stdout, /progress critic gpt-6\.2-sol xhigh; ladder/);

  stdout = '';
  assert.equal(await run(['uninstall']), 0);
  assert.match(stdout, /uninstall: completed/);
  await assert.rejects(fs.lstat(path.join(home, 'agents', 'workforce_progress_critic.toml')));
  await assert.rejects(fs.lstat(path.join(skillsDir, 'workforce-progress-critic')));
});
