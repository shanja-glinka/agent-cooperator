// Run with node spend.mjs from any directory. The report uses the standard-credit
// rates of the matched experiments, per million uncached, cached and output tokens.
import { readFileSync } from 'node:fs';

const load = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const rates = {
  'gpt-6.2-sol': [50, 2.5, 250],
  'gpt-6-luna': [2.5, 0.25, 12.5],
};

function summarize(cell) {
  const actors = cell.actors.map((actor) => {
    const { role, model, effort, requests, input, cacheRead, output } = actor;
    const rate = rates[model];
    if (!rate && !model.startsWith('claude') && !['haiku', 'sonnet', 'opus'].includes(model)) {
      throw new Error('Unrecognized model in ' + cell.id + ': ' + model);
    }
    const credits = rate ? (input * rate[0] + cacheRead * rate[1] + output * rate[2]) / 1e6 : null;
    return { role, model, effort, requests, credits };
  });
  return {
    id: cell.id,
    seconds: cell.wallSeconds,
    requests: cell.totals.requests,
    openAiCredits: +actors.reduce((sum, a) => sum + (a.credits ?? 0), 0).toFixed(8),
    usdColdEstimate: cell.totals.usdCold,
    actors,
  };
}

const candidate = load('metrics.json').cells;
const controls = load('prev-metrics-2026-11-27-codex-consumption-144110.json').cells
  .filter((c) => c.task === 'big' && ['nokit', 'current'].includes(c.variant));
if (candidate.length !== 2 || !['opus', 'sol'].every((model) =>
  candidate.some((c) => c.id === 'big-release191-' + model + '-r1'))) {
  throw new Error('Expected one release task per runtime');
}
if (controls.length !== 8) throw new Error('Expected two control repeats for each runtime and variant');
console.log(JSON.stringify({ rates, controls: controls.map(summarize), release: candidate.map(summarize) }, null, 2));
