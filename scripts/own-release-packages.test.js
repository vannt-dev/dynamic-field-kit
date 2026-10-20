import { describe, expect, it } from 'vitest';

import { ownReleasePackages } from './own-release-packages.js';

const line = (version, overrides = {}) => ({
  core: version,
  react: version,
  vue: version,
  angular: version,
  svelte: version,
  ...overrides,
});
const tags =
  (...names) =>
  (tag) =>
    names.includes(tag);

describe('ownReleasePackages', () => {
  it('lists nothing when every package is on core version', () => {
    expect(ownReleasePackages(line('1.12.0'), tags())).toEqual([]);
  });

  it('lists a package that moved on its own, as angular did in 1.11.1', () => {
    expect(
      ownReleasePackages(
        line('1.11.0', { angular: '1.11.1' }),
        tags('v1.11.0'),
      ),
    ).toEqual([
      {
        tag: '@dynamic-field-kit/angular@1.11.1',
        pkg: 'angular',
        version: '1.11.1',
      },
    ]);
  });

  it('leaves out a package behind core whose version an older release tag covers', () => {
    expect(
      ownReleasePackages(
        line('1.12.0', { react: '1.11.0' }),
        tags('v1.11.0', 'v1.12.0'),
      ),
    ).toEqual([]);
  });

  it('lists every package that moved on its own', () => {
    const own = ownReleasePackages(
      line('1.11.0', { vue: '1.11.1', svelte: '1.11.2' }),
      tags('v1.11.0'),
    );
    expect(own.map(({ tag }) => tag)).toEqual([
      '@dynamic-field-kit/vue@1.11.1',
      '@dynamic-field-kit/svelte@1.11.2',
    ]);
  });
});
