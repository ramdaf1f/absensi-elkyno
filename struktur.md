# struktur.md

Peta struktur project untuk membantu AI agent menemukan file yang relevan tanpa melakukan scanning seluruh repository.

---

# Root

* `app/` → Next.js App Router
* `components/` → reusable UI components
* `lib/` → business logic, database, actions, utilities
* `prisma/` → Prisma schema
* `supabase/` → SQL migrations dan konfigurasi Supabase
* `scripts/` → utility scripts
* `public/` → aset statis
* `prd.md` → Product Requirements Document
* `plan.md` → roadmap dan task breakdown
* `AGENTS.md` → aturan kerja AI agent
* `struktur.md` → peta struktur repository (file ini)

---

# Attendance (fitur inti)

## API / Route

* `app/api/attendance/check-in/route.ts` → endpoint check-in
* `app/api/attendance/check-out/route.ts` → endpoint check-out (planned)

## Halaman

* `app/absen/page.tsx` → halaman absensi karyawan

## Komponen

* `components/attendance-client.tsx` → UI absensi, GPS, kamera, selfie

## Business Logic

* `lib/actions.ts` → server actions attendance
* `lib/db-core.ts` → query database & mapper attendance
* `lib/geo.ts` → utilitas geofence / perhitungan jarak
* `lib/types.ts` → shared types attendance

---

# Admin

## Dashboard

* `app/admin/page.tsx`

## Karyawan

* `app/admin/employees/page.tsx`
* `app/admin/employees/new/page.tsx`
* `app/admin/employees/add-employee-form.tsx`
* `app/admin/employees/employee-view-toggle.tsx`

## Pengaturan

* `app/admin/settings/page.tsx`
* `app/admin/profile/page.tsx`

## Layout

* `app/admin/layout.tsx`
* `components/admin-sidebar.tsx`
* `components/admin-header.tsx`

---

# Database

## Prisma

* `prisma/schema.prisma` → sumber utama schema aplikasi

## Migration aktif

* `supabase/migrations/202607200002_init_postgis.sql`
* `supabase/migrations/202607200003_create_employee_offices_table.sql`
* `supabase/migrations/202607200004_add_attendance_windows_to_users.sql`
* `supabase/migrations/202607200005_init_rls.sql`

## Legacy / draft

* `drafts/202607200001_prd_phase1.sql` → arsip migration composer lama, jangan digunakan

---

# Auth

* `app/login/page.tsx`
* `components/login-form.tsx`

---

# Reports

* `components/report-table.tsx`
* `components/report-filters.tsx`

---

# Theming

* `components/theme-provider.tsx`
* `components/theme-toggle.tsx`

---

# Aturan cepat untuk AI Agent

## Jika task tentang geofence

Buka:

* `lib/geo.ts`
* `lib/actions.ts`
* `components/attendance-client.tsx`
* `prisma/schema.prisma`

## Jika task tentang API attendance

Buka:

* `app/api/attendance/*`
* `lib/db-core.ts`
* `prisma/schema.prisma`

## Jika task tentang CRUD karyawan

Buka:

* `app/admin/employees/*`
* `components/employee-list.tsx`
* `lib/actions.ts`

## Jika task tentang database / migration

Buka:

* `prisma/schema.prisma`
* `supabase/migrations/*`

## Jika task tentang security / RLS

Buka:

* `supabase/migrations/202607200005_init_rls.sql`
* `prisma/schema.prisma`

---

# Catatan penting

* Tabel utama user adalah `users` (bukan `profiles`).
* Tabel absensi adalah `attendance` (singular).
* `User.id` dan `Office.id` bertipe `String` dan dimapping ke kolom `text`.
* Relasi multi-office menggunakan tabel `employee_offices` dengan composite primary key `(employee_id, office_id)`.
* `office_settings` masih legacy/fallback dan belum dihapus.
* Jangan membuat migration baru tanpa mengecek `prisma/schema.prisma` terlebih dahulu.

## Single Source of Truth

### Prisma

* `lib/prisma.ts` → SATU-SATUNYA Prisma client. Jangan buat instance baru.

### Supabase Server

* `lib/supabase.ts` → helper server/client untuk route handler dan server actions.

### Auth

* `lib/auth.ts` → helper mendapatkan user/session server-side.

### Attendance API

* `app/api/attendance/check-in/route.ts`
* `app/api/attendance/check-out/route.ts`

Gunakan file di atas tanpa melakukan pencarian repository tambahan.
