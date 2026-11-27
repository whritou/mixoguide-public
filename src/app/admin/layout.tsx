import { guardAdmin } from '@/lib/auth/guards'
import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from '@/components/ui/breadcrumb'
import type { ReactNode } from 'react'
import { Home } from "lucide-react"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await guardAdmin()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4 w-full">
                  {/* LEFT SIDE */}
                  <div className="flex items-center gap-2">
                      <SidebarTrigger className="-ml-1" />
                      <Separator orientation="vertical" className="mr-2 h-4" />

                      <Breadcrumb>
                          <BreadcrumbList>
                              <BreadcrumbItem className="hidden md:block">
                                  <BreadcrumbLink href="/admin">
                                      Mixo Guide Admin Panel
                                  </BreadcrumbLink>
                              </BreadcrumbItem>
                          </BreadcrumbList>
                      </Breadcrumb>
                  </div>

                  {/* RIGHT SIDE */}
                  <div className="ml-auto">
                      <BreadcrumbLink
                          href="/"
                          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                      >
                          <Home className="h-4 w-4" />
                          Home
                      </BreadcrumbLink>
                  </div>
              </div>
          </header>
        <main className="flex flex-1 flex-col gap-4 p-4 pt-0 bg-canvas">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
