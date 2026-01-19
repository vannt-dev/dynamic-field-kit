import { layoutRegistry } from "./layoutRegistry"

layoutRegistry.register("column", ({ children, config }) => (
    <div
        style={{
            display: "flex",
            flexDirection: "column",
            gap: config?.gap ?? 12,
        }}
    >
        {children}
    </div>
))

layoutRegistry.register("row", ({ children, config }) => (
    <div
        style={{
            display: "flex",
            flexDirection: "row",
            gap: config?.gap ?? 12,
        }}
    >
        {children}
    </div>
))

layoutRegistry.register("grid", ({ children, config }) => (
    <div
        style={{
            display: "grid",
            gridTemplateColumns: `repeat(${config?.columns ?? 2}, 1fr)`,
            gap: config?.gap ?? 12,
        }}
    >
        {children}
    </div>
))