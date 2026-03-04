import { FieldDescription, Properties } from "@dynamic-field-kit/core";
import { computed, defineComponent, h, PropType, ref, watch } from "vue";
import { layoutRegistry } from "../layout";
import { LayoutConfig } from "../types/layout";
import FieldInput from "./FieldInput";

function resolveLayout(layout?: LayoutConfig) {
  if (!layout) return { type: "column", config: {} };
  if (typeof layout === "string") return { type: layout, config: {} };
  return { type: layout.type, config: layout };
}

const MultiFieldInput = defineComponent({
  name: "MultiFieldInput",

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
  },

  setup(props) {
    const data = ref<Properties>({});

    watch(
      () => props.properties,
      (newProps) => {
        if (newProps) {
          data.value = { ...newProps };
        }
      },
      { immediate: true, deep: true },
    );

    const visibleFields = computed(() =>
      props.fieldDescriptions.filter(
        (f) => !f.appearCondition || f.appearCondition(data.value),
      ),
    );

    const layoutInfo = computed(() => resolveLayout(props.layout));

    const Layout = computed(() => layoutRegistry.get(layoutInfo.value.type));

    const handleValueChange = (value: unknown, key: string) => {
      const next = { ...data.value, [key]: value };
      data.value = next;
      props.onChange?.(next);
    };

    return () => {
      if (!Layout.value) {
        return h("div", `Unknown layout: ${layoutInfo.value.type}`);
      }

      const children = visibleFields.value.map((f) =>
        h(FieldInput, {
          key: f.name,
          fieldDescription: f,
          renderInfos: data.value,
          onValueChangeField: handleValueChange,
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
