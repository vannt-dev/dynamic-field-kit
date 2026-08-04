import { fieldRegistry } from '@dynamic-field-kit/core';
import { NumberFieldComponent } from './components/number-field.component';
import { SelectFieldComponent } from './components/select-field.component';
import { TextFieldComponent } from './components/text-field.component';

// Register Angular components as field types
(fieldRegistry as any).register('text', TextFieldComponent);
(fieldRegistry as any).register('number', NumberFieldComponent);
(fieldRegistry as any).register('select', SelectFieldComponent);
