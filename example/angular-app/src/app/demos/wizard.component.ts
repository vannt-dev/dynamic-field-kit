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
          validators.email('Định dạng email không hợp lệ'),
        ),
      },
      {
        name: 'password',
        type: 'password',
        label: 'Mật khẩu',
        validate: validators.compose(
          validators.required('Mật khẩu bắt buộc'),
          validators.minLength(8, 'Tối thiểu 8 ký tự'),
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
    <ol class="demo-steps">
      <li
        *ngFor="let step of wizard.steps; let i = index"
        class="demo-step"
        [ngClass]="'demo-step--' + stepState(i)"
        [attr.aria-current]="stepState(i) === 'current' ? 'step' : null"
      >
        {{ stepState(i) === 'done' ? '✓ ' : i + 1 + '. ' }}{{ step.title }}
      </li>
    </ol>

    <div *ngIf="submitted; else form" class="demo-notice">
      <strong>Hoàn tất!</strong>
      <pre class="demo-panel">{{ data | json }}</pre>
    </div>

    <ng-template #form>
      <h2>
        Bước {{ wizard.currentStepIndex + 1 }}/{{ wizard.totalSteps }}:
        {{ wizard.currentStep.title }}
      </h2>

      <!-- Only the current step's fields are rendered -->
      <dfk-multi-field-input
        [fieldDescriptions]="wizard.currentStep.fields"
        [properties]="data"
        [errors]="errors"
        [touched]="touched"
        [layout]="layout"
        (onChange)="onChange($event)"
        (onBlurField)="onBlur($event)"
      ></dfk-multi-field-input>

      <div class="demo-actions">
        <button
          type="button"
          class="btn"
          [disabled]="!canPrev()"
          (click)="prev()"
        >
          ← Quay lại
        </button>
        <button
          *ngIf="wizard.isLastStep; else nextBtn"
          type="button"
          class="btn btn--primary"
          (click)="finish()"
        >
          Hoàn tất
        </button>
        <ng-template #nextBtn>
          <button type="button" class="btn btn--primary" (click)="next()">
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
  touched: Record<string, boolean> = {};
  submitted = false;

  layout = {
    type: 'responsive' as const,
    mobile: 'column' as const,
    desktop: { type: 'grid' as const, columns: 2, gap: 16 },
  };

  stepState(index: number): 'current' | 'done' | 'todo' {
    if (!this.submitted && index === this.wizard.currentStepIndex) {
      return 'current';
    }
    return this.submitted || isStepCompleted(this.wizard, index)
      ? 'done'
      : 'todo';
  }

  canPrev(): boolean {
    return canGoPrev(this.wizard);
  }

  onChange(next: Record<string, unknown>): void {
    this.data = next;
    if (Object.keys(this.errors).length > 0) {
      this.errors = validateStep(this.wizard.currentStep, next).errors;
    }
  }

  onBlur(name: string): void {
    this.touched = { ...this.touched, [name]: true };
  }

  // goNext does not validate - the wizard decides whether a step may be left.
  private leaveStep(): boolean {
    const result = validateStep(this.wizard.currentStep, this.data);
    this.errors = result.errors;
    // A failed attempt marks the whole step as visited, so every message shows.
    for (const field of this.wizard.currentStep.fields) {
      this.touched = { ...this.touched, [field.name]: true };
    }
    return result.valid;
  }

  next(): void {
    if (this.leaveStep()) this.wizard = goNext(this.wizard);
  }

  prev(): void {
    this.errors = {};
    this.wizard = goPrev(this.wizard);
  }

  finish(): void {
    if (this.leaveStep()) this.submitted = true;
  }
}
