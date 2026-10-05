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
import { SchemaDemoComponent } from './demos/schema.component';
import { WizardDemoComponent } from './demos/wizard.component';
import './fieldRegistry';

type Tab = 'legacy' | 'new' | 'enterprise' | 'wizard' | 'schema';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MultiFieldInput,
    EnterpriseDemoComponent,
    WizardDemoComponent,
    SchemaDemoComponent,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent {
  activeTab: Tab = 'legacy';
  showCode = false;

  // The landing page only exists on the deployed site, one level above this
  // app's base path, so link to it absolutely.
  readonly ALL_DEMOS_URL = 'https://vannt-dev.github.io/dynamic-field-kit/';

  readonly tabs: { id: Tab; label: string; title: string; intro: string }[] = [
    {
      id: 'legacy',
      label: 'Cơ bản',
      title: 'Dynamic Field Kit — Angular',
      intro:
        'Đăng ký component qua fieldRegistry, dfk-multi-field-input, layout, trường dẫn xuất (computeValue) và nhóm lặp lại.',
    },
    {
      id: 'new',
      label: 'Validation',
      title: 'Validators, options động và điều kiện',
      intro:
        'Built-in validators (required, email, compose), options phụ thuộc trường khác, appearCondition / disabledCondition và async validation.',
    },
    {
      id: 'enterprise',
      label: 'Form state',
      title: 'Form state với createDynamicFormStore',
      intro:
        'Signal store giữ data, errors, touched và trạng thái submit; DevTools ở góc màn hình.',
    },
    {
      id: 'wizard',
      label: 'Wizard',
      title: 'Multi-Step Wizard',
      intro:
        'createWizardState, validateStep, goNext / goPrev. State là bất biến — mỗi lần điều hướng trả về một state mới.',
    },
    {
      id: 'schema',
      label: 'JSON Schema + Undo',
      title: 'JSON Schema, bản nháp và Undo / Redo',
      intro:
        'fieldsFromJsonSchema dựng form từ một JSON Schema, createFormDraft giữ dữ liệu qua lần tải lại trang, createFormHistory cho undo / redo.',
    },
  ];

  get current() {
    return this.tabs.find((tab) => tab.id === this.activeTab)!;
  }

  get hasSource(): boolean {
    return Boolean(DEMO_SOURCES[this.activeTab]);
  }

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
      className: 'demo-group',
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
      label: 'Quốc gia',
      options: [
        { label: 'Việt Nam', value: 'VN' },
        { label: 'Hoa Kỳ (USA)', value: 'US' },
      ],
      validate: validators.required('Vui lòng chọn quốc gia'),
    },
    {
      name: 'city',
      type: 'select',
      label: 'Thành phố',
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
      label: 'Email',
      placeholder: 'example@domain.com',
      validate: validators.compose(
        validators.required('Email bắt buộc'),
        validators.email('Định dạng email không hợp lệ'),
      ),
    },
    {
      name: 'username',
      type: 'text',
      label: 'Username',
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
      label: 'Hiển thị trường bổ sung?',
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
      label: 'Khóa trường số điện thoại?',
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
  newTouched: Record<string, boolean> = {};
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

  onNewBlur(name: string) {
    this.newTouched = { ...this.newTouched, [name]: true };
  }

  async handleValidate() {
    this.validating = true;
    // Checking the whole form marks every field as visited.
    this.newTouched = Object.fromEntries(
      this.newFields.map((field) => [field.name, true]),
    );
    const res = await validateFieldsAsync(this.newFields, this.newData);
    this.errors = res.errors;
    this.validating = false;
  }

  hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }
}
