#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(new URL('.', import.meta.url).pathname, '..');
const targetVersion = process.env.TARGET_VERSION ?? JSON.parse(
  readFileSync(join(repoRoot, 'packages/flow-runtime/package.json'), 'utf8'),
).version;

const PUBLISH_PACKAGES = [
  { name: '@getrheo/flow-runtime', dir: 'packages/flow-runtime', expectsDist: true },
  { name: '@getrheo/flow-ui-state', dir: 'packages/flow-ui-state', expectsDist: true },
  { name: '@getrheo/renderer-core', dir: 'packages/renderer-core', expectsDist: true },
  { name: '@getrheo/attribution', dir: 'packages/attribution', expectsDist: true },
];

const errors = [];

for (const { name, dir, expectsDist } of PUBLISH_PACKAGES) {
  const pkgPath = join(repoRoot, dir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

  if (pkg.version !== targetVersion) {
    errors.push(`${name}: version ${pkg.version} !== ${targetVersion}`);
  }
  if (!pkg.repository?.url) errors.push(`${name}: missing repository.url`);
  if (expectsDist && !existsSync(join(repoRoot, dir, 'dist/index.js'))) {
    errors.push(`${name}: dist/index.js missing — run pnpm build`);
  }
  const contractsDep = pkg.dependencies?.['@getrheo/contracts'];
  if (!contractsDep || contractsDep === 'workspace:*') {
    errors.push(`${name}: @getrheo/contracts must be pinned npm version`);
  }
}

if (errors.length > 0) {
  console.error('npm publish graph check failed:');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log(`npm publish graph check passed (${PUBLISH_PACKAGES.length} packages @ ${targetVersion})`);
