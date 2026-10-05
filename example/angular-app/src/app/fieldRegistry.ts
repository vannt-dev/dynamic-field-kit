import { fieldRegistry } from '@dynamic-field-kit/core';
import {
  CheckFieldComponent,
  DateFieldComponent,
  EmailFieldComponent,
  NumberFieldComponent,
  PasswordFieldComponent,
  RadioFieldComponent,
  RangeFieldComponent,
  SelectFieldComponent,
  TextFieldComponent,
} from './components/fields';

// Register Angular components as field types
const registry = fieldRegistry as any;
registry.register('text', TextFieldComponent);
registry.register('email', EmailFieldComponent);
registry.register('password', PasswordFieldComponent);
registry.register('date', DateFieldComponent);
registry.register('number', NumberFieldComponent);
registry.register('select', SelectFieldComponent);
registry.register('radio', RadioFieldComponent);
registry.register('range', RangeFieldComponent);
registry.register('checkbox', CheckFieldComponent);
registry.register('switch', CheckFieldComponent);
