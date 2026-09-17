"use client";

import Image from "next/image";
import type { FieldValues } from "react-hook-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FieldConfig, GenericViewConfig } from "./types";
import Loader from '@/components/ui/Loader';

function ActionButtons({ actions }: { actions: GenericViewConfig<FieldValues>["actions"] }) {
  return (
    <div className="flex gap-3">
      {actions?.map((action, index) => {
        const isPrimary = action.variant === "default" || !action.variant;
        return (
            <Button
                key={index}
                variant={action.variant || "default"}
                onClick={action.onClick}
                className={isPrimary
                    ? "rounded-full text-xs font-label uppercase tracking-widest bg-gradient-to-br from-mg-brown to-mg-caramel text-white hover:scale-[0.98] transition-transform duration-200 border-0"
                    : "rounded-full text-xs font-label uppercase tracking-widest border-mg-sand bg-mg-sand/60 text-mg-charcoal hover:bg-mg-sand hover:text-mg-ink transition-colors"
                }
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
        );
      })}
    </div>
  );
}

export function GenericView<
    T extends FieldValues
>({
    fields,
    data,
    title,
    description,
    actions,
    isLoading,
    layout = "default",
    customLayout,
    imageField,
  }: GenericViewConfig<T>) {

  const renderFieldValue = (field: FieldConfig, value: FieldValues[string]) => {
    if (field.type === "custom" && typeof field.render === "function") {
      return field.render({
        value,
        onChange: () => {},
        error: undefined,
        isSubmitting: false,
        props: {},
      });
    }

    if (value === null || value === undefined) {
      return <p className="text-sm font-body text-mg-muted/60 italic">Not defined</p>;
    }

    switch (field.type) {
      case "text":
      case "textarea":
      case "email":
      case "password":
      case "url":
      case "number":
        return <p className="text-sm font-body text-mg-ink break-words">{value}</p>;
      case "date":
      case "time":
      case "datetime":
        return <p className="text-sm font-body text-mg-ink">{new Date(value).toLocaleString()}</p>;
      case "select":
      case "radio": {
        const option = (field.options || []).find((opt) => opt.value === value);
        return <p className="text-sm font-body text-mg-ink">{option ? option.label : value}</p>;
      }
      case "multiselect": {
        const options = field.options || [];
        return (
            <div className="flex flex-wrap gap-1.5">
              {Array.isArray(value) &&
                  value.map((val, index: number) => {
                    const option = options.find((opt) => opt.value === val);
                    return (
                        <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-label uppercase tracking-wider bg-mg-caramel/15 text-mg-brown border border-mg-caramel/20">
                          {option ? option.label : val}
                        </span>
                    );
                  })}
            </div>
        );
      }
      case "checkbox":
      case "switch":
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-label uppercase tracking-wider border ${
                value
                    ? "bg-mg-caramel/15 text-mg-brown border-mg-caramel/20"
                    : "bg-mg-sand/60 text-mg-muted border-mg-sand"
            }`}>
              {value ? "Yes" : "No"}
            </span>
        );
      case "image":
        return value ? (
            <div className="relative w-full h-48 border border-mg-sand rounded-xl overflow-hidden">
              <Image
                  src={value || "/placeholder.svg"}
                  alt={field.label}
                  fill
                  className="object-cover"
              />
            </div>
        ) : (
            <p className="text-sm font-body text-mg-muted/60 italic">No image</p>
        );
      case "file":
        return value ? (
            <p className="text-sm font-body text-mg-brown underline">
              {typeof value === "string" ? value : "Uploaded file"}
            </p>
        ) : (
            <p className="text-sm font-body text-mg-muted/60 italic">No file</p>
        );
      case "tags":
        return (
            <div className="flex flex-wrap gap-1.5">
              {Array.isArray(value) &&
                  value.map((tag, index: number) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-label uppercase tracking-wider bg-mg-caramel/15 text-mg-brown border border-mg-caramel/20">
                        {tag}
                      </span>
                  ))}
            </div>
        );
      case "json":
      default:
        return (
            <pre className="bg-mg-linen border border-mg-sand p-3 rounded-xl text-xs font-body text-mg-charcoal overflow-auto max-h-40 w-full">
              {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
            </pre>
        );
    }
  };

  if (isLoading) {
    return (
        <Card className="bg-mg-cream border-mg-sand">
          <CardContent className="pt-6">
            <Loader variant="card" />
          </CardContent>
        </Card>
    );
  }

  if (layout === "custom" && customLayout) {
    return (
        <Card className="bg-mg-cream border-mg-sand shadow-sm">
          {(title || description) && (
              <CardHeader className="border-b border-mg-sand pb-5">
                {title && (
                    <CardTitle className="font-headline text-mg-ink text-lg md:text-2xl">{title}</CardTitle>
                )}
                {description && <CardDescription className="text-mg-muted font-body text-sm">{description}</CardDescription>}
              </CardHeader>
          )}
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-24">
              {/* Left column */}
              <div>
                <h3 className="text-xs font-label uppercase tracking-widest text-mg-muted mb-4">Informations</h3>
                <div className="space-y-5">
                  {customLayout.leftColumn.map((fieldName) => {
                    const field = fields.find((f) => f.name === fieldName);
                    if (!field) return null;

                    return (
                        <div key={fieldName} className="space-y-1.5">
                          <p className="text-xs font-label uppercase tracking-widest text-mg-muted">
                            {field.label}
                          </p>
                          {renderFieldValue(field, data[fieldName])}
                        </div>
                    );
                  })}
                </div>
              </div>

              {customLayout.rightColumn === "image" && imageField && (
                  <div>
                    <h3 className="text-xs font-label uppercase tracking-widest text-mg-muted mb-4">{imageField.label}</h3>
                    <div className="relative aspect-square max-w-[300px] border border-mg-sand rounded-xl overflow-hidden">
                        <Image
                            src={(data[imageField.name] as string) || "/placeholder.svg?height=300&width=300"}
                            alt={imageField.alt || imageField.label}
                            fill
                            className="object-cover"
                        />
                    </div>
                  </div>
              )}
            </div>
          </CardContent>
          {actions && actions.length > 0 && (
              <CardFooter className="flex justify-between border-t border-mg-sand bg-mg-cream pt-5 rounded-b-xl gap-3">
                <ActionButtons actions={actions} />
              </CardFooter>
          )}
        </Card>
    );
  }

  return (
      <Card className="bg-mg-cream border-mg-sand shadow-sm">
        {(title || description) && (
            <CardHeader className="border-b border-mg-sand pb-5">
              {title && <CardTitle className="font-headline text-mg-ink text-lg">{title}</CardTitle>}
              {description && <CardDescription className="text-mg-muted font-body text-sm">{description}</CardDescription>}
            </CardHeader>
        )}
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fields
                .filter((field) => !field.hidden)
                .map((field) => (
                    <div key={field.name} className="space-y-1.5">
                      <p className="text-xs font-label uppercase tracking-widest text-mg-muted">
                        {field.label}
                      </p>
                      {renderFieldValue(field, data[field.name])}
                    </div>
                ))}
          </div>
        </CardContent>
        {actions && actions.length > 0 && (
            <CardFooter className="flex justify-between border-t border-mg-sand bg-mg-cream pt-5 rounded-b-xl gap-3">
              <ActionButtons actions={actions} />
            </CardFooter>
        )}
      </Card>
  );
}
