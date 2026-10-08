#!/usr/bin/env node
// Fails when a commit message credits an AI assistant as co-author.
// Usage: node scripts/check-no-ai-coauthor.js <range|file>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const BANNED = /^(co-authored-by|signed-off-by)\s*:.*(claude|anthropic|openai|codex|copilot|gpt)/im;
const target = process.argv[2] ?? 'HEAD';

function messagesFrom(target) {
  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    return [['<message>', fs.readFileSync(target, 'utf8')]];
  }
  const raw = execFileSync('git', ['log', '--format=%H%x00%B%x01', target], { encoding: 'utf8' });
  return raw.split('\u0001').filter((s) => s.trim()).map((s) => s.split('\u0000'));
}

const offenders = messagesFrom(target).filter(([, body]) => BANNED.test(body));
if (offenders.length > 0) {
  for (const [sha, body] of offenders) {
    const line = body.split('\n').find((l) => BANNED.test(l)) ?? '';
    process.stderr.write(`AI co-author trailer is not allowed in this repository: ${sha.slice(0, 7)} ${line.trim()}\n`);
  }
  process.exit(1);
}
