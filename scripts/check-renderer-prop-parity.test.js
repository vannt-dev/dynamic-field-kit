import { describe, expect, it } from 'vitest';

import { run, contractKeys } from './check-renderer-prop-parity.js';

describe('renderer prop parity', () => {
  it('parses a non-trivial contract out of core', () => {
    const keys = contractKeys();

    // The props the 1.5.1 reports found missing from one adapter or another.
    expect(keys).toEqual(
      expect.arrayContaining([
        'placeholder',
        'required',
        'touched',
        'dirty',
        'id',
        'ariaInvalid',
        'ariaRequired',
        'min',
        'max',
        'step',
        'accept',
        'multiple',
      ]),
    );
  });

  it('finds every contract prop forwarded by all three adapters', () => {
    expect(run().failures).toEqual([]);
  });
});
