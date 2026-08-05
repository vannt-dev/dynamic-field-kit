import { FieldDescription, Properties } from './types';
import { validateFields, ValidationResult } from './validation';

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: FieldDescription[];
}

export interface WizardState {
  currentStepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  currentStep: FormStep;
  steps: FormStep[];
  completedSteps: number[];
}

const EMPTY_STEP: FormStep = { id: '', title: '', fields: [] };

function clampIndex(index: number, stepCount: number): number {
  return Math.max(0, Math.min(index, stepCount - 1));
}

export function createWizardState(
  steps: FormStep[],
  initialStepIndex = 0
): WizardState {
  const safeIndex = clampIndex(initialStepIndex, steps.length);
  return {
    currentStepIndex: safeIndex,
    totalSteps: steps.length,
    isFirstStep: safeIndex === 0,
    isLastStep: safeIndex === steps.length - 1,
    currentStep: steps[safeIndex] || EMPTY_STEP,
    steps,
    completedSteps: [],
  };
}

/** Rebuilds the derived flags for a new position. Never mutates `state`. */
function atStep(
  state: WizardState,
  index: number,
  completedSteps: number[]
): WizardState {
  const safeIndex = clampIndex(index, state.steps.length);
  return {
    ...state,
    currentStepIndex: safeIndex,
    isFirstStep: safeIndex === 0,
    isLastStep: safeIndex === state.steps.length - 1,
    currentStep: state.steps[safeIndex] || EMPTY_STEP,
    completedSteps,
  };
}

function withCompleted(completedSteps: number[], index: number): number[] {
  if (completedSteps.includes(index)) {
    return completedSteps;
  }
  return [...completedSteps, index].sort((a, b) => a - b);
}

export function validateStep(
  step: FormStep,
  data: Properties
): ValidationResult {
  return validateFields(step.fields, data);
}

export function canGoNext(state: WizardState): boolean {
  return state.currentStepIndex < state.totalSteps - 1;
}

export function canGoPrev(state: WizardState): boolean {
  return state.currentStepIndex > 0;
}

/** Has this step already been left behind via `goNext` or marked complete? */
export function isStepCompleted(state: WizardState, index: number): boolean {
  return state.completedSteps.includes(index);
}

/**
 * Records a step as completed. Defaults to the current step. Returns the same
 * state when the index is out of range or already recorded.
 */
export function markStepCompleted(
  state: WizardState,
  index: number = state.currentStepIndex
): WizardState {
  if (index < 0 || index >= state.steps.length) {
    return state;
  }
  const completedSteps = withCompleted(state.completedSteps, index);
  if (completedSteps === state.completedSteps) {
    return state;
  }
  return { ...state, completedSteps };
}

/**
 * Moves to `index`, clamped to the available steps. Jumping around does not
 * mark anything completed - only `goNext` and `markStepCompleted` do that.
 */
export function goToStep(state: WizardState, index: number): WizardState {
  return atStep(state, index, state.completedSteps);
}

/**
 * Advances one step, recording the step being left as completed. Returns the
 * same state when already on the last step, so callers can compare identity.
 * Validate first with `validateStep` when the step must be valid to leave.
 */
export function goNext(state: WizardState): WizardState {
  if (!canGoNext(state)) {
    return state;
  }
  return atStep(
    state,
    state.currentStepIndex + 1,
    withCompleted(state.completedSteps, state.currentStepIndex)
  );
}

/** Goes back one step, keeping the completed set intact. */
export function goPrev(state: WizardState): WizardState {
  if (!canGoPrev(state)) {
    return state;
  }
  return atStep(state, state.currentStepIndex - 1, state.completedSteps);
}
