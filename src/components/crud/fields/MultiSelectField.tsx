"use client";

import { useState } from "react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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

                  <FormControl>
                    <div className="space-y-2">
                      <Input
                          type="search"
                          placeholder="Search…"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          disabled={disabled || field.readOnly}
                          className="rounded-xl bg-surface border-line-control text-sm font-body text-fg placeholder:text-fg-muted focus-visible:ring-ring/40 focus-visible:border-brand-soft"
                      />
                      <ScrollArea className="h-[150px] rounded-xl border border-line bg-surface p-2">
                        <div className="space-y-0.5">
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
                        </div>
                      </ScrollArea>
                    </div>
                  </FormControl>

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
                                        className="text-brand/60 hover:text-brand transition-colors"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                )}
                              </span>
                          );
                        })}
                      </div>
                  )}

                  {field.description && (
                      <FormDescription className="text-xs text-fg-muted/70 font-body">{field.description}</FormDescription>
                  )}
                  <FormMessage className="text-xs" />
                </FormItem>
            );
          }}
      />
  );
}
