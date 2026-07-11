"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { type ReportRow } from "@/components/report-table"

export function ExportButton({ rows }: { rows: ReportRow[] }) {
  const exportToCsv = () => {
    const headers = ["Nama", "Email", "Tipe", "Waktu", "Status Radius", "Jarak (m)"]
    const csvContent = [
      headers.join(","),
      ...rows.map(r => [
        r.userName,
        r.userEmail,
        r.type === "check_in" ? "Masuk" : "Keluar",
        new Date(r.createdAt).toLocaleString(),
        r.withinRadius ? "Valid" : "Luar Radius",
        r.distanceM
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `absensi_${new Date().toLocaleDateString()}.csv`
    a.click()
  }

  return (
    <Button variant="outline" size="sm" onClick={exportToCsv}>
      <Download className="size-4 mr-2" />
      Export CSV
    </Button>
  )
}