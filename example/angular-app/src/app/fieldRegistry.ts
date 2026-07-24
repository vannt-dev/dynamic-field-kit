import { fieldRegistry } from '@dynamic-field-kit/core';
import { TextFieldComponent } from './components/text-field.component';
import { NumberFieldComponent } from './components/number-field.component';

// Register Angular components as field types
// Note: The Angular adapter handles Angular component classes differently than function renderers
(fieldRegistry as any).register('text', TextFieldComponent);
(fieldRegistry as any).register('number', NumberFieldComponent);
