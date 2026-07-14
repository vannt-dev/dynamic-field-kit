import { describe, expect, test } from 'vitest';
import { applyComputedValues } from '../src';
import type { FieldDescription } from '../src';

describe('applyComputedValues', () => {
  test('derives a field value from the rest of the data', () => {
    const fields: FieldDescription[] = [
      { name: 'firstName', type: 'text' },
      { name: 'lastName', type: 'text' },
      {
        name: 'fullName',
        type: 'text',
        computeValue: (data) =>
          `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
      },
    ];

    const result = applyComputedValues(fields, {
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    expect(result.fullName).toBe('Ada Lovelace');
  });

  test('returns the same reference when nothing changes', () => {
    const fields: FieldDescription[] = [
      { name: 'total', type: 'number', computeValue: () => 42 },
    ];

    const data = { total: 42 };
    const result = applyComputedValues(fields, data);

    expect(result).toBe(data);
  });

  test('returns the same reference when no field declares computeValue', () => {
    const fields: FieldDescription[] = [{ name: 'name', type: 'text' }];
    const data = { name: 'Ada' };

    expect(applyComputedValues(fields, data)).toBe(data);
  });

  test('passes top-level rootData as the second argument', () => {
    const seen: Array<Record<string, unknown>> = [];
    const fields: FieldDescription[] = [
      {
        name: 'label',
        type: 'text',
        computeValue: (data, rootData) => {
          seen.push({ data, rootData });
          return `${rootData?.currency ?? ''}${data.amount ?? ''}`;
        },
      },
    ];

    const item = { amount: 10 };
    const root = { currency: '$', items: [item] };
    const result = applyComputedValues(fields, item, root);

    expect(result.label).toBe('$10');
    expect(seen[0].rootData).toBe(root);
    expect(seen[0].data).toBe(item);
  });

  test('rootData defaults to data when omitted', () => {
    const fields: FieldDescription[] = [
      {
        name: 'echo',
        type: 'text',
        computeValue: (_data, rootData) => rootData?.name,
      },
    ];

    const result = applyComputedValues(fields, { name: 'Ada' });
    expect(result.echo).toBe('Ada');
  });

  test('applies multiple computed fields in declaration order', () => {
    const fields: FieldDescription[] = [
      { name: 'a', type: 'number' },
      {
        name: 'b',
        type: 'number',
        computeValue: (data) => (data.a as number) + 1,
      },
      {
        name: 'c',
        type: 'number',
        computeValue: (data) => (data.b as number) + 1,
      },
    ];

    const result = applyComputedValues(fields, { a: 1, b: 0, c: 0 });

    expect(result.b).toBe(2);
    expect(result.c).toBe(3);
  });
});
