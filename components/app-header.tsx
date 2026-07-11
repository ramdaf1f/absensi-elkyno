import { logoutAction } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { LogOut, ScanFace } from "lucide-react"
import type { PublicUser } from "@/lib/types"

export function AppHeader({ user, subtitle }: { user: PublicUser; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur ">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ScanFace className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold">Absensi</p>
            <p className="text-xs text-muted-foreground">{subtitle ?? "Presensi Karyawan"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{user.name}</p>
            <p className="text-xs capitalize text-muted-foreground">{user.role === "admin" ? "Administrator" : "Karyawan"}</p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}