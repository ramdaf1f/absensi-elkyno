"use client"

import { useEffect, useState } from "react"
import { Grid3X3, List } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type EmployeeSummary = {
  id: string
  name: string
  email: string
  position?: string | null
  department?: string | null
  phone?: string | null
  employee_id?: string | null
  status?: "active" | "inactive"
  checkInWindowStart?: string | null
  checkInWindowEnd?: string | null
  checkOutWindowStart?: string | null
  checkOutWindowEnd?: string | null
  standardCheckInTime?: string | null
}

type ViewMode = "bubble" | "compact"

type EmployeeViewToggleProps = {
  employees: EmployeeSummary[]
}

export function EmployeeViewToggle({ employees }: EmployeeViewToggleProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("bubble")

  useEffect(() => {
    const savedViewMode = window.localStorage.getItem("employee-view-mode")
    if (savedViewMode === "bubble" || savedViewMode === "compact") {
      setViewMode(savedViewMode)
    }
  }, [])

  function changeViewMode(nextViewMode: ViewMode) {
    setViewMode(nextViewMode)
    window.localStorage.setItem("employee-view-mode", nextViewMode)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Tampilan data karyawan</p>
          <p className="text-xs text-muted-foreground">Pilih bubble untuk scan cepat, atau compact untuk detail ringkas.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
          <Button
            type="button"
            variant={viewMode === "bubble" ? "default" : "ghost"}
            size="sm"
            onClick={() => changeViewMode("bubble")}
            className="gap-2"
          >
            <Grid3X3 className="size-4" />
            Bubble
          </Button>
          <Button
            type="button"
            variant={viewMode === "compact" ? "default" : "ghost"}
            size="sm"
            onClick={() => changeViewMode("compact")}
            className="gap-2"
          >
            <List className="size-4" />
            Compact
          </Button>
        </div>
      </div>

      {viewMode === "bubble" ? <BubbleView employees={employees} /> : <CompactView employees={employees} />}
    </div>
  )
}

function BubbleView({ employees }: EmployeeViewToggleProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {employees.map((employee) => (
        <Card key={employee.id} className="overflow-hidden rounded-3xl border-muted bg-gradient-to-br from-card to-muted/40 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                  {getInitials(employee.name)}
                </div>
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{employee.name}</CardTitle>
                  <CardDescription className="truncate">{employee.position || "Karyawan"}</CardDescription>
                </div>
              </div>
              <StatusBadge status={employee.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoPill label="Email" value={employee.email} />
            <div className="grid grid-cols-2 gap-2">
              <InfoPill label="ID" value={employee.employee_id || "-"} />
              <InfoPill label="Telepon" value={employee.phone || "-"} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InfoPill label="Departemen" value={employee.department || "-"} />
              <InfoPill
                label="Jam Datang"
                value={`${employee.checkInWindowStart || "06:00"}-${employee.checkInWindowEnd || "10:00"}`}
              />
            </div>
            <InfoPill
              label="Jam Pulang"
              value={`${employee.checkOutWindowStart || "15:00"}-${employee.checkOutWindowEnd || "23:00"}`}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CompactView({ employees }: EmployeeViewToggleProps) {
  return (
    <div className="space-y-3">
      {employees.map((employee) => (
        <Card key={employee.id} className="rounded-2xl shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground">
                {getInitials(employee.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{employee.name}</p>
                <p className="truncate text-sm text-muted-foreground">{employee.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Badge variant="outline">{employee.position || "Karyawan"}</Badge>
              {employee.department && <Badge variant="outline">{employee.department}</Badge>}
              <Badge variant="secondary">
                {employee.checkInWindowStart || "06:00"}-{employee.checkInWindowEnd || "10:00"}
              </Badge>
              {employee.employee_id && <Badge variant="secondary">{employee.employee_id}</Badge>}
              <StatusBadge status={employee.status} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-background/80 px-3 py-2 ring-1 ring-border/70">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status?: "active" | "inactive" }) {
  const isActive = status !== "inactive"

  return (
    <Badge className={cn(isActive ? "bg-emerald-500 text-white hover:bg-emerald-500/90" : "bg-rose-500 text-white hover:bg-rose-500/90")}>
      {isActive ? "Aktif" : "Tidak Aktif"}
    </Badge>
  )
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "K"
}
