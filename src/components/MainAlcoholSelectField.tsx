'use client'
import { useState, useTransition, useMemo } from 'react'
import { LocalIngredientSelect } from '@/components/LocalIngredientSelect'
import {useIngredientsQuery} from "@/hooks/queries/use-ingredients";

// Module-level cache — persists across re-renders without touching React state
const nameCache = new Map<string, string>()

interface Props {
  value    : string
  onChange : (id: string) => void
  disabled?: boolean
}

export function MainAlcoholSelectField({ value, onChange, disabled }: Props) {
  const [deferredSearch, setDeferredSearch] = useState('')
  const [, startTransition] = useTransition()

  const handleSearch = (v: string) => {
    startTransition(() => setDeferredSearch(v))
  }

  const { data } = useIngredientsQuery({
    search: deferredSearch || undefined,
    limit: 200,
  })


    const ingredients = useMemo(() => data?.items ?? [], [data?.items])

  const options = useMemo(() => {
    const opts = ingredients.map(i => ({ id: i.id, name: i.name }))
    opts.forEach(o => nameCache.set(o.id, o.name))
    return opts
  }, [ingredients])

  const selected = useMemo(() => {
    if (!value) return null
    const found = options.find(o => o.id === value)
    if (found) return found
    const cachedName = nameCache.get(value)
    return cachedName ? { id: value, name: cachedName } : { id: value, name: '…' }
  }, [value, options])

  return (
    <LocalIngredientSelect
      value={selected}
      onChange={v => onChange(v?.id ?? '')}
      options={options}
      onSearchChange={handleSearch}
      disabled={disabled}
      placeholder="Select main alcohol…"
      label="Main alcohol"
    />
  )
}
