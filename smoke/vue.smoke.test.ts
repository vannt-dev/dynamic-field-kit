import {
  DynamicInput,
  FieldRegistry,
  FieldRegistryKey,
} from '@dynamic-field-kit/vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

const TextRenderer = {
  props: ['value'],
  template: '<div data-testid="smoke">{{ value }}</div>',
};

describe('vue built package renders', () => {
  it('mounts a DynamicInput from the built dist and renders its value', () => {
    const registry = new FieldRegistry();
    registry.register('text', TextRenderer as never);

    const wrapper = mount(DynamicInput, {
      props: { type: 'text', value: 'hi' },
      global: { provide: { [FieldRegistryKey]: registry } },
    });

    expect(wrapper.get('[data-testid="smoke"]').text()).toBe('hi');
  });
});
