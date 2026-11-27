"use client"

import * as React from "react"
import { useEffect } from "react"
import {
    BookOpen,
    Grape,
    Martini,
    GlassWater,
    Layers,
    GitBranch,
    MessageSquarePlus,
    Palette,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return null;
  }

  const data = {
    user: {
      name: session.user.name || "Unknown User",
      email: session.user.email || "Unknown Email",
      avatar: session.user?.image || "https://i.pravatar.cc/150?u=unknown",
    },
    navMain: [
      {
        title: "Cocktails",
        url: "/admin/cocktails",
        icon: Martini,
        items: [
          { title: "List of the Cocktails", url: "/admin/cocktails" },
          { title: "Add a Cocktail", url: "/admin/cocktails/create" },
        ],
      },
      {
        title: "Ingredients",
        url: "/admin/ingredients",
        icon: Grape,
        items: [
          { title: "List of the Ingredients", url: "/admin/ingredients" },
          { title: "Add an Ingredient", url: "/admin/ingredients/create" },
        ],
      },
      {
        title: "Bar Tools",
        url: "/admin/bar-tools",
        icon: BookOpen,
        items: [
          { title: "List of the Bar Tools", url: "/admin/bar-tools" },
          { title: "Add a Bar Tool", url: "/admin/bar-tools/create" },
        ],
      },
      {
        title: "Glasses",
        url: "/admin/glasses",
        icon: GlassWater,
        items: [
          { title: "List of the Glasses", url: "/admin/glasses" },
          { title: "Add a Glass", url: "/admin/glasses/create" },
        ],
      },
        {
            title: "Ingredient Types",
            url: "/admin/ingredient-types",
            icon: Layers,
            items: [
                { title: "List of the Types", url: "/admin/ingredient-types" },
                { title: "Add a Type", url: "/admin/ingredient-types/create" },
            ],
        },
        {
            title: "Ingredient Sub Types",
            url: "/admin/ingredient-subtypes",
            icon: GitBranch,
            items: [
                { title: "List of the Sub Types", url: "/admin/ingredient-subtypes" },
                { title: "Add a Sub Type", url: "/admin/ingredient-subtypes/create" },
            ],
        },
        {
            title: "Suggestions",
            url: "/admin/suggestions",
            icon: MessageSquarePlus,
            items: [
                { title: "Pending", url: "/admin/suggestions?status=PENDING" },
                { title: "All suggestions", url: "/admin/suggestions?status=ALL" },
            ],
        },
        {
            title: "Design system",
            url: "/admin/design-system",
            icon: Palette,
            items: [
                { title: "Design system", url: "/admin/design-system" },
            ],
        },
    ],
  };


  return (
      <Sidebar
          className="top-[--header-height] !h-[calc(100svh-var(--header-height))]"
          collapsible="icon"
          {...props}
      >
        <SidebarHeader onClick={() => router.push("/admin")} className="border-b border-line">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="hover:bg-brand-soft/10 rounded-xl transition-colors">
                <a href="#">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand shrink-0">
                    <Martini className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-headline text-fg">MixoGuide</span>
                    <span className="truncate text-[10px] font-label uppercase tracking-widest text-fg-muted">Admin</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={data.navMain} />
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={data.user} />
        </SidebarFooter>
      </Sidebar>
  );
}
