import { h } from "vue"
import { layoutRegistry } from "./layoutRegistry"

layoutRegistry.register("column", ({ children }) => {
    return h("div", { class: "flex flex-col gap-4" }, children)
})

layoutRegistry.register("row", ({ children }) => {
    return h("div", { class: "flex flex-row gap-4" }, children)
})

layoutRegistry.register("grid-2", ({ children }) => {
    return h("div", { class: "grid grid-cols-2 gap-4" }, children)
})
