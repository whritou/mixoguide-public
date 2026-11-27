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
                  <FormLabel className="text-xs font-label uppercase tracking-widest text-fg-muted">
                    {field.label}
                    {field.required && <span className="text-brand-soft-strong ml-1">*</span>}
                  </FormLabel>
                  <div className="space-y-2">
                      {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-label uppercase tracking-wider bg-brand-soft/15 text-brand border border-brand-soft/20"
                                >
                                  {tag}
                                  {!disabled && !field.readOnly && (
                                      <button
                                          type="button"
                                          aria-label={`Remove ${tag}`}
                                          className="-my-1 -mr-1.5 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full p-1.5 text-brand-soft-strong hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                          onClick={() => removeTag(index)}
                                      >
                                        <X className="h-3 w-3" aria-hidden="true" />
                                      </button>
                                  )}
                                </span>
                            ))}
                          </div>
                      )}
                      {(!field.maxTags || tags.length < field.maxTags) && !disabled && !field.readOnly && (
                          <div className="flex gap-2">
                            {/* A11Y-006: FormControl wraps the actual input so label/description/error ids land on it. */}
                            <FormControl>
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
                                className="rounded-xl bg-surface border-line-control text-sm font-body text-fg placeholder:text-fg-muted focus-visible:ring-ring focus-visible:border-brand-soft"
                            />
                            </FormControl>
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
                                        aria-label={`Add tag ${suggestion}`}
                                        onClick={() => addTag(suggestion)}
                                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-label uppercase tracking-wider border border-line text-fg-muted hover:border-brand-soft/40 hover:text-brand hover:bg-brand-soft/5 transition-colors"
                                    >
                                      {suggestion}
                                    </button>
                                ))}
                          </div>
                      )}
                    </div>
                  {field.description && <FormDescription className="text-xs text-fg-muted font-body">{field.description}</FormDescription>}
                  <FormMessage className="text-xs" />
                </FormItem>
            )
          }}
      />
  )
}
