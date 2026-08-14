import {
  applyComputedValues,
  canAddGroupItem,
  canRemoveGroupItem,
  createGroupItem,
  validateFields,
  FieldDescription,
  Properties,
} from '@dynamic-field-kit/core';
import type { ValidationResult } from '@dynamic-field-kit/core';
import type { Component } from 'vue';
import { computed, defineComponent, h, PropType, reactive, watch } from 'vue';
import { layoutRegistry } from '../layout';
import { LayoutConfig } from '../types/layout';
import FieldInput from './FieldInput';

function resolveLayout(layout?: LayoutConfig) {
  if (!layout) {
    return { type: 'column', config: {} };
  }
  if (typeof layout === 'string') {
    return { type: layout, config: {} };
  }
  return { type: layout.type, config: layout };
}

// Forward-declared with an explicit type so the recursive h() call inside
// renderGroupField doesn't force TypeScript to infer MultiFieldInput's type
// from within its own initializer (which fails to build: "implicitly has
// type 'any' because it does not have a type annotation and is referenced
// ... in its own initializer"). Assigned once MultiFieldInput exists below.
// Must be declared before, and assigned after, MultiFieldInput is defined,
// so it can't be a `const` despite only ever being assigned once.
// eslint-disable-next-line prefer-const
let multiFieldInputSelfRef: Component;

// Repeatable field groups render a nested MultiFieldInput per item, so this
// component renders itself recursively (see renderGroupField below) rather
// than delegating to a separate group component. A separate file importing
// both MultiFieldInput and FieldInput (which would need to import it back)
// breaks Vue's declaration-file generation with a circular type alias.
const MultiFieldInput = /* @__PURE__ */ defineComponent({
  name: 'MultiFieldInput',

  props: {
    fieldDescriptions: {
      type: Array as PropType<FieldDescription[]>,
      required: true,
    },
    properties: {
      type: Object as PropType<Properties>,
      default: () => ({}),
    },
    onChange: {
      type: Function as PropType<(data: Properties) => void>,
      default: undefined,
    },
    layout: {
      type: [Object, String] as PropType<LayoutConfig>,
      default: undefined,
    },
    // Top-level form data, threaded down through repeatable groups so a nested
    // field's appearCondition/computeValue can read the root form. Omitted at
    // the top level, where the form's own data is the root.
    rootData: {
      type: Object as PropType<Properties>,
      default: undefined,
    },
    onValidityChange: {
      type: Function as PropType<(result: ValidationResult) => void>,
      default: undefined,
    },
    // Called with a field's name when it loses focus. Touched state is tracked
    // internally either way; this is the hook for driving an external form
    // store - pass `useDynamicForm`'s `handleBlur` to get its `touched` map and
    // `validateOnBlur` behaviour.
    onBlurField: {
      type: Function as PropType<(fieldName: string) => void>,
      default: undefined,
    },
  },

  setup(props) {
    // A single reactive object, mutated in place (never reassigned), so Vue's
    // per-property dependency tracking lets each FieldInput re-render only
    // when the specific key it reads actually changes.
    const data = reactive<Properties>({});
    const touchedFields = reactive<Record<string, boolean>>({});

    function handleBlurField(key: string) {
      touchedFields[key] = true;
      props.onBlurField?.(key);
    }

    watch(
      () => props.properties,
      (newProps) => {
        Object.keys(data).forEach((key) => delete data[key]);
        if (newProps) {
          Object.assign(data, newProps);
        }
        Object.assign(
          data,
          applyComputedValues(
            props.fieldDescriptions,
            { ...data },
            props.rootData
          )
        );
      },
      { immediate: true, deep: true }
    );

    watch(
      () => [props.fieldDescriptions, { ...data }] as const,
      () => {
        props.onValidityChange?.(
          validateFields(props.fieldDescriptions, { ...data }, props.rootData)
        );
      },
      { immediate: true, deep: true }
    );

    const visibleFields = computed(() =>
      props.fieldDescriptions.filter(
        (f) =>
          !f.appearCondition || f.appearCondition(data, props.rootData ?? data)
      )
    );

    const layoutInfo = computed(() => resolveLayout(props.layout));

    const Layout = computed(() => layoutRegistry.get(layoutInfo.value.type));

    const commitData = (next: Properties) => {
      // Assign in place (never delete+replace) so Vue's per-key dependency
      // tracking only invalidates the keys that actually changed value.
      Object.assign(
        data,
        applyComputedValues(props.fieldDescriptions, next, props.rootData)
      );
      props.onChange?.({ ...data });
    };

    const handleValueChange = (value: unknown, key: string) => {
      commitData({ ...data, [key]: value });
    };

    const getItems = (field: FieldDescription): Properties[] => {
      const value = data[field.name];
      return Array.isArray(value) ? (value as Properties[]) : [];
    };

    const handleGroupItemChange = (
      field: FieldDescription,
      index: number,
      next: Properties
    ) => {
      const items = getItems(field).slice();
      items[index] = next;
      commitData({ ...data, [field.name]: items });
    };

    const handleGroupItemAdd = (field: FieldDescription) => {
      const items = getItems(field);
      if (!canAddGroupItem(field, items)) {
        return;
      }
      commitData({ ...data, [field.name]: [...items, createGroupItem(field)] });
    };

    const handleGroupItemRemove = (field: FieldDescription, index: number) => {
      const items = getItems(field);
      if (!canRemoveGroupItem(field, items)) {
        return;
      }
      commitData({
        ...data,
        [field.name]: items.filter((_, i) => i !== index),
      });
    };

    const itemKey = (
      field: FieldDescription,
      item: Properties,
      index: number
    ): string | number =>
      field.keyField
        ? (item[field.keyField] as string | number) ?? index
        : index;

    const renderGroupField = (field: FieldDescription) => {
      const items = getItems(field);
      const fields = field.fields ?? [];
      const groupName = field.label ?? field.name;
      const addText = field.addLabel ?? 'Add';
      const removeText = field.removeLabel ?? 'Remove';

      return h('div', { class: field.className }, [
        field.label ? h('div', field.label) : null,
        ...items.map((item, index) =>
          h(
            'div',
            {
              key: itemKey(field, item, index),
              style: { display: 'flex', alignItems: 'flex-start', gap: '8px' },
            },
            [
              h('div', { style: { flex: 1 } }, [
                h(multiFieldInputSelfRef, {
                  fieldDescriptions: fields,
                  properties: item,
                  rootData: props.rootData ?? data,
                  onChange: (next: Properties) =>
                    handleGroupItemChange(field, index, next),
                }),
              ]),
              h(
                'button',
                {
                  type: 'button',
                  'aria-label': `${removeText} ${groupName} ${index + 1}`,
                  onClick: () => handleGroupItemRemove(field, index),
                  disabled: !canRemoveGroupItem(field, items),
                },
                removeText
              ),
            ]
          )
        ),
        h(
          'button',
          {
            type: 'button',
            'aria-label': `${addText} ${groupName}`,
            onClick: () => handleGroupItemAdd(field),
            disabled: !canAddGroupItem(field, items),
          },
          addText
        ),
      ]);
    };

    return () => {
      if (!Layout.value) {
        return h('div', `Unknown layout: ${layoutInfo.value.type}`);
      }

      const children = visibleFields.value.map((f) =>
        f.fields
          ? renderGroupField(f)
          : h(FieldInput, {
              key: f.name,
              fieldDescription: f,
              renderInfos: data,
              rootData: props.rootData ?? data,
              touched: Boolean(touchedFields[f.name]),
              onValueChangeField: handleValueChange,
              onBlurField: handleBlurField,
            })
      );

      return Layout.value({
        config: layoutInfo.value.config,
        children,
      });
    };
  },
});

multiFieldInputSelfRef = MultiFieldInput;

export default MultiFieldInput;
