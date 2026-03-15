import { Component, Input, Output, EventEmitter } from "@angular/core"

@Component({
  selector: "app-number-field",
  standalone: true,
  template: `
    <input
      type="number"
      [value]="value"
      (input)="onInput($event)"
      style="padding: 8px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 4px; display: block; width: 100%; box-sizing: border-box;"
    />
  `,
})
export class NumberFieldComponent {
  @Input() value?: any
  @Output() onValueChange = new EventEmitter<any>()

  onInput(e: any) {
    this.onValueChange.emit(Number(e.target.value))
  }
}

