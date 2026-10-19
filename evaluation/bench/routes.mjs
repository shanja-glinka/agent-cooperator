#!/usr/bin/env node
// Routes of a bench run from the raw logs of every cell: whom the cooperator started, with which
// role, model, and effort, what it said or thought just before (its reason), what came back, and
// its final report. Writes ROUTES.md for the run and timeline.md in every cell.
// Codex encrypts spawn packets and messages between agents; their text is not in the rollouts.
// usage: routes.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2];
const jsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }) : []);
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim() : '');
const clip = (t, n) => { const s = String(t ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n)}…` : s; };
const COOP = 'кооператор';

// Claude Code: the cooperator's transcript and one transcript (with .meta.json) per agent.
function claude(logs) {
  const dir = path.join(logs, 'transcripts');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const entries = []; const spawns = []; const seen = new Set(); let final = '';
  const walk = (file, who, isAgent) => {
    let last = '';
    for (const l of jsonl(path.join(dir, file))) {
      const content = l.message?.content;
      if (!l.timestamp || !Array.isArray(content)) continue;
      for (const c of content) {
        const key = `${file}:${c.id ?? c.tool_use_id ?? ''}:${c.type}:${String(c.text ?? c.thinking ?? '').slice(0, 120)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const add = (kind, text) => entries.push({ t: l.timestamp, who, kind, text });
        if (l.type === 'assistant' && c.type === 'thinking' && c.thinking?.trim()) add('думает', clip(c.thinking, isAgent ? 300 : 700));
        if (l.type === 'assistant' && c.type === 'text' && c.text.trim()) { add('пишет', clip(c.text, isAgent ? 500 : 900)); last = c.text; }
        if (l.type !== 'assistant' || c.type !== 'tool_use') continue;
        if (!isAgent && (c.name === 'Agent' || c.name === 'Task')) {
          const s = { t: l.timestamp, id: c.id, role: c.input.subagent_type, model: c.input.model ?? 'как у кооператора', effort: null, background: Boolean(c.input.run_in_background), name: c.input.description, packet: c.input.prompt };
          spawns.push(s);
          add('запускает', `${s.role} / ${s.model}${s.background ? ', в фоне' : ''} «${s.name}»\n  ПОРУЧЕНИЕ: ${clip(s.packet, 1500)}`);
        } else if (c.name === 'SendMessage') add('пишет агенту', `${c.input.to}: ${clip(c.input.message, 600)}`);
        else if (c.name === 'Skill') add('навык', String(c.input.skill ?? c.input.name));
        else add(`инструмент ${c.name}`, clip(c.input.command ?? c.input.file_path ?? c.input.pattern ?? JSON.stringify(c.input), 200));
      }
    }
    return last;
  };
  if (files.includes('main.jsonl')) final = walk('main.jsonl', COOP, false);
  for (const f of files.filter((n) => n.startsWith('agent-') && n.endsWith('.jsonl'))) {
    const meta = JSON.parse(read(path.join(dir, f.replace(/\.jsonl$/, '.meta.json'))) || '{}');
    const who = `${meta.agentType ?? 'agent'} / ${meta.model ?? 'как у кооператора'}`;
    const report = walk(f, who, true);
    const s = spawns.find((x) => x.id === meta.toolUseId);
    if (s) s.report = report;
    const end = entries.filter((e) => e.who === who).at(-1);
    if (end) entries.push({ t: end.t, who, kind: 'сдаёт', text: clip(report, 1500) });
  }
  const result = jsonl(path.join(logs, 'claude.stream.jsonl')).filter((e) => e.type === 'result').at(-1);
  return { entries, spawns, final: result?.result ?? final };
}

// Codex: one rollout per thread; the main thread is the one `codex exec` started.
function codex(logs) {
  const mainId = jsonl(path.join(logs, 'codex.events.jsonl')).find((e) => e.type === 'thread.started')?.thread_id;
  const dir = path.join(logs, 'rollouts');
  const entries = []; const spawns = []; let final = '';
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const lines = jsonl(path.join(dir, f));
    const meta = lines.find((l) => l.type === 'session_meta')?.payload;
    if (!meta || (meta.id !== mainId && meta.session_id !== mainId)) continue;
    const isMain = meta.id === mainId;
    const ctx = lines.find((l) => l.type === 'turn_context')?.payload ?? {};
    const spawn = meta.source?.subagent?.thread_spawn;
    const who = isMain ? COOP : `${spawn?.agent_role ?? 'agent'} / ${ctx.model}:${ctx.effort ?? ctx.reasoning_effort}`;
    let last = '';
    for (const l of lines) {
      const p = l.payload ?? {};
      const add = (kind, text) => entries.push({ t: l.timestamp, who, kind, text });
      if (l.type !== 'response_item') continue;
      if (p.type === 'reasoning') {
        const text = (p.summary ?? []).map((s) => s.text).join(' ');
        if (text.trim()) add('думает', clip(text, isMain ? 700 : 300));
      }
      if (p.type === 'message' && p.role === 'assistant') {
        const text = (p.content ?? []).map((c) => c.text ?? '').join(' ');
        if (text.trim()) { add('пишет', clip(text, isMain ? 900 : 500)); last = text; }
      }
      if (p.type === 'function_call') {
        let args = {}; try { args = JSON.parse(p.arguments); } catch {}
        if (p.name === 'spawn_agent') {
          const s = { t: l.timestamp, role: args.agent_type, model: args.model ?? 'как у кооператора', effort: args.reasoning_effort ?? null, background: true, name: args.task_name };
          spawns.push(s);
          add('запускает', `${s.role} / ${s.model}${s.effort ? `:${s.effort}` : ''} «${s.name}» (текст поручения Codex шифрует)`);
        } else if (p.name === 'send_message' || p.name === 'followup_task') add('пишет агенту', `${args.target} (текст шифруется)`);
        else if (p.name === 'sleep') add('ждёт (sleep)', `${Math.round((args.duration_ms ?? 0) / 1000)} с`);
        else if (p.name === 'wait_agent') add('ждёт агента', clip(JSON.stringify(args), 120));
        else add(`вызов ${p.name}`, clip(JSON.stringify(args), 200));
      }
      if (p.type === 'custom_tool_call') add('инструмент', clip(p.input, 200));
    }
    if (isMain) final = read(path.join(logs, 'codex.last.md')) || last;
    else {
      const s = spawns.find((x) => spawn?.agent_path?.endsWith(`/${x.name}`));
      if (s) s.report = last;
      const end = entries.filter((e) => e.who === who).at(-1);
      if (end) entries.push({ t: end.t, who, kind: 'сдаёт', text: clip(last, 1500) });
    }
  }
  return { entries, spawns, final };
}

const md = [`# Маршруты: ${path.basename(out)}`, '',
  'Кого кооператор запускал, с какой ролью и моделью, чем объяснил запуск (последняя мысль или реплика перед ним), что агент сдал, и итоговый отчёт. Полная хронология каждой ячейки — `cells/<ячейка>/timeline.md`. Codex шифрует тексты поручений и сообщений между агентами, их в логах нет.', ''];
const cells = fs.readdirSync(path.join(out, 'cells')).sort().map((id) => {
  const dir = path.join(out, 'cells', id);
  const [task, variant, model, repeat] = read(path.join(dir, 'cell.txt')).split(' ');
  const logs = path.join(dir, 'logs');
  const r = model === 'opus' ? claude(logs) : codex(logs);
  r.entries.sort((a, b) => new Date(a.t) - new Date(b.t));
  const start = new Date(read(path.join(logs, 'start.txt')));
  const at = (t) => { const s = Math.max(0, Math.round((new Date(t) - start) / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  fs.writeFileSync(path.join(dir, 'timeline.md'), [`# ${id}`, '', ...r.entries.map((e) => `- \`${at(e.t)}\` **${e.who}** ${e.kind}: ${e.text.replace(/\n/g, '\n  ')}`), '', '## Итоговый отчёт', '', r.final, ''].join('\n'));
  const quality = JSON.parse(read(path.join(dir, 'check.json')) || '{}');
  return { id, task, variant, model, repeat, quality, ...r, at };
});
// Tasks in the suite's order, as bench.sh recorded it.
const order = read(path.join(out, 'tasks.txt')).split('\n').filter(Boolean);
const tasks = [...new Set(cells.map((c) => c.task))].sort((a, b) => (order.indexOf(a) + 1 || 1e9) - (order.indexOf(b) + 1 || 1e9));
for (const task of tasks) for (const model of [...new Set(cells.map((c) => c.model))]) {
  const group = cells.filter((c) => c.task === task && c.model === model);
  if (!group.length) continue;
  md.push(`## ${task} — ${model === 'opus' ? 'Opus 5.5' : 'GPT-6.1 Sol'}`, '', '| Ячейка | Решено | Маршрут |', '|---|---|---|');
  for (const c of group) {
    const route = c.spawns.length ? `сам + ${c.spawns.map((s) => `${s.role} (${s.model}${s.effort ? `:${s.effort}` : ''})`).join(', ')}` : 'сам, без агентов';
    md.push(`| ${c.variant} r${c.repeat} | ${c.quality['Решено'] ?? '—'} | ${route.replace(/\|/g, '\\|')} |`);
  }
  md.push('');
  for (const c of group) {
    md.push(`### ${c.id}`, '');
    for (const s of c.spawns) {
      const before = (kind) => c.entries.filter((e) => e.who === COOP && e.kind === kind && new Date(e.t) <= new Date(s.t)).at(-1);
      md.push(`- \`${c.at(s.t)}\` запуск **${s.role}** (${s.model}${s.effort ? `:${s.effort}` : ''}${s.background ? ', в фоне' : ''}) «${s.name}»`);
      for (const kind of ['думает', 'пишет']) {
        const e = before(kind);
        if (e) md.push(`  - перед запуском кооператор ${kind} (\`${c.at(e.t)}\`): ${e.text.replace(/\n/g, ' ')}`);
      }
      if (s.packet) md.push(`  - поручение: ${clip(s.packet, 600)}`);
      if (s.report) md.push(`  - агент сдал: ${clip(s.report, 600)}`);
    }
    md.push(`- итоговый отчёт: ${clip(c.final, 1800)}`, '');
  }
}
fs.writeFileSync(path.join(out, 'ROUTES.md'), md.join('\n'));
console.log(`routes: ${cells.length} cells -> ${path.join(out, 'ROUTES.md')}`);
