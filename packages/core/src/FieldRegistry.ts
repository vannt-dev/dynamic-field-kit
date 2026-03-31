import type { FieldRendererProps, FieldTypeMap } from "./types"

export type FieldRenderer<T = any, TResult = unknown> = (
    props: FieldRendererProps<T>
) => TResult

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
