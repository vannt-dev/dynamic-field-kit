import {
  buildFieldRendererProps,
  createOptionsLoader,
  isAsyncOptions,
  makeFieldId,
  type OptionsState,
  FieldDescription,
  Properties,
} from '@dynamic-field-kit/core';
import {
  defineComponent,
  getCurrentScope,
  h,
  onScopeDispose,
  PropType,
  shallowRef,
  watch,
} from 'vue';
import DynamicInput from './DynamicInput';

const FieldInput = /* @__PURE__ */ defineComponent({
  name: 'FieldInput',
  props: {
    fieldDescription: {
      type: Object as PropType<FieldDescription>,
      required: true,
    },
    renderInfos: {
      type: Object as PropType<Properties>,
      required: true,
    },
    rootData: {
      type: Object as PropType<Properties>,
      default: undefined,
    },
    /** Per-form-instance id namespace; see core's `makeFieldId`. */
    idPrefix: {
      type: String,
      default: 'dfk-field',
    },
    onValueChangeField: {
      type: Function as PropType<(value: unknown, key: string) => void>,
      required: true,
    },
    onBlurField: {
      type: Function as PropType<(key: string) => void>,
      default: undefined,
    },
    touched: {
      type: Boolean,
      default: undefined,
    },
    dirty: {
      type: Boolean,
      default: undefined,
    },
    errors: {
      type: Object as PropType<Record<string, string[]>>,
      default: undefined,
    },
  },
  setup(props) {
    // Async options only. A static or synchronous list allocates nothing here
    // and takes the path it always has.
    const isAsync = isAsyncOptions(props.fieldDescription);
    const optionsState = shallowRef<OptionsState | undefined>(
      isAsync ? { status: 'idle' } : undefined,
    );
    const loader = isAsync
      ? createOptionsLoader(props.fieldDescription, (state) => {
          optionsState.value = state;
        })
      : undefined;

    if (loader) {
      // The loader decides whether `optionsDeps` actually changed, so watching
      // the whole data object keeps that decision in one place.
      watch(
        () => props.renderInfos,
        (data) => loader.update(data, props.rootData),
        { immediate: true, deep: true },
      );
      if (getCurrentScope()) {
        onScopeDispose(() => loader.dispose());
      }
    }

    return () => {
      const { name } = props.fieldDescription;

      const rendererProps = buildFieldRendererProps({
        fieldDescription: props.fieldDescription,
        data: props.renderInfos,
        rootData: props.rootData,
        id: makeFieldId(props.fieldDescription, props.idPrefix),
        touched: props.touched,
        dirty: props.dirty,
        validationErrors:
          props.errors === undefined ? undefined : (props.errors[name] ?? []),
        optionsState: optionsState.value,
      });

      return h(DynamicInput, {
        ...rendererProps,
        onChange: (v: unknown) => props.onValueChangeField(v, name),
        onBlur: () => props.onBlurField?.(name),
        onOptionsQuery: loader
          ? (query: string) => loader.setQuery(query)
          : undefined,
      });
    };
  },
});

export default FieldInput;
