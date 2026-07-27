"use client"

import { useEffect, useState } from "react"
import { IconMoon, IconSun } from "@tabler/icons-react"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // Initialize from localStorage or system preference
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme")
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      return stored === "dark" || (!stored && prefersDark) ? "dark" : "light"
    }
    return "light"
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Ensure the theme class is applied on mount (in case ThemeProvider missed)
    document.documentElement.classList.toggle("dark", theme === "dark")
    setMounted(true)
  }, [theme])

  const handleThemeChange = (checked: boolean) => {
    const nextTheme = checked ? "dark" : "light"
    setTheme(nextTheme)
    // Use the global toggleTheme function provided by ThemeProvider
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).toggleTheme?.(nextTheme)
  }

  if (!mounted) {
    return null
  }

  const isDark = theme === "dark"

  return (
    <div className="flex items-center gap-3">
      {/* <IconSun className="size-4" /> */}

      <Switch
        id="theme-toggle"
        checked={isDark}
        onCheckedChange={handleThemeChange}
        aria-label="Toggle dark mode"
      />

      {/* <IconMoon className="size-4" /> */}

      <Label
        htmlFor="theme-toggle"
        className="text-sm font-medium"
      >
        {isDark ? "Dark" : "Light"}
      </Label>
    </div>
  )
}