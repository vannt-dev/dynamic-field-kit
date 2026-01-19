import { layoutRegistry } from "../layout/layoutRegistry"

layoutRegistry.register("tw-column", ({ children }) => (
    <div className="flex flex-col gap-4" > {children} </div>
))

layoutRegistry.register("tw-row", ({ children }) => (
    <div className="flex flex-row gap-4" > {children} </div>
))

layoutRegistry.register("tw-grid-2", ({ children }) => (
    <div className="grid grid-cols-2 gap-4" > {children} </div>
))
