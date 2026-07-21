// Ganti baris ini:
// const connection = await mysql.createConnection(process.env.DATABASE_URL!);

import mysql from "mysql2/promise";

async function main() {
  // Menjadi seperti ini:
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL!,
    multipleStatements: true // <-- WAJIB TAMBAHKAN INI agar bisa mengeksekusi banyak table sekaligus
  });

  await connection.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
