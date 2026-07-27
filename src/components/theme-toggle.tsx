"use client"

import { useEffect, useState } from "react"
import { IconMoon, IconSun } from "@tabler/icons-react"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("theme")

    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches

    const initialTheme =
      stored === "dark" || (!stored && prefersDark)
        ? "dark"
        : "light"

    setTheme(initialTheme)
    document.documentElement.classList.toggle(
      "dark",
      initialTheme === "dark"
    )

    setMounted(true)
  }, [])

  const handleThemeChange = (checked: boolean) => {
    const nextTheme = checked ? "dark" : "light"

    setTheme(nextTheme)
    localStorage.setItem("theme", nextTheme)
    document.documentElement.classList.toggle(
      "dark",
      nextTheme === "dark"
    )
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