"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"

export type AuthUser = {
  id: string
  email: string
  role: string
  org_id: string | null
  dept_id: string | null
  name?: string | null
  avatar?: string | null
  studentProfile?: any
  companyProfile?: any
}

type AuthContextType = {
  user: AuthUser | null
  loading: boolean
  initialized: boolean
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [initialized, setInitialized] = React.useState(false)

  const fetchUser = React.useCallback(async () => {
    try {
      const res = await fetch("/api/users/me", { cache: "no-store" })
      if (!res.ok) {
        setUser(null)
        return
      }
      const data = await res.json()
      if (data.user) {
        const email = data.user.email ?? ""
        const name =
          data.studentProfile?.name ||
          data.companyProfile?.company_name ||
          data.user?.name ||
          (email ? email.split("@")[0] : "User")

        const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          name
        )}`

        setUser({
          ...data.user,
          name,
          avatar,
          studentProfile: data.studentProfile,
          companyProfile: data.companyProfile,
        })
      } else {
        setUser(null)
      }
    } catch (err) {
      console.error("Error fetching auth user:", err)
      setUser(null)
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }, [])

  React.useEffect(() => {
    let mounted = true
    const supabase = createClient()

    // Load the current server-authenticated user on mount.
    void fetchUser()

    // Keep the client auth state synchronized with Supabase auth events
    // (sign-in, token refresh, sign-out, etc.). The login form uses the
    // server API, so it also calls refreshUser explicitly after login.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (!mounted) return

      // Do not await inside the Supabase auth callback. Schedule the
      // server profile lookup after the callback has returned.
      window.setTimeout(() => {
        if (mounted) void fetchUser()
      }, 0)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchUser])

  const signOut = React.useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const value = React.useMemo(
    () => ({
      user,
      loading,
      initialized,
      refreshUser: fetchUser,
      signOut,
    }),
    [user, loading, initialized, fetchUser, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
