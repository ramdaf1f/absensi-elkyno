// d:\Projects\attendance-web-app\scripts\create-admin.ts
import 'dotenv/config'; // Memuat variabel lingkungan dari .env.local
import { createUser } from '../lib/db.js'; // Sesuaikan path jika perlu

async function main() {
  console.log("Mencoba membuat user admin...");
  try {
    const adminUser = await createUser({
      name: "Admin Utama",
      email: "admin@example.com",
      password: "admin123",
      role: "admin",
      position: "Administrator", // Opsional
      employee_id: "ADM001", // Opsional, pastikan unik jika diberikan
      status: "active", // Opsional, defaultnya 'active'
    });
    console.log(`User admin berhasil dibuat:`);
    console.log(`ID: ${adminUser.id}`);
    console.log(`Nama: ${adminUser.name}`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Role: ${adminUser.role}`);
  } catch (error: any) {
    console.error("Terjadi kesalahan saat membuat user admin:");
    console.error(error);
    // Kode kesalahan Prisma untuk pelanggaran batasan unik biasanya P2002.
    // Anda mungkin perlu menyesuaikan ini berdasarkan penanganan kesalahan Prisma yang sebenarnya.
    // Contoh: if (error.code === 'P2002') { ... }
    if (error.code === 'ER_DUP_ENTRY' || error.code === 'P2002') {
      console.error("\nUser admin dengan email atau employee_id ini mungkin sudah ada. Silakan periksa database Anda.");
    }
  } finally {
    // Pastikan script keluar setelah selesai
    process.exit(0);
  }
}

main();
