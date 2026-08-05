import type { FieldDescription, Properties } from './types';

export function isFieldGroup(
  field: FieldDescription
): field is FieldDescription & { fields: FieldDescription[] } {
  return Array.isArray(field.fields);
}

export function createGroupItem(field: FieldDescription): Properties {
  return field.defaultItem ? { ...field.defaultItem } : {};
}

export function canAddGroupItem(
  field: FieldDescription,
  items: Properties[]
): boolean {
  return field.maxItems === undefined || items.length < field.maxItems;
}

export function canRemoveGroupItem(
  field: FieldDescription,
  items: Properties[]
): boolean {
  return field.minItems === undefined || items.length > field.minItems;
}

export function moveGroupItem(
  items: Properties[],
  fromIndex: number,
  toIndex: number
): Properties[] {
  if (
    fromIndex < 0 ||
    fromIndex >= items.length ||
    toIndex < 0 ||
    toIndex >= items.length
  ) {
    return items;
  }
  const result = [...items];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

export function swapGroupItems(
  items: Properties[],
  indexA: number,
  indexB: number
): Properties[] {
  if (
    indexA < 0 ||
    indexA >= items.length ||
    indexB < 0 ||
    indexB >= items.length
  ) {
    return items;
  }
  const result = [...items];
  const temp = result[indexA];
  result[indexA] = result[indexB];
  result[indexB] = temp;
  return result;
}

export function insertGroupItem(
  items: Properties[],
  index: number,
  newItem: Properties = {}
): Properties[] {
  const safeIndex = Math.max(0, Math.min(index, items.length));
  const result = [...items];
  result.splice(safeIndex, 0, newItem);
  return result;
}

export function focusFirstInvalidField(
  containerOrForm?: HTMLElement | null
): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  const root = containerOrForm || document.body;
  const invalidElement = root.querySelector<HTMLElement>(
    '[aria-invalid="true"], input:invalid, select:invalid, textarea:invalid'
  );
  if (invalidElement && typeof invalidElement.focus === 'function') {
    invalidElement.focus();
    if (typeof invalidElement.scrollIntoView === 'function') {
      invalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return true;
  }
  return false;
}
