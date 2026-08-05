import { describe, expect, test } from 'vitest';
import {
  insertGroupItem,
  moveGroupItem,
  swapGroupItems,
} from '../src/fieldGroup';

describe('moveGroupItem', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  test('moves an item forward', () => {
    expect(moveGroupItem(items, 0, 2)).toEqual([
      { id: 'b' },
      { id: 'c' },
      { id: 'a' },
    ]);
  });

  test('moves an item backward', () => {
    expect(moveGroupItem(items, 2, 0)).toEqual([
      { id: 'c' },
      { id: 'a' },
      { id: 'b' },
    ]);
  });

  test('does not mutate the original array', () => {
    moveGroupItem(items, 0, 2);
    expect(items).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  });

  test.each([
    ['negative from', -1, 1],
    ['from past the end', 3, 1],
    ['negative to', 0, -1],
    ['to past the end', 0, 3],
  ])('returns the array unchanged for %s', (_label, from, to) => {
    expect(moveGroupItem(items, from, to)).toBe(items);
  });
});

describe('swapGroupItems', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  test('swaps two items', () => {
    expect(swapGroupItems(items, 0, 2)).toEqual([
      { id: 'c' },
      { id: 'b' },
      { id: 'a' },
    ]);
  });

  test('does not mutate the original array', () => {
    swapGroupItems(items, 0, 2);
    expect(items).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  });

  test.each([
    ['negative index a', -1, 1],
    ['index a past the end', 3, 1],
    ['negative index b', 0, -1],
    ['index b past the end', 0, 3],
  ])('returns the array unchanged for %s', (_label, a, b) => {
    expect(swapGroupItems(items, a, b)).toBe(items);
  });
});

describe('insertGroupItem', () => {
  const items = [{ id: 'a' }, { id: 'b' }];

  test('inserts at the given index', () => {
    expect(insertGroupItem(items, 1, { id: 'x' })).toEqual([
      { id: 'a' },
      { id: 'x' },
      { id: 'b' },
    ]);
  });

  test('defaults to an empty item', () => {
    expect(insertGroupItem(items, 0)).toEqual([{}, { id: 'a' }, { id: 'b' }]);
  });

  test('clamps a negative index to the start', () => {
    expect(insertGroupItem(items, -5, { id: 'x' })[0]).toEqual({ id: 'x' });
  });

  test('clamps an index past the end to the end', () => {
    const result = insertGroupItem(items, 99, { id: 'x' });
    expect(result[result.length - 1]).toEqual({ id: 'x' });
  });

  test('does not mutate the original array', () => {
    insertGroupItem(items, 1, { id: 'x' });
    expect(items).toEqual([{ id: 'a' }, { id: 'b' }]);
  });
});
