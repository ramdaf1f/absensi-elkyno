"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/60 p-2">
        <p className="px-2 text-sm font-medium">Mode Tampilan</p>
        <div className="grid grid-cols-2 gap-1 rounded-md bg-background p-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setTheme("light")}><Sun className="size-4" /></Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setTheme("dark")}><Moon className="size-4" /></Button>
        </div>
    </div>
  )
}