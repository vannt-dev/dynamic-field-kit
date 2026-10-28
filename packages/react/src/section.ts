// Kept in each adapter rather than in core: an adapter may only call core APIs
// that exist in the oldest core its peer range allows, and these are newer.
import { evaluateCondition } from '@dynamic-field-kit/core';
import type { FieldDescription, Properties } from '@dynamic-field-kit/core';

const NO_VALUES: Properties = Object.freeze({});

/**
 * The fields of a titled section, or undefined for any other field. A field
 * that also has `fields` is a repeatable group.
 */
export function sectionFieldsOf(
  field: FieldDescription,
): FieldDescription[] | undefined {
  return Array.isArray(field.section) && !Array.isArray(field.fields)
    ? field.section
    : undefined;
}

/** The object a section stores, or an empty one that keeps its identity. */
export function sectionValuesOf(data: Properties, name: string): Properties {
  const value = data[name];
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Properties)
    : NO_VALUES;
}

/**
 * The entries of one section, keyed from inside it: `address.street` becomes
 * `street`. An absent map stays absent, which a nested form reads as
 * "uncontrolled".
 */
export function sectionPathMap<T>(
  source: Record<string, T> | undefined,
  sectionName: string,
): Record<string, T> | undefined {
  if (source === undefined) {
    return undefined;
  }
  const scoped: Record<string, T> = {};
  const prefix = `${sectionName}.`;
  for (const [path, value] of Object.entries(source)) {
    if (path.startsWith(prefix) && path.length > prefix.length) {
      scoped[path.slice(prefix.length)] = value;
    }
  }
  return scoped;
}

/**
 * Whether a section is disabled, by its flag or by its condition (a function
 * or `disabledWhen`): the test
 * validation applies before it skips the section.
 */
export function isSectionDisabled(
  field: FieldDescription,
  data: Properties,
  rootData?: Properties,
): boolean {
  if (field.disabled === true) {
    return true;
  }
  // The rule of core's resolveDisabled, kept here so a core from before
  // `disabledWhen` (1.12, the oldest in the peer range) still honours it.
  if (field.disabledCondition) {
    return field.disabledCondition(data, rootData) === true;
  }
  return (
    field.disabledWhen !== undefined &&
    evaluateCondition(field.disabledWhen, data, rootData ?? data)
  );
}
