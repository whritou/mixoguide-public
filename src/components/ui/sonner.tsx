"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps, toast } from "sonner"

/** WCAG 2.2.1: give people time to read toasts (was 1s). */
export const TOAST_DURATION_MS = 6000
/** Errors stay longer and carry a close button so they can be dismissed. */
export const TOAST_ERROR_DURATION_MS = 10000

// Sonner has no per-type default duration, and ~150 call sites import `toast`
// straight from "sonner". Wrap `toast.error` once (module scope, idempotent) so
// every error toast defaults to the longer duration; callers can still override.
type PatchedToast = typeof toast & { __mgErrorPatched?: boolean }
const patched = toast as PatchedToast
if (!patched.__mgErrorPatched) {
  const originalError = toast.error
  patched.error = ((message, data) =>
    originalError(message, { duration: TOAST_ERROR_DURATION_MS, ...data })) as typeof toast.error
  patched.__mgErrorPatched = true
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system", forcedTheme } = useTheme()

  return (
    <Sonner
      theme={(forcedTheme ?? theme) as ToasterProps["theme"]}
      className="toaster group"
      duration={TOAST_DURATION_MS}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast !bg-surface !text-fg-secondary !border !border-line !shadow-sm !rounded-xl text-sm",
          title: "!font-label !uppercase !tracking-widest !text-[10px] !text-fg-dim",
          description: "!text-fg-secondary !text-xs",
          actionButton:
            "!bg-gradient-to-br !from-brand-gradient-from !to-brand-gradient-to !text-fg-on-brand !text-[10px] !font-label !uppercase !tracking-widest !rounded-full !px-3 !py-1",
          cancelButton:
            "!bg-surface-muted !text-fg-dim !text-[10px] !font-label !uppercase !tracking-widest !rounded-full !px-3 !py-1",
          closeButton:
            "!text-fg-dim hover:!text-fg-secondary !border !border-line !bg-surface",
          error: "!border-danger/20 !text-danger",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
