export type Role = "employee" | "admin"

export type AttendanceType = "check_in" | "check_out"

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
  status?: "active" | "inactive" // Tambahan
  salary?: number | null // Tambahan
  updatedAt?: string // Tambahan
}

export type PublicUser = Omit<User, "passwordHash">

export interface OfficeSettings {
  id: number
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
  latitude: number
  longitude: number
  accuracyM: number | null
  distanceM: number
  withinRadius: boolean
  createdAt: string
}

export interface AttendanceWithUser extends AttendanceRecord {
  userName: string
  userEmail: string
}
