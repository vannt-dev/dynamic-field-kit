// The list behind `ErrorSummary`: which fields are invalid, in the order the
// form shows them, and the DOM id each one renders with. Kept in the adapter
// rather than in core: it is built from `collectFieldPaths` and `makeFieldId`,
// which the oldest core in the peer range already has, and the ids of nested
// fields are this adapter's own.
import {
  collectFieldPaths,
  isFieldGroup,
  makeFieldId,
} from '@dynamic-field-kit/core';
import type { FieldDescription, Properties } from '@dynamic-field-kit/core';
import { sectionFieldsOf } from './section';

/** The id namespace of the fields inside one item of a repeatable group. */
export function groupItemIdPrefix(
  idPrefix: string,
  groupName: string,
  index: number,
): string {
  return `${idPrefix}-${groupName}-${index}`;
}

/** The id namespace of the fields inside a section. */
export function sectionIdPrefix(idPrefix: string, sectionName: string): string {
  return `${idPrefix}-${sectionName}`;
}

/** One invalid field, as `listInvalidFields` reports it. */
export interface InvalidField {
  /** The key of the error map: `email`, `contacts[0].phone`, `address.city`. */
  path: string;
  /**
   * The field's label (its name when it has none), led by the label of the
   * group item or section it sits in: `Contacts 2: Phone`. The path itself
   * for an error that belongs to no field of the list.
   */
  label: string;
  /** Every message of the field, never empty. */
  messages: string[];
  /**
   * The DOM id the field renders with under `idPrefix`. Undefined when no
   * prefix was given, or when the path is not a field of the list (an error
   * a server reported against something the form does not show).
   */
  id?: string;
}

interface Located {
  label: string;
  id: string;
}

function locate(
  fields: FieldDescription[],
  path: string,
  idPrefix: string,
): Located | undefined {
  for (const field of fields) {
    const { name } = field;
    const title = field.label ?? name;
    const section = sectionFieldsOf(field);
    if (section) {
      if (path.startsWith(`${name}.`)) {
        const inner = locate(
          section,
          path.slice(name.length + 1),
          sectionIdPrefix(idPrefix, name),
        );
        if (inner) {
          return { label: `${title}: ${inner.label}`, id: inner.id };
        }
      }
      continue;
    }
    if (isFieldGroup(field)) {
      const match = path.startsWith(`${name}[`)
        ? /^\[(\d+)\]\.(.+)$/.exec(path.slice(name.length))
        : null;
      if (match) {
        const index = Number(match[1]);
        const inner = locate(
          field.fields,
          match[2],
          groupItemIdPrefix(idPrefix, name, index),
        );
        if (inner) {
          return {
            label: `${title} ${index + 1}: ${inner.label}`,
            id: inner.id,
          };
        }
      }
      continue;
    }
    if (path === name) {
      return { label: title, id: makeFieldId(field, idPrefix) };
    }
  }
  return undefined;
}

export interface ListInvalidFieldsInput {
  fields: FieldDescription[];
  data: Properties;
  /** An error map keyed by path, such as `useDynamicForm().errors`. */
  errors: Record<string, string[]>;
  /**
   * The `idPrefix` the form's `MultiFieldInput` was given. With it every
   * entry carries the DOM id of its field.
   */
  idPrefix?: string;
}

/**
 * The fields that have an error, in the order the form shows them (the order
 * of the field list, groups and sections walked in place). An error whose
 * path is not a visible field of the list - one a server sent back, say -
 * comes after them, labelled by its path, so nothing in the map is dropped.
 */
export function listInvalidFields({
  fields,
  data,
  errors,
  idPrefix,
}: ListInvalidFieldsInput): InvalidField[] {
  const has = (path: string) =>
    Array.isArray(errors[path]) && errors[path].length > 0;
  const ordered = collectFieldPaths(fields, data).filter(has);
  const seen = new Set(ordered);
  const rest = Object.keys(errors).filter(
    (path) => has(path) && !seen.has(path),
  );
  return [...ordered, ...rest].map((path) => {
    // An empty prefix still walks the list, for the label.
    const found = locate(fields, path, idPrefix ?? '');
    return {
      path,
      label: found?.label ?? path,
      messages: errors[path],
      id: idPrefix === undefined ? undefined : found?.id,
    };
  });
}

const FOCUSABLE = [
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Moves focus to the field rendered with this id and scrolls it into view.
 * An element that cannot take focus itself - the built-in radio group puts
 * the id on its wrapper - hands it to the first control inside. False when
 * there is nothing to focus.
 */
export function focusFieldById(id: string | undefined): boolean {
  if (id === undefined || typeof document === 'undefined') {
    return false;
  }
  const element = document.getElementById(id);
  if (!element) {
    return false;
  }
  const target = element.matches(FOCUSABLE)
    ? element
    : element.querySelector<HTMLElement>(FOCUSABLE);
  if (!target) {
    return false;
  }
  target.focus();
  if (typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ block: 'center' });
  }
  return true;
}
