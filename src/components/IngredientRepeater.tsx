'use client'
import { useState, useEffect, useTransition } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import { LocalIngredientSelect } from '@/components/LocalIngredientSelect'
import {useIngredientsQuery} from "@/hooks/queries/use-ingredients";

export type TinyIngredient = { id: string; name: string }
type Unit = 'cl' | 'ml' | 'oz' | 'g' | 'pcs' | 'zest' | 'slice' | 'twist' | 'bottle'

interface Substitute {
  ingredient: TinyIngredient | null
  amount    : string
  unit      : Unit
  show?     : boolean
}

export interface RepeaterIngredient {
  ingredient : TinyIngredient | null
  amount     : string
  unit       : Unit
  optional?  : boolean
  substitutes: Substitute[]
}

interface Props {
  value    : unknown
  onChange : (v: RepeaterIngredient[]) => void
  disabled?: boolean
  error?   : string
}

/* helpers --------------------------------------------------------- */
const blankSub  = (): Substitute       => ({ ingredient: null, amount: '', unit: 'oz' })
const blankItem = (): RepeaterIngredient => ({
  ingredient: null, amount: '', unit: 'oz', optional: false, substitutes: [],
})

function toList(v: unknown): RepeaterIngredient[] {
  return Array.isArray(v) ? (v as RepeaterIngredient[]) : []
}

const inputCls  = "rounded-xl bg-surface border border-line-control px-3 py-2 text-sm font-body text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring focus:border-brand-soft disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
const selectCls = "rounded-xl bg-surface border border-line-control px-3 py-2 text-sm font-body text-fg focus:outline-none focus:ring-1 focus:ring-ring focus:border-brand-soft disabled:opacity-50 disabled:cursor-not-allowed transition-colors"

export default function IngredientRepeater({ value, onChange, disabled, error }: Props) {
  const [items, setItems] = useState<RepeaterIngredient[]>(toList(value))

  useEffect(() => {
    setItems(toList(value))
  }, [value])

  /* ── DB search ─────────────────────────────────────────────────── */
  const [_search, setSearch]     = useState('')
  const [deferredSearch, setDeferredSearch] = useState('')
  const [, startTransition]     = useTransition()

  const handleSearch = (v: string) => {
    setSearch(v)
    startTransition(() => setDeferredSearch(v))
  }

  const { data } = useIngredientsQuery({
    search: deferredSearch || undefined,
    limit: 500,
  })

    const ingredientEntities = data?.items ?? []

  const ingredientOptions: TinyIngredient[] = ingredientEntities.map(e => ({
    id  : e.id,
    name: e.name,
  }))

  /* ── row operations ─────────────────────────────────────────────── */
  const sync     = (next: RepeaterIngredient[]) => { setItems(next); onChange(next) }
  const addRow   = () => sync([...items, blankItem()])
  const rmRow    = (idx: number) => sync(items.filter((_, i) => i !== idx))
  const patchRow = (idx: number, p: Partial<RepeaterIngredient>) =>
    sync(items.map((it, i) => (i === idx ? { ...it, ...p } : it)))

  /* ── substitute operations ──────────────────────────────────────── */
  const addSub   = (row: number) =>
    patchRow(row, { substitutes: [...items[row].substitutes, blankSub()] })
  const patchSub = (row: number, sub: number, p: Partial<Substitute>) =>
    patchRow(row, {
      substitutes: items[row].substitutes.map((s, i) => (i === sub ? { ...s, ...p } : s)),
    })
  const rmSub    = (row: number, sub: number) =>
    patchRow(row, {
      substitutes: items[row].substitutes.filter((_, i) => i !== sub),
    })

  return (
    <div className="space-y-3">
      {items.map((ing, rowIdx) => (
        <div
          key={rowIdx}
          role="group"
          aria-label={`Ingredient ${rowIdx + 1}${ing.ingredient ? `: ${ing.ingredient.name}` : ''}`}
          className="rounded-xl border border-line bg-surface overflow-hidden"
        >

          {/* ── main ingredient line ── */}
          <div className="flex flex-wrap gap-2 items-end p-4">
            <LocalIngredientSelect
              value={ing.ingredient}
              onChange={v => patchRow(rowIdx, { ingredient: v })}
              options={ingredientOptions}
              onSearchChange={handleSearch}
              disabled={disabled}
              label={`Ingredient ${rowIdx + 1}`}
            />

            <input
              type="number" step="0.1"
              className={`w-24 text-right ${inputCls}`}
              placeholder="Qty"
              aria-label={`Quantity for ${ing.ingredient?.name ?? `ingredient ${rowIdx + 1}`}`}
              value={ing.amount}
              disabled={disabled}
              onChange={e => patchRow(rowIdx, { amount: e.target.value })}
            />

            <select
              aria-label={`Unit for ${ing.ingredient?.name ?? `ingredient ${rowIdx + 1}`}`}
              className={`w-24 ${selectCls}`}
              value={ing.unit}
              disabled={disabled}
              onChange={e => patchRow(rowIdx, { unit: e.target.value as Unit })}
            >
              {['cl', 'ml', 'oz', 'g', 'pcs', 'zest', 'slice', 'twist'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!ing.optional}
                disabled={disabled}
                className="w-4 h-4 rounded border-line-control accent-brand"
                onChange={e => patchRow(rowIdx, { optional: e.target.checked })}
              />
              <span className="text-xs font-label uppercase tracking-widest text-fg-muted">Optional</span>
            </label>

            <button
              type="button"
              disabled={disabled}
              onClick={() => rmRow(rowIdx)}
              aria-label={`Remove ${ing.ingredient?.name ?? `ingredient ${rowIdx + 1}`}`}
              className="ml-auto w-7 h-7 flex items-center justify-center rounded-full bg-danger-bg/30 border border-danger/30 text-danger hover:bg-danger-bg/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <X size={13} aria-hidden="true" />
            </button>
          </div>

          {/* ── substitutes tray ── */}
          <div className="border-t border-line bg-canvas px-4 py-3 space-y-2">
            {ing.substitutes.map((sub, subIdx) => (
              <div key={subIdx} className="flex flex-wrap gap-2 items-end">
                <span aria-hidden="true" className="text-xs font-label uppercase tracking-widest text-brand-soft-strong self-center">↳</span>
                <LocalIngredientSelect
                  value={sub.ingredient}
                  onChange={v => patchSub(rowIdx, subIdx, { ingredient: v })}
                  options={ingredientOptions}
                  onSearchChange={handleSearch}
                  disabled={disabled}
                  placeholder="Substitute…"
                  label={`Substitute ${subIdx + 1} for ${ing.ingredient?.name ?? `ingredient ${rowIdx + 1}`}`}
                />

                <input
                  type="number" step="0.1"
                  className={`w-20 text-right ${inputCls}`}
                  placeholder="Qty"
                  aria-label={`Quantity for substitute ${sub.ingredient?.name ?? subIdx + 1}`}
                  value={sub.amount}
                  disabled={disabled}
                  onChange={e => patchSub(rowIdx, subIdx, { amount: e.target.value })}
                />

                <select
                  aria-label={`Unit for substitute ${sub.ingredient?.name ?? subIdx + 1}`}
                  className={`w-20 ${selectCls}`}
                  value={sub.unit}
                  disabled={disabled}
                  onChange={e => patchSub(rowIdx, subIdx, { unit: e.target.value as Unit })}
                >
                  {['cl', 'ml', 'oz', 'g', 'pcs', 'zest', 'slice', 'twist'].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>

                <select
                  aria-label={`Show substitute ${sub.ingredient?.name ?? subIdx + 1} in recipe`}
                  className={`w-28 ${selectCls}`}
                  value={sub.show ? 'show' : 'hide'}
                  disabled={disabled}
                  onChange={e => patchSub(rowIdx, subIdx, { show: e.target.value === 'show' })}
                >
                  <option value="hide">Hide</option>
                  <option value="show">Show</option>
                </select>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => rmSub(rowIdx, subIdx)}
                  aria-label={`Remove substitute ${sub.ingredient?.name ?? subIdx + 1}`}
                  className="w-7 h-7 flex items-center justify-center rounded-full border border-line text-fg-muted hover:bg-line hover:text-fg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Minus size={13} aria-hidden="true" />
                </button>
              </div>
            ))}

            <button
              type="button"
              disabled={disabled}
              onClick={() => addSub(rowIdx)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-widest border border-line text-fg-muted hover:border-brand-soft/40 hover:text-brand hover:bg-brand-soft/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={11} aria-hidden="true" />
              Add substitute
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        disabled={disabled}
        onClick={addRow}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-label uppercase tracking-widest bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand motion-safe:hover:scale-[0.98] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
      >
        <Plus size={13} aria-hidden="true" />
        Add ingredient
      </button>

      {error && <p role="alert" className="text-xs font-body text-danger">{error}</p>}
    </div>
  )
}
