/* eslint-disable @typescript-eslint/no-explicit-any */
import { Properties } from '@dynamic-field-kit/core';
import { defineComponent, h, PropType } from 'vue';

export const DefaultTextRenderer = defineComponent({
  name: 'DefaultTextRenderer',
  props: {
    value: null,
    onValueChange: Function as PropType<(val: unknown) => void>,
    'onUpdate:value': Function as PropType<(val: unknown) => void>,
    onBlur: Function as PropType<() => void>,
    disabled: Boolean,
    readOnly: Boolean,
    required: Boolean,
    placeholder: String,
    id: String,
    class: String,
    ariaInvalid: Boolean,
    ariaDescribedBy: String,
    ariaRequired: Boolean,
    inputType: {
      type: String,
      default: 'text',
    },
  },
  setup(props) {
    return () => {
      const emitChange = props['onUpdate:value'] || props.onValueChange;
      return h('input', {
        type: props.inputType,
        id: props.id,
        class: props.class,
        value: (props.value as string | number) ?? '',
        onInput: (e: Event) =>
          emitChange?.((e.target as HTMLInputElement).value),
        onBlur: props.onBlur,
        disabled: props.disabled,
        readonly: props.readOnly,
        required: props.required,
        placeholder: props.placeholder,
        'aria-invalid': props.ariaInvalid,
        'aria-describedby': props.ariaDescribedBy,
        'aria-required': props.ariaRequired,
      });
    };
  },
});

export const DefaultNumberRenderer = defineComponent({
  name: 'DefaultNumberRenderer',
  props: {
    value: null,
    onValueChange: Function as PropType<(val: unknown) => void>,
    'onUpdate:value': Function as PropType<(val: unknown) => void>,
    onBlur: Function as PropType<() => void>,
    disabled: Boolean,
    readOnly: Boolean,
    required: Boolean,
    placeholder: String,
    id: String,
    class: String,
    ariaInvalid: Boolean,
    ariaDescribedBy: String,
    ariaRequired: Boolean,
  },
  setup(props) {
    return () => {
      const emitChange = props['onUpdate:value'] || props.onValueChange;
      return h('input', {
        type: 'number',
        id: props.id,
        class: props.class,
        value: (props.value as number) ?? '',
        onInput: (e: Event) => {
          const val = (e.target as HTMLInputElement).value;
          emitChange?.(val === '' ? undefined : Number(val));
        },
        onBlur: props.onBlur,
        disabled: props.disabled,
        readonly: props.readOnly,
        required: props.required,
        placeholder: props.placeholder,
        'aria-invalid': props.ariaInvalid,
        'aria-describedby': props.ariaDescribedBy,
        'aria-required': props.ariaRequired,
      });
    };
  },
});

export const DefaultPasswordRenderer = defineComponent({
  name: 'DefaultPasswordRenderer',
  setup(props, { attrs }) {
    return () =>
      h(DefaultTextRenderer as any, {
        ...props,
        ...attrs,
        inputType: 'password',
      });
  },
});

export const DefaultEmailRenderer = defineComponent({
  name: 'DefaultEmailRenderer',
  setup(props, { attrs }) {
    return () =>
      h(DefaultTextRenderer as any, {
        ...props,
        ...attrs,
        inputType: 'email',
      });
  },
});

export const DefaultTextareaRenderer = defineComponent({
  name: 'DefaultTextareaRenderer',
  props: {
    value: null,
    onValueChange: Function as PropType<(val: unknown) => void>,
    'onUpdate:value': Function as PropType<(val: unknown) => void>,
    onBlur: Function as PropType<() => void>,
    disabled: Boolean,
    readOnly: Boolean,
    required: Boolean,
    placeholder: String,
    id: String,
    class: String,
    ariaInvalid: Boolean,
    ariaDescribedBy: String,
    ariaRequired: Boolean,
  },
  setup(props) {
    return () => {
      const emitChange = props['onUpdate:value'] || props.onValueChange;
      return h('textarea', {
        id: props.id,
        class: props.class,
        value: (props.value as string) ?? '',
        onInput: (e: Event) =>
          emitChange?.((e.target as HTMLTextAreaElement).value),
        onBlur: props.onBlur,
        disabled: props.disabled,
        readonly: props.readOnly,
        required: props.required,
        placeholder: props.placeholder,
        'aria-invalid': props.ariaInvalid,
        'aria-describedby': props.ariaDescribedBy,
        'aria-required': props.ariaRequired,
      });
    };
  },
});

export const DefaultCheckboxRenderer = defineComponent({
  name: 'DefaultCheckboxRenderer',
  props: {
    value: null,
    onValueChange: Function as PropType<(val: unknown) => void>,
    'onUpdate:value': Function as PropType<(val: unknown) => void>,
    onBlur: Function as PropType<() => void>,
    disabled: Boolean,
    readOnly: Boolean,
    required: Boolean,
    id: String,
    class: String,
    ariaInvalid: Boolean,
    ariaDescribedBy: String,
    ariaRequired: Boolean,
  },
  setup(props) {
    return () => {
      const emitChange = props['onUpdate:value'] || props.onValueChange;
      return h('input', {
        type: 'checkbox',
        id: props.id,
        class: props.class,
        checked: Boolean(props.value),
        onChange: (e: Event) =>
          emitChange?.((e.target as HTMLInputElement).checked),
        onBlur: props.onBlur,
        disabled: props.disabled || props.readOnly,
        required: props.required,
        'aria-invalid': props.ariaInvalid,
        'aria-describedby': props.ariaDescribedBy,
        'aria-required': props.ariaRequired,
      });
    };
  },
});

export const DefaultSelectRenderer = defineComponent({
  name: 'DefaultSelectRenderer',
  props: {
    value: null,
    onValueChange: Function as PropType<(val: unknown) => void>,
    'onUpdate:value': Function as PropType<(val: unknown) => void>,
    onBlur: Function as PropType<() => void>,
    disabled: Boolean,
    readOnly: Boolean,
    required: Boolean,
    options: {
      type: Array as PropType<Properties[]>,
      default: () => [],
    },
    id: String,
    class: String,
    ariaInvalid: Boolean,
    ariaDescribedBy: String,
    ariaRequired: Boolean,
  },
  setup(props) {
    return () => {
      const emitChange = props['onUpdate:value'] || props.onValueChange;
      const optionNodes = (props.options || []).map((opt, i) => {
        const optVal = opt.value ?? opt.id ?? opt;
        const optLabel = opt.label ?? opt.name ?? String(optVal);
        return h(
          'option',
          { key: String(optVal) + i, value: String(optVal) },
          String(optLabel)
        );
      });

      return h(
        'select',
        {
          id: props.id,
          class: props.class,
          value: (props.value as string | number) ?? '',
          onChange: (e: Event) =>
            emitChange?.((e.target as HTMLSelectElement).value),
          onBlur: props.onBlur,
          disabled: props.disabled || props.readOnly,
          required: props.required,
          'aria-invalid': props.ariaInvalid,
          'aria-describedby': props.ariaDescribedBy,
          'aria-required': props.ariaRequired,
        },
        [
          h('option', { value: '', disabled: true }, '-- Select --'),
          ...optionNodes,
        ]
      );
    };
  },
});

export const defaultRenderersMap: Record<string, any> = {
  text: DefaultTextRenderer,
  number: DefaultNumberRenderer,
  password: DefaultPasswordRenderer,
  email: DefaultEmailRenderer,
  textarea: DefaultTextareaRenderer,
  checkbox: DefaultCheckboxRenderer,
  select: DefaultSelectRenderer,
};

export function getDefaultRenderer(type: string): any {
  return defaultRenderersMap[type];
}
