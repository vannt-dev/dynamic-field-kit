import React from 'react';

// Single source of truth for layout config shapes.
export type {
  BaseLayout,
  ResponsiveLayout,
  LayoutConfig,
} from '@dynamic-field-kit/core';

export type LayoutRenderer<C = unknown> = (props: {
  children: React.ReactNode;
  config?: C;
}) => React.ReactElement;

export class LayoutRegistry {
  private layouts = new Map<string, LayoutRenderer>();

  register(type: string, renderer: LayoutRenderer) {
    if (this.layouts.has(type)) {
      console.warn(`[dynamic-field-kit] Layout "${type}" already exists`);
    }
    this.layouts.set(type, renderer);
  }

  get(type: string): LayoutRenderer | undefined {
    return this.layouts.get(type);
  }
}

export const layoutRegistry = new LayoutRegistry();
