#!/usr/bin/env node
/**
 * Deletes `.map` files from a build output directory and removes the
 * `//# sourceMappingURL=` comment that pointed at them.
 *
 * core, react and vue stop tsup emitting sourcemaps with `sourcemap: false`,
 * because the maps embed `sourcesContent` - a full copy of the TypeScript
 * source - and `files` publishes `dist` alone, so they were roughly half of
 * every tarball. ng-packagr offers no equivalent switch: it always writes a
 * fesm2022 map, sourcesContent and all. So angular gets the same result by
 * deleting the map after the build, as a `postbuild` step.
 *
 * The comment has to go with the file. Excluding the map at publish time alone
 * would leave every consumer's devtools fetching a URL that 404s.
 *
 * Usage: node scripts/strip-sourcemaps.js <dir> [...more dirs]
 * Paths are resolved against the caller's cwd, so a package can pass `dist`.
 */
const fs = require('fs');
const path = require('path');

// Matches a trailing sourceMappingURL comment in either comment syntax, with or
// without a final newline. Anchored to the end so a URL inside the code - in a
// string literal, say - is left alone.
const TRAILING_COMMENT =
  /\r?\n?(?:\/\/[#@]\s*sourceMappingURL=.*|\/\*[#@]\s*sourceMappingURL=.*?\*\/)\s*$/;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function strip(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`${dir} does not exist - run the build first`);
  }

  const files = walk(dir);
  const maps = files.filter((f) => f.endsWith('.map'));
  for (const map of maps) {
    fs.unlinkSync(map);
  }

  let commentsRemoved = 0;
  for (const file of files) {
    if (file.endsWith('.map') || !/\.(m?js|cjs|css)$/.test(file)) {
      continue;
    }
    const before = fs.readFileSync(file, 'utf8');
    const after = before.replace(TRAILING_COMMENT, '');
    if (after !== before) {
      fs.writeFileSync(file, after);
      commentsRemoved += 1;
    }
  }

  return { maps: maps.length, commentsRemoved };
}

function main(argv) {
  const dirs = argv.length ? argv : ['dist'];
  let maps = 0;
  let commentsRemoved = 0;
  for (const dir of dirs) {
    const r = strip(path.resolve(process.cwd(), dir));
    maps += r.maps;
    commentsRemoved += r.commentsRemoved;
  }
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  console.log(
    `stripped ${plural(maps, 'sourcemap')} and ` +
      `${plural(commentsRemoved, 'sourceMappingURL comment')} from ${dirs.join(', ')}`,
  );
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { strip, TRAILING_COMMENT };
