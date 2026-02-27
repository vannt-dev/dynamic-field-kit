import { layoutRegistry } from "./layoutRegistry"
import type { VNode } from "vue"

layoutRegistry.register("column", ({ children }) => {
    return {
        type: "div",
        props: { class: "flex flex-col gap-4" },
        children
    } as VNode
})

layoutRegistry.register("row", ({ children }) => {
    return {
        type: "div",
        props: { class: "flex flex-row gap-4" },
        children
    } as VNode
})

layoutRegistry.register("grid-2", ({ children }) => {
    return {
        type: "div",
        props: { class: "grid grid-cols-2 gap-4" },
        children
    } as VNode
})
