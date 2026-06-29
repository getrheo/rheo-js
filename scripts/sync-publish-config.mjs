#!/usr/bin/env node
/**
 * Write publishConfig.exports from dist/publish-exports.json after build.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const pkgDir = process.cwd();
const pkgPath = join(pkgDir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const manifestPath = join(pkgDir, 'dist/publish-exports.json');

if (!existsSync(manifestPath)) {
  console.error(`[sync-publish-config] missing ${manifestPath} — run build first`);
  process.exit(1);
}

/** @type {{ exportKey: string; distFile: string }[]} */
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const publishExports = {};
for (const { exportKey, distFile } of manifest) {
  const key = exportKey === './index' ? '.' : exportKey;
  publishExports[key] = {
    types: distFile.replace(/\.js$/, '.d.ts'),
    import: distFile,
    default: distFile,
  };
}

const mainExport = publishExports['.'];
pkg.publishConfig = {
  ...(pkg.publishConfig ?? {}),
  access: 'public',
  exports: publishExports,
  ...(mainExport ? { main: mainExport.import, types: mainExport.types } : {}),
};

writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`[sync-publish-config] ${pkg.name}: ${manifest.length} export paths`);
