# UI kit recipes

These recipes keep `dynamic-field-kit` in charge of values, touched state and
validation while a UI kit owns presentation. The rule is the same everywhere:
display `error` only when `touched`, forward `id`, and call the supplied value
and blur callbacks.

## React + Ant Design

```tsx
import { Form, Input } from 'antd';
import {
  fieldRegistry,
  type FieldRendererProps,
} from '@dynamic-field-kit/react';

function AntText(props: FieldRendererProps<string>) {
  const message = props.touched
    ? [props.error].flat().filter(Boolean)[0]
    : undefined;

  return (
    <Form.Item
      label={props.label}
      required={props.required}
      validateStatus={message ? 'error' : undefined}
      help={message}
    >
      <Input
        id={props.id}
        value={props.value ?? ''}
        placeholder={props.placeholder}
        disabled={props.disabled}
        readOnly={props.readOnly}
        status={message ? 'error' : undefined}
        onChange={(event) => props.onValueChange?.(event.target.value)}
        onBlur={props.onBlur}
      />
    </Form.Item>
  );
}

fieldRegistry.register('text', AntText);
fieldRegistry.register('email', AntText);
fieldRegistry.register('password', AntText);
```

```tsx
const form = useDynamicForm({ fields, initialValues });

<form onSubmit={form.handleSubmit(save)}>
  <MultiFieldInput fieldDescriptions={fields} form={form} />
  <button disabled={!form.isValid || form.isSubmitting}>Save</button>
</form>;
```

API references: [Ant Design Input](https://ant.design/components/input/) and
[Form](https://ant.design/components/form/).

## Vue + Vuetify

```ts
import { defineComponent, h, type PropType } from 'vue';
import { VTextField } from 'vuetify/components';
import { fieldRegistry } from '@dynamic-field-kit/vue';

const VuetifyText = defineComponent({
  props: {
    id: String,
    value: String,
    label: String,
    placeholder: String,
    disabled: Boolean,
    readOnly: Boolean,
    touched: Boolean,
    error: [String, Array] as PropType<string | string[]>,
    onValueChange: Function as PropType<(value: string) => void>,
    onBlur: Function as PropType<() => void>,
  },
  setup(props) {
    return () =>
      h(VTextField, {
        id: props.id,
        modelValue: props.value ?? '',
        label: props.label,
        placeholder: props.placeholder,
        disabled: props.disabled,
        readonly: props.readOnly,
        errorMessages: props.touched ? props.error : undefined,
        'onUpdate:modelValue': props.onValueChange,
        onBlur: props.onBlur,
      });
  },
});

fieldRegistry.register('text', VuetifyText);
fieldRegistry.register('email', VuetifyText);
fieldRegistry.register('password', VuetifyText);
```

```vue
<script setup lang="ts">
const submit = form.handleSubmit(save);
</script>

<form @submit="submit">
  <MultiFieldInput :field-descriptions="fields" :form="form" />
  <v-btn type="submit" :disabled="!form.isValid.value" :loading="form.isSubmitting.value">
    Save
  </v-btn>
</form>
```

API reference: [Vuetify text fields](https://vuetifyjs.com/en/components/text-fields/).

## Angular + Angular Material

```ts
import { Component } from '@angular/core';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BaseInputComponent, fieldRegistry } from '@dynamic-field-kit/angular';

@Component({
  selector: 'app-material-text',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule],
  template: `
    <mat-form-field appearance="outline">
      <mat-label>{{ label }}</mat-label>
      <input
        matInput
        [id]="id"
        [value]="value ?? ''"
        [placeholder]="placeholder ?? ''"
        [required]="required ?? false"
        [disabled]="disabled ?? false"
        [readOnly]="readOnly ?? false"
        [errorStateMatcher]="errorStateMatcher"
        (input)="valueChange.emit($any($event.target).value)"
      />
      @if (touched && error) {
        <mat-error>{{ errorText }}</mat-error>
      }
    </mat-form-field>
  `,
})
export class MaterialTextRenderer extends BaseInputComponent {
  readonly errorStateMatcher: ErrorStateMatcher = {
    isErrorState: () => Boolean(this.touched && this.error),
  };

  get errorText(): string {
    return ([] as string[]).concat(this.error ?? [])[0] ?? '';
  }
}

fieldRegistry.register('text', MaterialTextRenderer as never);
```

Bind both metadata maps so the store is the single source of truth:

```html
<dfk-multi-field-input
  [fieldDescriptions]="fields"
  [properties]="store.data()"
  [touched]="store.touched()"
  [errors]="store.errors()"
  (onChange)="store.handleChange($event)"
  (onBlurField)="store.handleBlur($event)"
/>
```

API references: [Angular Material form field](https://material.angular.dev/components/form-field/overview)
and [input](https://material.angular.dev/components/input/overview).

## Async validation

All three form helpers expose `validateAsync()`. Their `handleSubmit()` methods
run one async-capable validation pass before calling `onValid`. Live `isValid`
reflects synchronous rules only; call `validateAsync()` when UI must check an
async rule before submit.

Declare a Promise-returning validator so the live pass skips it instead of
firing a request per keystroke, and honour the signal it is handed:

```ts
{
  name: 'username',
  type: 'text',
  validationMode: 'async',
  validate: (value, _data, _rootData, context) =>
    fetch(`/api/available?u=${value}`, { signal: context?.signal })
      .then((r) => (r.ok ? undefined : 'Already taken')),
}
```

For the UI, bind the three status members rather than `isValid` alone -
`isValid` is `true` while an async rule is still unanswered:

| Member                 | Use it for                                                  |
| ---------------------- | ----------------------------------------------------------- |
| `isValidating`         | A spinner on the field or a busy state on the submit button |
| `validationStatus`     | `'valid'                                                    | 'invalid' | 'pending'` — what to actually render |
| `isValidationComplete` | Enabling submit only once everything has been answered      |

Typing cancels a live run in flight, so a stale result never overwrites a newer
one. A submit is not cancelled by typing: it validates the snapshot it was
given and always calls `onValid` or `onInvalid`.
