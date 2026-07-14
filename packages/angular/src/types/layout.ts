// Layout config types live in @dynamic-field-kit/core so the contract stays
// identical across every framework adapter. Re-exported here (with the
// historical Angular ...Config aliases) to preserve existing import paths.
import type { BaseLayout, ResponsiveLayout } from '@dynamic-field-kit/core';

export type {
  ColumnLayoutConfig,
  RowLayoutConfig,
  GridLayoutConfig,
  LayoutConfig,
} from '@dynamic-field-kit/core';

export type BaseLayoutConfig = BaseLayout;
export type ResponsiveLayoutConfig = ResponsiveLayout;
