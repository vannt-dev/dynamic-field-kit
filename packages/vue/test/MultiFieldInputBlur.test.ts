import type { FieldDescription } from '@dynamic-field-kit/core';
import { fieldRegistry } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, PropType } from 'vue';
import MultiFieldInput from '../src/components/MultiFieldInput';
import '../src/layout/defaultLayouts';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

const fields: FieldDescription[] = [
  { name: 'first', type: 'text', label: 'First' },
  { name: 'second', type: 'text', label: 'Second' },
];

const TextRenderer = defineComponent({
  name: 'TextRenderer',
  props: {
    value: null,
    id: String,
    touched: Boolean,
    onBlur: Function as PropType<() => void>,
    'onUpdate:value': Function as PropType<(v: unknown) => void>,
  },
  setup(props) {
    return () =>
      h('input', {
        'data-testid': props.id,
        'data-touched': String(Boolean(props.touched)),
        value: (props.value as string) ?? '',
        onBlur: props.onBlur,
      });
  },
});

describe('MultiFieldInput blur reporting (Vue)', () => {
  beforeEach(() => {
    fieldRegistry.register('text', TextRenderer);
  });

  it('reports which field was blurred', async () => {
    const onBlurField = vi.fn();
    const wrapper = mount(MultiFieldInput, {
      props: { fieldDescriptions: fields, idPrefix: 'dfk-field', onBlurField },
    });

    await wrapper.find('[data-testid="dfk-field-second"]').trigger('blur');

    expect(onBlurField).toHaveBeenCalledWith('second');
  });

  it('reports each field separately', async () => {
    const onBlurField = vi.fn();
    const wrapper = mount(MultiFieldInput, {
      props: { fieldDescriptions: fields, idPrefix: 'dfk-field', onBlurField },
    });

    await wrapper.find('[data-testid="dfk-field-first"]').trigger('blur');
    await wrapper.find('[data-testid="dfk-field-second"]').trigger('blur');

    expect(onBlurField.mock.calls.map(([name]) => name)).toEqual([
      'first',
      'second',
    ]);
  });

  it('works without a handler', async () => {
    const wrapper = mount(MultiFieldInput, {
      props: { fieldDescriptions: fields, idPrefix: 'dfk-field' },
    });

    await expect(
      wrapper.find('[data-testid="dfk-field-first"]').trigger('blur'),
    ).resolves.not.toThrow();
  });

  it('reports the full path for a field inside a repeatable group', async () => {
    const onBlurField = vi.fn();
    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: [
          {
            name: 'contacts',
            type: 'text',
            fields: [{ name: 'email', type: 'text' }],
          },
        ],
        properties: { contacts: [{ email: '' }] },
        onBlurField,
      },
    });

    await wrapper.find('input').trigger('blur');
    expect(onBlurField).toHaveBeenCalledWith('contacts[0].email');
  });

  it('lets the owner clear touched inside a repeatable group', async () => {
    // An item with no touched keys must still count as controlled, or the
    // nested MultiFieldInput starts tracking touched itself and keeps showing
    // it after the owner clears the map.
    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: [
          {
            name: 'contacts',
            type: 'text',
            fields: [{ name: 'email', type: 'text' }],
          },
        ],
        properties: { contacts: [{ email: '' }] },
        touched: {} as Record<string, boolean>,
      },
    });

    await wrapper.find('input').trigger('blur');
    await wrapper.setProps({ touched: { 'contacts[0].email': true } });
    expect(wrapper.find('input').attributes('data-touched')).toBe('true');

    await wrapper.setProps({ touched: {} });
    expect(wrapper.find('input').attributes('data-touched')).toBe('false');
  });
});
