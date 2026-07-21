# PRD — Sistem Absensi Karyawan Otomatis Berbasis Lokasi (Geofencing)

**Versi:** 1.0
**Tanggal:** 19 Juli 2026
**Status:** Draft — untuk penyempurnaan sistem yang sudah berjalan
**Tech Stack:** Next.js (App Router, Fullstack) + Supabase (Auth, Postgres, Storage, RLS)

---

## 1. Latar Belakang

Sistem absensi karyawan berbasis web saat ini sudah berjalan, namun masih memiliki kekurangan pada beberapa area (validasi lokasi, manajemen role, kelengkapan CRUD, pelaporan, dan konsistensi UX). Dokumen ini menjadi acuan pengembangan lanjutan agar sistem menjadi lengkap, stabil, dan siap dipakai multi-kantor.

Konsep inti: tombol **Absen Datang** dan **Absen Pulang** hanya aktif (clickable) secara otomatis ketika perangkat karyawan terdeteksi berada di dalam radius geofence kantor pada rentang jam absen yang berlaku. Di luar kondisi tersebut, tombol nonaktif.

---

## 2. Tujuan

1. Memastikan absensi hanya bisa dilakukan saat karyawan benar-benar berada di area kantor (geofencing).
2. Menghadirkan sistem role-based access yang jelas: Superadmin, Admin (HR), Karyawan.
3. Melengkapi CRUD data karyawan, kantor, dan hari libur (tanggal merah).
4. Menyediakan kalender visual yang menampilkan tanggal merah.
5. Menyediakan export data absensi ke CSV untuk kebutuhan payroll/reporting.
6. Meningkatkan reliabilitas: minim absen ganda, anti-kecurangan lokasi (mock GPS), dan audit trail.

---

## 3. Role & Hak Akses

| Fitur | Superadmin (Developer) | Admin (HR per kantor) | Karyawan |
|---|---|---|---|
| Kelola akun Superadmin lain | ✅ | ❌ | ❌ |
| Kelola data Kantor (multi-tenant) | ✅ CRUD semua kantor | ✅ hanya kantornya (view) | ❌ |
| Kelola Admin HR | ✅ CRUD | ❌ | ❌ |
| Kelola Karyawan | ✅ semua kantor | ✅ hanya kantornya | ❌ (self-view only) |
| Set titik koordinat & radius kantor | ✅ | ✅ (opsional, jika diizinkan) | ❌ |
| Input/edit tanggal merah | ✅ (global/nasional) | ✅ (khusus kantornya) | ❌ (view only) |
| Lihat kalender tanggal merah | ✅ | ✅ | ✅ |
| Absen datang/pulang | ❌ (kecuali didaftarkan sbg karyawan) | ✅ jika terdaftar | ✅ |
| Lihat laporan absensi | ✅ semua kantor | ✅ hanya kantornya | ✅ hanya dirinya |
| Export CSV absensi | ✅ semua kantor / filter | ✅ hanya kantornya | ❌ (atau hanya rekap pribadi) |
| Approve izin/cuti/koreksi absen | ✅ | ✅ | ❌ (hanya request) |
| Lihat log aktivitas sistem | ✅ | ❌ | ❌ |

> **Catatan multi-tenant:** Sistem harus mendukung banyak kantor (cabang), tiap Admin HR terikat ke satu atau beberapa `office_id`, dan Row Level Security (RLS) Supabase wajib menegakkan isolasi data antar kantor.

---

## 4. Ruang Lingkup Fitur (Scope)

### 4.1 Autentikasi & Manajemen Role
- Login via Supabase Auth (email/password, opsional Google SSO).
- Role disimpan di tabel `profiles`, dicek lewat RLS + middleware Next.js.
- Superadmin dapat membuat akun Admin HR & menetapkan kantor yang dikelola.
- Admin HR dapat membuat akun Karyawan di kantornya.
- Reset password & invite via email (Supabase Auth invite link).
- Session handling aman (JWT + refresh token via Supabase).

### 4.2 Geofencing Absensi (Fitur Utama)
- Setiap kantor memiliki koordinat pusat (`latitude`, `longitude`) dan radius (meter), diinput oleh Superadmin/Admin HR.
- Saat karyawan membuka halaman absen, browser meminta izin lokasi (`navigator.geolocation`).
- Sistem menghitung jarak (Haversine formula) antara posisi karyawan dan titik kantor secara real-time (polling tiap beberapa detik atau `watchPosition`).
- **Tombol Absen Datang** otomatis *enabled* jika:
  - Jarak ≤ radius kantor, **dan**
  - Waktu saat ini berada dalam jam window absen datang (misal 06:00–10:00, dikonfigurasi per kantor).
- **Tombol Absen Pulang** otomatis *enabled* dengan logika serupa untuk window jam pulang (misal 16:00–20:00), dan hanya muncul jika sudah ada record absen datang di hari yang sama.
- Jika di luar radius atau di luar jam window: tombol disabled + tampilkan alasan (contoh: "Anda berada 350m dari kantor, di luar radius 100m" atau "Belum masuk jam absen").
- **Anti-fraud lokasi:**
  - Deteksi mock location / GPS spoofing (cek `accuracy` GPS, tolak jika akurasi terlalu rendah/tidak wajar).
  - Simpan koordinat aktual saat absen sebagai bukti (audit).
  - Opsional: selfie/foto saat absen sebagai verifikasi tambahan (kamera device).
- Fallback jika izin lokasi ditolak: tampilkan instruksi cara mengaktifkan izin lokasi, tombol tetap disabled.
- Absen dicatat dengan timestamp server (bukan timestamp client) untuk mencegah manipulasi jam device.

### 4.3 CRUD Karyawan
- Tabel data: Nama, Email, No. HP, Jabatan, Departemen, Kantor cabang, Tanggal Bergabung, Status (aktif/nonaktif), Foto profil.
- Create, Read, Update, Delete (soft delete/nonaktifkan, bukan hapus permanen demi jejak riwayat absensi).
- Bulk import karyawan via CSV/Excel (opsional, nice-to-have).
- Filter & search (per kantor, per departemen, per status).
- Detail halaman karyawan menampilkan riwayat absensinya.

### 4.4 CRUD Kantor / Cabang (untuk mendukung multi-tenant)
- Nama kantor, alamat, koordinat (lat/long — bisa pilih via map picker), radius geofence, jam kerja & window absen datang/pulang.
- Assign Admin HR ke kantor tertentu.

### 4.5 Manajemen Tanggal Merah (Hari Libur)
- CRUD tanggal merah: tanggal, nama libur (contoh: "Idul Fitri", "Cuti Bersama"), tipe (nasional/cuti bersama/khusus kantor).
- Superadmin bisa input hari libur nasional (berlaku semua kantor).
- Admin HR bisa tambah libur khusus kantornya (contoh: libur ulang tahun perusahaan cabang).
- Opsional: integrasi API hari libur nasional Indonesia untuk auto-fill (dengan tetap bisa diedit manual).

### 4.6 Kalender Visual
- Tampilan kalender bulanan (komponen kalender interaktif) menampilkan:
  - Tanggal merah ditandai warna merah + tooltip nama libur.
  - Untuk karyawan: status kehadiran per hari (hadir, telat, tidak hadir, izin, cuti) ditandai warna berbeda.
- Bisa navigasi antar bulan/tahun.
- Bisa difilter per karyawan (untuk Admin/Superadmin) atau otomatis personal (untuk Karyawan).

### 4.7 Export Data Absensi (CSV)
- Filter export berdasarkan: rentang tanggal, kantor, departemen, karyawan tertentu.
- Kolom CSV minimal: Nama Karyawan, Tanggal, Jam Datang, Jam Pulang, Status (Tepat waktu/Telat/Alpha/Izin/Cuti), Lokasi (koordinat), Kantor.
- Superadmin: bisa export lintas kantor.
- Admin HR: hanya kantornya sendiri.
- Format nama file otomatis: `absensi_[nama_kantor]_[periode].csv`.
- (Opsional roadmap) export ke Excel (.xlsx) dengan formatting.

### 4.8 Dashboard & Laporan
- Dashboard Superadmin: ringkasan seluruh kantor (jumlah karyawan, tingkat kehadiran, kantor paling telat, dll).
- Dashboard Admin HR: ringkasan kantornya (hadir hari ini, telat, belum absen, izin/cuti pending).
- Dashboard Karyawan: status absen hari ini, riwayat absensi bulan berjalan, ringkasan telat/alpha.
- Grafik tren kehadiran (mingguan/bulanan).

### 4.9 Manajemen Izin/Koreksi Absen (rekomendasi tambahan)
- Karyawan dapat mengajukan izin/cuti/sakit atau request koreksi absen (lupa absen, GPS error) dengan upload bukti (foto/dokumen).
- Admin HR approve/reject pengajuan.
- Status pengajuan tercatat di riwayat absensi.

### 4.10 Notifikasi (rekomendasi tambahan)
- Reminder push/email jika karyawan belum absen pulang menjelang akhir window jam.
- Notifikasi ke Admin HR jika ada karyawan alpha (tidak absen sama sekali dalam sehari).

---

## 5. Alur Utama (User Flow)

### 5.1 Alur Absen Datang
1. Karyawan login → buka halaman "Absen".
2. Sistem minta izin lokasi browser.
3. Sistem hitung jarak ke koordinat kantor & cek jam saat ini vs window absen datang kantor tsb.
4. Jika memenuhi syarat → tombol "Absen Datang" aktif.
5. Karyawan klik tombol → sistem simpan record: `employee_id`, `office_id`, `timestamp_server`, `koordinat_saat_absen`, `accuracy_gps`, `status` (tepat waktu/telat berdasarkan jam masuk kantor).
6. Tombol berubah jadi "Sudah Absen Datang pukul HH:MM" (disabled).

### 5.2 Alur Absen Pulang
1. Setelah absen datang tercatat, tombol "Absen Pulang" muncul namun tetap disabled sampai window jam pulang & lokasi memenuhi syarat.
2. Karyawan klik saat kondisi terpenuhi → sistem simpan `timestamp_server` pulang + koordinat.
3. Sistem hitung total jam kerja hari itu otomatis.

### 5.3 Alur Admin HR
1. Login → dashboard kantornya.
2. Kelola data karyawan (CRUD).
3. Input tanggal merah kantor.
4. Lihat kalender & laporan kehadiran.
5. Export CSV sesuai kebutuhan periode.
6. Approve pengajuan izin/koreksi.

### 5.4 Alur Superadmin
1. Login → dashboard global semua kantor.
2. Kelola data kantor & Admin HR.
3. Kelola tanggal merah nasional.
4. Monitoring & audit log seluruh sistem.

---

## 6. Skema Data (Draft ERD Supabase)

```
profiles
- id (uuid, PK, = auth.users.id)
- full_name
- email
- phone
- role (enum: superadmin | admin | employee)
- office_id (FK -> offices.id, nullable utk superadmin)
- department
- position
- photo_url
- status (active | inactive)
- created_at

offices
- id (uuid, PK)
- name
- address
- latitude
- longitude
- radius_meters
- checkin_window_start
- checkin_window_end
- checkout_window_start
- checkout_window_end
- work_start_time   (untuk hitung status telat)
- created_by (FK -> profiles.id)
- created_at

attendances
- id (uuid, PK)
- employee_id (FK -> profiles.id)
- office_id (FK -> offices.id)
- date
- check_in_time (timestamptz, server time)
- check_in_lat / check_in_lng / check_in_accuracy
- check_out_time (timestamptz, server time)
- check_out_lat / check_out_lng / check_out_accuracy
- status (on_time | late | absent | leave | permission)
- created_at

holidays
- id (uuid, PK)
- office_id (FK -> offices.id, nullable = berlaku nasional/semua kantor)
- date
- name
- type (national | company | office_specific)
- created_by (FK -> profiles.id)

leave_requests
- id (uuid, PK)
- employee_id (FK -> profiles.id)
- type (sick | leave | correction)
- start_date / end_date
- reason
- attachment_url
- status (pending | approved | rejected)
- reviewed_by (FK -> profiles.id)
- created_at

audit_logs
- id (uuid, PK)
- actor_id (FK -> profiles.id)
- action
- target_table
- target_id
- metadata (jsonb)
- created_at
```

**RLS Policy (garis besar):**
- `profiles`: employee hanya bisa `select/update` baris miliknya sendiri; admin hanya baris dengan `office_id` miliknya; superadmin semua.
- `attendances`: employee hanya insert/select miliknya sendiri (dan hanya insert jika lolos validasi geofence — divalidasi juga di server/Edge Function, bukan cuma client, agar tidak bisa dimanipulasi lewat DevTools).
- `offices`, `holidays`: write terbatas admin/superadmin sesuai `office_id`.

---

## 7. Kebutuhan Non-Fungsional

| Aspek | Kebutuhan |
|---|---|
| **Keamanan** | Validasi geofence & jam absen WAJIB divalidasi ulang di server (Supabase Edge Function/Next.js API Route), tidak boleh hanya mengandalkan client-side, untuk mencegah manipulasi browser. |
| **Akurasi Lokasi** | Tolak absen jika `accuracy` GPS > threshold tertentu (misal >100m dianggap tidak valid), beri pesan agar user pindah ke area terbuka. |
| **Performa** | Halaman absen harus load < 2 detik; kalkulasi jarak real-time tidak boleh membebani baterai berlebihan (gunakan interval wajar, bukan polling tiap detik). |
| **Ketersediaan** | Sistem harus tetap bisa diakses multi-kantor tanpa downtime saat jam sibuk absen datang/pulang. |
| **Skalabilitas** | Struktur data & RLS mendukung penambahan kantor baru tanpa perubahan kode. |
| **Audit Trail** | Setiap perubahan data penting (edit karyawan, hapus, approve izin) tercatat di `audit_logs`. |
| **Kompatibilitas** | Responsive — dapat diakses optimal dari HP (karyawan absen mayoritas via mobile browser). |
| **Privasi Data** | Data lokasi karyawan hanya digunakan untuk validasi absen, disimpan sesuai kebutuhan retensi, dan tidak diekspos ke role yang tidak berwenang. |

---

## 8. Tech Stack & Arsitektur

- **Frontend/Backend:** Next.js (App Router) — fullstack, API Routes / Server Actions untuk logika absen & validasi geofence sisi server.
- **Database & Auth:** Supabase (Postgres, Supabase Auth, Row Level Security, Storage untuk foto profil/bukti izin).
- **Realtime (opsional):** Supabase Realtime untuk update status kehadiran live di dashboard Admin.
- **Styling:** Tailwind CSS.
- **Kalender:** komponen kalender React (misal `react-day-picker` atau custom) dengan marker tanggal merah.
- **Export CSV:** generate di server (API Route) agar bisa filter besar data tanpa membebani client.
- **Deployment:** Vercel (Next.js) + Supabase Cloud.
- **Map picker (opsional):** untuk Admin/Superadmin menentukan titik koordinat kantor secara visual (Leaflet/Google Maps embed).

---

## 9. Isu yang Perlu Diperbaiki dari Sistem Berjalan (perlu konfirmasi/diisi tim)

> Bagian ini perlu diisi berdasarkan temuan aktual di sistem yang sudah berjalan. Contoh area yang umumnya perlu disempurnakan pada sistem sejenis:
- [ ] Validasi geofence saat ini apakah sudah divalidasi di server, atau baru di client (rawan dimanipulasi)?
- [ ] Apakah sudah ada pembedaan role Superadmin vs Admin HR secara tegas di RLS, atau masih tercampur?
- [ ] Apakah CRUD karyawan sudah lengkap (termasuk nonaktifkan, riwayat, filter per kantor)?
- [ ] Apakah export CSV sudah bisa difilter per periode/kantor?
- [ ] Apakah kalender sudah menampilkan tanggal merah yang sudah diinput sebelumnya secara akurat?
- [ ] Apakah ada penanganan kasus GPS tidak akurat / izin lokasi ditolak?
- [ ] Apakah absen ganda (klik dua kali) sudah dicegah?
- [ ] Apakah sudah ada isolasi data antar kantor (multi-tenant) yang aman?

---

## 10. Metrik Keberhasilan

- 100% absen tervalidasi lokasi & waktu tanpa bisa dimanipulasi dari client.
- 0 insiden kebocoran data antar kantor (RLS berjalan sempurna).
- Waktu proses export CSV < 5 detik untuk data 1 bulan/kantor.
- Admin HR dapat menyelesaikan seluruh siklus (kelola karyawan, tanggal merah, export laporan) tanpa bantuan developer.
- Pengurangan komplain "gagal absen padahal sudah di kantor" secara signifikan.

---

## 11. Roadmap Pengembangan (Usulan Prioritas)

| Fase | Fokus |
|---|---|
| **Fase 1 (Kritis)** | Perbaikan validasi geofence di server, perbaikan RLS multi-role & multi-kantor, fix absen ganda. |
| **Fase 2** | Kelengkapan CRUD karyawan & kantor, manajemen tanggal merah, kalender visual. |
| **Fase 3** | Export CSV dengan filter lengkap, dashboard & laporan per role. |
| **Fase 4** | Fitur pendukung: pengajuan izin/koreksi absen, notifikasi, audit log. |
| **Fase 5 (Nice-to-have)** | Selfie verifikasi, bulk import karyawan, export Excel, integrasi API hari libur nasional. |

---

## 12. Pertanyaan Terbuka (perlu dijawab sebelum development lanjut)

1. Apakah satu karyawan bisa terdaftar di lebih dari satu kantor (multi-office)?
2. Berapa radius geofence standar yang diinginkan (misal 100m)? Apakah bisa berbeda tiap kantor?
3. Apakah dibutuhkan verifikasi tambahan (selfie) saat absen, atau cukup GPS saja?
4. Bagaimana kebijakan jika karyawan lupa absen pulang — otomatis dianggap apa?
5. Apakah shift kerja bervariasi (tidak semua karyawan jam 9–5), sehingga window absen perlu per-karyawan, bukan hanya per-kantor?
6. Apakah dibutuhkan integrasi payroll di masa depan (agar struktur data export CSV disesuaikan sejak awal)?