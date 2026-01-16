import { JSX } from "react"
import { FieldRendererProps, FieldTypeKey } from "./types"

type Renderer = (props: FieldRendererProps<any>) => JSX.Element

class FieldRegistry {
    private map = new Map<FieldTypeKey, Renderer>()

    register<T extends FieldTypeKey>(
        type: T,
        renderer: (props: FieldRendererProps) => JSX.Element
    ) {
        this.map.set(type, renderer)
    }

    get(type: FieldTypeKey) {
        return this.map.get(type)
    }
}

export const fieldRegistry = new FieldRegistry()
