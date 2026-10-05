import '@dynamic-field-kit/core';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    number: number;
    select: string;
    email: string;
    password: string;
    date: string;
    radio: string;
    range: number;
    checkbox: boolean;
    switch: boolean;
    // Repeatable field groups never go through fieldRegistry, so any key
    // works here - 'group' just reads clearly in the schema below.
    group: unknown;
  }
}
