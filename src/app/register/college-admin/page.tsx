"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { IconMail, IconLock, IconLoader2, IconAlertCircle, IconArrowRight, IconBuilding } from "@tabler/icons-react"

export default function CollegeAdminRegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [orgId, setOrgId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/college-admin-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, orgId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      // success, redirect to admin dashboard
      router.push('/college-admin/departments')
    } catch (err: any) {
      setError(err?.message || 'Unexpected error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-background p-4 font-sans">
      <Card className="w-full max-w-md border-secondary shadow-xl dark:border-secondary dark:bg-zinc-900/40">
        <CardHeader>
          <CardTitle>College Admin Registration</CardTitle>
          <CardDescription>Create an account for a college placement coordinator.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-xl bg-destructive/5 border border-destructive/10 p-4 text-sm text-destructive dark:bg-destructive/10 dark:border-destructive/20">
              <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={isLoading} minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgId">Organization ID</Label>
              <Input id="orgId" type="text" placeholder="UUID of your college" value={orgId} onChange={e => setOrgId(e.target.value)} required disabled={isLoading} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> Registering…</> : <>Create Account <IconArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account? <a href="/login" className="font-medium underline">Sign In</a>
        </CardFooter>
      </Card>
    </div>
  )
}
