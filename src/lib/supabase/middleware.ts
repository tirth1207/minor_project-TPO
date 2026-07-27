import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT remove this auth.getUser() call
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Public paths that unauthenticated users can access
  const isPublicPath =
    path === "/login" ||
    path === "/register" ||
    path === "/unauthorized" ||
    path === "/" ||
    path.startsWith("/api/auth")

  if (!user) {
    // If not logged in and trying to access a protected page, redirect to /login
    if (!isPublicPath) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // User is logged in
  const role = user.app_metadata?.role as string | undefined

  // If user is logged in and tries to access /login or /register, redirect to dashboard
  if (path === "/login" || path === "/register") {
    const url = request.nextUrl.clone()
    if (role === "STUDENT") {
      url.pathname = "/student/profile"
    } else if (role === "COMPANY") {
      url.pathname = "/company/jobs"
    } else if (role === "COLLEGE_ADMIN") {
      url.pathname = "/college-admin/departments"
    } else if (role === "MENTOR") {
      url.pathname = "/mentor/overview"
    } else if (role === "SA") {
      url.pathname = "/super-admin/overview"
    } else {
      url.pathname = "/unauthorized"
    }
    return NextResponse.redirect(url)
  }

  // Protect role-based routes
  if (path.startsWith("/student") && role !== "STUDENT") {
    const url = request.nextUrl.clone()
    url.pathname = "/unauthorized"
    return NextResponse.redirect(url)
  }

  if (path.startsWith("/company") && role !== "COMPANY") {
    const url = request.nextUrl.clone()
    url.pathname = "/unauthorized"
    return NextResponse.redirect(url)
  }

  if (path.startsWith("/college-admin") && role !== "COLLEGE_ADMIN") {
    const url = request.nextUrl.clone()
    url.pathname = "/unauthorized"
    return NextResponse.redirect(url)
  }

  if (path.startsWith("/mentor") && role !== "MENTOR") {
    const url = request.nextUrl.clone()
    url.pathname = "/unauthorized"
    return NextResponse.redirect(url)
  }

  if (path.startsWith("/super-admin") && role !== "SA") {
    const url = request.nextUrl.clone()
    url.pathname = "/unauthorized"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
