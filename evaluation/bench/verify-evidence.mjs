#!/usr/bin/env node
// Checks published evidence (evidence.mjs) without the private suite. It recomputes the price of
// every model request from its tokens at the list prices in prices.mjs, and checks each agent's and
// each cell's sums in metrics.json and in the earlier columns, and what the long-prompt tiers added.
// It recomputes the cold-start prices.
// Then it rebuilds METRICS.md and COMPARISON.md from the published files with report.mjs in a copy
// and compares them byte for byte with the published ones.
// usage: verify-evidence.mjs <evidence-run-dir>   e.g. evaluation/evidence/2026-10-20-v9
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { claudeReadAsWrite, claudeUsd, claudeUsdBaseTier, openaiUsd, openaiUsdBaseTier } from './prices.mjs';

const dir = path.resolve(process.argv[2] ?? '');
if (!fs.existsSync(path.join(dir, 'metrics.json'))) { console.error('usage: verify-evidence.mjs <evidence-run-dir>'); process.exit(64); }
const root = path.dirname(dir);
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
const close = (a, b) => Math.abs((a ?? 0) - (b ?? 0)) <= 1e-9 * Math.max(1, Math.abs(a ?? 0), Math.abs(b ?? 0));
const problems = [];
const count = { requests: 0, actors: 0, cells: 0 };

function verify(label, metricsFile, requestsFile) {
  const m = JSON.parse(read(metricsFile));
  const by = new Map();
  for (const r of read(requestsFile).split('\n').filter(Boolean).map((l) => JSON.parse(l))) {
    const key = `${r.cell}#${r.actor}`;
    if (!by.has(key)) by.set(key, []);
    by.get(key).push(r);
  }
  const firsts = new Map();
  for (const c of m.cells) {
    let cellUsd = 0;
    c.actors.forEach((a, i) => {
      const list = by.get(`${c.id}#${i}`) ?? [];
      const s = { usd: 0, input: 0, cacheRead: 0, output: 0, cacheWrite: 0, tierPremium: 0 };
      for (const r of list) {
        if ('in' in r) {
          const req = { model: r.model, in: r.in, w5: r.w5, w1: r.w1, hit: r.cr, out: r.out };
          const usd = claudeUsd(req) ?? 0;
          s.usd += usd; s.tierPremium += usd - (claudeUsdBaseTier(req) ?? usd);
          s.input += r.in; s.cacheWrite += r.w5 + r.w1; s.cacheRead += r.cr; s.output += r.out;
        } else {
          const u = { input_tokens: r.input, cached_input_tokens: r.cached, cache_write_input_tokens: r.cacheWrite, output_tokens: r.output };
          const usd = openaiUsd(r.model, u)?.low ?? 0;
          s.usd += usd; s.tierPremium += usd - (openaiUsdBaseTier(r.model, u) ?? usd);
          s.input += r.input - r.cached; s.cacheRead += r.cached; s.output += r.output;
        }
      }
      const where = `${label} ${c.id} actor ${i} (${a.role})`;
      if (list.length !== a.requests) problems.push(`${where}: ${list.length} requests published, metrics say ${a.requests}`);
      if (!close(s.usd, a.usd)) problems.push(`${where}: price recomputes to $${s.usd.toFixed(6)}, metrics say $${(a.usd ?? 0).toFixed(6)}`);
      if (a.tierPremium != null && !close(s.tierPremium, a.tierPremium)) problems.push(`${where}: long-prompt surcharge recomputes to $${s.tierPremium.toFixed(6)}, metrics say $${a.tierPremium.toFixed(6)}`);
      for (const f of ['input', 'cacheRead', 'output']) if (s[f] !== (a[f] ?? 0)) problems.push(`${where}: ${f} ${s[f]} published, metrics say ${a[f]}`);
      if (a.cacheWrite != null && s.cacheWrite !== a.cacheWrite) problems.push(`${where}: cache writes ${s.cacheWrite} published, metrics say ${a.cacheWrite}`);
      if (i === 0 && a.role === 'cooperator' && list[0] && 'in' in list[0]) firsts.set(c.id, { read: list[0].cr, write: list[0].w5 + list[0].w1, ttl: list[0].w1 > 0 ? '1h' : '5m', model: list[0].model });
      cellUsd += s.usd; count.requests += list.length; count.actors += 1;
    });
    if (!close(cellUsd, c.totals.usd)) problems.push(`${label} ${c.id}: cell price recomputes to $${cellUsd.toFixed(6)}, metrics say $${c.totals.usd.toFixed(6)}`);
    count.cells += 1;
  }
  // The cold start: the prefix every cell of that run shares, from the cooperators that wrote it.
  const cold = [...firsts.values()].filter((f) => f.write > 0);
  const shared = m.coldStartPrefix ?? (cold.length ? Math.min(...cold.map((f) => f.read)) : null);
  for (const c of m.cells) {
    const f = firsts.get(c.id);
    const tokens = f && shared != null && f.write === 0 && f.read > shared ? f.read - shared : 0;
    const want = c.totals.usd + (tokens ? claudeReadAsWrite(f.model, tokens, cold[0]?.ttl ?? '1h') : 0);
    if (!close(want, c.totals.usdCold ?? c.totals.usd)) problems.push(`${label} ${c.id}: cold-start price recomputes to $${want.toFixed(6)}, metrics say $${(c.totals.usdCold ?? 0).toFixed(6)}`);
  }
}

verify(path.basename(dir), path.join(dir, 'metrics.json'), path.join(dir, 'requests.jsonl'));
const prev = read(path.join(dir, 'prev.txt')).split('\n').filter(Boolean).map((l) => l.split(/\s+/)[0]);
for (const p of prev) {
  const run = path.basename(p);
  verify(run, path.join(dir, `prev-metrics-${run}.json`), path.join(path.resolve(dir, p), 'requests.jsonl'));
}

// The tables, rebuilt from the published files in a copy.
const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-evidence-'));
for (const d of [path.basename(dir), ...prev.map((p) => path.basename(p)), 'contract-recheck']) {
  if (fs.existsSync(path.join(root, d))) fs.cpSync(path.join(root, d), path.join(copy, d), { recursive: true });
}
execFileSync('node', [path.join(import.meta.dirname, 'report.mjs'), path.join(copy, path.basename(dir))], { stdio: ['ignore', 'ignore', 'inherit'] });
for (const f of ['COMPARISON.md', 'METRICS.md']) {
  if (read(path.join(copy, path.basename(dir), f)) !== read(path.join(dir, f))) problems.push(`${f}: rebuilt from the published data, it differs from the published file`);
}
fs.rmSync(copy, { recursive: true, force: true });

if (problems.length) { console.error(`verify-evidence: ${problems.length} problems\n- ${problems.slice(0, 40).join('\n- ')}`); process.exit(1); }
console.log(`verify-evidence: ${count.requests} requests of ${count.actors} agents in ${count.cells} cells recompute to the published prices; METRICS.md and COMPARISON.md rebuild identically.`);
