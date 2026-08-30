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

// The recursive h() call inside renderGroupField cannot name MultiFieldInput
// directly: that forces TypeScript to infer its type from within its own
// initializer, which fails to build with "implicitly has type 'any' because it
// does not have a type annotation and is referenced ... in its own
// initializer". A function declaration solves it twice over -- the explicit
// return type breaks the inference cycle, and the declaration is hoisted, so
// the initializer below can call it.
//
// It must stay a function rather than a module-scope
// `selfRef = MultiFieldInput` assignment. A bare top-level assignment is a side
// effect no bundler can drop, and it anchored MultiFieldInput -> FieldInput ->
// DynamicInput -> every default renderer into consumer bundles that imported
// none of them (~11.5 KB minified). A function body is not evaluated until it
// is called, so nothing is retained until something actually renders a group.
function selfRef(): Component {
  // Safe despite the forward reference: this body only runs during a render,
  // long after the module has finished evaluating.
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return MultiFieldInput;
}

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
            props.rootData,
          ),
        );
      },
      { immediate: true, deep: true },
    );

    watch(
      () => [props.fieldDescriptions, { ...data }] as const,
      () => {
        props.onValidityChange?.(
          validateFields(props.fieldDescriptions, { ...data }, props.rootData),
        );
      },
      { immediate: true, deep: true },
    );

    const visibleFields = computed(() =>
      props.fieldDescriptions.filter(
        (f) =>
          !f.appearCondition || f.appearCondition(data, props.rootData ?? data),
      ),
    );

    const layoutInfo = computed(() => resolveLayout(props.layout));

    const Layout = computed(() => layoutRegistry.get(layoutInfo.value.type));

    const commitData = (next: Properties) => {
      // Assign in place (never delete+replace) so Vue's per-key dependency
      // tracking only invalidates the keys that actually changed value.
      Object.assign(
        data,
        applyComputedValues(props.fieldDescriptions, next, props.rootData),
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
      next: Properties,
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
      index: number,
    ): string | number =>
      field.keyField
        ? ((item[field.keyField] as string | number) ?? index)
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
                h(selfRef(), {
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
                removeText,
              ),
            ],
          ),
        ),
        h(
          'button',
          {
            type: 'button',
            'aria-label': `${addText} ${groupName}`,
            onClick: () => handleGroupItemAdd(field),
            disabled: !canAddGroupItem(field, items),
          },
          addText,
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
            }),
      );

      return Layout.value({
        config: layoutInfo.value.config,
        children,
      });
    };
  },
});

export default MultiFieldInput;
