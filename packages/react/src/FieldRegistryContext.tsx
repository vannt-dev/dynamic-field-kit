import React, { createContext, useContext } from 'react';
import { fieldRegistry, type ReactFieldRegistry } from './fieldRegistry';

// Defaults to the process-wide singleton so existing code that never wraps a
// provider keeps working. Wrap a subtree in <FieldRegistryProvider> to give it
// an isolated set of renderers (e.g. two design systems in one app).
const FieldRegistryContext = createContext<ReactFieldRegistry>(fieldRegistry);

export interface FieldRegistryProviderProps {
  registry: ReactFieldRegistry;
  children: React.ReactNode;
}

export const FieldRegistryProvider = ({
  registry,
  children,
}: FieldRegistryProviderProps): React.ReactElement => (
  <FieldRegistryContext.Provider value={registry}>
    {children}
  </FieldRegistryContext.Provider>
);

/** The registry for the nearest provider, or the global singleton. */
export function useFieldRegistry(): ReactFieldRegistry {
  return useContext(FieldRegistryContext);
}
