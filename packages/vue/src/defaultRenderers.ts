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

export const DefaultRadioRenderer = defineComponent({
  name: 'DefaultRadioRenderer',
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
  },
  setup(props) {
    return () => {
      const emitChange = props['onUpdate:value'] || props.onValueChange;
      const radioNodes = (props.options || []).map((opt, i) => {
        const optVal = opt.value ?? opt.id ?? opt;
        const optLabel = opt.label ?? opt.name ?? String(optVal);
        const isChecked = String(props.value) === String(optVal);
        const radioId = `${props.id || 'radio'}-${i}`;
        return h(
          'label',
          {
            key: String(optVal) + i,
            style: {
              marginRight: '12px',
              display: 'inline-flex',
              alignItems: 'center',
            },
          },
          [
            h('input', {
              type: 'radio',
              id: radioId,
              name: props.id,
              value: String(optVal),
              checked: isChecked,
              onChange: () => emitChange?.(optVal),
              disabled: props.disabled || props.readOnly,
              required: props.required,
              'aria-invalid': props.ariaInvalid,
              'aria-describedby': props.ariaDescribedBy,
            }),
            h('span', { style: { marginLeft: '4px' } }, String(optLabel)),
          ]
        );
      });

      return h(
        'div',
        {
          class: `dfk-radio-group ${props.class || ''}`,
          id: props.id,
          onBlur: props.onBlur,
        },
        radioNodes
      );
    };
  },
});

export const DefaultRangeRenderer = defineComponent({
  name: 'DefaultRangeRenderer',
  props: {
    value: null,
    onValueChange: Function as PropType<(val: unknown) => void>,
    'onUpdate:value': Function as PropType<(val: unknown) => void>,
    onBlur: Function as PropType<() => void>,
    disabled: Boolean,
    readOnly: Boolean,
    required: Boolean,
    min: [Number, String],
    max: [Number, String],
    step: [Number, String],
    id: String,
    class: String,
    ariaInvalid: Boolean,
    ariaDescribedBy: String,
  },
  setup(props) {
    return () => {
      const emitChange = props['onUpdate:value'] || props.onValueChange;
      return h('input', {
        type: 'range',
        id: props.id,
        class: props.class,
        value: (props.value as number) ?? props.min ?? 0,
        min: props.min,
        max: props.max,
        step: props.step,
        onInput: (e: Event) =>
          emitChange?.(Number((e.target as HTMLInputElement).value)),
        onBlur: props.onBlur,
        disabled: props.disabled || props.readOnly,
        required: props.required,
        'aria-invalid': props.ariaInvalid,
        'aria-describedby': props.ariaDescribedBy,
      });
    };
  },
});

export const DefaultFileRenderer = defineComponent({
  name: 'DefaultFileRenderer',
  props: {
    value: null,
    onValueChange: Function as PropType<(val: unknown) => void>,
    'onUpdate:value': Function as PropType<(val: unknown) => void>,
    onBlur: Function as PropType<() => void>,
    disabled: Boolean,
    readOnly: Boolean,
    required: Boolean,
    accept: String,
    multiple: Boolean,
    id: String,
    class: String,
    ariaInvalid: Boolean,
    ariaDescribedBy: String,
  },
  setup(props) {
    return () => {
      const emitChange = props['onUpdate:value'] || props.onValueChange;
      return h('input', {
        type: 'file',
        id: props.id,
        class: props.class,
        accept: props.accept,
        multiple: props.multiple,
        onChange: (e: Event) => {
          const files = (e.target as HTMLInputElement).files;
          if (!files) {
            return;
          }
          emitChange?.(props.multiple ? Array.from(files) : files[0] || null);
        },
        onBlur: props.onBlur,
        disabled: props.disabled || props.readOnly,
        required: props.required,
        'aria-invalid': props.ariaInvalid,
        'aria-describedby': props.ariaDescribedBy,
      });
    };
  },
});

export const DefaultDateRenderer = defineComponent({
  name: 'DefaultDateRenderer',
  setup(props, { attrs }) {
    return () =>
      h(DefaultTextRenderer as any, {
        ...props,
        ...attrs,
        inputType: 'date',
      });
  },
});

export const DefaultTimeRenderer = defineComponent({
  name: 'DefaultTimeRenderer',
  setup(props, { attrs }) {
    return () =>
      h(DefaultTextRenderer as any, {
        ...props,
        ...attrs,
        inputType: 'time',
      });
  },
});

export const DefaultDateTimeLocalRenderer = defineComponent({
  name: 'DefaultDateTimeLocalRenderer',
  setup(props, { attrs }) {
    return () =>
      h(DefaultTextRenderer as any, {
        ...props,
        ...attrs,
        inputType: 'datetime-local',
      });
  },
});

export const DefaultSwitchRenderer = defineComponent({
  name: 'DefaultSwitchRenderer',
  setup(props, { attrs }) {
    return () =>
      h(DefaultCheckboxRenderer as any, {
        ...props,
        ...attrs,
      });
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
  radio: DefaultRadioRenderer,
  range: DefaultRangeRenderer,
  file: DefaultFileRenderer,
  date: DefaultDateRenderer,
  time: DefaultTimeRenderer,
  'datetime-local': DefaultDateTimeLocalRenderer,
  switch: DefaultSwitchRenderer,
};

export function getDefaultRenderer(type: string): any {
  return defaultRenderersMap[type];
}
