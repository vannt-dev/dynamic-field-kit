#!/usr/bin/env node
/**
 * Lists the packages that need a git tag and a GitHub Release of their own.
 *
 * A release is tagged `v<version>` after core: the five packages share one version
 * line and core anchors it. The `linked` group still lets one package move on its
 * own, as angular did in 1.11.1 while core stayed at 1.11.0. That version has no
 * `v<version>` tag to stand for it, and release.yml made neither a tag nor a Release
 * for it (both were made by hand). Such a package gets
 * `@dynamic-field-kit/<pkg>@<version>`, the name changesets gives a package tag.
 *
 * A package that is behind core at a version an older `v<version>` already covers
 * needs nothing.
 *
 * Prints one line per package: `<tag> <package> <version>`.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PACKAGES = ['react', 'vue', 'angular', 'svelte'];

/**
 * @param {Record<string, string>} versions package name -> version, core included
 * @param {(tag: string) => boolean} tagExists
 */
function ownReleasePackages(versions, tagExists) {
  return PACKAGES.filter(
    (pkg) => versions[pkg] !== versions.core && !tagExists(`v${versions[pkg]}`),
  ).map((pkg) => ({
    tag: `@dynamic-field-kit/${pkg}@${versions[pkg]}`,
    pkg,
    version: versions[pkg],
  }));
}

function readVersions(root) {
  const versions = {};
  for (const pkg of ['core', ...PACKAGES]) {
    const manifest = path.join(root, 'packages', pkg, 'package.json');
    versions[pkg] = JSON.parse(fs.readFileSync(manifest, 'utf8')).version;
  }
  return versions;
}

function gitTagExists(tag) {
  try {
    execFileSync('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`], {
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

if (require.main === module) {
  const own = ownReleasePackages(readVersions(process.cwd()), gitTagExists);
  for (const { tag, pkg, version } of own) {
    console.log(`${tag} ${pkg} ${version}`);
  }
}

module.exports = { ownReleasePackages, readVersions, PACKAGES };
