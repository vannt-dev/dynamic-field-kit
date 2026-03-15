import { Component, Input, Output, EventEmitter, ViewChild, ViewContainerRef, OnChanges, SimpleChanges, Type } from "@angular/core"
import { fieldRegistry, FieldRendererProps, FieldTypeKey } from "@dynamic-field-kit/core"

@Component({
  selector: "dfk-dynamic-input",
  standalone: true,
  template: `<ng-template #host></ng-template>`,
})
export class DynamicInput implements OnChanges {
  @Input() type!: FieldTypeKey
  @Input() value?: any
  @Input() label?: string
  @Input() placeholder?: string
  @Input() required?: boolean
  @Input() options?: any[]
  @Input() className?: string
  @Input() description?: any
  @Output() onChange = new EventEmitter<any>()

  @ViewChild("host", { read: ViewContainerRef, static: true }) host!: ViewContainerRef

  ngOnChanges(_changes: SimpleChanges) {
    this.render()
  }

  private render() {
    const Renderer = (fieldRegistry as any).get(this.type)
    console.log(fieldRegistry);
    
    this.host.clear()
    if (!Renderer) {
      // render a simple text node when missing
      const el = document.createElement("div")
      el.textContent = `Unknown field type: ${this.type}`
      this.host.element.nativeElement.appendChild(el)
      return
    }

    // If a registered renderer is an Angular Component class, create it.
    // Consumers integrating Angular should register Angular component classes into the shared registry.
    try {
      const compType = Renderer as Type<any>
      const compRef = this.host.createComponent(compType)
      // pass common props if inputs exist
      if (compRef.instance) {
        if ("value" in compRef.instance) compRef.instance.value = this.value
        if ("onValueChange" in compRef.instance) compRef.instance.onValueChange = (v: any) => this.onChange.emit(v)
        if ("label" in compRef.instance) compRef.instance.label = this.label
        if ("placeholder" in compRef.instance) compRef.instance.placeholder = this.placeholder
        if ("required" in compRef.instance) compRef.instance.required = this.required
        if ("options" in compRef.instance) compRef.instance.options = this.options
        if ("className" in compRef.instance) compRef.instance.className = this.className
        if ("description" in compRef.instance) compRef.instance.description = this.description
      }
    } catch (err) {
      // fallback: attempt to call renderer as function
      try {
        const out = Renderer({ 
          value: this.value, 
          onValueChange: (v: any) => this.onChange.emit(v),
          label: this.label,
          placeholder: this.placeholder,
          required: this.required,
          options: this.options,
          className: this.className,
          description: this.description
        } as FieldRendererProps)
        // If renderer returned a string/html, append
        if (typeof out === "string") {
          const el = document.createElement("div")
          el.innerHTML = out
          this.host.element.nativeElement.appendChild(el)
        }
      } catch (e) {
        const el = document.createElement("div")
        el.textContent = `Failed to render field: ${this.type}`
        this.host.element.nativeElement.appendChild(el)
      }
    }
  }
}
