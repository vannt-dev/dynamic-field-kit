import { fieldRegistry as registry } from '@dynamic-field-kit/svelte';
import CheckField from './CheckField.svelte';
import DateField from './DateField.svelte';
import EmailField from './EmailField.svelte';
import InputField from './InputField.svelte';
import NumberField from './NumberField.svelte';
import PasswordField from './PasswordField.svelte';
import RadioField from './RadioField.svelte';
import RangeField from './RangeField.svelte';
import SelectField from './SelectField.svelte';

// The renderers this app draws its fields with. The kit's built-in renderers
// are bare inputs with no label and no styling, so an application registers
// its own for every type it uses - these are plain HTML styled by
// `example/shared/demo.css`.
//
// A renderer is a Svelte component that receives core's `FieldRendererProps`.

registry.register('text', InputField as never);
registry.register('email', EmailField as never);
registry.register('password', PasswordField as never);
registry.register('number', NumberField as never);
registry.register('date', DateField as never);
registry.register('select', SelectField as never);
registry.register('radio', RadioField as never);
registry.register('range', RangeField as never);
registry.register('checkbox', CheckField as never);
registry.register('switch', CheckField as never);

export {};
