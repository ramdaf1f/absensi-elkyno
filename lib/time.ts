export function getJakartaNow(): Date {
  return new Date()
}

export function formatJakartaIso(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })

  const parts = formatter.formatToParts(date)
  const getPart = (type: "year" | "month" | "day" | "hour" | "minute" | "second") =>
    parts.find((part) => part.type === type)?.value ?? "00"

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:${getPart("minute")}:${getPart("second")}+07:00`
}

function parseTimeToMinutes(time: string): number | null {
  const match = /^([0-1]\d|2[0-3]):([0-5]\d)$/.exec(time)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function isTimeWithinWindow(now: Date, start: string, end: string): boolean {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })

  const currentMinutes = parseTimeToMinutes(formatter.format(now))
  const startMinutes = parseTimeToMinutes(start)
  const endMinutes = parseTimeToMinutes(end)

  if (currentMinutes === null || startMinutes === null || endMinutes === null) return false
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes
  }

  return currentMinutes >= startMinutes || currentMinutes <= endMinutes
}

function getJakartaDateParts(now: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  const parts = formatter.formatToParts(now)
  const year = Number(parts.find((part) => part.type === "year")?.value)
  const month = Number(parts.find((part) => part.type === "month")?.value)
  const day = Number(parts.find((part) => part.type === "day")?.value)

  return { year, month, day }
}

export function getJakartaDayRange(now: Date): { start: Date; end: Date } {
  const { year, month, day } = getJakartaDateParts(now)
  const offsetMs = 7 * 60 * 60 * 1000

  return {
    start: new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMs),
    end: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offsetMs),
  }
}
