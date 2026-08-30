import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  DynamicInput,
  useDynamicForm,
  DynamicFormDevTools,
  FieldDescription,
} from '../src';

describe('React Extended Features', () => {
  it('renders radio renderer and updates value', () => {
    const options = [
      { label: 'Male', value: 'male' },
      { label: 'Female', value: 'female' },
    ];

    const handleChange = vi.fn();
    render(
      <DynamicInput
        id="gender"
        type="radio"
        value="male"
        options={options}
        onChange={handleChange}
      />,
    );

    const femaleRadio = screen.getByLabelText('Female');
    expect(femaleRadio).not.toBeChecked();

    fireEvent.click(femaleRadio);
    expect(handleChange).toHaveBeenCalledWith('female');
  });

  it('renders range slider', () => {
    const handleChange = vi.fn();
    render(
      <DynamicInput
        type="range"
        value={50}
        extraProps={{ min: 0, max: 100 }}
        onChange={handleChange}
      />,
    );

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
  });

  it('useDynamicForm hook initializes and handles submission', async () => {
    const fields: FieldDescription[] = [
      { name: 'name', type: 'text', required: true },
    ];

    function TestComponent() {
      const { data, setFieldValue, reset } = useDynamicForm({
        fields,
        initialValues: { name: 'Alice' },
      });

      return (
        <div>
          <span data-testid="name-val">{String(data.name)}</span>
          <button type="button" onClick={() => setFieldValue('name', 'Bob')}>
            Change Name
          </button>
          <button type="button" onClick={() => reset()}>
            Reset Form
          </button>
        </div>
      );
    }

    render(<TestComponent />);
    expect(screen.getByTestId('name-val').textContent).toBe('Alice');

    fireEvent.click(screen.getByText('Change Name'));
    expect(screen.getByTestId('name-val').textContent).toBe('Bob');

    fireEvent.click(screen.getByText('Reset Form'));
    expect(screen.getByTestId('name-val').textContent).toBe('Alice');
  });

  it('renders DevTools button and opens overlay', () => {
    render(
      <DynamicFormDevTools
        data={{ email: 'test@example.com' }}
        isDirty={true}
      />,
    );

    const devToolsBtn = screen.getByText('🔍 DevTools');
    expect(devToolsBtn).toBeInTheDocument();

    fireEvent.click(devToolsBtn);
    expect(screen.getByText('🛠️ Form DevTools')).toBeInTheDocument();
  });
});
