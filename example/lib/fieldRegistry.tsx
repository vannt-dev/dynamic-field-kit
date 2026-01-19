"use client"

import { fieldRegistry } from "@dynamic-field-kit/react"

fieldRegistry.register("text", ({ value, onValueChange }) => (
  <input
    value={value ?? ""}
    onChange={(e) => onValueChange?.(e.target.value)}
  />
))

fieldRegistry.register("number", ({ value, onValueChange }) => (
  <input
    type="number"
    value={value ?? ""}
    onChange={(e) => onValueChange?.(Number(e.target.value))}
  />
))

export {}