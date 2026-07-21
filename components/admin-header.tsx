"use client"

import { usePathname } from "next/navigation"

const titleMap: { [key: string]: string } = {
  "/admin": "Dashboard",
  "/admin/employees": "Karyawan",
  "/admin/employees/new": "Tambah Karyawan Baru",
  "/admin/settings": "Pengaturan",
  "/admin/profile": "Profil",
}

export function AdminHeader() {
  const pathname = usePathname()
  const title = titleMap[pathname] || "Halaman Admin"

  return (
    <header className="mb-5 md:mb-6">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
    </header>
  )
}
