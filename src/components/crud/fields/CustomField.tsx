import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import type { CustomFieldConfig } from "../types"
import type { Control, FieldValues } from "react-hook-form"

interface CustomFieldProps {
  field: CustomFieldConfig
  control: Control<FieldValues>
  disabled?: boolean
  isSubmitting?: boolean
}

export function CustomField({ field, control, isSubmitting }: CustomFieldProps) {
  return (
      <FormField
          control={control}
          name={field.name}
          render={({ field: formField, fieldState }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>

                <FormControl>
                  {field.render({
                    value: formField.value,
                    onChange: formField.onChange,
                    error: fieldState.error?.message,
                    isSubmitting,
                    props: field.props,
                  })}
                </FormControl>

                {field.description && <FormDescription>{field.description}</FormDescription>}
                <FormMessage />
              </FormItem>
          )}
      />
  )
}
