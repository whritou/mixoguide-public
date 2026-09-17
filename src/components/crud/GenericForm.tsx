"use client";

import { useState } from "react";
import { useForm }  from "react-hook-form";
import type { Control, FieldValues, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Card, CardContent, CardDescription, CardFooter,
  CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form }   from "@/components/ui/form";
import { Loader2 } from "lucide-react";

import type { FieldConfig, GenericFormConfig, SelectFieldConfig } from "./types";
import { TextField  } from "./fields/TextField";
import { NumberField} from "./fields/NumberField";
import { SelectField} from "./fields/SelectField";
import { BooleanField}from "./fields/BooleanField";
import { DateTimeField}from "./fields/DateTimeField";
import { FileField  } from "./fields/FileField";
import { TagsField  } from "./fields/TagsField";
import { JsonField  } from "./fields/JsonField";
import { CustomField} from "./fields/CustomField";
import { MultiSelectField } from "./fields/MultiSelectField";

/* -------------------------------------------------------------------------- */
/*  Generic form                                                              */
/* -------------------------------------------------------------------------- */
export function GenericForm<T extends FieldValues>({
                                                             fields,
                                                             onSubmit,
                                                             submitButtonLabel = "Save",
                                                             cancelButtonLabel = "Cancel",
                                                             onCancel,
                                                             defaultValues,
                                                             isLoading,
                                                             title,
                                                             description,
                                                           }: GenericFormConfig<T>) {

  /* ────────────────────────── dynamic Zod schema ───────────────────────── */
  const schema = z.object(
      fields.reduce((acc, f) => {
        if (f.hidden) return acc;

        let s = f.validation || z.unknown();
        if (f.required) {
          if (
              ["text","textarea","email","password","url","select","radio"].includes(f.type)
          ) {
            s = z.string().min(1, "Required");
          } else if (f.type === "number") {
            s = z.number({ required_error: "Required" });
          } else {
            s = s.refine(v => v !== undefined && v !== null, { message: "Required" });
          }
        }
        return { ...acc, [f.name]: s };
      }, {} as Record<string, z.ZodTypeAny>)
  );

  /* ────────────────────── RHF instantiation (loosely typed) ────────────── */
  type FormValues = FieldValues;

  const initialValues = fields.reduce((acc, f) => {
    const raw = defaultValues?.[f.name];
    const val =
        raw === null || raw === undefined
            ? f.defaultValue ?? getDefaultValueFor(f)
            : raw;
    return { ...acc, [f.name]: val };
  }, {} as FormValues);

  const form = useForm<FormValues>({
    resolver     : zodResolver(schema) as Resolver<FormValues>,
    defaultValues: initialValues,
  });

  /* ───────────────────────────────── submit ────────────────────────────── */
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      const transformed = fields.reduce((acc, f) => {
        const v = data[f.name];
        acc[f.name] = f.transform?.output ? f.transform.output(v) : v;
        return acc;
      }, {} as FieldValues);

      await onSubmit(transformed as unknown as T); // cast back to external type
    } finally {
      setSubmitting(false);
    }
  };

  /* ───────────────────────────── render ────────────────────────────────── */
  return (
      <Card className="bg-mg-cream border-mg-sand shadow-sm">
        {(title || description) && (
            <CardHeader className="border-b border-mg-sand pb-5">
              {title       && <CardTitle className="font-headline text-mg-ink text-lg">{title}</CardTitle>}
              {description && <CardDescription className="text-mg-muted font-body text-sm">{description}</CardDescription>}
            </CardHeader>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <CardContent className="space-y-6 pt-6">
              {fields
                  .filter(f => !f.hidden)
                  .map(f => (
                      <div key={f.name}>
                        {renderField(f, form.control, isLoading || submitting, submitting)}
                      </div>
                  ))}
            </CardContent>

            <CardFooter className="flex justify-between gap-3 mt-2 border-t border-mg-sand bg-mg-cream pt-5 rounded-b-xl">
              {onCancel && (
                  <Button
                      type="button"
                      variant="outline"
                      onClick={onCancel}
                      disabled={isLoading || submitting}
                      className="flex-1 rounded-full text-xs font-label uppercase tracking-widest text-mg-charcoal border-mg-sand bg-mg-sand/60 hover:bg-mg-sand hover:text-mg-ink transition-colors"
                  >
                    {cancelButtonLabel}
                  </Button>
              )}

              <Button
                  type="submit"
                  disabled={isLoading || submitting}
                  className={`${onCancel ? "flex-1" : "ml-auto"} rounded-full text-xs font-label uppercase tracking-widest bg-gradient-to-br from-mg-brown to-mg-caramel text-white hover:scale-[0.98] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 border-0`}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitButtonLabel}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
  );
}

/* ----------------------------- helpers ----------------------------------- */

function renderField(
    field: FieldConfig,
    control: Control<FieldValues>,
    disabled?: boolean,
    submitting?: boolean,
) {
  switch (field.type) {
    case "text":
    case "textarea":
    case "email":
    case "password":
    case "url":
      return <TextField field={field} control={control} disabled={disabled} />;
    case "number":
      return <NumberField field={field} control={control} disabled={disabled} />;
    case "select":
    case "radio":
      return (
          <SelectField
              field={field as SelectFieldConfig & { type: "select" | "radio" }}
              control={control}
              disabled={disabled}
          />
      );
    case "multiselect":
      return (
          <MultiSelectField
              field={field as SelectFieldConfig & { type: "multiselect" }}
              control={control}
              disabled={disabled}
          />
      );
    case "checkbox":
    case "switch":
      return <BooleanField field={field} control={control} disabled={disabled} />;
    case "date":
    case "time":
    case "datetime":
      return <DateTimeField field={field} control={control} disabled={disabled} />;
    case "image":
    case "file":
      return <FileField field={field} control={control} disabled={disabled} />;
    case "tags":
      return <TagsField field={field} control={control} disabled={disabled} />;
    case "json":
      return <JsonField field={field} control={control} disabled={disabled} />;
    case "custom":
      return (
          <CustomField
              field={field}
              control={control}
              disabled={disabled}
              isSubmitting={submitting}
          />
      );
    default:
      return null;
  }
}

function getDefaultValueFor(f: FieldConfig) {
  switch (f.type) {
    case "number":
      return undefined;
    case "multiselect":
      return [];
    case "checkbox":
    case "switch":
      return false;
    case "image":
    case "file":
      return null;
    default:
      return "";
  }
}
