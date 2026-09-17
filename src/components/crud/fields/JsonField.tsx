"use client"

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import type { JsonFieldConfig } from "../types"
import type { Control, ControllerRenderProps, FieldValues } from "react-hook-form"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"

interface JsonFieldProps {
  field: JsonFieldConfig
  control: Control<FieldValues>
  disabled?: boolean
}

interface JsonFieldInputProps {
  formField: ControllerRenderProps<FieldValues, string>
  field: JsonFieldConfig
  disabled?: boolean
}

function JsonFieldInput({ formField, field, disabled }: JsonFieldInputProps) {
  const [error, setError] = useState<string | null>(null)
  const [jsonString, setJsonString] = useState(() => {
    try {
      return formField.value ? JSON.stringify(formField.value, null, 2) : ""
    } catch {
      return ""
    }
  })

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJsonString(formField.value ? JSON.stringify(formField.value, null, 2) : "")
    } catch {
      setJsonString("")
    }
  }, [formField.value])

  const handleChange = (value: string) => {
    setJsonString(value)
    try {
      const parsed = value.trim() ? JSON.parse(value) : null
      formField.onChange(parsed)
      setError(null)
    } catch {
      setError("Invalid JSON")
    }
  }

  return (
    <FormItem>
      <FormLabel>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </FormLabel>
      <FormControl>
        <Textarea
          value={jsonString}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={field.placeholder || "{ ... }"}
          className="font-mono text-sm"
          style={{ height: field.height || 200 }}
          disabled={disabled || field.readOnly}
        />
      </FormControl>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      {field.description && <FormDescription>{field.description}</FormDescription>}
      <FormMessage />
    </FormItem>
  )
}

export function JsonField({ field, control, disabled }: JsonFieldProps) {
  return (
    <FormField
      control={control}
      name={field.name}
      render={({ field: formField }) => (
        <JsonFieldInput formField={formField} field={field} disabled={disabled} />
      )}
    />
  )
}
