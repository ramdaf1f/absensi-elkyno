"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { login, logout, getCurrentUser } from "@/lib/auth"
import { getOfficesForUser, updateOfficeSettings, createAttendance, updateEmployee as dbUpdateEmployee, createUser, addHoliday, deleteHoliday, getTodayAttendance } from "@/lib/db"
import { z } from "zod"

// --- Auth Actions ---

const loginSchema = z.object({
  email: z.string().email("Email tidak valid."),
  password: z.string().min(1, "Password tidak boleh kosong."),
})

export type LoginState = {
  error?: string
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const validatedFields = loginSchema.safeParse(Object.fromEntries(formData))
  if (!validatedFields.success) {
    return { error: "Email atau password tidak valid." }
  }
  try {
    await login(validatedFields.data.email, validatedFields.data.password)
  } catch (error) {
    return { error: "Email atau password salah." }
  }
  redirect("/absen")
}

export async function logoutAction() {
  await logout()
  redirect("/login")
}

// --- Office Settings Actions ---

const officeSettingsSchema = z.object({
  name: z.string().min(1, "Nama lokasi tidak boleh kosong."),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  radiusM: z.coerce.number().min(1, "Radius harus lebih dari 0."),
})

export type OfficeState = {
  success?: string
  error?: string
}

export async function updateOfficeAction(_prevState: OfficeState, formData: FormData): Promise<OfficeState> {
  const validatedFields = officeSettingsSchema.safeParse(Object.fromEntries(formData))
  if (!validatedFields.success) {
    return { error: "Data tidak valid." }
  }
  try {
    await updateOfficeSettings(validatedFields.data)
    revalidatePath("/admin/settings")
    return { success: "Pengaturan kantor berhasil diperbarui." }
  } catch (error) {
    console.error("Failed to update office settings:", error)
    return { error: "Gagal memperbarui pengaturan kantor." }
  }
}

// Helper for distance calculation (moved from client-side or re-implemented for server)
function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3 // metres
  const φ1 = (lat1 * Math.PI) / 180 // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // in metres
}

function serverDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusM = 6371e3
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const lat1Rad = toRad(lat1)
  const lat2Rad = toRad(lat2)
  const deltaLat = toRad(lat2 - lat1)
  const deltaLon = toRad(lon2 - lon1)
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusM * c
}

const DEFAULT_CHECK_IN_START = "06:00"
const DEFAULT_CHECK_IN_END = "10:00"
const DEFAULT_CHECK_OUT_START = "15:00"
const DEFAULT_CHECK_OUT_END = "23:00"
const DEFAULT_STANDARD_CHECK_IN = "08:00"
const MAX_GPS_ACCURACY_M = Number(process.env.GEOFENCE_MAX_GPS_ACCURACY ?? 100)

type AttendanceErrorCode =
  | "OUT_OF_RANGE"
  | "OUTSIDE_TIME_WINDOW"
  | "LOCATION_PERMISSION_DENIED"
  | "LOW_GPS_ACCURACY"
  | "ALREADY_CHECKED_IN"
  | "ALREADY_CHECKED_OUT"
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"

type AttendanceActionResult = {
  ok: boolean
  success: boolean
  message: string
  error_code?: AttendanceErrorCode
  distance_meters?: number
  attendance_id?: string
  check_in_time?: string
  check_out_time?: string
  status?: "on_time" | "late" | "present"
}

function jakartaMinutes(date = new Date()): number {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0)
  return hour * 60 + minute
}

function parseTimeToMinutes(value: string | null | undefined, fallback: string): number {
  const time = /^\d{2}:\d{2}$/.test(value ?? "") ? value! : fallback
  const [hour, minute] = time.split(":").map(Number)
  return hour * 60 + minute
}

function isWithinWindow(now: number, start: number, end: number): boolean {
  if (start <= end) return now >= start && now <= end
  return now >= start || now <= end
}

// --- Attendance Actions ---

const attendanceSchema = z.object({
  type: z.enum(["check_in", "check_out"]),
  photo: z.string().min(1, "Foto tidak boleh kosong."),
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
  accuracyM: z.coerce.number().finite().nonnegative().nullable(),
})

function duplicateAttendanceResult(type: "check_in" | "check_out", distanceM?: number): AttendanceActionResult {
  return {
    ok: false,
    success: false,
    error_code: type === "check_in" ? "ALREADY_CHECKED_IN" : "ALREADY_CHECKED_OUT",
    message: type === "check_in" ? "Anda sudah absen masuk hari ini." : "Anda sudah absen pulang hari ini.",
    ...(typeof distanceM === "number" ? { distance_meters: distanceM } : {}),
  }
}

export async function submitAttendanceAction(input: {
  type: "check_in" | "check_out"
  photo: string
  latitude: number
  longitude: number
  accuracyM: number | null
}): Promise<AttendanceActionResult> {
  const validatedFields = attendanceSchema.safeParse(input)

  if (!validatedFields.success) {
    return { ok: false, success: false, error_code: "VALIDATION_ERROR", message: "Data absensi tidak valid." }
  }

  try {
    const user = await getCurrentUser()
    if (!user) {
      return { ok: false, success: false, error_code: "UNAUTHORIZED", message: "Pengguna tidak terautentikasi." }
    }
    if (user.role !== "employee") {
      return { ok: false, success: false, error_code: "UNAUTHORIZED", message: "Hanya karyawan yang dapat melakukan absensi." }
    }
    if (user.status === "inactive") {
      return { ok: false, success: false, error_code: "UNAUTHORIZED", message: "Akun karyawan tidak aktif." }
    }

    const offices = await getOfficesForUser(user.id)
    if (offices.length === 0) {
      return {
        ok: false,
        success: false,
        error_code: "VALIDATION_ERROR",
        message: "Karyawan belum memiliki kantor untuk absensi.",
      }
    }

    const officeDistances = offices
      .map((office) => ({
        office,
        distanceM: serverDistanceInMeters(
          validatedFields.data.latitude,
          validatedFields.data.longitude,
          office.latitude,
          office.longitude,
        ),
      }))
      .sort((a, b) => a.distanceM - b.distanceM)
    const nearestOffice = officeDistances[0]
    const matchedOffice = officeDistances.find((candidate) => candidate.distanceM <= candidate.office.radiusM)

    if (!nearestOffice) {
      return {
        ok: false,
        success: false,
        error_code: "VALIDATION_ERROR",
        message: "Kantor absensi tidak ditemukan.",
      }
    }

    if (!matchedOffice) {
      return {
        ok: false,
        success: false,
        error_code: "OUT_OF_RANGE",
        message: `Anda berada ${Math.round(nearestOffice.distanceM)}m dari kantor, di luar radius ${nearestOffice.office.radiusM}m.`,
        distance_meters: nearestOffice.distanceM,
      }
    }

    const office = matchedOffice.office
    const distanceM = matchedOffice.distanceM

    const accuracyM = validatedFields.data.accuracyM
    if (accuracyM === null || accuracyM > MAX_GPS_ACCURACY_M) {
      return {
        ok: false,
        success: false,
        error_code: "LOW_GPS_ACCURACY",
        message: `Akurasi GPS terlalu rendah. Maksimal ${MAX_GPS_ACCURACY_M}m, terdeteksi ${
          accuracyM === null ? "tidak tersedia" : `${Math.round(accuracyM)}m`
        }.`,
        distance_meters: distanceM,
      }
    }

    const today = await getTodayAttendance(user.id)
    if (validatedFields.data.type === "check_in" && today.some((record) => record.type === "check_in")) {
      return duplicateAttendanceResult("check_in", distanceM)
    }
    if (validatedFields.data.type === "check_out") {
      if (!today.some((record) => record.type === "check_in")) {
        return {
          ok: false,
          success: false,
          error_code: "VALIDATION_ERROR",
          message: "Absen pulang hanya bisa dilakukan setelah absen masuk.",
          distance_meters: distanceM,
        }
      }
      if (today.some((record) => record.type === "check_out")) {
        return duplicateAttendanceResult("check_out", distanceM)
      }
    }

    const nowMinutes = jakartaMinutes()
    const windowStart = parseTimeToMinutes(
      validatedFields.data.type === "check_in" ? user.checkInWindowStart : user.checkOutWindowStart,
      validatedFields.data.type === "check_in" ? DEFAULT_CHECK_IN_START : DEFAULT_CHECK_OUT_START,
    )
    const windowEnd = parseTimeToMinutes(
      validatedFields.data.type === "check_in" ? user.checkInWindowEnd : user.checkOutWindowEnd,
      validatedFields.data.type === "check_in" ? DEFAULT_CHECK_IN_END : DEFAULT_CHECK_OUT_END,
    )
    if (!isWithinWindow(nowMinutes, windowStart, windowEnd)) {
      return {
        ok: false,
        success: false,
        error_code: "OUTSIDE_TIME_WINDOW",
        message: "Belum masuk jam absen Anda.",
        distance_meters: distanceM,
      }
    }

    const standardCheckIn = parseTimeToMinutes(user.standardCheckInTime, DEFAULT_STANDARD_CHECK_IN)
    const attendanceStatus =
      validatedFields.data.type === "check_in" ? (nowMinutes <= standardCheckIn ? "on_time" : "late") : "present"

    const attendance = await createAttendance({
      ...validatedFields.data,
      userId: user.id,
      officeId: String(office.id),
      distanceM,
      withinRadius: true,
      status: attendanceStatus,
      inputMethod: "self",
    })
    revalidatePath("/absen")
    return {
      ok: true,
      success: true,
      message: "Absensi berhasil dicatat.",
      attendance_id: attendance.id,
      distance_meters: distanceM,
      status: attendanceStatus,
      ...(validatedFields.data.type === "check_in"
        ? { check_in_time: attendance.createdAt }
        : { check_out_time: attendance.createdAt }),
    }
  } catch (error: any) {
    console.error("Failed to submit attendance:", error)
    if (error?.code === "23505" || /duplicate key/i.test(String(error?.message ?? ""))) {
      return duplicateAttendanceResult(validatedFields.data.type)
    }
    return { ok: false, success: false, error_code: "VALIDATION_ERROR", message: "Gagal mencatat absensi." }
  }
}

// --- Employee Actions ---

const createEmployeeSchema = z.object({
  name: z.string().min(1, "Nama tidak boleh kosong."),
  email: z.string().email("Email tidak valid."),
  password: z.string().min(6, "Password minimal 6 karakter."),
  position: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  employee_id: z.string().optional().nullable(),
  salary: z.coerce.number().min(0, "Gaji tidak boleh negatif.").optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
  checkInWindowStart: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  checkInWindowEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  checkOutWindowStart: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  checkOutWindowEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  standardCheckInTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
});

export type EmployeeCreateState = {
  error?: string;
  errors?: {
    [key: string]: string[] | undefined;
  };
};

export async function createEmployeeAction(
  _prevState: EmployeeCreateState,
  formData: FormData,
): Promise < EmployeeCreateState > {
  const validatedFields = createEmployeeSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!validatedFields.success) {
    return {
      error: "Data tidak valid. Silakan periksa kembali isian Anda.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await createUser({ ...validatedFields.data, role: "employee" });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { error: "Gagal membuat karyawan. Email atau ID Karyawan sudah digunakan." };
    }
    return { error: "Terjadi kesalahan di server. Gagal membuat karyawan." };
  }

  revalidatePath("/admin/employees");
  redirect("/admin/employees");
}

const updateEmployeeSchema = z.object({
  name: z.string().min(1, "Nama tidak boleh kosong.").optional(),
  position: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  employee_id: z.string().nullable().optional(),
  salary: z.coerce.number().min(0, "Gaji tidak boleh negatif.").nullable().optional(),
  checkInWindowStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  checkInWindowEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  checkOutWindowStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  checkOutWindowEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  standardCheckInTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})

export type EmployeeUpdateState = {
  success?: string
  error?: string
}

export async function updateEmployee(
  _prevState: EmployeeUpdateState,
  employeeId: string,
  formData: FormData,
): Promise<EmployeeUpdateState> {
  const input = Object.fromEntries(formData)
  const validatedFields = updateEmployeeSchema.safeParse(input)

  if (!validatedFields.success) {
    return { error: "Data karyawan tidak valid." }
  }

  try {
    await dbUpdateEmployee(employeeId, validatedFields.data)
    revalidatePath("/admin/employees")
    return { success: "Data karyawan berhasil diperbarui." }
  } catch (error) {
    console.error("Failed to update employee:", error)
    return { error: "Gagal memperbarui data karyawan." }
  }
}

// --- Holiday Actions ---

const holidaySchema = z.object({
  date: z.string().min(1, "Tanggal tidak boleh kosong."),
  description: z.string().min(1, "Keterangan tidak boleh kosong."),
})

export type HolidayState = {
  success?: string
  error?: string
}

export async function addHolidayAction(_prevState: HolidayState, formData: FormData): Promise<HolidayState> {
  const validatedFields = holidaySchema.safeParse(Object.fromEntries(formData))
  if (!validatedFields.success) {
    return { error: "Data libur tidak valid." }
  }
  try {
    await addHoliday(validatedFields.data)
    revalidatePath("/admin/settings")
    return { success: "Hari libur berhasil ditambahkan." }
  } catch (error) {
    console.error("Failed to add holiday:", error)
    return { error: "Gagal menambahkan hari libur." }
  }
}

export async function deleteHolidayAction(id: string): Promise<{ success?: string; error?: string }> {
  try {
    await deleteHoliday(id)
    revalidatePath("/admin/settings")
    return { success: "Hari libur berhasil dihapus." }
  } catch (error) {
    console.error("Failed to delete holiday:", error)
    return { error: "Gagal menghapus hari libur." }
  }
}
