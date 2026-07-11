// Ganti baris ini:
// const connection = await mysql.createConnection(process.env.DATABASE_URL!);

// Menjadi seperti ini:
const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL!,
  multipleStatements: true // <-- WAJIB TAMBAHKAN INI agar bisa mengeksekusi banyak table sekaligus
});