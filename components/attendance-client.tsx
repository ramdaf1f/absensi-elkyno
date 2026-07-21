"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { submitAttendanceAction } from "@/lib/actions"
import { distanceInMeters, formatDistance } from "@/lib/geo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AttendanceType, OfficeSettings } from "@/lib/types"
import {
  Camera,
  CheckCircle2,
  Clock,
  Crosshair,
  LoaderCircle,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  XCircle,
} from "lucide-react"

interface TodayRecord {
  id: string
  type: AttendanceType
  createdAt: string
  distanceM: number
}

interface Coords {
  latitude: number
  longitude: number
  accuracy: number
}

interface AttendanceWindow {
  checkInWindowStart?: string | null
  checkInWindowEnd?: string | null
  checkOutWindowStart?: string | null
  checkOutWindowEnd?: string | null
}

const MAX_GPS_ACCURACY_M = 100

function minutesNow(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date())
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0)
  return hour * 60 + minute
}

function parseTime(value: string | null | undefined, fallback: string): number {
  const [hour, minute] = (value || fallback).split(":").map(Number)
  return hour * 60 + minute
}

function inWindow(now: number, start: number, end: number): boolean {
  if (start <= end) return now >= start && now <= end
  return now >= start || now <= end
}

export function AttendanceClient({
  userName,
  offices,
  attendanceWindow,
  records,
  initialHasCheckIn,
  initialHasCheckOut,
}: {
  userName: string
  offices: OfficeSettings[]
  attendanceWindow: AttendanceWindow
  records: TodayRecord[]
  initialHasCheckIn: boolean
  initialHasCheckOut: boolean
}) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)

  const [coords, setCoords] = useState<Coords | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const nextType: AttendanceType | null = !initialHasCheckIn ? "check_in" : !initialHasCheckOut ? "check_out" : null

  const nearestOffice = coords
    ? offices
        .map((office) => ({
          office,
          distance: distanceInMeters(coords.latitude, coords.longitude, office.latitude, office.longitude),
        }))
        .sort((a, b) => a.distance - b.distance)[0]
    : null
  const activeOffice = nearestOffice?.office ?? offices[0]
  const distance = nearestOffice?.distance ?? null
  const withinRadius = coords
    ? offices.some(
        (office) => distanceInMeters(coords.latitude, coords.longitude, office.latitude, office.longitude) <= office.radiusM,
      )
    : false
  const hasAccurateGps = coords ? coords.accuracy <= MAX_GPS_ACCURACY_M : false
  const nowMinutes = minutesNow()
  const activeWindow =
    nextType === "check_in"
      ? {
          start: attendanceWindow.checkInWindowStart || "06:00",
          end: attendanceWindow.checkInWindowEnd || "10:00",
        }
      : {
          start: attendanceWindow.checkOutWindowStart || "15:00",
          end: attendanceWindow.checkOutWindowEnd || "23:00",
        }
  const withinTimeWindow = nextType
    ? inWindow(
        nowMinutes,
        parseTime(activeWindow.start, nextType === "check_in" ? "06:00" : "15:00"),
        parseTime(activeWindow.end, nextType === "check_in" ? "10:00" : "23:00"),
      )
    : false
  const canUseCamera = !!nextType && !!coords && withinRadius && hasAccurateGps && withinTimeWindow

  // --- Camera ---
  const startCamera = useCallback(async () => {
    if (!canUseCamera) {
      setCameraError("Kamera hanya aktif saat lokasi, akurasi GPS, dan jam absen sudah valid.")
      return
    }
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)
    } catch {
      setCameraError("Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan.")
    }
  }, [canUseCamera])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const w = video.videoWidth || 640
    const h = video.videoHeight || 480
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    // mirror horizontally to match the preview
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, w, h)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7)
    setPhoto(dataUrl)
    stopCamera()
  }, [stopCamera])

  const retake = useCallback(() => {
    setPhoto(null)
    setResult(null)
    startCamera()
  }, [startCamera])

  // --- Location ---
  const getLocation = useCallback(() => {
    setLocationError(null)
    if (!("geolocation" in navigator)) {
      setLocationError("Perangkat tidak mendukung GPS.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Aktifkan izin lokasi untuk absen."
            : "Gagal mendapatkan lokasi. Coba lagi di area terbuka.",
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }, [])

  useEffect(() => {
    getLocation()
  }, [getLocation])

  // --- Submit ---
  const handleSubmit = useCallback(async () => {
    if (!nextType || !photo || !coords) return
    setSubmitting(true)
    setResult(null)
    const res = await submitAttendanceAction({
      type: nextType,
      photo,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracyM: coords.accuracy,
    })
    setResult({ ok: res.ok, message: res.message })
    setSubmitting(false)
    if (res.ok) {
      setPhoto(null)
      router.refresh()
    }
  }, [nextType, photo, coords, router])

  const canSubmit = !!photo && canUseCamera && !submitting

  return (
    <div className="flex flex-col gap-4">
      {/* Greeting + status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Halo, {userName}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </CardHeader>
        <CardContent className="flex gap-3">
          <StatusPill label="Masuk" active={initialHasCheckIn} time={records.find((r) => r.type === "check_in")?.createdAt} />
          <StatusPill label="Pulang" active={initialHasCheckOut} time={records.find((r) => r.type === "check_out")?.createdAt} />
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-4 text-primary" /> Lokasi
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Kantor</span>
            <span className="font-medium">{activeOffice?.name ?? "Kantor"}</span>
          </div>

          {locationError ? (
            <p className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <XCircle className="size-4 shrink-0" /> {locationError}
            </p>
          ) : coords ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <InfoBox label="Latitude" value={coords.latitude.toFixed(6)} />
                <InfoBox label="Longitude" value={coords.longitude.toFixed(6)} />
                <InfoBox label="Akurasi GPS" value={`± ${coords.accuracy.toFixed(0)} m`} />
                <InfoBox label="Jarak ke kantor" value={distance !== null ? formatDistance(distance) : "-"} />
              </div>
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  withinRadius ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}
              >
                {withinRadius ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                {withinRadius
                  ? `Dalam radius kantor (maks. ${activeOffice?.radiusM ?? 0} m)`
                  : `Di luar radius. Harus ≤ ${activeOffice?.radiusM ?? 0} m dari kantor.`}
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Mengambil lokasi GPS...
            </p>
          )}

          <Button variant="outline" size="sm" onClick={getLocation} disabled={locating} className="self-start">
            {locating ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Perbarui lokasi
          </Button>
        </CardContent>
      </Card>

      {/* Camera */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="size-4 text-primary" /> Foto Wajah
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-muted">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo || "/placeholder.svg"} alt="Foto wajah yang diambil" className="size-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                className="size-full -scale-x-100 object-cover"
                style={{ display: cameraOn ? "block" : "none" }}
              />
            )}
            {!cameraOn && !photo ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Camera className="size-8" />
                <p className="text-sm">Kamera belum aktif</p>
              </div>
            ) : null}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {cameraError ? (
            <p className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <XCircle className="size-4 shrink-0" /> {cameraError}
            </p>
          ) : null}

          <div className="flex gap-2">
            {!photo && !cameraOn ? (
              <Button variant="outline" size="lg" className="flex-1" onClick={startCamera} disabled={!canUseCamera}>
                <Camera className="size-4" /> Aktifkan Kamera
              </Button>
            ) : null}
            {cameraOn ? (
              <Button size="lg" className="flex-1" onClick={capturePhoto}>
                <Crosshair className="size-4" /> Ambil Foto
              </Button>
            ) : null}
            {photo ? (
              <Button variant="outline" size="lg" className="flex-1" onClick={retake}>
                <RefreshCw className="size-4" /> Ambil Ulang
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {result ? (
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
            result.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          }`}
        >
          {result.ok ? <CheckCircle2 className="size-5 shrink-0" /> : <XCircle className="size-5 shrink-0" />}
          {result.message}
        </div>
      ) : null}

      {/* Submit */}
      {nextType ? (
        <Button size="lg" className="h-12 w-full text-base" disabled={!canSubmit} onClick={handleSubmit}>
          {submitting ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : nextType === "check_in" ? (
            <LogIn className="size-5" />
          ) : (
            <LogOut className="size-5" />
          )}
          {submitting ? "Mengirim..." : nextType === "check_in" ? "Absen Masuk" : "Absen Pulang"}
        </Button>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-success/10 px-4 py-3 text-sm font-medium text-success">
          <CheckCircle2 className="size-5" /> Absensi hari ini sudah lengkap. Sampai jumpa besok!
        </div>
      )}

      {nextType && (!photo || !canUseCamera) ? (
        <p className="text-center text-xs text-muted-foreground">
          {!withinRadius ? "Dekati lokasi kantor hingga dalam radius, " : ""}
          {coords && !hasAccurateGps ? "pastikan akurasi GPS cukup baik, " : ""}
          {!withinTimeWindow ? `tunggu window ${activeWindow.start}-${activeWindow.end}, ` : ""}
          {!photo ? "ambil foto wajah terlebih dahulu " : ""}
          untuk mengaktifkan tombol absen.
        </p>
      ) : null}
    </div>
  )
}

function StatusPill({ label, active, time }: { label: string; active: boolean; time?: string }) {
  return (
    <div
      className={`flex flex-1 flex-col items-center gap-1 rounded-lg border px-3 py-3 ${
        active ? "border-success/30 bg-success/10" : "border-border bg-muted"
      }`}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      {active && time ? (
        <span className="flex items-center gap-1 text-sm font-semibold text-success">
          <Clock className="size-3.5" />
          {new Date(time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </span>
      ) : (
        <span className="text-sm font-medium text-muted-foreground">—</span>
      )}
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-foreground">{value}</p>
    </div>
  )
}
