import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TARGETS, managedMarkers, resolveTarget } from './targets.js';

export { TARGETS, managedMarkers } from './targets.js';
export const MANAGED_BEGIN = managedMarkers(TARGETS.codex).begin;
export const MANAGED_END = managedMarkers(TARGETS.codex).end;
export const PACKAGE_NAME = TARGETS.codex.packageName;

const MANIFEST_VERSION = 1;

export async function runCommand(command, options = {}) {
  const context = createContext(options);

  if (command === 'status') {
    return status(context);
  }

  if (context.dryRun) {
    if (command === 'uninstall') {
      return uninstall(context);
    }
    return installOrUpdate(command, context);
  }

  return withLock(context, async () => {
    if (command === 'uninstall') {
      return uninstall(context);
    }
    return installOrUpdate(command, context);
  });
}

function createContext(options) {
  const env = options.env ?? process.env;
  const target = resolveTarget(options.target);
  const home = normalizeAbsolutePath(
    options.home ?? options.codexHome ?? env[target.homeEnv] ?? path.join(os.homedir(), ...target.defaultHome),
  );
  if (!target.skillLinks && options.skillsDir) {
    throw new Error(`${target.runtimeLabel} discovers skills in its home directory; --skills-dir is not supported.`);
  }
  const skillsDir = target.skillLinks
    ? normalizeAbsolutePath(options.skillsDir ?? path.join(os.homedir(), ...target.defaultSkillsDir))
    : null;
  const stateDir = path.join(home, target.packageName);
  const packageRoot = normalizeAbsolutePath(options.packageRoot ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));

  return {
    target,
    packageName: target.packageName,
    markers: managedMarkers(target),
    home,
    skillsDir,
    packageRoot,
    packageVersion: readPackageVersion(packageRoot),
    dryRun: Boolean(options.dryRun),
    force: Boolean(options.force),
    stateDir,
    manifestPath: path.join(stateDir, 'manifest.json'),
  };
}

function readPackageVersion(packageRoot) {
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const parsed = JSON.parse(fssync.readFileSync(packageJsonPath, 'utf8'));
  if (typeof parsed.version !== 'string' || parsed.version.length === 0) {
    throw new Error(`Package version is missing in ${packageJsonPath}`);
  }
  return parsed.version;
}

async function installOrUpdate(command, context) {
  const manifest = await readManifest(context);
  const payload = await readPayload(context);
  const desired = await buildDesiredState(context, payload);
  const plan = await buildInstallPlan(context, manifest, desired);

  if (plan.issues.length > 0) {
    return result(command, context, {
      exitCode: 1,
      summary: context.dryRun ? 'dry run found conflicts' : 'preflight failed',
      actions: plan.actions.map((action) => action.describe),
      issues: plan.issues,
      backups: [],
    });
  }

  if (context.dryRun) {
    return result(command, context, {
      exitCode: 0,
      summary: 'dry run passed',
      actions: plan.actions.map((action) => action.describe),
      issues: [],
      backups: [],
    });
  }

  const applied = await applyPlan(context, plan.actions);
  return result(command, context, {
    exitCode: 0,
    summary: applied.actions.length === 0 ? 'already installed' : 'completed',
    actions: applied.actions,
    issues: [],
    backups: applied.backups,
  });
}

async function uninstall(context) {
  const manifest = await readManifest(context);
  if (!manifest) {
    return result('uninstall', context, {
      exitCode: 0,
      summary: 'not installed',
      actions: [],
      issues: [],
      backups: [],
    });
  }

  const plan = await buildUninstallPlan(context, manifest);
  if (plan.issues.length > 0) {
    return result('uninstall', context, {
      exitCode: 1,
      summary: context.dryRun ? 'dry run found conflicts' : 'preflight failed',
      actions: plan.actions.map((action) => action.describe),
      issues: plan.issues,
      backups: [],
    });
  }

  if (context.dryRun) {
    return result('uninstall', context, {
      exitCode: 0,
      summary: 'dry run passed',
      actions: plan.actions.map((action) => action.describe),
      issues: [],
      backups: [],
    });
  }

  const applied = await applyPlan(context, plan.actions);
  return result('uninstall', context, {
    exitCode: 0,
    summary: 'completed',
    actions: applied.actions,
    issues: [],
    backups: applied.backups,
  });
}

async function status(context) {
  const manifest = await readManifest(context);
  if (!manifest) {
    return result('status', context, {
      exitCode: 1,
      summary: 'not installed',
      actions: [],
      issues: [`Manifest not found at ${context.manifestPath}`],
      backups: [],
    });
  }

  const issues = [];
  for (const file of manifest.files ?? []) {
    const absolutePath = resolveManifestFile(context, file.path);
    const parentIssue = await findSymlinkParent(absolutePath, context.home);
    if (parentIssue) {
      issues.push(`Owned file path crosses a symlink parent: ${parentIssue}`);
      continue;
    }
    const stat = await lstatOrNull(absolutePath);
    if (!stat) {
      issues.push(`Missing owned file: ${absolutePath}`);
    } else if (!stat.isFile()) {
      issues.push(`Owned file is not a regular file: ${absolutePath}`);
    } else if (await hashFile(absolutePath) !== file.hash) {
      issues.push(`Edited owned file: ${absolutePath}`);
    }
  }

  for (const link of manifest.links ?? []) {
    const stat = await lstatOrNull(link.path);
    if (!stat) {
      issues.push(`Missing discovery symlink: ${link.path}`);
    } else if (!stat.isSymbolicLink()) {
      issues.push(`Discovery path is not a symlink: ${link.path}`);
    } else {
      const currentTarget = await resolveSymlinkTarget(link.path);
      if (currentTarget !== normalizeAbsolutePath(link.target)) {
        issues.push(`Discovery symlink target drift: ${link.path} -> ${currentTarget}`);
      }
    }
  }

  if (manifest.globalInstructions) {
    const effectivePath = await chooseGlobalInstructionsPath(context);
    const recordedPath = normalizeAbsolutePath(manifest.globalInstructions.path);
    if (effectivePath !== recordedPath) {
      issues.push(`Managed global instructions are shadowed: effective file is ${effectivePath}, manifest file is ${recordedPath}`);
    }
    const block = await readManagedBlock(recordedPath, context.markers);
    if (!block) {
      issues.push(`Managed global instructions block missing: ${recordedPath}`);
    } else if (sha256(block) !== manifest.globalInstructions.blockHash) {
      issues.push(`Managed global instructions block edited: ${recordedPath}`);
    }
  }

  return result('status', context, {
    exitCode: issues.length === 0 ? 0 : 1,
    summary: issues.length === 0 ? `installed ${manifest.packageVersion}` : `installed ${manifest.packageVersion} with drift`,
    actions: [],
    issues,
    backups: [],
  });
}

async function buildInstallPlan(context, manifest, desired) {
  const actions = [];
  const issues = [];
  const oldFiles = new Map((manifest?.files ?? []).map((file) => [resolveManifestFile(context, file.path), file]));
  const oldLinks = new Map((manifest?.links ?? []).map((link) => [normalizeAbsolutePath(link.path), link]));
  const desiredFiles = new Map(desired.files.map((file) => [file.path, file]));
  const desiredLinks = new Map(desired.links.map((link) => [link.path, link]));

  for (const oldFile of oldFiles.values()) {
    const absolutePath = resolveManifestFile(context, oldFile.path);
    if (!desiredFiles.has(absolutePath)) {
      await planRemoveOwnedFile(context, actions, issues, absolutePath, oldFile.hash, 'remove stale owned file');
    }
  }

  for (const file of desired.files) {
    await planWriteOwnedFile(context, actions, issues, file, oldFiles.get(file.path));
  }

  for (const oldLink of oldLinks.values()) {
    const linkPath = normalizeAbsolutePath(oldLink.path);
    if (!desiredLinks.has(linkPath)) {
      await planRemoveOwnedLink(context, actions, issues, oldLink, 'remove stale discovery symlink');
    }
  }

  for (const link of desired.links) {
    await planEnsureLink(context, actions, issues, link, oldLinks.get(link.path));
  }

  await planGlobalInstructions(context, actions, issues, manifest, desired.globalInstructions);

  const nextManifest = makeManifest(context, desired, manifest);
  if (!manifest || JSON.stringify(nextManifest) !== JSON.stringify(manifest)) {
    actions.push({
      type: 'write-manifest',
      describe: `write manifest ${context.manifestPath}`,
      path: context.manifestPath,
      content: `${JSON.stringify(nextManifest, null, 2)}\n`,
    });
  }

  return { actions, issues };
}

async function buildUninstallPlan(context, manifest) {
  const actions = [];
  const issues = [];

  for (const file of [...(manifest.files ?? [])].reverse()) {
    await planRemoveOwnedFile(context, actions, issues, resolveManifestFile(context, file.path), file.hash, 'remove owned file');
  }

  for (const link of manifest.links ?? []) {
    await planRemoveOwnedLink(context, actions, issues, link, 'remove discovery symlink');
  }

  if (manifest.globalInstructions) {
    await planRemoveGlobalBlock(context, actions, issues, manifest.globalInstructions);
  }

  actions.push({
    type: 'remove-manifest',
    describe: `remove manifest ${context.manifestPath}`,
    path: context.manifestPath,
  });

  return { actions, issues };
}

async function planWriteOwnedFile(context, actions, issues, file, oldFile) {
  const parentIssue = await findSymlinkParent(file.path, context.home);
  if (parentIssue) {
    issues.push(`Managed file path crosses a symlink parent: ${parentIssue}`);
    return;
  }

  const stat = await lstatOrNull(file.path);
  if (!stat) {
    actions.push({ type: 'write-file', describe: `write ${file.path}`, path: file.path, content: file.content });
    return;
  }

  if (!stat.isFile()) {
    if (!oldFile || !context.force) {
      issues.push(`${oldFile ? 'Edited owned path requires --force' : 'Unowned collision is not a regular file'}: ${file.path}`);
      return;
    }
    actions.push({ type: 'backup-owned-path', describe: `back up edited owned path ${file.path}`, path: file.path });
    actions.push({ type: 'remove-path', describe: `remove edited owned path ${file.path}`, path: file.path });
    actions.push({ type: 'write-file', describe: `write ${file.path}`, path: file.path, content: file.content });
    return;
  }

  const currentHash = await hashFile(file.path);
  if (!oldFile) {
    issues.push(`Unowned file collision: ${file.path}`);
    return;
  }

  if (currentHash !== oldFile.hash) {
    if (!context.force) {
      issues.push(`Edited owned file requires --force: ${file.path}`);
      return;
    }
    actions.push({ type: 'backup-owned-path', describe: `back up edited owned file ${file.path}`, path: file.path });
  }

  if (currentHash !== file.hash) {
    actions.push({ type: 'write-file', describe: `write ${file.path}`, path: file.path, content: file.content });
  }
}

async function planRemoveOwnedFile(context, actions, issues, absolutePath, expectedHash, label) {
  const parentIssue = await findSymlinkParent(absolutePath, context.home);
  if (parentIssue) {
    issues.push(`Managed file path crosses a symlink parent: ${parentIssue}`);
    return;
  }

  const stat = await lstatOrNull(absolutePath);
  if (!stat) {
    return;
  }

  if (!stat.isFile()) {
    if (!context.force) {
      issues.push(`Edited owned path requires --force: ${absolutePath}`);
      return;
    }
    actions.push({ type: 'backup-owned-path', describe: `back up edited owned path ${absolutePath}`, path: absolutePath });
    actions.push({ type: 'remove-path', describe: `${label} ${absolutePath}`, path: absolutePath });
    return;
  }

  const currentHash = await hashFile(absolutePath);
  if (currentHash !== expectedHash) {
    if (!context.force) {
      issues.push(`Edited owned file requires --force: ${absolutePath}`);
      return;
    }
    actions.push({ type: 'backup-owned-path', describe: `back up edited owned file ${absolutePath}`, path: absolutePath });
  }
  actions.push({ type: 'remove-path', describe: `${label} ${absolutePath}`, path: absolutePath });
}

async function planEnsureLink(context, actions, issues, link, oldLink) {
  const parentIssue = await findSymlinkParent(link.path, context.skillsDir);
  if (parentIssue) {
    issues.push(`Discovery symlink path crosses a symlink parent: ${parentIssue}`);
    return;
  }

  const stat = await lstatOrNull(link.path);
  if (!stat) {
    actions.push({ type: 'symlink', describe: `link ${link.path} -> ${link.target}`, path: link.path, target: link.target });
    return;
  }

  if (stat.isSymbolicLink()) {
    const currentTarget = await resolveSymlinkTarget(link.path);
    if (currentTarget === link.target) {
      return;
    }
    if (!oldLink || !context.force) {
      issues.push(`${oldLink ? 'Edited owned symlink requires --force' : 'Unowned symlink collision'}: ${link.path} -> ${currentTarget}`);
      return;
    }
    actions.push({ type: 'backup-owned-path', describe: `back up edited owned symlink ${link.path}`, path: link.path });
    actions.push({ type: 'symlink', describe: `link ${link.path} -> ${link.target}`, path: link.path, target: link.target });
    return;
  }

  if (!oldLink || !context.force) {
    issues.push(`${oldLink ? 'Edited owned discovery path requires --force' : 'Unowned discovery path collision'}: ${link.path}`);
    return;
  }
  actions.push({ type: 'backup-owned-path', describe: `back up edited owned discovery path ${link.path}`, path: link.path });
  actions.push({ type: 'symlink', describe: `link ${link.path} -> ${link.target}`, path: link.path, target: link.target });
}

async function planRemoveOwnedLink(context, actions, issues, link, label) {
  const stat = await lstatOrNull(link.path);
  if (!stat) {
    return;
  }

  if (!stat.isSymbolicLink()) {
    if (!context.force) {
      issues.push(`Edited owned discovery path requires --force: ${link.path}`);
      return;
    }
    actions.push({ type: 'backup-owned-path', describe: `back up edited owned discovery path ${link.path}`, path: link.path });
    actions.push({ type: 'remove-path', describe: `${label} ${link.path}`, path: link.path });
    return;
  }

  const currentTarget = await resolveSymlinkTarget(link.path);
  if (currentTarget !== normalizeAbsolutePath(link.target)) {
    if (!context.force) {
      issues.push(`Edited owned symlink requires --force: ${link.path} -> ${currentTarget}`);
      return;
    }
    actions.push({ type: 'backup-owned-path', describe: `back up edited owned symlink ${link.path}`, path: link.path });
  }
  actions.push({ type: 'remove-path', describe: `${label} ${link.path}`, path: link.path });
}

async function planGlobalInstructions(context, actions, issues, manifest, desiredGlobal) {
  if (!desiredGlobal) {
    if (manifest?.globalInstructions) {
      await planRemoveGlobalBlock(context, actions, issues, manifest.globalInstructions);
    }
    return;
  }

  if (manifest?.globalInstructions) {
    const oldPath = normalizeAbsolutePath(manifest.globalInstructions.path);
    if (oldPath !== desiredGlobal.path) {
      await planRemoveGlobalBlock(context, actions, issues, manifest.globalInstructions);
    }
  }

  const content = await readFileUtf8OrEmpty(desiredGlobal.path);
  const range = findManagedBlockRange(content, context.markers);
  if (!range) {
    desiredGlobal.insertedPrefix = computeInsertedBlockPrefix(content);
    actions.push({
      type: 'upsert-block',
      describe: `upsert managed instructions block in ${desiredGlobal.path}`,
      path: desiredGlobal.path,
      block: desiredGlobal.block,
      insertedPrefix: desiredGlobal.insertedPrefix,
    });
    return;
  }

  const existingBlock = content.slice(range.start, range.end);
  const existingHash = sha256(existingBlock);
  const ownsPath = manifest?.globalInstructions
    && normalizeAbsolutePath(manifest.globalInstructions.path) === desiredGlobal.path;
  if (!ownsPath) {
    issues.push(`Managed instructions block exists but is not owned by the current manifest: ${desiredGlobal.path}`);
    return;
  }

  desiredGlobal.insertedPrefix = manifest.globalInstructions.insertedPrefix ?? '';
  if (existingHash !== manifest.globalInstructions.blockHash) {
    if (!context.force) {
      issues.push(`Edited managed instructions block requires --force: ${desiredGlobal.path}`);
      return;
    }
    actions.push({
      type: 'backup-instructions-target',
      describe: `back up edited owned instructions file ${desiredGlobal.path}`,
      path: desiredGlobal.path,
    });
  }

  if (existingHash !== desiredGlobal.blockHash) {
    actions.push({
      type: 'upsert-block',
      describe: `upsert managed instructions block in ${desiredGlobal.path}`,
      path: desiredGlobal.path,
      block: desiredGlobal.block,
      insertedPrefix: desiredGlobal.insertedPrefix,
    });
  }
}

async function planRemoveGlobalBlock(context, actions, issues, global) {
  const filePath = normalizeAbsolutePath(global.path);
  const content = await readFileUtf8OrEmpty(filePath);
  const range = findManagedBlockRange(content, context.markers);
  if (!range) {
    return;
  }

  const existingBlock = content.slice(range.start, range.end);
  const existingHash = sha256(existingBlock);
  if (existingHash !== global.blockHash) {
    if (!context.force) {
      issues.push(`Edited managed instructions block requires --force: ${filePath}`);
      return;
    }
    actions.push({ type: 'backup-instructions-target', describe: `back up edited owned instructions file ${filePath}`, path: filePath });
  }
  actions.push({
    type: 'remove-block',
    describe: `remove managed instructions block from ${filePath}`,
    path: filePath,
    insertedPrefix: global.insertedPrefix ?? '',
  });
}

async function applyPlan(context, actions) {
  const rollbackDir = path.join(os.tmpdir(), `${context.packageName}-rollback-${process.pid}-${Date.now()}`);
  const backups = [];
  const applied = [];
  const createdPaths = new Set();
  const createdDirs = new Set();
  const rollbackRecords = [];

  try {
    for (const action of actions) {
      if (action.type === 'write-file' || action.type === 'write-manifest') {
        await snapshotForRollback(action.path, rollbackDir, rollbackRecords, createdPaths);
        await ensureParentTracked(action.path, createdDirs);
        await fs.writeFile(action.path, action.content);
      } else if (action.type === 'remove-manifest' || action.type === 'remove-path') {
        await snapshotForRollback(action.path, rollbackDir, rollbackRecords, createdPaths);
        await fs.rm(action.path, { force: true, recursive: false });
        await removeEmptyOwnedParents(context, action.path);
      } else if (action.type === 'symlink') {
        await snapshotForRollback(action.path, rollbackDir, rollbackRecords, createdPaths);
        await ensureParentTracked(action.path, createdDirs);
        await fs.rm(action.path, { force: true, recursive: false });
        await fs.symlink(action.target, action.path, 'dir');
      } else if (action.type === 'upsert-block') {
        const writePath = await resolveWritableInstructionsPath(action.path);
        await snapshotForRollback(writePath, rollbackDir, rollbackRecords, createdPaths);
        await ensureParentTracked(writePath, createdDirs);
        await fs.writeFile(writePath, upsertManagedBlock(await readFileUtf8OrEmpty(writePath), action.block, action.insertedPrefix, context.markers));
      } else if (action.type === 'remove-block') {
        const writePath = await resolveWritableInstructionsPath(action.path);
        await snapshotForRollback(writePath, rollbackDir, rollbackRecords, createdPaths);
        await fs.writeFile(writePath, removeManagedBlock(await readFileUtf8OrEmpty(writePath), action.insertedPrefix, context.markers));
      } else if (action.type === 'backup-owned-path') {
        const backupPath = await persistentBackup(context, action.path);
        backups.push(backupPath);
        applied.push(`${action.describe} -> ${backupPath}`);
        continue;
      } else if (action.type === 'backup-instructions-target') {
        const backupPath = await persistentBackup(context, await resolveWritableInstructionsPath(action.path));
        backups.push(backupPath);
        applied.push(`${action.describe} -> ${backupPath}`);
        continue;
      }
      applied.push(action.describe);
    }
  } catch (error) {
    await rollback(rollbackRecords, createdPaths, createdDirs);
    throw error;
  } finally {
    await fs.rm(rollbackDir, { recursive: true, force: true });
  }

  return { actions: applied, backups };
}

async function readPayload(context) {
  const { target, home, packageRoot } = context;
  const payloadRoot = path.join(packageRoot, 'payload', target.payloadDir);
  const payloadStat = await lstatOrNull(payloadRoot);
  if (!payloadStat?.isDirectory()) {
    throw new Error(`Payload directory not found: ${payloadRoot}`);
  }

  const files = [];
  const agentsRoot = path.join(payloadRoot, 'agents');
  const skillsRoot = path.join(payloadRoot, 'skills');
  const configRoot = path.join(payloadRoot, 'config');
  const profilesPath = path.join(payloadRoot, 'profiles.json');
  const globalPath = path.join(payloadRoot, 'global-instructions.md');

  for (const agentPath of await listRegularFilesIfDirectory(agentsRoot)) {
    if (path.extname(agentPath) !== target.agentExtension) {
      throw new Error(`Agent payload must be ${target.agentExtension}: ${agentPath}`);
    }
    files.push({
      destination: path.join(home, 'agents', path.basename(agentPath)),
      content: await readRenderedPayloadFile(agentPath, context),
    });
  }

  if (await isFile(profilesPath)) {
    files.push({
      destination: path.join(home, target.packageName, 'profiles.json'),
      content: await readRenderedPayloadFile(profilesPath, context),
    });
  }

  const configFiles = await listRegularFilesIfDirectory(configRoot);
  if (configFiles.length > 0 && !target.configProfiles) {
    throw new Error(`${target.runtimeLabel} payload does not support config profiles: ${configRoot}`);
  }
  for (const configPath of configFiles) {
    if (!path.basename(configPath).endsWith('.config.toml')) {
      throw new Error(`Profile config payload must end with .config.toml: ${configPath}`);
    }
    files.push({
      destination: path.join(home, path.basename(configPath)),
      content: await readRenderedPayloadFile(configPath, context),
    });
  }

  const skillNames = [];
  if (await isDirectory(skillsRoot)) {
    for (const entry of await fs.readdir(skillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        throw new Error(`Skill payload entry must be a directory: ${path.join(skillsRoot, entry.name)}`);
      }
      assertSafeRelative(entry.name);
      skillNames.push(entry.name);
      const skillRoot = path.join(skillsRoot, entry.name);
      for (const skillFile of await listRegularFilesIfDirectory(skillRoot)) {
        const relative = path.relative(skillRoot, skillFile);
        assertSafeRelative(relative);
        files.push({
          destination: path.join(home, 'skills', entry.name, relative),
          content: await readRenderedPayloadFile(skillFile, context),
        });
      }
    }
  }

  let globalInstructions = null;
  if (await isFile(globalPath)) {
    globalInstructions = (await readRenderedPayloadFile(globalPath, context)).toString('utf8');
  }

  if (files.length === 0 && !globalInstructions) {
    throw new Error(`Payload is empty: ${payloadRoot}`);
  }

  return { files, skillNames: skillNames.sort(), globalInstructions };
}

async function buildDesiredState(context, payload) {
  const files = payload.files.map((file) => {
    const absolutePath = normalizeAbsolutePath(file.destination);
    assertInside(absolutePath, context.home, `Payload destination escapes ${context.target.homeEnv}: ${absolutePath}`);
    return {
      path: absolutePath,
      content: file.content,
      hash: sha256(file.content),
    };
  }).sort((left, right) => left.path.localeCompare(right.path));

  const links = context.skillsDir === null ? [] : payload.skillNames.map((skillName) => {
    const linkPath = normalizeAbsolutePath(path.join(context.skillsDir, skillName));
    const target = normalizeAbsolutePath(path.join(context.home, 'skills', skillName));
    assertInside(linkPath, context.skillsDir, `Skill link escapes discovery directory: ${linkPath}`);
    assertInside(target, context.home, `Skill target escapes ${context.target.homeEnv}: ${target}`);
    return { path: linkPath, target };
  }).sort((left, right) => left.path.localeCompare(right.path));

  let globalInstructions = null;
  if (payload.globalInstructions !== null) {
    const block = `${context.markers.begin}\n${payload.globalInstructions.trimEnd()}\n${context.markers.end}\n`;
    globalInstructions = {
      path: await chooseGlobalInstructionsPath(context),
      block,
      blockHash: sha256(block),
    };
  }

  return { files, links, globalInstructions };
}

function makeManifest(context, desired, previousManifest) {
  return {
    manifestVersion: MANIFEST_VERSION,
    packageName: context.packageName,
    target: context.target.id,
    packageVersion: context.packageVersion,
    installedAt: previousManifest?.installedAt ?? new Date().toISOString(),
    home: context.home,
    skillsDir: context.skillsDir,
    files: desired.files.map((file) => ({
      path: path.relative(context.home, file.path).split(path.sep).join('/'),
      hash: file.hash,
    })),
    links: desired.links,
    globalInstructions: desired.globalInstructions ? {
      path: desired.globalInstructions.path,
      blockHash: desired.globalInstructions.blockHash,
      insertedPrefix: desired.globalInstructions.insertedPrefix ?? '',
    } : null,
  };
}

async function readManifest(context) {
  try {
    const parsed = JSON.parse(await fs.readFile(context.manifestPath, 'utf8'));
    if (parsed.packageName !== context.packageName || parsed.manifestVersion !== MANIFEST_VERSION) {
      throw new Error(`Unsupported manifest at ${context.manifestPath}`);
    }
    return parsed;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function withLock(context, fn) {
  const stateStat = await lstatOrNull(context.stateDir);
  if (stateStat?.isSymbolicLink()) {
    throw new Error(`Managed state directory must not be a symlink: ${context.stateDir}`);
  }
  await fs.mkdir(context.stateDir, { recursive: true });
  const lockPath = path.join(context.stateDir, '.lock');
  try {
    await fs.mkdir(lockPath);
    await fs.writeFile(path.join(lockPath, 'owner'), `${process.pid}\n`);
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error(`Another ${context.packageName} command is running: ${lockPath}`);
    }
    throw error;
  }

  try {
    return await fn();
  } finally {
    await fs.rm(lockPath, { recursive: true, force: true });
    await fs.rmdir(context.stateDir).catch(() => {});
  }
}

async function listRegularFilesIfDirectory(root) {
  if (!await isDirectory(root)) {
    return [];
  }
  const files = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      const relative = path.relative(root, absolute);
      assertSafeRelative(relative);
      if (entry.isSymbolicLink()) {
        throw new Error(`Payload symlinks are not supported: ${absolute}`);
      }
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        files.push(absolute);
      } else {
        throw new Error(`Unsupported payload entry: ${absolute}`);
      }
    }
  }
  await walk(root);
  return files.sort();
}

async function readRenderedPayloadFile(filePath, context) {
  const buffer = await fs.readFile(filePath);
  if (buffer.includes(0)) {
    return buffer;
  }
  const portableHome = toPortablePath(context.home);
  const extension = path.extname(filePath);
  const replacement = extension === '.toml'
    ? escapeTomlStringContent(portableHome)
    : extension === '.json'
      ? escapeJsonStringContent(portableHome)
      : portableHome;
  // Payload text is authored with LF; a CRLF checkout (Windows autocrlf) must not leak into installed files.
  const text = buffer.toString('utf8').replaceAll('\r\n', '\n');
  return Buffer.from(text.replaceAll(context.target.placeholder, replacement), 'utf8');
}

function escapeTomlStringContent(value) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('\b', '\\b')
    .replaceAll('\t', '\\t')
    .replaceAll('\n', '\\n')
    .replaceAll('\f', '\\f')
    .replaceAll('\r', '\\r');
}

function escapeJsonStringContent(value) {
  return JSON.stringify(value).slice(1, -1);
}

async function chooseGlobalInstructionsPath(context) {
  const { target, home } = context;
  if (target.instructionsOverride) {
    const overridePath = path.join(home, target.instructionsOverride);
    const overrideStat = await statOrNull(overridePath);
    if (overrideStat?.isFile() && overrideStat.size > 0) {
      return normalizeAbsolutePath(overridePath);
    }
  }
  return normalizeAbsolutePath(path.join(home, target.instructionsFile));
}

async function readManagedBlock(filePath, markers) {
  const content = await readFileUtf8OrNull(filePath);
  if (content === null) {
    return null;
  }
  const range = findManagedBlockRange(content, markers);
  return range ? content.slice(range.start, range.end) : null;
}

function upsertManagedBlock(content, block, insertedPrefix, markers) {
  const range = findManagedBlockRange(content, markers);
  if (range) {
    return `${content.slice(0, range.start)}${block}${content.slice(range.end)}`;
  }
  return `${content}${insertedPrefix}${block}`;
}

function removeManagedBlock(content, insertedPrefix, markers) {
  const range = findManagedBlockRange(content, markers);
  if (!range) {
    return content;
  }
  const before = content.slice(0, range.start);
  const after = content.slice(range.end);
  if (insertedPrefix && before.endsWith(insertedPrefix)) {
    return `${before.slice(0, -insertedPrefix.length)}${after}`;
  }
  return `${before}${after}`;
}

function computeInsertedBlockPrefix(content) {
  if (content.length === 0 || content.endsWith('\n\n')) {
    return '';
  }
  if (content.endsWith('\n')) {
    return '\n';
  }
  return '\n\n';
}

function findManagedBlockRange(content, markers) {
  const begin = content.indexOf(markers.begin);
  if (begin === -1) {
    return null;
  }
  const endMarker = content.indexOf(markers.end, begin + markers.begin.length);
  if (endMarker === -1) {
    return null;
  }
  let end = endMarker + markers.end.length;
  if (content[end] === '\r' && content[end + 1] === '\n') {
    end += 2;
  } else if (content[end] === '\n') {
    end += 1;
  }
  return { start: begin, end };
}

async function resolveWritableInstructionsPath(filePath) {
  const stat = await lstatOrNull(filePath);
  if (stat?.isSymbolicLink()) {
    return normalizeAbsolutePath(await fs.realpath(filePath));
  }
  return normalizeAbsolutePath(filePath);
}

async function snapshotForRollback(filePath, rollbackDir, records, createdPaths) {
  if (records.some((record) => record.path === filePath)) {
    return;
  }
  const stat = await lstatOrNull(filePath);
  if (!stat) {
    createdPaths.add(filePath);
    return;
  }
  const backup = path.join(rollbackDir, encodePathForBackup(filePath));
  await ensureParent(backup);
  await copyPath(filePath, backup);
  records.push({ path: filePath, backup });
}

async function rollback(records, createdPaths, createdDirs) {
  for (const created of [...createdPaths].reverse()) {
    await fs.rm(created, { recursive: true, force: true }).catch(() => {});
  }
  for (const record of [...records].reverse()) {
    await fs.rm(record.path, { recursive: true, force: true }).catch(() => {});
    await ensureParent(record.path).catch(() => {});
    await copyPath(record.backup, record.path).catch(() => {});
  }
  for (const dir of [...createdDirs].sort((left, right) => right.length - left.length)) {
    await fs.rmdir(dir).catch(() => {});
  }
}

async function persistentBackup(context, filePath) {
  const backupPath = path.join(
    context.stateDir,
    'backups',
    new Date().toISOString().replaceAll(':', '-'),
    encodePathForBackup(filePath),
  );
  await ensureParent(backupPath);
  await copyPath(filePath, backupPath);
  return backupPath;
}

async function copyPath(source, destination) {
  const stat = await lstatOrNull(source);
  if (!stat) {
    return;
  }
  if (stat.isSymbolicLink()) {
    await fs.symlink(await fs.readlink(source), destination);
  } else if (stat.isDirectory()) {
    await fs.cp(source, destination, { recursive: true, verbatimSymlinks: true });
  } else {
    await fs.copyFile(source, destination);
  }
}

async function removeEmptyOwnedParents(context, filePath) {
  const skillsRoot = normalizeAbsolutePath(path.join(context.home, 'skills'));
  let current = normalizeAbsolutePath(path.dirname(filePath));

  while (isInside(current, skillsRoot) && current !== skillsRoot) {
    try {
      await fs.rmdir(current);
    } catch {
      return;
    }
    current = path.dirname(current);
  }
}

async function findSymlinkParent(filePath, boundary) {
  const normalizedBoundary = normalizeAbsolutePath(boundary);
  let current = normalizeAbsolutePath(path.dirname(filePath));
  const parents = [];

  while (isInside(current, normalizedBoundary) && current !== normalizedBoundary) {
    parents.push(current);
    current = path.dirname(current);
  }

  for (const parent of parents.reverse()) {
    const stat = await lstatOrNull(parent);
    if (stat?.isSymbolicLink()) {
      return parent;
    }
  }
  return null;
}

async function hashFile(filePath) {
  return sha256(await fs.readFile(filePath));
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function resolveSymlinkTarget(linkPath) {
  return normalizeAbsolutePath(path.resolve(path.dirname(linkPath), await fs.readlink(linkPath)));
}

function resolveManifestFile(context, relativePath) {
  assertSafeRelative(relativePath);
  const absolute = normalizeAbsolutePath(path.join(context.home, relativePath));
  assertInside(absolute, context.home, `Manifest path escapes ${context.target.homeEnv}: ${relativePath}`);
  return absolute;
}

function normalizeAbsolutePath(inputPath) {
  const expanded = inputPath.startsWith('~/') || inputPath === '~'
    ? path.join(os.homedir(), inputPath.slice(2))
    : inputPath;
  return path.resolve(expanded);
}

function toPortablePath(inputPath) {
  return normalizeAbsolutePath(inputPath).split(path.sep).join('/');
}

function assertSafeRelative(relativePath) {
  if (path.isAbsolute(relativePath) || relativePath.split(/[\\/]+/).includes('..')) {
    throw new Error(`Unsafe relative path: ${relativePath}`);
  }
}

function assertInside(child, parent, message) {
  if (!isInside(child, parent)) {
    throw new Error(message);
  }
}

function isInside(child, parent) {
  const relative = path.relative(normalizeAbsolutePath(parent), normalizeAbsolutePath(child));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function encodePathForBackup(filePath) {
  return normalizeAbsolutePath(filePath).replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function ensureParent(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function ensureParentTracked(filePath, createdDirs) {
  const parent = path.dirname(filePath);
  const missing = [];
  let current = parent;
  while (!await lstatOrNull(current)) {
    missing.push(current);
    const next = path.dirname(current);
    if (next === current) {
      break;
    }
    current = next;
  }
  await fs.mkdir(parent, { recursive: true });
  for (const dir of missing) {
    createdDirs.add(dir);
  }
}

async function readFileUtf8OrNull(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function readFileUtf8OrEmpty(filePath) {
  return await readFileUtf8OrNull(filePath) ?? '';
}

async function lstatOrNull(filePath) {
  try {
    return await fs.lstat(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
      return null;
    }
    throw error;
  }
}

async function statOrNull(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
      return null;
    }
    throw error;
  }
}

async function isDirectory(filePath) {
  const stat = await lstatOrNull(filePath);
  return Boolean(stat?.isDirectory());
}

async function isFile(filePath) {
  const stat = await lstatOrNull(filePath);
  return Boolean(stat?.isFile());
}

function result(command, context, partial) {
  return {
    command,
    target: context.target.id,
    home: context.home,
    skillsDir: context.skillsDir,
    dryRun: context.dryRun,
    force: context.force,
    ...partial,
  };
}
