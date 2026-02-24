// Minimal Tailwind adapter placeholder for Angular package.
// Mirrors the React adapter shape: expose helper class names.

export const tailwind = {
  input: "px-2 py-1 border rounded",
  label: "text-sm font-medium mb-1",
}

export default tailwind
// Minimal Tailwind adapter placeholder for Angular package
export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ")
}
