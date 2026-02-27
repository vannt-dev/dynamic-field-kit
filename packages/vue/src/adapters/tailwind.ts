import { layoutRegistry } from "../layout/layoutRegistry"

layoutRegistry.register("tw-column", ({ children }) => {
    return {
        type: "div",
        props: { class: "flex flex-col gap-4" },
        children
    }
})

layoutRegistry.register("tw-row", ({ children }) => {
    return {
        type: "div",
        props: { class: "flex flex-row gap-4" },
        children
    }
})

layoutRegistry.register("tw-grid-2", ({ children }) => {
    return {
        type: "div",
        props: { class: "grid grid-cols-2 gap-4" },
        children
    }
})
