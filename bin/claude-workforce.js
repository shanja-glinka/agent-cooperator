#!/usr/bin/env node

import { runCli } from '../lib/cli.js';

runCli(process.argv.slice(2), {
  target: 'claude',
  env: process.env,
  stdout: process.stdout,
  stderr: process.stderr,
}).then((exitCode) => {
  process.exitCode = exitCode;
}).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
