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
import { useState } from 'react'

type TinyIngredient = { id: string; name: string }

interface Props {
  value          : TinyIngredient | null
  onChange       : (v: TinyIngredient | null) => void
  options        : TinyIngredient[]
  onSearchChange?: (v: string) => void
  disabled?      : boolean
  placeholder?   : string
}

export function LocalIngredientSelect({
  value, onChange, options, onSearchChange, disabled, placeholder = 'Select…',
}: Props) {
  const [open, setOpen] = useState(false)

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
          role="combobox"
          aria-label="Select ingredient"
          aria-controls="ingredient-list"
          aria-expanded={open}
          disabled={disabled}
          className="flex-1 min-w-[180px] flex items-center justify-between px-4 py-2 rounded-xl bg-surface border border-line-control
                     text-sm font-body text-fg focus:outline-none focus:ring-1 focus:ring-ring/40
                     hover:border-brand-soft/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className={value ? 'text-fg' : 'text-fg-muted'}>
            {value ? value.name : placeholder}
          </span>
          <ChevronsUpDown size={14} className="shrink-0 text-fg-muted" />
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
