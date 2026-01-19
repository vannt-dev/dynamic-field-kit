import { layoutRegistry } from "./layoutRegistry"
import { LayoutConfig } from "../types/layout"

function resolve(layout: LayoutConfig) {
    if (typeof layout === "string") {
        return { type: layout, config: {} }
    }
    return { type: layout.type, config: layout }
}

layoutRegistry.register("responsive", ({ children, config }) => {
    const isMobile =
        typeof window !== "undefined" && window.innerWidth < 768

    const current = isMobile ? config.mobile : config.desktop
    if (!current) return <>{ children } </>

    const { type, config: childConfig } = resolve(current)
    const Renderer = layoutRegistry.get(type)

    if (!Renderer) return <>{ children } </>

    return (
        <Renderer config= { childConfig } >
        { children }
        </Renderer>
    )
})
