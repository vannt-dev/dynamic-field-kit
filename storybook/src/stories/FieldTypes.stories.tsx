import type { Meta, StoryObj } from '@storybook/react-vite';
import { fieldTypeSamples } from '../../../example/shared/schemas';
import { FieldPlayground } from '../demos/FieldPlayground';

// One story per built-in field type, each taking its field from the shared
// schemas. The controls are merged over that field.
const samples = fieldTypeSamples();

const meta = {
  title: 'Field types',
  component: FieldPlayground,
  argTypes: {
    field: { table: { disable: true } },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    description: { control: 'text' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: { required: false, disabled: false },
} satisfies Meta<typeof FieldPlayground>;

export default meta;
type Story = StoryObj<typeof meta>;

function typeStory(type: string): Story {
  const field = samples[type];
  return {
    name: type,
    args: { field, label: field.label, placeholder: field.placeholder },
  };
}

export const Text = typeStory('text');
export const NumberField = typeStory('number');
export const Password = typeStory('password');
export const Email = typeStory('email');
export const Textarea = typeStory('textarea');
export const Checkbox = typeStory('checkbox');
export const Select = typeStory('select');
export const Radio = typeStory('radio');
export const Range = typeStory('range');
export const File = typeStory('file');
export const DateField = typeStory('date');
export const Time = typeStory('time');
export const DatetimeLocal = typeStory('datetime-local');
export const Switch = typeStory('switch');
