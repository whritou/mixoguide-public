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
                  <FormLabel className="text-xs font-label uppercase tracking-widest text-mg-muted">
                    {field.label}
                    {field.required && (
                        <span className="text-mg-caramel ml-1">*</span>
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
                          className="rounded-xl bg-white border-mg-sand text-sm font-body text-mg-ink placeholder:text-mg-muted focus-visible:ring-mg-caramel/40 focus-visible:border-mg-caramel"
                      />
                      <ScrollArea className="h-[150px] rounded-xl border border-mg-sand bg-white p-2">
                        <div className="space-y-0.5">
                          {filteredOptions.map((opt) => (
                              <label
                                  key={opt.value.toString()}
                                  className="flex items-center gap-2.5 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-mg-caramel/5 transition-colors"
                              >
                                <Checkbox
                                    checked={value.includes(opt.value)}
                                    onCheckedChange={() => toggle(opt.value.toString())}
                                    disabled={disabled || field.readOnly}
                                    className="border-mg-sand data-[state=checked]:bg-mg-brown data-[state=checked]:border-mg-brown"
                                />
                                <span className="text-sm font-body text-mg-ink">{opt.label}</span>
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
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-label uppercase tracking-wider bg-mg-caramel/15 text-mg-brown border border-mg-caramel/20"
                              >
                                {opt ? opt.label : v.toString()}
                                {!disabled && !field.readOnly && (
                                    <button
                                        type="button"
                                        onClick={() => toggle(v.toString())}
                                        className="text-mg-brown/60 hover:text-mg-brown transition-colors"
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
                      <FormDescription className="text-xs text-mg-muted/70 font-body">{field.description}</FormDescription>
                  )}
                  <FormMessage className="text-xs" />
                </FormItem>
            );
          }}
      />
  );
}
