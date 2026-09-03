import { describe, expect, test } from 'vitest';
import {
  canAddGroupItem,
  canRemoveGroupItem,
  collectFieldPaths,
  createGroupItem,
  isFieldGroup,
} from '../src';
import type { FieldDescription } from '../src';

declare module '../src' {
  interface FieldTypeMap {
    group: unknown;
  }
}

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
      {},
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

  test('collectFieldPaths expands nested repeatable group leaf paths', () => {
    expect(
      collectFieldPaths([groupField, { name: 'title', type: 'text' }], {
        contacts: [{ email: 'a' }, { email: 'b' }],
        title: 'Team',
      }),
    ).toEqual(['contacts[0].email', 'contacts[1].email', 'title']);
  });

  test('collectFieldPaths skips disabled fields, like validation does', () => {
    const fields: FieldDescription[] = [
      { name: 'title', type: 'text' },
      { name: 'locked', type: 'text', disabled: true },
      {
        name: 'derived',
        type: 'text',
        disabledCondition: (data) => data.title === 'Team',
      },
    ];
    expect(collectFieldPaths(fields, { title: 'Team' })).toEqual(['title']);
  });

  test('collectFieldPaths skips fields disabled inside a group item', () => {
    const group: FieldDescription = {
      name: 'contacts',
      type: 'group',
      fields: [
        { name: 'email', type: 'text' },
        {
          name: 'code',
          type: 'text',
          disabledCondition: (data) => data.email === 'a',
        },
      ],
    };
    expect(
      collectFieldPaths([group], {
        contacts: [{ email: 'a' }, { email: 'b' }],
      }),
    ).toEqual(['contacts[0].email', 'contacts[1].email', 'contacts[1].code']);
  });
});
