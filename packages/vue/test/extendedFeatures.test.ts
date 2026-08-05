import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import {
  FieldInput,
  useDynamicForm,
  DynamicFormDevTools,
  FieldDescription,
} from '../src';

describe('Vue Extended Features', () => {
  it('useDynamicForm composable works properly', () => {
    const fields: FieldDescription[] = [
      { name: 'name', type: 'text', required: true },
    ];

    const { data, setFieldValue, reset } = useDynamicForm({
      fields,
      initialValues: { name: 'Alice' },
    });

    expect(data.value.name).toBe('Alice');

    setFieldValue('name', 'Bob');
    expect(data.value.name).toBe('Bob');

    reset();
    expect(data.value.name).toBe('Alice');
  });

  it('renders radio renderer in Vue', async () => {
    const field: FieldDescription = {
      name: 'plan',
      type: 'radio',
      label: 'Plan',
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Pro', value: 'pro' },
      ],
    };

    const wrapper = mount(FieldInput, {
      props: {
        fieldDescription: field,
        renderInfos: { plan: 'free' },
        onValueChangeField: vi.fn(),
      },
    });

    expect(wrapper.find('.dfk-radio-group').exists()).toBe(true);
  });

  it('renders DevTools button in Vue', async () => {
    const wrapper = mount(DynamicFormDevTools, {
      props: {
        data: { name: 'Alice' },
        isDirty: false,
      },
    });

    expect(wrapper.text()).toContain('🔍 DevTools');
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).toContain('🛠️ Form DevTools');
  });
});
