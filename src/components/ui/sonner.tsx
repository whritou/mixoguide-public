"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system", forcedTheme } = useTheme()

  return (
    <Sonner
      theme={(forcedTheme ?? theme) as ToasterProps["theme"]}
      className="toaster group"
      duration={1000}
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
