import { Component, Input, Output, EventEmitter } from "@angular/core"

@Component({
  selector: "dfk-text-field",
  template: `
    <input [value]="value" (input)="onInput($event)" />
  `,
})
export class TextFieldComponent {
  @Input() value?: any
  @Output() onValueChange = new EventEmitter<any>()

  onInput(e: any) {
    this.onValueChange.emit(e.target.value)
  }
}
