import { validators } from '@dynamic-field-kit/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  basicsFields,
  conditionFields,
  formStateFields,
} from '../../../example/shared/schemas';
import { FormDemo } from '../demos/FormDemo';

const layouts = {
  column: 'column',
  row: 'row',
  'grid (2 columns)': { type: 'grid', columns: 2, gap: 16 },
  responsive: {
    type: 'responsive',
    mobile: 'column',
    desktop: { type: 'grid', columns: 2, gap: 16 },
  },
} as const;

const meta = {
  title: 'Forms',
  component: FormDemo,
  argTypes: {
    fields: { table: { disable: true } },
    initialValues: { control: 'object' },
    layout: {
      options: Object.keys(layouts),
      mapping: layouts,
      control: { type: 'select' },
    },
    validateOnBlur: { control: 'boolean' },
    validateOnChange: { control: 'boolean' },
    showDevTools: { control: 'boolean' },
  },
  args: {
    layout: 'column',
    validateOnBlur: true,
    validateOnChange: false,
    showDevTools: false,
  },
} satisfies Meta<typeof FormDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Plain fields, a computed full name and a repeatable group of contacts. */
export const Basics: Story = {
  args: { fields: basicsFields(), layout: layouts['grid (2 columns)'] },
};

/**
 * Built-in validators through `useDynamicForm`. Submit an empty form to see
 * every message; turn on `validateOnChange` to see them while typing.
 */
export const Validation: Story = {
  args: {
    fields: formStateFields(validators),
    initialValues: { satisfaction: 8 },
    showDevTools: true,
  },
};

/**
 * Options that depend on another field, a field shown only when "Yes" is
 * chosen, and one disabled while "Locked" is.
 */
export const Conditions: Story = {
  args: {
    fields: conditionFields(validators),
    initialValues: { country: 'VN', enableExtra: 'no' },
    validateOnChange: true,
  },
};
