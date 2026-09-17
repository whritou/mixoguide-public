import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import type { DateTimeFieldConfig } from "../types"
import type { Control, FieldValues } from "react-hook-form"
import { Input } from "@/components/ui/input"

interface DateTimeFieldProps {
  field: DateTimeFieldConfig
  control: Control<FieldValues>
  disabled?: boolean
}

export function DateTimeField({ field, control, disabled }: DateTimeFieldProps) {
  return (
      <FormField
          control={control}
          name={field.name}
          render={({ field: formField }) => (
              <FormItem>
                <FormLabel className="text-xs font-label uppercase tracking-widest text-mg-muted">
                  {field.label}
                  {field.required && <span className="text-mg-caramel ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                      type={field.type}
                      min={field.min}
                      max={field.max}
                      placeholder={field.placeholder}
                      className="rounded-xl bg-white border-mg-sand text-sm font-body text-mg-ink placeholder:text-mg-muted focus-visible:ring-mg-caramel/40 focus-visible:border-mg-caramel"
                      {...formField}
                      disabled={disabled || field.readOnly}
                  />
                </FormControl>
                {field.description && <FormDescription className="text-xs text-mg-muted/70 font-body">{field.description}</FormDescription>}
                <FormMessage className="text-xs" />
              </FormItem>
          )}
      />
  )
}
