// API list prices per 1M tokens, checked 2026-10-20 on platform.claude.com/docs/en/about-claude/pricing,
// developers.openai.com/api/docs/pricing and its prompt-caching guide. A request is priced on its
// own, by the tier its prompt falls in (Haiku above 100k prompt tokens, OpenAI above 272k).
// Codex logs report cache writes as cache_write_input_tokens (0 in every rollout so far); `high`
// prices all uncached input as cache writes, 1.25x input, so the real price lies between the two.
const CLAUDE = {
  'claude-opus-5-5': [{ in: 4, w5: 5, w1: 8, hit: 0.2, out: 20 }],
  'claude-sonnet-5-5': [{ in: 2, w5: 2.5, w1: 4, hit: 0.1, out: 10 }],
  'claude-haiku-5-5': [{ in: 0.1, w5: 0.125, w1: 0.2, hit: 0.01, out: 0.5 }, { above: 100000, in: 0.5, w5: 0.625, w1: 1, hit: 0.05, out: 2.5 }],
  'claude-fable-5-1': [{ in: 10, w5: 12.5, w1: 20, hit: 0.25, out: 50 }],
};
const OPENAI = {
  'gpt-6.1-sol': [{ in: 2, hit: 0.1, out: 10 }, { above: 272000, in: 4, hit: 0.2, out: 15 }],
  'gpt-6-luna': [{ in: 0.1, hit: 0.01, out: 0.5 }, { above: 272000, in: 0.2, hit: 0.02, out: 0.75 }],
  'gpt-6-astra': [{ in: 10, hit: 1, out: 50 }, { above: 272000, in: 20, hit: 2, out: 75 }],
};
const ALIAS = { opus: 'claude-opus-5-5', sonnet: 'claude-sonnet-5-5', haiku: 'claude-haiku-5-5', fable: 'claude-fable-5-1' };
const tier = (tiers, prompt) => tiers.filter((t) => !t.above || prompt > t.above).at(-1);

// m: { model, in, w5, w1, hit, out } of one Claude request; null when the model has no price.
export function claudeUsd(m) {
  const tiers = CLAUDE[ALIAS[m.model] ?? m.model];
  if (!tiers) return null;
  const p = tier(tiers, m.in + m.hit + m.w5 + m.w1);
  return (m.in * p.in + m.w5 * p.w5 + m.w1 * p.w1 + m.hit * p.hit + m.out * p.out) / 1e6;
}

// What `tokens` read from the prompt cache would have cost more as a cache write with that TTL.
export function claudeReadAsWrite(model, tokens, ttl = '1h') {
  const tiers = CLAUDE[ALIAS[model] ?? model];
  if (!tiers) return null;
  const p = tier(tiers, tokens);
  return (tokens * ((ttl === '1h' ? p.w1 : p.w5) - p.hit)) / 1e6;
}

// u: last_token_usage of one Codex request; returns { low, high } or null.
export function openaiUsd(model, u) {
  const tiers = OPENAI[model];
  if (!tiers) return null;
  const p = tier(tiers, u.input_tokens ?? 0);
  const hit = u.cached_input_tokens ?? 0; const write = u.cache_write_input_tokens ?? 0;
  const fresh = (u.input_tokens ?? 0) - hit - write; const out = u.output_tokens ?? 0;
  return {
    low: (fresh * p.in + write * p.in * 1.25 + hit * p.hit + out * p.out) / 1e6,
    high: ((fresh + write) * p.in * 1.25 + hit * p.hit + out * p.out) / 1e6,
  };
}
