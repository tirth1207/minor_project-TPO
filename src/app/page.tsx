import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { IconSchool, IconArrowRight, IconUser, IconBuilding, IconDashboard, IconShieldLock } from "@tabler/icons-react"

export default async function Home() {
  const supabase = await createClient()

  let user = null
  let role = null
  let dashboardPath = "/login"

  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
    if (user) {
      role = user.app_metadata?.role as string | undefined
      if (role === "STUDENT") dashboardPath = "/student/dashboard"
      else if (role === "COMPANY") dashboardPath = "/company/dashboard"
      else if (role === "COLLEGE_ADMIN") dashboardPath = "/college-admin"
      else if (role === "MENTOR") dashboardPath = "/mentor"
      else if (role === "SA") dashboardPath = "/super-admin"
    }
  } catch (e) {
    // Ignore error, session not set
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-background font-sans text-foreground overflow-hidden">
      {/* Header */}
      <header className="relative z-10 border-b border-border bg-background px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-zinc-50 shadow-sm dark:bg-primary dark:text-zinc-950">
              <IconSchool className="h-5.5 w-5.5" />
            </div>
            <span className="font-bold tracking-tight text-lg">TPO Portal</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href={dashboardPath}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-foreground hover:text-primary shadow transition-all hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                <IconDashboard className="mr-2 h-4 w-4" /> Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-primary hover:text-primary dark:text-primary dark:hover:text-primary"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-zinc-50 transition-all hover:bg-primary dark:bg-primary dark:text-zinc-50 dark:hover:bg-zinc-200"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto my-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-secondary bg-background px-3.5 py-1 text-xs font-medium shadow-sm dark:border-secondary dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400">
          <IconShieldLock className="h-3.5 w-3.5 text-zinc-400" />
          End-to-End Secure RBAC Enabled
        </div>
        <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-6xl max-w-3xl leading-none">
          Simplifying Placements & Campus Onboarding
        </h1>
        <p className="mt-6 text-lg text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
          The consolidated portal for College Admins, Department Mentors, Students, and Corporate Partners to collaborate on hiring drives.
        </p>

        {/* Portal Entry Cards */}
        <div className="mt-14 grid w-full grid-cols-1 gap-6 sm:grid-cols-2 max-w-3xl">
          {/* Card 1 */}
          <div className="group relative rounded-2xl border border-secondary bg-background p-6 text-left shadow-sm transition-all hover:border-zinc-300 dark:border-secondary dark:bg-zinc-900/30 dark:hover:border-zinc-700">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 transition-all group-hover:bg-zinc-900 group-hover:text-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:group-hover:bg-zinc-50 dark:group-hover:text-zinc-950">
              <IconUser className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-bold">Student Portal</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-normal">
              Register via your department invitation token, customize your profile, take AI mock interviews, and apply for eligible job postings.
            </p>
            <Link
              href={user ? dashboardPath : "/register?role=student"}
              className="mt-6 inline-flex items-center text-xs font-bold text-zinc-900 dark:text-zinc-200 group-hover:underline"
            >
              Get Started <IconArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Card 2 */}
          <div className="group relative rounded-2xl border border-secondary bg-background p-6 text-left shadow-sm transition-all hover:border-zinc-300 dark:border-secondary dark:bg-zinc-900/30 dark:hover:border-zinc-700">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 transition-all group-hover:bg-zinc-900 group-hover:text-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:group-hover:bg-zinc-50 dark:group-hover:text-zinc-950">
              <IconBuilding className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-bold">Corporate Partner</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-normal">
              Register your company, post new job openings, access candidate application lists, schedule rounds, and extend job offers.
            </p>
            <Link
              href={user ? dashboardPath : "/register?role=company"}
              className="mt-6 inline-flex items-center text-xs font-bold text-zinc-900 dark:text-zinc-200 group-hover:underline"
            >
              Partner With Us <IconArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-secondary/50 py-6 text-center text-xs text-zinc-400 dark:border-secondary/50">
        <p>© 2026 TPO Placement Portal. Built with Next.js & Supabase.</p>
      </footer>
    </div>
  )
}
