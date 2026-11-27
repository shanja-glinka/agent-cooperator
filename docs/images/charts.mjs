#!/usr/bin/env node
// Builds historical README charts and the current 1.9.1 large-task comparison, light and dark. Numbers
// are the measured means of three runs per task and model, clean runs only, at the cold-start
// price: no kit from 2026-10-19; with the kit, Opus from 1.5.0 (2026-10-21,
// evaluation/evidence/2026-10-21-v11/COMPARISON.md) and Sol from 1.4.1 (2026-10-20,
// evaluation/evidence/2026-10-20-v9/COMPARISON.md), because the OpenAI API was 20-60% slower per
// request on 2026-10-21 and Sol's wall time that day is not comparable (evaluation/BENCHMARK.md); a value
// marked * is the actual spend of runs that shared /tmp with other runs. Contract: runs that met
// the task's contract (the suite's checks, plus on the large task a hidden test of the behavior it
// must keep).
// usage: node docs/images/charts.mjs   writes docs/images/{suite,tasks,release-1.9.1}-{light,dark}.svg
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.dirname(new URL(import.meta.url).pathname);
const THEMES = {
  light: { surface: '#fcfcfb', ink: '#0b0b0b', ink2: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7', series: ['#2a78d6', '#eb6834'] },
  dark: { surface: '#1a1a19', ink: '#f0efec', ink2: '#c3c2b7', muted: '#898781', grid: '#2c2c2a', axis: '#383835', series: ['#3987e5', '#d95926'] },
};
const SERIES = ['Without the kit', 'With the kit'];
// [label, [price no kit, price kit], [minutes no kit, minutes kit], [contract no kit, contract kit], spend-only no-kit?]
const TASKS = [
  ['Small fix · Opus', [0.69, 0.91], [4.38, 6.88], [3, 3], false],
  ['Small fix · Sol', [0.39, 0.60], [3.95, 9.0], [3, 3], true],
  ['Large cleanup · Opus', [4.43, 2.91], [12.4, 24.0], [0, 3], false],
  ['Large cleanup · Sol', [0.74, 1.08], [7.58, 17.57], [3, 3], true],
  ['Unknown bug · Opus', [0.43, 0.46], [2.48, 2.34], [3, 3], false],
  ['Unknown bug · Sol', [0.21, 0.52], [2.22, 7.53], [3, 3], false],
  ['Patch review · Opus', [0.38, 0.43], [2.43, 2.08], [3, 3], false],
  ['Patch review · Sol', [0.26, 0.49], [3.0, 5.47], [3, 3], true],
];
const SUITE = [
  ['All four tasks · Opus', [5.93, 4.70], [21.7, 35.3], [9, 12], false],
  ['All four tasks · Sol', [1.59, 2.68], [16.7, 39.6], [12, 12], true],
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
    subtitle: 'Sum of the per-task means, three runs per task; one private TypeScript project; kit: Opus 1.5.0, Sol 1.4.1',
    note,
  }));
  fs.writeFileSync(path.join(OUT, `tasks-${theme}.svg`), chart(TASKS, taskPanels, theme, {
    title: 'Per task: the kit against the same model without it',
    subtitle: 'Mean of three runs per task and model; Opus is Claude Code (Hybrid, kit 1.5.0), Sol is Codex (Economy, kit 1.4.1)',
    note,
  }));
}

// The current primary comparison uses each measured run individually: two no-kit repeats and
// one 1.9.1 run per runtime. Time has one shared 0-30 minute scale; costs stay in native units.
const EVIDENCE = path.resolve(OUT, '../../evaluation/evidence/2026-11-27-release-1-9-1');
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(EVIDENCE, name), 'utf8'));
const spend = readJson('spend.json');
const noKitMetrics = readJson('prev-metrics-2026-11-27-codex-consumption-144110.json');
const releaseMetrics = readJson('metrics.json');
const metricById = new Map([...noKitMetrics.cells, ...releaseMetrics.cells].map((cell) => [cell.id, cell]));
const spendById = new Map([...spend.controls, ...spend.release].map((run) => [run.id, run]));
const comparison = [
  {
    title: 'Claude Code · Opus 5.5',
    costHeading: 'Claude cold USD estimate · incl. Sol reviewer',
    cost: (run) => `$${run.usdColdEstimate.toFixed(2)}`,
    runs: [
      ['big-nokit-opus-r1', 'No kit · R1'],
      ['big-nokit-opus-r2', 'No kit · R2'],
      ['big-release191-opus-r1', 'Release 1.9.1 · R1'],
    ],
  },
  {
    title: 'Codex · GPT-6.2 Sol',
    costHeading: 'OpenAI credits',
    cost: (run) => `${run.openAiCredits.toFixed(2)} cr`,
    runs: [
      ['big-nokit-sol-r1', 'No kit · R1*'],
      ['big-nokit-sol-r2', 'No kit · R2'],
      ['big-release191-sol-r1', 'Release 1.9.1 · R1'],
    ],
  },
].map((section) => ({
  ...section,
  runs: section.runs.map(([id, label]) => {
    const spendRun = spendById.get(id);
    const metric = metricById.get(id);
    if (!spendRun || !metric || !Number.isFinite(spendRun.seconds) || !Number.isFinite(spendRun.usdColdEstimate) || !Number.isFinite(spendRun.openAiCredits)) {
      throw new Error(`Missing or invalid release chart source data for ${id}`);
    }
    const hiddenCases = metric.quality?.['T1–T4 пройдены']?.match(/^(\d+) из 4$/);
    if (!hiddenCases || metric.quality?.CI !== 'зелёный') throw new Error(`Missing hidden-case or CI outcome for ${id}`);
    return { id, label, seconds: spendRun.seconds, cost: section.cost(spendRun), release: id.includes('release191'), hiddenPassed: Number(hiddenCases[1]) };
  }),
}));

function releaseChart(theme) {
  const t = THEMES[theme];
  const W = 400, H = 820;
  const inkMuted = theme === 'light' ? '#6d6c65' : '#b0aea5';
  const releaseColor = theme === 'light' ? '#2a78d6' : '#69a4ed';
  const card = theme === 'light' ? '#f3f2ed' : '#222220';
  const outcome = { yes: theme === 'light' ? '#267446' : '#75c690', partial: theme === 'light' ? '#a63e34' : '#f18b80' };
  const timeX = 25, timeW = 200, costX = 300, rowH = 62, rowGap = 7;
  const scaleTime = (seconds) => (seconds / (30 * 60)) * timeW;
  const mmssSeconds = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" font-family="system-ui, -apple-system, &quot;Segoe UI&quot;, sans-serif">`);
  out.push('<title id="t">Large task: no kit vs release 1.9.1</title>');
  out.push('<desc id="d">Claude Code and Codex each ran the same large task without the kit twice, labeled R1 and R2, and with release 1.9.1 once, labeled R1. Each row is an individual run, not an average. Bars show wall time on one shared zero to thirty minute scale and labels show minutes and seconds. Costs use native units: Claude cold USD estimate includes Sol reviewer spend, while Codex uses OpenAI credits. Outcome labels report hidden T1 through T4 cases passed out of four; CI passed for all runs. Source: evaluation/evidence/2026-11-27-release-1-9-1 spend.json, prev-metrics-2026-11-27-codex-consumption-144110.json, and metrics.json.</desc>');
  out.push(`<rect width="${W}" height="${H}" rx="8" fill="${t.surface}"/>`);
  out.push(`<text x="20" y="31" font-size="20" font-weight="650" fill="${t.ink}">Large task: no kit vs release 1.9.1</text>`);
  out.push(`<text x="20" y="53" font-size="12.5" fill="${t.ink2}">Same task per runtime · each result is one run</text>`);
  out.push(`<rect x="20" y="68" width="12" height="12" rx="3" fill="${inkMuted}"/>`);
  out.push(`<text x="38" y="78" font-size="12.5" fill="${t.ink}">No kit, R1 and R2 repeats</text>`);
  out.push(`<rect x="222" y="68" width="12" height="12" rx="3" fill="${releaseColor}"/>`);
  out.push(`<text x="240" y="78" font-size="12.5" fill="${t.ink}">Release 1.9.1, one run</text>`);

  comparison.forEach((section, sectionIndex) => {
    const sectionY = 111 + sectionIndex * 294;
    const sectionRowsTop = sectionY + 53;
    out.push(`<text x="20" y="${sectionY}" font-size="16" font-weight="650" fill="${t.ink}">${esc(section.title)}</text>`);
    out.push(`<text x="20" y="${sectionY + 19}" font-size="11.5" fill="${t.ink2}">${esc(section.costHeading)}</text>`);
    out.push(`<text x="${timeX}" y="${sectionY + 40}" font-size="11" fill="${t.ink2}">Wall time · mm:ss</text>`);
    out.push(`<text x="${costX}" y="${sectionY + 40}" font-size="11" fill="${t.ink2}">Cost</text>`);
    for (const tick of [0, 10, 20, 30]) {
      const x = timeX + (tick / 30) * timeW;
      out.push(`<text x="${x}" y="${sectionY + 52}" font-size="10.5" fill="${t.ink2}" text-anchor="middle" style="font-variant-numeric: tabular-nums">${tick}</text>`);
    }
    section.runs.forEach((run, index) => {
      const y = sectionRowsTop + index * (rowH + rowGap);
      const fill = run.release ? releaseColor : inkMuted;
      const resultColor = run.hiddenPassed === 4 ? outcome.yes : outcome.partial;
      out.push(`<rect x="14" y="${y}" width="372" height="${rowH}" rx="7" fill="${card}"/>`);
      for (const tick of [0, 10, 20, 30]) {
        const x = timeX + (tick / 30) * timeW;
        out.push(`<line x1="${x}" y1="${y + 28}" x2="${x}" y2="${y + 55}" stroke="${t.grid}" stroke-width="1"/>`);
      }
      out.push(`<text x="25" y="${y + 19}" font-size="12.5" font-weight="600" fill="${t.ink}">${esc(run.label)}</text>`);
      out.push(`<text x="375" y="${y + 19}" font-size="11.5" font-weight="650" fill="${resultColor}" text-anchor="end">Hidden T1–T4: ${run.hiddenPassed}/4</text>`);
      out.push(bar(timeX, y + 32, scaleTime(run.seconds), 10, fill));
      out.push(`<text x="232" y="${y + 41}" font-size="11.5" fill="${t.ink}" style="font-variant-numeric: tabular-nums">${mmssSeconds(run.seconds)}</text>`);
      out.push(`<text x="${costX}" y="${y + 41}" font-size="11.5" fill="${t.ink}" style="font-variant-numeric: tabular-nums">${esc(run.cost)}</text>`);
    });
  });
  out.push(`<text x="20" y="707" font-size="11.5" fill="${t.ink2}">Time bars share a 0–30 min scale. No averages or extra repeats.</text>`);
  out.push(`<text x="20" y="726" font-size="11.5" fill="${t.ink2}">Claude cold USD estimate includes Sol reviewer spend.</text>`);
  out.push(`<text x="20" y="745" font-size="11.5" fill="${t.ink2}">Codex cost is native OpenAI credits.</text>`);
  out.push(`<text x="20" y="764" font-size="11.5" fill="${t.ink2}">* Codex no-kit R1 used a shared /tmp path.</text>`);
  out.push(`<text x="20" y="783" font-size="11.5" fill="${t.ink2}">CI passed for every run; outcomes show hidden T1–T4 checks only.</text>`);
  out.push(`<text x="20" y="802" font-size="10.5" fill="${t.ink2}">Source: release evidence · 2026-11-27.</text>`);
  out.push('</svg>');
  return out.join('\n') + '\n';
}

for (const theme of Object.keys(THEMES)) {
  fs.writeFileSync(path.join(OUT, `release-1.9.1-${theme}.svg`), releaseChart(theme));
}
console.log(`charts written to ${OUT}`);
