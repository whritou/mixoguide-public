import type { z } from "zod"
import type { ReactNode } from "react"
import type { FieldValues } from "react-hook-form"

export type DynamicFieldValue = FieldValues[string]

export type FieldType =
    | "text"
    | "textarea"
    | "number"
    | "email"
    | "password"
    | "url"
    | "date"
    | "time"
    | "datetime"
    | "select"
    | "multiselect"
    | "checkbox"
    | "switch"
    | "radio"
    | "color"
    | "image"
    | "file"
    | "tags"
    | "json"
    | "custom"

export interface BaseFieldConfig {
  name: string
  label: string
  description?: string
  placeholder?: string
  required?: boolean
  readOnly?: boolean
  hidden?: boolean
  defaultValue?: DynamicFieldValue
  validation?: z.ZodTypeAny
  transform?: {
    input?: (value: DynamicFieldValue) => DynamicFieldValue
    output?: (value: DynamicFieldValue) => DynamicFieldValue
  }
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: "text" | "textarea" | "email" | "password" | "url"
  minLength?: number
  maxLength?: number
}

export interface NumberFieldConfig extends BaseFieldConfig {
  type: "number"
  min?: number
  max?: number
  step?: number
}

export interface DateTimeFieldConfig extends BaseFieldConfig {
  type: "date" | "time" | "datetime"
  min?: string
  max?: string
}

export interface SelectFieldConfig extends BaseFieldConfig {
  type: "select" | "multiselect" | "radio"
  options: Array<{
    label: string
    value: string | number | boolean
  }>
  isMulti?: boolean
}

export interface BooleanFieldConfig extends BaseFieldConfig {
  type: "checkbox" | "switch"
}

export interface ColorFieldConfig extends BaseFieldConfig {
  type: "color"
  format?: "hex" | "rgb" | "rgba"
  presets?: string[]
}

export interface FileFieldConfig extends BaseFieldConfig {
  type: "image" | "file"
  accept?: string
  maxSize?: number
  multiple?: boolean
}

export interface TagsFieldConfig extends BaseFieldConfig {
  type: "tags"
  suggestions?: string[]
  maxTags?: number
}

export interface JsonFieldConfig extends BaseFieldConfig {
  type: "json"
  height?: number
}

export interface CustomFieldConfig<P = unknown> extends BaseFieldConfig {
  type: "custom"
  props?: P
  render: (input: {
    value: DynamicFieldValue
    onChange: (v: DynamicFieldValue) => void
    error?: string
    isSubmitting?: boolean
    props?: P
  }) => ReactNode
}

export type FieldConfig =
    | TextFieldConfig
    | NumberFieldConfig
    | DateTimeFieldConfig
    | SelectFieldConfig
    | BooleanFieldConfig
    | ColorFieldConfig
    | FileFieldConfig
    | TagsFieldConfig
    | JsonFieldConfig
    | CustomFieldConfig

export interface GenericFormConfig<T> {
  fields: FieldConfig[]
  onSubmit: (data: T) => Promise<void>
  submitButtonLabel?: string
  cancelButtonLabel?: string
  onCancel?: () => void
  defaultValues?: Partial<T>
  isLoading?: boolean
  title?: string
  description?: string
}

export interface GenericViewConfig<T> {
  fields: FieldConfig[]
  data: T
  title?: string
  description?: string
  actions?: Array<{
    label: string
    icon?: ReactNode
    onClick: () => void
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }>
  isLoading?: boolean
  layout?: "default" | "custom"
  customLayout?: {
    leftColumn: string[]
    rightColumn: "image" | string[]
  }
  imageField?: {
    name: string
    label: string
    alt?: string
  }
}

export interface GenericListConfig<T> {
  fields: FieldConfig[]
  data: T[]
  title?: string
  description?: string
  actions?: Array<{
    label: string
    icon?: ReactNode
    onClick: (item: T) => void
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }>
  onRowClick?: (item: T) => void
  onRowDoubleClick?: (item: T) => void
  isLoading?: boolean
  pagination?: {
    pageSize: number
    currentPage: number
    totalItems: number
    onPageChange: (page: number) => void
    onPageSizeChange?: (pageSize: number) => void
  }
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
}
