#!/usr/bin/env node
// Codex loop guard: a hook that notices a session digging in and says so in its context.
//
// PostToolUse: the same tool call with the same result for the third time, with nothing edited in
// between, or the same call failing the same way three times, gets one note: stop repeating it,
// change the approach, or hand the rest to a fresh agent with a written handoff.
// PostCompact: counts compactions; the next tool call gets a note to continue from the task state
// note instead of re-reading code, and from the third compaction on, to hand the block over.
//
// State lives in <tmpdir>/codex-loop-guard/<session>.json. It never blocks a call and fails open:
// any error ends the hook with no output.
// hooks.json: PostToolUse and PostCompact, each with the command
//   /bin/sh -c 'command -v node >/dev/null 2>&1 || exit 0; exec node "$0"' <this file>
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const WINDOW = 60; // recent tool calls kept per session
const REPEATS = 3; // identical call + identical result, nothing edited in between
const QUIET = 20; // calls before the same signature may be noted again
const HANDOFF_AT = 3; // compactions in one session before suggesting a handoff
const EDIT = /^(apply_patch|write|edit|write_file|create_file)$/i;
const EDIT_CMD = /\b(sed -i|perl -pi|tee |cat >|>>|mv |cp |rm |git (checkout|restore|apply|reset|stash))\b|apply_patch/;
const FAIL = /"?exit_code"?\s*[:=]\s*[1-9]|\bexit code [1-9]|\berror\b|\bfailed\b|command not found|No such file/i;

const hash = (text) => crypto.createHash('sha1').update(text).digest('hex').slice(0, 16);
const text = (v) => (typeof v === 'string' ? v : JSON.stringify(v ?? ''));
const command = (input) => {
  if (input && typeof input === 'object') return text(input.cmd ?? input.command ?? input.code ?? input);
  return text(input);
};
const say = (event, message) => process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: message } }));

function main(raw) {
  const data = JSON.parse(raw || '{}');
  const session = String(data.session_id ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
  if (!session) return;
  const dir = path.join(os.tmpdir(), 'codex-loop-guard');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${session}.json`);
  let state = { calls: [], compactions: 0, pendingCompaction: false, lastEdit: -1, seq: 0, noted: {} };
  try { state = { ...state, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch {}
  const event = data.hook_event_name;
  const notes = [];

  if (event === 'PostCompact') {
    state.compactions += 1;
    state.pendingCompaction = true;
  } else if (event === 'PostToolUse') {
    state.seq += 1;
    const tool = String(data.tool_name ?? '');
    const cmd = command(data.tool_input);
    const out = text(data.tool_response).slice(0, 4000);
    const edited = EDIT.test(tool) || EDIT_CMD.test(cmd);
    if (edited) state.lastEdit = state.seq;
    const sig = hash(`${tool}\n${cmd}`);
    const res = hash(out);
    const failed = FAIL.test(out);
    state.calls.push({ sig, res, seq: state.seq, failed });
    state.calls = state.calls.slice(-WINDOW);

    if (!edited) {
      const same = state.calls.filter((c) => c.sig === sig && c.res === res && c.seq > state.lastEdit);
      const quiet = state.seq - (state.noted[sig] ?? -Infinity) > QUIET;
      if (same.length >= REPEATS && quiet) {
        state.noted[sig] = state.seq;
        const shown = cmd.replace(/\s+/g, ' ').slice(0, 120);
        notes.push(failed
          ? `loop-guard: \`${shown}\` failed the same way ${same.length} times with nothing changed in between. Do not run it again as is: find the cause, change the approach, or hand the rest of this block to a fresh agent with a written handoff (done, failed and why, next).`
          : `loop-guard: \`${shown}\` returned the same result ${same.length} times with nothing edited in between. Use what you already have instead of running or reading it again; if you need it because context was lost, write what matters into the task state note once.`);
      }
    }
    if (state.pendingCompaction) {
      state.pendingCompaction = false;
      notes.push(`loop-guard: the context was compacted (${state.compactions} in this session). Continue from the task state note and the files it names; re-read code only where it changed or the note does not cover it.`
        + (state.compactions >= HANDOFF_AT ? ` After ${state.compactions} compactions, if this block is not close to done, hand it to a fresh agent with a written handoff instead of continuing in this thread.` : ''));
    }
  }
  fs.writeFileSync(file, JSON.stringify(state));
  if (notes.length && event === 'PostToolUse') say(event, notes.join('\n'));
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => { try { main(input); } catch {} process.exit(0); });
