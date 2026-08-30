import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import DynamicInput from '../src/components/DynamicInput';
import {
  DefaultPasswordRenderer,
  DefaultEmailRenderer,
  DefaultTextareaRenderer,
} from '../src/defaultRenderers';

describe('React Default Built-in Renderers', () => {
  it('renders default text input when type is "text" without custom registration', () => {
    const handleChange = vi.fn();
    render(
      <DynamicInput
        type="text"
        value="Hello Default"
        onChange={handleChange}
        id="test-text"
      />,
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('Hello Default');

    fireEvent.change(input, { target: { value: 'New Value' } });
    expect(handleChange).toHaveBeenCalledWith('New Value');
  });

  it('renders default number input when type is "number"', () => {
    const handleChange = vi.fn();
    render(
      <DynamicInput
        type="number"
        value={42}
        onChange={handleChange}
        id="test-number"
      />,
    );

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('42');

    fireEvent.change(input, { target: { value: '99' } });
    expect(handleChange).toHaveBeenCalledWith(99);
  });

  it('renders default select input when type is "select"', () => {
    const handleChange = vi.fn();
    const options = [
      { value: 'vn', label: 'Vietnam' },
      { value: 'us', label: 'USA' },
    ];
    render(
      <DynamicInput
        type="select"
        value="vn"
        options={options}
        onChange={handleChange}
      />,
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('vn');

    fireEvent.change(select, { target: { value: 'us' } });
    expect(handleChange).toHaveBeenCalledWith('us');
  });

  it('renders default checkbox input when type is "checkbox"', () => {
    const handleChange = vi.fn();
    render(
      <DynamicInput type="checkbox" value={true} onChange={handleChange} />,
    );

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('renders default password input when type is "password"', () => {
    const handleChange = vi.fn();
    render(
      <DynamicInput
        type="password"
        value="secret123"
        onChange={handleChange}
      />,
    );

    const input = screen.getByDisplayValue('secret123') as HTMLInputElement;
    expect(input.type).toBe('password');

    fireEvent.change(input, { target: { value: 'newpassword' } });
    expect(handleChange).toHaveBeenCalledWith('newpassword');
  });

  it('renders default email input when type is "email"', () => {
    const handleChange = vi.fn();
    render(
      <DynamicInput
        type="email"
        value="user@example.com"
        onChange={handleChange}
      />,
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.type).toBe('email');

    fireEvent.change(input, { target: { value: 'updated@example.com' } });
    expect(handleChange).toHaveBeenCalledWith('updated@example.com');
  });

  it('renders default textarea input when type is "textarea"', () => {
    const handleChange = vi.fn();
    render(
      <DynamicInput
        type="textarea"
        value="Multi line text"
        onChange={handleChange}
      />,
    );

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Multi line text');

    fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2' } });
    expect(handleChange).toHaveBeenCalledWith('Line 1\nLine 2');
  });

  it('directly renders standalone password, email, and textarea components', () => {
    const fn = vi.fn();
    render(<DefaultPasswordRenderer value="pass" onValueChange={fn} />);
    render(<DefaultEmailRenderer value="mail@test.com" onValueChange={fn} />);
    render(<DefaultTextareaRenderer value="area" onValueChange={fn} />);
    expect(screen.getByDisplayValue('pass')).toBeInTheDocument();
  });
});
