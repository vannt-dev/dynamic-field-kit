import { describe, expect, it } from 'vitest';
import {
  createWizardState,
  validateStep,
  canGoNext,
  canGoPrev,
  goNext,
  goPrev,
  goToStep,
  isStepCompleted,
  markStepCompleted,
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

  it('defaults to the first step', () => {
    const state = createWizardState(steps);
    expect(state.currentStepIndex).toBe(0);
    expect(state.currentStep.id).toBe('step1');
    expect(state.completedSteps).toEqual([]);
  });

  it('clamps an initial index past the last step', () => {
    const state = createWizardState(steps, 99);
    expect(state.currentStepIndex).toBe(1);
    expect(state.isLastStep).toBe(true);
    expect(state.isFirstStep).toBe(false);
  });

  it('clamps a negative initial index to the first step', () => {
    const state = createWizardState(steps, -5);
    expect(state.currentStepIndex).toBe(0);
    expect(state.isFirstStep).toBe(true);
  });

  it('stays usable when there are no steps', () => {
    const state = createWizardState([], 0);
    expect(state.totalSteps).toBe(0);
    expect(state.currentStep).toEqual({ id: '', title: '', fields: [] });
    expect(canGoNext(state)).toBe(false);
    expect(canGoPrev(state)).toBe(false);
  });

  it('reports a step with no fields as valid', () => {
    expect(validateStep({ id: 's', title: 'S', fields: [] }, {}).valid).toBe(
      true
    );
  });
});

describe('Wizard navigation', () => {
  const threeSteps: FormStep[] = [
    { id: 'a', title: 'A', fields: [] },
    { id: 'b', title: 'B', fields: [] },
    { id: 'c', title: 'C', fields: [] },
  ];

  it('advances to the next step', () => {
    const next = goNext(createWizardState(threeSteps));

    expect(next.currentStepIndex).toBe(1);
    expect(next.currentStep.id).toBe('b');
    expect(next.isFirstStep).toBe(false);
    expect(next.isLastStep).toBe(false);
  });

  it('marks the step it leaves as completed', () => {
    const next = goNext(createWizardState(threeSteps));

    expect(next.completedSteps).toEqual([0]);
    expect(isStepCompleted(next, 0)).toBe(true);
    expect(isStepCompleted(next, 1)).toBe(false);
  });

  it('accumulates completed steps across advances', () => {
    const state = goNext(goNext(createWizardState(threeSteps)));

    expect(state.currentStepIndex).toBe(2);
    expect(state.isLastStep).toBe(true);
    expect(state.completedSteps).toEqual([0, 1]);
  });

  it('does not advance past the last step', () => {
    const last = createWizardState(threeSteps, 2);

    expect(goNext(last)).toBe(last);
  });

  it('goes back a step', () => {
    const state = goPrev(goNext(createWizardState(threeSteps)));

    expect(state.currentStepIndex).toBe(0);
    expect(state.isFirstStep).toBe(true);
  });

  it('keeps completed steps when going back', () => {
    const state = goPrev(goNext(createWizardState(threeSteps)));

    expect(state.completedSteps).toEqual([0]);
  });

  it('does not go back past the first step', () => {
    const first = createWizardState(threeSteps);

    expect(goPrev(first)).toBe(first);
  });

  it('jumps to an arbitrary step without marking it completed', () => {
    const state = goToStep(createWizardState(threeSteps), 2);

    expect(state.currentStepIndex).toBe(2);
    expect(state.currentStep.id).toBe('c');
    expect(state.completedSteps).toEqual([]);
  });

  it('clamps a jump to the available range', () => {
    const state = createWizardState(threeSteps);

    expect(goToStep(state, 99).currentStepIndex).toBe(2);
    expect(goToStep(state, -5).currentStepIndex).toBe(0);
  });

  it('marks the current step completed on demand', () => {
    const state = markStepCompleted(createWizardState(threeSteps));

    expect(state.completedSteps).toEqual([0]);
    expect(state.currentStepIndex).toBe(0);
  });

  it('marks an explicit step completed, without duplicates', () => {
    let state = markStepCompleted(createWizardState(threeSteps), 2);
    state = markStepCompleted(state, 2);

    expect(state.completedSteps).toEqual([2]);
  });

  it('keeps completed steps in order', () => {
    let state = markStepCompleted(createWizardState(threeSteps), 2);
    state = markStepCompleted(state, 0);

    expect(state.completedSteps).toEqual([0, 2]);
  });

  it('ignores a completion mark outside the range', () => {
    const state = createWizardState(threeSteps);

    expect(markStepCompleted(state, 99)).toBe(state);
    expect(markStepCompleted(state, -1)).toBe(state);
  });

  it('does not mutate the state it is given', () => {
    const state = createWizardState(threeSteps);
    goNext(state);

    expect(state.currentStepIndex).toBe(0);
    expect(state.completedSteps).toEqual([]);
  });

  it('stays usable with no steps', () => {
    const empty = createWizardState([]);

    expect(goNext(empty)).toBe(empty);
    expect(goPrev(empty)).toBe(empty);
    expect(goToStep(empty, 3).currentStepIndex).toBe(0);
  });
});
