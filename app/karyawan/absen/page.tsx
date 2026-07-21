'use client'

import { AttendanceButton } from '@/components/attendance-button'
import { useGeolocation } from '@/hooks/use-geolocation'

const OFFICE = {
  name: 'Kantor Pusat',
  latitude: -6.2,
  longitude: 106.8166667,
  radiusM: 50,
}

const windowStatus = {
  start: '06:00',
  end: '10:00',
  isOpen: true,
}

function formatIndonesianDate(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radius = 6371000
  const toRadians = (value: number) => (value * Math.PI) / 180
  const deltaLat = toRadians(lat2 - lat1)
  const deltaLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return radius * c
}

export default function AttendancePage() {
  const today = new Date()
  const geoState = useGeolocation()
  const distanceM =
    geoState.latitude !== null && geoState.longitude !== null
      ? Math.round(distanceInMeters(geoState.latitude, geoState.longitude, OFFICE.latitude, OFFICE.longitude))
      : null
  const isInsideRadius = distanceM !== null && distanceM <= OFFICE.radiusM
  const canCheckIn = isInsideRadius && windowStatus.isOpen

  let locationStatus = 'Meminta izin lokasi...'
  if (geoState.error) {
    locationStatus =
      geoState.error === 'permission_denied' ? 'Izin lokasi ditolak' : geoState.error === 'unavailable' ? 'GPS tidak tersedia' : geoState.error
  } else if (geoState.latitude !== null && geoState.longitude !== null && geoState.accuracy !== null) {
    locationStatus = `Lat: ${geoState.latitude.toFixed(6)}\nLng: ${geoState.longitude.toFixed(6)}\nAkurasi: ${Math.round(geoState.accuracy)} m\nJarak ke kantor: ${distanceM !== null ? `${distanceM} m` : '-'} `
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Absensi Hari Ini</h1>
        <p className="text-sm text-muted-foreground">{formatIndonesianDate(today)}</p>
      </header>

      <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
          Belum Absen
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Anda belum melakukan absensi hari ini.</p>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Informasi Lokasi</h2>
        <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start justify-between gap-3">
            <dt>Lokasi</dt>
            <dd className="whitespace-pre-line text-right font-medium text-foreground">{locationStatus}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>Jarak ke kantor</dt>
            <dd className="font-medium text-foreground">{distanceM !== null ? `${distanceM} m` : '-'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>Window waktu</dt>
            <dd className="font-medium text-foreground">{`${windowStatus.start} - ${windowStatus.end}`}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>Kantor</dt>
            <dd className="font-medium text-foreground">{OFFICE.name}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>Radius</dt>
            <dd className="font-medium text-foreground">{OFFICE.radiusM} m</dd>
          </div>
        </dl>
      </section>

      <div className="space-y-3">
        <AttendanceButton label="Check-in" disabled={!canCheckIn} variant="checkin" />
        <AttendanceButton label="Check-out" disabled variant="checkout" />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Tombol akan aktif setelah lokasi dan waktu valid.
      </p>
    </main>
  )
}
