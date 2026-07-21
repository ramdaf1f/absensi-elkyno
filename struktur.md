# struktur.md — Peta Struktur Project (REAL, per audit 2026-07-21)

> **PENTING buat AI Agent:** Ini peta LENGKAP dari file yang benar-benar ada di project.
> **Jangan lakukan file discovery/glob/search folder di luar peta ini** — kalau butuh file yang tidak tercantum di sini, tanya ke user dulu, jangan asumsi/reka struktur sendiri. Ini untuk menghemat token/kredit agent.
>
> Root project: `D:\Projects\attendance-web-app`
> Status: sudah ada implementasi awal dari GPT/Codex (sebagian Fase 1, sebagian nyerempet Fase 2-3). Lihat `plan.md` untuk status detail tiap file.

```
attendance-web-app/
│
├── app/
│   ├── page.tsx                              # landing page
│   ├── layout.tsx                            # root layout
│   ├── globals.css
│   │
│   ├── login/
│   │   └── page.tsx                          # halaman login
│   │
│   ├── absen/
│   │   └── page.tsx                          # halaman absen karyawan (pakai attendance-client.tsx)
│   │
│   ├── admin/
│   │   ├── layout.tsx                        # layout khusus area admin
│   │   ├── page.tsx                          # dashboard admin
│   │   ├── profile/page.tsx
│   │   ├── settings/page.tsx                 # settingan kantor (radius, dll)
│   │   └── employees/
│   │       ├── page.tsx                      # list karyawan
│   │       ├── new/page.tsx                  # form tambah karyawan
│   │       ├── add-employee-form.tsx
│   │       └── employee-view-toggle.tsx      # toggle tampilan (table/card?)
│   │
│   ├── api/
│   │   └── attendance/
│   │       └── check-in/route.ts             # ⚠️ SATU-SATUNYA endpoint attendance. check-out BELUM ADA.
│   │
│   └── test-supabase/
│       └── page.tsx                          # ⚠️ halaman testing/debug — cek apakah masih dipakai atau bisa dihapus sebelum production
│
├── components/
│   ├── ui/                                   # shadcn/ui base components (alert, badge, button, card,
│   │                                          # dropdown-menu, input, label, select, table)
│   ├── admin-header.tsx
│   ├── admin-sidebar.tsx
│   ├── app-header.tsx
│   ├── attendance-client.tsx                 # ⚠️ KRITIS — logic UI absen (geofence check + tombol), perlu diaudit
│   ├── employee-list.tsx
│   ├── export-button.tsx                     # export CSV (fitur Fase 3, sudah mulai dikerjakan)
│   ├── holiday-manager.tsx                   # kelola tanggal merah (fitur Fase 2, sudah mulai dikerjakan)
│   ├── login-form.tsx
│   ├── office-settings-form.tsx              # settingan radius kantor (fitur Fase 2, sudah mulai dikerjakan)
│   ├── report-filters.tsx                    # filter laporan (fitur Fase 3, sudah mulai dikerjakan)
│   ├── report-table.tsx                      # tabel laporan (fitur Fase 3, sudah mulai dikerjakan)
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
│
├── lib/
│   ├── auth.ts                               # ⚠️ KRITIS, ADA BUG KEAMANAN — lihat plan.md Subfase 1D
│   ├── actions.ts                            # server actions — isi belum diaudit
│   ├── geo.ts                                # logic geofencing — perlu diaudit: dipakai di server atau cuma client?
│   ├── types.ts                              # definisi tipe (PublicUser, Role, dll)
│   ├── utils.ts
│   │
│   ├── db.ts                                 # ⚠️ AMBIGU — ada 3 file akses-DB sekaligus, belum jelas mana yang canonical:
│   ├── db-core.ts                            #    db.ts vs db-core.ts vs prisma.ts.
│   ├── prisma.ts                             #    JANGAN pakai salah satu asal-asalan — audit dulu di Subfase 1E.
│   ├── schema.sql                            # skema DB dalam bentuk raw SQL (bukan prisma/schema.prisma!)
│   │
│   ├── supabase.ts                           # ⚠️ AMBIGU — 2 file client Supabase sekaligus, cek mana yang dipakai:
│   └── supabaseClient.ts                     #    kemungkinan salah satunya sisa/duplikat, bukan dipakai aktif.
│
├── drafts/
│   └── 202607200001_prd_phase1.sql           # draft SQL migration Fase 1 (dari sesi kerja sebelumnya)
│
├── _prisma.config.ts                          # config Prisma di root — TAPI folder prisma/schema.prisma
│                                               # TIDAK TERLIHAT di struktur lokal. Perlu diklarifikasi:
│                                               # apakah project ini beneran pakai Prisma Migrate, atau
│                                               # murni raw SQL (lib/schema.sql) dan file Prisma cuma sisa?
│
├── package.json
├── tsconfig.json
└── (config lain: tailwind, next.config, dll — belum diaudit)
```

## Catatan Wajib Dibaca Sebelum Ngoding

1. **`lib/auth.ts` punya 2 bug keamanan aktif** (backdoor login demo hardcoded + fallback secret yang bisa ditebak). **Jangan build fitur baru di atas file ini sebelum di-fix** — lihat `plan.md` Subfase 1D, ini prioritas nomor 1.
2. **Ada 3 kandidat layer database** (`db.ts`, `db-core.ts`, `prisma.ts`) dan **2 kandidat client Supabase** (`supabase.ts`, `supabaseClient.ts`). Sebelum menambah fitur apa pun yang menyentuh database, **audit dulu file mana yang aktif dipakai** (cek import di `app/api/attendance/check-in/route.ts` dan komponen lain) — jangan bikin cara akses DB yang ke-4/ke-5.
3. **`app/api/attendance/` cuma punya `check-in`, belum ada `check-out`.** Jangan asumsikan check-out sudah ada di tempat lain — kalau agent butuh referensi pola kode, contoh yang valid cuma `check-in/route.ts`.
4. **Belum ada folder `prisma/` dengan `schema.prisma`** di struktur lokal, padahal `_prisma.config.ts` menunjuknya. Jangan asumsikan Prisma sudah "siap pakai" — cek dulu apakah file itu benar ada sebelum menjalankan command `prisma` apa pun.
5. **`app/test-supabase/page.tsx`** kemungkinan halaman debug sisa development — konfirmasi ke user sebelum dihapus atau dijadikan acuan pola kode.
6. Fitur yang harusnya Fase 2-3 (`holiday-manager.tsx`, `office-settings-form.tsx`, `report-*.tsx`, `export-button.tsx`) **sudah mulai dikerjakan lebih dulu** dari Fase 1 selesai — ini bukan salah, tapi berarti pengerjaan berikutnya harus **audit dulu apa yang sudah ada**, bukan generate dari nol (supaya tidak dobel/konflik).