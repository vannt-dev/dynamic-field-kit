import type { FieldDescription } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DynamicInput, MultiFieldInput, fieldRegistry } from '../src';
import '../src/layout/defaultLayouts';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    email: string;
    checkbox: boolean;
    select: string;
    country: string;
    city: string;
  }
}

describe('Integration: Form with multiple fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fieldRegistry as any).registry['text'] = {
      props: ['value', 'label', 'onUpdate:value'],
      emits: ['update:value'],
      template: `
        <div>
          <label>{{ label }}</label>
          <input :value="value" @input="$emit('update:value', $event.target.value)" />
        </div>
      `,
    };
    (fieldRegistry as any).registry['checkbox'] = {
      props: ['value', 'label', 'onUpdate:value'],
      emits: ['update:value'],
      template: `
        <div>
          <input type="checkbox" :checked="value" @change="$emit('update:value', $event.target.checked)" />
          <span>{{ label }}</span>
        </div>
      `,
    };
    (fieldRegistry as any).registry['select'] = {
      props: ['value', 'label', 'options', 'onUpdate:value'],
      emits: ['update:value'],
      template: `
        <div>
          <label>{{ label }}</label>
          <select :value="value" @change="$emit('update:value', $event.target.value)">
            <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      `,
    };
  });

  afterEach(() => {
    (fieldRegistry as any).registry = {};
  });

  it('should render a complete form with multiple field types', async () => {
    const fields: FieldDescription[] = [
      {
        name: 'name',
        type: 'text',
        label: 'Full Name',
        placeholder: 'Enter name',
      },
      {
        name: 'email',
        type: 'text',
        label: 'Email',
        placeholder: 'Enter email',
      },
      { name: 'agreed', type: 'checkbox', label: 'I agree to terms' },
    ];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
      },
    });

    expect(wrapper.text()).toContain('Full Name');
    expect(wrapper.text()).toContain('Email');
    expect(wrapper.text()).toContain('I agree to terms');
  });

  it('should handle form submission with all field values', async () => {
    const onChange = vi.fn();
    const fields: FieldDescription[] = [
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text' },
    ];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        onChange,
      },
    });

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('John');
    await inputs[1].setValue('john@example.com');

    expect(onChange).toHaveBeenLastCalledWith({
      name: 'John',
      email: 'john@example.com',
    });
  });

  it('should conditionally show fields based on other field values', async () => {
    const fields: FieldDescription[] = [
      { name: 'accountType', type: 'select', label: 'Account Type' },
      {
        name: 'companyName',
        type: 'text',
        label: 'Company Name',
        appearCondition: (data) => data.accountType === 'business',
      },
    ];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        properties: { accountType: 'personal' },
      },
    });

    expect(wrapper.text()).not.toContain('Company Name');

    await wrapper.setProps({ properties: { accountType: 'business' } });

    expect(wrapper.text()).toContain('Company Name');
  });

  it('should update multiple fields and maintain state', async () => {
    const onChange = vi.fn();
    const fields: FieldDescription[] = [
      { name: 'firstName', type: 'text' },
      { name: 'lastName', type: 'text' },
    ];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        onChange,
      },
    });

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('John');
    await inputs[1].setValue('Doe');

    expect(onChange).toHaveBeenLastCalledWith({
      firstName: 'John',
      lastName: 'Doe',
    });
  });
});

describe('Integration: Layout variations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fieldRegistry as any).registry['text'] = {
      props: ['value'],
      template: '<input :value="value" />',
    };
  });

  afterEach(() => {
    (fieldRegistry as any).registry = {};
  });

  it('should render fields in row layout', async () => {
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

  it('should render fields in grid layout', async () => {
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

  it('should render fields in default column layout when no layout specified', async () => {
    const fields: FieldDescription[] = [{ name: 'field1', type: 'text' }];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
      },
    });

    const container = wrapper.find('div');
    const style = container.attributes('style');
    expect(style).toContain('flex-direction');
  });
});

describe('Integration: DynamicInput with real-world scenarios', () => {
  afterEach(() => {
    (fieldRegistry as any).registry = {};
  });

  it('should handle email validation flow', async () => {
    (fieldRegistry as any).registry['email'] = {
      props: ['value', 'onUpdate:value'],
      emits: ['update:value'],
      data() {
        return { error: '' };
      },
      methods: {
        validate(email: string) {
          if (!email.includes('@')) {
            this.error = 'Invalid email';
            return;
          }
          this.error = '';
          this.$emit('update:value', email);
        },
      },
      template: `
        <div>
          <input :value="value" @input="validate($event.target.value)" />
          <span v-if="error">{{ error }}</span>
        </div>
      `,
    };

    const wrapper = mount(DynamicInput, {
      props: {
        type: 'email',
      },
    });

    await wrapper.find('input').setValue('invalid-email');
    expect(wrapper.text()).toContain('Invalid email');
  });

  it('should handle dependent dropdowns', async () => {
    (fieldRegistry as any).registry['country'] = {
      props: ['value', 'onUpdate:value', 'options'],
      emits: ['update:value'],
      template: `
        <select :value="value" @change="$emit('update:value', $event.target.value)">
          <option value="">Select country</option>
          <option value="us">United States</option>
          <option value="vn">Vietnam</option>
        </select>
      `,
    };

    (fieldRegistry as any).registry['city'] = {
      props: ['value', 'onUpdate:value', 'options'],
      emits: ['update:value'],
      template: `
        <select :value="value" @change="$emit('update:value', $event.target.value)">
          <option value="">Select city</option>
          <option value="ny">New York</option>
          <option value="la">Los Angeles</option>
          <option value="hn">Hanoi</option>
          <option value="hcm">Ho Chi Minh</option>
        </select>
      `,
    };

    const fields: FieldDescription[] = [
      { name: 'country', type: 'country' },
      {
        name: 'city',
        type: 'city',
        appearCondition: (data) => !!data.country,
      },
    ];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
      },
    });

    expect(wrapper.findAll('select')).toHaveLength(1);

    await wrapper.findAll('select')[0].setValue('vn');

    expect(wrapper.findAll('select')).toHaveLength(2);
  });
});
