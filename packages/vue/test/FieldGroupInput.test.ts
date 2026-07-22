import type { FieldDescription } from '@dynamic-field-kit/core';
import { FieldRegistry } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { FieldRegistryKey } from '../src/fieldRegistryContext';
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
  // A fresh scoped registry per test, injected into each mount, so tests stay
  // isolated without resetting global state.
  let registry: FieldRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new FieldRegistry();
    registry.register('text', textRenderer as never);
  });

  function mountGroup(props: Record<string, unknown>) {
    return mount(MultiFieldInput, {
      props,
      global: { provide: { [FieldRegistryKey]: registry } },
    });
  }

  it('should render one nested form per item', () => {
    const wrapper = mountGroup({
      fieldDescriptions: [contactsField],
      properties: {
        contacts: [{ email: 'a@x.com' }, { email: 'b@x.com' }],
      },
    });

    const inputs = wrapper.findAll('input');
    expect(inputs).toHaveLength(2);
    expect(inputs[0].element.value).toBe('a@x.com');
    expect(inputs[1].element.value).toBe('b@x.com');
  });

  it('should add a new item seeded from defaultItem', async () => {
    const onChange = vi.fn();

    const wrapper = mountGroup({
      fieldDescriptions: [contactsField],
      properties: { contacts: [] },
      onChange,
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

    const wrapper = mountGroup({
      fieldDescriptions: [contactsField],
      properties: {
        contacts: [{ email: 'a@x.com' }, { email: 'b@x.com' }],
      },
      onChange,
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

    const wrapper = mountGroup({
      fieldDescriptions: [contactsField],
      properties: { contacts: [{ email: '' }, { email: '' }] },
      onChange,
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

    const wrapper = mountGroup({
      fieldDescriptions: [field],
      properties: {
        contacts: [{ email: 'a@x.com' }, { email: 'b@x.com' }],
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
