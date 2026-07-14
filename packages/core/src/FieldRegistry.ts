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

  has(type: keyof FieldTypeMap): boolean {
    return (type as string) in this.registry;
  }

  unregister(type: keyof FieldTypeMap): boolean {
    const key = type as string;
    if (key in this.registry) {
      delete this.registry[key];
      return true;
    }
    return false;
  }

  /** Type keys of every currently-registered renderer. */
  list(): string[] {
    return Object.keys(this.registry);
  }
}

export const fieldRegistry = new FieldRegistry();
