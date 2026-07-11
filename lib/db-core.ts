import 'dotenv/config'
import 'dotenv/config'
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import type { AttendanceRecord, AttendanceType, AttendanceWithUser, OfficeSettings, User } from "./types"

// 1. Cukup import instance prisma yang sudah kita buat di lib/prisma.ts
import { prisma } from './prisma'; 

console.log("USE_PRISMA:", !!process.env.DATABASE_URL);
const USE_PRISMA = !!process.env.DATABASE_URL;

// 2. PASTIKAN variabel prisma global tidak ditimpa atau di-declare ulang secara kosong di bawah baris ini!
// Jika di bawah baris ini ada kode seperti: "let prisma;" atau "const prisma = ...", HAPUS BARIS TERSEBUT.
// ------------------------------------------------------------------
// In-memory store (fallback / preview)
// ------------------------------------------------------------------

interface MemoryStore {
  users: User[]
  office: OfficeSettings
  attendance: AttendanceRecord[]
  seeded: boolean
}

const g = globalThis as unknown as { __absensiStore?: MemoryStore }

function getStore(): MemoryStore {
  if (!g.__absensiStore) {
    const now = new Date().toISOString()
    g.__absensiStore = {
      seeded: true,
      office: {
        id: 1,
        name: "Kantor Pusat",
        latitude: -6.20876,
        longitude: 106.8456,
        radiusM: 5,
        updatedAt: now,
      },
      users: [
        {
          id: randomUUID(),
          name: "Admin HR",
          email: "admin@absensi.com",
          passwordHash: bcrypt.hashSync("admin123", 10),
          role: "admin",
          salary: null, // Default for admin
          createdAt: now,
        },
        {
          id: randomUUID(),
          name: "Budi Karyawan",
          email: "budi@absensi.com",
          passwordHash: bcrypt.hashSync("budi123", 10),
          role: "employee",
          salary: 5000000, // Example salary
          createdAt: now,
        },
      ],
      attendance: [],
    }
  }
  return g.__absensiStore
}

// ------------------------------------------------------------------
// Prisma Client
// ------------------------------------------------------------------

// const prisma = new PrismaClient();

// ------------------------------------------------------------------
// Row mappers (MySQL -> app types)
// ------------------------------------------------------------------

/**
 * Helper to convert Prisma's User model to the app's User type.
 * This handles snake_case to camelCase conversion and type casting.
 */
function fromPrismaUser(user: any): User | null {
  if (!user) {
    return null;
  }
  const { password_hash, created_at, updated_at, ...rest } = user;
  return {
    ...rest,
    passwordHash: password_hash,
    salary: user.salary ? Number(user.salary) : null,
    createdAt: created_at.toISOString(),
    updatedAt: updated_at.toISOString(),
  } as User;
}

function fromPrismaOfficeSettings(settings: any): OfficeSettings | null {
  if (!settings) {
    return null;
  }
  const { radius_m, updated_at, ...rest } = settings;
  return {
    ...rest,
    latitude: Number(settings.latitude),
    longitude: Number(settings.longitude),
    radiusM: radius_m,
    updatedAt: updated_at.toISOString(),
  };
}

function fromPrismaAttendance(record: any): AttendanceRecord | null {
  if (!record) {
    return null;
  }
  const { user_id, accuracy_m, distance_m, within_radius, created_at, ...rest } = record;
  return {
    ...rest,
    userId: user_id,
    accuracyM: accuracy_m ? Number(accuracy_m) : null,
    distanceM: Number(distance_m),
    withinRadius: Boolean(within_radius),
    createdAt: created_at.toISOString(),
  };
}

function fromPrismaAttendanceWithUser(record: any): AttendanceWithUser | null {
  if (!record) {
    return null;
  }
  const attendancePart = fromPrismaAttendance(record);
  if (!attendancePart) return null;

  return { ...attendancePart, userName: record.user?.name ?? "", userEmail: record.user?.email ?? "" };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// These mappers are no longer needed as Prisma Client returns typed objects directly.
// Anda mungkin perlu menyesuaikan `types.ts` Anda agar selaras dengan tipe yang dihasilkan Prisma,
// atau membuat mapper eksplisit jika tipe-tipe tersebut sangat berbeda.
// Untuk kesederhanaan, kami mengasumsikan kompatibilitas langsung atau penyesuaian kecil untuk saat ini.

// function mapUser(r: any): User { /* ... */ }
// function mapOffice(r: any): OfficeSettings { /* ... */ }
// function mapAttendance(r: any): AttendanceWithUser { /* ... */ }
/* eslint-enable @typescript-eslint/no-explicit-any */

// ------------------------------------------------------------------
// Users
// ------------------------------------------------------------------

export async function getUserByEmail(email: string): Promise<User | null> {
  if (USE_PRISMA) {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return fromPrismaUser(user);
  }
  return getStore().users.find((u) => u.email === email) ?? null
}

export async function getUserById(id: string): Promise<User | null> {
  if (USE_PRISMA) {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return fromPrismaUser(user);
  }
  return getStore().users.find((u) => u.id === id) ?? null
}

export async function createUser(input: {
  name: string
  email: string
  password: string
  role: "employee" | "admin",
  position?: string | null,
  phone?: string | null,
  employee_id?: string | null,
  salary?: number | null,
  status?: "active" | "inactive",
}): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, 10)
  const now = new Date().toISOString()
  const user: User = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
    createdAt: now,
    updatedAt: now,
    position: input.position ?? null,
    phone: input.phone ?? null,
    employee_id: input.employee_id ?? null,
    salary: input.salary ?? null,
    status: input.status ?? 'active',
  }
  if (USE_PRISMA) {
    const createdUser = await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        password_hash: user.passwordHash, 
        role: user.role,
        position: user.position,
        phone: user.phone,
        employee_id: user.employee_id,
        salary: user.salary,
        status: user.status,
        // Note: created_at dan updated_at diisi otomatis oleh Prisma, 
        // jadi aman untuk dihapus dari input data ini.
      },
    });
    
    // Kembalikan datanya dan sesuaikan tipenya jika diperlukan
    return fromPrismaUser(createdUser) as User;
  }
  
  getStore().users.push(user)
  return user
}

export async function updateEmployee(
  id: string,
  input: {
    name?: string
    position?: string | null
    phone?: string | null
    status?: "active" | "inactive"
    employee_id?: string | null
    salary?: number | null
  }
): Promise<User | null> {
  if (USE_PRISMA) {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...input,
      },
    });
    return fromPrismaUser(updatedUser);
  }
  const store = getStore()
  const user = store.users.find((u) => u.id === id)
  if (user) Object.assign(user, input)
  return user ?? null
}

export async function listEmployees(): Promise<User[]> {
  if (USE_PRISMA) {
    const employees = await prisma.user.findMany({
      where: { role: "employee" },
      orderBy: { name: "asc" },
    });
    return employees.map((u) => fromPrismaUser(u)!);
  }
  return getStore()
    .users.filter((u) => u.role === "employee")
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getHolidays(): Promise<{ date: string }[]> {
  if (USE_PRISMA) {
    // Perhatian: Model 'Holiday' tidak ada di schema.prisma yang diberikan.
    // Kode ini akan gagal jika dijalankan kecuali model Holiday ditambahkan ke skema.
    if (!prisma.holiday) {
      console.warn("Model 'Holiday' tidak ditemukan di Prisma Client. Mengembalikan array kosong.");
      return [];
    }
    const holidays = await prisma.holiday.findMany({
      select: { date: true },
    });
    // Asumsi Prisma mengembalikan objek Date, konversi ke string ISO untuk konsistensi
    return holidays.map(h => ({ date: h.date.toISOString().split('T')[0] }));
  }
  return []
}

// ------------------------------------------------------------------
// Office settings
// ------------------------------------------------------------------

export async function getOfficeSettings(): Promise<OfficeSettings> {
  if (USE_PRISMA) {
    const office = await prisma.officeSetting.findUnique({
      where: { id: 1 },
    });
    if (!office) throw new Error("Office settings not found"); // Atau tangani pembuatan awal
    return fromPrismaOfficeSettings(office) as OfficeSettings;
  }
  return getStore().office
}

export async function updateOfficeSettings(input: {
  name: string
  latitude: number
  longitude: number
  radiusM: number
}): Promise<OfficeSettings> {
  if (USE_PRISMA) {
    const updatedOffice = await prisma.officeSetting.upsert({
      where: { id: 1 },
      update: {
        name: input.name,
        latitude: input.latitude,
        longitude: input.longitude,
        radius_m: input.radiusM,
      },
      create: { // Pembuatan awal jika id 1 tidak ada
        id: 1, name: input.name, latitude: input.latitude, longitude: input.longitude, radius_m: input.radiusM,
      },
    });
    return fromPrismaOfficeSettings(updatedOffice) as OfficeSettings;
  }
  const store = getStore()
  store.office = { ...store.office, ...input, updatedAt: new Date().toISOString() }
  return store.office
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
  const record: AttendanceRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  }
  if (USE_PRISMA) {
    await prisma.attendance.create({
      data: {
        id: record.id,
        user_id: record.userId,
        type: record.type,
        photo: record.photo,
        latitude: record.latitude,
        longitude: record.longitude,
        accuracy_m: record.accuracyM,
        distance_m: record.distanceM,
        within_radius: record.withinRadius ? 1 : 0,
        created_at: record.createdAt,
      },
    });
    return record
  }
  getStore().attendance.push(record)
  return record
}

export async function getTodayAttendance(userId: string): Promise<AttendanceRecord[]> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  if (USE_PRISMA) {
    const records = await prisma.attendance.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: start.toISOString(),
        },
      },
      orderBy: { created_at: "asc" },
    });
    return records.map(r => fromPrismaAttendance(r)!);
  }
  return getStore()
    .attendance.filter((a) => a.userId === userId && new Date(a.createdAt) >= start)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/**
 * List attendance for a given month (1-12) and year, optionally for one user.
 */
export async function listAttendanceByMonth(
  year: number,
  month: number,
  userId?: string,
): Promise<AttendanceWithUser[]> {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  if (USE_PRISMA) {
    const records = await prisma.attendance.findMany({
      where: {
        created_at: {
          gte: start.toISOString(),
          lt: end.toISOString(),
        },
        user_id: userId ? userId : undefined,
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { created_at: "desc" },
    });
    return records.map((r) => fromPrismaAttendanceWithUser(r)!);
  }
  const store = getStore()
  return store.attendance
    .filter((a) => {
      const d = new Date(a.createdAt)
      return d >= start && d < end && (!userId || a.userId === userId)
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((a) => {
      const u = store.users.find((x) => x.id === a.userId)
      return { ...a, userName: u?.name ?? "", userEmail: u?.email ?? "" }
    })
}