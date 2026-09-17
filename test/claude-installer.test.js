import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runCli } from '../lib/cli.js';
import { TARGETS, managedMarkers, runCommand } from '../lib/installer.js';

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
  assert.ok(actual.includes(sourceGlobal.replaceAll('{{CLAUDE_HOME}}', portable(fixture.home)).trim()));
  assert.ok(actual.startsWith('User standing instructions\n'));
  assert.ok(actual.endsWith('\nUser additions after install\n'));
  assert.doesNotMatch(actual, /\{\{CLAUDE_HOME\}\}/);

  for (const name of ['workforce-worker', 'workforce-probe', 'workforce-reviewer']) {
    const agent = await fs.readFile(path.join(fixture.home, 'agents', `${name}.md`), 'utf8');
    assert.match(agent, new RegExp(`^---\\nname: ${name}\\n`));
    assert.match(agent, /\nmodel: inherit\n/);
    assert.match(agent, /\nmaxTurns: \d+\n/);
    assert.match(agent, /\ndisallowedTools: Agent/);
    assert.doesNotMatch(agent, /\{\{CLAUDE_HOME\}\}/);
  }
  for (const name of ['workforce-orchestrate', 'workforce-worker', 'workforce-probe', 'workforce-review', 'workforce-smoke']) {
    const skill = await fs.readFile(path.join(fixture.home, 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(skill, new RegExp(`^---\\nname: ${name}\\n`));
    assert.doesNotMatch(skill, /\{\{CLAUDE_HOME\}\}/);
  }
  const dispatch = await fs.readFile(path.join(fixture.home, 'skills', 'workforce-orchestrate', 'references', 'dispatch.md'), 'utf8');
  assert.ok(dispatch.includes(`${portable(fixture.home)}/claude-workforce/profiles.json`));

  const policy = JSON.parse(await fs.readFile(path.join(fixture.home, 'claude-workforce', 'profiles.json'), 'utf8'));
  assert.equal(policy.runtime, 'claude-code');
  assert.equal(policy.selectionRules.default, 'standard');
  assert.deepEqual(Object.keys(policy.workClasses), ['direct', 'build', 'pipeline']);
  assert.equal(policy.profiles.standard.worker.model, 'sonnet');
  assert.equal((await runCommand('status', options)).exitCode, 0);
  assert.deepEqual((await runCommand('update', options)).actions, []);
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
