import { FieldRegistry, fieldRegistry } from '@dynamic-field-kit/core';
import { getContext, hasContext, setContext } from 'svelte';

// Context key for an isolated registry. Without a provider above it a
// component falls back to the process-wide singleton, so registering on
// `fieldRegistry` directly keeps working.
export const FieldRegistryKey = Symbol('dfk-field-registry');

/**
 * Provide an isolated registry to the current component and everything below
 * it. Call during component initialisation, like any `setContext`.
 */
export function provideFieldRegistry(registry: FieldRegistry): void {
  setContext(FieldRegistryKey, registry);
}

/** The registry from the nearest provider, or the global singleton. */
export function useFieldRegistry(): FieldRegistry {
  return hasContext(FieldRegistryKey)
    ? getContext<FieldRegistry>(FieldRegistryKey)
    : fieldRegistry;
}
