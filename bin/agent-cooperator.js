#!/usr/bin/env node

import { runCli } from '../lib/cli.js';

const USAGE = `agent-cooperator

Usage:
  agent-cooperator claude <install|update|status|uninstall> [options]
  agent-cooperator codex <install|update|status|uninstall> [options]

Run "agent-cooperator claude --help" or "agent-cooperator codex --help" for options.
`;

const [target, ...rest] = process.argv.slice(2);
if (target !== 'claude' && target !== 'codex') {
  const help = target === '-h' || target === '--help';
  (help ? process.stdout : process.stderr).write(target && !help ? `Unknown runtime: ${target}\n\n${USAGE}` : USAGE);
  process.exitCode = help ? 0 : 2;
} else {
  runCli(rest, {
    target,
    env: process.env,
    stdout: process.stdout,
    stderr: process.stderr,
  }).then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
