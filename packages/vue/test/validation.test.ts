import type { FieldDescription } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { fieldRegistry } from '../src';
import '../src/layout/defaultLayouts';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

afterEach(() => {
  (fieldRegistry as any).registry = {};
});

function registerTextRenderer() {
  (fieldRegistry as any).registry['text'] = {
    props: ['value', 'error', 'disabled', 'readOnly'],
    emits: ['update:value'],
    setup(props: any) {
      return () =>
        h('div', [
          h('input', {
            'data-testid': 'input',
            disabled: !!props.disabled,
            value: props.value ?? '',
          }),
          props.error
            ? h(
                'span',
                { class: 'error' },
                ([] as string[]).concat(props.error).join(',')
              )
            : null,
        ]);
    },
  };
}

describe('Vue validation wiring', () => {
  it('surfaces validate() errors to the renderer', () => {
    registerTextRenderer();
    const fields: FieldDescription[] = [
      {
        name: 'email',
        type: 'text',
        validate: (v) => (String(v).includes('@') ? undefined : 'Invalid'),
      },
    ];
    const wrapper = mount(MultiFieldInput, {
      props: { fieldDescriptions: fields, properties: { email: 'x' } },
    });
    expect(wrapper.find('.error').text()).toBe('Invalid');
  });

  it('does not surface an error for a disabled field', () => {
    registerTextRenderer();
    const fields: FieldDescription[] = [
      {
        name: 'email',
        type: 'text',
        disabled: true,
        validate: () => 'Invalid',
      },
    ];
    const wrapper = mount(MultiFieldInput, {
      props: { fieldDescriptions: fields, properties: { email: '' } },
    });
    expect(wrapper.find('.error').exists()).toBe(false);
  });

  it('emits onValidityChange with the recursive result', () => {
    registerTextRenderer();
    const onValidityChange = vi.fn();
    const fields: FieldDescription[] = [
      {
        name: 'name',
        type: 'text',
        validate: (v) => (v ? undefined : 'Required'),
      },
    ];
    mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        properties: { name: '' },
        onValidityChange,
      },
    });
    expect(onValidityChange).toHaveBeenLastCalledWith({
      valid: false,
      errors: { name: ['Required'] },
    });
  });
});
