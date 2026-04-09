import { Type } from '@angular/core';

export type LayoutRenderer<C = unknown> = (props: {
  children: unknown[];
  config?: C;
}) => unknown;

export type AngularLayoutComponent = Type<unknown>;

export class LayoutRegistry {
  private layouts = new Map<string, AngularLayoutComponent>();

  register(type: string, component: AngularLayoutComponent): void {
    if (this.layouts.has(type)) {
      console.warn(`[dynamic-field-kit] Layout "${type}" already exists`);
    }
    this.layouts.set(type, component);
  }

  get(type: string): AngularLayoutComponent | undefined {
    return this.layouts.get(type);
  }
}

export const layoutRegistry = new LayoutRegistry();
