const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt'); 

const prisma = new PrismaClient();

async function main() {
  // 1. Hapus dulu akun admin lama biar gak bentrok Unique Constraint (email)
  try {
    await prisma.user.delete({
      where: { email: 'admin@example.com' }
    });
    console.log('🧹 Data lama berhasil dibersihkan...');
  } catch (e) {
    // Abaikan kalau datanya emang belum ada
  }

  // 2. Buat password hash asli lewat bcrypt tingkat keamanan 10
  const passwordHash = await bcrypt.hash('admin123', 10);

  // 3. Masukkan ke database dengan format yang benar
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Utama',
      email: 'admin@example.com',
      password_hash: passwordHash, // 👈 Ini bakal masuk dalam bentuk hash acak modern di Prisma Studio!
      role: 'admin', 
      status: 'active',
      position: 'Web Developer',
      phone: '08123456789',
      employee_id: 'ADM-001',
      salary: 0
    },
  });

  console.log('✅ SELESAI! Akun admin berhasil dibuat dengan password terenkripsi, bro!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });