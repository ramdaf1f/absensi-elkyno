# Rencana Pengembangan Sistem Absensi Karyawan Otomatis Berbasis Lokasi (Geofencing)

**Versi:** 1.0
**Tanggal:** 19 Juli 2026
**Status:** Draft

Dokumen ini merinci rencana pengembangan sistem absensi karyawan berdasarkan fase-fase yang telah diusulkan dalam PRD, beserta daftar tugas (tasks) yang perlu diselesaikan di setiap fasenya.

---

## Fase 1A — Database Foundation

**Fokus:** Setup dasar database untuk mendukung fitur geofencing dan multi-office, termasuk skema tabel dan RLS awal.

**Tugas-tugas:**

*   **TASK-01: Setup PostGIS Extension**
    *   **Tujuan:** Menginstal dan mengkonfigurasi ekstensi PostGIS di Supabase Postgres untuk mengaktifkan fungsi geospasial.
    *   **File yang boleh diubah:** `supabase/migrations/YYYYMMDDHHMMSS_init_postgis.sql` (file baru), `supabase/config.toml` (jika diperlukan untuk konfigurasi ekstensi).
    *   **File yang tidak boleh diubah:** Semua file kode aplikasi (misalnya, `app/`, `lib/`).
    *   **Acceptance Criteria:** Ekstensi PostGIS berhasil diaktifkan di database Supabase.
    *   **Perintah Test:** `supabase db diff --schema public | grep "CREATE EXTENSION postgis"` (seharusnya tidak menunjukkan diff jika sudah diterapkan), atau periksa melalui UI Supabase.

*   **TASK-02: Create employee_offices Table**
    *   **Tujuan:** Mengimplementasikan tabel penghubung `employee_offices` untuk relasi many-to-many antara karyawan dan kantor.
    *   **File yang boleh diubah:** `supabase/migrations/YYYYMMDDHHMMSS_create_employee_offices_table.sql` (file baru).
    *   **File yang tidak boleh diubah:** Semua file kode aplikasi.
    *   **Acceptance Criteria:** Tabel `employee_offices` ada dengan foreign key `employee_id` dan `office_id`.
    *   **Perintah Test:** `supabase db diff --schema public | grep "CREATE TABLE public.employee_offices"`

*   **TASK-03: Add Personal Attendance Window Fields to profiles Table**
    *   **Tujuan:** Menambahkan kolom `checkin_window_start`, `checkin_window_end`, `checkout_window_start`, `checkout_window_end`, `work_start_time` ke tabel `profiles`.
    *   **File yang boleh diubah:** `supabase/migrations/YYYYMMDDHHMMSS_add_attendance_window_to_profiles.sql` (file baru).
    *   **File yang tidak boleh diubah:** Semua file kode aplikasi.
    *   **Acceptance Criteria:** Skema tabel `profiles` menyertakan kolom-kolom terkait waktu yang baru.
    *   **Perintah Test:** `supabase db diff --schema public | grep "ALTER TABLE public.profiles ADD COLUMN checkin_window_start"`

*   **TASK-04: Initial RLS for profiles and employee_offices**
    *   **Tujuan:** Mengimplementasikan kebijakan RLS dasar untuk tabel `profiles` dan `employee_offices` untuk menegakkan akses multi-role dan multi-office.
    *   **File yang boleh diubah:** `supabase/migrations/YYYYMMDDHHMMSS_initial_rls_profiles_employee_offices.sql` (file baru).
    *   **File yang tidak boleh diubah:** Semua file kode aplikasi.
    *   **Acceptance Criteria:** Kebijakan RLS diaktifkan untuk `profiles` dan `employee_offices`, memungkinkan karyawan melihat data mereka sendiri dan admin melihat data untuk kantor yang ditugaskan.
    *   **Perintah Test:** `supabase db diff --schema public | grep "CREATE POLICY"`

## Fase 1B — Secure Check-in API

**Fokus:** Mengembangkan API backend yang aman untuk absensi, termasuk semua validasi sisi server (geofence, akurasi GPS, window waktu, pencegahan absen ganda).

**Tugas-tugas:**

*   **TASK-05: Create Check-in API Endpoint (Next.js API Route/Edge Function)**
    *   **Tujuan:** Mengembangkan endpoint `POST /api/attendance/check-in` untuk menangani permintaan check-in awal.
    *   **File yang boleh diubah:** `app/api/attendance/check-in/route.ts` (file baru), `lib/supabase/server.ts` (untuk setup Supabase client), `lib/utils/haversine.ts` (file baru untuk Haversine jika tidak menggunakan PostGIS secara langsung di API).
    *   **File yang tidak boleh diubah:** Semua file UI frontend.
    *   **Acceptance Criteria:** Endpoint ada dan dapat menerima data `latitude`, `longitude`, `accuracy`, `photo`. Mengembalikan respons sukses/gagal dasar.
    *   **Perintah Test:** `curl -X POST -H "Content-Type: application/json" -d '{"latitude": -6.2, "longitude": 106.8, "accuracy": 10, "photo": "base64_string"}' http://localhost:3000/api/attendance/check-in`

*   **TASK-06: Implement Server-side Geofence Validation**
    *   **Tujuan:** Menambahkan logika ke `POST /api/attendance/check-in` untuk memvalidasi lokasi karyawan terhadap kantor yang terkait menggunakan PostGIS atau formula Haversine.
    *   **File yang boleh diubah:** `app/api/attendance/check-in/route.ts`, `lib/db/offices.ts` (file baru untuk akses data kantor), `lib/utils/geofence.ts` (file baru untuk logika geofence).
    *   **File yang tidak boleh diubah:** Semua file UI frontend.
    *   **Acceptance Criteria:** API mengembalikan 403 dengan error `OUT_OF_RANGE` jika lokasi berada di luar radius semua kantor yang terkait.
    *   **Perintah Test:** Jalankan unit test untuk logika geofence, dan test integrasi dengan `curl` mensimulasikan koordinat di luar jangkauan.

*   **TASK-07: Implement Server-side GPS Accuracy and Time Window Validation**
    *   **Tujuan:** Meningkatkan `POST /api/attendance/check-in` untuk memvalidasi `accuracy` GPS dan waktu saat ini terhadap window absen pribadi karyawan.
    *   **File yang boleh diubah:** `app/api/attendance/check-in/route.ts`, `lib/db/profiles.ts` (file baru untuk akses data profil).
    *   **File yang tidak boleh diubah:** Semua file UI frontend.
    *   **Acceptance Criteria:** API mengembalikan 403 dengan error `LOW_GPS_ACCURACY` atau `OUTSIDE_TIME_WINDOW` jika kondisi tidak terpenuhi.
    *   **Perintah Test:** Jalankan unit test untuk logika akurasi/window waktu, dan test integrasi dengan `curl` mensimulasikan akurasi/waktu yang tidak valid.

*   **TASK-08: Implement Check-out API Endpoint and Duplicate Attendance Prevention**
    *   **Tujuan:** Mengembangkan `POST /api/attendance/check-out` dan menambahkan logika ke kedua endpoint check-in/check-out untuk mencegah entri ganda pada hari yang sama.
    *   **File yang boleh diubah:** `app/api/attendance/check-out/route.ts` (file baru), `app/api/attendance/check-in/route.ts`, `lib/db/attendances.ts` (file baru untuk akses data absensi).
    *   **File yang tidak boleh diubah:** Semua file UI frontend.
    *   **Acceptance Criteria:**
        1.  API `check-in` mengembalikan error jika sudah check-in untuk hari itu.
        2.  API `check-out` mengembalikan error jika tidak ada record check-in untuk hari itu atau jika sudah check-out.
    *   **Perintah Test:** Jalankan test integrasi untuk kedua endpoint, mensimulasikan beberapa panggilan.

*   **TASK-09: Implement checkout_missed Logic and Final RLS for attendances**
    *   **Tujuan:** Menambahkan logika untuk menandai `checkout_missed = true` jika karyawan gagal check-out. Menyempurnakan RLS untuk tabel `attendances`.
    *   **File yang boleh diubah:** `app/api/attendance/check-out/route.ts`, `supabase/migrations/YYYYMMDDHHMMSS_rls_attendances.sql` (file baru).
    *   **File yang tidak boleh diubah:** Semua file UI frontend.
    *   **Acceptance Criteria:**
        1.  Record absensi diperbarui dengan `checkout_missed = true` jika window check-out terlewati tanpa tindakan.
        2.  RLS untuk `attendances` memungkinkan karyawan untuk `insert` record mereka sendiri (setelah validasi server) dan `select` record mereka sendiri.
    *   **Perintah Test:** Test manual dengan mensimulasikan check-in dan kemudian tidak check-out (membutuhkan scheduled job atau pemicu manual untuk menguji `checkout_missed` sepenuhnya, tetapi RLS dapat diuji dengan `set role`).

## Fase 1C — Mobile Attendance UI

**Fokus:** Mengembangkan antarmuka pengguna (UI) untuk halaman absensi karyawan, termasuk pengambilan lokasi, akses kamera, dan integrasi dengan API backend.

**Tugas-tugas:**

*   **TASK-10: Develop Basic Attendance Page UI**
    *   **Tujuan:** Membuat UI dasar untuk halaman absensi karyawan dengan tombol check-in/check-out dan tampilan status.
    *   **File yang boleh diubah:** `app/karyawan/absen/page.tsx` (file baru), `components/attendance-button.tsx` (file baru), `components/ui/button.tsx` (jika diperlukan tombol kustom).
    *   **File yang tidak boleh diubah:** Semua file API backend.
    *   **Acceptance Criteria:** Halaman dimuat dengan tombol check-in/check-out yang dinonaktifkan dan pesan status placeholder.
    *   **Perintah Test:** Navigasi ke `/karyawan/absen` di browser.

*   **TASK-11: Implement GPS Location Acquisition and Client-side Logic**
    *   **Tujuan:** Mengintegrasikan `navigator.geolocation` untuk mendapatkan lokasi pengguna dan mengimplementasikan logika sisi klien untuk mengaktifkan/menonaktifkan tombol absensi berdasarkan lokasi/waktu simulasi.
    *   **File yang boleh diubah:** `app/karyawan/absen/page.tsx`, `hooks/use-geolocation.ts` (file baru), `components/attendance-button.tsx`.
    *   **File yang tidak boleh diubah:** Semua file API backend.
    *   **Acceptance Criteria:**
        1.  Browser meminta izin lokasi.
        2.  Tombol berubah status (aktif/nonaktif) berdasarkan lokasi/waktu yang disimulasikan (misalnya, nilai hardcode untuk pengujian).
        3.  Menampilkan jarak saat ini ke kantor dan status window waktu.
    *   **Perintah Test:** Buka `/karyawan/absen`, berikan izin lokasi, amati perubahan status tombol. Gunakan alat pengembang browser untuk menimpa geolokasi.

*   **TASK-12: Integrate Camera Access for Selfie**
    *   **Tujuan:** Mengimplementasikan akses kamera (`getUserMedia`) untuk mengambil selfie, dengan logika gating untuk hanya mengizinkan akses kamera ketika kondisi absensi terpenuhi.
    *   **File yang boleh diubah:** `app/karyawan/absen/page.tsx`, `components/camera-capture.tsx` (file baru), `components/attendance-button.tsx`.
    *   **File yang tidak boleh diubah:** Semua file API backend.
    *   **Acceptance Criteria:**
        1.  Aliran kamera muncul ketika kondisi terpenuhi dan pengguna mengklik "Ambil Selfie" (atau yang serupa).
        2.  Akses kamera diblokir/tombol dinonaktifkan jika kondisi tidak terpenuhi.
    *   **Perintah Test:** Buka `/karyawan/absen`, simulasikan kondisi yang valid, klik tombol, verifikasi akses kamera.

*   **TASK-13: Connect UI to Check-in/Check-out API**
    *   **Tujuan:** Mengintegrasikan UI halaman absensi dengan endpoint `POST /api/attendance/check-in` dan `POST /api/attendance/check-out`.
    *   **File yang boleh diubah:** `app/karyawan/absen/page.tsx`, `components/attendance-button.tsx`, `lib/api/attendance.ts` (file baru untuk panggilan API sisi klien).
    *   **File yang tidak boleh diubah:** Semua file API backend.
    *   **Acceptance Criteria:**
        1.  Check-in/check-out yang berhasil mengirimkan data lokasi, akurasi, dan foto ke server.
        2.  UI diperbarui untuk menampilkan "Sudah Absen Datang" atau "Sudah Absen Pulang" setelah pengiriman yang berhasil.
        3.  Pesan error dari API ditampilkan kepada pengguna.
    *   **Perintah Test:** Lakukan alur check-in/check-out lengkap di browser, verifikasi data yang dikirim ke server dan pembaruan UI.

---

## Fase 2: Kelengkapan CRUD & Kalender

**Fokus:** Kelengkapan CRUD karyawan (termasuk assignment multi-office & window absen personal) & kantor, manajemen tanggal merah, kalender visual.

**Tugas-tugas:**

*   **CRUD Karyawan:**
    *   Penyempurnaan `AddEmployeeForm` untuk menyertakan pengaturan window absen personal (`checkin_window_start`, dll.) dan assignment multi-office.
    *   Pengembangan fitur Edit dan Soft Delete (nonaktifkan) karyawan.
    *   Implementasi fitur Filter & Search karyawan (berdasarkan kantor, departemen, status).
    *   Pembuatan halaman detail karyawan yang menampilkan riwayat absensi personal.
*   **CRUD Kantor / Cabang:**
    *   Pengembangan fitur Create dan Delete kantor.
    *   Pengembangan UI untuk menugaskan Admin HR ke kantor tertentu.
*   **Manajemen Tanggal Merah (Hari Libur):**
    *   Pengembangan fitur CRUD untuk tanggal merah (tanggal, nama libur, tipe).
    *   Implementasi logika untuk Superadmin menambahkan hari libur nasional dan Admin HR menambahkan hari libur spesifik kantor.
    *   (Opsional) Riset dan integrasi API hari libur nasional Indonesia untuk auto-fill.
*   **Kalender Visual:**
    *   Pengembangan komponen kalender interaktif.
    *   Integrasi data tanggal merah ke kalender.
    *   Integrasi data absensi karyawan ke kalender untuk menampilkan status kehadiran harian (hadir, telat, alpha, izin, sakit, cuti) dengan kode warna.
    *   Implementasi navigasi bulan/tahun dan filter (untuk Admin/Superadmin).

---

## Fase 3: Export Data & Dashboard

**Fokus:** Export CSV dengan filter lengkap, dashboard & laporan per role.

**Tugas-tugas:**

*   **Export Data Absensi (CSV):**
    *   Penyempurnaan `ExportButton` untuk menyertakan filter (rentang tanggal, kantor, departemen, karyawan tertentu).
    *   Pengembangan logika server-side untuk menghasilkan file CSV dengan kolom-kolom yang lengkap (Nama Karyawan, Tanggal, Jam Datang, Jam Pulang, Status, Lokasi, Kantor, Link Foto Absen, Metode Input).
    *   Penerapan RLS untuk fitur export (Superadmin bisa lintas kantor, Admin HR hanya kantornya).
*   **Dashboard & Laporan:**
    *   Penyempurnaan Dashboard Admin HR (`app/admin/page.tsx`) dengan laporan bulanan, statistik ringkasan, daftar karyawan belum absen hari ini, dan absen bolong.
    *   Pengembangan Dashboard Karyawan (status absen hari ini, riwayat absensi bulan berjalan, ringkasan telat/alpha).
    *   Pengembangan Dashboard Superadmin (ringkasan global semua kantor).
    *   Implementasi grafik tren kehadiran (mingguan/bulanan).

---

## Fase 4: Fitur Pendukung Lanjutan

**Fokus:** Pengajuan izin/sakit (dengan aturan H+3 bukti sakit)/koreksi absen, absen manual oleh Admin (fallback offline), notifikasi (termasuk reminder lupa absen pulang & flag `checkout_missed`), audit log, scheduled job backup CSV bulanan + retensi hapus foto 2 bulan.

**Tugas-tugas:**

*   **Manajemen Izin/Cuti/Sakit & Koreksi Absen:**
    *   Pengembangan UI form pengajuan izin/cuti/sakit/koreksi absen untuk karyawan (pilih tanggal, keterangan, upload bukti).
    *   Implementasi tabel `leave_requests` di database.
    *   Pengembangan UI Admin HR untuk meninjau, menyetujui/menolak pengajuan.
    *   Implementasi logika `pending_proof` untuk pengajuan sakit (deadline H+3 upload bukti).
    *   Implementasi logika untuk memperbarui status absensi berdasarkan pengajuan yang disetujui.
*   **Absen Manual oleh Admin:**
    *   Pengembangan UI Admin HR untuk input manual kehadiran karyawan.
    *   Pencatatan `input_method = "manual_admin"` dan `input_by` di tabel `attendances`.
*   **Notifikasi:**
    *   Implementasi sistem notifikasi (misal via email/push notification jika ada).
    *   Notifikasi pengingat absen pulang untuk karyawan.
    *   Notifikasi `checkout_missed` ke karyawan dan Admin HR.
    *   Notifikasi status alpha ke Admin HR.
    *   Notifikasi pengingat upload bukti sakit (H-1 deadline).
    *   Notifikasi ke Admin HR untuk pengajuan izin/sakit/koreksi baru.
*   **Audit Log:**
    *   Implementasi tabel `audit_logs` di database.
    *   Pencatatan setiap perubahan data penting (CRUD, persetujuan izin) ke `audit_logs`.
*   **Scheduled Jobs:**
    *   Pengembangan Supabase Cron / Edge Function untuk backup otomatis CSV bulanan beserta referensi foto absen.
    *   Pengembangan Supabase Cron / Edge Function untuk penghapusan otomatis foto absen dari Supabase Storage setelah 2 bulan.

---

## Fase 5 (Nice-to-have): Fitur Tambahan

**Fokus:** Bulk import karyawan, export Excel, integrasi API hari libur nasional.

**Tugas-tugas:**

*   Pengembangan fitur Bulk Import karyawan via CSV/Excel.
*   Pengembangan fitur Export data absensi ke format Excel (.xlsx).
*   Integrasi lebih lanjut dengan API hari libur nasional Indonesia untuk auto-fill data tanggal merah.

---

## Fase 6 (UI/UX Polish): Penyempurnaan Desain & Pengalaman Pengguna

**Fokus:** Penerapan design system (warna, tipografi, komponen), penyempurnaan responsif mobile, micro-interaction & animasi state tombol absen, aksesibilitas.

**Tugas-tugas:**

*   **Penerapan Design System:**
    *   Review dan penerapan konsisten palet warna, tipografi, dan spacing di seluruh aplikasi.
    *   Penyempurnaan penggunaan komponen `shadcn/ui` agar sesuai dengan prinsip desain yang ditetapkan.
*   **Responsivitas Mobile:**
    *   Audit dan optimasi responsivitas di semua halaman, terutama untuk tampilan mobile.
    *   Implementasi pola desain mobile-first (misal tabel menjadi card list di mobile).
    *   Pengujian di berbagai ukuran perangkat mobile (HP, tablet).
*   **Micro-interaction & Animasi:**
    *   Implementasi micro-interaction dan animasi halus untuk transisi state tombol absen (disabled -> enabled -> loading -> completed).
    *   Penambahan animasi ringan untuk feedback visual lainnya (misal saat data berhasil disimpan).
*   **Aksesibilitas (Accessibility):**
    *   Peningkatan aksesibilitas (misal: `aria-label` untuk elemen interaktif, kontras warna yang memadai, navigasi keyboard).
    *   Memastikan informasi status tidak hanya bergantung pada warna.
*   **(Opsional) PWA:**
    *   Konfigurasi aplikasi sebagai Progressive Web App (PWA) agar dapat diinstal di perangkat pengguna.

---

## Proyek Terpisah (Roadmap Lanjutan)

*   **Integrasi Payroll:** Setelah sistem absensi stabil, integrasi dengan sistem payroll dapat direncanakan sebagai proyek terpisah.