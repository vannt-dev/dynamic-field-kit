import { FieldTypeKey } from "@dynamic-field-kit/core"

export interface FieldTypeMap {
  text: string
  number: number
}

export type FieldValue<K extends FieldTypeKey> =
  K extends keyof FieldTypeMap ? FieldTypeMap[K] : unknown
