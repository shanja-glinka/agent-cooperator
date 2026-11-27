// Rebuild CREDITS.md from the sanitized cells already checked by verify-evidence.mjs.
// Run: node credits.mjs [evidence-directory] > CREDITS.md
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2] ?? fileURLToPath(new URL('.', import.meta.url));
const read = file => readFileSync(resolve(dir, file), 'utf8');
const raw = read('./metrics.json');
const metrics = JSON.parse(raw);
const isoRaw = read('./isolation.json');
const isolation = JSON.parse(isoRaw);
const hash = text => createHash('sha256').update(text).digest('hex');
const rates = {
  'gpt-6.2-sol': [50, 2.5, 250],
  'gpt-6-luna': [2.5, 0.25, 12.5],
};
const stages = new Set(['cooperator', 'worker', 'reviewer']);
const variants = metrics.variants.map(s => s.split('=')[0]);
const tasks = read('./tasks.txt').trim().split(/\s+/);
const rows = metrics.cells.filter(c => c.model === 'sol').map(c => {
  const status = isolation[c.id]?.status;
  if (!status) throw new Error('Missing isolation verdict for ' + c.id);
  const byRole = {};
  const tokens = { input: 0, cacheRead: 0, output: 0 };
  let credit = 0;
  let requests = 0;
  const root = c.actors.find(a => a.role === 'cooperator');
  const met = c.quality['Контракт выполнен'] ?? c.quality['Решено'];
  const accepted = c.exitCode === 0 && root?.model === 'gpt-6.2-sol' && root.requests > 0
    && met === 'да' && c.quality['Коммитов'] > 0 && c.quality['Незакоммичено файлов'] === 0;
  for (const a of c.actors) {
    const rate = rates[a.model];
    if (!rate) throw new Error('Missing rate for ' + a.model + ' in ' + c.id);
    for (const key of Object.keys(tokens)) {
      if (!Number.isSafeInteger(a[key]) || a[key] < 0) throw new Error('Invalid ' + key + ' in ' + c.id);
      tokens[key] += a[key];
    }
    const amount = (a.input * rate[0] + a.cacheRead * rate[1] + a.output * rate[2]) / 1e6;
    const role = stages.has(a.role) ? a.role : 'other';
    byRole[role] = (byRole[role] ?? 0) + amount;
    credit += amount;
    requests += a.requests;
  }
  return { ...tokens, id: c.id, task: c.task, variant: c.variant, status, accepted, requests, credit, byRole };
});
const expected = new Set();
for (const spec of metrics.variants) {
  const variant = spec.split('=')[0];
  const scoped = spec.split('+')[0].split('@')[1];
  for (const task of scoped ? scoped.split(',') : tasks) {
    for (const repeat of [1, 2]) expected.add([task, variant, 'sol', 'r' + repeat].join('-'));
  }
}
for (const row of rows) {
  if (!expected.delete(row.id)) throw new Error('Unexpected or duplicate cell ' + row.id);
}
if (expected.size) throw new Error('Missing cells ' + [...expected].join(', '));
console.log('# GPT-6.2 Sol consumption');
console.log('\nStandard-speed credit equivalent from measured tokens of every Codex actor. GPT-6.2 Sol rates per million are 50 uncached input, 2.5 cached input and 250 output. GPT-6 Luna rates are 2.5, 0.25 and 12.5. Reasoning is included in output. Actual debits against a shared subscription allowance are unavailable per cell. [OpenAI token rates](https://learn.chatgpt.com/docs/pricing#token-rates)');
console.log('\nInputs: metrics.json SHA-256 ' + hash(raw) + ', isolation.json SHA-256 ' + hash(isoRaw) + '.');
console.log('\n## Cost per accepted result\n');
console.log('Clean attempts include failed checks. The numerator sums their credits. The denominator counts delivered commits from successful GPT-6.2 Sol runs that passed the task contract and left a clean checkout. See the cell table for all incurred spend and isolation verdicts. A suite total with missing clean cells has a different task mix.');
console.log('\n| Task | Variant | Clean / attempted | Accepted | Requests | Fresh input | Cached input | Output | Credits | Credits / accepted |');
console.log('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const task of ['All tasks', ...tasks]) {
  for (const variant of variants) {
    const group = rows.filter(c => c.variant === variant && (task === 'All tasks' || c.task === task));
    if (!group.length) continue;
    const clean = group.filter(c => c.status === 'clean');
    const sum = key => clean.reduce((n, c) => n + c[key], 0);
    const accepted = clean.filter(c => c.accepted).length;
    console.log('| ' + [task, variant, clean.length + '/' + group.length, accepted, sum('requests'), sum('input'), sum('cacheRead'), sum('output'), sum('credit').toFixed(2), accepted ? (sum('credit') / accepted).toFixed(2) : '—'].join(' | ') + ' |');
  }
}
console.log('\n## Individual attempts\n');
console.log('| Cell | Isolation | Contract and delivery passed | Accepted clean | Requests | Root credits | Worker credits | Reviewer credits | Other credits | Total credits |');
console.log('|---|---|---|---|---:|---:|---:|---:|---:|---:|');
for (const c of rows) {
  const byRole = ['cooperator','worker','reviewer','other'].map(k => (c.byRole[k] ?? 0).toFixed(2));
  console.log('| ' + [c.id, c.status, c.accepted ? 'yes' : 'no', c.accepted && c.status === 'clean' ? 'yes' : 'no', c.requests, ...byRole, c.credit.toFixed(2)].join(' | ') + ' |');
}
