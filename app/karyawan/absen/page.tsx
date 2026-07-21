import { AttendanceButton } from '@/components/attendance-button'

function formatIndonesianDate(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export default function AttendancePage() {
  const today = new Date()

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
          <div className="flex items-center justify-between gap-3">
            <dt>Lokasi</dt>
            <dd className="font-medium text-foreground">Belum diperiksa</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>Jarak ke kantor</dt>
            <dd className="font-medium text-foreground">-</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>Window waktu</dt>
            <dd className="font-medium text-foreground">-</dd>
          </div>
        </dl>
      </section>

      <div className="space-y-3">
        <AttendanceButton label="Check-in" disabled variant="checkin" />
        <AttendanceButton label="Check-out" disabled variant="checkout" />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Tombol akan aktif setelah lokasi dan waktu valid.
      </p>
    </main>
  )
}
