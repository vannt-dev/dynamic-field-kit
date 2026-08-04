import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import DynamicInput from '../src/components/DynamicInput';

describe('Vue Default Built-in Renderers', () => {
  it('renders default text input when type is "text"', async () => {
    const onChange = vi.fn();
    const wrapper = mount(DynamicInput, {
      props: {
        type: 'text',
        value: 'Hello Vue Default',
        id: 'test-text-vue',
        onChange,
      },
    });

    const input = wrapper.find('input');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('Hello Vue Default');

    await input.setValue('Updated Vue Text');
    expect(onChange).toHaveBeenCalledWith('Updated Vue Text');
  });

  it('renders default number input when type is "number"', async () => {
    const onChange = vi.fn();
    const wrapper = mount(DynamicInput, {
      props: {
        type: 'number',
        value: 123,
        onChange,
      },
    });

    const input = wrapper.find('input[type="number"]');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('123');

    await input.setValue('456');
    expect(onChange).toHaveBeenCalledWith(456);
  });

  it('renders default select input when type is "select"', async () => {
    const onChange = vi.fn();
    const options = [
      { value: 'cat', label: 'Cat' },
      { value: 'dog', label: 'Dog' },
    ];
    const wrapper = mount(DynamicInput, {
      props: {
        type: 'select',
        value: 'cat',
        options,
        onChange,
      },
    });

    const select = wrapper.find('select');
    expect(select.exists()).toBe(true);
    expect((select.element as HTMLSelectElement).value).toBe('cat');
  });
});
