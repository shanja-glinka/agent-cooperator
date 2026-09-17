import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runCli } from '../lib/cli.js';
import { MANAGED_BEGIN, MANAGED_END, TARGETS, managedMarkers, runCommand } from '../lib/installer.js';

test('install is idempotent and uninstall preserves foreign bytes', async () => {
  const fixture = await makeFixture();
  await fs.writeFile(path.join(fixture.codexHome, 'AGENTS.md'), 'before\n');
  await fs.writeFile(path.join(fixture.codexHome, 'config.toml'), 'foreign = true\n');

  const first = await runCommand('install', fixture.options);
  assert.equal(first.exitCode, 0);
  assert.match(await fs.readFile(path.join(fixture.codexHome, 'agents', 'workforce_worker.toml'), 'utf8'), /home = ".+Codex Home/);
  assert.equal(fssync.lstatSync(path.join(fixture.skillsDir, 'workforce-worker')).isSymbolicLink(), true);
  assert.equal(await fs.readFile(path.join(fixture.codexHome, 'codex-workforce', 'profiles.json'), 'utf8'), `{"home":"${portable(fixture.codexHome)}"}\n`);
  assert.match(await fs.readFile(path.join(fixture.codexHome, 'workforce-standard.config.toml'), 'utf8'), /profile = "standard"/);
  assert.match(await fs.readFile(path.join(fixture.codexHome, 'AGENTS.md'), 'utf8'), new RegExp(`${MANAGED_BEGIN}[\\s\\S]+${MANAGED_END}`));

  const second = await runCommand('install', fixture.options);
  assert.equal(second.exitCode, 0);
  assert.equal(second.issues.length, 0);
  assert.deepEqual(second.actions, []);

  const uninstalled = await runCommand('uninstall', fixture.options);
  assert.equal(uninstalled.exitCode, 0);
  assert.equal(await fs.readFile(path.join(fixture.codexHome, 'AGENTS.md'), 'utf8'), 'before\n');
  assert.equal(await fs.readFile(path.join(fixture.codexHome, 'config.toml'), 'utf8'), 'foreign = true\n');
  assert.equal(fssync.existsSync(path.join(fixture.codexHome, 'workforce-standard.config.toml')), false);
  assert.equal(fssync.existsSync(path.join(fixture.codexHome, 'codex-workforce', 'profiles.json')), false);
  assert.equal(fssync.existsSync(path.join(fixture.codexHome, 'codex-workforce')), false);
  assert.equal(fssync.existsSync(path.join(fixture.skillsDir, 'workforce-worker')), false);
});

test('update replaces owned files and removes stale owned payload files only', async () => {
  const fixture = await makeFixture();
  await runCommand('install', fixture.options);

  await fs.rm(path.join(fixture.packageRoot, 'payload', 'codex', 'skills', 'workforce-worker', 'extra.md'));
  await fs.rm(path.join(fixture.packageRoot, 'payload', 'codex', 'profiles.json'));
  await fs.rm(path.join(fixture.packageRoot, 'payload', 'codex', 'config', 'workforce-enhanced.config.toml'));
  await fs.writeFile(path.join(fixture.packageRoot, 'payload', 'codex', 'skills', 'workforce-worker', 'SKILL.md'), 'new {{CODEX_HOME}}\n');
  await fs.writeFile(path.join(fixture.codexHome, 'skills', 'workforce-worker', 'foreign.md'), 'foreign\n');

  const updated = await runCommand('update', fixture.options);
  assert.equal(updated.exitCode, 0);
  assert.equal(await fs.readFile(path.join(fixture.codexHome, 'skills', 'workforce-worker', 'SKILL.md'), 'utf8'), `new ${portable(fixture.codexHome)}\n`);
  assert.equal(fssync.existsSync(path.join(fixture.codexHome, 'skills', 'workforce-worker', 'extra.md')), false);
  assert.equal(fssync.existsSync(path.join(fixture.codexHome, 'codex-workforce', 'profiles.json')), false);
  assert.equal(fssync.existsSync(path.join(fixture.codexHome, 'workforce-enhanced.config.toml')), false);
  assert.equal(await fs.readFile(path.join(fixture.codexHome, 'skills', 'workforce-worker', 'foreign.md'), 'utf8'), 'foreign\n');
});

test('collisions and edited owned files fail unless force is used', async () => {
  const collision = await makeFixture();
  await fs.mkdir(path.join(collision.codexHome, 'agents'), { recursive: true });
  await fs.writeFile(path.join(collision.codexHome, 'agents', 'workforce_worker.toml'), 'foreign\n');
  const failedCollision = await runCommand('install', collision.options);
  assert.equal(failedCollision.exitCode, 1);
  assert.match(failedCollision.issues.join('\n'), /Unowned file collision/);

  const fixture = await makeFixture();
  await runCommand('install', fixture.options);
  await fs.writeFile(path.join(fixture.codexHome, 'skills', 'workforce-worker', 'SKILL.md'), 'edited\n');
  const failedDrift = await runCommand('update', fixture.options);
  assert.equal(failedDrift.exitCode, 1);
  assert.match(failedDrift.issues.join('\n'), /requires --force/);

  const forced = await runCommand('update', { ...fixture.options, force: true });
  assert.equal(forced.exitCode, 0);
  assert.ok(forced.backups.length > 0);
  assert.match(await fs.readFile(path.join(fixture.codexHome, 'skills', 'workforce-worker', 'SKILL.md'), 'utf8'), /skill/);
});

test('AGENTS.md symlink target is edited without replacing the symlink', async () => {
  const fixture = await makeFixture();
  const target = path.join(fixture.temp, 'Shared Agents.md');
  await fs.writeFile(target, 'shared\n');
  await fs.symlink(target, path.join(fixture.codexHome, 'AGENTS.md'));

  const installed = await runCommand('install', fixture.options);
  assert.equal(installed.exitCode, 0);
  assert.equal(fssync.lstatSync(path.join(fixture.codexHome, 'AGENTS.md')).isSymbolicLink(), true);
  assert.match(await fs.readFile(target, 'utf8'), /global instructions/);
});

test('AGENTS.override.md is the effective global instructions file when nonempty', async () => {
  const fixture = await makeFixture();
  await fs.writeFile(path.join(fixture.codexHome, 'AGENTS.md'), 'base\n');
  await fs.writeFile(path.join(fixture.codexHome, 'AGENTS.override.md'), 'override\n');

  const installed = await runCommand('install', fixture.options);
  assert.equal(installed.exitCode, 0);
  assert.doesNotMatch(await fs.readFile(path.join(fixture.codexHome, 'AGENTS.md'), 'utf8'), /codex-workforce:begin/);
  assert.match(await fs.readFile(path.join(fixture.codexHome, 'AGENTS.override.md'), 'utf8'), /codex-workforce:begin/);
});

test('nonempty symlinked AGENTS.override.md is the active instructions file', async () => {
  const fixture = await makeFixture();
  const overrideTarget = path.join(fixture.temp, 'Override Target.md');
  await fs.writeFile(path.join(fixture.codexHome, 'AGENTS.md'), 'base\n');
  await fs.writeFile(overrideTarget, 'override\n');
  await fs.symlink(overrideTarget, path.join(fixture.codexHome, 'AGENTS.override.md'));

  const installed = await runCommand('install', fixture.options);
  assert.equal(installed.exitCode, 0);
  assert.doesNotMatch(await fs.readFile(path.join(fixture.codexHome, 'AGENTS.md'), 'utf8'), /codex-workforce:begin/);
  assert.match(await fs.readFile(overrideTarget, 'utf8'), /codex-workforce:begin/);
  assert.equal(fssync.lstatSync(path.join(fixture.codexHome, 'AGENTS.override.md')).isSymbolicLink(), true);

  const status = await runCommand('status', fixture.options);
  assert.equal(status.exitCode, 0);

  const uninstalled = await runCommand('uninstall', fixture.options);
  assert.equal(uninstalled.exitCode, 0);
  assert.equal(await fs.readFile(overrideTarget, 'utf8'), 'override\n');
});

test('global instructions uninstall preserves exact outside bytes', async () => {
  const cases = [
    ['no final newline', 'outside instructions', ''],
    ['single trailing newline', 'outside instructions\n', ''],
    ['existing trailing blank lines', 'outside instructions\n\n', ''],
    ['outside edit after managed block', 'outside instructions', '\noperator edit after block\n'],
  ];

  for (const [name, initialContent, afterBlockEdit] of cases) {
    const fixture = await makeFixture();
    const agentsPath = path.join(fixture.codexHome, 'AGENTS.md');
    await fs.writeFile(agentsPath, initialContent);
    await runCommand('install', fixture.options);
    if (afterBlockEdit) {
      await fs.appendFile(agentsPath, afterBlockEdit);
    }
    await runCommand('uninstall', fixture.options);
    assert.equal(await fs.readFile(agentsPath, 'utf8'), `${initialContent}${afterBlockEdit}`, name);
  }
});

test('force backup of edited symlinked global instructions stores resolved target bytes', async () => {
  const fixture = await makeFixture();
  const target = path.join(fixture.temp, 'Linked Agents.md');
  await fs.writeFile(target, 'linked\n');
  await fs.symlink(target, path.join(fixture.codexHome, 'AGENTS.md'));
  await runCommand('install', fixture.options);
  const editedContent = (await fs.readFile(target, 'utf8')).replace('global instructions', 'edited instructions');
  await fs.writeFile(target, editedContent);

  const uninstalled = await runCommand('uninstall', { ...fixture.options, force: true });
  assert.equal(uninstalled.exitCode, 0);
  assert.ok(uninstalled.backups.length > 0);
  assert.equal(fssync.lstatSync(uninstalled.backups[0]).isSymbolicLink(), false);
  assert.equal(await fs.readFile(uninstalled.backups[0], 'utf8'), editedContent);
  assert.equal(await fs.readFile(target, 'utf8'), 'linked\n');
  assert.equal(fssync.lstatSync(path.join(fixture.codexHome, 'AGENTS.md')).isSymbolicLink(), true);
});

test('dry run performs no writes and status reports drift', async () => {
  const fixture = await makeFixture();
  const dryRun = await runCommand('install', { ...fixture.options, dryRun: true });
  assert.equal(dryRun.exitCode, 0);
  assert.equal(fssync.existsSync(path.join(fixture.codexHome, 'agents')), false);
  assert.equal(fssync.existsSync(path.join(fixture.codexHome, 'codex-workforce')), false);

  await runCommand('install', fixture.options);
  await fs.rm(path.join(fixture.skillsDir, 'workforce-worker'));
  const status = await runCommand('status', fixture.options);
  assert.equal(status.exitCode, 1);
  assert.match(status.issues.join('\n'), /Missing discovery symlink/);
});

test('CLI honors --codex-home over CODEX_HOME and isolates --skills-dir with non-ASCII paths', async () => {
  const fixture = await makeFixture('Codex Home Ж');
  const envHome = path.join(fixture.temp, 'env-home');
  await fs.mkdir(envHome, { recursive: true });
  let stdout = '';
  let stderr = '';
  const exitCode = await runCli([
    'install',
    '--codex-home', fixture.codexHome,
    '--skills-dir', fixture.skillsDir,
  ], {
    target: 'codex',
    packageRoot: fixture.packageRoot,
    env: { ...process.env, CODEX_HOME: envHome },
    stdout: { write: (value) => { stdout += value; } },
    stderr: { write: (value) => { stderr += value; } },
  });

  assert.equal(exitCode, 0);
  assert.equal(stderr, '');
  assert.match(stdout, /install: completed/);
  assert.equal(fssync.existsSync(path.join(envHome, 'agents')), false);
  assert.equal(fssync.existsSync(path.join(fixture.skillsDir, 'workforce-worker')), true);
});

test('write failure rolls back prior mutations', async (t) => {
  const fixture = await makeFixture();
  await fs.writeFile(path.join(fixture.codexHome, 'AGENTS.md'), 'before\n');
  const originalWriteFile = fs.writeFile;
  t.mock.method(fs, 'writeFile', async (filePath, ...args) => {
    if (String(filePath).endsWith(path.join('codex-workforce', 'profiles.json'))) {
      throw new Error('planned write failure');
    }
    return originalWriteFile.call(fs, filePath, ...args);
  });

  await assert.rejects(
    runCommand('install', fixture.options),
    /planned write failure/,
  );
  assert.equal(fssync.existsSync(path.join(fixture.codexHome, 'agents', 'workforce_worker.toml')), false);
  assert.equal(fssync.existsSync(path.join(fixture.codexHome, 'agents')), false);
  assert.equal(await fs.readFile(path.join(fixture.codexHome, 'AGENTS.md'), 'utf8'), 'before\n');
});

test('managed payload paths refuse symlink parent traversal', async () => {
  const fixture = await makeFixture();
  const outside = path.join(fixture.temp, 'outside');
  await fs.mkdir(outside, { recursive: true });
  await fs.symlink(outside, path.join(fixture.codexHome, 'agents'));

  const failed = await runCommand('install', fixture.options);
  assert.equal(failed.exitCode, 1);
  assert.match(failed.issues.join('\n'), /symlink parent/);
});

test('uninstall and status refuse owned file removal through symlink parents', async () => {
  const fixture = await makeFixture();
  await runCommand('install', fixture.options);
  const external = path.join(fixture.temp, 'external-probe');
  const managedProbe = path.join(fixture.codexHome, 'skills', 'workforce-probe');
  const movedProbe = path.join(fixture.codexHome, 'skills', 'workforce-probe.moved');
  await fs.cp(managedProbe, external, { recursive: true });
  await fs.rename(managedProbe, movedProbe);
  await fs.symlink(external, managedProbe);

  const status = await runCommand('status', fixture.options);
  assert.equal(status.exitCode, 1);
  assert.match(status.issues.join('\n'), /symlink parent/);

  const failed = await runCommand('uninstall', { ...fixture.options, force: true });
  assert.equal(failed.exitCode, 1);
  assert.match(failed.issues.join('\n'), /symlink parent/);
  assert.equal(await fs.readFile(path.join(external, 'SKILL.md'), 'utf8'), await fs.readFile(path.join(movedProbe, 'SKILL.md'), 'utf8'));
  assert.equal(fssync.existsSync(path.join(fixture.codexHome, 'codex-workforce', 'manifest.json')), true);
});

test('manifest package version comes from invoked package.json', async () => {
  const fixture = await makeFixture('Codex Home', '2.3.4');
  await runCommand('install', fixture.options);
  let manifest = JSON.parse(await fs.readFile(path.join(fixture.codexHome, 'codex-workforce', 'manifest.json'), 'utf8'));
  assert.equal(manifest.packageVersion, '2.3.4');

  await writeFixturePackageJson(fixture.packageRoot, '2.3.5');
  const updated = await runCommand('update', fixture.options);
  assert.equal(updated.exitCode, 0);
  manifest = JSON.parse(await fs.readFile(path.join(fixture.codexHome, 'codex-workforce', 'manifest.json'), 'utf8'));
  assert.equal(manifest.packageVersion, '2.3.5');
  const status = await runCommand('status', fixture.options);
  assert.match(status.summary, /2\.3\.5/);
});

async function makeFixture(codexHomeName = 'Codex Home', packageVersion = '1.0.0') {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-workforce-test-'));
  const packageRoot = path.join(temp, 'package root');
  const codexHome = path.join(temp, codexHomeName);
  const skillsDir = path.join(temp, 'Native Skills');
  await fs.mkdir(path.join(packageRoot, 'payload', 'codex', 'agents'), { recursive: true });
  await fs.mkdir(path.join(packageRoot, 'payload', 'codex', 'skills', 'workforce-worker', 'nested'), { recursive: true });
  await fs.mkdir(path.join(packageRoot, 'payload', 'codex', 'skills', 'workforce-probe'), { recursive: true });
  await fs.mkdir(path.join(packageRoot, 'payload', 'codex', 'config'), { recursive: true });
  await fs.mkdir(codexHome, { recursive: true });
  await fs.mkdir(skillsDir, { recursive: true });
  await writeFixturePackageJson(packageRoot, packageVersion);
  await fs.writeFile(path.join(packageRoot, 'payload', 'codex', 'agents', 'workforce_worker.toml'), 'name = "workforce_worker"\nhome = "{{CODEX_HOME}}"\n');
  await fs.writeFile(path.join(packageRoot, 'payload', 'codex', 'skills', 'workforce-worker', 'SKILL.md'), '# skill\n{{CODEX_HOME}}\n');
  await fs.writeFile(path.join(packageRoot, 'payload', 'codex', 'skills', 'workforce-worker', 'extra.md'), 'old\n');
  await fs.writeFile(path.join(packageRoot, 'payload', 'codex', 'skills', 'workforce-worker', 'nested', 'note.md'), 'nested\n');
  await fs.writeFile(path.join(packageRoot, 'payload', 'codex', 'skills', 'workforce-probe', 'SKILL.md'), '# probe\n');
  await fs.writeFile(path.join(packageRoot, 'payload', 'codex', 'global-instructions.md'), 'global instructions for {{CODEX_HOME}}\n');
  await fs.writeFile(path.join(packageRoot, 'payload', 'codex', 'profiles.json'), '{"home":"{{CODEX_HOME}}"}\n');
  await fs.writeFile(path.join(packageRoot, 'payload', 'codex', 'config', 'workforce-standard.config.toml'), 'profile = "standard"\nhome = "{{CODEX_HOME}}"\n');
  await fs.writeFile(path.join(packageRoot, 'payload', 'codex', 'config', 'workforce-enhanced.config.toml'), 'profile = "enhanced"\n');
  return {
    temp,
    packageRoot,
    codexHome,
    skillsDir,
    options: {
      target: 'codex',
      packageRoot,
      home: codexHome,
      skillsDir,
      env: {},
    },
  };
}

function portable(filePath) {
  return path.resolve(filePath).split(path.sep).join('/');
}

async function writeFixturePackageJson(packageRoot, version) {
  await fs.writeFile(path.join(packageRoot, 'package.json'), `${JSON.stringify({
    name: 'codex-workforce-fixture',
    version,
  }, null, 2)}\n`);
}

test('update installs the real contextual policy into existing consumers and preserves user settings', async (t) => {
  const fixture = await makeFixture();
  t.after(() => fs.rm(fixture.temp, { recursive: true, force: true }));
  const agentsPath = path.join(fixture.codexHome, 'AGENTS.md');
  const configPath = path.join(fixture.codexHome, 'config.toml');
  await fs.writeFile(agentsPath, 'User standing instructions\n');
  await fs.writeFile(configPath, 'model = "user-selected-model"\n');
  await fs.writeFile(path.join(fixture.packageRoot, 'payload', 'codex', 'global-instructions.md'),
    'Before every task, ask Standard or Enhanced and wait.\n');
  await runCommand('install', fixture.options);
  await fs.appendFile(agentsPath, '\nUser additions after install\n');

  const packageRoot = path.resolve(import.meta.dirname, '..');
  const options = { ...fixture.options, packageRoot };
  const updated = await runCommand('update', options);
  assert.equal(updated.exitCode, 0, updated.issues.join('\n'));
  const sourceGlobal = await fs.readFile(path.join(packageRoot, 'payload', 'codex', 'global-instructions.md'), 'utf8');
  const actualGlobal = await fs.readFile(agentsPath, 'utf8');
  assert.ok(actualGlobal.includes(sourceGlobal.replaceAll('{{CODEX_HOME}}', portable(fixture.codexHome)).trim()));
  assert.doesNotMatch(actualGlobal, /Before every task, ask Standard or Enhanced and wait/);
  assert.ok(actualGlobal.startsWith('User standing instructions\n'));
  assert.ok(actualGlobal.endsWith('\nUser additions after install\n'));
  assert.equal(await fs.readFile(configPath, 'utf8'), 'model = "user-selected-model"\n');
  for (const relative of [
    'skills/workforce-orchestrate/SKILL.md',
    'skills/workforce-orchestrate/references/dispatch.md',
    'skills/workforce-smoke/SKILL.md',
  ]) {
    const expected = (await fs.readFile(path.join(packageRoot, 'payload', 'codex', relative), 'utf8'))
      .replaceAll('{{CODEX_HOME}}', portable(fixture.codexHome));
    assert.equal(await fs.readFile(path.join(fixture.codexHome, relative), 'utf8'), expected);
  }
  const policy = JSON.parse(await fs.readFile(path.join(fixture.codexHome, 'codex-workforce/profiles.json'), 'utf8'));
  assert.equal(policy.selection, 'contextual');
  assert.equal(policy.selectionRules.default, 'standard');
  assert.equal((await runCommand('status', options)).exitCode, 0);
  assert.deepEqual((await runCommand('update', options)).actions, []);
});
