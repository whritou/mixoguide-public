export type BarSource = "shared" | "example" | "own";

export function resolveBar(input: {
  stored: string[];
  touched: boolean;
  shared: string[];
  initial: string[];
}): { ids: string[]; source: BarSource } {
  if (!input.touched && input.shared.length > 0) return { ids: input.shared, source: "shared" };
  if (!input.touched && input.stored.length === 0) return { ids: input.initial, source: "example" };
  return { ids: input.stored, source: "own" };
}
