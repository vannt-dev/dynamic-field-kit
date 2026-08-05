import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MultiFieldInput } from '@dynamic-field-kit/angular';
import {
  canGoPrev,
  createWizardState,
  FieldDescription,
  FormStep,
  goNext,
  goPrev,
  isStepCompleted,
  validateStep,
  validators,
  WizardState,
} from '@dynamic-field-kit/core';
import '../fieldRegistry';

const steps: FormStep[] = [
  {
    id: 'account',
    title: 'Tài khoản',
    fields: [
      {
        name: 'email',
        type: 'email',
        label: 'Email',
        validate: validators.compose(
          validators.required('Email bắt buộc'),
          validators.email('Định dạng email không hợp lệ')
        ),
      },
      {
        name: 'password',
        type: 'password',
        label: 'Mật khẩu',
        validate: validators.compose(
          validators.required('Mật khẩu bắt buộc'),
          validators.minLength(8, 'Tối thiểu 8 ký tự')
        ),
      },
    ] as FieldDescription[],
  },
  {
    id: 'profile',
    title: 'Hồ sơ',
    fields: [
      {
        name: 'fullName',
        type: 'text',
        label: 'Họ và tên',
        validate: validators.required('Họ tên bắt buộc'),
      },
      { name: 'birthDate', type: 'date', label: 'Ngày sinh' },
    ] as FieldDescription[],
  },
  {
    id: 'preferences',
    title: 'Tuỳ chọn',
    fields: [
      {
        name: 'plan',
        type: 'radio',
        label: 'Gói dịch vụ',
        options: [
          { label: 'Miễn phí', value: 'free' },
          { label: 'Pro', value: 'pro' },
        ],
        validate: validators.required('Vui lòng chọn gói'),
      },
      { name: 'newsletter', type: 'switch', label: 'Nhận bản tin' },
    ] as FieldDescription[],
  },
];

@Component({
  selector: 'app-wizard-demo',
  standalone: true,
  imports: [CommonModule, MultiFieldInput],
  template: `
    <ol
      style="display: flex; gap: 8px; list-style: none; padding: 0; margin-bottom: 24px;"
    >
      <li
        *ngFor="let step of wizard.steps; let i = index"
        [style.flex]="1"
        [style.padding]="'10px 12px'"
        [style.border-radius]="'8px'"
        [style.font-size]="'14px'"
        [style.border]="'1px solid'"
        [style.border-color]="
          i === wizard.currentStepIndex ? '#0066cc' : '#d7dee6'
        "
        [style.background]="
          i === wizard.currentStepIndex
            ? '#e8f1fc'
            : completed(i)
            ? '#eaf7ee'
            : '#fff'
        "
        [style.font-weight]="i === wizard.currentStepIndex ? 600 : 400"
      >
        {{ completed(i) ? '✓ ' : i + 1 + '. ' }}{{ step.title }}
      </li>
    </ol>

    <div
      *ngIf="submitted; else form"
      style="padding: 16px; border-radius: 8px; background: #eaf7ee; border: 1px solid #b7e2c4;"
    >
      <strong style="color: #1c7a3d;">🎉 Hoàn tất!</strong>
      <pre style="margin-top: 8px; font-size: 12px;">{{ data | json }}</pre>
    </div>

    <ng-template #form>
      <h3 style="font-size: 17px; margin-bottom: 12px;">
        Bước {{ wizard.currentStepIndex + 1 }}/{{ wizard.totalSteps }}:
        {{ wizard.currentStep.title }}
      </h3>

      <dfk-multi-field-input
        [fieldDescriptions]="wizard.currentStep.fields"
        [properties]="data"
        (onChange)="data = $event"
        [layout]="{ type: 'grid', columns: 2, gap: 16 }"
      ></dfk-multi-field-input>

      <ul
        *ngIf="errorKeys().length > 0"
        style="color: #c0392b; font-size: 13px;"
      >
        <li *ngFor="let key of errorKeys()">
          {{ key }}: {{ errors[key].join(', ') }}
        </li>
      </ul>

      <div style="margin-top: 20px; display: flex; gap: 12px;">
        <button
          type="button"
          [disabled]="!canPrev()"
          (click)="prev()"
          style="padding: 10px 18px; cursor: pointer;"
        >
          ← Quay lại
        </button>
        <button
          *ngIf="wizard.isLastStep; else nextBtn"
          type="button"
          (click)="finish()"
          style="padding: 10px 18px; background: #1c7a3d; color: #fff; border: none; border-radius: 6px; cursor: pointer;"
        >
          Hoàn tất
        </button>
        <ng-template #nextBtn>
          <button
            type="button"
            (click)="next()"
            style="padding: 10px 18px; background: #0066cc; color: #fff; border: none; border-radius: 6px; cursor: pointer;"
          >
            Tiếp theo →
          </button>
        </ng-template>
      </div>
    </ng-template>
  `,
})
export class WizardDemoComponent {
  wizard: WizardState = createWizardState(steps);
  data: Record<string, unknown> = {};
  errors: Record<string, string[]> = {};
  submitted = false;

  completed(index: number): boolean {
    return isStepCompleted(this.wizard, index);
  }

  canPrev(): boolean {
    return canGoPrev(this.wizard);
  }

  errorKeys(): string[] {
    return Object.keys(this.errors);
  }

  // goNext does not validate - the wizard decides whether a step may be left.
  next(): void {
    const result = validateStep(this.wizard.currentStep, this.data);
    this.errors = result.errors;
    if (result.valid) {
      this.wizard = goNext(this.wizard);
    }
  }

  prev(): void {
    this.wizard = goPrev(this.wizard);
  }

  finish(): void {
    const result = validateStep(this.wizard.currentStep, this.data);
    this.errors = result.errors;
    if (result.valid) {
      this.submitted = true;
    }
  }
}
