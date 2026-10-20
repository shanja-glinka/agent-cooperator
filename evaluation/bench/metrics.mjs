#!/usr/bin/env node
// Per-cell metrics from the raw logs: wall time, tool calls by name, model requests, tokens
// (input, cache write, cache read, output, thinking), the price of every request at list prices
// (prices.mjs), agents with model, effort, and turns, skills and kit files read, kit text the
// cooperator received, waits, messages, handoffs, the cooperator's REVIEW lines, the suite's
// quality check, and what the agent committed.
// usage: metrics.mjs <run-dir> [<out-file>]   writes <out-file>, by default <run-dir>/metrics.json
import fs from 'node:fs';
import path from 'node:path';
import { claudeUsd, openaiUsd } from './prices.mjs';

const out = process.argv[2];
const target = process.argv[3] ?? path.join(out, 'metrics.json');
const textLength = (v) => (typeof v === 'string' ? v.length : Array.isArray(v) ? v.reduce((a, x) => a + textLength(x.text ?? x.content ?? ''), 0) : v ? JSON.stringify(v).length : 0);
const jsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }) : []);
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim() : '');
const secs = (a, b) => Math.round((new Date(b) - new Date(a)) / 1000);
const ROLE_EFFORT = { 'workforce-worker': 'high', 'workforce-worker-lite': 'high', 'workforce-probe': 'medium', 'workforce-auditor': 'xhigh', 'workforce-reviewer': 'high' };
// A Codex run the Claude kit starts through codex-run.mjs opens with the role's skill.
const CODEX_RUN_ROLE = [[/^# Audit one lens/, 'auditor'], [/^# Review the actual result/, 'reviewer'], [/^# Complete the owned block/, 'worker'], [/^# Answer one question/, 'probe']];
const kitFile = (p) => {
  const m = /skills\/(workforce-[a-z-]+)\/(SKILL\.md|references\/[a-z-]+\.md)/.exec(p) ?? /(claude-workforce|codex-workforce)\/profiles\.json/.exec(p);
  return m ? (m[2] ? `${m[1]}/${m[2]}` : `${m[1]}/profiles.json`) : null;
};
// Role families for the price breakdown.
const family = (role) => (role === 'cooperator' ? 'cooperator' : /worker/.test(role) ? 'worker' : /audit/.test(role) ? 'auditor' : /review/.test(role) ? 'reviewer' : /probe/.test(role) ? 'probe' : 'other');
// The cooperator reports one line per reviewed block: REVIEW: rounds=<n> findings=<n> real=<n>.
const reviewLines = (text) => {
  const r = { blocks: 0, rounds: 0, findings: 0, real: 0 };
  // A block label may sit between the word and the colon: "REVIEW A: rounds=...".
  for (const m of String(text ?? '').matchAll(/REVIEW\b[^:\n=]{0,40}:?\**\s*rounds\s*=\s*(\d+)[,;\s]+findings\s*=\s*(\d+)[,;\s]+real\s*=\s*(\d+)/gi)) {
    r.blocks += 1; r.rounds += Number(m[1]); r.findings += Number(m[2]); r.real += Number(m[3]);
  }
  return r.blocks ? r : null;
};

function claude(logs, res) {
  const ev = jsonl(path.join(logs, 'claude.stream.jsonl'));
  const init = ev.find((e) => e.type === 'system' && e.subtype === 'init');
  // With background tasks a session writes a result after every turn; the last one is the session's.
  const result = ev.filter((e) => e.type === 'result').at(-1);
  if (/workforce-orchestrate/.test(JSON.stringify(ev.slice(0, 6)))) res.skills.push('workforce-orchestrate');
  const tdir = path.join(logs, 'transcripts');
  const files = fs.existsSync(tdir) ? fs.readdirSync(tdir) : [];
  // A fork's transcript repeats messages of its parent: each message is counted once per cell.
  const seen = new Set();
  const actor = (file, meta) => {
    const msgs = new Map(); const tools = {}; const ids = new Set(); const kitReads = new Set(); let first = null; let last = null; let turns = 0;
    const efforts = new Set();
    const model = meta ? (meta.model === 'inherit' ? init?.model : meta.model) : init?.model;
    for (const l of jsonl(path.join(tdir, file))) {
      if (l.timestamp) { first ??= l.timestamp; last = l.timestamp; }
      // The effort each request was sent with, as Claude Code recorded the request.
      if (l.type === 'api-request-blob' && l.message?.output_config?.effort) efforts.add(l.message.output_config.effort);
      if (l.type === 'user') {
        const content = Array.isArray(l.message?.content) ? l.message.content : [{ type: 'text', text: String(l.message?.content ?? '') }];
        // A turn starts with a prompt or a message to the agent, not with a tool result.
        if (content.some((c) => c.type === 'text' && c.text?.trim()) && !content.some((c) => c.type === 'tool_result')) turns += 1;
        // The cooperator's kit text: a skill Claude Code inserts into the context, and kit files it reads.
        if (!meta) for (const c of content) {
          if (c.type === 'text' && /^Base directory for this skill: .*\/skills\/workforce-/.test(c.text ?? '')) res.kitChars += c.text.length;
          if (c.type === 'tool_result' && kitReads.has(c.tool_use_id)) res.kitChars += textLength(c.content);
        }
      }
      if (l.type !== 'assistant') continue;
      const u = l.message?.usage; const id = l.message?.id;
      if (id && u && !(seen.has(id) && !msgs.has(id))) {
        const w1 = u.cache_creation?.ephemeral_1h_input_tokens; const w5 = u.cache_creation?.ephemeral_5m_input_tokens;
        msgs.set(id, {
          model: l.message.model ?? model, in: u.input_tokens ?? 0, cw: u.cache_creation_input_tokens ?? 0, cr: u.cache_read_input_tokens ?? 0,
          w1: w1 ?? 0, w5: w5 ?? (w1 == null ? u.cache_creation_input_tokens ?? 0 : 0), out: Math.max(msgs.get(id)?.out ?? 0, u.output_tokens ?? 0),
        });
      }
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
    for (const id of msgs.keys()) seen.add(id);
    const sum = { requests: msgs.size, input: 0, cacheWrite: 0, cacheRead: 0, output: 0, usd: 0, usdHigh: 0 };
    for (const m of msgs.values()) {
      sum.input += m.in; sum.cacheWrite += m.cw; sum.cacheRead += m.cr; sum.output += m.out;
      const usd = claudeUsd({ model: m.model, in: m.in, w5: m.w5, w1: m.w1, hit: m.cr, out: m.out });
      if (usd == null) sum.unpriced = true; else { sum.usd += usd; sum.usdHigh += usd; }
    }
    return { role: meta ? meta.agentType : 'cooperator', task: meta?.description ?? '', model, effort: efforts.size ? [...efforts].join('/') : meta ? ROLE_EFFORT[meta.agentType] ?? '?' : 'medium', effortSource: efforts.size ? 'request' : 'role default', background: meta ? meta.requestShape === 'background' : false, seconds: first && last ? secs(first, last) : null, turns: meta && msgs.size ? Math.max(turns, 1) : turns, toolCalls: Object.values(tools).reduce((a, b) => a + b, 0), tools, ...sum, thinking: null };
  };
  if (files.includes('main.jsonl')) res.actors.push(actor('main.jsonl', null));
  for (const f of files.filter((n) => n.startsWith('agent-') && n.endsWith('.jsonl')).sort()) {
    res.actors.push(actor(f, JSON.parse(fs.readFileSync(path.join(tdir, f.replace(/\.jsonl$/, '.meta.json')), 'utf8'))));
  }
  res.thinking = Object.values(result?.modelUsage ?? {}).reduce((a, v) => a + (v.thinkingTokens ?? 0), 0);
  res.modelUsage = result?.modelUsage ?? null;
  res.reportedUsd = result?.total_cost_usd ?? null;
  res.finalReport = result?.result ?? '';
}

// Codex threads: in a Codex cell the cooperator `codex exec` started and its agents; in a Claude
// cell the Codex runs the kit started (auditors, reviewers, escalated workers).
function codex(logs, res, inClaudeCell) {
  const mainId = jsonl(path.join(logs, 'codex.events.jsonl')).find((e) => e.type === 'thread.started')?.thread_id;
  const dir = path.join(logs, 'rollouts');
  const threads = new Map();
  for (const f of (fs.existsSync(dir) ? fs.readdirSync(dir) : []).sort()) {
    const lines = jsonl(path.join(dir, f));
    const meta = lines.find((l) => l.type === 'session_meta')?.payload;
    if (!meta) continue;
    if (!inClaudeCell && meta.id !== mainId && meta.session_id !== mainId) continue;
    const t = threads.get(meta.id) ?? { meta, lines: [] };
    t.lines.push(...lines);
    threads.set(meta.id, t);
  }
  for (const { meta, lines } of threads.values()) {
    const isMain = !inClaudeCell && meta.id === mainId;
    const ctx = lines.find((l) => l.type === 'turn_context')?.payload ?? {};
    const dev = lines.filter((l) => l.type === 'response_item' && l.payload?.role === 'developer').flatMap((l) => l.payload.content ?? []).map((c) => c.text ?? '').join('\n');
    const firstUser = lines.find((l) => l.type === 'response_item' && l.payload?.role === 'user' && !(l.payload.content ?? []).some((c) => /^<(environment_context|user_instructions)/.test(c.text ?? '')))?.payload.content?.map((c) => c.text ?? '').join('\n') ?? '';
    const role = isMain ? 'cooperator'
      : dev.match(/You are a Workforce (worker|reviewer|auditor|probe)/i)?.[1]?.toLowerCase()
        ?? CODEX_RUN_ROLE.find(([re]) => re.test(firstUser.trim()))?.[1] ?? 'agent';
    const seenUsage = new Set(); const seenCalls = new Set(); const tools = {}; const kitReads = new Set();
    const byResponse = lines.some((l) => l.type === 'token_usage_record');
    const sum = { requests: 0, input: 0, cacheRead: 0, output: 0, thinking: 0, usd: 0, usdHigh: 0 };
    const add = (k, n = 1) => { tools[k] = (tools[k] ?? 0) + n; };
    for (const l of lines) {
      const p = l.payload ?? {};
      const info = !byResponse && l.type === 'event_msg' && p.type === 'token_count' ? p.info : null;
      const record = byResponse && l.type === 'token_usage_record' && p.usage && (!p.thread_id || p.thread_id === meta.id) ? p : null;
      if (record || (info?.total_token_usage && info.last_token_usage)) {
        const key = record ? record.response_id ?? JSON.stringify(record.usage) : JSON.stringify(info.total_token_usage);
        if (!seenUsage.has(key)) {
          seenUsage.add(key);
          const u = record ? record.usage : info.last_token_usage;
          sum.requests += 1; sum.input += (u.input_tokens ?? 0) - (u.cached_input_tokens ?? 0); sum.cacheRead += u.cached_input_tokens ?? 0;
          sum.output += u.output_tokens ?? 0; sum.thinking += u.reasoning_output_tokens ?? 0;
          const usd = openaiUsd(ctx.model, u);
          if (usd == null) sum.unpriced = true; else { sum.usd += usd.low; sum.usdHigh += usd.high; }
        }
      }
      // The cooperator's kit text: the full output of each command that read a kit file
      // (an upper bound when the same command also read other files).
      if (isMain && l.type === 'response_item' && (p.type === 'custom_tool_call' || p.type === 'function_call') && /skills\/workforce-[a-z-]+\/(SKILL\.md|references\/)|codex-workforce\/profiles\.json/.test(String(p.input ?? p.arguments ?? ''))) kitReads.add(p.call_id);
      if (isMain && l.type === 'response_item' && (p.type === 'custom_tool_call_output' || p.type === 'function_call_output') && kitReads.has(p.call_id)) { res.kitChars += textLength(p.output); kitReads.delete(p.call_id); }
      if (l.type === 'response_item' && (p.type === 'function_call' || p.type === 'custom_tool_call')) {
        if (p.call_id && seenCalls.has(p.call_id)) continue;
        if (p.call_id) seenCalls.add(p.call_id);
      }
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
        if (isMain) for (const m of input.matchAll(/skills\/([a-z0-9-]+)\/(SKILL\.md|references\/[a-z-]+\.md)|(codex-workforce)\/profiles\.json/g)) {
          const k = m[3] ? `${m[3]}/profiles.json` : `${m[1]}/${m[2]}`;
          res.kitFiles[k] = (res.kitFiles[k] ?? 0) + 1;
        }
      }
      if (l.type === 'response_item' && (p.type === 'agent_message' || (p.type === 'message' && p.role === 'assistant'))) {
        const text = p.text ?? (p.content ?? []).map((c) => c.text ?? '').join(' ');
        if (!isMain && /STATUS:\s*handoff/i.test(text)) res.handoffs += 1;
      }
    }
    const stamps = lines.map((l) => l.timestamp).filter(Boolean).sort();
    res.actors.push({
      role, model: ctx.model, effort: ctx.effort ?? ctx.reasoning_effort, background: inClaudeCell,
      seconds: stamps.length ? secs(stamps[0], stamps.at(-1)) : null,
      turns: lines.filter((l) => l.type === 'turn_context').length,
      toolCalls: Object.values(tools).reduce((a, b) => a + b, 0), tools,
      requests: sum.requests, input: sum.input, cacheWrite: null, cacheRead: sum.cacheRead, output: sum.output, thinking: sum.thinking,
      usd: sum.usd, usdHigh: sum.usdHigh, ...(sum.unpriced ? { unpriced: true } : {}),
    });
  }
  if (!inClaudeCell) {
    res.thinking = res.actors.reduce((a, x) => a + (x.thinking ?? 0), 0);
    res.finalReport = read(path.join(logs, 'codex.last.md'));
  }
}

const cells = [];
for (const id of fs.readdirSync(path.join(out, 'cells')).sort()) {
  const dir = path.join(out, 'cells', id);
  if (!fs.existsSync(path.join(dir, 'cell.txt'))) continue;
  const [task, variant, model, repeat] = read(path.join(dir, 'cell.txt')).split(' ');
  const logs = path.join(dir, 'logs');
  const res = { id, task, variant, model, repeat: Number(repeat), actors: [], skills: [], kitFiles: {}, kitChars: 0, handoffs: 0, messagesToAgents: 0, messagesFromAgents: 0, waits: { sleep: 0, sleepSeconds: 0, wait_agent: 0 } };
  res.exitCode = Number(read(path.join(logs, 'exit.txt')) || NaN);
  res.wallSeconds = secs(read(path.join(logs, 'start.txt')), read(path.join(logs, 'end.txt')));
  if (model === 'opus') { claude(logs, res); codex(logs, res, true); } else codex(logs, res, false);
  res.actors.sort((a, b) => (a.role === 'cooperator' ? -1 : b.role === 'cooperator' ? 1 : 0));
  const sum = (f, list = res.actors) => list.reduce((a, x) => a + (x[f] ?? 0), 0);
  const coop = res.actors.find((a) => a.role === 'cooperator');
  const of = (fam) => res.actors.filter((a) => family(a.role) === fam);
  res.totals = {
    agents: res.actors.length - (coop ? 1 : 0), toolCallsCooperator: coop?.toolCalls ?? 0, toolCallsAgents: sum('toolCalls') - (coop?.toolCalls ?? 0), toolCalls: sum('toolCalls'),
    requests: sum('requests'), input: sum('input'), cacheWrite: model === 'sol' ? null : sum('cacheWrite'), cacheRead: sum('cacheRead'),
    output: sum('output'), thinking: res.thinking,
    usd: sum('usd'), usdHigh: sum('usdHigh'), usdAgents: sum('usd') - (coop?.usd ?? 0),
    usdByRole: Object.fromEntries(['cooperator', 'worker', 'auditor', 'reviewer', 'probe', 'other'].map((f) => [f, sum('usd', of(f))])),
    // Turns: an agent's first assignment and every message that continued it.
    workers: of('worker').length, workerTurns: sum('turns', of('worker')), auditorTurns: sum('turns', of('auditor')), reviewerTurns: sum('turns', of('reviewer')),
  };
  res.totals.fixRounds = Math.max(0, res.totals.workerTurns - res.totals.workers);
  res.totals.inputTotal = res.totals.input + (res.totals.cacheWrite ?? 0) + res.totals.cacheRead;
  res.review = reviewLines(res.finalReport);
  res.quality = fs.existsSync(path.join(dir, 'check.json')) ? JSON.parse(read(path.join(dir, 'check.json')) || '{}') : {};
  if (fs.existsSync(path.join(dir, 'git.json'))) Object.assign(res.quality, JSON.parse(read(path.join(dir, 'git.json')) || '{}'));
  res.provenance = fs.existsSync(path.join(dir, 'provenance.json')) ? JSON.parse(read(path.join(dir, 'provenance.json')) || '{}') : {};
  cells.push(res);
}
fs.writeFileSync(target, JSON.stringify({ run: path.basename(out), suite: read(path.join(out, 'suite.txt')), variants: read(path.join(out, 'variants.txt')).split('\n'), cells }, null, 1));
console.log(`metrics: ${cells.length} cells -> ${target}`);
