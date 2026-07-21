# plan.md — Rencana Eksekusi per Fase

> Task aktif ditandai 🟢. Kerjakan **satu subfase dalam satu sesi/prompt**, jangan loncat subfase.
> Setelah task selesai, ubah `[ ]` → `[x]`. Rujukan detail fitur ada di `prd.md`, rujukan lokasi file ada di `struktur.md`.

---

## FASE 1 — Fondasi Kritis: Geofence Server-Side, Otorisasi, Anti-Spoofing

### ✅ Sudah Dikerjakan (audit per 2026-07-21 — dikerjakan sebagian oleh GPT/Codex)

- [x] Halaman login (`app/login/page.tsx`, `components/login-form.tsx`)
- [x] Session/auth dasar (`lib/auth.ts`) — **⚠️ ADA 2 BUG KEAMANAN, lihat Subfase 1D di bawah, jangan dianggap selesai**
- [x] Endpoint `POST /api/attendance/check-in` (`app/api/attendance/check-in/route.ts`) — **belum diaudit, lihat Subfase 1F**
- [x] Halaman & komponen absen karyawan (`app/absen/page.tsx`, `components/attendance-client.tsx`) — **belum diaudit apakah selfie gating & validasi client-nya benar**
- [x] Helper geofencing (`lib/geo.ts`) — **belum diaudit apakah dipanggil di server atau cuma di client**
- [x] CRUD karyawan dasar (`app/admin/employees/*`, `components/employee-list.tsx`)
- [x] Dashboard admin dasar (`app/admin/page.tsx`, `admin-header.tsx`, `admin-sidebar.tsx`)
- [x] *(Nyerempet Fase 2)* UI settingan kantor (`components/office-settings-form.tsx`)
- [x] *(Nyerempet Fase 2)* UI kelola tanggal merah (`components/holiday-manager.tsx`)
- [x] *(Nyerempet Fase 3)* UI laporan, filter, export CSV (`components/report-filters.tsx`, `report-table.tsx`, `export-button.tsx`)

**Kesimpulan audit:** progres lebih jauh dari perkiraan, tapi **belum ada satupun yang "Definition of Done"** menurut standar `prd.md` — semua butuh audit ulang sebelum dianggap tuntas, dan ada bug keamanan aktif yang harus diperbaiki duluan sebelum lanjut fitur apa pun.

---

### 🟢 Subfase 1D — Security Hardening (PRIORITAS TERTINGGI, kerjakan duluan)
*App sudah live di Vercel & repo public — bug di sini adalah risiko keamanan aktif, bukan cuma technical debt.*

- [ ] **Hapus backdoor login demo** di `lib/auth.ts` (blok `isDemoAdmin`/`isDemoEmployee` yang bypass bcrypt). Ganti dengan: semua login **wajib** lewat `bcrypt.compare()`, tanpa pengecualian apa pun.
- [ ] **Hapus fallback `SESSION_SECRET`** yang bisa ditebak (`"dev-only-insecure-secret-change-me"`). Ganti jadi: kalau `process.env.SESSION_SECRET` tidak ada, `throw new Error("SESSION_SECRET wajib di-set")` saat module di-load — aplikasi tidak boleh jalan tanpa secret yang valid.
- [ ] Cek apakah akun `admin@example.com`/`admin123` dan `employee@example.com`/`employee` **benar-benar ada di database production** — kalau ada, **hapus atau ganti passwordnya sekarang juga** (independen dari fix kode, karena kode lama mungkin sudah pernah dijalankan di production).
- [ ] Cek Vercel Environment Variables — pastikan `SESSION_SECRET` sudah di-set dengan value random yang kuat (bukan string yang gampang ditebak), **beda antara staging & production**.
- [ ] Setelah fix, test manual: coba login pakai kredensial demo lama → harus gagal. Coba jalankan app tanpa `SESSION_SECRET` di env lokal → harus refuse start, bukan jalan diam-diam.
- [ ] Commit & deploy fix ini **sendirian** (jangan digabung task lain), supaya gampang di-rollback kalau ada masalah dan supaya jelas kapan lubang keamanan ini ditutup.

**Definition of Done 1D:** tidak ada jalur login yang bypass bcrypt, aplikasi refuse start tanpa `SESSION_SECRET` valid, kredensial demo lama sudah tidak berfungsi baik di kode maupun di database production.

---

### ⬜ Subfase 1E — Audit & Konsolidasi Layer Database
*Tujuan: satu sumber kebenaran untuk akses database, hilangkan ambiguitas `db.ts` vs `db-core.ts` vs `prisma.ts`.*

- [ ] Baca isi `lib/db.ts`, `lib/db-core.ts`, `lib/prisma.ts` — petakan: masing-masing dipakai di file mana saja (`grep`/cari import-nya).
- [ ] Baca isi `lib/supabase.ts` vs `lib/supabaseClient.ts` — sama, petakan siapa pakai apa.
- [ ] Konfirmasi ke user: apakah project ini pakai **Prisma Migrate** (butuh `prisma/schema.prisma` yang sekarang tidak ketemu di struktur lokal) atau **raw SQL manual** (`lib/schema.sql`, `drafts/*.sql`) sebagai pendekatan resmi ke depannya — **jangan putuskan sendiri**, ini keputusan arsitektur yang harus disetujui user.
- [ ] Setelah dapat keputusan, konsolidasi jadi satu file akses-DB canonical, hapus/deprecate file yang tidak dipakai, update semua import yang mengarah ke file lama.
- [ ] Update `struktur.md` untuk mencerminkan hasil konsolidasi ini.

**Definition of Done 1E:** hanya ada satu cara mengakses database di codebase, tidak ada file `db*.ts`/`supabase*.ts` yang membingungkan/tidak terpakai lagi.

---

### ⬜ Subfase 1F — Audit & Lengkapi Validasi Geofence (Check-in + Check-out)
*Tujuan: pastikan `check-in` yang sudah ada benar-benar aman, dan tambahkan `check-out` yang belum ada sama sekali.*

- [ ] Audit `app/api/attendance/check-in/route.ts`: apakah validasi jarak & window jam dihitung di sini (server), atau cuma menerima keputusan dari client (`lib/geo.ts` dipanggil di mana)?
- [ ] Kalau validasi masih di client saja atau tidak lengkap → pindahkan/lengkapi perhitungan jarak & window jam di server, dalam route ini.
- [ ] Audit apakah sudah ada pengecekan **absen ganda** (tidak bisa check-in 2x di hari yang sama).
- [ ] Buat `app/api/attendance/check-out/route.ts` yang **belum ada** — logic serupa check-in: validasi server-side, cegah double checkout, set `checkoutMissed` kalau relevan (`prd.md` 4.2, 5.2).
- [ ] Pastikan kedua route memanggil helper otorisasi (`getCurrentUser()`) di baris pertama sebelum proses apa pun.
- [ ] Test manual: skenario dalam radius/luar radius, dalam/luar jam, coba akses tanpa login.

**Definition of Done 1F:** check-in teraudit & aman, check-out ada dan setara levelnya, kedua endpoint tidak bisa ditembus tanpa validasi server yang benar.

---

### ⬜ Subfase 1G — Audit UI Absen & Selfie Gating
*Tujuan: pastikan `attendance-client.tsx` sesuai `prd.md` 4.2/9.4 — tombol & kamera terkunci sampai syarat terpenuhi.*

- [ ] Audit `components/attendance-client.tsx`: apakah tombol absen sudah punya state disabled/enabled/loading/completed yang benar?
- [ ] Cek apakah ada fitur selfie/kamera sama sekali — kalau belum ada, ini fitur baru yang perlu ditambahkan sesuai `prd.md` 4.2 (kamera hanya terbuka setelah radius+jam terpenuhi).
- [ ] Kalau sudah ada kamera, cek apakah bisa diakses sebelum syarat lokasi terpenuhi (celah keamanan kalau iya).
- [ ] Pastikan pesan error dari server (`OUT_OF_RANGE`, dst) ditangani & ditampilkan dengan jelas ke user.

**Definition of Done 1G:** UI absen sesuai spesifikasi keamanan & UX di `prd.md`, Fase 1 dianggap tuntas.

---

## FASE 2 — CRUD Karyawan, Kantor, Tanggal Merah, Kalender
*Catatan: sebagian UI sudah ada (`office-settings-form.tsx`, `holiday-manager.tsx`, `employees/*`) — subfase Fase 2 nanti akan lebih banyak berupa **audit & lengkapi**, bukan generate dari nol. Detail breakdown menyusul setelah Fase 1 tuntas.*

## FASE 3 — Export CSV, Dashboard, Laporan
*Catatan: sebagian UI sudah ada (`report-filters.tsx`, `report-table.tsx`, `export-button.tsx`) — sama seperti Fase 2, prioritas audit dulu. Detail menyusul.*

## FASE 4 — Izin/Sakit, Absen Manual, Notifikasi, Audit Log, Backup Otomatis
*(belum ada implementasi terlihat — detail menyusul setelah Fase 1-3 tuntas)*

## FASE 5 — Nice-to-have
*(detail menyusul)*

## FASE 6 — UI/UX Polish
*(detail menyusul)*

---

## Cara Update File Ini
- Centang `[x]` tiap task selesai.
- Kalau audit di Subfase 1E/1F/1G menemukan sesuatu yang ternyata sudah benar, tetap catat itu di sini (misal "✅ ternyata sudah tervalidasi di server dengan benar") supaya progres nyata dari audit tetap tercatat, bukan cuma dianggap "belum dikerjakan".
- Setelah Fase 1 (1D-1G) tuntas semua, minta AI agent memecah Fase 2 jadi subfase kecil dengan pola yang sama — jangan generate semua fase sekaligus di awal.