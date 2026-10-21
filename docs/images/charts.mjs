#!/usr/bin/env node
// Builds the README charts: the kit (1.4.1) against the same model without it, light and dark.
// Numbers are the measured means from the runs of 2026-10-19 (no kit), 2026-10-20 (the kit, Opus)
// and 2026-10-21 (the kit, Sol, measured again), three runs per task and model, clean runs only,
// priced as if every run started with an empty prompt cache (evaluation/evidence/2026-10-20-v9 and
// evaluation/evidence/2026-10-21-v9-sol-rerun, COMPARISON.md; evaluation/BENCHMARK.md); a value
// marked * is the actual spend of runs that shared /tmp with other runs. Contract: runs that met
// the task's contract (the suite's checks, plus on the large task a hidden test of the behavior it
// must keep).
// usage: node docs/images/charts.mjs   writes docs/images/{suite,tasks}-{light,dark}.svg
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.dirname(new URL(import.meta.url).pathname);
const THEMES = {
  light: { surface: '#fcfcfb', ink: '#0b0b0b', ink2: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7', series: ['#2a78d6', '#eb6834'] },
  dark: { surface: '#1a1a19', ink: '#f0efec', ink2: '#c3c2b7', muted: '#898781', grid: '#2c2c2a', axis: '#383835', series: ['#3987e5', '#d95926'] },
};
const SERIES = ['Without the kit', 'With the kit 1.4.1'];
// [label, [price no kit, price kit], [minutes no kit, minutes kit], [contract no kit, contract kit], spend-only no-kit?]
const TASKS = [
  ['Small fix · Opus', [0.69, 1.01], [4.38, 7.92], [3, 3], false],
  ['Small fix · Sol', [0.39, 0.72], [3.95, 13.7], [3, 3], true],
  ['Large cleanup · Opus', [4.43, 2.96], [12.4, 22.88], [0, 3], false],
  ['Large cleanup · Sol', [0.74, 1.52], [7.58, 34.55], [3, 3], true],
  ['Unknown bug · Opus', [0.43, 0.45], [2.48, 2.02], [3, 3], false],
  ['Unknown bug · Sol', [0.21, 0.56], [2.22, 10.33], [3, 3], false],
  ['Patch review · Opus', [0.38, 0.43], [2.43, 1.9], [3, 3], false],
  ['Patch review · Sol', [0.26, 0.52], [3.0, 10.07], [3, 3], true],
];
const SUITE = [
  ['All four tasks · Opus', [5.93, 4.85], [21.7, 34.7], [9, 12], false],
  ['All four tasks · Sol', [1.59, 3.32], [16.7, 68.7], [12, 12], true],
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const mmss = (m) => `${Math.floor(m)}:${String(Math.round((m % 1) * 60)).padStart(2, '0')}`;
// A bar grows from the baseline at x0: square there, a 4px rounded data-end.
const bar = (x0, y, w, h, fill) => {
  if (w <= 0) return '';
  const r = Math.min(4, h / 2, w);
  return `<path d="M${x0},${y} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${h - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-(w - r)} z" fill="${fill}"/>`;
};

function chart(rows, panels, theme, { title, subtitle, note }) {
  const t = THEMES[theme];
  const W = 960, labelW = 190, gap = 28, top = 112, rowH = 40, barH = 10, barGap = 2;
  const panelW = (W - labelW - 24 - gap * (panels.length - 1)) / panels.length;
  const H = top + rows.length * rowH + 34 + (note ? 40 : 10);
  const font = 'system-ui, -apple-system, &quot;Segoe UI&quot;, sans-serif';
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" font-family="${font}">`);
  out.push(`<title id="t">${esc(title)}</title><desc id="d">${esc(subtitle)}. The same values are in the table under the chart.</desc>`);
  out.push(`<rect width="${W}" height="${H}" rx="8" fill="${t.surface}"/>`);
  out.push(`<text x="16" y="28" font-size="17" font-weight="600" fill="${t.ink}">${esc(title)}</text>`);
  out.push(`<text x="16" y="48" font-size="12.5" fill="${t.ink2}">${esc(subtitle)}</text>`);
  // Legend: a swatch beside each label; the text stays in ink.
  let lx = 16;
  SERIES.forEach((s, i) => {
    out.push(`<rect x="${lx}" y="62" width="12" height="12" rx="3" fill="${t.series[i]}"/>`);
    out.push(`<text x="${lx + 18}" y="72.5" font-size="12.5" fill="${t.ink}">${esc(s)}</text>`);
    lx += 18 + s.length * 7.1 + 28;
  });
  rows.forEach((row, i) => {
    const y = top + i * rowH;
    out.push(`<text x="16" y="${y + rowH / 2 + 4}" font-size="12.5" fill="${t.ink}">${esc(row[0])}</text>`);
  });
  panels.forEach((p, k) => {
    const x0 = labelW + k * (panelW + gap);
    const scale = (v) => (v / p.max) * (panelW - 46);
    out.push(`<text x="${x0}" y="${top - 12}" font-size="12" font-weight="600" fill="${t.ink2}">${esc(p.title)}</text>`);
    for (const tick of p.ticks) {
      const x = x0 + scale(tick);
      out.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${top + rows.length * rowH}" stroke="${t.grid}" stroke-width="1"/>`);
      out.push(`<text x="${x}" y="${top + rows.length * rowH + 16}" font-size="11" fill="${t.muted}" text-anchor="middle" style="font-variant-numeric: tabular-nums">${esc(p.tick(tick))}</text>`);
    }
    out.push(`<line x1="${x0}" y1="${top}" x2="${x0}" y2="${top + rows.length * rowH}" stroke="${t.axis}" stroke-width="1"/>`);
    rows.forEach((row, i) => {
      const yMid = top + i * rowH + rowH / 2;
      [0, 1].forEach((s) => {
        const v = row[p.field][s];
        const y = yMid - barH - barGap / 2 + s * (barH + barGap);
        const w = scale(v);
        out.push(bar(x0, y, w, barH, t.series[s]));
        const star = s === 0 && row[4] && p.spend ? '*' : '';
        out.push(`<text x="${x0 + w + 5}" y="${y + barH - 1}" font-size="10.5" fill="${t.ink2}" style="font-variant-numeric: tabular-nums">${esc(p.label(v, row))}${star}</text>`);
      });
    });
  });
  if (note) out.push(`<text x="16" y="${H - 18}" font-size="11" fill="${t.muted}">${esc(note)}</text>`);
  out.push('</svg>');
  return out.join('\n') + '\n';
}

const note = '* actual spend: those runs without the kit shared /tmp with other runs. API list prices at a cold prompt cache; Codex is the lower bound.';
const taskPanels = [
  { title: 'Price per task, US$', field: 1, max: 5, ticks: [0, 1, 2, 3, 4, 5], tick: (v) => (v ? `$${v}` : '0'), label: (v) => `$${v.toFixed(2)}`, spend: true },
  { title: 'Wall time, minutes', field: 2, max: 30, ticks: [0, 10, 20, 30], tick: (v) => String(v), label: (v) => mmss(v), spend: true },
  { title: 'Runs that met the contract', field: 3, max: 3, ticks: [0, 1, 2, 3], tick: (v) => String(v), label: (v) => `${v} of 3`, spend: false },
];
const suitePanels = [
  { title: 'Price, US$', field: 1, max: 6, ticks: [0, 2, 4, 6], tick: (v) => (v ? `$${v}` : '0'), label: (v) => `$${v.toFixed(2)}`, spend: true },
  { title: 'Wall time, minutes', field: 2, max: 60, ticks: [0, 20, 40, 60], tick: (v) => String(v), label: (v) => `${v.toFixed(1)}`, spend: true },
  { title: 'Runs that met the contract', field: 3, max: 12, ticks: [0, 4, 8, 12], tick: (v) => String(v), label: (v) => `${v} of 12`, spend: false },
];
for (const theme of Object.keys(THEMES)) {
  fs.writeFileSync(path.join(OUT, `suite-${theme}.svg`), chart(SUITE, suitePanels, theme, {
    title: 'All four tasks: the kit against the same model without it',
    subtitle: 'Sum of the per-task means, three runs per task; one private TypeScript project, 2026-10-19 to 2026-10-21',
    note,
  }));
  fs.writeFileSync(path.join(OUT, `tasks-${theme}.svg`), chart(TASKS, taskPanels, theme, {
    title: 'Per task: the kit against the same model without it',
    subtitle: 'Mean of three runs per task and model; Opus is Claude Code (Hybrid), Sol is Codex (Economy)',
    note,
  }));
}
console.log(`charts written to ${OUT}`);
