import type { Properties } from '@dynamic-field-kit/core';

/** An option as the select and radio renderers show it. */
export interface ShownOption {
  /** What the field's value becomes when the option is chosen. */
  value: unknown;
  label: string;
}

/**
 * Reads an option the way every adapter does: `value`, then `id`, then the
 * option itself for the value; `label`, then `name`, then the value as text
 * for the label.
 */
export function readOptions(options: Properties[] | undefined): ShownOption[] {
  return (options ?? []).map((option) => {
    const value = option.value ?? option.id ?? option;
    return { value, label: String(option.label ?? option.name ?? value) };
  });
}
