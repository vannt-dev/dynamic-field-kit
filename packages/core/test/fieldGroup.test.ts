import { describe, expect, test } from 'vitest';
import {
  canAddGroupItem,
  canRemoveGroupItem,
  createGroupItem,
  isFieldGroup,
} from '../src';
import type { FieldDescription } from '../src';

describe('fieldGroup', () => {
  const groupField: FieldDescription = {
    name: 'contacts',
    type: 'group',
    fields: [{ name: 'email', type: 'text' }],
    defaultItem: { email: '' },
    minItems: 1,
    maxItems: 3,
  };

  test('isFieldGroup distinguishes group fields from leaf fields', () => {
    expect(isFieldGroup(groupField)).toBe(true);
    expect(isFieldGroup({ name: 'age', type: 'number' })).toBe(false);
  });

  test('createGroupItem seeds a new item from defaultItem', () => {
    const item = createGroupItem(groupField);
    expect(item).toEqual({ email: '' });
    // Must be a fresh copy, not a shared reference.
    item.email = 'changed';
    expect(groupField.defaultItem).toEqual({ email: '' });
  });

  test('createGroupItem defaults to an empty object', () => {
    expect(createGroupItem({ name: 'x', type: 'group', fields: [] })).toEqual(
      {}
    );
  });

  test('canAddGroupItem respects maxItems', () => {
    expect(canAddGroupItem(groupField, [{}, {}])).toBe(true);
    expect(canAddGroupItem(groupField, [{}, {}, {}])).toBe(false);
  });

  test('canAddGroupItem allows unlimited items when maxItems is unset', () => {
    const field: FieldDescription = { name: 'x', type: 'group', fields: [] };
    expect(canAddGroupItem(field, Array(100).fill({}))).toBe(true);
  });

  test('canRemoveGroupItem respects minItems', () => {
    expect(canRemoveGroupItem(groupField, [{}])).toBe(false);
    expect(canRemoveGroupItem(groupField, [{}, {}])).toBe(true);
  });

  test('canRemoveGroupItem allows removing down to zero when minItems is unset', () => {
    const field: FieldDescription = { name: 'x', type: 'group', fields: [] };
    expect(canRemoveGroupItem(field, [{}])).toBe(true);
  });
});
