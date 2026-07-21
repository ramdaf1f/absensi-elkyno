import { Button } from '@/components/ui/button'

type AttendanceButtonProps = {
  label: string
  disabled?: boolean
  variant?: 'checkin' | 'checkout'
}

export function AttendanceButton({ label, disabled = false, variant = 'checkin' }: AttendanceButtonProps) {
  const variantClassName =
    variant === 'checkin'
      ? 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500/40'
      : 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500/40'

  const disabledClassName = disabled ? 'bg-muted text-muted-foreground hover:bg-muted' : variantClassName

  return (
    <Button
      type="button"
      disabled={disabled}
      className={`h-11 w-full rounded-xl px-4 text-base font-semibold shadow-sm ${disabledClassName}`}
    >
      {label}
    </Button>
  )
}
