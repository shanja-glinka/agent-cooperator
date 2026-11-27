#!/usr/bin/env node
// Render the Claude Opus comparison from verified public metrics and official isolation data.
// Usage:
//   node claude-comparison.mjs <controls-metrics.json> <controls-isolation.json>
//     <1.9.0-metrics.json> <1.9.0-isolation.json>
//     [<1.9.1-metrics.json> <1.9.1-isolation.json>]
// The optional third bundle must use standard191 / complex191 labels. No raw rollout,
// task text, cell ID, source path, or auxiliary behavior file is read or emitted.
import fs from 'node:fs';

const TASKS = ['small', 'big', 'unknown', 'review'];
const REPEATS = [1, 2];
const MODELS = ['opus', 'sol'];
const ISO = new Set(['clean', 'shared', 'crossed', 'stale']);
const REVIEWER_MODEL = 'gpt-6.2-sol';
const REVIEWER_RATES = { input: 50, cacheRead: 2.5, output: 250 };
const keyOf = ({ task, variant, model, repeat }) => `${task}|${variant}|${model}|${repeat}`;
const num = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function fail(message) {
  process.stderr.write(`claude-comparison: ${message}\n`);
  process.exitCode = 2;
}

function describeBundle(metricsFile, isolationFile, kind) {
  let metrics;
  let isolation;
  try {
    metrics = readJson(metricsFile);
    isolation = readJson(isolationFile);
  } catch {
    throw new Error('Could not read a metrics or isolation input.');
  }
  if (!Array.isArray(metrics?.cells) || !isolation || typeof isolation !== 'object' || Array.isArray(isolation)) {
    throw new Error('Input does not match the public metrics/isolation schema.');
  }

  const specs = kind === 'controls'
    ? [
      { variant: 'nokit', release: 'Без кита', label: 'nokit', tasks: TASKS },
      { variant: 'current', release: '1.8.1', label: 'current', tasks: TASKS },
    ]
    : kind === '1.9.0'
      ? [
        { variant: 'standard', release: '1.9.0', label: 'Standard', tasks: TASKS },
        { variant: 'complex', release: '1.9.0', label: 'Complex', tasks: ['big'] },
      ]
      : [
        { variant: 'standard191', release: '1.9.1', label: 'Standard', tasks: TASKS },
        { variant: 'complex191', release: '1.9.1', label: 'Complex', tasks: ['big'] },
      ];

  const expected = [];
  for (const spec of specs) for (const task of spec.tasks) for (const repeat of REPEATS) {
    for (const model of MODELS) expected.push({ ...spec, task, repeat, model });
  }
  const expectedKeys = new Set(expected.map(keyOf));
  const selectedVariants = new Set(specs.map((s) => s.variant));
  const selected = metrics.cells.filter((c) => selectedVariants.has(c.variant));
  const buckets = new Map();
  let unexpectedSelected = 0;
  for (const cell of selected) {
    const key = keyOf(cell);
    if (!expectedKeys.has(key)) { unexpectedSelected += 1; continue; }
    const list = buckets.get(key) ?? [];
    list.push(cell);
    buckets.set(key, list);
  }

  let missing = 0;
  let duplicates = 0;
  let missingIsolation = 0;
  let missingContract = 0;
  let missingWallTime = 0;
  let missingColdPrice = 0;
  let missingReviewerUsage = 0;
  const cells = [];
  for (const wanted of expected) {
    const rows = buckets.get(keyOf(wanted)) ?? [];
    if (rows.length === 0) missing += 1;
    if (rows.length > 1) duplicates += 1;
    const cell = rows.length === 1 ? rows[0] : null;
    const isoStatus = cell ? isolation[cell.id]?.status : null;
    if (cell && !ISO.has(isoStatus)) missingIsolation += 1;
    if (wanted.model === 'opus') {
      if (cell && contractPassed(cell) === null) missingContract += 1;
      if (cell && num(cell.wallSeconds) === null) missingWallTime += 1;
      if (cell && coldUsd(cell) === null) missingColdPrice += 1;
      if (cell && !reviewerUsage(cell)?.valid) missingReviewerUsage += 1;
      cells.push({ ...wanted, cell, isolation: ISO.has(isoStatus) ? isoStatus : 'missing' });
    }
  }

  const sourceCountExpected = kind === 'controls' ? 48 : 20;
  const candidateCount = kind === 'controls' ? metrics.cells.filter((c) => c.variant === 'candidate').length : 0;
  const totalRowsValid = metrics.cells.length === sourceCountExpected;
  const candidateValid = kind !== 'controls' || candidateCount === 16;
  const complete = totalRowsValid && candidateValid && selected.length === expected.length
    && missing === 0 && duplicates === 0 && unexpectedSelected === 0 && missingIsolation === 0
    && missingContract === 0 && missingWallTime === 0 && missingColdPrice === 0 && missingReviewerUsage === 0;

  return {
    kind,
    cells,
    completeness: {
      expected_selected_cells: expected.length,
      observed_selected_cells: selected.length,
      source_cells: metrics.cells.length,
      expected_source_cells: sourceCountExpected,
      excluded_candidate_cells: candidateCount,
      missing_cells: missing,
      duplicate_keys: duplicates,
      unexpected_selected_cells: unexpectedSelected,
      missing_isolation_verdicts: missingIsolation,
      missing_contract_values: missingContract,
      missing_wall_times: missingWallTime,
      missing_cold_prices: missingColdPrice,
      invalid_reviewer_usage: missingReviewerUsage,
      complete,
    },
  };
}

function contractPassed(cell) {
  const value = cell?.quality?.['Контракт выполнен'] ?? cell?.quality?.['Решено'];
  return value === 'да' ? true : value === 'нет' ? false : null;
}

function coldUsd(cell) {
  return num(cell?.totals?.usdCold);
}

function reviewerUsage(cell) {
  if (!cell) return null;
  const inventory = cell.actors;
  if (!Array.isArray(inventory) || inventory.length === 0) return { requests: null, credits: null, valid: false };
  for (const actor of inventory) {
    if (!actor || typeof actor !== 'object' || Array.isArray(actor)
        || typeof actor.role !== 'string' || typeof actor.model !== 'string') {
      return { requests: null, credits: null, valid: false };
    }
    for (const field of ['requests', 'input', 'cacheRead', 'output']) {
      if (num(actor[field]) === null) return { requests: null, credits: null, valid: false };
    }
  }
  const actors = inventory.filter((a) => a.role === 'reviewer' && a.model === REVIEWER_MODEL);
  if (!actors.length) return { requests: 0, credits: 0, valid: true };
  let requests = 0;
  let input = 0;
  let cacheRead = 0;
  let output = 0;
  for (const actor of actors) {
    requests += actor.requests; input += actor.input; cacheRead += actor.cacheRead; output += actor.output;
  }
  const credits = (input * REVIEWER_RATES.input + cacheRead * REVIEWER_RATES.cacheRead + output * REVIEWER_RATES.output) / 1e6;
  return { requests, credits, valid: true };
}

function seconds(value) {
  const n = num(value);
  if (n === null) return '—';
  const rounded = Math.round(n);
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function usd(value) { return num(value) === null ? '—' : `$${value.toFixed(4)}`; }
function credits(value) { return num(value) === null ? '—' : value.toFixed(2); }
function md(value) { return String(value ?? '').replaceAll('|', '\\|').replace(/[\r\n]+/g, ' '); }

function rowFor(cellRecord) {
  const c = cellRecord.cell;
  const reviewer = reviewerUsage(c);
  return {
    ...cellRecord,
    contract: c ? contractPassed(c) : null,
    wall: c ? num(c.wallSeconds) : null,
    cold: c ? coldUsd(c) : null,
    reviewer,
  };
}

function groupsFrom(bundles) {
  return bundles.flatMap((bundle) => bundle.cells.map(rowFor));
}

function summarize(rows) {
  const keys = [];
  for (const row of rows) {
    const key = `${row.release}|${row.label}|${row.task}`;
    if (!keys.includes(key)) keys.push(key);
  }
  return keys.map((key) => {
    const group = rows.filter((r) => `${r.release}|${r.label}|${r.task}` === key);
    const observed = group.filter((r) => r.cell);
    const passed = observed.filter((r) => r.contract === true).length;
    const times = observed.map((r) => r.wall).filter((v) => v !== null);
    const prices = observed.map((r) => r.cold);
    const reviewerRows = observed.map((r) => r.reviewer);
    const isoCounts = { clean: 0, shared: 0, crossed: 0, stale: 0, missing: 0 };
    for (const row of group) isoCounts[row.isolation] += 1;
    const creditsValid = reviewerRows.length > 0 && reviewerRows.every((r) => r?.valid);
    return {
      release: group[0].release,
      label: group[0].label,
      task: group[0].task,
      expected: REPEATS.length,
      observed: observed.length,
      passed,
      timeMean: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
      timeMin: times.length ? Math.min(...times) : null,
      timeMax: times.length ? Math.max(...times) : null,
      coldUsd: prices.length && prices.every((v) => v !== null) ? prices.reduce((a, b) => a + b, 0) : null,
      reviewerRequests: creditsValid ? reviewerRows.reduce((n, r) => n + (r?.requests ?? 0), 0) : null,
      reviewerCredits: creditsValid ? reviewerRows.reduce((n, r) => n + (r?.credits ?? 0), 0) : null,
      isoCounts,
    };
  });
}

function render(bundles) {
  const rows = groupsFrom(bundles);
  const summaries = summarize(rows);
  const incomplete = bundles.filter((b) => !b.completeness.complete);
  const out = [];
  out.push('# Claude Opus: стоимость и качество по повтору', '');
  out.push('Cold-start USD — benchmark list-price estimate for all actors, including recorded GPT-6.2 Sol reviewers. Sol USD uses the benchmark GPT-6.1 price proxy. Reviewer credits are a separate unit, computed as noncached input × 50 + cacheRead × 2.5 + output × 250 per million tokens; these credits are not added to USD.', '');
  out.push('Isolation is taken from the separate official isolation.json. Missing verdicts and missing repeats are shown explicitly; no row is treated as clean by default. Reviewer usage below comes only from public metrics actors with role `reviewer` and model `gpt-6.2-sol`; no auxiliary behavior file is read.', '');
  out.push('## Completeness', '');
  out.push('| Bundle | Selected cells | Source cells | Excluded candidate cells | Missing | Duplicates | Unexpected | Missing isolation | Missing contract/wall/price/reviewer | Result |');
  out.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---|');
  for (const b of bundles) {
    const c = b.completeness;
    const missingValues = c.missing_contract_values + c.missing_wall_times + c.missing_cold_prices + c.invalid_reviewer_usage;
    out.push(`| ${md(b.kind)} | ${c.observed_selected_cells}/${c.expected_selected_cells} | ${c.source_cells}/${c.expected_source_cells} | ${c.excluded_candidate_cells} | ${c.missing_cells} | ${c.duplicate_keys} | ${c.unexpected_selected_cells} | ${c.missing_isolation_verdicts} | ${missingValues} | ${c.complete ? 'complete' : 'INCOMPLETE'} |`);
  }
  out.push('', '## Repeats summary', '');
  out.push('| Task | Release | Variant | Contract passes / repeats | Repeats observed | Wall time mean (range) | Cold-start USD sum (repeats, all actors) | Sol reviewer requests sum (repeats) | Sol reviewer credits sum (repeats) | Isolation (repeats) |');
  out.push('|---|---|---|---:|---:|---:|---:|---:|---:|---|');
  for (const s of summaries) {
    const wall = s.timeMean === null ? '—' : `${seconds(s.timeMean)} (${seconds(s.timeMin)}–${seconds(s.timeMax)})`;
    const iso = Object.entries(s.isoCounts).filter(([, n]) => n > 0).map(([k, n]) => `${k} ${n}`).join(', ');
    out.push(`| ${md(s.task)} | ${md(s.release)} | ${md(s.label)} | ${s.passed}/${s.expected} | ${s.observed}/${s.expected} | ${wall} | ${usd(s.coldUsd)} | ${s.reviewerRequests ?? '—'} | ${credits(s.reviewerCredits)} | ${iso || '—'} |`);
  }
  out.push('', '## Claude cell details', '');
  out.push('| Task | Release | Variant | Repeat | Contract | Wall time | Cold-start USD | GPT-6.2 Sol reviewer requests | Reviewer credits | Isolation |');
  out.push('|---|---|---|---:|---|---:|---:|---:|---:|---|');
  for (const r of rows) {
    out.push(`| ${md(r.task)} | ${md(r.release)} | ${md(r.label)} | ${r.repeat} | ${r.cell ? (r.contract === true ? 'Да' : r.contract === false ? 'Нет' : 'unknown') : 'missing cell'} | ${seconds(r.wall)} | ${usd(r.cold)} | ${r.reviewer?.requests ?? '—'} | ${credits(r.reviewer?.credits)} | ${md(r.isolation)} |`);
  }
  return { text: `${out.join('\n')}\n`, incomplete: incomplete.length > 0 };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 4 && args.length !== 6) {
    fail('usage: claude-comparison.mjs <controls-metrics> <controls-isolation> <1.9.0-metrics> <1.9.0-isolation> [<1.9.1-metrics> <1.9.1-isolation>]');
    return;
  }
  try {
    const bundles = [
      describeBundle(args[0], args[1], 'controls'),
      describeBundle(args[2], args[3], '1.9.0'),
    ];
    if (args.length === 6) bundles.push(describeBundle(args[4], args[5], '1.9.1'));
    const result = render(bundles);
    process.stdout.write(result.text);
    if (result.incomplete) process.exitCode = 1;
  } catch {
    fail('input could not be validated; no private path or record was emitted');
  }
}

main();
