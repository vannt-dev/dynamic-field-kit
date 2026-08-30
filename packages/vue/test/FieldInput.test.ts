import type { FieldDescription } from '@dynamic-field-kit/core';
import { FieldRegistry } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FieldInput from '../src/components/FieldInput';
import { FieldRegistryKey } from '../src/fieldRegistryContext';
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

// Mount FieldInput with a scoped registry injected, so each test gets an
// isolated set of renderers and no global reset is needed between tests.
function mountField(
  props: Record<string, unknown>,
  renderers: Record<string, unknown>
) {
  const registry = new FieldRegistry();
  for (const [type, renderer] of Object.entries(renderers)) {
    registry.register(type as never, renderer as never);
  }
  return mount(FieldInput, {
    props,
    global: { provide: { [FieldRegistryKey]: registry } },
  });
}

describe('FieldInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render DynamicInput with correct props from fieldDescription', async () => {
    const mockRenderer = createMockRenderer();

    const fieldDesc: FieldDescription = {
      name: 'username',
      type: 'text',
      label: 'Username',
      placeholder: 'Enter name',
    };

    const wrapper = mountField(
      {
        fieldDescription: fieldDesc,
        renderInfos: { username: 'John' },
        onValueChangeField: vi.fn(),
      },
      { text: mockRenderer }
    );

    expect(wrapper.text()).toContain('Username');
    expect(wrapper.text()).toContain('John');
  });

  it('should pass options from fieldDescription', async () => {
    const mockRenderer = {
      props: ['options'],
      template: '<div>{{ options?.length }} options</div>',
    };

    const fieldDesc: FieldDescription = {
      name: 'country',
      type: 'select',
      options: [{ label: 'USA' }, { label: 'VN' }],
    };

    const wrapper = mountField(
      {
        fieldDescription: fieldDesc,
        renderInfos: {},
        onValueChangeField: vi.fn(),
      },
      { select: mockRenderer }
    );

    expect(wrapper.text()).toContain('2 options');
  });

  it('should call onValueChangeField with correct key and value', async () => {
    const mockRenderer = {
      props: ['value', 'onUpdate:value'],
      emits: ['update:value'],
      template:
        '<input :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
    };

    const onValueChangeField = vi.fn();

    const fieldDesc: FieldDescription = {
      name: 'email',
      type: 'text',
    };

    const wrapper = mountField(
      {
        fieldDescription: fieldDesc,
        renderInfos: { email: '' },
        onValueChangeField,
      },
      { text: mockRenderer }
    );

    await wrapper.find('input').setValue('test@email.com');

    expect(onValueChangeField).toHaveBeenCalledWith('test@email.com', 'email');
  });

  it('should pass className from fieldDescription', async () => {
    const mockRenderer = {
      props: ['class'],
      render(_props: any) {
        return null;
      },
    };

    const fieldDesc: FieldDescription = {
      name: 'test',
      type: 'text',
      className: 'my-custom-class',
    };

    mountField(
      {
        fieldDescription: fieldDesc,
        renderInfos: {},
        onValueChangeField: vi.fn(),
      },
      { text: mockRenderer }
    );
  });

  it('should pass description from fieldDescription', async () => {
    const mockRenderer = {
      props: ['description'],
      template: '<div>{{ description }}</div>',
    };

    const fieldDesc: FieldDescription = {
      name: 'test',
      type: 'text',
      description: 'This is a help text',
    };

    const wrapper = mountField(
      {
        fieldDescription: fieldDesc,
        renderInfos: {},
        onValueChangeField: vi.fn(),
      },
      { text: mockRenderer }
    );

    expect(wrapper.text()).toContain('This is a help text');
  });

  it('should use value from renderInfos based on field name', async () => {
    const mockRenderer = {
      props: ['value'],
      template: '<div>{{ value }}</div>',
    };

    const fieldDesc: FieldDescription = {
      name: 'fullName',
      type: 'text',
    };

    const wrapper = mountField(
      {
        fieldDescription: fieldDesc,
        renderInfos: { fullName: 'John Doe' },
        onValueChangeField: vi.fn(),
      },
      { text: mockRenderer }
    );

    expect(wrapper.text()).toContain('John Doe');
  });
});
