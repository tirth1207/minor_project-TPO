"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
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
import {
  IconTerminal2,
  IconRobot,
  IconBook,
  IconSettings,
  IconLifebuoy,
  IconSend,
  IconFrame,
  IconChartPie,
  IconMap,
  IconCommand,
  IconSchool,
  IconBuilding,
  IconBriefcase,
  IconDashboard,
  IconUsers
} from "@tabler/icons-react"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = React.useState({
    name: "Loading...",
    email: "",
    avatar: "/avatars/default.jpg",
  })
  const [role, setRole] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/users/me")
        if (res.ok) {
          const data = await res.json()
          const email = data.user?.email || ""
          const userRole = data.user?.role || ""
          
          let name = "TPO User"
          if (userRole === "SA") {
            name = "Super Admin"
          } else if (data.studentProfile?.name) {
            name = data.studentProfile.name
          } else if (data.companyProfile?.company_name) {
            name = data.companyProfile.company_name
          } else {
            name = email.split("@")[0]
          }

          setUser({
            name,
            email,
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
          })
          setRole(userRole)
        }
      } catch (err) {
        console.error("Error fetching user in sidebar:", err)
      }
    }
    fetchUser()
  }, [])

  // Navigation Main links based on User Role
  const getNavMain = () => {
    if (role === "SA") {
      return [
        {
          title: "Dashboard Overview",
          url: "/super-admin?tab=overview",
          icon: <IconDashboard className="size-4" />,
          isActive: true,
        },
        {
          title: "College Management",
          url: "/super-admin?tab=colleges",
          icon: <IconSchool className="size-4" />,
        },
        {
          title: "Company Approvals",
          url: "/super-admin?tab=companies",
          icon: <IconBuilding className="size-4" />,
        },
        {
          title: "Job Postings",
          url: "/super-admin?tab=jobs",
          icon: <IconBriefcase className="size-4" />,
        },
      ]
    }

    // Default/Fallback main links (e.g. for student/mentor or placeholder)
    return [
      {
        title: "Playground",
        url: "#",
        icon: <IconTerminal2 className="size-4" />,
        isActive: true,
        items: [
          { title: "History", url: "#" },
          { title: "Starred", url: "#" },
          { title: "Settings", url: "#" },
        ],
      },
      {
        title: "Models",
        url: "#",
        icon: <IconRobot className="size-4" />,
        items: [
          { title: "Genesis", url: "#" },
          { title: "Explorer", url: "#" },
          { title: "Quantum", url: "#" },
        ],
      },
      {
        title: "Documentation",
        url: "#",
        icon: <IconBook className="size-4" />,
        items: [
          { title: "Introduction", url: "#" },
          { title: "Get Started", url: "#" },
          { title: "Tutorials", url: "#" },
          { title: "Changelog", url: "#" },
        ],
      },
    ]
  }

  // Sidebar Projects Section
  const getProjects = () => {
    if (role === "SA") return [] // Super admin does not need default projects
    return [
      {
        name: "Design Engineering",
        url: "#",
        icon: <IconFrame className="size-4" />,
      },
      {
        name: "Sales & Marketing",
        url: "#",
        icon: <IconChartPie className="size-4" />,
      },
      {
        name: "Travel",
        url: "#",
        icon: <IconMap className="size-4" />,
      },
    ]
  }

  const secondaryNav = [
    {
      title: "Support",
      url: "#",
      icon: <IconLifebuoy className="size-4" />,
    },
    {
      title: "Feedback",
      url: "#",
      icon: <IconSend className="size-4" />,
    },
  ]

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="#" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <IconCommand className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">TPO Portal</span>
                <span className="truncate text-xs">
                  {role === "SA" ? "Super Admin" : "Acme Inc"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getNavMain()} />
        {getProjects().length > 0 && <NavProjects projects={getProjects()} />}
        <NavSecondary items={secondaryNav} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
