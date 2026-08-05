import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MultiFieldInput } from '@dynamic-field-kit/angular';
import {
  FieldDescription,
  validators,
  validateFields,
  validateFieldsAsync,
} from '@dynamic-field-kit/core';
import { DEMO_SOURCES } from './demo-sources';
import { EnterpriseDemoComponent } from './demos/enterprise.component';
import { WizardDemoComponent } from './demos/wizard.component';
import './fieldRegistry';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MultiFieldInput,
    EnterpriseDemoComponent,
    WizardDemoComponent,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent {
  activeTab: 'legacy' | 'new' | 'enterprise' | 'wizard' = 'legacy';
  showCode = false;

  // The landing page only exists on the deployed site, one level above this
  // app's base path, so link to it absolutely.
  readonly ALL_DEMOS_URL = 'https://vannt-dev.github.io/dynamic-field-kit/';

  currentSource(): string {
    return DEMO_SOURCES[this.activeTab] ?? '';
  }

  // 1. Legacy fields
  legacyFields: FieldDescription[] = [
    { name: 'firstName', type: 'text', label: 'First Name' },
    { name: 'lastName', type: 'text', label: 'Last Name' },
    {
      name: 'fullName',
      type: 'text',
      label: 'Full Name (computed)',
      computeValue: (data) =>
        `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
    },
    { name: 'age', type: 'number', label: 'Age' },
    {
      name: 'contacts',
      type: 'group',
      label: 'Contacts',
      fields: [
        { name: 'email', type: 'text', label: 'Email' },
        { name: 'phone', type: 'text', label: 'Phone' },
      ],
      defaultItem: { email: '', phone: '' },
      minItems: 0,
      maxItems: 5,
    },
  ];
  legacyData: any = {};

  onLegacyChange(data: any) {
    this.legacyData = data;
  }

  // 2. New features fields
  newFields: FieldDescription[] = [
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
      name: 'city',
      type: 'select',
      label: '2. Thành phố (Dynamic theo Quốc gia)',
      options: (data: any) => {
        if (data.country === 'VN') {
          return [
            { label: 'Hà Nội', value: 'HN' },
            { label: 'TP. Hồ Chí Minh', value: 'HCM' },
            { label: 'Đà Nẵng', value: 'DN' },
          ];
        }
        if (data.country === 'US') {
          return [
            { label: 'New York', value: 'NY' },
            { label: 'Los Angeles', value: 'LA' },
            { label: 'Chicago', value: 'CHI' },
          ];
        }
        return [];
      },
      disabledCondition: (data: any) => !data.country,
      validate: validators.required('Vui lòng chọn thành phố'),
    },
    {
      name: 'email',
      type: 'text',
      label: '3. Email (Built-in Validators: required + email)',
      placeholder: 'example@domain.com',
      validate: validators.compose(
        validators.required('Email bắt buộc'),
        validators.email('Định dạng email không hợp lệ')
      ),
    },
    {
      name: 'username',
      type: 'text',
      label: '4. Username (Async validation)',
      placeholder: 'Nhập username (thử "admin")',
      validate: async (value: any) => {
        if (!value) {
          return 'Username bắt buộc';
        }
        if (String(value).toLowerCase() === 'admin') {
          return 'Tên "admin" đã tồn tại';
        }
        return undefined;
      },
    },
    {
      name: 'enableExtra',
      type: 'select',
      label: '5. Hiển thị trường bổ sung? (appearCondition)',
      options: [
        { label: 'Không', value: 'no' },
        { label: 'Có', value: 'yes' },
      ],
    },
    {
      name: 'note',
      type: 'text',
      label: 'Ghi chú thêm (Xuất hiện khi chọn "Có")',
      appearCondition: (data: any) => data.enableExtra === 'yes',
    },
    {
      name: 'lockAll',
      type: 'select',
      label: '6. Khóa trường số điện thoại? (disabledCondition)',
      options: [
        { label: 'Mở khóa', value: 'unlocked' },
        { label: 'Khóa (Disabled)', value: 'locked' },
      ],
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Số điện thoại',
      disabledCondition: (data: any) => data.lockAll === 'locked',
    },
  ];

  newData: any = { country: 'VN' };
  errors: Record<string, string[]> = {};
  validating = false;

  layout = {
    type: 'responsive' as const,
    mobile: 'column' as const,
    desktop: { type: 'grid' as const, columns: 2, gap: 16 },
  };

  onNewChange(data: any) {
    this.newData = data;
    const res = validateFields(this.newFields, data);
    this.errors = res.errors;
  }

  async handleValidate() {
    this.validating = true;
    const res = await validateFieldsAsync(this.newFields, this.newData);
    this.errors = res.errors;
    this.validating = false;
  }

  hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }
}
