import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  createDynamicFormStore,
  DynamicFormDevToolsComponent,
  MultiFieldInput,
} from '@dynamic-field-kit/angular';
import { FieldDescription, validators } from '@dynamic-field-kit/core';
import '../fieldRegistry';
import { t } from '../../../../shared/i18n';

const fields: FieldDescription[] = [
  {
    name: 'country',
    type: 'select',
    label: t('Country'),
    options: [
      { label: t('Vietnam'), value: 'VN' },
      { label: t('United States'), value: 'US' },
    ],
    validate: validators.required(t('Please choose a country')),
  },
  {
    name: 'gender',
    type: 'radio',
    label: t('Gender'),
    options: [
      { label: t('Male'), value: 'male' },
      { label: t('Female'), value: 'female' },
    ],
  },
  {
    name: 'satisfaction',
    type: 'range',
    label: t('Satisfaction'),
    min: 1,
    max: 10,
    step: 1,
  },
  {
    name: 'email',
    type: 'email',
    label: t('Email'),
    placeholder: 'example@domain.com',
    validate: validators.compose(
      validators.required(t('Email is required')),
      validators.email(t('Invalid email format')),
    ),
  },
  { name: 'birthDate', type: 'date', label: t('Date of birth') },
  {
    name: 'subscribeNewsletter',
    type: 'switch',
    label: t('Send me the newsletter'),
  },
];

@Component({
  selector: 'app-enterprise-demo',
  standalone: true,
  imports: [CommonModule, MultiFieldInput, DynamicFormDevToolsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (submit)="onSubmit($event)">
      <dfk-multi-field-input
        [fieldDescriptions]="fields"
        [properties]="store.data()"
        [errors]="store.errors()"
        [touched]="store.touched()"
        [layout]="layout"
        (onChange)="store.handleChange($event)"
        (onBlurField)="store.handleBlur($event)"
      ></dfk-multi-field-input>

      <div class="demo-actions">
        <button
          type="submit"
          class="btn btn--primary"
          [disabled]="store.isSubmitting()"
        >
          {{ store.isSubmitting() ? t('Submitting…') : t('Submit') }}
        </button>
        <button type="button" class="btn" (click)="store.reset()">
          {{ t('Reset') }}
        </button>
      </div>

      <div class="demo-panel">
        <h3>Form state (signals)</h3>
        <p class="demo-note" style="margin: 0 0 8px">
          isDirty: {{ store.isDirty() }} · isValid: {{ store.isValid() }} ·
          isSubmitted: {{ store.isSubmitted() }}
        </p>
        <pre>{{ store.data() | json }}</pre>
      </div>

      <dfk-dev-tools
        [data]="store.data()"
        [errors]="store.errors()"
        [touched]="store.touched()"
        [isDirty]="store.isDirty()"
        [fields]="fields"
      ></dfk-dev-tools>
    </form>
  `,
})
export class EnterpriseDemoComponent {
  t = t;

  fields = fields;

  layout = {
    type: 'responsive' as const,
    mobile: 'column' as const,
    desktop: { type: 'grid' as const, columns: 2, gap: 16 },
  };

  // Signal-based store: the Angular counterpart of useDynamicForm.
  store = createDynamicFormStore({
    fields,
    initialValues: {
      country: 'VN',
      satisfaction: 8,
      subscribeNewsletter: true,
    },
    validateOnBlur: true,
  });

  onSubmit = this.store.handleSubmit((data) => {
    alert(`${t('Submitted:')}\n${JSON.stringify(data, null, 2)}`);
  });
}
