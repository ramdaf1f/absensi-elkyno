import 'dotenv/config'
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import type { AttendanceRecord, AttendanceType, AttendanceWithUser, OfficeSettings, User, Holiday } from "./types"
import { getSupabaseServerClient } from './supabase-server'
import { supabase } from './supabase'
import { supabaseAdmin } from './supabase-admin'

// Helper to map Supabase user to our app's User type
function fromSupabaseUser(user: any): User | null {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.password_hash,
    role: user.role,
    position: user.position,
    department: user.department,
    phone: user.phone,
    employee_id: user.employee_id,
    salary: user.salary,
    status: user.status,
    checkInWindowStart: user.check_in_window_start,
    checkInWindowEnd: user.check_in_window_end,
    checkOutWindowStart: user.check_out_window_start,
    checkOutWindowEnd: user.check_out_window_end,
    standardCheckInTime: user.standard_check_in_time,
    isGlobalAdmin: Boolean(user.is_global_admin),
    isTestAccount: Boolean(user.is_test_account),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  }
}

// ------------------------------------------------------------------
// Users
// ------------------------------------------------------------------

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase.from('users').select('*').eq('email', email).single()
  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found
  return fromSupabaseUser(data)
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
  if (error && error.code !== 'PGRST116') throw error
  return fromSupabaseUser(data)
}

export async function createUser(input: {
  name: string
  email: string
  password: string
  role: "employee" | "admin"
  position?: string | null
  department?: string | null
  phone?: string | null
  employee_id?: string | null
  salary?: number | null
  status?: "active" | "inactive"
  checkInWindowStart?: string | null
  checkInWindowEnd?: string | null
  checkOutWindowStart?: string | null
  checkOutWindowEnd?: string | null
  standardCheckInTime?: string | null
}): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, 10)
  const newUser = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    password_hash: passwordHash,
    role: input.role,
    position: input.position ?? null,
    department: input.department ?? null,
    phone: input.phone ?? null,
    employee_id: input.employee_id ?? null,
    salary: input.salary ?? null,
    status: input.status ?? 'active',
    check_in_window_start: input.checkInWindowStart ?? "06:00",
    check_in_window_end: input.checkInWindowEnd ?? "10:00",
    check_out_window_start: input.checkOutWindowStart ?? "15:00",
    check_out_window_end: input.checkOutWindowEnd ?? "23:00",
    standard_check_in_time: input.standardCheckInTime ?? "08:00",
  }

  const { data, error } = await supabase.from('users').insert(newUser).select().single()
  if (error) throw error
  if (input.role === "employee") {
    await assignEmployeeToDefaultOffice(data.id)
  }
  return fromSupabaseUser(data) as User
}

export async function updateEmployee(
  id: string,
  input: {
    name?: string
    position?: string | null
    department?: string | null
    phone?: string | null
    status?: "active" | "inactive"
    employee_id?: string | null
    salary?: number | null
    checkInWindowStart?: string
    checkInWindowEnd?: string
    checkOutWindowStart?: string
    checkOutWindowEnd?: string
    standardCheckInTime?: string
  }
): Promise<User | null> {
  const updatePayload = {
    name: input.name,
    position: input.position,
    department: input.department,
    phone: input.phone,
    status: input.status,
    employee_id: input.employee_id,
    salary: input.salary,
    check_in_window_start: input.checkInWindowStart,
    check_in_window_end: input.checkInWindowEnd,
    check_out_window_start: input.checkOutWindowStart,
    check_out_window_end: input.checkOutWindowEnd,
    standard_check_in_time: input.standardCheckInTime,
  }
  const { data, error } = await supabase.from('users').update(updatePayload).eq('id', id).select().single()
  if (error) throw error
  return fromSupabaseUser(data)
}

export async function listEmployees(): Promise<User[]> {
  const { data, error } = await supabase.from('users').select('*').eq('role', 'employee').order('name', { ascending: true })
  if (error) throw error
  return data.map((u) => fromSupabaseUser(u)!)
}

export async function getHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase.from('holidays').select('*')
  if (error) {
    console.error("Error fetching holidays:", error.message)
    return []
  }
  return data.map((h) => ({
    id: h.id,
    date: h.date,
    description: h.description,
  }))
}

export async function addHoliday(input: { date: string; description: string }): Promise<Holiday> {
  const newHoliday = {
    id: randomUUID(),
    date: input.date,
    description: input.description,
  }
  const { data, error } = await supabase.from('holidays').insert(newHoliday).select().single()
  if (error) throw error
  return {
    id: data.id,
    date: data.date,
    description: data.description,
  }
}

export async function deleteHoliday(id: string): Promise<void> {
  const { error } = await supabase.from('holidays').delete().eq('id', id)
  if (error) throw error
}

// ------------------------------------------------------------------
// Office settings
// ------------------------------------------------------------------

export async function getOfficeSettings(): Promise<OfficeSettings> {
  const office = await getFirstOffice()
  if (office) return office

  const { data, error } = await supabase.from('office_settings').select('*').eq('id', 1).single()
  if (error) {
    if (error.code === 'PGRST116') {
      const defaultSettings = {
        id: 1,
        name: "Kantor Pusat",
        latitude: -6.2087600,
        longitude: 106.8456000,
        radius_m: 50,
      }
      const { data: insertedData, error: insertError } = await supabase
        .from('office_settings')
        .insert(defaultSettings)
        .select()
        .single()
      
      if (insertError) {
        console.warn("Failed to auto-seed default office settings, returning temporary fallback:", insertError)
        return {
          id: 1,
          name: defaultSettings.name,
          latitude: defaultSettings.latitude,
          longitude: defaultSettings.longitude,
          radiusM: defaultSettings.radius_m,
          updatedAt: new Date().toISOString(),
        }
      }
      return {
        id: insertedData.id,
        name: insertedData.name,
        latitude: insertedData.latitude,
        longitude: insertedData.longitude,
        radiusM: insertedData.radius_m,
        updatedAt: insertedData.updated_at,
      }
    }
    throw error
  }
  return {
    id: data.id,
    name: data.name,
    latitude: data.latitude,
    longitude: data.longitude,
    radiusM: data.radius_m,
    updatedAt: data.updated_at,
  }
}

function fromOfficeRow(data: any): OfficeSettings {
  return {
    id: data.id,
    name: data.name,
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    radiusM: data.radius_m,
    updatedAt: data.updated_at,
  }
}

function fromAttendanceRow(data: any): AttendanceRecord {
  return {
    id: data.id,
    userId: data.user_id,
    type: data.type,
    photo: data.photo,
    photoUrl: data.photo_url,
    officeId: data.office_id,
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    accuracyM: data.accuracy_m === null ? null : Number(data.accuracy_m),
    distanceM: Number(data.distance_m),
    withinRadius: data.within_radius === true || data.within_radius === 1,
    status: data.status,
    inputMethod: data.input_method,
    inputBy: data.input_by,
    checkoutMissed: data.checkout_missed,
    createdAt: data.created_at,
  }
}

function getJakartaDayRange(date = new Date()): { start: string; end: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const year = Number(parts.find((part) => part.type === "year")?.value)
  const month = Number(parts.find((part) => part.type === "month")?.value)
  const day = Number(parts.find((part) => part.type === "day")?.value)
  const start = new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0))
  const end = new Date(Date.UTC(year, month - 1, day + 1, -7, 0, 0, 0))
  return { start: start.toISOString(), end: end.toISOString() }
}

async function getFirstOffice(): Promise<OfficeSettings | null> {
  const { data, error } = await supabaseAdmin
    .from('offices')
    .select('id, name, latitude, longitude, radius_m, updated_at')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) return null
  return data ? fromOfficeRow(data) : null
}

export async function listOffices(): Promise<OfficeSettings[]> {
  const { data, error } = await supabase
    .from('offices')
    .select('id, name, latitude, longitude, radius_m, updated_at')
    .order('name', { ascending: true })

  if (error) throw error
  return (data || []).map(fromOfficeRow)
}

export async function assignEmployeeOffices(employeeId: string, officeIds: Array<string | number>): Promise<void> {
  const normalizedOfficeIds = Array.from(new Set(officeIds.map(String).filter(Boolean)))

  const { error: deleteError } = await supabase
    .from('employee_offices')
    .delete()
    .eq('employee_id', employeeId)
  if (deleteError) throw deleteError

  if (normalizedOfficeIds.length === 0) return

  const rows = normalizedOfficeIds.map((officeId) => ({
    employee_id: employeeId,
    office_id: officeId,
  }))
  const { error: insertError } = await supabase
    .from('employee_offices')
    .upsert(rows, { onConflict: 'employee_id,office_id' })
  if (insertError) throw insertError
}

async function assignEmployeeToDefaultOffice(employeeId: string): Promise<void> {
  const office = await getFirstOffice()
  if (!office) return

  const { error } = await supabase
    .from('employee_offices')
    .upsert(
      { employee_id: employeeId, office_id: String(office.id) },
      { onConflict: 'employee_id,office_id' },
    )
  if (error) {
    console.warn("Failed to assign employee to default office:", error.message)
  }
}

export async function getOfficesForUser(userId: string): Promise<OfficeSettings[]> {
  const { data, error } = await supabase
    .from('employee_offices')
    .select('offices ( id, name, latitude, longitude, radius_m, updated_at )')
    .eq('employee_id', userId)

  if (error) {
    return [await getOfficeSettings()]
  }

  const offices = (data || [])
    .map((row: any) => row.offices)
    .filter(Boolean)
    .map(fromOfficeRow)

  return offices.length > 0 ? offices : [await getOfficeSettings()]
}

export async function updateOfficeSettings(input: {
  name: string
  latitude: number
  longitude: number
  radiusM: number
}): Promise<OfficeSettings> {
  const currentOffice = await getFirstOffice()

  if (currentOffice) {
    const { error } = await supabaseAdmin
      .from('offices')
      .update({
        name: input.name,
        latitude: input.latitude,
        longitude: input.longitude,
        radius_m: input.radiusM,
      })
      .eq('id', currentOffice.id)

    if (error) throw new Error(error.message)
  } else {
    const officeId = randomUUID()

    const { error } = await supabaseAdmin
      .from('offices')
      .insert({
        id: officeId,
        name: input.name,
        latitude: input.latitude,
        longitude: input.longitude,
        radius_m: input.radiusM,
      })

    if (error) throw new Error(error.message)
  }

  const { error: settingsError } = await supabaseAdmin
    .from('office_settings')
    .upsert({
      id: 1,
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude,
      radius_m: input.radiusM,
    })

  if (settingsError) throw new Error(settingsError.message)

  return await getOfficeSettings()
}

// ------------------------------------------------------------------
// Attendance
// ------------------------------------------------------------------

export async function createAttendance(input: {
  userId: string
  officeId?: string | null
  type: AttendanceType
  photo: string
  photoUrl?: string | null
  latitude: number
  longitude: number
  accuracyM: number | null
  distanceM: number
  withinRadius: boolean
  status?: "on_time" | "late" | "present" | "alpha" | "leave" | "sick" | "cuti"
  inputMethod?: "self" | "manual_admin"
  inputBy?: string | null
  checkoutMissed?: boolean
}): Promise<AttendanceRecord> {
  const newRecord = {
    id: randomUUID(),
    user_id: input.userId,
    office_id: input.officeId ?? null,
    type: input.type,
    photo: input.photo,
    photo_url: input.photoUrl ?? null,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy_m: input.accuracyM,
    distance_m: input.distanceM,
    within_radius: input.withinRadius ? 1 : 0,
    status: input.status ?? 'present',
    input_method: input.inputMethod ?? 'self',
    input_by: input.inputBy ?? null,
    checkout_missed: input.checkoutMissed ?? false,
  }
  const { data, error } = await supabase.from('attendance').insert(newRecord).select().single()
  if (error) throw error
  return fromAttendanceRow(data)
}

export async function getTodayAttendance(userId: string): Promise<AttendanceRecord[]> {
  const { start, end } = getJakartaDayRange()
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lt('created_at', end)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(fromAttendanceRow)
}

export async function listAttendanceByMonth(
  year: number,
  month: number,
  userId?: string,
): Promise<AttendanceWithUser[]> {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  let query = supabase
    .from('attendance')
    .select('*, users ( name, email )')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query
  if (error) throw error

  return data.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    userName: r.users.name,
    userEmail: r.users.email,
    type: r.type,
    photo: r.photo,
    photoUrl: r.photo_url,
    officeId: r.office_id,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    accuracyM: r.accuracy_m === null ? null : Number(r.accuracy_m),
    distanceM: Number(r.distance_m),
    withinRadius: r.within_radius === true || r.within_radius === 1,
    status: r.status,
    inputMethod: r.input_method,
    inputBy: r.input_by,
    checkoutMissed: r.checkout_missed,
    createdAt: r.created_at,
  }))
}



