import '@dynamic-field-kit/core';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    number: number;
    select: string;
    // Repeatable field groups never go through fieldRegistry, so any key
    // works here - 'group' just reads clearly in the schema below.
    group: unknown;
  }
}
