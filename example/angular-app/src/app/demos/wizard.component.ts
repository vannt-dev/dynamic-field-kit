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
import { t } from '../../../../shared/i18n';

const steps: FormStep[] = [
  {
    id: 'account',
    title: t('Account'),
    fields: [
      {
        name: 'email',
        type: 'email',
        label: t('Email'),
        validate: validators.compose(
          validators.required(t('Email is required')),
          validators.email(t('Invalid email format')),
        ),
      },
      {
        name: 'password',
        type: 'password',
        label: t('Password'),
        validate: validators.compose(
          validators.required(t('Password is required')),
          validators.minLength(8, t('At least 8 characters')),
        ),
      },
    ] as FieldDescription[],
  },
  {
    id: 'profile',
    title: t('Profile'),
    fields: [
      {
        name: 'fullName',
        type: 'text',
        label: t('Full name'),
        validate: validators.required(t('Full name is required')),
      },
      { name: 'birthDate', type: 'date', label: t('Date of birth') },
    ] as FieldDescription[],
  },
  {
    id: 'preferences',
    title: t('Preferences'),
    fields: [
      {
        name: 'plan',
        type: 'radio',
        label: t('Plan'),
        options: [
          { label: t('Free'), value: 'free' },
          { label: 'Pro', value: 'pro' },
        ],
        validate: validators.required(t('Please choose a plan')),
      },
      {
        name: 'newsletter',
        type: 'switch',
        label: t('Send me the newsletter'),
      },
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
      <strong>{{ t('Done!') }}</strong>
      <pre class="demo-panel">{{ data | json }}</pre>
    </div>

    <ng-template #form>
      <h2>
        {{ t('Step') }} {{ wizard.currentStepIndex + 1 }}/{{
          wizard.totalSteps
        }}:
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
          {{ t('← Back') }}
        </button>
        <button
          *ngIf="wizard.isLastStep; else nextBtn"
          type="button"
          class="btn btn--primary"
          (click)="finish()"
        >
          {{ t('Finish') }}
        </button>
        <ng-template #nextBtn>
          <button type="button" class="btn btn--primary" (click)="next()">
            {{ t('Next →') }}
          </button>
        </ng-template>
      </div>
    </ng-template>
  `,
})
export class WizardDemoComponent {
  t = t;

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
