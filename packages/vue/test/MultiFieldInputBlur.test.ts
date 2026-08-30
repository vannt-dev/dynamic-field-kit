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
    onBlur: Function as PropType<() => void>,
    'onUpdate:value': Function as PropType<(v: unknown) => void>,
  },
  setup(props) {
    return () =>
      h('input', {
        'data-testid': props.id,
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
      props: { fieldDescriptions: fields, onBlurField },
    });

    await wrapper.find('[data-testid="dfk-field-second"]').trigger('blur');

    expect(onBlurField).toHaveBeenCalledWith('second');
  });

  it('reports each field separately', async () => {
    const onBlurField = vi.fn();
    const wrapper = mount(MultiFieldInput, {
      props: { fieldDescriptions: fields, onBlurField },
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
      props: { fieldDescriptions: fields },
    });

    await expect(
      wrapper.find('[data-testid="dfk-field-first"]').trigger('blur'),
    ).resolves.not.toThrow();
  });
});
