import {
  fieldRegistry as coreFieldRegistry,
  type FieldRendererProps,
  type FieldTypeMap,
} from '@dynamic-field-kit/core';
import type { ComponentType } from 'react';

export type ReactFieldRenderer<T = any> = ComponentType<FieldRendererProps<T>>;

export interface ReactFieldRegistry {
  register<K extends keyof FieldTypeMap>(
    type: K,
    renderer: ReactFieldRenderer<FieldTypeMap[K]>
  ): void;
  get<K extends keyof FieldTypeMap>(
    type: K
  ): ReactFieldRenderer<FieldTypeMap[K]> | undefined;
}

export const fieldRegistry = coreFieldRegistry as ReactFieldRegistry;
