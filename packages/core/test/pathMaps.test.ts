import { describe, expect, it } from 'vitest';
import { indexGroupPathMap } from '../src/pathMaps';

describe('indexGroupPathMap', () => {
  it('indexes nested paths in one pass and ignores unrelated keys', () => {
    expect(
      indexGroupPathMap(
        {
          'contacts[0].email': ['Required'],
          'contacts[1].address.city': ['Required'],
          title: ['Required'],
        },
        'contacts',
      ),
    ).toEqual({
      0: { email: ['Required'] },
      1: { 'address.city': ['Required'] },
    });
  });

  it('preserves controlled undefined versus an empty map', () => {
    expect(indexGroupPathMap(undefined, 'contacts')).toBeUndefined();
    expect(indexGroupPathMap({}, 'contacts')).toEqual({});
  });
});
