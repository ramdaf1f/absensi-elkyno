import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { distanceInMeters } from "@/lib/geo"
import { prisma } from "@/lib/prisma"

type CheckInBody = {
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

function formatJakartaIso(date: Date): string {
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

  let body: CheckInBody

  try {
    body = (await request.json()) as CheckInBody
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
        type: "check_in",
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
      serverTime: formatJakartaIso(new Date()),
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
