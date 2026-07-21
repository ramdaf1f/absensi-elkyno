import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { distanceInMeters } from "@/lib/geo"
import { getJakartaDayRange, getJakartaNow, formatJakartaIso, isTimeWithinWindow } from "@/lib/time"
import { prisma } from "@/lib/prisma"

const MAX_GPS_ACCURACY_M = 50

type CheckOutBody = {
  latitude?: unknown
  longitude?: unknown
  accuracy?: unknown
  photoUrl?: unknown
  deviceTime?: unknown
}

type AssignedOffice = {
  office_id: string
  office: {
    id: string
    latitude: unknown
    longitude: unknown
    radius_m: number
  }
}

type MissedCheckoutCandidate = {
  id: string
  user_id: string
  user: {
    check_out_window_end: string
  }
}

function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90
}

function isValidLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180
}

function isValidAccuracy(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function getJakartaCurrentMinutes(now: Date): number | null {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })

  const [hours, minutes] = formatter.format(now).split(":")
  if (!hours || !minutes) return null
  return Number(hours) * 60 + Number(minutes)
}

function parseWindowMinutes(value: string): number | null {
  const match = /^([0-1]\d|2[0-3]):([0-5]\d)$/.exec(value)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

async function markCheckoutMissed(now: Date): Promise<number> {
  const { start, end } = getJakartaDayRange(now)
  const currentMinutes = getJakartaCurrentMinutes(now)
  if (currentMinutes === null) return 0

  const [checkIns, checkOuts] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        type: "check_in",
        created_at: {
          gte: start,
          lte: end,
        },
        checkout_missed: false,
      },
      select: {
        id: true,
        user_id: true,
        user: {
          select: {
            check_out_window_end: true,
          },
        },
      },
    }),
    prisma.attendance.findMany({
      where: {
        type: "check_out",
        created_at: {
          gte: start,
          lte: end,
        },
      },
      select: {
        user_id: true,
      },
    }),
  ])

  const checkedOutUsers = new Set(checkOuts.map((record) => record.user_id))
  const updates = checkIns.filter((candidate) => {
    if (checkedOutUsers.has(candidate.user_id)) return false
  
    const windowEnd = candidate.user?.check_out_window_end
    if (!windowEnd) return false
  
    const endMinutes = parseWindowMinutes(windowEnd)
    if (endMinutes === null) return false
  
    const currentMinutes = getJakartaCurrentMinutes(now)
    if (currentMinutes === null) return false
  
    return currentMinutes > endMinutes
  })

  if (updates.length === 0) return 0

  const result = await prisma.attendance.updateMany({
    where: {
      id: {
        in: updates.map((candidate) => candidate.id),
      },
    },
    data: {
      checkout_missed: true,
    },
  })

  return result.count
}

export async function PATCH() {
  const currentUser = await getCurrentUser()

  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "superadmin")) {
    return NextResponse.json(
      {
        success: false,
        code: "FORBIDDEN",
        message: "Only admin can trigger checkout_missed",
      },
      { status: 403 },
    )
  }

  const now = getJakartaNow()
  const updated = await markCheckoutMissed(now)

  return NextResponse.json({
    success: true,
    updated,
    serverTime: formatJakartaIso(now),
  })
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json(
      {
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
      { status: 401 },
    )
  }

  let body: CheckOutBody

  try {
    body = (await request.json()) as CheckOutBody
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_BODY",
        message: "Request body must be valid JSON",
      },
      { status: 400 },
    )
  }

  if (!isValidLatitude(body.latitude)) {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_BODY",
        message: "latitude must be a number between -90 and 90",
      },
      { status: 400 },
    )
  }

  if (!isValidLongitude(body.longitude)) {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_BODY",
        message: "longitude must be a number between -180 and 180",
      },
      { status: 400 },
    )
  }

  if (!isValidAccuracy(body.accuracy)) {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_BODY",
        message: "accuracy must be a number greater than or equal to 0",
      },
      { status: 400 },
    )
  }

  if (body.photoUrl !== undefined && typeof body.photoUrl !== "string") {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_BODY",
        message: "photoUrl must be a string when provided",
      },
      { status: 400 },
    )
  }

  if (body.deviceTime !== undefined && typeof body.deviceTime !== "string") {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_BODY",
        message: "deviceTime must be a string when provided",
      },
      { status: 400 },
    )
  }

  if (body.accuracy > MAX_GPS_ACCURACY_M) {
    return NextResponse.json(
      {
        success: false,
        code: "GPS_NOT_ACCURATE",
        message: "GPS accuracy is too low",
        accuracyM: body.accuracy,
        maxAccuracyM: MAX_GPS_ACCURACY_M,
      },
      { status: 400 },
    )
  }


  const now = getJakartaNow()
  const checkOutWindowStart = currentUser.checkOutWindowStart ?? '15:00'
  const checkOutWindowEnd = currentUser.checkOutWindowEnd ?? '23:00'
  
  const isWithinWindow = isTimeWithinWindow(
    now,
    checkOutWindowStart,
    checkOutWindowEnd,
  )

  if (!isWithinWindow) {
    return NextResponse.json(
      {
        success: false,
        code: "WINDOW_CLOSED",
        message: "Check-out is not allowed at this time",
      },
      { status: 403 },
    )
  }

  const { start, end } = getJakartaDayRange(now)
  const existingCheckIn = await prisma.attendance.findFirst({
    where: {
      user_id: currentUser.id,
      type: "check_in",
      created_at: {
        gte: start,
        lte: end,
      },
    },
    select: {
      id: true,
      created_at: true,
    },
  })

  if (!existingCheckIn) {
    return NextResponse.json(
      {
        success: false,
        code: "CHECKIN_REQUIRED",
        message: "You must check in before checking out",
      },
      { status: 409 },
    )
  }

  const existingCheckOut = await prisma.attendance.findFirst({
    where: {
      user_id: currentUser.id,
      type: "check_out",
      created_at: {
        gte: start,
        lte: end,
      },
    },
    select: {
      id: true,
      created_at: true,
    },
  })

  if (existingCheckOut) {
    return NextResponse.json(
      {
        success: false,
        code: "ALREADY_CHECKED_OUT",
        message: "You have already checked out today",
        attendanceId: existingCheckOut.id,
        checkedOutAt: formatJakartaIso(existingCheckOut.created_at),
      },
      { status: 409 },
    )
  }

    const assignedOffices = await prisma.employeeOffice.findMany({
    where: {
      employee_id: currentUser.id,
    },
    select: {
      office_id: true,
      office: {
        select: {
          id: true,
          latitude: true,
          longitude: true,
          radius_m: true,
        },
      },
    },
  })

  if (assignedOffices.length === 0) {
    return NextResponse.json(
      {
        success: false,
        code: "OFFICE_NOT_ASSIGNED",
        message: "No office assignment found",
      },
      { status: 403 },
    )
  }

  const nearestOffice = assignedOffices
    .map((assignment: { office_id: string; office: { id: string; latitude: unknown; longitude: unknown; radius_m: number } }) => {
      const officeLatitude = Number(assignment.office.latitude)
      const officeLongitude = Number(assignment.office.longitude)
      const distanceM = distanceInMeters(body.latitude as number, body.longitude as number, officeLatitude, officeLongitude)

      return {
        officeId: assignment.office_id,
        distanceM,
        radiusM: assignment.office.radius_m,
      }
    })
    .sort((left: { distanceM: number; radiusM: number }, right: { distanceM: number; radiusM: number }) => left.distanceM - right.distanceM)[0] as { officeId: string; distanceM: number; radiusM: number }

  if (nearestOffice.distanceM > nearestOffice.radiusM) {
    return NextResponse.json(
      {
        success: false,
        code: "OUTSIDE_RADIUS",
        message: "You are outside the allowed office radius",
        officeId: nearestOffice.officeId,
        distanceM: nearestOffice.distanceM,
        radiusM: nearestOffice.radiusM,
      },
      { status: 403 },
    )
  }

  try {
    const attendance = await prisma.attendance.create({
      data: {
        user_id: currentUser.id,
        office_id: nearestOffice.officeId,
        type: "check_out",
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy_m: body.accuracy,
        photo: body.photoUrl ?? "pending",
        photo_url: body.photoUrl ?? null,
        distance_m: nearestOffice.distanceM,
        within_radius: 1,
        status: "present",
        input_method: "self",
      },
    })

    return NextResponse.json({
      success: true,
      attendanceId: attendance.id,
      serverTime: formatJakartaIso(now),
    })
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: "INTERNAL_ERROR",
        message: "Failed to create attendance record",
      },
      { status: 500 },
    )
  }
}
