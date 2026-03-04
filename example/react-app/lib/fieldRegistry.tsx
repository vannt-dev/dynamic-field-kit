"use client"

import { fieldRegistry } from "@dynamic-field-kit/react"

fieldRegistry.register("text", ({ value, onValueChange }) => (
  <input
    value={value ?? ""}
    style={{ padding: "8px", marginBottom: "8px", border: "1px solid #ccc", borderRadius: "4px", display: "block", width: "100%", boxSizing: "border-box" }}
    onChange={(e) => onValueChange?.(e.target.value)}
  />
))

fieldRegistry.register("number", ({ value, onValueChange }) => (
  <input
    type="number"
    style={{ padding: "8px", marginBottom: "8px", border: "1px solid #ccc", borderRadius: "4px", display: "block", width: "100%", boxSizing: "border-box" }}
    value={value ?? ""}
    onChange={(e) => onValueChange?.(Number(e.target.value))}
  />
))

export {}