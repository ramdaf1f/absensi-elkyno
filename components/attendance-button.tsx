import { Button } from '@/components/ui/button'

type AttendanceButtonProps = {
  label: string
  disabled?: boolean
  loading?: boolean
  variant?: 'checkin' | 'checkout'
  onClick?: () => void
}

export function AttendanceButton({ label, disabled = false, loading = false, variant = 'checkin', onClick }: AttendanceButtonProps) {
  const variantClassName =
    variant === 'checkin'
      ? 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500/40'
      : 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500/40'

  const disabledClassName = disabled || loading ? 'bg-muted text-muted-foreground hover:bg-muted' : variantClassName

  return (
    <Button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={`h-11 w-full rounded-xl px-4 text-base font-semibold shadow-sm ${disabledClassName}`}
    >
      {loading ? 'Memproses...' : label}
    </Button>
  )
}
