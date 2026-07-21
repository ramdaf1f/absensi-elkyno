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

function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90
}

function isValidLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180
}

function isValidAccuracy(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
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
  const isWithinWindow = isTimeWithinWindow(now, currentUser.check_out_window_start, currentUser.check_out_window_end)

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
    .map((assignment: AssignedOffice) => {
      const officeLatitude = Number(assignment.office.latitude)
      const officeLongitude = Number(assignment.office.longitude)
      const distanceM = distanceInMeters(body.latitude as number, body.longitude as number, officeLatitude, officeLongitude)

      return {
        officeId: assignment.office_id,
        distanceM,
        radiusM: assignment.office.radius_m,
      }
    })
    .sort((left, right) => left.distanceM - right.distanceM)[0]

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
