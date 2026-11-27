#!/usr/bin/env node
// Render paired Codex attempts from three verified public metrics/isolation bundles.
// Usage: node codex-comparison.mjs <controls-metrics> <controls-isolation>
//   <1.9.0-metrics> <1.9.0-isolation> <1.9.1-metrics> <1.9.1-isolation>
import fs from 'node:fs';

const TASKS = ['small', 'big', 'unknown', 'review'];
const REPEATS = [1, 2];
const MODELS = ['opus', 'sol'];
const STATUS = new Set(['clean', 'shared', 'crossed', 'stale']);
const RATE4 = { 'gpt-6.2-sol': [200, 10, 1000], 'gpt-6-luna': [10, 1, 50] };
const KEY = c => `${c.variant}|${c.task}|${c.model}|${c.repeat}`;
const finite = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;

function bundle(metricsFile, isolationFile, kind) {
  let metrics, isolation;
  try {
    metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
    isolation = JSON.parse(fs.readFileSync(isolationFile, 'utf8'));
  } catch { throw new Error('cannot read bundle'); }
  if (!Array.isArray(metrics?.cells) || !isolation || typeof isolation !== 'object' || Array.isArray(isolation)) {
    throw new Error('invalid bundle schema');
  }
  const specs = kind === 'controls'
    ? [{ variant: 'nokit', arm: 'No kit', primary: true }, { variant: 'current', arm: '1.8.1', primary: true }, { variant: 'candidate', excluded: true }]
    : kind === '1.9.0'
      ? [{ variant: 'standard', arm: 'Standard 1.9.0', primary: true }, { variant: 'complex', arm: 'Complex 1.9.0', taskOnly: 'big' }]
      : [{ variant: 'standard191', arm: 'Standard 1.9.1', primary: true }, { variant: 'complex191', arm: 'Complex 1.9.1', taskOnly: 'big' }];
  const expected = new Set();
  for (const s of specs) for (const task of (s.taskOnly ? [s.taskOnly] : TASKS))
    for (const model of MODELS) for (const repeat of REPEATS) expected.add(`${s.variant}|${task}|${model}|${repeat}`);
  if (metrics.cells.length !== expected.size) throw new Error('unexpected source cell count');
  const arms = new Map(specs.map(s => [s.variant, s]));
  const seen = new Set(), rows = [];
  for (const c of metrics.cells) {
    const key = KEY(c);
    if (!expected.has(key) || seen.has(key) || c.id !== `${c.task}-${c.variant}-${c.model}-r${c.repeat}`) {
      throw new Error('unexpected, duplicate, or mismatched cell');
    }
    seen.add(key);
    const spec = arms.get(c.variant);
    if (c.model !== 'sol' || spec.excluded) continue;
    if (!finite(c.wallSeconds) || !Number.isInteger(c.exitCode)) throw new Error('missing elapsed time or exit code');
    const verdict = isolation[c.id]?.status;
    if (!STATUS.has(verdict)) throw new Error('missing isolation verdict');
    if (!Array.isArray(c.actors) || c.actors.length === 0) throw new Error('missing actor inventory');
    let weighted4 = 0, root = null, roots = 0;
    const actorTotals = { requests: 0, input: 0, cacheRead: 0, output: 0 };
    for (const a of c.actors) {
      const rate = RATE4[a?.model];
      if (!a || !rate || typeof a.role !== 'string') throw new Error('invalid actor inventory');
      for (const k of ['input', 'cacheRead', 'output', 'requests']) {
        if (!Number.isSafeInteger(a[k]) || a[k] < 0) throw new Error('invalid actor usage');
        actorTotals[k] += a[k];
        if (!Number.isSafeInteger(actorTotals[k])) throw new Error('actor totals out of range');
      }
      weighted4 += a.input * rate[0] + a.cacheRead * rate[1] + a.output * rate[2];
      if (!Number.isSafeInteger(weighted4)) throw new Error('actor totals out of range');
      if (a.role === 'cooperator') { root = a; roots += 1; }
    }
    if (roots !== 1 || root.model !== 'gpt-6.2-sol') throw new Error('invalid pinned cooperator');
    if (!c.totals || !Number.isSafeInteger(c.totals.agents) || c.totals.agents < 0
        || c.totals.agents !== c.actors.length - 1
        || !['requests', 'input', 'cacheRead', 'output'].every(k => Number.isSafeInteger(c.totals[k])
          && c.totals[k] >= 0 && c.totals[k] === actorTotals[k])) {
      throw new Error('actor totals do not match canonical metrics totals');
    }
    if (!c.quality || !['да', 'нет'].includes(c.quality['Контракт выполнен'] ?? c.quality['Решено'])
        || !Number.isSafeInteger(c.quality['Коммитов']) || c.quality['Коммитов'] < 0
        || !Number.isSafeInteger(c.quality['Незакоммичено файлов']) || c.quality['Незакоммичено файлов'] < 0) {
      throw new Error('missing original quality fields');
    }
    const passedDelivered = c.exitCode === 0 && root.model === 'gpt-6.2-sol' && root.requests > 0
      && (c.quality['Контракт выполнен'] ?? c.quality['Решено']) === 'да'
      && c.quality['Коммитов'] > 0 && c.quality['Незакоммичено файлов'] === 0;
    rows.push({ arm: spec.arm, primary: !!spec.primary, task: c.task, repeat: c.repeat, weighted4,
      credits: weighted4 / 4e6, wall: c.wallSeconds, passedDelivered, isolation: verdict });
  }
  if (seen.size !== expected.size) throw new Error('missing required cells');
  return rows;
}

function money(weighted4) { return (weighted4 / 4e6).toFixed(2); }
function seconds(n) { return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))); }
function summary(rows) {
  const weighted = rows.reduce((n, r) => n + r.weighted4, 0);
  const delivered = rows.filter(r => r.passedDelivered).length;
  return { attempts: rows.length, isolationClean: rows.filter(r => r.isolation === 'clean').length, delivered,
    weighted, wall: rows.reduce((n, r) => n + r.wall, 0), perDelivered: delivered ? money(weighted / delivered) : '—' };
}

function render(args) {
  const rows = [
    ...bundle(args[0], args[1], 'controls'),
    ...bundle(args[2], args[3], '1.9.0'),
    ...bundle(args[4], args[5], '1.9.1'),
  ];
  const primaryArms = ['No kit', '1.8.1', 'Standard 1.9.0', 'Standard 1.9.1'];
  const complexArms = ['Complex 1.9.0', 'Complex 1.9.1'];
  const out = [
    '# Codex 6.2 consumption comparison', '',
    'Credits use the measured input, cacheRead, and output tokens of every Codex actor. Rates per million are 50/2.5/250 for GPT-6.2 Sol and 2.5/0.25/12.5 for GPT-6 Luna; totals are summed before display rounding. Wall seconds are summed across task attempts and do not represent parallel batch elapsed time.', '',
    '“Pass + delivered” follows the existing credits calculation: exit code 0, a GPT-6.2 Sol cooperator with requests, contract passed, at least one commit, and no uncommitted files. The credits per delivery column divides the spend of every finalized cell, including failed cells, by the number of delivered results. Infrastructure-interrupted attempts stopped before finalization. The [main report](REPORT.md) includes their measured usage and recalculates spend per delivery across all starts. The official isolation-clean attempt count is reported separately; per-attempt verdicts are shown below.', '',
    '## Matched Standard arms (8 Codex attempts each; four tasks × two repeats)', '',
    '| Arm | Attempts | Original pass + delivered | Official isolation-clean attempts | Credits in finalized cells | Finalized-cell credits / delivery | Wall seconds summed across tasks |',
    '|---|---:|---:|---:|---:|---:|---:|',
  ];
  for (const arm of primaryArms) {
    const s = summary(rows.filter(r => r.arm === arm));
    out.push(`| ${arm} | ${s.attempts} | ${s.delivered} | ${s.isolationClean} | ${money(s.weighted)} | ${s.perDelivered} | ${seconds(s.wall)} |`);
  }
  out.push('', '## Matched Standard attempts', '', '| Arm | Task | Repeat | Credits (all Codex actors) | Wall seconds | Pass + delivered | Official isolation |', '|---|---|---:|---:|---:|---|---|');
  for (const arm of primaryArms) for (const task of TASKS) for (const repeat of REPEATS) {
    const r = rows.find(x => x.arm === arm && x.task === task && x.repeat === repeat);
    if (!r) throw new Error('missing matched attempt');
    out.push(`| ${arm} | ${task} | r${repeat} | ${money(r.weighted4)} | ${seconds(r.wall)} | ${r.passedDelivered ? 'yes' : 'no'} | ${r.isolation} |`);
  }
  out.push('', '## Complex arms (two extra big-task attempts each; separate from matched Standard arms)', '',
    '| Arm | Attempts | Original pass + delivered | Official isolation-clean attempts | Credits in finalized cells | Finalized-cell credits / delivery | Wall seconds across big attempts |',
    '|---|---:|---:|---:|---:|---:|---:|');
  for (const arm of complexArms) {
    const s = summary(rows.filter(r => r.arm === arm));
    if (s.attempts !== 2) throw new Error('invalid Complex attempt count');
    out.push(`| ${arm} | ${s.attempts} | ${s.delivered} | ${s.isolationClean} | ${money(s.weighted)} | ${s.perDelivered} | ${seconds(s.wall)} |`);
  }
  out.push('', '| Arm | Task | Repeat | Credits (all Codex actors) | Wall seconds | Pass + delivered | Official isolation |', '|---|---|---:|---:|---:|---|---|');
  for (const arm of complexArms) for (const repeat of REPEATS) {
    const r = rows.find(x => x.arm === arm && x.task === 'big' && x.repeat === repeat);
    if (!r) throw new Error('missing Complex attempt');
    out.push(`| ${arm} | big | r${repeat} | ${money(r.weighted4)} | ${seconds(r.wall)} | ${r.passedDelivered ? 'yes' : 'no'} | ${r.isolation} |`);
  }
  return `${out.join('\n')}\n`;
}

const args = process.argv.slice(2);
if (args.length !== 6) {
  process.stderr.write('usage: codex-comparison.mjs <controls-metrics> <controls-isolation> <1.9.0-metrics> <1.9.0-isolation> <1.9.1-metrics> <1.9.1-isolation>\n');
  process.exitCode = 2;
} else {
  try { process.stdout.write(render(args)); }
  catch { process.stderr.write('codex-comparison: invalid or incomplete verified bundle\n'); process.exitCode = 1; }
}
