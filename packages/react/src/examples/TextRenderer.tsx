import React from "react"

export default function TextRenderer({ value, onValueChange, className }: any) {
  return (
    <input
      className={className}
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  )
}
