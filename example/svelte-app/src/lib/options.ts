/** An option as the demos write it: `{ label, value }`, or just the value. */
export type Option = { label?: string; value: string | number } | string;

export const optionValue = (option: Option) =>
  typeof option === 'string' ? option : option.value;

export const optionLabel = (option: Option) =>
  typeof option === 'string' ? option : (option.label ?? String(option.value));
