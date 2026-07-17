"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { login, logout, getCurrentUser } from "@/lib/auth"
import { getOfficeSettings, updateOfficeSettings, createAttendance, updateEmployee as dbUpdateEmployee, createUser, addHoliday, deleteHoliday } from "@/lib/db"
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

// --- Attendance Actions ---

const attendanceSchema = z.object({
  type: z.enum(["check_in", "check_out"]),
  photo: z.string().min(1, "Foto tidak boleh kosong."),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  accuracyM: z.coerce.number().nullable(),
})

export async function submitAttendanceAction(input: {
  type: "check_in" | "check_out"
  photo: string
  latitude: number
  longitude: number
  accuracyM: number | null
}) {
  const validatedFields = attendanceSchema.safeParse(input)

  if (!validatedFields.success) {
    return { ok: false, message: "Data absensi tidak valid." }
  }

  try {
    const user = await getCurrentUser()
    if (!user) {
      return { ok: false, message: "Pengguna tidak terautentikasi." }
    }

    const office = await getOfficeSettings()
    const distanceM = calculateDistanceInMeters(
      validatedFields.data.latitude,
      validatedFields.data.longitude,
      office.latitude,
      office.longitude,
    )
    const withinRadius = distanceM <= office.radiusM

    await createAttendance({
      ...validatedFields.data,
      userId: user.id,
      distanceM,
      withinRadius,
    })
    revalidatePath("/absen")
    return { ok: true, message: "Absensi berhasil dicatat." }
  } catch (error) {
    console.error("Failed to submit attendance:", error)
    return { ok: false, message: "Gagal mencatat absensi." }
  }
}

// --- Employee Actions ---

const createEmployeeSchema = z.object({
  name: z.string().min(1, "Nama tidak boleh kosong."),
  email: z.string().email("Email tidak valid."),
  password: z.string().min(6, "Password minimal 6 karakter."),
  position: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  employee_id: z.string().optional().nullable(),
  salary: z.coerce.number().min(0, "Gaji tidak boleh negatif.").optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
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
  phone: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  employee_id: z.string().nullable().optional(),
  salary: z.coerce.number().min(0, "Gaji tidak boleh negatif.").nullable().optional(),
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