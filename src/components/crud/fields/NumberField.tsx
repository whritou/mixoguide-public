"use client"

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { NumberFieldConfig } from "../types"
import type { Control, FieldValues } from "react-hook-form"

interface NumberFieldProps {
  field: NumberFieldConfig
  control: Control<FieldValues>
  disabled?: boolean
}

export function NumberField({ field, control, disabled }: NumberFieldProps) {
  return (
      <FormField
          control={control}
          name={field.name}
          render={({ field: formField }) => (
              <FormItem>
                <FormLabel className="text-xs font-label uppercase tracking-widest text-fg-muted">
                  {field.label}
                  {field.required && <span className="text-brand-soft-strong ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      placeholder={field.placeholder}
                      className="rounded-xl bg-surface border-line-control text-sm font-body text-fg placeholder:text-fg-muted focus-visible:ring-ring/40 focus-visible:border-brand-soft"
                      {...formField}
                      onChange={(e) => {
                        const value = e.target.value === "" ? "" : Number(e.target.value)
                        formField.onChange(value)
                      }}
                      disabled={disabled || field.readOnly}
                  />
                </FormControl>
                {field.description && <FormDescription className="text-xs text-fg-muted/70 font-body">{field.description}</FormDescription>}
                <FormMessage className="text-xs" />
              </FormItem>
          )}
      />
  )
}
