import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Creating holidays table...")
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS holidays (
      id VARCHAR(36) PRIMARY KEY,
      date DATE NOT NULL,
      description VARCHAR(191) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  console.log("Upserting default office settings...")
  await prisma.$executeRawUnsafe(`
    INSERT INTO office_settings (id, name, latitude, longitude, radius_m, updated_at)
    VALUES (1, 'Kantor Pusat', -6.2087600, 106.8456000, 50, NOW())
    ON CONFLICT (id) DO NOTHING
  `)

  console.log("Database initialized successfully!")
}

main()
  .catch((e) => {
    console.error("Initialization failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
