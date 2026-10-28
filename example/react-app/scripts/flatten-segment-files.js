#!/usr/bin/env node
'use strict';

/**
 * Works around a Next.js 16 static export bug on Windows
 * (https://github.com/vercel/next.js/issues/85374, fix pending in #92340).
 *
 * For each page the export writes one prefetch file per route segment, named
 * by joining the segment path with dots: `wizard/__next.wizard.__PAGE__.txt`.
 * Next builds that name from `path.relative`, which returns backslashes on
 * Windows, and only swaps forward slashes for dots. The backslash then acts
 * as a separator, so a Windows build writes `wizard/__next.wizard/__PAGE__.txt`
 * instead. The browser still asks for the dotted name, gets a 404 for every
 * linked page on load, and logs it to the console.
 *
 * This moves any file under a `__next.*` directory back to the flat, dotted
 * name. On Linux and macOS (the Pages workflow builds on ubuntu) there are no
 * such directories and it does nothing. Delete it once the upstream fix ships.
 *
 * Wired to `postbuild`, so it runs after `npm run build` but not after a bare
 * `npx next build`.
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, '..', 'out');
const PREFIX = '__next.';

/** Every file below `dir`, as paths relative to it. */
function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [entry.name];
    return listFiles(path.join(dir, entry.name)).map((file) =>
      path.join(entry.name, file),
    );
  });
}

function flatten(dir) {
  let moved = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (!entry.name.startsWith(PREFIX)) {
      moved += flatten(full);
      continue;
    }
    // `__next.wizard/__PAGE__.txt` -> `__next.wizard.__PAGE__.txt`
    for (const file of listFiles(full)) {
      const flatName = [entry.name, ...file.split(path.sep)].join('.');
      fs.renameSync(path.join(full, file), path.join(dir, flatName));
      moved++;
    }
    fs.rmSync(full, { recursive: true });
  }
  return moved;
}

if (!fs.existsSync(OUT_DIR)) {
  console.error(`flatten-segment-files: ${OUT_DIR} not found, run next build`);
  process.exit(1);
}

const moved = flatten(OUT_DIR);
if (moved > 0) {
  console.log(`flatten-segment-files: renamed ${moved} segment prefetch files`);
}
