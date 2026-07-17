import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getOfficeSettings, listAttendanceByMonth, listEmployees, getHolidays } from "@/lib/db"
import { AppHeader } from "@/components/app-header"

import { ReportFilters } from "@/components/report-filters"
import { ReportTable, type ReportRow } from "@/components/report-table"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarDays, CheckCircle2, MapPinOff, Users, AlertTriangle, Download } from "lucide-react"
import { ExportButton } from "@/components/export-button"

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; userId?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.role !== "admin") redirect("/absen")

  const sp = await searchParams
  const now = new Date()
  const year = Number(sp.year) || now.getFullYear()
  const month = Number(sp.month) || now.getMonth() + 1
  const userId = sp.userId || ""

  let office, employees, records, holidays;
  try {
    [office, employees, records, holidays] = await Promise.all([
      getOfficeSettings(),
      listEmployees(),
      listAttendanceByMonth(year, month, userId || undefined),
      getHolidays(),
    ])
  } catch (error) {
    console.error("Failed to fetch admin page data:", error);
    // Redirect ke halaman login atau halaman error umum jika pengambilan data gagal
    redirect("/login?error=data_fetch_failed");
  }

  const validCount = records.filter((r) => r.withinRadius).length
  const outCount = records.length - validCount
  const presentEmployees = new Set(records.map((r) => r.userId)).size

  // Filter Absensi
  const todayStr = new Date().toISOString().split('T')[0]
  const daysInMonth = new Date(year, month, 0).getDate()

  // Absen Hari Ini
  const todayRecords = records.filter(r => new Date(r.createdAt).toISOString().split('T')[0] === todayStr)
  const attendedIdsToday = new Set(todayRecords.map(r => r.userId))
  const notAttendedToday = employees.filter(e => !attendedIdsToday.has(e.id) && e.role === 'employee')

  // Absen Bulanan (Per Tanggal)
  const monthlyMissing: Record<number, string[]> = {}
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const currentDate = new Date(year, month - 1, d)
    const dayOfWeek = currentDate.getDay()
    
    // Skip Sabtu (6), Minggu (0), dan Tanggal Merah
    const isHoliday = holidays.some(h => new Date(h.date).toISOString().split('T')[0] === dateKey)
    if (dayOfWeek === 0 || dayOfWeek === 6 || isHoliday) continue;

    const recordsOnDate = records.filter(r => new Date(r.createdAt).toISOString().split('T')[0] === dateKey)
    const attendedIdsOnDate = new Set(recordsOnDate.map(r => r.userId))
    const missing = employees.filter(e => !attendedIdsOnDate.has(e.id) && e.role === 'employee').map(e => e.name)
    if (missing.length > 0) monthlyMissing[d] = missing
  }

  const rows: ReportRow[] = records.map((r) => ({
    id: r.id,
    userName: r.userName,
    userEmail: r.userEmail,
    type: r.type,
    photo: r.photo,
    latitude: r.latitude,
    longitude: r.longitude,
    distanceM: r.distanceM,
    withinRadius: r.withinRadius,
    createdAt: r.createdAt,
  }))

  return (
    <div className="flex flex-col gap-6">
      <AppHeader user={user} subtitle="Dashboard Admin" />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={<CalendarDays className="size-4" />} label="Total Absensi" value={records.length} />
            <StatCard icon={<Users className="size-4" />} label="Karyawan Hadir" value={presentEmployees} />
            <StatCard icon={<CheckCircle2 className="size-4" />} label="Lokasi Valid" value={validCount} tone="success" />
            <StatCard icon={<MapPinOff className="size-4" />} label="Di Luar Radius" value={outCount} tone="destructive" />
          </div>

          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Laporan Bulanan</h2>
                  <p className="text-sm text-muted-foreground">Riwayat presensi karyawan beserta bukti foto & lokasi.</p>
                </div>
                <ExportButton rows={rows} />
              </div>
              <ReportFilters year={year} month={month} userId={userId} employees={employees} />
              <ReportTable rows={rows} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" /> Belum Absen Hari Ini ({notAttendedToday.length})
              </h3>
              {notAttendedToday.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {notAttendedToday.map(e => <span key={e.id} className="px-2 py-1 bg-muted rounded text-xs">{e.name}</span>)}
                </div>
              ) : <p className="text-xs text-green-600">Semua hadir!</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3 text-sm">Absen Bolong Bulan Ini</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {Object.entries(monthlyMissing).map(([day, names]) => (
                  <div key={day} className="flex flex-col gap-1 border-b pb-2 mb-2">
                    <div className="flex justify-between">
                       <span className="font-bold text-xs text-primary">Tanggal {day}</span>
                       <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 rounded">{names.length} Org</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate">{names.join(', ')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone?: "default" | "success" | "destructive"
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-primary"
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className={`flex items-center gap-1.5 text-xs font-medium ${toneClass}`}>
          {icon}
          {label}
        </span>
        <span className="text-2xl font-bold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  )
}
