import { FieldRegistry } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DynamicInput from '../src/components/DynamicInput';
import { FieldRegistryKey } from '../src/fieldRegistryContext';
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

// Mount DynamicInput with a scoped registry injected, so each test gets an
// isolated set of renderers and no global reset is needed between tests.
function mountWithRegistry(
  props: Record<string, unknown>,
  renderers: Record<string, unknown> = {}
) {
  const registry = new FieldRegistry();
  for (const [type, renderer] of Object.entries(renderers)) {
    registry.register(type as never, renderer as never);
  }
  return mount(DynamicInput, {
    props,
    global: { provide: { [FieldRegistryKey]: registry } },
  });
}

describe('DynamicInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render unknown field type message when renderer not found', async () => {
    const wrapper = mountWithRegistry({ type: 'unknown' });

    expect(wrapper.text()).toContain('Unknown field type: unknown');
  });

  it('should render registered renderer with props', async () => {
    const mockRenderer = {
      props: ['value', 'label'],
      template: '<div>{{ label }}: {{ value }}</div>',
    };

    const wrapper = mountWithRegistry(
      {
        type: 'text',
        value: 'hello',
        label: 'Test Label',
      },
      { text: mockRenderer }
    );

    expect(wrapper.text()).toContain('Test Label');
    expect(wrapper.text()).toContain('hello');
  });

  it('should pass value to renderer', async () => {
    const mockRenderer = createMockRenderer('value');

    const wrapper = mountWithRegistry(
      {
        type: 'text',
        value: 'test-value',
      },
      { text: mockRenderer }
    );

    expect(wrapper.find('div').text()).toBe('value');
  });

  it('should pass label to renderer', async () => {
    const mockRenderer = {
      props: ['label'],
      template: '<div>{{ label }}</div>',
    };

    const wrapper = mountWithRegistry(
      {
        type: 'text',
        label: 'My Label',
      },
      { text: mockRenderer }
    );

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

    const wrapper = mountWithRegistry(
      {
        type: 'text',
        onChange,
      },
      { text: mockRenderer }
    );

    await wrapper.find('input').setValue('new-value');

    expect(onChange).toHaveBeenCalledWith('new-value');
  });

  it('should pass options to renderer', async () => {
    const mockRenderer = {
      props: ['options'],
      template: '<div>{{ options?.length }}</div>',
    };

    const options = [
      { label: 'Option 1', value: '1' },
      { label: 'Option 2', value: '2' },
    ];

    const wrapper = mountWithRegistry(
      {
        type: 'select',
        options,
      },
      { select: mockRenderer }
    );

    expect(wrapper.text()).toContain('2');
  });

  it('should pass className to renderer', async () => {
    const mockRenderer = {
      props: ['class'],
      render(_props: any) {
        return null;
      },
    };

    mountWithRegistry(
      {
        type: 'text',
        className: 'custom-class',
      },
      { text: mockRenderer }
    );
  });

  it('should pass description to renderer', async () => {
    const mockRenderer = {
      props: ['description'],
      template: '<div>{{ description }}</div>',
    };

    const wrapper = mountWithRegistry(
      {
        type: 'text',
        description: 'Test description',
      },
      { text: mockRenderer }
    );

    expect(wrapper.text()).toContain('Test description');
  });
});
