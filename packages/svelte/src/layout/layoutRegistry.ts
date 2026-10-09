import type { Component, Snippet } from 'svelte';

/** What a layout component receives. */
export interface LayoutProps<C = any> {
  /** The name the layout was looked up under, such as `grid`. */
  type: string;
  /** The layout's settings; an empty object when it was named by a string. */
  config?: C;
  /** The fields, already rendered. Place it with `{@render children()}`. */
  children: Snippet;
}

/** A layout is a component that wraps the rendered fields. */
export type LayoutRenderer<C = any> = Component<LayoutProps<C>>;

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
