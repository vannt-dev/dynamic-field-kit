import { Component, Input, Output, EventEmitter, ViewChild, ViewContainerRef, OnChanges, SimpleChanges, Type } from "@angular/core"
import { fieldRegistry, FieldRendererProps, FieldTypeKey } from "@dynamic-field-kit/core"

@Component({
  selector: "dfk-dynamic-input",
  standalone: true,
  template: `<ng-template #host></ng-template>`,
})
export class DynamicInput<T extends FieldTypeKey = FieldTypeKey> implements OnChanges {
  @Input() type!: T
  @Input() value?: any
  @Output() onChange = new EventEmitter<any>()

  @ViewChild("host", { read: ViewContainerRef, static: true }) host!: ViewContainerRef

  ngOnChanges(_changes: SimpleChanges) {
    this.render()
  }

  private render() {
    const Renderer = (fieldRegistry as any).get(this.type)
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
      }
    } catch (err) {
      // fallback: attempt to call renderer as function
      try {
        const out = Renderer({ value: this.value, onValueChange: (v: any) => this.onChange.emit(v) } as FieldRendererProps)
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
