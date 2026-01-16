import type { ReactNode } from "react"

export type Primitive = string | number | boolean | null


export type FieldTypeKey = string

export type Properties = Record<string, any>

export interface FieldDescription<
  TValue = any,
  TData extends Properties = Properties
> {
  /** Unique key used to bind value */
  name: string

  /** Field type identifier */
  type: FieldTypeKey

  id?: string
  key?: string
  label?: ReactNode
  value?: any
  defaultValue?: TValue
  isHideLabel?: boolean
  appearCondition?: (data: TData) => boolean
  description?: ReactNode
  messageError?: string
  isInvalid?: boolean
  [key: string]: any
}
