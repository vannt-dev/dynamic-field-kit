import { Component, Input, Output, EventEmitter } from "@angular/core"

@Component({
  selector: "dfk-text-field",
  template: `
    <input [value]="value ?? ''" (input)="onInput($event)" />
  `,
})
export class TextFieldComponent {
  @Input() value?: any
  @Output() valueChange = new EventEmitter<any>()
  @Output() onValueChange = new EventEmitter<any>()

  onInput(e: any) {
    const value = e.target.value
    this.valueChange.emit(value)
    this.onValueChange.emit(value)
  }
}
