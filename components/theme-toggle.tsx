"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="size-8" />
  }

  const isDark = resolvedTheme === "dark"

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border/80 bg-background/90 p-0.5 shadow-sm">
      <Button
        type="button"
        variant={isDark ? "ghost" : "secondary"}
        size="icon"
        aria-label="Switch to light mode"
        className="h-7 w-7 rounded-full"
        onClick={() => setTheme("light")}
      >
        <Sun className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant={isDark ? "secondary" : "ghost"}
        size="icon"
        aria-label="Switch to dark mode"
        className="h-7 w-7 rounded-full"
        onClick={() => setTheme("dark")}
      >
        <Moon className="size-3.5" />
      </Button>
    </div>
  )
}