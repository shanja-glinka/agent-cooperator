#!/usr/bin/env node
// The no-kit baseline of a bench run: what each model does on each task without the kit, at what
// cost, and how it worked (alone or with agents). Every kit version is compared with these numbers.
// usage: baseline.mjs <run-dir>   writes BASELINE.md and baseline.json
import fs from 'node:fs';
import path from 'node:path';
import { loadRun } from './load.mjs';

const out = process.argv[2];
// The run's cells with their isolation status, and the cells it takes from an earlier run.
const data = loadRun(out);
const k = (n) => (n == null || Number.isNaN(n) ? '—' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Number.isInteger(n) || n >= 100 ? String(Math.round(n)) : n.toFixed(1));
const tm = (s) => (s == null || Number.isNaN(s) ? '—' : `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`);
const METRICS = [
  ['Время', (c) => c.wallSeconds, tm], ['Агентов', (c) => c.totals.agents, k], ['Вызовы инструментов', (c) => c.totals.toolCalls, k],
  ['Запросы к модели', (c) => c.totals.requests, k], ['Вход без кэша', (c) => c.totals.input, k], ['Запись в кэш', (c) => c.totals.cacheWrite, k],
  ['Чтение кэша', (c) => c.totals.cacheRead, k], ['Вход всего', (c) => c.totals.inputTotal, k],
  ['Вход на запрос', (c) => (c.totals.requests ? c.totals.inputTotal / c.totals.requests : null), k],
  ['Выход', (c) => c.totals.output, k], ['Мышление', (c) => c.totals.thinking, k],
];
const stat = (vals) => (vals.length && vals.every((v) => v != null) ? { mean: vals.reduce((a, b) => a + b, 0) / vals.length, min: Math.min(...vals), max: Math.max(...vals) } : null);
const show = (s, fmt) => (!s ? '—' : s.min === s.max ? fmt(s.mean) : `${fmt(s.mean)} (${fmt(s.min)}–${fmt(s.max)})`);
const route = (c) => {
  const agents = c.actors.filter((a) => a.role !== 'cooperator');
  if (!agents.length) return 'сам';
  const counts = {};
  for (const a of agents) { const key = `${a.role} ${a.model ?? ''}`.trim(); counts[key] = (counts[key] ?? 0) + 1; }
  return `сам + ${Object.entries(counts).map(([r, n]) => (n > 1 ? `${n}× ${r}` : r)).join(', ')}`;
};
const modelName = (m) => (m === 'opus' ? 'Opus 5.5 (Claude Code)' : m === 'sol' ? 'GPT-6.1 Sol (Codex)' : m);
const cell = (v) => String(v).replace(/\|/g, '\\|');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n');

const base = data.cells.filter((c) => c.variant === 'nokit');
// Tasks in the suite's order, as bench.sh recorded it.
const order = fs.existsSync(path.join(out, 'tasks.txt')) ? fs.readFileSync(path.join(out, 'tasks.txt'), 'utf8').split('\n').filter(Boolean) : [];
const tasks = [...new Set(base.map((c) => c.task))].sort((a, b) => (order.indexOf(a) + 1 || 1e9) - (order.indexOf(b) + 1 || 1e9));
const models = [...new Set(base.map((c) => c.model))];
const json = { run: data.run, suite: data.suite, tasks: {} };
const md = [`# База без кита: ${data.run}`, '',
  'Что модели делают на задачах набора без кита — фактический результат, с которым сравнивается любая версия кита. Каждая ячейка — отдельный чистый репозиторий, одна и та же формулировка задачи, повторы подряд в одном прогоне. Числа: среднее (мин–макс) по повторам; качество — значение каждого повтора по порядку.', ''];
for (const task of tasks) {
  json.tasks[task] = {};
  const groups = models.map((m) => base.filter((c) => c.task === task && c.model === m).sort((a, b) => a.repeat - b.repeat));
  const qkeys = [...new Set(groups.flat().flatMap((c) => Object.keys(c.quality ?? {})))];
  const rows = [
    ['Повторов', ...groups.map((cs) => cs.length)],
    ...qkeys.map((q) => [q, ...groups.map((cs) => cs.map((c) => String(c.quality?.[q] ?? '—')).join(' · '))]),
    ['Как работала', ...groups.map((cs) => cs.map(route).join(' · '))],
    ...METRICS.map(([title, get, fmt]) => [title, ...groups.map((cs) => show(stat(cs.map(get)), fmt))]),
  ];
  md.push(`## ${task}`, '', table(['', ...models.map(modelName)], rows), '');
  models.forEach((m, i) => {
    const cs = groups[i];
    json.tasks[task][m] = {
      repeats: cs.length,
      quality: Object.fromEntries(qkeys.map((q) => [q, cs.map((c) => c.quality?.[q] ?? null)])),
      routes: cs.map(route),
      metrics: Object.fromEntries(METRICS.map(([title, get]) => [title, stat(cs.map(get))])),
      cells: cs.map((c) => c.id),
    };
  });
}
fs.writeFileSync(path.join(out, 'BASELINE.md'), md.join('\n'));
fs.writeFileSync(path.join(out, 'baseline.json'), JSON.stringify(json, null, 1));
console.log(`baseline: ${base.length} no-kit cells -> ${path.join(out, 'BASELINE.md')}`);
