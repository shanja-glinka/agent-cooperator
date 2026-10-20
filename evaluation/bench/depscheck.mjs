#!/usr/bin/env node
// Checks a node_modules against the package-lock.json beside it: every locked package installed
// at its locked version (an optional package for another platform may be absent), and no
// top-level package the lockfile does not name. Exits 1 on any difference.
// usage: depscheck.mjs <dir with package-lock.json and node_modules>
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] ?? '.');
const lock = JSON.parse(fs.readFileSync(path.join(dir, 'package-lock.json'), 'utf8'));
const entries = Object.entries(lock.packages ?? {}).filter(([k, v]) => k.startsWith('node_modules/') && !v.link);
const bad = [];
for (const [k, v] of entries) {
  const pj = path.join(dir, k, 'package.json');
  if (!fs.existsSync(pj)) { if (!v.optional) bad.push(`${k}: missing, lock ${v.version}`); continue; }
  const installed = JSON.parse(fs.readFileSync(pj, 'utf8')).version;
  if (installed !== v.version) bad.push(`${k}: installed ${installed}, lock ${v.version}`);
}
const locked = new Set(entries.map(([k]) => k));
const nm = path.join(dir, 'node_modules');
for (const e of fs.existsSync(nm) ? fs.readdirSync(nm) : []) {
  if (e.startsWith('.')) continue;
  const names = e.startsWith('@') ? fs.readdirSync(path.join(nm, e)).map((s) => `${e}/${s}`) : [e];
  for (const n of names) if (!locked.has(`node_modules/${n}`)) bad.push(`node_modules/${n}: not in package-lock.json`);
}
if (bad.length) {
  console.log(`depscheck ${dir}: ${bad.length} differences from package-lock.json`);
  for (const b of bad.slice(0, 40)) console.log(`  ${b}`);
  process.exit(1);
}
console.log(`depscheck ${dir}: ${entries.length} locked packages match package-lock.json`);
