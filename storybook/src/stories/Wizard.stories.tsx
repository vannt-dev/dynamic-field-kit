import { validators } from '@dynamic-field-kit/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { wizardSteps } from '../../../example/shared/schemas';
import { WizardDemo } from '../demos/WizardDemo';

const meta = {
  title: 'Wizard',
  component: WizardDemo,
  argTypes: { steps: { table: { disable: true } } },
} satisfies Meta<typeof WizardDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three steps; "Next" validates the step before leaving it. */
export const ThreeSteps: Story = {
  args: { steps: wizardSteps(validators) },
};
