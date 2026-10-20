#!/usr/bin/env node
// The first review a Claude cell's cooperator ran through codex-run.mjs, as replay-review.sh needs
// it: the packet it wrote (a heredoc in a Bash command), the run name, and the packet's SNAPSHOT,
// with the cell's checkout path replaced by the replay's. Prints "name snapshot" ("none" for a packet
// older than SNAPSHOT, before v8) and writes the packet. A Codex cell is not supported: Codex keeps
// the cooperator's messages to agents encrypted.
// usage: replay-packet.mjs <source-cell-dir> <new-root> <packet-out>
import fs from 'node:fs';
import path from 'node:path';

const [cell, root, outFile] = process.argv.slice(2);
const transcript = path.join(cell, 'logs', 'transcripts', 'main.jsonl');
if (!fs.existsSync(transcript)) { console.error(`replay-packet: no Claude transcript in ${cell}`); process.exit(1); }

const commands = [];
for (const line of fs.readFileSync(transcript, 'utf8').split('\n')) {
  if (!line.includes('tool_use')) continue;
  let e;
  try { e = JSON.parse(line); } catch { continue; }
  for (const c of e.message?.content ?? []) if (c.type === 'tool_use' && typeof c.input?.command === 'string') commands.push(c.input.command);
}
const launch = commands.find((c) => /codex-run\.mjs\s.*--role review\b/.test(c));
if (!launch) { console.error('replay-packet: no review launched through codex-run.mjs'); process.exit(1); }
const name = /--name\s+(\S+)/.exec(launch)?.[1];
const packetPath = /--packet\s+(\S+)/.exec(launch)?.[1];
// The heredoc that wrote that packet, the last one before the launch.
const writes = commands.slice(0, commands.indexOf(launch)).filter((c) => c.includes(`cat > ${packetPath} <<'EOF'`));
const heredoc = writes.at(-1);
if (!heredoc) { console.error(`replay-packet: no heredoc writes ${packetPath}`); process.exit(1); }
const body = heredoc.slice(heredoc.indexOf("<<'EOF'\n") + 8, heredoc.indexOf('\nEOF'));
const oldRoot = path.join('/private/tmp/agent-cooperator-bench', path.basename(path.dirname(path.dirname(cell))), path.basename(cell), 'repo');
const packet = body.split(oldRoot).join(root) + '\n';
const snapshot = /SNAPSHOT:\s*tree:([0-9a-f]{40})/.exec(packet)?.[1] ?? 'none';
fs.writeFileSync(outFile, packet);
console.log(`${name} ${snapshot}`);
