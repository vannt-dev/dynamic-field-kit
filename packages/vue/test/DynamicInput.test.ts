import { fieldRegistry } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DynamicInput from '../src/components/DynamicInput';
import '../src/layout/defaultLayouts';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    number: number;
    select: string;
  }
}

const createMockRenderer = (returnValue: string) => {
  return {
    props: ['value', 'label', 'onChange', 'options', 'class', 'description'],
    template: `<div>${returnValue}</div>`,
  };
};

describe('DynamicInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (fieldRegistry as any).registry = {};
  });

  it('should render unknown field type message when renderer not found', async () => {
    const wrapper = mount(DynamicInput, {
      props: {
        type: 'unknown',
      },
    });

    expect(wrapper.text()).toContain('Unknown field type: unknown');
  });

  it('should render registered renderer with props', async () => {
    const mockRenderer = {
      props: ['value', 'label'],
      template: '<div>{{ label }}: {{ value }}</div>',
    };
    (fieldRegistry as any).registry['text'] = mockRenderer;

    const wrapper = mount(DynamicInput, {
      props: {
        type: 'text',
        value: 'hello',
        label: 'Test Label',
      },
    });

    expect(wrapper.text()).toContain('Test Label');
    expect(wrapper.text()).toContain('hello');
  });

  it('should pass value to renderer', async () => {
    const mockRenderer = createMockRenderer('value');
    (fieldRegistry as any).registry['text'] = mockRenderer;

    const wrapper = mount(DynamicInput, {
      props: {
        type: 'text',
        value: 'test-value',
      },
    });

    expect(wrapper.find('div').text()).toBe('value');
  });

  it('should pass label to renderer', async () => {
    const mockRenderer = {
      props: ['label'],
      template: '<div>{{ label }}</div>',
    };
    (fieldRegistry as any).registry['text'] = mockRenderer;

    const wrapper = mount(DynamicInput, {
      props: {
        type: 'text',
        label: 'My Label',
      },
    });

    expect(wrapper.text()).toContain('My Label');
  });

  it('should call onChange when renderer triggers update', async () => {
    const onChange = vi.fn();
    const mockRenderer = {
      props: ['value', 'onUpdate:value'],
      emits: ['update:value'],
      template:
        '<input :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
    };
    (fieldRegistry as any).registry['text'] = mockRenderer;

    const wrapper = mount(DynamicInput, {
      props: {
        type: 'text',
        onChange,
      },
    });

    await wrapper.find('input').setValue('new-value');

    expect(onChange).toHaveBeenCalledWith('new-value');
  });

  it('should pass options to renderer', async () => {
    const mockRenderer = {
      props: ['options'],
      template: '<div>{{ options?.length }}</div>',
    };
    (fieldRegistry as any).registry['select'] = mockRenderer;

    const options = [
      { label: 'Option 1', value: '1' },
      { label: 'Option 2', value: '2' },
    ];

    const wrapper = mount(DynamicInput, {
      props: {
        type: 'select',
        options,
      },
    });

    expect(wrapper.text()).toContain('2');
  });

  it('should pass className to renderer', async () => {
    const mockRenderer = {
      props: ['class'],
      render(props: any) {
        return null;
      },
    };
    (fieldRegistry as any).registry['text'] = mockRenderer;

    mount(DynamicInput, {
      props: {
        type: 'text',
        className: 'custom-class',
      },
    });
  });

  it('should pass description to renderer', async () => {
    const mockRenderer = {
      props: ['description'],
      template: '<div>{{ description }}</div>',
    };
    (fieldRegistry as any).registry['text'] = mockRenderer;

    const wrapper = mount(DynamicInput, {
      props: {
        type: 'text',
        description: 'Test description',
      },
    });

    expect(wrapper.text()).toContain('Test description');
  });
});
