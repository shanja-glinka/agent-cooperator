#!/usr/bin/env node
// Writes METRICS.md (every metric, every variant) and COMPARISON.md (no kit | previous | new,
// with deltas) for a bench run, and prints the comparison.
// usage: report.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2];
const data = JSON.parse(fs.readFileSync(path.join(out, 'metrics.json'), 'utf8'));
const names = data.variants.map((v) => v.split('=')[0]);
const kits = names.filter((n) => n !== 'nokit');
const [prev, next] = [kits.at(-2), kits.at(-1)];
const label = (n) => (n === 'nokit' ? 'Без кита' : n);
const k = (n) => (n == null || Number.isNaN(n) ? '—' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Number.isInteger(n) || n >= 100 ? String(Math.round(n)) : n.toFixed(1));
const tm = (s) => (s == null || Number.isNaN(s) ? '—' : `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`);
const ROWS = [
  ['Время', (c) => c.wallSeconds, tm], ['Агентов', (c) => c.totals.agents, k],
  ['Вызовы инструментов: кооператор', (c) => c.totals.toolCallsCooperator, k], ['Вызовы инструментов: агенты', (c) => c.totals.toolCallsAgents, k],
  ['Вызовы инструментов', (c) => c.totals.toolCalls, k], ['Запросы к модели', (c) => c.totals.requests, k],
  ['Вход без кэша', (c) => c.totals.input, k], ['Запись в кэш', (c) => c.totals.cacheWrite, k], ['Чтение кэша', (c) => c.totals.cacheRead, k],
  ['Вход всего', (c) => c.totals.inputTotal, k], ['Вход на запрос', (c) => (c.totals.requests ? c.totals.inputTotal / c.totals.requests : null), k],
  ['Выход', (c) => c.totals.output, k], ['Мышление', (c) => c.totals.thinking, k],
  ['Handoff', (c) => c.handoffs, k], ['Сообщения агентам', (c) => c.messagesToAgents, k], ['Сообщения от агентов', (c) => c.messagesFromAgents, k],
  ['sleep / wait_agent', null, null], ['Чтений файлов кита', (c) => Object.values(c.kitFiles).reduce((a, b) => a + b, 0), k],
];
const cellsOf = (task, model, name) => data.cells.filter((c) => c.task === task && c.model === model && c.variant === name);
const mean = (vals) => (vals.length && vals.every((v) => v != null) ? vals.reduce((a, b) => a + b, 0) / vals.length : null);
const show = (cs, get, fmt) => {
  const vals = cs.map(get);
  const m = mean(vals);
  if (m == null) return '—';
  const [lo, hi] = [Math.min(...vals), Math.max(...vals)];
  return vals.length > 1 && lo !== hi ? `${fmt(m)} (${fmt(lo)}–${fmt(hi)})` : fmt(m);
};
const delta = (a, b) => {
  if (a == null || b == null) return '—';
  if (b === 0) return a === 0 ? 'без изм.' : `+${k(a)}`;
  const p = Math.round(((a - b) / b) * 100);
  return Math.abs(p) < 5 ? 'без изм.' : `${p > 0 ? '+' : ''}${p}%`;
};
const qualityRows = (cs) => [...new Set(cs.flatMap((c) => Object.keys(c.quality ?? {})))];
const cell = (v) => String(v).replace(/\|/g, '\\|');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n');
// Tasks in the suite's order, as bench.sh recorded it.
const order = fs.existsSync(path.join(out, 'tasks.txt')) ? fs.readFileSync(path.join(out, 'tasks.txt'), 'utf8').split('\n').filter(Boolean) : [];
const tasks = [...new Set(data.cells.map((c) => c.task))].sort((a, b) => (order.indexOf(a) + 1 || 1e9) - (order.indexOf(b) + 1 || 1e9));
const models = [...new Set(data.cells.map((c) => c.model))];
const modelName = (m) => (m === 'opus' ? 'Opus 5.5' : m === 'sol' ? 'GPT-6.1 Sol' : m);

const metrics = [`# Метрики: ${data.run}`, '', `Варианты: ${data.variants.join(', ')}. Полные данные — metrics.json. Codex не отдаёт запись в кэш (—). При нескольких повторах — среднее (мин–макс).`, ''];
const comparison = [`# Сравнение: ${data.run}`, '', `Без кита | ${prev ?? '—'} | ${next}. Разница в процентах; в пределах ±5% — «без изм.». При нескольких повторах — среднее (мин–макс).`, ''];
for (const task of tasks) for (const model of models) {
  const groups = names.map((n) => cellsOf(task, model, n));
  const qkeys = qualityRows(groups.flat());
  const rowsAll = ROWS.map(([title, get, fmt]) => (get
    ? [title, ...groups.map((cs) => (cs.length ? show(cs, get, fmt) : '—'))]
    : [title, ...groups.map((cs) => cs.map((c) => `${c.waits.sleep}/${c.waits.wait_agent}`).join(' · ') || '—')]));
  for (const q of qkeys) rowsAll.push([q, ...groups.map((cs) => cs.map((c) => String(c.quality?.[q] ?? '—')).join(' · ') || '—')]);
  metrics.push(`## ${task} — ${modelName(model)}`, '', table(['Метрика', ...names.map(label)], rowsAll), '');

  if (!next) continue;
  const base = cellsOf(task, model, 'nokit'); const p = prev ? cellsOf(task, model, prev) : []; const n = cellsOf(task, model, next);
  const head = ['Метрика', 'Без кита', ...(prev ? [prev] : []), next, ...(prev ? [`${prev} к без кита`] : []), `${next} к без кита`, ...(prev ? [`${next} к ${prev}`] : [])];
  const rows = ROWS.filter(([, get]) => get).map(([title, get, fmt]) => {
    const [b, a, c] = [mean(base.map(get)), mean(p.map(get)), mean(n.map(get))];
    return [title, base.length ? show(base, get, fmt) : '—', ...(prev ? [p.length ? show(p, get, fmt) : '—'] : []), n.length ? show(n, get, fmt) : '—', ...(prev ? [delta(a, b)] : []), delta(c, b), ...(prev ? [delta(c, a)] : [])];
  });
  for (const q of qkeys) {
    const val = (cs) => cs.map((c) => String(c.quality?.[q] ?? '—')).join(' · ') || '—';
    rows.push([q, val(base), ...(prev ? [val(p)] : []), val(n), ...(prev ? [''] : []), '', ...(prev ? [''] : [])]);
  }
  comparison.push(`## ${task} — ${modelName(model)}`, '', table(head, rows), '');
}
fs.writeFileSync(path.join(out, 'METRICS.md'), metrics.join('\n'));
fs.writeFileSync(path.join(out, 'COMPARISON.md'), comparison.join('\n'));
console.log(comparison.join('\n'));
console.log(`\nФайлы: ${path.join(out, 'COMPARISON.md')}, ${path.join(out, 'METRICS.md')}, ${path.join(out, 'metrics.json')}`);
