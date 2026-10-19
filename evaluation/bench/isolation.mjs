#!/usr/bin/env node
// Finds cells of a bench run that shared files under /tmp while they ran at the same time:
// the agents choose absolute paths themselves, and two cells of the same model and task tend
// to choose the same ones. Writes isolation.json; report.mjs shows the status per cell.
//   clean      no absolute /tmp path used by another cell running at the same time
//   shared     such a path exists, but no read followed another cell's write
//   crossed    a cell read a path after another running cell had written it
//   stale      a cell's first use of a path was a read, an earlier cell had written it, and
//              that cell's tmpclean.mjs did not remove it
// Writes and reads are told apart from the command text, so the classification is heuristic.
// usage: isolation.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2];
const cellsDir = path.join(out, 'cells');
const jsonl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
const TMP = /\/(?:private\/)?tmp\/[A-Za-z0-9._\-]+/g;
const writes = (cmd, p) => {
  const e = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(>>?|--output-file[ =]|-o +|tee +(-a +)?|cp +[^;&|]*?|mv +[^;&|]*?) *${e}`).test(cmd);
};

const cells = {};
for (const id of fs.readdirSync(cellsDir).sort()) {
  const logs = path.join(cellsDir, id, 'logs');
  if (!fs.existsSync(path.join(logs, 'start.txt')) || !fs.existsSync(path.join(logs, 'end.txt'))) continue;
  const span = ['start.txt', 'end.txt'].map((f) => new Date(fs.readFileSync(path.join(logs, f), 'utf8').trim()));
  const uses = [];
  const add = (t, cmd) => {
    for (const m of new Set(String(cmd).match(TMP) ?? [])) {
      const p = m.replace(/^\/private/, '');
      if (p.startsWith('/tmp/agent-cooperator-bench') || p.startsWith('/tmp/claude-')) continue;
      uses.push({ t: new Date(t), path: p, write: writes(cmd, m) });
    }
  };
  const t = path.join(logs, 'transcripts');
  if (fs.existsSync(t)) for (const f of fs.readdirSync(t).filter((n) => n.endsWith('.jsonl'))) {
    for (const l of jsonl(path.join(t, f))) for (const c of l.message?.content ?? []) if (c.type === 'tool_use' && l.timestamp) add(l.timestamp, c.input?.command ?? JSON.stringify(c.input));
  }
  const r = path.join(logs, 'rollouts');
  if (fs.existsSync(r)) for (const f of fs.readdirSync(r)) {
    for (const l of jsonl(path.join(r, f))) {
      const p = l.payload ?? {};
      if (l.type === 'response_item' && l.timestamp && (p.type === 'custom_tool_call' || p.type === 'function_call')) add(l.timestamp, p.input ?? p.arguments);
    }
  }
  const cleaned = path.join(cellsDir, id, 'tmp-cleaned.json');
  const removed = new Set(fs.existsSync(cleaned) ? (JSON.parse(fs.readFileSync(cleaned, 'utf8') || '{}').removed ?? []).map((x) => x.replace(/^\/private/, '')) : []);
  cells[id] = { span, uses, removed };
}

const overlap = (a, b) => cells[a].span[0] < cells[b].span[1] && cells[b].span[0] < cells[a].span[1];
const result = {};
for (const id of Object.keys(cells)) {
  const shared = []; const crossed = [];
  for (const other of Object.keys(cells)) {
    if (other === id || !overlap(id, other)) continue;
    const theirs = new Set(cells[other].uses.map((u) => u.path));
    for (const p of new Set(cells[id].uses.map((u) => u.path))) {
      if (!theirs.has(p)) continue;
      shared.push({ path: p, with: other });
      // A read of p by this cell after the other cell wrote p, and after this cell's own last write before it.
      for (const read of cells[id].uses.filter((u) => u.path === p && !u.write)) {
        const ownWrite = cells[id].uses.filter((u) => u.path === p && u.write && u.t <= read.t).at(-1);
        const foreign = cells[other].uses.find((u) => u.path === p && u.write && u.t <= read.t && (!ownWrite || u.t >= ownWrite.t));
        if (foreign) { crossed.push({ path: p, with: other, read: read.t.toISOString(), foreignWrite: foreign.t.toISOString() }); break; }
      }
    }
  }
  // A read of what an earlier cell left: this cell's first use of p is a read, and a cell that
  // had finished wrote p before it without removing it afterwards.
  const stale = [];
  for (const p of new Set(cells[id].uses.map((u) => u.path))) {
    const first = cells[id].uses.filter((u) => u.path === p).sort((a, b) => a.t - b.t)[0];
    if (first.write) continue;
    for (const other of Object.keys(cells)) {
      if (other === id || overlap(id, other) || cells[other].removed.has(p)) continue;
      const w = cells[other].uses.find((u) => u.path === p && u.write && u.t < first.t);
      if (w) { stale.push({ path: p, from: other, read: first.t.toISOString(), wrote: w.t.toISOString() }); break; }
    }
  }
  result[id] = { status: crossed.length ? 'crossed' : stale.length ? 'stale' : shared.length ? 'shared' : 'clean', shared, crossed, stale };
}
fs.writeFileSync(path.join(out, 'isolation.json'), JSON.stringify(result, null, 1));
const count = (s) => Object.values(result).filter((x) => x.status === s).length;
console.log(`isolation: ${count('clean')} clean, ${count('shared')} shared, ${count('stale')} stale, ${count('crossed')} crossed -> ${path.join(out, 'isolation.json')}`);
