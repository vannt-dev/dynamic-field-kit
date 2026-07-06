import '@dynamic-field-kit/core';

declare module '@dynamic-field-kit/core' {
  export interface FieldTypeMap {
    text: string;
    number: number;
    // Repeatable field groups never go through fieldRegistry, so any key
    // works here - 'group' just reads clearly in the schema below.
    group: unknown;
  }
}
