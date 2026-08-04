import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import DynamicInput from '../src/components/DynamicInput';

describe('React Default Built-in Renderers', () => {
  it('renders default text input when type is "text" without custom registration', () => {
    const handleChange = vi.fn();
    render(
      <DynamicInput
        type="text"
        value="Hello Default"
        onChange={handleChange}
        id="test-text"
      />
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
      />
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
      />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('vn');

    fireEvent.change(select, { target: { value: 'us' } });
    expect(handleChange).toHaveBeenCalledWith('us');
  });

  it('renders default checkbox input when type is "checkbox"', () => {
    const handleChange = vi.fn();
    render(
      <DynamicInput type="checkbox" value={true} onChange={handleChange} />
    );

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(false);
  });
});
