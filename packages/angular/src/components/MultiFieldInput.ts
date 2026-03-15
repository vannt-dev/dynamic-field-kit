import { Component, Input, Output, EventEmitter, OnChanges, OnInit, SimpleChanges } from "@angular/core"
import { CommonModule } from '@angular/common'

import { FieldDescription, Properties } from "@dynamic-field-kit/core"
import { FieldInput } from "./FieldInput"
import { LayoutConfig } from "../types/layout"

@Component({
  selector: "dfk-multi-field-input",
  standalone: true,
  imports: [CommonModule, FieldInput],
  template: `
    <div [style]="containerStyle">
      <dfk-field-input
        *ngFor="let field of visibleFields"
        [fieldDescription]="field"
        [renderInfos]="data"
        (onValueChangeField)="onFieldChange($event)"
      ></dfk-field-input>
    </div>
  `,
})
export class MultiFieldInput implements OnInit, OnChanges {
  @Input() fieldDescriptions: FieldDescription[] = []
  @Input() properties?: Properties
  @Output() onChange = new EventEmitter<Properties>()
  @Input() layout?: LayoutConfig

  data: Properties = {}
  visibleFields: FieldDescription[] = []

  get containerStyle(): string {
    if (!this.layout || this.layout === "column") {
      return "display:flex;flex-direction:column;gap:12px"
    }
    if (this.layout === "row") {
      return "display:flex;flex-direction:row;gap:12px"
    }
    if (this.layout === "grid") {
      return "display:grid;grid-template-columns:repeat(2,1fr);gap:12px"
    }
    if (typeof this.layout === "object" && this.layout.type === "grid") {
      const cols = (this.layout as any).columns ?? 2
      return `display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px`
    }
    return "display:flex;flex-direction:column;gap:12px"
  }

  ngOnInit() {
    this.init()
  }

  ngOnChanges(_changes: SimpleChanges) {
    this.init()
  }

  private init() {
    if (this.properties) this.data = { ...this.properties }
    this.updateVisibleFields()
  }

  private updateVisibleFields() {
    this.visibleFields = this.fieldDescriptions.filter(
      (f) => !f.appearCondition || f.appearCondition(this.data)
    )
  }

  onFieldChange(event: { value: any; key: string }) {
    this.data = { ...this.data, [event.key]: event.value }
    this.updateVisibleFields()
    this.onChange.emit(this.data)
  }
}
