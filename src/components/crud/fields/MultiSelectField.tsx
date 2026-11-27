"use client";

import { useState } from "react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import type { SelectFieldConfig } from "../types";
import type { Control, FieldValues } from "react-hook-form";

interface MultiSelectFieldProps {
  field: SelectFieldConfig & { type: "multiselect" };
  control: Control<FieldValues>;
  disabled?: boolean;
}

export function MultiSelectField({
                                   field,
                                   control,
                                   disabled,
                                 }: MultiSelectFieldProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = field.options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
      <FormField
          control={control}
          name={field.name}
          render={({ field: formField }) => {
            const value: (string | number | boolean)[] =
                Array.isArray(formField.value) ? formField.value : [];

            const toggle = (v: string) =>
                formField.onChange(
                    value.includes(v)
                        ? value.filter((x) => x !== v)
                        : [...value, v]
                );

            return (
                <FormItem>
                  <FormLabel className="text-xs font-label uppercase tracking-widest text-fg-muted">
                    {field.label}
                    {field.required && (
                        <span className="text-brand-soft-strong ml-1">*</span>
                    )}
                  </FormLabel>

                  <div className="space-y-2">
                      <Input
                          type="search"
                          aria-label={`Search ${field.label} options`}
                          placeholder="Search…"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          disabled={disabled || field.readOnly}
                          className="rounded-xl bg-surface border-line-control text-sm font-body text-fg placeholder:text-fg-muted focus-visible:ring-ring focus-visible:border-brand-soft"
                      />
                      <ScrollArea className="h-[150px] rounded-xl border border-line bg-surface p-2">
                        {/* A11Y-006: FormControl ids/aria land on the labelled group of checkboxes. */}
                        <FormControl>
                        <LabelledGroup className="space-y-0.5">
                          {filteredOptions.map((opt) => (
                              <label
                                  key={opt.value.toString()}
                                  className="flex items-center gap-2.5 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-brand-soft/5 transition-colors"
                              >
                                <Checkbox
                                    checked={value.includes(opt.value)}
                                    onCheckedChange={() => toggle(opt.value.toString())}
                                    disabled={disabled || field.readOnly}
                                    className="border-line-control data-[state=checked]:bg-brand data-[state=checked]:border-brand"
                                />
                                <span className="text-sm font-body text-fg">{opt.label}</span>
                              </label>
                          ))}
                        </LabelledGroup>
                        </FormControl>
                      </ScrollArea>
                    </div>

                  {value.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {value.map((v) => {
                          const opt = field.options.find((o) => o.value === v);
                          return (
                              <span
                                  key={v.toString()}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-label uppercase tracking-wider bg-brand-soft/15 text-brand border border-brand-soft/20"
                              >
                                {opt ? opt.label : v.toString()}
                                {!disabled && !field.readOnly && (
                                    <button
                                        type="button"
                                        onClick={() => toggle(v.toString())}
                                        aria-label={`Remove ${opt ? opt.label : v.toString()}`}
                                        className="-my-1 -mr-1.5 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full p-1.5 text-brand-soft-strong hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                      <X className="h-3 w-3" aria-hidden="true" />
                                    </button>
                                )}
                              </span>
                          );
                        })}
                      </div>
                  )}

                  {field.description && (
                      <FormDescription className="text-xs text-fg-muted font-body">{field.description}</FormDescription>
                  )}
                  <FormMessage className="text-xs" />
                </FormItem>
            );
          }}
      />
  );
}

/** role="group" labelled by the field's FormLabel (FormControl adds id/aria-describedby/aria-invalid). */
function LabelledGroup(props: React.ComponentProps<"div">) {
  const { formLabelId } = useFormField();
  return <div role="group" aria-labelledby={formLabelId} {...props} />;
}
