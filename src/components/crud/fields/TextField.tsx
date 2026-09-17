import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { TextFieldConfig } from "../types"
import type { Control, FieldValues } from "react-hook-form"

interface TextFieldProps {
  field: TextFieldConfig
  control: Control<FieldValues>
  disabled?: boolean
}

export function TextField({ field, control, disabled }: TextFieldProps) {
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
                  {field.type === "textarea" ? (
                      <Textarea
                          placeholder={field.placeholder}
                          className="resize-none rounded-xl bg-white border-mg-sand text-sm font-body text-mg-ink placeholder:text-mg-muted focus-visible:ring-mg-caramel/40 focus-visible:border-mg-caramel"
                          {...formField}
                          disabled={disabled || field.readOnly}
                      />
                  ) : (
                      <Input
                          type={field.type}
                          placeholder={field.placeholder}
                          className="rounded-xl bg-white border-mg-sand text-sm font-body text-mg-ink placeholder:text-mg-muted focus-visible:ring-mg-caramel/40 focus-visible:border-mg-caramel"
                          {...formField}
                          disabled={disabled || field.readOnly}
                      />
                  )}
                </FormControl>
                {field.description && <FormDescription className="text-xs text-mg-muted/70 font-body">{field.description}</FormDescription>}
                <FormMessage className="text-xs" />
              </FormItem>
          )}
      />
  )
}
