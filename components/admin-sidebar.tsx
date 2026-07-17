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
    <aside className="flex w-64 flex-col border-r border-border bg-card p-4">
      <div className="flex items-center gap-3 pb-6">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ScanFace className="size-5" />
        </div>
        <p className="font-semibold">Absensi Admin</p>
      </div>
      <nav className="flex-1 space-y-1">
        <Link href="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
          <LayoutDashboard className="size-4" /> Dashboard
        </Link>
        <Link href="/admin/employees" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
          <Users className="size-4" /> Karyawan
        </Link>
        <Link href="/admin/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
          <Settings className="size-4" /> Pengaturan
        </Link>
        <Link href="/admin/profile" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
          <UserCircle2 className="size-4" /> Profil
        </Link>
      </nav>
      <div className="mt-auto flex flex-col gap-4 pt-4 border-t border-border">
        <ThemeToggle />
        <div className="text-sm font-medium leading-tight mb-2">{user.name}</div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm" className="w-full justify-start">
            <LogOut className="size-4 mr-2" />
            Keluar
          </Button>
        </form>
      </div>
    </aside>
  )
}
