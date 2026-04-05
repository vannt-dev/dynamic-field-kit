import type { FieldRendererProps, FieldTypeMap } from './types';

export type FieldRenderer<T = unknown, TResult = unknown> = (
  props: FieldRendererProps<T>
) => TResult;

export class FieldRegistry {
  private registry: Record<string, FieldRenderer> = {};

  // ✅ Type safety API
  register<K extends keyof FieldTypeMap>(
    type: K,
    renderer: FieldRenderer<FieldTypeMap[K]>
  ) {
    this.registry[type as string] = renderer as FieldRenderer;
  }

  get<K extends keyof FieldTypeMap>(
    type: K
  ): FieldRenderer<FieldTypeMap[K]> | undefined {
    return this.registry[type as string] as FieldRenderer<FieldTypeMap[K]>;
  }
}

export const fieldRegistry = new FieldRegistry();
