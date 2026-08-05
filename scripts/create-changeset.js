#!/usr/bin/env node
'use strict';

/**
 * Writes a changeset file from command-line arguments instead of the
 * interactive `npx changeset` prompt, so a release can be triggered from CI
 * (or a one-liner locally) by picking a bump level.
 *
 *   node scripts/create-changeset.js --bump minor --packages core,react \
 *     --message "Add schema adapters"
 *
 * Omitting --packages targets every publishable package. Any changesets that
 * are already pending are left alone: `changeset version` merges them all and
 * the largest bump per package wins.
 */

const fs = require('fs');
const path = require('path');

const VALID_BUMPS = ['patch', 'minor', 'major'];
const REPO_ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');
const CHANGESET_DIR = path.join(REPO_ROOT, '.changeset');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

/** Every package under packages/ that is actually published to npm. */
function readPublishablePackages() {
  return fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const manifestPath = path.join(PACKAGES_DIR, entry.name, 'package.json');
      if (!fs.existsSync(manifestPath)) {
        return undefined;
      }
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (!manifest.name || manifest.private === true) {
        return undefined;
      }
      return { dir: entry.name, name: manifest.name };
    })
    .filter(Boolean);
}

/** Accepts either `core` or `@dynamic-field-kit/core`. */
function resolveRequested(requested, publishable) {
  return requested.map((token) => {
    const match = publishable.find(
      (pkg) => pkg.name === token || pkg.dir === token
    );
    if (!match) {
      const known = publishable.map((p) => p.dir).join(', ');
      throw new Error(`Unknown package "${token}". Known packages: ${known}`);
    }
    return match.name;
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const bump = String(args.bump || '').trim();

  if (!VALID_BUMPS.includes(bump)) {
    throw new Error(
      `--bump must be one of ${VALID_BUMPS.join(', ')} (received "${bump}")`
    );
  }

  const publishable = readPublishablePackages();
  if (publishable.length === 0) {
    throw new Error(`No publishable packages found under ${PACKAGES_DIR}`);
  }

  const requestedRaw =
    typeof args.packages === 'string' ? args.packages.trim() : '';
  const names = requestedRaw
    ? resolveRequested(
        requestedRaw
          .split(',')
          .map((token) => token.trim())
          .filter(Boolean),
        publishable
      )
    : publishable.map((pkg) => pkg.name);

  if (names.length === 0) {
    throw new Error('--packages resolved to an empty list');
  }

  const message =
    (typeof args.message === 'string' && args.message.trim()) ||
    `Release ${bump} version`;

  const frontMatter = names.map((name) => `'${name}': ${bump}`).join('\n');
  const body = `---\n${frontMatter}\n---\n\n${message}\n`;

  fs.mkdirSync(CHANGESET_DIR, { recursive: true });
  const fileName = `auto-${bump}-${Date.now()}.md`;
  const filePath = path.join(CHANGESET_DIR, fileName);
  fs.writeFileSync(filePath, body, 'utf8');

  process.stdout.write(
    `Created .changeset/${fileName}\n` +
      `  bump:     ${bump}\n` +
      `  packages: ${names.join(', ')}\n` +
      `  message:  ${message}\n`
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`create-changeset: ${error.message}\n`);
  process.exit(1);
}
