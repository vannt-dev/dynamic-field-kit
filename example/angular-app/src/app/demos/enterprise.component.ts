import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  createDynamicFormStore,
  DynamicFormDevToolsComponent,
  MultiFieldInput,
} from '@dynamic-field-kit/angular';
import { FieldDescription, validators } from '@dynamic-field-kit/core';
import '../fieldRegistry';

const fields: FieldDescription[] = [
  {
    name: 'country',
    type: 'select',
    label: 'Quốc gia',
    options: [
      { label: 'Việt Nam', value: 'VN' },
      { label: 'Hoa Kỳ (USA)', value: 'US' },
    ],
    validate: validators.required('Vui lòng chọn quốc gia'),
  },
  {
    name: 'gender',
    type: 'radio',
    label: 'Giới tính',
    options: [
      { label: 'Nam', value: 'male' },
      { label: 'Nữ', value: 'female' },
    ],
  },
  {
    name: 'satisfaction',
    type: 'range',
    label: 'Mức độ hài lòng',
    min: 1,
    max: 10,
    step: 1,
  },
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'example@domain.com',
    validate: validators.compose(
      validators.required('Email bắt buộc'),
      validators.email('Định dạng email không hợp lệ'),
    ),
  },
  { name: 'birthDate', type: 'date', label: 'Ngày sinh' },
  { name: 'subscribeNewsletter', type: 'switch', label: 'Nhận bản tin' },
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
          {{ store.isSubmitting() ? 'Đang gửi…' : 'Gửi đăng ký' }}
        </button>
        <button type="button" class="btn" (click)="store.reset()">Reset</button>
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
    alert(`Submit thành công:\n${JSON.stringify(data, null, 2)}`);
  });
}
