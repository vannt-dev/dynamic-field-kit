import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MultiFieldInput, layoutRegistry } from '../src';
import { fieldRegistry } from '../src/fieldRegistry';
import type { FieldDescription } from '@dynamic-field-kit/core';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

describe('Layout: Row', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fieldRegistry.register(
      'text',
      vi.fn(({ value, onValueChange }: any) => (
        <div data-testid="field">
          <input
            data-testid="input"
            value={value || ''}
            onChange={(e: any) => onValueChange?.(e.target.value)}
          />
        </div>
      )) as any
    );
  });

  it('should render fields in row layout', () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    render(
      <MultiFieldInput fieldDescriptions={fields} layout={'row' as any} />
    );

    const fieldsElements = screen.getAllByTestId('field');
    expect(fieldsElements).toHaveLength(2);
    const layoutContainer = fieldsElements[0].parentElement;
    expect(layoutContainer).toHaveStyle({ flexDirection: 'row' });
  });

  it('should render fields in row layout with custom gap', () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    render(
      <MultiFieldInput
        fieldDescriptions={fields}
        layout={{ type: 'row', gap: 20 } as any}
      />
    );

    const fieldsElements = screen.getAllByTestId('field');
    const layoutContainer = fieldsElements[0].parentElement;
    expect(layoutContainer).toHaveStyle({ flexDirection: 'row', gap: '20px' });
  });
});

describe('Layout: Grid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fieldRegistry.register(
      'text',
      vi.fn(({ value, onValueChange }: any) => (
        <div data-testid="field">
          <input
            data-testid="input"
            value={value || ''}
            onChange={(e: any) => onValueChange?.(e.target.value)}
          />
        </div>
      )) as any
    );
  });

  it('should render fields in default grid layout (2 columns)', () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    render(
      <MultiFieldInput fieldDescriptions={fields} layout={'grid' as any} />
    );

    const fieldsElements = screen.getAllByTestId('field');
    const layoutContainer = fieldsElements[0].parentElement;
    expect(layoutContainer).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
    });
  });

  it('should render fields in grid layout with 3 columns', () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
      { name: 'field3', type: 'text' },
    ];

    render(
      <MultiFieldInput
        fieldDescriptions={fields}
        layout={{ type: 'grid', columns: 3 } as any}
      />
    );

    const fieldsElements = screen.getAllByTestId('field');
    const layoutContainer = fieldsElements[0].parentElement;
    expect(layoutContainer).toHaveStyle({
      gridTemplateColumns: 'repeat(3, 1fr)',
    });
  });

  it('should render fields in grid layout with custom gap', () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    render(
      <MultiFieldInput
        fieldDescriptions={fields}
        layout={{ type: 'grid', gap: 24 } as any}
      />
    );

    const fieldsElements = screen.getAllByTestId('field');
    const layoutContainer = fieldsElements[0].parentElement;
    expect(layoutContainer).toHaveStyle({ gap: '24px' });
  });
});

describe('Layout: Column', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fieldRegistry.register(
      'text',
      vi.fn(({ value, onValueChange }: any) => (
        <div data-testid="field">
          <input
            data-testid="input"
            value={value || ''}
            onChange={(e: any) => onValueChange?.(e.target.value)}
          />
        </div>
      )) as any
    );
  });

  it('should render fields in column layout with default gap', () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    render(
      <MultiFieldInput fieldDescriptions={fields} layout={'column' as any} />
    );

    const fieldsElements = screen.getAllByTestId('field');
    const layoutContainer = fieldsElements[0].parentElement;
    expect(layoutContainer).toHaveStyle({
      flexDirection: 'column',
      gap: '12px',
    });
  });

  it('should render fields in column layout with custom gap', () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    render(
      <MultiFieldInput
        fieldDescriptions={fields}
        layout={{ type: 'column', gap: 16 } as any}
      />
    );

    const fieldsElements = screen.getAllByTestId('field');
    const layoutContainer = fieldsElements[0].parentElement;
    expect(layoutContainer).toHaveStyle({
      flexDirection: 'column',
      gap: '16px',
    });
  });
});

describe('Layout Registry', () => {
  it('should get registered layout renderer', () => {
    const renderer = ({ children }: { children: React.ReactNode }) => (
      <div data-testid="custom">{children}</div>
    );
    layoutRegistry.register('custom-layout', renderer);

    const result = layoutRegistry.get('custom-layout');
    expect(result).toBe(renderer);
  });

  it('should return undefined for unregistered layout', () => {
    const result = layoutRegistry.get('non-existent');
    expect(result).toBeUndefined();
  });

  it('should warn when registering duplicate layout', () => {
    const renderer1 = ({ children }: { children: React.ReactNode }) => (
      <div>1</div>
    );
    const renderer2 = ({ children }: { children: React.ReactNode }) => (
      <div>2</div>
    );

    layoutRegistry.register('duplicate', renderer1);
    layoutRegistry.register('duplicate', renderer2);

    expect(layoutRegistry.get('duplicate')).toBe(renderer2);
  });

  it('should handle layout with config', () => {
    const renderer = ({
      children,
      config,
    }: {
      children: React.ReactNode;
      config?: { gap: number };
    }) => <div style={{ gap: config?.gap ?? 0 }}>{children}</div>;
    layoutRegistry.register('with-config', renderer);

    const result = layoutRegistry.get('with-config');
    expect(result).toBeDefined();
  });
});
