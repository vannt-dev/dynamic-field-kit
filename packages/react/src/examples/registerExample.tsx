import { fieldRegistry } from "@dynamic-field-kit/core"
import TextRenderer from "./TextRenderer"

// Example: register 'text' renderer for React usage
fieldRegistry.register("text", TextRenderer as any)

export {}
