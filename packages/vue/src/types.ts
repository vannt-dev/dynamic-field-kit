import { FieldTypeMap, Properties } from "@dynamic-field-kit/core";

export type FieldTypeKey =
  keyof FieldTypeMap extends never
    ? string
    : keyof FieldTypeMap & string;

export interface FieldDescription {
  name: string;
  type: FieldTypeKey;
  label?: string;
  appearCondition?: (data: Properties) => boolean;
  options?: Properties[];
  className?: string;
  description?: string;
}