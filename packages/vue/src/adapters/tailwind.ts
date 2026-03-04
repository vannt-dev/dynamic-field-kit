import { h } from "vue";
import { layoutRegistry } from "../layout/layoutRegistry";

layoutRegistry.register("tw-column", ({ children }) => {
  return h("div", { class: "flex flex-col gap-4" }, children);
});

layoutRegistry.register("tw-row", ({ children }) => {
  return h("div", { class: "flex flex-row gap-4" }, children);
});

layoutRegistry.register("tw-grid-2", ({ children }) => {
  return h("div", { class: "grid grid-cols-2 gap-4" }, children);
});
