#!/usr/bin/env node
// Runs one Codex auditor or reviewer turn for the Claude Workforce hybrid profile.
// The process always exits: stdin is a file (EOF guaranteed), approvals are off,
// and a watchdog kills a run that goes silent, asks for input, or runs too long.
// The cooperator launches it in the background and reads <name>.result.json.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const USAGE = `usage: codex-run.mjs --role audit|review --name NAME --packet FILE --cd ROOT --out DIR
  [--model M] [--effort E] [--resume THREAD_ID] [--idle-minutes 15] [--timeout-minutes 60]
  [--keep-user-config] [--codex-bin PATH]`;

const DEFAULT_MODEL = { audit: 'gpt-6-luna', review: 'gpt-6.1-sol' };
const SKILL = { audit: 'workforce-audit', review: 'workforce-review' };
const INPUT_REQUEST = /approval|request_user_input|user_input|elicitation/i;

function parseArgs(argv) {
  const options = { idleMinutes: 15, timeoutMinutes: 60, effort: 'xhigh', keepUserConfig: false, codexBin: 'codex' };
  const names = {
    '--role': 'role', '--name': 'name', '--packet': 'packet', '--cd': 'cd', '--out': 'out',
    '--model': 'model', '--effort': 'effort', '--resume': 'resume', '--codex-bin': 'codexBin',
    '--idle-minutes': 'idleMinutes', '--timeout-minutes': 'timeoutMinutes',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--keep-user-config') {
      options.keepUserConfig = true;
    } else if (arg === '-h' || arg === '--help') {
      console.log(USAGE);
      process.exit(0);
    } else if (names[arg] && index + 1 < argv.length) {
      options[names[arg]] = argv[++index];
    } else {
      fail(`unknown or incomplete argument: ${arg}`);
    }
  }
  for (const key of ['role', 'name', 'packet', 'cd', 'out']) {
    if (!options[key]) fail(`missing --${key}`);
  }
  if (!SKILL[options.role]) fail(`--role must be audit or review`);
  if (!/^[\w.-]+$/.test(options.name)) fail('--name may contain letters, digits, dot, dash, underscore');
  options.model ??= DEFAULT_MODEL[options.role];
  options.out = path.resolve(options.out);
  options.cd = path.resolve(options.cd);
  options.idleMinutes = Number(options.idleMinutes);
  options.timeoutMinutes = Number(options.timeoutMinutes);
  return options;
}

function fail(message) {
  console.error(`codex-run: ${message}\n${USAGE}`);
  process.exit(64);
}

function stripFrontmatter(text) {
  return text.startsWith('---\n') ? text.slice(text.indexOf('\n---\n', 4) + 5) : text;
}

function buildPrompt(options) {
  const packet = fs.readFileSync(options.packet, 'utf8');
  if (options.resume) return packet;
  const skillPath = path.resolve(import.meta.dirname, '..', '..', SKILL[options.role], 'SKILL.md');
  const skill = stripFrontmatter(fs.readFileSync(skillPath, 'utf8')).trim();
  return `${skill}\n\nYou run non-interactively: nobody will answer questions. Never wait for input; ` +
    `if something blocks you, report it in NOT_CHECKED and finish.\n\n---\n\n${packet}`;
}

function codexArgs(options, lastMessage) {
  const common = [
    '-m', options.model,
    '-c', `model_reasoning_effort="${options.effort}"`,
    '-c', 'approval_policy="never"',
    '--json', '-o', lastMessage,
  ];
  if (!options.keepUserConfig) common.push('--ignore-user-config');
  if (options.resume) {
    return ['exec', 'resume', options.resume, ...common, '-c', 'sandbox_mode="read-only"', '-'];
  }
  return ['exec', ...common, '-s', 'read-only', '-C', options.cd, '-'];
}

function findThreadId(event) {
  return event.thread_id ?? event.session_id ?? event.thread?.id ?? event.msg?.session_id ?? null;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  fs.mkdirSync(options.out, { recursive: true });
  const base = path.join(options.out, options.name);
  const files = {
    prompt: `${base}.prompt.md`, jsonl: `${base}.jsonl`, lastMessage: `${base}.md`, result: `${base}.result.json`,
  };
  fs.writeFileSync(files.prompt, buildPrompt(options));
  fs.rmSync(files.lastMessage, { force: true });

  const started = Date.now();
  const stdinFd = fs.openSync(files.prompt, 'r');
  const jsonl = fs.createWriteStream(files.jsonl);
  const [command, prefix] = /\.(mjs|cjs|js)$/.test(options.codexBin)
    ? [process.execPath, [options.codexBin]]
    : [options.codexBin, []];
  const child = spawn(command, [...prefix, ...codexArgs(options, files.lastMessage)], {
    cwd: options.cd,
    stdio: [stdinFd, 'pipe', 'pipe'],
    shell: process.platform === 'win32' && command === options.codexBin,
  });
  fs.closeSync(stdinFd);

  let threadId = options.resume ?? null;
  let status = null;
  let lastActivity = Date.now();
  let stderrTail = '';
  let buffered = '';

  const stop = (reason) => {
    if (status) return;
    status = reason;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 10_000).unref();
  };

  child.stdout.on('data', (chunk) => {
    lastActivity = Date.now();
    jsonl.write(chunk);
    buffered += chunk.toString('utf8');
    const lines = buffered.split('\n');
    buffered = lines.pop();
    for (const line of lines) {
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }
      threadId ??= findThreadId(event);
      if (INPUT_REQUEST.test(String(event.type ?? '')) || INPUT_REQUEST.test(String(event.item?.type ?? ''))) {
        stop('waiting_for_input');
      }
    }
  });
  child.stderr.on('data', (chunk) => {
    lastActivity = Date.now();
    stderrTail = (stderrTail + chunk.toString('utf8')).slice(-4000);
  });

  const watchdog = setInterval(() => {
    const now = Date.now();
    if (now - started > options.timeoutMinutes * 60_000) stop('timeout');
    else if (now - lastActivity > options.idleMinutes * 60_000) stop('stalled');
  }, Math.min(5_000, options.idleMinutes * 60_000));

  child.on('error', (error) => {
    stderrTail += `\n${error.message}`;
    status ??= 'failed';
  });
  child.on('close', (code, signal) => {
    clearInterval(watchdog);
    jsonl.end();
    if (!status) status = code === 0 && fs.existsSync(files.lastMessage) ? 'ok' : 'failed';
    const result = {
      status,
      name: options.name,
      role: options.role,
      model: options.model,
      effort: options.effort,
      threadId,
      exitCode: code,
      signal,
      durationSec: Math.round((Date.now() - started) / 1000),
      lastMessage: fs.existsSync(files.lastMessage) ? files.lastMessage : null,
      jsonl: files.jsonl,
      stderrTail: stderrTail.trim().slice(-1500),
    };
    fs.writeFileSync(files.result, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`codex-run ${options.name}: ${status} thread=${threadId ?? 'unknown'} result=${files.result}`);
    process.exit(status === 'ok' ? 0 : 2);
  });
}

main();
