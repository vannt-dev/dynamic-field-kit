import {
  DynamicInput,
  FieldRegistry,
  FieldRegistryProvider,
} from '@dynamic-field-kit/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

// Augment so registry.register('text', …) is well-typed for editors/tsc.
declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

const TextRenderer = ({ value }: { value?: string }) => (
  <div data-testid="smoke">{value}</div>
);

describe('react built package renders', () => {
  it('mounts a DynamicInput from the built dist and renders its value', () => {
    const registry = new FieldRegistry();
    registry.register('text', TextRenderer as never);

    render(
      <FieldRegistryProvider registry={registry as never}>
        <DynamicInput type="text" value="hi" />
      </FieldRegistryProvider>,
    );

    expect(screen.getByTestId('smoke').textContent).toBe('hi');
  });
});
