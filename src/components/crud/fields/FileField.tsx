"use client"

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { FileFieldConfig } from "../types"
import type { Control, FieldValues } from "react-hook-form"
import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface FileFieldProps {
  field: FileFieldConfig
  control: Control<FieldValues>
  disabled?: boolean
}

export function FileField({ field, control, disabled }: FileFieldProps) {
  const [preview, setPreview] = useState<string | null>(null)

  return (
      <FormField
          control={control}
          name={field.name}
          render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    {field.type === "image" && (formField.value || preview) && (
                        <div className="relative w-40 h-40 border rounded-md overflow-hidden">
                          <Image src={preview || formField.value} alt={field.label} fill className="object-cover" />
                          <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6"
                              onClick={() => {
                                formField.onChange("")
                                setPreview(null)
                              }}
                              disabled={disabled || field.readOnly}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                    )}
                    <Input
                        type="file"
                        accept={field.accept}
                        multiple={field.multiple}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            if (field.type === "image") {
                              const reader = new FileReader()
                              reader.onload = () => {
                                setPreview(reader.result as string)
                              }
                              reader.readAsDataURL(file)
                            }
                            formField.onChange(file)
                          }
                        }}
                        disabled={disabled || field.readOnly}
                        className="cursor-pointer"
                    />
                  </div>
                </FormControl>
                {field.description && <FormDescription>{field.description}</FormDescription>}
                <FormMessage />
              </FormItem>
          )}
      />
  )
}
