#!/usr/bin/env node
// Per-cell metrics from the raw logs: wall time, tool calls by name, model requests, tokens
// (input, cache write, cache read, output, thinking), agents with model and effort, skills and
// kit files read, kit text the cooperator received, waits, messages, handoffs, the suite's quality
// check, and what the agent committed.
// usage: metrics.mjs <run-dir> [<out-file>]   writes <out-file>, by default <run-dir>/metrics.json
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2];
const target = process.argv[3] ?? path.join(out, 'metrics.json');
const textLength = (v) => (typeof v === 'string' ? v.length : Array.isArray(v) ? v.reduce((a, x) => a + textLength(x.text ?? x.content ?? ''), 0) : v ? JSON.stringify(v).length : 0);
const jsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }) : []);
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim() : '');
const secs = (a, b) => Math.round((new Date(b) - new Date(a)) / 1000);
const ROLE_EFFORT = { 'workforce-worker': 'high', 'workforce-worker-lite': 'high', 'workforce-probe': 'medium', 'workforce-auditor': 'xhigh', 'workforce-reviewer': 'high' };
const kitFile = (p) => {
  const m = /skills\/(workforce-[a-z-]+)\/(SKILL\.md|references\/[a-z-]+\.md)/.exec(p) ?? /(claude-workforce|codex-workforce)\/profiles\.json/.exec(p);
  return m ? (m[2] ? `${m[1]}/${m[2]}` : `${m[1]}/profiles.json`) : null;
};

function claude(logs, res) {
  const ev = jsonl(path.join(logs, 'claude.stream.jsonl'));
  const init = ev.find((e) => e.type === 'system' && e.subtype === 'init');
  const result = ev.find((e) => e.type === 'result');
  if (/workforce-orchestrate/.test(JSON.stringify(ev.slice(0, 6)))) res.skills.push('workforce-orchestrate');
  const tdir = path.join(logs, 'transcripts');
  const files = fs.existsSync(tdir) ? fs.readdirSync(tdir) : [];
  const actor = (file, meta) => {
    const msgs = new Map(); const tools = {}; const ids = new Set(); const kitReads = new Set(); let first = null; let last = null;
    for (const l of jsonl(path.join(tdir, file))) {
      if (l.timestamp) { first ??= l.timestamp; last = l.timestamp; }
      // The cooperator's kit text: a skill Claude Code inserts into the context, and kit files it reads.
      if (!meta && l.type === 'user') {
        for (const c of Array.isArray(l.message?.content) ? l.message.content : [{ type: 'text', text: String(l.message?.content ?? '') }]) {
          if (c.type === 'text' && /^Base directory for this skill: .*\/skills\/workforce-/.test(c.text ?? '')) res.kitChars += c.text.length;
          if (c.type === 'tool_result' && kitReads.has(c.tool_use_id)) res.kitChars += textLength(c.content);
        }
      }
      if (l.type !== 'assistant') continue;
      const u = l.message?.usage; const id = l.message?.id;
      if (id && u) msgs.set(id, { in: u.input_tokens ?? 0, cw: u.cache_creation_input_tokens ?? 0, cr: u.cache_read_input_tokens ?? 0, out: Math.max(msgs.get(id)?.out ?? 0, u.output_tokens ?? 0) });
      for (const c of l.message?.content ?? []) {
        if (c.type === 'text' && meta && /STATUS:\s*\**\s*handoff/i.test(c.text)) res.handoffs += 1;
        if (c.type !== 'tool_use' || ids.has(c.id)) continue;
        ids.add(c.id); tools[c.name] = (tools[c.name] ?? 0) + 1;
        if (!meta && c.name === 'SendMessage') res.messagesToAgents += 1;
        if (c.name === 'Skill') res.skills.push(c.input.skill ?? c.input.name);
        const k = kitFile(String(c.input?.file_path ?? c.input?.command ?? ''));
        if (k) { res.kitFiles[k] = (res.kitFiles[k] ?? 0) + 1; if (!meta) kitReads.add(c.id); }
      }
    }
    const sum = { requests: msgs.size, input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
    for (const m of msgs.values()) { sum.input += m.in; sum.cacheWrite += m.cw; sum.cacheRead += m.cr; sum.output += m.out; }
    return { role: meta ? meta.agentType : 'cooperator', task: meta?.description ?? '', model: meta ? meta.model : init?.model, effort: meta ? ROLE_EFFORT[meta.agentType] ?? '?' : 'medium', background: meta ? meta.requestShape === 'background' : false, seconds: first && last ? secs(first, last) : null, toolCalls: Object.values(tools).reduce((a, b) => a + b, 0), tools, ...sum, thinking: null };
  };
  if (files.includes('main.jsonl')) res.actors.push(actor('main.jsonl', null));
  for (const f of files.filter((n) => n.startsWith('agent-') && n.endsWith('.jsonl')).sort()) {
    res.actors.push(actor(f, JSON.parse(fs.readFileSync(path.join(tdir, f.replace(/\.jsonl$/, '.meta.json')), 'utf8'))));
  }
  res.thinking = Object.values(result?.modelUsage ?? {}).reduce((a, v) => a + (v.thinkingTokens ?? 0), 0);
  res.modelUsage = result?.modelUsage ?? null;
}

function codex(logs, res) {
  const mainId = jsonl(path.join(logs, 'codex.events.jsonl')).find((e) => e.type === 'thread.started')?.thread_id;
  const dir = path.join(logs, 'rollouts');
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const lines = jsonl(path.join(dir, f));
    const meta = lines.find((l) => l.type === 'session_meta')?.payload;
    if (!meta || (meta.id !== mainId && meta.session_id !== mainId)) continue;
    const isMain = meta.id === mainId;
    const ctx = lines.find((l) => l.type === 'turn_context')?.payload ?? {};
    const dev = lines.filter((l) => l.type === 'response_item' && l.payload?.role === 'developer').flatMap((l) => l.payload.content ?? []).map((c) => c.text ?? '').join('\n');
    const counts = lines.filter((l) => l.type === 'event_msg' && l.payload?.type === 'token_count' && l.payload.info?.total_token_usage);
    const t = counts.at(-1)?.payload.info.total_token_usage ?? {};
    const tools = {}; const kitReads = new Set();
    const add = (k, n = 1) => { tools[k] = (tools[k] ?? 0) + n; };
    for (const l of lines) {
      const p = l.payload ?? {};
      // The cooperator's kit text: the full output of each command that read a kit file
      // (an upper bound when the same command also read other files).
      if (isMain && l.type === 'response_item' && (p.type === 'custom_tool_call' || p.type === 'function_call') && /skills\/workforce-[a-z-]+\/(SKILL\.md|references\/)|codex-workforce\/profiles\.json/.test(String(p.input ?? p.arguments ?? ''))) kitReads.add(p.call_id);
      if (isMain && l.type === 'response_item' && (p.type === 'custom_tool_call_output' || p.type === 'function_call_output') && kitReads.has(p.call_id)) res.kitChars += textLength(p.output);
      if (l.type === 'response_item' && p.type === 'function_call') {
        add(p.name);
        let args = {}; try { args = JSON.parse(p.arguments); } catch {}
        if (p.name === 'wait_agent') res.waits.wait_agent += 1;
        if (p.name === 'sleep') { res.waits.sleep += 1; res.waits.sleepSeconds += Math.round((args.duration_ms ?? 0) / 1000); }
        if (p.name === 'send_message' || p.name === 'followup_task') { if (isMain) res.messagesToAgents += 1; else res.messagesFromAgents += 1; }
      }
      if (l.type === 'response_item' && p.type === 'custom_tool_call') {
        const input = String(p.input ?? '');
        const execs = (input.match(/tools\.exec_command\(/g) ?? []).length;
        const patches = (input.match(/tools\.apply_patch\(/g) ?? []).length;
        if (execs || patches) { if (execs) add('exec_command', execs); if (patches) add('apply_patch', patches); } else add(p.name);
        for (const m of input.matchAll(/skills\/([a-z0-9-]+)\/(SKILL\.md|references\/[a-z-]+\.md)|(codex-workforce)\/profiles\.json/g)) {
          const k = m[3] ? `${m[3]}/profiles.json` : `${m[1]}/${m[2]}`;
          res.kitFiles[k] = (res.kitFiles[k] ?? 0) + 1;
        }
      }
      if (l.type === 'response_item' && (p.type === 'agent_message' || (p.type === 'message' && p.role === 'assistant'))) {
        const text = p.text ?? (p.content ?? []).map((c) => c.text ?? '').join(' ');
        if (!isMain && /STATUS:\s*handoff/i.test(text)) res.handoffs += 1;
      }
    }
    res.actors.push({
      role: isMain ? 'cooperator' : (dev.match(/You are a Workforce (worker|reviewer|auditor|probe)/i)?.[1]?.toLowerCase() ?? 'agent'),
      model: ctx.model, effort: ctx.effort ?? ctx.reasoning_effort, background: false,
      seconds: lines.length ? secs(lines[0].timestamp, lines.at(-1).timestamp) : null,
      toolCalls: Object.values(tools).reduce((a, b) => a + b, 0), tools,
      requests: new Set(counts.map((c) => JSON.stringify(c.payload.info.total_token_usage))).size,
      input: (t.input_tokens ?? 0) - (t.cached_input_tokens ?? 0), cacheWrite: null, cacheRead: t.cached_input_tokens ?? 0,
      output: t.output_tokens ?? 0, thinking: t.reasoning_output_tokens ?? 0,
    });
  }
  res.actors.sort((a, b) => (a.role === 'cooperator' ? -1 : b.role === 'cooperator' ? 1 : 0));
  res.thinking = res.actors.reduce((a, x) => a + (x.thinking ?? 0), 0);
}

const cells = [];
for (const id of fs.readdirSync(path.join(out, 'cells')).sort()) {
  const dir = path.join(out, 'cells', id);
  const [task, variant, model, repeat] = read(path.join(dir, 'cell.txt')).split(' ');
  const logs = path.join(dir, 'logs');
  const res = { id, task, variant, model, repeat: Number(repeat), actors: [], skills: [], kitFiles: {}, kitChars: 0, handoffs: 0, messagesToAgents: 0, messagesFromAgents: 0, waits: { sleep: 0, sleepSeconds: 0, wait_agent: 0 } };
  res.exitCode = Number(read(path.join(logs, 'exit.txt')) || NaN);
  res.wallSeconds = secs(read(path.join(logs, 'start.txt')), read(path.join(logs, 'end.txt')));
  if (model === 'opus') claude(logs, res); else codex(logs, res);
  const sum = (f) => res.actors.reduce((a, x) => a + (x[f] ?? 0), 0);
  const coop = res.actors.find((a) => a.role === 'cooperator');
  res.totals = {
    agents: res.actors.length - (coop ? 1 : 0), toolCallsCooperator: coop?.toolCalls ?? 0, toolCallsAgents: sum('toolCalls') - (coop?.toolCalls ?? 0), toolCalls: sum('toolCalls'),
    requests: sum('requests'), input: sum('input'), cacheWrite: model === 'sol' ? null : sum('cacheWrite'), cacheRead: sum('cacheRead'),
    output: sum('output'), thinking: res.thinking,
  };
  res.totals.inputTotal = res.totals.input + (res.totals.cacheWrite ?? 0) + res.totals.cacheRead;
  res.quality = fs.existsSync(path.join(dir, 'check.json')) ? JSON.parse(read(path.join(dir, 'check.json')) || '{}') : {};
  if (fs.existsSync(path.join(dir, 'git.json'))) Object.assign(res.quality, JSON.parse(read(path.join(dir, 'git.json')) || '{}'));
  cells.push(res);
}
fs.writeFileSync(target, JSON.stringify({ run: path.basename(out), suite: read(path.join(out, 'suite.txt')), variants: read(path.join(out, 'variants.txt')).split('\n'), cells }, null, 1));
console.log(`metrics: ${cells.length} cells -> ${target}`);
