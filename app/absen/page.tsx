import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getOfficeSettings, getTodayAttendance } from "@/lib/db"
import { AppHeader } from "@/components/app-header"
import { AttendanceClient } from "@/components/attendance-client"

export default async function AbsenPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.role === "admin") redirect("/admin")

  const [office, today] = await Promise.all([getOfficeSettings(), getTodayAttendance(user.id)])

  const hasCheckIn = today.some((a) => a.type === "check_in")
  const hasCheckOut = today.some((a) => a.type === "check_out")

  return (
    <div className="min-h-screen bg-muted/40">
      <AppHeader user={user} subtitle="Presensi Karyawan" />
      <main className="mx-auto max-w-lg px-4 py-6">
        <AttendanceClient
          userName={user.name}
          office={office}
          records={today.map((r) => ({ id: r.id, type: r.type, createdAt: r.createdAt, distanceM: r.distanceM }))}
          initialHasCheckIn={hasCheckIn}
          initialHasCheckOut={hasCheckOut}
        />
      </main>
    </div>
  )
}
