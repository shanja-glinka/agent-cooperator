#!/usr/bin/env node
// Runs one Codex auditor, reviewer, or escalated worker turn for the Claude Workforce hybrid profile.
// The process always exits: stdin is a file (EOF guaranteed), approvals are off,
// and a watchdog kills a run that goes silent, asks for input, or runs too long.
// The cooperator launches it in the background and reads <name>.result.json.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const USAGE = `usage: codex-run.mjs --role audit|review|work --name NAME --packet FILE --cd ROOT --out DIR
  [--model M] [--effort E] [--resume THREAD_ID] [--idle-minutes 15] [--timeout-minutes 60]
  [--keep-user-config] [--codex-bin PATH]`;

const DEFAULT_MODEL = { audit: 'gpt-6-luna', review: 'gpt-6.1-sol', work: 'gpt-6.1-sol' };
const SKILL = { audit: 'workforce-audit', review: 'workforce-review', work: 'workforce-worker' };
// Auditors and reviewers only read; a worker escalated from haiku edits its WRITE_SET.
const SANDBOX = { audit: 'read-only', review: 'read-only', work: 'workspace-write' };
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
  if (!SKILL[options.role]) fail(`--role must be audit, review, or work`);
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
    `if something blocks you, report it in your packet and finish.\n\n---\n\n${packet}`;
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
    return ['exec', 'resume', options.resume, ...common, '-c', `sandbox_mode="${SANDBOX[options.role]}"`, '-'];
  }
  return ['exec', ...common, '-s', SANDBOX[options.role], '-C', options.cd, '-'];
}

const EMPTY_TOKENS = { input: null, cachedInput: null, output: null, total: null };

function readUsage(usage) {
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) return null;
  const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
  const input = count(usage.input_tokens);
  const output = count(usage.output_tokens);
  let cachedInput = count(usage.cached_input_tokens);
  if (input !== null && cachedInput > input) cachedInput = null;
  // Cached input is a subset of input; reasoning output is a subset of output.
  const total = input !== null && output !== null ? count(input + output) : null;
  return { input, cachedInput, output, total };
}

function createUsageTracker(resumed) {
  let snapshot = null;
  let source = null;
  let finalSnapshot = null;
  let explicitSnapshot = false;
  let regressed = false;
  let malformed = false;
  let incrementalOnly = false;
  const threads = new Set();
  const fields = ['input', 'cachedInput', 'output'];
  const equal = (a, b) => a && b && fields.every((key) => a[key] === b[key]);

  // Codex exec currently copies the THREAD total into turn.completed.usage,
  // and emits default zeros when no usage was captured. Do not sum completions.
  // Verified in openai/codex@1b89beea82ae60e0dbeacb38f1ad2eae9dfed377:
  // codex-rs/exec/src/event_processor_with_jsonl_output.rs, usage_from_last_total.
  return {
    invalidLine() { malformed = true; },
    observe(event) {
      if (event.type === 'thread.started' && event.thread_id) threads.add(event.thread_id);
      if (event.type === 'turn.started' || event.type === 'turn.failed') finalSnapshot = null;
      let usage;
      let nextSource;
      if (event.type === 'turn.completed') {
        usage = event.usage;
        nextSource = 'turn.completed.usage';
        finalSnapshot = readUsage(usage);
      } else if (event.type === 'token_count') {
        // Compatibility with raw token_count fixtures/adapters, not a claim that
        // the public exec JSONL stream emits this internal event type.
        usage = event.info?.total_token_usage;
        nextSource = 'token_count.info.total_token_usage';
        const reported = readUsage(usage);
        explicitSnapshot ||= reported !== null && fields.every((key) => reported[key] !== null);
        if (!usage && event.info?.last_token_usage) {
          // last_token_usage is an increment, but may be repeated. Without an
          // absolute snapshot or reliable event identity, summing is unsafe.
          incrementalOnly = true;
          source ??= 'token_count.info.last_token_usage';
        }
      } else {
        // Generic usage fields can describe an item, request, or another scope.
        return;
      }
      const next = readUsage(usage);
      if (!next || fields.every((key) => next[key] === null)) return;
      if (snapshot && fields.some((key) => snapshot[key] !== null && next[key] !== null && next[key] < snapshot[key])) {
        regressed = true;
      }
      snapshot = next;
      source = nextSource;
    },
    result() {
      let reason = null;
      let status = 'unknown';
      let values = { ...EMPTY_TOKENS };
      if (threads.size > 1) reason = 'multiple_threads';
      else if (resumed && snapshot) reason = 'resume_baseline_missing';
      else if (regressed) reason = 'cumulative_counter_regressed';
      else if (!snapshot) reason = incrementalOnly ? 'increment_identity_unavailable' : 'usage_unavailable';
      else if (snapshot.total === 0 && !explicitSnapshot) reason = 'zero_may_be_upstream_default';
      else {
        values = snapshot;
        const complete = fields.every((key) => snapshot[key] !== null) && snapshot.total !== null;
        status = complete && equal(snapshot, finalSnapshot) && !malformed ? 'known' : 'partial';
        if (status === 'partial') reason = !complete ? 'incomplete_fields' : malformed ? 'malformed_stream' : 'final_usage_unavailable';
      }
      return {
        ...values, status, source, scope: 'run', reason,
        // Preserve observations for inspection; this is not an extra run charge.
        // In particular, a resumed thread's total is NOT a run lower bound.
        threadTotal: snapshot,
      };
    },
  };
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
  const usageTracker = createUsageTracker(Boolean(options.resume));

  const stop = (reason) => {
    if (status) return;
    status = reason;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 10_000).unref();
  };

  const readEvent = (line) => {
    if (!line.trim()) return;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      usageTracker.invalidLine();
      return;
    }
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      usageTracker.invalidLine();
      return;
    }
    threadId ??= findThreadId(event);
    usageTracker.observe(event);
    if (INPUT_REQUEST.test(String(event.type ?? '')) || INPUT_REQUEST.test(String(event.item?.type ?? ''))) {
      stop('waiting_for_input');
    }
  };

  child.stdout.on('data', (chunk) => {
    lastActivity = Date.now();
    jsonl.write(chunk);
    buffered += chunk.toString('utf8');
    const lines = buffered.split('\n');
    buffered = lines.pop();
    for (const line of lines) readEvent(line);
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
    readEvent(buffered);
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
      tokens: usageTracker.result(),
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
