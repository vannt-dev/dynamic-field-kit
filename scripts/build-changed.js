#!/usr/bin/env node
// Build only changed packages based on git diff
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

const root = path.resolve(__dirname, '..');
const packagesDir = path.join(root, 'packages');

// Discover package.json files under packages/*
const pkgDirs = fs
  .readdirSync(packagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join('packages', d.name, 'package.json'));

const pkgMap = new Map(); // path -> name
for (const p of pkgDirs) {
  const abs = path.resolve(root, p);
  const data = readJSON(abs);
  const name = data && data.name ? data.name : null;
  if (name) {
    pkgMap.set(path.normalize(abs), name);
  }
}

// Determine changed files since origin/main (fallback to main if needed)
let changedPaths = [];
try {
  const base = execSync('git merge-base HEAD origin/main', {
    encoding: 'utf8',
  }).trim();
  if (base) {
    const out = execSync(`git diff --name-only ${base} HEAD`, {
      encoding: 'utf8',
    }).trim();
    changedPaths = out ? out.split(/\r?\n/).filter(Boolean) : [];
  }
} catch (e) {
  // ignore and try fallback
}
if (!changedPaths.length) {
  try {
    const out2 = execSync('git diff --name-only HEAD main', {
      encoding: 'utf8',
    }).trim();
    changedPaths = out2 ? out2.split(/\r?\n/).filter(Boolean) : [];
  } catch (e) {
    // ignore
  }
}

// Map changed paths to package names
const changedPkgs = new Set();
for (const p of changedPaths) {
  const parts = p.split(/[\\/]+/).filter(Boolean);
  // Expecting paths like: packages/<name>/...
  const idx = parts.indexOf('packages');
  if (idx >= 0 && parts.length > idx + 1) {
    const pkgDirName = parts[idx + 1];
    const possiblePath = path.normalize(
      path.join('packages', pkgDirName, 'package.json')
    );
    // Resolve absolute path to match keys in pkgMap
    const abs = path.resolve(root, possiblePath);
    if (pkgMap.has(abs)) {
      changedPkgs.add(pkgMap.get(abs));
    }
  }
}

if (changedPkgs.size === 0) {
  console.log('No changed packages detected. Skipping build:changed.');
  process.exit(0);
}

const toBuild = Array.from(changedPkgs).sort();
console.log('Building changed packages:', toBuild.join(', '));

let failed = false;
for (const pkg of toBuild) {
  console.log(`Running: npm run -w ${pkg} build`);
  const res = spawnSync('npm', ['run', '-w', pkg, 'build'], {
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    failed = true;
    break;
  }
}

process.exit(failed ? 1 : 0);
