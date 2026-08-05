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
    label: '1. Quốc gia (Dynamic Options)',
    options: [
      { label: 'Việt Nam', value: 'VN' },
      { label: 'Hoa Kỳ (USA)', value: 'US' },
    ],
    validate: validators.required('Vui lòng chọn quốc gia'),
  },
  {
    name: 'gender',
    type: 'radio',
    label: '2. Giới tính (Extended HTML5 Radio)',
    options: [
      { label: 'Nam', value: 'male' },
      { label: 'Nữ', value: 'female' },
    ],
  },
  {
    name: 'satisfaction',
    type: 'range',
    label: '3. Mức độ hài lòng (Range Slider)',
    min: 1,
    max: 10,
    step: 1,
  },
  {
    name: 'email',
    type: 'email',
    label: '4. Email (Built-in Validators)',
    placeholder: 'example@domain.com',
    validate: validators.compose(
      validators.required('Email bắt buộc'),
      validators.email('Định dạng email không hợp lệ')
    ),
  },
  { name: 'birthDate', type: 'date', label: '5. Ngày sinh' },
  { name: 'subscribeNewsletter', type: 'switch', label: '6. Nhận bản tin' },
];

@Component({
  selector: 'app-enterprise-demo',
  standalone: true,
  imports: [CommonModule, MultiFieldInput, DynamicFormDevToolsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (ngSubmit)="onSubmit()">
      <dfk-multi-field-input
        [fieldDescriptions]="fields"
        [properties]="store.data()"
        (onChange)="store.handleChange($event)"
        (onBlurField)="store.handleBlur($event)"
        [layout]="{ type: 'grid', columns: 2, gap: 16 }"
      ></dfk-multi-field-input>

      <div style="margin-top: 20px; display: flex; gap: 12px;">
        <button
          type="submit"
          [disabled]="store.isSubmitting()"
          style="padding: 10px 18px; background: #0066cc; color: #fff; border: none; border-radius: 6px; cursor: pointer;"
        >
          {{ store.isSubmitting() ? 'Đang gửi…' : 'Gửi đăng ký' }}
        </button>
        <button
          type="button"
          (click)="store.reset()"
          style="padding: 10px 18px; cursor: pointer;"
        >
          Reset
        </button>
      </div>

      <div
        style="margin-top: 24px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;"
      >
        <h3 style="margin: 0 0 8px; font-size: 15px;">Form State (signals)</h3>
        <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">
          isDirty: {{ store.isDirty() }} · isValid: {{ store.isValid() }} ·
          isSubmitted: {{ store.isSubmitted() }}
        </p>
        <pre style="margin: 0; font-size: 12px;">{{ store.data() | json }}</pre>
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
