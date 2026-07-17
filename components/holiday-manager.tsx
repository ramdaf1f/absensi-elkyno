"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Trash2, CalendarDays, CheckCircle2, AlertTriangle } from "lucide-react"
import { addHolidayAction, deleteHolidayAction } from "@/lib/actions"
import type { Holiday } from "@/lib/types"

export function HolidayManager({ holidays = [] }: { holidays: Holiday[] }) {
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  
  // State for Calendar Month/Year navigation
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed (Jan = 0)

  // Calendar calculations
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ]

  const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]

  // Get number of days in selected month and year
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  // Day of week of the 1st day (0 = Sunday, 1 = Monday, etc.)
  // We want to map it to starting with Monday (0 = Monday, ..., 6 = Sunday)
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear(y => y - 1)
    } else {
      setMonth(m => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear(y => y + 1)
    } else {
      setMonth(m => m + 1)
    }
  }

  // Find holidays falling in the currently viewed month and year
  const getHolidayForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return holidays.find(h => {
      const hDate = new Date(h.date).toISOString().split('T')[0]
      return hDate === dateStr
    })
  }

  // Handle adding holiday
  const handleAddHoliday = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget
    
    startTransition(async () => {
      const res = await addHolidayAction({ error: "" }, formData)
      if (res.error) {
        setFormError(res.error)
      } else {
        setFormSuccess(res.success || "Hari libur ditambahkan!")
        form.reset()
      }
    })
  }

  // Handle deleting holiday
  const handleDeleteHoliday = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus hari libur ini?")) return
    
    startTransition(async () => {
      const res = await deleteHolidayAction(id)
      if (res.error) {
        alert(res.error)
      }
    })
  }

  // Render days
  const calendarCells = []
  // Empty slots for days before 1st of month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="h-12 w-full"></div>)
  }
  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    const isWeekend = (firstDayIndex + d - 1) % 7 >= 5 // Saturday (5) or Sunday (6)
    const holiday = getHolidayForDay(d)
    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year

    calendarCells.push(
      <div
        key={`day-${d}`}
        className={`relative flex h-12 w-full flex-col items-center justify-between rounded-lg p-1 border text-center transition-all ${
          isToday ? 'border-primary ring-2 ring-primary/20 font-bold' : 'border-muted-foreground/10'
        } ${
          holiday 
            ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400' 
            : isWeekend 
              ? 'bg-amber-50/50 text-amber-600 border-amber-100 dark:bg-amber-950/10 dark:text-amber-500 dark:border-amber-950/30' 
              : 'hover:bg-accent hover:text-accent-foreground bg-card'
        }`}
        title={holiday ? `${holiday.description} (${holiday.date})` : undefined}
      >
        <span className="text-[11px] font-semibold">{d}</span>
        {holiday ? (
          <span className="w-full truncate text-[8px] font-bold leading-none bg-rose-200/50 dark:bg-rose-800/50 px-1 py-0.5 rounded text-[7px] text-rose-800 dark:text-rose-300">
            {holiday.description}
          </span>
        ) : isWeekend ? (
          <span className="text-[8px] text-amber-500 font-medium">Libur</span>
        ) : null}
      </div>
    )
  }

  // Filter holidays belonging to the currently viewed month
  const currentMonthHolidays = holidays.filter(h => {
    const hDate = new Date(h.date)
    return hDate.getMonth() === month && hDate.getFullYear() === year
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="flex flex-col gap-4">
      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            Manajemen Hari Libur
          </CardTitle>
          <CardDescription>Tambah hari libur nasional atau cuti bersama</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddHoliday} className="grid gap-3">
            <div>
              <Label htmlFor="date">Tanggal</Label>
              <Input type="date" id="date" name="date" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="description">Keterangan</Label>
              <Input id="description" name="description" placeholder="Contoh: Idul Fitri / Tahun Baru" required className="mt-1" />
            </div>
            <Button type="submit" size="sm" disabled={isPending} className="w-full">
              {isPending ? "Memproses..." : "Tambah Libur"}
            </Button>
          </form>

          {formError && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400 p-2.5 rounded-lg border border-green-200 dark:border-green-900/50">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Kalender Hari Libur</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="size-7" onClick={handlePrevMonth}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs font-bold min-w-24 text-center px-1">
                {monthNames[month]} {year}
              </span>
              <Button variant="outline" size="icon" className="size-7" onClick={handleNextMonth}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-muted-foreground">
            {dayNames.map(day => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>
          
          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells}
          </div>

          {/* List of holidays for current month */}
          <div className="border-t pt-4">
            <h4 className="text-xs font-bold mb-2 text-muted-foreground flex items-center gap-1.5">
              <span>Daftar Libur Bulan Ini ({monthNames[month]}):</span>
            </h4>
            {currentMonthHolidays.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Tidak ada hari libur di bulan ini.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {currentMonthHolidays.map(holiday => (
                  <div key={holiday.id} className="flex items-center justify-between text-xs bg-rose-50/50 dark:bg-rose-950/10 p-2 rounded-lg border border-rose-100 dark:border-rose-950/40">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-rose-800 dark:text-rose-300">{holiday.description}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(holiday.date).toLocaleDateString("id-ID", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-rose-600 hover:text-rose-700 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-900/30"
                      onClick={() => handleDeleteHoliday(holiday.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}