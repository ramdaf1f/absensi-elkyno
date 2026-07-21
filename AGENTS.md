# AGENTS.md

Instruksi ini dibaca otomatis oleh AI coding agent (Cursor, Codex, dll) sebelum mengerjakan task apa pun di project ini.

## Aturan #0 — Hemat Token, Jangan Discovery Sendiri
**`struktur.md` adalah peta file yang LENGKAP dan AKURAT** (di-audit manual per 2026-07-21). Karena itu:
- **Jangan** menjalankan file search/glob/recursive directory listing untuk "mengenal" project — itu buang-buang token dan sudah tercakup di `struktur.md`.
- Kalau butuh isi sebuah file, buka file itu **langsung by path** sesuai yang tercantum di `struktur.md` — jangan explore folder di sekitarnya "buat jaga-jaga".
- Kalau task butuh file yang **tidak ada** di `struktur.md`, **berhenti dan tanya user** — jangan asumsikan file itu ada di lokasi tertentu lalu mencari-cari.
- Kalau kamu (agent) baru saja membuat/menghapus/memindah file, **update `struktur.md`** di akhir sesi supaya peta tetap akurat untuk sesi berikutnya.

## Tentang Project Ini
Website absensi karyawan otomatis berbasis geofencing (lokasi) untuk multi-kantor. Karyawan absen datang/pulang lewat tombol yang otomatis aktif hanya saat mereka berada dalam radius kantor dan dalam window jam absen personal mereka. 3 role: Superadmin (developer), Admin HR (per kantor, bisa multi-kantor), Karyawan.

**Status saat ini:** implementasi awal sudah dikerjakan (sebagian oleh GPT/Codex sebelumnya). **Bukan project kosong** — banyak file sudah ada, beberapa dengan bug keamanan aktif yang butuh perbaikan segera. Lihat `plan.md` untuk status detail per file/fitur.

**Dokumen acuan (baca sesuai kebutuhan, jangan load semua sekaligus):**
- `prd.md` — spesifikasi produk lengkap. Rujuk bagian spesifik sesuai task saja.
- `struktur.md` — peta file real project. **Sumber kebenaran untuk "file apa ada di mana."**
- `plan.md` — task aktif saat ini & status yang sudah/belum dikerjakan. **Sumber kebenaran untuk "apa yang harus dikerjakan sekarang."**

## Tech Stack (perlu klarifikasi user sebelum diasumsikan — lihat catatan di struktur.md)
- Next.js (App Router), TypeScript
- Tailwind CSS + shadcn/ui
- Database: Supabase Postgres — **tapi cara aksesnya belum jelas** (ada indikasi Prisma dari `_prisma.config.ts`, TAPI juga ada `lib/schema.sql` raw SQL dan 3 file db layer berbeda). **Jangan asumsikan salah satu, konfirmasi dulu ke user atau audit import yang benar-benar dipakai di kode aktif.**
- Auth: **custom** (bcrypt + HMAC-signed session cookie, lihat `lib/auth.ts`) — bukan Supabase Auth, bukan RLS Postgres.

## Aturan Kritis — JANGAN DILANGGAR

1. **Otorisasi wajib dicek manual di SETIAP API Route** yang menyentuh data sensitif — tidak ada RLS Postgres yang otomatis melindungi (karena bukan pakai Supabase Auth). Setiap route wajib panggil helper session (`getCurrentUser()` di `lib/auth.ts` atau turunannya) di baris pertama.
2. **Validasi geofence & window jam WAJIB final di server**, tidak pernah cukup hanya validasi di client/UI (`attendance-client.tsx` boleh preview, tapi keputusan akhir harus dihitung ulang di `app/api/attendance/*/route.ts`).
3. **DILARANG membuat backdoor/bypass login apa pun**, termasuk untuk "kebutuhan testing/demo" — kalau butuh akun testing, gunakan akun sungguhan dengan password ter-hash bcrypt di database (lihat `prd.md` Bagian 20), **jangan** hardcode kredensial atau logic bypass di kode auth manapun. (Catatan: kode lama sempat punya bug seperti ini di `lib/auth.ts` — sedang di-fix di Subfase 1D, jangan ulangi pola ini di tempat lain.)
4. **Semua environment variable rahasia (`SESSION_SECRET`, `DATABASE_URL`, service role key) WAJIB divalidasi ada saat startup** — kalau tidak ada, aplikasi harus `throw error`, **bukan** diam-diam pakai nilai fallback/default apa pun.
5. **Jangan pernah taruh secret/service role key di kode client-side** atau file yang di-bundle ke browser.
6. **Selfie/kamera absen hanya boleh aktif setelah validasi radius+jam lolos** (lihat `prd.md` 4.2).
7. **Timestamp absen selalu pakai waktu server**, jangan pernah percaya timestamp dari client/device karyawan.
8. **Sebelum menambah cara akses database baru**, audit dulu `lib/db.ts`, `lib/db-core.ts`, `lib/prisma.ts` — pilih SATU yang jadi canonical, jangan menambah opsi ke-4.

## Cara Kerja per Task
1. Baca task aktif di `plan.md` (perhatikan bagian "Sudah Dikerjakan" vs "Belum/Perlu Diperbaiki").
2. Baca `struktur.md` untuk tahu path file yang relevan — buka langsung, jangan discovery.
3. Kalau butuh detail spesifik fitur, rujuk section terkait di `prd.md`.
4. Setelah task selesai: centang task di `plan.md` (`[ ]` → `[x]`), dan **update `struktur.md`** kalau ada file baru/berubah.
5. Jangan mengerjakan task dari subfase lain yang belum waktunya.

## Command yang Tersedia
```bash
npm run dev
npm run build
npm run lint
```
*(command test, Prisma, dsb belum dikonfirmasi ada/tidak — cek `package.json` scripts dulu sebelum asumsi command tersedia)*

## Kalau Ragu
Kalau instruksi di `plan.md` ambigu, ada file yang disebut tapi tidak ada di `struktur.md`, atau bertentangan dengan `prd.md` — **berhenti dan tanya ke user**, jangan menebak/mengasumsikan sendiri, terutama untuk apapun yang menyangkut keamanan (geofence, auth/session, akses database).