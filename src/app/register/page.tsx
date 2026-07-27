"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  IconMail,
  IconLock,
  IconLoader2,
  IconAlertCircle,
  IconArrowRight,
  IconUser,
  IconBuilding,
  IconLink,
  IconCheck,
  IconSchool
} from "@tabler/icons-react"

function RegisterFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<"student" | "company" | "college-admin" | "mentor">("student")
  
  // Student fields
  const [studentEmail, setStudentEmail] = useState("")
  const [studentPassword, setStudentPassword] = useState("")
  const [inviteToken, setInviteToken] = useState("")
  
  // Company fields
  // const [companyEmail, setCompanyEmail] = useState("")
  // const [companyPassword, setCompanyPassword] = useState("")
  // const [companyName, setCompanyName] = useState("")
  // const [companyWebsite, setCompanyWebsite] = useState("")

  // College Admin fields
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [adminInstituteName, setAdminInstituteName] = useState("")



  // Mentor fields
  const [mentorEmail, setMentorEmail] = useState("")
  const [mentorPassword, setMentorPassword] = useState("")
  const [mentorInstituteName, setMentorInstituteName] = useState("")

  const [mentorDepartmentName, setMentorDepartmentName] = useState("")
  const [companyEmail, setCompanyEmail] = useState("")
  const [companyPassword, setCompanyPassword] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [companyWebsite, setCompanyWebsite] = useState("")
  
  // States
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [successRole, setSuccessRole] = useState<string | null>(null)

  // Pre-fill invite token from URL search parameters if available
  useEffect(() => {
    const token = searchParams.get("token")
    if (token) {
      setInviteToken(token)
      setActiveTab("student")
    }
  }, [searchParams])

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: studentEmail,
          password: studentPassword,
          inviteToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to register. Please check your token or try again.")
      }

      setIsSuccess(true)
      setSuccessRole("STUDENT")
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.")
      setIsLoading(false)
    }
  }

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/company-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: companyEmail,
          password: companyPassword,
          companyName,
          website: companyWebsite,
        }),
      })

      const data = await response.json()

      console.log("Company register response:", {
        status: response.status,
        ok: response.ok,
        data,
      })

      if (!response.ok) {
        throw new Error(data.error || "Failed to register company profile.")
      }

      setIsSuccess(true)
      setSuccessRole("COMPANY")
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.")
      setIsLoading(false)
    }
  }

  const handleAdminSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch(
        "/api/auth/college-admin-register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: adminEmail,
            password: adminPassword,
            instituteName: adminInstituteName,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error || "Registration failed"
        )
      }

      setIsSuccess(true)
      setSuccessRole("COLLEGE_ADMIN")
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unexpected error"
      )

      setIsLoading(false)
    }
  }

  const handleMentorSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch(
        "/api/auth/mentor-register",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: mentorEmail,
            password: mentorPassword,

            instituteName:
              mentorInstituteName,

            departmentName:
              mentorDepartmentName,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error || "Registration failed"
        )
      }

      setIsSuccess(true)
      setSuccessRole("MENTOR")
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unexpected error"
      )

      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="border-secondary shadow-xl dark:border-secondary dark:bg-zinc-900/40 text-center">
        <CardContent className="pt-8 pb-8 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-500">
            <IconCheck className="h-8 w-8" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Registration Complete!
          </h3>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
{successRole === "STUDENT"
                ? "Your account has been created successfully. You are now logged in and ready to access the student dashboard."
                : successRole === "COMPANY"
                ? "Your company account has been registered. You can access the company panel, but note that job postings require admin approval."
                : successRole === "COLLEGE_ADMIN"
                ? "College admin account created. You can now manage departments and invites."
                : "Mentor account created. You can now manage assigned students."}
          </p>
          <Button
            onClick={() => {
if (successRole === "STUDENT") {
                  router.push("/student/dashboard")
                } else if (successRole === "COMPANY") {
                  router.push("/company/dashboard")
                } else if (successRole === "COLLEGE_ADMIN") {
                  router.push("/college-admin/departments")
                } else {
                  router.push("/mentor/overview")
                }
              router.refresh()
            }}
            className="mt-8 w-full flex h-11 items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-zinc-50 transition-all hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Go to Dashboard <IconArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-secondary/80 shadow-xl shadow-zinc-100/50 dark:border-secondary/80 dark:bg-zinc-900/40 dark:shadow-none backdrop-blur-md">
      <CardHeader className="pb-4">
        {/* Customized Tabs */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
          <button
            type="button"
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
              activeTab === "student"
                ? "bg-background text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
            onClick={() => {
              setActiveTab("student")
              setError(null)
            }}
            disabled={isLoading}
          >
            <IconUser className="h-4 w-4" /> Student
          </button>
<button
             type="button"
             className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
               activeTab === "company"
                 ? "bg-background text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                 : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-300"
             }`}
             onClick={() => {
               setActiveTab("company")
               setError(null)
             }}
             disabled={isLoading}
           >
             <IconBuilding className="h-4 w-4" /> Company Partner
           </button>
           <button
             type="button"
             className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
               activeTab === "college-admin"
                 ? "bg-background text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                 : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-300"
             }`}
             onClick={() => {
               setActiveTab("college-admin")
               setError(null)
             }}
             disabled={isLoading}
           >
             <IconBuilding className="h-4 w-4" /> College Admin
           </button>
           <button
             type="button"
             className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
               activeTab === "mentor"
                 ? "bg-background text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                 : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-300"
             }`}
             onClick={() => {
               setActiveTab("mentor")
               setError(null)
             }}
             disabled={isLoading}
           >
             <IconUser className="h-4 w-4" /> Mentor
           </button>
        </div>
        
        <CardTitle className="mt-4">
          {activeTab === "student"
            ? "Student Registration"
            : activeTab === "company"
            ? "Company Registration"
            : activeTab === "college-admin"
            ? "College Admin Registration"
            : "Mentor Registration"}
        </CardTitle>
        <CardDescription>
          {activeTab === "student"
            ? "Create your placement portal profile using your invite token."
            : activeTab === "company"
            ? "Sign up as a corporate partner to post jobs and review applications."
            : activeTab === "college-admin"
            ? "Register as a college placement coordinator to manage departments and invites."
            : "Register as a mentor to guide students in your department."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl bg-destructive/5 border border-destructive/10 p-4 text-sm text-destructive dark:bg-destructive/10 dark:border-destructive/20">
            <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="leading-tight">{error}</p>
          </div>
        )}

        {activeTab === "student" && (
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteToken">Invitation Token</Label>

              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <IconLink className="h-4 w-4" />
                </span>

                <Input
                  id="inviteToken"
                  type="text"
                  placeholder="Paste invitation token..."
                  className="pl-10"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Use the invitation token provided by your college.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentEmail">Academic Email</Label>

              <div className="relative">
                <IconMail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="studentEmail"
                  type="email"
                  placeholder="student@college.edu"
                  className="pl-10"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentPassword">Password</Label>

              <div className="relative">
                <IconLock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="studentPassword"
                  type="password"
                  placeholder="Minimum 6 characters"
                  className="pl-10"
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  minLength={6}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Student Account
                  <IconArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {activeTab === "company" && (
          <form onSubmit={handleCompanySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>

              <div className="relative">
                <IconBuilding className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="companyName"
                  type="text"
                  placeholder="Google, Microsoft, etc."
                  className="pl-10"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyWebsite">Website</Label>

              <div className="relative">
                <IconLink className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="companyWebsite"
                  type="url"
                  placeholder="https://company.com"
                  className="pl-10"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyEmail">Corporate Email</Label>

              <div className="relative">
                <IconMail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="companyEmail"
                  type="email"
                  placeholder="recruiter@company.com"
                  className="pl-10"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyPassword">Password</Label>

              <div className="relative">
                <IconLock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="companyPassword"
                  type="password"
                  placeholder="Minimum 6 characters"
                  className="pl-10"
                  value={companyPassword}
                  onChange={(e) => setCompanyPassword(e.target.value)}
                  minLength={6}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  Register Company
                  <IconArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {activeTab === "college-admin" && (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminInstituteName">
                Institute Name
              </Label>

              <div className="relative">
                <IconSchool className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="adminInstituteName"
                  type="text"
                  placeholder="R.C. Technical Institute"
                  className="pl-10"
                  value={adminInstituteName}
                  onChange={(e) =>
                    setAdminInstituteName(e.target.value)
                  }
                  required
                  disabled={isLoading}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Your institute will be registered and submitted
                for approval.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email</Label>

              <div className="relative">
                <IconMail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="tpo@college.edu"
                  className="pl-10"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPassword">Password</Label>

              <div className="relative">
                <IconLock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="Minimum 6 characters"
                  className="pl-10"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  minLength={6}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Register College Admin
                  <IconArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {activeTab === "mentor" && (
          <form onSubmit={handleMentorSubmit} className="space-y-4">
           <div className="space-y-2">
              <Label htmlFor="mentorInstituteName">
                Institute Name
              </Label>

              <div className="relative">
                <IconSchool className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="mentorInstituteName"
                  type="text"
                  placeholder="R.C. Technical Institute"
                  className="pl-10"
                  value={mentorInstituteName}
                  onChange={(e) =>
                    setMentorInstituteName(e.target.value)
                  }
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mentorDepartmentName">
                Department
              </Label>

              <div className="relative">
                <IconBuilding className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="mentorDepartmentName"
                  type="text"
                  placeholder="Computer Engineering"
                  className="pl-10"
                  value={mentorDepartmentName}
                  onChange={(e) =>
                    setMentorDepartmentName(e.target.value)
                  }
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mentorEmail">Mentor Email</Label>

              <div className="relative">
                <IconMail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="mentorEmail"
                  type="email"
                  placeholder="mentor@college.edu"
                  className="pl-10"
                  value={mentorEmail}
                  onChange={(e) => setMentorEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mentorPassword">Password</Label>

              <div className="relative">
                <IconLock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="mentorPassword"
                  type="password"
                  placeholder="Minimum 6 characters"
                  className="pl-10"
                  value={mentorPassword}
                  onChange={(e) => setMentorPassword(e.target.value)}
                  minLength={6}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Register Mentor
                  <IconArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col border-t border-zinc-100/80 px-6 py-4 dark:border-secondary/80">
        <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-zinc-800 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50 underline underline-offset-4"
          >
            Sign In
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-background font-sans">
      {/* Decorative Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      
      <div className="relative z-10 w-full max-w-[440px]">
        {/* Branding */}
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

        <Suspense
          fallback={
            <Card className="border-secondary/80 shadow-xl dark:border-secondary/80 dark:bg-zinc-900/40 p-8 flex justify-center items-center">
              <IconLoader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </Card>
          }
        >
          <RegisterFormContent />
        </Suspense>
      </div>
    </div>
  )
}
