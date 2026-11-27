#!/usr/bin/env node
// Produce a privacy-safe route and usage summary from a raw bench run.
// Usage: node routes-from-rollouts.mjs <run-dir>
// stdout is a fixed-schema JSON object. It never emits raw IDs, paths, commands,
// prompts, file names, model names, roles, or other values outside the allowlists.
import fs from 'node:fs';
import path from 'node:path';

const TASKS = new Set(['small', 'big', 'unknown', 'review']);
const VARIANTS = new Set(['nokit', 'current', 'candidate', 'standard', 'complex', 'standard191', 'complex191', 'ownerreview']);
const MODELS = new Set(['gpt-6.2-sol', 'gpt-6.1-sol', 'gpt-6-luna', 'gpt-6.1-luna']);
const EFFORTS = new Set(['low', 'medium', 'high', 'xhigh']);
const ROLES = new Map([
  ['workforce_worker', 'workforce-worker'],
  ['workforce-worker', 'workforce-worker'],
  ['worker', 'worker'],
  ['workforce_reviewer', 'workforce-reviewer'],
  ['workforce-reviewer', 'workforce-reviewer'],
  ['reviewer', 'reviewer'],
  ['workforce_auditor', 'workforce-auditor'],
  ['workforce-auditor', 'workforce-auditor'],
  ['auditor', 'auditor'],
  ['workforce_probe', 'workforce-probe'],
  ['workforce-probe', 'workforce-probe'],
  ['probe', 'probe'],
  ['workforce_progress_critic', 'workforce-progress-critic'],
  ['workforce-progress-critic', 'workforce-progress-critic'],
  ['explorer', 'explorer'],
  ['default', 'default'],
]);
const USAGE_KEYS = [
  'input_tokens', 'cached_input_tokens', 'cache_write_input_tokens',
  'output_tokens', 'reasoning_output_tokens', 'total_tokens',
];
const EMPTY_USAGE = () => Object.fromEntries(USAGE_KEYS.map((k) => [k, 0]));
const safe = (value, set) => (set.has(value) ? value : 'other');
const safeModel = (value) => safe(value, MODELS);
const safeEffort = (value) => safe(value, EFFORTS);
const safeRole = (value) => ROLES.get(value) ?? 'other';

function jsonl(file) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  } catch {
    return [];
  }
}

function jsonFile(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function plus(target, usage) {
  for (const key of USAGE_KEYS) {
    const n = Number(usage?.[key]);
    if (Number.isFinite(n) && n >= 0) target[key] += n;
  }
}

function usageSummary(lines) {
  const usage = EMPTY_USAGE();
  const seen = new Set();
  for (const line of lines) {
    if (line.type !== 'token_usage_record' || !line.payload?.usage) continue;
    const p = line.payload;
    const key = p.response_id || `${p.turn_id ?? ''}:${line.timestamp ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    plus(usage, p.usage);
  }
  return { api_requests: seen.size, usage };
}

function splitShell(input) {
  const result = [];
  let tokens = [];
  let token = '';
  let quote = '';
  let escaped = false;
  const pushToken = () => { if (token) tokens.push(token); token = ''; };
  const pushCommand = () => { pushToken(); if (tokens.length) result.push(tokens); tokens = []; };
  for (let i = 0; i < input.length; i += 1) {
    const c = input[i];
    if (escaped) { token += c; escaped = false; continue; }
    if (c === '\\' && quote !== "'") { escaped = true; continue; }
    if (quote) { if (c === quote) quote = ''; else token += c; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === ';' || c === '\n' || c === '|' || c === '&') {
      pushCommand();
      if ((c === '|' || c === '&') && input[i + 1] === c) i += 1;
      continue;
    }
    if (/\s/.test(c)) { pushToken(); continue; }
    token += c;
  }
  pushCommand();
  return result;
}

const READERS = new Set(['cat', 'sed', 'head', 'tail', 'awk', 'less', 'more', 'bat', 'nl']);
const SEARCHERS = new Set(['rg', 'grep', 'egrep', 'fgrep', 'find', 'ls', 'fd', 'tree']);
const WRAPPERS = new Set(['env', 'command', 'builtin', 'sudo', 'time', 'nice']);

function commandPosition(tokens) {
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) continue;
    const base = path.posix.basename(token);
    if (WRAPPERS.has(base)) continue;
    if (base === 'git' && ['show', 'grep'].includes(tokens[i + 1])) return { command: `git ${tokens[i + 1]}`, index: i };
    return { command: base, index: i };
  }
  return { command: '', index: -1 };
}

// Count only forms whose final argument is provably a read operand.
function readsSkillFile(command, args) {
  if (!/^(?:[^\s<>`"';&|()]*\/)?workforce-orchestrate\/SKILL\.md$/.test(args.at(-1) ?? '')) return false;
  const flags = args.slice(0, -1);
  if (command === 'cat') return flags.length === 0 || (flags.length === 1 && flags[0] === '--');
  if (command === 'head' || command === 'tail') {
    return !flags.length || (flags.length === 2 && flags[0] === '-n' && /^\d+$/.test(flags[1]));
  }
  return command === 'sed' && flags.length === 2 && flags[0] === '-n' && /^\d+(?:,\d+)?p$/.test(flags[1]);
}

function skillCommandSummary(command, depth = 0) {
  const target = /(?:^|[\\/\s"'])workforce-orchestrate\/SKILL\.md(?=$|[\\/\s"';&|,)])/;
  const counts = { reader_commands: 0, isolated_reader_commands: 0, compound_reader_commands: 0, searches_or_listings: 0, ambiguous_references: 0, mentions: 0 };
  if (depth > 3) { counts.ambiguous_references = 1; return counts; }
  const segments = splitShell(String(command ?? ''));
  for (const tokens of segments.filter((parts) => parts.some((t) => target.test(t)))) {
    const { command: cmd, index } = commandPosition(tokens);
    if (['zsh', 'bash', 'sh'].includes(cmd)) {
      const cIndex = tokens.findIndex((t, i) => i > index && /^-(?:c|lc|ic|xc)$/.test(t));
      const inner = cIndex >= 0 ? tokens.slice(cIndex + 1).join(' ') : '';
      if (!inner) { counts.ambiguous_references += 1; continue; }
      const nested = skillCommandSummary(inner, depth + 1);
      const isolatedWrapper = segments.length === 1 && splitShell(inner).length === 1;
      counts.reader_commands += nested.reader_commands;
      counts.searches_or_listings += nested.searches_or_listings;
      counts.ambiguous_references += nested.ambiguous_references;
      counts.mentions += nested.mentions;
      if (isolatedWrapper) {
        counts.isolated_reader_commands += nested.isolated_reader_commands;
        counts.compound_reader_commands += nested.compound_reader_commands;
      } else {
        counts.compound_reader_commands += nested.reader_commands;
      }
    } else if (SEARCHERS.has(cmd) || cmd === 'git grep') counts.searches_or_listings += 1;
    else if (readsSkillFile(cmd, tokens.slice(index + 1))) {
      counts.reader_commands += 1;
      if (segments.length === 1) counts.isolated_reader_commands += 1;
      else counts.compound_reader_commands += 1;
    } else if (READERS.has(cmd) || ['git show', 'node', 'python', 'python3', 'perl'].includes(cmd)) counts.ambiguous_references += 1;
    else counts.mentions += 1;
  }
  return counts;
}

function skillAccess(commandItems) {
  const result = {
    reader_commands: 0,
    successful_direct_reads: 0,
    failed_direct_reader_commands: 0,
    reader_exit_unavailable: 0,
    compound_reader_commands: 0,
    searches_or_listings: 0,
    ambiguous_references: 0,
    mentions: 0,
  };
  for (const item of commandItems.values()) {
    const c = skillCommandSummary(item.command);
    result.reader_commands += c.reader_commands;
    result.compound_reader_commands += c.compound_reader_commands;
    result.searches_or_listings += c.searches_or_listings;
    result.ambiguous_references += c.ambiguous_references;
    result.mentions += c.mentions;
    if (c.isolated_reader_commands === 0) continue;
    if (item.exit_code === 0) result.successful_direct_reads += c.isolated_reader_commands;
    else if (typeof item.exit_code === 'number') result.failed_direct_reader_commands += c.isolated_reader_commands;
    else result.reader_exit_unavailable += c.isolated_reader_commands;
  }
  return result;
}

function eventCounts(events, rollouts) {
  const commands = new Map();
  const files = new Map();
  const commandEvents = { started: 0, completed: 0, other: 0 };
  const fileEvents = { started: 0, completed: 0, other: 0 };
  for (const event of events) {
    const item = event.item ?? event.payload?.item;
    if (!item || !['command_execution', 'file_change'].includes(item.type)) continue;
    const command = item.type === 'command_execution';
    const eventsByKind = command ? commandEvents : fileEvents;
    const kind = event.type === 'item.started' ? 'started' : event.type === 'item.completed' ? 'completed' : 'other';
    eventsByKind[kind] += 1;
    const map = command ? commands : files;
    const key = item.id || `${event.type}:${map.size}`;
    const old = map.get(key) ?? {};
    if (command) {
      map.set(key, {
        ...old,
        command: typeof item.command === 'string' ? item.command : old.command,
        exit_code: typeof item.exit_code === 'number' ? item.exit_code : old.exit_code,
        status: typeof item.status === 'string' ? item.status : old.status,
      });
    } else {
      map.set(key, { ...old, changes: Math.max(old.changes ?? 0, Array.isArray(item.changes) ? item.changes.length : 0) });
    }
  }
  const execCalls = new Set();
  for (const rollout of rollouts) for (const line of rollout.lines) {
    const p = line.payload ?? {};
    if (line.type === 'response_item' && p.type === 'custom_tool_call' && p.name === 'exec') {
      execCalls.add(p.call_id || `${line.timestamp ?? ''}:${execCalls.size}`);
    }
  }
  return {
    exec_tool_calls: execCalls.size,
    command_execution_events: commandEvents,
    command_execution_items: {
      count: commands.size,
      completed: [...commands.values()].filter((x) => typeof x.exit_code === 'number').length,
      successful: [...commands.values()].filter((x) => x.exit_code === 0).length,
      failed: [...commands.values()].filter((x) => typeof x.exit_code === 'number' && x.exit_code !== 0).length,
    },
    file_change_events: fileEvents,
    file_change_items: { count: files.size, reported_changes: [...files.values()].reduce((n, x) => n + x.changes, 0) },
    skill_access: skillAccess(commands),
  };
}

function parseSpawnCalls(lines) {
  const counts = new Map();
  for (const line of lines) {
    const p = line.payload ?? {};
    if (line.type !== 'response_item' || p.type !== 'function_call' || p.name !== 'spawn_agent') continue;
    let args;
    try { args = JSON.parse(p.arguments); } catch { continue; }
    const role = safeRole(args.agent_type);
    const model = safeModel(args.model);
    const effort = safeEffort(args.reasoning_effort);
    const key = `${role}|${model}|${effort}`;
    counts.set(key, { role, model, effort, calls: (counts.get(key)?.calls ?? 0) + 1 });
  }
  return [...counts.values()].sort((a, b) => `${a.role}|${a.model}|${a.effort}`.localeCompare(`${b.role}|${b.model}|${b.effort}`));
}

function summarizeCell(cellsDir, dirName) {
  const cellDir = path.join(cellsDir, dirName);
  const meta = fs.readFileSync(path.join(cellDir, 'cell.txt'), 'utf8').trim().split(/\s+/);
  const [rawTask, rawVariant, rawModelLabel, rawRepeat] = meta;
  if (rawModelLabel !== 'sol') return { skipped: 'non_codex_label' };
  const task = safe(rawTask, TASKS);
  const variant = safe(rawVariant, VARIANTS);
  const repeat = /^\d+$/.test(rawRepeat ?? '') && Number(rawRepeat) <= 9 ? Number(rawRepeat) : null;
  const logs = path.join(cellDir, 'logs');
  const eventFile = path.join(logs, 'codex.events.jsonl');
  const events = jsonl(eventFile);
  const mainId = events.find((e) => e.type === 'thread.started')?.thread_id;
  const rolloutsDir = path.join(logs, 'rollouts');
  const rollouts = fs.existsSync(rolloutsDir)
    ? fs.readdirSync(rolloutsDir).filter((name) => name.endsWith('.jsonl')).map((name) => {
      const lines = jsonl(path.join(rolloutsDir, name));
      const session = lines.find((x) => x.type === 'session_meta')?.payload ?? {};
      const ctx = lines.find((x) => x.type === 'turn_context')?.payload ?? {};
      return { lines, session, ctx };
    }) : [];
  const root = mainId
    ? rollouts.find((r) => r.session.id === mainId)
    : rollouts.filter((r) => !r.session.source?.subagent?.thread_spawn).length === 1
      ? rollouts.find((r) => !r.session.source?.subagent?.thread_spawn)
      : null;
  if (!root) return { skipped: 'root_unavailable' };
  const rootModel = root.ctx.model;
  if (rootModel !== 'gpt-6.2-sol') return { skipped: 'other_root_model' };
  const rootUsage = usageSummary(root.lines);
  const children = new Map();
  for (const r of rollouts) {
    if (r === root) continue;
    const source = r.session.source?.subagent?.thread_spawn;
    if (!source) continue;
    const role = safeRole(source.agent_role);
    const model = safeModel(r.ctx.model);
    const effort = safeEffort(r.ctx.effort ?? r.ctx.reasoning_effort);
    const key = `${role}|${model}|${effort}`;
    const old = children.get(key) ?? { role, model, effort, sessions: 0, api_requests: 0, usage: EMPTY_USAGE() };
    const part = usageSummary(r.lines);
    old.sessions += 1;
    old.api_requests += part.api_requests;
    plus(old.usage, part.usage);
    children.set(key, old);
  }
  return {
    task, variant, repeat,
    root: { model: safeModel(rootModel), effort: safeEffort(root.ctx.effort ?? root.ctx.reasoning_effort), ...rootUsage },
    child_spawn_calls: parseSpawnCalls(root.lines).map(({ role, calls }) => ({ role, calls })),
    children: [...children.values()].sort((a, b) => `${a.role}|${a.model}|${a.effort}`.localeCompare(`${b.role}|${b.model}|${b.effort}`)),
    events: eventCounts(events, rollouts),
  };
}

function main() {
  const input = process.argv[2];
  if (!input) {
    process.stdout.write(`${JSON.stringify({ schema_version: 1, error: 'missing_input' })}\n`);
    process.exitCode = 2;
    return;
  }
  const root = path.resolve(input);
  const cellsDir = path.join(root, 'cells');
  if (!fs.existsSync(cellsDir) || !fs.statSync(cellsDir).isDirectory()) {
    process.stdout.write(`${JSON.stringify({ schema_version: 1, error: 'invalid_series' })}\n`);
    process.exitCode = 2;
    return;
  }
  const cells = [];
  const inventory = { raw_metadata_rows: 0, codex_labeled_cells: 0, included_cells: 0, root_unavailable: 0, other_root_model: 0, malformed_cells: 0 };
  for (const entry of fs.readdirSync(cellsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !fs.existsSync(path.join(cellsDir, entry.name, 'cell.txt'))) continue;
    inventory.raw_metadata_rows += 1;
    try {
      const cell = summarizeCell(cellsDir, entry.name);
      if (cell?.skipped === 'non_codex_label') continue;
      inventory.codex_labeled_cells += 1;
      if (cell?.skipped === 'root_unavailable') inventory.root_unavailable += 1;
      else if (cell?.skipped === 'other_root_model') inventory.other_root_model += 1;
      else if (cell) { cells.push(cell); inventory.included_cells += 1; }
    } catch {
      // A malformed cell is omitted; never serialize its path or contents.
      inventory.malformed_cells += 1;
    }
  }
  const taskOrder = ['small', 'big', 'unknown', 'review', 'other'];
  const variantOrder = ['nokit', 'current', 'candidate', 'standard', 'complex', 'standard191', 'complex191', 'ownerreview', 'other'];
  cells.sort((a, b) => (taskOrder.indexOf(a.task) - taskOrder.indexOf(b.task))
    || (variantOrder.indexOf(a.variant) - variantOrder.indexOf(b.variant))
    || ((a.repeat ?? 99) - (b.repeat ?? 99)));
  process.stdout.write(`${JSON.stringify({
    schema_version: 1,
    model_filter: 'gpt-6.2-sol',
    inventory,
    semantics: {
      api_requests: 'Unique token_usage_record response IDs; event ordinals are not API requests.',
      exec_tool_calls: 'Top-level Codex exec tool calls; one call can contain zero, one, or several shell command executions.',
      command_execution_events: 'Raw started/completed event records; unique item counts are separate.',
      command_execution_items: 'Unique command_execution item IDs, not a count of shell subcommands inside a compound command.',
      os_process_count: 'OS shell process counts are not recorded in these logs.',
      file_change_items: 'Unique file_change item IDs; reported_changes sums changes-array lengths once per item.',
      skill_access: 'reader_commands counts executed reader commands found in command_execution items. successful_direct_reads requires one isolated reader command in its event item and exit code 0; batch commands are never treated as successful reads. Missing exit codes remain reader_exit_unavailable. Search/list operations, ambiguous references, and mentions are separate; rollout output text is not evidence of a read.',
    },
    cells,
  })}\n`);
}

try { main(); } catch {
  process.stdout.write(`${JSON.stringify({ schema_version: 1, error: 'summary_failed' })}\n`);
  process.exitCode = 1;
}
