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

export type LayoutConfig =
  | 'column'
  | 'row'
  | 'grid'
  | GridLayoutConfig
  | RowLayoutConfig
  | ColumnLayoutConfig;
