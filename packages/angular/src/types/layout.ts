export interface GridLayoutConfig {
  type: 'grid';
  columns?: number;
  gap?: number;
  width?: string;
}

export interface RowLayoutConfig {
  type: 'row';
  gap?: number;
  width?: string;
  flex?: boolean;
}

export interface ColumnLayoutConfig {
  type: 'column';
  gap?: number;
  width?: string;
}

export type BaseLayoutConfig =
  | 'column'
  | 'row'
  | 'grid'
  | GridLayoutConfig
  | RowLayoutConfig
  | ColumnLayoutConfig;

export interface ResponsiveLayoutConfig {
  type: 'responsive';
  mobile: BaseLayoutConfig;
  desktop: BaseLayoutConfig;
  breakpoint?: number;
}

export type LayoutConfig = BaseLayoutConfig | ResponsiveLayoutConfig;
