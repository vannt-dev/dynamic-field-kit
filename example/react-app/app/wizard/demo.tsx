'use client';

import {
  canGoPrev,
  createWizardState,
  FieldDescription,
  FormStep,
  goNext,
  goPrev,
  isStepCompleted,
  validators,
  validateStep,
} from '@dynamic-field-kit/core';
import { MultiFieldInput } from '@dynamic-field-kit/react';
import { useState } from 'react';
import '../../lib/fieldRegistry';

const accountFields: FieldDescription[] = [
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
  {
    name: 'password',
    type: 'password',
    label: 'Mật khẩu',
    validate: validators.compose(
      validators.required('Mật khẩu bắt buộc'),
      validators.minLength(8, 'Tối thiểu 8 ký tự'),
    ),
  },
];

const profileFields: FieldDescription[] = [
  {
    name: 'fullName',
    type: 'text',
    label: 'Họ và tên',
    validate: validators.required('Họ tên bắt buộc'),
  },
  {
    name: 'birthDate',
    type: 'date',
    label: 'Ngày sinh',
  },
];

const preferenceFields: FieldDescription[] = [
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
  {
    name: 'newsletter',
    type: 'switch',
    label: 'Nhận bản tin ưu đãi',
  },
];

const steps: FormStep[] = [
  { id: 'account', title: 'Tài khoản', fields: accountFields },
  { id: 'profile', title: 'Hồ sơ', fields: profileFields },
  { id: 'preferences', title: 'Tuỳ chọn', fields: preferenceFields },
];

export default function WizardDemo() {
  const [wizard, setWizard] = useState(() => createWizardState(steps));
  const [data, setData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  // goNext deliberately does not validate - the wizard decides whether a step
  // may be left, so a "save draft and come back" flow is possible too.
  function leaveStep(): boolean {
    const result = validateStep(wizard.currentStep, data);
    setErrors(result.errors);
    // A failed attempt marks the whole step as visited, so every message shows.
    setTouched((prev) => ({
      ...prev,
      ...Object.fromEntries(
        wizard.currentStep.fields.map((field) => [field.name, true]),
      ),
    }));
    return result.valid;
  }

  function handleChange(next: Record<string, unknown>) {
    setData(next);
    if (Object.keys(errors).length > 0) {
      setErrors(validateStep(wizard.currentStep, next).errors);
    }
  }

  return (
    <>
      {/* Step indicator, driven by isStepCompleted */}
      <ol className="demo-steps">
        {wizard.steps.map((step, index) => {
          const isCurrent = index === wizard.currentStepIndex && !submitted;
          const done = submitted || isStepCompleted(wizard, index);
          const state = isCurrent ? 'current' : done ? 'done' : 'todo';
          return (
            <li
              key={step.id}
              aria-current={isCurrent ? 'step' : undefined}
              className={`demo-step demo-step--${state}`}
            >
              {done && !isCurrent ? '✓ ' : `${index + 1}. `}
              {step.title}
            </li>
          );
        })}
      </ol>

      {submitted ? (
        <div className="demo-notice">
          <strong>Hoàn tất!</strong>
          <pre className="demo-panel">{JSON.stringify(data, null, 2)}</pre>
        </div>
      ) : (
        <>
          <h2>
            Bước {wizard.currentStepIndex + 1}/{wizard.totalSteps}:{' '}
            {wizard.currentStep.title}
          </h2>

          {/* Only the current step's fields are rendered */}
          <MultiFieldInput
            key={wizard.currentStep.id}
            fieldDescriptions={wizard.currentStep.fields}
            properties={data}
            onChange={handleChange}
            errors={errors}
            touched={touched}
            onBlurField={(name) =>
              setTouched((prev) => ({ ...prev, [name]: true }))
            }
            layout={{
              type: 'responsive',
              mobile: 'column',
              desktop: { type: 'grid', columns: 2, gap: 16 },
            }}
          />

          <div className="demo-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setErrors({});
                setWizard(goPrev(wizard));
              }}
              disabled={!canGoPrev(wizard)}
            >
              ← Quay lại
            </button>

            {wizard.isLastStep ? (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => leaveStep() && setSubmitted(true)}
              >
                Hoàn tất
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => leaveStep() && setWizard(goNext(wizard))}
              >
                Tiếp theo →
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
