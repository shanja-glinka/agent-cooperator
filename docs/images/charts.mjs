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

// The primary chart lists every big-task run separately. Released controls, the default 1.9.1
// route, and explicit Sol/Sol research use distinct colors and labels. Research credits come from
// the independent token-rate calculation in CREDITS.md; metrics.json supplies time and outcomes.
const EVIDENCE_ROOT = path.resolve(OUT, '../../evaluation/evidence');
const RELEASE_EVIDENCE = path.join(EVIDENCE_ROOT, '2026-11-27-release-1-9-1');
const CONTROL_EVIDENCE = path.join(EVIDENCE_ROOT, '2026-11-27-codex-consumption-144110');
const RESEARCH_EVIDENCE = path.join(EVIDENCE_ROOT, '2026-11-27-codex-owner-review-200323');
const readJson = (directory, name) => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
const spend = readJson(RELEASE_EVIDENCE, 'spend.json');
const noKitAnd181Metrics = readJson(RELEASE_EVIDENCE, 'prev-metrics-2026-11-27-codex-consumption-144110.json');
const releaseMetrics = readJson(RELEASE_EVIDENCE, 'metrics.json');
const researchMetrics = readJson(RESEARCH_EVIDENCE, 'metrics.json');
const metricById = new Map([...noKitAnd181Metrics.cells, ...releaseMetrics.cells, ...researchMetrics.cells].map((cell) => [cell.id, cell]));
const spendById = new Map([...spend.controls, ...spend.release].map((run) => [run.id, run]));
const isolationById = new Map([
  ...Object.entries(readJson(CONTROL_EVIDENCE, 'isolation.json')),
  ...Object.entries(readJson(RELEASE_EVIDENCE, 'isolation.json')),
  ...Object.entries(readJson(RESEARCH_EVIDENCE, 'isolation.json')),
]);
const researchCredits = new Map(fs.readFileSync(path.join(RESEARCH_EVIDENCE, 'CREDITS.md'), 'utf8')
  .split(/\r?\n/)
  .filter((line) => /^\|\s*big-ownerreview-sol-r[12]\s*\|/.test(line))
  .map((line) => {
    const columns = line.split('|').map((value) => value.trim()).filter(Boolean);
    const credits = Number(columns.at(-1));
    if (columns.length !== 10 || !Number.isFinite(credits)) throw new Error(`Invalid independent research credit row: ${line}`);
    return [columns[0], credits];
  }));
if (researchCredits.size !== 2) throw new Error('Expected two explicit Sol/Sol research credit rows');

const sectionPlans = [
  {
    title: 'Claude Code · Opus 5.5',
    costHeading: 'Cold USD estimate · reviewer spend where used',
    cost: (run) => `$${run.usdColdEstimate.toFixed(2)}`,
    runs: [
      { id: 'big-nokit-opus-r1', label: 'No kit · R1', group: 'noKit' },
      { id: 'big-nokit-opus-r2', label: 'No kit · R2', group: 'noKit' },
      { id: 'big-current-opus-r1', label: '1.8.1 · R1', group: 'release181' },
      { id: 'big-current-opus-r2', label: '1.8.1 · R2', group: 'release181' },
      { id: 'big-release191-opus-r1', label: '1.9.1 default · R1', group: 'automatic' },
    ],
  },
  {
    title: 'Codex · GPT-6.2 Sol',
    costHeading: 'Standard OpenAI credits',
    cost: (run) => run.openAiCredits.toFixed(2),
    runs: [
      { id: 'big-nokit-sol-r1', label: 'No kit · R1*', group: 'noKit' },
      { id: 'big-nokit-sol-r2', label: 'No kit · R2', group: 'noKit' },
      { id: 'big-current-sol-r1', label: '1.8.1 · R1†', group: 'release181' },
      { id: 'big-current-sol-r2', label: '1.8.1 · R2†', group: 'release181' },
      { id: 'big-ownerreview-sol-r1', label: 'Explicit research · R1', group: 'research' },
      { id: 'big-ownerreview-sol-r2', label: 'Explicit research · R2', group: 'research' },
      { id: 'big-release191-sol-r1', label: '1.9.1 default · R1', group: 'automatic' },
    ],
  },
];
const sharedIsolationIds = new Set(['big-nokit-sol-r1', 'big-current-sol-r1', 'big-current-sol-r2']);
const comparison = sectionPlans.map((section) => ({
  ...section,
  runs: section.runs.map((plan) => {
    const metric = metricById.get(plan.id);
    const isolation = isolationById.get(plan.id);
    const research = plan.group === 'research';
    const spendRun = research ? null : spendById.get(plan.id);
    const seconds = research ? metric?.wallSeconds : spendRun?.seconds;
    const isolationExpected = sharedIsolationIds.has(plan.id) ? 'shared' : 'clean';
    const hiddenCases = metric?.quality?.['T1–T4 пройдены']?.match(/^(\d+) из 4$/);
    if (!metric || !Number.isFinite(seconds) || !hiddenCases || metric.quality?.CI !== 'зелёный') {
      throw new Error(`Missing or invalid time, hidden checks, or CI outcome for ${plan.id}`);
    }
    if (!isolation || isolation.status !== isolationExpected) throw new Error(`Unexpected isolation status for ${plan.id}`);
    let cost;
    if (research) {
      const credits = researchCredits.get(plan.id);
      const author = metric.actors?.find((actor) => actor.role === 'cooperator');
      const reviewer = metric.actors?.find((actor) => actor.role === 'reviewer');
      if (!Number.isFinite(credits) || metric.route !== 'solo+review' || author?.model !== 'gpt-6.2-sol' || reviewer?.model !== 'gpt-6.2-sol') {
        throw new Error(`Explicit Sol author/reviewer research source is incomplete for ${plan.id}`);
      }
      cost = credits.toFixed(2);
    } else {
      if (!spendRun || !Number.isFinite(spendRun.usdColdEstimate) || !Number.isFinite(spendRun.openAiCredits)) {
        throw new Error(`Missing native spend data for ${plan.id}`);
      }
      cost = section.cost(spendRun);
    }
    return { ...plan, seconds, cost, hiddenPassed: Number(hiddenCases[1]), isolation: isolation.status };
  }),
}));

function releaseChart(theme) {
  const t = THEMES[theme];
  const rowH = 48, rowGap = 4, sectionGap = 25, startY = 126;
  const W = 400, timeX = 25, timeW = 200, costX = 300, rowLabelX = 25, resultX = 375;
  const colors = {
    noKit: theme === 'light' ? '#6d6c65' : '#b0aea5',
    release181: theme === 'light' ? '#8a6ca7' : '#ba9bda',
    automatic: theme === 'light' ? '#2a78d6' : '#69a4ed',
    research: theme === 'light' ? '#b05d31' : '#eb9564',
  };
  const card = theme === 'light' ? '#f3f2ed' : '#222220';
  const outcome = { all: theme === 'light' ? '#267446' : '#75c690', partial: theme === 'light' ? '#a63e34' : '#f18b80' };
  const scaleTime = (seconds) => (seconds / (40 * 60)) * timeW;
  const mmssSeconds = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const layouts = [];
  let nextY = startY;
  for (const section of comparison) {
    const rowsTop = nextY + 53;
    layouts.push({ section, sectionY: nextY, rowsTop });
    nextY = rowsTop + section.runs.length * rowH + (section.runs.length - 1) * rowGap + sectionGap;
  }
  const footerY = nextY - sectionGap + 18;
  const footerLines = [
    'One run per row · common 0–40m scale · time labels are mm:ss.',
    'Costs: Claude cold USD (Sol reviewer where used); Codex OpenAI credits.',
    '* No-kit Codex R1 shared /tmp with another run.',
    '† Both 1.8.1 Codex repeats shared the hook path.',
    'Both explicit-role research runs passed isolation.',
    'CI passed all runs; outcomes are hidden T1–T4 passes out of four.',
    'Source: release evidence and research CREDITS.md / metrics.json.',
  ];
  const H = footerY + footerLines.length * 18 + 12;
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" font-family="system-ui, -apple-system, &quot;Segoe UI&quot;, sans-serif">`);
  out.push('<title id="t">Large task: released baselines, default, and explicit research</title>');
  const accessibleRows = comparison.map((section) => `${section.title}: ${section.runs.map((run) => `${run.label}, ${mmssSeconds(run.seconds)}, ${run.cost}, ${run.hiddenPassed} of 4 hidden T1–T4 cases, isolation ${run.isolation}`).join('; ')}`).join('. ');
  out.push(`<desc id="d">The same large task, with each run listed separately. The chart compares no-kit and release 1.8.1 baselines, the default 1.9.1 route, and two explicit GPT-6.2 Sol author plus reviewer research runs. Bars share a zero-to-forty-minute scale; cost stays in native units, Claude cold USD estimate and Codex standard credits. The status column shows hidden T1 through T4 cases passed out of four; CI passed for all runs. The explicit research pair was clean-isolated. Both 1.8.1 Codex runs shared a temporary hook path, and no-kit Codex R1 shared /tmp with another run. Source: 2026-11-27 release spend.json, metrics.json and isolation.json; codex-owner-review-200323 CREDITS.md, metrics.json and isolation.json. ${esc(accessibleRows)}</desc>`);
  out.push(`<rect width="${W}" height="${H}" rx="8" fill="${t.surface}"/>`);
  out.push(`<text x="20" y="30" font-size="17.5" font-weight="650" fill="${t.ink}">Large task · time, cost and quality</text>`);
  out.push(`<text x="20" y="51" font-size="11.5" fill="${t.ink2}">No kit + 1.8.1 baselines · 1.9.1 default · Sol/Sol research</text>`);
  const legend = [
    { key: 'noKit', x: 20, y: 72, label: 'No kit baseline' },
    { key: 'release181', x: 205, y: 72, label: '1.8.1 baseline' },
    { key: 'automatic', x: 20, y: 93, label: '1.9.1 default' },
    { key: 'research', x: 205, y: 93, label: 'Explicit Sol/Sol research' },
  ];
  for (const item of legend) {
    out.push(`<rect x="${item.x}" y="${item.y - 10}" width="10" height="10" rx="3" fill="${colors[item.key]}"/>`);
    out.push(`<text x="${item.x + 16}" y="${item.y - 1}" font-size="11.5" fill="${t.ink}">${esc(item.label)}</text>`);
  }

  for (const { section, sectionY, rowsTop } of layouts) {
    out.push(`<text x="20" y="${sectionY}" font-size="15" font-weight="650" fill="${t.ink}">${esc(section.title)}</text>`);
    out.push(`<text x="20" y="${sectionY + 17}" font-size="10.5" fill="${t.ink2}">${esc(section.costHeading)}</text>`);
    out.push(`<text x="${timeX}" y="${sectionY + 36}" font-size="10.5" fill="${t.ink2}">Wall time · mm:ss</text>`);
    out.push(`<text x="${costX}" y="${sectionY + 36}" font-size="10.5" fill="${t.ink2}">Cost</text>`);
    out.push(`<text x="${resultX}" y="${sectionY + 36}" font-size="10.5" fill="${t.ink2}" text-anchor="end">T1–T4</text>`);
    for (const tick of [0, 10, 20, 30, 40]) {
      const x = timeX + (tick / 40) * timeW;
      out.push(`<text x="${x}" y="${sectionY + 51}" font-size="9.5" fill="${t.ink2}" text-anchor="middle" style="font-variant-numeric: tabular-nums">${tick}</text>`);
    }
    section.runs.forEach((run, index) => {
      const y = rowsTop + index * (rowH + rowGap);
      const resultColor = run.hiddenPassed === 4 ? outcome.all : outcome.partial;
      out.push(`<rect x="14" y="${y}" width="372" height="${rowH}" rx="6" fill="${card}"/>`);
      for (const tick of [0, 10, 20, 30, 40]) {
        const x = timeX + (tick / 40) * timeW;
        out.push(`<line x1="${x}" y1="${y + 26}" x2="${x}" y2="${y + 44}" stroke="${t.grid}" stroke-width="1"/>`);
      }
      out.push(`<text x="${rowLabelX}" y="${y + 16}" font-size="11.5" font-weight="600" fill="${t.ink}">${esc(run.label)}</text>`);
      out.push(`<text x="${resultX}" y="${y + 16}" font-size="11" font-weight="650" fill="${resultColor}" text-anchor="end">${run.hiddenPassed}/4</text>`);
      out.push(bar(timeX, y + 28, scaleTime(run.seconds), 8, colors[run.group]));
      out.push(`<text x="232" y="${y + 38}" font-size="10.5" fill="${t.ink}" style="font-variant-numeric: tabular-nums">${mmssSeconds(run.seconds)}</text>`);
      out.push(`<text x="${costX}" y="${y + 38}" font-size="10.5" fill="${t.ink}" style="font-variant-numeric: tabular-nums">${esc(run.cost)}</text>`);
    });
  }
  footerLines.forEach((line, index) => out.push(`<text x="20" y="${footerY + index * 18}" font-size="10.5" fill="${t.ink2}">${esc(line)}</text>`));
  out.push('</svg>');
  return out.join('\n') + '\n';
}

for (const theme of Object.keys(THEMES)) {
  fs.writeFileSync(path.join(OUT, `release-1.9.1-${theme}.svg`), releaseChart(theme));
}
console.log(`charts written to ${OUT}`);
