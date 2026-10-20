#!/usr/bin/env node
// Claude Code PreToolUse hook of a bench cell: the file tools' counterpart of tmpjail/zshenv.
// A Read, Write, Edit, Glob, or Grep of a path under /tmp goes to the same place in the cell's
// own temp dir ($BENCH_TMP), where the cell's shell commands put their /tmp files.
import fs from 'node:fs';
import path from 'node:path';

const TMP = /^(?:\/private)?\/tmp(?=\/|$)(?!\/claude-)(?!\/agent-cooperator-bench)/;
const FIELDS = ['file_path', 'path', 'notebook_path'];
const root = process.env.BENCH_TMP;
let input = '';
process.stdin.on('data', (d) => { input += d; }).on('end', () => {
  if (!root) return;
  let event;
  try { event = JSON.parse(input); } catch { return; }
  const toolInput = event.tool_input ?? {};
  const updated = { ...toolInput };
  let changed = false;
  for (const f of FIELDS) {
    if (typeof toolInput[f] === 'string' && TMP.test(toolInput[f])) { updated[f] = toolInput[f].replace(TMP, root); changed = true; }
  }
  if (!changed) return;
  try { fs.appendFileSync(path.join(path.dirname(root), 'tmp-rewrites.log'), `${new Date().toISOString()} hook ${event.tool_name} ${JSON.stringify(toolInput).slice(0, 400)}\n`); } catch {}
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', updatedInput: updated } }));
});
