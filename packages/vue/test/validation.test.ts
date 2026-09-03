import type { FieldDescription } from '@dynamic-field-kit/core';
import { FieldRegistry } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { FieldRegistryKey } from '../src/fieldRegistryContext';
import '../src/layout/defaultLayouts';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

// A scoped registry with a text renderer, so each test is isolated from the
// global singleton and from every other test.
function registryWithText() {
  const registry = new FieldRegistry();
  registry.register('text', {
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
                ([] as string[]).concat(props.error).join(','),
              )
            : null,
        ]);
    },
  } as never);
  return registry;
}

function mountForm(props: Record<string, unknown>) {
  return mount(MultiFieldInput, {
    props,
    global: { provide: { [FieldRegistryKey]: registryWithText() } },
  });
}

describe('Vue validation wiring', () => {
  it('surfaces validate() errors to the renderer', () => {
    const fields: FieldDescription[] = [
      {
        name: 'email',
        type: 'text',
        validate: (v) => (String(v).includes('@') ? undefined : 'Invalid'),
      },
    ];
    const wrapper = mountForm({
      fieldDescriptions: fields,
      properties: { email: 'x' },
    });
    expect(wrapper.find('.error').text()).toBe('Invalid');
  });

  it('does not surface an error for a disabled field', () => {
    const fields: FieldDescription[] = [
      {
        name: 'email',
        type: 'text',
        disabled: true,
        validate: () => 'Invalid',
      },
    ];
    const wrapper = mountForm({
      fieldDescriptions: fields,
      properties: { email: '' },
    });
    expect(wrapper.find('.error').exists()).toBe(false);
  });

  it('emits onValidityChange with the recursive result', () => {
    const onValidityChange = vi.fn();
    const fields: FieldDescription[] = [
      {
        name: 'name',
        type: 'text',
        validate: (v) => (v ? undefined : 'Required'),
      },
    ];
    mountForm({
      fieldDescriptions: fields,
      properties: { name: '' },
      onValidityChange,
    });
    expect(onValidityChange).toHaveBeenLastCalledWith({
      valid: false,
      errors: { name: ['Required'] },
      complete: true,
      status: 'invalid',
    });
  });
});
