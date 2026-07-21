import { logoutAction } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { LogOut, ScanFace, LayoutDashboard, Users, Settings, UserCircle2 } from "lucide-react"
import type { PublicUser } from "@/lib/types"
import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { ThemeToggle } from "@/components/theme-toggle"

export async function AdminSidebar() {
  const user = await getCurrentUser()
  if (!user) return null

  return (
    <aside className="flex w-full flex-col border-b border-border bg-card p-3 md:w-72 md:min-h-screen md:border-b-0 md:border-r md:p-4">
      <div className="flex items-center justify-center gap-3 pb-3 md:justify-start md:pb-6">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ScanFace className="size-5" />
        </div>
        <p className="text-sm font-semibold md:text-base">Absensi Admin</p>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <div className="md:hidden">
            <ThemeToggle />
          </div>
          <form action={logoutAction} className="md:hidden">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="flex h-9 w-9 items-center justify-center rounded-full border-red-300 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
            >
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </div>

      <nav className="flex flex-row items-center justify-center gap-1 overflow-x-auto whitespace-nowrap md:flex-1 md:flex-col md:items-stretch md:justify-start md:gap-1 md:overflow-visible">
        <Link href="/admin" className="flex items-center gap-1 rounded-lg px-2 py-2 text-[clamp(0.62rem,2.2vw,0.9rem)] text-white transition-all hover:text-white md:gap-3 md:px-3 md:text-sm">
          <LayoutDashboard className="size-[clamp(0.95rem,2.1vw,1rem)] md:size-4" /> Dashboard
        </Link>
        <Link href="/admin/employees" className="flex items-center gap-1 rounded-lg px-2 py-2 text-[clamp(0.62rem,2.2vw,0.9rem)] text-white transition-all hover:text-white md:gap-3 md:px-3 md:text-sm">
          <Users className="size-[clamp(0.95rem,2.1vw,1rem)] md:size-4" /> Karyawan
        </Link>
        <Link href="/admin/settings" className="flex items-center gap-1 rounded-lg px-2 py-2 text-[clamp(0.62rem,2.2vw,0.9rem)] text-white transition-all hover:text-white md:gap-3 md:px-3 md:text-sm">
          <Settings className="size-[clamp(0.95rem,2.1vw,1rem)] md:size-4" /> Pengaturan
        </Link>
        <Link href="/admin/profile" className="flex items-center gap-1 rounded-lg px-2 py-2 text-[clamp(0.62rem,2.2vw,0.9rem)] text-white transition-all hover:text-white md:gap-3 md:px-3 md:text-sm">
          <UserCircle2 className="size-[clamp(0.95rem,2.1vw,1rem)] md:size-4" /> Profil
        </Link>
      </nav>

      <div className="mt-3 hidden md:mt-auto md:block md:gap-4 md:border-t md:border-border md:pt-4">
        <div className="text-sm font-medium leading-tight">{user.name}</div>
        <form action={logoutAction} className="mt-3">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full justify-start rounded-lg border-red-300 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
          >
            <LogOut className="mr-2 size-4" />
            Keluar
          </Button>
        </form>
      </div>
    </aside>
  )
}
