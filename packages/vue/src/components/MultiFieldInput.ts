import { FieldDescription, Properties } from "@dynamic-field-kit/core";
import { computed, defineComponent, h, ref, watch } from "vue";
import { layoutRegistry } from "../layout";
import { LayoutConfig } from "../types/layout";
import FieldInput from "./FieldInput";

interface Props {
  fieldDescriptions: FieldDescription[];
  properties?: Properties;
  onChange?: (data: Properties) => void;
  layout?: LayoutConfig;
}

function resolveLayout(layout?: LayoutConfig) {
  if (!layout) return { type: "column", config: {} };
  if (typeof layout === "string") return { type: layout, config: {} };
  return { type: layout.type, config: layout };
}

const MultiFieldInput = defineComponent({
  name: "MultiFieldInput",
  props: {
    fieldDescriptions: { type: Array, required: true },
    properties: { type: Object, default: () => ({}) },
    onChange: { type: Function, default: undefined },
    layout: { type: [Object, String], default: undefined },
  },
  setup(props: Props) {
    const data = ref<Properties>({});

    watch(
      () => props.properties,
      (newProps) => {
        if (newProps) data.value = { ...newProps };
      },
      { immediate: true, deep: true },
    );

    const visibleFields = computed(() => {
      return props.fieldDescriptions.filter(
        (f) => !f.appearCondition || f.appearCondition(data.value),
      );
    });

    const { type, config } = resolveLayout(props.layout as LayoutConfig);

    const Layout = computed(() => {
      return layoutRegistry.get(type);
    });

    const handleValueChange = (value: any, key: string) => {
      const next = { ...data.value, [key]: value };
      data.value = next;
      props.onChange?.(next);
    };

    return () => {
      if (!Layout.value) {
        return h("div", `Unknown layout: ${type}`);
      }

      const children = visibleFields.value.map((f) =>
        h(FieldInput, {
          key: f.name,
          fieldDescription: f,
          renderInfos: data.value,
          onValueChangeField: handleValueChange,
        }),
      );

      return (Layout.value as any)({ config, children });
    };
  },
});

export default MultiFieldInput;
