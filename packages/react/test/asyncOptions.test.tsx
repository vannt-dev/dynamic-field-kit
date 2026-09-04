import type {
  FieldDescription,
  FieldRendererProps,
  Properties,
} from '@dynamic-field-kit/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { fieldRegistry } from '../src/fieldRegistry';
import '../src/layout/defaultLayouts';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    optionProbe: string;
    text: string;
  }
}

// Renders the option state as text so a test can assert on it without any
// knowledge of how the adapter stores it.
const OptionProbe = ({
  id,
  options,
  optionsStatus,
  optionsError,
  onOptionsQuery,
}: FieldRendererProps) => (
  <div>
    <span data-testid={`${id}-status`}>{optionsStatus ?? 'none'}</span>
    <span data-testid={`${id}-options`}>
      {(options ?? []).map((o) => String(o.value)).join(',')}
    </span>
    <span data-testid={`${id}-error`}>
      {optionsError ? String((optionsError as Error).message) : ''}
    </span>
    <button
      data-testid={`${id}-search`}
      onClick={() => onOptionsQuery?.('ada')}
    >
      search
    </button>
  </div>
);

describe('async field options', () => {
  beforeEach(() => {
    fieldRegistry.register('optionProbe', OptionProbe);
  });

  it('goes loading then ready and shows the resolved options', async () => {
    const fields: FieldDescription[] = [
      {
        name: 'city',
        type: 'optionProbe',
        options: async () => [{ value: 'hn' }, { value: 'sg' }],
      },
    ];

    render(<MultiFieldInput fieldDescriptions={fields} idPrefix="a" />);

    await waitFor(() =>
      expect(screen.getByTestId('a-city-status')).toHaveTextContent('ready'),
    );
    expect(screen.getByTestId('a-city-options')).toHaveTextContent('hn,sg');
  });

  it('passes the renderer query through to the loader', async () => {
    const load = vi.fn(async (_d: Properties, _r, ctx) => [
      { value: ctx?.query ?? 'none' },
    ]);
    const fields: FieldDescription[] = [
      {
        name: 'user',
        type: 'optionProbe',
        optionsMode: 'async',
        options: load,
      },
    ];

    render(<MultiFieldInput fieldDescriptions={fields} idPrefix="b" />);
    await waitFor(() =>
      expect(screen.getByTestId('b-user-status')).toHaveTextContent('ready'),
    );

    screen.getByTestId('b-user-search').click();

    await waitFor(() =>
      expect(screen.getByTestId('b-user-options')).toHaveTextContent('ada'),
    );
  });

  it('reports a failed load', async () => {
    const fields: FieldDescription[] = [
      {
        name: 'city',
        type: 'optionProbe',
        options: async () => {
          throw new Error('network down');
        },
      },
    ];

    render(<MultiFieldInput fieldDescriptions={fields} idPrefix="c" />);

    await waitFor(() =>
      expect(screen.getByTestId('c-city-status')).toHaveTextContent('error'),
    );
    expect(screen.getByTestId('c-city-error')).toHaveTextContent(
      'network down',
    );
  });

  it('leaves a synchronous field with no options status at all', () => {
    const fields: FieldDescription[] = [
      {
        name: 'city',
        type: 'optionProbe',
        options: [{ value: 'hn' }],
      },
    ];

    render(<MultiFieldInput fieldDescriptions={fields} idPrefix="d" />);

    expect(screen.getByTestId('d-city-status')).toHaveTextContent('none');
    expect(screen.getByTestId('d-city-options')).toHaveTextContent('hn');
  });
});

describe('dependent async options', () => {
  beforeEach(() => {
    fieldRegistry.register('optionProbe', OptionProbe);
    fieldRegistry.register('text', (({ id, value, onValueChange }) => (
      <input
        data-testid={id}
        value={(value as string) ?? ''}
        onChange={(e) => onValueChange?.(e.target.value)}
      />
    )) as never);
  });

  it('reloads when another field it depends on changes', async () => {
    const load = vi.fn(async (data: Properties) => [
      { value: `${data.country}-city` },
    ]);
    const fields: FieldDescription[] = [
      { name: 'country', type: 'text' },
      {
        name: 'city',
        type: 'optionProbe',
        optionsMode: 'async',
        options: load,
        optionsDeps: (data) => [data.country],
        // Without this the mount pair - data starts empty, then properties
        // arrive from MultiFieldInput's effect - would be two separate loads.
        debounceMs: 50,
      },
    ];

    render(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{ country: 'vn' }}
        idPrefix="e"
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('e-city-options')).toHaveTextContent('vn-city'),
    );

    fireEvent.change(screen.getByTestId('e-country'), {
      target: { value: 'us' },
    });

    await waitFor(() =>
      expect(screen.getByTestId('e-city-options')).toHaveTextContent('us-city'),
    );
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('async options under StrictMode', () => {
  beforeEach(() => {
    fieldRegistry.register('optionProbe', OptionProbe);
  });

  // StrictMode double-invokes effects: mount, cleanup, mount. A loader created
  // in the render body and disposed by that cleanup would be reused - dead -
  // by the second mount, leaving every dev build stuck on 'loading'.
  it('still reaches ready when effects are double-invoked', async () => {
    const fields: FieldDescription[] = [
      {
        name: 'city',
        type: 'optionProbe',
        options: async () => [{ value: 'hn' }],
      },
    ];

    render(
      <React.StrictMode>
        <MultiFieldInput fieldDescriptions={fields} idPrefix="s" />
      </React.StrictMode>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('s-city-status')).toHaveTextContent('ready'),
    );
    expect(screen.getByTestId('s-city-options')).toHaveTextContent('hn');
  });
});

describe('the options loader is bound to the field it first saw', () => {
  beforeEach(() => {
    fieldRegistry.register('optionProbe', OptionProbe);
  });

  const makeField = (tag: string, name: string): FieldDescription => ({
    name,
    type: 'optionProbe',
    options: async () => [{ value: tag }],
  });

  it('rebuilds when the field name changes, because that remounts', async () => {
    const { rerender } = render(
      <MultiFieldInput
        fieldDescriptions={[makeField('first', 'cityA')]}
        idPrefix="r"
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('r-cityA-options')).toHaveTextContent('first'),
    );

    rerender(
      <MultiFieldInput
        fieldDescriptions={[makeField('second', 'cityB')]}
        idPrefix="r"
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('r-cityB-options')).toHaveTextContent('second'),
    );
  });

  // Deliberate, not an oversight. Rebuilding on the options closure's identity
  // would refetch on every render for the very common case of a `fields` array
  // built inline in a component body - new closure each render, so: rebuild,
  // fetch, setState, render, rebuild... Change the field's `name` (or remount
  // with a `key`) to swap a loader at runtime.
  it('does not rebuild when only the options closure changes', async () => {
    const { rerender } = render(
      <MultiFieldInput
        fieldDescriptions={[makeField('first', 'city')]}
        idPrefix="q"
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('q-city-options')).toHaveTextContent('first'),
    );

    rerender(
      <MultiFieldInput
        fieldDescriptions={[makeField('second', 'city')]}
        idPrefix="q"
      />,
    );
    await new Promise((r) => setTimeout(r, 20));

    expect(screen.getByTestId('q-city-options')).toHaveTextContent('first');
  });
});
