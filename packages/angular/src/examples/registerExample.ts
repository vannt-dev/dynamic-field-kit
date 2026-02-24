import { fieldRegistry } from "@dynamic-field-kit/core"
import { TextFieldComponent } from "./text-field.component"

// Example: register Angular component class into shared registry
fieldRegistry.register("text", TextFieldComponent as any)

export {}
