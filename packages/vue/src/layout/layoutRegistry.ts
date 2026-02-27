import type { VNode, PropType } from 'vue'

export type LayoutRenderer<C = any> = (props: {
    children: VNode[]
    config?: C
}) => VNode

export class LayoutRegistry {
    private layouts = new Map<string, LayoutRenderer>()

    register(type: string, renderer: LayoutRenderer) {
        if (this.layouts.has(type)) {
            console.warn(`[dynamic-field-kit] Layout "${type}" already exists`)
        }
        this.layouts.set(type, renderer)
    }

    get(type: string): LayoutRenderer | undefined {
        return this.layouts.get(type)
    }
}

export const layoutRegistry = new LayoutRegistry()
