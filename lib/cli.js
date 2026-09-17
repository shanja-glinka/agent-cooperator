import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand } from './installer.js';
import { resolveTarget } from './targets.js';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function helpText(target) {
  const bin = target.binName;
  const homeOpt = `${target.homeOption} PATH`.padEnd(19);
  const skillsLine = target.skillLinks
    ? `  --skills-dir PATH   Native skill discovery directory. Defaults to ~/${target.defaultSkillsDir.join('/')}.\n`
    : '';
  const skillsUsage = target.skillLinks ? ' [--skills-dir PATH]' : '';
  return `${bin}

Installs ${target.runtimeLabel} Workforce agents, skills, and managed global instructions.

Usage:
  ${bin} install [${target.homeOption} PATH]${skillsUsage} [--dry-run] [--force]
  ${bin} update [${target.homeOption} PATH]${skillsUsage} [--dry-run] [--force]
  ${bin} uninstall [${target.homeOption} PATH]${skillsUsage} [--dry-run] [--force]
  ${bin} status [${target.homeOption} PATH]${skillsUsage}

Options:
  ${homeOpt} Install into PATH. Precedence: CLI option, ${target.homeEnv}, ~/${target.defaultHome.join('/')}.
${skillsLine}  --dry-run           Check and print planned changes without writing.
  --force             Back up edited owned files before replacing or removing them.
  --json              Print machine-readable command results.
  -h, --help          Show this help.
`;
}

export async function runCli(argv, io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const target = resolveTarget(io.target);
  const help = helpText(target);
  let parsed;

  try {
    parsed = parseArgv(argv, target);
  } catch (error) {
    stderr.write(`${error.message}\n\n${help}`);
    return 2;
  }

  if (parsed.help) {
    stdout.write(help);
    return 0;
  }

  if (!parsed.command) {
    stderr.write(`Missing command.\n\n${help}`);
    return 2;
  }

  try {
    const result = await runCommand(parsed.command, {
      target,
      home: parsed.home,
      skillsDir: parsed.skillsDir,
      env: io.env ?? process.env,
      dryRun: parsed.dryRun,
      force: parsed.force,
      packageRoot: io.packageRoot ?? PACKAGE_ROOT,
    });

    if (parsed.json) {
      stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      stdout.write(formatResult(result, target));
    }

    return result.exitCode;
  } catch (error) {
    stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function parseArgv(argv, target) {
  const parsed = {
    command: undefined,
    home: undefined,
    skillsDir: undefined,
    dryRun: false,
    force: false,
    json: false,
    help: false,
  };
  const homeOptions = new Set([target.homeOption, '--home']);
  const pathOptions = new Set([...homeOptions, '--skills-dir']);

  const assignPath = (option, value) => {
    if (homeOptions.has(option)) {
      parsed.home = value;
      return;
    }
    if (!target.skillLinks) {
      throw new Error(`${option} is not supported for ${target.runtimeLabel}; skills are discovered in ${target.homeLabel}.`);
    }
    parsed.skillsDir = value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '-h' || arg === '--help') {
      parsed.help = true;
      continue;
    }
    if (arg === '--dry-run') {
      parsed.dryRun = true;
      continue;
    }
    if (arg === '--force') {
      parsed.force = true;
      continue;
    }
    if (arg === '--json') {
      parsed.json = true;
      continue;
    }
    if (pathOptions.has(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} requires a path value.`);
      }
      assignPath(arg, value);
      index += 1;
      continue;
    }
    const equalsIndex = arg.indexOf('=');
    if (arg.startsWith('--') && equalsIndex > 2 && pathOptions.has(arg.slice(0, equalsIndex))) {
      assignPath(arg.slice(0, equalsIndex), arg.slice(equalsIndex + 1));
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }
    if (parsed.command) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    parsed.command = arg;
  }

  if (parsed.command && !['install', 'update', 'uninstall', 'status'].includes(parsed.command)) {
    throw new Error(`Unknown command: ${parsed.command}`);
  }

  return parsed;
}

function formatResult(result, target) {
  const lines = [];
  lines.push(`${result.command}: ${result.summary}`);
  lines.push(`${target.homeLabel}: ${result.home}`);
  if (result.skillsDir) {
    lines.push(`skills dir: ${result.skillsDir}`);
  }

  if (result.actions.length > 0) {
    lines.push('actions:');
    for (const action of result.actions) {
      lines.push(`  - ${action}`);
    }
  }

  if (result.issues.length > 0) {
    lines.push('issues:');
    for (const issue of result.issues) {
      lines.push(`  - ${issue}`);
    }
  }

  if (result.backups.length > 0) {
    lines.push('backups:');
    for (const backup of result.backups) {
      lines.push(`  - ${backup}`);
    }
  }

  return `${lines.join('\n')}\n`;
}
