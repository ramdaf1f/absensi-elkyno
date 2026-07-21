import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { LoginForm } from "@/components/login-form"
import { MapPin, ScanFace } from "lucide-react"

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect(user.role === "admin" || user.role === "superadmin" ? "/admin" : "/absen")

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ScanFace className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Absensi</h1>
            <p className="mt-1 text-sm text-muted-foreground text-balance">
              Presensi karyawan dengan verifikasi foto & lokasi GPS
            </p>
          </div>
        </div>

        <LoginForm />

        <div className="mt-6 rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
          <p className="mb-2 flex items-center gap-1.5 font-medium text-foreground">
            <MapPin className="size-3.5" /> Akun demo
          </p>
          <ul className="space-y-1 font-mono">
            <li>Admin: admin@example.com / admin123</li>
            <li>Karyawan: employee@example.com / employee</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
