export type Role = "employee" | "admin" | "superadmin"

export type AttendanceType = "check_in" | "check_out"
export type AttendanceStatus = "on_time" | "late" | "present" | "alpha" | "leave" | "sick" | "cuti"
export type AttendanceInputMethod = "self" | "manual_admin"

export interface User {
  id: string
  name: string
  email: string
  passwordHash: string
  role: Role
  createdAt: string
  phone?: string | null // Tambahan
  position?: string | null // Tambahan
  employee_id?: string | null // Tambahan
  department?: string | null
  status?: "active" | "inactive" // Tambahan
  salary?: number | null // Tambahan
  checkInWindowStart?: string | null
  checkInWindowEnd?: string | null
  checkOutWindowStart?: string | null
  checkOutWindowEnd?: string | null
  standardCheckInTime?: string | null
  isGlobalAdmin?: boolean
  isTestAccount?: boolean
  updatedAt?: string // Tambahan
}

export type PublicUser = Omit<User, "passwordHash">

export interface OfficeSettings {
  id: number | string
  name: string
  latitude: number
  longitude: number
  radiusM: number
  updatedAt: string
}

export interface AttendanceRecord {
  id: string
  userId: string
  type: AttendanceType
  photo: string
  photoUrl?: string | null
  officeId?: string | null
  latitude: number
  longitude: number
  accuracyM: number | null
  distanceM: number
  withinRadius: boolean
  status?: AttendanceStatus
  inputMethod?: AttendanceInputMethod
  inputBy?: string | null
  checkoutMissed?: boolean
  createdAt: string
}

export interface AttendanceWithUser extends AttendanceRecord {
  userName: string
  userEmail: string
}

export interface Holiday {
  id: string
  date: string
  description: string
}
