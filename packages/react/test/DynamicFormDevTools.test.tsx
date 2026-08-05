import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import type { FieldDescription } from '../src';
import { DynamicFormDevTools } from '../src';

function open() {
  fireEvent.click(screen.getByText('🔍 DevTools'));
}

describe('DynamicFormDevTools', () => {
  it('renders collapsed with no error badge when there are no errors', () => {
    render(<DynamicFormDevTools data={{}} />);

    expect(screen.getByText('🔍 DevTools')).toBeInTheDocument();
    expect(screen.queryByText('🛠️ Form DevTools')).not.toBeInTheDocument();
  });

  it('shows the error count on the collapsed badge', () => {
    render(
      <DynamicFormDevTools
        data={{}}
        errors={{ name: ['required'], email: ['invalid'] }}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows form data on the data tab', () => {
    render(<DynamicFormDevTools data={{ email: 'a@b.com' }} />);
    open();

    expect(screen.getByText(/a@b\.com/)).toBeInTheDocument();
  });

  it('lists errors on the errors tab', () => {
    render(
      <DynamicFormDevTools
        data={{}}
        errors={{ email: ['Invalid email', 'Too short'] }}
      />
    );
    open();
    fireEvent.click(screen.getByRole('button', { name: /errors/i }));

    expect(screen.getByText('email:')).toBeInTheDocument();
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.getByText('Too short')).toBeInTheDocument();
  });

  it('reports a clean form on the errors tab', () => {
    render(<DynamicFormDevTools data={{}} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /errors/i }));

    expect(screen.getByText('✓ No validation errors')).toBeInTheDocument();
  });

  it('shows dirty and touched state on the meta tab', () => {
    render(<DynamicFormDevTools data={{}} isDirty touched={{ email: true }} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /meta/i }));

    expect(screen.getByText('isDirty:')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
    expect(screen.getByText(/"email": true/)).toBeInTheDocument();
  });

  it('lists field descriptions on the fields tab', () => {
    const fields: FieldDescription[] = [
      { name: 'email', type: 'text', required: true },
    ];
    render(<DynamicFormDevTools data={{}} fields={fields} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /fields/i }));

    expect(screen.getByText('email')).toBeInTheDocument();
    expect(
      screen.getByText(/type: text \| required: true/)
    ).toBeInTheDocument();
  });

  it('explains when no field descriptions were passed', () => {
    render(<DynamicFormDevTools data={{}} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /fields/i }));

    expect(
      screen.getByText('No field descriptions passed')
    ).toBeInTheDocument();
  });

  it('shows the error count in the errors tab label', () => {
    render(<DynamicFormDevTools data={{}} errors={{ name: ['required'] }} />);
    open();

    expect(
      screen.getByRole('button', { name: /errors \(1\)/i })
    ).toBeInTheDocument();
  });

  it('closes the overlay again', () => {
    render(<DynamicFormDevTools data={{}} />);
    open();

    fireEvent.click(screen.getByText('✕'));

    expect(screen.queryByText('🛠️ Form DevTools')).not.toBeInTheDocument();
    expect(screen.getByText('🔍 DevTools')).toBeInTheDocument();
  });

  it('anchors to the bottom left when asked', () => {
    const { container } = render(
      <DynamicFormDevTools data={{}} position="bottom-left" />
    );

    expect(container.querySelector('button')).toHaveStyle({ left: '16px' });
  });
});
