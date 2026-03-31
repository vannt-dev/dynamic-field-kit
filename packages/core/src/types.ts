export type FieldTypeKey = keyof FieldTypeMap & string

// 👇 App sẽ augment interface này
export interface FieldTypeMap {}

export type Properties = Record<string, any>

export interface FieldRendererProps<T = any> {
  value?: T
  onValueChange?: (value: T) => void
  label?: string
  placeholder?: string
  required?: boolean
  options?: Properties[]
  className?: string
  description?: any
}

export interface FieldDescription<T extends FieldTypeKey = FieldTypeKey> {
  name: string
  type: T
  label?: string
  placeholder?: string
  required?: boolean
  appearCondition?: (data: Properties) => boolean
  options?: Properties[]
  className?: string
  description?: any
}
