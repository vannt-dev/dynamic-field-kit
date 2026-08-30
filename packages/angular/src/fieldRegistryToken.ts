import { InjectionToken } from '@angular/core';
import { FieldRegistry, fieldRegistry } from '@dynamic-field-kit/core';

// Injecting this token yields the process-wide singleton by default, so code
// that never provides it keeps working. Provide it on a component/route to give
// that subtree an isolated set of renderers:
//
//   providers: [{ provide: FIELD_REGISTRY, useValue: myScopedRegistry }]
export const FIELD_REGISTRY = new InjectionToken<FieldRegistry>(
  'dfk.FieldRegistry',
  {
    providedIn: 'root',
    factory: () => fieldRegistry,
  },
);
