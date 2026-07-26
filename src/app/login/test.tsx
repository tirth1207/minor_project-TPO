"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { IconMail, IconLock, IconLoader2, IconAlertCircle, IconArrowRight, IconSchool } from "@tabler/icons-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed. Please verify your credentials.")
      }

      // Check role and redirect accordingly
      const role = data.role
      if (role === "STUDENT") {
        router.push("/student/dashboard")
      } else if (role === "COMPANY") {
        router.push("/company/dashboard")
      } else if (role === "COLLEGE_ADMIN") {
        router.push("/college-admin")
      } else if (role === "MENTOR") {
        router.push("/mentor")
      } else if (role === "SA") {
        router.push("/super-admin")
      } else {
        router.push("/unauthorized")
      }

      // Refresh the page/router to ensure the middleware picks up the new cookies
      router.refresh()
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.")
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950 font-sans">
      {/* Decorative Grid Patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Portal Branding */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-50 shadow-md dark:bg-zinc-50 dark:text-zinc-950">
            <IconSchool className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            TPO Placement Portal
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Training & Placement Office Management System
          </p>
        </div>

        <Card className="border-zinc-200/80 shadow-xl shadow-zinc-100/50 dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:shadow-none backdrop-blur-md">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials below to log into your account.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-3 rounded-xl bg-destructive/5 border border-destructive/10 p-4 text-sm text-destructive dark:bg-destructive/10 dark:border-destructive/20">
                  <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="leading-tight">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-500">
                    <IconMail className="h-4 w-4" />
                  </span>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@college.edu"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-450 dark:hover:text-zinc-300"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-500">
                    <IconLock className="h-4 w-4" />
                  </span>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full flex h-11 items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-zinc-50 transition-all hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-100 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus:ring-zinc-900"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
                  </>
                ) : (
                  <>
                    Sign In <IconArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col border-t border-zinc-100/80 px-6 py-4 dark:border-zinc-800/80">
            <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
              New here?{" "}
              <Link
                href="/register"
                className="font-semibold text-zinc-800 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50 underline underline-offset-4"
              >
                Register an account
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
