/**
 * Canonical layout configuration types shared by every framework adapter.
 *
 * Adapters must re-export these instead of declaring their own, so the layout
 * contract (grid columns, gaps, responsive breakpoints, ...) stays identical
 * across React, Angular, and Vue.
 */

export interface ColumnLayoutConfig {
  type: 'column';
  gap?: number;
  width?: string;
}

export interface RowLayoutConfig {
  type: 'row';
  gap?: number;
  width?: string;
  flex?: boolean;
}

export interface GridLayoutConfig {
  type: 'grid';
  columns?: number;
  gap?: number;
  width?: string;
}

export type BaseLayout =
  | 'column'
  | 'row'
  | 'grid'
  | ColumnLayoutConfig
  | RowLayoutConfig
  | GridLayoutConfig;

export interface ResponsiveLayout {
  type: 'responsive';
  mobile: BaseLayout;
  desktop: BaseLayout;
  /** Viewport width (px) below which `mobile` is used. Defaults to 768. */
  breakpoint?: number;
}

export type LayoutConfig = BaseLayout | ResponsiveLayout;
