/* src/components/crud/fields/SelectField.tsx */
"use client";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { SelectFieldConfig } from "../types";
import type { Control, FieldValues } from "react-hook-form";
import { Label } from "@/components/ui/label";

interface Props {
  field: SelectFieldConfig & { type: "select" | "radio" };
  control: Control<FieldValues>;
  disabled?: boolean;
}

export function SelectField({ field, control, disabled }: Props) {
  /* ---------- radio buttons ------------------------------------------- */
  if (field.type === "radio") {
    return (
        <FormField
            control={control}
            name={field.name}
            render={({ field: f }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-xs font-label uppercase tracking-widest text-fg-muted">
                    {field.label}
                    {field.required && <span className="text-brand-soft-strong ml-1">*</span>}
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                        onValueChange={f.onChange}
                        value={f.value ?? ""}
                        className="flex flex-col space-y-1"
                        disabled={disabled || field.readOnly}
                    >
                      {field.options.map((o) => (
                          <div key={o.value.toString()} className="flex items-center space-x-2 rounded-xl border border-line bg-surface px-4 py-2.5">
                            <RadioGroupItem value={o.value.toString()} id={`${field.name}-${o.value}`} className="border-line-control text-brand" />
                            <Label htmlFor={`${field.name}-${o.value}`} className="text-sm font-body text-fg cursor-pointer">{o.label}</Label>
                          </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  {field.description && <FormDescription className="text-xs text-fg-muted/70 font-body">{field.description}</FormDescription>}
                  <FormMessage className="text-xs" />
                </FormItem>
            )}
        />
    );
  }

  /* ---------- single select ------------------------------------------- */
  return (
      <FormField
          control={control}
          name={field.name}
          render={({ field: f }) => (
              <FormItem>
                <FormLabel className="text-xs font-label uppercase tracking-widest text-fg-muted">
                  {field.label}
                  {field.required && <span className="text-brand-soft-strong ml-1">*</span>}
                </FormLabel>

                <Select
                    onValueChange={f.onChange}
                    value={f.value ?? ""}
                    disabled={disabled || field.readOnly}
                >
                  <FormControl>
                    <SelectTrigger className="rounded-xl bg-surface border-line-control text-sm font-body text-fg focus:ring-ring/40 focus:border-brand-soft data-[placeholder]:text-fg-muted">
                      <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-xl border-line bg-canvas">
                    {field.options.map((o) => (
                        <SelectItem
                            key={o.value.toString()}
                            value={o.value.toString()}
                            className="text-sm font-body text-fg focus:bg-brand-soft/10 focus:text-brand"
                        >
                          {o.label}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {field.description && <FormDescription className="text-xs text-fg-muted/70 font-body">{field.description}</FormDescription>}
                <FormMessage className="text-xs" />
              </FormItem>
          )}
      />
  );
}
