#!/usr/bin/env node
// What each replayed review cost and said, for judging by hand: a table of time, requests, tokens,
// the largest prompt, tool calls and price at list prices; then per review the VERDICT, ACCEPTANCE
// and SITES lines, every line about the watched locations, and every line that calls a site violated
// or not established or that lists a finding. Writes <out>/REVIEWS.md.
// usage: score-replay.mjs <out-dir> [<location> ...]   e.g. src/store.ts:42
import fs from 'node:fs';
import path from 'node:path';
import { openaiUsd } from './prices.mjs';

const [out, ...watched] = process.argv.slice(2);
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
const jsonl = (f) => read(f).split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });

// Usage of a Codex thread, counted as metrics.mjs counts it: every request once, priced at the tier
// its prompt falls in; tokens; the largest prompt; tool calls (a code-mode call counts each
// exec_command it makes).
function usage(dir) {
  const u = { usd: 0, usdHigh: 0, requests: 0, input: 0, cached: 0, output: 0, reasoning: 0, maxPrompt: 0, tools: 0, model: null };
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const seen = new Set(); const calls = new Set();
    for (const l of jsonl(path.join(dir, f))) {
      const p = l.payload ?? {};
      if (l.type === 'turn_context') u.model ??= p.model;
      if (l.type === 'response_item' && (p.type === 'function_call' || p.type === 'custom_tool_call') && !calls.has(p.call_id)) {
        calls.add(p.call_id);
        u.tools += p.type === 'custom_tool_call' ? Math.max(1, (String(p.input ?? '').match(/tools\.exec_command\(/g) ?? []).length) : 1;
      }
      const info = l.type === 'event_msg' && p.type === 'token_count' ? p.info : null;
      if (!info?.total_token_usage || !info.last_token_usage) continue;
      const key = JSON.stringify(info.total_token_usage);
      if (seen.has(key)) continue;
      seen.add(key);
      const t = info.last_token_usage;
      u.requests += 1; u.input += (t.input_tokens ?? 0) - (t.cached_input_tokens ?? 0); u.cached += t.cached_input_tokens ?? 0;
      u.output += t.output_tokens ?? 0; u.reasoning += t.reasoning_output_tokens ?? 0; u.maxPrompt = Math.max(u.maxPrompt, t.input_tokens ?? 0);
      const usd = openaiUsd(u.model ?? 'gpt-6.1-sol', t);
      u.usd += usd?.low ?? 0; u.usdHigh += usd?.high ?? 0;
    }
  }
  return u;
}
const k = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n));

const ids = fs.readdirSync(path.join(out, 'cells')).sort();
const runs = ids.map((id) => {
  const logs = path.join(out, 'cells', id, 'logs');
  const resultFile = fs.existsSync(logs) ? fs.readdirSync(logs).find((f) => f.endsWith('.result.json')) : null;
  const result = resultFile ? JSON.parse(read(path.join(logs, resultFile))) : null;
  return { id, logs, result, use: usage(path.join(logs, 'rollouts')) };
});
const lines = [`# Повторные ревью: ${path.basename(out)}`, '', 'Цена — по API-прайсу (prices.mjs), нижняя оценка Codex; вход — без кэша; вызовы — вызовы инструментов ревьюера.', ''];
lines.push('| Запуск | Время | Запросов | Вход | Кэш | Выход | Мышление | Наибольший промпт | Вызовов | Цена | Верхняя оценка |', '|---|---|---|---|---|---|---|---|---|---|---|');
for (const { id, result, use: u } of runs) {
  const t = result?.durationSec; const time = t == null ? '—' : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  lines.push(`| ${id} | ${time} | ${u.requests} | ${k(u.input)} | ${k(u.cached)} | ${k(u.output)} | ${k(u.reasoning)} | ${k(u.maxPrompt)} | ${u.tools} | $${u.usd.toFixed(2)} | $${u.usdHigh.toFixed(2)} |`);
}
lines.push('');
for (const { id, logs, result, use: cost } of runs) {
  const text = result?.lastMessage ? read(path.join(logs, path.basename(result.lastMessage))) : '';
  const pick = (re) => text.split('\n').filter((l) => re.test(l)).map((l) => l.trim());
  lines.push(`## ${id}`, '');
  lines.push(`- Статус: ${result?.status ?? 'нет результата'}; время ${result?.durationSec ?? '?'} с; ${cost.requests} запросов, $${cost.usd.toFixed(2)} (${cost.model ?? '?'})`);
  for (const key of ['VERDICT', 'ACCEPTANCE', 'SITES']) lines.push(`- ${pick(new RegExp(`^\\W*${key}\\b`, 'i'))[0] ?? `${key}: —`}`);
  if (watched.length) {
    lines.push('', 'Отслеживаемые места:');
    for (const loc of watched) {
      const hits = pick(new RegExp(loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      lines.push(`- \`${loc}\`: ${hits.length ? '' : 'не упомянуто'}`, ...hits.map((h) => `  - ${h.slice(0, 600)}`));
    }
  }
  const flagged = pick(/\bviolated\b|not established|нарушено|не установлено|^\W*F\d+\b|FINDING/i);
  lines.push('', 'Нарушено / не установлено / находки:', ...(flagged.length ? flagged.map((h) => `- ${h.slice(0, 600)}`) : ['- нет']), '');
}
fs.writeFileSync(path.join(out, 'REVIEWS.md'), lines.join('\n'));
console.log(lines.join('\n'));
