#!/usr/bin/env node
// Public evidence of a run, for anyone to recompute without the private suite.
// The run's metrics and its earlier columns are recounted by metrics.mjs from the raw logs. Each
// cell keeps its numbers (prices, tokens, requests, tool calls by name, time, route, review and
// accept counts, the suite's quality and contract fields) and loses everything else: the agents'
// reports, the cooperator's task labels, provenance commits and paths. Every model request is kept
// as its token counts, so each price can be recomputed with prices.mjs. METRICS.md and COMPARISON.md
// are rebuilt from the published files by report.mjs. The result is scanned for the strings named
// in EVIDENCE_PRIVATE (a regular expression) and for the private repository's commits, and refused
// if any appears. verify-evidence.mjs checks it.
// usage: EVIDENCE_PRIVATE='<regex>' evidence.mjs <run-dir> <evidence-root>
//   writes <evidence-root>/<run>/ and, for each earlier run it compares with, <evidence-root>/<earlier run>/
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BENCH = import.meta.dirname;
const [runArg, rootArg] = process.argv.slice(2);
if (!runArg || !rootArg || !process.env.EVIDENCE_PRIVATE) {
  console.error("usage: EVIDENCE_PRIVATE='<regex>' evidence.mjs <run-dir> <evidence-root>");
  process.exit(64);
}
const run = path.resolve(runArg); const root = path.resolve(rootArg); const name = path.basename(run);
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-'));
const privateCommits = new Set();

// Recount one run from its logs, with every request's tokens beside the metrics.
function recount(dir) {
  const base = path.join(tmp, path.basename(dir));
  execFileSync('node', [path.join(BENCH, 'metrics.mjs'), dir, `${base}.json`], { env: { ...process.env, METRICS_REQUESTS: `${base}.requests.jsonl` }, stdio: ['ignore', 'ignore', 'inherit'] });
  return { metrics: JSON.parse(read(`${base}.json`)), requests: read(`${base}.requests.jsonl`).split('\n').filter(Boolean).map((l) => JSON.parse(l)) };
}
const KEEP_PROVENANCE = ['claude', 'codex', 'tmpJail', 'kitDelivery', 'taskAsFile', 'codexLaunch', 'policySets', 'setup'];
// The suite's quality fields, without what describes the private code: a defect keeps its number,
// and a field that names one of its source files (TypeScript, SQL) is left out.
const FILE = /[\w-]+\.(?:ts|tsx|sql)\b/;
const qualityKey = (k) => k.replace(/^(Дефект \d+):.*$/, '$1').replace(/^Чтение аудита не сломано$/, 'Прежнее поведение не сломано').replace(/^Патч влит.*$/, 'Патч влит');
const cleanQuality = (q) => Object.fromEntries(Object.entries(q ?? {}).map(([k, v]) => [qualityKey(k), v]).filter(([k, v]) => !FILE.test(k) && !FILE.test(String(v))));
function clean(metrics, variants) {
  const cells = metrics.cells.filter((c) => variants.includes(c.variant)).map((c) => {
    for (const k of ['base', 'head']) if (c.provenance?.[k]) privateCommits.add(c.provenance[k]);
    const { finalReport, provenance, quality, ...rest } = c;
    return {
      ...rest,
      quality: cleanQuality(quality),
      provenance: Object.fromEntries(KEEP_PROVENANCE.filter((k) => provenance?.[k] !== undefined).map((k) => [k, provenance[k]])),
      actors: c.actors.map(({ task, ...a }) => a),
    };
  });
  return { run: metrics.run, suite: 'private suite', variants: metrics.variants.filter((v) => variants.includes(v.split('=')[0])), coldStartPrefix: metrics.coldStartPrefix ?? null, cells };
}
const write = (f, text) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const json = (v) => `${JSON.stringify(v, null, 1)}\n`;
const lines = (rows) => (rows.length ? `${rows.map((r) => JSON.stringify(r)).join('\n')}\n` : '');
// Each cell's isolation status and which cells it overlapped with, without the shared files' paths.
const isolationOf = (dir, ids) => {
  const iso = read(path.join(dir, 'isolation.json')); if (!iso) return null;
  const only = (list) => (list ?? []).map((x) => ({ with: x.with }));
  return Object.fromEntries(Object.entries(JSON.parse(iso)).filter(([id]) => ids.includes(id)).map(([id, v]) => [id, { status: v.status, shared: only(v.shared), crossed: only(v.crossed) }]));
};

// The run itself.
const own = recount(run);
const ownVariants = own.metrics.variants.map((v) => v.split('=')[0]);
const out = path.join(root, name);
fs.rmSync(out, { recursive: true, force: true });
const cleaned = clean(own.metrics, ownVariants);
write(path.join(out, 'metrics.json'), json(cleaned));
write(path.join(out, 'requests.jsonl'), lines(own.requests));
write(path.join(out, 'isolation.json'), json(isolationOf(run, cleaned.cells.map((c) => c.id)) ?? {}));
for (const f of ['tasks.txt', 'variants.txt', 'models.txt', 'EXPECTATIONS.md']) if (fs.existsSync(path.join(run, f))) write(path.join(out, f), read(path.join(run, f)));
write(path.join(out, 'versions.txt'), read(path.join(run, 'versions.txt')).split(os.homedir()).join('~'));

// The earlier runs it compares with: their recounted cells beside the run, their isolation and
// requests in a directory of their own, and prev.txt pointing there relatively.
const prev = [];
for (const line of read(path.join(run, 'prev.txt')).split('\n').filter(Boolean)) {
  const [dir, ...variants] = line.split(/\s+/);
  const other = recount(dir);
  const taken = clean(other.metrics, variants);
  const ids = taken.cells.map((c) => c.id);
  write(path.join(out, `prev-metrics-${other.metrics.run}.json`), json(taken));
  const otherOut = path.join(root, other.metrics.run);
  fs.rmSync(otherOut, { recursive: true, force: true });
  write(path.join(otherOut, 'requests.jsonl'), lines(other.requests.filter((r) => ids.includes(r.cell))));
  write(path.join(otherOut, 'isolation.json'), json(isolationOf(dir, ids) ?? {}));
  prev.push({ run: other.metrics.run, variants, ids });
}
if (prev.length) write(path.join(out, 'prev.txt'), prev.map((p) => `../${p.run} ${p.variants.join(' ')}`).join('\n') + '\n');

// The large task's contract of earlier runs, rechecked by one hidden test, without the commits.
const recheck = path.join(path.dirname(run), 'contract-recheck');
if (fs.existsSync(path.join(recheck, 'summary.txt'))) {
  const wanted = new Set(prev.flatMap((p) => p.ids.map((id) => `${p.run} ${id}`)));
  const rows = read(path.join(recheck, 'summary.txt')).split('\n').filter(Boolean).map((l) => l.split(' ')).filter((f) => wanted.has(`${f[0]} ${f[1]}`));
  for (const f of rows) privateCommits.add(f[2]);
  write(path.join(root, 'contract-recheck', 'summary.txt'), rows.map((f) => [f[0], f[1], '-', ...f.slice(3)].join(' ')).join('\n') + '\n');
  if (fs.existsSync(path.join(recheck, 'evaluator.txt'))) write(path.join(root, 'contract-recheck', 'evaluator.txt'), read(path.join(recheck, 'evaluator.txt')).replace(/\S+\.(?:ts|tsx|sql)\b/, 'hidden contract test'));
}

execFileSync('node', [path.join(BENCH, 'report.mjs'), out], { stdio: ['ignore', 'ignore', 'inherit'] });
fs.rmSync(tmp, { recursive: true, force: true });

// Nothing private may remain: the named strings, the home directory, the private commits.
const deny = new RegExp(`${process.env.EVIDENCE_PRIVATE}|${os.homedir().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
const hits = [];
const scan = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { scan(p); continue; }
    const text = read(p);
    const m = deny.exec(text) ?? FILE.exec(text); if (m) hits.push(`${path.relative(root, p)}: "${m[0]}"`);
    for (const c of privateCommits) if (c && text.includes(c.slice(0, 7))) hits.push(`${path.relative(root, p)}: commit ${c.slice(0, 7)}`);
  }
};
for (const d of [out, ...prev.map((p) => path.join(root, p.run)), path.join(root, 'contract-recheck')]) if (fs.existsSync(d)) scan(d);
if (hits.length) { console.error(`evidence: refused, private data in the output:\n- ${[...new Set(hits)].slice(0, 30).join('\n- ')}`); process.exit(1); }
console.log(`evidence: ${cleaned.cells.length} cells of ${name}, ${prev.reduce((a, p) => a + p.ids.length, 0)} earlier cells, ${own.requests.length} requests of the run -> ${out}`);
