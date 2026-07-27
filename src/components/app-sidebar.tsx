// "use client"

// import * as React from "react"
// import { NavMain } from "@/components/nav-main"
// import { NavProjects } from "@/components/nav-projects"
// import { NavSecondary } from "@/components/nav-secondary"
// import { NavUser } from "@/components/nav-user"
// import {
//   Sidebar,
//   SidebarContent,
//   SidebarFooter,
//   SidebarHeader,
//   SidebarMenu,
//   SidebarMenuButton,
//   SidebarMenuItem,
// } from "@/components/ui/sidebar"
// import {
//   IconRobot,
//   IconBook,
//   IconLifebuoy,
//   IconSend,
//   IconCommand,
//   IconSchool,
//   IconBuilding,
//   IconBriefcase,
//   IconDashboard,
//   IconUsers,
//   IconUser,
//   IconFileCertificate,
//   IconListCheck,
//   IconPlus
// } from "@tabler/icons-react"

// export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
//   const [user, setUser] = React.useState({
//     name: "Loading...",
//     email: "",
//     avatar: "/avatars/default.jpg",
//   })
//   const [role, setRole] = React.useState<string | null>(null)

//   React.useEffect(() => {
//     async function fetchUser() {
//       try {
//         const res = await fetch("/api/users/me")
//         if (res.ok) {
//           const data = await res.json()
//           const email = data.user?.email || ""
//           const userRole = data.user?.role || ""
          
//           let name = "TPO User"
//           if (userRole === "SA") {
//             name = "Super Admin"
//           } else if (data.studentProfile?.name) {
//             name = data.studentProfile.name
//           } else if (data.companyProfile?.company_name) {
//             name = data.companyProfile.company_name
//           } else {
//             name = email.split("@")[0]
//           }

//           setUser({
//             name,
//             email,
//             avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
//           })
//           setRole(userRole)
//         }
//       } catch (err) {
//         console.error("Error fetching user in sidebar:", err)
//       }
//     }
//     fetchUser()
//   }, [])

//   // Navigation Main links based on User Role
//   const getNavMain = () => {
//     if (role === "SA") {
//       return [
//         {
//           title: "Dashboard Overview",
//           url: "/super-admin/overview",
//           icon: <IconDashboard className="size-4" />,
//           isActive: true,
//         },
//         {
//           title: "College Management",
//           url: "/super-admin/colleges",
//           icon: <IconSchool className="size-4" />,
//         },
//         {
//           title: "Company Approvals",
//           url: "/super-admin/companies",
//           icon: <IconBuilding className="size-4" />,
//         },
//         {
//           title: "Job Postings",
//           url: "/super-admin/jobs",
//           icon: <IconBriefcase className="size-4" />,
//         },
//       ]
//     }

//     if (role === "COLLEGE_ADMIN") {
//       return [
//         {
//           title: "Departments",
//           url: "/college-admin/departments",
//           icon: <IconSchool className="size-4" />,
//           isActive: true,
//         },
//         {
//           title: "Onboarding Invites",
//           url: "/college-admin/invites",
//           icon: <IconListCheck className="size-4" />,
//         },
//         {
//           title: "Job Approvals",
//           url: "/college-admin/jobs",
//           icon: <IconBriefcase className="size-4" />,
//         },
//         {
//           title: "Student Roster",
//           url: "/college-admin/students",
//           icon: <IconUsers className="size-4" />,
//         },
//       ]
//     }

//     if (role === "MENTOR") {
//       return [
//         {
//           title: "Dashboard Overview",
//           url: "/mentor/overview",
//           icon: <IconDashboard className="size-4" />,
//           isActive: true,
//         },
//         {
//           title: "Assigned Students",
//           url: "/mentor/students",
//           icon: <IconUsers className="size-4" />,
//         },
//       ]
//     }

//     if (role === "STUDENT") {
//       return [
//         {
//           title: "Candidate Profile",
//           url: "/student/profile",
//           icon: <IconUser className="size-4" />,
//           isActive: true,
//         },
//         {
//           title: "Eligible Jobs",
//           url: "/student/jobs",
//           icon: <IconBriefcase className="size-4" />,
//         },
//         {
//           title: "My Applications",
//           url: "/student/applications",
//           icon: <IconFileCertificate className="size-4" />,
//         },
//         {
//           title: "AI Mock Prep",
//           url: "/student/mock",
//           icon: <IconRobot className="size-4" />,
//         },
//       ]
//     }

//     if (role === "COMPANY") {
//       return [
//         {
//           title: "Posted Jobs",
//           url: "/company/jobs",
//           icon: <IconBriefcase className="size-4" />,
//           isActive: true,
//         },
//         {
//           title: "Post New Opening",
//           url: "/company/post-job",
//           icon: <IconPlus className="size-4" />,
//         },
//         {
//           title: "Review Applicants",
//           url: "/company/applicants",
//           icon: <IconUsers className="size-4" />,
//         },
//       ]
//     }

//     // Default/Fallback main links (e.g. for loading or placeholder)
//     return [
//       {
//         title: "Introduction",
//         url: "#",
//         icon: <IconBook className="size-4" />,
//         isActive: true,
//       }
//     ]
//   }

//   // Sidebar Projects Section
//   const getProjects = () => {
//     return [] // No projects needed for standard minimal Apple layout
//   }

//   const secondaryNav = [
//     {
//       title: "Support",
//       url: "#",
//       icon: <IconLifebuoy className="size-4" />,
//     },
//     {
//       title: "Feedback",
//       url: "#",
//       icon: <IconSend className="size-4" />,
//     },
//   ]

//   return (
//     <Sidebar variant="inset" {...props}>
//       <SidebarHeader>
//         <SidebarMenu>
//           <SidebarMenuItem>
//             <SidebarMenuButton size="lg" render={<a href="#" />}>
//               <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
//                 <IconCommand className="size-4" />
//               </div>
//               <div className="grid flex-1 text-left text-sm leading-tight">
//                 <span className="truncate font-semibold">TPO Portal</span>
//                 <span className="truncate text-xs">
//                   {role === "SA" ? "Super Admin"
//                    : role === "COLLEGE_ADMIN" ? "College Admin"
//                    : role === "MENTOR" ? "Faculty Mentor"
//                    : role === "STUDENT" ? "Student Candidate"
//                    : role === "COMPANY" ? "Corporate Partner"
//                    : "TPO Portal"}
//                 </span>
//               </div>
//             </SidebarMenuButton>
//           </SidebarMenuItem>
//         </SidebarMenu>
//       </SidebarHeader>
//       <SidebarContent>
//         <NavMain items={getNavMain()} />
//         {getProjects().length > 0 && <NavProjects projects={getProjects()} />}
//         <NavSecondary items={secondaryNav} className="mt-auto" />
//       </SidebarContent>
//       <SidebarFooter>
//         <NavUser user={user} />
//       </SidebarFooter>
//     </Sidebar>
//   )
// }


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