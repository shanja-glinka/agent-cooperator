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
  for (const { dir, names } of prevRuns(prevFile)) {
    const recount = [path.join(out, `prev-metrics-${path.basename(dir)}.json`), path.join(out, 'prev-metrics.json'), path.join(dir, 'metrics.json')].find((f) => fs.existsSync(f));
    const prev = JSON.parse(fs.readFileSync(recount, 'utf8'));
    const taken = prev.cells.filter((c) => names.includes(c.variant));
    isolation(dir, taken);
    for (const c of taken) c.from = prev.run;
    const vs = prev.variants.filter((v) => names.includes(v.split('=')[0]));
    data.prev.push({ run: prev.run, dir, variants: vs });
    cells.push(...taken); variants.push(...vs);
  }
  data.cells = [...cells, ...data.cells];
  data.variants = [...variants, ...data.variants];
  return data;
}
