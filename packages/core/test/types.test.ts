import { describe, expect, test } from 'vitest';
import type { FieldDescription, Properties } from '../src';

// Compile-time type guarantees live in types.test-d.ts. These tests only
// exercise runtime behavior: app-supplied callbacks being invoked, and
// Properties key access.

describe('FieldDescription runtime callbacks', () => {
  test('appearCondition is invoked with form data', () => {
    const condition = (d: Properties) => d.showAdvanced === true;
    const field: FieldDescription = {
      name: 'advanced',
      type: 'text',
      appearCondition: condition,
    };

    expect(field.appearCondition?.({ showAdvanced: true })).toBe(true);
    expect(field.appearCondition?.({ showAdvanced: false })).toBe(false);
  });

  test('complex appearCondition logic evaluates against nested data', () => {
    const condition = (d: Properties) =>
      d.role === 'admin' &&
      (d.age as number) >= 18 &&
      (d.tags as string[]).includes('vip');

    expect(condition({ role: 'admin', age: 25, tags: ['vip', 'active'] })).toBe(
      true,
    );
    expect(condition({ role: 'user', age: 25, tags: ['vip'] })).toBe(false);
    expect(condition({ role: 'admin', age: 15, tags: ['vip'] })).toBe(false);
  });

  test('validate, disabledCondition and readOnlyCondition are invoked', () => {
    const field: FieldDescription = {
      name: 'email',
      type: 'text',
      validate: (value) =>
        typeof value === 'string' && value.includes('@')
          ? undefined
          : 'Invalid email',
      disabledCondition: (data) => data.locked === true,
      readOnlyCondition: (data, rootData) => (rootData ?? data).frozen === true,
    };

    expect(field.validate?.('a', {}, {})).toBe('Invalid email');
    expect(field.validate?.('a@b', {}, {})).toBeUndefined();
    expect(field.disabledCondition?.({ locked: true })).toBe(true);
    expect(field.readOnlyCondition?.({}, { frozen: true })).toBe(true);
  });
});

describe('Properties runtime access', () => {
  test('supports special-character and mixed-style keys', () => {
    const props: Properties = {
      'special-key': 'value',
      camelCase: 'test',
      snake_case: 'test',
    };

    expect(props['special-key']).toBe('value');
    expect(props['camelCase']).toBe('test');
    expect(props['snake_case']).toBe('test');
  });
});
