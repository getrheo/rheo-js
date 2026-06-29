#!/usr/bin/env node
import { globSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'tsup';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const pkgDir = process.cwd();
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));

const SKIP_EXPORT_KEYS = new Set(['./__fixtures__/*']);

const isTestFile = (filePath) =>
  filePath.includes('.test.') || filePath.includes('.parity.test.');

const expandExportPattern = (exportKey, pattern) => {
  const relPattern = pattern.replace(/^\.\//, '');
  const files = globSync(relPattern, { cwd: pkgDir })
    .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
    .filter((f) => !isTestFile(f));

  const entries = [];
  for (const file of files) {
    const posixFile = file.split('\\').join('/');
    let key = exportKey;
    if (exportKey.includes('*')) {
      if (exportKey === './*') {
        const base = posixFile.replace(/^src\//, '').replace(/\.tsx?$/, '');
        key = `./${base}`;
      } else {
        const starSegment = posixFile
          .replace(/^src\//, '')
          .replace(/\.tsx?$/, '')
          .split('/')
          .pop();
        key = exportKey.replace('*', starSegment ?? '');
      }
    }
    entries.push({ exportKey: key, srcFile: posixFile });
  }
  return entries;
};

const collectPublishEntries = () => {
  const exportsField = pkg.exports ?? { '.': pkg.main ?? './src/index.ts' };
  const collected = [];

  for (const [exportKey, value] of Object.entries(exportsField)) {
    if (SKIP_EXPORT_KEYS.has(exportKey)) continue;
    if (typeof value !== 'string') continue;

    if (value.includes('*')) {
      collected.push(...expandExportPattern(exportKey, value));
      continue;
    }

    if (!value.startsWith('./src/')) continue;
    collected.push({ exportKey, srcFile: value.replace(/^\.\//, '') });
  }

  const bySrc = new Map();
  for (const entry of collected) {
    const existing = bySrc.get(entry.srcFile);
    if (existing === undefined || entry.exportKey === '.') {
      bySrc.set(entry.srcFile, entry.exportKey);
    }
  }

  return [...bySrc.entries()].map(([srcFile, exportKey]) => ({ exportKey, srcFile }));
};

const entryNameForSrc = (srcFile) => srcFile.replace(/^src\//, '').replace(/\.tsx?$/, '');

const collectExternals = () => {
  const names = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ]);
  return [...names, /^@getrheo\//];
};

const fixEsmRelativeImports = (distDirectory) => {
  const files = globSync('**/*.js', { cwd: distDirectory }).map((f) => join(distDirectory, f));
  for (const file of files) {
    let content = readFileSync(file, 'utf8');
    const patched = content.replace(/from (['"])(\.[^'"]+)\1/g, (match, quote, spec) => {
      if (spec.endsWith('.js') || spec.endsWith('.json')) return match;
      return `from ${quote}${spec}.js${quote}`;
    });
    if (patched !== content) writeFileSync(file, patched);
  }
};

const usesJsx = (entries) => entries.some((e) => e.srcFile.endsWith('.tsx'));

const main = async () => {
  const entries = collectPublishEntries();
  if (entries.length === 0) {
    console.error(`[build-publishable] no entries for ${pkg.name}`);
    process.exit(1);
  }

  const entryRecord = Object.fromEntries(
    entries.map(({ srcFile }) => [entryNameForSrc(srcFile), join(pkgDir, srcFile)]),
  );

  const isRnCore = pkg.name === '@getrheo/react-native-core';
  const hasJsx = usesJsx(entries);
  const shouldBundle = !isRnCore && !hasJsx;

  await build({
    entry: entryRecord,
    outDir: join(pkgDir, 'dist'),
    format: ['esm'],
    dts: { compilerOptions: { incremental: false } },
    sourcemap: true,
    clean: true,
    splitting: false,
    bundle: shouldBundle,
    platform: isRnCore || hasJsx ? 'neutral' : 'node',
    target: 'es2022',
    jsx: hasJsx ? 'automatic' : undefined,
    external: shouldBundle ? collectExternals() : undefined,
    treeshake: shouldBundle,
    esbuildOptions(options) {
      options.jsx = 'automatic';
      if (!shouldBundle) {
        options.loader = { ...options.loader, '.js': 'jsx' };
      }
    },
  });

  if (!shouldBundle) {
    fixEsmRelativeImports(join(pkgDir, 'dist'));
  }

  const publishManifest = entries.map(({ exportKey, srcFile }) => ({
    exportKey,
    distFile: `./dist/${entryNameForSrc(srcFile)}.js`,
  }));
  writeFileSync(
    join(pkgDir, 'dist/publish-exports.json'),
    `${JSON.stringify(publishManifest, null, 2)}\n`,
  );

  console.log(`[build-publishable] ${pkg.name}: ${entries.length} entries -> dist/`);

  const sync = spawnSync('node', [join(repoRoot, 'scripts/sync-publish-config.mjs')], {
    cwd: pkgDir,
    stdio: 'inherit',
  });
  if (sync.status !== 0) process.exit(sync.status ?? 1);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
