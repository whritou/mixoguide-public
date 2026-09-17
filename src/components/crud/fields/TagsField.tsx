"use client"

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import type { TagsFieldConfig } from "../types"
import type { Control, FieldValues } from "react-hook-form"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

interface TagsFieldProps {
  field: TagsFieldConfig
  control: Control<FieldValues>
  disabled?: boolean
}

export function TagsField({ field, control, disabled }: TagsFieldProps) {
  const [inputValue, setInputValue] = useState("")

  return (
      <FormField
          control={control}
          name={field.name}
          render={({ field: formField }) => {
            const tags = Array.isArray(formField.value) ? formField.value : []

            const addTag = (tag: string) => {
              if (!tag.trim()) return
              if (tags.includes(tag.trim())) return
              if (field.maxTags && tags.length >= field.maxTags) return
              formField.onChange([...tags, tag.trim()])
              setInputValue("")
            }

            const removeTag = (index: number) => {
              const newTags = [...tags]
              newTags.splice(index, 1)
              formField.onChange(newTags)
            }

            return (
                <FormItem>
                  <FormLabel className="text-xs font-label uppercase tracking-widest text-mg-muted">
                    {field.label}
                    {field.required && <span className="text-mg-caramel ml-1">*</span>}
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-label uppercase tracking-wider bg-mg-caramel/15 text-mg-brown border border-mg-caramel/20"
                                >
                                  {tag}
                                  {!disabled && !field.readOnly && (
                                      <button
                                          type="button"
                                          className="text-mg-brown/60 hover:text-mg-brown transition-colors"
                                          onClick={() => removeTag(index)}
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                  )}
                                </span>
                            ))}
                          </div>
                      )}
                      {(!field.maxTags || tags.length < field.maxTags) && !disabled && !field.readOnly && (
                          <div className="flex gap-2">
                            <Input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === ",") {
                                    e.preventDefault()
                                    addTag(inputValue)
                                  }
                                }}
                                placeholder={field.placeholder || "Add a tag…"}
                                disabled={disabled || field.readOnly}
                                className="rounded-xl bg-white border-mg-sand text-sm font-body text-mg-ink placeholder:text-mg-muted focus-visible:ring-mg-caramel/40 focus-visible:border-mg-caramel"
                            />
                          </div>
                      )}
                      {field.suggestions && field.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {field.suggestions
                                .filter((s) => !tags.includes(s))
                                .map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => addTag(suggestion)}
                                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-label uppercase tracking-wider border border-mg-sand text-mg-muted hover:border-mg-caramel/40 hover:text-mg-brown hover:bg-mg-caramel/5 transition-colors"
                                    >
                                      {suggestion}
                                    </button>
                                ))}
                          </div>
                      )}
                    </div>
                  </FormControl>
                  {field.description && <FormDescription className="text-xs text-mg-muted/70 font-body">{field.description}</FormDescription>}
                  <FormMessage className="text-xs" />
                </FormItem>
            )
          }}
      />
  )
}
