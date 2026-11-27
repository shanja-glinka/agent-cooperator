#!/usr/bin/env node

import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { access, readFile } from 'node:fs/promises';

const PROFILE = 'workforce-standard';
const ROUTE = new URL('../payload/codex-owner/ROUTE.md', import.meta.url);

const HELP = `Usage:
  codex-workforce-owner <task>
  codex-workforce-owner exec [native Codex options] -- <task>
  codex-workforce-owner --help

Starts Codex with the workforce-standard profile and the packaged owner route.
The task must be one shell argument. The exec form forwards native Codex options.
`;

const VALUE_OPTIONS = new Set([
  '-c', '--config', '--enable', '--disable', '--remote', '--remote-auth-token-env',
  '-i', '--image', '-m', '--model', '--local-provider', '-s', '--sandbox', '-C', '--cd',
  '-a', '--ask-for-approval', '--thread-source', '--cyber-access-program', '--output-schema',
  '--color', '-o', '--output-last-message',
]);

function usageError(message) {
  process.stderr.write(`${message}\n\n${HELP}`);
  return 2;
}

function parse(argv) {
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) {
    return { help: true };
  }

  if (argv[0] === 'exec') {
    const separator = argv.indexOf('--', 1);
    if (separator < 0) {
      return { error: 'exec requires `-- <task>` after its native Codex options.' };
    }
    const taskArgs = argv.slice(separator + 1);
    if (taskArgs.length !== 1 || taskArgs[0].length === 0) {
      return { error: 'exec requires exactly one non-empty task after `--`.' };
    }
    const options = argv.slice(1, separator);
    const profileError = validateProfile(options);
    if (profileError) return { error: profileError };
    return { mode: 'exec', options, task: taskArgs[0] };
  }

  if (argv.length !== 1 || argv[0].length === 0) {
    return { error: 'Provide exactly one non-empty task argument.' };
  }
  return { mode: 'interactive', options: [], task: argv[0] };
}

function validateProfile(options) {
  for (let i = 0; i < options.length; i += 1) {
    const option = options[i];
    if (option === '-p' || option === '--profile') {
      return 'exec always uses the workforce-standard profile; omit native -p/--profile options.';
    }
    if (option.startsWith('--profile=') || (option.startsWith('-p') && option.length > 2)) {
      return 'exec always uses the workforce-standard profile; omit native -p/--profile options.';
    }
    if (VALUE_OPTIONS.has(option)) i += 1;
  }
  return null;
}

async function fileExists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function resolveWindowsCommand(command, env) {
  const lower = command.toLowerCase();
  if (/\.(?:js|cjs|mjs)$/.test(lower)) {
    return { command: process.execPath, prefix: [command] };
  }
  if (/\.exe$|\.com$/.test(lower)) return { command, prefix: [] };

  const isPath = path.win32.isAbsolute(command) || command.includes('\\') || command.includes('/');
  const pathEntries = isPath
    ? [path.win32.dirname(command)]
    : (env.PATH || '').split(path.win32.delimiter).filter(Boolean);
  const name = isPath ? path.win32.basename(command, path.win32.extname(command)) : command;
  for (const directory of pathEntries) {
    for (const extension of ['.exe', '.com', '.js', '.cjs', '.mjs']) {
      const candidate = isPath && !path.win32.extname(command)
        ? `${command}${extension}`
        : path.win32.join(directory, `${name}${extension}`);
      if (!await fileExists(candidate)) continue;
      if (/\.(?:js|cjs|mjs)$/.test(extension)) {
        return { command: process.execPath, prefix: [candidate] };
      }
      return { command: candidate, prefix: [] };
    }

    for (const script of [
      path.win32.join(directory, 'node_modules', '@openai', 'codex', 'bin', 'codex.js'),
      path.win32.resolve(directory, '..', '@openai', 'codex', 'bin', 'codex.js'),
    ]) {
      if (await fileExists(script)) return { command: process.execPath, prefix: [script] };
    }
  }
  throw new Error(`Could not find codex.exe or the installed @openai/codex JavaScript entry point for: ${command}`);
}

async function resolveCommand(command, env) {
  if (process.platform === 'win32') return resolveWindowsCommand(command, env);
  if (/\.(?:js|cjs|mjs)$/i.test(command)) {
    return { command: process.execPath, prefix: [command] };
  }
  return { command, prefix: [] };
}

async function runCodex(args) {
  const command = process.env.CODEX_BIN || 'codex';
  let resolved;
  try {
    resolved = await resolveCommand(command, process.env);
  } catch (error) {
    process.stderr.write(`Unable to resolve Codex CLI (${command}): ${error.message}\n`);
    return 1;
  }

  let child;
  try {
    child = spawn(resolved.command, [...resolved.prefix, ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });
  } catch (error) {
    process.stderr.write(`Unable to start Codex CLI (${command}): ${error.message}\n`);
    return Promise.resolve(1);
  }

  return new Promise((resolve) => {
    let settled = false;
    let requestedSignal = null;
    let escalationTimer = null;
    const cleanup = () => {
      process.removeListener('SIGINT', onParentSignal);
      process.removeListener('SIGTERM', onParentSignal);
      if (escalationTimer) clearTimeout(escalationTimer);
    };
    const terminateWrapper = (signal) => {
      cleanup();
      try {
        process.kill(process.pid, signal);
      } catch {
        resolve(128 + (os.constants.signals[signal] ?? 0));
      }
    };
    const onParentSignal = (signal) => {
      if (settled || requestedSignal) return;
      requestedSignal = signal;
      try {
        child.kill(signal);
      } catch {
        child.kill();
      }
      escalationTimer = setTimeout(() => {
        if (!settled) child.kill('SIGKILL');
      }, 3000);
    };
    process.on('SIGINT', onParentSignal);
    process.on('SIGTERM', onParentSignal);
    child.once('error', (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      process.stderr.write(`Unable to start Codex CLI (${command}): ${error.message}\n`);
      resolve(1);
    });
    child.once('exit', (code, signal) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (requestedSignal || signal) {
        terminateWrapper(requestedSignal || signal);
        return;
      }
      resolve(code ?? 1);
    });
  });
}

async function main(argv) {
  const parsed = parse(argv);
  if (parsed.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (parsed.error) return usageError(parsed.error);

  let route;
  try {
    route = await readFile(ROUTE, 'utf8');
  } catch (error) {
    process.stderr.write(`Unable to read the packaged Codex owner route: ${error.message}\n`);
    return 1;
  }

  const prompt = `${parsed.task}\n\n${route}`;
  const args = parsed.mode === 'exec'
    ? ['exec', '-p', PROFILE, ...parsed.options, '--', prompt]
    : ['-p', PROFILE, '--', prompt];
  return runCodex(args);
}

main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
}).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
