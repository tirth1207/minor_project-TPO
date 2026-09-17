"use client"

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { IconCommand } from "@tabler/icons-react"
import Link from "next/link"

type NavItem = {
  title: string
  url: string
  icon: React.ReactNode
  isActive?: boolean
}

type ProjectItem = {
  name: string
  url: string
  icon: React.ReactNode
}

type SidebarUser = {
  name: string
  email: string
  avatar: string
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  title?: string
  subtitle?: string

  navMain?: NavItem[]
  navSecondary?: NavItem[]
  projects?: ProjectItem[]

  user?: SidebarUser
  func?: () => void
}

export function AppSidebar({
  title = "TPO Portal",
  subtitle,
  navMain = [],
  navSecondary = [],
  projects = [],
  user,
  func,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <IconCommand className="size-4" />
              </div>

              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {title}
                </span>

                {subtitle && (
                  <span className="truncate text-xs">
                    {subtitle}
                  </span>
                )}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navMain.length > 0 && (
          <NavMain items={navMain || []} />
        )}

        {projects.length > 0 && (
          <NavProjects projects={projects} />
        )}

        {navSecondary.length > 0 && (
          <NavSecondary
            items={navSecondary}
            className="mt-auto"
          />
        )}
      </SidebarContent>

      {user && (
        <SidebarFooter>
          <NavUser user={user} func={func || (() => {})} />
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
