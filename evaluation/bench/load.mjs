// Loads a bench run for the reports: its metrics and each cell's isolation status, plus, when
// bench.sh recorded earlier runs in prev.txt, those runs' cells of the named variants, recounted
// into prev-metrics-<run>.json by the current metrics.mjs and marked with the run they come from.
// prev.txt: one line per earlier run, "<dir> <variant> <variant>"; the v5 run (2026-10-20) wrote
// the directory on the first line and the variants on the second.
import fs from 'node:fs';
import path from 'node:path';

export const ISO = { clean: 'чисто', shared: 'общий файл', crossed: 'чтение чужого', stale: 'чтение остатка', container: 'свой контейнер' };
export const isClean = (c) => (c.quality?.['Изоляция /tmp'] ?? ISO.clean) === ISO.clean;

const isolation = (dir, cells) => {
  const f = path.join(dir, 'isolation.json');
  if (!fs.existsSync(f)) return;
  const iso = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const c of cells) if (iso[c.id]) c.quality = { ...c.quality, 'Изоляция /tmp': ISO[iso[c.id].status] ?? iso[c.id].status };
};

// The contract of earlier runs' large-task cells, rechecked by one hidden test on their final code:
// <runs>/contract-recheck/summary.txt, "<run> <cell> <commit> kept: T1-T4" or "... violated: T2,T3".
// It fills the fields the suite's check writes for new cells.
const recheck = (runsDir) => {
  const f = path.join(runsDir, 'contract-recheck', 'summary.txt');
  const failed = new Map();
  if (!fs.existsSync(f)) return failed;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = /^(\S+) (\S+) \S+ (kept|violated): (\S+)/.exec(line);
    if (m) failed.set(`${m[1]}/${m[2]}`, m[3] === 'kept' ? [] : m[4].split(','));
  }
  return failed;
};
const withContract = (c, failed) => {
  if (!failed || c.quality?.['Контракт выполнен']) return;
  c.quality = {
    ...c.quality, 'T1–T4 пройдены': `${4 - failed.length} из 4`, 'Ловушки T1–T4': failed.join(', ') || 'нет',
    'Контракт выполнен': c.quality?.['Решено'] === 'да' && !failed.length ? 'да' : 'нет',
  };
};
// A cell kept its task's contract: on the large task the hidden test says so, elsewhere the task's
// own checks are its contract.
export const contractMet = (c) => (c.quality?.['Контракт выполнен'] ?? c.quality?.['Решено']) === 'да';

const prevRuns = (file) => {
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  if (lines.length === 2 && !lines[0].includes(' ') && !lines[1].startsWith('/')) return [{ dir: lines[0], names: lines[1].split(/\s+/) }];
  return lines.map((l) => { const [dir, ...names] = l.split(/\s+/); return { dir, names }; });
};

export function loadRun(out) {
  const data = JSON.parse(fs.readFileSync(path.join(out, 'metrics.json'), 'utf8'));
  isolation(out, data.cells);
  data.runVariants = [...data.variants];
  data.prev = [];
  const prevFile = path.join(out, 'prev.txt');
  if (!fs.existsSync(prevFile)) return data;
  const cells = []; const variants = [];
  const rechecked = recheck(path.dirname(path.resolve(out)));
  for (const { dir: listed, names } of prevRuns(prevFile)) {
    // A relative directory (published evidence) is relative to this run's directory.
    const dir = path.resolve(out, listed);
    const recount = [path.join(out, `prev-metrics-${path.basename(dir)}.json`), path.join(out, 'prev-metrics.json'), path.join(dir, 'metrics.json')].find((f) => fs.existsSync(f));
    const prev = JSON.parse(fs.readFileSync(recount, 'utf8'));
    const taken = prev.cells.filter((c) => names.includes(c.variant));
    isolation(dir, taken);
    for (const c of taken) { c.from = prev.run; withContract(c, rechecked.get(`${prev.run}/${c.id}`)); }
    const vs = prev.variants.filter((v) => names.includes(v.split('=')[0]));
    data.prev.push({ run: prev.run, dir, variants: vs });
    cells.push(...taken); variants.push(...vs);
  }
  data.cells = [...cells, ...data.cells];
  data.variants = [...variants, ...data.variants];
  return data;
}
