import 'dotenv/config';
// import "server-only"
export * from "./db-core"

/**
 * Data layer for Absensi menggunakan Prisma.
 *
 * - When DATABASE_URL is set, all reads/writes go to a cloud MySQL database menggunakan Prisma.
 * - When DATABASE_URL is NOT set, an in-memory store is used instead so the
 *   app is fully functional in preview. Data resets when the server restarts.
 *
 * Swapping to real MySQL requires zero code changes here: just run
 * lib/schema.sql on your database and add DATABASE_URL to your env vars.
 */
