"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={1000}
      toastOptions={{
        classNames: {
          toast:
            "group toast !bg-[#faf8f5] !text-mg-charcoal !border !border-[#e8e0d8] !shadow-sm !rounded-xl text-sm",
          title: "!font-label !uppercase !tracking-widest !text-[10px] !text-mg-dim",
          description: "!text-mg-charcoal !text-xs",
          actionButton:
            "!bg-gradient-to-br !from-mg-brown !to-mg-caramel !text-white !text-[10px] !font-label !uppercase !tracking-widest !rounded-full !px-3 !py-1",
          cancelButton:
            "!bg-[#f0ece6] !text-mg-dim !text-[10px] !font-label !uppercase !tracking-widest !rounded-full !px-3 !py-1",
          closeButton:
            "!text-mg-dim hover:!text-mg-charcoal !border !border-[#e8e0d8] !bg-[#faf8f5]",
          error: "!border-[#c0392b]/20 !text-[#c0392b]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
