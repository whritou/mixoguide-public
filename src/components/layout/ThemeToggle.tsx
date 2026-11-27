"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun, SunMoon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { isDarkModeAvailable } from "@/lib/env"
import { cn } from "@/lib/utils"

export const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const

type ThemeChoice = (typeof THEME_OPTIONS)[number]["value"]

export function ThemeRadioItems({
  theme,
  onChange,
}: {
  theme: string | undefined
  onChange: (value: ThemeChoice) => void
}) {
  return (
    <DropdownMenuRadioGroup value={theme} onValueChange={(value) => onChange(value as ThemeChoice)}>
      {THEME_OPTIONS.map((option) => (
        <DropdownMenuRadioItem key={option.value} value={option.value}>
          {option.label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}

export function ThemeToggleView({
  mounted,
  theme,
  resolvedTheme,
  onChange,
  className,
}: {
  mounted: boolean
  theme: string | undefined
  resolvedTheme: string | undefined
  onChange: (value: ThemeChoice) => void
  className?: string
}) {
  const Icon = !mounted ? SunMoon : resolvedTheme === "dark" ? Moon : Sun
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Theme"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-soft/25 bg-surface/60 text-brand transition-colors hover:border-brand-soft hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <Icon size={16} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[130]">
        <ThemeRadioItems theme={mounted ? theme : undefined} onChange={onChange} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const subscribeNoop = () => () => {}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false)

  if (!isDarkModeAvailable()) return null

  return <ThemeToggleView mounted={mounted} theme={theme} resolvedTheme={resolvedTheme} onChange={setTheme} className={className} />
}
