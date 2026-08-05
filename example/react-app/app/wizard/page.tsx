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
import DemoNav from '../DemoNav';
import '../../lib/fieldRegistry';

const accountFields: FieldDescription[] = [
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'example@domain.com',
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

export default function WizardPage() {
  const [wizard, setWizard] = useState(() => createWizardState(steps));
  const [data, setData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);

  // goNext deliberately does not validate - the wizard decides whether a step
  // may be left, so a "save draft and come back" flow is possible too.
  function handleNext() {
    const result = validateStep(wizard.currentStep, data);
    setErrors(result.errors);
    if (result.valid) {
      setWizard(goNext(wizard));
    }
  }

  function handleFinish() {
    const result = validateStep(wizard.currentStep, data);
    setErrors(result.errors);
    if (result.valid) {
      setSubmitted(true);
    }
  }

  return (
    <main
      style={{
        padding: '24px',
        maxWidth: '720px',
        margin: '0 auto',
        fontFamily: 'sans-serif',
      }}
    >
      <DemoNav current="wizard" />

      <h1 style={{ marginBottom: '12px', fontSize: '24px' }}>
        Multi-Step Form Wizard
      </h1>
      <p style={{ color: '#666', marginBottom: '24px', lineHeight: 1.5 }}>
        Minh hoạ <code>createWizardState</code>, <code>validateStep</code>,{' '}
        <code>goNext</code> / <code>goPrev</code> và <code>completedSteps</code>
        . State là bất biến — mỗi lần điều hướng trả về một state mới.
      </p>

      {/* Step indicator, driven by isStepCompleted */}
      <ol
        style={{
          display: 'flex',
          gap: '8px',
          listStyle: 'none',
          padding: 0,
          marginBottom: '24px',
        }}
      >
        {wizard.steps.map((step, index) => {
          const isCurrent = index === wizard.currentStepIndex;
          const done = isStepCompleted(wizard, index);
          return (
            <li
              key={step.id}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                border: '1px solid',
                borderColor: isCurrent ? '#0066cc' : '#d7dee6',
                background: isCurrent ? '#e8f1fc' : done ? '#eaf7ee' : '#fff',
                color: isCurrent ? '#0b4f9e' : done ? '#1c7a3d' : '#667',
                fontWeight: isCurrent ? 600 : 400,
              }}
            >
              {done ? '✓ ' : `${index + 1}. `}
              {step.title}
            </li>
          );
        })}
      </ol>

      {submitted ? (
        <div
          style={{
            padding: '16px',
            borderRadius: '8px',
            background: '#eaf7ee',
            border: '1px solid #b7e2c4',
          }}
        >
          <strong style={{ color: '#1c7a3d' }}>🎉 Hoàn tất!</strong>
          <pre style={{ marginTop: '8px', fontSize: '12px' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>
            Bước {wizard.currentStepIndex + 1}/{wizard.totalSteps}:{' '}
            {wizard.currentStep.title}
          </h2>

          {/* Only the current step's fields are rendered */}
          <MultiFieldInput
            key={wizard.currentStep.id}
            fieldDescriptions={wizard.currentStep.fields}
            properties={data}
            onChange={setData}
            layout={{ type: 'grid', columns: 2, gap: 16 }}
          />

          {Object.keys(errors).length > 0 && (
            <ul style={{ color: '#c0392b', fontSize: '13px' }}>
              {Object.entries(errors).map(([field, messages]) => (
                <li key={field}>
                  {field}: {messages.join(', ')}
                </li>
              ))}
            </ul>
          )}

          <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setWizard(goPrev(wizard))}
              disabled={!canGoPrev(wizard)}
              style={{ padding: '10px 18px', cursor: 'pointer' }}
            >
              ← Quay lại
            </button>

            {wizard.isLastStep ? (
              <button
                type="button"
                onClick={handleFinish}
                style={{
                  padding: '10px 18px',
                  cursor: 'pointer',
                  background: '#1c7a3d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                }}
              >
                Hoàn tất
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                style={{
                  padding: '10px 18px',
                  cursor: 'pointer',
                  background: '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                }}
              >
                Tiếp theo →
              </button>
            )}
          </div>
        </>
      )}
    </main>
  );
}
