'use client'
import { useMemo } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Check } from 'lucide-react'
import clsx from 'clsx'
import { useId, useState } from 'react'

type TinyIngredient = { id: string; name: string }

interface Props {
  value          : TinyIngredient | null
  onChange       : (v: TinyIngredient | null) => void
  options        : TinyIngredient[]
  onSearchChange?: (v: string) => void
  disabled?      : boolean
  placeholder?   : string
  /** Accessible name prefix for the trigger (announced together with the current value). */
  label?         : string
}

export function LocalIngredientSelect({
  value, onChange, options, onSearchChange, disabled, placeholder = 'Select…', label = 'Ingredient',
}: Props) {
  const [open, setOpen] = useState(false)
  // A11Y-022: per-instance ids; the trigger reads "label, current value".
  // Radix PopoverTrigger supplies aria-controls/aria-expanded/aria-haspopup itself.
  const uid = useId()
  const labelId = `${uid}-label`
  const valueId = `${uid}-value`

  // Always include the currently selected item even if not in filtered options list
  const displayOptions = useMemo(() => {
    if (value && !options.find(o => o.id === value.id)) {
      return [value, ...options]
    }
    return options
  }, [options, value])

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-labelledby={`${labelId} ${valueId}`}
          disabled={disabled}
          className="flex-1 min-w-[180px] flex items-center justify-between px-4 py-2 rounded-xl bg-surface border border-line-control
                     text-sm font-body text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
                     hover:border-brand-soft/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span id={labelId} className="sr-only">{label}</span>
          <span id={valueId} className={value ? 'text-fg' : 'text-fg-muted'}>
            {value ? value.name : placeholder}
          </span>
          <ChevronsUpDown size={14} aria-hidden="true" className="shrink-0 text-fg-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 rounded-xl border-line"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search…"
            aria-label={`Search ${label.toLowerCase()}s`}
            onValueChange={(v) => onSearchChange?.(v)}
            className="text-sm font-body"
          />
          <CommandList className="max-h-60">
            <CommandEmpty className="text-sm font-body text-fg-muted py-4 text-center">
              No ingredient found.
            </CommandEmpty>
            <CommandGroup>
              {displayOptions.map(ing => (
                <CommandItem
                  key={ing.id}
                  value={ing.id}
                  onSelect={() => {
                    onChange(ing.id === value?.id ? null : ing)
                    setOpen(false)
                  }}
                  className="flex items-center gap-2 cursor-pointer text-sm font-body text-fg hover:bg-brand-soft/8"
                >
                  <span className="flex-1">{ing.name}</span>
                  <Check
                    aria-hidden="true"
                    size={14}
                    className={clsx('shrink-0 text-brand-soft-strong', value?.id === ing.id ? 'opacity-100' : 'opacity-0')}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
