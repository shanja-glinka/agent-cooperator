import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runCli } from '../lib/cli.js';
import { TARGETS, managedMarkers, renderPolicySections, runCommand } from '../lib/installer.js';

const MARKERS = managedMarkers(TARGETS.claude);

test('claude install writes agents, skills, profiles, and a CLAUDE.md block; uninstall restores', async (t) => {
  const fixture = await makeFixture();
  t.after(() => fs.rm(fixture.temp, { recursive: true, force: true }));
  const claudeMd = path.join(fixture.home, 'CLAUDE.md');
  await fs.writeFile(claudeMd, 'user memory\n');
  await fs.writeFile(path.join(fixture.home, 'settings.json'), '{"model":"user"}\n');

  const first = await runCommand('install', fixture.options);
  assert.equal(first.exitCode, 0, first.issues.join('\n'));
  assert.equal(first.skillsDir, null);
  assert.match(await fs.readFile(path.join(fixture.home, 'agents', 'workforce-worker.md'), 'utf8'), /home: .+Claude Home/);
  assert.equal(await fs.readFile(path.join(fixture.home, 'skills', 'workforce-worker', 'SKILL.md'), 'utf8'), `# skill\n${portable(fixture.home)}\n`);
  assert.equal(await fs.readFile(path.join(fixture.home, 'claude-workforce', 'profiles.json'), 'utf8'), `{"home":"${portable(fixture.home)}"}\n`);
  const written = await fs.readFile(claudeMd, 'utf8');
  assert.ok(written.startsWith('user memory\n'));
  assert.match(written, new RegExp(`${MARKERS.begin}[\\s\\S]+${MARKERS.end}`));
  assert.doesNotMatch(written, /codex-workforce/);
  assert.equal(fssync.existsSync(path.join(fixture.home, 'AGENTS.md')), false);

  const second = await runCommand('install', fixture.options);
  assert.deepEqual(second.actions, []);
  assert.equal((await runCommand('status', fixture.options)).exitCode, 0);

  const uninstalled = await runCommand('uninstall', fixture.options);
  assert.equal(uninstalled.exitCode, 0);
  assert.equal(await fs.readFile(claudeMd, 'utf8'), 'user memory\n');
  assert.equal(await fs.readFile(path.join(fixture.home, 'settings.json'), 'utf8'), '{"model":"user"}\n');
  assert.equal(fssync.existsSync(path.join(fixture.home, 'agents', 'workforce-worker.md')), false);
  assert.equal(fssync.existsSync(path.join(fixture.home, 'skills', 'workforce-worker')), false);
  assert.equal(fssync.existsSync(path.join(fixture.home, 'claude-workforce')), false);
});

test('claude payload rejects toml agents and config profiles', async (t) => {
  const fixture = await makeFixture();
  t.after(() => fs.rm(fixture.temp, { recursive: true, force: true }));
  await fs.writeFile(path.join(fixture.packageRoot, 'payload', 'claude', 'agents', 'bad.toml'), 'name = "bad"\n');
  await assert.rejects(runCommand('install', fixture.options), /Agent payload must be \.md/);
  await fs.rm(path.join(fixture.packageRoot, 'payload', 'claude', 'agents', 'bad.toml'));
  await fs.mkdir(path.join(fixture.packageRoot, 'payload', 'claude', 'config'));
  await fs.writeFile(path.join(fixture.packageRoot, 'payload', 'claude', 'config', 'x.config.toml'), 'a = 1\n');
  await assert.rejects(runCommand('install', fixture.options), /does not support config profiles/);
});

test('claude CLI honors --claude-home over CLAUDE_CONFIG_DIR and rejects --skills-dir', async (t) => {
  const fixture = await makeFixture('Claude Home Ж');
  t.after(() => fs.rm(fixture.temp, { recursive: true, force: true }));
  const envHome = path.join(fixture.temp, 'env-home');
  await fs.mkdir(envHome, { recursive: true });
  const io = () => {
    const out = { stdout: '', stderr: '' };
    return {
      out,
      io: {
        target: 'claude',
        packageRoot: fixture.packageRoot,
        env: { ...process.env, CLAUDE_CONFIG_DIR: envHome },
        stdout: { write: (value) => { out.stdout += value; } },
        stderr: { write: (value) => { out.stderr += value; } },
      },
    };
  };

  const rejected = io();
  assert.equal(await runCli(['install', '--skills-dir', fixture.temp], rejected.io), 2);
  assert.match(rejected.out.stderr, /--skills-dir is not supported/);

  const explicit = io();
  assert.equal(await runCli(['install', '--claude-home', fixture.home], explicit.io), 0);
  assert.match(explicit.out.stdout, /install: completed\nclaude home: /);
  assert.doesNotMatch(explicit.out.stdout, /skills dir/);
  assert.equal(fssync.existsSync(path.join(envHome, 'agents')), false);
  assert.equal(fssync.existsSync(path.join(fixture.home, 'agents', 'workforce-worker.md')), true);

  const fromEnv = io();
  assert.equal(await runCli(['install'], fromEnv.io), 0);
  assert.equal(fssync.existsSync(path.join(envHome, 'agents', 'workforce-worker.md')), true);

  const help = io();
  assert.equal(await runCli(['--help'], help.io), 0);
  assert.match(help.out.stdout, /^claude-workforce\n/);
  assert.match(help.out.stdout, /--claude-home PATH/);
  assert.doesNotMatch(help.out.stdout, /--skills-dir/);
});

test('codex and claude kits coexist in one home without touching each other', async (t) => {
  const fixture = await makeFixture();
  t.after(() => fs.rm(fixture.temp, { recursive: true, force: true }));
  await fs.mkdir(path.join(fixture.packageRoot, 'payload', 'codex', 'agents'), { recursive: true });
  await fs.writeFile(path.join(fixture.packageRoot, 'payload', 'codex', 'agents', 'workforce_worker.toml'), 'name = "w"\n');
  await fs.writeFile(path.join(fixture.packageRoot, 'payload', 'codex', 'global-instructions.md'), 'codex block\n');
  const codexOptions = { target: 'codex', packageRoot: fixture.packageRoot, home: fixture.home, skillsDir: path.join(fixture.temp, 'links'), env: {} };

  assert.equal((await runCommand('install', codexOptions)).exitCode, 0);
  assert.equal((await runCommand('install', fixture.options)).exitCode, 0);
  assert.match(await fs.readFile(path.join(fixture.home, 'AGENTS.md'), 'utf8'), /codex-workforce:begin/);
  assert.match(await fs.readFile(path.join(fixture.home, 'CLAUDE.md'), 'utf8'), /claude-workforce:begin/);

  assert.equal((await runCommand('uninstall', codexOptions)).exitCode, 0);
  assert.equal((await runCommand('status', fixture.options)).exitCode, 0);
  assert.equal(fssync.existsSync(path.join(fixture.home, 'agents', 'workforce-worker.md')), true);
  assert.equal(fssync.existsSync(path.join(fixture.home, 'agents', 'workforce_worker.toml')), false);
});

test('update installs the real Claude payload and preserves user CLAUDE.md text', async (t) => {
  const fixture = await makeFixture();
  t.after(() => fs.rm(fixture.temp, { recursive: true, force: true }));
  const claudeMd = path.join(fixture.home, 'CLAUDE.md');
  await fs.writeFile(claudeMd, 'User standing instructions\n');
  await runCommand('install', fixture.options);
  await fs.appendFile(claudeMd, '\nUser additions after install\n');

  const packageRoot = path.resolve(import.meta.dirname, '..');
  const options = { ...fixture.options, packageRoot };
  const updated = await runCommand('update', options);
  assert.equal(updated.exitCode, 0, updated.issues.join('\n'));

  const actual = await fs.readFile(claudeMd, 'utf8');
  const sourceGlobal = await fs.readFile(path.join(packageRoot, 'payload', 'claude', 'global-instructions.md'), 'utf8');
  const sourcePolicy = JSON.parse(await fs.readFile(path.join(packageRoot, 'payload', 'claude', 'profiles.json'), 'utf8')).policy;
  assert.ok(actual.includes(renderPolicySections(sourceGlobal.replaceAll('{{CLAUDE_HOME}}', portable(fixture.home)), sourcePolicy).trim()));
  assert.ok(actual.startsWith('User standing instructions\n'));
  assert.ok(actual.endsWith('\nUser additions after install\n'));
  assert.doesNotMatch(actual, /\{\{CLAUDE_HOME\}\}/);

  for (const name of ['workforce-worker', 'workforce-worker-lite', 'workforce-probe', 'workforce-auditor', 'workforce-reviewer']) {
    const agent = await fs.readFile(path.join(fixture.home, 'agents', `${name}.md`), 'utf8');
    assert.match(agent, new RegExp(`^---\\nname: ${name}\\n`));
    assert.match(agent, /\nmodel: inherit\n/);
    assert.match(agent, /\nmaxTurns: \d+\n/);
    assert.match(agent, /\ndisallowedTools: Agent/);
    assert.doesNotMatch(agent, /\{\{CLAUDE_HOME\}\}/);
  }
  for (const name of ['workforce-orchestrate', 'workforce-worker', 'workforce-probe', 'workforce-audit', 'workforce-review', 'workforce-smoke']) {
    const skill = await fs.readFile(path.join(fixture.home, 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(skill, new RegExp(`^---\\nname: ${name}\\n`));
    assert.doesNotMatch(skill, /\{\{CLAUDE_HOME\}\}/);
  }
  const dispatch = await fs.readFile(path.join(fixture.home, 'skills', 'workforce-orchestrate', 'references', 'dispatch.md'), 'utf8');
  assert.ok(dispatch.includes(`${portable(fixture.home)}/claude-workforce/profiles.json`));

  const policy = JSON.parse(await fs.readFile(path.join(fixture.home, 'claude-workforce', 'profiles.json'), 'utf8'));
  assert.equal(policy.runtime, 'claude-code');
  assert.equal(policy.selectionRules.default, 'hybrid');
  assert.deepEqual(Object.keys(policy.workClasses), ['direct', 'build', 'pipeline']);
  assert.equal(policy.profiles.standard.worker.model, 'sonnet');
  assert.deepEqual(policy.profiles.hybrid.workerLadder, ['haiku', 'codex:gpt-6.1-sol', 'opus']);
  assert.equal(policy.workerBudgets.haiku.tokenCeiling, 400000);
  assert.equal(policy.workerBudgets.sonnet.tokenCeiling, 500000);
  const lite = await fs.readFile(path.join(fixture.home, 'agents', 'workforce-worker-lite.md'), 'utf8');
  assert.match(lite, /\nmaxTurns: 130\n/);
  assert.match(lite, /\neffort: xhigh\n/);
  assert.equal(policy.profiles.standard.auditor.model, 'haiku');
  assert.equal(policy.profiles.standard.auditor.effort, 'xhigh');
  assert.match(policy.profiles.standard.auditor.mode, /^on-demand/);
  assert.deepEqual(policy.policy, { reviewBlock: true, reviewStage: true });
  const hybrid = policy.profiles.hybrid;
  assert.equal(hybrid.orchestrator.effort, 'high');
  assert.equal(hybrid.worker.model, 'haiku');
  assert.equal(hybrid.worker.effort, 'xhigh');
  assert.equal(hybrid.blockReviewer.effort, 'xhigh');
  assert.ok(policy.review.delegatedBlocks.includes('gpt-6.1-sol'));
  assert.deepEqual([hybrid.auditor.runtime, hybrid.auditor.model, hybrid.auditor.effort], ['codex-cli', 'gpt-6-luna', 'xhigh']);
  assert.deepEqual([hybrid.blockReviewer.model, hybrid.stageReviewer.model], ['gpt-6.1-sol', 'gpt-6.1-sol']);
  assert.equal(hybrid.codexRunner.script, `${portable(fixture.home)}/skills/workforce-orchestrate/scripts/codex-run.mjs`);
  await fs.access(path.join(fixture.home, 'skills', 'workforce-orchestrate', 'scripts', 'codex-run.mjs'));
  await fs.access(path.join(fixture.home, 'skills', 'workforce-orchestrate', 'scripts', 'accept.mjs'));
  assert.equal(hybrid.stageReviewer.effort, 'xhigh');
  assert.ok(policy.review.contract.includes('CONTRACT') && policy.review.conditions.includes('accepted_if'));
  assert.deepEqual((await runCommand('status', options)).routing.slice(1), ['hybrid (default): worker haiku xhigh; block review gpt-6.1-sol xhigh; stage review gpt-6.1-sol xhigh; ladder haiku → codex:gpt-6.1-sol → opus']);
  const auditor = await fs.readFile(path.join(fixture.home, 'agents', 'workforce-auditor.md'), 'utf8');
  assert.match(auditor, /\neffort: xhigh\n/);
  assert.match(auditor, /\ndisallowedTools: Agent, Edit, Write, NotebookEdit\n/);
  assert.equal((await runCommand('status', options)).exitCode, 0);
  assert.deepEqual((await runCommand('update', options)).actions, []);
});

// Review switches come from one policy value: every installed text agrees with it.
test('claude install renders the review switches into every installed text', async (t) => {
  const packageRoot = path.resolve(import.meta.dirname, '..');
  const texts = async (home) => {
    const out = [];
    const walk = async (dir) => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(p); else if (/\.(md|json|toml)$/.test(entry.name)) out.push(await fs.readFile(p, 'utf8'));
      }
    };
    await walk(home);
    return out.join('\n');
  };
  const on = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-policy-on-'));
  const off = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-policy-off-'));
  t.after(() => Promise.all([fs.rm(on, { recursive: true, force: true }), fs.rm(off, { recursive: true, force: true })]));
  assert.equal((await runCommand('install', { target: 'claude', home: on, packageRoot })).exitCode, 0);
  assert.equal((await runCommand('install', { target: 'claude', home: off, packageRoot, set: { reviewBlock: 'off', reviewStage: 'off' } })).exitCode, 0);
  const [textOn, textOff] = [await texts(on), await texts(off)];
  for (const text of [textOn, textOff]) assert.doesNotMatch(text, /\{\{[#^/][A-Za-z]/);
  assert.match(textOn, /independent review by\nGPT-6\.1 Sol at xhigh/);
  assert.doesNotMatch(textOff, /reviewed \(Codex GPT-6\.1 Sol|independent review by\nGPT-6\.1 Sol|one Sol xhigh review|Stage acceptance \(pipeline/);
  assert.match(textOff, /Block review is off in this install/);
  assert.match(textOff, /Stage review is off in this install/);
  const policy = JSON.parse(await fs.readFile(path.join(off, 'claude-workforce', 'profiles.json'), 'utf8')).policy;
  assert.deepEqual(policy, { reviewBlock: false, reviewStage: false });
  await assert.rejects(runCommand('install', { target: 'claude', home: off, packageRoot, set: { review: 'off' } }), /Unknown policy key/);
});

async function makeFixture(homeName = 'Claude Home') {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-workforce-test-'));
  const packageRoot = path.join(temp, 'package root');
  const home = path.join(temp, homeName);
  const payload = path.join(packageRoot, 'payload', 'claude');
  await fs.mkdir(path.join(payload, 'agents'), { recursive: true });
  await fs.mkdir(path.join(payload, 'skills', 'workforce-worker'), { recursive: true });
  await fs.mkdir(home, { recursive: true });
  await fs.writeFile(path.join(packageRoot, 'package.json'), `${JSON.stringify({ name: 'fixture', version: '1.0.0' }, null, 2)}\n`);
  await fs.writeFile(path.join(payload, 'agents', 'workforce-worker.md'), '---\nname: workforce-worker\nhome: {{CLAUDE_HOME}}\n---\nbody\n');
  await fs.writeFile(path.join(payload, 'skills', 'workforce-worker', 'SKILL.md'), '# skill\n{{CLAUDE_HOME}}\n');
  await fs.writeFile(path.join(payload, 'global-instructions.md'), 'claude instructions for {{CLAUDE_HOME}}\n');
  await fs.writeFile(path.join(payload, 'profiles.json'), '{"home":"{{CLAUDE_HOME}}"}\n');
  return {
    temp,
    packageRoot,
    home,
    options: { target: 'claude', packageRoot, home, env: {} },
  };
}

function portable(filePath) {
  return path.resolve(filePath).split(path.sep).join('/');
}
