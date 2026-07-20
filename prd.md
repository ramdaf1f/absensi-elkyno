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
| Kelola data Kantor (multi-tenant) | ✅ CRUD semua kantor | ✅ CRUD terbatas kantornya sendiri (termasuk edit radius geofence & koordinat) | ❌ |
| Kelola Admin HR | ✅ CRUD | ❌ | ❌ |
| Kelola Karyawan | ✅ semua kantor | ✅ hanya kantornya | ❌ (self-view only) |
| Set titik koordinat & radius kantor | ✅ | ✅ (radius bisa disetel per kantor oleh Admin HR) | ❌ |
| Input/edit tanggal merah | ✅ (global/nasional) | ✅ (khusus kantornya) | ❌ (view only) |
| Lihat kalender tanggal merah | ✅ | ✅ | ✅ |
| Absen datang/pulang | ❌ (kecuali didaftarkan sbg karyawan) | ✅ jika terdaftar | ✅ |
| Input absen manual (fallback offline) | ✅ | ✅ hanya kantornya | ❌ |
| Lihat laporan absensi | ✅ semua kantor | ✅ hanya kantornya | ✅ hanya dirinya |
| Export CSV absensi | ✅ semua kantor / filter | ✅ hanya kantornya | ❌ (atau hanya rekap pribadi) |
| Approve izin/sakit/cuti/koreksi absen | ✅ | ✅ | ❌ (hanya request) |
| Lihat log aktivitas sistem | ✅ | ❌ | ❌ |

> **Catatan multi-tenant:** Sistem harus mendukung banyak kantor (cabang), tiap Admin HR terikat ke satu atau beberapa `office_id`, dan Row Level Security (RLS) Supabase wajib menegakkan isolasi data antar kantor.

> **Catatan Global Admin (developer/testing):** Ada pengecualian khusus untuk akun Admin HR dengan flag `is_global_admin = true` — akun ini tetap login & tampil sebagai Admin HR (UI dashboard Admin), namun scope datanya mencakup **semua kantor** sekaligus, bukan hanya kantor tertentu. Fitur ini disediakan khusus untuk keperluan developer mengecek bug/QA lintas kantor dari satu akun. Detail lihat Bagian 4.1 & Bagian 20.

---

## 4. Ruang Lingkup Fitur (Scope)

### 4.1 Autentikasi & Manajemen Role
- Login via Supabase Auth (email/password, opsional Google SSO).
- Role disimpan di tabel `profiles`, dicek lewat RLS + middleware Next.js.
- Superadmin dapat membuat akun Admin HR & menetapkan kantor yang dikelola.
- Admin HR dapat membuat akun Karyawan di kantornya.
- **Multi-office:** satu karyawan **boleh terdaftar di lebih dari satu kantor** (misal karyawan yang tugasnya rotasi antar cabang). Relasi karyawan–kantor bersifat many-to-many lewat tabel penghubung `employee_offices`, sehingga saat absen sistem mengecek kecocokan lokasi terhadap **semua kantor yang terasosiasi** dengan karyawan tsb, bukan hanya satu kantor tetap.
- **Global Admin (khusus keperluan developer/testing):** Superadmin dapat menandai sebuah akun Admin HR dengan flag `is_global_admin = true`. Akun ini tetap **login & tampil sebagai role Admin HR** (masuk ke UI dashboard Admin — bukan dashboard Superadmin), namun scope datanya **tidak dibatasi ke satu kantor** — bisa melihat & mengelola data **semua kantor** seolah-olah dia Admin HR di semua kantor sekaligus. Tujuannya supaya developer bisa mengecek tampilan dan perilaku dashboard Admin HR (bug, layout, data) dari satu akun tanpa harus bikin akun terpisah per kantor. Lihat detail akun contoh di Bagian 20.
- Reset password & invite via email (Supabase Auth invite link).
- Session handling aman (JWT + refresh token via Supabase).

### 4.2 Geofencing Absensi (Fitur Utama)
- Setiap kantor memiliki koordinat pusat (`latitude`, `longitude`) dan radius (meter) yang **disetel oleh Admin HR per kantornya masing-masing** (bisa berbeda-beda tiap kantor, tidak seragam).
- Untuk karyawan multi-office, sistem mengecek jarak terhadap **setiap kantor yang terasosiasi** dengannya, dan menganggap valid jika berada dalam radius **salah satu** kantor tersebut.
- **Window jam absen bersifat per karyawan (bukan per kantor).** Tiap karyawan punya jam masuk/pulang & window absen datang-pulang sendiri (mendukung shift kerja yang berbeda-beda dalam satu kantor), dikonfigurasi oleh Admin HR saat kelola data karyawan (lihat 4.3).
- **Penting:** validasi "user ada di sekitar kantor atau tidak" **wajib pakai koordinat lengkap (latitude + longitude)**, bukan cuma salah satu sumbu — latitude sendirian tidak cukup karena hanya mewakili satu sumbu koordinat (utara-selatan), sedangkan posisi sebenarnya butuh kombinasi keduanya untuk dibandingkan dengan titik kantor.
- Saat karyawan membuka halaman absen, browser meminta izin lokasi (`navigator.geolocation`).

**Cara kerja teknis (garis besar):**
1. Browser minta izin lokasi via `navigator.geolocation.getCurrentPosition()` (atau `watchPosition()` untuk update berkala).
2. Dapat objek `{ latitude, longitude, accuracy }`.
3. Hitung jarak antara posisi karyawan dan titik kantor (atau kantor-kantor terkait, untuk multi-office) menggunakan **Haversine formula**.
4. Bandingkan hasil jarak dengan radius kantor yang dikonfigurasi Admin HR, **dan** cek apakah waktu saat ini berada dalam window jam absen milik karyawan tersebut.
5. Jika kedua syarat terpenuhi → tombol **"Ambil Selfie & Absen"** menjadi aktif/clickable. **Selfie baru bisa diambil setelah kondisi radius+jam terpenuhi** — kamera (`getUserMedia`) tidak bisa diakses/tombol tetap terkunci selama karyawan masih di luar radius atau di luar window jam, mencegah karyawan ambil selfie duluan lalu absen belakangan dari lokasi lain.
6. Karyawan tekan tombol → kamera terbuka → ambil selfie → foto diupload ke server bersamaan dengan koordinat + timestamp saat itu juga sebagai bukti kehadiran.

- **Tombol Absen Datang** otomatis *enabled* jika:
  - Jarak (hasil Haversine) ≤ radius kantor terkait, **dan**
  - Waktu saat ini berada dalam window absen datang milik karyawan tsb.
- **Tombol Absen Pulang** otomatis *enabled* dengan logika serupa untuk window jam pulang milik karyawan tsb, dan hanya muncul jika sudah ada record absen datang di hari yang sama.
- Jika di luar radius atau di luar jam window: tombol disabled (termasuk akses kamera terkunci) + tampilkan alasan (contoh: "Anda berada 350m dari kantor, di luar radius 100m" atau "Belum masuk jam absen Anda").
- Fallback jika izin lokasi ditolak: tampilkan instruksi cara mengaktifkan izin lokasi, tombol tetap disabled.
- Absen dicatat dengan timestamp server (bukan timestamp client) untuk mencegah manipulasi jam device.
- **Lupa absen pulang:** jika karyawan sudah absen datang tapi tidak melakukan absen pulang sampai window jam pulangnya berakhir, sistem tetap **menghitung hari itu sebagai "Hadir"** (tidak dianggap alpha, karena sudah terbukti hadir lewat absen datang), namun:
  - Karyawan mendapat **peringatan/notifikasi** menjelang akhir window jam pulang jika belum absen ("Jangan lupa Absen Pulang, window akan berakhir jam HH:MM").
  - Record absensi hari itu ditandai dengan flag `checkout_missed = true` agar terlihat di laporan Admin HR (untuk ditindaklanjuti/dikoreksi manual bila perlu), tanpa mengubah status kehadiran menjadi alpha.

#### 4.2.1 Keamanan & Anti-Spoofing Lokasi

Geolocation API browser **mudah dipalsukan**, sehingga tidak boleh dijadikan satu-satunya sumber kebenaran. Risiko utama:

- **Desktop:** extension GPS spoofer tinggal di-install di browser.
- **Android:** banyak aplikasi "fake GPS" yang bisa jalan tanpa root.
- **DevTools browser** punya fitur override location bawaan untuk keperluan testing, yang bisa disalahgunakan.

Kalau validasi jarak hanya dihitung di **client-side (JavaScript)**, user tinggal spoof lokasi dan bisa absen dari rumah. Karena itu, sistem harus menerapkan kombinasi lapisan keamanan berikut — bukan mengandalkan satu lapisan saja:

| Lapisan | Fungsi |
|---|---|
| Validasi jarak dihitung ulang di **server**, bukan hanya di client | Client hanya mengirim data mentah (lat, long, accuracy, foto); keputusan valid/tidak final dihitung ulang di backend (API Route/Edge Function), bukan dipercaya langsung dari client. |
| Cek nilai `accuracy` dari GPS | Kalau `accuracy` > threshold (misal 50–100m), tolak absen — ini indikasi lokasi berasal dari estimasi kasar (WiFi/IP-based), bukan GPS asli. |
| EXIF data dari foto (jika ada GPS di metadata) | Cross-check koordinat pada metadata foto dengan koordinat yang dikirim saat request, untuk mendeteksi ketidakcocokan. |
| IP address / WiFi SSID kantor (opsional) | Sinyal tambahan — misal device terkoneksi ke SSID WiFi kantor tertentu sebagai indikasi tambahan kehadiran fisik. |
| Deteksi mock location (khusus native app) | Android menyediakan flag `isFromMockProvider`, tapi ini **tidak terbaca** dari browser murni — hanya relevan jika ke depan dibuat native/hybrid app. |
| Watermark foto (overlay timestamp + koordinat) | Untuk kebutuhan audit trail visual, bukan mekanisme keamanan utama. |
| Rate limiting + logging semua percobaan absen | Untuk mendeteksi pola mencurigakan, misal koordinat "loncat-loncat" antar percobaan absen dalam waktu singkat. |

**Catatan realistis:** karena ini aplikasi web (bukan native app), sistem **tidak bisa mencegah GPS spoofing 100%** — ini keterbatasan bawaan Geolocation API browser, berbeda dengan native app Android yang bisa membaca flag mock-provider langsung dari OS. Namun kombinasi: cek radius + wajib foto saat absen + filter `accuracy` + validasi ulang di server sudah cukup untuk level "professional grade" dan membuat upaya spoofing jauh lebih rumit — bukan sekadar klik satu tombol extension.

- **Verifikasi foto saat absen:** wajib ambil foto selfie via kamera device (`getUserMedia`) setiap kali absen datang/pulang, disimpan di Supabase Storage dan ditautkan ke record `attendances` sebagai bukti kehadiran tambahan di luar data koordinat.

### 4.3 CRUD Karyawan
- Tabel data: Nama, Email, No. HP, Jabatan, Departemen, Kantor cabang (bisa lebih dari satu — multi-office), Tanggal Bergabung, Status (aktif/nonaktif), Foto profil.
- **Pengaturan shift/window absen personal:** tiap karyawan punya jam kerja & window absen datang-pulang sendiri (jam mulai/akhir window absen datang, jam mulai/akhir window absen pulang, jam masuk kerja standar untuk hitung status telat), diisi/diedit oleh Admin HR — mendukung karyawan dengan shift berbeda-beda dalam satu kantor yang sama.
- **Assignment kantor:** satu karyawan dapat ditautkan ke satu atau lebih kantor (multi-office); Admin HR memilih kantor mana saja yang berlaku untuk karyawan tsb dari daftar kantor yang dikelolanya.
- Create, Read, Update, Delete (soft delete/nonaktifkan, bukan hapus permanen demi jejak riwayat absensi).
- Bulk import karyawan via CSV/Excel (opsional, nice-to-have).
- Filter & search (per kantor, per departemen, per status).
- Detail halaman karyawan menampilkan riwayat absensinya.

### 4.4 CRUD Kantor / Cabang (untuk mendukung multi-tenant)
- Nama kantor, alamat, koordinat (lat/long — bisa pilih via map picker), **radius geofence (disetel per kantor oleh Admin HR)**.
- Window absen aktual sepenuhnya mengikuti pengaturan per karyawan (lihat 4.3) — kantor **tidak** punya field jam kerja/window sendiri, untuk menghindari duplikasi sumber kebenaran (single source of truth ada di profil karyawan).
- Assign Admin HR ke kantor tertentu.

### 4.5 Manajemen Tanggal Merah (Hari Libur)
- CRUD tanggal merah: tanggal, nama libur (contoh: "Idul Fitri", "Cuti Bersama"), tipe (nasional/cuti bersama/khusus kantor).
- Superadmin bisa input hari libur nasional (berlaku semua kantor).
- Admin HR bisa tambah libur khusus kantornya (contoh: libur ulang tahun perusahaan cabang).
- Opsional: integrasi API hari libur nasional Indonesia untuk auto-fill (dengan tetap bisa diedit manual).

### 4.6 Kalender Visual
- Tampilan kalender bulanan (komponen kalender interaktif) menampilkan:
  - Tanggal merah ditandai warna merah + tooltip nama libur.
  - Untuk karyawan: status kehadiran per hari (hadir, telat, tidak hadir/alpha, izin, **sakit** — termasuk sub-status "sakit menunggu bukti" selama window H+3 belum lewat, cuti) ditandai warna berbeda.
- Bisa navigasi antar bulan/tahun.
- Bisa difilter per karyawan (untuk Admin/Superadmin) atau otomatis personal (untuk Karyawan).

### 4.7 Export Data Absensi (CSV)
- Filter export berdasarkan: rentang tanggal, kantor, departemen, karyawan tertentu.
- Kolom CSV minimal: Nama Karyawan, Tanggal, Jam Datang, Jam Pulang, Status (Tepat waktu/Telat/Alpha/Izin/Sakit/Cuti), Lokasi (koordinat), Kantor, Link/Referensi Foto Absen, Metode Input (self/manual_admin).
- Superadmin: bisa export lintas kantor.
- Admin HR: hanya kantornya sendiri.
- Format nama file otomatis: `absensi_[nama_kantor]_[periode].csv`.
- **Backup otomatis bulanan (wajib, bukan opsional):** setiap awal bulan, sistem otomatis men-generate file CSV rekap bulan sebelumnya **beserta foto absen karyawan** (foto disertakan/ditautkan dalam paket backup — misal sebagai arsip terpisah per karyawan atau link yang dibundel dalam satu folder/zip bersama CSV-nya), sebagai laporan resmi kantor & bukti kehadiran permanen. Proses ini dijalankan lewat scheduled job (Supabase Cron/Edge Function terjadwal).
- Backup bulanan ini disimpan permanen (tidak ikut terhapus), berbeda dari foto asli di Storage yang punya masa retensi terbatas (lihat 4.7.1).
- (Opsional roadmap) export ke Excel (.xlsx) dengan formatting.

#### 4.7.1 Kebijakan Retensi Foto Absen
- Foto selfie absen (`check_in_photo_url`, `check_out_photo_url`) disimpan di Supabase Storage selama **maksimal 2 bulan** sejak tanggal absen.
- Setelah 2 bulan, foto asli di Storage **dihapus otomatis** (scheduled job bulanan) untuk menghemat storage & menjaga privasi data karyawan — foto **tidak lagi tersimpan di database/storage** setelah periode ini.
- Bukti kehadiran tetap terjaga karena sudah tercakup di **backup CSV bulanan** (lihat di atas) yang di-generate sebelum foto dihapus — sehingga laporan resmi kantor (CSV + referensi/salinan foto dalam paket backup) tetap menjadi arsip permanen, sedangkan foto "mentah" di sistem live dibersihkan berkala.
- Urutan proses tiap bulan: (1) generate & simpan backup CSV+foto bulan lalu → (2) verifikasi backup berhasil → (3) baru hapus foto asli yang sudah lewat 2 bulan dari Storage.

### 4.8 Dashboard & Laporan
- Dashboard Superadmin: ringkasan seluruh kantor (jumlah karyawan, tingkat kehadiran, kantor paling telat, dll).
- Dashboard Admin HR: ringkasan kantornya (hadir hari ini, telat, belum absen, izin/cuti pending).
- Dashboard Karyawan: status absen hari ini, riwayat absensi bulan berjalan, ringkasan telat/alpha.
- Grafik tren kehadiran (mingguan/bulanan).

### 4.9 Manajemen Izin/Cuti/Sakit & Koreksi Absen

**Pengajuan Izin (umum — izin pribadi/cuti biasa):**
- Karyawan input lewat form: pilih tanggal via kalender (bisa rentang tanggal / multi-hari, sistem otomatis tampilkan nama hari dari tanggal yang dipilih), tulis keterangan/alasan izin, lalu submit.
- Status pengajuan: `pending` → tampil di dashboard Admin HR untuk di-**accept/reject**.
- Jika di-accept: tanggal terkait otomatis tercatat berstatus **"Izin"** di riwayat absensi & kalender karyawan (bukan alpha).
- Jika di-reject: karyawan mendapat notifikasi beserta alasan (opsional catatan dari Admin HR), tanggal tersebut tetap berstatus alpha kecuali karyawan absen normal di hari itu.

**Pengajuan Sakit (khusus — aturan berbeda dari izin biasa):**
- Form sama (pilih tanggal via kalender + keterangan), **namun wajib melampirkan bukti foto surat sakit/keterangan dokter**.
- **Kelonggaran waktu upload bukti:** karyawan **boleh menunda upload foto surat sakit maksimal H+3** (3 hari setelah tanggal sakit yang diinput) — misal karyawan sakit tanggal 1, foto surat sakit boleh menyusul sampai tanggal 4.
- Selama bukti belum diupload (dalam window H+3), status pengajuan `pending_proof` — tanggal terkait sementara ditandai **"Sakit (menunggu bukti)"**, belum final.
- Jika bukti sudah diupload sebelum/pada H+3 → Admin HR baru bisa accept/reject.
- Jika sampai H+3 bukti **tidak diupload** → sistem otomatis ubah status pengajuan jadi `rejected` (auto), dan tanggal terkait berubah menjadi **alpha** (kecuali karyawan sebenarnya absen normal di hari itu), disertai notifikasi ke karyawan bahwa pengajuan sakitnya gugur karena bukti tidak dilampirkan tepat waktu.

**Koreksi Absen:**
- Karyawan dapat mengajukan koreksi (misal lupa absen, GPS error) dengan keterangan + bukti pendukung (opsional foto/dokumen).
- Admin HR approve/reject; jika approve, Admin HR dapat mengedit manual record `attendances` terkait.
- Semua aksi approve/reject/edit manual tercatat di `audit_logs`.

### 4.10 Notifikasi (rekomendasi tambahan)
- Reminder push/email jika karyawan belum absen pulang menjelang akhir window jam pulang miliknya.
- Jika window jam pulang berakhir dan karyawan tetap belum absen pulang: hari itu tetap dihitung **"Hadir"** (bukan alpha), sistem tandai `checkout_missed = true`, dan kirim notifikasi ringkasan ke karyawan ("Anda lupa Absen Pulang kemarin") serta ke Admin HR untuk pemantauan/tindak lanjut bila perlu.
- Notifikasi ke Admin HR jika ada karyawan alpha (tidak melakukan absen datang sama sekali dalam sehari).
- Reminder ke karyawan H-1 sebelum deadline H+3 upload bukti sakit ("Segera upload surat sakit Anda, batas waktu besok").
- Notifikasi ke Admin HR setiap ada pengajuan izin/sakit/koreksi baru yang perlu direview.

### 4.11 Absen Manual oleh Admin (Fallback Offline / Kendala Teknis)
- Jika karyawan mengalami kendala teknis saat absen (sinyal buruk, GPS/kamera bermasalah, device error) sehingga tidak bisa melakukan absen normal melalui sistem, karyawan **menghubungi Admin HR** (di luar sistem — WA/telepon/langsung) untuk melaporkan bahwa dirinya hadir di kantor.
- Admin HR melakukan **input manual kehadiran** karyawan tsb melalui dashboard Admin, dengan field: karyawan, tanggal, jam datang/pulang (jika diketahui), catatan alasan input manual (contoh: "Sinyal bermasalah, dikonfirmasi hadir via telepon").
- Record hasil input manual ditandai `input_method = "manual_admin"` (berbeda dari `input_method = "self"` untuk absen normal via sistem) agar mudah dibedakan saat audit/laporan, dan `input_by` mencatat Admin HR mana yang menginput.
- Tidak ada verifikasi lokasi/foto untuk absen manual ini — sepenuhnya berdasarkan kepercayaan & konfirmasi Admin HR, sehingga hanya digunakan sebagai **fallback**, bukan cara absen rutin.
- Tercatat di `audit_logs` untuk transparansi (siapa yang input manual, kapan, untuk karyawan siapa).

---

## 5. Alur Utama (User Flow)

### 5.1 Alur Absen Datang
1. Karyawan login → buka halaman "Absen".
2. Sistem minta izin lokasi browser.
3. Sistem hitung jarak ke koordinat kantor (kantor-kantor terkait jika multi-office) & cek jam saat ini vs window absen datang **milik karyawan tsb**.
4. Jika memenuhi syarat → tombol "Ambil Selfie & Absen Datang" aktif (kamera terkunci sebelum syarat terpenuhi).
5. Karyawan tekan tombol → kamera terbuka → ambil selfie → sistem simpan record: `employee_id`, `office_id`, `timestamp_server`, `koordinat_saat_absen`, `accuracy_gps`, `check_in_photo_url`, `status` (tepat waktu/telat berdasarkan jam masuk kerja karyawan tsb).
6. Tombol berubah jadi "Sudah Absen Datang pukul HH:MM" (disabled).

### 5.2 Alur Absen Pulang
1. Setelah absen datang tercatat, tombol "Absen Pulang" muncul namun tetap disabled (termasuk kamera terkunci) sampai window jam pulang **milik karyawan** & lokasi memenuhi syarat.
2. Karyawan tekan tombol saat kondisi terpenuhi → ambil selfie → sistem simpan `timestamp_server` pulang + koordinat + `check_out_photo_url`.
3. Sistem hitung total jam kerja hari itu otomatis.
4. Jika window jam pulang berakhir tanpa absen pulang: sistem tetap catat hari itu **"Hadir"**, set flag `checkout_missed = true`, dan kirim notifikasi peringatan ke karyawan (lihat 4.10).

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
- office_id (FK -> offices.id, nullable — kantor utama/default, khusus utk admin; utk employee lihat tabel employee_offices krn bisa multi-office)
- department
- position
- photo_url
- status (active | inactive)
- checkin_window_start   (window absen datang personal karyawan)
- checkin_window_end
- checkout_window_start  (window absen pulang personal karyawan)
- checkout_window_end
- work_start_time        (jam masuk kerja personal, untuk hitung status telat)
- is_global_admin (boolean, default false — khusus role=admin; jika true, scope data admin ini mencakup SEMUA kantor, dipakai utk keperluan developer/testing, lihat 4.1 & Bagian 20)
- created_at

employee_offices   (tabel penghubung, mendukung multi-office)
- id (uuid, PK)
- employee_id (FK -> profiles.id)
- office_id (FK -> offices.id)
- created_at

offices
- id (uuid, PK)
- name
- address
- latitude
- longitude
- radius_meters     (disetel per kantor oleh Admin HR)
- created_by (FK -> profiles.id)
- created_at

attendances
- id (uuid, PK)
- employee_id (FK -> profiles.id)
- office_id (FK -> offices.id)
- date
- check_in_time (timestamptz, server time)
- check_in_lat / check_in_lng / check_in_accuracy
- check_in_photo_url (foto selfie bukti absen datang, Supabase Storage)
- check_out_time (timestamptz, server time)
- check_out_lat / check_out_lng / check_out_accuracy
- check_out_photo_url (foto selfie bukti absen pulang, Supabase Storage)
- status (on_time | late | absent | leave | permission | sick | sick_pending_proof)
- checkout_missed (boolean, true jika lupa absen pulang — status kehadiran tetap dihitung "Hadir")
- input_method (self | manual_admin)   — self = absen normal via sistem, manual_admin = fallback offline
- input_by (FK -> profiles.id, nullable — diisi jika input_method = manual_admin, mencatat Admin HR yang menginput)
- notes (teks, opsional — catatan alasan jika input manual)
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
- type (permission | sick)   — izin biasa vs sakit, alur berbeda (lihat 4.9)
- start_date / end_date
- reason
- attachment_url (nullable — wajib diisi utk type=sick sebelum bisa di-approve)
- proof_deadline (date, khusus type=sick — otomatis = start_date + 3 hari)
- status (pending | pending_proof | approved | rejected)   — pending_proof khusus sakit yang bukti belum diupload
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
- `profiles`: employee hanya bisa `select/update` baris miliknya sendiri; admin hanya baris karyawan yang terhubung ke kantor yang dikelolanya (via `employee_offices`) — **kecuali** jika `is_global_admin = true`, maka boleh `select` semua baris karyawan lintas kantor (tetap hanya `select`, bukan Superadmin penuh — pembuatan akun Admin/Superadmin baru tetap wewenang Superadmin); superadmin semua.
- `employee_offices`: employee hanya bisa `select` baris miliknya sendiri; admin hanya bisa CRUD relasi untuk kantor yang dikelolanya (atau semua kantor jika `is_global_admin = true`); superadmin semua.
- `attendances`: employee hanya insert/select miliknya sendiri (dan hanya insert jika lolos validasi geofence terhadap salah satu kantor terkait — divalidasi juga di server/Edge Function, bukan cuma client, agar tidak bisa dimanipulasi lewat DevTools).
- `offices`, `holidays`: write terbatas admin/superadmin sesuai kantor yang dikelola — admin dengan `is_global_admin = true` bisa akses semua kantor.

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
| **Privasi & Retensi Data** | Data lokasi karyawan hanya digunakan untuk validasi absen. **Foto absen disimpan maksimal 2 bulan** lalu dihapus otomatis dari Storage; **backup CSV bulanan (berisi rekap + referensi foto)** digenerate otomatis tiap awal bulan sebagai arsip permanen sebelum foto asli dihapus. Data tidak diekspos ke role yang tidak berwenang. |

---

## 8. Tech Stack & Arsitektur

- **Frontend/Backend:** Next.js (App Router) — fullstack, API Routes / Server Actions untuk logika absen & validasi geofence sisi server.
- **Database & Auth:** Supabase (Postgres, Supabase Auth, Row Level Security, Storage untuk foto profil/bukti izin).
- **Realtime (opsional):** Supabase Realtime untuk update status kehadiran live di dashboard Admin.
- **Styling:** Tailwind CSS, dengan token warna & tipografi dikonfigurasi mengikuti design system di Bagian 9 (Desain UI/UX & Sistem Visual), plus komponen UI berbasis `shadcn/ui` untuk konsistensi & kecepatan development.
- **Kalender:** komponen kalender React (misal `react-day-picker` atau custom) dengan marker tanggal merah.
- **Export CSV:** generate di server (API Route) agar bisa filter besar data tanpa membebani client.
- **Deployment:** Vercel (Next.js) + Supabase Cloud.
- **Map picker (opsional):** untuk Admin/Superadmin menentukan titik koordinat kantor secara visual (Leaflet/Google Maps embed).

---

## 9. Desain UI/UX & Sistem Visual

Sistem absensi dipakai berulang kali **setiap hari** oleh semua karyawan, biasanya dalam kondisi terburu-buru (mau masuk kerja/pulang). Karena itu desain harus **cepat dipahami, enak dipandang, dan nyaman di mata** — terutama di HP, karena mayoritas absen dilakukan lewat mobile browser.

### 9.1 Prinsip Desain

1. **Clarity over decoration** — status tombol (aktif/nonaktif) harus terlihat jelas dalam < 1 detik, tanpa perlu mikir.
2. **Feedback instan** — setiap aksi (klik tombol, izin lokasi, upload foto) selalu ada respons visual (loading state, success state, error state).
3. **Konsisten** — warna, spacing, dan komponen yang sama dipakai berulang di semua halaman (tidak reinvent tiap fitur).
4. **Mobile-first** — didesain dari layar kecil dulu, baru diperluas ke tablet/desktop, bukan sebaliknya.
5. **Ramah mata untuk pemakaian harian** — hindari warna terlalu kontras/menyilaukan karena dibuka berkali-kali sehari; sediakan light mode yang soft, serta opsi dark mode untuk kenyamanan.

### 9.2 Sistem Warna (Color Palette)

Warna dipilih agar terasa profesional, tenang, dan tidak melelahkan mata saat dipakai tiap hari, dengan warna aksen yang jelas untuk status penting.

| Token | Warna | Fungsi |
|---|---|---|
| `primary` | Indigo/Blue soft (`#4F46E5` area) | Warna utama brand, tombol utama, navigasi aktif |
| `primary-hover` | Sedikit lebih gelap dari primary | State hover/pressed |
| `success` | Hijau soft (`#16A34A` area) | Tombol absen aktif, status "Hadir/Tepat Waktu", notifikasi berhasil |
| `warning` | Kuning/Amber (`#D97706` area) | Status "Telat", peringatan jarak mendekati batas radius |
| `danger` | Merah soft (`#DC2626` area) | Status "Alpha", error, tombol nonaktif/ditolak, tanggal merah di kalender |
| `info` | Biru muda (`#0284C7` area) | Status "Izin/Cuti", info banner |
| `neutral-bg` | Abu sangat muda (`#F8FAFC`) | Background utama (light mode) — soft, tidak putih menyilaukan |
| `neutral-surface` | Putih (`#FFFFFF`) | Card, container |
| `neutral-border` | Abu muda (`#E2E8F0`) | Border, divider |
| `text-primary` | Abu gelap (`#1E293B`) | Teks utama — **bukan hitam pekat**, supaya lebih nyaman dibaca lama |
| `text-secondary` | Abu medium (`#64748B`) | Teks sekunder/caption |
| `disabled` | Abu (`#CBD5E1`) dengan opacity | Tombol nonaktif (di luar radius/jam) |

**Dark mode (opsional tapi direkomendasikan):** background `#0F172A`–`#1E293B`, surface `#1E293B`–`#334155`, teks `#F1F5F9`, dengan warna status (success/warning/danger) tetap konsisten namun sedikit lebih terang agar kontras cukup di background gelap.

**Aturan penggunaan warna:**
- Warna status (success/warning/danger/info) **hanya** dipakai untuk makna semantik (status absen, alert) — jangan dipakai sembarangan untuk elemen dekoratif, supaya user langsung asosiasikan warna dengan arti tertentu.
- Kontras teks vs background wajib memenuhi standar keterbacaan (rasio kontras minimal setara WCAG AA, ±4.5:1 untuk teks normal).

### 9.3 Tipografi

- Font sans-serif modern, contoh: `Inter`, `Plus Jakarta Sans`, atau `Geist` (font default ekosistem Next.js/Vercel) — mudah dibaca di layar kecil.
- Skala ukuran jelas dan konsisten (contoh): Heading utama 24–28px, Sub-heading 18–20px, Body 14–16px, Caption/label 12–13px.
- Line-height cukup longgar (1.4–1.6) untuk kenyamanan baca, terutama di tabel data absensi.
- Hindari terlalu banyak variasi font-weight dalam satu layar (cukup regular, medium, semibold).

### 9.4 Komponen Kunci & UX Pattern

**Tombol Absen (komponen paling penting):**
- Ukuran besar, mudah ditekan dengan ibu jari di HP (minimal area sentuh 44×44px sesuai standar mobile usability).
- 3 state visual yang jelas berbeda:
  - **Disabled** (di luar radius/jam): warna abu, ikon lokasi dicoret, teks alasan singkat di bawah tombol (misal "350m dari kantor").
  - **Enabled** (siap absen): warna hijau menyala (`success`), ada micro-animation halus (pulse/glow ringan) untuk menarik perhatian bahwa tombol sudah aktif.
  - **Loading** (sedang proses submit): spinner + tombol disabled sementara, mencegah double-click/absen ganda.
  - **Completed**: berubah jadi state "sudah absen" dengan jam absen ditampilkan, warna netral/abu-hijau muda, tidak bisa diklik ulang.
- Indikator jarak real-time ke kantor ditampilkan sebagai progress bar atau teks dinamis ("Jarak Anda: 85m — dalam radius ✅"), bukan cuma ya/tidak, supaya user paham kenapa tombol aktif/nonaktif.
- Countdown/indikator waktu tersisa dalam window absen (misal "Absen datang tersedia sampai 10:00").

**Kalender Tanggal Merah:**
- Sel tanggal merah punya warna background merah muda lembut + dot/badge, bukan merah menyala penuh satu sel (biar tetap enak dipandang).
- Tooltip/popover saat tap tanggal menampilkan nama libur.
- Untuk karyawan, warna status kehadiran per hari ditampilkan sebagai dot kecil di pojok tanggal (hijau=hadir, kuning=telat, merah=alpha, biru=izin) — tidak menutupi angka tanggal.

**Tabel Data (CRUD karyawan, riwayat absensi):**
- Di mobile, tabel lebar otomatis berubah jadi **card list** (bukan tabel horizontal-scroll yang sulit dibaca), menampilkan info penting saja (nama, status, jam) dengan opsi "lihat detail".
- Sticky header untuk tabel panjang di desktop.
- Badge warna untuk status (sesuai token warna di atas) agar sekali lihat langsung paham.

**Dashboard:**
- Ringkasan angka penting (hadir hari ini, telat, alpha) ditampilkan sebagai **stat card** besar dengan ikon & warna semantik di bagian atas — bukan dikubur dalam tabel.
- Grafik tren kehadiran pakai warna yang sama dengan token status supaya konsisten dengan seluruh sistem.

**Form (tambah/edit karyawan, kantor, tanggal merah):**
- Label jelas di atas input (bukan placeholder-only, karena placeholder hilang saat user mulai mengetik dan bikin bingung).
- Validasi inline real-time (misal format email salah langsung tampil pesan di bawah field, warna `danger`).
- Tombol submit di posisi konsisten (kanan bawah untuk desktop, full-width sticky di bawah layar untuk mobile).

### 9.5 Responsivitas Mobile

Karena absen mayoritas dilakukan dari HP, mobile adalah **prioritas utama**, bukan versi "ciutan" dari desktop.

- **Breakpoint minimal:** mobile (< 640px), tablet (640–1024px), desktop (> 1024px) — menggunakan breakpoint standar Tailwind (`sm`, `md`, `lg`, `xl`).
- **Navigasi mobile:** bottom navigation bar atau hamburger menu untuk Karyawan (akses cepat ke: Absen, Riwayat, Kalender, Profil); sidebar collapsible untuk Admin/Superadmin di desktop, berubah jadi drawer/off-canvas di mobile.
- **Halaman Absen** didesain mobile-first sebagai halaman utama/landing setelah login karyawan — tombol absen langsung terlihat tanpa scroll (above the fold).
- **Touch target** semua elemen interaktif minimal 44×44px, dengan jarak antar elemen cukup agar tidak salah pencet.
- **Font & spacing responsif** — gunakan unit relatif (`rem`) dan skala tipografi yang menyesuaikan viewport, hindari teks terlalu kecil di layar kecil (body text minimal 14px di mobile).
- **Kalender & grafik** di mobile ditampilkan dalam mode ringkas (misal kalender per-minggu atau scroll horizontal per-bulan) agar tidak terlalu padat di layar sempit.
- **Performa di mobile:** optimasi gambar (foto profil, foto absen) dengan lazy-loading & kompresi otomatis (Next.js `Image` component), penting karena karyawan sering absen di jaringan seluler yang tidak selalu stabil.
- **Uji di perangkat nyata:** wajib testing di minimal 2 ukuran layar HP umum (contoh: layar kecil ±375px lebar seperti iPhone SE, dan layar besar ±430px seperti iPhone Pro Max/Android flagship) serta 1 ukuran tablet.
- **PWA (Progressive Web App) — rekomendasi:** jadikan sistem installable sebagai PWA (bisa "Add to Home Screen") supaya terasa seperti aplikasi native saat dibuka karyawan tiap hari, termasuk dukungan splash screen & icon custom.

### 9.6 Aksesibilitas (Accessibility)

- Kontras warna teks & background memenuhi standar WCAG AA minimum.
- Semua tombol/ikon punya label yang bisa dibaca screen reader (`aria-label`), termasuk tombol absen yang statusnya dinamis (misal `aria-label="Absen Datang, tidak aktif, di luar radius kantor"`).
- Ukuran teks bisa membesar (zoom) tanpa merusak layout.
- Tidak hanya mengandalkan warna untuk menyampaikan informasi status — selalu dibarengi ikon/teks (contoh: status "Telat" pakai warna kuning **dan** label teks "Telat", bukan warna saja), penting untuk user dengan buta warna.

### 9.7 Micro-interaction & Animasi

- Transisi halus (200–300ms ease) saat state tombol berubah (disabled → enabled), bukan perubahan tiba-tiba, supaya terasa "hidup" dan user sadar ada perubahan status.
- Animasi ringan (checkmark animation) saat absen berhasil tersimpan, memberi rasa "beres" yang jelas.
- Skeleton loading (bukan spinner polos) saat data dashboard/tabel sedang dimuat, memberi kesan aplikasi responsif meski data besar.
- Semua animasi tetap ringan (hindari animasi berat yang bikin lag di HP kelas menengah-bawah).

---

## 10. Isu yang Perlu Diperbaiki dari Sistem Berjalan (perlu konfirmasi/diisi tim)

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

## 11. Metrik Keberhasilan

- 100% absen tervalidasi lokasi & waktu tanpa bisa dimanipulasi dari client.
- 0 insiden kebocoran data antar kantor (RLS berjalan sempurna).
- Waktu proses export CSV < 5 detik untuk data 1 bulan/kantor.
- Admin HR dapat menyelesaikan seluruh siklus (kelola karyawan, tanggal merah, export laporan) tanpa bantuan developer.
- Pengurangan komplain "gagal absen padahal sudah di kantor" secara signifikan.

---

## 12. Roadmap Pengembangan (Usulan Prioritas)

| Fase | Fokus |
|---|---|
| **Fase 1 (Kritis)** | Perbaikan validasi geofence di server (radius per kantor + window per karyawan), perbaikan RLS multi-role & multi-office (`employee_offices`), fix absen ganda, gating selfie hanya aktif dalam radius. |
| **Fase 2** | Kelengkapan CRUD karyawan (termasuk assignment multi-office & window absen personal) & kantor, manajemen tanggal merah, kalender visual. |
| **Fase 3** | Export CSV dengan filter lengkap, dashboard & laporan per role. |
| **Fase 4** | Fitur pendukung: pengajuan izin/sakit (dengan aturan H+3 bukti sakit)/koreksi absen, absen manual oleh Admin (fallback offline), notifikasi (termasuk reminder lupa absen pulang & flag `checkout_missed`), audit log, scheduled job backup CSV bulanan + retensi hapus foto 2 bulan. |
| **Fase 5 (Nice-to-have)** | Bulk import karyawan, export Excel, integrasi API hari libur nasional. |
| **Fase 6 (UI/UX Polish)** | Penerapan design system (warna, tipografi, komponen), penyempurnaan responsif mobile, micro-interaction & animasi state tombol absen, aksesibilitas. |
| **Proyek Terpisah (Next Project)** | Integrasi payroll — di luar scope pengembangan saat ini. |

---

## 13. Rekomendasi Tech Stack (Detail & Justifikasi)

| Layer | Rekomendasi | Alasan |
|---|---|---|
| **Frontend** | **Next.js 14+ (App Router) + TypeScript** | Sudah sesuai request awal — mendukung Server Components (data fetching di server, lebih aman utk validasi geofence), Server Actions, dan SEO tidak relevan di sini tapi struktur routing App Router cocok untuk role-based layout (`/admin/*`, `/karyawan/*`, `/superadmin/*`). |
| **Styling & Komponen** | **Tailwind CSS + shadcn/ui** | Cepat membangun design system konsisten (lihat Bagian 9), komponen accessible by default, gampang di-custom sesuai token warna. |
| **State Management** | **TanStack Query (React Query)** untuk data server (fetch/cache absensi, karyawan, dll) + **Zustand** untuk state UI ringan (misal state kamera/lokasi) | Next.js App Router sudah handle sebagian besar lewat Server Components, tapi untuk data real-time (lokasi, status tombol) butuh state client yang reaktif. |
| **Form & Validasi** | **React Hook Form + Zod** | Validasi schema-based yang bisa dipakai bareng di client & server (satu source of truth untuk validasi CRUD karyawan/kantor/tanggal merah). |
| **Backend/API** | **Next.js API Routes / Server Actions** untuk logic aplikasi umum, **+ Supabase Edge Functions (Deno)** khusus untuk validasi geofence & absensi | Pemisahan ini penting: logic paling sensitif (validasi jarak & waktu absen) sebaiknya di Edge Function yang lebih terisolasi dan dekat dengan database, bukan tercampur dengan API route umum. |
| **Database** | **Supabase Postgres + extension PostGIS** | Untuk kalkulasi jarak geospasial, gunakan tipe data `geography(Point)` dan fungsi bawaan `ST_DWithin()` / `ST_Distance()` di PostGIS — **jauh lebih akurat dan performant** dibanding hitung Haversine manual di JavaScript, dan validasinya berjalan langsung di level database/RLS sehingga lebih sulit dimanipulasi dari client. |
| **Auth** | **Supabase Auth** | Terintegrasi langsung dengan RLS Postgres — role-based access (superadmin/admin/employee) bisa ditegakkan di level database, bukan cuma di frontend. |
| **Storage** | **Supabase Storage** | Untuk foto selfie absen & foto profil, dengan bucket terpisah per jenis (`avatars`, `attendance-selfies`) dan policy akses sesuai role. |
| **Realtime (opsional)** | **Supabase Realtime** | Untuk dashboard Admin HR yang butuh update live siapa saja yang baru absen. |
| **Kalender** | `react-day-picker` atau `FullCalendar` (versi ringan) | Mendukung custom render tanggal merah + status kehadiran. |
| **Deployment** | **Vercel** (frontend + API routes/server actions) + **Supabase Cloud** (DB, Auth, Storage, Edge Functions) | Kombinasi paling native untuk Next.js + Supabase, minim konfigurasi infra tambahan. |
| **Monitoring/Error Tracking** | **Sentry** (opsional tapi direkomendasikan) | Penting untuk fitur geofencing/kamera yang banyak edge case device-specific (izin lokasi ditolak, kamera gagal, dll). |

> **Kesimpulan singkat:** stack yang kamu sebutkan di awal (Next.js + Supabase) sudah tepat dan tidak perlu diganti — yang perlu ditambahkan hanyalah *pemanfaatan fitur Supabase yang belum tentu dipakai di versi sekarang*, terutama **PostGIS untuk query geospasial** dan **Edge Function untuk validasi absen di server**, karena dua hal ini yang paling menentukan apakah sistem absen "aman" atau "gampang dibobol".

---

## 14. Peta Halaman (Route Map / Sitemap)

Struktur route disarankan berbasis role, memakai route group Next.js App Router:

```
/ (landing/login)
/login
/reset-password

/karyawan (route group: (employee))
  /karyawan/absen              → halaman utama, tombol absen datang/pulang
  /karyawan/riwayat            → riwayat absensi pribadi
  /karyawan/kalender           → kalender tanggal merah + status kehadiran
  /karyawan/izin               → pengajuan izin/cuti/koreksi absen
  /karyawan/profil             → data diri

/admin (route group: (admin), khusus Admin HR)
  /admin/dashboard             → ringkasan kantornya
  /admin/karyawan              → CRUD karyawan
  /admin/karyawan/[id]         → detail & riwayat absensi karyawan
  /admin/kantor                → data kantor yang dikelola (radius, koordinat)
  /admin/tanggal-merah         → CRUD tanggal merah kantor
  /admin/kalender              → kalender keseluruhan kantor
  /admin/laporan               → laporan & export CSV
  /admin/izin                  → approve/reject pengajuan izin

/superadmin (route group: (superadmin))
  /superadmin/dashboard        → ringkasan semua kantor
  /superadmin/kantor           → CRUD semua kantor
  /superadmin/admin-hr         → CRUD akun Admin HR
  /superadmin/karyawan         → lihat semua karyawan lintas kantor
  /superadmin/tanggal-merah    → tanggal merah nasional (global)
  /superadmin/audit-log        → log aktivitas sistem
  /superadmin/laporan          → laporan & export lintas kantor
```

Middleware Next.js mengecek role dari session Supabase Auth di setiap request ke route group `(admin)` dan `(superadmin)`, redirect ke `/karyawan/absen` (atau halaman unauthorized) jika role tidak sesuai.

---

## 15. Contoh API Contract (Endpoint Kunci)

> Bentuk endpoint bisa berupa Next.js Route Handler atau Supabase Edge Function — poin pentingnya adalah kontrak request/response ini disepakati dulu sebelum development paralel FE/BE dimulai.

**`POST /api/attendance/check-in`**
```json
// Request
{
  "latitude": -6.200000,
  "longitude": 106.816666,
  "accuracy": 12.5,
  "photo": "base64_or_storage_ref"
}

// Response 200 (sukses)
{
  "success": true,
  "attendance_id": "uuid",
  "check_in_time": "2026-07-20T08:02:11+07:00",
  "status": "on_time"
}

// Response 403 (di luar radius)
{
  "success": false,
  "error_code": "OUT_OF_RANGE",
  "message": "Anda berada 350m dari kantor, di luar radius 100m",
  "distance_meters": 350
}

// Response 403 (di luar window jam)
{
  "success": false,
  "error_code": "OUTSIDE_TIME_WINDOW",
  "message": "Belum masuk jam absen Anda"
}
```

**`POST /api/attendance/check-out`** — kontrak serupa dengan `check-in`, tambahan `error_code: "ALREADY_CHECKED_OUT"` jika sudah absen pulang hari itu.

**`GET /api/attendance/history?employee_id=&start_date=&end_date=`** — riwayat absensi dengan pagination.

**`GET /api/attendance/export?office_id=&start_date=&end_date=&format=csv`** — trigger generate & download CSV, dibatasi RLS sesuai role.

**`POST /api/employees`, `PATCH /api/employees/[id]`, `DELETE /api/employees/[id]`** — CRUD karyawan standar, validasi input pakai schema Zod yang sama dengan form frontend.

**Kode error standar** yang disarankan dipakai konsisten di seluruh sistem: `OUT_OF_RANGE`, `OUTSIDE_TIME_WINDOW`, `LOCATION_PERMISSION_DENIED`, `LOW_GPS_ACCURACY`, `ALREADY_CHECKED_IN`, `ALREADY_CHECKED_OUT`, `UNAUTHORIZED`, `VALIDATION_ERROR`.

---

## 16. Environment Variables & Setup Project

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # hanya dipakai di server/Edge Function, JANGAN exposed ke client
NEXT_PUBLIC_APP_URL=
GEOFENCE_DEFAULT_RADIUS_METERS=   # fallback default jika admin belum set
GEOFENCE_MAX_GPS_ACCURACY=        # threshold penolakan akurasi GPS (misal 100)
SENTRY_DSN=                       # opsional, error tracking
```

- Supabase project terpisah untuk **staging** dan **production** agar testing tidak mengganggu data real.
- Migrasi database dikelola pakai Supabase CLI (`supabase migration new`, `supabase db push`) supaya perubahan schema tercatat & bisa direplay, bukan diedit manual lewat dashboard.

---

## 17. Strategi Testing & QA

| Jenis Test | Cakupan |
|---|---|
| **Unit test** | Fungsi kalkulasi jarak (Haversine/PostGIS query), validasi window jam, logic status telat/alpha/checkout_missed. |
| **Integration test** | Endpoint API absen (check-in/check-out) dengan berbagai skenario: dalam radius, luar radius, dalam/luar window jam, GPS accuracy rendah. |
| **E2E test** (Playwright/Cypress) | Alur penuh: login karyawan → simulasi lokasi → absen datang → absen pulang; alur Admin HR CRUD karyawan & export CSV. |
| **RLS test** | Pastikan Admin HR kantor A **tidak bisa** akses data karyawan/absensi kantor B (uji isolasi multi-tenant). |
| **Manual QA device nyata** | Uji di HP Android & iOS asli (bukan cuma emulator) untuk geolocation, kamera, dan permission handling — karena ini paling sering beda perilaku antar device/browser. |
| **Security test** | Coba spoofing lokasi (browser extension/DevTools override) untuk pastikan validasi server-side benar-benar menolak. |

---

## 18. Deployment & Release Process

- **Branching:** `main` (production) ← `staging` ← feature branches, dengan preview deployment otomatis per PR (Vercel preview).
- **CI:** jalankan unit test + lint + type-check otomatis sebelum merge (GitHub Actions).
- **Migrasi DB:** dijalankan terpisah dari deploy kode (`supabase db push` ke staging dulu, verifikasi, baru ke production).
- **Rollback plan:** simpan versi Edge Function & migration sebelumnya agar bisa rollback cepat jika validasi geofence bermasalah di production (fitur kritis, downtime di sini langsung berdampak ke seluruh karyawan yang mau absen).

---

## 19. Keputusan yang Sudah Difinalkan

Pertanyaan terbuka pada draft sebelumnya sudah dijawab dan menjadi keputusan resmi untuk scope pengembangan saat ini:

1. ✅ **Multi-office:** satu karyawan **boleh** terdaftar di lebih dari satu kantor (lihat 4.1 & tabel `employee_offices`).
2. ✅ **Radius geofence:** disetel **per kantor oleh Admin HR** masing-masing (bukan nilai tetap global).
3. ✅ **Verifikasi selfie:** **wajib** saat absen, dan tombol/kamera selfie **hanya bisa diakses setelah karyawan masuk radius kantor** (lihat 4.2).
4. ✅ **Lupa absen pulang:** tetap **dihitung "Hadir"**, dengan peringatan/notifikasi ke karyawan menjelang & setelah window pulang berakhir, ditandai flag `checkout_missed` untuk pemantauan Admin HR (lihat 4.10 & 5.2).
5. ✅ **Window absen:** bersifat **per karyawan** (personal/shift), bukan per kantor (lihat 4.2 & 4.3).
6. ⏸️ **Integrasi payroll:** **di luar scope saat ini**, direncanakan sebagai proyek terpisah/lanjutan setelah sistem absensi ini stabil. Struktur data export CSV tetap dibuat cukup generik agar mudah diadaptasi ke sistem payroll di masa depan, tanpa membangun integrasinya sekarang.
7. ✅ **Retensi foto absen:** disimpan maksimal **2 bulan**, lalu dihapus otomatis dari Storage. Backup CSV otomatis **tiap bulan** (berisi rekap absensi + referensi foto) digenerate sebagai laporan resmi/bukti permanen sebelum foto asli dihapus (lihat 4.7 & 4.7.1).
8. ✅ **Penanganan gagal absen/offline:** **tidak** dibuatkan sistem retry/antrean otomatis. Sebagai gantinya, karyawan menghubungi Admin HR di luar sistem untuk konfirmasi kehadiran, dan Admin HR **input manual** lewat dashboard (lihat 4.11), tercatat dengan flag `input_method = manual_admin` untuk audit.
9. ✅ **Wireframe/mockup visual:** **tidak diperlukan** untuk saat ini — deskripsi UI/UX tekstual di Bagian 9 dianggap cukup sebagai acuan.
10. ✅ **Fitur izin & sakit:** karyawan input tanggal (kalender) + keterangan, lalu Admin HR accept/reject dari dashboard. Khusus **sakit**: wajib foto surat sakit, namun boleh menyusul **maksimal H+3**; jika lewat H+3 tanpa bukti, pengajuan otomatis ditolak dan tanggal terkait jadi alpha (lihat 4.9).

---

## 20. Akun Developer/Testing

Untuk keperluan pengecekan bug & QA oleh developer, disiapkan **2 akun seed/testing** yang dibuat lewat proses seeding database (bukan lewat flow signup normal), dengan ketentuan:

| Akun | Role Login | Scope Akses | Catatan |
|---|---|---|---|
| **Admin (Developer Test)** | Login sebagai **Admin HR** (masuk ke dashboard Admin, bukan dashboard Superadmin) | `is_global_admin = true` → bisa lihat & kelola **semua kantor** (data karyawan, settingan kantor/radius, tanggal merah, laporan, dll) seperti Superadmin, tapi dari **UI/UX dashboard Admin** | Tujuan: developer bisa cek tampilan & fungsi dashboard Admin HR tanpa dibatasi 1 kantor saja |
| **Karyawan (Developer Test)** | Login sebagai **Karyawan** biasa | Sama seperti karyawan pada umumnya — hanya bisa akses data & absensi miliknya sendiri, terhubung ke 1 kantor (atau lebih jika ingin sekalian uji multi-office) | Tujuan: developer bisa cek alur absen dari sisi karyawan end-to-end |

**Catatan penting:**
- Kedua akun ini **wajib ditandai jelas sebagai data testing** (misal prefix nama "Test — Admin Dev" / "Test — Karyawan Dev", atau flag tambahan `is_test_account = true` di `profiles` jika ingin lebih rapi) supaya tidak tercampur dengan data karyawan/laporan asli kantor, terutama saat export CSV/backup bulanan (bisa di-exclude dari laporan resmi bila perlu).
- Kredensial kedua akun ini disimpan aman oleh developer sendiri (tidak dicatat di dokumen ini demi keamanan) — dibuat lewat Supabase Auth admin invite atau seed script (`supabase/seed.sql`).
- Fitur `is_global_admin` sebaiknya **hanya bisa diaktifkan oleh Superadmin** lewat backend/database, bukan lewat UI biasa, untuk mencegah penyalahgunaan di production (akun global admin punya akses sangat luas, jadi harus dibatasi ketat siapa saja yang boleh punya akun seperti ini).
- Disarankan akun testing ini **hanya aktif di environment staging**; jika dibutuhkan juga di production untuk debugging real-data, tetap gunakan flag `is_test_account` agar mudah dipisahkan/dibersihkan kapan saja.