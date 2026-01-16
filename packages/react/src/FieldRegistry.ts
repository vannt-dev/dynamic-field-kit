import { FieldTypeKey } from "@dynamic-field-kit/core"
import { ComponentType } from "react"

export type FieldRendererProps<T = any> = {
    value?: T
    onChange?: (value: T) => void
    isInvalid?: boolean
    messageError?: string
}

const registry = new Map<FieldTypeKey, ComponentType<any>>()

export const registerField = (
    type: FieldTypeKey,
    component: ComponentType<any>
) => {
    registry.set(type, component)
}

export const getField = (type: FieldTypeKey) => {
    return registry.get(type)
}
