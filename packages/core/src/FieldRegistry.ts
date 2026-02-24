import { JSX } from "react"
import type { FieldRendererProps, FieldTypeMap } from "./types"

export type FieldRenderer<T = any> = (props: FieldRendererProps<T>) => JSX.Element

export class FieldRegistry {
    // ❗ INTERNAL = string, not constrain
    private registry: Record<string, FieldRenderer<any>> = {}

    // ✅ Type safety API
    register<K extends keyof FieldTypeMap>(
        type: K,
        renderer: FieldRenderer<FieldTypeMap[K]>
    ) {
        this.registry[type as string] = renderer
    }

    get<K extends keyof FieldTypeMap>(
        type: K
    ): FieldRenderer<FieldTypeMap[K]> | undefined {
        return this.registry[type as string]
    }
}

export const fieldRegistry = new FieldRegistry()
