import type { FieldDescription } from '@dynamic-field-kit/core';
import { fieldRegistry } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FieldInput from '../src/components/FieldInput';
import '../src/layout/defaultLayouts';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    email: string;
  }
}

const createMockRenderer = () => ({
  props: ['value', 'label', 'options', 'class', 'description'],
  template: '<div>{{ label }}: {{ value }}</div>',
});

describe('FieldInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (fieldRegistry as any).registry = {};
  });

  it('should render DynamicInput with correct props from fieldDescription', async () => {
    const mockRenderer = createMockRenderer();
    (fieldRegistry as any).registry['text'] = mockRenderer;

    const fieldDesc: FieldDescription = {
      name: 'username',
      type: 'text',
      label: 'Username',
      placeholder: 'Enter name',
    };

    const wrapper = mount(FieldInput, {
      props: {
        fieldDescription: fieldDesc,
        renderInfos: { username: 'John' },
        onValueChangeField: vi.fn(),
      },
    });

    expect(wrapper.text()).toContain('Username');
    expect(wrapper.text()).toContain('John');
  });

  it('should pass options from fieldDescription', async () => {
    const mockRenderer = {
      props: ['options'],
      template: '<div>{{ options?.length }} options</div>',
    };
    (fieldRegistry as any).registry['select'] = mockRenderer;

    const fieldDesc: FieldDescription = {
      name: 'country',
      type: 'select',
      options: [{ label: 'USA' }, { label: 'VN' }],
    };

    const wrapper = mount(FieldInput, {
      props: {
        fieldDescription: fieldDesc,
        renderInfos: {},
        onValueChangeField: vi.fn(),
      },
    });

    expect(wrapper.text()).toContain('2 options');
  });

  it('should call onValueChangeField with correct key and value', async () => {
    const mockRenderer = {
      props: ['value', 'onUpdate:value'],
      emits: ['update:value'],
      template:
        '<input :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
    };
    (fieldRegistry as any).registry['text'] = mockRenderer;

    const onValueChangeField = vi.fn();

    const fieldDesc: FieldDescription = {
      name: 'email',
      type: 'text',
    };

    const wrapper = mount(FieldInput, {
      props: {
        fieldDescription: fieldDesc,
        renderInfos: { email: '' },
        onValueChangeField,
      },
    });

    await wrapper.find('input').setValue('test@email.com');

    expect(onValueChangeField).toHaveBeenCalledWith('test@email.com', 'email');
  });

  it('should pass className from fieldDescription', async () => {
    const mockRenderer = {
      props: ['class'],
      render(props: any) {
        return null;
      },
    };
    (fieldRegistry as any).registry['text'] = mockRenderer;

    const fieldDesc: FieldDescription = {
      name: 'test',
      type: 'text',
      className: 'my-custom-class',
    };

    mount(FieldInput, {
      props: {
        fieldDescription: fieldDesc,
        renderInfos: {},
        onValueChangeField: vi.fn(),
      },
    });
  });

  it('should pass description from fieldDescription', async () => {
    const mockRenderer = {
      props: ['description'],
      template: '<div>{{ description }}</div>',
    };
    (fieldRegistry as any).registry['text'] = mockRenderer;

    const fieldDesc: FieldDescription = {
      name: 'test',
      type: 'text',
      description: 'This is a help text',
    };

    const wrapper = mount(FieldInput, {
      props: {
        fieldDescription: fieldDesc,
        renderInfos: {},
        onValueChangeField: vi.fn(),
      },
    });

    expect(wrapper.text()).toContain('This is a help text');
  });

  it('should use value from renderInfos based on field name', async () => {
    const mockRenderer = {
      props: ['value'],
      template: '<div>{{ value }}</div>',
    };
    (fieldRegistry as any).registry['text'] = mockRenderer;

    const fieldDesc: FieldDescription = {
      name: 'fullName',
      type: 'text',
    };

    const wrapper = mount(FieldInput, {
      props: {
        fieldDescription: fieldDesc,
        renderInfos: { fullName: 'John Doe' },
        onValueChangeField: vi.fn(),
      },
    });

    expect(wrapper.text()).toContain('John Doe');
  });
});
