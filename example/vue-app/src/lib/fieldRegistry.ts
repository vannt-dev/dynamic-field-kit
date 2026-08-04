import { fieldRegistry as registry } from '@dynamic-field-kit/vue';
import { defineComponent, h } from 'vue';

const inputStyle =
  'padding: 8px; margin-bottom: 4px; border: 1px solid #ccc;' +
  ' border-radius: 4px; display: block; width: 100%; box-sizing: border-box;';

const TextRenderer = defineComponent({
  props: ['value', 'label', 'disabled', 'readOnly', 'error', 'placeholder'],
  emits: ['update:value', 'blur'],
  setup(props, { emit }) {
    return () =>
      h('label', { style: 'display: block; margin-bottom: 12px;' }, [
        props.label
          ? h(
              'span',
              {
                style: 'font-weight: 500; display: block; margin-bottom: 4px;',
              },
              props.label
            )
          : null,
        h('input', {
          value: props.value ?? '',
          placeholder: props.placeholder ?? '',
          disabled: props.disabled,
          readOnly: props.readOnly,
          onInput: (e: any) => emit('update:value', e.target.value),
          onBlur: () => emit('blur'),
          style: `${inputStyle} background-color: ${
            props.disabled ? '#f0f0f0' : props.readOnly ? '#fafafa' : '#fff'
          }; border-color: ${props.error ? '#ef4444' : '#ccc'};`,
        }),
        props.error
          ? h(
              'span',
              { style: 'color: #ef4444; font-size: 12px; display: block;' },
              Array.isArray(props.error) ? props.error.join(', ') : props.error
            )
          : null,
      ]);
  },
});

const NumberRenderer = defineComponent({
  props: ['value', 'label', 'disabled', 'readOnly', 'error'],
  emits: ['update:value', 'blur'],
  setup(props, { emit }) {
    return () =>
      h('label', { style: 'display: block; margin-bottom: 12px;' }, [
        props.label
          ? h(
              'span',
              {
                style: 'font-weight: 500; display: block; margin-bottom: 4px;',
              },
              props.label
            )
          : null,
        h('input', {
          type: 'number',
          value: props.value ?? '',
          disabled: props.disabled,
          readOnly: props.readOnly,
          onInput: (e: any) =>
            emit(
              'update:value',
              e.target.value === '' ? undefined : Number(e.target.value)
            ),
          onBlur: () => emit('blur'),
          style: `${inputStyle} background-color: ${
            props.disabled ? '#f0f0f0' : props.readOnly ? '#fafafa' : '#fff'
          }; border-color: ${props.error ? '#ef4444' : '#ccc'};`,
        }),
        props.error
          ? h(
              'span',
              { style: 'color: #ef4444; font-size: 12px; display: block;' },
              Array.isArray(props.error) ? props.error.join(', ') : props.error
            )
          : null,
      ]);
  },
});

const SelectRenderer = defineComponent({
  props: ['value', 'label', 'options', 'disabled', 'readOnly', 'error'],
  emits: ['update:value', 'blur'],
  setup(props, { emit }) {
    return () =>
      h('label', { style: 'display: block; margin-bottom: 12px;' }, [
        props.label
          ? h(
              'span',
              {
                style: 'font-weight: 500; display: block; margin-bottom: 4px;',
              },
              props.label
            )
          : null,
        h(
          'select',
          {
            value: props.value ?? '',
            disabled: props.disabled || props.readOnly,
            onChange: (e: any) => emit('update:value', e.target.value),
            onBlur: () => emit('blur'),
            style: `${inputStyle} background-color: ${
              props.disabled ? '#f0f0f0' : '#fff'
            }; border-color: ${props.error ? '#ef4444' : '#ccc'};`,
          },
          [
            h('option', { value: '' }, '-- Chọn --'),
            ...(props.options || []).map((opt: any) =>
              h(
                'option',
                { key: opt.value ?? opt, value: opt.value ?? opt },
                opt.label ?? opt.value ?? opt
              )
            ),
          ]
        ),
        props.error
          ? h(
              'span',
              { style: 'color: #ef4444; font-size: 12px; display: block;' },
              Array.isArray(props.error) ? props.error.join(', ') : props.error
            )
          : null,
      ]);
  },
});

registry.register('text', TextRenderer as any);
registry.register('number', NumberRenderer as any);
registry.register('select', SelectRenderer as any);

export {};
