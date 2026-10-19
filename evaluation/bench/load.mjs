// Loads a bench run for the reports: its metrics and each cell's isolation status, plus, when
// bench.sh recorded an earlier run in prev.txt, that run's cells of the named variants, recounted
// into prev-metrics.json by the current metrics.mjs and marked with the run they come from.
import fs from 'node:fs';
import path from 'node:path';

export const ISO = { clean: 'чисто', shared: 'общий файл', crossed: 'чтение чужого', stale: 'чтение остатка', container: 'свой контейнер' };

const isolation = (dir, cells) => {
  const f = path.join(dir, 'isolation.json');
  if (!fs.existsSync(f)) return;
  const iso = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const c of cells) if (iso[c.id]) c.quality = { ...c.quality, 'Изоляция /tmp': ISO[iso[c.id].status] ?? iso[c.id].status };
};

export function loadRun(out) {
  const data = JSON.parse(fs.readFileSync(path.join(out, 'metrics.json'), 'utf8'));
  isolation(out, data.cells);
  data.prev = null;
  const prevFile = path.join(out, 'prev.txt');
  if (fs.existsSync(prevFile)) {
    const [dir, names = ''] = fs.readFileSync(prevFile, 'utf8').split('\n');
    const wanted = names.split(/\s+/).filter(Boolean);
    const recount = path.join(out, 'prev-metrics.json');
    const prev = JSON.parse(fs.readFileSync(fs.existsSync(recount) ? recount : path.join(dir, 'metrics.json'), 'utf8'));
    const cells = prev.cells.filter((c) => wanted.includes(c.variant));
    isolation(dir, cells);
    for (const c of cells) c.from = prev.run;
    data.prev = { run: prev.run, dir, variants: prev.variants.filter((v) => wanted.includes(v.split('=')[0])) };
    data.cells = [...cells, ...data.cells];
    data.variants = [...data.prev.variants, ...data.variants];
  }
  return data;
}
