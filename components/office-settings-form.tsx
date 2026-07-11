"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { updateOfficeAction, type OfficeState } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { OfficeSettings } from "@/lib/types"
import { AlertCircle, CheckCircle2, Crosshair, LoaderCircle, MapPin, Save } from "lucide-react"

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
      Simpan Pengaturan
    </Button>
  )
}

export function OfficeSettingsForm({ office }: { office: OfficeSettings }) {
  const [state, formAction] = useActionState<OfficeState, FormData>(updateOfficeAction, {})
  const [lat, setLat] = useState(String(office.latitude))
  const [lng, setLng] = useState(String(office.longitude))
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const useMyLocation = () => {
    setGeoError(null)
    if (!("geolocation" in navigator)) {
      setGeoError("Perangkat tidak mendukung GPS.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(7))
        setLng(pos.coords.longitude.toFixed(7))
        setLocating(false)
      },
      () => {
        setGeoError("Gagal mengambil lokasi. Aktifkan izin lokasi.")
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="size-4 text-primary" /> Lokasi Kantor & Radius
        </CardTitle>
        <CardDescription>
          Titik koordinat kantor. Karyawan hanya bisa absen bila berada dalam radius yang ditentukan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama Lokasi</Label>
            <Input id="name" name="name" defaultValue={office.name} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                name="latitude"
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                name="longitude"
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="radiusM">Radius (meter)</Label>
            <Input id="radiusM" name="radiusM" type="number" min={1} step={1} defaultValue={office.radiusM} required />
          </div>

          <Button type="button" variant="outline" size="sm" className="self-start" onClick={useMyLocation} disabled={locating}>
            {locating ? <LoaderCircle className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
            Gunakan lokasi saya saat ini
          </Button>

          {geoError ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" /> {geoError}
            </p>
          ) : null}
          {state.error ? (
            <p className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4" /> {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
              <CheckCircle2 className="size-4" /> {state.success}
            </p>
          ) : null}

          <SaveButton />
        </form>
      </CardContent>
    </Card>
  )
}
