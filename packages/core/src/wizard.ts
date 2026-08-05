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

export function createWizardState(
  steps: FormStep[],
  initialStepIndex = 0
): WizardState {
  const safeIndex = Math.max(0, Math.min(initialStepIndex, steps.length - 1));
  return {
    currentStepIndex: safeIndex,
    totalSteps: steps.length,
    isFirstStep: safeIndex === 0,
    isLastStep: safeIndex === steps.length - 1,
    currentStep: steps[safeIndex] || { id: '', title: '', fields: [] },
    steps,
    completedSteps: [],
  };
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
