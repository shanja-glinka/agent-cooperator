#!/usr/bin/env node
// After a cell has run: removes what its agents wrote directly under /tmp. Agents choose
// absolute paths such as /tmp/ci.log themselves, and the host's /tmp is shared, so a later
// cell would otherwise find them. Removed only when the cell's own commands name the path, it
// belongs to this user, it changed after the cell started (a directory: was created after),
// and no cell that is still running names it anywhere in its live logs.
// usage: tmpclean.mjs <cell-dir> <running-dir>   prints JSON: removed, kept and why
import fs from 'node:fs';
import path from 'node:path';

const [cellDir, runningDir] = process.argv.slice(2);
const logs = path.join(cellDir, 'logs');
const start = new Date(fs.readFileSync(path.join(logs, 'start.txt'), 'utf8').trim());
const TMP = /\/(?:private\/)?tmp\/([A-Za-z0-9._-]+)/g;
const OWN = (n) => n.startsWith('agent-cooperator-bench') || n.startsWith('claude-');

// Every text file under a path: logs, transcripts, rollouts.
const texts = (p) => {
  if (!fs.existsSync(p)) return [];
  const st = fs.statSync(p);
  if (st.isFile()) return [p];
  return fs.readdirSync(p).flatMap((n) => texts(path.join(p, n)));
};
const names = (files) => {
  const found = new Set();
  for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(TMP)) if (!OWN(m[1])) found.add(m[1]);
  return found;
};
// The cell's own paths come from its commands only (Claude tool calls, Codex function and
// custom tool calls), not from file contents the agents happened to read.
const jsonl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
const commandNames = () => {
  const found = new Set();
  const add = (text) => { for (const m of String(text).matchAll(TMP)) if (!OWN(m[1])) found.add(m[1]); };
  for (const f of texts(path.join(logs, 'transcripts')).filter((n) => n.endsWith('.jsonl'))) {
    for (const l of jsonl(f)) for (const c of l.message?.content ?? []) if (c.type === 'tool_use') add(JSON.stringify(c.input));
  }
  for (const f of texts(path.join(logs, 'rollouts'))) {
    for (const l of jsonl(f)) {
      const q = l.payload ?? {};
      if (l.type === 'response_item' && (q.type === 'custom_tool_call' || q.type === 'function_call')) add(q.input ?? q.arguments);
    }
  }
  return found;
};

// Names used by cells still running, from the live logs each of them registered.
const running = new Set();
for (const entry of fs.existsSync(runningDir) ? fs.readdirSync(runningDir) : []) {
  const files = [];
  for (const line of fs.readFileSync(path.join(runningDir, entry), 'utf8').split('\n').filter(Boolean)) {
    const [kind, a, b] = line.split(' ');
    if (kind === 'file' || kind === 'dir') files.push(...texts(a));
    if (kind === 'claude') {
      const projects = path.join(a, 'projects');
      for (const d of fs.existsSync(projects) ? fs.readdirSync(projects) : []) {
        files.push(...texts(path.join(projects, d, `${b}.jsonl`)), ...texts(path.join(projects, d, b)));
      }
    }
  }
  for (const n of names(files)) running.add(n);
}

const result = { removed: [], kept: [] };
for (const n of commandNames()) {
  const p = path.join('/private/tmp', n);
  let st;
  try { st = fs.lstatSync(p); } catch { continue; }
  const why = st.uid !== process.getuid() ? 'other owner'
    : running.has(n) ? 'used by a running cell'
    : st.isDirectory() ? (st.birthtime < start ? 'existed before the cell' : null)
    : st.mtime < start ? 'not changed by the cell' : null;
  if (why) { result.kept.push({ path: p, why }); continue; }
  fs.rmSync(p, { recursive: true, force: true });
  result.removed.push(p);
}
console.log(JSON.stringify(result, null, 1));
