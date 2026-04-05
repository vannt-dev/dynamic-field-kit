import { fieldRegistry } from '@dynamic-field-kit/core';
import { TextFieldComponent } from './text-field.component';

// Example: register Angular component class into shared registry
(
  fieldRegistry as { register: (type: string, renderer: unknown) => void }
).register('text', TextFieldComponent);

export {};
