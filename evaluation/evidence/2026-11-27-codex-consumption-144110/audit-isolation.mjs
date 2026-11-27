#!/usr/bin/env node
// Anonymized, read-only sensitivity report for a run's official isolation.json.
// Usage: node audit-isolation.mjs <raw-run-dir> <private-/tmp-fixture-name>
// Or provide AUDIT_PRIVATE_FIXTURE. The fixture value and raw identifiers/paths
// are used only in memory and never serialized.
import fs from 'node:fs';
import path from 'node:path';

const TASKS = new Set(['small', 'big', 'unknown', 'review']);
const VARIANTS = new Set(['nokit', 'current', 'candidate', 'v4', 'v5', 'standard', 'complex', 'standard191', 'complex191', 'ownerreview']);
const MODELS = new Set(['opus', 'sol', 'luna']);
const STATUSES = new Set(['clean', 'shared', 'crossed', 'stale']);
const READERS = new Set(['ls', 'rg', 'sed', 'cat']);
const MUTATORS = new Set(['cp', 'mv', 'rm', 'mkdir', 'rmdir', 'touch', 'tee', 'install', 'chmod', 'chown']);

function jsonFile(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function jsonl(file, rawFilter = null) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap((line) => {
      if (rawFilter && !rawFilter.test(line)) return [];
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  } catch { return []; }
}

function safe(value, allowed) { return allowed.has(value) ? value : 'other'; }

function normalizedPath(value) {
  if (typeof value !== 'string') return '';
  return path.posix.normalize(value.replace(/^\/private\//, '/'));
}

function fixturePath(value, fixture) {
  const candidate = normalizedPath(value);
  return candidate === `/tmp/${fixture}` || candidate.startsWith(`/tmp/${fixture}/`);
}

function fixtureMention(text, fixture) {
  return new RegExp(`(?:^|[^A-Za-z0-9._-])/(?:private/)?tmp/${escapeRegExp(fixture)}(?=$|[/\\s'";&|)])`).test(String(text ?? ''));
}

function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Small shell lexer: enough for conservative static matching; unsupported syntax
// is returned as uncertain instead of being interpreted or executed.
function shellParts(source) {
  const text = String(source ?? '');
  const segments = [];
  let segment = '';
  let quote = '';
  let escaped = false;
  let complex = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (escaped) { segment += c; escaped = false; continue; }
    if (c === '\\' && quote !== "'") { segment += c; escaped = true; continue; }
    if (quote) { segment += c; if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; segment += c; continue; }
    if (c === '$' && ['(', '{'].includes(text[i + 1])) complex = true;
    if (c === '`') complex = true;
    if (c === ';' || c === '|' || c === '&' || c === '\n') {
      const value = segment.trim();
      if (value) segments.push(value);
      segment = '';
      if ((c === '|' || c === '&') && text[i + 1] === c) i += 1;
      continue;
    }
    segment += c;
  }
  if (quote || escaped) complex = true;
  if (segment.trim()) segments.push(segment.trim());
  return { segments, complex };
}

function shellWords(source) {
  const words = [];
  let word = '';
  let quote = '';
  let escaped = false;
  let complex = false;
  const push = () => { if (word !== '') words.push(word); word = ''; };
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i];
    if (escaped) { word += c; escaped = false; continue; }
    if (c === '\\' && quote !== "'") { escaped = true; continue; }
    if (quote) { if (c === quote) quote = ''; else word += c; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (/\s/.test(c)) { push(); continue; }
    if (c === '`' || (c === '$' && ['(', '{'].includes(source[i + 1]))) complex = true;
    word += c;
  }
  if (quote || escaped) complex = true;
  push();
  return { words, complex };
}

function unquoteWrapper(source) {
  const parsed = shellWords(String(source ?? '').trim());
  if (parsed.complex || parsed.words.length < 2) return { body: String(source ?? '').trim(), complex: parsed.complex };
  const exe = path.posix.basename(parsed.words[0]);
  if (!['zsh', 'bash', 'sh'].includes(exe)) return { body: String(source ?? '').trim(), complex: parsed.complex };
  const flag = parsed.words.findIndex((x) => /^-(?:c|lc|ic|xc)$/.test(x));
  if (flag < 0 || flag + 1 >= parsed.words.length) return { body: String(source ?? '').trim(), complex: true };
  return { body: parsed.words.slice(flag + 1).join(' '), complex: false };
}

function canonical(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const wrapper = unquoteWrapper(text);
  const split = shellParts(wrapper.body);
  if (wrapper.complex || split.complex) return null;
  const parsed = shellWords(wrapper.body);
  if (parsed.complex || !parsed.words.length) return null;
  return JSON.stringify(parsed.words);
}

function signaturesForCommand(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return [];
  const unwrapped = unquoteWrapper(raw);
  const split = shellParts(unwrapped.body);
  const result = new Set();
  const whole = canonical(unwrapped.body);
  if (whole) result.add(whole);
  for (const segment of split.segments) {
    const signature = canonical(segment);
    if (signature) result.add(signature);
  }
  return [...result];
}

function jsString(source, start) {
  const quote = source[start];
  if (!['"', "'", '`'].includes(quote)) return null;
  let value = '';
  for (let i = start + 1; i < source.length; i += 1) {
    const c = source[i];
    if (c === quote) {
      if (quote === '`' && value.includes('${')) return null;
      return { value, end: i + 1 };
    }
    if (c !== '\\') { value += c; continue; }
    const n = source[++i];
    if (n === undefined) return null;
    if (n === 'n') value += '\n';
    else if (n === 'r') value += '\r';
    else if (n === 't') value += '\t';
    else if (n === 'b') value += '\b';
    else if (n === 'f') value += '\f';
    else if (n === 'v') value += '\v';
    else if (n === '0') value += '\0';
    else value += n;
  }
  return null;
}

function skipJs(source, start) {
  const c = source[start];
  if (['"', "'", '`'].includes(c)) return jsString(source, start)?.end ?? source.length;
  if (c === '/' && source[start + 1] === '/') {
    const end = source.indexOf('\n', start + 2);
    return end < 0 ? source.length : end + 1;
  }
  if (c === '/' && source[start + 1] === '*') {
    const end = source.indexOf('*/', start + 2);
    return end < 0 ? source.length : end + 2;
  }
  return start;
}

function matchingParen(source, open) {
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const skipped = skipJs(source, i);
    if (skipped !== i) { i = skipped - 1; continue; }
    if (source[i] === '(') depth += 1;
    else if (source[i] === ')' && --depth === 0) return i;
  }
  return -1;
}

function staticCmdProperty(argument) {
  let i = 0;
  while (/\s/.test(argument[i] ?? '')) i += 1;
  if (argument[i] !== '{') return null;
  let braces = 0;
  let parens = 0;
  let brackets = 0;
  for (; i < argument.length; i += 1) {
    const skipped = skipJs(argument, i);
    if (skipped !== i) { i = skipped - 1; continue; }
    const c = argument[i];
    if (c === '{') { braces += 1; continue; }
    if (c === '}') { braces -= 1; if (braces === 0) break; continue; }
    if (braces !== 1) {
      if (c === '(') parens += 1; else if (c === ')') parens -= 1;
      else if (c === '[') brackets += 1; else if (c === ']') brackets -= 1;
      continue;
    }
    if (parens || brackets || !/[A-Za-z_$]/.test(c)) continue;
    const match = argument.slice(i).match(/^cmd\s*:/);
    if (!match) continue;
    const valueStart = i + match[0].length;
    let j = valueStart;
    while (/\s/.test(argument[j] ?? '')) j += 1;
    return jsString(argument, j)?.value ?? null;
  }
  return null;
}

function extractNestedCommands(input) {
  const source = String(input ?? '');
  const commands = [];
  let references = 0;
  const pattern = 'tools.exec_command';
  for (let i = 0; i < source.length;) {
    const skipped = skipJs(source, i);
    if (skipped !== i) { i = skipped; continue; }
    if (!source.startsWith(pattern, i)) { i += 1; continue; }
    let open = i + pattern.length;
    while (/\s/.test(source[open] ?? '')) open += 1;
    if (source[open] !== '(') { i += pattern.length; continue; }
    references += 1;
    const close = matchingParen(source, open);
    if (close < 0) break;
    const command = staticCmdProperty(source.slice(open + 1, close));
    if (typeof command === 'string') commands.push(command);
    i = close + 1;
  }
  return { references, commands };
}

function collectRolloutCalls(logsDir) {
  const dir = path.join(logsDir, 'rollouts');
  const refs = [];
  if (!fs.existsSync(dir)) return refs;
  const seen = new Set();
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.jsonl')).sort()) {
    for (const [lineIndex, line] of jsonl(path.join(dir, name), /"type"\s*:\s*"response_item".*"name"\s*:\s*"exec"/).entries()) {
      const p = line.payload ?? {};
      if (line.type !== 'response_item' || !['custom_tool_call', 'function_call'].includes(p.type) || p.name !== 'exec') continue;
      const key = typeof p.call_id === 'string' ? `${name}:${p.call_id}` : `${name}:line-${lineIndex}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const nested = extractNestedCommands(p.input ?? p.arguments ?? '');
      refs.push({ commands: nested.commands, nestedRefs: nested.references });
    }
  }
  return refs;
}

function collectEvents(logsDir) {
  const records = jsonl(path.join(logsDir, 'codex.events.jsonl'), /command_execution|file_change/);
  const commandMap = new Map();
  const fileMap = new Map();
  let commandRecords = 0;
  let fileRecords = 0;
  for (const event of records) {
    const item = event.item ?? event.payload?.item;
    if (!item) continue;
    if (item.type === 'command_execution') {
      commandRecords += 1;
      const key = typeof item.id === 'string' ? item.id : `missing-command-${commandRecords}`;
      const old = commandMap.get(key) ?? { command: '', exit_code: null, output: '', hasId: typeof item.id === 'string' };
      commandMap.set(key, {
        ...old,
        command: typeof item.command === 'string' && item.command ? item.command : old.command,
        exit_code: typeof item.exit_code === 'number' ? item.exit_code : old.exit_code,
        output: typeof item.aggregated_output === 'string' && item.aggregated_output ? item.aggregated_output : old.output,
      });
    } else if (item.type === 'file_change') {
      fileRecords += 1;
      const key = typeof item.id === 'string' ? item.id : `missing-file-${fileRecords}`;
      const paths = Array.isArray(item.changes) ? item.changes.flatMap((change) => {
        if (typeof change === 'string') return [change];
        return [change?.path, change?.file_path, change?.filename].filter((x) => typeof x === 'string');
      }) : [];
      const old = fileMap.get(key) ?? new Set();
      for (const value of paths) old.add(value);
      fileMap.set(key, old);
    }
  }
  return { commands: commandMap, commandRecords, fileChanges: fileMap, fileRecords };
}

function correlate(calls, commandItems) {
  const signatureItems = new Map();
  for (const [id, item] of commandItems) {
    for (const signature of signaturesForCommand(item.command)) {
      const list = signatureItems.get(signature) ?? [];
      list.push(id);
      signatureItems.set(signature, list);
    }
  }
  const signatureCalls = new Map();
  const refs = calls.map((call, refIndex) => ({ ...call, refIndex, commandSignatures: call.commands.map(canonical).filter(Boolean) }));
  for (const ref of refs) for (const signature of ref.commandSignatures) {
    const list = signatureCalls.get(signature) ?? [];
    list.push(ref.refIndex);
    signatureCalls.set(signature, list);
  }
  const mappedByRef = new Map(refs.map((ref) => [ref.refIndex, new Set()]));
  const matchedItems = new Set();
  const ambiguousSignatures = new Set();
  for (const [signature, refIndexes] of signatureCalls) {
    const itemIds = [...new Set(signatureItems.get(signature) ?? [])];
    if (refIndexes.length !== 1 || itemIds.length !== 1) { ambiguousSignatures.add(signature); continue; }
    mappedByRef.get(refIndexes[0]).add(itemIds[0]);
    matchedItems.add(itemIds[0]);
  }
  const extractedRefs = refs.filter((r) => r.commands.length > 0);
  const mappedRefs = refs.filter((r) => mappedByRef.get(r.refIndex).size > 0);
  const fullyMappedRefs = refs.filter((r) => r.commands.length > 0
    && r.commands.length === r.nestedRefs
    && r.commands.every((command) => {
      const signature = canonical(command);
      return signature && !ambiguousSignatures.has(signature) && (signatureItems.get(signature) ?? []).length === 1;
    }));
  const nestedCalls = refs.reduce((n, r) => n + r.nestedRefs, 0);
  const candidateCommands = refs.reduce((n, r) => n + r.nestedRefs, 0);
  const extractedCommands = refs.reduce((n, r) => n + r.commands.length, 0);
  const unresolvedCommands = refs.reduce((n, r) => n + r.commands.filter((c) => {
    const signature = canonical(c);
    return !signature || ambiguousSignatures.has(signature) || (signatureItems.get(signature) ?? []).length !== 1;
  }).length, 0) + Math.max(0, candidateCommands - extractedCommands);
  return {
    refs,
    mappedByRef,
    matchedItems,
    summary: {
      raw_exec_tool_call_refs: refs.length,
      refs_with_extracted_shell_commands: extractedRefs.length,
      refs_with_any_execution_match: mappedRefs.length,
      refs_fully_mapped: fullyMappedRefs.length,
      refs_without_extracted_shell_commands: refs.length - extractedRefs.length,
      refs_unmapped_or_ambiguous: refs.length - fullyMappedRefs.length,
      nested_exec_command_references: nestedCalls,
      extracted_static_command_arguments: extractedCommands,
      nested_calls_without_static_command_argument: Math.max(0, candidateCommands - extractedCommands),
      unresolved_command_correlations: unresolvedCommands,
      unique_command_execution_items: commandItems.size,
      command_items_matched_to_calls: matchedItems.size,
      command_items_unmatched: commandItems.size - matchedItems.size,
    },
  };
}

function commandPlan(command, fixture, cellDir) {
  const unwrapped = unquoteWrapper(command);
  const split = shellParts(unwrapped.body);
  if (unwrapped.complex || split.complex || split.segments.length === 0) return { kind: 'unresolved' };
  const safeSegments = split.segments.filter((s) => {
    const words = shellWords(s).words;
    return words.length && path.posix.basename(words[0]) === 'cd';
  });
  const nonCd = split.segments.filter((s) => {
    const words = shellWords(s).words;
    return !words.length || path.posix.basename(words[0]) !== 'cd';
  });
  if (nonCd.length !== 1 || safeSegments.length + nonCd.length !== split.segments.length) return { kind: 'unresolved' };
  let cwdIsFixture = false;
  if (safeSegments.length) {
    if (safeSegments.length !== 1 || split.segments[0] !== safeSegments[0]) return { kind: 'unresolved' };
    const cdWords = shellWords(safeSegments[0]).words;
    if (cdWords.length !== 2) return { kind: 'unresolved' };
    cwdIsFixture = fixturePath(cdWords[1], fixture)
      || normalizedPath(cdWords[1]).startsWith(normalizedPath(path.join(cellDir, 'tmp', fixture)) + '/');
    if (!cwdIsFixture) return { kind: 'unresolved' };
  }
  const segment = nonCd[0];
  const lex = shellWords(segment);
  if (lex.complex || !lex.words.length) return { kind: 'unresolved' };
  const words = lex.words;
  const verb = path.posix.basename(words[0]);
  if (MUTATORS.has(verb) || (verb === 'sed' && words.some((w) => /^-i/.test(w)))) return { kind: 'write_or_mutation' };
  if (!READERS.has(verb)) return { kind: 'unresolved' };
  if (/[<>](?!\s*\/dev\/null)/.test(segment) && !/2>\s*\/dev\/null/.test(segment)) return { kind: 'write_or_mutation' };
  const args = words.slice(1);
  let paths = [];
  if (verb === 'ls' || verb === 'cat') paths = args.filter((x) => !x.startsWith('-'));
  else if (verb === 'sed') paths = args.filter((x) => !x.startsWith('-') && !/^\d+(?:,\d+)?[pP]?$/.test(x)).slice(-1);
  else if (verb === 'rg') {
    const pos = [];
    for (let i = 0; i < args.length; i += 1) {
      const arg = args[i];
      if (['-e', '--regexp', '-g', '--glob', '-t', '--type', '-m', '--max-count', '-A', '-B', '-C'].includes(arg)) { i += 1; continue; }
      if (arg.startsWith('-')) continue;
      pos.push(arg);
    }
    paths = pos.slice(1);
  }
  if (!paths.length) {
    if (!cwdIsFixture) return { kind: 'unresolved' };
  }
  const allPathsInside = paths.every((p) => {
    if (p === '-' || p === '.') return cwdIsFixture;
    if (path.posix.isAbsolute(p)) return fixturePath(p, fixture)
      || normalizedPath(p).startsWith(normalizedPath(path.join(cellDir, 'tmp', fixture)) + '/');
    return cwdIsFixture;
  });
  if (!allPathsInside) return { kind: 'unresolved' };
  return { kind: 'read_only_simple', verb };
}

function fileChangeFixtureCount(fileChanges, fixture) {
  let items = 0;
  let paths = 0;
  for (const values of fileChanges.values()) {
    const count = [...values].filter((value) => fixtureMention(value, fixture) || fixturePath(value, fixture)).length;
    if (count) items += 1;
    paths += count;
  }
  return { items, paths };
}

function outputPathRelation(text, cellId, fixture) {
  const candidates = [...String(text ?? '').matchAll(/(?:^|[\s'"`(])((?:\/[^/\s'"`<>|;&()]+)+)/g)]
    .map((match) => match[1].replace(/[.,:]+$/, ''));
  return candidates.some((value) => {
    const normalized = normalizedPath(value);
    const parts = normalized.split('/');
    const endsAtFixture = normalized.endsWith(`/tmp/${fixture}`) || normalized.includes(`/tmp/${fixture}/`);
    return endsAtFixture && parts.includes(cellId);
  });
}

function summarizeCell(cellDir, cellId, isolationEntry, fixture) {
  const metaText = fs.readFileSync(path.join(cellDir, 'cell.txt'), 'utf8').trim().split(/\s+/);
  const [task, variant, model, repeat] = metaText;
  const logsDir = path.join(cellDir, 'logs');
  const provenance = jsonFile(path.join(cellDir, 'provenance.json'));
  const events = collectEvents(logsDir);
  const calls = collectRolloutCalls(logsDir);
  const correlation = correlate(calls, events.commands);
  const shared = Array.isArray(isolationEntry?.shared) ? isolationEntry.shared : [];
  const targetRefs = shared.filter((x) => fixturePath(x?.path, fixture));
  const otherRefs = shared.length - targetRefs.length;
  const relevant = [...events.commands.entries()].filter(([, item]) => fixtureMention(item.command, fixture));
  const outputLocal = normalizedPath(path.join(cellDir, 'tmp', fixture));
  const stderrFile = path.join(logsDir, 'codex.stderr');
  const rewriteFile = path.join(logsDir, 'tmp-rewrites.log');
  const stderr = fs.existsSync(stderrFile) ? fs.readFileSync(stderrFile, 'utf8') : '';
  const rewrites = fs.existsSync(rewriteFile) ? fs.readFileSync(rewriteFile, 'utf8') : '';
  const localPathEvidence = (text) => String(text).includes(outputLocal) || String(text).includes(outputLocal.replace(/^\/private/, ''));
  const missingEvidence = /no such file or directory|no such file/i.test(stderr) && localPathEvidence(stderr);
  const allCommandItems = [...events.commands.entries()];
  const aggregateOutputFixture = allCommandItems.filter(([, item]) => fixtureMention(item.output, fixture)).length;
  const aggregateOutputMissing = allCommandItems.filter(([, item]) => fixtureMention(item.output, fixture)
    && /no such file or directory|no such file/i.test(item.output)).length;
  const aggregateOutputCellLocal = allCommandItems.filter(([, item]) => outputPathRelation(item.output, cellId, fixture)).length;
  const aggregateOutputCellLocalMissing = allCommandItems.filter(([, item]) => outputPathRelation(item.output, cellId, fixture)
    && /no such file or directory|no such file/i.test(item.output)).length;
  const detailed = { read_only_simple: 0, write_or_mutation: 0, unresolved: 0, exit_success: 0, exit_failure: 0, exit_unavailable: 0, nonzero_events_with_stderr_suppression_syntax: 0 };
  let mappedRelevantEvents = 0;
  for (const [id, item] of relevant) {
    const mapped = correlation.matchedItems.has(id);
    if (mapped) mappedRelevantEvents += 1;
    const plan = mapped ? commandPlan(item.command, fixture, cellDir) : { kind: 'unresolved' };
    detailed[plan.kind] += 1;
    if (item.exit_code === 0) detailed.exit_success += 1;
    else if (typeof item.exit_code === 'number') detailed.exit_failure += 1;
    else detailed.exit_unavailable += 1;
    if (typeof item.exit_code === 'number' && item.exit_code !== 0 && /2>\s*\/dev\/null/.test(item.command)) detailed.nonzero_events_with_stderr_suppression_syntax += 1;
  }
  const fileEvidence = fileChangeFixtureCount(events.fileChanges, fixture);
  const hasUnclassifiedShared = otherRefs > 0;
  const unresolved = detailed.unresolved > 0 || detailed.write_or_mutation > 0 || detailed.exit_unavailable > 0
    || detailed.exit_failure > 0 || targetRefs.some((ref) => typeof ref.with !== 'string') || hasUnclassifiedShared
    || targetRefs.length > 0 && (relevant.length === 0 || mappedRelevantEvents < relevant.length);
  const successfulSimpleReads = relevant.filter(([id, item]) => correlation.matchedItems.has(id)
    && item.exit_code === 0 && commandPlan(item.command, fixture, cellDir).kind === 'read_only_simple').length;
  return {
    task: safe(task, TASKS),
    variant: safe(variant, VARIANTS),
    model_family: safe(model, MODELS),
    repeat: /^\d+$/.test(repeat ?? '') && Number(repeat) <= 9 ? Number(repeat) : null,
    official_status: safe(isolationEntry?.status, STATUSES),
    official_shared_pair_references: shared.length,
    expected_fixture_pair_references: targetRefs.length,
    other_or_unrecognized_shared_references: otherRefs,
    provenance_tmp_jail: provenance?.tmpJail === true ? true : provenance?.tmpJail === false ? false : null,
    command_evidence: {
      fixture_path_mention_command_items: relevant.length,
      relevant_items_mapped_to_rollout_calls: mappedRelevantEvents,
      actual_event_records_for_commands: events.commandRecords,
      unique_command_execution_items: events.commands.size,
      successful_simple_read_command_items: successfulSimpleReads,
      ...detailed,
    },
    log_evidence: {
      stderr_file_present: fs.existsSync(stderrFile),
      stderr_mentions_cell_local_fixture_path: localPathEvidence(stderr),
      stderr_reports_cell_local_fixture_missing: missingEvidence,
      tmp_rewrites_file_present: fs.existsSync(rewriteFile),
      tmp_rewrites_mentions_cell_local_fixture_path: localPathEvidence(rewrites),
      command_aggregate_output_items_mentioning_fixture: aggregateOutputFixture,
      command_aggregate_output_items_reporting_fixture_missing: aggregateOutputMissing,
      command_aggregate_output_items_with_cell_local_fixture_path: aggregateOutputCellLocal,
      command_aggregate_output_items_with_cell_local_fixture_missing: aggregateOutputCellLocalMissing,
      file_change_items_mentioning_fixture: fileEvidence.items,
      file_change_paths_mentioning_fixture: fileEvidence.paths,
    },
    sensitivity_classification: unresolved ? 'unresolved'
      : (successfulSimpleReads ? 'read_only_command_success_observed' : (targetRefs.length ? 'unresolved' : 'not_applicable')),
    _route_closure: correlation.summary,
  };
}

function main() {
  const runDir = process.argv[2];
  const fixture = process.argv[3] ?? process.env.AUDIT_PRIVATE_FIXTURE;
  const base = { schema_version: 1, semantics: {
    tool_call_refs: 'Unique raw rollout exec tool-call records; not API requests.',
    command_execution_items: 'Unique CommandExecution item IDs after folding started/completed records. One item can contain a compound shell command, so its exit code is event-level and does not prove each segment succeeded.',
      correlation: 'A raw tool-call reference is matched through extracted static shell command arguments and unique canonical command text. One compound CommandExecution item can cover multiple shell segments; missing or repeated matches remain unresolved.',
    successful_read: 'Only an actual mapped CommandExecution item with a provably simple ls/rg/sed/cat path use and exit_code 0 can count as a successful read. Missing exit codes and compound/unknown commands are unresolved.',
      exit_code: 'exit_success and exit_failure count event-level codes. A nonzero event containing stderr-suppression syntax does not identify which shell segment failed.',
    shell_processes: 'Operating-system shell process counts are not recorded.',
    isolation: 'This is a separate sensitivity analysis of the existing isolation.json. It does not replace or rewrite official verdicts and never infers clean from silence.',
    privacy: 'Raw paths, fixture name, cell IDs, commands, outputs, task text, and identities are omitted.',
  } };
  if (!runDir || typeof fixture !== 'string' || !/^[A-Za-z0-9._-]+$/.test(fixture) || fixture === '.' || fixture === '..') {
    process.stdout.write(`${JSON.stringify({ ...base, error: 'missing_or_invalid_input' })}\n`);
    process.exitCode = 2;
    return;
  }
  const root = path.resolve(runDir);
  const cellsDir = path.join(root, 'cells');
  const official = jsonFile(path.join(root, 'isolation.json'));
  if (!fs.existsSync(cellsDir) || !fs.statSync(cellsDir).isDirectory() || !official || typeof official !== 'object') {
    process.stdout.write(`${JSON.stringify({ ...base, error: 'invalid_run_data' })}\n`);
    process.exitCode = 2;
    return;
  }
  const officialEntries = Object.entries(official);
  const counts = { clean: 0, shared: 0, crossed: 0, stale: 0, other: 0 };
  for (const [, entry] of officialEntries) counts[safe(entry?.status, STATUSES)] += 1;
  const byCell = [];
  const inventory = { raw_isolation_cells: officialEntries.length, cell_metadata_rows: 0, cells_with_shared_references: 0, malformed_cells: 0 };
  for (const [cellId, entry] of officialEntries) {
    if (!Array.isArray(entry?.shared) || entry.shared.length === 0) continue;
    const cellDir = path.join(cellsDir, cellId);
    if (!fs.existsSync(path.join(cellDir, 'cell.txt'))) { inventory.malformed_cells += 1; continue; }
    inventory.cells_with_shared_references += 1;
    inventory.cell_metadata_rows += 1;
    try { byCell.push(summarizeCell(cellDir, cellId, entry, fixture)); }
    catch { inventory.malformed_cells += 1; }
  }
  const order = ['small', 'big', 'unknown', 'review', 'other'];
  const variantOrder = ['nokit', 'current', 'candidate', 'v4', 'v5', 'standard', 'complex', 'standard191', 'complex191', 'ownerreview', 'other'];
  byCell.sort((a, b) => order.indexOf(a.task) - order.indexOf(b.task)
    || variantOrder.indexOf(a.variant) - variantOrder.indexOf(b.variant)
    || (a.repeat ?? 99) - (b.repeat ?? 99)
    || a.model_family.localeCompare(b.model_family));
  const cells = [];
  const aggregate = {
    official_shared_pair_references: 0,
    expected_fixture_pair_references: 0,
    other_or_unrecognized_shared_references: 0,
    fixture_path_mention_command_items: 0,
    relevant_items_mapped_to_rollout_calls: 0,
    simple_readonly_command_items: 0,
    successful_simple_read_command_items: 0,
    write_or_mutation_command_items: 0,
    unresolved_command_items: 0,
    exit_success: 0,
    exit_failure: 0,
    exit_unavailable: 0,
    nonzero_events_with_stderr_suppression_syntax: 0,
    stderr_local_fixture_missing_cells: 0,
    command_aggregate_output_items_mentioning_fixture: 0,
    command_aggregate_output_items_reporting_fixture_missing: 0,
    command_aggregate_output_items_with_cell_local_fixture_path: 0,
    command_aggregate_output_items_with_cell_local_fixture_missing: 0,
    file_change_items_mentioning_fixture: 0,
    file_change_paths_mentioning_fixture: 0,
  };
  const routeClosure = {
    raw_exec_tool_call_refs: 0,
    refs_with_extracted_shell_commands: 0,
    refs_with_any_execution_match: 0,
    refs_fully_mapped: 0,
    refs_without_extracted_shell_commands: 0,
    refs_unmapped_or_ambiguous: 0,
    nested_exec_command_references: 0,
    extracted_static_command_arguments: 0,
    nested_calls_without_static_command_argument: 0,
    unresolved_command_correlations: 0,
    unique_command_execution_items: 0,
    command_items_matched_to_calls: 0,
    command_items_unmatched: 0,
  };
  for (const [i, cell] of byCell.entries()) {
    const { _route_closure: perCellRoute, ...publicCell } = cell;
    // Each cell is correlated independently; duplicate commands in other cells
    // must not make an otherwise unique local match appear ambiguous.
    for (const key of Object.keys(routeClosure)) routeClosure[key] += perCellRoute[key] ?? 0;
    cells.push({ cell_ordinal: i + 1, ...publicCell });
    aggregate.official_shared_pair_references += cell.official_shared_pair_references;
    aggregate.expected_fixture_pair_references += cell.expected_fixture_pair_references;
    aggregate.other_or_unrecognized_shared_references += cell.other_or_unrecognized_shared_references;
    for (const key of ['fixture_path_mention_command_items', 'relevant_items_mapped_to_rollout_calls', 'read_only_simple', 'successful_simple_read_command_items', 'write_or_mutation', 'unresolved', 'exit_success', 'exit_failure', 'exit_unavailable', 'nonzero_events_with_stderr_suppression_syntax']) {
      const target = key === 'read_only_simple' ? 'simple_readonly_command_items' : key === 'write_or_mutation' ? 'write_or_mutation_command_items' : key === 'unresolved' ? 'unresolved_command_items' : key;
      aggregate[target] += cell.command_evidence[key] ?? 0;
    }
    if (cell.log_evidence.stderr_reports_cell_local_fixture_missing) aggregate.stderr_local_fixture_missing_cells += 1;
    aggregate.command_aggregate_output_items_mentioning_fixture += cell.log_evidence.command_aggregate_output_items_mentioning_fixture;
    aggregate.command_aggregate_output_items_reporting_fixture_missing += cell.log_evidence.command_aggregate_output_items_reporting_fixture_missing;
    aggregate.command_aggregate_output_items_with_cell_local_fixture_path += cell.log_evidence.command_aggregate_output_items_with_cell_local_fixture_path;
    aggregate.command_aggregate_output_items_with_cell_local_fixture_missing += cell.log_evidence.command_aggregate_output_items_with_cell_local_fixture_missing;
    aggregate.file_change_items_mentioning_fixture += cell.log_evidence.file_change_items_mentioning_fixture;
    aggregate.file_change_paths_mentioning_fixture += cell.log_evidence.file_change_paths_mentioning_fixture;
  }
  process.stdout.write(`${JSON.stringify({
    ...base,
    inventory,
    official_verdict_summary: counts,
    route_closure: routeClosure,
    sensitivity_summary: aggregate,
    affected_cells: cells,
  })}\n`);
}

try { main(); } catch {
  process.stdout.write(`${JSON.stringify({ schema_version: 1, error: 'audit_failed' })}\n`);
  process.exitCode = 1;
}
