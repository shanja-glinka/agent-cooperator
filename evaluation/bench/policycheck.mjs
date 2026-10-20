#!/usr/bin/env node
// Before any cell runs: installs every kit variant of a bench run, both editions, with its
// install-policy switches (sets/<variant>.txt), and checks that every installed text delivers the
// same policy: no section left unrendered, the recorded policy equal to the switches, and no text
// that still asks for a review the switches turned off (v6nr was spoiled by such a text).
// usage: policycheck.mjs <run-dir>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const out = process.argv[2];
const kits = path.join(out, 'kits');
// Text that only a review-on install may contain, and what an off install must say instead.
const BLOCK_ON = [/independent review by\s+GPT-6\.1 Sol/, /reviewed \((Codex )?GPT-6\.1 Sol/, /reviewed against that\s+contract \((Codex )?GPT-6\.1 Sol/, /one Sol xhigh review/, /Sol at xhigh reviews the blocks/];
const STAGE_ON = [/Stage acceptance \(pipeline/];
const texts = (dir) => {
  const found = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(md|json|toml)$/.test(e.name)) found.push([p, fs.readFileSync(p, 'utf8')]); } };
  if (fs.existsSync(dir)) walk(dir);
  return found;
};
let failed = 0;
const fail = (msg) => { failed += 1; console.log(`FAIL ${msg}`); };
for (const name of fs.existsSync(kits) ? fs.readdirSync(kits).sort() : []) {
  const kit = path.join(kits, name);
  const sets = (fs.existsSync(path.join(out, 'sets', `${name}.txt`)) ? fs.readFileSync(path.join(out, 'sets', `${name}.txt`), 'utf8') : '').split('\n').filter(Boolean);
  const args = sets.flatMap((kv) => ['--set', kv]);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `policycheck-${name}-`));
  try {
    const run = (...a) => execFileSync('node', [path.join(kit, 'bin', 'agent-cooperator.js'), ...a, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    run('claude', 'install', '--claude-home', path.join(tmp, 'claude'));
    run('codex', 'install', '--codex-home', path.join(tmp, 'codex'), '--skills-dir', path.join(tmp, 'skills'));
    for (const edition of ['claude', 'codex']) {
      const home = path.join(tmp, edition);
      const all = texts(home);
      const profiles = JSON.parse(fs.readFileSync(path.join(home, `${edition}-workforce`, 'profiles.json'), 'utf8'));
      if (!profiles.policy) { console.log(`${name} ${edition}: no install policy (a kit before v7), not checked`); continue; }
      const want = { ...profiles.policy };
      for (const kv of sets) { const [k, v] = kv.split('='); want[k] = ['on', 'true', '1', 'yes'].includes(String(v).toLowerCase()); }
      if (JSON.stringify(profiles.policy) !== JSON.stringify(want)) fail(`${name} ${edition}: installed policy ${JSON.stringify(profiles.policy)}, switches want ${JSON.stringify(want)}`);
      for (const [p, t] of all) {
        const rel = path.relative(home, p);
        if (/\{\{[#^/][A-Za-z]\w*\}\}/.test(t)) fail(`${name} ${edition}: unrendered section in ${rel}`);
        if (/\.config\.toml$/.test(p) && /review/i.test(t)) fail(`${name} ${edition}: launch layer ${rel} names a review of its own`);
        if (!profiles.policy.reviewBlock) for (const re of BLOCK_ON) if (re.test(t)) fail(`${name} ${edition}: ${rel} still asks for a block review (${re})`);
        if (!profiles.policy.reviewStage) for (const re of STAGE_ON) if (re.test(t)) fail(`${name} ${edition}: ${rel} still asks for a stage review (${re})`);
      }
      // From policy 1.12.0 (Codex) and 1.10.0 (Claude): no route can assign GPT-6 Astra (its model
      // id in any installed file), the default profile's stage reviewer is Sol xhigh, and every
      // launch layer's waits satisfy Codex's min <= default <= max.
      const atLeast = (v, min) => { const [a, b] = [v, min].map((s) => String(s).split('.').map(Number)); for (let i = 0; i < 3; i += 1) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0); return true; };
      const v8 = atLeast(profiles.policyVersion, edition === 'codex' ? '1.12.0' : '1.10.0');
      if (v8) {
        for (const [p, t] of all) if (/gpt-6-astra/.test(t)) fail(`${name} ${edition}: ${path.relative(home, p)} can assign gpt-6-astra`);
        const def = profiles.profiles?.[profiles.selectionRules?.default];
        if (!(def?.stageReviewer?.model === 'gpt-6.1-sol' && def.stageReviewer.effort === 'xhigh')) fail(`${name} ${edition}: default stage reviewer is ${JSON.stringify(def?.stageReviewer)}`);
        for (const [p, t] of all.filter(([q]) => /\.config\.toml$/.test(q))) {
          const [min, d, max] = ['min', 'default', 'max'].map((k) => Number(t.match(new RegExp(`^${k}_wait_timeout_ms\\s*=\\s*(\\d+)`, 'm'))?.[1]));
          if (!(min <= d && d <= max)) fail(`${name} ${edition}: ${path.relative(home, p)} waits min ${min}, default ${d}, max ${max}`);
        }
      }
      const joined = all.map(([, t]) => t).join('\n');
      if (profiles.policy.reviewBlock && !BLOCK_ON[0].test(joined)) fail(`${name} ${edition}: review is on, but no text asks for it`);
      if (!profiles.policy.reviewBlock && !/Block review is off in this install/.test(joined)) fail(`${name} ${edition}: review is off, but no text says so`);
      if (!profiles.policy.reviewStage && !/Stage review is off in this install/.test(joined)) fail(`${name} ${edition}: stage review is off, but no text says so`);
      console.log(`${name} ${edition}: policy ${JSON.stringify(profiles.policy)} in ${all.length} files`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
if (failed) { console.log(`policycheck: ${failed} failed`); process.exit(1); }
console.log('policycheck: every variant delivers one policy');
