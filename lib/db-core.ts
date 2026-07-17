import 'dotenv/config'
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import type { AttendanceRecord, AttendanceType, AttendanceWithUser, OfficeSettings, User, Holiday } from "./types"
import { supabase } from './supabase'

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
    phone: user.phone,
    employee_id: user.employee_id,
    salary: user.salary,
    status: user.status,
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
  phone?: string | null
  employee_id?: string | null
  salary?: number | null
  status?: "active" | "inactive"
}): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, 10)
  const newUser = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    password_hash: passwordHash,
    role: input.role,
    position: input.position ?? null,
    phone: input.phone ?? null,
    employee_id: input.employee_id ?? null,
    salary: input.salary ?? null,
    status: input.status ?? 'active',
  }

  const { data, error } = await supabase.from('users').insert(newUser).select().single()
  if (error) throw error
  return fromSupabaseUser(data) as User
}

export async function updateEmployee(
  id: string,
  input: {
    name?: string
    position?: string
    phone?: string
    status?: "active" | "inactive"
    employee_id?: string
    salary?: number
  }
): Promise<User | null> {
  const { data, error } = await supabase.from('users').update(input).eq('id', id).select().single()
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

export async function updateOfficeSettings(input: {
  name: string
  latitude: number
  longitude: number
  radiusM: number
}): Promise<OfficeSettings> {
  const { data, error } = await supabase
    .from('office_settings')
    .upsert({
      id: 1,
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude,
      radius_m: input.radiusM,
    })
    .select()
    .single()
  if (error) throw error
  return (await getOfficeSettings()) // Re-fetch to get the correct shape
}

// ------------------------------------------------------------------
// Attendance
// ------------------------------------------------------------------

export async function createAttendance(input: {
  userId: string
  type: AttendanceType
  photo: string
  latitude: number
  longitude: number
  accuracyM: number | null
  distanceM: number
  withinRadius: boolean
}): Promise<AttendanceRecord> {
  const newRecord = {
    id: randomUUID(),
    user_id: input.userId,
    type: input.type,
    photo: input.photo,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy_m: input.accuracyM,
    distance_m: input.distanceM,
    within_radius: input.withinRadius,
  }
  const { data, error } = await supabase.from('attendance').insert(newRecord).select().single()
  if (error) throw error
  return {
    id: data.id,
    userId: data.user_id,
    type: data.type,
    photo: data.photo,
    latitude: data.latitude,
    longitude: data.longitude,
    accuracyM: data.accuracy_m,
    distanceM: data.distance_m,
    withinRadius: data.within_radius,
    createdAt: data.created_at,
  }
}

export async function getTodayAttendance(userId: string): Promise<AttendanceRecord[]> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
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
    latitude: r.latitude,
    longitude: r.longitude,
    distanceM: r.distance_m,
    withinRadius: r.within_radius,
    createdAt: r.created_at,
  }))
}