"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { formatDistance } from "@/lib/geo"
import { CheckCircle2, ImageIcon, LogIn, LogOut, X, XCircle } from "lucide-react"

export interface ReportRow {
  id: string
  userName: string
  userEmail: string
  type: "check_in" | "check_out"
  photo: string
  latitude: number
  longitude: number
  distanceM: number
  withinRadius: boolean
  createdAt: string
}

export function ReportTable({ rows }: { rows: ReportRow[] }) {
  const [preview, setPreview] = useState<ReportRow | null>(null)

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center text-muted-foreground">
        <ImageIcon className="size-8" />
        <p className="text-sm">Belum ada data absensi untuk periode ini.</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Karyawan</th>
              <th className="px-4 py-3 font-medium">Tipe</th>
              <th className="px-4 py-3 font-medium">Tanggal & Waktu</th>
              <th className="px-4 py-3 font-medium">Jarak</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Foto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <p className="font-medium">{r.userName}</p>
                  <p className="text-xs text-muted-foreground">{r.userEmail}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.type === "check_in" ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"
                    }`}
                  >
                    {r.type === "check_in" ? <LogIn className="size-3" /> : <LogOut className="size-3" />}
                    {r.type === "check_in" ? "Masuk" : "Pulang"}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {new Date(r.createdAt).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 tabular-nums">{formatDistance(r.distanceM)}</td>
                <td className="px-4 py-3">
                  {r.withinRadius ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                      <CheckCircle2 className="size-3.5" /> Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                      <XCircle className="size-3.5" /> Di luar radius
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setPreview(r)}
                    className="overflow-hidden rounded-md border border-border transition-opacity hover:opacity-80"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.photo || "/placeholder.svg"} alt={`Foto ${r.userName}`} className="size-10 object-cover" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-card shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="font-medium">{preview.userName}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(preview.createdAt).toLocaleString("id-ID")}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setPreview(null)} aria-label="Tutup">
                <X className="size-4" />
              </Button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.photo || "/placeholder.svg"} alt={`Foto ${preview.userName}`} className="w-full object-cover" />
            <div className="grid grid-cols-2 gap-2 p-4 font-mono text-xs">
              <div className="rounded-lg bg-muted px-3 py-2">
                <p className="text-[10px] uppercase text-muted-foreground">Latitude</p>
                <p>{preview.latitude.toFixed(6)}</p>
              </div>
              <div className="rounded-lg bg-muted px-3 py-2">
                <p className="text-[10px] uppercase text-muted-foreground">Longitude</p>
                <p>{preview.longitude.toFixed(6)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
