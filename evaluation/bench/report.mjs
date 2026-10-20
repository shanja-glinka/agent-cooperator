#!/usr/bin/env node
// Writes METRICS.md (every metric, every variant) and COMPARISON.md (no kit | previous | new, and
// any further kit variant of the run beside the new one, with deltas) for a bench run, and prints
// the comparison. Values come from the cells with a clean isolation status; a group without one
// shows its cells marked with *, as spend only, and its deltas stay empty.
// usage: report.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';
import { loadRun, isClean } from './load.mjs';

const out = process.argv[2];
// The run's cells with their isolation status, and the cells it takes from earlier runs.
const data = loadRun(out);
const names = data.variants.map((v) => v.split('=')[0]);
const prevNames = data.prev.flatMap((p) => p.variants.map((v) => v.split('=')[0]));
const runKits = data.runVariants.map((v) => v.split('=')[0]).filter((n) => n !== 'nokit');
const next = runKits[0];
const extras = runKits.slice(1);
const prev = prevNames.filter((n) => n !== 'nokit').at(-1) ?? null;
const label = (n) => (n === 'nokit' ? 'Без кита' : n);
const k = (n) => (n == null || Number.isNaN(n) ? '—' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Number.isInteger(n) || n >= 100 ? String(Math.round(n)) : n.toFixed(1));
const usd = (n) => (n == null || Number.isNaN(n) ? '—' : `$${n.toFixed(2)}`);
const tm = (s) => (s == null || Number.isNaN(s) ? '—' : `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`);
const role = (r) => (c) => c.totals.usdByRole?.[r] ?? null;
const ROWS = [
  ['Время', (c) => c.wallSeconds, tm], ['Агентов', (c) => c.totals.agents, k],
  ['Цена, $', (c) => c.totals.usd ?? null, usd], ['Цена, верхняя оценка, $', (c) => c.totals.usdHigh ?? null, usd],
  ['Цена: кооператор, $', role('cooperator'), usd], ['Цена: воркеры, $', role('worker'), usd],
  ['Цена: аудиторы, $', role('auditor'), usd], ['Цена: ревьюер, $', role('reviewer'), usd],
  ['Запросы кооператора', (c) => c.totals.cooperatorRequests ?? null, k],
  // Only a Codex cooperator waits with wait_agent; a Claude one is notified.
  ['Ожиданий кооператора, кончившихся таймаутом', (c) => (c.model === 'opus' ? null : c.waits.timedOut ?? null), k],
  ['Цена запросов после таймаута ожидания, $', (c) => (c.model === 'opus' ? null : c.waits.wakeUsd ?? null), usd],
  ['Ходов воркеров', (c) => c.totals.workerTurns ?? null, k], ['Кругов исправлений', (c) => c.totals.fixRounds ?? null, k],
  ['Наибольший промпт воркера', (c) => c.totals.workerMaxPrompt || null, k],
  ['Запросов воркеров выше тарифного порога', (c) => c.totals.workerOverTier ?? null, k],
  ['Ходов аудиторов', (c) => c.totals.auditorTurns ?? null, k], ['Ходов ревьюера', (c) => c.totals.reviewerTurns ?? null, k],
  ['Вызовы инструментов: кооператор', (c) => c.totals.toolCallsCooperator, k], ['Вызовы инструментов: агенты', (c) => c.totals.toolCallsAgents, k],
  ['Вызовы инструментов', (c) => c.totals.toolCalls, k], ['Запросы к модели', (c) => c.totals.requests, k],
  ['Вход без кэша', (c) => c.totals.input, k], ['Запись в кэш', (c) => c.totals.cacheWrite, k], ['Чтение кэша', (c) => c.totals.cacheRead, k],
  ['Вход всего', (c) => c.totals.inputTotal, k], ['Вход на запрос', (c) => (c.totals.requests ? c.totals.inputTotal / c.totals.requests : null), k],
  ['Выход', (c) => c.totals.output, k], ['Мышление', (c) => c.totals.thinking, k],
  ['Handoff', (c) => c.handoffs, k], ['Сообщения агентам', (c) => c.messagesToAgents, k], ['Сообщения от агентов', (c) => c.messagesFromAgents, k],
  ['sleep / wait_agent', null, null], ['Чтений файлов кита', (c) => Object.values(c.kitFiles).reduce((a, b) => a + b, 0), k],
  ['Текст кита у кооператора, символов', (c) => c.kitChars ?? null, k],
];
// Text rows shown per cell.
const TEXT = [
  ['REVIEW в отчёте: находок / настоящих', (c) => (c.review ? `${c.review.findings} / ${c.review.real}` : '—')],
  ['Маршрут', (c) => route(c)],
];
const route = (c) => {
  const agents = c.actors.filter((a) => a.role !== 'cooperator');
  if (!agents.length) return 'сам';
  const counts = {};
  for (const a of agents) { const key = `${a.role} ${a.model ?? ''}`.trim(); counts[key] = (counts[key] ?? 0) + 1; }
  return Object.entries(counts).map(([r, n]) => (n > 1 ? `${n}× ${r}` : r)).join(', ');
};
const cellsOf = (task, model, name) => data.cells.filter((c) => c.task === task && c.model === model && c.variant === name);
const mean = (vals) => (vals.length && vals.every((v) => v != null) ? vals.reduce((a, b) => a + b, 0) / vals.length : null);
const admitted = (cs) => { const clean = cs.filter(isClean); return clean.length ? clean : null; };
const show = (cs, get, fmt) => {
  if (!cs.length) return '—';
  const use = admitted(cs) ?? cs;
  const vals = use.map(get);
  const m = mean(vals);
  if (m == null) return '—';
  const [lo, hi] = [Math.min(...vals), Math.max(...vals)];
  return (vals.length > 1 && lo !== hi ? `${fmt(m)} (${fmt(lo)}–${fmt(hi)})` : fmt(m)) + (admitted(cs) ? '' : ' *');
};
const cleanMean = (cs, get) => { const a = admitted(cs); return a ? mean(a.map(get)) : null; };
const delta = (a, b) => {
  if (a == null || b == null) return '—';
  if (b === 0) return a === 0 ? 'без изм.' : `+${k(a)}`;
  const p = Math.round(((a - b) / b) * 100);
  return Math.abs(p) < 5 ? 'без изм.' : `${p > 0 ? '+' : ''}${p}%`;
};
const perCell = (cs, get) => cs.map((c) => String(get(c) ?? '—')).join(' · ') || '—';
const qualityRows = (cs) => [...new Set(cs.flatMap((c) => Object.keys(c.quality ?? {})))];
const esc = (v) => String(v).replace(/\|/g, '\\|');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`)].join('\n');
// Rows that say nothing for these cells (all empty, or the upper price equal to the price) are left out.
const useful = (title, get, cs) => {
  const vals = cs.map(get);
  if (vals.every((v) => v == null)) return false;
  if (title === 'Цена, верхняя оценка, $') return cs.some((c) => Math.abs((c.totals.usdHigh ?? 0) - (c.totals.usd ?? 0)) > 0.005);
  return true;
};
// Tasks in the suite's order, as bench.sh recorded it.
const order = fs.existsSync(path.join(out, 'tasks.txt')) ? fs.readFileSync(path.join(out, 'tasks.txt'), 'utf8').split('\n').filter(Boolean) : [];
const tasks = [...new Set(data.cells.map((c) => c.task))].sort((a, b) => (order.indexOf(a) + 1 || 1e9) - (order.indexOf(b) + 1 || 1e9));
const models = [...new Set(data.cells.map((c) => c.model))];
const modelName = (m) => (m === 'opus' ? 'Opus 5.5' : m === 'sol' ? 'GPT-6.1 Sol' : m);

const legend = 'Значения — по ячейкам с чистой изоляцией; группа без таких ячеек помечена * (фактический расход), её разницы не считаются. Разница в процентах; в пределах ±5% — «без изм.». При нескольких повторах — среднее (мин–макс). Цена — по API-прайсу (prices.mjs); у Codex нижняя оценка, верхняя — отдельной строкой, если отличается.';
const metrics = [`# Метрики: ${data.run}`, '', `Варианты: ${data.variants.join(', ')}. Полные данные — metrics.json. ${legend}`, ''];
const comparison = [`# Сравнение: ${data.run}`, '', `Без кита | ${prev ?? '—'} | ${next}${extras.length ? ` | ${extras.join(' | ')}` : ''}. ${legend}`, ''];
// Cells taken from earlier runs ran on another day and under those runs' conditions.
for (const p of data.prev) {
  const line = `Колонки ${p.variants.map((v) => label(v.split('=')[0])).join(' и ')} — из прогона ${p.run}, не перезапускались: другой день, условия того прогона, своя пометка изоляции.`;
  metrics.push(line); comparison.push(line);
}
if (data.prev.length) { metrics.push(''); comparison.push(''); }
for (const task of tasks) for (const model of models) {
  const groups = names.map((n) => cellsOf(task, model, n));
  const all = groups.flat();
  if (!all.length) continue;
  const qkeys = qualityRows(all);
  const rowsAll = [['Чистых ячеек', ...groups.map((cs) => (cs.length ? `${cs.filter(isClean).length}/${cs.length}` : '—'))]];
  for (const [title, get, fmt] of ROWS) {
    if (!get) { rowsAll.push([title, ...groups.map((cs) => cs.map((c) => `${c.waits.sleep}/${c.waits.wait_agent}`).join(' · ') || '—')]); continue; }
    if (useful(title, get, all)) rowsAll.push([title, ...groups.map((cs) => show(cs, get, fmt))]);
  }
  for (const [title, get] of TEXT) rowsAll.push([title, ...groups.map((cs) => perCell(cs, get))]);
  for (const q of qkeys) rowsAll.push([q, ...groups.map((cs) => perCell(cs, (c) => c.quality?.[q]))]);
  metrics.push(`## ${task} — ${modelName(model)}`, '', table(['Метрика', ...names.map(label)], rowsAll), '');

  if (!next) continue;
  const base = cellsOf(task, model, 'nokit'); const p = prev ? cellsOf(task, model, prev) : []; const n = cellsOf(task, model, next);
  const ex = extras.filter((e) => cellsOf(task, model, e).length);
  const cols = [['Без кита', base], ...(prev ? [[prev, p]] : []), [next, n], ...ex.map((e) => [label(e), cellsOf(task, model, e)])];
  const head = ['Метрика', ...cols.map(([t]) => t), ...(prev ? [`${prev} к без кита`] : []), `${next} к без кита`, ...(prev ? [`${next} к ${prev}`] : []), ...ex.map((e) => `${e} к ${next}`)];
  const rows = [['Чистых ячеек', ...cols.map(([, cs]) => (cs.length ? `${cs.filter(isClean).length}/${cs.length}` : '—')), ...(prev ? [''] : []), '', ...(prev ? [''] : []), ...ex.map(() => '')]];
  for (const [title, get, fmt] of ROWS.filter(([, get]) => get)) {
    if (!useful(title, get, cols.flatMap(([, cs]) => cs))) continue;
    const [b, a, c] = [cleanMean(base, get), cleanMean(p, get), cleanMean(n, get)];
    rows.push([title, ...cols.map(([, cs]) => show(cs, get, fmt)), ...(prev ? [delta(a, b)] : []), delta(c, b), ...(prev ? [delta(c, a)] : []), ...ex.map((e) => delta(cleanMean(cellsOf(task, model, e), get), c))]);
  }
  const blanks = [...(prev ? [''] : []), '', ...(prev ? [''] : []), ...ex.map(() => '')];
  for (const [title, get] of TEXT) rows.push([title, ...cols.map(([, cs]) => perCell(cs, get)), ...blanks]);
  for (const q of qkeys) rows.push([q, ...cols.map(([, cs]) => perCell(cs, (c) => c.quality?.[q])), ...blanks]);
  comparison.push(`## ${task} — ${modelName(model)}`, '', table(head, rows), '');
}
fs.writeFileSync(path.join(out, 'METRICS.md'), metrics.join('\n'));
fs.writeFileSync(path.join(out, 'COMPARISON.md'), comparison.join('\n'));
console.log(comparison.join('\n'));
console.log(`\nФайлы: ${path.join(out, 'COMPARISON.md')}, ${path.join(out, 'METRICS.md')}, ${path.join(out, 'metrics.json')}`);
