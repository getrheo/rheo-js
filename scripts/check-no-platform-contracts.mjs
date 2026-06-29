#!/usr/bin/env node
/**
 * Public-repo guardrail: @rheo/platform-contracts must never be imported in source.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const NEEDLE = '@rheo/platform-contracts';
const IMPORT_PATTERNS = [
  /from\s+['"]@rheo\/platform-contracts['"]/,
  /import\s+['"]@rheo\/platform-contracts['"]/,
  /require\s*\(\s*['"]@rheo\/platform-contracts['"]\s*\)/,
];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.turbo', 'coverage', '.build', '.swiftpm']);
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.swift']);

const errors = [];
const root = process.cwd();

const isForbiddenImport = (text) => IMPORT_PATTERNS.some((re) => re.test(text));

const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      walk(path);
      continue;
    }
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
    if (!TEXT_EXT.has(ext)) continue;
    if (name === 'check-no-platform-contracts.mjs') continue;
    const text = readFileSync(path, 'utf8');
    if (text.includes(NEEDLE) && isForbiddenImport(text)) {
      errors.push(path.slice(root.length + 1));
    }
  }
};

walk(root);

if (errors.length > 0) {
  console.error('check-no-platform-contracts failed:');
  for (const file of errors) {
    console.error(`- ${file} imports ${NEEDLE}`);
  }
  process.exit(1);
}

console.log('check-no-platform-contracts passed');
