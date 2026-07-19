import { assertType, expectTypeOf, test } from 'vitest';
import type {
  FieldDescription,
  FieldRendererProps,
  FieldTypeMap,
  Properties,
} from '../src';

// Apps augment FieldTypeMap to register field types; the augmentation must
// still resolve. This mirrors how a consuming app extends the interface.
declare module '../src' {
  interface FieldTypeMap {
    customType: { id: string };
  }
}

test('Properties is a string-keyed record of unknown', () => {
  expectTypeOf<Properties>().toEqualTypeOf<Record<string, unknown>>();
  assertType<Properties>({ a: 1, b: 'x', c: true, d: { nested: true } });
  assertType<Properties>({});
});

test('FieldRendererProps narrows value to its type parameter', () => {
  expectTypeOf<FieldRendererProps<string>['value']>().toEqualTypeOf<
    string | undefined
  >();
  expectTypeOf<FieldRendererProps<number>['value']>().toEqualTypeOf<
    number | undefined
  >();

  assertType<FieldRendererProps<string>>({
    value: 'test',
    label: 'Label',
    placeholder: 'Enter value',
    required: true,
    disabled: false,
    readOnly: false,
    error: ['bad'],
    options: [{ label: 'Option 1' }],
    className: 'c',
    description: 'help',
    onValueChange: (v) => expectTypeOf(v).toEqualTypeOf<string>(),
  });

  assertType<FieldRendererProps>({});
});

test('FieldRendererProps rejects a value of the wrong type', () => {
  // @ts-expect-error - value must be a number for FieldRendererProps<number>
  assertType<FieldRendererProps<number>>({ value: 'not a number' });

  // @ts-expect-error - onValueChange must accept a number, not a string
  const cb: FieldRendererProps<number>['onValueChange'] = (v: string) => v;
  void cb;
});

test('FieldDescription accepts a minimal and a fully-populated shape', () => {
  assertType<FieldDescription>({ name: 'username', type: 'text' });

  assertType<FieldDescription>({
    name: 'email',
    type: 'text',
    label: 'Email',
    placeholder: 'Enter email',
    required: true,
    disabled: false,
    className: 'c',
    description: 'desc',
    options: [{ label: 'o' }],
    props: { maxLength: 5 },
    appearCondition: (data) => data.x === 1,
    validate: (value) => (typeof value === 'string' ? undefined : 'bad'),
    disabledCondition: (data) => data.locked === true,
    readOnlyCondition: (data, rootData) => (rootData ?? data).frozen === true,
    computeValue: (data) => data.a,
    fields: [{ name: 'child', type: 'text' }],
    defaultItem: {},
    keyField: 'id',
    minItems: 0,
    maxItems: 3,
    addLabel: 'Add',
    removeLabel: 'Remove',
  });
});

test('FieldDescription requires name and type of the right types', () => {
  // @ts-expect-error - missing required 'type'
  assertType<FieldDescription>({ name: 'x' });

  // @ts-expect-error - missing required 'name'
  assertType<FieldDescription>({ type: 'text' });

  // @ts-expect-error - name must be a string
  assertType<FieldDescription>({ name: 123, type: 'text' });
});

test('validate must return string | string[] | undefined', () => {
  // @ts-expect-error - validate may not return a number
  const bad: FieldDescription['validate'] = () => 42;
  void bad;

  const ok: FieldDescription['validate'] = () => ['e1', 'e2'];
  void ok;
});

test('condition hooks return booleans', () => {
  expectTypeOf<
    NonNullable<FieldDescription['appearCondition']>
  >().returns.toEqualTypeOf<boolean>();
  expectTypeOf<
    NonNullable<FieldDescription['disabledCondition']>
  >().returns.toEqualTypeOf<boolean>();
});

test('FieldTypeMap augmentation resolves', () => {
  expectTypeOf<FieldTypeMap['customType']>().toEqualTypeOf<{ id: string }>();
  assertType<FieldDescription>({ name: 'c', type: 'customType' });
});
