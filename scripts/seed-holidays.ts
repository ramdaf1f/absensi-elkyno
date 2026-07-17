import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding holidays...")
  
  const holidaysData = [
    { id: randomUUID(), date: new Date('2026-01-01'), description: 'Tahun Baru 2026 Masehi' },
    { id: randomUUID(), date: new Date('2026-08-17'), description: 'Hari Kemerdekaan RI' },
    { id: randomUUID(), date: new Date('2026-12-25'), description: 'Hari Raya Natal' },
    { id: randomUUID(), date: new Date('2027-01-01'), description: 'Tahun Baru 2027 Masehi' }
  ]

  for (const holiday of holidaysData) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO holidays (id, date, description, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       ON CONFLICT DO NOTHING`,
      holiday.id,
      holiday.date,
      holiday.description
    )
  }

  console.log("Holidays seeded successfully!")
}

main()
  .catch((e) => {
    console.error("Failed to seed holidays:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
