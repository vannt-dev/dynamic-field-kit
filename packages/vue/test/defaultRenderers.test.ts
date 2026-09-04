import { makeErrorId } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import DynamicInput from '../src/components/DynamicInput';
import {
  DefaultPasswordRenderer,
  DefaultEmailRenderer,
  DefaultTextareaRenderer,
} from '../src/defaultRenderers';

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

  it('renders default password input when type is "password"', async () => {
    const onChange = vi.fn();
    const wrapper = mount(DynamicInput, {
      props: {
        type: 'password',
        value: 'secretpass',
        onChange,
      },
    });

    const input = wrapper.find('input[type="password"]');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('secretpass');
  });

  it('renders default email input when type is "email"', async () => {
    const onChange = vi.fn();
    const wrapper = mount(DynamicInput, {
      props: {
        type: 'email',
        value: 'test@vue.com',
        onChange,
      },
    });

    const input = wrapper.find('input[type="email"]');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('test@vue.com');
  });

  it('renders default textarea input when type is "textarea"', async () => {
    const onChange = vi.fn();
    const wrapper = mount(DynamicInput, {
      props: {
        type: 'textarea',
        value: 'Multi line content',
        onChange,
      },
    });

    const textarea = wrapper.find('textarea');
    expect(textarea.exists()).toBe(true);
    expect((textarea.element as HTMLTextAreaElement).value).toBe(
      'Multi line content',
    );

    await textarea.setValue('Line A\nLine B');
    expect(onChange).toHaveBeenCalledWith('Line A\nLine B');
  });

  it('renders default checkbox input when type is "checkbox"', async () => {
    const onChange = vi.fn();
    const wrapper = mount(DynamicInput, {
      props: {
        type: 'checkbox',
        value: true,
        onChange,
      },
    });

    const checkbox = wrapper.find('input[type="checkbox"]');
    expect(checkbox.exists()).toBe(true);
    expect((checkbox.element as HTMLInputElement).checked).toBe(true);
  });

  it('mounts standalone password, email, and textarea renderers', () => {
    const pass = mount(DefaultPasswordRenderer, { props: { value: 'pass' } });
    const mail = mount(DefaultEmailRenderer, {
      props: { value: 'm@test.com' },
    });
    const area = mount(DefaultTextareaRenderer, { props: { value: 'area' } });
    expect(pass.exists()).toBe(true);
    expect(mail.exists()).toBe(true);
    expect(area.exists()).toBe(true);
  });
});

describe('default renderer error node', () => {
  it('renders the message with the id ariaDescribedBy points at', () => {
    const wrapper = mount(DynamicInput, {
      props: {
        type: 'text',
        id: 'f-title',
        value: '',
        error: ['Title is required'],
        ariaInvalid: true,
        ariaDescribedBy: makeErrorId('f-title'),
      },
    });

    const node = wrapper.find('#f-title-error');
    expect(node.exists()).toBe(true);
    expect(node.text()).toContain('Title is required');
  });

  it('renders nothing extra when the field is valid', () => {
    const wrapper = mount(DynamicInput, {
      props: { type: 'text', id: 'f-ok', value: 'x' },
    });
    expect(wrapper.find('#f-ok-error').exists()).toBe(false);
  });
});

describe('default renderer error node accepts a bare string', () => {
  it('renders the whole string, not its first character', () => {
    const wrapper = mount(DynamicInput, {
      props: {
        type: 'text',
        id: 'f-str',
        value: '',
        error: 'Title is required',
      },
    });

    expect(wrapper.find('#f-str-error').text()).toBe('Title is required');
  });
});
