import Link from "next/link"
import {
  IconArrowRight,
  IconBriefcase2,
  IconBuildingSkyscraper,
  IconChartDots3,
  IconChevronRight,
  IconCircleCheck,
  IconDashboard,
  IconFileCv,
  IconLayoutDashboard,
  IconLockCheck,
  IconRobot,
  IconSchool,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react"
import { createClient } from "@/lib/supabase/server"

const workflowItems = [
  { number: "01", title: "Build the student profile", description: "Academic data, skills, projects, resume, and career readiness in one place.", icon: IconUsers },
  { number: "02", title: "Publish and match opportunities", description: "Create drives, define eligibility, and surface relevant opportunities to students.", icon: IconBuildingSkyscraper },
  { number: "03", title: "Move applications through the funnel", description: "Track applications, interviews, selections, and offers with clear ownership.", icon: IconBriefcase2 },
  { number: "04", title: "Learn from placement outcomes", description: "Use analytics and historical data to understand what is working and where to improve.", icon: IconChartDots3 },
]

export default async function Home() {
  const supabase = await createClient()
  let user = null
  let dashboardPath = "/login"

  try {
    const { data } = await supabase.auth.getUser()
    user = data.user

    if (user) {
      const role = user.app_metadata?.role as string | undefined
      if (role === "STUDENT") dashboardPath = "/student/dashboard"
      else if (role === "COMPANY") dashboardPath = "/company/dashboard"
      else if (role === "COLLEGE_ADMIN") dashboardPath = "/college-admin"
      else if (role === "MENTOR") dashboardPath = "/mentor"
      else if (role === "SA") dashboardPath = "/super-admin"
    }
  } catch {
    // Keep the public landing page available when no session exists.
  }

  const primaryHref = user ? dashboardPath : "/register?role=student"

  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="landing-grid-pointer" aria-hidden="true" />
      <div className="landing-noise" aria-hidden="true" />

      <header className="landing-nav-wrap">
        <nav className="landing-nav" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-3" aria-label="TPO Portal home">
            <span className="landing-logo"><IconSchool className="h-5 w-5" stroke={1.8} /></span>
            <span className="text-[15px] font-semibold tracking-tight">TPO Portal</span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            <Link href="#platform" className="landing-nav-link">Platform</Link>
            <Link href="#modules" className="landing-nav-link">Modules</Link>
            <Link href="#workflow" className="landing-nav-link">Workflow</Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">Placement, organized.</span>
            {user ? (
              <Link href={dashboardPath} className="landing-nav-cta"><IconDashboard className="h-4 w-4" />Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="hidden px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex">Sign in</Link>
                <Link href="/register" className="landing-nav-cta">Get started<IconArrowRight className="h-4 w-4" /></Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:px-10 lg:pt-28">
          <div className="mx-auto max-w-5xl text-center">
            <div className="landing-eyebrow"><span className="landing-pulse-dot" />A smarter campus placement experience<IconChevronRight className="h-3.5 w-3.5" /></div>
            <h1 className="mt-7 text-balance text-5xl font-semibold tracking-[-0.055em] sm:text-7xl lg:text-[88px] lg:leading-[0.96]">
              Turn placement chaos into a
              <span className="landing-gradient-text block">single clear system.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">One connected platform for students, mentors, placement teams, and hiring partners — from profile creation and eligibility to applications, interviews, offers, and insights.</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={primaryHref} className="landing-primary-button">{user ? "Open dashboard" : "Explore the portal"}<IconArrowRight className="h-4 w-4" /></Link>
              <Link href="#platform" className="landing-secondary-button">See how it works</Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><IconCircleCheck className="h-3.5 w-3.5 text-primary" /> Role-based access</span>
              <span className="inline-flex items-center gap-1.5"><IconCircleCheck className="h-3.5 w-3.5 text-primary" /> Supabase-backed</span>
              <span className="inline-flex items-center gap-1.5"><IconCircleCheck className="h-3.5 w-3.5 text-primary" /> AI-ready workflows</span>
            </div>
          </div>

          <div className="landing-hero-orbit landing-orbit-one" aria-hidden="true" />
          <div className="landing-hero-orbit landing-orbit-two" aria-hidden="true" />

          <div className="relative mx-auto mt-16 max-w-6xl sm:mt-20">
            <div className="landing-browser">
              <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-foreground/15" /><span className="h-2.5 w-2.5 rounded-full bg-foreground/15" /><span className="h-2.5 w-2.5 rounded-full bg-foreground/15" /></div>
                <div className="hidden rounded-full border border-border/60 bg-muted/40 px-4 py-1 text-[10px] text-muted-foreground sm:block">tpo-portal / dashboard</div>
                <span className="w-10" />
              </div>
              <div className="grid min-h-[290px] grid-cols-12 gap-3 p-3 sm:min-h-[390px] sm:gap-4 sm:p-5">
                <div className="col-span-3 hidden rounded-2xl border border-border/60 bg-muted/30 p-4 sm:block">
                  <div className="flex items-center gap-2 text-xs font-semibold"><span className="landing-mini-logo"><IconSchool className="h-3 w-3" /></span>TPO Portal</div>
                  <div className="mt-7 space-y-2">{["Overview", "Students", "Drives", "Applications", "Analytics"].map((item, i) => <div key={item} className={`rounded-lg px-2.5 py-2 text-[10px] ${i === 0 ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground"}`}>{item}</div>)}</div>
                </div>
                <div className="col-span-12 space-y-3 sm:col-span-9 sm:space-y-4">
                  <div className="grid grid-cols-3 gap-3">{[["1,248", "Students"], ["86", "Active drives"], ["74%", "Placement rate"]].map(([value, label]) => <div key={label} className="landing-stat-card"><div className="text-lg font-semibold tracking-tight sm:text-2xl">{value}</div><div className="mt-1 text-[9px] text-muted-foreground sm:text-[10px]">{label}</div></div>)}</div>
                  <div className="grid grid-cols-5 gap-3 sm:gap-4">
                    <div className="col-span-3 landing-panel-card"><div className="flex items-center justify-between"><span className="text-xs font-semibold">Placement activity</span><span className="text-[9px] text-muted-foreground">Last 6 months</span></div><div className="mt-6 flex h-32 items-end gap-2 sm:h-44">{[42, 58, 51, 76, 68, 91, 84, 100, 88, 112, 104, 126].map((height, i) => <span key={i} className="landing-chart-bar" style={{ height: `${height}px`, animationDelay: `${i * 70}ms` }} />)}</div></div>
                    <div className="col-span-2 landing-panel-card"><span className="text-xs font-semibold">Recruitment flow</span><div className="mt-5 space-y-4">{["Eligible", "Applied", "Interview", "Selected"].map((item, i) => <div key={item}><div className="flex justify-between text-[9px] text-muted-foreground"><span>{item}</span><span>{[86, 64, 38, 22][i]}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><span className="landing-progress" style={{ width: `${[86, 64, 38, 22][i]}%`, animationDelay: `${i * 180}ms` }} /></div></div>)}</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
          <div className="mb-10 max-w-2xl sm:mb-14"><span className="landing-section-kicker">THE PLATFORM</span><h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">Every part of placement, connected.</h2><p className="mt-4 max-w-xl leading-7 text-muted-foreground">Designed around the real flow of campus recruitment — not a collection of disconnected forms.</p></div>

          <div id="modules" className="grid scroll-mt-24 grid-cols-1 gap-4 md:grid-cols-12">
            <article className="landing-bento-card md:col-span-7"><div className="relative z-10 max-w-md"><span className="landing-icon-box"><IconLayoutDashboard className="h-5 w-5" /></span><h3 className="mt-5 text-2xl font-semibold tracking-tight">One command center for placement teams.</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Bring student records, drives, applications, interviews, approvals, and analytics into one operational view.</p></div><div className="landing-dashboard-illustration" aria-hidden="true"><div className="landing-float-chip landing-chip-top">+18 applications</div><div className="landing-dashboard-window"><div className="h-2 w-20 rounded-full bg-foreground/10" /><div className="mt-4 grid grid-cols-3 gap-2"><div className="h-12 rounded-lg bg-primary/10" /><div className="h-12 rounded-lg bg-foreground/[0.045]" /><div className="h-12 rounded-lg bg-foreground/[0.045]" /></div><div className="mt-3 h-24 rounded-lg bg-foreground/[0.035] p-3"><div className="flex h-full items-end gap-1.5">{[35, 52, 44, 67, 56, 82, 74, 94].map((h, i) => <span key={i} className="w-full rounded-t bg-primary/45" style={{ height: `${h}%` }} />)}</div></div></div></div></article>

            <article className="landing-bento-card md:col-span-5"><div className="relative z-10"><span className="landing-icon-box"><IconRobot className="h-5 w-5" /></span><h3 className="mt-5 text-2xl font-semibold tracking-tight">AI that prepares students.</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Mock interviews and career assistance help students arrive more confident for the real thing.</p></div><div className="landing-ai-illustration" aria-hidden="true"><div className="landing-ai-ring"><IconSparkles className="h-7 w-7" /></div><span className="landing-ai-dot landing-ai-dot-a" /><span className="landing-ai-dot landing-ai-dot-b" /><span className="landing-ai-dot landing-ai-dot-c" /><div className="landing-ai-line landing-ai-line-a" /><div className="landing-ai-line landing-ai-line-b" /></div></article>

            <article className="landing-bento-card md:col-span-4"><span className="landing-icon-box"><IconFileCv className="h-5 w-5" /></span><h3 className="mt-5 text-xl font-semibold tracking-tight">ATS-ready resumes.</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Turn structured student data into clean, exportable resumes built for modern recruitment workflows.</p><div className="landing-resume-illustration" aria-hidden="true"><div className="landing-paper"><div className="h-2 w-20 rounded-full bg-foreground/20" /><div className="mt-3 h-1.5 w-full rounded-full bg-foreground/10" /><div className="mt-2 h-1.5 w-4/5 rounded-full bg-foreground/10" /><div className="mt-5 grid grid-cols-2 gap-2"><span className="h-10 rounded bg-primary/10" /><span className="h-10 rounded bg-foreground/5" /></div></div><div className="landing-score">92<span>%</span><small>ATS</small></div></div></article>

            <article className="landing-bento-card md:col-span-4"><span className="landing-icon-box"><IconBriefcase2 className="h-5 w-5" /></span><h3 className="mt-5 text-xl font-semibold tracking-tight">From drive to offer.</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Track eligibility, applications, interviews, selections, and offers without losing the thread.</p><div className="mt-8 flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-muted-foreground">{["Eligible", "Applied", "Interview", "Offer"].map((item, i) => <span key={item} className="flex items-center gap-1.5"><span className={`landing-flow-dot ${i === 3 ? "bg-primary" : ""}`} />{item}{i < 3 && <IconArrowRight className="h-3 w-3" />}</span>)}</div></article>

            <article className="landing-bento-card md:col-span-4"><span className="landing-icon-box"><IconChartDots3 className="h-5 w-5" /></span><h3 className="mt-5 text-xl font-semibold tracking-tight">Decisions backed by data.</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Make placement performance visible across departments, drives, batches, and outcomes.</p><div className="mt-7 flex items-end gap-2"><div className="h-12 w-10 rounded-t-lg bg-primary/20" /><div className="h-20 w-10 rounded-t-lg bg-primary/30" /><div className="h-16 w-10 rounded-t-lg bg-primary/40" /><div className="h-28 w-10 rounded-t-lg bg-primary/60" /><div className="ml-2 text-xs font-semibold">+34%<span className="block text-[9px] font-normal text-muted-foreground">placement visibility</span></div></div></article>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-24 border-y border-border/60 bg-muted/20"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-10"><div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><span className="landing-section-kicker">THE WORKFLOW</span><h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">One flow. Every stakeholder.</h2><p className="mt-5 max-w-md leading-7 text-muted-foreground">Students prepare and apply. Mentors verify. Companies recruit. Placement teams coordinate. Everyone sees the same source of truth.</p><Link href={primaryHref} className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3">{user ? "Open your workspace" : "Start exploring"}<IconArrowRight className="h-4 w-4" /></Link></div><div className="space-y-3">{workflowItems.map((item) => { const Icon = item.icon; return <div key={item.number} className="group flex gap-4 rounded-2xl border border-border/60 bg-background/70 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-semibold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">{item.number}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-sm font-semibold">{item.title}</h3><Icon className="h-4 w-4 text-muted-foreground" /></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p></div></div> })}</div></div></div></section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-10"><div className="landing-cta-panel"><div className="relative z-10 max-w-2xl"><span className="landing-section-kicker">READY WHEN YOU ARE</span><h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">Make the next placement cycle feel effortless.</h2><p className="mt-5 max-w-xl leading-7 text-muted-foreground">A focused digital workspace for the people who prepare, coordinate, recruit, and get placed.</p><div className="mt-8 flex flex-wrap gap-3"><Link href={primaryHref} className="landing-primary-button">{user ? "Open dashboard" : "Get started"}<IconArrowRight className="h-4 w-4" /></Link><Link href="/login" className="landing-secondary-button">Sign in</Link></div></div><div className="landing-cta-orb" aria-hidden="true"><IconLockCheck className="h-10 w-10" /></div></div></section>
      </main>

      <footer className="border-t border-border/60"><div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10"><div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]"><div><Link href="/" className="flex items-center gap-3"><span className="landing-logo"><IconSchool className="h-5 w-5" /></span><span className="font-semibold tracking-tight">TPO Portal</span></Link><p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">A unified placement operations platform for students, institutions, mentors, and hiring partners.</p></div><div><p className="text-xs font-semibold uppercase tracking-wider text-foreground">Platform</p><div className="mt-4 space-y-3 text-sm text-muted-foreground"><Link href="#platform" className="block hover:text-foreground">Overview</Link><Link href="#modules" className="block hover:text-foreground">Modules</Link><Link href="#workflow" className="block hover:text-foreground">Workflow</Link></div></div><div><p className="text-xs font-semibold uppercase tracking-wider text-foreground">Portal</p><div className="mt-4 space-y-3 text-sm text-muted-foreground"><Link href="/login" className="block hover:text-foreground">Sign in</Link><Link href="/register" className="block hover:text-foreground">Register</Link>{user && <Link href={dashboardPath} className="block hover:text-foreground">Dashboard</Link>}</div></div><div><p className="text-xs font-semibold uppercase tracking-wider text-foreground">Built with</p><div className="mt-4 space-y-3 text-sm text-muted-foreground"><span className="block">Next.js</span><span className="block">Supabase</span><span className="block">PostgreSQL</span></div></div></div><div className="mt-12 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>© 2026 TPO Portal. Built for better campus placements.</span><span>Secure · Connected · Student-first</span></div></div></footer>
    </div>
  )
}
