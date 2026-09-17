"use client";

import { useMemo, useState } from "react";

interface BaseIngredientInputProps {
  ingredientOptions: { id: string; name: string }[];
  value: {
    baseIngredientId?: string;
    baseQuantity?: number;
    baseUnit?: string;
    baseShow?: boolean;
  };
  onChange: (val: {
    baseIngredientId?: string;
    baseQuantity?: number;
    baseUnit?: string;
  }) => void;
  disabled?: boolean;
  error?: string;
  onSearchChange?: (search: string) => void;
}

const unitOptions = ["cl", "ml", "oz", "g", "pcs", "zest", "slice", "twist"];

export default function BaseIngredientInput({
                                              ingredientOptions,
                                              value,
                                              onChange,
                                              disabled,
                                              error,
                                              onSearchChange,
                                            }: BaseIngredientInputProps) {
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    const term = search.toLowerCase();
    return ingredientOptions.filter(opt =>
      opt.name.toLowerCase().includes(term)
    );
  }, [search, ingredientOptions]);

  const handleChange = (
    key: keyof typeof value,
    val: string | number | boolean | undefined
  ) => {
    onChange({ ...value, [key]: val });
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Search ingredient..."
        value={search}
        onChange={(e) => {
          const val = e.target.value;
          setSearch(val);
          onSearchChange?.(val); // notify parent
        }}
        disabled={disabled}
        className="w-full rounded border p-2"
      />

      <div className="flex flex-wrap items-center gap-4">
        <select
          className="flex-1 rounded border p-2"
          value={value.baseIngredientId ?? ""}
          disabled={disabled}
          onChange={(e) =>
            handleChange("baseIngredientId", e.target.value || undefined)
          }
        >
          <option value="">Select base ingredient…</option>
          {filteredOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          className="w-28 rounded border p-2"
          placeholder="Quantity"
          value={value.baseQuantity ?? ""}
          disabled={disabled}
          onChange={(e) =>
            handleChange(
              "baseQuantity",
              e.target.value ? parseFloat(e.target.value) : undefined
            )
          }
        />

        <select
          className="w-28 rounded border p-2"
          value={value.baseUnit ?? ""}
          disabled={disabled}
          onChange={(e) =>
            handleChange("baseUnit", e.target.value || undefined)
          }
        >
          <option value="">Unit</option>
          {unitOptions.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!value.baseShow}
            disabled={disabled}
            onChange={(e) =>
              handleChange("baseShow", e.target.checked ? true : undefined)
            }
          />
          Show in recipe
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
