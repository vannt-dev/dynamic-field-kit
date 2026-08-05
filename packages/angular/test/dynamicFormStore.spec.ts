import { FieldDescription } from '@dynamic-field-kit/core';
import { describe, expect, it } from 'vitest';
import { createDynamicFormStore } from '../src/lib/dynamic-form.store';

describe('Angular Signal DynamicFormStore', () => {
  it('initializes signal data and handles changes', () => {
    const fields: FieldDescription[] = [
      { name: 'username', type: 'text', required: true },
    ];

    const store = createDynamicFormStore({
      fields,
      initialValues: { username: 'john_doe' },
    });

    expect(store.data().username).toBe('john_doe');
    expect(store.isDirty()).toBe(false);

    store.setFieldValue('username', 'jane_doe');
    expect(store.data().username).toBe('jane_doe');
    expect(store.isDirty()).toBe(true);

    store.reset();
    expect(store.data().username).toBe('john_doe');
    expect(store.isDirty()).toBe(false);
  });
});
