import { CommonModule } from "@angular/common"
import { Component, ComponentRef, Input, Output, EventEmitter, ViewChild, ViewContainerRef, OnChanges, AfterViewInit, SimpleChanges, Type, SimpleChange } from "@angular/core"
import { fieldRegistry, FieldTypeKey } from "@dynamic-field-kit/core"
import { BaseInputComponent } from "./BaseInput"

@Component({
  selector: "dfk-dynamic-input",
  standalone: true,
  imports: [CommonModule],
  template: `<div #host style="display: contents;"></div>`,
})
export class DynamicInput extends BaseInputComponent implements OnChanges, AfterViewInit {
  @Input() type!: FieldTypeKey
  @Input() value?: any
  @Input() label?: string
  @Input() placeholder?: string
  @Input() required?: boolean
  @Input() options?: any[]
  @Input() className?: string
  @Input() description?: any
  @Output() override valueChange = new EventEmitter<any>()
  @Output() onChange = new EventEmitter<any>() // backward compat

  @ViewChild("host", { read: ViewContainerRef, static: false }) host!: ViewContainerRef
  private compRef?: ComponentRef<any>
  private inputInstance?: any

  ngOnChanges(changes: SimpleChanges) {
    if (changes["type"] && !changes["type"].firstChange && this.host) {
      this.render()
      return
    }

    if (this.inputInstance) {
      this.applyKnownProps(this.inputInstance)

      const childChanges: SimpleChanges = {}
      for (const prop in changes) {
        childChanges[prop] = new SimpleChange(
          changes[prop].previousValue,
          changes[prop].currentValue,
          changes[prop].firstChange
        )
      }

      this.inputInstance.ngOnChanges?.(childChanges)
      this.compRef?.changeDetectorRef.detectChanges()
    } else if (this.host) {
      this.render()
    }
  }

  ngAfterViewInit() {
    this.render();
  }

  private render() {
    const Renderer = fieldRegistry.get(this.type as FieldTypeKey)
    this.cleanupRenderedComponent()
    this.host.clear()
    if (!Renderer) {
      const el = document.createElement("div")
      el.textContent = `Unknown field type: ${this.type}`
      this.host.element.nativeElement.appendChild(el)
      return
    }

    try {
      const compType = Renderer as unknown as Type<any>
      const compRef = this.host.createComponent(compType)
      const instance = compRef.instance
      if (!instance) throw new Error(`Failed to create instance for ${this.type}`)

      this.applyKnownProps(instance)

      this.bindOutput(instance, "valueChange")
      this.bindOutput(instance, "onValueChange")

      instance.changeDetectorRef?.detectChanges()
      this.compRef = compRef
      this.inputInstance = instance
      compRef.changeDetectorRef.detectChanges()
    } catch (err) {
      // Fallback to function renderer
      try {
        const props: any = {
          value: this.value,
          onValueChange: (v: any) => this.emitValue(v),
          label: this.label,
          placeholder: this.placeholder,
          required: this.required,
          options: this.options,
          className: this.className,
          description: this.description,
          disabled: this.disabled,
          errorMessage: this.errorMessage,
        }
        const out = (Renderer as Function)(props)
        if (typeof out === 'string') {
          const el = document.createElement('div')
          el.innerHTML = out
          this.host.element.nativeElement.appendChild(el)
        }
      } catch (e) {
        const el = document.createElement('div')
        el.textContent = `Failed to render field: ${this.type}`
        this.host.element.nativeElement.appendChild(el)
      }
    }
  }

  private applyKnownProps(instance: any) {
    const knownProps = ["value", "label", "placeholder", "required", "disabled", "options", "className", "description", "errorMessage"]
    for (const prop of knownProps) {
      if (prop in this && prop in instance) {
        instance[prop] = (this as any)[prop]
      }
    }
  }

  private bindOutput(instance: any, outputName: "valueChange" | "onValueChange") {
    const output = instance?.[outputName]
    if (!output || typeof output.subscribe !== "function") return;

    (output as EventEmitter<any>).subscribe((value) => {
      this.emitValue(value)
    })
  }

  private emitValue(value: any) {
    this.valueChange.emit(value)
    this.onChange.emit(value)
  }

  private cleanupRenderedComponent() {
    this.compRef?.destroy()
    this.compRef = undefined
    this.inputInstance = undefined
  }
}
