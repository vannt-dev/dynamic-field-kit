import {
  canGoPrev,
  createWizardState,
  goNext,
  goPrev,
  type FormStep,
  type Properties,
  validateStep,
} from '@dynamic-field-kit/core';
import { MultiFieldInput } from '@dynamic-field-kit/react';
import React, { useState } from 'react';

export interface WizardDemoProps {
  steps: FormStep[];
}

/** The core wizard state machine behind a React form, one step at a time. */
export function WizardDemo({ steps }: WizardDemoProps) {
  const [wizard, setWizard] = useState(() => createWizardState(steps));
  const [data, setData] = useState<Properties>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const isLast = wizard.currentStepIndex === steps.length - 1;

  // goNext does not validate: the wizard decides whether a step may be left.
  function next() {
    const result = validateStep(wizard.currentStep, data);
    setErrors(result.errors);
    setTouched((prev) => ({
      ...prev,
      ...Object.fromEntries(
        wizard.currentStep.fields.map((field) => [field.name, true]),
      ),
    }));
    if (!result.valid) {
      return;
    }
    if (isLast) {
      setDone(true);
    } else {
      setWizard(goNext(wizard));
    }
  }

  return (
    <div>
      <ol className="demo-steps" aria-label="Steps">
        {steps.map((step, index) => (
          <li
            key={step.id}
            aria-current={
              index === wizard.currentStepIndex ? 'step' : undefined
            }
          >
            {step.title}
          </li>
        ))}
      </ol>
      <MultiFieldInput
        key={wizard.currentStep.id}
        fieldDescriptions={wizard.currentStep.fields}
        properties={data}
        onChange={setData}
        errors={errors}
        touched={touched}
      />
      <div className="demo-actions">
        <button
          type="button"
          className="btn"
          disabled={!canGoPrev(wizard)}
          onClick={() => setWizard(goPrev(wizard))}
        >
          Back
        </button>
        <button type="button" className="btn btn--primary" onClick={next}>
          {isLast ? 'Finish' : 'Next'}
        </button>
      </div>
      {done && (
        <div className="demo-panel" role="status">
          <h3>Finished</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
