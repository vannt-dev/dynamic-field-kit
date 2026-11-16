import { type FieldDescription, validators } from '@dynamic-field-kit/core';
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
    showErrorSummary: { control: 'boolean' },
    focusOnSubmit: {
      options: [undefined, 'summary', 'first-invalid'],
      control: { type: 'radio' },
    },
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

// Kept as data on purpose: this list survives `JSON.stringify`.
const comparisonFields = [
  { name: 'age', type: 'number', label: 'Age' },
  {
    name: 'guardian',
    type: 'text',
    label: 'Guardian (shown under 18)',
    appearWhen: { field: 'age', lt: 18 },
    requiredWhen: { field: 'age', lt: 16 },
  },
  {
    name: 'licence',
    type: 'text',
    label: 'Driving licence number (shown from 18)',
    appearWhen: { field: 'age', gte: 18 },
  },
  { name: 'email', type: 'email', label: 'Email' },
  {
    name: 'company',
    type: 'text',
    label: 'Company (shown for an @example.com address)',
    appearWhen: { field: 'email', contains: '@example.com' },
  },
] as FieldDescription[];

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
 * `ErrorSummary` above the form. Submit it empty: the errors are listed as
 * links that focus their field, and focus moves to the first invalid one.
 * Fix a field and it leaves the list.
 */
export const WithErrorSummary: Story = {
  args: {
    fields: formStateFields(validators),
    initialValues: { satisfaction: 8 },
    showErrorSummary: true,
    focusOnSubmit: 'first-invalid',
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

/**
 * Rules written as data: `gte` and `lt` compare the age as a number, and
 * `contains` looks for a substring. An empty age matches neither comparison,
 * so both age fields stay hidden until a number is typed.
 */
export const ComparisonConditions: Story = {
  args: {
    fields: comparisonFields,
    initialValues: { age: 17 },
    validateOnChange: true,
  },
};
