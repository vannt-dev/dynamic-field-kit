import { Component, Input, Output, EventEmitter } from "@angular/core"
import { CommonModule } from '@angular/common'
import { DynamicInput } from './DynamicInput'
import { FieldDescription, Properties } from "@dynamic-field-kit/core"

@Component({
  selector: "dfk-field-input",
  standalone: true,
  imports: [CommonModule, DynamicInput],
  template: `
    <dfk-dynamic-input
      [type]="fieldDescription.type"
      [value]="renderInfos[fieldDescription.name]"
      [ngClass]="fieldDescription.className"
      (onChange)="onValueChangeField.emit({ value: $event, key: fieldDescription.name })"
    ></dfk-dynamic-input>
  `,
})
export class FieldInput {
  @Input() fieldDescription!: FieldDescription
  @Input() renderInfos!: Properties
  @Output() onValueChangeField = new EventEmitter<any>()
}
