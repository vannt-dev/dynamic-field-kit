import type { FieldDescription, Properties } from '@dynamic-field-kit/core';
import { FieldRegistry } from '@dynamic-field-kit/core';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import FieldInput from '../src/components/FieldInput';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { FieldRegistryProvider } from '../src/FieldRegistryContext';
import '../src/layout/defaultLayouts';

const phone: FieldDescription = {
  name: 'phone',
  type: 'text',
  mask: '(999) 999-9999',
};

// A form of one field, keeping what the field reports the way a host would.
const Host = ({
  field = phone,
  initial,
  stored,
}: {
  field?: FieldDescription;
  initial: Properties;
  stored: unknown[];
}) => {
  const [data, setData] = useState(initial);
  return (
    <FieldInput
      fieldDescription={field}
      renderInfos={data}
      onValueChangeField={(value, key) => {
        stored.push(value);
        setData((current) => ({ ...current, [key]: value }));
      }}
    />
  );
};

const type = (text: string) =>
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });

describe('a field with a mask', () => {
  it('shows the formatted text and stores what was typed', () => {
    const stored: unknown[] = [];
    render(<Host initial={{ phone: '' }} stored={stored} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('');

    type('5');
    expect(input.value).toBe('(5');
    type('(5551');
    expect(input.value).toBe('(555) 1');
    expect(stored).toEqual(['5', '5551']);
  });

  it('lays out a value the form already holds', () => {
    render(<Host initial={{ phone: '5551234567' }} stored={[]} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(
      '(555) 123-4567',
    );
  });

  it('takes the character before a separator that was deleted', () => {
    const stored: unknown[] = [];
    render(<Host initial={{ phone: '5551234567' }} stored={stored} />);
    type('(555 123-4567');
    expect(stored).toEqual(['551234567']);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(
      '(551) 234-567',
    );
  });

  it('does not leave on screen what the mask refused', () => {
    const fields: FieldDescription[] = [phone];
    let latest: Properties = {};
    const Form = () => {
      const [data, setData] = useState<Properties>({ phone: '' });
      latest = data;
      return (
        <MultiFieldInput
          fieldDescriptions={fields}
          properties={data}
          onChange={setData}
        />
      );
    };
    render(<Form />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    // A letter where a digit belongs: nothing is stored, nothing is shown.
    type('x');
    expect(latest).toEqual({ phone: '' });
    expect(input.value).toBe('');

    // One digit more than the pattern has places for.
    type('5551234567');
    expect(input.value).toBe('(555) 123-4567');
    type('(555) 123-45678');
    expect(latest).toEqual({ phone: '5551234567' });
    expect(input.value).toBe('(555) 123-4567');
  });

  it('does not hand parseInput on to the renderer', () => {
    const seen: Record<string, unknown>[] = [];
    const registry = new FieldRegistry();
    registry.register('text', ((props: Record<string, unknown>) => {
      seen.push(props);
      return <input readOnly value={String(props.value ?? '')} />;
    }) as never);
    render(
      <FieldRegistryProvider registry={registry as never}>
        <Host initial={{ phone: '555' }} stored={[]} />
      </FieldRegistryProvider>,
    );
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0].value).toBe('(555');
    expect('parseInput' in seen[0]).toBe(false);
  });

  it('leaves a field without a mask as it was', () => {
    const stored: unknown[] = [];
    render(
      <Host
        field={{ name: 'phone', type: 'text' }}
        initial={{ phone: '' }}
        stored={stored}
      />,
    );
    type('(555) 1');
    expect(stored).toEqual(['(555) 1']);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(
      '(555) 1',
    );
  });

  it('works for a field inside a repeatable group', () => {
    const fields: FieldDescription[] = [
      { name: 'contacts', type: 'text', fields: [phone] },
    ];
    let latest: Properties = {};
    const Form = () => {
      const [data, setData] = useState<Properties>({
        contacts: [{ phone: '' }],
      });
      latest = data;
      return (
        <MultiFieldInput
          fieldDescriptions={fields}
          properties={data}
          onChange={setData}
        />
      );
    };
    render(<Form />);
    type('5551234');
    expect(latest).toEqual({ contacts: [{ phone: '5551234' }] });
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(
      '(555) 123-4',
    );
  });
});
