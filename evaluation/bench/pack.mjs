#!/usr/bin/env node
// Packs one run's results to hand over for review: the reports, the metrics, the run's settings and
// each cell's small files (check, timeline, provenance, a replayed reviewer's answer), with
// MANIFEST.json (run, variants, kit commits as measured and as published, the bench's commit, the
// dependency snapshot, the contract evaluator, SHA-256 of every file). It refuses a run whose files
// disagree: a metrics file of another run, an earlier column's recount that is not that run, a table
// built from other data than the files beside it, or a report that does not name the run's kit.
// Raw logs stay out. Writes <run-dir>/pack/<run>.zip.
// usage: pack.mjs <run-dir>
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const run = path.resolve(process.argv[2] ?? '');
const name = path.basename(run);
const runs = path.dirname(run);
const repo = path.resolve(import.meta.dirname, '..', '..');
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const problems = [];
if (!fs.existsSync(path.join(run, 'cells'))) { console.error(`pack: ${run} is not a run directory`); process.exit(64); }

// The files that go in, relative to the run directory.
const TOP = /^(REPORT|EXPECTATIONS|COMPARISON|METRICS|ROUTES|BASELINE|REVIEWS)\.md$|^(metrics|baseline|isolation)\.json$|^prev-metrics-.+\.json$|^(versions|variants|models|tasks|suite|prev|policycheck|selftest|runs)\.txt$/;
const CELL = /^(cell\.txt|check\.json|git\.json|provenance\.json|diffstat\.txt|timeline\.md)$/;
const REPLAY = /^(review\.packet|.+\.result\.json|.+\.md|codex-run\.txt|exit\.txt|start\.txt|end\.txt)$/;
const files = fs.readdirSync(run).filter((f) => TOP.test(f)).sort();
for (const id of fs.readdirSync(path.join(run, 'cells')).sort()) {
  const dir = path.join(run, 'cells', id);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir).filter((x) => CELL.test(x)).sort()) files.push(`cells/${id}/${f}`);
  const logs = path.join(dir, 'logs');
  if (fs.existsSync(path.join(logs, 'review.packet'))) for (const f of fs.readdirSync(logs).filter((x) => REPLAY.test(x)).sort()) files.push(`cells/${id}/logs/${f}`);
}

// The run's own metrics and the earlier runs' recounts belong to the runs they name.
const metrics = read(path.join(run, 'metrics.json'));
if (metrics && JSON.parse(metrics).run !== name) problems.push(`metrics.json is run ${JSON.parse(metrics).run}, not ${name}`);
for (const f of files.filter((x) => /^prev-metrics-.+\.json$/.test(x))) {
  const want = f.slice('prev-metrics-'.length, -'.json'.length);
  const got = JSON.parse(read(path.join(run, f))).run;
  if (got !== want) problems.push(`${f} is run ${got}`);
}
// Each table names the data it was built from; the data beside it must be that data.
for (const f of ['COMPARISON.md', 'METRICS.md'].filter((x) => files.includes(x))) {
  const line = read(path.join(run, f)).match(/^Источники: (.+)\.$/m)?.[1];
  if (!line) { problems.push(`${f} does not name its data files (rebuild it with report.mjs)`); continue; }
  for (const [, file, hash] of line.matchAll(/(\S+) sha256:([0-9a-f]+)/g)) {
    if (!fs.existsSync(path.join(run, file))) problems.push(`${f} was built from ${file}, which is missing`);
    else if (!sha(path.join(run, file)).startsWith(hash)) problems.push(`${f} was built from another ${file}`);
  }
}
// The kit commits the run measured, and what they are called on GitHub after the 1.4.0 rewrite.
const published = new Map();
for (const m of (read(path.join(runs, 'KIT-COMMITS.md')) ?? '').matchAll(/^\|[^|]*\| ([0-9a-f]{7,}) \| ([0-9a-f]{7,}) \|/gm)) published.set(m[1], m[2]);
const variants = (read(path.join(run, 'variants.txt')) ?? '').split('\n').filter(Boolean).map((v) => {
  const commit = /=([0-9a-f]{7,})/.exec(v)?.[1] ?? null;
  return { variant: v.split('=')[0], commit, published: commit ? published.get(commit) ?? commit : null };
});
const report = read(path.join(run, 'REPORT.md'));
for (const v of variants.filter((x) => x.commit)) if (report && !report.includes(v.commit)) problems.push(`REPORT.md does not name ${v.variant}'s kit commit ${v.commit}`);

if (problems.length) { console.error(`pack: refused, the files of ${name} disagree:\n- ${problems.join('\n- ')}`); process.exit(1); }

const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
const firstCell = fs.readdirSync(path.join(run, 'cells')).sort().map((id) => read(path.join(run, 'cells', id, 'provenance.json'))).find(Boolean);
const manifest = {
  run: name,
  packedAt: new Date().toISOString(),
  variants,
  bench: { commit: git('rev-parse', '--short', 'HEAD'), dirty: git('status', '--porcelain', '--', 'evaluation/bench', 'payload') !== '' },
  dependencies: firstCell ? JSON.parse(firstCell).setup ?? null : null,
  evaluator: read(path.join(runs, 'contract-recheck', 'evaluator.txt'))?.trim() ?? null,
  files: files.map((f) => ({ path: f, bytes: fs.statSync(path.join(run, f)).size, sha256: sha(path.join(run, f)) })),
};
const stage = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR ?? '/tmp'), 'pack-'));
for (const f of files) { fs.mkdirSync(path.dirname(path.join(stage, name, f)), { recursive: true }); fs.copyFileSync(path.join(run, f), path.join(stage, name, f)); }
fs.writeFileSync(path.join(stage, name, 'MANIFEST.json'), `${JSON.stringify(manifest, null, 1)}\n`);
fs.mkdirSync(path.join(run, 'pack'), { recursive: true });
const zip = path.join(run, 'pack', `${name}.zip`);
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-q', '-r', zip, name], { cwd: stage });
fs.rmSync(stage, { recursive: true, force: true });
console.log(`pack: ${files.length + 1} files -> ${zip} (sha256 ${sha(zip).slice(0, 16)})`);
