import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import process from 'node:process';

import * as sass from 'sass';

const rootDir = new URL('../src/', import.meta.url);
const scssLoadPaths = [
  rootDir.pathname,
  join(rootDir.pathname, 'components'),
  join(rootDir.pathname, 'components/albumArt'),
  join(rootDir.pathname, 'components/detailPane'),
  join(rootDir.pathname, 'components/detailPane/listenerDetail'),
  join(rootDir.pathname, 'components/errorModal'),
  join(rootDir.pathname, 'components/errors'),
  join(rootDir.pathname, 'components/hotkey'),
  join(rootDir.pathname, 'components/menu'),
  join(rootDir.pathname, 'components/player'),
  join(rootDir.pathname, 'components/playlist'),
  join(rootDir.pathname, 'components/ratingSpreadChart'),
  join(rootDir.pathname, 'components/ratings'),
  join(rootDir.pathname, 'components/requestsPanel'),
  join(rootDir.pathname, 'components/search'),
  join(rootDir.pathname, 'components/settings'),
  join(rootDir.pathname, 'components/timeline'),
  join(rootDir.pathname, 'components/timeline/timelineSong'),
];

async function collectModuleScss(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectModuleScss(fullPath);
      }
      if (entry.isFile() && entry.name.endsWith('.module.scss')) {
        return [fullPath];
      }
      return [];
    }),
  );

  return files.flat();
}

async function main() {
  const srcDir = rootDir.pathname;
  const compileTargets = [join(srcDir, 'index.scss'), ...(await collectModuleScss(srcDir))];

  for (const file of compileTargets) {
    sass.compile(file, { loadPaths: scssLoadPaths });
    process.stdout.write(`compiled ${relative(process.cwd(), file)}\n`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
