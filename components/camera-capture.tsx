import { useEffect, useRef, useState } from 'react'
import { AttendanceButton } from '@/components/attendance-button'

type CameraCaptureProps = {
  disabled?: boolean
  onCapture: (file: File, previewUrl: string) => void
}

export function CameraCapture({ disabled = false, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsOpen(false)
    setIsLoading(false)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const openCamera = async () => {
    if (disabled || isLoading) return

    try {
      setIsLoading(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsOpen(true)
    } catch {
      stopCamera()
    } finally {
      setIsLoading(false)
    }
  }

  const capturePhoto = async () => {
    const videoElement = videoRef.current
    const canvasElement = canvasRef.current
    if (!videoElement || !canvasElement) return

    canvasElement.width = videoElement.videoWidth
    canvasElement.height = videoElement.videoHeight
    const context = canvasElement.getContext('2d')
    if (!context) return

    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height)

    const blob = await new Promise<Blob | null>((resolve) => canvasElement.toBlob(resolve, 'image/jpeg', 0.92))
    if (!blob) return

    const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' })
    const previewUrl = URL.createObjectURL(blob)
    onCapture(file, previewUrl)
    stopCamera()
  }

  return (
    <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Selfie</h2>
      <p className="mt-1 text-xs text-muted-foreground">Ambil selfie untuk melanjutkan absensi.</p>

      {isOpen ? (
        <div className="mt-3 space-y-3">
          <video ref={videoRef} playsInline autoPlay className="h-64 w-full rounded-xl border bg-black object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="grid grid-cols-2 gap-3">
            <AttendanceButton label="Jepret" onClick={capturePhoto} />
            <AttendanceButton label="Batal" variant="checkout" onClick={stopCamera} />
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <AttendanceButton label={isLoading ? 'Memuat Kamera...' : 'Ambil Selfie'} disabled={disabled || isLoading} onClick={openCamera} />
        </div>
      )}
    </section>
  )
}
