import type { FieldDescription } from '@dynamic-field-kit/core';
import { fieldRegistry } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput';
import '../src/layout/defaultLayouts';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    email: string;
  }
}

const createTextRenderer = () => ({
  props: ['value', 'label'],
  template:
    '<div><label v-if="label">{{ label }}</label><input :value="value" /></div>',
});

describe('MultiFieldInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fieldRegistry as any).registry['text'] = createTextRenderer();
  });

  afterEach(() => {
    (fieldRegistry as any).registry = {};
  });

  it('should render all fields from fieldDescriptions', async () => {
    const fields: FieldDescription[] = [
      { name: 'firstName', type: 'text', label: 'First Name' },
      { name: 'lastName', type: 'text', label: 'Last Name' },
    ];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
      },
    });

    expect(wrapper.text()).toContain('First Name');
    expect(wrapper.text()).toContain('Last Name');
  });

  it('should initialize with provided properties', async () => {
    const fields: FieldDescription[] = [
      { name: 'name', type: 'text', label: 'Name' },
    ];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        properties: { name: 'John Doe' },
      },
    });

    expect(wrapper.find('input').element.value).toBe('John Doe');
  });

  it('should call onChange when field value changes', async () => {
    const onChange = vi.fn();

    const textRenderer = {
      props: ['value', 'onUpdate:value'],
      emits: ['update:value'],
      template:
        '<input :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
    };
    (fieldRegistry as any).registry['text'] = textRenderer;

    const fields: FieldDescription[] = [{ name: 'name', type: 'text' }];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        onChange,
      },
    });

    await wrapper.find('input').setValue('Jane');

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Jane' })
    );
  });

  it('should filter fields based on appearCondition', async () => {
    const fields: FieldDescription[] = [
      { name: 'firstName', type: 'text', label: 'First Name' },
      {
        name: 'lastName',
        type: 'text',
        label: 'Last Name',
        appearCondition: (data) => data.firstName === 'John',
      },
    ];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        properties: { firstName: 'John' },
      },
    });

    expect(wrapper.text()).toContain('First Name');
    expect(wrapper.text()).toContain('Last Name');

    await wrapper.setProps({ properties: { firstName: 'Jane' } });

    expect(wrapper.text()).toContain('First Name');
    expect(wrapper.text()).not.toContain('Last Name');
  });

  it('should render with default column layout', async () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
      },
    });

    const container = wrapper.find('div');
    expect(container.exists()).toBe(true);
    const style = container.attributes('style');
    expect(style).toContain('flex-direction');
  });

  it('should throw error for unknown layout', async () => {
    const fields: FieldDescription[] = [{ name: 'field1', type: 'text' }];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        layout: { type: 'unknown-layout' } as any,
      },
    });

    expect(wrapper.text()).toContain('Unknown layout: unknown-layout');
  });

  it('should update data state when properties prop changes', async () => {
    const fields: FieldDescription[] = [{ name: 'name', type: 'text' }];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        properties: { name: 'Initial' },
      },
    });

    expect(wrapper.find('input').element.value).toBe('Initial');

    await wrapper.setProps({ properties: { name: 'Updated' } });

    expect(wrapper.find('input').element.value).toBe('Updated');
  });

  it('should use row layout', async () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        layout: 'row',
      },
    });

    const container = wrapper.find('div');
    const style = container.attributes('style');
    expect(style).toContain('flex-direction: row');
  });

  it('should use grid layout', async () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        layout: 'grid',
      },
    });

    const container = wrapper.find('div');
    const style = container.attributes('style');
    expect(style).toContain('display: grid');
  });

  it('should use grid layout with custom columns', async () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
      { name: 'field3', type: 'text' },
    ];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        layout: { type: 'grid', columns: 3 },
      },
    });

    const container = wrapper.find('div');
    const style = container.attributes('style');
    expect(style).toContain('repeat(3, 1fr)');
  });
});
