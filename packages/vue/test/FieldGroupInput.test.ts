import type { FieldDescription } from '@dynamic-field-kit/core';
import { fieldRegistry } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput';
import '../src/layout/defaultLayouts';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

const textRenderer = {
  props: ['value', 'label', 'onUpdate:value'],
  emits: ['update:value'],
  template:
    '<div><label v-if="label">{{ label }}</label><input :value="value" @input="$emit(\'update:value\', $event.target.value)" /></div>',
};

const contactsField: FieldDescription = {
  name: 'contacts',
  type: 'group' as any,
  label: 'Contacts',
  fields: [{ name: 'email', type: 'text', label: 'Email' }],
  defaultItem: { email: '' },
};

describe('FieldGroupInput (repeatable field group)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fieldRegistry as any).registry['text'] = textRenderer;
  });

  afterEach(() => {
    (fieldRegistry as any).registry = {};
  });

  it('should render one nested form per item', () => {
    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: [contactsField],
        properties: {
          contacts: [{ email: 'a@x.com' }, { email: 'b@x.com' }],
        },
      },
    });

    const inputs = wrapper.findAll('input');
    expect(inputs).toHaveLength(2);
    expect(inputs[0].element.value).toBe('a@x.com');
    expect(inputs[1].element.value).toBe('b@x.com');
  });

  it('should add a new item seeded from defaultItem', async () => {
    const onChange = vi.fn();

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: [contactsField],
        properties: { contacts: [] },
        onChange,
      },
    });

    expect(wrapper.findAll('input')).toHaveLength(0);

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Add')
      ?.trigger('click');

    expect(wrapper.findAll('input')).toHaveLength(1);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ contacts: [{ email: '' }] })
    );
  });

  it('should remove an item', async () => {
    const onChange = vi.fn();

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: [contactsField],
        properties: {
          contacts: [{ email: 'a@x.com' }, { email: 'b@x.com' }],
        },
        onChange,
      },
    });

    const removeButtons = wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Remove');
    await removeButtons[0].trigger('click');

    expect(wrapper.findAll('input')).toHaveLength(1);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ contacts: [{ email: 'b@x.com' }] })
    );
  });

  it('should update the item at the edited index when typing in a nested field', async () => {
    const onChange = vi.fn();

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: [contactsField],
        properties: { contacts: [{ email: '' }, { email: '' }] },
        onChange,
      },
    });

    await wrapper.findAll('input')[1].setValue('x');

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        contacts: [{ email: '' }, { email: 'x' }],
      })
    );
  });

  it('should respect maxItems and minItems', async () => {
    const field: FieldDescription = {
      ...contactsField,
      minItems: 1,
      maxItems: 2,
    };

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: [field],
        properties: {
          contacts: [{ email: 'a@x.com' }, { email: 'b@x.com' }],
        },
      },
    });

    const addButton = wrapper.findAll('button').find((b) => b.text() === 'Add');
    expect(addButton?.attributes('disabled')).toBeDefined();

    const removeButtons = wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Remove');
    await removeButtons[0].trigger('click');

    const remainingRemoveButtons = wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Remove');
    expect(remainingRemoveButtons[0].attributes('disabled')).toBeDefined();
  });
});
