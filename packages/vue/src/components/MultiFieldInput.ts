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
import type { Component, Ref } from 'vue';
import {
  computed,
  defineComponent,
  getCurrentInstance,
  h,
  PropType,
  reactive,
  unref,
  watch,
} from 'vue';
import { layoutRegistry } from '../layout';
import { LayoutConfig } from '../types/layout';
import FieldInput from './FieldInput';

/**
 * The slice of `useDynamicForm`'s result `MultiFieldInput` needs to drive
 * itself. Its members are refs, so they are unwrapped on read.
 */
export interface DynamicFormBinding {
  data: Ref<Properties> | Properties;
  errors: Ref<Record<string, string[]>> | Record<string, string[]>;
  touched: Ref<Record<string, boolean>> | Record<string, boolean>;
  handleChange: (data: Properties) => void;
  handleBlur: (fieldName: string) => void;
}

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
    // Left undefined rather than `{}` when unset so the `form` shorthand can
    // tell "no properties passed" from "passed an empty object".
    properties: {
      type: Object as PropType<Properties>,
      default: undefined,
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
    // Namespace for generated field ids: a field renders with
    // `${idPrefix}-${name}`. Defaults to a value unique to this component
    // instance, so two forms containing the same field name do not emit
    // duplicate DOM ids. Pass a fixed string to pin ids
    // (`idPrefix="dfk-field"` restores the pre-1.6 ids), or set
    // `FieldDescription.id` per field.
    idPrefix: {
      type: String,
      default: undefined,
    },
    // Controlled touched map. When provided it is the single source of truth
    // and the internal tracker is bypassed, so `useDynamicForm().touched`
    // (updated by setFieldTouched/touchAll/handleSubmit, cleared by reset) is
    // what renderers actually see. Omit it to keep the internal, blur-only
    // tracker.
    touched: {
      type: Object as PropType<Record<string, boolean>>,
      default: undefined,
    },
    // Controlled error map. When supplied (directly or through `form`), it is
    // the renderer's source of truth instead of live per-field validation.
    errors: {
      type: Object as PropType<Record<string, string[]>>,
      default: undefined,
    },
    // Fires with the next touched map whenever a field is blurred.
    onTouchedChange: {
      type: Function as PropType<(touched: Record<string, boolean>) => void>,
      default: undefined,
    },
    // Shorthand wiring `properties`, `onChange`, `onBlurField` and `touched`
    // from a `useDynamicForm` result in one prop. Individually passed props
    // win over the ones derived from here.
    form: {
      type: Object as PropType<DynamicFormBinding>,
      default: undefined,
    },
  },

  setup(props, { expose }) {
    // A single reactive object, mutated in place (never reassigned), so Vue's
    // per-property dependency tracking lets each FieldInput re-render only
    // when the specific key it reads actually changes.
    const data = reactive<Properties>({});
    const touchedFields = reactive<Record<string, boolean>>({});

    // Unique per component instance, so two forms rendering the same field
    // name no longer emit duplicate DOM ids.
    const instanceUid = getCurrentInstance()?.uid ?? 0;
    const effectiveIdPrefix = computed(
      () => props.idPrefix ?? `dfk-${instanceUid}`,
    );

    // Explicit props take precedence over the `form` shorthand, so a caller
    // can pass `form` and still override one wire.
    const effectiveProperties = computed<Properties | undefined>(() =>
      props.properties !== undefined
        ? props.properties
        : props.form
          ? unref(props.form.data)
          : undefined,
    );
    const controlledTouched = computed<Record<string, boolean> | undefined>(
      () =>
        props.touched !== undefined
          ? props.touched
          : props.form
            ? unref(props.form.touched)
            : undefined,
    );
    const effectiveTouched = computed<Record<string, boolean>>(
      () => controlledTouched.value ?? touchedFields,
    );
    const effectiveErrors = computed<Record<string, string[]> | undefined>(
      () =>
        props.errors !== undefined
          ? props.errors
          : props.form
            ? unref(props.form.errors)
            : undefined,
    );
    const emitChange = (next: Properties) => {
      props.onChange?.(next);
      if (!props.onChange) {
        props.form?.handleChange(next);
      }
    };

    // Snapshot of the values this form opened with, for the `dirty` flag.
    const initialProperties: Properties = {
      ...(effectiveProperties.value ?? {}),
    };

    function handleBlurField(key: string) {
      if (controlledTouched.value === undefined) {
        touchedFields[key] = true;
      }
      props.onTouchedChange?.({ ...effectiveTouched.value, [key]: true });
      if (props.onBlurField) {
        props.onBlurField(key);
      } else {
        props.form?.handleBlur(key);
      }
    }

    /**
     * Clears the internally tracked touched state. Only meaningful in
     * uncontrolled mode - when `touched` is passed, resetting the form store
     * (e.g. `useDynamicForm().reset()`) already clears it.
     */
    function resetTouched() {
      Object.keys(touchedFields).forEach((key) => delete touchedFields[key]);
    }

    function setFieldTouched(fieldName: string, isTouched = true) {
      if (controlledTouched.value === undefined) {
        touchedFields[fieldName] = isTouched;
      }
      props.onTouchedChange?.({
        ...effectiveTouched.value,
        [fieldName]: isTouched,
      });
    }

    expose({
      resetTouched,
      setFieldTouched,
      getTouched: () => effectiveTouched.value,
    });

    watch(
      () => effectiveProperties.value,
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
      emitChange({ ...data });
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

    const errorsForItem = (fieldName: string, index: number) => {
      if (effectiveErrors.value === undefined) {
        return undefined;
      }
      const prefix = `${fieldName}[${index}].`;
      return Object.fromEntries(
        Object.entries(effectiveErrors.value)
          .filter(([key]) => key.startsWith(prefix))
          .map(([key, messages]) => [key.slice(prefix.length), messages]),
      );
    };

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
                  errors: errorsForItem(field.name, index),
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
              idPrefix: effectiveIdPrefix.value,
              touched: Boolean(effectiveTouched.value[f.name]),
              errors: effectiveErrors.value,
              dirty: data[f.name] !== initialProperties[f.name],
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
