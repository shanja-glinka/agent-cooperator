#!/usr/bin/env node
// For waitcheck.sh: every wait_agent call of the cooperator (the root thread) in a Codex sessions
// directory, with the arguments it passed, how long it waited, and what it returned.
// usage: waitcheck.mjs <CODEX_HOME>/sessions
import fs from 'node:fs';
import path from 'node:path';

const walk = (d, out = []) => { if (!fs.existsSync(d)) return out; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.jsonl')) out.push(p); } return out; };
for (const file of walk(process.argv[2])) {
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const meta = lines.find((l) => l.type === 'session_meta')?.payload ?? {};
  if (meta.thread_source && meta.thread_source !== 'user') continue;
  const calls = new Map();
  for (const l of lines) {
    const p = l.payload ?? {};
    if (l.type === 'response_item' && p.type === 'function_call' && p.name === 'wait_agent') calls.set(p.call_id, { at: l.timestamp, args: p.arguments });
    if (l.type === 'response_item' && p.type === 'function_call_output' && calls.has(p.call_id)) {
      const c = calls.get(p.call_id);
      const waited = Math.round((new Date(l.timestamp) - new Date(c.at)) / 1000);
      console.log(`  wait_agent ${c.args} → after ${waited}s: ${String(p.output).replace(/\s+/g, ' ').slice(0, 300)}`);
    }
  }
  if (!calls.size) console.log('  no wait_agent call in the root thread');
}
