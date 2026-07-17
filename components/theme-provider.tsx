"use client"

import * as React from "react"

export function ThemeProvider({ 
  children, 
  defaultTheme = "system",
  attribute,    // Kita pisahkan biar gak masuk ke ...props
  enableSystem, // Kita pisahkan biar gak masuk ke ...props
  ...props      // Sisa properti HTML aman masuk ke div
}: { 
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  [key: string]: any; // Untuk menampung props div lainnya jika ada
}) {
  const [theme, setTheme] = React.useState<string>(defaultTheme)

  React.useEffect(() => {
    // 1. Ambil preferensi tema dari localStorage atau system
    const savedTheme = localStorage.getItem("theme") || defaultTheme
    let activeTheme = savedTheme

    if (savedTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      activeTheme = systemTheme
    }

    setTheme(activeTheme)

    // 2. Terapkan kelas 'dark' pada elemen HTML
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(activeTheme)
  }, [defaultTheme])

  return (
    <div {...props}>
      {children}
    </div>
  )
}