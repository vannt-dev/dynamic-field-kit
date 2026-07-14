import { FieldRegistry, fieldRegistry } from '@dynamic-field-kit/core';
import { inject, provide, type InjectionKey } from 'vue';

// Injection key for an isolated registry. Falls back to the process-wide
// singleton when no ancestor called `provideFieldRegistry`, so existing code
// keeps working unchanged.
export const FieldRegistryKey: InjectionKey<FieldRegistry> =
  Symbol('dfk-field-registry');

/** Provide an isolated registry to the current component subtree. */
export function provideFieldRegistry(registry: FieldRegistry): void {
  provide(FieldRegistryKey, registry);
}

/** The registry from the nearest provider, or the global singleton. */
export function useFieldRegistry(): FieldRegistry {
  return inject(FieldRegistryKey, fieldRegistry);
}
