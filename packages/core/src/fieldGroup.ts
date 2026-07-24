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
