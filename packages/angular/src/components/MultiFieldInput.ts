import { Component, Input, Output, EventEmitter, OnInit, ViewContainerRef, ViewChild } from "@angular/core"
import { CommonModule } from '@angular/common'

import { FieldDescription, Properties } from "@dynamic-field-kit/core"
import { layoutRegistry } from "../layout"
import { LayoutConfig } from "../types/layout"
import { FieldInput } from "./FieldInput"

function resolveLayout(layout?: LayoutConfig) {
  if (!layout) return { type: "column", config: {} }
  if (typeof layout === "string") return { type: layout, config: {} }
  return { type: layout.type, config: layout }
}

@Component({
  selector: "dfk-multi-field-input",
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container #host></ng-container>
  `,
})
export class MultiFieldInput implements OnInit {
  @Input() fieldDescriptions: FieldDescription[] = []
  @Input() properties?: Properties
  @Output() onChange = new EventEmitter<Properties>()
  @Input() layout?: LayoutConfig

  @ViewChild("host", { read: ViewContainerRef, static: true }) host!: ViewContainerRef

  private data: Properties = {}

  ngOnInit() {
    if (this.properties) this.data = { ...this.properties }
    const visibleFields = this.fieldDescriptions.filter((f) => !f.appearCondition || f.appearCondition(this.data))

    const { type, config } = resolveLayout(this.layout)
    const LayoutComp = layoutRegistry.get(type)
    if (!LayoutComp) throw new Error(`Unknown layout: ${type}`)

    const layoutRef = this.host.createComponent(LayoutComp as any)
    // project children manually: create FieldInput components into the layout's ViewContainerRef if exposed.
    // For now, we append simple FieldInput components as children of layout element.
    const el = document.createElement("div")
    visibleFields.forEach((f) => {
      const wrapper = document.createElement("div")
      wrapper.textContent = f.label || f.name
      el.appendChild(wrapper)
    })
    try {
      layoutRef.location.nativeElement.appendChild(el)
    } catch {}
  }
}
