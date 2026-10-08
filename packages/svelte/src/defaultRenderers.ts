import type { FieldRendererProps } from '@dynamic-field-kit/core';
import type { Component } from 'svelte';
import CheckboxRenderer from './renderers/CheckboxRenderer.svelte';
import DateRenderer from './renderers/DateRenderer.svelte';
import DateTimeLocalRenderer from './renderers/DateTimeLocalRenderer.svelte';
import EmailRenderer from './renderers/EmailRenderer.svelte';
import FileRenderer from './renderers/FileRenderer.svelte';
import NumberRenderer from './renderers/NumberRenderer.svelte';
import PasswordRenderer from './renderers/PasswordRenderer.svelte';
import RadioRenderer from './renderers/RadioRenderer.svelte';
import RangeRenderer from './renderers/RangeRenderer.svelte';
import SelectRenderer from './renderers/SelectRenderer.svelte';
import TextareaRenderer from './renderers/TextareaRenderer.svelte';
import TextRenderer from './renderers/TextRenderer.svelte';
import TimeRenderer from './renderers/TimeRenderer.svelte';

/** A component that renders one field from core's renderer props. */
export type FieldRenderer = Component<FieldRendererProps>;

/**
 * The renderers used for a field type nobody registered a renderer for: plain
 * HTML controls, unstyled.
 */
export const defaultRenderersMap: Record<string, FieldRenderer> = {
  text: TextRenderer,
  number: NumberRenderer,
  password: PasswordRenderer,
  email: EmailRenderer,
  textarea: TextareaRenderer,
  checkbox: CheckboxRenderer,
  select: SelectRenderer,
  radio: RadioRenderer,
  range: RangeRenderer,
  file: FileRenderer,
  date: DateRenderer,
  time: TimeRenderer,
  'datetime-local': DateTimeLocalRenderer,
  switch: CheckboxRenderer,
};

export function getDefaultRenderer(type: string): FieldRenderer | undefined {
  return defaultRenderersMap[type];
}
