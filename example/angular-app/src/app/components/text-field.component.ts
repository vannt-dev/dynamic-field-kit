import { Component, Input, Output, EventEmitter } from "@angular/core"
import { CommonModule } from "@angular/common"

@Component({
  selector: "app-text-field",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="field-container" [class]="className">
      <label *ngIf="label" style="display: block; margin-bottom: 4px; font-weight: 500;">
        {{ label }}<span *ngIf="required" style="color: red;"> *</span>
      </label>
      <input
        [value]="value"
        [placeholder]="placeholder || ''"
        (input)="onInput($event)"
        [required]="required"
        style="padding: 8px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 4px; display: block; width: 100%; box-sizing: border-box;"
      />
      <small *ngIf="description" style="color: #666; display: block; margin-top: -4px; margin-bottom: 8px;">
        {{ description }}
      </small>
    </div>
  `,
})
export class TextFieldComponent {
  @Input() value?: any
  @Input() placeholder?: string
  @Input() required?: boolean
  @Input() label?: string
  @Input() description?: string
  @Input() className?: string
  @Output() onValueChange = new EventEmitter<any>()

  onInput(e: any) {
    this.onValueChange.emit(e.target.value)
  }
}

