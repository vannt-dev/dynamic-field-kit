import { describe, expect, it } from 'vitest';
import {
  createWizardState,
  validateStep,
  canGoNext,
  canGoPrev,
  FormStep,
} from '../src/wizard';

describe('Wizard Core Module', () => {
  const steps: FormStep[] = [
    {
      id: 'step1',
      title: 'Personal Info',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          validate: (val) => (!val ? 'Name is required' : undefined),
        },
      ],
    },
    {
      id: 'step2',
      title: 'Account Settings',
      fields: [
        {
          name: 'email',
          type: 'email',
          required: true,
          validate: (val) => (!val ? 'Email is required' : undefined),
        },
      ],
    },
  ];

  it('creates wizard state properly', () => {
    const state = createWizardState(steps, 0);
    expect(state.currentStepIndex).toBe(0);
    expect(state.isFirstStep).toBe(true);
    expect(state.isLastStep).toBe(false);
    expect(state.currentStep.id).toBe('step1');
  });

  it('validates step correctly', () => {
    const step1 = steps[0];
    const invalidRes = validateStep(step1, {});
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.errors.name).toEqual(['Name is required']);

    const validRes = validateStep(step1, { name: 'Alice' });
    expect(validRes.valid).toBe(true);
  });

  it('navigates through steps correctly', () => {
    const state0 = createWizardState(steps, 0);
    expect(canGoNext(state0)).toBe(true);
    expect(canGoPrev(state0)).toBe(false);

    const state1 = createWizardState(steps, 1);
    expect(canGoNext(state1)).toBe(false);
    expect(canGoPrev(state1)).toBe(true);
  });
});
