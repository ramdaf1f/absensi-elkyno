"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

interface Employee {
  id: string
  name: string
}

export function ReportFilters({
  year,
  month,
  userId,
  employees,
}: {
  year: number
  month: number
  userId: string
  employees: Employee[]
}) {
  const router = useRouter()
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  const update = (next: { year?: number; month?: number; userId?: string }) => {
    const params = new URLSearchParams()
    params.set("year", String(next.year ?? year))
    params.set("month", String(next.month ?? month))
    const uid = next.userId ?? userId
    if (uid) params.set("userId", uid)
    router.push(`/admin?${params.toString()}`)
  }

  const selectClass = cn(
    "h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm",
    "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
  )

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[180px]">
        <label htmlFor="f-month" className="text-xs font-medium text-muted-foreground">Bulan</label>
        <select id="f-month" className={selectClass} value={month} onChange={(e) => update({ month: Number(e.target.value) })}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[180px]">
        <label htmlFor="f-year" className="text-xs font-medium text-muted-foreground">Tahun</label>
        <select id="f-year" className={selectClass} value={year} onChange={(e) => update({ year: Number(e.target.value) })}>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[260px]">
        <label htmlFor="f-emp" className="text-xs font-medium text-muted-foreground">Karyawan</label>
        <select id="f-emp" className={selectClass} value={userId} onChange={(e) => update({ userId: e.target.value })}>
          <option value="">Semua karyawan</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
