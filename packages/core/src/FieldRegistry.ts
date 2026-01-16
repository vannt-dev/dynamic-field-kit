import type { ComponentType } from "react"
import type { FieldTypeKey } from "./types"

class FieldRegistry {
    private static map = new Map<FieldTypeKey, ComponentType<any>>()

    static register(type: FieldTypeKey, component: ComponentType<any>) {
        this.map.set(type, component)
    }

    static get(type?: FieldTypeKey) {
        return type ? this.map.get(type) : undefined
    }

    static has(type: FieldTypeKey) {
        return this.map.has(type)
    }
}

export default FieldRegistry
