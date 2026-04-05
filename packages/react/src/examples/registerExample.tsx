import { fieldRegistry } from '@dynamic-field-kit/core';
import TextRenderer from './TextRenderer';

// Example: register 'text' renderer for React usage
(
  fieldRegistry as { register: (type: string, renderer: unknown) => void }
).register('text', TextRenderer);

export {};
