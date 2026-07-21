# AGENTS.md

## Roles

* Gemini Code Assist = planner
* Cursor/Codex = executor
* Human = reviewer

## Workflow

1. Baca prd.md
2. Baca plan.md
3. Kerjakan SATU task dalam satu waktu
4. Jangan ubah file di luar scope task
5. Tampilkan patch diff sebelum final
6. Jalankan test yang diminta task
7. Berikan pesan commit Git

## Important

Jika task membutuhkan lebih dari 3 file atau mencampur frontend dan backend, hentikan dan minta task dipecah terlebih dahulu.

## Struktur Repository

Sebelum melakukan pencarian file, baca `struktur.md` dan gunakan file yang dipetakan di sana. Hindari scanning seluruh repository kecuali file yang dibutuhkan tidak tercantum di `struktur.md`.

## No Discovery Mode

Jika task sudah memiliki:

* `Files`
* `Objective`
* `Rules`
* `Forbidden`
* `Acceptance Criteria`

maka agent HARUS:

* langsung membuka file yang disebut di `Files`,
* tidak melakukan pencarian repository,
* tidak membuka `package.json`,
* tidak mencari environment variable,
* tidak membuka folder di luar daftar file,
* dan langsung mengimplementasikan perubahan.
