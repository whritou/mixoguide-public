import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import type { BooleanFieldConfig } from "../types"
import type { Control, FieldValues } from "react-hook-form"

interface BooleanFieldProps {
  field: BooleanFieldConfig
  control: Control<FieldValues>
  disabled?: boolean
}

export function BooleanField({ field, control, disabled }: BooleanFieldProps) {
  if (field.type === "switch") {
    return (
        <FormField
            control={control}
            name={field.name}
            render={({ field: formField }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-body text-fg leading-none">
                      {field.label}
                      {field.required && <span className="text-brand-soft-strong ml-1">*</span>}
                    </FormLabel>
                    {field.description && <FormDescription className="text-xs text-fg-muted">{field.description}</FormDescription>}
                  </div>
                  <FormControl>
                    <Switch
                        checked={formField.value}
                        onCheckedChange={formField.onChange}
                        disabled={disabled || field.readOnly}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
            )}
        />
    )
  }

  return (
      <FormField
          control={control}
          name={field.name}
          render={({ field: formField }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-line bg-surface px-4 py-3">
                <FormControl>
                  <Checkbox
                      checked={formField.value}
                      onCheckedChange={formField.onChange}
                      disabled={disabled || field.readOnly}
                      className="border-line-control data-[state=checked]:bg-brand data-[state=checked]:border-brand"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-body text-fg">
                    {field.label}
                    {field.required && <span className="text-brand-soft-strong ml-1">*</span>}
                  </FormLabel>
                  {field.description && <FormDescription className="text-xs text-fg-muted">{field.description}</FormDescription>}
                </div>
                <FormMessage className="text-xs" />
              </FormItem>
          )}
      />
  )
}
